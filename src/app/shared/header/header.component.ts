import { interval, map, Observable, Subscription } from 'rxjs'

import { Component, Input, OnDestroy, OnInit } from '@angular/core'
//import { FlexLayoutModule } from '@angular/flex-layout'

import { ClockService, LogService, SettingsService, SettingsType } from '../services'
import { Utility } from '../'

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
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit, OnDestroy {
  @Input() parentTitle: string
  @Input() pageDescription: string

  private id = 'Header component'

  private settingsSubscription!: Subscription
  private settings!: SettingsType

  public eventInfo = ''
  public eventDetails = ''
  public opPeriod = ''
  public opPeriodDetails = ''

  public opPeriodStart = new Date()

  // See also Ang Dev w/ TS pg 147, for combining observables...
  public timeElapsed$!: Observable<string>;
  public timeLeft$!: Observable<string>;
  public timeCurrent: Observable<Date>


  constructor(
    private clockService: ClockService,
    private log: LogService,
    private settingsService: SettingsService,
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
    this.eventInfo = `#${this.settings.mission}: ${this.settings.event}`
    this.eventDetails = `Mission #: ${this.settings.mission}; Mission Name: ${this.settings.event}; Notes: ${this.settings.eventNotes}`
    this.opPeriod = `${this.settings.opPeriod}`
    //   let start: Date = this.settings.opPeriodStart
    // let end: Date = this.settings.opPeriodEnd
    //  let s: string = start.toDateString()
    //  let e: string = end.toDateString()
    this.opPeriodDetails = `${this.settings.opPeriod}: ${this.settings.opPeriodStart} to ${this.settings.opPeriodEnd}`

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

  ngOnDestroy() {
    this.settingsSubscription?.unsubscribe
  }
}
