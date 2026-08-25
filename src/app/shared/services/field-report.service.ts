import { Observable, Observer, of, ReplaySubject, Subscription, throwError } from 'rxjs'

import { HttpClient } from '@angular/common/http'
import {
  Injectable, OnDestroy, OnInit, Optional, Pipe, PipeTransform, signal, SkipSelf, WritableSignal
} from '@angular/core'

import {
  FieldReportStatusType, FieldReportsType, FieldReportType, LogService, RangerType,
  SettingsService, SettingsType
} from './'

//import {  } from './ranger.interface'



// TODO: Update server with new reports:  https://angular.io/tutorial/toh-pt6#heroes-and-http

//, deps: [LogService, RangerService, LogService]
@Injectable({ providedIn: 'root' })
export class FieldReportService {

  private id = 'Field Report Service'

  private fieldReports!: FieldReportsType
  // fieldReportsSignal is the single source of truth for state.
  // fieldReportsReplay$ is a thin, synchronously-fed notification layer for
  // existing Observable consumers - see the equivalent, more-detailed
  // comment in settings.service.ts for why (toObservable()'s effect-based
  // bridge is asynchronous; several consumers need synchronous emission).
  // Like RangerService's `rangers`, `fieldReports` is mutated in place
  // (push/extend/etc.) rather than reassigned; updateFieldReportsAndPublish()
  // is the single point that syncs its current contents out.
  private fieldReportsSignal!: WritableSignal<FieldReportsType>
  private fieldReportsReplay$ = new ReplaySubject<FieldReportsType>(1)

  // REVIEW: No need to enable subscription to selectedFieldReports as they are
  // auto-saved on evey selection and user is single-threaded.
  // Otherwise move to maps which THEN grab the new values.
  private selectedFieldReports!: FieldReportsType

  private settingsSubscription!: Subscription
  private settings!: SettingsType

  public rangers: RangerType[] = []

  private storageLocalName = 'fieldReports'
  private serverUri = 'https://localhost:4000/products' // FUTURE:
  private boundsMargin = 0.0025

  // https://angular.io/guide/architecture-services#providing-services: singleton or multiple service instances?!
  //! REVIEW: Field & Ranger Services BOTH call constructors twice!!
  constructor(
    private settingsService: SettingsService,
    private log: LogService,
    private httpClient: HttpClient,
    @Optional() @SkipSelf() existingService: FieldReportService,
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

    this.log.verbose("======== Constructor() ============", this.id)
    //! REVIEW: this.log.verbose(`Constructor call stack (NOT an error: why called twice?): ${new Error().stack}`, this.id)

    // Subscribe to Settings BEFORE loading reports: SettingsService replays its current
    // value synchronously, so this populates this.settings first. Loading first meant a
    // fresh install built its empty FieldReports with version '0' (initEmptyFieldReports
    // falls back when settings are missing), which then failed the version check below
    // and logged a bogus "does NOT match" error on every virgin start.
    this.settingsSubscription = this.settingsService.getSettingsObserver().subscribe({
      next: (newSettings) => {
        this.settings = newSettings
        this.log.excessive('Received new Settings via subscription.', this.id)

        // this.fieldReports is undefined until the load below completes on the very
        // first emission; the version check only makes sense once it exists.
        if (!this.fieldReports) { return }

        if (this.fieldReports.version == this.settings.version) {
          this.log.excessive('Application version matches version used to store Field Reports.', this.id)
        } else {
          this.log.error(`Application version ${this.settings.version} does NOT match version used to store Field Reports: ${this.fieldReports.version}. No upgrade logic implemented yet...`, this.id)
        }
      },
      error: (e) => this.log.error('Settings Subscription got:' + e, this.id),
      complete: () => this.log.info('Settings Subscription complete', this.id)
    })

    this.fieldReports = this.LoadFieldReportsFromLocalStorage()

    this.log.info(`Got v.${this.fieldReports.version} for event: ${this.fieldReports.event} on  ${this.fieldReports.date} with ${this.fieldReports.numReport} Field Reports from localstorage`, this.id)

    // REVIEW: bounds actually needs to be an Object, not getting done this a waitForAsync, right?!
    this.recalcFieldBounds(this.fieldReports)  // Should be extraneous...
    this.fieldReportsSignal = signal(this.fieldReports)
    this.updateFieldReportsAndPublish()
  }


