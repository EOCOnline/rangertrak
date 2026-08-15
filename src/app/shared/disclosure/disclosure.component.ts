import { CommonModule } from '@angular/common'
import { ChangeDetectionStrategy, Component, ElementRef, Input, ViewChild } from '@angular/core'

/**
 * A collapsed section of secondary page content.
 *
 * The app had twelve raw `<details>` blocks across six pages, and they had drifted: some
 * summaries carried `class="big"`, some wrapped a `<span class="big">`, some were plain
 * text, and each page restated `.big` in its own stylesheet. This is the documented slot
 * Sprint B replaces them with (PRIVATE-Roadmap.md 19c).
 *
 * Usage - simple text summary:
 *    <rangertrak-disclosure summary="Instructions"> ...content... </rangertrak-disclosure>
 *
 * Usage - rich summary (links, interpolation), projected instead:
 *    <rangertrak-disclosure>
 *      <span rtSummary>&copy;{{today | date: 'y'}} <a href="...">eoc.online</a></span>
 *      ...content...
 *    </rangertrak-disclosure>
 *
 * `emphasis="plain"` opts out of the bold/larger summary, for disclosures that are
 * genuinely small print rather than a section heading.
 */
@Component({
  selector: 'rangertrak-disclosure',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './disclosure.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./disclosure.component.scss']
})
export class DisclosureComponent {
  /** Plain-text summary. Omit and project `[rtSummary]` for anything richer. */
  @Input() summary = ''

  /** Start expanded. */
  @Input() open = false

  @Input() emphasis: 'strong' | 'plain' = 'strong'

  @ViewChild('details') private detailsEl?: ElementRef<HTMLDetailsElement>

  /**
   * Open this section and bring it into view. Used by the Rangers confidentiality bar's
   * "What this means", so a dismissable summary can still point at the full text.
   */
  reveal(): void {
    const el = this.detailsEl?.nativeElement
    if (!el) {
      return
    }
    el.open = true
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}
