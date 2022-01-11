import { Component, Inject, OnInit } from '@angular/core';
import { FieldReportService, FieldReportType, RangerService, TeamService } from '../shared/services';
import { DOCUMENT } from '@angular/common'
import { formatDate } from '@angular/common'

@Component({
  selector: 'rangertrak-field-reports',
  templateUrl: './field-reports.component.html',
  styleUrls: ['./field-reports.component.scss']
})
export class FieldReportsComponent implements OnInit {

  fieldReports: FieldReportType[] = []
  private gridApi: any
  private gridColumnApi
  now: Date
  http: any

  // https://www.ag-grid.com/angular-data-grid/grid-interface/#grid-options-1
  gridOptions = {
    // PROPERTIES
    rowSelection: "multiple",
    // pagination: true,

    // EVENT handlers
    // onRowClicked: event => console.log('A row was clicked'),

    // CALLBACKS
    // getRowHeight: (params) => 25
  }

  gridOptions2 = {
    defaultColDef: {
      editable: true,
      resizable: true,
      minWidth: 100,
      flex: 1,
    },

    suppressExcelExport: true,
    popupParent: this.document.body,

    columnDefs: [{ field: 'make' }, { field: 'model' }, { field: 'price' }],

    rowData: [
      { make: 'Toyota', model: 'Celica', price: 35000 },
      { make: 'Ford', model: 'Mondeo', price: 32000 },
      { make: 'Porsche', model: 'Boxter', price: 72000 },
    ],
  };

  defaultColDef = {
    flex: 1, //https://ag-grid.com/angular-data-grid/column-sizing/#column-flex
    minWidth: 100,
    editable: true,
    resizable: true,
    sortable: true,
    filter: true,
    floatingFilter: true
  }

  myDateGetter = (params: { data: FieldReportType }) => {
    const weekday = ["Sun ", "Mon ", "Tue ", "Wed ", "Thu ", "Fri ", "Sat "]
    let dt = 'unknown date'
    let d: Date = params.data.date
    //console.log(`Day is: ${d.toISOString()}`)
    //console.log(`WeekDay is: ${d.getDay}`)

    try {
      //weekday[d.getDay()] +
      dt = formatDate(d, 'yyyy-MM-dd HH:MM:ss', 'en-US')
      //console.log(`Day is: ${params.data.date.toISOString()}`)
    } catch (error) {
      dt = `Bad date format: ${error}`
    }

    // https://www.w3schools.com/jsref/jsref_obj_date.asp
    //console.log(`Day is: ${params.data.date.toISOString()}`)
    /*
        if (this.isValidDate(d)) {
          dt = weekday[d.getDay()] + formatDate(d, 'yyyy-MM-dd HH:MM:ss', 'en-US')
          console.log(`Day is: ${params.data.date.toISOString()}`)
        }
    */
    return dt
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


  constructor(
    private fieldReportService: FieldReportService,
    private teamService: TeamService,
    private rangerService: RangerService,
    @Inject(DOCUMENT) private document: Document
  ) {
    this.now = new Date()
    this.gridApi = ""
    this.gridColumnApi = ""
  }

  ngOnInit(): void {
    console.log("Field Report Form started at ", Date())
    //this.fieldReports = this.fieldReportService.getFieldReports()  // NOTE: zeros out the array!!!!

    this.fieldReports = this.fieldReportService.getFieldReports()
    console.log(`Retrieved ${this.fieldReports.length} Field Reports (from Local Storage)`)
  }

  isValidDate(d: any) {
    return d instanceof Date //&& !isNaN(d);
    /*
        if (Object.prototype.toString.call(d) !== "[object Date]") {
          console.log(`bad date type:${Object.prototype.toString.call(d)}`)
          return false
        } // invalid date
        if (isNaN(d.getTime())) {
          console.log(`bad time`)
          return false
        } // d.valueOf() could also work  // invalid time
        return true  // valid date
        */
  }

  // filteredReports:FieldReportType[] = this.fieldReportService.filterFieldReportsByDate(Date(-12*60*60*1000), Date(5*60*1000)) //FUTURE:

  onGridReady = (params: any) => {
    this.gridApi = params.api
    this.gridColumnApi = params.columnApi

    params.api.sizeColumnsToFit() //https://ag-grid.com/angular-data-grid/column-sizing/#example-default-resizing // TODO: use this line, or next routine?!
  }

  onFirstDataRendered(params: any) {
    params.api.sizeColumnsToFit();
  }

  // following from https://ag-grid.com/javascript-data-grid/csv-export/
  //exportDataAsCsv() {  }

  getValue(inputSelector: string) {
    //let selector = this.document.querySelector(inputSelector)
    let selector = this.document.getElementById(inputSelector)
    if ( selector == null) //inputSelector == null ||
      {return}
    var text = selector.innerHTML
    console.log(`Got column seperator value "${text}"`)
    switch (text) {
      case 'none':
        return;
      case 'tab':
        return '\t';
      default:
        return text;
    }
  }

  getParams() {
    return {
      columnSeparator: this.getValue('#columnSeparator'),
    };
  }

  onBtnExport() {
    var params = this.getParams();
    if (params.columnSeparator) {
      alert(
        'NOTE: you are downloading a file with non-standard separators - it may not render correctly in Excel.'
      );
    }
    // this.gridOptions.gridApi.exportDataAsCsv(params)
    this.gridApi.exportDataAsCsv(params);
  }
}
