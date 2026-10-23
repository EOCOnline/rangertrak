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
import { msgNoClashSentence, nextFreeStation, stationsByUse } from '../../domain/msg-no'
import { DevicePrefsService } from '../../shared/services/device-prefs.service'
import { openHandoverFile, readEnvelope } from '../../shared/export/handover-file'
import { layerName, MissionZipAttachment, MissionZipManifest, MissionZipPhoto } from '../../shared/export/mission-zip'
import { AttachmentStoreService, sha256Hex } from '../../shared/services/attachment-store.service'
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
  /** E-194: the bytes in the file's `attachments/` folder; the Radio Log page re-hashes and stores them. */
  attachments: MissionZipAttachment[]
  rangerMerge: RangerMergeResult | null
  locationMerge: LocationMergeResult | null
  /** E-220 / D-68: the station letter this device logs as from now on, when the file carries numbered entries. */
  station?: string
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
  private attachmentStore = inject(AttachmentStoreService)
  private devicePrefs = inject(DevicePrefsService)

  step = signal<Step>('preview')
  busy = signal(false)
  passphrase = signal('')
  /** Shown under the passphrase field after a wrong one; nothing has changed. */
  passphraseError = signal('')
  errorText = signal('')

  manifest = signal<MissionZipManifest | null>(null)
  photos = signal<MissionZipPhoto[]>([])
  attachments = signal<MissionZipAttachment[]>([])
  /** E-194: what the file's attachments would do here. Fingerprints are checked now, so a bad file is flagged before anything is stored. */
  attachmentPreview = signal<{ inFile: number, toAdd: number, alreadyHere: number, mismatched: number } | null>(null)
  rangerMerge = signal<RangerMergeResult | null>(null)
  locationMerge = signal<LocationMergeResult | null>(null)
  entryMerge = signal<EntryMergeResult | null>(null)
  /** Advisory only (D-59): a mismatch warns, it never blocks. */
  mismatches = signal<string[]>([])
  fromName = signal('')
  /** E-220 / D-68: the sender's station letter (the one most used in the file); '' when the file has no numbered entries. */
  fileStation = signal('')
  /** The next letter seen neither in the file nor in this device's own log. */
  alongsideStation = signal('')
  /** Take over is first and the default (Q33). */
  stationChoice = signal<'takeover' | 'alongside'>('takeover')

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
      const { manifest, photos, attachments } = await openHandoverFile(this.data.bytes, this.passphrase())
      this.buildPreview(manifest, photos, attachments)
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

  private buildPreview(manifest: MissionZipManifest, photos: MissionZipPhoto[], attachments: MissionZipAttachment[]): void {
    this.manifest.set(manifest)
    this.photos.set(photos)
    this.attachments.set(attachments)
    void this.previewAttachments(attachments)
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

    const inFile = stationsByUse(manifest.entries ?? [])
    this.fileStation.set(inFile[0] ?? '')
    this.alongsideStation.set(inFile.length
      ? nextFreeStation([...inFile, ...stationsByUse(this.radioLogService.getCurrentRadioLog().logEntries), this.devicePrefs.getMsgStation()])
      : '')

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

  /** Counts only; the fingerprint of every file in the folder is checked against its name. */
  private async previewAttachments(attachments: MissionZipAttachment[]): Promise<void> {
    if (!attachments.length) { this.attachmentPreview.set(null); return }
    let toAdd = 0
    let alreadyHere = 0
    let mismatched = 0
    for (const file of attachments) {
      const buffer = file.bytes.buffer.slice(file.bytes.byteOffset, file.bytes.byteOffset + file.bytes.byteLength) as ArrayBuffer
      if (await sha256Hex(buffer) !== file.sha256) mismatched++
      else if (await this.attachmentStore.has(file.sha256)) alreadyHere++
      else toAdd++
    }
    this.attachmentPreview.set({ inFile: attachments.length, toAdd, alreadyHere, mismatched })
  }

  get hasEntries(): boolean {
    return !!this.manifest()?.entries
  }

  /** The plain line for numbers already held by a different entry here; '' for none. */
  clashLine(): string {
    return msgNoClashSentence(this.entryMerge()?.clashes ?? [])
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
      manifest, photos: this.photos(), attachments: this.attachments(),
      rangerMerge: this.rangerMerge(), locationMerge: this.locationMerge(),
      ...(this.fileStation()
        ? { station: this.stationChoice() === 'takeover' ? this.fileStation() : this.alongsideStation() }
        : {}),
    })
  }
}
