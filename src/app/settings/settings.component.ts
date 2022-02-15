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
export class SettingsComponent implements OnInit {
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
  gridOptions = {}// rowSelection: "multiple"}

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
    { headerName: "Color", field: "color", tooltipField: "enter a color name or 3 letter code",

    cellStyle: (params: { value: string; }) => {
      return { backgroundColor: params.value}},

      //cellRenderer: ColorRenderer,
      cellEditor: ColorEditor,
      cellEditorPopup: true,
      editable: true,
      width: 300,
  },
    {
      headerName: "Icon", field: "icon",

      cellRenderer: MoodRenderer,
      cellEditor: MoodEditor,
      cellEditorPopup: true,
      editable: true,
      width: 300,

    } //, minWidth: "25px" }
  ];


  constructor(
    private fb: FormBuilder,
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

  onBtnResetDefaults() {
    SettingsService.ResetDefaults()
  }

  // TODO: Need different settings stored for gMap, lMap and miniMap
  getFormArrayFromSettingsArray() {
    //console.log("into getFormArrayFromSettingsArray at ", Date())

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
}
