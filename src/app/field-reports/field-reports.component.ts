import { Component, OnInit } from '@angular/core';
import { FieldReportService, FieldReportStatuses, FieldReportType, RangerService, TeamService } from '../shared/services';

import { HttpClient } from '@angular/common/http';
import { formatDate } from '@angular/common'

//import { validate } from 'class-validator';

@Component({
  selector: 'rangertrak-field-reports',
  templateUrl: './field-reports.component.html',
  styleUrls: ['./field-reports.component.scss']
})
export class FieldReportsComponent implements OnInit {

  //private fieldReportService
  //private teamService
  //private rangerService
  fieldReports: FieldReportType[] = []
  private gridApi
  private gridColumnApi

  // https://www.ag-grid.com/angular-data-grid/grid-interface/#grid-options-1
  gridOptions = {
    rowSelection: "multiple",
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

  /* TODO: Put following into tooltip, instead of just TEAM:
        <mat-option *ngFor="let callsigns of filteredCallsigns | async" [value]="callsigns.callsign">
            <img class="example-option-img" aria-hidden [src]="callsigns.image" height="40">
            <span>{{callsigns.callsign}}</span> |
            <small> {{callsigns.name}} | {{callsigns.phone}}</small>
          </mat-option>
          */

  isValidDate(d: any) {

    return d instanceof Date //&& !isNaN(d);

    if (Object.prototype.toString.call(d) !== "[object Date]") {
      console.log (`bad date type:${Object.prototype.toString.call(d)}`)
      return false } // invalid date
    if (isNaN(d.getTime())) {
      console.log (`bad time`)
      return false } // d.valueOf() could also work  // invalid time
    return true  // valid date
  }

  myDateGetter = (params: { data: FieldReportType }) => {
    const weekday = ["Sun ", "Mon ", "Tue ", "Wed ", "Thu ", "Fri ", "Sat "]
    let dt = 'unknown date'

    let d:Date = params.data.date
    //console.log(`Day is: ${params.data.date.toISOString()}`)

    if (this.isValidDate(d)) {
      dt = weekday[d.getDay()] + formatDate(d, 'yyyy-MM-dd HH:MM:ss', 'en-US')
      console.log(`Day is: ${params.data.date.toISOString()}`)
    }

    return dt
  }

  defaultColDef = {
    flex: 1, //https://ag-grid.com/angular-data-grid/column-sizing/#column-flex
    minWidth: 100,
    editable: true,
    resizable: true,
    sortable: true,
    filter: true,
    floatingFilter: true
  }

  columnDefs = [
    { headerName: "ID", field: "id" },
    { headerName: "CallSign", field: "callsign", tooltipField: "team" },
    { headerName: "Team", field: "team" },
    { headerName: "Address", field: "address", singleClickEdit: true, flex: 50 }, //, maxWidth: 200
    { headerName: "Lat", field: "lat", singleClickEdit: true },
    { headerName: "Long", field: "long", cellClass: 'number-cell' },
    {
      headerName: "Time", //field: "date",
      valueGetter: this.myDateGetter,
    },
    { headerName: "Status", field: "status", flex: 50 }, //, maxWidth: 150
    { headerName: "Note", field: "note", flex: 50 }, //, maxWidth: 300
  ];
  now: Date
  http: any;

  constructor(
    private fieldReportService: FieldReportService,
    private teamService: TeamService,
    private rangerService: RangerService,
  ) {
    //this.fieldReportService = fieldReportService
    //this.teamService = teamService
    //this.rangerService = rangerService
    this.now = new Date()
    this.gridApi = ""
    this.gridColumnApi = ""
  }

  ngOnInit(): void {
    console.log("Field Report Form started at ", Date())
    //this.fieldReports = this.fieldReportService.getFieldReports()  // NOTE: zeros out the array!!!!

    this.fieldReports = this.fieldReportService.getFieldReports()
    /*  { who: { callsign: "KE7KDQ", team: "T1" },
          where: { address: "10506 sw 132nd pl", lat: 45.1, long: -123.1 },
          when: { date: this.now },
          what: { status: "Normal", note: "Reports beautiful sunrise" } }
      */
    //this.fieldReportService.generateFakeData(30) do in entry form instead
    console.log("got " + this.fieldReports.length + " Field Reports")
    console.log("Field Report Form completed at ", Date())
  }

  // FUTURE:
  exportDataAsCsv() {
  }

  // FUTURE:
  // filteredReports:FieldReportType[] = this.fieldReportService.filterFieldReportsByDate(Date(-12*60*60*1000), Date(5*60*1000))

  onGridReady = (params: any) => {
    this.gridApi = params.api
    this.gridColumnApi = params.columnApi

    params.api.sizeColumnsToFit() //https://ag-grid.com/angular-data-grid/column-sizing/#example-default-resizing
  }

  onFirstDataRendered(params: any) {
    params.api.sizeColumnsToFit();
  }
}


