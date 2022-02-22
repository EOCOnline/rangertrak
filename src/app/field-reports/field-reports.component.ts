import { Component, Inject, Pipe, PipeTransform, OnInit } from '@angular/core';
import { DOCUMENT, formatDate } from '@angular/common'
import { FormBuilder, FormGroup } from '@angular/forms';

import { FieldReportService, FieldReportType, FieldReportStatusType, RangerService, SettingsService, TeamService } from '../shared/services';

@Pipe({ name: 'myUnusedPipe' })
export class myUnusedPipe implements PipeTransform {
  transform(val: string) {
    return val.toUpperCase()
  }
}

// TODO: https://blog.ag-grid.com/refresh-grid-after-data-change/
// https://stackblitz.com/edit/ag-grid-angular-hello-world-n3aceq?file=src%2Fapp%2Fapp.component.ts
// https://www.ag-grid.com/javascript-data-grid/immutable-data/
//
/*
onGridReady(params) {
    this.gridApi = params.api;
    this.gridColumnApi = params.columnApi;

    this.http
      .get(
        "https://raw.githubusercontent.com/ag-grid/ag-grid/master/grid-packages/ag-grid-docs/src/olympicWinnersSmall.json"
      )
      .subscribe((data: any[]) => {
        data.length = 10;
        data = data.map((row, index) => {
          return { ...row, id: index + 1 };
        });
        this.backupRowData = data;
        this.rowData = data;
      });
  }
*/

@Component({
  selector: 'rangertrak-field-reports',
  templateUrl: './field-reports.component.html',
  styleUrls: ['./field-reports.component.scss']
})
export class FieldReportsComponent implements OnInit {

  fieldReports: FieldReportType[] = []
  fieldReportStatuses: FieldReportStatusType[] = []
  private settings

  private gridApi: any
  private gridColumnApi
  now: Date
  http: any
  numSeperatorWarnings = 0
  maxSeperatorWarnings = 3
  numFakesForm!: FormGroup
  nFakes = 10

  // https://www.ag-grid.com/angular-data-grid/grid-interface/#grid-options-1
  // https://blog.ag-grid.com/how-to-get-the-data-of-selected-rows-in-ag-grid/
  gridOptions = {
    // PROPERTIES
    rowSelection: "multiple",
    // pagination: true,

    // EVENT handlers
    // onRowClicked: event => console.log('A row was clicked'),

    // CALLBACKS
    // getRowHeight: (params) => 25
  }

  defaultColDef = {
    flex: 1, //https://ag-grid.com/angular-data-grid/column-sizing/#column-flex
    minWidth: 80,
    editable: true,
    //singleClickEdit: true,
    resizable: true,
    sortable: true,
    filter: true,
    floatingFilter: true
  }

  constructor(
    private formBuilder: FormBuilder,
    private fieldReportService: FieldReportService,
    private teamService: TeamService,
    private rangerService: RangerService,
    private settingsService: SettingsService,
    @Inject(DOCUMENT) private document: Document
  ) {
    this.now = new Date()
    this.gridApi = ""
    this.gridColumnApi = ""

    this.settings = SettingsService
    this.fieldReportStatuses = settingsService.getFieldReportStatuses() // TODO: Only obtained at construction, won't reflect an update from the settings page??? : SUBSCRIBE!!
  }


