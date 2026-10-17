import { Injectable, inject } from '@angular/core'

import { formatBytes } from '../../domain/attachments'
import type { AttachmentRef } from '../../domain/attachments'
import { AttachmentStoreService } from '../services/attachment-store.service'
import { AttachmentBudgetService } from './attachment-budget.service'
import { LogService } from '../services/log.service'
import { OperatorNameService } from '../services/operator-name.service'
import { RadioLogService } from '../services/radio-log.service'

/** A single file this size or larger asks before it is stored (D-60 item 7). */
export const LARGE_FILE_BYTES = 100 * 1024 * 1024

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

  /** Who is attaching or removing: the operator typed on Entry this session, else blank. */
  operatorName(): string { return this.operator.name().trim() }

  /**
   * Stores the files and adds their references to a SAVED entry. `revise` is true for an entry
   * that already existed before this action (D-47: stamps `revisedAt`), false for the entry the
   * scribe has only just saved. A file that cannot be stored is named in `failed`; the rest still
   * go on.
   */
  async attach(uid: string, files: readonly File[], revise: boolean): Promise<{ added: AttachmentRef[], failed: string[] }> {
    const added: AttachmentRef[] = []
    const failed: string[] = []
    for (const file of files) {
      try {
        added.push(await this.store.add(file, this.operatorName()))
      } catch (e: any) {
        // The file's name stays out of the log: it can describe the content (rule 5).
        this.log.error(`Could not store an attachment: ${e?.message ?? e}`, this.id)
        failed.push(file.name)
      }
    }
    if (added.length) this.radioLog.mergeEntryAttachments(uid, added, revise)
    return { added, failed }
  }
}
