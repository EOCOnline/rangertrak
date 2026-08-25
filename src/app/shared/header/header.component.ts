import { interval, map, Observable, Subscription } from 'rxjs'

import { CommonModule } from '@angular/common'
import { Component, Input, OnDestroy, OnInit, ChangeDetectionStrategy, signal } from '@angular/core'
import { Router } from '@angular/router'

import { ClockService, LogService, SettingsService, SettingsType, WelcomePanelService } from '../services'
import { Utility } from '../'
import { MissionReadinessComponent } from '../mission-readiness/mission-readiness.component'

/**
 * HaaderComponent
 * Displays a consistent line just below the NavBar, and above the component's main content
 *
 * Usage: To display this in your component add the following line to your (parent) template:
 *    <pageHeader [parentTitle]="title" [pageDescription]="pageDescr">...</pageHeader>
 * And the following in the parent component:
 *   title = 'Name of the (parent) Component'
 *   pageDescr = `Description of this page & purpose`
 */
@Component({
  selector: 'pageHeader',
  standalone: true,
  imports: [CommonModule, MissionReadinessComponent],
  templateUrl: './header.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit, OnDestroy {
  @Input() parentTitle: string
  @Input() pageDescription: string

  private id = 'Header component'

  private settingsSubscription!: Subscription
  private settings!: SettingsType

  // Mutated from onNewSettings(), itself called from a raw RxJS subscribe() callback,
  // not an Angular template binding - this app is zoneless, so a plain field written
  // there has no guaranteed path back into change detection. Signals close that gap
  // (Sprint G). Rendered on every page, so a stale value here would be widely visible.
  public eventInfo = signal('')
  public eventDetails = signal('')
  public opPeriod = signal('')
  public opPeriodDetails = signal('')

  public opPeriodStart = new Date()

  // See also Ang Dev w/ TS pg 147, for combining observables...
  public timeElapsed$!: Observable<string>;
  public timeLeft$!: Observable<string>;
  public timeCurrent: Observable<Date>


  constructor(
    private clockService: ClockService,
    private log: LogService,
    private settingsService: SettingsService,
    private welcomePanel: WelcomePanelService,
    private router: Router,
  ) {
    //======== Constructor() ============
    this.timeCurrent = this.clockService.getCurrentTime()

    // consuming components should include their name, e.g.
    this.parentTitle = 'parent component`s title'
    this.pageDescription = 'parent component`s title'
  }

  ngOnInit(): void {
    this.settingsSubscription = this.settingsService.getSettingsObserver().subscribe({
      next: (newSettings) => {
        this.onNewSettings(newSettings)
        this.log.excessive('Received new Settings via subscription.', this.id)
      },
      error: (e) => this.log.error('Settings Subscription got:' + e, this.id),
      complete: () => this.log.warn('Settings Subscription complete', this.id)
    })

    if (!this.settings) {
      this.log.warn(`Settings not yet available in OnInit()`, this.id)
      return
    }
  }

  onNewSettings(newSettings: SettingsType) {
    this.log.verbose(`New settings received`, this.id)

    this.settings = newSettings
    // debugger
    // E-57(1): was always `#${mission}: ${event}`, so a settings object with neither set
    // yet (a fresh install, or before Settings has been filled in) rendered as the bare
    // literal "#:" - the isolated fragment visible in the maintainer's own live
    // screenshots. Empty until there's something real to show.
    const mission = this.settings.mission.trim()
    const event = this.settings.event.trim()
    this.eventInfo.set(mission || event ? `#${mission}: ${event}` : '')
    this.eventDetails.set(`Mission #: ${this.settings.mission}; Mission Name: ${this.settings.event}; Notes: ${this.settings.eventNotes}`)
    this.opPeriod.set(`${this.settings.opPeriod}`)
    //   let start: Date = this.settings.opPeriodStart
    // let end: Date = this.settings.opPeriodEnd
    //  let s: string = start.toDateString()
    //  let e: string = end.toDateString()
    this.opPeriodDetails.set(`${this.settings.opPeriod}: ${this.settings.opPeriodStart} to ${this.settings.opPeriodEnd}`)

    // if (!this.settings.opPeriodStart) {
    //   console.error(`OpPeriod had no Start time! Reset to 2 hours ago...`, this.id)
    //   this.settings.opPeriodStart = new Date()
    //   this.settings.opPeriodStart.setHours(new Date().getHours() - 2)
    // }
    // this.log.verbose(`OpPeriodStart = ${JSON.stringify(this.settings.opPeriodStart)}`, this.id)

    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date#calculating_elapsed_time
    let msStartTime = new Date(this.settings.opPeriodStart).getTime()
    this.timeElapsed$ = interval(1000)
      .pipe(map(() => {
        let diff = Utility.timeDiff(msStartTime, new Date().getTime())
        return (`${diff.string} ${(diff.negative ? ` before period starts` : ` elapsed`)}`)
      }
      ))

    let msEndTime = new Date(this.settings.opPeriodEnd).getTime()
    this.timeLeft$ = interval(1000)
      .pipe(map(() => {
        let diff = Utility.timeDiff(new Date().getTime(), msEndTime)
        return (`${diff.string} ${(diff.negative ? ` since period ended` : ` left`)}`)
      }
      ))
  }

  /**
   * E-83: "clicking somewhere on the wide pill next to the Field Entry header should bring
   * it back up" - the status-cluster is shared/app-wide (every route renders HeaderComponent),
   * so rather than scoping this to Entry-only, clicking it from anywhere navigates to Entry
   * AND reopens the panel - a simpler, equally discoverable behaviour than disabling the
   * click on every other route. Ignores clicks that landed on the readiness dot specifically
   * (its own `routerLink="/mission"` already handles those) so the two don't both fire.
   */
  onStatusClusterClick(event: MouseEvent) {
    if ((event.target as HTMLElement).closest('.readiness-dot')) return
    this.welcomePanel.show()
    this.router.navigateByUrl('/')
  }

  ngOnDestroy() {
    // Note the parentheses: this read the property without calling it, so the header -
    // which every page instantiates - never actually released its settings subscription.
    this.settingsSubscription?.unsubscribe()
  }
}
