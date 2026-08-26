import { GridOptions, SelectionChangedEvent } from 'ag-grid-community'
// , TeamService
import { Observable, subscribeOn, Subscription } from 'rxjs'

import { CommonModule, DOCUMENT, formatDate } from '@angular/common'
import { AfterViewInit, Component, Inject, OnDestroy, OnInit, Pipe, PipeTransform, ElementRef, ChangeDetectionStrategy, signal } from '@angular/core';

import { AgGridAngular } from 'ag-grid-angular';
import { SectionComponent } from '../shared/section/section.component';
import { PageComponent } from '../shared/page/page.component';

import { Utility } from '../shared'
import { ensureAgGridRegistered } from '../shared/ag-grid-setup'
import { rangertrakGridTheme } from '../shared/ag-grid-theme'
import {
  FieldReportService, FieldReportStatusType, FieldReportsType, FieldReportType, LogService,
  RangerService, SettingsService, SettingsType, statusColorValue, statusInkValue
} from '../shared/services'

@Pipe({ name: 'myUnusedPipe' })
export class myUnusedPipe implements PipeTransform {
  transform(val: string) {
    return val.toUpperCase()
  }
}


@Component({
  selector: 'rangertrak-field-reports',
  standalone: true,
  imports: [
    CommonModule,
    AgGridAngular,
    PageComponent,
    SectionComponent
  ],
  templateUrl: './field-reports.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./field-reports.component.scss']
})
export class FieldReportsComponent implements OnInit, OnDestroy {

  private id = 'Field Report'
  title = 'Field Reports'
  pageDescr = `Grid display of reported ranger positions and status throughout a mission`

  private fieldReportsSubscription!: Subscription

  /**
   * Read through to the service rather than snapshotting in ngOnInit, which is what this
   * used to do. The statuses (and their colours) are per-mission settings, so Import
   * Mission, Load Sample Mission and Reset Settings all change them - and the snapshot
   * left this grid colouring rows by the *previous* mission's status list. Read at
   * cell-render time, so a getter is enough; SettingsService.settings reads a signal.
   */
  private get fieldReportStatuses(): FieldReportStatusType[] {
    return this.settingsService.settings?.fieldReportStatuses ?? []
  }
  // Mutated inside gotNewFieldReports(), reached from the fieldReportsSubscription's
  // subscribe() callback, not an Angular template binding - this app is zoneless, so a
  // plain field written there has no guaranteed path back into change detection.
  // Signals close that gap (Sprint G).
  public fieldReportArray = signal<FieldReportType[]>([])
  private fieldReports: FieldReportsType | undefined

  private settingsSubscription!: Subscription
  private settings!: SettingsType

  // Mutated inside onRowSelection(), itself invoked from gridOptions.onSelectionChanged
  // - an ag-grid-native callback, not a template event binding. Same reasoning as above.
  public selectedRows = signal(0)
  public columnDefs!: any

  /**
   * Sprint F phone carve-out: the grid is never constructed on a phone (not just
   * hidden), so this drives an @if in the template rather than CSS display:none.
   * Same breakpoint as styles/_breakpoints.scss's `phone` mixin (<=575px).
   */
  private phoneMediaQuery = window.matchMedia('(max-width: 575px)')
  public isPhone = signal(this.phoneMediaQuery.matches)
  private onPhoneMediaChange = (e: MediaQueryListEvent) => this.isPhone.set(e.matches)

  private gridApi: any
  private gridColumnApi
  private now: Date
  private http: any
  private numSeperatorWarnings = 0
  private maxSeperatorWarnings = 3

