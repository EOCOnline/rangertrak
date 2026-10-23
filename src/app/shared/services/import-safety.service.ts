import { Injectable, inject, signal } from '@angular/core'
import { MatDialog } from '@angular/material/dialog'

import {
  IMPORT_SAFETY_KEY, entriesLoggedSinceImport, heldFingerprints, isSafetyCopyExpired,
} from '../../domain/import-safety'
import type { ImportSafetyMeta, ImportSafetyReason } from '../../domain/import-safety'
import { recordStore } from '../storage/record-store'
import { AttachmentStoreService } from './attachment-store.service'
import { BackupService } from './backup.service'
import type { MissionExport } from './backup.service'
import { LogService } from './log.service'
import { RangerService } from './ranger.service'
import { MissionJournalService } from './mission-journal.service'
import { RadioLogService } from './radio-log.service'

/**
 * What is stored under `importSafetyCopy`: the copy and the record of the import it precedes.
 * `afterImport` is the entry uids on the device once the import finished (`markImportDone()`), so
 * Undo's warning counts only entries logged after the import, not the ones it brought in.
 */
type StoredSafetyCopy = {
  meta: ImportSafetyMeta, payload: MissionExport, afterImport?: string[]
  /** A roster copy only: the roster import baseline as it was (null = none), which the backup payload does not carry. */
  rosterBaseline?: string | null
}

/** The safety copy could not be kept (storage full, or writes are off in this tab). */
export class SafetyCopyFailedError extends Error {
  constructor(public readonly plainReason: string) {
    super(plainReason)
    this.name = 'SafetyCopyFailedError'
  }
}

/**
 * The import safety copy (E-198 phase 1): just before an import changes anything, the whole device
 * (settings, roster, log, places, AAR notes, layers, ranger photos) is kept as an ordinary
 * mission backup under the RecordStore key `importSafetyCopy`, for 24 hours and one level only.
 * Mission > Data safety then offers "Undo last import", which puts the copy back through
 * `BackupService.importMission()` (the same migration path as Restore).
 *
 * The copy holds the whole roster (rule 5), so the key is in `ENCRYPTED_KEYS`: device encryption
 * covers it like the roster. No change to the backup format.
 *
 * **Attachments (ADR D-60 item 8, amended 2026-10-18).** The copy carries references, not bytes.
 * While it exists, its LIVE references count as references for the attachment sweeps, so Undo
 * brings entries back with their photos. `AttachmentStoreService` asks this service for that set
 * (registered in the constructor); when the copy is replaced, expires or is discarded, a sweep
 * runs against the current entries.
 *
 * Pure rules (expiry, what Undo loses, the held set) are in `domain/import-safety.ts`.
 */
@Injectable({ providedIn: 'root' })
export class ImportSafetyService {

  private id = 'Import Safety Service'
  private backup = inject(BackupService)
  private attachmentStore = inject(AttachmentStoreService)
  private radioLog = inject(RadioLogService)
  private log = inject(LogService)
  private rangers = inject(RangerService)
  private journal = inject(MissionJournalService)
  private dialog = inject(MatDialog)

  private heldSet: ReadonlySet<string> = new Set()
  /** The copy's entries by uid, kept so the card can say what Undo would lose without re-reading the copy. */
  private copyEntryStubs: { uid?: string }[] = []
  /** The entry uids right after the import finished; undefined until `markImportDone()`. */
  private afterImportUids: string[] | undefined

  private lastSignal = signal<ImportSafetyMeta | null>(null)
  /** The import the copy precedes, or null when there is no copy. The card shows exactly while this is set. */
  readonly last = this.lastSignal.asReadonly()

  constructor() {
    this.attachmentStore.setHold(() => this.heldSet)
    this.load()
  }

  /** Reads the stored copy once. An unreadable or expired one is discarded. */
  private load(): void {
    const raw = recordStore.getItem(IMPORT_SAFETY_KEY)
    if (raw === null) return
    let stored: StoredSafetyCopy | null = null
    try {
      const parsed = JSON.parse(raw)
      if (parsed?.meta?.takenAt && Array.isArray(parsed?.payload?.radioLog?.logEntries)) stored = parsed
    } catch { /* an unreadable copy is no copy */ }
    if (!stored || isSafetyCopyExpired(stored.meta)) {
      this.log.warn(stored ? 'The import safety copy has expired; removing it.' : 'The import safety copy could not be read; removing it.', this.id)
      void this.discard()
      return
    }
    this.adopt(stored)
  }

  private adopt(stored: StoredSafetyCopy): void {
    const entries = stored.payload.radioLog.logEntries
    this.heldSet = heldFingerprints(entries)
    this.copyEntryStubs = entries.map(e => ({ uid: e.uid }))
    this.afterImportUids = stored.afterImport
    this.lastSignal.set(stored.meta)
  }

  /** Discards the copy if it is 24 hours old. Called on load and while the card is on screen. */
  async checkExpiry(): Promise<void> {
    const meta = this.lastSignal()
    if (meta && isSafetyCopyExpired(meta)) {
      this.log.warn('The import safety copy has expired; removing it.', this.id)
      await this.discard()
    }
  }

