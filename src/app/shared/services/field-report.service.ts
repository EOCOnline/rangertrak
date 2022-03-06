import { BehaviorSubject, Observable, Observer, of } from 'rxjs'
import { Injectable, OnInit, Pipe, PipeTransform } from '@angular/core'
import { RangerService, SettingsService, FieldReportStatusType, TeamService } from './index'
import { HttpClient } from '@angular/common/http'
import * as L from 'leaflet'
import { LatLngBounds } from 'leaflet';
import { LogLevel, LogService } from './log.service';

export enum FieldReportSource { Voice, Packet, APRS, Email }

/**
 * Data to store with every field report entry
 */
export type FieldReportType = {
  id: number,
  callsign: string, team: string,
  address: string, lat: number, lng: number,
  date: Date,
  status: string,
  note: string,
  // source: FieldReportSource
}

/**
 * A packet of all field data for the event, or at least the op period
 * ?It does NOT include Rangers or Settings  // Review!
 */
export type FieldReportsType = {  // OK to export to CSV/Excel?!
  version: string,  // TODO: Should be in Settings?
  date: Date,
  event: string,  // TODO: Should be in Settings?
  operationPeriod: string,  // TODO: Should be in Settings?
  bounds: LatLngBounds,
  numReport: number,
  maxId: number,
  filter: string, // All reports or not? Guard to ensure a subset never gets writen to localstorage?
  //rangers: RangerType
  fieldReportStatuses: FieldReportStatusType[],  // TODO: Should be in Settings?
  fieldReports: FieldReportType[]
}


@Injectable({ providedIn: 'root' })
export class FieldReportService {

  private fieldReportArray: FieldReportType[] = []
  private fieldReports!: FieldReportsType
  private fieldReportsSubject!: BehaviorSubject<FieldReportsType>

  private selectedFieldReportArray: FieldReportType[] = []
  private selectedFieldReports!: FieldReportsType

  private fieldReportStatuses: FieldReportStatusType[] = []  // only needed to make fakes
  private storageLocalName = 'fieldReports'
  private nextId = 0
  private serverUri = 'http://localhost:4000/products'

  private bounds = new LatLngBounds([90, 180], [-90, -180]) //SW, NE
  private selectedBounds = new LatLngBounds([90, 180], [-90, -180]) //SW, NE
  private boundsMargin = 0.0025

  constructor(
    private rangerService: RangerService,
    private teamService: TeamService,
    private settingService: SettingsService,
    private log: LogService,
    private httpClient: HttpClient) {

    log.verbose("Contructing FieldReportService: once or repeatedly?!--------------", "FieldReportService")

    let localStorageFieldReports = localStorage.getItem(this.storageLocalName)

    if (localStorageFieldReports == null) {
      log.warn(`No Field Reports found in Local Storage. Will rebuild from defaults.`)
      this.initFieldReports()
    } else if (localStorageFieldReports.indexOf("version") <= 0) {
      log.error(`Field Reports in Local Storage appear corrupted & will be stored in Local Storage with key: '${this.storageLocalName}-BAD'. Will rebuild from defaults.`)
      localStorage.setItem(this.storageLocalName + '-BAD', localStorageFieldReports)
      this.initFieldReports()
    }


    this.fieldReports = ((localStorageFieldReports != null) && (localStorageFieldReports.indexOf("version") <= 0))
      ? JSON.parse(localStorageFieldReports) : null   //TODO: clean up
    if (this.fieldReports) {

      log.warn(`No Field Reports found in Local Storage (or were corrupted). Will rebuild from defaults.`)
      //
      this.initFieldReports()
    }

    this.log.info(`Got v.${this.fieldReports.version} for event: ${this.fieldReports.event}, op period ${this.fieldReports.operationPeriod} on  ${this.fieldReports.date} with ${this.fieldReports.numReport} Field Reports from localstorage`)

    // if ((localStorageFieldReports != null)) {
    //   let ugg = JSON.parse(localStorageFieldReports)
    //this.log.info(`JSON.parse(localStorageFieldReports) ${ugg}`)
    // }

    this.fieldReportStatuses = this.settingService.getFieldReportStatuses()
    // Calc nextId (only used by unused routines?!)
    if (this.fieldReportArray.length > 0) {
      for (const fieldReport of this.fieldReportArray) {
        if (fieldReport.id >= this.nextId) this.nextId = fieldReport.id + 1
      }
      this.recalcFieldBounds()
      this.updateFieldReports()
    }
  }

