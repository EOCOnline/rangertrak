import { GridOptions, SelectionChangedEvent } from 'ag-grid-community'
// , TeamService
import { Observable, subscribeOn, Subscription } from 'rxjs'

import { DOCUMENT, formatDate } from '@angular/common'
import { AfterViewInit, Component, Inject, OnDestroy, OnInit, Pipe, PipeTransform, ElementRef } from '@angular/core';

import { UntypedFormBuilder, UntypedFormGroup } from '@angular/forms'

import { Utility } from '../shared'
import {
  FieldReportService, FieldReportStatusType, FieldReportsType, FieldReportType, LogService,
  RangerService, SettingsService, SettingsType
} from '../shared/services'

@Pipe({ name: 'myUnusedPipe' })
export class myUnusedPipe implements PipeTransform {
  transform(val: string) {
    return val.toUpperCase()
  }
}


@Component({
  selector: 'rangertrak-field-reports',
  templateUrl: './field-reports.component.html',
  styleUrls: ['./field-reports.component.scss']
})
export class FieldReportsComponent implements OnInit, OnDestroy {

  private id = 'Field Report'
  title = 'Field Reports'
  pageDescr = `Grid display of reported ranger positions and status throughout a mission`

  private fieldReportsSubscription!: Subscription
  private fieldReportStatuses: FieldReportStatusType[] = []
  // fieldReportStatuses!: Observable<FieldReportStatusType[]> //TODO:
  public fieldReportArray: FieldReportType[] = []
  private fieldReports: FieldReportsType | undefined

  private settingsSubscription!: Subscription
  private settings!: SettingsType

  public selectedRows = 0
  public columnDefs!: any
  private gridApi: any
  private gridColumnApi
  private now: Date
  private http: any
  private numSeperatorWarnings = 0
  private maxSeperatorWarnings = 3
  public numFakesForm!: UntypedFormGroup
  public nFakes = 10

  // https://www.ag-grid.com/angular-data-grid/grid-interface/#grid-options-1
  // https://blog.ag-grid.com/how-to-get-the-data-of-selected-rows-in-ag-grid/
  // NOT monitored for changes on the fly: https://stackoverflow.com/questions/52519129/ag-grid-and-angular-how-to-switch-grid-options-dynamically/52519796#52519796
  gridOptions: GridOptions = {
    // PROPERTIES
    rowSelection: "multiple",

    // https://www.ag-grid.com/javascript-data-grid/row-pagination/#pagination-properties
    pagination: true,
    paginationAutoPageSize: true, // if set overrides paginationPageSize & forces it back to this on changes...
    //paginationPageSize: 5,
    // suppressScrollOnNewData: true, // grid to NOT scroll to the top, on page changes

    // EVENT handlers
    // onRowClicked: event => this.log.verbose('A row was clicked'),
    onSelectionChanged: (event: SelectionChangedEvent) => this.onRowSelection(event),

    // CALLBACKS
    // getRowHeight: (params) => 25

    defaultColDef: {
      flex: 1, //https://ag-grid.com/angular-data-grid/column-sizing/#column-flex
      minWidth: 80,
      editable: true,
      //singleClickEdit: true,
      resizable: true,
      sortable: true,
      filter: true,
      floatingFilter: true
    },
    // set rowData to null or undefined to show loading panel by default
    rowData: null,
  }
  private backupRowData: any[] = []
  private rowData: any[] = []

  constructor(
    private formBuilder: UntypedFormBuilder,
    private fieldReportService: FieldReportService,
    private log: LogService,
    // private teamService: TeamService,
    // private rangerService: RangerService,
    private settingsService: SettingsService,
    @Inject(DOCUMENT) private document: Document
  ) {
    this.log.info(` Construction`, this.id)

    this.now = new Date()
    this.gridApi = ""
    this.gridColumnApi = ""
  }


