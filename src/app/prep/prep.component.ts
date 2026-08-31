import { CommonModule, DOCUMENT } from '@angular/common'
import { ChangeDetectionStrategy, Component, Inject, signal } from '@angular/core'

import * as packageJson from '../../../package.json'
import { PageComponent } from '../shared/page/page.component'
import { MATERIAL_IMPORTS } from '../material-imports'
import {
  buildMissionZipBytes, extractMissionZip, MissionZipManifest, MissionZipPhoto,
  MISSION_ZIP_SCHEMA_VERSION,
} from '../shared/export/mission-zip'
import { migrateMission } from '../shared/services/mission-migration'
import { normalizeRangerIds } from '../shared/services/ranger-migration'
import { normalizeLocationUids } from '../shared/services/mission-location-migration'
import { LogService, MissionLocationService, MissionService, RangerService } from '../shared/services'
import { RangerPhotoService } from '../shared/services/ranger-photo.service'

/**
 * E-109 Mission Zip, v1 (2026-08-31, ADR D-48 - "a lazy-loaded route inside RangerTrak...
 * since others will always generate a mission"). A pre-mission prep tool: collapses the
 * three imports a coordinator otherwise walks a new device through one at a time (roster
 * JSON, then photos, then a mission JSON) into building and loading one `.zip`.
 *
 * Deliberately its OWN route (`/prep`), not folded into Rangers' existing Import/Export
 * roster controls - those already do one clear job (roster + photos only, no settings) and
 * this does a different one (settings + roster + photos, no field reports, meant for a
 * mission that has not started yet). Conflating the two would make either one's own confirm
 * dialog harder to write honestly about what it actually replaces.
 *
 * v1 scope only: rangers + photos + settings. Teams/Facilities are excluded - see
 * `shared/export/mission-zip.ts`'s own header comment for why (D-a is still gated on
 * real-world input, not a build decision this component can get ahead of).
 *
 * No main-nav entry, same deliberate choice the Log page already made (E-57(1)) - this is a
 * pre-mission tool a coordinator reaches for occasionally, not a page a scribe needs mid-
 * mission. Findable from Rangers' own roster-management controls instead.
 */
