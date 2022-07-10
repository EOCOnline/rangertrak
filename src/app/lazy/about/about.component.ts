
import { Subscription } from 'rxjs'

import { Component, Inject, isDevMode, OnDestroy, OnInit, ViewChild } from '@angular/core'

import { ClockService, LogService, SettingsService, SettingsType } from '../../shared/services'

@Component({
  selector: 'rangertrak-about',
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.scss'],
  providers: [SettingsService]
})
export class AboutComponent implements OnDestroy {

  id = 'About'
  private settingsSubscription!: Subscription
  private settings!: SettingsType
  public version = ''

  constructor(
    private log: LogService,
    private settingsService: SettingsService
  ) {
    console.log("AboutComponent getting constructed")

    // https://angular.io/tutorial/toh-pt4#call-it-in-ngoninit states subscribes should happen in OnInit()
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

  //ngOnInit() {  }

  ngOnDestroy() {
    this.settingsSubscription.unsubscribe()
  }
}
