import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core'
import { MatButtonModule } from '@angular/material/button'

import { ViewContext } from '../../domain/view'
import { ViewService } from '../services/view.service'

/**
 * E-207 / ADR D-62 item 4: the quiet "Show all options" button at the foot of a page that hides
 * something in Simple view. Rendered only while the view is Simple AND at least one of the page's
 * advanced ids is actually hidden right now; pressing it switches to Full view (source `user`).
 * `here` carries facts only the page knows (see `ViewService.isShown`).
 */
@Component({
  selector: 'rangertrak-show-all-options',
  standalone: true,
  imports: [MatButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (view.isSimple() && view.hidesAny(ids(), here())) {
    <p class="show-all-options">
      <button matButton type="button" data-testid="show-all-options" (click)="view.setView('full')"
        title="Switch to Full view: every control, including the advanced ones. Nothing is changed.">
        Show all options
      </button>
    </p>
    }`,
  styles: `.show-all-options { margin: var(--rt-space-lg) 0 0; text-align: center; }`,
})
export class ShowAllOptionsComponent {
  /** The advanced feature ids on this page. */
  readonly ids = input.required<readonly string[]>()
  /** Facts only this page knows, passed to `ViewService.isShown`. */
  readonly here = input<Partial<ViewContext>>({})

  protected readonly view = inject(ViewService)
}
