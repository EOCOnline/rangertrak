import { BehaviorSubject, Observable, Observer, of, throwError } from 'rxjs'
import { csvImport } from 'src/app/rangers/csvImport'
/* Following gets:
index.js:553 [webpack-dev-server] WARNING
D:\Projects\RangerTrak\rangertrak\src\app\log\log.component.ts depends on 'xlsx'. CommonJS or AMD dependencies can cause optimization bailouts.
For more info see: https://angular.io/guide/build#configuring-commonjs-dependencies */
import * as XLSX from 'xlsx'

import { formatDate } from '@angular/common'
import { HttpClient } from '@angular/common/http'
import { Injectable, OnInit, Optional, SkipSelf } from '@angular/core'

import * as rangers from '../../../assets/data/Rangers.3Feb22.json'
//import { debounceTime, map, startWith } from 'rxjs/operators'
import { LogService, RangerType } from './'

/* xlsx.js (C) 2013-present SheetJS -- http://sheetjs.com */
// https://github.com/SheetJS/SheetJS.github.io
// D:\Projects\ImportExcel\sheetjs-master\demos\angular2\src\app\sheetjs.component.ts
type AOA = any[][]  // array of arrays


/* BUG: Why are the following called TWICE?!

Ranger Service: Construction
Ranger Service: Loaded 301 rangers from local storage
Ranger Service: SortRangersByCallsign: 301 Rangers in array
Ranger Service: Got 301 from Local Storage
Ranger Service: New set of 301 rangers. Save to local storage & publish
Ranger Service: SortRangersByCallsign: 301 Rangers in array

Ranger Service: Construction
Ranger Service: Loaded 301 rangers from local storage
Ranger Service: SortRangersByCallsign: 301 Rangers in array
Ranger Service: Got 301 from Local Storage
Ranger Service: New set of 301 rangers. Save to local storage & publish
Ranger Service: SortRangersByCallsign: 301 Rangers in array
*/

@Injectable({ providedIn: 'root' })
export class RangerService {
  observeRangers$: Observable<RangerType[]> | null = null

  id = 'Ranger Service'

  private rangersSubject$ =
    new BehaviorSubject<RangerType[]>([])
  rangers: RangerType[] = []

  private localStorageRangerName = 'rangers'
  excelData: any[][] = [[1, 2], [3, 4]]

  constructor(
    @Optional() @SkipSelf() existingService: RangerService,
    private httpClient: HttpClient,
    private log: LogService
  ) {
    if (existingService) {
      /**
       * see https://angular.io/guide/singleton-services
       * Use @Optional() @SkipSelf() in singleton constructors to ensure
       * future modules don't provide extra copies of this singleton service
       * per pg 84 of Angular Cookbook: do NOT add services to *.module.ts!
       */
      throwError(() => {
        console.error(`This singleton service has already been provided in the application. Avoid providing it again in child modules.`)
        new Error(`This singleton service has already been provided in the application. Avoid providing it again in child modules.`)
      })
    }
    //! REVIEW: Gets called twice!!
    this.log.verbose("Construction", this.id)
    this.LoadRangersFromLocalStorage()
    this.log.verbose(`Got ${this.rangers.length} from Local Storage`, this.id)

    if (this.rangers.length == 0) {
      // TODO: Have user use button to load from their own CSV file

      // BUG: load from JSON isn't "quite" working so grab hardcoded values in code below!!!
      this.loadHardcodedRangers()
      this.log.verbose(`No Rangers in Local storage, so grabbed ${this.rangers.length} from
      hardcoded values.`, this.id)
      //Rangers.2Feb22.json file.`, this.id)
    }

    this.rangersSubject$ = new BehaviorSubject(this.rangers)
    this.updateLocalStorageAndPublish()
  }

  /**
   * Expose Observable to 3rd parties, but not the actual subject (which could be abused)
   */
  public getRangersObserver(): Observable<RangerType[]> {
    return this.rangersSubject$.asObservable()
  }

  /**
    * Update localStorage with new rangers & notify observers
    * REVIEW: ALSO called from RangerComponent with new updates!
    */
  public updateLocalStorageAndPublish() {
    // Do any needed sanity/validation here

    this.log.verbose(`New set of ${this.rangers.length} rangers. Save to local storage & publish`, this.id)
    this.SortRangersByCallsign()   // Only place this needs to be called?

    localStorage.setItem(this.localStorageRangerName, JSON.stringify(this.rangers))

    this.rangersSubject$.next(this.rangers)
  }

  //--------------------------------------------------------------------------
  LoadRangersFromLocalStorage() { // WARN: Replaces any existing Rangers
    let localStorageRangers = localStorage.getItem(this.localStorageRangerName)
    try {
      this.rangers = (localStorageRangers != null) ? JSON.parse(localStorageRangers) : []   //TODO: clean up
      this.log.excessive(`Loaded ${this.rangers.length} rangers from local storage`, this.id)
    } catch (error: any) {
      this.log.verbose(`Unable to parse Rangers from Local Storage. Error: ${error.message}`, this.id)
    }
    this.SortRangersByCallsign()   // TODO: Getting called too often?
  }

  //--------------------------------------------------------------------------
  LoadRangersFromJSON(fileName: string = '../../../assets/data/Rangers.3Feb22.json') {  // WARN: Replaces any existing Rangers
    this.log.verbose(`loading new Rangers from ${fileName}`, this.id)

    //debugger

    // also see secrets import as an example: Settings.ts

    this.observeRangers$ = this.httpClient.get<RangerType[]>(fileName) // from pg 281

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
    this.SortRangersByCallsign()   // TODO: Getting called too often?
    this.log.verbose(`Got ${this.rangers.length} rangers from JSON file.`, this.id)
  }

