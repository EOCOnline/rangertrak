import { Component, OnInit } from '@angular/core';
import { FieldReportService, FieldReportType, RangerService, RangerStatus, RangerType, TeamService } from '../shared/services/';

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
    //this.rangers = this.rangerService.getrangers()  // NOTE: zeros out the array!!!!

    this.rangers = [
      // { callsign: "KB0LJC", licensee: "Hirsch, Justin D", image: "./assets/imgs/REW/male.png", phone: "206-463-0000", address: "132nd pl", licenseKey: 0, team: "", icon: "", status: "Normal", note: "" },
    ]
    this.rangerService.generateFakeData(this.rangers)
    console.log("got " + this.rangers.length + " Field Reports")
    console.log("Ranger Form completed at ", Date())
  }

  onGridReady = (params: any) => {
    this.api = params.api;
    this.columnApi = params.columnApi;
    params.api.sizeColumnsToFit() //https://ag-grid.com/angular-data-grid/column-sizing/#example-default-resizing
  }

  onFirstDataRendered(params: any) {
    params.api.sizeColumnsToFit();
  }
  // once the above is done, you can: <button (click)="myGrid.api.deselectAll()">Clear Selection</button>

  //onGridReady(_$event) {}

}
