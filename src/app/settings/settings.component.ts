import { AgGridModule } from 'ag-grid-angular'
import { ColDef } from 'ag-grid-community'
import { delay, Subscription, throwError } from 'rxjs'

import { DOCUMENT } from '@angular/common'
import { Component, enableProdMode, Inject, OnDestroy, OnInit, ViewChild } from '@angular/core'
import {
  AbstractControl, FormArray, UntypedFormBuilder, UntypedFormControl, UntypedFormGroup, Validators
} from '@angular/forms'

import { TimePickerComponent } from '../shared/'
import {
  FieldReportService, FieldReportStatusType, InstallableService, LogService, RangerService, SettingsService,
  SettingsType
} from '../shared/services/'
//import { Color } from '@angular-material-components/color-picker';
//import { ThemePalette } from '@angular/material/core';
import { ColorEditor } from './color-editor.component'
//import { MoodEditor } from './mood-editor.component'
//import { MoodRenderer } from './mood-renderer.component'

@Component({
    selector: 'rangertrak-settings',
    templateUrl: './settings.component.html',
    styleUrls: ['./settings.component.scss'],
    providers: [SettingsService],
    standalone: false
})
export class SettingsComponent implements OnInit, OnDestroy {
  @ViewChild('timePicker') timePicker: any; // https://blog.angular-university.io/angular-viewchild/

  private id = 'Settings Component'
  title = 'Application Settings'
  pageDescr = `Set various defaults and values for use in the program`

  private settingsSubscription!: Subscription
  public settings!: SettingsType

  public settingsEditorForm!: UntypedFormGroup
  //  public leaflet!: FormGroup
  //  public google!: FormGroup

  // Get time events from <timepicker> component
  private timeSubscriptionStart$!: Subscription
  private timeSubscriptionEnd$!: Subscription
  public time!: Date
  dateCtrl = new UntypedFormControl(new Date())
  timepickerFormControlStart!: UntypedFormControl
  timepickerFormControlEnd!: UntypedFormControl

  opPeriodStart = new Date()
  opPeriodEnd = new Date()
  timePickerLabelStart = 'Operational Period Start Time'
  timePickerLabelEnd = 'Operational Period End Time'
  imgDir = "./assets/imgs/"  //! NOTE: Hardcoded, not possible to edit & potential security risk?!

  private gridApi: any
  private gridColumnApi: any
  rowData: FieldReportStatusType[] = []






  /*
  colorCtr: AbstractControl = new FormControl(new Color(255, 243, 200), [Validators.required])
  //colorCtr: string = new FormControl(new Color(255, 243, 0), [Validators.required])
  colorCntlDisabled = false
  touchUi = false
  public color: ThemePalette = 'primary';
*/

  // https://www.ag-grid.com/angular-data-grid/grid-interface/#grid-options-1
  // https://www.ag-grid.com/javascript-data-grid/row-styles/#highlighting-rows-and-columns
  gridOptions = {
    //suppressRowHoverHighlight: true, // turn OFF row hover, default:on
    //columnHoverHighlight: true, // turn ON column hover, default: off
  }// rowSelection: "multiple"}

  defaultColDef: ColDef = {
    flex: 1, //https://ag-grid.com/angular-data-grid/column-sizing/#column-flex
    minWidth: 30,
    editable: true,
    singleClickEdit: true,
    resizable: true,
    sortable: true,
    filter: true,
    //floatingFilter: true
  }

