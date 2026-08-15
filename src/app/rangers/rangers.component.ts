import { ColDef, GridOptions } from 'ag-grid-community'
//import { TooltipModule } from 'ng2-tooltip-directive'
import { Subscription } from 'rxjs'

import { CommonModule, DOCUMENT } from '@angular/common'
import { AfterViewInit, Component, Inject, OnDestroy, OnInit, ViewChild, ChangeDetectionStrategy } from '@angular/core'
import { MatSnackBar } from '@angular/material/snack-bar'
import { AgGridAngular } from 'ag-grid-angular';
import { DisclosureComponent } from '../shared/disclosure/disclosure.component';
import { PageComponent } from '../shared/page/page.component';

import { Utility } from '../shared'
import { ensureAgGridRegistered } from '../shared/ag-grid-setup'
import { AlertsComponent } from '../shared/alerts/alerts.component'
import {
  FieldReportService, FieldReportType, LogService, RangerService, RangerType,
  SettingsService, SettingsType
} from '../shared/services'
import { CustomTooltip } from './customTooltip'


@Component({
  selector: 'rangertrak-rangers',
  standalone: true,
  imports: [CommonModule, AgGridAngular, PageComponent, DisclosureComponent],
  templateUrl: './rangers.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./rangers.component.scss']
})
export class RangersComponent implements OnInit, AfterViewInit, OnDestroy {

  private id = 'Ranger Component'
  title = 'Rangers & Teams'
  pageDescr = `Grid display of rangers & teams on this mission`

  private rangersSubscription!: Subscription
  public rangers: RangerType[] = []

  private settingsSubscription!: Subscription
  private settings!: SettingsType

  alert: any

  // The confidentiality bar above the roster. Dismissal is remembered per browser, which
  // is the point - it used to be a permanent block that pushed the grid down the page on
  // every visit, and a warning that cannot be acknowledged is a warning people learn to
  // read past. Dismissing it hides the *bar*; the full notice stays in the "Privacy &
  // data handling" section below and cannot be removed.
  //
  // Deliberately its own localStorage key rather than a field on the settings object:
  // this is a per-device UI acknowledgement, not mission data, and it must not ride along
  // in Mission Export or trigger the settings migration 24e is tracking.
  private static readonly PRIVACY_DISMISSED_KEY = 'rangertrak.rangers.privacyNoticeDismissed'
  privacyNoticeDismissed = false

  @ViewChild('privacyDetails') private privacyDetails?: DisclosureComponent

  numSeperatorWarnings = 0
  maxSeperatorWarnings = 3

  now: Date

  // https://www.ag-grid.com/angular-data-grid/grid-interface/#grid-options-1
  private gridApi: any
  private gridColumnApi: any

  gridOptions: GridOptions = {
    // PROPERTIES
    // Use the classic ag-theme-alpine CSS (imported in styles.scss) rather than v33+'s
    // Theming API - see the ModuleRegistry comment in main.ts.
    theme: 'legacy',
    // v32.2+ object form - see the equivalent comment in field-reports.component.ts.
    rowSelection: {
      mode: 'multiRow',
      checkboxes: false,
      headerCheckbox: false,
      enableClickSelection: true,
    },
    // pagination: true,

    // EVENT handlers
    // onRowClicked: event => this.log.verbose('A row was clicked'),
    // onSelectionChanged: (event: SelectionChangedEvent) => this.onRowSelection(event),

    // CALLBACKS
    // getRowHeight: (params) => 25
    //},

    defaultColDef: {
      flex: 1,
      minWidth: 100,
      editable: true,
      //singleClickEdit: true,
      resizable: true,
      sortable: true,
      filter: true,
      floatingFilter: true,
      tooltipComponent: CustomTooltip,
    },
    tooltipShowDelay: 0,
    tooltipHideDelay: 2000,
    // set rowData to null or undefined to show loading panel by default
    rowData: null,
  };

  // On hovering, display a larger image!
  imageCellRenderer = (params: { data: RangerType }) => {
    return `<img class="licenseImg" style="height:40px; width:40px;" alt= "Image of ${params.data.fullName}"
      src= "${this.settings.imageDirectory}rangers/${params.data.image}">`
  }

  callsignCellRenderer = (params: { data: RangerType }) => {
    let title = `${params.data.fullName} | ${params.data.phone}`
    return `<span aria-hidden title="${title}"> ${params.data.callsign}</span>`
  }

