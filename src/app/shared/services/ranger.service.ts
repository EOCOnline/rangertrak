import { HttpClient } from '@angular/common/http';
import { Injectable, OnInit } from '@angular/core';
import { formatDate } from '@angular/common';
import { BehaviorSubject, Observable, Observer, of } from 'rxjs';
import { csvImport } from 'src/app/rangers/csvImport';
//import { debounceTime, map, startWith } from 'rxjs/operators'
import * as rangers from '../../../assets/data/Rangers.json'

export interface RangerType {
  callsign: string
  licensee: string
  // licenseKey: number
  phone: string
  address: string
  image: string
  team: string
  icon: string
  status: string
  note: string
}

export enum RangerStatus { '', 'Normal', 'Need Rest', 'REW', 'OnSite', 'Checked-in', 'Checked-out' }  // TODO: Allow changing list & default of statuses in settings?!


/* Following gets:
index.js:553 [webpack-dev-server] WARNING
D:\Projects\RangerTrak\rangertrak\src\app\log\log.component.ts depends on 'xlsx'. CommonJS or AMD dependencies can cause optimization bailouts.
For more info see: https://angular.io/guide/build#configuring-commonjs-dependencies */
import * as XLSX from 'xlsx';

/* xlsx.js (C) 2013-present SheetJS -- http://sheetjs.com */
// https://github.com/SheetJS/SheetJS.github.io
// D:\Projects\ImportExcel\sheetjs-master\demos\angular2\src\app\sheetjs.component.ts
type AOA = any[][]  // array of arrays


@Injectable({ providedIn: 'root' })
export class RangerService {
  orangers$: Observable<RangerType[]> | null = null

  rangers: RangerType[] = []
  rangers2: RangerType[] = []  // BUG: Rangers loaded from JSON are NEVER USED!
  private nextId = 0
  private rangersSubject =
    new BehaviorSubject<RangerType[]>([]);  // REVIEW: Necessary?
  private localStorageRangerName = 'rangers'
  excelData: any[][] = [[1, 2, 3], [4, 5, 6]];

  constructor(private httpClient: HttpClient) {
    console.log("Rangers Service Construction")
    this.LoadRangersFromLocalStorage()
    //this.LoadRangersFromJSON() // Have user use button to initiate this

    // Needed? Maybe to expose observable?
    this.UpdateLocalStorage()
  }

  GetRangers() {
    console.log(`GetRangers() returning ${this.rangers.length} Rangers`)
    this.SortRangersByCallsign()
    return this.rangers
  }

  subscribe(observer: Observer<RangerType[]>) {
    this.rangersSubject.subscribe(observer);
  }

  //--------------------------------------------------------------------------
  // Update localStorage with current Rangers data & Publish update for any Observers
  UpdateLocalStorage() {
    console.log(`RangersService: Saving ${this.rangers.length} rangers to local storage`)
    localStorage.setItem(this.localStorageRangerName, JSON.stringify(this.rangers))
    //console.log("Updated Rangers to " + JSON.stringify(this.rangers))

    this.SortRangersByCallsign()

    this.rangersSubject.next(this.rangers.map(
      ranger => ({
        callsign: ranger.callsign,
        licensee: ranger.licensee,
        // licenseKey: ranger.licenseKey,
        phone: ranger.phone,
        address: ranger.address,
        image: ranger.image,
        team: ranger.team,
        icon: ranger.icon,
        status: ranger.status,
        note: ranger.note
      })
    ))
  }

  //--------------------------------------------------------------------------
  LoadRangersFromLocalStorage() { // WARN: Replaces any existing Rangers
    let localStorageRangers = localStorage.getItem(this.localStorageRangerName)
    try {
      this.rangers = (localStorageRangers != null) ? JSON.parse(localStorageRangers) : []   //TODO: clean up
      console.log(`RangersService: Loaded ${this.rangers.length} rangers from local storage`)
    } catch (error: any) {
      console.log(`Unable to parse Rangers from Local Storage. Error: ${error.message}`)
    }
    this.SortRangersByCallsign()
  }

