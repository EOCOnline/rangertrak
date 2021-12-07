// We store app settings/preferences per user & per browser into IndexedDB,
// using a wrapper modeled on the much simpler LocalStorage API

// FROM: @ngx-pwa/local-storage  angular-async-local-storage-main\projects\demo\src\app\app.components.ts
// Doc & package: https://github.com/cyrilletuzi/angular-async-local-storage
// @see doc on IndexedDB {@link https://developer.chrome.com/docs/devtools/storage/indexeddb/}

import { Component, OnInit } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, mergeMap, toArray } from 'rxjs/operators';
import { LocalStorage, StorageMap, JSONSchema } from '@ngx-pwa/local-storage';

import { DataService } from './data.service';
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
  styleUrls: ['./settings.component.scss']
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



  // Marker uses icons; Circle uses color + fillColor; Note is for user's notes
  teams = [
    { name: "T1", icon: "T1.png", color: 'Magenta', fillColor: 'grey', shape: this.shapes[1], note: "" },
    { name: "T2", icon: "T2.png", color: 'Green', fillColor: 'blue', shape: this.shapes[2], note: "" },
    { name: "T3", icon: "T3.png", color: 'Red', fillColor: 'yellow', shape: this.shapes[3], note: "" },
    { name: "T4", icon: "T4.png", color: 'Blue', fillColor: 'aqua', shape: this.shapes[4], note: "" },
    { name: "T5", icon: "T5.png", color: 'Violet', fillColor: '#f03', shape: this.shapes[5], note: "" },
    { name: "T6", icon: "T6.png", color: 'DodgerBlue', fillColor: '#f03', shape: this.shapes[1], note: "" },
    { name: "T7", icon: "T3.png", color: 'Red', fillColor: 'yellow', shape: this.shapes[3], note: "" },
    { name: "T8", icon: "T4.png", color: 'Blue', fillColor: 'aqua', shape: this.shapes[4], note: "" },
    { name: "T9", icon: "T5.png", color: 'Violet', fillColor: '#f03', shape: this.shapes[5], note: "" },
    { name: "T10", icon: "T6.png", color: 'DodgerBlue', fillColor: '#f03', shape: this.shapes[1], note: "" },
    { name: "T11", icon: "T3.png", color: 'Red', fillColor: 'yellow', shape: this.shapes[3], note: "" },
    { name: "T12", icon: "T4.png", color: 'Blue', fillColor: 'aqua', shape: this.shapes[4], note: "" },
    { name: "T13", icon: "T6.png", color: 'DodgerBlue', fillColor: '#f03', shape: this.shapes[1], note: "" },
    { name: "T14", icon: "T3.png", color: 'Red', fillColor: 'yellow', shape: this.shapes[3], note: "" },
    { name: "T15", icon: "T4.png", color: 'Blue', fillColor: 'aqua', shape: this.shapes[4], note: "" },
    { name: "T16", icon: "T5.png", color: 'Violet', fillColor: '#f03', shape: this.shapes[5], note: "" },
    { name: "T17", icon: "T6.png", color: 'DodgerBlue', fillColor: '#f03', shape: this.shapes[1], note: "" },
    { name: "T18", icon: "T3.png", color: 'Red', fillColor: 'yellow', shape: this.shapes[3], note: "" },
    { name: "T19", icon: "T4.png", color: 'Blue', fillColor: 'aqua', shape: this.shapes[4], note: "" },
    { name: "T20", icon: "T5.png", color: 'Violet', fillColor: '#f03', shape: this.shapes[5], note: "" },
    { name: "T21", icon: "T6.png", color: 'DodgerBlue', fillColor: '#f03', shape: this.shapes[1], note: "" },
    { name: "Other", icon: "Other.png", color: 'Yellow', fillColor: '#f03', shape: this.shapes[2], note: "" }
  ];

  constructor(
    private localStorage: LocalStorage,
    private storageMap: StorageMap,
    private dataService: DataService,
    private fb: FormBuilder) {


  }

  ngOnInit(): void {
    console.log("IndexedDB test started at ", Date())
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

    //this.test()
    //this.test2()

    //this.displayTeamGrid();
    console.log("IndexedDB test completed at ", Date())
  }

  addTeamRow(): void {
    this.teams.push({ name: "new Team", icon: "Other.png", color: 'white', fillColor: '#f03', shape: this.shapes[1], note: "" })
  }

  models = [
    'Mercedes-AMG C63',
    'BMW M2',
    'Audi TT Roadster',
    'Mazda MX-5',
    'BMW M3',
    'Porsche 718 Boxster',
    'Porsche 718 Cayman',
  ];
  colors = ['Red', 'Black', 'Green', 'White', 'Blue'];
  countries = ['UK', 'Spain', 'France', 'Ireland', 'USA'];

  createRowData() {
    var rowData = [];
    for (var i = 0; i < 200; i++) {
      var item = {
        model: this.models[Math.floor(Math.random() * this.models.length)],
        color: this.colors[Math.floor(Math.random() * this.colors.length)],
        country: this.countries[Math.floor(Math.random() * this.countries.length)],
        year: 2018 - Math.floor(Math.random() * 20),
        price: 20000 + Math.floor(Math.random() * 100) * 100,
      };
      rowData.push(item);
    }
    return rowData;
  }


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

  setQuickFilter(): void {
    //TODO: Not implemented!
    // Expects parameter: newFilter: any
  }

  /*
    gridOptions = {
      columns: [
        { field: 'firstName' },
        { field: 'lastName' },
        { field: 'gender' },
        { field: 'age' },
        { field: 'mood' },
        { field: 'country' },
        { field: 'address', minWidth: 550 },
      ],
      defaultColDef: {
        flex: 1,
        minWidth: 110,
        editable: true,
        resizable: true,
      },
      rowData: this.teams,
      pinnedTopRowData: getPinnedTopData(),
      pinnedBottomRowData: getPinnedBottomData(),
      onRowEditingStarted: function (event) {
        console.log('never called - not doing row editing');
      },
      onRowEditingStopped: function (event) {
        console.log('never called - not doing row editing');
      },
      onCellEditingStarted: function (event) {
        console.log('cellEditingStarted');
      },
      onCellEditingStopped: function (event) {
        console.log('cellEditingStopped');
      },
    };
  */

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

  /*
  displayTeamGrid() {
    $("#teamGrid").jsGrid({
      width: "95%",
      height: "400px",
      filtering: true,
      inserting: true,
      editing: true,
      sorting: true,
      paging: true,
      data: this.teams,
      fields: [
        { name: "name", title: "Team", type: "text", width: 13, validate: "required" },
        { name: "shape", type: "text", width: 15 },
        { name: "icon", type: "text", width: 20 },
        { name: "color", type: "text", width: 15 },
        { name: "fillColor", type: "text", width: 15 },
        { name: "note", type: "text", title: "Notes", width: 40 },
        { type: "control" }
      ]
    });
  }
*/


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

  // For test2():
  mkrSize$!: Observable<number>;

  // For test():
  getItem$!: Observable<Data | null>;
  schemaError$!: Observable<string | null>;
  removeItem$!: Observable<string | null>;
  clear: string | null = 'hello world';
  size$!: Observable<number>;
  length$!: Observable<number>;
  keys$!: Observable<string[]>;
  has$!: Observable<boolean>;
  service$!: Observable<string | undefined>;

  test2() {
    // testbed

    this.localStorage.setItem('clear', 'testyyyyyy').pipe(
      mergeMap(() => this.localStorage.clear()),
      mergeMap(() => this.localStorage.getItem('clear', { type: 'string' })),
    ).subscribe((result: string | null) => {

      /* Waiting for the `.clear()` to be done before other operations,
       * as all operations are asynchronous, `.clear()` could interfer with the other tests */

      this.clear = result;
      //this.localStorage.clear();
      console.log("IndexedDB Cleared at ", Date());

      this.mkrSize$ = this.localStorage.setItem('rngr_MarkerSize', '10').pipe(
        mergeMap(() => this.localStorage.setItem('rngr_MarkerSize2', '5')),
        mergeMap(() => this.localStorage.length),
      );

      this.keys$ = this.storageMap.set('rngr_MarkerColor', 'red').pipe(
        mergeMap(() => this.storageMap.keys()),
        toArray(),
      );

      /*
        // Supply default value on read error:
        this.storage.get('color').pipe(
            catchError(() => of('red')),
          ).subscribe((result) => { });

          */

      this.has$ = this.localStorage.setItem('rngr_Team', 'TeamBlue').pipe(
        mergeMap(() => this.storageMap.has('rngr_Team')),
      );
    });
  }

  test() {
    // Original test code fromm Demo application. Don't alter code below, or matching code in settings.component.html
    const schema: JSONSchema = {
      type: 'object',
      properties: {
        title: { type: 'string' },
      },
      required: ['title'],
    };

    // Test functionality from original demo app...
    this.localStorage.setItem('clear', 'testyyyyyy').pipe(
      mergeMap(() => this.localStorage.clear()),
      mergeMap(() => this.localStorage.getItem('clear', { type: 'string' })),
    ).subscribe((result: string | null) => {

      /* Waiting for the `.clear()` to be done before other operations,
       * as all operations are asynchronous, `.clear()` could interfer with the other tests */

      this.clear = result;

      this.getItem$ = this.localStorage.setItem('getItemTest', { title: 'hello world' }).pipe(
        mergeMap(() => this.localStorage.getItem<Data>('getItemTest', schema)),
      );

      this.schemaError$ = this.localStorage.setItem('schemaError', { wrong: 'test' }).pipe(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
        mergeMap(() => this.localStorage.getItem('schemaError', schema as any)),
        catchError(() => of('schema error')),
      );

      this.removeItem$ = this.localStorage.setItem('removeItem', 'test').pipe(
        mergeMap(() => this.localStorage.removeItem('removeItem')),
        mergeMap(() => this.localStorage.getItem('removeItem', { type: 'string' })),
      );

      this.length$ = this.localStorage.setItem('size1', 'test').pipe(
        mergeMap(() => this.localStorage.setItem('size2', 'test')),
        mergeMap(() => this.localStorage.length),
      );

      this.keys$ = this.storageMap.set('keys', 'test').pipe(
        mergeMap(() => this.storageMap.keys()),
        toArray(),
      );

      this.has$ = this.localStorage.setItem('has', 'test').pipe(
        mergeMap(() => this.storageMap.has('has')),
      );

      this.service$ = this.dataService.data$;

    });

  }
}

