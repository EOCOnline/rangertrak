import { Injectable } from '@angular/core'
import * as secrets from '../../../assets/data/secrets.json' // national secrets... & API-Keys. gitignore's
import * as packageJson from '../../../../package.json'

export type SecretType = {
  "id": number,
  "name": string,
  "url": string,
  "key": string,
  "note": string
}

/**
 * This has 'all' event data (aside from Rangers & Field Reports)
 * for readily serialization/dehydration
 * ? REVIEW: Add Statuses and any other data (aside from Rangers & Field Reports to this
 * ? Change name too?
 */
export type SettingsType = {
  id: number, // needed, or use w/ name to allow several sets of settings: needed?
  name: string, // incident Name? Op Period?, Mission#
  application: string,
  version: string,
  note: string,
  defLat: number,
  defLng: number,
  defZoom: number,
  defPlusCode: string,
  w3wLocale: string,
  markerSize: number,
  markerShape: number,
  defRangerStatus: number
  allowManualPinDrops: boolean,
  debugMode: boolean,
  logToPanel: boolean,
  logToConsole: boolean,
  // Statuses
}

export type FieldReportStatusType = { status: string, color: string, icon: string }

@Injectable({ providedIn: 'root' })
export class SettingsService {
  static storageLocalName = 'appSettings'
  static secrets: SecretType[]
  static Settings: SettingsType
  static debugMode: any;
  static localStorageFieldReportStatusName = 'fieldReportStatuses'
  fieldReportStatuses: FieldReportStatusType[] = []
  static version: string

  constructor() {
    console.log("Contructing SettingsService") // on page transition between Entry Screen or Google Maps pages ONLY (others use only static settings)

    // REVIEW: Workaround for "Error: Should not import the named export (imported as 'secrets') from default-exporting module (only default export is available soon)"
    let secretWorkaround = JSON.stringify(secrets)
    SettingsService.secrets = JSON.parse(secretWorkaround)
    //console.log('Got secrets from JSON file. e.g., ' + JSON.stringify(SettingsService.secrets[3]))
    // TODO: https://developer.what3words.com/tutorial/hiding-your-api-key: environmental values, GitHub vault, or  encryption? https://www.doppler.com/

    // populate SettingsService.Settings
    // BUG: Use subscription/observables instead: so rest of program gets latest values - not just those present right now?
    // Doesn't auto-update settings that are not exposed in the Settings Edit Component
    let localStorageSettings = localStorage.getItem(SettingsService.storageLocalName)
    let needSettings = SettingsService.Settings == undefined
    if (needSettings) {
      console.log("Get App Settings...")
      try {
        if (localStorageSettings != null && localStorageSettings.indexOf("defPlusCode") > 0) {
          SettingsService.Settings = JSON.parse(localStorageSettings)
          console.log("Initialized App Settings from localstorage")
          needSettings = false
        }
      } catch (error: any) {
        console.log(`localstorage App Settings i.e., ${localStorageSettings} should be deleted & reset: unable to parse them. Error name: ${error.name}; msg: ${error.message}`);
        // TODO: Do it!
        // REVIEW:
        localStorage.removeItem(SettingsService.storageLocalName)
      }
    }
    if (needSettings) { SettingsService.ResetDefaults() }

    // REVIEW: Above may come up with an old version #, so do this after the above
    // package.json has version: https://www.npmjs.com/package/standard-version: npm run release
    let packageAsString = JSON.stringify(packageJson)
    let packageAsJson = JSON.parse(packageAsString)
    //this.version = packageAsJson.version
    SettingsService.version = packageAsJson.version
    SettingsService.Settings.version = packageAsJson.version
    console.log(`Got version: ${packageAsJson.version} `)
    // REVIEW: following forces garbage collection of package.json, for security? (would happen at end of constructor too)
    packageAsString = ''
    packageAsJson = null


    // populate Field Report Statuses
    let localStorageFieldReportStatuses = localStorage.getItem(SettingsService.localStorageFieldReportStatusName)
    if (localStorageFieldReportStatuses != undefined) { //|| this.fieldReportStatuses.length == 0
      console.log(`Got ${localStorageFieldReportStatuses?.length} fieldReportStatuses from LocalStorage, parse 'em`)
      try {
        if (localStorageFieldReportStatuses != null && localStorageFieldReportStatuses.indexOf("status") > 0) {
          this.fieldReportStatuses = JSON.parse(localStorageFieldReportStatuses)
          console.log(`Initialized ${this.fieldReportStatuses.length} fieldreport statuses from localstorage`)
        }
      } catch (error: any) {
        console.error(`localstorage App Settings i.e., ${SettingsService.localStorageFieldReportStatusName} should be deleted & reset: unable to parse them. Error name: ${error.name}; msg: ${error.message}`);
        // TODO: Do it!
        // REVIEW:
        localStorage.removeItem(SettingsService.localStorageFieldReportStatusName)
      }
    }
    if ((this.fieldReportStatuses == undefined) || (this.fieldReportStatuses == null) || (this.fieldReportStatuses.length == 0)) {
      this.ResetFieldReportStatusDefaults()
    }
    console.log(`${this.fieldReportStatuses.length} FieldReport Statuses initialized ` + (SettingsService.Settings.debugMode ? JSON.stringify(this.fieldReportStatuses) : ""))

  }