  //--------------------------------------------------------------------------
  LoadRangersFromJSON(fileName: string = '../../../assets/data/Rangers.json') {  // WARN: Replaces any existing Rangers
    console.log(`RangerService: loading new Rangers from ${fileName}`)

    debugger

    // also see secretss import as an example: Settings.ts

    this.orangers$ = this.httpClient.get<RangerType[]>(fileName) // from pg 281

    //this.rangers = []
    if (rangers != null) {
      // Use JSON file imported at the top
      // this.rangers = JSON.parse(rangers) || []
      // this.rangers = rangers
      /* TODO: Add missing fields:
      Type '{ callsign: string; label: string; licensee: string; licenseKey: string; phone: string; team: string; icon: string; }[]' is not assignable to type 'RangerType[]'.

      Type '{ callsign: string; label: string; licensee: string; licenseKey: string; phone: string; team: string; icon: string; }is missing the following properties from type
      'RangerType': address, image, status, notets(2322)

      */
    }

    // REVIEW: Workaround for "Error: Should not import the named export (imported as 'rangers') from default-exporting module (only default export is available soon)"
    let rangerWorkaround = JSON.stringify(rangers)
    this.rangers = JSON.parse(rangerWorkaround)
    this.SortRangersByCallsign()
    console.log(`Got ${this.rangers.length} rangers from JSON file.`)
  }

  //See pg. 279...
  //import * as data from filename;
  //let greeting = data.greeting;
  /*   import {default as AAA} from "VashonCallSigns";
        AAA.targetKey
        // this requires `"resolveJsonModule": true` in tsconfig.json

        import {default as yyy} from './VashonCallSigns.json'
import { HttpClient } from '@angular/common/http';
        yyy.primaryMain


    ngOnInit(): void {

            this.myService.getResponseData().then((value) => {
                //SUCCESS
                console.log(value);
                this.detailsdata = value;

            }, (error) => {
                //FAILURE
                console.log(error);
            })
        }

    <p><b>sales amount:</b> {{ detailsdata?.sales_amount }}</p>
    <p><b>collection amount:</b> {{ detailsdata?.collection_amount }}</p>
    <p><b>carts amount:</b> {{ detailsdata?.carts_amount }}</p>

    */

  //--------------------------------------------------------------------------
  // https://ag-grid.com/javascript-data-grid/excel-import/#example-excel-import"
  // https://github.com/SheetJS/SheetJS/tree/master/demos/angular2/
  LoadRangersFromExcel(eventTarget: any) {  // HTMLInputElement event:target

    type AOR = RangerType[]  // array of Rangers

    // wire up file reader
    const target: DataTransfer = <DataTransfer>(eventTarget);

    if (target.files.length !== 1) throw new Error('Cannot use multiple files');
    console.log(`LoadRangersFromExcel(): About to read contents of ${target.files[0].name}`)
    const reader: FileReader = new FileReader();
    reader.onload = (e: any) => {

      // read workbook
      const ab: ArrayBuffer = e.target.result;
      const wb: XLSX.WorkBook = XLSX.read(ab);

      // grab first sheet
      const wsname: string = wb.SheetNames[0];
      const ws: XLSX.WorkSheet = wb.Sheets[wsname];

      debugger

      let myJson = JSON.stringify(XLSX.utils.sheet_to_json(ws, { header: 1 }))

      console.log(`myJson = ${myJson}`)
      let myJson2 = JSON.parse(myJson)
      console.log(`myJson2 = ${myJson2}`)
      console.log(`1 Got ${this.rangers.length} rangers from Excel file.`)

      // save data
      this.rangers = <AOR>(myJson2)
      console.log(`2 Got ${this.rangers.length} rangers from Excel file...`)

      //this.rangers = JSON.parse(myJson)
    };
    console.log(`3 Got ${this.rangers.length} rangers from Excel file.`)

    this.DisplayRangers(`Excel import from ${target.files[0].name}`)
    console.log(`4 Got ${this.rangers.length} rangers from Excel file.`)

    reader.readAsArrayBuffer(target.files[0]);

    console.log(`5 Got ${this.rangers.length} rangers from Excel file.`)
    this.SortRangersByCallsign()

    // this.UpdateLocalStorage
    return this.rangers
  }

