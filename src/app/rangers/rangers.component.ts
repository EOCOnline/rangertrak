import { Subscription } from 'rxjs'
/* Following gets:
index.js:553 [webpack-dev-server] WARNING
D:\Projects\RangerTrak\rangertrak\src\app\log\log.component.ts depends on 'xlsx'. CommonJS or AMD dependencies can cause optimization bailouts.
For more info see: https://angular.io/guide/build#configuring-commonjs-dependencies */
import * as XLSX from 'xlsx'

import { DOCUMENT } from '@angular/common'
import { Component, Inject, OnDestroy, OnInit } from '@angular/core'
import { MatSnackBar } from '@angular/material/snack-bar'

import { AlertsComponent } from '../shared/alerts/alerts.component'
import {
    FieldReportService, FieldReportType, LogService, RangerService, RangerType, SecretType,
    SettingsService, SettingsType
} from '../shared/services/'
import { csvImport } from './csvImport'

type AOA = any[][]  // array of arrays
/* xlsx.js (C) 2013-present SheetJS -- http://sheetjs.com */
// https://github.com/SheetJS/SheetJS.github.io
// D:\Projects\ImportExcel\sheetjs-master\demos\angular2\src\app\sheetjs.component.ts
// D:\Projects\ImportExcel\sheetjs-master\demos\angular2\ionic.ts

@Component({
  selector: 'rangertrak-rangers',
  templateUrl: './rangers.component.html',
  styleUrls: ['./rangers.component.scss']
})
export class RangersComponent implements OnInit, OnDestroy {

  private id = 'Ranger Component'
  title = 'Rangers (CERT, ACS/ARES, etc)'
  pageDescr = `Display of rangers' on this mission`

  private settingsSubscription!: Subscription
  private settings!: SettingsType

  private rangersSubscription!: Subscription
  public rangers: RangerType[] = []

  localUrl: any[] = []

  alert: any

  numSeperatorWarnings = 0
  maxSeperatorWarnings = 3

  now: Date

  excelData: AOA = [[1, 2, 3], [4, 5, 6]];
  excelData2: RangerType[] = [] //[[1, 2, 3], [4, 5, 6]];

  // https://www.ag-grid.com/angular-data-grid/grid-interface/#grid-options-1
  private gridApi: any
  private gridColumnApi: any
  gridOptions = {
    // PROPERTIES
    rowSelection: "multiple",
    // pagination: true,

    // EVENT handlers
    // onRowClicked: event => this.log.verbose('A row was clicked'),

    // CALLBACKS
    // getRowHeight: (params) => 25
  }

  defaultColDef = {
    flex: 1,
    minWidth: 100,
    editable: true,
    resizable: true,
    sortable: true,
    filter: true,
    floatingFilter: true
  }

  // ToDo: On hovering, display a larger image!
  // ${SettingsService.secrets[6].key + params.data.image}:
  imageCellRenderer = (params: { data: RangerType }) => {
    return `<img class="licenseImg" style="height:40px; width=40px;" alt= "${params.data.fullName}" title="${params.data.callsign} ? ${params.data.callsign} : ${params.data.fullName}"
    src= "${this.settings.imageDirectory}${params.data.image}">`
  }

  callsignCellRenderer = (params: { data: RangerType }) => {
    // let title = `<img src="${params.data.image}" height="40"> | <small> ${params.data.fullName} | ${params.data.phone}</small>` // TODO: Possible to get HTML into a tooltip?
    let title = `${params.data.fullName} | ${params.data.phone}`
    return `<span aria-hidden title="${title}"> ${params.data.callsign}</span>`
  }

  columnDefs = [
    { headerName: "callsign", field: "callsign", cellRenderer: this.callsignCellRenderer, flex: 10 },
    { headerName: "fullName", field: "fullName", tooltipField: "FCC Licensee Name", flex: 10 },
    { headerName: "phone", field: "phone", singleClickEdit: true, flex: 40 },
    { headerName: "address", field: "address", singleClickEdit: true, flex: 40 },
    { headerName: "REW", field: "rew", singleClickEdit: true, flex: 10 },
    { headerName: "image", field: "image", cellRenderer: this.imageCellRenderer, flex: 5 },
    { headerName: "status", field: "status", flex: 40 },
    { headerName: "note", field: "note", flex: 60 },
  ];