  //? FUTURE: Consider replacing "Color" with "CSS_Style" to allow more options?
  columnDefs = [
    {
      headerName: "Status", field: "status", flex: 50,
      cellStyle: (params: { value: string; }) => {
        let stat = this.rowData.find(el => el.status == params.value)
        return { 'background-color': `${stat ? stat.color : '#A3A3A3'}` }
        // for (let i = 0; i < this.rowData.length; i++) {
        //   if (params.value === this.rowData[i].status) {
        //     return { backgroundColor: this.rowData[i].color }
        //   }
        // }
        // return null
      }
    },
    {
      headerName: "Color", field: "color", tooltipField: "enter a color name or 3 letter code",
      cellStyle: (params: { value: string; }) => {
        //  this.log.verbose(`editor returned: ${params.value}`)
        // TODO: typically the colorPicker only should stay up while hovered over...we have to click away because????

        let newColor = params.value
        //params.node.data.color = newColor
        //params.api.rowModel.rowsToDisplay[1].data.color
        // params.api.rowRenderer.allRowCtrls[1].rowNode.data.color
        // params.rowIndex = 3
        // params.value = "6e6970"
        // params.node.data.color
        // params.node.data.status = "Objective Update"
        // params.node.id = 3
        // TODO: force row redraw with new color...
        // https://www.ag-grid.com/angular-data-grid/data-update-single-row-cell/#view-refresh
        // see https://www.ag-grid.com/javascript-data-grid/row-styles/#refresh-of-styles

        /*
        <div comp-id="39" style="transform: translateY(123px); height: 41px;" row-index="3" aria-rowindex="5" class="ag-row-odd ag-row ag-row-level-0 ag-row-position-absolute ag-row-focus ag-row-not-inline-editing" role="row" row-id="3">

        <div comp-id="52" class="ag-cell-value ag-cell ag-cell-not-inline-editing ag-cell-normal-height" aria-colindex="1" tabindex="-1" col-id="status" role="gridcell" style="left: 0px; width: 239.011px; background-color: aqua;">Objective Update</div>

        <div comp-id="53" class="ag-cell-value ag-cell ag-cell-not-inline-editing ag-cell-normal-height ag-cell-focus" aria-colindex="2" tabindex="-1" col-id="color" role="gridcell" style="left: 239.011px; width: 359px; background-color: rgb(255, 64, 0);">ff4000</div>
        </div>
        */

        //  params => params.api.getValue("result", params.node) < 60,

        /* indices: Array<number> = [1,4,5]; // color these rows

gridOptions.getRowStyle = (params) => { // should use params, not indices in the first braces. Binds the component to this. Can use indices in the function now
    if (this.indices.includes(params.node.rowIndex)) {
        return { background: 'red' }
    }
}
*/
        // https://www.ag-grid.com/javascript-data-grid/row-styles/
        // https://www.ag-grid.com/angular-data-grid/accessing-data/
        // https://www.ag-grid.com/angular-data-grid/accessing-data/#example-using-for-each
        // https://www.ag-grid.com/angular-data-grid/data-update-single-row-cell/
        // https://www.ag-grid.com/javascript-data-grid/row-selection/
        // https://blog.ag-grid.com/how-to-get-the-data-of-selected-rows-in-ag-grid/
        // https://angular-get-selected-rows.stackblitz.io

        //let row = this.getSelectedRowData()
        //setData

        // iterate through every node in the grid
        //let rowNode:any //Cannot redeclare block-scoped variable 'rowNode'
        /*this.gridApi.forEachNode((rowNode: { data: string; }, index: any) => {
          this.log.verbose('node ' + rowNode.data + ' is in the grid');
        });
*/
        //this.getRowNodeId = data => data.id;
        // get the row node with ID 55
        //      const rowNode = this.gridApi.getRowNode('55');

        // do something with the row, e.g. select it
        //    rowNode.setSelected(true);
        //   let meRow = this.gridApi.getRowNode()
        //rowNode.setData
        //const setData = (data: any) //=> void;

        //params.value = ("444" + newColor + "kkkk")

        //this.gridApi.refreshCells() -- breaks things!
        this.refreshStatusGrid()
        return { backgroundColor: newColor }
      },
      //cellRenderer: ColorRenderer,
      cellEditor: ColorEditor, // new ColorEditor(255,0,100)
      cellEditorPopup: true,
      editable: true,
      width: 300,
    }
    //REVIEW: No need for ICONS associated with statuses, is there? They should be associated with Callsign/Team, etc: Or are these the interior icon WITHIN the marker?!
    /*  {
        headerName: "Icon", field: "icon",
        cellRenderer: MoodRenderer,
        cellEditor: MoodEditor,
        cellEditorPopup: true,
        editable: true,
        width: 300,
      } //, minWidth: "25px" }
  */
  ]

