//import { XLSX } from 'xlsx'
import * as XLSX from 'xlsx'

import { DOCUMENT } from '@angular/common'
import { Inject, Injectable } from '@angular/core'

// based on https://ag-grid.com/javascript-data-grid/excel-import/#example-excel-import
// https://oss.sheetjs.com/sheetjs/

let gridOptions1 = {
  columnDefs: [
    { field: "athlete", minWidth: 180 },
    { field: "age" },
    { field: "country", minWidth: 150 },
    { field: "year" },
    { field: "date", minWidth: 130 },
    { field: "sport", minWidth: 100 },
    { field: "gold" },
    { field: "silver" },
    { field: "bronze" },
    { field: "total" }
  ],

  defaultColDef: {
    resizable: true,
    minWidth: 80,
    flex: 1
  },

  rowData: []
};



// `export` function that exports the `data` property to a new file

export class csvImport {
  static importExcel2() {
    throw new Error('Method not implemented.');
  }

  private gridApi: any
  private gridColumnApi: any

  constructor(
    //private teamService: TeamService,
    //private rangerService: RangerService,
    @Inject(DOCUMENT) private document: Document
  ) {
    //this.teamService = teamService
    //this.rangerService = rangerService
    //this.now = new Date()
    this.gridApi = ""
    this.gridColumnApi = ""

    // wait for the document to be loaded, otherwise
    // AG Grid will not find the div in the document.
    this.document.addEventListener("DOMContentLoaded", () => {

      //debugger
      // lookup the container we want the Grid to use
      let eGridDiv = document.querySelector('#rangerGrid')

      // create the grid passing in the div to use together with the columns & data we want to use
      //new agGrid.Grid(eGridDiv, gridOptions)
    }
    )


  }

  // XMLHttpRequest in promise format
  // File input button with an event handler to parse the workbook
  makeRequest(method: any, url: string, success: any, error: any) {
    let httpRequest = new XMLHttpRequest();
    httpRequest.open("GET", url, true);
    httpRequest.responseType = "arraybuffer";

    httpRequest.open(method, url);
    httpRequest.onload = () => {
      success(httpRequest.response);
    };
    httpRequest.onerror = () => {
      error(httpRequest.response);
    };
    httpRequest.send();
  }

  onGridReady = (params: any) => {
    this.gridApi = params.api;
    this.gridColumnApi = params.columnApi;
    // params.api.sizeColumnsToFit() //https://ag-grid.com/angular-data-grid/column-sizing/#example-default-resizing
    // TODO: use this line, or next routine?!
  }

  // read the raw data and convert it to a XLSX workbook
  // `data` property: array of arrays
  convertDataToWorkbook(data1: any) {
    /* convert data to binary string */
    let data = new Uint8Array(data1);
    let arr = new Array();

    for (let i = 0; i !== data.length; ++i) {
      arr[i] = String.fromCharCode(data[i]);
    }

    let bstr = arr.join("");

    return XLSX.read(bstr, { type: "binary" });
  }

  // pull out the values we're after, converting it into an array of rowData
  // Simple angular table which binds to the `data` property
  populateGrid(workbook: any) {
    // our data is in the first sheet
    let firstSheetName = workbook.SheetNames[0];
    let worksheet = workbook.Sheets[firstSheetName];

    // we expect the following columns to be present
    let columns: any = {
      'A': 'athlete',
      'B': 'age',
      'C': 'country',
      'D': 'year',
      'E': 'date',
      'F': 'sport',
      'G': 'gold',
      'H': 'silver',
      'I': 'bronze',
      'J': 'total'
    };

    let rowData = [];

    // start at the 2nd row - the first row are the headers
    let rowIndex = 2;

    // iterate over the worksheet pulling out the columns we're expecting
    while (worksheet['A' + rowIndex]) {
      //debugger
      let row: any = {};
      Object.keys(columns).forEach((column) => {
        //console.log(` column=${column}; w=${worksheet[column + rowIndex].w}`)
        /*
            column=A; w=Gong Jinjie
            csvImport.ts:142  column=B; w=25
            csvImport.ts:142  column=C; w=China
            csvImport.ts:142  column=D; w=2012
            csvImport.ts:142  column=E; w=12/8/12
            csvImport.ts:142  column=F; w=Cycling
            csvImport.ts:142  column=G; w=0
            csvImport.ts:142  column=H; w=1
            csvImport.ts:142  column=I; w=0
            csvImport.ts:142  column=J; w=1
            csvImport.ts:142  column=A; w=Olga Kaniskina
            csvImport.ts:142  column=B; w=27
            csvImport.ts:142  column=C; w=Russia
            csvImport.ts:142  column=D; w=2012
            csvImport.ts:142  column=E; w=12/8/12
            csvImport.ts:142  column=F; w=Athletics
            csvImport.ts:142  column=G; w=0
            csvImport.ts:142  column=H; w=1
            csvImport.ts:142  column=I; w=0
            csvImport.ts:142  column=J; w=1
            csvImport.ts:142  column=A; w=Vavrinec Hradílek
        */

        row[columns[column]] = worksheet[column + rowIndex].w;
      });

      rowData.push(row);

      rowIndex++;
    }

    // finally, set the imported rowData into the grid
    // gets core.mjs:6484 ERROR TypeError: this.gridApi.setRowData is not a function
    //this.gridApi.setRowData(rowData);
  }

  importExcel2() {
    //debugger
    this.makeRequest('GET',
      'https://www.ag-grid.com/example-assets/olympic-data.xlsx',
      // success
      (data: any) => {
        let workbook = this.convertDataToWorkbook(data);

        this.populateGrid(workbook);
      },
      // error
      (error: any) => {
        throw error;
      }
    );
  }
}