  /* Console log:
    LoadRangersFromExcel(): About to read contents of RangersExport.2022-0-27_8_36.csv
    ranger.service.ts:206 3 Got 0 rangers from Excel file.
    ranger.service.ts:224 Excel import from RangersExport.2022-0-27_8_36.csv: (1st 0 rows:)
    ranger.service.ts:209 4 Got 0 rangers from Excel file.
    ranger.service.ts:213 5 Got 0 rangers from Excel file.
    rangers.component.ts:214 excelData2: []
    ranger.service.ts:195 myJson = [["CallSign","Name","Phone","Address","Image","Team","Icon","Status","Note"],
    ["AC7TB","Sullivan, Timothy X","206-463-0000","St, Vashon, WA","./assets/imgs/REW/female.png",null,null,"Normal","no note"],
    ["AE7MW","Smueles, Robert E","206-463-0000","St, Vashon, WA","./assets/imgs/REW/RickWallace.png",null,null,"Normal","no note"],
    ["AE7RW","York, Randy K","206-463-0000","St, Vashon, WA","./assets/imgs/REW/VI-0003.jpg",null,null,"Normal","no note"],
    ["AE7SD","Danielson, Sharon J","206-463-0000","St, Vashon, WA","./assets/imgs/REW/VI-0034.jpg",null,null,"Normal","no note"],["AE7TH","Hardy, Timothy R","206-463-0000","St, Vashon, WA","./assets/imgs/REW/VI-0038.jpg",null,null,"Normal","no note"],["AG7TJ","Lindgren, Katrina J","206-463-0000","St, Vashon, WA","./assets/imgs/REW/VI-0041.jpg",null,null,"Normal","no note"],["AK7C","Mcdonald, Michael E","206-463-0000","St, Vashon, WA","./assets/imgs/REW/VI-0056.jpg",null,null,"Normal","no note"],["K1SAB","Brown, Steven A","206-463-0000","St, Vashon, WA","./assets/imgs/REW/VI-0058.jpg",null,null,"Normal","no note"],["K3QNQ","Treese, F Mitch A","206-463-0000","St, Vashon, WA","./assets/imgs/REW/VI-0069.jpg",null,null,"Normal","no note"],["K6AJV","Valencia, Andrew J","206-463-0000","St, Vashon, WA","./assets/imgs/REW/VI-007.jpg",null,null,"Normal","no note"],["K7AJT","Tharp, Adam J","206-463-0000","St, Vashon, WA","./assets/imgs/REW/VI-0073.jpg",null,null,"Normal","no note"],["K7DGL","Luechtefeld, Daniel","206-463-0000","St, Vashon, WA","./assets/imgs/REW/VI-0073.jpg",null,null,"Normal","no note"],["K7KMS","Paull, Steven","206-463-0000","St, Vashon, WA","./assets/imgs/REW/VI-0089.jpg",null,null,"Normal","no note"],["K7NHV","Francisco, Albert K","206-463-0000","St, Vashon, WA","./assets/imgs/REW/male.png",null,null,"Normal","no note"],["K7VMI","De Steiguer, Allen L","206-463-0000","St, Vashon, WA","./assets/imgs/REW/K7VMI.jpg",null,null,"Normal","no note"],["KA7THJ","Hanson, Jay R","206-463-0000","St, Vashon, WA","./assets/imgs/REW/male.png",null,null,"Normal","no note"],["KB0LJC","Hirsch, Justin D","206-463-0000","St, Vashon, WA","./assets/imgs/REW/male.png",null,null,"Normal","no note"],["KB7LEV","Lysen, Kurt A","206-463-0000","St, Vashon, WA","./assets/imgs/REW/female.png",null,null,"Normal","no note"],["KB7MTM","Meyer, Michael T","206-463-0000","St, Vashon, WA","./assets/imgs/REW/VI-0123.jpg",null,null,"Normal","no note"],["KE7KDQ","Cornelison, John","206-463-0000","St, Vashon, WA","./assets/imgs/REW/ke7kdq.jpg",null,null,"Normal","no note"]]
    ranger.service.ts:197 myJson2 = CallSign,Name,Phone,Address,Image,Team,Icon,Status,Note,
    AC7TB,Sullivan, Timothy X,206-463-0000,St, Vashon, WA,./assets/imgs/REW/female.png,,,Normal,no note,
    AE7MW,Smueles, Robert E,206-463-0000,St, Vashon, WA,./assets/imgs/REW/RickWallace.png,,,Normal,no note,
    AE7RW,York, Randy K,206-463-0000,St, Vashon, WA,./assets/imgs/REW/VI-0003.jpg,,,Normal,no note,AE7SD,Danielson, Sharon J,206-463-0000,St, Vashon, WA,./assets/imgs/REW/VI-0034.jpg,,,Normal,no note,AE7TH,Hardy, Timothy R,206-463-0000,St, Vashon, WA,./assets/imgs/REW/VI-0038.jpg,,,Normal,no note,AG7TJ,Lindgren, Katrina J,206-463-0000,St, Vashon, WA,./assets/imgs/REW/VI-0041.jpg,,,Normal,no note,AK7C,Mcdonald, Michael E,206-463-0000,St, Vashon, WA,./assets/imgs/REW/VI-0056.jpg,,,Normal,no note,K1SAB,Brown, Steven A,206-463-0000,St, Vashon, WA,./assets/imgs/REW/VI-0058.jpg,,,Normal,no note,K3QNQ,Treese, F Mitch A,206-463-0000,St, Vashon, WA,./assets/imgs/REW/VI-0069.jpg,,,Normal,no note,K6AJV,Valencia, Andrew J,206-463-0000,St, Vashon, WA,./assets/imgs/REW/VI-007.jpg,,,Normal,no note,K7AJT,Tharp, Adam J,206-463-0000,St, Vashon, WA,./assets/imgs/REW/VI-0073.jpg,,,Normal,no note,K7DGL,Luechtefeld, Daniel,206-463-0000,St, Vashon, WA,./assets/imgs/REW/VI-0073.jpg,,,Normal,no note,K7KMS,Paull, Steven,206-463-0000,St, Vashon, WA,./assets/imgs/REW/VI-0089.jpg,,,Normal,no note,K7NHV,Francisco, Albert K,206-463-0000,St, Vashon, WA,./assets/imgs/REW/male.png,,,Normal,no note,K7VMI,De Steiguer, Allen L,206-463-0000,St, Vashon, WA,./assets/imgs/REW/K7VMI.jpg,,,Normal,no note,KA7THJ,Hanson, Jay R,206-463-0000,St, Vashon, WA,./assets/imgs/REW/male.png,,,Normal,no note,KB0LJC,Hirsch, Justin D,206-463-0000,St, Vashon, WA,./assets/imgs/REW/male.png,,,Normal,no note,KB7LEV,Lysen, Kurt A,206-463-0000,St, Vashon, WA,./assets/imgs/REW/female.png,,,Normal,no note,KB7MTM,Meyer, Michael T,206-463-0000,St, Vashon, WA,./assets/imgs/REW/VI-0123.jpg,,,Normal,no note,KE7KDQ,Cornelison, John,206-463-0000,St, Vashon, WA,./assets/imgs/REW/ke7kdq.jpg,,,Normal,no note
    ranger.service.ts:198 1 Got 0 rangers from Excel file.
    ranger.service.ts:202 2 Got 21 rangers from Excel file...
*/