  isInstallable = false

  fonts = ["'Open Sans'", "Montserrat", "Roboto", "'Playfair Display'", "Lato", "Merriweather", "Helvetica", "Lora", "'PT Serif'", "Spectral", "'Times New Roman'", "'Akaya Telivigala'",
    "'Open Sans Condensed'", "'Saira Extra Condensed'", "Boogaloo", "Anton", "'Faster One'", "'Arima Madurai'"]  //, "'Material Icons'"]  all loaded in Index.html
  // https://en.wikipedia.org/wiki/Pangram
  pangrams = ["Pack my box with five dozen liquor jugs",
    "The quick brown fox jumps over the lazy dog",
    "Glib jocks quiz nymph to vex dwarf.",
    "Sphinx of black quartz, judge my vow.",
    "How vexingly quick daft zebras jump!",
    "The five boxing wizards jump quickly.",
    "Jackdaws love my big sphinx of quartz."]
  pangram

  constructor(
    private fb: UntypedFormBuilder,
    /*  No suitable injection token for parameter 'fb' of class 'SettingsComponent'.
      Consider using the @Inject decorator to specify an injection token.(-992003)
      settings.component.ts(155, 17): This type does not have a value, so it cannot be used as injection token.
    */
    //private fieldReportService: FieldReportService,
    private installableService: InstallableService,
    private log: LogService,
    //private rangerService: RangerService,
    private settingsService: SettingsService,
    @Inject(DOCUMENT) private document: Document) {
    this.log.verbose('======== Constructor() ============', this.id)

    this.settingsSubscription = this.settingsService.getSettingsObserver().subscribe({
      next: (newSettings) => {
        this.log.excessive(`Received new Settings via subscription: ${JSON.stringify(newSettings)}`, this.id)
        this.settings = newSettings

        // reset form based on new settings...
        this.settingsEditorForm = this.getFormArrayFromSettingsArray()!

        this.opPeriodStart = this.settings.opPeriodStart
        this.opPeriodEnd = this.settings.opPeriodEnd
        this.log.excessive('Received new Settings via subscription.', this.id)
      },
      error: (e) => this.log.error('Settings Subscription got:' + e, this.id),
      complete: () => this.log.info('Settings Subscription complete', this.id)
    })

    // timeSubscription1$ =
    //timeSubscription2$ =

    if (installableService.installableEvent) {
      this.isInstallable = true
    }

    this.pangram = this.getPangram()
    //this.log.verbose('Settings set to static values. But not initialized???', this.id)
  }

  ngOnInit(): void {
    if (this.settings == undefined) {
      this.log.warn('Settings need to be initialized, in ngOnInit.', this.id)
    } else {
      this.rowData = this.settings.fieldReportStatuses
      this.log.verbose(`Application: ${this.settings.application} -- Version: ${this.settings.version}`, this.id)
    }

    if (window.isSecureContext) {
      this.log.verbose(`Application running in secure context`, this.id)

      // https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/encrypt
      // https://github.com/mdn/dom-examples/blob/main/web-crypto/encrypt-decrypt/index.html
      // https://info.townsendsecurity.com/rsa-vs-aes-encryption-a-primer

      // https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts
      // Page is a secure context so service workers are now available
      //navigator.serviceWorker.register("/offline-worker.js").then(() => {  ...  })
    }

    this.settingsEditorForm = this.getFormArrayFromSettingsArray()!
    //this.leaflet = this.settingsEditorForm.value.leaflet
    //this.google = this.settingsEditorForm.value.google

    // BUG: Why is this new TIME activity in LOCATION function!!!
    // BUG: Duplicated in time-picker.component - as locationFrmGrp is there...
    // new values here bubble up as emitted events - see onNewLocation()
    // this.timepickerFormControlStart = this._formBuilder.control(
    //   new Date()
    // ) // TODO: Don't need new!

    this.log.verbose("ngInit done ", this.id)
  }

