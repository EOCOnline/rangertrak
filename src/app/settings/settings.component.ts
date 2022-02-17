import { DOCUMENT } from '@angular/common'
import { Component, enableProdMode, Inject, OnInit } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { FieldReportService, FieldReportStatusType, RangerService, SettingsService, SettingsType } from '../shared/services/'
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
class SettingsComponent implements OnInit {
  settings: SettingsType
  settingsEditorForm!: FormGroup

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
        //  console.log(`editor returned: ${params.value}`)
        debugger
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

        let row = this.getSelectedRowData()
        //setData

        // iterate through every node in the grid
        //let rowNode:any //Cannot redeclare block-scoped variable 'rowNode'
        /*this.gridApi.forEachNode((rowNode: { data: string; }, index: any) => {
          console.log('node ' + rowNode.data + ' is in the grid');
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

        params.value = ("444" + newColor + "kkkk")

        this.gridApi.refreshCells()
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
ri = 3.141;

  constructor(
    private fb: FormBuilder,
    /*  No suitable injection token for parameter 'fb' of class 'SettingsComponent'.
      Consider using the @Inject decorator to specify an injection token.(-992003)
      settings.component.ts(155, 17): This type does not have a value, so it cannot be used as injection token.
    */
    private fieldReportService: FieldReportService,
    private rangerService: RangerService,
    private settingsService: SettingsService,
    @Inject(DOCUMENT) private document: Document) {

    //this.settings = settingService()
    this.settings = SettingsService.Settings // only using static functions/values from the service...
    console.log('Application Settings set to static values. But not initialized???')
  }

  ngOnInit(): void {
    if (this.settings == undefined) {
      console.log('WARN: Application Settings need to be initialized.')
      // TODO: SettingsService.ResetDefaults()
    } else {
      console.log(`SettingsComponent: Application: ${this.settings.application} -- Version: ${this.settings.version}`)
    }

    this.settingsEditorForm = this.getFormArrayFromSettingsArray()
    this.rowData = this.settingsService.getFieldReportStatuses()

    console.log("settings component ngInit done at ", Date())
  }

  // https://angular-get-selected-rows.stackblitz.io
  getSelectedRowData() {
    let selectedNodes = this.gridApi.getSelectedNodes();
    //let selectedData = selectedNodes.map(node => node.data);
    //alert(`Selected Nodes:\n${JSON.stringify(selectedData)}`);
    //      return selectedData;
  }

  onBtnResetDefaults() {
    SettingsService.ResetDefaults()
  }

  // TODO: Need different settings stored for gMap, lMap and miniMap
  getFormArrayFromSettingsArray() {
    console.log("into getFormArrayFromSettingsArray at ", Date())

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
    console.log("Settings Form onGridReady")

    this.gridApi = params.api
    this.gridColumnApi = params.columnApi

    params.api.sizeColumnsToFit() //https://ag-grid.com/angular-data-grid/column-sizing/#example-default-resizing // TODO: use this line, or next routine?!
  }

  onFirstDataRendered(params: any) {
    params.api.sizeColumnsToFit();
    if (this.gridApi) {
      this.gridApi.refreshCells()
    } else {
      console.log("no this.gridApi yet in onFirstDataRendered()")
    }
  }

  onBtnAddFRStatus() {
    this.rowData.push({ status: 'New Status', color: '', icon: '' })

    if (this.gridApi) {
      this.gridApi.refreshCells()
    } else {
      console.log("no this.gridApi yet in onFirstDataRendered()")
    }
    this.gridApi.sizeColumnsToFit();
  }

  //TODO: If user edits field report status color, need to update background: refreshCells()????
  onFormSubmit(): void {
    console.log("Update Application Settings...")
    let newSettings: SettingsType = this.getSettingsArrayFromFormArray()
    SettingsService.Update(newSettings)

    console.log(`Update FieldReportStatuses... ${JSON.stringify(this.rowData)}`)
    this.settingsService.updateFieldReportStatus(this.rowData)

    // TODO: Set this up as an observable, or Components that have ALREADY pulled down the values won't refresh them!!!!
    // TODO: If Debug disabled then call:
    //enableProdMode()
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
}
