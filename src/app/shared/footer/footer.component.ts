import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { SettingsService, SettingsType } from '../services'

/**
 * Footer component
 */
@Component({
  selector: 'rangertrak-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss']
})
export class FooterComponent implements OnInit {

  private settingsSubscription$!: Subscription
  private settings?: SettingsType

  today = new Date()
  version

  constructor(
    private settingsService: SettingsService) {

    this.settingsSubscription$ = this.settingsService.getSettingsObserver().subscribe({
      next: (newSettings) => {
        this.settings = newSettings
      },
      error: (e) => this.log.error('Settings Subscription got:' + e, this.id),
      complete: () => this.log.info('Settings Subscription complete', this.id)
    })


    this.version = this.settings.version
  }

  ngOnInit(): void {
  }

}
