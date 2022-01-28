import { Component, Inject, OnInit } from '@angular/core';
import { FieldReportService, FieldReportType, RangerService, RangerStatus, RangerType, SettingsService, TeamService } from '../shared/services/';
import { DOCUMENT } from '@angular/common'
import { csvImport } from './csvImport'
import { MatSnackBar } from '@angular/material/snack-bar';
import { AlertsComponent } from '../alerts/alerts.component';


/* Following gets:
index.js:553 [webpack-dev-server] WARNING
D:\Projects\RangerTrak\rangertrak\src\app\log\log.component.ts depends on 'xlsx'. CommonJS or AMD dependencies can cause optimization bailouts.
For more info see: https://angular.io/guide/build#configuring-commonjs-dependencies */
import * as XLSX from 'xlsx';

/* xlsx.js (C) 2013-present SheetJS -- http://sheetjs.com */
// https://github.com/SheetJS/SheetJS.github.io
// D:\Projects\ImportExcel\sheetjs-master\demos\angular2\src\app\sheetjs.component.ts
// D:\Projects\ImportExcel\sheetjs-master\demos\angular2\ionic.ts

type AOA = any[][]  // array of arrays

@Component({
  selector: 'rangertrak-rangers',
  templateUrl: './rangers.component.html',
  styleUrls: ['./rangers.component.scss']
})
export class RangersComponent implements OnInit {

  localUrl: any[] = []
  //teamService
  //rangerService //: { generateFakeData: (arg0: RangerType[]) => void; }
  rangers: RangerType[] = []
  //columns = { "Callsign": String, "Team": String, "Address": String, "Status": String, "Note": String }
  private gridApi: any
  private gridColumnApi: any
  alert: any
  numSeperatorWarnings = 0
  maxSeperatorWarnings = 3
  now: Date
  settings
  excelData: AOA = [[1, 2, 3], [4, 5, 6]];
  excelData2: RangerType[] = [] //[[1, 2, 3], [4, 5, 6]];