  /**
   * Set default/initial FieldReports
   */
  initFieldReports() {
    this.fieldReports = {
      version: '0.34',  // TODO: Should be in Settings?
      date: new Date,
      event: 'ACS Exercise #1',  // TODO: Should be in Settings?
      operationPeriod: 'OpPeriod1',  // TODO: Should be in Settings?
      bounds: this.bounds,
      numReport: 0,
      maxId: 0,
      filter: '', // All reports or not? Guard to ensure a subset never gets writen to localstorage?
      //rangers: RangerType
      fieldReportStatuses: this.settingService.fieldReportStatuses,  // TODO: Should be in Settings?
      fieldReports: []
    }
    return this.fieldReports
  }

  /**
   *
   * @param newReports Subscribe to Field Report updates
   * implicit promise for new bound(s) too
   */
  getFieldReportUpdates(): Observable<FieldReportsType> {
    return this.fieldReportsSubject.asObservable()
  }

  /**
   * Register new field reports here, it will update bounds and other metadata, and notify observers
   * @param newReports
   */
  setFieldReports(newReports: FieldReportType[]) {
    this.fieldReportArray = newReports
    this.recalcFieldBounds()
    this.updateFieldReports()
  }

  // In simple terms, here fieldReportObservable are publishing our primary data array that is fieldReports.
  // So if any entity needs to get the values out of observable, then it first needs to
  // subscribe that observable and then fieldReportObservable starts to publish the values,
  // and then subscriber get the values.
  // TODO: remove next routine - unless the 1 second delay is good...
  public getFieldReports(): any {
    const fieldReportsObservable = new Observable(observer => {
      setTimeout(() => {
        observer.next(this.fieldReportArray);
      }, 1000);
    })
    return fieldReportsObservable
  }



  subscribe(observer: Observer<FieldReportType[]>) {
    this.fieldReportsSubject.subscribe(observer)
  }

  subscribeToFieldReports(): Observable<FieldReportType[]> {
    return of(this.fieldReportArray)
  }

  // rewrite field reports to localStorage & notifies observers
  updateFieldReports() {
    localStorage.setItem(this.storageLocalName, JSON.stringify(this.fieldReportArray))

    this.log.verbose(`New field reports are available to observers...`)
    this.fieldReportsSubject.next(this.fieldReports)

    /*
    // TODO: Whats the difference of above & below?!
    this.fieldReportsSubject.next(this.fieldReportArray.map(  // REVIEW: is this just for 1 new report, or any localstorage updates?
      fieldReport => ({
        id: fieldReport.id,
        callsign: fieldReport.callsign,
        team: fieldReport.team,
        address: fieldReport.address,
        lat: fieldReport.lat,
        lng: fieldReport.lng,
        date: fieldReport.date,
        status: fieldReport.status,
        note: fieldReport.note
      })
    ))
    */
  }


  addfieldReport(formData: string): FieldReportType {
    this.log.info(`FieldReportService: Got new field report: ${formData}`)

    let newReport: FieldReportType = JSON.parse(formData)
    newReport.id = this.nextId++
    this.fieldReportArray.push(newReport)
    this.updateFieldReportBounds(newReport)
    this.updateFieldReports() // put to localStorage & update subscribers

    this.log.verbose("TODO: send new report to server (via subscription)...");
    // Ang Dev w/ TS , pg 145

    // https://appdividend.com/2019/06/04/angular-8-tutorial-with-example-learn-angular-8-crud-from-scratch/
    //this.httpClient.post(`${this.serverUri}/add`, newReport).subscribe(res => this.log.info('Subscription of add report to httpClient is Done'));
    /* gets VM12981:1          POST http://localhost:4000/products/add net::ERR_CONNECTION_REFUSED
  core.mjs:6485 ERROR HttpErrorResponse {headers: HttpHeaders, status: 0, statusText: 'Unknown Error', url: 'http://localhost:4000/products/add', ok: false, …}*/
    //this.log.verbose("Sent new report to server (via subscription)...");

    return newReport;
  }
  // https://angular.io/guide/practical-observable-usage#type-ahead-suggestions

