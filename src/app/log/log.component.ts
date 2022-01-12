import { DOCUMENT } from '@angular/common';
import { Component, Inject, OnInit } from '@angular/core'
//import { Event } from '@angular/animations'
//import { File } from '@ionic-native/file/ngx';
import * as XLSX from 'xlsx';
import { SettingsService } from "../shared/services"

/* xlsx.js (C) 2013-present SheetJS -- http://sheetjs.com */
// https://github.com/SheetJS/SheetJS.github.io
// D:\Projects\ImportExcel\sheetjs-master\demos\angular2\src\app\sheetjs.component.ts
// D:\Projects\ImportExcel\sheetjs-master\demos\angular2\ionic.ts

type AOA = any[][]  // array of arrays

@Component({
  selector: 'rangertrak-log',
  templateUrl: './log.component.html', //'home.page.html'
  styleUrls: ['./log.component.scss'] //, 'home.page.scss']
})
export class LogComponent implements OnInit {

  log = this.document.getElementById("log")
  data: any[][] = [[1,2,3],[4,5,6]];

  //constructor(public file: File) { }
  constructor(
    @Inject(DOCUMENT) private document: Document) {

     }
  // src/app/log/log.component.ts:23:22 - error NG2003: No suitable injection token for parameter 'file' of class 'LogComponent'.
  // Consider using the @Inject decorator to specify an injection token.

  ngOnInit(): void {
    if (!SettingsService.debugMode) {
      this.displayHide("Log__Excel")
    }

  }

  // TODO: Move these into a utility class?
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

  // log event in the console
  LogEvent(msg: string) {
    if (this.log === null) { throw ("unable to find log...") }
    this.log.textContent += msg + "\n"
    var ot = this.log.scrollHeight - this.log.clientHeight
    if (ot > 0) this.log.scrollTop = ot
  }


  read(ab: ArrayBuffer) {
    /* read workbook */
    const wb: XLSX.WorkBook = XLSX.read(new Uint8Array(ab), { type: 'array' });

    /* grab first sheet */
    const wsname: string = wb.SheetNames[0];
    const ws: XLSX.WorkSheet = wb.Sheets[wsname];

    /* save data */
    this.data = (XLSX.utils.sheet_to_json(ws, { header: 1 }) as AOA);
  };

  write(): XLSX.WorkBook {
    /* generate worksheet */
    const ws: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(this.data);

    /* generate workbook and add the worksheet */
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'SheetJS');

    return wb;
  };

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
    console.log (`got file name: ${target.files[0].name}`)
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
    alert (`EXPORT NOT IMPLEMENTED YET (how to resolve FILE?)`)
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
        alert(`Error: ${e.message}`);
      }
    }
  };
}
