import { Component, OnInit } from '@angular/core';
import { SettingsService } from '../shared/services/'

@Component({
  selector: 'rangertrak-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss']
})
export class FooterComponent implements OnInit {

  // settings: SettingsType
  today = new Date()
  version

  constructor(
    private settingsService: SettingsService) {
     // this.settings = SettingsService.Settings // only using static functions/values from the service...
    this.version = SettingsService.Settings.version
  }

  ngOnInit(): void {
  }

}