  myDateGetter = (params: { data: FieldReportType }) => {
    const weekday = ["Sun ", "Mon ", "Tue ", "Wed ", "Thu ", "Fri ", "Sat "]
    let dt = 'unknown date'
    let d: Date = params.data.date
    //console.log(`Day is: ${d.toISOString()}`)
    //console.log(`WeekDay is: ${d.getDay}`)

    try {  // TODO: Use the date pipe instead?
      //weekday[d.getDay()] +
      dt = formatDate(d, 'M-dd HH:MM:ss', 'en-US')
      //console.log(`Day is: ${params.data.date.toISOString()}`)
    } catch (error: any) {
      dt = `Bad date format: Error name: ${error.name}; msg: ${error.message}`
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

  myMinuteGetter = (params: { data: FieldReportType }) => {
    // performance.now() is better - for elapsed time...
    //let pi: number = 3.14159265359
    let dt = new Date(params.data.date).getTime()
    let milliseconds = Date.now() - dt
    let seconds: string = (Math.round(milliseconds / 1000) % 60).toString().padStart(2, '0')
    let minutes: string = Math.round((milliseconds / (1000 * 60)) % 60).toString().padStart(2, '0')
    let hours = Math.round((milliseconds / (1000 * 60 * 60)) % 24);
    return (`${hours}:${minutes}:${seconds}`)
  }

  rounder = (params: { data: FieldReportType }) => {
    let val = Math.round(params.data.lat * 10000) / 10000.0
    //console.warn (`${params.data.lat} got rounded to ${val}`)
    return val
  }

  columnDefs = [
    { headerName: "ID", field: "id", headerTooltip: 'Is this even needed?!', width: 3, flex: 1 }, // TODO:
    { headerName: "CallSign", field: "callsign", tooltipField: "team", flex: 2 },
    // { headerName: "Team", field: "team" },
    { headerName: "Address", field: "address", singleClickEdit: true, flex: 30 }, //, maxWidth: 200
    {
      headerName: "Lat", field: "lat", singleClickEdit: true, cellClass: 'number-cell', flex: 1,
      valueGetter: (params: { data: FieldReportType }) => { return Math.round(params.data.lat * 10000) / 10000.0 }
    },
    {
      headerName: "Lng", field: "lng", singleClickEdit: true, cellClass: 'number-cell', flex: 1,
      valueGetter: (params: { data: FieldReportType }) => { return Math.round(params.data.lng * 10000) / 10000.0 },
    },
    { headerName: "Time", headerTooltip: 'Report date', valueGetter: this.myDateGetter, flex: 2 },
    { headerName: "Elapsed", headerTooltip: 'Hrs:Min:Sec since report', valueGetter: this.myMinuteGetter, flex: 2 },
    {
      headerName: "Status", field: "status", flex: 5,
      cellStyle: (params: { value: string; }) => {
        //this.fieldReportStatuses.forEach(function(value) { (params.value === value.status) ? { backgroundColor: value.color }  : return(null) }
        for (let i = 0; i < this.fieldReportStatuses.length; i++) {
          if (params.value === this.fieldReportStatuses[i].status) {
            return { backgroundColor: this.fieldReportStatuses[i].color }
          }
        }
        return null
      }
      //cellClassRules: this.cellClassRules() }, //, maxWidth: 150
    },
    { headerName: "Note", field: "note", flex: 50 }, //, maxWidth: 300
  ];

  //https://blog.ag-grid.com/conditional-formatting-for-cells-in-ag-grid/
  /* cellClassRules = (params: { data: FieldReportType }) => {
    if (params.data.status == 'Urgent') {
      return "cell-pass" // see stylesheet for this
    }
    if (params.data.status == 'Check-in') {
      return "cell-pass" // see stylesheet for this
    }
    return(``)
  }
*/

  ngOnInit(): void {
    console.log("Field Report Form ========== ngInit ==== at ", Date.now)

    // TODO: This doesn't actually get the very latest field Report entries: do it by subuscription instead????
    this.fieldReports = this.fieldReportService.getFieldReports()
    console.log(`Now have ${this.fieldReports.length} Field Reports retrieved from Local Storage and/or fakes generated`)

    this.numFakesForm = this.formBuilder.group({})

    if (!this.settings.debugMode) {
      console.log("running in non-debug mode")
      // this.displayHide("enter__Fake--id") // debug mode SHOULD be ON...
    } else {
      console.log("running in debug mode")
      this.displayShow("enter__Fake--id")
    }

    if (this.gridApi) {
      this.gridApi.refreshCells()
    } else {
      console.log("no this.gridApi yet in ngOnInit()")
    }
  }

  reloadPage() {
    window.location.reload()
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
    console.log("Field Report Form onGridReady")

    this.gridApi = params.api
    this.gridColumnApi = params.columnApi

    params.api.sizeColumnsToFit() //https://ag-grid.com/angular-data-grid/column-sizing/#example-default-resizing // TODO: use this line, or next routine?!
  }

  //onFirstDataRendered(params: any) {
  refreshGrid() {
    //if (this.gridApi) {
    this.gridApi.refreshCells()
    this.gridApi.sizeColumnsToFit();
    //} else {
    //console.log("no this.gridApi yet in refreshGrid()")
    //}
  }

  onBtnSetSelectedRowData() {
    let selectedNodes = this.gridApi.getSelectedNodes();
    let selectedData = selectedNodes.map((node: { data: FieldReportType; }) => node.data);
    // console.log(`onBtnGetSelectedRowData obtained ${selectedNodes.length} selected rows:\n${JSON.stringify(selectedData)}`);
    this.fieldReportService.setSelectedFieldReports(selectedData)
  }


  // following from https://ag-grid.com/javascript-data-grid/csv-export/
  getValue(inputSelector: string) {
    //let selector = this.document.querySelector(inputSelector) as HTMLSelectElement
    let selector = this.document.getElementById('columnSeparator') as HTMLSelectElement
    var sel = selector.selectedIndex;
    var opt = selector.options[sel];
    var selVal = (<HTMLOptionElement>opt).value;
    var selText = (<HTMLOptionElement>opt).text
    // console.log(`Got column seperator text:"${selText}", val:"${selVal}"`)

    switch (selVal) {
      case 'none':
        return;
      case 'tab':
        return '\t';
      default:
        return selVal;
    }
  }

  getParams() {
    let dt = new Date()
    return {
      columnSeparator: this.getValue('columnSeparator'),
      fileName: `FieldReportsExport.${dt.getFullYear()}-${dt.getMonth() + 1}-${dt.getDate()}_${dt.getHours()}:${dt.getMinutes()}.csv`,
    }
  }

  onSeperatorChange() {
    var params = this.getParams();
    if (params.columnSeparator && this.numSeperatorWarnings++ < this.maxSeperatorWarnings) {
      alert(`NOTE: Excel handles comma separators best. You've chosen "${params.columnSeparator}"`)
    }
  }

  onBtnExport() {
    var params = this.getParams();
    //console.log(`Got column seperator value "${params.columnSeparator}"`)
    //console.log(`Got filename of "${params.fileName}"`)
    //if (params.columnSeparator) {
    //  alert(`NOTE: Excel handles comma separators best. You've chosen "${params.columnSeparator}" Good luck!`);
    //}
    this.gridApi.exportDataAsCsv(params);
  }

  onBtnClearFieldReports() {
    this.fieldReportService.deleteAllFieldReports()
    this.reloadPage()
  }

  // Save them to localstorage & update subscribers
  onBtnUpdateFieldReports() {
    this.fieldReportService.UpdateFieldReports()
  }

  onBtnImportFieldReports_unused() {
    alert(`onBtnImportFieldReports is unimplemented`)
  }

  generateFakeFieldReports(num = this.nFakes) {
    // TODO: compare current with
    // https://github.com/material-components/material-components-web/tree/master/packages/mdc-slider#discrete-slider
    // https://material-components.github.io/material-components-web-catalog/#/component/slider
    this.fieldReportService.generateFakeData(num)
    console.log(`Generated ${num} FAKE Field Reports`)
    this.fieldReportService.UpdateFieldReports()
    this.fieldReports = this.fieldReportService.getFieldReports()
    this.refreshGrid()
    this.reloadPage() //TODO: why aren't above enough?!!!
  }

  displayHide(htmlElementID: string) {
    let e = this.document.getElementById(htmlElementID)
    if (e) {
      e.style.visibility = "hidden";
    } else {
      console.warn(`Could not hide HTML Element ${htmlElementID}`)
    }
  }

  displayShow(htmlElementID: string) {
    let e = this.document.getElementById(htmlElementID)
    if (e) {
      e.style.visibility = "visible";
    } else {
      console.warn(`Could not show HTML Element ${htmlElementID}`)
    }
  }
}
