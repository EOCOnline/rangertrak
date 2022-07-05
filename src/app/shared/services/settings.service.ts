import { BehaviorSubject, Observable, throwError } from 'rxjs'

import { Injectable, Optional, SkipSelf } from '@angular/core'

import * as packageJson from '../../../../package.json'
import * as secrets from '../../../assets/data/secrets.json' // national secrets... & API-Keys. gitignore's
import { FieldReportStatusType, LogService, SettingsType } from './'

export type SecretType = {
  "id": number,
  "name": string,
  "url": string,
  "key": string,
  "note": string
}


@Injectable({ providedIn: 'root' })
export class SettingsService {

  private id = 'Settings Service'
  private storageLocalName = 'appSettings'
  static secrets: SecretType[]
  public settings!: SettingsType
  private settingsSubject$: BehaviorSubject<SettingsType>
  private defOpPeriodLength = 12 // hours

  constructor(@Optional() @SkipSelf() existingService: SettingsService,
    private log: LogService
  ) {
    if (existingService) {
      /**
       * see https://angular.io/guide/singleton-services
       * Use @Optional() @SkipSelf() in singleton constructors to ensure
       * future modules don't provide extra copies of this singleton service
       * per pg 84 of Angular Cookbook: do NOT add services to *.module.ts!
       */
      throwError(() => {
        console.error(`This singleton service has already been provided in the application. Avoid providing it again in child modules.`)
        new Error(`This singleton service has already been provided in the application. Avoid providing it again in child modules.`)
      })
    }

    // on page transition between Entry Screen or Google Maps pages ONLY (others use only static settings)
    //! REVIEW: Gets called twice!!
    this.log.verbose('Constructing', this.id)

    //  ------------------------- SECRETS -------------------------------

    // REVIEW: Workaround for "Error: Should not import the named export (imported as 'secrets') from default-exporting module (only default export is available soon)"
    let secretWorkaround = JSON.stringify(secrets)
    SettingsService.secrets = JSON.parse(secretWorkaround)
    //this.log.verbose('Got secrets from JSON file. e.g., ' + JSON.stringify(SettingsService.secrets[3]))
    // TODO: https://developer.what3words.com/tutorial/hiding-your-api-key: environmental values, GitHub vault, or  encryption? https://www.doppler.com/

    //  ------------------------- SETTINGS -------------------------------

    // populate this.settingsettings
    // Doesn't auto-update settings that are not exposed in the Settings Edit Component (e.g., version/AppName!)
    let localStorageSettings = localStorage.getItem(this.storageLocalName)
    let needSettings = this.settings == undefined
    if (needSettings) {
      this.log.info("Get App Settings...", this.id)
      try {
        if (localStorageSettings != null && localStorageSettings.indexOf("defPlusCode") > 0) {
          this.settings = JSON.parse(localStorageSettings)
          this.log.verbose("Initialized App Settings from localstorage", this.id)
          needSettings = false
        }
      } catch (error: any) {
        this.log.verbose(`Unable to parse settings in localstorage (${localStorageSettings}), so will be renamed out of the way. Error: ${error.name}; msg: ${error.message}`, this.id);
        // localStorage.removeItem(this.storageLocalName) /// will get overwritten anyway
        localStorage.setItem(this.storageLocalName + '-BAD', localStorageSettings!)
      }
    }
    if (needSettings) {
      this.settings = this.initSettings()
    }

    // REVIEW: Above comes up with an old version # (if loaded from localStorage), so do this after the above
    // package.json has version: https://www.npmjs.com/package/standard-version: npm run release
    let packageAsString = JSON.stringify(packageJson)
    let packageAsJson = JSON.parse(packageAsString)
    //this.version = packageAsJson.version
    //SettingsService.version = packageAsJson.version
    this.settings.version = packageAsJson.version
    this.log.verbose(`Got version: ${packageAsJson.version} `, this.id)

    // Save & publish settings to subscribers
    this.settingsSubject$ = new BehaviorSubject(this.settings)
    this.updateSettings(this.settings)

    // REVIEW: following forces garbage collection of package.json, for security? (would happen at end of constructor too)
    packageAsString = ''
    packageAsJson = null
  }

