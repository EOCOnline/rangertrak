// We store app settings/preferences per user & per browser into IndexedDB,
// using a wrapper modeled on the much simpler LocalStorage API

// FROM: @ngx-pwa/local-storage  angular-async-local-storage-main\projects\demo\src\app\app.components.ts
// Doc & package: https://github.com/cyrilletuzi/angular-async-local-storage
// @see doc on IndexedDB {@link https://developer.chrome.com/docs/devtools/storage/indexeddb/}

import { Component, OnInit } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, mergeMap, toArray } from 'rxjs/operators';
// import { LocalStorage, StorageMap, JSONSchema } from '@ngx-pwa/local-storage';

import { Team, TeamService } from '../shared/services/';
//import * as F from '@angular/forms';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { AgGridModule } from 'ag-grid-angular';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

interface Data {
  title: string;
}

@Component({
  selector: 'rangertrak-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
  providers: [TeamService]  // TODO: Team,
})


export class SettingsComponent implements OnInit {

  static DEF_LAT = 47.4472
  static DEF_LONG = -122.4627  // Vashon EOC!
  static DEF_PCODE = '84VVCGWP+VW' // or "CGWP+VX Vashon, Washington" = 47.447187,-122.462688
  static locale_Name = "Vashon, WA"
  static version = '11.0.0'

  settingsEditorForm!: FormGroup;

  private gridApi: any;
  private gridColumnApi: any;

  // private defaultColDef;

  shapes = [
    'Circle',
    'Star',
    'Square',
    'shape4',
    'shape5'
  ]

  columns = [
    { field: "name" },
    { field: "icon" },
    { field: "color" },
    { field: "fillColor" },
    { field: "shape", cellEditor: 'agSelectCellEditor', cellEditorParams: { values: this.shapes } },
    { field: "note" }
  ];

  //icons: <fa-icon [icon]="faMapMarkedAlt"></fa-icon>

  // Marker uses icons; Circle uses color + fillColor; Note is for user's notes
  teams = [
    { name: "T1", icon: "T1.png", color: 'Magenta', fillColor: 'grey', shape: this.shapes[1], note: "" },
    { name: "T2", icon: "T2.png", color: 'Green', fillColor: 'blue', shape: this.shapes[2], note: "" },
    { name: "Other", icon: "Other.png", color: 'Yellow', fillColor: '#f03', shape: this.shapes[2], note: "" }
  ];

  mySettings // : Settings;


  constructor(
    teamService: TeamService,
    private fb: FormBuilder) {
    this.mySettings = teamService.getTeams()
  }


  ngOnInit(): void {
    console.log("settings loaded at ", Date())
    console.log("Version: " + this.Version())

    // TODO: Optionally deserialize values from LocalStorage
    this.settingsEditorForm = this.fb.group({
      latitude: [SettingsComponent.DEF_LAT, Validators.required],
      longitude: [SettingsComponent.DEF_LONG, Validators.required],
      plusCode: [SettingsComponent.DEF_PCODE],
      logToPanel: ['yes'], // null or blank for unchecked
      logToConsole: ['check'], // null or blank for unchecked
      markerSize: ['5'],
      markerShape: [1, Validators.required],
      notes: []
    })

    //this.displayTeamGrid();
    console.log("settings completed at ", Date())
  }

  //this.teams = GetTeams ()=>{



  // https://www.ag-grid.com/angular-data-grid/printing/
  onBtPrinterFriendly() {
    // Printer Friendly Layout
    var eGridDiv = document.querySelector('#teamGrid');
    // eGridDiv.style.width = '';
    // eGridDiv.style.height = '';
    this.gridApi.setDomLayout('print');
  }

  onBtNormal() {
    // Normal Layout
    var eGridDiv = document.querySelector('#teamGrid');
    // eGridDiv.style.width = '400px';
    // eGridDiv.style.height = '200px';
    this.gridApi.setDomLayout(null);
  }

  onGridReady(params: any) {
    this.gridApi = params.api;
    this.gridColumnApi = params.columnApi;
  }

  exportDataAsCsv(
    //params?: CsvExportParams
    //https://www.ag-grid.com/angular-data-grid/grid-api/#reference-export-exportDataAsCsv
  ): void {
    //TODO: Not implemented!
  }



  // TODO: simple test - remove me!
  updateDefaults() {
    SettingsComponent.DEF_LAT = 47.46
    SettingsComponent.DEF_LONG = -122.6
  }

  cancel() { };  //TODO:

  Version() {
    return SettingsComponent.version
  }

  get keywordsControls(): any {
    return (<FormArray>this.settingsEditorForm.get('keywords')).controls;
  }

  onFormSubmit(): void {
    const formData = this.settingsEditorForm.value
    console.log(formData)
    // TODO: Serialize values to LocalStorage
  }




  /* https://www.pluralsight.com/guides/using-formbuilder-in-angular
    You can define the control with just the initial value, but if your controls need sync or async validation, add sync and async validators as the second and third items in the array.
  */
  //private fb = new FormBuilder();  // FormControl = atomic 'input'-like widget

  /*
  : FormGroup; //
  whereFormModel: FormGroup;
  whenFormModel: FormGroup;
  whatFormModel: F.FormGroup;
  */


}