  static ResetDefaults() {
    //original hardcoded defaults... not saved until form is submitted... This form doesn't allow editing of all values
    console.log("Initialize App Settings from hardcoded values")

    // TODO: Need different sets for each type of map, and perhaps various (selectable/savable) copies of 'preferences'
    SettingsService.Settings = {
      id: 0,  // FUTURE: allow different setts of settings (e.g., per location)???
      name: "standard hardcoded settings",
      application: "RangerTrak",
      version: SettingsService.version,
      note: "values set by code, please edit them to serve you!",
      defLat: 47.4472,
      defLng: -122.4627,  // Vashon EOC!
      defZoom: 17,
      defPlusCode: '84VVCGWP+VW', // or "CGWP+VX Vashon, Washington" = 47.447187,-122.462688
      w3wLocale: "Vashon, WA",
      markerSize: 5,
      markerShape: 1,
      defRangerStatus: 0, // TODO: Allow editing this
      allowManualPinDrops: false,
      debugMode: true,
      logToPanel: true,
      logToConsole: true
    }
  }

  // TODO: Use a Map instead: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map#objects_vs._maps
  ResetFieldReportStatusDefaults() {
    this.fieldReportStatuses = [
      { status: 'Normal', color: '', icon: '' },  // Often the default value: see SettingsService.defRangerStatus
      { status: 'Need Rest', color: 'cce', icon: '' },
      { status: 'Urgent', color: 'red', icon: '' },
      { status: 'Objective Update', color: 'aqua', icon: '' },
      { status: 'Check-in', color: 'grey', icon: '' },
      { status: 'Check-out', color: 'dark-grey', icon: '' }
    ]
    console.log(`ResetFieldReportStatusDefaults reset to ${this.fieldReportStatuses.length} Statuses`)
    return this.fieldReportStatuses
  }

  static Update(newSettings: SettingsType) {
    // TODO: any validation...
    localStorage.setItem(SettingsService.storageLocalName, JSON.stringify(newSettings));
    console.log("Updated Application Settings to " + JSON.stringify(newSettings))
  }

  getFieldReportStatuses() {
    return this.fieldReportStatuses
  }

  updateFieldReportStatus(newStatuses: FieldReportStatusType[]) {
    // TODO: any validation...
    this.fieldReportStatuses = newStatuses
    localStorage.setItem(SettingsService.localStorageFieldReportStatusName, JSON.stringify(newStatuses));
    console.log("Replaced FieldReport Statuses with " + JSON.stringify(newStatuses))
  }

  localStorageVoyeur() {
    let key
    for (var i = 0; i < localStorage.length; i++) {
      key = localStorage.key(i)
      if (key != null) {
        console.log(`item ${i} = ${JSON.parse(key)}`)
      }
    }
  }
}