  //--------------------------------------------------------------------------
  DisplayRangers(msg: string) {
    let len = 10
    if (this.rangers.length < len) len = this.rangers.length
    console.log(`${msg}: (1st ${len} rows:)`)
    for (let i = 0; i < len; i++) {
      console.log(`${i} as $$: ${JSON.stringify(this.rangers[i])}`)
      //console.log(`${i} as $$: ${JSON.stringify(this.rangers[i])}`)
    }
  }

  //--------------------------------------------------------------------------
  LoadRangersFromExcel2() {
    debugger
    let fnc = new csvImport(document)
    fnc.importExcel2()
    //csvImport.importExcel2()
    console.log(`Got excel file`)
  }


  //--------------------------------------------------------------------------
  getRanger(callsign: string) {
    const index = this.findIndex(callsign);
    return this.rangers[index];
  }

  updateRanger(ranger: RangerType) {
    const index = this.findIndex(ranger.callsign);
    this.rangers[index] = ranger;
    this.UpdateLocalStorage();
  }

  deleteRanger(callsign: string) {
    const index = this.findIndex(callsign);
    this.rangers.splice(index, 1);
    this.UpdateLocalStorage();
  }

  // TODO: verify new report is proper shape/validated here or by caller??? Send as string or object?
  AddRanger(formData: string=""): RangerType {
    console.log(`RangerService: Got new ranger: ${formData}`)
    let newRanger: RangerType
    if (formData!="") {
      newRanger = JSON.parse(formData)
    } else {
      newRanger = {
        callsign: "AAA_New_Tactical",
        licensee: "AAA_New_Name",
        // licenseKey: number
      image: "  ",
        phone: "206-463-0000",
        address: "St, Vashon, WA 98070",
        team: "",
        icon: "",
        status: "",
        note: `Manually added at ${formatDate( Date.now(), 'short', "en-US")}.` //https://angular.io/guide/i18n-common-locale-id
      }
    }
    this.rangers.push(newRanger)

    this.UpdateLocalStorage();
    return newRanger;
  }

