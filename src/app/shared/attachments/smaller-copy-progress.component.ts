import { ChangeDetectionStrategy, Component, inject } from '@angular/core'
import { MatButtonModule } from '@angular/material/button'

import { SmallerCopyService } from './smaller-copy.service'

/**
 * "Making a smaller copy… 40%" with a Cancel, shown wherever a copy is being made (Entry, the
 * viewer). Cancel keeps the original. Names stay out of it: the file's name can describe the
 * content (rule 5), and the screen may be shared.
 */
@Component({
  selector: 'rangertrak-smaller-copy-progress',
  standalone: true,
  imports: [MatButtonModule],
  template: `
    @if (copy.job(); as job) {
    <p class="rt-smaller-progress" role="status" data-testid="smaller-copy-progress">
      Making a smaller copy{{ job.pct === undefined ? '…' : ' ' + job.pct + '%' }}
      <button matButton type="button" data-testid="smaller-copy-cancel" (click)="copy.cancel()"
        title="Stop, and keep the original instead">Cancel</button>
    </p>
    }
  `,
  styles: [`.rt-smaller-progress { align-items: center; display: flex; gap: 0.75em; margin: 0.25em 0; }`],
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class SmallerCopyProgressComponent {
  readonly copy = inject(SmallerCopyService)
}