  constructor(
    //private teamService: TeamService,
    private log: LogService,
    private rangerService: RangerService,
    private settingsService: SettingsService,
    private _snackBar: MatSnackBar,
    @Inject(DOCUMENT) private document: Document
  ) {
    this.log.info(` Construction`, this.id)

    this.alert = new AlertsComponent(this._snackBar, this.log, this.settingsService, this.document) // TODO: Use Alert Service to avoid passing along doc & snackbar as parameters!
    //this.teamService = teamService
    //this.rangerService = rangerService
    this.now = new Date()
    this.gridApi = ""
    this.gridColumnApi = ""

    this.settingsSubscription = this.settingsService.getSettingsObserver().subscribe({
      next: (newSettings) => {
        this.settings = newSettings
        this.log.excessive('Received new Settings via subscription.', this.id)
      },
      error: (e) => this.log.error('Settings Subscription got:' + e, this.id),
      complete: () => this.log.info('Settings Subscription complete', this.id)
    })

  }

  ngOnInit(): void {

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

  onGridReady = (params: any) => {
    this.gridApi = params.api;
    this.gridColumnApi = params.columnApi;
    params.api.sizeColumnsToFit() //https://ag-grid.com/angular-data-grid/column-sizing/#example-default-resizing
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
    this.log.verbose(`Deleteing ranger with callsign: ${callsign}`, this.id)
    this.rangerService.deleteRanger(callsign)
  }

  //--------------------------------------------------------------------------
  onDeselectAll() {
    this.gridApi.deselectAll()
  }

  onBtnUpdateLocalStorage() {
    this.rangerService.updateLocalStorageAndPublish()
  }


  //--------------------------------------------------------------------------
  onBtnImportJson(e: any): void { // PointerEvent ?!
    // https://developers.google.com/maps/documentation/javascript/importing_data
    this.log.verbose(`onBtnImportJson() `, this.id)
    // TODO: Move to RangerService...
    let Logo: string
    //debugger


    if (e != null && e.target != null) {
      let Logo2 = e.target

      // e.target.files is undefined...
      if (e.target.files && e.target.files[0]) {
        var reader = new FileReader();
        reader.onload = (event: any) => {
          this.localUrl = event.target.result;
        }
        reader.readAsDataURL(e.target.files[0]);
      }
    }
    else {
      this.log.verbose(`${e} &&& ${e.target}`, this.id)
    }
    //this.localUrl //: any[]
    //this.rangerService.LoadRangersFromJSON(e.target.files[0])
    this.log.verbose(`Reloading window!`, this.id)
    this.reloadPage()
  }


  //--------------------------------------------------------------------------
  onBtnImportRangers() {
    //this.log.verbose
    alert(`onBtnImportRangers: Ranger Import from Excel file is unimoplemented currently`)
  }
  /*
  from https://blog.ag-grid.com/refresh-grid-after-data-change/
    this.http
    .get(
      "https://raw.githubusercontent.com/ag-grid/ag-grid/master/grid-packages/ag-grid-docs/src/olympicWinnersSmall.json"
    )
    .subscribe((data: any[]) => {
      data.length = 10;
      data = data.map((row, index) => {
        return { ...row, id: index + 1 };
      });
      this.backupRowData = data;
      this.rowData = data;
    });
    */

  //--------------------------------------------------------------------------
  // https://ag-grid.com/javascript-data-grid/excel-import/#example-excel-import"
  // https://github.com/SheetJS/SheetJS/tree/master/demos/angular2/
  onBtnImportExcel(evt: any) {
    this.excelData2 = this.rangerService.LoadRangersFromExcel(evt.target)
    this.log.verbose("excelData2: " + JSON.stringify(this.excelData2), this.id)
    this.log.verbose(`Reloading window!`, this.id)
    this.reloadPage()
  }

  //--------------------------------------------------------------------------
  onBtnImportExcel2() {
    this.rangerService.loadRangersFromExcel2()
    this.log.verbose(`Got excel file`, this.id)
    this.log.verbose(`Reloading window!`, this.id)
    this.reloadPage()
  }

  /* File Input element for browser */
  onFileChange(evt: any) {
    /* wire up file reader */
    const target: DataTransfer = (evt.target as DataTransfer);
    if (target.files.length !== 1) { throw new Error('Cannot use multiple files'); }
    const reader: FileReader = new FileReader();
    reader.onload = (e: any) => {
      const ab: ArrayBuffer = e.target.result;
      this.read(ab);
    };
    reader.readAsArrayBuffer(target.files[0]);
    this.log.verbose(`got file name: ${target.files[0].name}`, this.id)
  };

  /* Import button for mobile */
  async import() {
    alert(`IMPORT NOT IMPLEMENTED YET (how to resolve FILE?)`)
    try {
      // const target: string = this.file.documentsDirectory || this.file.externalDataDirectory || this.file.dataDirectory || '';
      // const dentry = await this.file.resolveDirectoryUrl(target);
      // const url: string = dentry.nativeURL || '';
      // alert(`Attempting to read SheetJSIonic.xlsx from ${url}`);
      // const ab: ArrayBuffer = await this.file.readAsArrayBuffer(url, 'SheetJSIonic.xlsx');
      // this.read(ab);
    } catch (e: any) {
      const m: string = e.message;
      alert(m.match(/It was determined/) ? 'Use File Input control' : `Error: ${m}`);
    }
  };

  /* Export button */
  async export() {
    const wb: XLSX.WorkBook = this.write();
    const filename = 'SheetJSIonic.xlsx';
    alert(`EXPORT NOT IMPLEMENTED YET (how to resolve FILE?)`)
    try {
      /* generate Blob */
      const wbout: ArrayBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });

      /* find appropriate path for mobile */
      // const target: string = this.file.documentsDirectory || this.file.externalDataDirectory || this.file.dataDirectory || '';
      //const dentry = await this.file.resolveDirectoryUrl(target);
      //const url: string = dentry.nativeURL || '';

      /* attempt to save blob to file */
      //await this.file.writeFile(url, filename, wbout, { replace: true });
      //alert(`Wrote to SheetJSIonic.xlsx in ${url}`);
    } catch (e: any) {
      if (e.message.match(/It was determined/)) {
        /* in the browser, use writeFile */
        XLSX.writeFile(wb, filename);
      } else {
        alert(`Error name: ${e.name}; msg: ${e.message}`);
      }
    }
  };

  read(ab: ArrayBuffer) {
    /* read workbook */
    const wb: XLSX.WorkBook = XLSX.read(new Uint8Array(ab), { type: 'array' });

    /* grab first sheet */
    const wsname: string = wb.SheetNames[0];
    const ws: XLSX.WorkSheet = wb.Sheets[wsname];

    /* save data */
    this.excelData = (XLSX.utils.sheet_to_json(ws, { header: 1 }) as AOA);
  };

  write(): XLSX.WorkBook {
    /* generate worksheet */
    const ws: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(this.excelData);

    /* generate workbook and add the worksheet */
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'SheetJS');

    return wb;
  };

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
    var params = this.getParams();
    //this.log.verbose(`Got column seperator value "${params.columnSeparator}"`, this.id)
    //this.log.verbose(`Got filename of "${params.fileName}"`, this.id)
    this.gridApi.exportDataAsCsv(params);
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
  onBtnDeleteRangers() {
    if (this.getConfirmation('REALLY delete all Rangers in LocalStorage, vs. edit the Ranger grid & Update the values in Local Storage?')) {
      this.log.info("Removing all rangers from local storage...", this.id)
      this.rangerService.deleteAllRangers()
      this.refreshGrid()
      this.reloadPage()
    }
  }

  getConfirmation(msg: string) {
    if (confirm(msg) == true) {
      return true; //proceed
    } else {
      return false; //cancel
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
    this.rangersSubscription.unsubscribe()
    this.settingsSubscription.unsubscribe()
  }
}

  // works - but Unused....
  // http://www.angulartutorial.net/2018/01/show-preview-image-while-uploading.html
/*
  showPreviewImage(event: any) {
    if (event.target.files && event.target.files[0]) {
      var reader = new FileReader();
      reader.onload = (event: any) => {
        this.localUrl = event.target.result;
      }
      reader.readAsDataURL(event.target.files[0]);
    }
  }
  with following HTML:
  <input type="file" (change)="showPreviewImage($event)">
  <img [src]="localUrl" *ngIf="localUrl" class="imgPlaceholder">
*/
