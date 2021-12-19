import { Component, OnInit } from '@angular/core';
import { FieldReportService, FieldReportType, RangerService, FieldReportStatuses, TeamService } from '../shared/services';


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
  api
  columnApi

/* TODO: Put following into tooltip, instead of just TEAM:
      <mat-option *ngFor="let callsigns of filteredCallsigns | async" [value]="callsigns.callsign">
          <img class="example-option-img" aria-hidden [src]="callsigns.image" height="40">
          <span>{{callsigns.callsign}}</span> |
          <small> {{callsigns.name}} | {{callsigns.phone}}</small>
        </mat-option>
        */

// https://www.ag-grid.com/angular-data-grid/grid-interface/#grid-options-1
   gridOptions = {
    rowSelection:"multiple",
    //onGridReady: event => console.log('The grid is now ready')
  }
/* const gridOptions = {
  // PROPERTIES
  // Objects like myRowData and myColDefs would be created in your application
  rowData: fieldReports,
  columnDefs: myColDefs,
  pagination: true,

  // EVENTS
  // Add event handlers
  onRowClicked: event => console.log('A row was clicked'),
  onColumnResized: event => console.log('A column was resized'),
  onGridReady: event => console.log('The grid is now ready'),

  // CALLBACKS
  getRowHeight: (params) => 25
} */


  defaultColDef={
    flex: 1,
    maxWidth: 125,
    editable: true,
    resizable: true,
    sortable: true,
    filter: true}

  columnDefs = [
    { headerName: "CallSign", field: "who.callsign", tooltipField:"who.team" },
    { headerName: "Team", field: "who.team" },
    { headerName: "Address", field: "where.address", singleClickEdit: true, maxWidth: 200},
    { headerName: "Lat", field: "where.lat", singleClickEdit: true },
    { headerName: "Long", field: "where.long" },
    { headerName: "Time", field: "when" },  // TODO: Change to string representation - within Ag-grid???
    { headerName: "Status", field: "what.status", maxWidth: 150 },
    { headerName: "Note", field: "what.note", maxWidth: 300 },
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
    this.api = ""
    this.columnApi = ""
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

  onGridReady = (params: any) => {
    this.api = params.api;
    this.columnApi = params.columnApi;
}
// once the above is done, you can: <button (click)="myGrid.api.deselectAll()">Clear Selection</button>

  //onGridReady(_$event) {}
}
