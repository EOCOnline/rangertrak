import { Injectable } from '@angular/core'
import * as secrets from '../../../assets/data/secrets.json' // national secrets... & API-Keys. gitignore's
import * as packageJson from '../../../../package.json'
import { LogService } from './'

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
  name: string, // incident Name + Op Period + Mission#, etc. 1st line tops every page
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

export type SettingsType2 = {
  id: number, // needed, or use w/ name to allow several sets of settings: needed?
  eventName: string,
  eventNotes: string,
  mission: string,
  opPeriod: string,
  opPeriodStart: Date,
  opPeriodEnd: Date,

  application: string,
  version: string,
  debugMode: boolean,

  defPlusCode: string,
  w3wLocale: string,
  allowManualPinDrops: boolean,

  google: {
    defLat: number,
    defLng: number,
    defZoom: number,
    markerScheme: string
  },

  leaflet: {
    defLat: number,
    defLng: number,
    defZoom: number,
    markerScheme: string
  },

  defRangerStatus: number
  RangerStatuses: FieldReportStatusType[],
  RangerKeywords: string[],
}

export type FieldReportStatusType = { status: string, color: string, icon: string }

@Injectable({ providedIn: 'root' })
export class SettingsService {

  private id = 'Settings Service'
  static storageLocalName = 'appSettings'
  static secrets: SecretType[]
  static Settings: SettingsType
  static debugMode: any;
  static localStorageFieldReportStatusName = 'fieldReportStatuses'
  fieldReportStatuses: FieldReportStatusType[] = []
  static version: string

  constructor(
    private log: LogService
  ) {
    // on page transition between Entry Screen or Google Maps pages ONLY (others use only static settings)
    this.log.verbose('Constructing', this.id)

    // REVIEW: Workaround for "Error: Should not import the named export (imported as 'secrets') from default-exporting module (only default export is available soon)"
    let secretWorkaround = JSON.stringify(secrets)
    SettingsService.secrets = JSON.parse(secretWorkaround)
    //this.log.verbose('Got secrets from JSON file. e.g., ' + JSON.stringify(SettingsService.secrets[3]))
    // TODO: https://developer.what3words.com/tutorial/hiding-your-api-key: environmental values, GitHub vault, or  encryption? https://www.doppler.com/

    // populate SettingsService.Settings
    // BUG: Use subscription/observables instead: so rest of program gets latest values - not just those present right now?
    // Doesn't auto-update settings that are not exposed in the Settings Edit Component
    let localStorageSettings = localStorage.getItem(SettingsService.storageLocalName)
    let needSettings = SettingsService.Settings == undefined
    if (needSettings) {
      this.log.info("Get App Settings...", this.id)
      try {
        if (localStorageSettings != null && localStorageSettings.indexOf("defPlusCode") > 0) {
          SettingsService.Settings = JSON.parse(localStorageSettings)
          this.log.verbose("Initialized App Settings from localstorage", this.id)
          needSettings = false
        }
      } catch (error: any) {
        this.log.verbose(`localstorage App Settings i.e., ${localStorageSettings} should be deleted & reset: unable to parse them. Error name: ${error.name}; msg: ${error.message}`, this.id);
        // TODO: Do it!
        // REVIEW:
        localStorage.removeItem(SettingsService.storageLocalName)
      }
    }
    if (needSettings) { this.ResetDefaults() }

    // REVIEW: Above may come up with an old version #, so do this after the above
    // package.json has version: https://www.npmjs.com/package/standard-version: npm run release
    let packageAsString = JSON.stringify(packageJson)
    let packageAsJson = JSON.parse(packageAsString)
    //this.version = packageAsJson.version
    SettingsService.version = packageAsJson.version
    SettingsService.Settings.version = packageAsJson.version
    this.log.verbose(`Got version: ${packageAsJson.version} `, this.id)
    // REVIEW: following forces garbage collection of package.json, for security? (would happen at end of constructor too)
    packageAsString = ''
    packageAsJson = null


    // populate Field Report Statuses
    let localStorageFieldReportStatuses = localStorage.getItem(SettingsService.localStorageFieldReportStatusName)
    if (localStorageFieldReportStatuses != undefined) { //|| this.fieldReportStatuses.length == 0
      this.log.verbose(`Got ${localStorageFieldReportStatuses?.length} characters of fieldReportStatuses from LocalStorage, parse 'em`, this.id)
      try {
        if (localStorageFieldReportStatuses != null && localStorageFieldReportStatuses.indexOf("status") > 0) {
          this.fieldReportStatuses = JSON.parse(localStorageFieldReportStatuses)
          //this.log.verbose(`localStorageFieldReportStatuses =  ${localStorageFieldReportStatuses} `, this.id)
          //this.log.verbose(`fieldReportStatuses = ${this.fieldReportStatuses}`, this.id)
          this.log.verbose(`Initialized ${this.fieldReportStatuses.length} fieldreport statuses from localstorage`, this.id)
        }
      } catch (error: any) {
        console.error(`localstorage App Settings i.e., ${SettingsService.localStorageFieldReportStatusName} should be deleted & reset: unable to parse them. Error name: ${error.name}; msg: ${error.message}`, this.id)
        // TODO: Do it!
        // REVIEW:
        localStorage.removeItem(SettingsService.localStorageFieldReportStatusName)
      }
    }
    if ((this.fieldReportStatuses == undefined) || (this.fieldReportStatuses == null) || (this.fieldReportStatuses.length == 0)) {
      this.ResetFieldReportStatusDefaults()
    }
    this.log.verbose(`${this.fieldReportStatuses.length} FieldReport Statuses initialized ${SettingsService.Settings.debugMode ? JSON.stringify(this.fieldReportStatuses) : ''}`)

  }
  // static
  ResetDefaults() {
    //original hardcoded defaults... not saved until form is submitted... This form doesn't allow editing of all values
    this.log.verbose("Initialize App Settings from hardcoded values", this.id)

    // TODO: Need different sets for each type of map, and perhaps various (selectable/savable) copies of 'preferences'
    SettingsService.Settings = {
      id: 0,  // FUTURE: allow different setts of settings (e.g., per location)???
      name: "Edit this on Settings Page",
      application: "RangerTrak",
      version: SettingsService.version,
      note: "",
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
    this.log.verbose(`ResetFieldReportStatusDefaults reset to ${this.fieldReportStatuses.length} Statuses`, this.id)
    return this.fieldReportStatuses
  }

  // TODO: static
  Update(newSettings: SettingsType) {
    // TODO: any validation...
    localStorage.setItem(SettingsService.storageLocalName, JSON.stringify(newSettings))
    this.log.verbose(`Updated Application Settings to ${JSON.stringify(newSettings)}`, this.id)
  }

  getFieldReportStatuses() {
    return this.fieldReportStatuses
  }

  updateFieldReportStatus(newStatuses: FieldReportStatusType[]) {
    // TODO: any validation...
    this.fieldReportStatuses = newStatuses
    localStorage.setItem(SettingsService.localStorageFieldReportStatusName, JSON.stringify(newStatuses));
    this.log.verbose("Replaced FieldReport Statuses with " + JSON.stringify(newStatuses), this.id)
  }

  localStorageVoyeur() {
    let key
    for (var i = 0; i < localStorage.length; i++) {
      key = localStorage.key(i)
      if (key != null) {
        this.log.verbose(`item ${i} = ${JSON.parse(key)}`, this.id)
      }
    }
  }
}
