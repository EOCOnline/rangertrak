import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { SettingsService, SettingsType } from '../services'
import { LogService } from '../services/log.service';

/**
 * Footer component
 */
@Component({
  selector: 'rangertrak-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss']
})
export class FooterComponent implements OnInit, OnDestroy {

  private settingsSubscription$!: Subscription
  private settings?: SettingsType
  private id = 'Footer Component'

  today = new Date()
  version

  constructor(
    private log: LogService,
    private settingsService: SettingsService) {

    this.settingsSubscription$ = this.settingsService.getSettingsObserver().subscribe({
      next: (newSettings) => {
        this.settings = newSettings
      },
      error: (e) => this.log.error('Settings Subscription got:' + e, this.id),
      complete: () => this.log.info('Settings Subscription complete', this.id)
    })


    this.version = this.settings?.version
  }

  ngOnInit(): void {
  }

  ngOnDestroy() {
    this.settingsSubscription$.unsubscribe()
  }
}
