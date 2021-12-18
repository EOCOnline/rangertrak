import { Component, OnInit } from '@angular/core';
import { AgGridModule } from 'ag-grid-angular';
import { FieldReportService, FieldReportType } from '../shared/services/';


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
  fieldReports: FieldReportType[] = []
  columns = { "Callsign": String, "Team": String, "Address": String, "Lat": String, "Long": String, "Date": String, "Status": String, "Notes": String }
  columnDefs = [{ field: "when" }, { field: "callsign" }, { field: "team" } ];


  constructor(fieldReportService: FieldReportService) {
    this.fieldReportService = fieldReportService
  }

  ngOnInit(): void {
    console.log("Field Report Form started at ", Date())
    this.fieldReports = this.fieldReportService.getFieldReports()
    console.log("got {%numReports} Field Reports", this.fieldReports.length)
    console.log("Field Report Form completed at ", Date())
  }

  //onGridReady(_$event) {}
}