  // Initialize data or fetch external data from services or API (https://geeksarray.com/blog/angular-component-lifecycle)
  ngOnInit(): void {

    this.log.verbose("ngInit", this.id)

    // https://angular.io/tutorial/toh-pt4#call-it-in-ngoninit states subscribes should happen in OnInit()
    this.settingsSubscription = this.settingsService.getSettingsObserver().subscribe({
      next: (newSettings) => {
        this.settings = newSettings
        this.log.excessive('Received new Settings via subscription.', this.id)
      },
      error: (e) => this.log.error('Settings Subscription got:' + e, this.id),
      complete: () => this.log.info('Settings Subscription complete', this.id)
    })

    if (this.settings) {
      this.fieldReportStatuses = this.settings.fieldReportStatuses
    } else {
      this.log.error(`this.settings was null in constructor`, this.id)
    }

    //? FUTURE: Consider replacing "Color" with "CSS_Style" to allow more options?
    //!Future: Hover over notes to show entire (multi-line) note
    this.columnDefs = [
      { headerName: "ID", field: "id", headerTooltip: 'Is this even needed?!', width: 3, flex: 1 }, // TODO:
      { headerName: "CallSign", field: "callsign", tooltipField: "team", width: 4, flex: 2 },
      // { headerName: "Team", field: "team" },
      { headerName: "Address", field: "address", singleClickEdit: true, width: 3, flex: 30 }, //, maxWidth: 200
      {
        headerName: "Lat", field: "lat", singleClickEdit: true, cellClass: 'number-cell',
        valueGetter: (params: { data: FieldReportType }) => { return Math.round(params.data.location.lat * 10000) / 10000.0 }
      },
      {
        headerName: "Lng", field: "lng", singleClickEdit: true, cellClass: 'number-cell', flex: 1,
        valueGetter: (params: { data: FieldReportType }) => { return Math.round(params.data.location.lng * 10000) / 10000.0 },
      },
      { headerName: "Reported", headerTooltip: 'Report date', valueGetter: this.myDateGetter, flex: 2 },
      { headerName: "Elapsed", headerTooltip: 'Hrs:Min:Sec since report', valueGetter: this.myMinuteGetter, flex: 2 },
      {
        headerName: "Status", field: "status", flex: 5, cellRenderer: this.statusCellRenderer,
        cellStyle: (params: { value: string; }) => {
          let stat = this.fieldReportStatuses.find(el => el.status == params.value)
          return { 'background-color': `${stat ? stat.color : '#A3A3A3'}` }
        }
        //cellClassRules: this.cellClassRules() }, //, maxWidth: 150
      },
      { headerName: "Notes", field: "notes", cellRenderer: this.notesCellRenderer, flex: 50 }, //, maxWidth: 300
    ];

    this.fieldReportsSubscription = this.fieldReportService.getFieldReportsObserver().subscribe({
      next: (newReport) => {
        console.log(newReport)
        this.gotNewFieldReports(newReport)
      },
      error: (e) => this.log.error('Field Reports Subscription got:' + e, this.id),
      complete: () => this.log.info('Field Reports Subscription complete', this.id)
    })

    this.numFakesForm = this.formBuilder.group({})

    if (this.settings ? !this.settings.debugMode : true) {
      this.log.verbose("running in non-debug mode", this.id)
      //Utility.displayHide(this.document.getElementById("enter__Fake--id")!) // defaults to hidden
    } else {
      this.log.verbose("running in debug mode", this.id)
      Utility.displayShow(this.document.getElementById("enter__Fake--id")!)
    }

    if (this.gridApi) {
      this.gridApi.refreshCells()
    } else {
      this.log.verbose("no this.gridApi yet in ngOnInit()", this.id)
    }
  }

  // -------------------------------------------------------------------------

  // On hovering, display a larger image!
  //  { headerName: "Image", field: "image", cellRenderer: this.imageCellRenderer, tooltipField: "image", tooltipComponentParams: { color: '#ececec' }, flex: 5 },
  imageCellRenderer_unused = (params: { data: FieldReportType }) => {
    return `<img class="licenseImg" style="height:40px; width:40px;" alt= "Image of ${params.data.callsign}"
      src= "${this.settings.imageDirectory}rangers/${params.data.callsign}">`
  }

  statusCellRenderer = (params: { data: FieldReportType }) => {
    let title = `Status: ${params.data.status}`
    return `<span aria-hidden title="${title}"> ${params.data.status}</span>`
  }

  notesCellRenderer = (params: { data: FieldReportType }) => {
    let title = `Note: ${params.data.notes}`
    return `<span aria-hidden title="${title}"> ${params.data.notes}</span>`
  }

