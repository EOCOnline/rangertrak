import { Injectable, OnInit } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, mergeMap, toArray } from 'rxjs/operators';
import { LocalStorage, StorageMap, JSONSchema } from '@ngx-pwa/local-storage';
//import { debug } from 'console';
//import { stringify } from 'querystring';

export enum FieldReportSource {
  Voice,
  Packet,
  APRS,
  Email
}

export type FieldReportType = {
  who: { callsign: String, team: String },
  where: { address: String, lat: Number, long: Number },
  when: Date,
  what: { status: String, notes: String }
}

@Injectable({ providedIn: 'root' })
export class FieldReportService {

  private fieldReports: FieldReportType[] = []

  constructor() { }

  pushFieldReport(formData: string) {
    console.log('FieldReportService: Got new field report: ')
    console.log(formData)

    //{callsign: 'ae7rw', team: 'T3', whereFormModel: {…}, whenFormModel: {…}, whatFormModel: {…}}
    let newReport: FieldReportType = JSON.parse(formData)
    // TODO: verify new report is proper shape/validated...
    this.fieldReports.push(newReport)
    //debug()
  }

  getFieldReports() {
    return this.fieldReports
  }

  sortFieldReportsByCallsign() {
    let sortedFieldReports: FieldReportType[] = this.fieldReports.sort() // use default lexicographical sort - of 1st field

  }

  sortFieldReportsByDate() {
    let sortedFieldReports: FieldReportType[] = this.fieldReports.sort((n1, n2) => {
      if (n1.when > n2.when) {
        return 1;
      }
      if (n1.when < n2.when) {
        return -1;
      }
      return 0;
    })
    return sortedFieldReports
  }

  sortFieldReportsByTeam() {
    let sortedFieldReports: FieldReportType[] = this.fieldReports.sort((n1, n2) => {
      if (n1.who.team > n2.who.team) {
        return 1;
      }
      if (n1.who.team < n2.who.team) {
        return -1;
      }
      return 0;
    })
    return sortedFieldReports
  }

  // Save to disk or ...
  serialize(name: string) {
    ;
  }

  load(name: string) {
    ;
  }

}

@Injectable({ providedIn: 'root' })
export class FieldReport {

}
