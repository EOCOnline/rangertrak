import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core'
import { RouterLink } from '@angular/router'

import { MissionReadinessService } from '../services'

/**
 * ADR D-32: the persistent readiness indicator, rendered once inside HeaderComponent so it
 * appears on every page. A colored dot rather than text/icon - the header strip is already
 * dense on a phone - with the full breakdown in its `title` tooltip. Deliberately never
 * reads as a permission gate: nothing here disables Entry or any other action.
 *
 * The dot itself is a `routerLink` to /mission - a reasonable general-purpose fallback, and
 * where three of the six signals live anyway. F29-21 (2026-08-30) went further: each row in
 * the tooltip breakdown is now its OWN link, straight to the specific section that actually
 * fixes that one signal (Rangers for the roster, Map for the two offline-prep checks) - "each
 * readiness line links directly to the page+field that fixes it" was the maintainer's own
 * framing of what the dot's single generic link was missing. See the `items` getter below.
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

  // Structured form of the same six signals, for the visual tooltip - lets the template
  // color each mark (green ✓ / red ✗) instead of the plain-text glyphs a native `title`
  // attribute is stuck rendering in whatever color the OS tooltip uses.
  //
  // F29-21 (2026-08-30): `route`/`fragment` on each row is the actual feature the maintainer
  // asked for - "should each readiness line link directly to the page+field that fixes it?
  // yes, that is the real feature." Previously only the dot itself linked anywhere, and only
  // to Mission generically, regardless of which signal was actually failing. Each id here is
  // a real element in the target page (see that element's own "F29-21" comment) -
  // withInMemoryScrolling's anchorScrolling (app.config.ts) is what turns the fragment into
  // an actual scroll-to-element on arrival, not just a URL change. Mission named and
  // Operating period current share one target: both live in the same Mission Details card.
  get items(): { ok: boolean, label: string, route: string, fragment: string }[] {
    const r = this.readiness
    return [
      { ok: r.missionNamed(), label: 'Mission named', route: '/mission', fragment: 'readiness-mission-details' },
      { ok: r.rosterLoaded(), label: 'Real roster loaded', route: '/rangers', fragment: 'rangersgrid' },
      { ok: r.opPeriodCurrent(), label: 'Operating period current', route: '/mission', fragment: 'readiness-mission-details' },
      { ok: r.offlineTilesSaved(), label: 'Offline map tiles saved (Leaflet)', route: '/map', fragment: 'readiness-offline-tiles' },
      { ok: r.bundledMapWarmed(), label: 'Alternative map warmed (MapLibre)', route: '/map', fragment: 'readiness-map-engine-switch' },
      { ok: r.storagePersisted(), label: 'Storage protected from eviction', route: '/mission', fragment: 'readiness-storage-protection' },
    ]
  }
}
