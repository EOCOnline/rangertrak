import { Component, OnInit } from '@angular/core';

import { SettingsComponent } from '../../settings/settings.component';

@Component({
  selector: 'rangertrak-about',
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.scss']
})
export class AboutComponent implements OnInit {
/*
  version: string
  constructor(settingsComponent: SettingsComponent) {
    console.log("AboutComponent getting constructed")
    this.version = SettingsComponent.version
    */
   constructor(){
  }

  ngOnInit(): void {
  }

}