  /**
   * Load any existing FieldReports from browser's Local Storage
   * FUTURE: If FieldReportsType elements/structure changes in a future version, upgrade to that
   * @returns
   */
  private LoadFieldReportsFromLocalStorage(): FieldReportsType {
    let localStorageFieldReports = localStorage.getItem(this.storageLocalName)

    if (localStorageFieldReports == null) {
      this.log.warn(`No Field Reports found in Local Storage. Will rebuild from defaults.`, this.id)
      return this.initEmptyFieldReports()
    }
    else if (localStorageFieldReports.indexOf("version") <= 0) {
      this.log.error(`Field Reports in Local Storage appear corrupted (no version #) & will be stored in Local Storage with key: '${this.storageLocalName}-BAD'. Will rebuild from defaults.`, this.id)
      localStorage.setItem(this.storageLocalName + '-BAD', localStorageFieldReports)
      return this.initEmptyFieldReports()
    } else {
      return JSON.parse(localStorageFieldReports)
    }
  }

  /**
   * Create a fresh/new/default/initial FieldReports object
   */
  private initEmptyFieldReports() {

    //(property) FieldReportService.fieldReports: FieldReportsType
    //Type '{ version: string | undefined; date: Date; event: string; bounds: L.LatLngBounds; numReport: number; maxId: number; filter: string; fieldReportArray: { id: number; callsign: string; lat: number | undefined; ... 4 more ...; note: string; }[]; }' is not assignable to type 'FieldReportsType'.ts(2322)

    if (this.settings === undefined) {
      this.log.error(`this.Settings not yet set!`, this.id)
      //throwError(() => new Error(`this.Settings was not yet set in FieldReportService!!!!!`))
      //debugger
      //return null
    }

    return {
      version: this.settings ? this.settings.version : '0',
      date: new Date(),
      event: this.settings ? this.settings.event : '',
      bounds: { north: 89.9, south: -89.9, east: 179.9, west: -179.9 }, // whole world until recalcFieldBounds() runs
      numReport: 0,
      maxId: 0,
      filter: '', // All reports or not? Guard to ensure a subset never gets writen to localstorage?
      fieldReportArray: []
    }
  }

  /**
   * Expose Observable to 3rd parties, but not the actual subject (which could be abused)
   */
  public getFieldReportsObserver(): Observable<FieldReportsType> {
    return this.fieldReportsReplay$.asObservable()
  }

  /**
   * Synchronous read of the current field reports (e.g. for export/backup).
   * Prefer getFieldReportsObserver() for anything reactive.
   */
  public getCurrentFieldReports(): FieldReportsType {
    return this.fieldReports
  }

  /**
   * Replaces all field reports wholesale (e.g. restoring from a mission
   * backup). `newFieldReports.bounds` is ignored if present - bounds are
   * always recalculated fresh, exactly as the constructor already does on
   * every normal load.
   */
  public replaceAllFieldReports(newFieldReports: Omit<FieldReportsType, 'bounds'>) {
    this.fieldReports = { ...newFieldReports, bounds: this.fieldReports.bounds }
    this.recalcFieldBounds(this.fieldReports)
    this.updateFieldReportsAndPublish()
  }

  /**
   * Update localStorage with new field reports & notify observers
   */
  private updateFieldReportsAndPublish() {
    // Do any needed sanity/validation here
    if (this.fieldReports.numReport != this.fieldReports.fieldReportArray.length) {
      this.log.error(`this.fieldReports.numReport=${this.fieldReports.numReport} != this.fieldReports.fieldReportArray.length ${this.fieldReports.fieldReportArray.length}`, this.id)
      this.fieldReports.numReport = this.fieldReports.fieldReportArray.length
    }

    localStorage.setItem(this.storageLocalName, JSON.stringify(this.fieldReports))

    this.log.excessive(`New field reports are available to observers...`, this.id)
    // Signal gets a fresh copy for the same reason as RangerService.rangers:
    // this.fieldReports is mutated in place, so .set() with the same
    // reference would be a no-op under the signal's default equality check.
    this.fieldReportsSignal.set({ ...this.fieldReports })
    this.fieldReportsReplay$.next(this.fieldReports)
  }

  /**
   * User has submitted a new Field Report: store it into localstorage and publish to any subscribers
   *
   * @param formData
   * @returns
   */
  public addfieldReport(formData: string) {
    this.log.info(`Got new field report: ${JSON.stringify(formData)}`, 'FieldReportService')

    let newReport: FieldReportType = JSON.parse(formData) //"[object Object]" is not valid JSON
    //let newReport: FieldReportType = formData //"[object Object]" is not valid JSON
    newReport.id = this.fieldReports.maxId++
    this.fieldReports.numReport++
    this.fieldReports.fieldReportArray.push(newReport)

    // Recalculate rather than widen the existing box (this used to call Leaflet's
    // LatLngBounds.extend()). Two update paths that disagreed - extend() applied no
    // broadening margin - was D-22; one path means one answer, and the array is small
    // enough that a full pass costs nothing.
    this.recalcFieldBounds(this.fieldReports)

    this.updateFieldReportsAndPublish() // put to localStorage & update subscribers
    return newReport
  }

