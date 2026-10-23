import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject } from '@angular/core'
import { MatButtonModule } from '@angular/material/button'
import { MatDialog } from '@angular/material/dialog'
import { MatIconModule } from '@angular/material/icon'

import { clockTime, describeLastImport, safetyCopyExpiresAt } from '../../domain/import-safety'
import { promptAndBackUpMission } from '../export/backup-prompts'
import { BackupService } from '../services/backup.service'
import { ImportSafetyService } from '../services/import-safety.service'
import { LogService } from '../services/log.service'
import { RecordStore } from '../storage/record-store'

/** How often an open card re-checks the 24-hour expiry. */
const EXPIRY_CHECK_MS = 30_000

/**
 * "Undo last import" (E-198 phase 1): appears only while an import safety copy exists, in Mission >
 * Data safety and (the same feature) on a field phone's Entry page. Undo puts the whole device back
 * as it was just before the import, which is the same for a Restore and for a merge (Report Packet,
 * Setup file). The copy expires 24 hours after it was taken.
 */
@Component({
  selector: 'rangertrak-import-safety-card',
  standalone: true,
  imports: [MatButtonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    @if (safety.last(); as meta) {
      <section class="isc" data-testid="import-safety-card" aria-label="Undo last import">
        <h3 class="isc__head">Undo last import</h3>
        <p class="isc__text" data-testid="import-safety-text">
          {{ describe(meta) }}
          @if (meta.reason === 'restore') {
            Undo puts back the mission as it was just before.
          } @else if (meta.reason === 'roster') {
            Undo puts back the roster (and ranger photos) as they were just before. The log and settings are not touched.
          } @else {
            Undo puts back the whole mission as it was just before this merge, so anything logged since goes too.
          }
        </p>
        <p class="isc__note">The safety copy is kept until {{ expires(meta) }}, then discarded.</p>
        <div class="isc__buttons">
          <button matButton="outlined" type="button" data-testid="import-safety-undo" (click)="onUndo()">
            <mat-icon>undo</mat-icon>
            Undo last import
          </button>
          <button matButton type="button" data-testid="import-safety-discard" (click)="onDiscard()">
            Discard safety copy
          </button>
        </div>
      </section>
    }
  `,
  styles: [`
    .isc { margin: 1rem 0; padding: 0.75rem 1rem; border: 1px solid var(--rt-line); border-radius: 4px; }
    .isc__head { margin: 0 0 0.5rem; font-size: 1rem; }
    .isc__text { margin: 0 0 0.5rem; }
    .isc__note { margin: 0 0 0.75rem; color: var(--rt-ink-2); }
    .isc__buttons { display: flex; flex-wrap: wrap; gap: 0.5rem; }
  `],
})
export class ImportSafetyCardComponent implements OnInit {
  private readonly id = 'Import Safety Card'
  readonly safety = inject(ImportSafetyService)
  private readonly backup = inject(BackupService)
  private readonly dialog = inject(MatDialog)
  private readonly log = inject(LogService)
  private readonly recordStore = inject(RecordStore)
  private readonly destroyRef = inject(DestroyRef)

  describe = describeLastImport

  ngOnInit(): void {
    // Checked when the card renders, and again while it stays on screen.
    void this.safety.checkExpiry()
    const timer = setInterval(() => void this.safety.checkExpiry(), EXPIRY_CHECK_MS)
    this.destroyRef.onDestroy(() => clearInterval(timer))
  }

  expires(meta: { takenAt: string }): string {
    const at = safetyCopyExpiresAt(meta)
    if (!Number.isFinite(at)) return 'tomorrow'
    const d = new Date(at)
    const sameDay = d.toDateString() === new Date().toDateString()
    return `${clockTime(d.toISOString())}${sameDay ? '' : ' tomorrow'}`
  }

  async onUndo(): Promise<void> {
    const meta = this.safety.last()
    if (!meta) return
    const at = clockTime(meta.takenAt)

    for (; ;) {
      const lost = this.safety.entriesLostByUndo()
      if (lost === 0) {
        if (!confirm(`Undo the last import?\n\nThe mission goes back to how it was just before ${at}.`)) return
        break
      }
      const choice = await this.choose({
        title: 'Undo the last import?',
        paragraphs: [
          `${lost} entr${lost === 1 ? 'y' : 'ies'} logged since ${at} will be lost. Back them up first?`,
          `Undo puts the mission back as it was just before ${at}.`,
        ],
        actions: [{ label: 'Back up first', value: 'backup' }, { label: 'Undo', value: 'undo' }],
      })
      if (choice === 'undo') break
      if (choice !== 'backup') return
      await promptAndBackUpMission(this.backup, this.log, this.id)
      // Back to the question, so Undo is one click after the backup.
    }

    try {
      await this.safety.undo()
      this.log.verbose('Undo card: undid the last import.', this.id)
      alert('The last import was undone. Reloading to refresh every screen with the restored mission...')
      await this.reloadPage()
    } catch (e: any) {
      this.log.error(`Undo last import failed: ${e?.message ?? e}`, this.id)
      alert(`Could not undo the last import: ${e?.message ?? e}`)
    }
  }

  async onDiscard(): Promise<void> {
    if (!confirm('Discard the safety copy?\n\nUndo last import will no longer be possible, and the space it was keeping is freed.')) return
    await this.safety.discard()
  }

  private async choose(data: import('./import-choice-dialog.component').ImportChoiceDialogData): Promise<string | undefined> {
    const { ImportChoiceDialogComponent } = await import('./import-choice-dialog.component')
    const ref = this.dialog.open(ImportChoiceDialogComponent, { width: '32rem', maxWidth: '95vw', data })
    return new Promise(resolve => ref.afterClosed().subscribe(r => resolve(r)))
  }

  // A plain `window.location.reload()` is not spyable in Chrome, so tests use this wrapper
  // (same as SetupFileComponent.reloadPage()). Flushes the record store first (E-122 Phase 2a).
  async reloadPage(): Promise<void> {
    await this.recordStore.flush()
    window.location.reload()
  }
}