  //--------------------------------------------------------------------------

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

  onGridReady = (params: any) => {
    this.log.verbose("onGridReady()", this.id)

    this.gridApi = params.api
    //this.log.verbose(`onGridReady() gridApi: ${this.gridApi}`, this.id)
    this.gridColumnApi = params.columnApi
    // this.log.verbose(`onGridReady() gridColumnApi: ${this.gridColumnApi}`, this.id)

    // https://ag-grid.com/angular-data-grid/column-sizing/#example-default-resizing
    params.api.sizeColumnsToFit()

    // TODO: use this line, or onFirstDataRendered()?
    if (this.gridApi) {
      this.gridApi.refreshCells()
    } else {
      this.log.verbose("no this.gridApi yet in onGridReady()", this.id)
    }


    // set initial pagination size
    //paginationAutoPageSize: true
    // this.gridApi.paginationAutoPageSize(true) // also see: onRowsPerPage

    //this.log.verbose("onGridReady() done", this.id)
  }

  onFirstDataRendered(params: any) {
    this.log.verbose("onFirstDataRendered()", this.id)

    // following should not be needed, duplicate of onGridReady()...
    this.gridApi = params.api
    //this.log.verbose(`onGridReady() gridApi: ${this.gridApi}`, this.id)
    this.gridColumnApi = params.columnApi

    //params.api.sizeColumnsToFit();
    this.refreshGrid()
  }

  //--------------------------------------------------------------------------

  // https://www.ag-grid.com/javascript-data-grid/grid-events/#reference-selection-selectionChanged
  onRowSelection(event: SelectionChangedEvent) {
    let selectedNodes = this.gridApi.getSelectedNodes()
    this.selectedRows = selectedNodes.length
    let selectedData = selectedNodes.map((node: { data: FieldReportType; }) => node.data)
    this.log.verbose(`Selected Row Data obtained ${selectedNodes.length} selected rows`, this.id)
    this.fieldReportService.setSelectedFieldReports(selectedData)
  }

  //onFirstDataRendered(params: any) {
  refreshGrid() {
    // https://blog.ag-grid.com/refresh-grid-after-data-change/
    if (this.gridApi) {
      this.gridApi.refreshCells()
      this.gridApi.sizeColumnsToFit()
    } else {
      this.log.warn(`refreshGrid(): gridApi not established yet!`, this.id)
    }
  }

  reloadPage() {
    this.log.verbose(`Reloading window!`, this.id)
    window.location.reload()
  }


  gotNewFieldReports(newReports: FieldReportsType) {
    this.log.verbose(`New collection of ${newReports.numReport} Field Reports observed.`, this.id)

    this.fieldReports = newReports
    this.fieldReportArray = newReports.fieldReportArray
    this.refreshGrid()
    //this.reloadPage()  // TODO: needed? - creates endless loop!
  }

  /**
   * Given a fieldReport, finds the date, and returns it as 'Sun Jan-01 23:00:00'
   * @param params
   * @returns
   */
  myDateGetter = (params: { data: FieldReportType }) => {
    const weekday = ["Sun ", "Mon ", "Tue ", "Wed ", "Thu ", "Fri ", "Sat "]
    let dt = 'unknown date'
    let d: Date = params.data.date
    //this.log.excessive(`Day is: ${d.toISOString()}`, this.id)
    //this.log.excessive(`WeekDay is: ${d.getDay}`, this.id)

    try {  // TODO: Use the date pipe instead?
      //weekday[d.getDay()] +
      dt = formatDate(d, 'M-dd HH:MM:ss', 'en-US')
      //this.log.excessive(`Day is: ${params.data.date.toISOString()}`, this.id)
    } catch (error: any) {
      dt = `Bad date format: Error name: ${error.name}; msg: ${error.message}`
    }

    // https://www.w3schools.com/jsref/jsref_obj_date.asp
    //this.log.excessive(`Day is: ${params.data.date.toISOString()}`, this.id)
    /*
        if (this.isValidDate(d)) {
          dt = weekday[d.getDay()] + formatDate(d, 'yyyy-MM-dd HH:MM:ss', 'en-US')
          this.log.excessive(`Day is: ${params.data.date.toISOString()}`, this.id)
        }
    */
    return dt
  }

