import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core'
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog'

import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatButtonModule } from '@angular/material/button'
import { MatDialogModule } from '@angular/material/dialog'
import { DecryptionFailedError } from '../../shared/crypto/encrypted-file'
import { LocationMergeResult, mergeLocations } from '../../domain/location-merge'
import { mergeRangers, RangerMergeResult } from '../../domain/ranger-migration'
import type { EntryMergeResult } from '../../domain/entry-merge'
import { openHandoverFile, readEnvelope } from '../../shared/export/handover-file'
import { layerName, MissionZipManifest, MissionZipPhoto } from '../../shared/export/mission-zip'
import {
  MissionLocationService, MissionService, RadioLogService, RangerService,
} from '../../shared/services'

/** What the Radio Log page hands the dialog: the picked file's bytes, nothing read yet. */
export type HandoverDialogData = {
  fileName: string
  bytes: Uint8Array
}

/** What the dialog hands back on Merge in. Nothing has been saved yet. */
export type HandoverDialogResult = {
  manifest: MissionZipManifest
  photos: MissionZipPhoto[]
  rangerMerge: RangerMergeResult | null
  locationMerge: LocationMergeResult | null
}

type Step = 'passphrase' | 'preview' | 'error'

const MORE = 10

/**
 * Merge in a hand-over file (E-188, ADR D-59): ask for the passphrase if the file is encrypted,
 * then PREVIEW what merging would do (people, places, entries), then confirm.
 *
 * The preview IS the real merge functions run against what is on the device and thrown away
 * (`mergeRangers()`, `mergeLocations()`, `RadioLogService.previewHandoverEntries()`), so what is
 * shown is exactly what Merge in will do. Same look as the roster import preview (D-58): the
 * stylesheet is shared. Nothing is saved here; the Radio Log page applies the result.
 */
@Component({
  selector: 'rangertrak-handover-dialog',
  standalone: true,
  imports: [MatFormFieldModule, MatInputModule, MatButtonModule, MatDialogModule],
  templateUrl: './handover-dialog.component.html',
  styleUrls: ['../../rangers/roster-import-dialog/roster-import-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class HandoverDialogComponent {
  readonly data = inject<HandoverDialogData>(MAT_DIALOG_DATA)
  private ref = inject<MatDialogRef<HandoverDialogComponent, HandoverDialogResult>>(MatDialogRef)
  private rangerService = inject(RangerService)
  private locationService = inject(MissionLocationService)
  private radioLogService = inject(RadioLogService)
  private missionService = inject(MissionService)

  step = signal<Step>('preview')
  busy = signal(false)
  passphrase = signal('')
  /** Shown under the passphrase field after a wrong one; nothing has changed. */
  passphraseError = signal('')
  errorText = signal('')

  manifest = signal<MissionZipManifest | null>(null)
  photos = signal<MissionZipPhoto[]>([])
  rangerMerge = signal<RangerMergeResult | null>(null)
  locationMerge = signal<LocationMergeResult | null>(null)
  entryMerge = signal<EntryMergeResult | null>(null)
  /** Advisory only (D-59): a mismatch warns, it never blocks. */
  mismatches = signal<string[]>([])
  fromName = signal('')

  constructor() {
    if (readEnvelope(this.data.bytes)) {
      this.step.set('passphrase')
    } else {
      void this.open()
    }
  }

  async open(): Promise<void> {
    this.busy.set(true)
    this.passphraseError.set('')
    try {
      const { manifest, photos } = await openHandoverFile(this.data.bytes, this.passphrase())
      this.buildPreview(manifest, photos)
      this.step.set('preview')
    } catch (e: unknown) {
      if (e instanceof DecryptionFailedError) {
        // Wrong passphrase: say so, change nothing, let them try again.
        this.passphraseError.set('That passphrase did not open the file. Check it and try again.')
        this.step.set('passphrase')
      } else {
        this.errorText.set(e instanceof Error ? e.message : String(e))
        this.step.set('error')
      }
    } finally {
      this.busy.set(false)
    }
  }

  private buildPreview(manifest: MissionZipManifest, photos: MissionZipPhoto[]): void {
    this.manifest.set(manifest)
    this.photos.set(photos)
    this.fromName.set(layerName(manifest))

    const rangerMerge = manifest.rangers
      ? mergeRangers(this.rangerService.rangers, manifest.rangers) : null
    const locationMerge = manifest.locations
      ? mergeLocations(this.locationService.getCurrentLocations(), manifest.locations) : null
    this.rangerMerge.set(rangerMerge)
    this.locationMerge.set(locationMerge)
    this.entryMerge.set(manifest.entries
      ? this.radioLogService.previewHandoverEntries(manifest.entries, rangerMerge?.uidRemap ?? {})
      : null)

    const here = this.missionService.settings
    const there = manifest.context
    const out: string[] = []
    if (there) {
      const differs = (a: string | undefined, b: string | undefined) =>
        !!a?.trim() && !!b?.trim() && a.trim() !== b.trim()
      if (differs(there.mission, here?.mission)) out.push(`mission is "${there.mission}" in the file, "${here.mission}" here`)
      if (differs(there.event, here?.event)) out.push(`event is "${there.event}" in the file, "${here.event}" here`)
      if (differs(there.opPeriod, here?.opPeriod)) out.push(`operational period is "${there.opPeriod}" in the file, "${here.opPeriod}" here`)
    }
    this.mismatches.set(out)
  }

  get hasEntries(): boolean {
    return !!this.manifest()?.entries
  }

  updatedPeople() {
    return (this.rangerMerge()?.overwritten ?? []).slice(0, MORE)
  }

  updatedPeopleHidden(): number {
    return Math.max(0, (this.rangerMerge()?.overwritten.length ?? 0) - MORE)
  }

  updatedPlaces() {
    return (this.locationMerge()?.changes ?? []).slice(0, MORE)
  }

  updatedEntries() {
    return (this.entryMerge()?.updatedNotes ?? []).slice(0, MORE)
  }

  rejectedEntries() {
    return (this.entryMerge()?.rejectedNotes ?? []).slice(0, MORE)
  }

  cancel(): void {
    this.ref.close()
  }

  merge(): void {
    const manifest = this.manifest()
    if (!manifest) return
    this.ref.close({
      manifest, photos: this.photos(),
      rangerMerge: this.rangerMerge(), locationMerge: this.locationMerge(),
    })
  }
}