  columnDefs: ColDef[] = [
    { headerName: "Call Sign", field: "callsign", cellRenderer: this.callsignCellRenderer, flex: 10 },
    { headerName: "Full Name", field: "fullName", tooltipField: "FCC Licensee Name", flex: 10 },
    { headerName: "Phone", field: "phone", singleClickEdit: true, flex: 40 },
    { headerName: "Address", field: "address", singleClickEdit: true, flex: 40 },
    { headerName: "REW", field: "rew", singleClickEdit: true, flex: 10 },
    { headerName: "Image", field: "image", cellRenderer: this.imageCellRenderer, tooltipField: "image", tooltipComponentParams: { color: '#ececec' }, flex: 5 },
    { headerName: "Role", field: "role", flex: 40 },
    { headerName: "Notes", field: "note", flex: 60 },
  ]

  constructor(
    //private teamService: TeamService,
    private log: LogService,
    private rangerService: RangerService,
    private settingsService: SettingsService,
    private _snackBar: MatSnackBar,
    @Inject(DOCUMENT) private document: Document
  ) {
    this.log.info(`======== Constructor() ============`, this.id)
    ensureAgGridRegistered()

    this.now = new Date()
    this.gridApi = ""
    this.gridColumnApi = ""
  }

  // Initialize data or fetch external data from services or API (https://geeksarray.com/blog/angular-component-lifecycle)
  ngOnInit(): void {

    this.privacyNoticeDismissed =
      localStorage.getItem(RangersComponent.PRIVACY_DISMISSED_KEY) === 'true'

    this.alert = new AlertsComponent(this._snackBar, this.log, this.settingsService, this.document) // TODO: Use Alert Service to avoid passing along doc & snackbar as parameters!
    //this.teamService = teamService
    //this.rangerService = rangerService

    this.settingsSubscription = this.settingsService.getSettingsObserver().subscribe({
      next: (newSettings) => {
        this.settings = newSettings
        this.log.excessive('Received new Settings via subscription.', this.id)
      },
      error: (e) => this.log.error('Settings Subscription got:' + e, this.id),
      complete: () => this.log.info('Settings Subscription complete', this.id)
    })

    this.rangersSubscription = this.rangerService.getRangersObserver().subscribe({
      next: (newRangers) => {
        this.rangers = newRangers
        this.log.verbose('Received new Rangers via subscription.', this.id)
      },
      error: (e) => this.log.error('Rangers Subscription got:' + e, this.id),
      complete: () => this.log.info('Rangers Subscription complete', this.id)
    })

    this.log.verbose(`ngInit: ${this.rangers.length} Rangers retrieved from Local Storage`, this.id)

    if (this.rangers.length < 1) {
      this.alert.Banner("No Rangers have been entered yet. Go to the bottom & click on 'Advanced' to resolve.")
      //this.alert.OpenSnackBar(`No Rangers found. Please enter them into the grid and then use the Update button,  or provide a Rangers.JSON file to import from or FUTUREE: Import them from an Excel file.`, `Nota Bene`, 1000)
    } else {
      //this.alert.OpenSnackBar(`Imported "${this.rangers.length}" rangers.`, `Nota Bene`, 1000)
    }

    if (!this.settings?.debugMode) {
      //this.displayHide("rangers__Fake")
      //this.displayHide("ranger__ImportExcel")
    }
  }

  /**
   * Called once all HTML elements have been created
   */
  ngAfterViewInit() {

  }

  //--------------------------------------------------------------------------

  onGridReady = (params: any) => {
    this.gridApi = params.api;
    this.gridColumnApi = params.columnApi;

    // https://ag-grid.com/angular-data-grid/column-sizing/#example-default-resizing
    params.api.sizeColumnsToFit()
    // TODO: use this line, or next routine?!
    if (this.gridApi) {
      this.gridApi.refreshCells()
    } else {
      this.log.verbose("no this.gridApi yet in ngOnInit()", this.id)
    }
  }

  onFirstDataRendered(params: any) {
    params.api.sizeColumnsToFit();
    if (this.gridApi) {
      this.gridApi.refreshCells()
    } else {
      this.log.verbose("no this.gridApi yet in ngOnInit()", this.id)
    }
  }

  //--------------------------------------------------------------------------

  onBtnAddRanger(formData?: string) {
    this.log.verbose("Adding new ranger", this.id)
    this.rangerService.AddRanger()  // this calls updateLocalStorageAndPublish
    this.refreshGrid()
    this.reloadPage()
  }

  onBtnDeleteRanger(callsign: string) {
    this.log.verbose(`onBtnDeleteRanger: Deleteing ranger with callsign: ${callsign}`, this.id)
    this.rangerService.deleteRanger(callsign)
  }

