import { ChangeDetectionStrategy, Component, inject } from '@angular/core'
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog'
import { MatButtonModule } from '@angular/material/button'

import type { RestorePreview } from '../../../domain/restore-preview'

export type RestorePreviewDialogData = {
  fileName: string
  preview: RestorePreview
  /** `AttachmentStoreService.deletionNotice()` text for this restore ('' when no attachments are affected). */
  attachmentNote: string
}

/**
 * Preview before Restore (E-198 phase 1): the device and the file side by side, then Restore or
 * Cancel (Cancel is in focus). Closes with `true` only on Restore. The comparison itself is the pure
 * `compareForRestore()` in domain/restore-preview.ts; nothing here changes any data.
 */
@Component({
  selector: 'rangertrak-restore-preview-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <h2 mat-dialog-title>Restore &ldquo;{{ data.fileName }}&rdquo;?</h2>
    <mat-dialog-content>
      <p class="rpd__lead">Restore replaces this device's settings, roster, radio log, places and notes with what is in the file.</p>
      <table class="rpd__table" data-testid="restore-preview-table">
        <thead>
          <tr><th scope="col"><span class="rpd__sr">What</span></th><th scope="col">On this device</th><th scope="col">In the file</th></tr>
        </thead>
        <tbody>
          @for (row of data.preview.rows; track row.label) {
            <tr>
              <th scope="row">{{ row.label }}</th>
              <td>{{ row.device }}</td>
              <td>{{ row.file }}</td>
            </tr>
          }
        </tbody>
      </table>

      @if (data.preview.newerVersionWarning) {
        <p class="rpd__warn" role="alert" data-testid="restore-preview-newer">{{ data.preview.newerVersionWarning }}</p>
      }

      <p class="rpd__key" [class.rpd__key--warn]="data.preview.notInFile > 0" role="status" data-testid="restore-preview-notinfile">
        {{ data.preview.notInFileLine }}
      </p>

      @if (data.attachmentNote) {
        <p class="rpd__note" data-testid="restore-preview-attachments">{{ data.attachmentNote.trim() }}</p>
      }

      <p class="rpd__note" data-testid="restore-preview-footer">
        A safety copy is kept for 24 hours. Mission &gt; Data safety &gt; Undo last import.
      </p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button matButton type="button" cdkFocusInitial data-testid="restore-preview-cancel" [mat-dialog-close]="false">Cancel</button>
      <button matButton="filled" type="button" data-testid="restore-preview-restore" [mat-dialog-close]="true">Restore</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .rpd__table { width: 100%; border-collapse: collapse; margin: 0 0 1rem; }
    .rpd__table th, .rpd__table td { padding: 0.25rem 0.5rem; text-align: left; border-bottom: 1px solid var(--rt-line); overflow-wrap: anywhere; }
    .rpd__table tbody th { font-weight: normal; color: var(--rt-ink-2); }
    .rpd__sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
    .rpd__lead { margin: 0 0 0.75rem; }
    .rpd__key { margin: 0 0 0.75rem; font-weight: bold; }
    .rpd__key--warn { color: var(--rt-readiness-red); }
    .rpd__warn { margin: 0 0 0.75rem; color: var(--rt-readiness-red); }
    .rpd__note { margin: 0 0 0.75rem; color: var(--rt-ink-2); }
  `],
})
export class RestorePreviewDialogComponent {
  readonly data = inject<RestorePreviewDialogData>(MAT_DIALOG_DATA)
}
