import { Subscription } from 'rxjs'

import { ChangeDetectionStrategy, Component, OnDestroy } from '@angular/core'
import { CommonModule } from '@angular/common'
import { RouterLink } from '@angular/router'
import { MatTabsModule } from '@angular/material/tabs'

import { SectionComponent } from '../../shared/section/section.component'
import { FeedbackComponent } from '../../shared/feedback/feedback.component'
import { PageComponent } from '../../shared/page/page.component'

import { LogService, MissionService, MissionType } from '../../shared/services'

import { HelpAboutComponent } from './tabs/help-about.component'
import { HelpStartComponent } from './tabs/help-start.component'
import { HelpEntryComponent } from './tabs/help-entry.component'
import { HelpMapsComponent } from './tabs/help-maps.component'
import { HelpMissionComponent } from './tabs/help-mission.component'
import { HelpDataComponent } from './tabs/help-data.component'
import { HelpFaqComponent } from './tabs/help-faq.component'
import { HelpLogComponent } from './tabs/help-log.component'

/**
 * The in-app user documentation, and (E-84 decision, 2026-08-24) the canonical one: it ships
 * with the app, always matches the running version, and works with no connection - which is
 * the situation this product exists for. FIELD-GUIDE.md is now the pre-mission companion,
 * not a second copy of this.
 *
 * This page was one long scroll until E-84. That is how six shipped features (route trails,
 * per-ranger markers, base-layer switching, offline tile saving, the theme toggle, the
 * readiness dot) ended up documented nowhere at all - there was no obvious place to add
 * anything and no way to see what was already covered. Content now lives in sibling
 * components under ./tabs, one per tab (eight as of 2026-08-27: "Start here" split into a
 * separate About tab - it had been doing two jobs at once - and a Log tab was added so the
 * Log page, deliberately absent from the main nav, is still easy to find).
 *
 * Content rule for anything added here, from the maintainer: keep it minimal, the UI should
 * be self-explanatory. These tabs deliberately cover only what a screen cannot say for
 * itself. Where the UI is NOT self-explanatory, the fix belongs in the UI.
 */
@Component({
  selector: 'rangertrak-help',
  standalone: true,
  imports: [
    CommonModule, PageComponent, SectionComponent, RouterLink, FeedbackComponent, MatTabsModule,
    HelpAboutComponent, HelpStartComponent, HelpEntryComponent, HelpMapsComponent,
    HelpMissionComponent, HelpDataComponent, HelpLogComponent, HelpFaqComponent,
  ],
  templateUrl: './help.component.html',
  styleUrls: ['./help.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  // Deliberately NOT providing MissionService: it is providedIn:'root' and a second
  // instance here would diverge from everyone else's. See BUG-2 in entry.component.ts.
})
export class HelpComponent implements OnDestroy {

  id = 'Help'
  private missionSubscription!: Subscription
  private settings!: MissionType
  public version = ''
  today = new Date()

  constructor(
    private log: LogService,
    private missionService: MissionService
  ) {
    this.missionSubscription = this.missionService.getMissionObserver().subscribe({
      next: (newMission) => {
        this.settings = newMission
        this.log.excessive('Received new Settings via subscription.', this.id)
      },
      error: (e) => this.log.error('Settings Subscription got:' + e, this.id),
      complete: () => this.log.info('Settings Subscription complete', this.id)
    })

    this.version = this.settings ? this.settings.version : '0'
  }

  ngOnDestroy() {
    this.missionSubscription?.unsubscribe()
  }
}