  onNewTimeEventStart(newTime: Date) {
    if (!this.settings) {
      this.log.error(`this.settings is null at onNewTimeEventStart`, this.id)
      return
    }
    // Based on listing 8.8 in TS dev w/ TS, pg 188
    this.log.verbose(`Got new start OpPeriod time: ${(newTime)}`, this.id)
    this.settings.opPeriodStart = newTime
    this.opPeriodStart = newTime

    this.settingsEditorForm.patchValue({ timepickerFormControlStart: newTime })
    this.settingsEditorForm.patchValue({ opPeriodStart: newTime })
    //opPeriodStart: this.settingsEditorForm.value.opPeriodStart,
    // This then automatically gets sent to (any) children via their @Input statements
    // TODO: Might we need to update the form itself, so 'submit' captures it properly?
    // TODO: BUT, we still need to update our local copy:
    //this.timepickerFormControl is where the Event comes up from...
  }

  onNewTimeEventEnd(newTime: Date) {
    if (!this.settings) {
      this.log.error(`this.settings is null at onNewTimeEventEnd`, this.id)
      return
    }
    // Based on listing 8.8 in TS dev w/ TS, pg 188
    this.log.verbose(`Got new end OpPeriod time: ${newTime}`, this.id)
    this.settings.opPeriodEnd = newTime
    this.opPeriodEnd = newTime
    this.settingsEditorForm.patchValue({ timepickerFormControlEnd: newTime })
    this.settingsEditorForm.patchValue({ opPeriodEnd: newTime })

    // This then automatically gets sent to (any)) children via their @Input statements
    // TODO: Might we need to update the form itself, so 'submit' captures it properly?
    // TODO: BUT, we still need to update our local copy:
    //this.timepickerFormControl is where the Event comes up from...
  }

  onInstallBtn() {
    this.log.verbose(`onInstallBtn: Install Application!`, this.id)
    //!BUG: Unimplemented!!!
  }

  onBtnResetDefaults() {
    this.log.verbose(`onBtnResetDefaults: Reset Settings.`, this.id)
    this.settings = this.settingsService.ResetDefaults() // need to refresh page?!
    //this.reloadPage_unused()
  }

  /**
   * Transforms Settings Array into Form Array
   * TODO: Rename to InitSettingsForm()
   * REVIEW: Do we need a version like entry.component.ts's resetSettingsForm()?
   */
  getFormArrayFromSettingsArray() {
    this.log.verbose("running getFormArrayFromSettingsArray()", this.id)

    if (!this.settings) {
      this.log.error(`this.settings is null at getFormArrayFromSettingsArray`, this.id)
      return
    }

    // NOTE: Form array differs some from SettingsType so need to translate back & forth
    return this.fb.group({
      settingsName: [this.settings.settingsName], // FUTURE: Use if people want to load and saveas, or have various 'templates'
      settingsDate: [this.settings.settingsDate], // when last edited... // not shown for editing

      mission: [this.settings.mission],
      event: [this.settings.event],
      eventNotes: [this.settings.eventNotes],
      opPeriod: [this.settings.opPeriod],

      opPeriodStart: [this.settings.opPeriodStart],
      opPeriodEnd: [this.settings.opPeriodEnd],
      timepickerFormControlStart: [this.settings.opPeriodStart],
      timepickerFormControlEnd: [this.settings.opPeriodEnd],

      application: [this.settings.application], // not shown for editing
      version: [this.settings.version], // not shown for editing
      debugMode: [this.settings.debugMode],

      defLat: [this.settings.defLat, Validators.required],
      defLng: [this.settings.defLng, Validators.required],
      defPlusCode: [this.settings.defPlusCode],
      w3wLocale: [this.settings.w3wLocale],
      allowManualPinDrops: [this.settings.allowManualPinDrops],

      leaflet: this.fb.group({
        defZoom: [this.settings.leaflet.defZoom], //, Validators.min(3), Validators.max(21)], //https://www.concretepage.com/angular-2/angular-4-min-max-validation  // or just zoom to bounds?
        markerScheme: [this.settings.leaflet.markerScheme],
        overviewDifference: [this.settings.leaflet.overviewDifference],
        overviewMinZoom: [this.settings.leaflet.overviewMinZoom],
        overviewMaxZoom: [this.settings.leaflet.overviewMaxZoom]
      }),

      google: this.fb.group({
        defZoom: [this.settings.google.defZoom], //, Validators.min(3), Validators.max(21)], //https://www.concretepage.com/angular-2/angular-4-min-max-validation    // or just zoom to bounds?
        markerScheme: [this.settings.google.markerScheme],
        overviewDifference: [this.settings.google.overviewDifference],
        overviewMinZoom: [this.settings.google.overviewMinZoom],
        overviewMaxZoom: [this.settings.google.overviewMaxZoom]
      }),

      imageDirectory: [this.settings.imageDirectory],
      defFieldReportStatus: [this.settings.defFieldReportStatus],
      fieldReportStatuses: [this.settings.fieldReportStatuses]
      // fieldReportKeywords: string[],  // Future...could also just search notes field
    })
  }