  setSelectedFieldReports(selection: FieldReportType[]) {
    this.selectedFieldReportArray = selection
    // TODO: Update seperate bounds
  }

  getSelectedFieldReports() {
    return this.selectedFieldReportArray
  }

  deleteAllFieldReports() {
    this.fieldReportArray = []
    localStorage.removeItem(this.storageLocalName)
    this.nextId = 0 // REVIEW: is this desired???
  }


  // ------------------ BOUNDS ---------------------------

  boundsToBound(bounds: LatLngBounds) {
    return { east: bounds.getEast(), north: bounds.getNorth(), south: bounds.getSouth(), west: bounds.getWest() }
  }

  /*
  getFieldReportBounds() {
    return this.bounds
  }

  getFieldReportBound() {
    return this.bound
  }
*/
  recalcFieldBounds() {
    this.log.verbose(`recalcFieldBounds got ${this.fieldReportArray.length} field reports`)
    let north
    let west
    let south
    let east

    if (this.fieldReportArray.length) {
      north = this.fieldReportArray[0].lat
      west = this.fieldReportArray[0].lng
      south = this.fieldReportArray[0].lat
      east = this.fieldReportArray[0].lng

      // https://www.w3docs.com/snippets/javascript/how-to-find-the-min-max-elements-in-an-array-in-javascript.html
      // concludes with: "the results show that the standard loop is the fastest"

      for (let i = 1; i < this.fieldReportArray.length; i++) {
        if (this.fieldReportArray[i].lat > north) {
          north = Math.round(this.fieldReportArray[i].lat * 10000) / 10000
        }
        if (this.fieldReportArray[i].lat < south) {
          south = Math.round(this.fieldReportArray[i].lat * 10000) / 10000
        }
        if (this.fieldReportArray[i].lng > east) {
          east = Math.round(this.fieldReportArray[i].lng * 10000) / 10000
        }
        if (this.fieldReportArray[i].lng > west) {
          west = Math.round(this.fieldReportArray[i].lng * 10000) / 10000
        }
      }
    } else {
      // no field reports yet! Rely on broadening processing below
      north = SettingsService.Settings.defLat
      west = SettingsService.Settings.defLng
      south = SettingsService.Settings.defLat
      east = SettingsService.Settings.defLng
    }

    this.log.info(`recalcFieldBounds got E:${east} W:${west} N:${north} S:${south} `)
    if (east - west < 2 * this.boundsMargin) {
      east += this.boundsMargin
      west -= this.boundsMargin
      this.log.info(`recalcFieldBounds BROADENED to E:${east} W:${west} `)
    }
    if (north - south < 2 * this.boundsMargin) {
      north += this.boundsMargin
      south -= this.boundsMargin
      this.log.info(`recalcFieldBounds BROADENED to N:${north} S:${south} `)
    }


    this.bounds = new LatLngBounds([south, west], [north, east]) //SW, NE
    //this.bound = { east: east, north: north, south: south, west: west } //e,n,s,w
    //this.bound = { east: Math.round(east*10000)/10000, north: Math.round(north*10000)/10000, south: Math.round(south*10000)/10000, west: Math.round(west*10000)/10000 } //e,n,s,w
    return this.bound


  }

  private updateFieldReportBounds(newFR: FieldReportType) {
    this.bounds.extend([newFR.lat, newFR.lng])
    //this.bound = this.getBoundFromBounds(this.bounds)
    // BUG: Need to reissue fieldReports to subscribers!
    return this.bound
  }

  // TODO: put in coordinates or utility? This relies on GOOGLE.MAPS!
  /*getBoundFromBounds(bounds: google.maps.LatLngBounds): google.maps.LatLngBoundsLiteral {
    let NE = new google.maps.LatLng(bounds.getNorthEast())
    let SW = new google.maps.LatLng(bounds.getSouthWest())
    return { east: NE.lng(), north: NE.lat(), south: SW.lat(), west: SW.lng() }
  }*/