  /**
   * Persist edits made in place to existing reports - the Field Reports grid
   * binds directly to fieldReportArray, so AG Grid's cell editing mutates these
   * very objects; all that was missing was writing them back out. Bounds are
   * recalculated because an edited lat/lng can move the map's extent.
   */
  public saveEditedFieldReports() {
    this.recalcFieldBounds(this.fieldReports)
    this.updateFieldReportsAndPublish()
  }

  public setSelectedFieldReports(selection: FieldReportType[]) {
    if (this.selectedFieldReports == null) {
      this.selectedFieldReports = this.initEmptyFieldReports()
      this.selectedFieldReports.filter = "As selected by user"
    }
    this.selectedFieldReports.fieldReportArray = selection
    this.selectedFieldReports.numReport = selection.length
    this.recalcFieldBounds(this.selectedFieldReports)
    // Update - if subscribed...
  }

  public getSelectedFieldReports(): FieldReportsType {
    // TODO: Use setter & getters?, pg 452 Ang Dev w/ TS
    if (this.selectedFieldReports == null) {
      this.log.warn(`User hasn't selected any rows yet,
      so we're returning an empty array for Selected Field Reports!`, this.id)
      this.selectedFieldReports = this.initEmptyFieldReports()
      this.selectedFieldReports.filter = "As selected by user"
      this.selectedFieldReports.fieldReportArray = []
      this.selectedFieldReports.numReport = 0
    }
    return this.selectedFieldReports
  }

  public deleteAllFieldReports() {
    // TODO: reset header properties too?!
    this.fieldReports.fieldReportArray = []
    localStorage.removeItem(this.storageLocalName)
    this.fieldReports.maxId = 0 // REVIEW: is this desired???
  }


  // ------------------ BOUNDS ---------------------------

  /**
   * recalcFieldBounds
   *
   * The single place field report bounds are computed. Writes a plain
   * BoundsType - map engines convert it to their own type at the point of use.
   *
   * @param reports
   * @returns
   */
  recalcFieldBounds(reports: FieldReportsType) {
    this.log.verbose(`recalcFieldBounds got ${reports.fieldReportArray.length} field reports`, this.id)

    if (!this.settings) {
      this.log.error('this.settings is undefined', this.id)
      throwError(() => new Error('this.settings is undefined'))
      return
    }
    let north
    let west
    let south
    let east

    if (reports.fieldReportArray.length) {
      north = reports.fieldReportArray[0].location.lat
      west = reports.fieldReportArray[0].location.lng
      south = reports.fieldReportArray[0].location.lat
      east = reports.fieldReportArray[0].location.lng

      // https://www.w3docs.com/snippets/javascript/how-to-find-the-min-max-elements-in-an-array-in-javascript.html
      // concludes with: "the results show that the standard loop is the fastest"

      for (let i = 1; i < reports.fieldReportArray.length; i++) {
        if (reports.fieldReportArray[i].location.lat > north) {
          north = reports.fieldReportArray[i].location.lat //Math.round(reports.fieldReportArray[i].location.lat * 10000) / 10000
        }
        if (reports.fieldReportArray[i].location.lat < south) {
          south = reports.fieldReportArray[i].location.lat //Math.round(reports.fieldReportArray[i].location.lat * 10000) / 10000
        }
        if (reports.fieldReportArray[i].location.lng > east) {
          east = reports.fieldReportArray[i].location.lng //Math.round(reports.fieldReportArray[i].location.lng * 10000) / 10000
        }
        if (reports.fieldReportArray[i].location.lng < west) {
          west = reports.fieldReportArray[i].location.lng //Math.round(reports.fieldReportArray[i].location.lng * 10000) / 10000
        }
      }
      // Round to 4 decimal places
      north = Math.round(north * 10 ** 4) / 10 ** 4
      south = Math.round(south * 10 ** 4) / 10 ** 4
      east = Math.round(east * 10 ** 4) / 10 ** 4
      west = Math.round(west * 10 ** 4) / 10 ** 4
    } else {
      // no field reports yet! Rely on broadening processing below
      north = this.settings.defLat
      west = this.settings.defLng
      south = this.settings.defLat
      east = this.settings.defLng
    }

    // Broaden boundaries to minimum values
    this.log.info(`recalcFieldBounds got E:${east} W:${west} N:${north} S:${south} `, this.id)
    if (east - west < 2 * this.boundsMargin) {
      east += this.boundsMargin
      west -= this.boundsMargin
      this.log.info(`recalcFieldBounds BROADENED to E:${east} W:${west} `, this.id)
    }
    if (north - south < 2 * this.boundsMargin) {
      north += this.boundsMargin
      south -= this.boundsMargin
      this.log.info(`recalcFieldBounds BROADENED to N:${north} S:${south} `, this.id)
    }

    reports.bounds = { north, south, east, west }
    this.log.excessive(`New bounds: E: ${east};  N: ${north};  W: ${west};  S: ${south};  `, this.id)
  }

}
