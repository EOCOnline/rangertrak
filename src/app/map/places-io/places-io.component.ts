import { DOCUMENT } from '@angular/common'
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { MatDialog } from '@angular/material/dialog'
import { MatSnackBar } from '@angular/material/snack-bar'

import * as packageJson from '../../../../package.json'
import { MATERIAL_IMPORTS } from '../../material-imports'
import {
  categoryCounts, newCategoryEntries, parseGeoJsonPlaces, parseKmlPlaces, PlacesParseResult, placesToRows, selectPlaces,
  XmlDocumentLike,
} from '../../domain/places-file'
import { describeLocationMerge } from '../../domain/location-merge'
import { rowsToCsv } from '../../domain/roster-sheet'
import { IoPanelComponent } from '../../shared/io-panel/io-panel.component'
import { readSheetFile, rowsToXlsxBytes } from '../../shared/import/sheet-reader'
import { LogService, MissionLocationService, MissionService } from '../../shared/services'
import type { MissionLocationType } from '../../shared/services'
import { MapEngineService } from '../map-engine.service'
import type { PlacesImportDialogResult } from '../places-import-dialog/places-import-dialog.component'

type ExportFormat = 'xlsx' | 'csv' | 'setup'

/** A KML / GeoJSON / Setup file, read and ready for the preview. */
type ReadPlaces = PlacesParseResult & { notes?: string[]; layerName?: string }

/**
 * The Map page's "Import, export & print" panel, places half (E-187 Layers phase B, ADR D-58):
 * bring a set of places in from a spreadsheet, a Google My Maps export (KML / KMZ), a GeoJSON
 * file or a Setup file, and hand on a chosen set of places - picked by category first - as a
 * spreadsheet, a CSV or a named Setup file. Same panel and card look as Rangers.
 *
 * Page-agnostic parts live in `shared/io-panel/`; the rules (mapping, categories, merge,
 * selection) are plain functions in `domain/places-file.ts`. Nothing is saved until the user
 * presses Add to map in the preview dialog. The panel hides itself in field mode.
 */
