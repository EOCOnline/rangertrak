import { Injectable, inject } from '@angular/core'

import { formatBytes } from '../../domain/attachments'
import type { AttachmentRef } from '../../domain/attachments'
import { AttachmentStoreService } from '../services/attachment-store.service'
import { AttachmentBudgetService } from './attachment-budget.service'
import { LogService } from '../services/log.service'
import { ALREADY_SMALL_NOTE } from './compress/compress-types'
import { SmallerCopyService } from './smaller-copy.service'
import { OperatorNameService } from '../services/operator-name.service'
import { RadioLogService } from '../services/radio-log.service'

/** A single file this size or larger asks before it is stored (D-60 item 7). */
export const LARGE_FILE_BYTES = 100 * 1024 * 1024

/**
 * A picked file waiting to be stored. `offer` is whether a smaller copy can be made here at all
 * (the choice is hidden when not); `smaller` is the choice, and "Keep original" is the default
 * (D-60 item 2, revised). `estimate` is the rough size of a video's smaller copy, when known.
 */
export type PendingAttachment = { file: File, offer: boolean, smaller: boolean, estimate?: number }

/**
 * The questions asked before files are stored, and the act of attaching them to a saved entry.
 * ADR D-60 item 7: a large file asks, the browser's quota is a hard limit said plainly, and
 * nothing else ever blocks (capability, not policy, D-46).
 *
 * Shared by the Entry form (which asks at pick time and stores at save time) and the viewer's
 * Add (which asks and stores at once), so both ask the same things in the same words.
 */
@Injectable({ providedIn: 'root' })
export class AttachmentIntakeService {

  private id = 'Attachment Intake Service'
  private store = inject(AttachmentStoreService)
  private budget = inject(AttachmentBudgetService)
  private radioLog = inject(RadioLogService)
  private operator = inject(OperatorNameService)
  private log = inject(LogService)
  private smallerCopy = inject(SmallerCopyService)

  /**
   * Asks about each file in turn and returns the ones to go ahead with. `pendingBytes` is what
   * is already picked but not yet stored (Entry's chip row), so the browser quota check counts it.
   */
  async vet(files: readonly File[], pendingBytes = 0): Promise<File[]> {
    const accepted: File[] = []
    let planned = pendingBytes
    for (const file of files) {
      if (!(await this.store.hasRoomFor(planned + file.size))) {
        alert(`There is no room left in this browser's storage for "${file.name}" (${formatBytes(file.size)}). `
          + `Free some space on this device, or remove attachments you no longer need, and try again.`)
        continue
      }
      if (file.size >= LARGE_FILE_BYTES && !confirm(
        `"${file.name}" is ${formatBytes(file.size)}.\n\n`
        + `Large files use up the space on this device quickly. Attach it anyway?`)) {
        continue
      }
      // The mission's budget (D-60 item 7): asks when this file would cross 80% or reach 100%,
      // and again for each file while over. Never blocks; the answer is the operator's.
      const after = this.budget.levelAfter(planned + file.size)
      const before = this.budget.levelAfter(planned)
      if ((after === 'over' || (after === 'warn80' && before === 'ok')) && !confirm(
        `Attaching "${file.name}" takes this mission's attachments to `
        + `${formatBytes(this.budget.usage().usedBytes + planned + file.size)} of `
        + `${formatBytes(this.budget.budgetBytes())}, `
        + (after === 'over' ? 'over' : 'past 80% of')
        + ` the budget set on the Mission page.\n\nAttach it anyway?`)) {
        continue
      }
      accepted.push(file)
      planned += file.size
    }
    return accepted
  }

  /** Wraps picked files for the chip row: Keep original selected, a smaller copy offered where it can be made. */
  async pend(files: readonly File[]): Promise<PendingAttachment[]> {
    return Promise.all(files.map(async file => {
      const offer = await this.smallerCopy.canOffer(file).catch(() => false)
      const estimate = offer ? await this.smallerCopy.estimate(file).catch(() => undefined) : undefined
      return { file, offer, smaller: false, ...(estimate ? { estimate } : {}) }
    }))
  }

  /** Who is attaching or removing: the operator typed on Entry this session, else blank. */
  operatorName(): string { return this.operator.name().trim() }

  /**
   * Stores the files and adds their references to a SAVED entry. `revise` is true for an entry
   * that already existed before this action (D-47: stamps `revisedAt`), false for the entry the
   * scribe has only just saved. A file that cannot be stored is named in `failed`; the rest still
   * go on.
   *
   * A file chosen "Smaller copy" (the sender's choice; only files from this device's own picker or
   * camera come here) is fingerprinted first, then made smaller, and ONLY the smaller copy is
   * stored, with `compressed` recording the original's fingerprint, size and type, when and by whom
   * (D-60 item 2, revised). If the copy cannot be made, is cancelled, or is no smaller, the original
   * is stored instead and `notes` says so.
   */
  async attach(uid: string, items: readonly PendingAttachment[], revise: boolean): Promise<{ added: AttachmentRef[], failed: string[], notes: string[] }> {
    const added: AttachmentRef[] = []
    const failed: string[] = []
    const notes: string[] = []
    for (const item of items) {
      try {
        let toStore = item.file
        let compressed: Pick<NonNullable<AttachmentRef['compressed']>, 'fromSha256' | 'fromSize' | 'fromType'> | undefined
        if (item.smaller && item.offer) {
          const made = await this.smallerCopy.make(item.file)
          if (typeof made === 'object') { toStore = made.file; compressed = made.compressed }
          else notes.push(made === 'not-smaller' ? ALREADY_SMALL_NOTE
            : made === 'cancelled' ? 'The smaller copy was cancelled; the original was kept.'
              : 'A smaller copy could not be made; the original was kept.')
        }
        const ref = await this.store.add(toStore, this.operatorName())
        added.push(compressed
          ? { ...ref, compressed: { ...compressed, at: new Date().toISOString(), by: this.operatorName(), where: 'sender' } }
          : ref)
      } catch (e: any) {
        // The file's name stays out of the log: it can describe the content (rule 5).
        this.log.error(`Could not store an attachment: ${e?.message ?? e}`, this.id)
        failed.push(item.file.name)
      }
    }
    if (added.length) this.radioLog.mergeEntryAttachments(uid, added, revise)
    return { added, failed, notes }
  }
}
