import { Injectable } from '@angular/core';
import * as secrets from '../../../assets/data/secrets.json' // national secrets... & API-Keys. gitignore's

export type SecretType = {
  "id": number,
  "name": string,
  "url": string,
  "key": string,
  "note": string
}

export type SettingsType = {
  id: number,
  name: string,
  application: string,
  version: string,
  note: string,
  defLat: number,
  defLong: number,
  defZoom: number,
  defPlusCode: string,
  w3wLocale: string,
  markerSize: number,
  markerShape: number,
  defRangerStatus: number
  allowManualPinDrops: boolean,
  debugMode: boolean,
  logToPanel: boolean,
  logToConsole: boolean
}

@Injectable({ providedIn: 'root' })
export class SettingsService {
  static storageLocalName = 'appSettings'
  static secrets: SecretType[]
  static Settings: SettingsType
  static debugMode: any;

  constructor() {
    console.log("Contructing SettingsService: once or repeatedly?!--------------") // XXX

    // REVIEW: Workaround for "Error: Should not import the named export (imported as 'secrets') from default-exporting module (only default export is available soon)"
    let secretWorkaround = JSON.stringify(secrets)
    SettingsService.secrets = JSON.parse(secretWorkaround)
    //console.log('Got secrets from JSON file. e.g., ' + JSON.stringify(SettingsService.secrets[3]))
    // TODO: https://developer.what3words.com/tutorial/hiding-your-api-key

    // populate SettingsService.Settings
    // BUG: Doesn't auto-update version & other settings not exposed!!!
    let localStorageSettings = localStorage.getItem(SettingsService.storageLocalName)

    let needSettings = SettingsService.Settings == undefined
    if (needSettings) {
      console.log("Get Settings...")
      try {
        if (localStorageSettings != null && localStorageSettings.indexOf("defPlusCode") > 0) {
          SettingsService.Settings = JSON.parse(localStorageSettings)
          console.log("Initialized App Settings from localstorage")
          needSettings = false
        }
      } catch (error: any) {
        console.log(`localstorage App Settings i.e., ${localStorageSettings} should be deleted & reset: unable to parse them. Error name: ${error.name}; msg: ${error.message}`);
      }
    }
    if (needSettings) { SettingsService.ResetDefaults() }

    //REVIEW:
    SettingsService.Settings.version = '0.11.35'
  }

  static ResetDefaults() {
    //original hardcoded defaults... not saved until form is submitted... This form doesn't allow editing of all values
    console.log("Initialize App Settings from hardcoded values")

    // TODO: Need different sets for each type of map, and perhaps various (selectable/savable) copies of 'preferences'
    SettingsService.Settings = {
      id: 0,  // FUTURE: allow different setts of settings (e.g., per location)???
      name: "standard hardcoded settings",
      application: "RangerTrak",
      version: '0.11.35', //TODO: Auto update this...
      note: "values set by code, please edit them to serve you!",
      defLat: 47.4472,
      defLong: -122.4627,  // Vashon EOC!
      defZoom: 14,
      defPlusCode: '84VVCGWP+VW', // or "CGWP+VX Vashon, Washington" = 47.447187,-122.462688
      w3wLocale: "Vashon, WA",
      markerSize: 5,
      markerShape: 1,
      defRangerStatus: 0,
      allowManualPinDrops: false,
      debugMode: true,
      logToPanel: true,
      logToConsole: true
    }
  }

  static Update(newSettings: SettingsType) {
    // TODO: any validation...
    localStorage.setItem(SettingsService.storageLocalName, JSON.stringify(newSettings));
    console.log("Updated Application Settings to " + JSON.stringify(newSettings))
  }

  LocalStorageVoyeur() {
    let key
    for (var i = 0; i < localStorage.length; i++) {
      key = localStorage.key(i)
      if (key != null) {
        console.log(`item ${i} = ${JSON.parse(key)}`)
      }
    }
  }
}