  //See pg. 279...
  //import * as data from filename;
  //let greeting = data.greeting;
  /*   import {default as AAA} from "VashonCallSigns";
        AAA.targetKey
        // this requires `"resolveJsonModule": true` in tsconfig.json

        import {default as yyy} from './Rangers.3Feb22.json'
import { HttpClient } from '@angular/common/http';
        yyy.primaryMain


    ngOnInit(): void {

            this.myService.getResponseData().then((value) => {
                //SUCCESS
                this.log.verbose(value, this.id);
                this.detailsdata = value;

            }, (error) => {
                //FAILURE
                this.log.verbose(error, this.id);
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

    // TODO: https://h2qutc.github.io/angular-material-components/fileinput
    type AOR = RangerType[]  // array of Rangers

    // wire up file reader
    const target: DataTransfer = <DataTransfer>(eventTarget);

    if (target.files.length !== 1) throw new Error('Cannot use multiple files');
    this.log.verbose(`LoadRangersFromExcel(): About to read contents of ${target.files[0].name}`, this.id)
    const reader: FileReader = new FileReader();
    reader.onload = (e: any) => {

      // read workbook
      const ab: ArrayBuffer = e.target.result;
      const wb: XLSX.WorkBook = XLSX.read(ab);

      // grab first sheet
      const wsname: string = wb.SheetNames[0];
      const ws: XLSX.WorkSheet = wb.Sheets[wsname];

      // debugger

      let myJson = JSON.stringify(XLSX.utils.sheet_to_json(ws, { header: 1 }))

      this.log.verbose(`myJson = ${myJson}`, this.id)
      let myJson2 = JSON.parse(myJson)
      this.log.excessive(`myJson2 = ${myJson2}`, this.id)
      this.log.excessive(`1 Got ${this.rangers.length} rangers from Excel file.`, this.id)

      // save data
      this.rangers = <AOR>(myJson2)
      this.log.excessive(`2 Got ${this.rangers.length} rangers from Excel file...`, this.id)

      //this.rangers = JSON.parse(myJson)
    };
    this.log.excessive(`3 Got ${this.rangers.length} rangers from Excel file.`, this.id)

    //this.DisplayRangers_unused(`Excel import from ${target.files[0].name}`)
    this.log.excessive(`4 Got ${this.rangers.length} rangers from Excel file.`, this.id)

    reader.readAsArrayBuffer(target.files[0]);

    this.log.excessive(`5 Got ${this.rangers.length} rangers from Excel file.`, this.id)
    this.SortRangersByCallsign()

    // this.UpdateLocalStorage
    return this.rangers
  }

  deleteAllRangers() {
    this.rangers = []
    localStorage.removeItem('rangers')
    // localStorage.clear() // remove all localStorage keys & values from the specific domain you are on. Javascript is unable to get localStorage values from any other domains due to CORS
  }

  // this needs be done for the autocomplete control in the enter comonent to work correctly
  // TODO: Getting called too often?
  SortRangersByCallsign() {
    this.log.excessive(`SortRangersByCallsign: ${this.rangers.length} Rangers in array`, this.id)

    return this.rangers.sort((n1, n2) => {
      if (n1.callsign > n2.callsign) { return 1 }
      if (n1.callsign < n2.callsign) { return -1 }
      return 0;
    })
  }

  // TODO: verify new report is proper shape/validated here or by caller??? Send as string or object?
  public AddRanger(formData: string = ""): RangerType {
    this.log.excessive(`Got new ranger: ${formData}`, this.id)
    let newRanger: RangerType
    if (formData != "") {
      newRanger = JSON.parse(formData)
    } else {
      newRanger = {
        callsign: "!A_New_Tactical", licensee: "AAA_New_Name",        // licenseKey: number
        image: "  ", rew: "VI-00 ", phone: "206-463-0000", address: "St, Vashon, WA 98070", team: "", icon: "", status: "", note: `Manually added at ${formatDate(Date.now(), 'short', "en-US")}.` //https://angular.io/guide/i18n-common-locale-id
      }
    }
    this.rangers.push(newRanger)

    this.updateLocalStorageAndPublish();
    return newRanger;
  }


  //-------------------  UNUSED -----------------------------
  private displayRangers_unused(msg: string) {
    let len = 10
    if (this.rangers.length < len) len = this.rangers.length
    this.log.excessive(`${msg}: (1st ${len} rows:)`, this.id)
    for (let i = 0; i < len; i++) {
      this.log.excessive(`${i} as $$: ${JSON.stringify(this.rangers[i])}`, this.id)
      //this.log.verbose(`${i} as $$: ${JSON.stringify(this.rangers[i])}`, this.id)
    }
  }

  public loadRangersFromExcel2() {  // still called by rangers Component from a button
    //debugger
    let fnc = new csvImport(document)
    fnc.importExcel2()
    //csvImport.importExcel2()
    this.log.verbose(`Got excel file`, this.id)
  }

  getRanger(callsign: string) {
    const index = this.findIndex(callsign);
    return this.rangers[index];
  }

  updateRanger(ranger: RangerType) {
    const index = this.findIndex(ranger.callsign);
    this.rangers[index] = ranger;
    this.updateLocalStorageAndPublish();
  }

  deleteRanger(callsign: string) {
    const index = this.findIndex(callsign);
    this.rangers.splice(index, 1);
    this.updateLocalStorageAndPublish();
  }

  private findIndex(callsign: string): number {
    for (let i = 0; i < this.rangers.length; i++) {
      if (this.rangers[i].callsign === callsign) return i;
    }
    throw new Error(`Ranger with callsign ${callsign} was not found!`);
  }

  SortRangersByCallsign_unused() {
    this.log.verbose(`SortRangersByCallsign: ${this.rangers.length} Rangers in array`, this.id)

    //debugger
    //return this.rangers

    if (this.rangers.length == 0) {
      return
    }

    //let sorted4 = this.rangers

    this.rangers.sort((a, b) => {
      if (b.callsign > a.callsign) return -1
      if (b.callsign < a.callsign) return 1
      return 0
    })
    //  let sorted = this.rangers.sort((first, second) => first.callsign > second.callsign ? 1 : -1)

    this.log.excessive("SortRangersByCallsign...DONE --- BUT ARE THEY REVERSED?!", this.id)
    return this.rangers
  }

  //--------------------------------------------------------------------------
  loadHardcodedRangers() {
    this.log.verbose("Adding all hardcoded Rangers", this.id)

    /* Following from 98070 AND 98013 zip codes, MUST be sorted by call sign!
        https://wireless2.fcc.gov/UlsApp/UlsSearch/searchAmateur.jsp
  */
    // REVIEW: push (i.e., add) vs. replace?
    this.rangers.push(

      { callsign: "!CmdPost", licensee: "ACS-CERT Cmd Post", phone: "206-463-", address: "Vashon, WA 98070", image: "./CmdPost.jpg", rew: "CmdPost", team: "T0", icon: " ", status: "Licensed", note: "-" },

      { callsign: "!Team1", licensee: "ACS-CERT Team 1", phone: "206-463-", address: "Vashon, WA 98070", image: "./Team_blue.png", rew: "", team: "T1", icon: " ", status: "Licensed", note: "-" },
      { callsign: "!Team2", licensee: "ACS-CERT Team 2", phone: "206-463-", address: "Vashon, WA 98070", image: "./Team_red.png", rew: "", team: "T1", icon: " ", status: "Licensed", note: "-" },
      { callsign: "!Team3", licensee: "ACS-CERT Team 3", phone: "206-463-", address: "Vashon, WA 98070", image: "./Team_yellow.png", rew: "", team: "T1", icon: " ", status: "Licensed", note: "-" },
      { callsign: "!Team4", licensee: "ACS-CERT Team 4", phone: "206-463-", address: "Vashon, WA 98070", image: "./Team_brown.png", rew: "", team: "T1", icon: " ", status: "Licensed", note: "-" },


      { callsign: "MERT1", licensee: "MERT 1", phone: "206-463-", address: "Vashon, WA 98070", image: "./yacht_red.png", rew: "", team: "MERT1", icon: " ", status: "Licensed", note: "-" },
      { callsign: "MERT2", licensee: "MERT 2", phone: "206-463-", address: "Vashon, WA 98070", image: "./mert_green.png", rew: "", team: "MERT2", icon: " ", status: "Licensed", note: "-" },
      { callsign: "MERT3", licensee: "MERT 3", phone: "206-463-", address: "Vashon, WA 98070", image: "./yacht_magenta.png", rew: "", team: "MERT3", icon: " ", status: "Licensed", note: "-" },
      { callsign: "MERT4", licensee: "MERT 4", phone: "206-463-", address: "Vashon, WA 98070", image: "./mert_orange.png", rew: "", team: "MERT4", icon: " ", status: "Licensed", note: "-" },
      { callsign: "MERT5", licensee: "MERT 5", phone: "206-463-", address: "Vashon, WA 98070", image: "./yacht_yellow.png", rew: "", team: "MERT5", icon: " ", status: "Licensed", note: "-" },
      { callsign: "MERT6", licensee: "MERT 6", phone: "206-463-", address: "Vashon, WA 98070", image: "./mert_blue.png", rew: "", team: "MERT6", icon: " ", status: "Licensed", note: "-" },

      { callsign: "CERT1", licensee: "CERT 1", phone: "206-463-", address: "Vashon, WA 98070", image: "./cert_red.png", rew: "", team: "CERT1", icon: " ", status: "Licensed", note: "-" },
      { callsign: "CERT2", licensee: "CERT 2", phone: "206-463-", address: "Vashon, WA 98070", image: "./cert_green.png", rew: "", team: "CERT2", icon: " ", status: "Licensed", note: "-" },
      { callsign: "CERT3", licensee: "CERT 3", phone: "206-463-", address: "Vashon, WA 98070", image: "./cert_yellow.png", rew: "", team: "CERT3", icon: " ", status: "Licensed", note: "-" },
      { callsign: "CERT4", licensee: "CERT 4", phone: "206-463-", address: "Vashon, WA 98070", image: "./cert_blue.png", rew: "", team: "CERT4", icon: " ", status: "Licensed", note: "-" },
      { callsign: "CERT5", licensee: "CERT 5", phone: "206-463-", address: "Vashon, WA 98070", image: "./cert_brown.png", rew: "", team: "CERT5", icon: " ", status: "Licensed", note: "-" },
      { callsign: "CERT6", licensee: "CERT 6", phone: "206-463-", address: "Vashon, WA 98070", image: "./cert_purple.png", rew: "", team: "CERT6", icon: " ", status: "Licensed", note: "-" },

      { callsign: "REW1", licensee: "REW 1", phone: "206-463-", address: "Vashon, WA 98070", image: "./helmet_orange.png", rew: "", team: "REW1", icon: " ", status: "Licensed", note: "-" },
      { callsign: "REW2", licensee: "REW 2", phone: "206-463-", address: "Vashon, WA 98070", image: "./helmet_blue.png", rew: "", team: "REW2", icon: " ", status: "Licensed", note: "-" },
      { callsign: "REW3", licensee: "REW 3", phone: "206-463-", address: "Vashon, WA 98070", image: "./helmet_red.png", rew: "", team: "REW3", icon: " ", status: "Licensed", note: "-" },
      { callsign: "REW4", licensee: "REW 4", phone: "206-463-", address: "Vashon, WA 98070", image: "./helmet_tan.png", rew: "", team: "REW4", icon: " ", status: "Licensed", note: "-" },


      { callsign: "AH6B", licensee: "Pine, Douglas E", phone: "206-463-", address: "9700 Sw 285Th St, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "AJ7T", licensee: "Pinter, Robert B", phone: "206-463-", address: "12203 Sw 153Rd St, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "AK7C", licensee: "Mcdonald, Michael E", phone: "206-463-", address: "24107 Wax Orchard Rd Sw, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "K7NHV", licensee: "Francisco, Albert K", phone: "206-463-", address: ", Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "K7VJJ", licensee: "Gleason, Keith H", phone: "206-463-", address: "11423 99Th Ave, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KA2QLV", licensee: "Paull, Steven", phone: "206-463-", address: "11610 Sw 220Th St, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KA7DGV", licensee: "Hardy, Timothy R", phone: "206-463-", address: "29715 128Th Ave Sw, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KA7GDT", licensee: "White, Victor S", phone: "206-463-", address: "15314 Vermontville, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KA7IXC", licensee: "Carr, David W", phone: "206-463-", address: "Rt 1 Box 244, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KA7THJ", licensee: "Hanson, Jay R", phone: "206-463-", address: "12424 Sw Cove Rd, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KB0LJC", licensee: "Hirsch, Justin D", phone: "206-463-", address: "10518 Sw 132Nd Pl, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KB7AOK", licensee: "Perena, Jose K", phone: "206-463-", address: "21226 Tramp Harbor Drive Sw, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KB7DQG", licensee: "Ammon, Paul G", phone: "206-463-", address: "Rt 1 Box 1142, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KB7DQI", licensee: "Gleb, Phillip L", phone: "206-463-", address: "R 3 B 427, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KB7EIF", licensee: "Ammon, Virginia M", phone: "206-463-", address: "Rt 1 Box 1142, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KB7IHS", licensee: "Gregory, Arthur J", phone: "206-463-", address: "Rt 3 Box 279, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KB7IMA", licensee: "Fultz, Howard T", phone: "206-463-", address: ", Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KB7NDW", licensee: "Hacker, Richard M", phone: "206-463-", address: "25407 Wax Orchard Rd Sw, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KB7OXU", licensee: "Weir, Janet J", phone: "206-463-", address: "8115 Sw Klahanie Rd, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KB7OXV", licensee: "Weir, Robert D", phone: "206-463-", address: "8115 Sw Klahanie Rd, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KB7QFF", licensee: "Lindgren, Clifford W", phone: "206-463-", address: "27405 99Th Ave Sw, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KB7YYM", licensee: "Mermoud Babbott, Leslie R", phone: "206-463-", address: "8131 Sw Dilworth Rd, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KC2ELS", licensee: "Twilley, John M", phone: "206-463-", address: "10210 Sw 210Th St, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KC7AUT", licensee: "Nishiyori, Kenneth W", phone: "206-463-", address: "17520 115Th Ave Sw, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KC7AUY", licensee: "Blichfeldt, Bent", phone: "206-463-", address: "26620 99Th Ave Sw, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KC7IXZ", licensee: "Harrigan, Sparky", phone: "206-463-", address: "14609 Bethel Ln Sw, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KC7IYA", licensee: "Carr, Marvin E", phone: "206-463-", address: "8923 Sw Qtrmstr Dr, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KC7JMQ", licensee: "Hardy, Denise L", phone: "206-463-", address: "29715 128Th Ave Sw, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KC7JOH", licensee: "Ferch, Carol A", phone: "206-463-", address: "10977 Pt Vashon Dr Sw, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KC7ZOX", licensee: "Hanusa, Mark M", phone: "206-463-", address: "23910 51St Ln Sw, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KC7ZOY", licensee: "Carpenter, Mary L", phone: "206-463-", address: ", Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KD7AYE", licensee: "Ruzicka, David L", phone: "206-463-", address: "15117 119Th Ave Sw, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KD7BUR", licensee: "Hill, Gerald C", phone: "206-463-", address: ", Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KD7CEK", licensee: "Hill, Melinda R", phone: "206-463-", address: ", Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KD7DQO", licensee: "Silver, Lowell E", phone: "206-463-", address: "22916 107Th Ave Sw, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KD7FWQ", licensee: "Hill, Joseph V", phone: "206-463-", address: ", Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KE6OOQ", licensee: "Rockwell, Neil I", phone: "206-463-", address: "12233 Sw Cove Rd, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KE6WXA", licensee: "Garrison, Elizabeth B", phone: "206-463-", address: ", Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KG7CM", licensee: "Galus, John F", phone: "206-463-", address: "19323 Westside Hwy Sw, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KI7UQ", licensee: "Willsie, Howard D", phone: "206-463-", address: "10977 Pt Vashon Dr Sw, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KJ7MM", licensee: "Babbott Iii, Frank L", phone: "206-463-", address: "8131 Sw Dilworth Rd, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "N6QIV", licensee: "Goard, Carolyn S", phone: "206-463-", address: "10613 Sw 133Rd St, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "N6SCM", licensee: "Valencia, Jane K", phone: "206-463-", address: "16917 Vashon Hwy Sw, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "N7DZD", licensee: "Vornbrock, John T", phone: "206-463-", address: "13617 Sw 235 St, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "N7EUL", licensee: "Konecki, John T", phone: "206-463-", address: "17904 Westside Hwy Sw, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "N7KOC", licensee: "Gee, E Howard", phone: "206-463-", address: "Rt 3 Box 287, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "N7MSN", licensee: "Dreisbach, Ezra M", phone: "206-463-", address: "Rt 5 Box 436 Bank Rd, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "N7PAE", licensee: "Tousley, Jeffrey L", phone: "206-463-", address: "11020 Sw 232 St, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "W5RCO", licensee: "Gregory, John R", phone: "206-463-", address: "11120 Sw Sylvan Beach Rd, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "W7ATK", licensee: "Benzon, Frank A", phone: "206-463-", address: "10709 Sw 238 St, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "W7AY", licensee: "Cruse, Wilke E", phone: "206-463-", address: "11506 105Th Pl Sw, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "W7IDF", licensee: "Cole, Edwin K", phone: "206-463-", address: ", Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "W7KYI", licensee: "Merrell, Stanton C", phone: "206-463-", address: "24186 Vashon Hwy Sw, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "W7PPA", licensee: "Hickox, Ernest C", phone: "206-463-", address: "6113 Sw 240Th St., Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "W7TSD", licensee: "Allen, Bruce B", phone: "206-463-", address: ", Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "W7WS", licensee: "Williams, Jerry B", phone: "206-463-", address: "22317 Dockton Sw, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "WA6VJQ", licensee: "Garland, Earl E", phone: "206-463-", address: ", Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "WA7EAW", licensee: "Mc Farlane, Claude L", phone: "206-463-", address: "9127 Sw Bayview Drive, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "WA7HJJ", licensee: "Kellum, Donald F", phone: "206-463-", address: ", Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "WA7KYI", licensee: "Tharp, James C", phone: "206-463-", address: "9236 Sw 274Th, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "WA7SVS", licensee: "Ball Jr, Lemuel B", phone: "206-463-", address: ", Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "WB5PSV", licensee: "Bardwell, Randall D", phone: "206-463-", address: "25236 107Th Ave Se, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "WB6RRU", licensee: "Valencia, Andrew J", phone: "206-463-", address: "16245 Westside Hwy, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "WB7FCH", licensee: "Vogel, Keith W", phone: "206-463-", address: "9230 Sw 192Nd St, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "WB7QIJ", licensee: "Linden, George M", phone: "206-463-", address: "8768 Sw 190 St, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "WB7VKE", licensee: "Sullivan, Timothy X", phone: "206-463-", address: "23515 Kingsbury Rd Sw, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KD7GMW", licensee: "Hill, Deborah", phone: "206-463-", address: ", Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KD5JYQ", licensee: "Lund, David W", phone: "206-463-", address: "9525 Sw 288Th St, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KD7JWH", licensee: "Kovarik, Krejimir", phone: "206-463-", address: ", Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KD7JWI", licensee: "Bajramovic, Nermin", phone: "206-463-", address: ", Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KD7JWJ", licensee: "Corsi, Pietro", phone: "206-463-", address: ", Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "K5CRO", licensee: "Kovarik, Kresimir", phone: "206-463-", address: ", Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KD7MUB", licensee: "Clemens, Barry M", phone: "206-463-", address: "10330 Sw Bank Rd, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KG6IGC", licensee: "Vashon-Maury Island Radio Club", phone: "206-463-", address: ", Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KD7OPX", licensee: "Vashon-Maury Island Radio Club", phone: "206-463-", address: ", Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KD7PAZ", licensee: "Miller, Lee A", phone: "206-463-", address: ", Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KD7PBA", licensee: "Zook, Phillip D", phone: "206-463-", address: ", Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KD7PBB", licensee: "Miller, Joan A", phone: "206-463-", address: "8931 Sw Quartermaster Dr, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KD7PBC", licensee: "Kremer, Richard H", phone: "206-463-", address: ", Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KD7PBD", licensee: "Treese, F Mitch A", phone: "206-463-", address: ", Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KD7PBE", licensee: "Loveness, Gary R", phone: "206-463-", address: ", Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KD7PBF", licensee: "Loveness, Ghyrn W", phone: "206-463-", address: ", Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KD7PBG", licensee: "Sommers, Gayle", phone: "206-463-", address: ", Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KD7PFA", licensee: "Frye, Leslie G", phone: "206-463-", address: "22829 107Th Ave Sw, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KD7PFB", licensee: "Frye, Richard D", phone: "206-463-", address: "22829 107Th Ave Sw, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KD7PMV", licensee: "Lickfelt, Kevin R", phone: "206-463-", address: "9857 Sw 148Th St, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KD7PMW", licensee: "Clemens, Lauren M", phone: "206-463-", address: "10330 Sw Bank Rd, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KD7PMX", licensee: "Silver, Nancy R", phone: "206-463-", address: "22916 107Th Ave Sw, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KD7QAM", licensee: "Richards, John A", phone: "206-463-", address: "9133 Sw 274Th, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KD7QEX", licensee: "Snow, Brett S", phone: "206-463-", address: "10809 Sw 204Th, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "N7GRL", licensee: "Loveness, Gary R", phone: "206-463-", address: "14122 Sw 220Th Street, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "W7GWL", licensee: "Loveness, Ghyrn W", phone: "206-463-", address: "14122 Sw 220Th Street, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "W7CXB", licensee: "Richards, John M", phone: "206-463-", address: "9133 Sw 274Th, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "K3QNQ", licensee: "Treese, F Mitch A", phone: "206-463-", address: "15024 107Th Way Sw Express Mail Only, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "W7PDZ", licensee: "Zook, Phillip D", phone: "206-463-", address: ", Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "W7TRH", licensee: "Hardy, Timothy R", phone: "206-463-", address: "29715 128Th Ave Sw, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KD7RWJ", licensee: "Nelson, Jack H", phone: "206-463-", address: ", Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KU0W", licensee: "Frye, Richard D", phone: "206-463-", address: "22829 107Th Ave Sw, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KD7SMI", licensee: "Griswold, James E", phone: "206-463-", address: "5724 Sw 244Th, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "W7VMI", licensee: "Vashon-Maury Island Radio Club", phone: "206-463-", address: ", Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KD7VSA", licensee: "Givotovsky, Alan", phone: "206-463-", address: "23607 49Th Ave Sw, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KD7ZOW", licensee: "Tabscott, Robert L", phone: "206-463-", address: "14215 Sw 283Rd, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KD7ZPH", licensee: "Carson, Polly M", phone: "206-463-", address: "14215 Sw 283Rd, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KD7ZVK", licensee: "Rollo, Jack W", phone: "206-463-", address: "9733 Sw Harbor Dr, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KD7ZYJ", licensee: "De Steiguer, Allen L", phone: "206-463-", address: "17615 Mclean Rd Sw, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KE7AJY", licensee: "Boardman, James H", phone: "206-463-", address: "10619 Sw Cowan Rd, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KE7AKA", licensee: "Coldeen, Chris A", phone: "206-463-", address: "16103 Westside Hwy Sw, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KE7AKB", licensee: "Turner, Ed", phone: "206-463-", address: ", Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KE7AKC", licensee: "Wolczko Dvm, Donald P", phone: "206-463-", address: "8819 S.W. 198Th St., Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KJ1MBO", licensee: "Boardman, James H", phone: "206-463-", address: "10619 Sw Cowan Rd, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KE7AWP", licensee: "Tharp, Adam J", phone: "206-463-", address: "9236 Sw 274Th St, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KE7BGK", licensee: "Powell, Robert D", phone: "206-463-", address: "19917 Vashon Hwy Sw, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "K7AJT", licensee: "Tharp, Adam J", phone: "206-463-", address: "9236 Sw 274Th St, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "N7RDP", licensee: "Powell, Robert D", phone: "206-463-", address: "19917 Vashon Hwy Sw, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "K7VMI", licensee: "De Steiguer, Allen L", phone: "206-463-", address: "17615 Mclean Rd Sw, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KE7DEO", licensee: "Harshman, Clifford E", phone: "206-463-", address: "9522 Sw 268Th Street, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KO7P", licensee: "Pine, Douglas E", phone: "206-463-", address: "9700 Sw 285Th St, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KE7HBX", licensee: "Karusaitis, Rhoda B", phone: "206-463-", address: ", Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KE7HBY", licensee: "Cooper, David F", phone: "206-463-", address: "8763 Sw 190Th St, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KE7HBZ", licensee: "Danielson, Sharon J", phone: "206-463-", address: ", Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KE7HCA", licensee: "Stanton, John S", phone: "206-463-", address: ", Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KE7HCB", licensee: "Bentley, Michael B", phone: "206-463-", address: "17823 Mclean Rd Sw, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KE7HFF", licensee: "Morse, Marsha E", phone: "206-463-", address: ", Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KE7HFG", licensee: "Fitzpatrick, Walton R", phone: "206-463-", address: ", Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KE7HFH", licensee: "Kaufer, Tom M", phone: "206-463-", address: "11725 Sw Cedarhurst Dr, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "K6AJV", licensee: "Valencia, Andrew J", phone: "206-463-", address: "16917 Vashon Hwy Sw, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KE7KDQ", licensee: "Cornelison, John", phone: "206-463-", address: "10506 Sw 132Nd Pl, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KE7KDV", licensee: "Danielson, Richard A", phone: "206-463-", address: ", Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KE7LER", licensee: "Brown, Steven A", phone: "206-463-", address: "5213 Sw Point Robinson Rd, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KE7MTN", licensee: "Schueler, Dan F", phone: "206-463-", address: "21917 131St Pl Sw, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KE7OTE", licensee: "Way, Steve C", phone: "206-463-", address: "13129 Sw 248Th St, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "NH6ZA", licensee: "Pine, Douglas E", phone: "206-463-", address: "4904 Sw Luana Ln, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KE7RXD", licensee: "Kellogg, Loren B", phone: "206-463-", address: "18223 Vashon Hwy Sw, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "K7KMS", licensee: "Paull, Steven", phone: "206-463-", address: ", Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KE7VNA", licensee: "Nelson, William C", phone: "206-463-", address: "15655 94Th Ave Sw, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "K7DGL", licensee: "Luechtefeld, Daniel", phone: "206-463-", address: "9727 Sw Summerhurst Rd, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KE7YLI", licensee: "Leblanc, Christopher A", phone: "206-463-", address: "26220 99Th Ave Sw, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KF7CBK", licensee: "Wojcik, Peter A", phone: "206-463-", address: "27436 90Th Ave Sw, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KF7FDK", licensee: "Joffray, Flynn T", phone: "206-463-", address: "11312 Sw 232Nd St, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KF7GPM", licensee: "Van Egmond, Raynier A", phone: "206-463-", address: "10104 Sw 153Rd St, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "K7RDB", licensee: "Bardwell, Randall D", phone: "206-463-", address: "12215 Sw Shawnee Road, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KF7JCT", licensee: "Underwood, Robert S", phone: "206-463-", address: ", Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KF7NCS", licensee: "Staczek, Jason L", phone: "206-463-", address: ", Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KF7NYC", licensee: "Hamaker, James R", phone: "206-463-", address: "8903 Bayview Dr, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KF7OKQ", licensee: "Wallace, Rick", phone: "206-463-", address: "23817 104Th Ave Sw, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "W0RIK", licensee: "Wallace, Rick", phone: "206-463-", address: "23817 104Th Ave Sw, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "AE7MW", licensee: "Smueles, Robert E", phone: "206-463-", address: "11909 Sw 232Nd St, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KF7QCE", licensee: "Cochrane, Michael L", phone: "206-463-", address: "5313 Sw Pt Robinson Rd, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KF7QCF", licensee: "Durrett, Erin A", phone: "206-463-", address: "6002 Sw Pt Robinson Rd, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KF7QCH", licensee: "Rogers, Catherine A", phone: "206-463-", address: ", Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KF7QCJ", licensee: "Blichfeldt Cooper, Ulla", phone: "206-463-", address: "8763 Sw 190Th St, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KF7QCK", licensee: "Stratton, Rex B", phone: "206-463-", address: ", Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "AE7SD", licensee: "Danielson, Sharon J", phone: "206-463-", address: "23528 Landers Rd. Sw, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "AE7TH", licensee: "Hardy, Timothy R", phone: "206-463-", address: "29715 128Th Ave Sw, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "K1SAB", licensee: "Brown, Steven A", phone: "206-463-", address: "5213 Sw Point Robinson Rd, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KF7VDA", licensee: "Galus, Georgia A", phone: "206-463-", address: "19323 Westside Hwy Sw, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KF7VVR", licensee: "Ellison-Taylor, John M", phone: "206-463-", address: "29746 128Th Ave Sw, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KF7WOQ", licensee: "Hyde Iv, James F", phone: "206-463-", address: "6109 Sw Pt Robinson Rd, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KG7BSE", licensee: "Blackstone, Robert A", phone: "206-463-", address: "4409 Sw Pt Robinson Rd, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KG7BSF", licensee: "Woods, Melodie", phone: "206-463-", address: ", Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KG7BSG", licensee: "Cochrane, Catherine S", phone: "206-463-", address: ", Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KG7BSH", licensee: "Edwards, Shelby T", phone: "206-463-", address: "10806 Sw Cemetery Rd, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KG7BSI", licensee: "Moore, Wanda L", phone: "206-463-", address: ", Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KG7BSJ", licensee: "Kennedy Taylor, Alison K", phone: "206-463-", address: "29746 128Th Ave Sw, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KG7BSK", licensee: "King, Lori J", phone: "206-463-", address: ", Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KG7BSL", licensee: "Lyell, William E", phone: "206-463-", address: ", Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KG7BSM", licensee: "Symonds, Penni J", phone: "206-463-", address: "15626 91St Ave Sw, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KG7BSN", licensee: "Blackstone, Randee C", phone: "206-463-", address: "4409 Sw Pt Robinson Rd, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KG7BSQ", licensee: "Lyell, Jan R", phone: "206-463-", address: ", Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KG7BSR", licensee: "Sussman, Stephen M", phone: "206-463-", address: "15626 91St Ave Sw, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KG7CFG", licensee: "O'Brien, Truman E", phone: "206-463-", address: ", Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KG7CFH", licensee: "Stone, Nancy E", phone: "206-463-", address: "15502 91St Ave Sw, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KG7CFI", licensee: "Nelson, Mary E", phone: "206-463-", address: ", Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KG7CFJ", licensee: "O'Brien, Mary A", phone: "206-463-", address: ", Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KG7CFK", licensee: "Hayes, Ira A", phone: "206-463-", address: ", Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "W7MCW", licensee: "Woods, Melodie", phone: "206-463-", address: ", Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "W7AKT", licensee: "Kennedy Taylor, Alison K", phone: "206-463-", address: "29746 128Th Ave Sw, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KG7EQW", licensee: "Lecky, Ned", phone: "206-463-", address: "24427 Wax Orchard Rd Sw, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KG7JIQ", licensee: "Beles, Lynette B", phone: "206-463-", address: "18823 Robinwood Rd Sw, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KG7JIR", licensee: "Danielsen, Jacob M", phone: "206-463-", address: "16400 Vashon Hwy, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KG7JIS", licensee: "Hauser, James W", phone: "206-463-", address: "21713 Highland Ave Sw, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KG7JIT", licensee: "Goebel, David A", phone: "206-463-", address: "12412 Vashon Hwy Sw, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KG7JIU", licensee: "Cain, Lidunn O", phone: "206-463-", address: "9130 Sw Cemetery Rd, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KG7JIV", licensee: "York, Randy K", phone: "206-463-", address: "27909 140Th Ave Sw, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KG7JIX", licensee: "De Monterey Richoux, Victoria", phone: "206-463-", address: ", Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KG7JIY", licensee: "Freiling, Beth Anne", phone: "206-463-", address: "12412 Vashon Hwy Sw, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KG7JJA", licensee: "Jones, Aaron", phone: "206-463-", address: "10411 Sw Cemetery Rd, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KG7LMS", licensee: "Bush, Gregory M", phone: "206-463-", address: "14830 Glen Acres Rd Sw, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KG7NCF", licensee: "Gagner, Craig A", phone: "206-463-", address: ", Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KG7PNB", licensee: "Meyer, Michael T", phone: "206-463-", address: "25814 78Th Ave Sw, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KG7RTH", licensee: "Hennessey, Shannon M", phone: "206-463-", address: "14605 107Th Way Sw, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KB7MTM", licensee: "Meyer, Michael T", phone: "206-463-", address: "25814 78Th Ave Sw, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KG7TAN", licensee: "James, Lawrence C", phone: "206-463-", address: "23632 71St Ave Sw, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KG7UAY", licensee: "Allen, Thomas M", phone: "206-463-", address: "25812 76Th Ave Sw, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KG7UAZ", licensee: "Bossom, Eden A", phone: "206-463-", address: "20318 81St Ave Sw, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KG7UBA", licensee: "Sussman, Carole E", phone: "206-463-", address: ", Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KG7UBB", licensee: "Wilber, Maurice E", phone: "206-463-", address: "12057 Sw 208Th Street, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KG7UBC", licensee: "Los, Shango", phone: "206-463-", address: ", Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KG7UBD", licensee: "Clark, Brad S", phone: "206-463-", address: "19103 Vashon Hwy Sw, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KG7UBF", licensee: "Fairchild, Josephine B", phone: "206-463-", address: "6919 Sw 248Th St, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KG7UBG", licensee: "Larson, Rachel A", phone: "206-463-", address: "29428 129Th Ave Sw, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KG7UBH", licensee: "Maurer, Michele L", phone: "206-463-", address: "12889 Burma Rd Sw, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KG7UBI", licensee: "Kutscher, Susan H", phone: "206-463-", address: "16212 Vashon Hwy Sw, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KG7UBJ", licensee: "Davidson, Edward D", phone: "206-463-", address: "23310 Landers Rd Sw, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KG7UBK", licensee: "Milovsoroff, Peter", phone: "206-463-", address: "8225 Sw Van Olinda Rd, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "W7RAL", licensee: "Larson, Rachel A", phone: "206-463-", address: "29428 129Th Ave Sw, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KI7AAY", licensee: "Rentfro, Samuel J", phone: "206-463-", address: "10924 Sw Cove Rd, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KI7EOA", licensee: "Proffit, Spencer L", phone: "206-463-", address: ", Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KI7EOB", licensee: "Hubbard, Suzanne F", phone: "206-463-", address: "9131 Sw Gorsuch, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KI7EOC", licensee: "Brown, Paul S", phone: "206-463-", address: "9131 Sw Gorsuch Rd, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KI7EOD", licensee: "Guerena, Ed R", phone: "206-463-", address: "9731 Sw Elisha Lane, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KI7EOE", licensee: "Cressman, Miriam S", phone: "206-463-", address: "20704 Old Mill Rd Sw, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KI7EOF", licensee: "Douvier, Ann B", phone: "206-463-", address: ", Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KI7EOG", licensee: "Williams Jr, Morris C", phone: "206-463-", address: "25913 99Th Ave Sw, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KI7EOH", licensee: "Wallace, Thomas C", phone: "206-463-", address: ", Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KI7EOI", licensee: "Lilje, James J", phone: "206-463-", address: "9631 Sw 288Th St, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KI7EOJ", licensee: "Beles, Craig C", phone: "206-463-", address: "18823 Robinwood Rd Sw, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KI7EOK", licensee: "Graham, L Jill", phone: "206-463-", address: "8805 Sw Dilworth Rd, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KI7EOL", licensee: "Thayer, Roaxanne B", phone: "206-463-", address: ", Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KI7EOM", licensee: "Sager, Virginia", phone: "206-463-", address: ", Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KI7EON", licensee: "Shepard, Meredith A", phone: "206-463-", address: ", Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "AE7RW", licensee: "York, Randy K", phone: "206-463-", address: "27909 140Th Ave Sw, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KI7GZO", licensee: "Wilks, Nicholas T", phone: "206-463-", address: "11623 Sw Bank Rd, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "N0WNW", licensee: "Wilks, Nicholas T", phone: "206-463-", address: "11623 Sw Bank Rd, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KI7HQI", licensee: "Allen, Steven B", phone: "206-463-", address: ", Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "W7SBA", licensee: "Allen, Steven B", phone: "206-463-", address: ", Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KI7KLO", licensee: "Luckett, Peter G", phone: "206-463-", address: ", Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KI7LBB", licensee: "Marshall, Jourdan S", phone: "206-463-", address: "9032 Sw Soper Rd, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KI7MLU", licensee: "Templeman, Michael L", phone: "206-463-", address: "22715 Carey Rd Sw, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KI7MMD", licensee: "Wanzel, Eric W", phone: "206-463-", address: "11410 103Rd Ave Sw, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "W7PHG", licensee: "Gagner, Craig A", phone: "206-463-", address: ", Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KI7RYQ", licensee: "Stead, Daniel E", phone: "206-463-", address: "19009 Beall Rd Sw, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KI7RYY", licensee: "Carlson, Robert E", phone: "206-463-", address: "11309 Sw Cedarhurst Rd, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KV3SPA", licensee: "Marshall, Jourdan S", phone: "206-463-", address: "9032 Sw Soper Rd, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KI7SLB", licensee: "Solon, Denna E", phone: "206-463-", address: "8216 Sw Quartermaster Dr, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KI7SWF", licensee: "Rowan, Jonathan P", phone: "206-463-", address: "29410 129Th Ave Sw, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KB7REC", licensee: "Carlson, Robert E", phone: "206-463-", address: "11309 Sw Cedarhurst Rd, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KI7TYW", licensee: "Rousseau, Susan", phone: "206-463-", address: "15314 Vermontville Rd Sw, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KI7TYX", licensee: "Mitcham, Kevin", phone: "206-463-", address: "15314 Vermontville Rd Sw, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KI7UQK", licensee: "Lindgren, Clifford W", phone: "206-463-", address: "23117 111Th Ave Sw, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KI7WYU", licensee: "Herridge, Brook E", phone: "206-463-", address: "15324 Vermontville Rd Sw, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KB7PII", licensee: "Lindgren, Clifford W", phone: "206-463-", address: "23117 111Th Ave Sw, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KJ7CJP", licensee: "Cohen, Jeffrey A", phone: "206-463-", address: "16203 91St Ave Sw, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KJ7DYP", licensee: "Will, Bryce M", phone: "206-463-", address: "23304 115Th Ave Sw, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KJ7FCE", licensee: "Harmon, Corinne C", phone: "206-463-", address: ", Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KJ7FCF", licensee: "Satori, Jessika", phone: "206-463-", address: "20211 Vashon Hwy Sw, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KJ7FCG", licensee: "West, Charles W", phone: "206-463-", address: "13318 Sw 261St Place, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KJ7FCH", licensee: "Gomez, Erica L", phone: "206-463-", address: "19722 Vashon Hwy Sw, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KJ7FCI", licensee: "Strasz, Rachel A", phone: "206-463-", address: "25833 75Th Ave Sw, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KJ7FCJ", licensee: "Hosticka, Eric", phone: "206-463-", address: "18109 Thorsen Rd Sw, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KJ7FCK", licensee: "Macewan, Allison A", phone: "206-463-", address: ", Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KJ7FCL", licensee: "Piston, Robert E", phone: "206-463-", address: "23720 97Th Ave Sw, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KJ7FCM", licensee: "Piston, Jane W", phone: "206-463-", address: "23720 97Th Ave Sw, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KJ7FCO", licensee: "Shepherd, William B", phone: "206-463-", address: "17912 Mclean Rd Sw, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KJ7FCP", licensee: "Cain, Lars O", phone: "206-463-", address: "9130 Sw Cemetary Rd, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KJ7FCQ", licensee: "Hudson Iv, Thomas F", phone: "206-463-", address: "19722 Vashon Hwy Sw, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KJ7FCR", licensee: "Pierson Jr, Edward L", phone: "206-463-", address: "9724 Sw 268Th St, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KJ7FDJ", licensee: "Hosticka, Nancy J", phone: "206-463-", address: "18109 Thorsen Rd Sw, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KN7ELP", licensee: "Pierson Jr, Edward L", phone: "206-463-", address: "9724 Sw 268Th St, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KJ7KIF", licensee: "Etley, Stephanie A", phone: "206-463-", address: "12350 Sw 266Th Ln, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KJ7KSZ", licensee: "Van Holde, David J", phone: "206-463-", address: ", Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "W7ISL", licensee: "Van Holde, David J", phone: "206-463-", address: ", Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KV7AMS", licensee: "Luckett, Fr. Peter G", phone: "206-463-", address: ", Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KJ7MXH", licensee: "Witmer, Michael D", phone: "206-463-", address: "4927 Sw Pt Robinson Rd, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "WD3B", licensee: "Boardman, James H", phone: "206-463-", address: "10619 Sw Cowan Rd, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "K7NC", licensee: "Boardman, James H", phone: "206-463-", address: "10619 Sw Cowan Rd, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KJ7QFF", licensee: "Clemons, Timothy S", phone: "206-463-", address: "10134 Sw 280Th St, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "W2PEE", licensee: "Eivy, Adam D", phone: "206-463-", address: "15130 Glen Acres Rd Sw, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KJ7TTU", licensee: "Harris, Kevin", phone: "206-463-", address: "16633 Westside Hwy Sw, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "N7RLV", licensee: "Horsch, Robert", phone: "206-463-", address: "9216 Southwest Harbor Drive, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KK7BRI", licensee: "Cunningham, Jeremy", phone: "206-463-", address: "9225 Sw Summerhurst Rd, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KK7CEL", licensee: "Chiswell, Thomas J", phone: "206-463-", address: "7613 Sw 258Th Ct, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "AI7KV", licensee: "Cunningham, Jeremy", phone: "206-463-", address: "9225 Sw Summerhurst Rd, Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KD7GMW", licensee: "Hill, Deborah", phone: "206-463-", address: ", Vashon, WA 98070", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KB7ANI", licensee: "Gordon, Frances M", phone: "206-463-", address: ", Burton, WA 98013", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "N7KZQ", licensee: "Gordon, Richard S", phone: "206-463-", address: ", Burton, WA 98013", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "N7OUW", licensee: "Malone, Sean C", phone: "206-463-", address: "26026 120Th Ln. S. W., Burton, WA 98013", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "W7CHY", licensee: "Champion, Frank G", phone: "206-463-", address: ", Burton, WA 98013", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KD7ZYI", licensee: "Straube, Dave D", phone: "206-463-", address: ", Burton, WA 98013", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KE7HCC", licensee: "Burke, John J", phone: "206-463-", address: ", Burton, WA 98013", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "W7CPN", licensee: "Burke, John J", phone: "206-463-", address: ", Burton, WA 98013", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KE7KDT", licensee: "Milligan, Douglas S", phone: "206-463-", address: ", Burton, WA 98013", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KE7KDU", licensee: "Milligan, Janet L", phone: "206-463-", address: ", Burton, WA 98013", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "N0VYO", licensee: "Greer, David J", phone: "206-463-", address: "876 Curtis St, 2508, Burton, WA 98013", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KG7BSP", licensee: "Nelson, Kimberley A", phone: "206-463-", address: ", Burton, WA 98013", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" },
      { callsign: "KG7JIW", licensee: "Tuttle, Holly K", phone: "206-463-", address: ", Burton, WA 98013", image: "VI-00", rew: "VI-00", team: "t999", icon: " ", status: "Licensed", note: "-" }

    )
    //this.log.verbose(`Next: update LocalStorage: ${this.localStorageRangerName}`, this.id)
    this.SortRangersByCallsign()
    this.updateLocalStorageAndPublish();
    //this.log.verbose(`returned from: updating LocalStorage: ${this.localStorageRangerName}`, this.id)
  }

  /*
  generateFakeRangers(num: number = 20){
    let rangers = this.rangers
    let streets = ["Ave", "St.", "Pl.", "Court", "Circle"]
    for (let i = 0; i < num; i++) {
      array.push({
        callsign: rangers[Math.floor(Math.random() * rangers.length)].callsign,
           address: (Math.floor(Math.random() * 10000)) + " SW " + streets[(Math.floor(Math.random() * streets.length))],
      })
    }
  }*/

  // FUTURE:  getActiveRangers() {
  // filter for Ranger.status == 'checked in' ?
  // return this.rangers }
}