  onBtnDeleteRangers() {
    this.log.verbose(`onBtnDeleteRangers: Deleteing all rangers`, this.id)
    // Was: "REALLY delete all Rangers in LocalStorage, vs. edit the Ranger grid & Update
    // the values in Local Storage?" - which asked the operator to weigh an alternative
    // they had not chosen, in storage jargon, and never said what would actually happen.
    const count = this.rangerService.rangers.length
    if (Utility.getConfirmation(
      `Delete all ${count} rangers from this browser?\n\n`
      + `The roster will be empty until you import one or add station callsigns. `
      + `Field reports already filed are not deleted, but they will refer to callsigns `
      + `that are no longer in the roster.\n\n`
      + `Export the roster first if you might want it back.`)) {
      this.log.info("Removing all rangers from local storage...", this.id)
      this.rangerService.deleteAllRangers()
      this.refreshGrid()
      this.reloadPage()
    }
  }

  //--------------------------------------------------------------------------
  onDeselectAll() {
    this.log.verbose(`onDeselectAll: Deleteing all rangers`, this.id)
    this.gridApi.deselectAll()
  }

  onBtnUpdateLocalStorage() {
    this.log.verbose(`onBtnUpdateLocalStorage: saving the edited roster to local storage`, this.id)
    this.rangerService.updateLocalStorageAndPublish()
  }

  //--------------------------------------------------------------------------
  // Roster import / export (JSON)
  //
  // The roster is the one thing a team must bring with them, and until now the only way
  // in was Import Mission - which also replaces settings and every field report. That is
  // the wrong tool for "here is our roster": it discards the work already on the device.
  // These two do the roster and nothing else.

  /** Downloads just the roster as JSON - the file the importer below expects. */
  onBtnExportRangersJson() {
    const rangers = this.rangerService.rangers
    if (!rangers.length) {
      alert('There are no rangers to export.')
      return
    }

    const json = JSON.stringify({ rangers }, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const stamp = new Date().toISOString().slice(0, 10)

    const a = this.document.createElement('a')
    a.href = url
    a.download = `rangertrak-roster-${stamp}.json`
    a.click()
    URL.revokeObjectURL(url)

    this.log.info(`Exported ${rangers.length} rangers as JSON.`, this.id)
  }

  /**
   * Handles a file picked via "Import roster". Replaces the roster only; field reports
   * and settings are untouched, which is the whole point of it being separate from
   * Import Mission.
   */
  onRosterFileSelected(event: Event) {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    input.value = '' // so re-picking the same file still fires a change event

    if (!file) {
      return
    }

    const reader = new FileReader()

    reader.onerror = () => {
      this.log.error(`onRosterFileSelected: could not read ${file.name}`, this.id)
      alert(`Could not read "${file.name}".`)
    }

    reader.onload = () => {
      let incoming: RangerType[]
      try {
        incoming = this.rangerService.parseRosterJson(reader.result as string)
      } catch (error: any) {
        this.log.error(`onRosterFileSelected: ${file.name} rejected: ${error.message}`, this.id)
        alert(`Could not import "${file.name}".\n\n${error.message}`)
        return
      }

      const current = this.rangerService.rangers.length
      const warnings = this.rangerService.rosterWarnings(incoming)
      warnings.forEach(w => this.log.warn(`Roster import warning (${file.name}): ${w}`, this.id))

      if (!confirm(
        `Import ${incoming.length} rangers from "${file.name}"?\n\n`
        + (warnings.length ? `Note:\n  - ${warnings.join('\n  - ')}\n\n` : '')
        + `This REPLACES the current roster of ${current}. `
        + `Field reports and settings are not affected.\n\n`
        + `Tip: use "Export roster (JSON)" first if you want to keep the current one.`)) {
        this.log.verbose('onRosterFileSelected: user cancelled import.', this.id)
        return
      }

      this.rangerService.replaceAllRangers(incoming)
      this.log.warn(`Imported ${incoming.length} rangers from ${file.name}.`, this.id)
      alert(`Imported ${incoming.length} rangers. Reloading so every screen picks them up...`)
      this.reloadPage()
    }

    reader.readAsText(file)
  }


  //--------------------------------------------------------------------------
  // Removed: onBtnImportJson / onBtnImportExcel / onBtnImportExcel2 / onFileChange /
  // import / export / read / write. They were SheetJS demo code and half-finished
  // experiments - the JSON one read the file into a data URL and threw it away, the
  // Excel ones imported the wrong sheet or alerted "NOT IMPLEMENTED" - all shown in
  // the UI behind a "may not work" disclaimer. Importing a roster is what
  // BackupService's Import Mission does, for real (Roadmap Section 18/E).

  //--------------------------------------------------------------------------
  onBtnReloadPage() {
    this.reloadPage()
  }

  reloadPage() {
    this.log.verbose(`Reloading window!`, this.id)
    window.location.reload()
  }

  refreshGrid() {
    if (this.gridApi) {
      this.gridApi.refreshCells()
      this.gridApi.sizeColumnsToFit();
    } else {
      this.log.verbose("no this.gridApi yet in refreshGrid()", this.id)
    }
  }

  //--------------------------------------------------------------------------
  // following from https://ag-grid.com/javascript-data-grid/csv-export/
  onBtnExportToExcel() {
    //var params = this.getParams();
    //this.log.verbose(`Got column seperator value "${params.columnSeparator}"`, this.id)
    //this.log.verbose(`Got filename of "${params.fileName}"`, this.id)
    //this.gridApi.exportDataAsCsv(params);

    // Confirm before the roster leaves the app: the exported file carries names, home
    // addresses, personal phone numbers and call signs in the clear, and nothing this
    // app does can protect it afterwards.
    if (!Utility.getConfirmation(
      `Export the roster to a file?\n\n`
      + `The exported file contains PERSONAL INFORMATION - legal names, home addresses, `
      + `personal phone numbers and call signs - and is NOT encrypted.\n\n`
      + `Store it somewhere appropriate, share it only with people who need it for this `
      + `mission, and delete it when the mission is over.`)) {
      this.log.verbose('onBtnExportToExcel: user cancelled export.', this.id)
      return
    }

    // ! Is this JUST for enterprise edition?! - test...
    // https://www.ag-grid.com/javascript-data-grid/excel-export-rows/#export-all-unprocessed-rows
    this.gridApi.exportDataAsExcel({
      exportedRows: (document.getElementById('allRows') as HTMLInputElement)
        .checked
        ? 'all'
        : 'filteredAndSorted',
    })
  }

  getSeperatorValue(inputSelector: string) {
    //let selector = this.document.querySelector(inputSelector) as HTMLSelectElement
    let selector = this.document.getElementById(inputSelector) as HTMLSelectElement
    var sel = selector.selectedIndex;
    var opt = selector.options[sel];
    var selVal = (<HTMLOptionElement>opt).value;
    //var selText = (<HTMLOptionElement>opt).text
    // this.log.verbose(`Got column seperator text:"${selText}", val:"${selVal}"`, this.id)

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
      columnSeparator: this.getSeperatorValue('columnSeparator'),
      fileName: `RangersExport.${dt.getFullYear()}-${dt.getMonth() + 1}-${dt.getDate()}_${dt.getHours()}:${dt.getMinutes()}.csv`, // ONLY month is zero based!
    }
  }