  // https://www.ag-grid.com/angular-data-grid/grid-interface/#grid-options-1
  // https://blog.ag-grid.com/how-to-get-the-data-of-selected-rows-in-ag-grid/
  // NOT monitored for changes on the fly: https://stackoverflow.com/questions/52519129/ag-grid-and-angular-how-to-switch-grid-options-dynamically/52519796#52519796
  gridOptions: GridOptions = {
    // PROPERTIES
    theme: rangertrakGridTheme,
    // v32.2+ object form. checkboxes/headerCheckbox off + enableClickSelection keeps the
    // original "multiple" behaviour (click a row to select, ctrl/shift to extend) rather
    // than the new default, which would add a checkbox column the layout doesn't expect.
    rowSelection: {
      mode: 'multiRow',
      checkboxes: false,
      headerCheckbox: false,
      enableClickSelection: true,
    },

    // https://www.ag-grid.com/javascript-data-grid/row-pagination/#pagination-properties
    pagination: true,
    paginationAutoPageSize: true, // if set overrides paginationPageSize & forces it back to this on changes...
    //paginationPageSize: 5,
    // suppressScrollOnNewData: true, // grid to NOT scroll to the top, on page changes

    // EVENT handlers
    // onRowClicked: event => this.log.verbose('A row was clicked'),
    onSelectionChanged: (event: SelectionChangedEvent) => this.onRowSelection(event),
    // The grid's rows ARE the service's report objects, so an edit has already
    // mutated them by the time this fires - it just has to be written out.
    // Previously nothing did, and a "Save Reports" button alerted UNIMPLEMENTED,
    // so every correction a scribe typed into the grid was lost on reload.
    onCellValueChanged: () => this.onCellEdited(),

    // CALLBACKS
    // getRowHeight: (params) => 25

    // E-104 (2026-08-25): columns size to their CONTENT now, not to an even share of the
    // grid. `fitCellContents` measures each column's rendered cells and headers and sizes
    // to the widest - so `Lat` shrinks to the ~9 characters it holds and `Address` gets the
    // room it needs, instead of the reverse. Columns carrying `flex` are excluded from this
    // measurement by AG Grid, which is why exactly one column (Notes) keeps a flex value:
    // it absorbs whatever width is left over so the grid still fills its container with no
    // dead gutter on the right.
    autoSizeStrategy: { type: 'fitCellContents' },

    defaultColDef: {
      // `flex: 1` here is what previously made EVERY column flexible, which in turn made
      // `autoSizeStrategy` a no-op and left the per-column flex weights below fighting
      // sizeColumnsToFit(). Gone deliberately - flex is now opt-in, on Notes alone.
      minWidth: 60,
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
    private fieldReportService: FieldReportService,
    private log: LogService,
    // private teamService: TeamService,
    // private rangerService: RangerService,
    private settingsService: SettingsService,
    @Inject(DOCUMENT) private document: Document
  ) {
    this.log.info(` Construction`, this.id)
    ensureAgGridRegistered()

    this.now = new Date()
    this.gridApi = ""
    this.gridColumnApi = ""

    this.phoneMediaQuery.addEventListener('change', this.onPhoneMediaChange)
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

    if (!this.settings) {
      this.log.error(`this.settings was null in ngOnInit`, this.id)
    }

    //? FUTURE: Consider replacing "Color" with "CSS_Style" to allow more options?
    //!Future: Hover over notes to show entire (multi-line) note
    this.columnDefs = [
      { headerName: "ID", field: "id", headerTooltip: 'Is this even needed?!', maxWidth: 90, editable: false }, // TODO:
      { headerName: "CallSign", field: "callsign", tooltipField: "team", maxWidth: 160 },
      // { headerName: "Team", field: "team" },
      // Dot path, not "address": the address lives on the nested location object, exactly
      // as lat/lng do below. Bound to the wrong field, this column rendered blank for
      // every report - the addresses were in the data all along.
      // The column most often holding a long value, and the one that used to lose the
      // argument with Lat/Lng. A floor of 180px keeps it legible even when every visible
      // row happens to be a short address; the ceiling stops one 90-character address from
      // pushing Status and Notes off screen.
      { headerName: "Address", field: "location.address", singleClickEdit: true, minWidth: 180, maxWidth: 420 },
      {
        // valueSetter, not just field: "lat" - the real value lives at location.lat,
        // so without this an edit wrote a phantom top-level `lat` that nothing reads
        // and the displayed coordinate snapped back on the next refresh.
        headerName: "Lat", field: "lat", singleClickEdit: true, cellClass: 'number-cell', maxWidth: 130,
        valueGetter: (params: { data: FieldReportType }) => { return Math.round(params.data.location.lat * 10000) / 10000.0 },
        valueSetter: (params: { data: FieldReportType, newValue: any }) => this.setCoordinate(params.data, 'lat', params.newValue)
      },
      {
        headerName: "Lng", field: "lng", singleClickEdit: true, cellClass: 'number-cell', maxWidth: 130,
        valueGetter: (params: { data: FieldReportType }) => { return Math.round(params.data.location.lng * 10000) / 10000.0 },
        valueSetter: (params: { data: FieldReportType, newValue: any }) => this.setCoordinate(params.data, 'lng', params.newValue)
      },
      { headerName: "Reported", headerTooltip: 'Report date', valueGetter: this.myDateGetter, maxWidth: 170, editable: false },
      { headerName: "Elapsed", headerTooltip: 'Hrs:Min:Sec since report', valueGetter: this.myMinuteGetter, maxWidth: 130, editable: false },
      {
        headerName: "Status", field: "status", minWidth: 130, maxWidth: 220, cellRenderer: this.statusCellRenderer,
        cellStyle: (params: { value: string; }) => {
          // Sprint E: the fill now resolves through the token layer (semantic key ->
          // --rt-status-*, custom colour passes through), and an explicit ink colour is set
          // alongside it. Previously only background-color was set, so the label inherited
          // whatever text colour was in scope - which is unreadable on roughly half the palette.
          const stat = this.fieldReportStatuses.find(el => el.status == params.value)
          const stored = stat ? stat.color : '#A3A3A3'
          return { 'background-color': statusColorValue(stored), 'color': statusInkValue(stored) }
        }
        //cellClassRules: this.cellClassRules() }, //, maxWidth: 150
      },
      // The ONLY flex column, on purpose - see autoSizeStrategy above. Notes is both the
      // most variable-length field and the one a scribe most wants extra room for, so it
      // takes whatever width the content-sized columns leave behind.
      { headerName: "Notes", field: "notes", cellRenderer: this.notesCellRenderer, flex: 1, minWidth: 200 },
      // E-11 (2026-08-26): evidenceLocation was captured on Entry and visible nowhere
      // afterward - not the main map, not here. This is the other of the two places the
      // gap named; see mapLeaflet.component.ts's displayMarkers() for the main-map marker.
      {
        headerName: "Evidence", field: "evidenceLocation", maxWidth: 110, editable: false,
        cellRenderer: this.evidenceCellRenderer,
        tooltipValueGetter: (params: { data: FieldReportType }) => {
          const loc = params.data.evidenceLocation
          return loc ? `Evidence/clue at ${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}` : undefined
        },
      },
    ];

    this.fieldReportsSubscription = this.fieldReportService.getFieldReportsObserver().subscribe({
      next: (newReport) => {
        console.log(newReport)
        this.gotNewFieldReports(newReport)
      },
      error: (e) => this.log.error('Field Reports Subscription got:' + e, this.id),
      complete: () => this.log.info('Field Reports Subscription complete', this.id)
    })

    if (this.gridApi) {
      this.gridApi.refreshCells()
    } else {
      this.log.verbose("no this.gridApi yet in ngOnInit()", this.id)
    }
  }

  // -------------------------------------------------------------------------

  // REMOVED: imageCellRenderer_unused. It was wired to no column, and would not have
  // worked if it had been - it built `src=".../rangers/${callsign}"`, a path with no file
  // extension, so every image would have 404'd. Dead code that also lied about being
  // ready to use.
  //
  // Showing the reporter's photo on this grid is a reasonable idea (E-38 now has the
  // machinery: RangerPhotoService.photoUrl(callsign) plus the androgynous fallback), but
  // it adds a column to a grid that is already wide, so it is a product decision rather
  // than a revival of this.

  statusCellRenderer = (params: { data: FieldReportType }) => {
    let title = `Status: ${params.data.status}`
    return `<span aria-hidden title="${title}"> ${params.data.status}</span>`
  }

  notesCellRenderer = (params: { data: FieldReportType }) => {
    let title = `Note: ${params.data.notes}`
    return `<span aria-hidden title="${title}"> ${params.data.notes}</span>`
  }

  /** E-11: a compact flag icon when this report has an evidence/clue location, blank otherwise. */
  evidenceCellRenderer = (params: { data: FieldReportType }) => {
    const loc = params.data.evidenceLocation
    if (!loc) return ''
    return `<span aria-hidden title="Evidence/clue at ${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}">🚩</span>`
  }

  /**
   * Same fill/ink resolution the grid's Status column cellStyle uses (see columnDefs
   * above) - one source of truth for status colour, reused by the phone card view.
   */
  statusFill(status: string): string {
    const stat = this.fieldReportStatuses.find(el => el.status == status)
    return statusColorValue(stat ? stat.color : '#A3A3A3')
  }

  statusInk(status: string): string {
    const stat = this.fieldReportStatuses.find(el => el.status == status)
    return statusInkValue(stat ? stat.color : '#A3A3A3')
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

    // E-104: `sizeColumnsToFit()` used to run here, and it is what actually produced the
    // reported defect - it distributes the grid's width across columns and IGNORES the
    // per-column `flex` weights, so `Address` (flex 30) rendered narrower than `Lat`
    // (flex 1). `autoSizeStrategy` in gridOptions does the sizing now, once, from content.

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
    this.selectedRows.set(selectedNodes.length)
    let selectedData = selectedNodes.map((node: { data: FieldReportType; }) => node.data)
    this.log.verbose(`Selected Row Data obtained ${selectedNodes.length} selected rows`, this.id)
    this.fieldReportService.setSelectedFieldReports(selectedData)
  }

  //onFirstDataRendered(params: any) {
  refreshGrid() {
    // https://blog.ag-grid.com/refresh-grid-after-data-change/
    if (this.gridApi) {
      this.gridApi.refreshCells()
      // E-104: was sizeColumnsToFit(), which undid the content-based sizing on every
      // refresh (i.e. after every cell edit and every new report). autoSizeColumns() keeps
      // the same intent - columns matching their content - as data changes. Notes is
      // excluded because it is the flex column; AG Grid ignores flex columns here anyway.
      this.gridApi.autoSizeAllColumns()
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
    this.fieldReportArray.set(newReports.fieldReportArray)
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

  /**
   * A cell was edited: persist to localStorage and republish, so the maps and
   * any other subscriber see the correction immediately. Replaces the old
   * "Save Reports" button, which the page itself described as something that
   * "should happen automatically".
   */
  private onCellEdited() {
    this.log.verbose(`Field report edited in grid; saving.`, this.id)
    this.fieldReportService.saveEditedFieldReports()
  }

  /**
   * Writes an edited Lat/Lng back onto the report's nested location object.
   * Rejects anything non-numeric or out of range rather than storing NaN, which
   * would put the report - and the map bounds derived from it - nowhere.
   */
  private setCoordinate(report: FieldReportType, axis: 'lat' | 'lng', newValue: any): boolean {
    const parsed = Number(newValue)
    const limit = axis === 'lat' ? 90 : 180

    if (newValue === '' || newValue === null || isNaN(parsed) || Math.abs(parsed) > limit) {
      this.log.warn(`Ignoring invalid ${axis} "${newValue}" for report ${report.id}.`, this.id)
      return false
    }

    report.location[axis] = parsed
    // An edited coordinate is no longer whatever the address geocoded to.
    report.location.derivedFromAddress = false
    return true
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

  ngOnDestroy() {
    this.fieldReportsSubscription?.unsubscribe()
    this.settingsSubscription?.unsubscribe()
    this.phoneMediaQuery.removeEventListener('change', this.onPhoneMediaChange)
  }
}
