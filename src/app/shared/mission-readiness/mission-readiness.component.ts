import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core'
import { RouterLink } from '@angular/router'

import { MissionReadinessService } from '../services'

/**
 * ADR D-32: the persistent readiness indicator, rendered once inside HeaderComponent so it
 * appears on every page. A coloured dot rather than text/icon - the header strip is already
 * dense on a phone - with the full breakdown in its `title` tooltip. Deliberately never
 * reads as a permission gate: nothing here disables Entry or any other action.
 *
 * The dot is a `routerLink` to /settings, not just a tooltip - every signal it tracks
 * (mission name, roster, op-period, offline tiles, storage persistence) is resolved from
 * there, so a scribe who hovers to read "what's wrong" has somewhere to click and fix it.
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

  get tooltip(): string {
    const r = this.readiness
    const line = (ok: boolean, label: string) => `${ok ? '✓' : '✗'} ${label}`
    return [
      `Mission readiness: ${r.level()}`,
      line(r.missionNamed(), 'Mission named'),
      line(r.rosterLoaded(), 'Real roster loaded'),
      line(r.opPeriodCurrent(), 'Operating period current'),
      line(r.offlineTilesSaved(), 'Offline map tiles saved (Leaflet)'),
      line(r.bundledMapWarmed(), 'Backup map warmed (MapLibre)'),
      line(r.storagePersisted(), 'Storage protected from eviction'),
    ].join('\n')
  }
}
