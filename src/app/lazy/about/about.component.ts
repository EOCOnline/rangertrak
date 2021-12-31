import { Component, OnInit } from '@angular/core';

import { SettingsComponent } from '../../settings/settings.component';

@Component({
  selector: 'rangertrak-about',
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.scss']
})
export class AboutComponent implements OnInit {

  version: string = "0.11"
/*
  // TODO: Enable getting settings (e.g. version) from non-lazy loaded component...
  constructor(settingsComponent: SettingsComponent) {
    console.log("AboutComponent getting constructed")
    this.version = SettingsComponent.version
    */
   constructor(){
  }

  ngOnInit(): void {
  }

}