/*
  // Alternatives:
    https://blog.briebug.com/blog/managing-local-storage-in-angular
    https://stackblitz.com/edit/local-storage-subject-as-service-j9qe28?file=src%2Fapp%2Flocal-storage.service.ts
    https://github.com/gsklee/ngStorage
    https://wicg.github.io/kv-storage/


  // Following from: https://github.com/cyrilletuzi/angular-async-local-storage

  // Alternative to the following is in ./data.service.ts
  @Injectable()
  export class SettingsService {
    constructor(private storage: StorageMap) {}
  }

  // Write data
  let user: User = { firstName: 'Henri', lastName: 'Bergson' };
  this.storage.set('user', user).subscribe(() => {});

  // Delete data
  this.storage.delete('user').subscribe(() => {}); // Delete 1 item
  this.storage.clear().subscribe(() => {}); // Delete ALL data!!!

  // Read data (does NOT refresh if data changes)
  // See https://github.com/cyrilletuzi/angular-async-local-storage/blob/main/docs/WATCHING.md to watch changes
  this.storage.get('user').subscribe((user) => {
    console.log(user);
  });

  // Not finding an item is not an error, it succeeds but returns undefined:
  this.storage.get('notexisting').subscribe((data) => {
    data; // undefined
  });

  // Client side data is NOT secure: https://github.com/cyrilletuzi/angular-async-local-storage/blob/main/docs/VALIDATION.md
  // Use a json schema to verify the data structure
  this.storage.get('test', { type: 'string' }).subscribe({
    next: (user) => { /* Called if data is valid or `undefined` * / },
    error: (error) => { /* Called if data is invalid * / },
  });

  // NO need to unsubscribe: the Observable autocompletes (like in the Angular HttpClient service).
  // You DO need to subscribe, even if you don't have something specific to do after writing in storage (because it's how RxJS Observables work).

  // Catch potential errors
  this.storage.set('color', 'red').subscribe({
    next: () => {},
    error: (error) => {},
  });

  // Supply default value on read error:
  import { of } from 'rxjs';
  import { catchError } from 'rxjs/operators';
  this.storage.get('color').pipe(
    catchError(() => of('red')),
  ).subscribe((result) => {});

  // Possible errors:
  // https://github.com/cyrilletuzi/angular-async-local-storage/blob/main/docs/ERRORS.md

  // This lib also provides a Map-like API for advanced operations:
  //  .keys()
  //  .has(key)
  //  .size
  // More at: https://github.com/cyrilletuzi/angular-async-local-storage/blob/main/docs/MAP_OPERATIONS.md

  // Avoid collisions with other apps with prefixing:
  // https://github.com/cyrilletuzi/angular-async-local-storage/blob/main/docs/COLLISION.md

  // Store any value, without worrying about serializing. But storing null or undefined makes no sense and can cause issues in some browsers, so the item will be removed instead,
  //  you should stick to JSON data, ie. primitive types, arrays and literal objects. Date, Map, Set, Blob and other special structures can cause issues in some scenarios.
  // https://github.com/cyrilletuzi/angular-async-local-storage/blob/main/docs/SERIALIZATION.md
}
*/