  /**
   * Transform back from Form Array to Settings Array that SettingsService can save
   *
   * @returns
   */
  getSettingsArrayFromFormArray() { //}: SettingsType { // Can't do with !this.settings guard...
    this.log.verbose("getSettingsArrayFromFormArray", this.id)

    if (!this.settings) {

      this.log.error(`this.settings is null`, this.id)
      return null
    }

    //  this.log.error(`Saving: opPeriodStart = ${this.settingsEditorForm.value.opPeriodStart},
    //  opPeriodEnd = ${this.settingsEditorForm.value.opPeriodEnd}`, this.id)

    return {
      settingsName: this.settingsEditorForm.value.settingsName, // FUTURE: Use if people want to load and saveas, or have various 'templates'
      settingsDate: this.settingsEditorForm.value.settingsDate, // when last edited... // not shown for editing

      mission: this.settingsEditorForm.value.mission,
      event: this.settingsEditorForm.value.event,
      eventNotes: this.settingsEditorForm.value.eventNotes,
      opPeriod: this.settingsEditorForm.value.opPeriod,
      opPeriodStart: this.settingsEditorForm.value.opPeriodStart,
      opPeriodEnd: this.settingsEditorForm.value.opPeriodEnd,

      application: this.settingsEditorForm.value.application, // not shown for editing
      version: this.settingsEditorForm.value.version, // not shown for editing
      debugMode: this.settingsEditorForm.value.debugMode,

      defLat: this.settingsEditorForm.value.defLat,
      defLng: this.settingsEditorForm.value.defLng,
      defPlusCode: this.settingsEditorForm.value.defPlusCode,
      w3wLocale: this.settingsEditorForm.value.w3wLocale,
      allowManualPinDrops: this.settingsEditorForm.value.allowManualPinDrops,

      google: {
        defZoom: this.settingsEditorForm.value.google.defZoom, //, Validators.min(3), Validators.max(21), //https://www.concretepage.com/angular-2/angular-4-min-max-validation    // or just zoom to bounds?
        markerScheme: this.settingsEditorForm.value.google.markerScheme,
        overviewDifference: this.settingsEditorForm.value.google.overviewDifference,
        overviewMinZoom: this.settingsEditorForm.value.google.overviewMinZoom,
        overviewMaxZoom: this.settingsEditorForm.value.google.overviewMaxZoom
      },

      leaflet: {
        defZoom: this.settingsEditorForm.value.leaflet.defZoom, //, Validators.min(3), Validators.max(21), //https://www.concretepage.com/angular-2/angular-4-min-max-validation  // or just zoom to bounds?
        markerScheme: this.settingsEditorForm.value.leaflet.markerScheme,
        overviewDifference: this.settingsEditorForm.value.leaflet.overviewDifference,
        overviewMinZoom: this.settingsEditorForm.value.leaflet.overviewMinZoom,
        overviewMaxZoom: this.settingsEditorForm.value.leaflet.overviewMaxZoom
      },
      imageDirectory: this.imgDir,  //! SECURITY: BUGBUG: Hardcoded image directory: should this be confidential/encrypted for security?
      defFieldReportStatus: this.settingsEditorForm.value.defFieldReportStatus,
      fieldReportStatuses: this.settingsEditorForm.value.fieldReportStatuses
      // fieldReportKeywords: string[],  // Future...could also just search notes field
    }
  }