  myMinuteGetter = (params: { data: FieldReportType }) => {
    let dt = new Date(params.data.date).getTime()
    let milliseconds = Date.now() - dt
    let seconds: string = (Math.round(milliseconds / 1000) % 60).toString().padStart(2, '0')
    let minutes: string = Math.floor((milliseconds / (1000 * 60)) % 60).toString().padStart(2, '0')
    let hours = Math.floor((milliseconds / (1000 * 60 * 60)) % 24)
    let days = Math.floor((((milliseconds / (1000 * 60 * 60 * 24)) + hours) / 24))
    return (`${days ? days + " days  " : ""} ${hours}:${minutes}:${seconds} `)
  }

  //! BUG: JUST ROUNDS THE lat, not whatever is passed in!!!!!
  // rounder = (params: { data: FieldReportType }) => {
  //   let val = Math.round(params. data.lat * 10000) / 10000.0
  //   return val
  // }

  isValidDate(d: any) {
    return d instanceof Date //&& !isNaN(d);
  }

  // filteredReports:FieldReportType[] = this.fieldReportService.filterFieldReportsByDate(Date(-12*60*60*1000), Date(5*60*1000)) //FUTURE:
  // onBtnSetSelectedRowData() {
  //   let selectedNodes = this.gridApi.getSelectedNodes();
  //   let selectedData = selectedNodes.map((node: { data: FieldReportType; }) => node.data);
  //   this.selectedRows = selectedNodes.length
  //   this.log.excessive(`onBtnGetSelectedRowData obtained ${ selectedNodes.length } selected rows: \n${ JSON.stringify(selectedData) } `, this.id)
  //   this.fieldReportService.setSelectedFieldReports(selectedData)
  // }


  // following from https://ag-grid.com/javascript-data-grid/csv-export/
  getParamValue(inputSelector: string) {
    let selector = this.document.getElementById('columnSeparator') as HTMLSelectElement
    var sel = selector.selectedIndex;
    var opt = selector.options[sel];
    var selVal = (<HTMLOptionElement>opt).value;
    var selText = (<HTMLOptionElement>opt).text
    // this.log.excessive(`Got column seperator text: "${selText}", val: "${selVal}"`, this.id)

    switch (selVal) {
      case 'none':
        return;
      case 'tab':
        return '\t';
      default:
        return selVal;
    }
  }

  private getParams() {
    let dt = new Date()
    return {
      columnSeparator: this.getParamValue('columnSeparator'),
      fileName: `FieldReportsExport.${dt.getFullYear()} -${dt.getMonth() + 1} -${dt.getDate()}_${dt.getHours()}:${dt.getMinutes()}.csv`,
    }
  }

  onSeperatorChange() {
    var params = this.getParams();
    if (params.columnSeparator && this.numSeperatorWarnings++ < this.maxSeperatorWarnings) {
      alert(`NOTE: Excel handles comma separators best.You've chosen "${params.columnSeparator}"`)
    }
  }

  onBtnExport() {
    // TODO: Does this handle new FieldReports properly?
    // https://www.ag-grid.com/javascript-data-grid/excel-export-styles/#styling-headers

    // const params = this.getParams();
    // this.gridApi.exportDataAsCsv(params);

    // ! Is this JUST for enterprise edition?! - test...
    // https://www.ag-grid.com/javascript-data-grid/excel-export-rows/#export-all-unprocessed-rows
    this.gridApi.exportDataAsExcel({
      exportedRows: (document.getElementById('allRows') as HTMLInputElement)
        .checked
        ? 'all'
        : 'filteredAndSorted',
    })
  }

  onBtnClearFieldReports() {
    if (Utility.getConfirmation('REALLY delete all FieldReports in LocalStorage?')) {
      this.log.info("Removing all field reports from local storage...", this.id)
      this.fieldReportService.deleteAllFieldReports()
      this.refreshGrid()
      this.reloadPage()
    }
  }

  // Save them to localstorage & update subscribers
  // REVIEW: SOMEHOW??? renaming the next to unused caused an error if slecting a row when running???
  onBtnUpdateFieldReports() {
    // https://blog.ag-grid.com/refresh-grid-after-data-change/#updating-through-variable-angular
    // BUG: Need to send the newly edited reports...with Header properties
    alert('onBtnUpdateFieldReports is UNIMPLEMENTED!')
    //this.fieldReportService.updateFieldReports()
  }

