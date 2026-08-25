import { Subscription } from 'rxjs'

import { ChangeDetectionStrategy, Component, OnDestroy } from '@angular/core'
import { CommonModule } from '@angular/common'
import { RouterLink } from '@angular/router'
import { MatTabsModule } from '@angular/material/tabs'

import { SectionComponent } from '../../shared/section/section.component'
import { FeedbackComponent } from '../../shared/feedback/feedback.component'
import { PageComponent } from '../../shared/page/page.component'

import { LogService, SettingsService, SettingsType } from '../../shared/services'

import { HelpStartComponent } from './tabs/help-start.component'
import { HelpEntryComponent } from './tabs/help-entry.component'
import { HelpMapsComponent } from './tabs/help-maps.component'
import { HelpMissionComponent } from './tabs/help-mission.component'
import { HelpDataComponent } from './tabs/help-data.component'
import { HelpFaqComponent } from './tabs/help-faq.component'

/**
 * The in-app user documentation, and (E-84 decision, 2026-08-24) the canonical one: it ships
 * with the app, always matches the running version, and works with no connection - which is
 * the situation this product exists for. FIELD-GUIDE.md is now the pre-mission companion,
 * not a second copy of this.
 *
 * This page was one long scroll until E-84. That is how six shipped features (route trails,
 * per-ranger markers, base-layer switching, offline tile saving, the theme toggle, the
 * readiness dot) ended up documented nowhere at all - there was no obvious place to add
 * anything and no way to see what was already covered. Content now lives in six sibling
 * components under ./tabs, one per tab.
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
    HelpStartComponent, HelpEntryComponent, HelpMapsComponent,
    HelpMissionComponent, HelpDataComponent, HelpFaqComponent,
  ],
  templateUrl: './help.component.html',
  styleUrls: ['./help.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  // Deliberately NOT providing SettingsService: it is providedIn:'root' and a second
  // instance here would diverge from everyone else's. See BUG-2 in entry.component.ts.
})
export class HelpComponent implements OnDestroy {

  id = 'Help'
  private settingsSubscription!: Subscription
  private settings!: SettingsType
  public version = ''
  today = new Date()

  constructor(
    private log: LogService,
    private settingsService: SettingsService
  ) {
    this.settingsSubscription = this.settingsService.getSettingsObserver().subscribe({
      next: (newSettings) => {
        this.settings = newSettings
        this.log.excessive('Received new Settings via subscription.', this.id)
      },
      error: (e) => this.log.error('Settings Subscription got:' + e, this.id),
      complete: () => this.log.info('Settings Subscription complete', this.id)
    })

    this.version = this.settings ? this.settings.version : '0'
  }

  ngOnDestroy() {
    this.settingsSubscription?.unsubscribe()
  }
}