  /**
   * Called by Settings Component when user wants to reset
   */
  public ResetDefaults(): SettingsType {
    this.log.verbose(`Settings are being restored to their initial (hardcoded) values. Please re-enter mission info as desired.`, this.id)
    this.settings = this.initSettings()
    this.updateSettings(this.settings)
    return this.settings
  }

  /**
   *   populate Field Report Statuses
   *
   */
  private initSettings() { // settings: SettingsType
    //original hardcoded defaults... not updated until form is submitted... Settings.component.ts' form doesn't allow editing of all values
    this.log.verbose("Initialize App Settings from hardcoded values", this.id)

    let dt = new Date()
    let endDt = new Date()
    endDt.setHours(Number(dt.getHours()) + this.defOpPeriodLength)
    this.log.verbose(`OpPeriod: ${dt.toLocaleString("en-US")}, plus ${this.defOpPeriodLength} hours = ${endDt.toLocaleString("en-US")} `, this.id)

    return {
      settingsName: '', // FUTURE: Use if people want to load and saveas, or have various 'templates'
      settingsDate: dt, // when last created/edited...

      mission: '',
      event: '',
      eventNotes: '',
      opPeriod: '',
      opPeriodStart: dt,
      opPeriodEnd: endDt,

      application: 'RangerTrak',
      version: '0', // not exposed in Settingss Component, so set in constructor
      debugMode: false,

      defLat: 47.4472,
      defLng: -122.4627,  // Vashon EOC!
      defPlusCode: '84VVCGWP+VW', // or "CGWP+VX Vashon, Washington" = 47.447187,-122.462688
      w3wLocale: "Vashon, WA",
      allowManualPinDrops: false,

      leaflet: {
        defZoom: 17,  // or just zoom to bounds?
        markerScheme: '',
        overviewDifference: 5,
        overviewMinZoom: 5,
        overviewMaxZoom: 16
      },

      google: {
        defZoom: 17,  // used? or just zoom to bounds?
        markerScheme: '',
        overviewDifference: 5,
        overviewMinZoom: 5,
        overviewMaxZoom: 16
      },

      imageDirectory: "./assets/imgs/",    //! WARNING: Hardcoded & potential SECURITY risk.
      defFieldReportStatus: 0, // which of the following array entries to use as the default value
      //? FUTURE: Consider replacing "Color" with "CSS_Style" to allow more options?
      fieldReportStatuses: [
        { status: 'Normal', color: '', icon: '' },
        { status: 'Check-in', color: 'darkkhaki', icon: '' },
        { status: 'Check-out', color: 'darkgoldenrod', icon: '' },
        { status: 'Need Rest', color: 'chartreuse', icon: '' },
        { status: 'Urgent', color: 'red', icon: '' }
      ],
      // fieldReportKeywords: [''],  // Future...could also just search notes field
    }
  }

  /**
  * rewrite field reports to localStorage & notify observers
  */
  public updateSettings(newSettings: SettingsType) {
    // Do any needed sanity/validation here

    localStorage.setItem(this.storageLocalName, JSON.stringify(newSettings))
    this.settingsSubject$.next(this.settings)
    this.log.verbose(`Notified subscribers of new Application Settings ${JSON.stringify(newSettings)} `, this.id)
  }

  /**
   * Expose Observable to 3rd parties, but not the actual subject (which could be abused)
   */
  public getSettingsObserver(): Observable<SettingsType> {
    return this.settingsSubject$.asObservable()
  }

  private localStorageVoyeur() {
    let key
    for (var i = 0; i < localStorage.length; i++) {
      key = localStorage.key(i)
      if (key != null) {
        this.log.excessive(`item ${i} = ${JSON.parse(key)} `, this.id)
      }
    }
  }
}
