import { Component, OnInit } from '@angular/core';
import { FieldReportService, FieldReportStatuses, FieldReportType, RangerService, TeamService } from '../shared/services';

import { HttpClient } from '@angular/common/http';
import { formatDate } from '@angular/common'

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

  myDateGetter = (params: { data: FieldReportType }) => {
    const weekday = ["Sun ","Mon ","Tue ","Wed ","Thu ","Fri ","Sat "];

    //https://www.w3schools.com/jsref/jsref_obj_date.asp
    let dt = weekday[params.data.date.getDay()] + formatDate(params.data.date, 'yyyy-MM-dd HH:MM:ss', 'en-US')
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
    { headerName: "CallSign", field: "who.callsign", tooltipField: "who.team" },
    { headerName: "Team", field: "who.team" },
    { headerName: "Address", field: "where.address", singleClickEdit: true, flex: 50 }, //, maxWidth: 200
    { headerName: "Lat", field: "where.lat", singleClickEdit: true },
    { headerName: "Long", field: "where.long", cellClass: 'number-cell' },
    {
      headerName: "Time", //field: "when",
      valueGetter: this.myDateGetter,
    },
    { headerName: "Status", field: "what.status", flex: 50 }, //, maxWidth: 150
    { headerName: "Note", field: "what.note", flex: 50 }, //, maxWidth: 300
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
    this.fieldReportService.generateFakeData(30)
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


