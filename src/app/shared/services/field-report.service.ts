import { BehaviorSubject, Observable, Observer, of } from 'rxjs'
import { Injectable, OnInit, Pipe, PipeTransform } from '@angular/core'
import { RangerService, SettingsService, FieldReportStatusType, TeamService } from './index'
import { HttpClient } from '@angular/common/http'
import * as L from 'leaflet'
import { LatLngBounds } from 'leaflet';
import { LogService } from './log.service';

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
  fieldReportArray: FieldReportType[]
}


@Injectable({ providedIn: 'root' })
export class FieldReportService {

  private fieldReports!: FieldReportsType
  private fieldReportsSubject: BehaviorSubject<FieldReportsType>
  private selectedFieldReports!: FieldReportsType  // TODO: Enable subscription to this also?

  private storageLocalName = 'fieldReports'
  private serverUri = 'http://localhost:4000/products'
  private boundsMargin = 0.0025

  constructor(
    private rangerService: RangerService,
    private teamService: TeamService,
    private settingService: SettingsService,
    private log: LogService,
    private httpClient: HttpClient) {

    log.verbose("Contruction: once or repeatedly?!--------------", "FieldReportService")

    let localStorageFieldReports = localStorage.getItem(this.storageLocalName)

    if (localStorageFieldReports == null) {
      log.warn(`No Field Reports found in Local Storage. Will rebuild from defaults.`, "FieldReportService")
      this.fieldReports = this.initFieldReports()
    } else if (localStorageFieldReports.indexOf("version") <= 0) {
      log.error(`Field Reports in Local Storage appear corrupted & will be stored in Local Storage with key: '${this.storageLocalName}-BAD'. Will rebuild from defaults.`, "FieldReportService")
      localStorage.setItem(this.storageLocalName + '-BAD', localStorageFieldReports)
      this.fieldReports = this.initFieldReports()
    } else {
      this.fieldReports = JSON.parse(localStorageFieldReports)
    }

    this.log.info(`Got v.${this.fieldReports.version} for event: ${this.fieldReports.event}, op period ${this.fieldReports.operationPeriod} on  ${this.fieldReports.date} with ${this.fieldReports.numReport} Field Reports from localstorage`, "FieldReportService")

    this.fieldReportsSubject = new BehaviorSubject(this.fieldReports)
    this.updateFieldReports()
  }

  /**
   * Set default/initial FieldReports
   */
  private initFieldReports() {
    return {
      version: '0.34',  // TODO: Should be in Settings?
      date: new Date,
      event: 'ACS Exercise #1',  // TODO: Should be in Settings?
      operationPeriod: 'OpPeriod1',  // TODO: Should be in Settings?
      bounds: new LatLngBounds([90, 180], [-90, -180]), //SW, NE
      numReport: 0,
      maxId: 0,
      filter: '', // All reports or not? Guard to ensure a subset never gets writen to localstorage?
      //rangers: RangerType
      fieldReportStatuses: this.settingService.fieldReportStatuses,  // TODO: Should be in Settings?
      fieldReportArray: []
    }
  }

  /**
   * Subscribe to Field Report updates
   */
  public getFieldReportsObserver(): Observable<FieldReportsType> {
    //const fieldReportsObservable = new Observable(observer => {
    //  () => {observer.next(this.fieldReports.fieldReportArray)}})
    return this.fieldReportsSubject.asObservable()
  }

