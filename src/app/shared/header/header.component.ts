import { Component, OnInit, Input, OnDestroy } from '@angular/core';
import { interval, map, Observable, Subscription } from 'rxjs';
import { ClockService, SettingsService, LogService, SettingsType } from '../services'
import { FlexLayoutModule } from '@angular/flex-layout';

/**
 * HaaderComponent
 * Displays a consistent line just below the NavBar, and above the component's main content
 *
 * Usage: To display this in your component add the following line to your (parent) template:
 *    <pageHeader [parentTitle]="title">...</pageHeader>
 * And the following in the parent component:
 *    public title = 'Name of the (parent) Component'
 */
@Component({
  selector: 'pageHeader',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit, OnDestroy {
  @Input() parentTitle: string

  private id = 'Header component'

  private settingsSubscription!: Subscription
  private settings!: SettingsType

  public eventInfo = ''
  public opPeriod = ''

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

    this.settingsSubscription = this.settingsService.getSettingsObserver().subscribe({
      next: (newSettings) => {
        this.onNewSettings(newSettings)
      },
      error: (e) => this.log.error('Settings Subscription got:' + e, this.id),
      complete: () => this.log.warn('Settings Subscription complete', this.id)
    })

    this.timeCurrent = this.clockService.getCurrentTime()

    // consuming components should include their name, e.g.
    this.parentTitle = 'parent componeents title'
  }

  ngOnInit(): void {
    if (!this.settings) {
      this.log.warn(`Settings not yet available in OnInit()`, this.id)
      return
    }
  }

  onNewSettings(newSettings: SettingsType) {
    this.log.verbose(`New settings received`, this.id)

    this.settings = newSettings

    this.eventInfo = `${this.settings.mission}; ${this.settings.event}`
    this.opPeriod = this.settings.opPeriod

    // if (!this.settings.opPeriodStart) {
    //   console.error(`OpPeriod had no Start time! Reset to 2 hours ago...`, this.id)
    //   this.settings.opPeriodStart = new Date()
    //   this.settings.opPeriodStart.setHours(new Date().getHours() - 2)
    // }
    // this.log.verbose(`OpPeriodStart = ${JSON.stringify(this.settings.opPeriodStart)}`, this.id)

    const msStartTime = new Date(this.settings.opPeriodStart).getTime()
    this.timeElapsed$ = interval(1000)
      .pipe(map(() => {
        let ms = new Date().getTime() - msStartTime
        return (`${Math.round((ms / (1000 * 60 * 60)) % 24)}:${Math.round((ms / (1000 * 60)) % 60).toString().padStart(2, '0')}:${(Math.round(ms / 1000) % 60).toString().padStart(2, '0')}`)
      }
      ))

    const msEndTime = new Date(this.settings.opPeriodEnd).getTime()
    this.timeLeft$ = interval(1000)
      .pipe(map(() => {
        let ms = msEndTime - new Date().getTime()
        return (`${Math.round((ms / (1000 * 60 * 60)) % 24)}:${Math.round((ms / (1000 * 60)) % 60).toString().padStart(2, '0')}:${(Math.round(ms / 1000) % 60).toString().padStart(2, '0')}`)
      }
      ))
  }

  ngOnDestroy() {
    this.settingsSubscription.unsubscribe
  }
}
