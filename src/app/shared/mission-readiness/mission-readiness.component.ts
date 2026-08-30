import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core'
import { RouterLink } from '@angular/router'

import { MissionReadinessService } from '../services'

/**
 * ADR D-32: the persistent readiness indicator, rendered once inside HeaderComponent so it
 * appears on every page. A colored dot rather than text/icon - the header strip is already
 * dense on a phone. Deliberately never reads as a permission gate: nothing here disables
 * Entry or any other action.
 *
 * The dot itself is a `routerLink` to /mission - a reasonable general-purpose fallback, and
 * where three of the six signals live anyway. The full six-item breakdown, each row its own
 * link straight to the section that fixes it (F29-21, 2026-08-30 - "each readiness line
 * links directly to the page+field that fixes it"), lives in HeaderComponent's own hover
 * panel now, not here - see that component's `readinessItems()` for the ported version of
 * what used to be this component's own `items` getter.
 */
@Component({
  selector: 'rangertrak-mission-readiness',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './mission-readiness.component.html',
  styleUrls: ['./mission-readiness.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class MissionReadinessComponent implements OnInit {
  constructor(public readiness: MissionReadinessService) { }

  ngOnInit(): void {
    // Re-checks the async signals (tiles saved, bundled map warmed, storage persisted) on
    // every page view - this component is instantiated fresh per page (PageComponent ->
    // HeaderComponent -> here), so this is effectively "refresh on navigation".
    this.readiness.refresh()
  }

  // Plain-text form, kept for the accessible name (aria-label) - a screen reader has no
  // use for the colored HTML breakdown below, and this is what the existing spec asserts
  // against.
  get tooltip(): string {
    const r = this.readiness
    const line = (ok: boolean, label: string) => `${ok ? '✓' : '✗'} ${label}`
    return [
      `Mission readiness: ${r.level()}`,
      line(r.missionNamed(), 'Mission named'),
      line(r.rosterLoaded(), 'Real roster loaded'),
      line(r.opPeriodCurrent(), 'Operating period current'),
      line(r.offlineTilesSaved(), 'Offline map tiles saved (Leaflet)'),
      line(r.bundledMapWarmed(), 'Alternative map warmed (MapLibre)'),
      line(r.storagePersisted(), 'Storage protected from eviction'),
    ].join('\n')
  }

  // Raised live 2026-08-30: the structured (route/fragment-linked) form of this breakdown
  // moved to HeaderComponent.readinessItems() - this dot is only ever used inside that
  // component's own pill now, and having both render their own competing hover panels was
  // the actual complaint. This getter stays for the plain-text tooltip/aria-label above.
}
