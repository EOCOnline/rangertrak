import { Subscription } from 'rxjs'

import { Component, Inject, OnDestroy, OnInit } from '@angular/core'

import { LogService, SettingsService, SettingsType } from '../services'
import { DOCUMENT, formatDate } from '@angular/common'
import { Utility } from '../utility';
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
    private settingsService: SettingsService,
    @Inject(DOCUMENT) private document: Document) {

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
  }

  ngOnDestroy() {
    this.settingsSubscription.unsubscribe()
  }
}
