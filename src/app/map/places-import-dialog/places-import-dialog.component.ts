import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core'
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog'

import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatButtonModule } from '@angular/material/button'
import { MatDialogModule } from '@angular/material/dialog'
import { MatSelectModule } from '@angular/material/select'
import { MatRadioModule } from '@angular/material/radio'
import {
  applyPlaceMapping, guessPlaceMapping, PlaceMapping, PlacesImportPlan, planPlacesImport, PlaceTarget, PLACE_TARGETS,
} from '../../domain/places-file'
import { headerSetKey, recallMapping } from '../../domain/roster-sheet'
import { SheetFile } from '../../shared/import/sheet-reader'
import { MissionLocationType } from '../../shared/services'
import { DevicePrefsService } from '../../shared/services/device-prefs.service'
import { LayerService } from '../../shared/services/layer.service'
import { layersOfKind, suggestLayerName } from '../../domain/layers'

/** What the Map page hands the dialog. */
export type PlacesImportDialogData = {
  fileName: string
  /** The places now on the device: the preview is a merge into these, never saved here. */
  existing: MissionLocationType[]
  /** The mission's location category names, for spelling and for "new categories". */
  existingTypes: string[]
  /** A spreadsheet to map. */
  sheet?: SheetFile
  /** Places already read from a KML / KMZ / GeoJSON / Setup file: no mapping step. */
  incoming?: MissionLocationType[]
  /** Shapes and rows the reader already dropped, and why. */
  skipped?: number
  warnings?: string[]
  /** Extra lines for the preview (e.g. what else a Setup file carries). */
  notes?: string[]
  /** The name a Setup file calls itself. */
  layerName?: string
  /** False for a hand-over (D-59), which is never a layer: the dialog then offers no layer name. */
  trackable?: boolean
  /** The "as of" date and source a Setup file gave itself; today for anything else. */
  layerAsOf?: string
  layerSource?: string
}

/** What the dialog hands back. Nothing has been saved yet. */
export type PlacesImportDialogResult = {
  plan: PlacesImportPlan
  /** E-187 phase C: the layer to remember this import as, or null when the name was left blank. */
  layer: { name: string, asOf: string, source?: string } | null
  /** Uids the user agreed to remove because they left the layer. Empty unless they chose Remove. */
  removeUids: string[]
}

type Step = 'map' | 'preview'

const TARGET_LABELS: Record<PlaceTarget, string> = {
  name: 'Name',
  category: 'Category',
  lat: 'Latitude',
  lng: 'Longitude',
  wkt: 'Point (WKT, as Google My Maps writes it)',
  address: 'Address (kept as text, not looked up)',
  note: 'Notes',
  uid: 'RangerTrak uid',
  ignore: 'Ignore',
}

/**
 * Import places (E-187 phase B, ADR D-58): map the columns of a spreadsheet, preview what the
 * import would do, then Add to the map. Models the Rangers roster dialog; there is no Replace
 * for places in this phase.
 *
 * The preview IS `planPlacesImport()` run against the places now on the device and thrown away,
 * so what is shown is exactly what Add will do. Nothing is saved here; the Map panel applies it.
 */