@Component({
  selector: 'rangertrak-places-io',
  standalone: true,
  imports: [IoPanelComponent, ...MATERIAL_IMPORTS],
  templateUrl: './places-io.component.html',
  styleUrls: ['./places-io.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class PlacesIoComponent {
  private readonly id = 'Map places import/export'
  private readonly dialog = inject(MatDialog)
  private readonly snackBar = inject(MatSnackBar)
  private readonly log = inject(LogService)
  private readonly locationService = inject(MissionLocationService)
  private readonly missionService = inject(MissionService)
  private readonly engineService = inject(MapEngineService)
  private readonly document = inject(DOCUMENT)

  /** A fresh array each time: the service mutates its own list in place. */
  readonly places = signal<MissionLocationType[]>([])
  private readonly categoryNames = signal<string[]>([])

  readonly engine = this.engineService.engine

  /** Category names the user has unticked; a category that is new since is ticked by default. */
  readonly excluded = signal<ReadonlySet<string>>(new Set())
  readonly inViewOnly = signal(false)
  readonly format = signal<ExportFormat>('xlsx')
  private readonly typedLayerName = signal<string | null>(null)

  readonly counts = computed(() => categoryCounts(this.places(), this.categoryNames()))
  readonly selectedCategories = computed(() => this.counts().filter(c => !this.excluded().has(c.name)).map(c => c.name))

  /** "Only places in the current map view" needs a Leaflet map that is showing (D-56: not MapLibre). */
  readonly canUseView = computed(() => this.engine() === 'leaflet' && this.engineService.viewBounds() !== null)

  readonly chosen = computed(() => selectPlaces(this.places(), {
    categories: this.selectedCategories(),
    bounds: this.inViewOnly() && this.canUseView() ? this.engineService.viewBounds() : null,
  }))

  /** The name offered for a Setup file until the user types their own. */
  readonly defaultLayerName = computed(() => `${this.eventName()} places ${this.today()}`)
  readonly layerName = computed(() => this.typedLayerName() ?? this.defaultLayerName())

  constructor() {
    this.locationService.getLocationsObserver().pipe(takeUntilDestroyed())
      .subscribe(list => this.places.set([...list]))
    this.missionService.getMissionObserver().pipe(takeUntilDestroyed())
      .subscribe(m => this.categoryNames.set((m?.locationTypes ?? []).map(t => t.type)))
  }

  categoryLabel(name: string): string {
    return name || '(no category)'
  }

  isTicked(name: string): boolean {
    return !this.excluded().has(name)
  }

  setTicked(name: string, ticked: boolean): void {
    this.excluded.update(set => {
      const next = new Set(set)
      if (ticked) next.delete(name)
      else next.add(name)
      return next
    })
  }

  tickAll(): void {
    this.excluded.set(new Set())
  }

  tickNone(): void {
    this.excluded.set(new Set(this.counts().map(c => c.name)))
  }

  setLayerName(value: string): void {
    this.typedLayerName.set(value)
  }

  // ── Import ────────────────────────────────────────────────────────────────────────────────

  /** Handles a file picked via "Import places...": a spreadsheet goes through the column-mapping dialog; the rest straight to the preview. Nothing is saved until Add to map. */
  async onImportFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    input.value = '' // so re-picking the same file still fires a change event
    if (!file) return

    try {
      const name = file.name.toLowerCase()
      if (/\.(csv|tsv|txt|xlsx|xls)$/.test(name)) {
        const sheet = await readSheetFile(file)
        await this.previewAndApply(file.name, { sheet })
        return
      }

      let read: ReadPlaces
      if (name.endsWith('.zip')) {
        read = await this.readSetupFile(file)
      } else if (name.endsWith('.kmz')) {
        read = await this.readKmz(file)
      } else if (name.endsWith('.kml')) {
        read = parseKmlPlaces(await file.text(), parseXml)
      } else if (name.endsWith('.geojson') || name.endsWith('.json')) {
        read = parseGeoJsonPlaces(await file.text())
      } else {
        throw new Error('RangerTrak reads places from a spreadsheet (.csv, .xlsx), Google My Maps (.kml, .kmz), GeoJSON (.geojson) or a Setup file (.zip).')
      }
      await this.previewAndApply(file.name, {
        incoming: read.places, skipped: read.skipped, warnings: read.warnings, notes: read.notes, layerName: read.layerName,
      })
    } catch (error: any) {
      this.log.error(`onImportFileSelected: ${file.name} rejected: ${error.message}`, this.id)
      alert(`Could not import "${file.name}".\n\n${error.message}`)
    }
  }

  private async readKmz(file: File): Promise<ReadPlaces> {
    const { unzipSync } = await import('fflate')
    let entries: Record<string, Uint8Array>
    try {
      entries = unzipSync(new Uint8Array(await file.arrayBuffer()))
    } catch (e: any) {
      throw new Error(`Could not read this file as a KMZ (${e?.message ?? e}).`)
    }
    const base = (path: string) => path.split(/[/\\]/).pop() || path
    const key = Object.keys(entries).find(k => base(k).toLowerCase() === 'doc.kml')
      ?? Object.keys(entries).find(k => /\.kml$/i.test(k))
    if (!key) {
      throw new Error('This KMZ has no KML map data in it.')
    }
    return parseKmlPlaces(new TextDecoder().decode(entries[key]), parseXml)
  }

  /** A Setup file: its places go through the same preview; people and settings are left for the Setup files page. */
  private async readSetupFile(file: File): Promise<ReadPlaces> {
    const { extractMissionZip, layerName, entryCountOf } = await import('../../shared/export/mission-zip')
    const { manifest } = extractMissionZip(new Uint8Array(await file.arrayBuffer()))
    if (!manifest.locations) {
      throw new Error('This Setup file does not carry any places, so there is nothing here to put on the map. '
        + 'If it carries people or settings, load it from the Setup files page.')
    }
    const others = [manifest.rangers && 'people', manifest.settings && 'mission settings']
      .filter((c): c is string => !!c)
    return {
      places: manifest.locations.filter(l => l && typeof l.name === 'string' && Number.isFinite(l.lat) && Number.isFinite(l.lng))
        .map(l => ({ ...l, type: l.type ?? '' })),
      skipped: 0,
      warnings: [],
      layerName: layerName(manifest) || undefined,
      notes: [
        ...(others.length
          ? [`This file also carries ${others.join(' and ')}. Importing places does not apply those; use the Setup files page for the whole file.`]
          : []),
        ...(entryCountOf(manifest)
          ? [`This file also holds ${entryCountOf(manifest)} radio log entr${entryCountOf(manifest) === 1 ? 'y' : 'ies'}; merge them from Radio Log → Hand over to another scribe.`]
          : []),
      ],
    }
  }

  private async previewAndApply(fileName: string, extra: {
    sheet?: Awaited<ReturnType<typeof readSheetFile>>
    incoming?: MissionLocationType[]
    skipped?: number
    warnings?: string[]
    notes?: string[]
    layerName?: string
  }): Promise<void> {
    const { PlacesImportDialogComponent } = await import('../places-import-dialog/places-import-dialog.component')
    const ref = this.dialog.open(PlacesImportDialogComponent, {
      width: '56rem',
      maxWidth: '95vw',
      data: {
        fileName,
        existing: this.locationService.getCurrentLocations(),
        existingTypes: this.missionService.settings.locationTypes.map(t => t.type),
        ...extra,
      },
    })
    const result = await new Promise<PlacesImportDialogResult | undefined>(resolve =>
      ref.afterClosed().subscribe(r => resolve(r)))
    if (!result) {
      this.log.verbose('previewAndApply: user cancelled.', this.id)
      return
    }

    const { plan } = result
    const settings = this.missionService.settings
    if (plan.newCategories.length) {
      // Categories first, so the markers the new places draw already find their colour and icon.
      const entries = newCategoryEntries(plan.newCategories, settings.locationTypes.length)
      this.missionService.updateMission({ ...settings, locationTypes: [...settings.locationTypes, ...entries] })
    }
    this.locationService.replaceAllLocations(plan.merge.locations)

    const summary = `Imported "${fileName}"${extra.layerName ? ` (from "${extra.layerName}")` : ''}: `
      + describeLocationMerge(plan.merge)
      + (plan.newCategories.length ? `. New categories: ${plan.newCategories.join(', ')}` : '') + '.'
    this.log.warn(summary, this.id)
    this.snackBar.open(summary, 'OK', { duration: 20000 })
  }

  // ── Export ────────────────────────────────────────────────────────────────────────────────

  async onBtnExport(): Promise<void> {
    const places = this.chosen()
    if (!places.length) {
      alert('There are no places to export. Tick at least one category that has places in it.')
      return
    }
    const stamp = this.today()
    const partial = places.length < this.places().length ? '-selected' : ''

    try {
      if (this.format() === 'setup') {
        const name = this.layerName().trim() || this.defaultLayerName()
        const { buildMissionZipBytes, layerFor, MISSION_ZIP_SCHEMA_VERSION } = await import('../../shared/export/mission-zip')
        const exportedAt = new Date().toISOString()
        // Places only: no people, so nothing personal to confirm (D-58 item 9).
        const contents = { locations: places }
        const bytes = await buildMissionZipBytes({
          schemaVersion: MISSION_ZIP_SCHEMA_VERSION,
          exportedAt,
          // Same JSON.parse(JSON.stringify(...)) workaround the Setup files page uses for a default-exporting module.
          appVersion: JSON.parse(JSON.stringify(packageJson)).version,
          ...contents,
          layer: layerFor(contents, name, stamp),
        }, [])
        this.downloadBlob(new Blob([bytes as BlobPart], { type: 'application/zip' }),
          `rangertrak-setup-places-${slug(name)}.zip`)
      } else if (this.format() === 'xlsx') {
        const bytes = await rowsToXlsxBytes(placesToRows(places), 'Places')
        this.downloadBlob(new Blob([bytes as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
          `rangertrak-places-${stamp}${partial}.xlsx`)
      } else {
        this.downloadBlob(new Blob(['﻿', rowsToCsv(placesToRows(places))], { type: 'text/csv;charset=utf-8' }),
          `rangertrak-places-${stamp}${partial}.csv`)
      }
      this.log.info(`Exported ${places.length} places as ${this.format()}.`, this.id)
    } catch (e: any) {
      this.log.error(`Failed to export places: ${e?.message ?? e}`, this.id)
      alert(`Could not export the places.\n\n${e?.message ?? e}`)
    }
  }

  private eventName(): string {
    const s = this.missionService.settings
    return (s?.event?.trim() || s?.mission?.trim() || 'RangerTrak')
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10)
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob)
    const a = this.document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }
}

/** A DOMParser wrapper that throws on malformed XML (a parse error comes back as a document, not an exception). */
function parseXml(text: string): XmlDocumentLike {
  const doc = new DOMParser().parseFromString(text, 'application/xml')
  const problem = doc.getElementsByTagName('parsererror')[0]
  if (problem) {
    throw new Error((problem.textContent ?? 'malformed XML').trim().split('\n')[0])
  }
  return doc
}

/** A file-name-safe version of a layer name. */
function slug(name: string): string {
  return name.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'places'
}
