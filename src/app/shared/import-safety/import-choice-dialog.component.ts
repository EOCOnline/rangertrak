import { ChangeDetectionStrategy, Component, inject } from '@angular/core'
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog'
import { MatButtonModule } from '@angular/material/button'

export type ImportChoiceAction = { label: string, value: string }

export type ImportChoiceDialogData = {
  title: string
  paragraphs: string[]
  /** The buttons besides Cancel; each closes the dialog with its `value`. */
  actions: ImportChoiceAction[]
  cancelLabel?: string
}

/**
 * A plain choice dialog for the import safety flow (E-198): a few paragraphs and some buttons,
 * with Cancel in focus so a stray Enter never confirms. Closes with the chosen action's `value`,
 * or `undefined` for Cancel. Used for "Continue without a safety copy?" and for Undo's confirm,
 * which `confirm()` cannot do (it has two buttons, Undo needs three).
 */
@Component({
  selector: 'rangertrak-import-choice-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>
      @for (p of data.paragraphs; track $index) {
        <p class="icd__p">{{ p }}</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      @for (a of data.actions; track a.value) {
        <button matButton="outlined" type="button" [attr.data-testid]="'choice-' + a.value" [mat-dialog-close]="a.value">{{ a.label }}</button>
      }
      <button matButton="filled" type="button" cdkFocusInitial data-testid="choice-cancel" [mat-dialog-close]="undefined">
        {{ data.cancelLabel || 'Cancel' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`.icd__p { margin: 0 0 0.75rem; }`],
})
export class ImportChoiceDialogComponent {
  readonly data = inject<ImportChoiceDialogData>(MAT_DIALOG_DATA)
}