  /**
   * Takes the safety copy. Throws `SafetyCopyFailedError` (with a plain reason) when it could not
   * be kept; in that case the previous copy, if any, is left as it was.
   */
  async take(reason: ImportSafetyReason, fileName: string): Promise<void> {
    const previous = recordStore.getItem(IMPORT_SAFETY_KEY)
    const hadCopy = this.lastSignal() !== null
    let payload: MissionExport
    try {
      payload = await this.backup.buildExportPayload(false)
    } catch (e: any) {
      this.log.error(`Safety copy: could not read the device: ${e?.message ?? e}`, this.id)
      throw new SafetyCopyFailedError('RangerTrak could not read everything on this device.')
    }
    const meta: ImportSafetyMeta = { takenAt: new Date().toISOString(), reason, fileName, appVersion: payload.appVersion }
    const stored: StoredSafetyCopy = { meta, payload }
    if (reason === 'roster') stored.rosterBaseline = this.rangers.importBaselineRaw()
    const value = JSON.stringify(stored)

    recordStore.setItem(IMPORT_SAFETY_KEY, value)
    let failed = recordStore.getItem(IMPORT_SAFETY_KEY) !== value   // writes are off in this tab
    if (!failed) failed = (await recordStore.flushReportingFailures()).has(IMPORT_SAFETY_KEY)
    if (failed) {
      if (previous === null) recordStore.removeItem(IMPORT_SAFETY_KEY)
      else recordStore.setItem(IMPORT_SAFETY_KEY, previous)
      await recordStore.flush()
      this.log.error('Safety copy: the copy could not be written to this device\'s storage.', this.id)
      throw new SafetyCopyFailedError('This device has no room left in browser storage for it.')
    }

    this.adopt(stored)
    this.log.info(`Safety copy taken before a ${reason} import (${Math.round(value.length / 1024)} KB).`, this.id)
    // The copy it replaced no longer protects anything: free the bytes only that one held.
    if (hadCopy) await this.sweepNow()
  }

  /**
   * `take()` for an import's own code. Resolves 'kept' (go ahead, Undo will be there), 'skipped' (the copy
   * could not be kept and the person chose to continue without one) or 'cancelled' (stop). When the copy
   * could not be kept it says so plainly and asks "Continue without a safety copy?" (Cancel is the default).
   */
  async ensureBeforeImport(reason: ImportSafetyReason, fileName: string): Promise<'kept' | 'skipped' | 'cancelled'> {
    try {
      await this.take(reason, fileName)
      return 'kept'
    } catch (e: any) {
      const why = e instanceof SafetyCopyFailedError ? e.plainReason : 'Something went wrong.'
      const { ImportChoiceDialogComponent } = await import('../import-safety/import-choice-dialog.component')
      const ref = this.dialog.open(ImportChoiceDialogComponent, {
        width: '32rem', maxWidth: '95vw',
        data: {
          title: 'No safety copy',
          paragraphs: [
            `RangerTrak could not keep a safety copy of this device before importing. ${why}`,
            'Without it, "Undo last import" will not be available for this import.',
            'Continue without a safety copy?',
          ],
          actions: [{ label: 'Continue without a safety copy', value: 'continue' }],
          cancelLabel: 'Cancel',
        },
      })
      const answer = await new Promise<string | undefined>(resolve => ref.afterClosed().subscribe(r => resolve(r)))
      return answer === 'continue' ? 'skipped' : 'cancelled'
    }
  }

  /**
   * Called by each import once it has finished (before any reload): records which entries the
   * import left on the device, so Undo's warning counts only what was logged afterwards.
   */
  async markImportDone(): Promise<void> {
    const raw = recordStore.getItem(IMPORT_SAFETY_KEY)
    if (raw === null) return
    const stored = JSON.parse(raw) as StoredSafetyCopy
    stored.afterImport = this.radioLog.getCurrentRadioLog().logEntries
      .map(e => e.uid).filter((u): u is string => !!u)
    recordStore.setItem(IMPORT_SAFETY_KEY, JSON.stringify(stored))
    this.afterImportUids = stored.afterImport
    await recordStore.flush()
  }

  /** How many entries logged since the import finished Undo would lose. */
  entriesLostByUndo(): number {
    if (!this.lastSignal()) return 0
    if (this.lastSignal()!.reason === 'roster') return 0   // a roster Undo never touches the log
    return entriesLoggedSinceImport(this.copyEntryStubs, this.afterImportUids,
      this.radioLog.getCurrentRadioLog().logEntries).length
  }

  /**
   * Undo last import: puts the copy back through `importMission()`, deletes the copy (no redo),
   * runs the sweep. It never takes a new safety copy of itself. The caller reloads the page.
   */
  async undo(): Promise<void> {
    const raw = recordStore.getItem(IMPORT_SAFETY_KEY)
    if (raw === null) throw new Error('There is no safety copy to put back.')
    const stored = JSON.parse(raw) as StoredSafetyCopy
    if (stored.meta.reason === 'roster') {
      // Roster parts only: never settings or the radio log, so entries logged since are kept.
      await this.backup.restoreRosterParts(stored.payload)
      this.rangers.restoreImportBaselineRaw(stored.rosterBaseline ?? null)
    } else {
      // The hold is still in force here, so this import's own sweep keeps the copy's bytes.
      await this.backup.importMission(stored.payload)
    }
    await this.discard()
    this.journal.record('import-undone', `Undid the last import (a ${stored.meta.reason} import at ${stored.meta.takenAt}).`)
  }

  /** Throws the copy away, then frees the bytes only it was keeping. */
  async discard(): Promise<void> {
    recordStore.removeItem(IMPORT_SAFETY_KEY)
    this.heldSet = new Set()
    this.copyEntryStubs = []
    this.afterImportUids = undefined
    this.lastSignal.set(null)
    await recordStore.flush()
    await this.sweepNow()
  }

  /** A sweep against the entries on the device now, with whatever hold is left (none after a discard). */
  private async sweepNow(): Promise<void> {
    const entries = this.radioLog.getCurrentRadioLog().logEntries
    await this.attachmentStore.sweepOrphans(entries)
    await this.attachmentStore.releaseRemoved(entries)
  }
}