  onGridReady = (params: any) => {
    this.log.verbose(" onGridReady", this.id)

    this.gridApi = params.api
    this.gridColumnApi = params.columnApi

    this.refreshStatusGrid()
    //https://ag-grid.com/angular-data-grid/column-sizing/#example-default-resizing // TODO: use this line, or next routine?!
  }

  onFirstDataRendered(params: any) {
    this.refreshStatusGrid() // REVIEW: needed???
  }

  onBtnAddFRStatus() {
    this.rowData.push({ status: 'New Status', color: '', icon: '' })
    this.refreshStatusGrid()
    this.log.verbose(`Reloading window!`, this.id)
    this.reloadPage()
  }

  refreshStatusGrid() {
    if (this.gridApi) {
      this.gridApi.refreshCells()
      this.gridApi.sizeColumnsToFit();
    } else {
      this.log.verbose("no this.gridApi yet in refreshStatusGrid()", this.id)
    }
    // this.log.verbose(`Reloading window!`, this.id)
    //window.location.reload() -- reloads endlessly!
    // TODO: try   getSelectedRowData() & then refresh row color instead - set color by row, vs cell
    /*
     async delayedAction() {
    this.dbug("resetMap");
    await this.sleep(2000);  // use delay(2000) instead
    this.dbug("resetMap has slept");
    this.filterLeafletMap();
    this.dbug("resetMap complete");
  }

  this.util.sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  */
  }

  // https://angular-get-selected-rows.stackblitz.io
  getSelectedRowData() {
    let selectedNodes = this.gridApi.getSelectedNodes();
    //let selectedData = selectedNodes.map(node => node.data);
    //alert(`Selected Nodes:\n${JSON.stringify(selectedData)}`);
    //      return selectedData;
  }

  reloadPage() {
    //REVIEW: Does this zap existing changes elsewhere on the page (used for reseting field statuses..)
    this.log.verbose(`Reloading window!`, this.id)
    window.location.reload()
  }

  //TODO: If user edits field report status color, need to update background: refreshCells()????
  onFormSubmit(): void {
    this.log.verbose("onFormSubmit: Update Settings...", this.id)
    let newSettings: SettingsType = this.getSettingsArrayFromFormArray()!
    this.settingsService.updateSettings(newSettings)

    // TODO: If Debug disabled then call:
    //enableProdMode()
    this.log.verbose(`onFormSubmit: Reloading window!`, this.id)
    this.reloadPage()
  }

  //TODO: Use Utility functions with same name...
  displayHide(htmlElementID: string) {
    let e = this.document.getElementById(htmlElementID)
    if (e) {
      e.style.visibility = "hidden";
    }
  }

  displayShow(htmlElementID: string = 'settings__ColorChart-img') {
    let e = this.document.getElementById(htmlElementID)
    if (e) {
      e.style.visibility = "visible";
    }
  }
  getPlatform() {
    // TODO:
    this.log.error("getPlatform: UNIMPLEMENTED", this.id)
    // https://material.angular.io/cdk/platform/overview
  }

  getPangram() {
    return this.pangrams[Math.floor(Math.random() * this.pangrams.length)]
  }

  ngOnDestroy() {
    this.settingsSubscription?.unsubscribe()
    this.timeSubscriptionStart$?.unsubscribe()
    this.timeSubscriptionEnd$?.unsubscribe()
  }
}
