import { Directive, computed, inject, input } from '@angular/core'

import { ViewService } from '../services/view.service'

/**
 * E-207 / ADR D-62 item 7: the one shared "Advanced" marker. Put `[rtAdvanced]="'some-id'"` on a
 * card or control that Simple view can hide, and in Full view it gets `.rt-advanced`
 * (styles/_patterns.scss: a small "Advanced" label and a left rule), so core and extra are
 * visible at a glance. In Simple view nothing is added. It never hides anything itself; that is
 * `ViewService.isShown()`.
 */
@Directive({
  selector: '[rtAdvanced]',
  host: { '[class.rt-advanced]': 'marked()' },
})
export class AdvancedDirective {
  /** The id in `ADVANCED_FEATURES` (domain/view.ts). */
  readonly rtAdvanced = input.required<string>()

  private readonly view = inject(ViewService)
  protected readonly marked = computed(() => this.view.isAdvanced(this.rtAdvanced()))
}