  onSeperatorChange() {
    var params = this.getParams();
    if (params.columnSeparator && this.numSeperatorWarnings++ < this.maxSeperatorWarnings) {
      //this.alerts.OpenSnackBar(`NOTE: Excel handles comma separators best. You've chosen "${params.columnSeparator}"`, `Nota Bene`, 4000)
      alert(`NOTE: Excel handles comma separators best. You've chosen "${params.columnSeparator}" Good luck!`);
    }
  }

  //--------------------------------------------------------------------------

  loadVashonRangers() {
    this.rangerService.loadHardcodedRangers()
    // TODO: Refresh the page, or why not showing???? - until page goes thoiugh another init cycle?!

    this.log.verbose("loadVashonRangers calling ngInit...", this.id)
    this.ngOnInit()

    this.log.verbose("loadVashonRangers calling window.location.reload...", this.id)
    this.reloadPage()
  }

  //--------------------------------------------------------------------------
  // Confidentiality bar

  dismissPrivacyNotice() {
    this.privacyNoticeDismissed = true
    try {
      localStorage.setItem(RangersComponent.PRIVACY_DISMISSED_KEY, 'true')
    } catch (e) {
      // Private-browsing or a full quota. The bar still goes away for this visit; it
      // simply comes back next time, which is the safe direction to fail in.
      this.log.warn(`Could not persist privacy-notice dismissal: ${e}`, this.id)
    }
  }

  openPrivacyDetails() {
    if (!this.privacyDetails) {
      this.log.warn('openPrivacyDetails(): no #privacyDetails disclosure', this.id)
      return
    }
    this.privacyDetails.reveal()
  }

  //--------------------------------------------------------------------------

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


  ngOnDestroy() {
    this.rangersSubscription?.unsubscribe()
    this.settingsSubscription?.unsubscribe()
  }
}
