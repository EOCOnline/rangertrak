import { Component, Inject, Pipe, PipeTransform, OnInit } from '@angular/core';
import { FieldReportService, FieldReportType, RangerService, SettingsService, TeamService } from '../shared/services';

import { DOCUMENT, formatDate } from '@angular/common'
import { FormBuilder, FormGroup } from '@angular/forms';
import { FieldReportStatuses } from '../shared/services/field-report.service';

@Pipe({ name: 'myUnusedPipe'})
export class myUnusedPipe implements PipeTransform{
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
  private gridApi: any
  private gridColumnApi
  private settings
  now: Date
  http: any
  numSeperatorWarnings = 0
  maxSeperatorWarnings = 3
  numFakesForm!: FormGroup
  nFakes = 10

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
      dt = formatDate(d, 'M-dd HH:MM:ss', 'en-US')
      //console.log(`Day is: ${params.data.date.toISOString()}`)
    } catch (error:any) {
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
    let seconds:string = (Math.round(milliseconds / 1000) % 60).toString().padStart(2 , '0')
    let minutes:string = Math.round((milliseconds / (1000*60)) % 60).toString().padStart(2 , '0')
    let hours = Math.round((milliseconds / (1000*60*60)) % 24);
    return (`${hours}:${minutes}:${seconds}`)
  }

  columnDefs = [
    { headerName: "ID", field: "id", headerTooltip: 'Is this even needed?!'},
    { headerName: "CallSign", field: "callsign", tooltipField: "team" },
    // { headerName: "Team", field: "team" },
    { headerName: "Address", field: "address", singleClickEdit: true, flex: 50 }, //, maxWidth: 200
    { headerName: "Lat", field: "lat", singleClickEdit: true },
    { headerName: "Long", field: "long", cellClass: 'number-cell' },
    {
      headerName: "Time", headerTooltip: 'Report date',
      valueGetter: this.myDateGetter,
    },
    {
      headerName: "Elapsed", headerTooltip: 'Hrs:Min:Sec since report',
      valueGetter: this.myMinuteGetter,
    },
    { headerName: "Status", field: "status", flex: 50,
    cellStyle: (params: { value: string; }) => {
      if (params.value === FieldReportStatuses[3]) {
          return {backgroundColor: 'lightcoral'};
      }
      if (params.value === FieldReportStatuses[6]) {
        return {backgroundColor: 'lavender'};
      }
      if (params.value === FieldReportStatuses[5]) {
        return {backgroundColor: 'lightgrey'};
      }
      return null;
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

    this.settings = SettingsService.Settings
  }

  ngOnInit(): void {
    console.log("Field Report Form ngInit at ", Date.now)

    this.fieldReports = this.fieldReportService.getFieldReports()
    console.log(`Now have ${this.fieldReports.length} Field Reports retrieved from Local Storage and/or fakes generated`)

    this.numFakesForm = this.formBuilder.group({})

    if (!this.settings.debugMode) {
      this.displayHide("enter__Fake--id")
    }
    if (this.gridApi) {
    this.gridApi.refreshCells()
    }else {
      console.log("no this.gridApi yet in ngOnInit()")
    }
  }

  reloadPage() {
    window.location.reload
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

  onFirstDataRendered(params: any) {
    params.api.sizeColumnsToFit();
    if (this.gridApi) {
      this.gridApi.refreshCells()
      }else {
        console.log("no this.gridApi yet in onFirstDataRendered()")
      }
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
        fileName: `FieldReportsExport.${dt.getFullYear()}-${dt.getMonth()+1}-${dt.getDate()}_${dt.getHours()}:${dt.getMinutes()}.csv`,  // REVIEW: ONLY month is zero based, requires +1?!
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
    }
    onBtnUpdateFieldReports() {
      this.fieldReportService.UpdateFieldReports()
    }

    onBtnImportFieldReports() {
      alert(`onBtnImportFieldReports is unimplemented`)
    }

    generateFakeFieldReports(num = this.nFakes) {
      this.fieldReportService.generateFakeData(num)
      console.log(`Generated ${num} FAKE Field Reports`)
      //window.location.reload() //TODO: OK?!
    }

    displayHide(htmlElementID: string) {
      let e = this.document.getElementById(htmlElementID)
      if (e) {
        e.style.visibility = "hidden";
      }
    }

    displayShow(htmlElementID: string) {
      let e = this.document.getElementById(htmlElementID)
      if (e) {
        e.style.visibility = "visible";
      }
    }
}
function floor(arg0: number) {
  throw new Error('Function not implemented.');
}

