import { Injectable, computed, inject, signal } from '@angular/core'
import { Router, NavigationEnd } from '@angular/router'
import { toSignal } from '@angular/core/rxjs-interop'
import { filter, map, startWith } from 'rxjs/operators'

import { GuideEntry, guideFor } from './guide-content'

/**
 * Open/closed state for the one Guide drawer, plus which screen's content it should show.
 *
 * Deliberately route-driven rather than page-registered: a page does not have to remember
 * to publish its guidance on init (and to retract it on destroy), which is the failure mode
 * that leaves a drawer showing the previous screen's help. The URL is already the single
 * source of truth for which screen is on display, so the drawer reads it directly.
 *
 * `providedIn: 'root'` - there is exactly one drawer, rendered once in app.component.html.
 */
@Injectable({ providedIn: 'root' })
export class GuideService {
  private router = inject(Router)

  private readonly _open = signal(false)

  /**
   * Which tab to show when the drawer next opens, by label. Exists so a caller elsewhere on
   * the page can point at a specific tab - the Rangers confidentiality bar's "What this
   * means" opens straight to Privacy, which is what its old `reveal()` did before that
   * content moved into the drawer.
   */
  private readonly _requestedTab = signal<string | undefined>(undefined)

  /** The current route, tracked so `entry` below re-resolves on every navigation. */
  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map(e => e.urlAfterRedirects),
      // NavigationEnd has usually already fired by the time anything reads this, so seed
      // from the router's current URL rather than waiting for the next navigation.
      startWith(this.router.url)
    ),
    { initialValue: this.router.url }
  )

  /** The guide content for the screen currently on display, or undefined if it has none. */
  readonly entry = computed<GuideEntry | undefined>(() => guideFor(this.url()))

  /** Whether this screen has anything to show - the Guide button hides itself when not. */
  readonly available = computed(() => this.entry() !== undefined)

  /** True only when the drawer should actually be rendered. */
  readonly isOpen = computed(() => this._open() && this.available())

  /** Index of the requested tab in the current entry, or 0 when none was asked for. */
  readonly selectedTabIndex = computed(() => {
    const wanted = this._requestedTab()
    if (!wanted) { return 0 }
    const i = this.entry()?.tabs.findIndex(t => t.label === wanted) ?? -1
    return i >= 0 ? i : 0
  })

  open(tabLabel?: string): void {
    if (this.available()) {
      this._requestedTab.set(tabLabel)
      this._open.set(true)
    }
  }

  close(): void {
    this._open.set(false)
  }

  toggle(): void {
    this._open() ? this.close() : this.open()
  }
}
