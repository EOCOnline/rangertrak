import { DOCUMENT } from '@angular/common'
import { Component, enableProdMode, Inject, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { FieldReportService, RangerService, SettingsService, SettingsType } from '../shared/services/'
import { AgGridModule } from 'ag-grid-angular'
import { FieldReportStatusType } from '../shared/services/settings.service';

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

  constructor(
    private fb: FormBuilder,
    private fieldReportService: FieldReportService,
    private rangerService: RangerService,
    private settingsService: SettingsService,
    @Inject(DOCUMENT) private document: Document) {

    //this.settings = settingService()
    this.settings = SettingsService.Settings // only using static functions/values from the service...
    console.log('Application Settings set to static values. But not initialized???')

    // TODO: Initial attempt of using a table to edit FieldReportStatuses
    // this.columns = ["Name", "Address", "Salary", "IsActive", "Delete"];
    //this.employeeForm= this.createTableRow()
  }

  ngOnInit(): void {
    if (this.settings == undefined) {
      console.log('WARN: Application Settings need to be initialized.')
      // TODO: SettingsService.ResetDefaults()
    } else {
      console.log(`SettingsComponent: Application: ${this.settings.application} -- Version: ${this.settings.version}`)
    }

    this.settingsEditorForm = this.getFormArrayFromSettingsArray()

    this.getFieldReportStatuses()
    //console.log("settings component ngInit done at ", Date())
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

      /* REVIEW: Following line gets:
        Error: Expected validator to return Promise or Observable.
        at toObservable (forms.mjs:797:15)
        at FormControl._runAsyncValidator (forms.mjs:2536:25)
        at FormControl.updateValueAndValidity (forms.mjs:2510:22)
        at new FormControl (forms.mjs:2888:14)
        at FormBuilder.control (forms.mjs:7188:16)
        at FormBuilder._createControl (forms.mjs:7225:25)
        at forms.mjs:7212:42
        at Array.forEach (<anonymous>)
        at FormBuilder._reduceControls (forms.mjs:7211:37)
        at FormBuilder.group (forms.mjs:7145:31)
      */
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

  getFieldReportStatuses() {
    this.frs = this.settingsService.getFieldReportStatuses()
    this.rowData = this.frs

  }
  frs: FieldReportStatusType[] = []

  // https://www.ag-grid.com/angular-data-grid/grid-interface/#grid-options-1
  gridOptions = {}// rowSelection: "multiple"}

  defaultColDef = {
    flex: 1, //https://ag-grid.com/angular-data-grid/column-sizing/#column-flex
    minWidth: 50,
    editable: true,
    resizable: true,
    sortable: true,
    //filter: true,
    //floatingFilter: true
  }

  columnDefs = [
    //{ headerName: "Status", field: "status", headerTooltip: 'Enter  a status value' },
    {
      headerName: "Status", field: "status", minwidth: "75px", flex: 50,
      cellStyle: (params: { value: string; }) => {
        //this.fieldReportStatuses.forEach(function(value) { (params.value === value.status) ? { backgroundColor: value.color }  : return(null) }
        for (let i = 0; i < this.frs.length; i++) {
          if (params.value === this.frs[i].status) {
            return { backgroundColor: this.frs[i].color }
          }
        }
        return null
      }
    },
    { headerName: "Color", field: "color", tooltipField: "enter a color name or 3 letter code", minwidth: "25px"},
    { headerName: "Icon", field: "icon", minwidth: "25px"}
    //headerTooltip: 'Report date', valueGetter: this.myValueGetter},
    /*   {
         headerName: "Status", field: "status", flex: 50,
         cellStyle: (params: { value: string; }) => {
           //this.fieldReportStatuses.forEach(function(value) { (params.value === value.status) ? { backgroundColor: value.color }  : return(null) }
           for (let i = 0; i < this.fieldReportStatuses.length; i++) {
             if (params.value === this.fieldReportStatuses[i].status) {
               return { backgroundColor: this.fieldReportStatuses[i].color }
             }
           }
           return null
         }
         },
         */
  ];


  rowData: FieldReportStatusType[] = []

  myValueGetter = (params: { data: FieldReportStatusType }) => {
    let dt = 'unknown date'
    //let d: Date = params.data.date
    /*
    try {  // TODO: Use the date pipe instead?
      //weekday[d.getDay()] +
      dt = formatDate(d, 'M-dd HH:MM:ss', 'en-US')
      //console.log(`Day is: ${params.data.date.toISOString()}`)
    } catch (error: any) {
      dt = `Bad date format: Error name: ${error.name}; msg: ${error.message}`
    }
    */
    return dt
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


  // https://www.c-sharpcorner.com/article/creating-table-with-reactive-forms-in-angular-9-using-primeng-table2/
  useTableToEditFieldReportStatuses() {

  }
  /*
    employeeForm: FormGroup ;
    columns: string[]; // priming turbo table columns
    formBuilder = new FormBuilder
    /
   * Initializes the Form & by default adds an empty row to the PRIMENG TABLE
   *
    private createForm(): void {
      this.employeeForm = this.formBuilder.group({
        //tableRowArray is a FormArray which holds a list of FormGroups
        tableRowArray: this.formBuilder.array([
          this.createTableRow()
        ])
      })
    }

    **
     * Returns the FormGroup as a Table Row
     *
    private createTableRow(): FormGroup {
      return this.formBuilder.group({
        name: new FormControl(null, {
          validators: [Validators.required, Validators.minLength(3), Validators.maxLength(50)]
        }),
        address: new FormControl(null, {
          validators: [Validators.required, Validators.maxLength(500)]
        }),
        salary: new FormControl(null, {
          validators: [Validators.required, Validators.pattern(/^\d{1,6}(?:\.\d{0,2})?$/), Validators.minLength(3), Validators.maxLength(50)]
        }),
        isActive: new FormControl({
          value: true,
          disabled: true
        })
      });
    }

    get tableRowArray(): FormArray {
      return this.employeeForm.get('tableRowArray') as FormArray;
    }

    addNewRow(): void {
      this.tableRowArray.push(this.createTableRow());
    }

    onDeleteRow(rowIndex: number): void {
      this.tableRowArray.removeAt(rowIndex);
    }
  */

  onFormSubmit(): void {
    console.log("Update Application Settings...")
    let newSettings: SettingsType = this.getSettingsArrayFromFormArray()
    SettingsService.Update(newSettings)

    // TODO: Set this up as an observable, or Componts that have ALREADY pulled down the values won't refresh them!!!!

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