  generateFakeData(num: number = 15) {
    let teams = this.teamService.getTeams()
    let rangers = this.rangerService.GetRangers()
    if (rangers == null || rangers.length < 1) {
      alert("No Rangers! Please add some 1st.")
      return
    }
    const streets = ["Ave", "St.", "Pl.", "Court", "Circle"]
    const notes = ["Reports beautiful sunrise", "Roudy Kids", "Approaching Neighborhood CERT", "Confused & dazed in the sun",
      "Wow", "na", "Can't hear you", "Bounced via tail of a comet!", "Need confidential meeting: HIPAA", "Getting overrun by racoons"]

    const msSince1970 = new Date().getTime()
    this.log.info(`Adding an additional ${num} FAKE field reports... with base of ${msSince1970}`)

    for (let i = 0; i < num; i++) {
      this.fieldReportArray.push({
        id: this.nextId++,
        callsign: rangers[Math.floor(Math.random() * rangers.length)].callsign,
        team: teams[Math.floor(Math.random() * teams.length)].name,
        address: (Math.floor(Math.random() * 10000)) + " SW " + streets[(Math.floor(Math.random() * streets.length))],
        lat: SettingsService.Settings.defLat + Math.floor(Math.random() * 100) / 50000 - .001,
        lng: SettingsService.Settings.defLng + (Math.floor(Math.random() * 100) / 50000) - .001,
        date: new Date(Math.floor(msSince1970 - (Math.random() * 10 * 60 * 60 * 1000))), // 0-10 hrs earlier
        status: this.fieldReportStatuses[Math.floor(Math.random() * this.fieldReportStatuses.length)].status,
        note: notes[Math.floor(Math.random() * notes.length)]
      })
    }
    this.recalcFieldBounds()
  }

  // ---------------------------------  UNUSED -------------------------------------------------------

  allFieldReportsToServer_unused() {
    this.log.verbose("Sending all reports to server (via subscription)...")

    // https://appdividend.com/2019/06/04/angular-8-tutorial-with-example-learn-angular-8-crud-from-scratch/

    // TODO: replace "add" with"post" or ???
    this.httpClient.post(`${this.serverUri}/add`, this.fieldReportArray)
      .subscribe(res => this.log.verbose('Subscription of all reports to httpClient is Done'));

    this.log.verbose("Sent all reports to server (via subscription)...");
  }

  // TODO: verify new report is proper shape/validated here or by caller??? Send as string or object?

  getFieldReport(id: number) {
    const index = this.findIndex(id);
    return this.fieldReportArray[index];
  }

  updateFieldReport_unused(report: FieldReportType) {
    const index = this.findIndex(report.id);
    this.fieldReportArray[index] = report;
    this.updateFieldReports();
  }

  deleteFieldReport(id: number) {
    const index = this.findIndex(id);
    this.fieldReportArray.splice(index, 1);
    this.updateFieldReports();
    // this.nextId-- // REVIEW: is this desired???
  }

  private findIndex(id: number): number {
    for (let i = 0; i < this.fieldReportArray.length; i++) {
      if (this.fieldReportArray[i].id === id) {
        return i
      }
    }
    throw new Error(`FieldReport with id ${id} was not found!`)
    // return -1
  }

  sortFieldReportsByCallsign_unused() {
    return this.fieldReportArray.sort((n1, n2) => {
      if (n1.callsign > n2.callsign) { return 1 }
      if (n1.callsign < n2.callsign) { return -1 }
      return 0;
    })

    // let sorted = this.fieldReports.sort((a, b) => a.callsign > b.callsign ? 1 : -1)
    // this.log.verbose("SortFieldReportsByCallsign...DONE --- BUT ARE THEY REVERSED?!")
  }

  sortFieldReportsByDate_unused() {
    return this.fieldReportArray.sort((n1, n2) => {
      if (n1.date > n2.date) { return 1 }
      if (n1.date < n2.date) { return -1 }
      return 0;
    })
  }

  sortFieldReportsByTeam_unused() {
    return this.fieldReportArray.sort((n1, n2) => {
      if (n1.team > n2.team) { return 1 }
      if (n1.team < n2.team) { return -1 }
      return 0;
    })
  }

  filterFieldReportsByDate_unused(beg: Date, end: Date) { // Date(0) = January 1, 1970, 00:00:00 Universal Time (UTC)
    const minDate = new Date(0)
    const maxDate = new Date(2999, 0)
    beg = beg < minDate ? beg : minDate
    end = (end < maxDate) ? end : maxDate

    return this.fieldReportArray.filter((report) => (report.date >= beg && report.date <= end))
  }
}