@Component({
  selector: 'rangertrak-places-import-dialog',
  standalone: true,
  imports: [MatFormFieldModule, MatInputModule, MatButtonModule, MatDialogModule, MatSelectModule, MatRadioModule],
  templateUrl: './places-import-dialog.component.html',
  styleUrls: ['./places-import-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class PlacesImportDialogComponent {
  readonly data = inject<PlacesImportDialogData>(MAT_DIALOG_DATA)
  private ref = inject<MatDialogRef<PlacesImportDialogComponent, PlacesImportDialogResult>>(MatDialogRef)
  private prefs = inject(DevicePrefsService)
  private layerService = inject(LayerService)

  readonly isSheet = !!this.data.sheet
  readonly sheets = this.data.sheet?.sheets ?? []
  readonly choices = PLACE_TARGETS

  step = signal<Step>(this.isSheet ? 'map' : 'preview')
  sheetName = signal(this.data.sheet?.defaultSheet ?? '')
  rows = signal<string[][]>([])
  targets = signal<PlaceTarget[]>([])
  confident = signal(false)
  remembered = signal(false)

  headers = computed(() => this.rows()[0] ?? [])

  /** A place needs a name and somewhere to be: a latitude and longitude, or a point column. */
  canContinue = computed(() => {
    const t = this.targets()
    return t.includes('name') && ((t.includes('lat') && t.includes('lng')) || t.includes('wkt'))
  })

  incoming = signal<MissionLocationType[]>(this.data.incoming ?? [])
  plan = signal<PlacesImportPlan | null>(null)
  skipped = signal(this.data.skipped ?? 0)
  warnings = signal<string[]>(this.data.warnings ?? [])

  // -- Layers (E-187 phase C, ADR D-58 points 6 and 7) ------------------------------------
  readonly canNameLayer = this.data.trackable !== false
  /** Left blank, the import is not tracked as a layer and behaves exactly as before. */
  layerName = signal(this.data.layerName ?? (this.isSheet ? suggestLayerName(this.data.fileName) : ''))
  /** Default No: removal is always a question, never automatic (D-50). */
  removeLeft = signal(false)
  knownLayerNames = computed(() => [...new Set(layersOfKind(this.layerService.layers(), 'places').map(l => l.name))])
  /** Places in the previous version of this layer that are not in this one and in no other layer. */
  leftBehind = computed(() => {
    const name = this.layerName().trim()
    const plan = this.plan()
    if (!this.canNameLayer || !name || !plan) return []
    const gone = new Set(this.layerService.leftBehind(name, 'places', plan.merge.touchedUids))
    return this.data.existing.filter(l => !!l.uid && gone.has(l.uid))
  })
  leftBehindNames = computed(() => {
    const names = this.leftBehind().map(l => l.name)
    return names.slice(0, 8).join(', ') + (names.length > 8 ? `, and ${names.length - 8} more` : '')
  })

  updatedShown = computed(() => (this.plan()?.merge.changes ?? []).slice(0, 10))
  updatedHidden = computed(() => Math.max(0, (this.plan()?.merge.changes.length ?? 0) - 10))
  ignoredHeaders = computed(() => this.headers().filter((h, i) => this.targets()[i] === 'ignore' && h.trim()))

  constructor() {
    if (this.isSheet) {
      this.loadSheet(this.sheetName())
    } else {
      this.buildPreview()
    }
  }

  targetLabel(t: PlaceTarget): string {
    return TARGET_LABELS[t]
  }

  /** Up to three example values from a column, so the user can see what it holds. */
  samples(col: number): string {
    const out: string[] = []
    for (const row of this.rows().slice(1)) {
      const v = String(row[col] ?? '').trim()
      if (v) out.push(v.length > 24 ? v.slice(0, 23) + '…' : v)
      if (out.length === 3) break
    }
    return out.join('  ·  ')
  }

  onSheetChange(name: string) {
    this.sheetName.set(name)
    this.loadSheet(name)
  }

  setTarget(col: number, target: PlaceTarget) {
    this.targets.update(t => t.map((x, i) => (i === col ? target : x)))
  }

  private loadSheet(name: string) {
    const rows = this.data.sheet?.rows(name) ?? []
    this.rows.set(rows)
    const headers = rows[0] ?? []
    const guess = guessPlaceMapping(headers)
    const recalled = recallMapping<PlaceTarget>(this.prefs.getImportMappings(), headers, 'places:')
    this.targets.set(recalled ?? guess.targets)
    this.remembered.set(!!recalled)
    this.confident.set(!!recalled || guess.unrecognised.length === 0)
  }

  toPreview() {
    this.buildPreview()
    this.step.set('preview')
  }

  toMapping() {
    this.step.set('map')
  }

  private buildPreview() {
    let incoming = this.data.incoming ?? []
    if (this.isSheet) {
      const mapping: PlaceMapping = { targets: this.targets(), unrecognised: [] }
      const applied = applyPlaceMapping(this.rows(), mapping)
      incoming = applied.places
      this.skipped.set(applied.skipped)
      this.warnings.set([...applied.warnings.slice(0, 8),
        ...(applied.warnings.length > 8 ? [`...and ${applied.warnings.length - 8} more rows skipped for the same reason.`] : [])])
    } else {
      this.warnings.set((this.data.warnings ?? []).slice(0, 8))
    }
    this.incoming.set(incoming)
    this.plan.set(planPlacesImport(this.data.existing, incoming, this.data.existingTypes))
  }

  cancel() {
    this.ref.close()
  }

  add() {
    const plan = this.plan()
    if (!plan) return
    if (this.isSheet) {
      this.prefs.rememberImportMapping('places:' + headerSetKey(this.headers()), this.targets())
    }
    const name = this.canNameLayer ? this.layerName().trim() : ''
    const layer = name
      ? { name, asOf: this.data.layerAsOf || new Date().toISOString().slice(0, 10), ...(this.data.layerSource ? { source: this.data.layerSource } : {}) }
      : null
    const removeUids = this.removeLeft() ? this.leftBehind().map(l => l.uid!) : []
    this.ref.close({ plan, layer, removeUids })
  }
}