@Component({
  selector: 'rangertrak-prep',
  standalone: true,
  imports: [CommonModule, PageComponent, ...MATERIAL_IMPORTS],
  templateUrl: './prep.component.html',
  styleUrls: ['./prep.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class PrepComponent {
  private id = 'Mission Prep'
  title = 'Mission Zip'
  pageDescr = 'Package a roster, its photos, and mission settings into one file a coordinator hands to a scribe before a mission starts - or load one someone handed you.'

  building = signal(false)
  applying = signal(false)

  /** Set once a picked .zip has been read and validated, before the operator confirms applying it. */
  pending = signal<{ manifest: MissionZipManifest; photos: MissionZipPhoto[] } | null>(null)

  constructor(
    private rangerService: RangerService,
    private missionService: MissionService,
    private locationService: MissionLocationService,
    private photos: RangerPhotoService,
    private log: LogService,
    @Inject(DOCUMENT) private document: Document,
  ) { }

  async onBtnBuildZip(): Promise<void> {
    const rangers = this.rangerService.rangers
    if (!rangers.length) {
      alert('There is no roster on this device to package - add or import rangers first.')
      return
    }

    this.building.set(true)
    try {
      const photoBlobs = await this.photos.allPhotoBlobs()
      // REVIEW: same JSON.parse(JSON.stringify(...)) workaround backup.service.ts and
      // mission.service.ts already use for "Should not import the named export ... from
      // default-exporting module."
      const appVersion = JSON.parse(JSON.stringify(packageJson)).version

      const locations = this.locationService.getCurrentLocations()
      const manifest: MissionZipManifest = {
        schemaVersion: MISSION_ZIP_SCHEMA_VERSION,
        exportedAt: new Date().toISOString(),
        appVersion,
        settings: this.missionService.settings,
        rangers,
        locations,
      }

      const bytes = await buildMissionZipBytes(manifest, photoBlobs)
      const blob = new Blob([bytes as BlobPart], { type: 'application/zip' })
      const url = URL.createObjectURL(blob)
      const missionLabel = (manifest.settings.mission || 'mission').replace(/[^a-z0-9_-]+/gi, '_')
      const filename = `rangertrak-mission-zip-${missionLabel}-${manifest.exportedAt.slice(0, 10)}.zip`

      const a = this.document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)

      this.log.info(`Built Mission Zip: ${filename} (${rangers.length} rangers, ${locations.length} locations, ${photoBlobs.length} photos).`, this.id)
    } catch (e: any) {
      this.log.error(`Failed to build Mission Zip: ${e?.message ?? e}`, this.id)
      alert(`Could not build the Mission Zip.\n\n${e?.message ?? e}`)
    } finally {
      this.building.set(false)
    }
  }

  async onZipFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    input.value = '' // so re-picking the same file still fires a change event

    if (!file) {
      return
    }

    try {
      const bytes = new Uint8Array(await file.arrayBuffer())
      const { manifest, photos } = extractMissionZip(bytes)
      this.pending.set({ manifest, photos })
    } catch (e: any) {
      this.log.error(`Could not read "${file.name}" as a Mission Zip: ${e?.message ?? e}`, this.id)
      alert(`Could not read "${file.name}".\n\n${e?.message ?? e}`)
    }
  }

  onCancelPending(): void {
    this.pending.set(null)
  }

  /**
   * Applies a loaded-and-previewed Mission Zip: settings and roster are migrated through the
   * same functions `BackupService.importMission()` uses for a Mission Export, so a zip built
   * by an older app version upgrades exactly the same way a JSON export would. Photos are
   * matched via `RangerPhotoService.importFiles()`'s own id-then-callsign stem matching
   * against the INCOMING roster, not carried over blind - a photo that matched the exporting
   * device's roster is not guaranteed to still match after migration/normalization.
   *
   * Existing photos are cleared before the new ones are stored (finishing checklist gap #8,
   * decided 2026-08-31): applying a Mission Zip replaces the roster wholesale, so a leftover
   * photo keyed by a reused id/callsign would otherwise silently show the WRONG person's face
   * for the new roster - exactly the failure roster-build's "a wrong photo is worse than no
   * photo" rule exists to prevent.
   */
  async onBtnApplyPending(): Promise<void> {
    const p = this.pending()
    if (!p) {
      return
    }

    const currentRangers = this.rangerService.rangers.length
    // Same non-fatal-problems check importRosterBundle() (rangers.component.ts) runs before
    // its own confirm() - checked on the INCOMING roster, before normalizeRangerIds() below,
    // same as that path (gap #7).
    const warnings = this.rangerService.rosterWarnings(p.manifest.rangers)
    warnings.forEach(w => this.log.warn(`Mission Zip import warning: ${w}`, this.id))

    if (!confirm(
      `Load "${p.manifest.settings.mission || 'this mission'}" from this Mission Zip?\n\n`
      + `  ${p.manifest.rangers.length} rangers\n`
      + `  ${p.manifest.locations?.length ?? 0} locations\n`
      + `  ${p.photos.length} photos\n\n`
      + (warnings.length ? `Note:\n  - ${warnings.join('\n  - ')}\n\n` : '')
      + `This REPLACES the current roster of ${currentRangers}, mission settings, locations, `
      + `and EVERY ranger photo currently stored on this device (even ones this zip has no `
      + `replacement for). There are no field reports in a Mission Zip (it is a pre-mission `
      + `template), so nothing already logged is touched.`)) {
      this.log.verbose('onBtnApplyPending: user cancelled.', this.id)
      return
    }

    this.applying.set(true)
    try {
      const settings = migrateMission(p.manifest.settings, this.missionService.initMission())
      this.missionService.updateMission(settings)

      const rangers = normalizeRangerIds(p.manifest.rangers).rangers
      this.rangerService.replaceAllRangers(rangers)

      this.locationService.replaceAllLocations(normalizeLocationUids(p.manifest.locations ?? []))

      // Cleared before importFiles() stores the new ones - see this method's own doc comment.
      await this.photos.clear()
      const files = p.photos.map(photo =>
        new File([photo.bytes as BlobPart], photo.filename, { type: this.mimeFor(photo.filename) }))
      const { stored, unmatched } = await this.photos.importFiles(files, rangers)

      this.log.warn(`Applied Mission Zip: ${rangers.length} rangers, ${p.manifest.locations?.length ?? 0} locations, ${stored.length} photos matched.`, this.id)

      const lines = [`Loaded ${rangers.length} rangers, ${p.manifest.locations?.length ?? 0} locations, and ${stored.length} photos.`]
      if (unmatched.length) {
        lines.push('', `${unmatched.length} photo${unmatched.length === 1 ? '' : 's'} did not match a ranger and were skipped.`)
      }
      lines.push('', 'Reloading so every screen picks them up...')
      alert(lines.join('\n'))
      this.reloadPage()
    } catch (e: any) {
      this.log.error(`Failed to apply Mission Zip: ${e?.message ?? e}`, this.id)
      alert(`Could not apply this Mission Zip.\n\n${e?.message ?? e}`)
    } finally {
      this.applying.set(false)
    }
  }

  // Same wrapper rangers.component.ts's own reloadPage() is, for the same reason: a plain
  // `window.location.reload()` call is not spyable in Chrome (its `reload` method is
  // non-configurable), so a real test would either throw on spyOn() or actually reload the
  // Karma page mid-suite. Naming it after the sibling component's identical method, not
  // inventing a new convention.
  reloadPage(): void {
    window.location.reload()
  }

  /** Same extension-to-MIME mapping rangers.component.ts's own importRosterBundle() uses. */
  private mimeFor(name: string): string {
    const ext = (name.match(/\.([a-z0-9]+)$/i)?.[1] || '').toLowerCase()
    return ext === 'png' ? 'image/png'
      : ext === 'gif' ? 'image/gif'
        : ext === 'webp' ? 'image/webp'
          : 'image/jpeg'
  }
}
