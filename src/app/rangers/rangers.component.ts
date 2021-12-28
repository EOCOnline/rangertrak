import { Component, OnInit } from '@angular/core';
import { FieldReportService, FieldReportType, RangerService, RangerStatus, RangerType, TeamService } from '../shared/services/';

export interface RangerType1 {
  callsign: string
  licensee: string
  licenseKey: number
  phone: string
  address: string
  image: string
  team: string
  icon: string
  status: string
  note: string
}

@Component({
  selector: 'rangertrak-rangers',
  templateUrl: './rangers.component.html',
  styleUrls: ['./rangers.component.scss']
})
export class RangersComponent implements OnInit {

  teamService
  rangerService
  rangers: RangerType[] = []
  //columns = { "Callsign": String, "Team": String, "Address": String, "Status": String, "Note": String }
  api
  columnApi

  /* TODO: Put following into tooltip, instead of just TEAM:
        <mat-option *ngFor="let callsigns of filteredCallsigns | async" [value]="callsigns.callsign">
            <img class="example-option-img" aria-hidden [src]="callsigns.image" height="40">
            <span>{{callsigns.callsign}}</span> |
            <small> {{callsigns.name}} | {{callsigns.phone}}</small>
          </mat-option>
          */

  // https://www.ag-grid.com/angular-data-grid/grid-interface/#grid-options-1
  gridOptions = {
    rowSelection: "multiple",
    //onGridReady: event => console.log('The grid is now ready')
  }
  /* const gridOptions = {
    // PROPERTIES
    // Objects like myRowData and myColDefs would be created in your application
    rowData: rangers,
    columnDefs: myColDefs,
    pagination: true,

    // EVENTS
    // Add event handlers
    onRowClicked: event => console.log('A row was clicked'),
    onColumnResized: event => console.log('A column was resized'),
    onGridReady: event => console.log('The grid is now ready'),

    // CALLBACKS
    getRowHeight: (params) => 25
  } */


  defaultColDef = {
    flex: 1,
    maxWidth: 125,
    editable: true,
    resizable: true,
    sortable: true,
    filter: true
  }

  imageCellRenderer = (params: { data: RangerType }) => {
    // ${params.rangers.licensee}"
    //console.log params.data.callsign
    // style="border:1px #a5a5a5 solid; height:65px; width:65px;"
    //params.data.when.date
    let image:string = params.data.image
    let licensee:string = params.data.licensee
    let callsign:string = params.data.callsign

    let html:string = `<img class="licenseImg" alt= "${licensee}" title="${callsign} : ${licensee}" src= "${image}"  style="border:1px #a5a5a5 solid; height:50px; width:50px;" >`;

    return html
  }



  columnDefs = [
    { headerName: "CallSign", field: "callsign", tooltipField: "team" },
    { headerName: "Name", field: "licensee" },
    { headerName: "Phone", field: "phone", singleClickEdit: true, maxWidth: 200 },
    { headerName: "Address", field: "address", singleClickEdit: true },
    { headerName: "Image", field: "image", cellRenderer: this.imageCellRenderer },
    { headerName: "Team", field: "team" },  // TODO: Change to string representation - within Ag-grid???
    { headerName: "Icon", field: "icon" },  // TODO: Change to string representation - within Ag-grid???
    { headerName: "Status", field: "status", maxWidth: 150 },
    { headerName: "Note", field: "note", maxWidth: 300 },
  ];
  now: Date

  constructor(
    teamService: TeamService,
    rangerService: RangerService,
  ) {
    this.teamService = teamService
    this.rangerService = rangerService
    this.now = new Date()
    this.api = ""
    this.columnApi = ""
  }

  ngOnInit(): void {
    console.log("Rangers Form started at ", Date())
    //this.rangers = this.rangerService.getrangers()  // BUG: zeros out the array!!!!

    this.rangers = [
      { callsign: "KB0LJC", licensee: "Hirsch, Justin D", image: "./assets/imgs/REW/male.png", phone: "206-463-0000", address: "", licenseKey: 0, team: "", icon: "", status: "Normal", note: "" },
      { callsign: "AC7TB", licensee: "Sullivan, Timothy X", image: "./assets/imgs/REW/female.png", phone: "206-4630000", address: "", licenseKey: 0, team: "", icon: "", status: "Normal", note: "" },
      { callsign: "KE7KDQ", licensee: "Cornelison, John", image: "./assets/imgs/REW/ke7kdq.jpg", phone: "206-4630000", address: "", licenseKey: 0, team: "", icon: "", status: "Normal", note: "" }
    ]
    this.rangerService.generateFakeData(this.rangers)
    console.log("got " + this.rangers.length + " Field Reports")
    console.log("Ranger Form completed at ", Date())
  }

  // FUTURE:
  exportDataAsCsv() {
  }

  // FUTURE:
  setQuickFilter() {
  }

  onGridReady = (params: any) => {
    this.api = params.api;
    this.columnApi = params.columnApi;

    /*
    // from https://ag-grid.com/angular-data-grid/excel-export-images/#example-excel-export-cells-with-images
    fetch('https://www.ag-grid.com/example-assets/small-olympic-winners.json')
      .then((response) =>
        createBase64FlagsFromResponse(response, countryCodes, base64flags)
      )
      .then((data) => params.api.setRowData(data));
      */
  }
  // once the above is done, you can: <button (click)="myGrid.api.deselectAll()">Clear Selection</button>

  //onGridReady(_$event) {}

}

/*
var countryCodes = {};
var base64flags = {};

function countryCellRenderer(params) {
  return `<img alt="${params.data.country}" src="${
    base64flags[countryCodes[params.data.country]]
  }">`;
}
*/
function imageCellRenderer2(params: any) {
  //${params.rangers.licensee}"
  // style="border:1px #a5a5a5 solid; height:65px; width:65px;"

  return `<img class="licenseImg" alt="ke7kdq" title="Mr. ke7kdq" src="./assets/imgs/REW/ke7kdq.jpg" style="border:1px #a5a5a5 solid; height:50px; width:50px;" >`;
  //src="${ params.rangers.image }">`;
}
