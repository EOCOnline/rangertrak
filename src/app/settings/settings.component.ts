import { DOCUMENT } from '@angular/common'
import { Component, enableProdMode, Inject, OnInit } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { FieldReportService, FieldReportStatusType, LogService, RangerService, SettingsService, SettingsType } from '../shared/services/'
import { AgGridModule } from 'ag-grid-angular'
//import { Color } from '@angular-material-components/color-picker';
//import { ThemePalette } from '@angular/material/core';
import { ColorEditor } from './color-editor.component';
import { MoodEditor } from './mood-editor.component';
import { MoodRenderer } from './mood-renderer.component';
import { ColDef } from 'ag-grid-community';

@Component({
  selector: 'rangertrak-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
  //providers: [SettingsService]
})
export class SettingsComponent implements OnInit {
  private id = 'Settings Component'
  settings: SettingsType
  settingsEditorForm!: FormGroup

  private gridApi: any
  private gridColumnApi: any
  rowData: FieldReportStatusType[] = []
  public eventInfo = ''

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

  columnDefs = [
    {
      headerName: "Status", field: "status", flex: 50,
      cellStyle: (params: { value: string; }) => {
        for (let i = 0; i < this.rowData.length; i++) {
          if (params.value === this.rowData[i].status) {
            return { backgroundColor: this.rowData[i].color }
          }
        }
        return null
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
  ];
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
    private fb: FormBuilder,
    /*  No suitable injection token for parameter 'fb' of class 'SettingsComponent'.
      Consider using the @Inject decorator to specify an injection token.(-992003)
      settings.component.ts(155, 17): This type does not have a value, so it cannot be used as injection token.
    */
    private fieldReportService: FieldReportService,
    private log: LogService,
    private rangerService: RangerService,
    private settingsService: SettingsService,
    @Inject(DOCUMENT) private document: Document) {
    this.pangram = this.getPangram()
    //this.settings = settingService()
    this.eventInfo = `Event: ; Mission: ; Op Period: ; Date ${Date.now}`
    this.settings = SettingsService.Settings // only using static functions/values from the service...
    this.log.verbose('Settings set to static values. But not initialized???', this.id)
  }

  ngOnInit(): void {
    if (this.settings == undefined) {
      this.log.warn('Settings need to be initialized.', this.id)
      // TODO: SettingsService.ResetDefaults()
    } else {
      this.log.verbose(`Application: ${this.settings.application} -- Version: ${this.settings.version}`, this.id)
    }

    this.settingsEditorForm = this.getFormArrayFromSettingsArray()
    this.rowData = this.settingsService.getFieldReportStatuses()

    this.log.verbose("ngInit done ", this.id)
  }

  onBtnResetDefaults() {
    this.settingsService.ResetDefaults() // need to refresh page?!
    this.rowData = this.settingsService.ResetFieldReportStatusDefaults()
  }

  // TODO: Need different settings stored for gMap, lMap and miniMap
  getFormArrayFromSettingsArray() {
    this.log.verbose(" getFormArrayFromSettingsArray", this.id)

    // NOTE: Form array differs some from SettingsType so need to translate back & forth
    return this.fb.group({
      application: [this.settings.application], // not shown for editing
      version: [this.settings.version], // not shown for editing
      id: [this.settings.id],
      name: [this.settings.name],
      note: [this.settings.note],
      latitude: [this.settings.defLat, Validators.required],
      longitude: [this.settings.defLng, Validators.required],

      zoom: [this.settings.defZoom], //, Validators.min(3), Validators.max(21)], //https://www.concretepage.com/angular-2/angular-4-min-max-validation

      plusCode: [this.settings.defPlusCode],
      w3wLocale: [this.settings.w3wLocale],
      markerSize: [this.settings.markerSize],
      markerShape: [this.settings.markerShape, Validators.required],
      defRangerStatus: [this.settings.defRangerStatus],
      allowManualPinDrops: [this.settings.allowManualPinDrops],
      debugMode: [this.settings.debugMode],
      logToPanel: [this.settings.logToPanel], // null or blank for unchecked 'yes'
      logToConsole: [this.settings.logToConsole], // null or blank for unchecked 'check'
    })

  }

  getSettingsArrayFromFormArray(): SettingsType {
    return {
      application: this.settingsEditorForm.value.application as string,
      version: this.settingsEditorForm.value.version as string,
      id: this.settingsEditorForm.value.id as number,
      name: this.settingsEditorForm.value.name as string,
      note: this.settingsEditorForm.value.note as string,
      defLat: this.settingsEditorForm.value.latitude as number,
      defLng: this.settingsEditorForm.value.longitude as number,
      defZoom: this.settingsEditorForm.value.zoom as number,
      defPlusCode: this.settingsEditorForm.value.plusCode as string,
      w3wLocale: this.settingsEditorForm.value.w3wLocale as string,
      markerSize: this.settingsEditorForm.value.markerSize as number,
      markerShape: this.settingsEditorForm.value.markerShape as number,
      defRangerStatus: this.settingsEditorForm.value.defRangerStatus as number,
      allowManualPinDrops: this.settingsEditorForm.value.allowManualPinDrops as boolean,
      debugMode: this.settingsEditorForm.value.debugMode as boolean,
      logToPanel: this.settingsEditorForm.value.logToPanel as boolean,
      logToConsole: this.settingsEditorForm.value.logToConsole as boolean,
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
    // this.refreshStatusGrid() needed???
  }

  onBtnAddFRStatus() {
    this.rowData.push({ status: 'New Status', color: '', icon: '' })
    this.refreshStatusGrid()
    window.location.reload()
  }

  refreshStatusGrid() {
    if (this.gridApi) {
      this.gridApi.refreshCells()
      this.gridApi.sizeColumnsToFit();
    } else {
      this.log.verbose("no this.gridApi yet in refreshStatusGrid()", this.id)
    }
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

  reloadPage_unused() {
    //REVIEW: Does this zap existing changes elsewhere on the page (used for reseting field statuses..)
    window.location.reload()
  }

  //TODO: If user edits field report status color, need to update background: refreshCells()????
  onFormSubmit(): void {
    this.log.verbose("Update Settings...", this.id)
    let newSettings: SettingsType = this.getSettingsArrayFromFormArray()
    this.settingsService.Update(newSettings)

    this.log.verbose(`Update FieldReportStatuses... ${JSON.stringify(this.rowData)}`)
    this.settingsService.updateFieldReportStatus(this.rowData)

    // TODO: Set this up as an observable, or Components that have ALREADY pulled down the values won't refresh them!!!!
    // TODO: If Debug disabled then call:
    //enableProdMode()
    window.location.reload()
  }

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
    // https://material.angular.io/cdk/platform/overview
  }

  getPangram() {
    return this.pangrams[Math.floor(Math.random() * this.pangrams.length)]
  }
}