  // https://www.ag-grid.com/angular-data-grid/grid-interface/#grid-options-1
  gridOptions = {
    // PROPERTIES
    rowSelection: "multiple",
    // pagination: true,

    // EVENT handlers
    // onRowClicked: event => console.log('A row was clicked'),

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
  imageCellRenderer = (params: { data: RangerType }) => {
    return `<img class="licenseImg" style="height:40px; width=40px;" alt= "${params.data.licensee}" title="${params.data.callsign} : ${params.data.licensee}"
    src= "${params.data.image}">`
  }

  callsignCellRenderer = (params: { data: RangerType }) => {
    // let title = `<img src="${params.data.image}" height="40"> | <small> ${params.data.licensee} | ${params.data.phone}</small>` // TODO: Possible to get HTML into a tooltip?
    let title = `${params.data.licensee} | ${params.data.phone}`
    return `<span aria-hidden title="${title}"> ${params.data.callsign}</span>`
  }

  columnDefs = [
    { headerName: "callsign", field: "callsign", cellRenderer: this.callsignCellRenderer },
    { headerName: "licensee", field: "licensee", tooltipField: "team" },
    { headerName: "phone", field: "phone", singleClickEdit: true, flex: 40 },
    { headerName: "address", field: "address", singleClickEdit: true, flex: 40 },
    { headerName: "image", field: "image", cellRenderer: this.imageCellRenderer },
    { headerName: "team", field: "team" },  // TODO: Change to string representation - within Ag-grid???
    { headerName: "icon", field: "icon" },  // TODO: Change to string representation - within Ag-grid???
    { headerName: "status", field: "status", flex: 40 },
    { headerName: "note", field: "note", flex: 60 },
  ];

  constructor(
    //private teamService: TeamService,
    private rangerService: RangerService,
    private settingsService: SettingsService,
    private _snackBar: MatSnackBar,
    @Inject(DOCUMENT) private document: Document
  ) {
    console.log(`Rangers Component Construction at ${Date.now}`)

    this.alert = new AlertsComponent(this._snackBar, this.document) // TODO: Use Alert Service to avoid passing along doc & snackbar as parameters!
    //this.teamService = teamService
    //this.rangerService = rangerService
    this.now = new Date()
    this.gridApi = ""
    this.gridColumnApi = ""

    this.settings = SettingsService.Settings
  }

  ngOnInit(): void {

    this.rangers = this.rangerService.GetRangers()
    console.log(`ngInit: ${this.rangers.length} Rangers retrieved from Local Storage`)

    if (this.rangers.length < 1) {
      this.alert.Banner("No Rangers have been entered yet. Go to the bottom & click on 'Advanced' to resolve.")
      //this.alert.OpenSnackBar(`No Rangers found. Please enter them into the grid and then use the Update button,  or provide a Rangers.JSON file to import from or FUTUREE: Import them from an Excel file.`, `Nota Bene`, 1000)
    } else {
      //this.alert.OpenSnackBar(`Imported "${this.rangers.length}" rangers.`, `Nota Bene`, 1000)
    }

    if (!this.settings.debugMode) {
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
      console.log("no this.gridApi yet in ngOnInit()")
    }
  }

  onFirstDataRendered(params: any) {
    params.api.sizeColumnsToFit();
    if (this.gridApi) {
      this.gridApi.refreshCells()
    } else {
      console.log("no this.gridApi yet in ngOnInit()")
    }
  }

  //--------------------------------------------------------------------------
  onDeselectAll() {
    this.gridApi.deselectAll()
  }

  onBtnUpdateLocalStorage() {
    this.rangerService.UpdateLocalStorage()
  }


  //--------------------------------------------------------------------------
  onBtnImportJson(e: any): void { // PointerEvent ?!
    console.log(`onBtnImportJson() ------------`)
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
      console.log(`${e} &&& ${e.target}`)
    }
    //this.localUrl //: any[]
    this.rangerService.LoadRangersFromJSON(e.target.files[0])
    window.location.reload
  }


  //--------------------------------------------------------------------------
  onBtnImportRangers() {
    //console.log
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
    console.log("excelData2: "+JSON.stringify(this.excelData2))
  }

  //--------------------------------------------------------------------------
  onBtnImportExcel2() {
    this.rangerService.LoadRangersFromExcel2()
    console.log(`Got excel file`)
    window.location.reload
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
    console.log(`got file name: ${target.files[0].name}`)
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
    window.location.reload
  }

  //--------------------------------------------------------------------------
  // following from https://ag-grid.com/javascript-data-grid/csv-export/
  onBtnExportToExcel() {
    var params = this.getParams();
    //console.log(`Got column seperator value "${params.columnSeparator}"`)
    //console.log(`Got filename of "${params.fileName}"`)
    this.gridApi.exportDataAsCsv(params);
  }

  getSeperatorValue(inputSelector: string) {
    //let selector = this.document.querySelector(inputSelector) as HTMLSelectElement
    let selector = this.document.getElementById(inputSelector) as HTMLSelectElement
    var sel = selector.selectedIndex;
    var opt = selector.options[sel];
    var selVal = (<HTMLOptionElement>opt).value;
    //var selText = (<HTMLOptionElement>opt).text
    // console.log(`Got column seperator text:"${selText}", val:"${selVal}"`)

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
      fileName: `RangersExport.${dt.getFullYear()}-${dt.getMonth()}-${dt.getDate()}_${dt.getHours()}:${dt.getMinutes()}.csv`,
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
      console.log("Removing all rangers from local storage...")
      this.rangerService.deleteAllRangers()
      window.location.reload
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

  generateFakeData() {
    // Number is ignored currently
    this.rangerService.generateFakeData(10)
    // TODO: Refresh the page, or why not showing???? - until page goes thoiugh another init cycle?!
    this.ngOnInit()
    window.location.reload
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
