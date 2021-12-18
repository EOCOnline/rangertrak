import { Component, OnInit } from '@angular/core';
import { AgGridModule } from 'ag-grid-angular';
import { EntryComponent } from '../entry/entry.component';
import { FieldReportService, FieldReportType, RangerService, Statuses, TeamService } from '../shared/services/';


type FieldReportType1 = {
  who: { callsign: String, team: String },
  where: { address: String, lat: Number, long: Number },
  when: Date,
  what: { status: String, notes: String }
}
@Component({
  selector: 'rangertrak-field-reports',
  templateUrl: './field-reports.component.html',
  styleUrls: ['./field-reports.component.scss']
})
export class FieldReportsComponent implements OnInit {

  fieldReportService
  teamService
  rangerService
  fieldReports: FieldReportType[] = []
  //columns = { "Callsign": String, "Team": String, "Address": String, "Lat": String, "Long": String, "Date": Date.toString, "Status": String, "Notes": String }
  columnDefs = [
    { field: "who.callsign" },
    { field: "who.team" },
    { field: "where.address" },
    { field: "where.lat" },
    { field: "where.long" },
    { field: "when" },  // TODO: Change to string representation - within Ag-grid???
    { field: "what.status" },
    { field: "what.note" },
  ];
  now: Date

  constructor(
    fieldReportService: FieldReportService,
    teamService: TeamService,
    rangerService: RangerService,
  ) {
    this.fieldReportService = fieldReportService
    this.teamService = teamService
    this.rangerService = rangerService

    this.now = new Date()


  }

  ngOnInit(): void {
    console.log("Field Report Form started at ", Date())
    //this.fieldReports = this.fieldReportService.getFieldReports()  // BUG: zeros out the array!!!!

    this.fieldReports = [
      {
        who: { callsign: "KE7KDQ", team: "T1" },
        where: { address: "10506 sw 132nd pl", lat: 45.1, long: -123.1 },
        when: { date: this.now },
        what: { status: "Normal", note: "Reports beautiful sunrise" }
      },
      {
        who: { callsign: "KE7ABC", team: "T2" },
        where: { address: "10506 sw 132nd pl", lat: 45.1, long: -123.1 },
        when: { date: this.now },
        what: { status: "Needs Rest", note: "Reports beautiful sunrise" }
      },
      {
        who: { callsign: "KE7999", team: "T3" },
        where: { address: "6 sw 1st St", lat: 45.1, long: -123.1 },
        when: { date: this.now },
        what: { status: "Urgent", note: "Reports beautiful sunrise" }
      }
    ]
    this.fieldReportService.generateFakeData(this.fieldReports)
    console.log("got " + this.fieldReports.length + " Field Reports")
    console.log("Field Report Form completed at ", Date())
  }

  // FUTURE:
  exportDataAsCsv() {
  }

  // FUTURE:
  setQuickFilter() {
  }


  //onGridReady(_$event) {}
}
