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
import { TryCatchStmt } from '@angular/compiler';

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
  note: string,
  defLat: number,
  defLong: number,
  defPlusCode: string,
  w3wLocale: string,
  markerSize: number,
  markerShape: number,
  defRangerStatus: number
  debugMode: boolean,
  logToPanel: boolean,
  logToConsole: boolean
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

    // populate SettingsComponent.AppSettings
/*    let localStorageSettings = localStorage.getItem(SettingsComponent.storageLocalName)

    let needSettings = true
    try {
      if (localStorageSettings != null && localStorageSettings.indexOf("defPlusCode") < 0) {
        SettingsComponent.AppSettings = JSON.parse(localStorageSettings)

// TODO: (localStorageSettings != null) ? JSON.parse(localStorageSettings) : []

        console.log("Initialized App Settings from localstorage")
        needSettings = true
      }
    } catch (error:any) {
      console.log(`localstorage App Settings i.e., ${localStorageSettings} should be deleted & reset: unable to parse them. Error name: ${error.name}; msg: ${error.message}`);
    }

    if (needSettings) {
      */
      //original hardcoded defaults... not saved until form is submitted... This form doesn't allow editing of all values
      console.log("Initialize App Settings from hardcoded values")
      SettingsComponent.AppSettings = {
        id: 0,  // FUTURE: allow different setts of settings (e.g., per location)???
        name: "standard hardcoded settings",
        application: "RangerTrak",
        version: '0.11.0',
        note: "values set by code, please edit them to serve you!",
        defLat: 47.4472,
        defLong: -122.4627,  // Vashon EOC!
        defPlusCode: '84VVCGWP+VW', // or "CGWP+VX Vashon, Washington" = 47.447187,-122.462688
        w3wLocale: "Vashon, WA",
        markerSize: 5,
        markerShape: 1,
        defRangerStatus: 0,
        debugMode: true,
        logToPanel: true,
        logToConsole: true
      }


    //}

/*
    if (localStorageSettings != null && localStorageSettings.indexOf("defPlusCode") > 0) {
      console.log("Initialize App Settings from localstorage")
      SettingsComponent.AppSettings = JSON.parse(localStorageSettings)
    }
    else { //original defaults... not saved until form is submitted...
      console.log("Initialize App Settings from hardcoded values")
      SettingsComponent.AppSettings = {
        id: 0,  // FUTURE: allow different setts of settings (e.g., per location)???
        name: "standard hardcoded settings",
        application: "RangerTrak",
        version: '0.11.0',
        note: "values set by code, please edit them to serve you!",
        defLat: 47.4472,
        defLong: -122.4627,  // Vashon EOC!
        defPlusCode: '84VVCGWP+VW', // or "CGWP+VX Vashon, Washington" = 47.447187,-122.462688
        w3wLocale: "Vashon, WA",
        markerSize: 5,
        markerShape: 1,
        defRangerStatus: 0,
        debugMode: true,
        logToPanel: true,
        logToConsole: true
      }
    }
    */
  }

  //subscribe(observer: Observer<AppSettingType[]>) { this.settingSubject.subscribe(observer) }

  ngOnInit(): void {
    //console.log("settings loaded at ", Date())
    console.log(`Application: ${SettingsComponent.AppSettings.application} -- Version: ${SettingsComponent.AppSettings.version}`)

    this.settingsEditorForm = this.fb.group({
      application: [SettingsComponent.AppSettings.application], // not shown for editing
      version: [SettingsComponent.AppSettings.version], // not shown for editing
      id: [SettingsComponent.AppSettings.id],
      name: [SettingsComponent.AppSettings.name],
      note: [SettingsComponent.AppSettings.note],
      defLat: [SettingsComponent.AppSettings.defLat, Validators.required],
      defLong: [SettingsComponent.AppSettings.defLong, Validators.required],
      plusCode: [SettingsComponent.AppSettings.defPlusCode],
      w3wLocale: [SettingsComponent.AppSettings.w3wLocale],
      markerSize: [SettingsComponent.AppSettings.markerSize],
      markerShape: [SettingsComponent.AppSettings.markerShape, Validators.required],
      defRangerStatus: [SettingsComponent.AppSettings.defRangerStatus], // not shown for editing
      debugMode: [SettingsComponent.AppSettings.debugMode], // not shown for editing
      logToPanel: [SettingsComponent.AppSettings.logToPanel], // null or blank for unchecked 'yes'
      logToConsole: [SettingsComponent.AppSettings.logToConsole], // null or blank for unchecked 'check'
    })

    console.log("settings completed at ", Date())
  }

  private update() {
    const formData = this.settingsEditorForm.value
    // localStorage.setItem(SettingsComponent.storageLocalName, JSON.stringify(SettingsComponent.AppSettings))  // BUG: Don't store settingsEditorForm, but individual values



    let newSettingsComponent: AppSettingType = {
      application: this.settingsEditorForm.value.application as string,
      version: this.settingsEditorForm.value.version as string,
      id: this.settingsEditorForm.value.id as number,
      name: this.settingsEditorForm.value.name as string,
      note: this.settingsEditorForm.value.note as string,
      defLat: this.settingsEditorForm.value.Long as number,
      defLong: this.settingsEditorForm.value.Long as number,
      defPlusCode: this.settingsEditorForm.value.PlusCode as string,
      w3wLocale: this.settingsEditorForm.value.w3wLocale as string,
      markerSize: this.settingsEditorForm.value.markerSize as number,
      markerShape: this.settingsEditorForm.value.markerShape as number,
      defRangerStatus: this.settingsEditorForm.value.defRangerStatus as number,
      debugMode: this.settingsEditorForm.value.debugMode as boolean,
      logToPanel: this.settingsEditorForm.value.logToPanel as boolean,
      logToConsole: this.settingsEditorForm.value.logToConsole as boolean,
    }

    //localStorage.setItem(SettingsComponent.storageLocalName, JSON.stringify(newSettingsComponent))

    /*
      TODO: if subcriptions desired...
        this.settingSubject.next(SettingsComponent.AppSettings).map(
          appSettings => ({

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
    // BUG: SettingsComponent.AppSettings = this.settingsEditorForm.value NOT THE SAME type!!!
    const formData = this.settingsEditorForm.value
    console.log("Received new form data:" + SettingsComponent.AppSettings)
    // this.update()
  }
}
