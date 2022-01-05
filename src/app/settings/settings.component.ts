// We store app settings/preferences per user & per browser into IndexedDB,
// using a wrapper modeled on the much simpler LocalStorage API

// FROM: @ngx-pwa/local-storage  angular-async-local-storage-main\projects\demo\src\app\app.components.ts
// Doc & package: https://github.com/cyrilletuzi/angular-async-local-storage
// @see doc on IndexedDB {@link https://developer.chrome.com/docs/devtools/storage/indexeddb/}

import * as secrets from './secrets.json' // national secrets... & API-Keys
import { DOCUMENT } from '@angular/common'
import { Component, Inject, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

interface Data {
  title: string;
}

type Secret = {
  "id": number,
  "name": string,
  "url": string,
  "key": string,
  "note": string
}

@Component({
  selector: 'rangertrak-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
})
export class SettingsComponent implements OnInit {

  static secrets: Secret[]

  static AppSettings = {
    DEF_LAT: 47.4472,
    DEF_LONG: -122.4627,  // Vashon EOC!
    DEF_PCODE: '84VVCGWP+VW', // or "CGWP+VX Vashon, Washington" = 47.447187,-122.462688
    locale_Name: "Vashon, WA",
    version: '0.11.0',
    DEF_STATUS: 0  // FieldReportStatuses
  }

  settingsEditorForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    @Inject(DOCUMENT) private document: Document) {

    // REVIEW: Workaround for "Error: Should not import the named export (imported as 'secrets') from default-exporting module (only default export is available soon)"
    let secretWorkaround:string = JSON.stringify(secrets)
    SettingsComponent.secrets = JSON.parse(secretWorkaround)
     //this.secretsauce = sss
    let sname = SettingsComponent.secrets[3].name
    //let snote = SettingsComponent.secrets[2].note
    //console.log ('Got secrets secretString ' + secretString )
    console.log('Got secrets ' + JSON.stringify(SettingsComponent.secrets[3]) )//SettingsComponent.secrets[0]))

    //fails...
    let note = this.document.getElementById("noteID")
    if (note) {note.innerText="test!!!"} else {console.log("noteID NOT   found.")}

  }

  ngOnInit(): void {
    console.log("settings loaded at ", Date())
    console.log("Version: " + this.Version())

    // TODO: Optionally deserialize values from LocalStorage
    this.settingsEditorForm = this.fb.group({
      latitude: [SettingsComponent.AppSettings.DEF_LONG, Validators.required],
      longitude: [SettingsComponent.AppSettings.DEF_LONG, Validators.required],
      plusCode: [SettingsComponent.AppSettings.DEF_PCODE],
      logToPanel: ['yes'], // null or blank for unchecked
      logToConsole: ['check'], // null or blank for unchecked
      markerSize: ['5'],
      markerShape: [1, Validators.required],
      notes: []
    })

    console.log("settings completed at ", Date())
  }

  serializeToLocalStorage() { }
  deserializeToLocalStorage() { }
  xxxerializeToLocalStorage() { }

  Version() {
    return SettingsComponent.AppSettings.version
  }

  onFormSubmit(): void {
    const formData = this.settingsEditorForm.value
    console.log(formData)
    // TODO: Serialize values to LocalStorage
  }
}