  /**
   * rewrite field reports to localStorage & notify observers
   */
  private updateFieldReports() {
    localStorage.setItem(this.storageLocalName, JSON.stringify(this.fieldReports.fieldReportArray))

    this.log.verbose(`New field reports are available to observers...`, "FieldReportService")
    this.fieldReportsSubject.next(this.fieldReports)

    /*
    TODO: Whats the difference of above & below?!
    this.fieldReportsSubject.next(this.fieldReports.fieldReportArray.map(  // REVIEW: is this just for 1 new report, or any localstorage updates?
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

  public addfieldReport(formData: string) {
    this.log.info(`Got new field report: ${formData}`, 'FieldReportService')

    let newReport: FieldReportType = JSON.parse(formData)
    newReport.id = this.fieldReports.maxId++
    this.fieldReports.fieldReportArray.push(newReport)
    this.fieldReports.bounds.extend([newReport.lat, newReport.lng])
    this.updateFieldReports() // put to localStorage & update subscribers
  }

  public setSelectedFieldReports(selection: FieldReportType[]) {
    if (this.selectedFieldReports == null) {
      this.selectedFieldReports = this.initFieldReports()
      this.selectedFieldReports.filter = "As selected by user"
    }
    this.selectedFieldReports.fieldReportArray = selection
    this.recalcFieldBounds(this.selectedFieldReports)
  }

  public getSelectedFieldReports() { // TODO: Use setter & getters?, pg 452 Ang Dev w/ TS
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
    return { east: bounds.getEast(), north: bounds.getNorth(), south: bounds.getSouth(), west: bounds.getWest() }
  }

  recalcFieldBounds(reports: FieldReportsType) {
    this.log.verbose(`recalcFieldBounds got ${reports.fieldReportArray.length} field reports`, "FieldReportService")
    let north
    let west
    let south
    let east

    if (reports.fieldReportArray.length) {
      north = reports.fieldReportArray[0].lat
      west = reports.fieldReportArray[0].lng
      south = reports.fieldReportArray[0].lat
      east = reports.fieldReportArray[0].lng

      // https://www.w3docs.com/snippets/javascript/how-to-find-the-min-max-elements-in-an-array-in-javascript.html
      // concludes with: "the results show that the standard loop is the fastest"

      for (let i = 1; i < reports.fieldReportArray.length; i++) {
        if (reports.fieldReportArray[i].lat > north) {
          north = Math.round(reports.fieldReportArray[i].lat * 10000) / 10000
        }
        if (reports.fieldReportArray[i].lat < south) {
          south = Math.round(reports.fieldReportArray[i].lat * 10000) / 10000
        }
        if (reports.fieldReportArray[i].lng > east) {
          east = Math.round(reports.fieldReportArray[i].lng * 10000) / 10000
        }
        if (reports.fieldReportArray[i].lng > west) {
          west = Math.round(reports.fieldReportArray[i].lng * 10000) / 10000
        }
      }
    } else {
      // no field reports yet! Rely on broadening processing below
      north = SettingsService.Settings.defLat
      west = SettingsService.Settings.defLng
      south = SettingsService.Settings.defLat
      east = SettingsService.Settings.defLng
    }

    this.log.info(`recalcFieldBounds got E:${east} W:${west} N:${north} S:${south} `, "FieldReportService")
    if (east - west < 2 * this.boundsMargin) {
      east += this.boundsMargin
      west -= this.boundsMargin
      this.log.info(`recalcFieldBounds BROADENED to E:${east} W:${west} `, "FieldReportService")
    }
    if (north - south < 2 * this.boundsMargin) {
      north += this.boundsMargin
      south -= this.boundsMargin
      this.log.info(`recalcFieldBounds BROADENED to N:${north} S:${south} `, "FieldReportService")
    }

    reports.bounds = new LatLngBounds([south, west], [north, east]) //SW, NE
  }

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
    this.log.info(`Adding an additional ${num} FAKE field reports... with base of ${msSince1970}`, "FieldReportService")

    for (let i = 0; i < num; i++) {
      this.fieldReports.fieldReportArray.push({
        id: this.fieldReports.maxId++,
        callsign: rangers[Math.floor(Math.random() * rangers.length)].callsign,
        team: teams[Math.floor(Math.random() * teams.length)].name,
        address: (Math.floor(Math.random() * 10000)) + " SW " + streets[(Math.floor(Math.random() * streets.length))],
        lat: SettingsService.Settings.defLat + Math.floor(Math.random() * 100) / 50000 - .001,
        lng: SettingsService.Settings.defLng + (Math.floor(Math.random() * 100) / 50000) - .001,
        date: new Date(Math.floor(msSince1970 - (Math.random() * 10 * 60 * 60 * 1000))), // 0-10 hrs earlier
        status: this.fieldReports.fieldReportStatuses[Math.floor(Math.random() * this.fieldReports.fieldReportStatuses.length)].status,
        note: notes[Math.floor(Math.random() * notes.length)]
      })
    }
    this.recalcFieldBounds(this.fieldReports)
  }

  // ---------------------------------  UNUSED -------------------------------------------------------

  /**
   * Register new field reports here, it will update bounds and other metadata, and notify observers
   * @param newReports
   */
  private setFieldReports(newReports: FieldReportType[]) {
    this.fieldReports.fieldReportArray = newReports
    this.recalcFieldBounds(this.fieldReports)
    this.updateFieldReports()
  }

  private allFieldReportsToServer_unused() {
    this.log.verbose("Sending all reports to server (via subscription)...", "FieldReportService")

    // https://appdividend.com/2019/06/04/angular-8-tutorial-with-example-learn-angular-8-crud-from-scratch/

    // TODO: replace "add" with"post" or ???
    this.httpClient.post(`${this.serverUri}/add`, this.fieldReports.fieldReportArray)
      .subscribe(res => this.log.verbose('Subscription of all reports to httpClient is Done', "FieldReportService"))

    this.log.verbose("Sent all reports to server (via subscription)...", "FieldReportService");
  }

  // TODO: verify new report is proper shape/validated here or by caller??? Send as string or object?

  private getFieldReport(id: number) {
    const index = this.findIndex(id);
    return this.fieldReports.fieldReportArray[index];
  }

  updateFieldReport_unused(report: FieldReportType) {
    const index = this.findIndex(report.id)
    this.fieldReports.fieldReportArray[index] = report
    // TODO: recalc bounds
    this.updateFieldReports()
  }

  private deleteFieldReport(id: number) {
    const index = this.findIndex(id);
    this.fieldReports.fieldReportArray.splice(index, 1);
    // TODO: recalc bounds
    this.updateFieldReports();
    // this.nextId-- // REVIEW: is this desired???
  }

  private findIndex(id: number): number {
    for (let i = 0; i < this.fieldReports.fieldReportArray.length; i++) {
      if (this.fieldReports.fieldReportArray[i].id === id) {
        return i
      }
    }
    throw new Error(`FieldReport with id ${id} was not found!`)
    // return -1
  }

  private sortFieldReportsByCallsign_unused() {
    return this.fieldReports.fieldReportArray.sort((n1, n2) => {
      if (n1.callsign > n2.callsign) { return 1 }
      if (n1.callsign < n2.callsign) { return -1 }
      return 0;
    })

    // let sorted = this.fieldReports.sort((a, b) => a.callsign > b.callsign ? 1 : -1)
    // this.log.verbose("SortFieldReportsByCallsign...DONE --- BUT ARE THEY REVERSED?!", "FieldReportService")
  }

  private sortFieldReportsByDate_unused() {
    return this.fieldReports.fieldReportArray.sort((n1, n2) => {
      if (n1.date > n2.date) { return 1 }
      if (n1.date < n2.date) { return -1 }
      return 0;
    })
  }

  private sortFieldReportsByTeam_unused() {
    return this.fieldReports.fieldReportArray.sort((n1, n2) => {
      if (n1.team > n2.team) { return 1 }
      if (n1.team < n2.team) { return -1 }
      return 0;
    })
  }

  private filterFieldReportsByDate_unused(beg: Date, end: Date) { // Date(0) = January 1, 1970, 00:00:00 Universal Time (UTC)
    const minDate = new Date(0)
    const maxDate = new Date(2999, 0)
    beg = beg < minDate ? beg : minDate
    end = (end < maxDate) ? end : maxDate

    return this.fieldReports.fieldReportArray.filter((report) => (report.date >= beg && report.date <= end))
  }
}