  onBtnImportFieldReportsFromJSON_unused() {
    alert(`onBtnImportFieldReports is unimplemented`)

    // TODO: look at: https://www.npmjs.com/package/fs-browsers

    // TODO: https://blog.ag-grid.com/refresh-grid-after-data-change/
    // https://stackblitz.com/edit/ag-grid-angular-hello-world-n3aceq?file=src%2Fapp%2Fapp.component.ts
    // https://www.ag-grid.com/javascript-data-grid/immutable-data/

    // https://github.com/ag-grid/ag-grid/issues/2450
    this.http
      .get("https://raw.githubusercontent.com/ag-grid/ag-grid/master/grid-packages/ag-grid-docs/src/olympicWinnersSmall.json")
      .subscribeOn((data: any[]) => {  // NOTE: subscribeOn() is a guess!!!
        data.length = 10;
        data = data.map((row, index) => {
          return { ...row, id: index + 1 };
        })
        this.backupRowData = data
        this.rowData = data
      })
  }

  /**
   *
   * @returns
   */
  onRowsPerPage() {
    // https://developer.mozilla.org/en-US/docs/Web/API/HTMLOptionElement
    //this.log.excessive(`onRowsPerPage`, this.id)

    const element = this.document.getElementById('rowPerPage-select') as HTMLSelectElement// OptionElement
    if (!element) {
      this.log.error("onRowsPerPage could not find rowPerPage-select!", this.id)
      return
    }

    const option = element.options[element.selectedIndex].outerText
    // this.gridApi.pagination = true // should have been done initially...
    switch (option) {
      case "Auto":
        this.log.verbose("onRowsPerPage set to Auto", this.id)
        //this.gridApi.paginationSetPageSize()
        this.gridApi.paginationAutoPageSize = true
        this.gridApi.redrawRows()
        break;
      case "5":
        //! WORKS! - Maybe any number LESS than auto????
        this.log.verbose("onRowsPerPage set to 5", this.id)
        this.gridApi.paginationAutoPageSize = false
        this.gridApi.paginationSetPageSize("5")
        break;
      case "10":
        // WORKS! - Maybe any number LESS than auto????
        this.log.verbose("onRowsPerPage set to 10", this.id)
        this.gridApi.paginationAutoPageSize = false
        this.gridApi.paginationSetPageSize("10")
        break;
      case "25":
        this.log.verbose("onRowsPerPage set to 25", this.id)
        this.gridApi.paginationAutoPageSize = false
        this.gridApi.paginationSetPageSize("25")
        break;
      case "50":
        this.log.verbose("onRowsPerPage set to 50", this.id)
        this.gridApi.paginationAutoPageSize = false
        this.gridApi.paginationSetPageSize("50")
        break;
      case "100":
        this.log.verbose("onRowsPerPage set to 100", this.id)
        this.gridApi.paginationAutoPageSize = false
        this.gridApi.paginationSetPageSize("100")
        break;
      case "All":
        this.log.verbose("onRowsPerPage set to All", this.id)
        //https://www.ag-grid.com/javascript-data-grid/infinite-scrolling
        //set rowModelType: infinite ???
        this.gridApi.pagination = false
        this.gridApi.paginationAutoPageSize = false
        break;

      default:
        this.log.error(`onRowsPerPage got unknown option: ${option}`, this.id)
        break;
    }
    // this.refreshGrid()
  }

  generateFakeFieldReports(num = this.nFakes) {
    // TODO: compare current with
    // https://github.com/material-components/material-components-web/tree/master/packages/mdc-slider#discrete-slider
    // https://material-components.github.io/material-components-web-catalog/#/component/slider
    this.fieldReportService.generateFakeData(num)
    this.log.verbose(`Generated ${num} FAKE Field Reports`, this.id)
    //this.fieldReportService.updateFieldReports()
    //this.fieldReports$ = this.fieldReportService.subscribeToFieldReports()
    //this.refreshGrid()
    this.reloadPage() //TODO: why aren't above enough?!!!
  }

  ngOnDestroy() {
    this.fieldReportsSubscription?.unsubscribe()
    this.settingsSubscription?.unsubscribe()
  }
}
