// We store app settings/preferences per user & per browser into IndexedDB,
// using a wrapper modeled on the much simpler LocalStorage API

// FROM: @ngx-pwa/local-storage  angular-async-local-storage-main\projects\demo\src\app\app.components.ts
// Doc & package: https://github.com/cyrilletuzi/angular-async-local-storage
// @see doc on IndexedDB {@link https://developer.chrome.com/docs/devtools/storage/indexeddb/}

import * as secrets from './secrets.json' // national secrets... & API-Keys. gitignore's
import { DOCUMENT } from '@angular/common'
import { Component, Inject, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { BehaviorSubject, Observer } from 'rxjs';

interface Data {
  title: string;
}

export type SecretType = {
  "id": number,
  "name": string,
  "url": string,
  "key": string,
  "note": string
}

export type AppSettingType = {
  id: number,
  name: string,
  application: string,
  version: string,
  w3wLocale: string,
  DEF_LAT: number,
  DEF_LONG: number,
  DEF_PCODE: string,

  DEF_STATUS: number
}

@Component({
  selector: 'rangertrak-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
})
export class SettingsComponent implements OnInit {

  static storageLocalName = 'appSettings'
  static secrets: SecretType[]
  //private settingSubject = new BehaviorSubject<AppSettingType>;  // REVIEW: Necessary?

  static AppSettings: AppSettingType

  settingsEditorForm!: FormGroup

  constructor(
    private fb: FormBuilder,
    @Inject(DOCUMENT) private document: Document) {

    // REVIEW: Workaround for "Error: Should not import the named export (imported as 'secrets') from default-exporting module (only default export is available soon)"
    let secretWorkaround = JSON.stringify(secrets)
    SettingsComponent.secrets = JSON.parse(secretWorkaround)
    //console.log('Got secrets ' + JSON.stringify(SettingsComponent.secrets[3])
    debugger
    // SettingsComponent.AppSettings
    let localStorageSettings = localStorage.getItem(SettingsComponent.storageLocalName)
    if (localStorageSettings != null) {
      console.log ("Initialize App Settings from localstorage")
      SettingsComponent.AppSettings = JSON.parse(localStorageSettings)
    }
    else { //original defaults... not saved until form is submitted...
      console.log ("Initialize App Settings from hardcoded values")
      SettingsComponent.AppSettings = {
        id: 0,  // FUTURE: allow different setts of settings (e.g., per location)???
        name: "standard",
        application: "RangerTrak",
        version: '0.11.0',
        DEF_LAT: 47.4472,
        DEF_LONG: -122.4627,  // Vashon EOC!
        DEF_PCODE: '84VVCGWP+VW', // or "CGWP+VX Vashon, Washington" = 47.447187,-122.462688
        w3wLocale: "Vashon, WA",
        DEF_STATUS: 0  // FieldReportStatuses[DEF_STAT]
      }
    }
  }

  //subscribe(observer: Observer<AppSettingType[]>) { this.settingSubject.subscribe(observer) }

  ngOnInit(): void {
    //console.log("settings loaded at ", Date())
    console.log(`Application: ${SettingsComponent.AppSettings.application} -- Version: ${SettingsComponent.AppSettings.version}`)

    // TODO: Optionally deserialize values from LocalStorage
    debugger;
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

  private update() {
    localStorage.setItem(SettingsComponent.storageLocalName, JSON.stringify(SettingsComponent.AppSettings));

    /*
      TODO: if subcriptions desired...
        this.settingSubject.next(SettingsComponent.AppSettings).map(
          fieldReport => ({

            id: SettingsComponent.AppSettings.id,
            name: SettingsComponent.AppSettings.name,
            application: SettingsComponent.AppSettings.application,
            DEF_LAT: SettingsComponent.AppSettings.DEF_LAT,
            DEF_LONG: SettingsComponent.AppSettings.DEF_LONG,
            DEF_PCODE: SettingsComponent.AppSettings.DEF_PCODE,
            locale_Name: SettingsComponent.AppSettings.locale_Name,
            version: SettingsComponent.AppSettings.version,
            DEF_STATUS: SettingsComponent.AppSettings.DEF_STATUS
          })
        ))*/
  }

  // Version() { return SettingsComponent.AppSettings.version  }

  onFormSubmit(): void {
    SettingsComponent.AppSettings = this.settingsEditorForm.value
    //const formData = this.settingsEditorForm.value
    console.log("Received new form data:" + SettingsComponent.AppSettings)
    this.update()
  }
}
