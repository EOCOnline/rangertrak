import L, { LatLngBounds } from 'leaflet'
import { BehaviorSubject, Observable, Observer, of, Subscription, throwError } from 'rxjs'

import { HttpClient } from '@angular/common/http'
import {
  Injectable, OnDestroy, OnInit, Optional, Pipe, PipeTransform, SkipSelf
} from '@angular/core'

import {
  FieldReportStatusType, FieldReportsType, FieldReportType, LogService, RangerService, RangerType,
  SettingsService, SettingsType
} from './'

//import {  } from './ranger.interface'



// TODO: Update server with new reports:  https://angular.io/tutorial/toh-pt6#heroes-and-http

//, deps: [LogService, RangerService, LogService]
@Injectable({ providedIn: 'root' })
export class FieldReportService implements OnInit, OnDestroy {

  private id = 'Field Report Service'

  private fieldReports!: FieldReportsType
  private fieldReportsSubject$!: BehaviorSubject<FieldReportsType>

  // REVIEW: No need to enable subscription to selectedFieldReports as they are
  // auto-saved on evey selection and user is single-threaded.
  // Otherwise move to maps which THEN grab the new values.
  private selectedFieldReports!: FieldReportsType

  private settingsSubscription!: Subscription
  private settings!: SettingsType

  private rangersSubscription!: Subscription
  public rangers: RangerType[] = []

  private storageLocalName = 'fieldReports'
  private serverUri = 'https://localhost:4000/products' // FUTURE:
  private boundsMargin = 0.0025

  // https://angular.io/guide/architecture-services#providing-services: singleton or multiple service instances?!
  //! REVIEW: Field & Ranger Services BOTH call constructors twice!!
  constructor(
    private rangerService: RangerService,
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

    this.fieldReports = this.LoadFieldReportsFromLocalStorage()


    this.settingsSubscription = this.settingsService.getSettingsObserver().subscribe({
      next: (newSettings) => {
        this.settings = newSettings
        this.log.excessive('Received new Settings via subscription.', this.id)

        if (this.fieldReports.version == this.settings.version) {
          this.log.excessive('Application version matches version used to store Field Reports.', this.id)
        } else {
          this.log.error(`Application version ${this.settings.version} does NOT match version used to store Field Reports: ${this.fieldReports.version}. No upgrade logic implemented yet...`, this.id)
        }
      },
      error: (e) => this.log.error('Settings Subscription got:' + e, this.id),
      complete: () => this.log.info('Settings Subscription complete', this.id)
    })

    this.log.info(`Got v.${this.fieldReports.version} for event: ${this.fieldReports.event} on  ${this.fieldReports.date} with ${this.fieldReports.numReport} Field Reports from localstorage`, this.id)

    // REVIEW: bounds actually needs to be an Object, not getting done this a waitForAsync, right?!
    this.recalcFieldBounds(this.fieldReports)  // Should be extraneous...
    this.fieldReportsSubject$ = new BehaviorSubject(this.fieldReports)
    this.updateFieldReportsAndPublish()
  }


  ngOnInit() {
    this.log.excessive('ngOnInit', this.id)
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
      bounds: new LatLngBounds([89.9, 179.9], [-89.9, -179.9]), //SW, NE
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
    return this.fieldReportsSubject$.asObservable()
  }