  private findIndex(callsign: string): number {
    for (let i = 0; i < this.rangers.length; i++) {
      if (this.rangers[i].callsign === callsign) return i;
    }
    throw new Error(`Ranger with callsign ${callsign} was not found!`);
  }

  //--------------------------------------------------------------------------
  deleteAllRangers() {
    this.rangers = []
    localStorage.removeItem('rangers')
    // localStorage.clear() // remove all localStorage keys & values from the specific domain you are on. Javascript is unable to get localStorage values from any other domains due to CORS
  }

  // this needs be done for the autocomplete control in the enter comonent to work correctly
  SortRangersByCallsign() {
    return this.rangers.sort((n1, n2) => {
      if (n1.callsign > n2.callsign) { return 1 }
      if (n1.callsign < n2.callsign) { return -1 }
      return 0;
    })
  }

  //--------------------------------------------------------------------------
  generateFakeData(num: number) {
    console.log("Adding 20 more FAKE Rangers")

    /* Following from 98070 AND 98013 zip codes, MUST be sorted by call sign!
        https://wireless2.fcc.gov/UlsApp/UlsSearch/searchAmateur.jsp
 */

    /* TODO: Implement better fake data and pay attention to the number to create...
    let teams = this.teamService.getTeams()
    let rangers = this.rangerService.getRangers()
    let streets = ["Ave", "St.", "Pl.", "Court", "Circle"]
    let notes = ["Reports beautiful sunrise", "Roudy Kids", "Approaching Neighborhood CERT", "Confused & dazed in the sun",
                  "Wow", "na", "Can't hear you", "Bounced via tail of a comet!", "Need confidential meeting: HIPAA", "Getting overrun by racoons"]

        for (let i = 0; i < num; i++) {
      array.push({
         callsign: rangers[Math.floor(Math.random() * rangers.length)].callsign,
         team: teams[Math.floor(Math.random() * teams.length)].name
         address: (Math.floor(Math.random() * 10000)) + " SW " + streets[(Math.floor(Math.random() * streets.length))],
        */

    this.rangers.push(
      { callsign: "KB0LJC", licensee: "Hirsch, Justin D", image: "./assets/imgs/REW/male.png", phone: "206-463-0000", address: "St, Vashon, WA", team: "", icon: "", status: "Normal", note: "" },
      { callsign: "AC7TB", licensee: "Sullivan, Timothy X", image: "./assets/imgs/REW/female.png", phone: "206-463-0000", address: "St, Vashon, WA", team: "", icon: "", status: "Normal", note: "" },
      { callsign: "KE7KDQ", licensee: "Cornelison, John", image: "./assets/imgs/REW/ke7kdq.jpg", phone: "206-463-0000", address: "St, Vashon, WA", team: "", icon: "", status: "Normal", note: "" },
      { callsign: "AE7MW", licensee: "Smueles, Robert E", image: "./assets/imgs/REW/RickWallace.png", phone: "206-463-0000", address: "St, Vashon, WA", team: "", icon: "", status: "Normal", note: "" },
      { callsign: "AE7RW", licensee: "York, Randy K", image: "./assets/imgs/REW/VI-0003.jpg", phone: "206-463-0000", address: "St, Vashon, WA", team: "", icon: "", status: "Normal", note: "" },
      { callsign: "AE7SD", licensee: "Danielson, Sharon J", image: "./assets/imgs/REW/VI-0034.jpg", phone: "206-463-0000", address: "St, Vashon, WA", team: "", icon: "", status: "Normal", note: "" },
      { callsign: "AE7TH", licensee: "Hardy, Timothy R", image: "./assets/imgs/REW/VI-0038.jpg", phone: "206-463-0000", address: "St, Vashon, WA", team: "", icon: "", status: "Normal", note: "" },
      { callsign: "AG7TJ", licensee: "Lindgren, Katrina J", image: "./assets/imgs/REW/VI-0041.jpg", phone: "206-463-0000", address: "St, Vashon, WA", team: "", icon: "", status: "Normal", note: "" },
      { callsign: "AK7C", licensee: "Mcdonald, Michael E", image: "./assets/imgs/REW/VI-0056.jpg", phone: "206-463-0000", address: "St, Vashon, WA", team: "", icon: "", status: "Normal", note: "" },
      { callsign: "K1SAB", licensee: "Brown, Steven A", image: "./assets/imgs/REW/VI-0058.jpg", phone: "206-463-0000", address: "St, Vashon, WA", team: "", icon: "", status: "Normal", note: "" },
      { callsign: "K3QNQ", licensee: "Treese, F Mitch A", image: "./assets/imgs/REW/VI-0069.jpg", phone: "206-463-0000", address: "St, Vashon, WA", team: "", icon: "", status: "Normal", note: "" },
      { callsign: "K6AJV", licensee: "Valencia, Andrew J", image: "./assets/imgs/REW/VI-007.jpg", phone: "206-463-0000", address: "St, Vashon, WA", team: "", icon: "", status: "Normal", note: "" },
      { callsign: "K7AJT", licensee: "Tharp, Adam J", image: "./assets/imgs/REW/VI-0073.jpg", phone: "206-463-0000", address: "St, Vashon, WA", team: "", icon: "", status: "Normal", note: "" },
      { callsign: "K7DGL", licensee: "Luechtefeld, Daniel", image: "./assets/imgs/REW/VI-0073.jpg", phone: "206-463-0000", address: "St, Vashon, WA", team: "", icon: "", status: "Normal", note: "" },
      { callsign: "K7KMS", licensee: "Paull, Steven", image: "./assets/imgs/REW/VI-0089.jpg", phone: "206-463-0000", address: "St, Vashon, WA", team: "", icon: "", status: "Normal", note: "" },
      { callsign: "K7NHV", licensee: "Francisco, Albert K", image: "./assets/imgs/REW/male.png", phone: "206-463-0000", address: "St, Vashon, WA", team: "", icon: "", status: "Normal", note: "" },
      { callsign: "K7VMI", licensee: "De Steiguer, Allen L", image: "./assets/imgs/REW/K7VMI.jpg", phone: "206-463-0000", address: "St, Vashon, WA", team: "", icon: "", status: "Normal", note: "" },
      { callsign: "KA7THJ", licensee: "Hanson, Jay R", image: "./assets/imgs/REW/male.png", phone: "206-463-0000", address: "St, Vashon, WA", team: "", icon: "", status: "Normal", note: "" },
      { callsign: "KB7LEV", licensee: "Lysen, Kurt A", image: "./assets/imgs/REW/female.png", phone: "206-463-0000", address: "St, Vashon, WA", team: "", icon: "", status: "Normal", note: "" },
      { callsign: "KB7MTM", licensee: "Meyer, Michael T", image: "./assets/imgs/REW/VI-0123.jpg", phone: "206-463-0000", address: "St, Vashon, WA", team: "", icon: "", status: "Normal", note: "" }
    )
    //console.log(`Next: update LocalStorage: ${this.localStorageRangerName}`)
    this.SortRangersByCallsign()
    this.UpdateLocalStorage();
    //console.log(`returned from: updating LocalStorage: ${this.localStorageRangerName}`)
  }

  // TODO:  getActiveRangers() {
  // filter for Ranger.status == 'checked in' ?
  // return this.rangers }

  /* Needed?!
  sortRangersByTeam() {
    return this.rangers.sort((n1, n2) => {
      if (n1.team > n2.team) { return 1 }
      if (n1.team < n2.team) { return -1 }
      return 0;
    })
  }
*/
}


/*
export class Ranger {

  static nextId = 1;
  id: Number;
  date: Date;
  callSign: string;
  licensee: string;

  constructor(callSign: string, name: string, licensee: string, team: string, licenseKey: string, phone: string, email: string, icon: string, note: string) {
    this.id = Ranger.nextId++; // TODO: OK if user restarts app during SAME mission #?
    this.date = new Date();
    this.callSign = callSign;
    this.licensee = licensee;

    // add validation code here?! or in forms code?
  }

}*/

