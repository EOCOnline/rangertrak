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
  version

  constructor(
    private log: LogService,
    private settingsService: SettingsService) {

    this.settingsSubscription = this.settingsService.getSettingsObserver().subscribe({
      next: (newSettings) => {
        this.settings = newSettings
        this.log.excessive('Received new Settings via subscription.', this.id)
      },
      error: (e) => this.log.error('Settings Subscription got:' + e, this.id),
      complete: () => this.log.info('Settings Subscription complete', this.id)
    })

    this.version = this.settings?.version
  }

  ngOnInit(): void {
  }

  ngOnDestroy() {
    this.settingsSubscription.unsubscribe()
  }
}
