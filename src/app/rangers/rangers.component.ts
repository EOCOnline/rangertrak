import { Component, Inject, OnInit } from '@angular/core';
import { FieldReportService, FieldReportType, RangerService, RangerStatus, RangerType, TeamService } from '../shared/services/';
import { DOCUMENT } from '@angular/common'
import { csvImport } from './csvImport'
import { MatSnackBar } from '@angular/material/snack-bar';
import { MDCBanner } from '@material/banner';
import { AlertsComponent } from '../alerts/alerts.component';

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

  imageCellRenderer = (params: { data: RangerType }) => {
    return `<img class="licenseImg" alt= "${params.data.licensee}" title="${params.data.callsign} : ${params.data.licensee}"
    src= "${params.data.image}"  style="border:1px #a5a5a5 solid; height:50px; width:50px;" >`
  }

  callsignCellRenderer = (params: { data: RangerType }) => {

    // TODO: Possible to get HTML into a tooltip?
    // let title = `<img src="${params.data.image}" height="40"> | <small> ${params.data.licensee} | ${params.data.phone}</small>`
    let title = `${params.data.licensee} | ${params.data.phone}`

    return `<span aria-hidden title="${title}"> ${params.data.callsign}</span>`
  }

  columnDefs = [
    { headerName: "CallSign", field: "callsign", cellRenderer: this.callsignCellRenderer },
    { headerName: "Name", field: "licensee", tooltipField: "team" },
    { headerName: "Phone", field: "phone", singleClickEdit: true, flex: 40 },
    { headerName: "Address", field: "address", singleClickEdit: true, flex: 40 },
    { headerName: "Image", field: "image", cellRenderer: this.imageCellRenderer },
    { headerName: "Team", field: "team" },  // TODO: Change to string representation - within Ag-grid???
    { headerName: "Icon", field: "icon" },  // TODO: Change to string representation - within Ag-grid???
    { headerName: "Status", field: "status", flex: 40 },
    { headerName: "Note", field: "note", flex: 60 },
  ];
  now: Date

  constructor(
    //private teamService: TeamService,
    private rangerService: RangerService,
    private _snackBar: MatSnackBar,
    @Inject(DOCUMENT) private document: Document
  ) {
    console.log("Rangers Component Constructed started at ", Date())

    this.alert = new AlertsComponent(_snackBar, this.document) // TODO: Use Alert Service to avoid passing along doc & snackbar properties!!!!
    //this.teamService = teamService
    //this.rangerService = rangerService
    this.now = new Date()
    this.gridApi = ""
    this.gridColumnApi = ""
  }

  ngOnInit(): void {

    //this.rangers = this.rangerService.getrangers()  // NOTE: zeros out the array!!!!

    this.rangerService.generateFakeData(10) // NOTE: number is ignored currently
    console.log(`Now have ${this.rangers.length} Rangers retrieved from Local Storage and/or fakes generated`)

    if (this.rangers.length < 1) {
    this.alert.Banner("Welcome. No Rangers have been entered yet. Please go to the 'Advanced' section at the page bottom to resolve.")
    //this.alert.OpenSnackBar(`No Rangers found. Please enter them into the grid and then use the Update button,  or provide a Rangers.JSON file to import from or FUTUREE: Import them from an Excel file.`, `Nota Bene`, 1000)
    } else {
      this.alert.OpenSnackBar(`Imported "${this.rangers.length}" rangers.`, `Nota Bene`, 2000)
    }


    //console.log("Rangers Form initialized at ", Date())
  }

  // FUTURE:
  onBtnUpdate() {
    this.rangerService.Update
  }

  onBtnImportRangers() {

  }

  getConfirmation(msg: string) {
    if (confirm(msg) == true) {
      return true; //proceed
    } else {
      return false; //cancel
    }
  }


  onBtnClearRangers() {
    if (this.getConfirmation('Do you REALLY want to delete all the stored Rangers, vs. just editing the Rangers via the grid?')) {
      console.log("Removing all rangers...")
      this.rangerService.deleteAllRangers()
    }
  }

  // REMOVE: works - but Unused....
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

  onBtnJsonImport(e: any): void { // PointerEvent ?!
    let Logo: string
    debugger
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

    //this.localUrl //: any[]


    //this.rangerService.LoadFromJSON
  }

  onBtnImportExcel() {
    let fnc = new csvImport(document)
    fnc.importExcel2()
    //csvImport.importExcel2()
  }

  onGridReady = (params: any) => {
    this.gridApi = params.api;
    this.gridColumnApi = params.columnApi;
    params.api.sizeColumnsToFit() //https://ag-grid.com/angular-data-grid/column-sizing/#example-default-resizing
    // TODO: use this line, or next routine?!
  }

  onFirstDataRendered(params: any) {
    params.api.sizeColumnsToFit();
  }
  // once the above is done, you can: <button (click)="myGrid.api.deselectAll()">Clear Selection</button>

  // following from https://ag-grid.com/javascript-data-grid/csv-export/
  getSeperatorValue(inputSelector: string) {
    //let selector = this.document.querySelector(inputSelector) as HTMLSelectElement
    let selector = this.document.getElementById(inputSelector) as HTMLSelectElement
    var sel = selector.selectedIndex;
    var opt = selector.options[sel];
    var selVal = (<HTMLOptionElement>opt).value;
    var selText = (<HTMLOptionElement>opt).text
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

  onBtnExport() {
    var params = this.getParams();
    //console.log(`Got column seperator value "${params.columnSeparator}"`)
    //console.log(`Got filename of "${params.fileName}"`)
    /*
    if (params.columnSeparator) {
      this.openSnackBar(`NOTE: Excel handles comma separators best. You've chosen "${params.columnSeparator}"`, `Nota Bene`, 4000)
      //alert(`NOTE: Excel handles comma separators best. You've chosen "${params.columnSeparator}" Good luck!`);
    }
    */
    this.gridApi.exportDataAsCsv(params);
  }
}