  /**
   * Update localStorage with new field reports & notify observers
   */
  private updateFieldReportsAndPublish() {
    //this.log.excessive(`NEW REPORT AVAILABLE, with E: ${this.fieldReports.bounds.getEast()};  N: ${this.fieldReports.bounds.getNorth()};  W: ${this.fieldReports.bounds.getWest()};  S: ${this.fieldReports.bounds.getSouth()};  `, this.id)

    // Do any needed sanity/validation here
    if (this.fieldReports.numReport != this.fieldReports.fieldReportArray.length) {
      this.log.error(`this.fieldReports.numReport=${this.fieldReports.numReport} != this.fieldReports.fieldReportArray.length ${this.fieldReports.fieldReportArray.length}`, this.id)
      this.fieldReports.numReport = this.fieldReports.fieldReportArray.length
    }

    localStorage.setItem(this.storageLocalName, JSON.stringify(this.fieldReports))

    this.log.excessive(`New field reports are available to observers...`, this.id)
    this.fieldReportsSubject$.next(this.fieldReports)
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
    this.fieldReports.fieldReportArray.push(newReport)

    let newPt = L.latLng(newReport.location.lat, newReport.location.lng)
    //let newPt = L.latLng(newReport.lat, newReport.lng)
    if (!newPt) {
      this.log.error(`newPt = ${JSON.stringify(newPt)}; lat:${newReport.location.lat}, lng: ${newReport.location.lng}`)
      // newPt is undefined, though newReport.lat, newReport.lng look good...
      //!BUG: Not a function, entering new FR in Entry Page...
      //debugger
    }

    this.fieldReports.bounds.extend({ lat: newReport.location.lat, lng: newReport.location.lng })

    this.updateFieldReportsAndPublish() // put to localStorage & update subscribers
    return newReport
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

  boundsToBound(bounds: LatLngBounds) {
    this.log.verbose(`Bounds conversion -- E: ${bounds.getEast()};  N: ${bounds.getNorth()};  W: ${bounds.getWest()};  S: ${bounds.getSouth()};  `, this.id)
    return { east: bounds.getEast(), north: bounds.getNorth(), south: bounds.getSouth(), west: bounds.getWest() }
  }

  /**
   * recalcFieldBounds
   *
   * @param reports
   * @returns
   */
  recalcFieldBounds(reports: FieldReportsType) {
    this.log.verbose(`recalcFieldBounds got ${reports.fieldReportArray.length} field reports`, this.id)
    //this.log.excessive(`OLD Value: E: ${reports.bounds.getEast()};  N: ${reports.bounds.getNorth()};  W: ${reports.bounds.getWest()};  S: ${reports.bounds.getSouth()};  `, this.id)

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
        if (reports.fieldReportArray[i].location.lng > west) {
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

    reports.bounds = new L.LatLngBounds([[south, west], [north, east]])//SW, NE
    this.log.excessive(`New bounds: E: ${reports.bounds.getEast()};  N: ${reports.bounds.getNorth()};  W: ${reports.bounds.getWest()};  S: ${reports.bounds.getSouth()};  `, this.id)
  }

  generateFakeData(num: number = 15) {
    let rangers: RangerType[] = []

    this.rangersSubscription = this.rangerService.getRangersObserver().subscribe({
      next: (newRangers) => { rangers = newRangers },
      error: (e) => this.log.error('Rangers Subscription got:' + e, this.id),
      complete: () => this.log.info('Rangers Subscription complete', this.id)
    })

    if (rangers == null || rangers!.length < 1) {
      alert("No Rangers! Please add some 1st.")
      return
    }
    if (this.settings === undefined) {
      this.log.error(`this.settings was undefined in generateFakeData()`, this.id)
      return
    }

    const streets = ["Ave", "St.", "Pl.", "Court", "Circle"]
    const notes = ["Reports beautiful sunrise", "Roudy Kids chasing me",
      "Approaching Neighborhood CERT", "Confused & dazed by a sun spot",
      "Wow", "#&)Rats)^%$#@", "na", "Can't hear you",
      "Alright: Found another GeoCache!", "Need a Snickers bar",
      "Bounced via tail of a comet!", "Is that...Sasquatch???",
      "Need confidential meeting: HIPAA", "Getting overrun by racoons"]

    const msSince1970 = new Date().getTime()
    this.log.info(`Adding an additional ${num} FAKE field reports... with base of ${msSince1970}`, this.id)

    for (let i = 0; i < num; i++) {
      this.fieldReports.fieldReportArray.push({
        id: this.fieldReports.maxId++,
        callsign: rangers[Math.floor(Math.random() * rangers.length)].callsign,
        //team: 'T1', //teams[Math.floor(Math.random() * teams.length)].name,
        location: {
          lat: this.settings.defLat + Math.floor(Math.random() * 100) / 50000 - .001,
          lng: this.settings.defLng + (Math.floor(Math.random() * 100) / 50000) - .001,
          address: (Math.floor(Math.random() * 10000)) + " SW " + streets[(Math.floor(Math.random() * streets.length))],
          derivedFromAddress: (Math.random() > 0.75)
        },
        date: new Date(Math.floor(msSince1970 - (Math.random() * 10 * 60 * 60 * 1000))), // 0-10 hrs earlier
        status: this.settings.fieldReportStatuses[Math.floor(Math.random() * this.settings.fieldReportStatuses.length)].status,
        notes: notes[Math.floor(Math.random() * notes.length)]
      })
      this.fieldReports.numReport += num
    }
    this.recalcFieldBounds(this.fieldReports)
    this.updateFieldReportsAndPublish()
  }

  ngOnDestroy() {
    /* Error: Uncaught (in promise): TypeError: Cannot read properties of undefined (reading 'unsubscribe')
       TypeError: Cannot read properties of undefined (reading 'unsubscribe')
       at FieldReportService.ngOnDestroy (main.js:8505:35)
    */
    // this.rangersSubscription?.unsubscribe()
    // this.settingsSubscription?.unsubscribe()
  }

  // ---------------------------------  UNUSED -------------------------------------------------------

  /**
   * Register new field reports here, it will update bounds and other metadata, and notify observers
   * @param newReports
   */
  private setFieldReports(newReports: FieldReportType[]) {
    this.fieldReports.fieldReportArray = newReports
    this.recalcFieldBounds(this.fieldReports)
    this.updateFieldReportsAndPublish()
  }

  private allFieldReportsToServer_unused() {
    this.log.verbose("Sending all reports to server (via subscription)...", this.id)

    // https://appdividend.com/2019/06/04/angular-8-tutorial-with-example-learn-angular-8-crud-from-scratch/

    // TODO: replace "add" with"post" or ???
    this.httpClient.post(`${this.serverUri}/add`, this.fieldReports.fieldReportArray)
      .subscribe(res => this.log.excessive('Subscription of all reports to httpClient is Done', this.id))

    this.log.verbose("Sent all reports to server (via subscription)...", this.id);
  }

  // TODO: verify new report is proper shape/validated here or by caller??? Send as string or object?

  private getFieldReport(id: number) {
    const index = this.findIndex2(id);
    return this.fieldReports.fieldReportArray[index];
  }

  updateFieldReport_unused(report: FieldReportType) {
    const index = this.findIndex2(report.id)
    this.fieldReports.fieldReportArray[index] = report
    // TODO: recalc bounds
    this.updateFieldReportsAndPublish()
  }

  private deleteFieldReport(id: number) {
    const index = this.findIndex2(id);
    this.fieldReports.fieldReportArray.splice(index, 1);
    // TODO: recalc bounds
    this.updateFieldReportsAndPublish();
    // this.nextId-- // REVIEW: is this desired???
  }

  // NOTE: findIndex is a system function on arrays!
  private findIndex2(id2: number): number {
    this.fieldReports.fieldReportArray.findIndex(this.myFn)
    for (let i = 0; i < this.fieldReports.fieldReportArray.length; i++) {
      if (this.fieldReports.fieldReportArray[i].id === id2) {
        return i
      }
    }
    throw new Error(`FieldReport with id ${id2} was not found!`)
    // return -1
  }

  myFn(ids: FieldReportType) {
    return ids.id === id
  }

  //! MUlti-field sort:  data.sort((a, b) => a.city.localeCompare(b.city) || b.price - a.price)
  private sortFieldReportsByCallsign_unused() {
    return this.fieldReports.fieldReportArray.sort((n1, n2) => {
      if (n1.callsign > n2.callsign) { return 1 }
      if (n1.callsign < n2.callsign) { return -1 }
      return 0;
    })

    // let sorted = this.fieldReports.sort((a, b) => a.callsign > b.callsign ? 1 : -1)
    // this.log.excessive("SortFieldReportsByCallsign...DONE --- BUT ARE THEY REVERSED?!", this.id)
  }

  private sortFieldReportsByDate_unused() {
    return this.fieldReports.fieldReportArray.sort((n1, n2) => {
      if (n1.date > n2.date) { return 1 }
      if (n1.date < n2.date) { return -1 }
      return 0;
    })
  }

  /*
  private sortFieldReportsByTeam_unused() {
    return this.fieldReports.fieldReportArray.sort((n1, n2) => {
      if (n1.team > n2.team) { return 1 }
      if (n1.team < n2.team) { return -1 }
      return 0;
    })
  }
*/

  private filterFieldReportsByDate_unused(beg: Date, end: Date) { // Date(0) = January 1, 1970, 00:00:00 Universal Time (UTC)
    const minDate = new Date(0)
    const maxDate = new Date(2999, 0)
    beg = beg < minDate ? beg : minDate
    end = (end < maxDate) ? end : maxDate

    return this.fieldReports.fieldReportArray.filter((report) => (report.date >= beg && report.date <= end))
  }
}
