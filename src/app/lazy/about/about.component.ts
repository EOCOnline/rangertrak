
import { Component, Inject, OnInit, ViewChild, isDevMode } from '@angular/core'

import { SettingsService, ClockService } from '../../shared/services'

@Component({
  selector: 'rangertrak-about',
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.scss'],
  providers: [SettingsService]
})
export class AboutComponent {  //implements OnInit {

  id = 'About'
  public eventInfo = ''

  version = ""

  constructor(
    //private settingsService: SettingsService
  ) {
    console.log("AboutComponent getting constructed")
    this.version = SettingsService.Settings.version
    this.eventInfo = `Event: ; Mission: ; Op Period: ; `
  }

  //ngOnInit() {  }
}
