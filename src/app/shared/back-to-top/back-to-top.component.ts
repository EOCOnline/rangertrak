import { CommonModule } from '@angular/common'
import {
  ChangeDetectionStrategy, Component, HostListener, OnInit, signal
} from '@angular/core'

/**
 * E-57(3): a floating "back to top" control, shown only once the page is actually tall
 * enough and scrolled far enough to need one.
 *
 * Split out of E-57's other two asks (phone header/footer review, sidebars-vs-accordions)
 * deliberately - the roadmap flags this one as small, self-contained, and shippable on its
 * own, which the other two are not.
 *
 * Why a scroll listener rather than IntersectionObserver on a sentinel: this app is
 * zoneless, and either way the visibility state has to be a signal to reach the template.
 * A passive scroll listener reading scrollY is the smaller of the two, and there is no
 * sentinel element to place that would survive every page's own layout.
 */
@Component({
  selector: 'rangertrak-back-to-top',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './back-to-top.component.html',
  styleUrls: ['./back-to-top.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class BackToTopComponent implements OnInit {

  /** Show once the user is a full viewport-height down - i.e. the top is genuinely gone. */
  private static readonly SHOW_AFTER_PX = 600

  // A signal, not a plain field: this is written from a DOM event listener, which in a
  // zoneless app has no guaranteed path back into change detection otherwise (Sprint G).
  visible = signal(false)

  ngOnInit(): void {
    this.update()
  }

  // passive: the handler never calls preventDefault, and saying so lets the browser
  // scroll without waiting on it.
  @HostListener('window:scroll', [])
  onScroll(): void {
    this.update()
  }

  @HostListener('window:resize', [])
  onResize(): void {
    this.update()
  }

  private update(): void {
    const scrolled = window.scrollY || document.documentElement.scrollTop || 0
    // Also require the page to actually BE scrollable by a meaningful amount, so this
    // never appears on a short page that only moved a little because of a soft keyboard
    // or an expanded disclosure.
    const scrollable = document.documentElement.scrollHeight - window.innerHeight
    this.visible.set(scrolled > BackToTopComponent.SHOW_AFTER_PX && scrollable > BackToTopComponent.SHOW_AFTER_PX)
  }

  toTop(): void {
    // Honour a reduced-motion preference rather than always smooth-scrolling - the same
    // check about.component.ts already uses for its letter animation.
    const motionOK = window.matchMedia('(prefers-reduced-motion: no-preference)').matches
    window.scrollTo({ top: 0, behavior: motionOK ? 'smooth' : 'auto' })
  }
}
