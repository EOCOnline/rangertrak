
import { Component, Inject, OnInit, ViewChild, isDevMode } from '@angular/core'
import { Subscription } from 'rxjs'

import { SettingsService, ClockService, SettingsType } from '../../shared/services'

@Component({
  selector: 'rangertrak-about',
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.scss'],
  providers: [SettingsService]
})
export class AboutComponent {  //implements OnInit {

  id = 'About'
  private settingsSubscription$!: Subscription
  private settings?: SettingsType

  constructor(
    private settingsService: SettingsService
  ) {
    console.log("AboutComponent getting constructed")

    this.settingsSubscription$ = this.settingsService.getSettingsObserver().subscribe({
      next: (newSettings) => {
        this.settings = newSettings
      },
      error: (e) => this.log.error('Settings Subscription got:' + e, this.id),
      complete: () => this.log.info('Settings Subscription complete', this.id)
    })

    this.version = this.settings.version

  }

  //ngOnInit() {  }
}
