import { Component, Inject, OnInit } from '@angular/core';
import { FieldReportService, FieldReportType, RangerService, RangerStatus, RangerType, TeamService } from '../shared/services/';
import { DOCUMENT } from '@angular/common'

@Component({
  selector: 'rangertrak-rangers',
  templateUrl: './rangers.component.html',
  styleUrls: ['./rangers.component.scss']
})
export class RangersComponent implements OnInit {

  //teamService
  //rangerService //: { generateFakeData: (arg0: RangerType[]) => void; }
  rangers: RangerType[] = []
  //columns = { "Callsign": String, "Team": String, "Address": String, "Status": String, "Note": String }
  private gridApi: any
  private gridColumnApi: any

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
    @Inject(DOCUMENT) private document: Document
  ) {
    //this.teamService = teamService
    //this.rangerService = rangerService
    this.now = new Date()
    this.gridApi = ""
    this.gridColumnApi = ""
  }

  ngOnInit(): void {
    //console.log("Rangers Form started at ", Date())
    //this.rangers = this.rangerService.getrangers()  // NOTE: zeros out the array!!!!

    this.rangerService.generateFakeData(10) // NOTE: number is ignored currently
    console.log(`Now have ${this.rangers.length} Rangers retrieved from Local Storage and/or fakes generated`)
    //console.log("Rangers Form initialized at ", Date())
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
  getValue(inputSelector: string) {
    //let selector = this.document.querySelector(inputSelector) as HTMLSelectElement
    let selector = this.document.getElementById('columnSeparator') as HTMLSelectElement
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
      columnSeparator: this.getValue('columnSeparator'),
      fileName: `RangersExport.${dt.getFullYear()}-${dt.getMonth()}-${dt.getDate()}_${dt.getHours()}:${dt.getMinutes()}.csv`,
    }
  }

  onBtnExport() {
    var params = this.getParams();
    //console.log(`Got column seperator value "${params.columnSeparator}"`)
    //console.log(`Got filename of "${params.fileName}"`)
    if (params.columnSeparator) {
      alert(`NOTE: Excel handles comma separators best. You've chosen "${params.columnSeparator}" Good luck!`);
    }
    this.gridApi.exportDataAsCsv(params);
  }

}
