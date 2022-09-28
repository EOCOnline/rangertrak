import { Subscription } from 'rxjs'

import { Component, OnDestroy, OnInit } from '@angular/core'

import { LogService, SettingsService, SettingsType } from '../services'

/**
 * Footer component
 */
@Component({
  selector: 'rangertrak-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss']
})
export class FooterComponent implements OnInit, OnDestroy {

  private settingsSubscription!: Subscription
  private settings!: SettingsType
  private id = 'Footer Component'

  today = new Date()
  version!: string


  msStartTime: any
  msEndTime: any

  constructor(
    private log: LogService,
    private settingsService: SettingsService) {
    this.log.excessive(`======== Constructor() ============`, this.id)
    this.settingsSubscription = this.settingsService.getSettingsObserver().subscribe({
      next: (newSettings) => {
        this.settings = newSettings
        this.log.excessive('Received new Settings via subscription.', this.id)
      },
      error: (e) => this.log.error('Settings Subscription got:' + e, this.id),
      complete: () => this.log.info('Settings Subscription complete', this.id)
    })

    this.msStartTime = new Date(this.settings.opPeriodStart).getTime()
    this.msEndTime = new Date(this.settings.opPeriodEnd).getTime()
  }

  ngOnInit(): void {

    this.version = this.settings?.version
    this.timetest()
  }

  timetest() {
    this.msStartTime = new Date(this.settings.opPeriodStart).getTime()
    this.msEndTime = new Date(this.settings.opPeriodEnd).getTime()
    //let st = formatDate(msStartTime, 'short', 'en/US')
    const msPerDay = 1000 * 60 * 60 * 24
    const secPerHour = 1000 * 60 * 60
    const msPerMinute = 1000 * 60
    this.log.excessive(`msStartTime = ${this.msStartTime}; msEndTime = ${this.msEndTime}; delta = ${(this.msEndTime - this.msStartTime) / msPerDay}`, this.id)
    let i
    for (i = -30; i < 30; i += 10) {

      let ms = new Date().getTime() - this.msStartTime
      let mse = this.msEndTime - new Date().getTime()
      let d = Math.round((ms / (msPerDay)))
      let de = Math.round((ms / (msPerDay))) - 1

      this.log.excessive(`ms=${d}; ms2End=${de}`, this.id)

      let elapsed = `${d ? (d + ' day(s), ') : " "}${Math.round((ms / (secPerHour)) % 24)}:${Math.abs(Math.round((ms / (msPerMinute)) % 60)).toString().padStart(2, '0')}:${(Math.abs(Math.round(ms / 1000) % 60)).toString().padStart(2, '0')}`

      let togo = `${d ? d + ' day(s), ' : ''}${Math.round((ms / (secPerHour)) % 24)}:${Math.abs(Math.round((ms / (msPerMinute)) % 60)).toString().padStart(2, '0')}:${(Math.abs(Math.round(ms / 1000) % 60)).toString().padStart(2, '0')}`
      //   min:${Math.round(ms / msPerMinute)} hrs:${(Math.round(ms / (secPerHour)))}

      this.log.error(`elapsed: ${elapsed}; Left togo: ${togo}`, this.id)
    }
  }


  ngOnDestroy() {
    this.settingsSubscription.unsubscribe()
  }
}
