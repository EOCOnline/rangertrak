import { Component, OnInit } from '@angular/core';
import { SettingsService } from '../services'

/**
 * Footer component
 */
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
    // this.settings = this.settingsService.settings // only using static functions/values from the service...
    this.version = this.settingsService.settings.version
  }

  ngOnInit(): void {
  }

}
