import { HttpClient } from '@angular/common/http';
import { Injectable, OnInit } from '@angular/core';
import { BehaviorSubject, Observable, Observer, of } from 'rxjs';
//import { debounceTime, map, startWith } from 'rxjs/operators'
import * as rangers from '../../../assets/data/Rangers.json'

export interface RangerType {
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

export enum RangerStatus { '', 'Normal', 'Need Rest', 'REW', 'OnSite', 'Checked-in', 'Checked-out' }  // TODO: Allow changing list & default of statuses in settings?!

@Injectable({ providedIn: 'root' })
export class RangerService {
  orangers$: Observable<RangerType[]> | null = null

  rangers: RangerType[] = []
  rangers2: RangerType[] = []  // BUG: Rangers loaded from JSON are NEVER USED!
  private nextId = 0
  private rangersSubject =
    new BehaviorSubject<RangerType[]>([]);  // REVIEW: Necessary?
  private localStorageRangerName = 'rangers'

  constructor(private httpClient: HttpClient) {
    console.log("Rangers Service Construction")
    this.LoadRangersFromLocalStorage()
    //this.LoadRangersFromJSON() // Have user use button to initiate this

    // NOTE: IDs needed?! for (const ranger of this.rangers) {
    //  if (ranger.id >= this.nextId) this.nextId = ranger.id + 1
    //}

    // Needed? Maybe to expose observable?
    this.UpdateLocalStorage()
  }

  LoadRangersFromLocalStorage() { // WARN: Replaces any existing Rangers
    let localStorageRangers = localStorage.getItem(this.localStorageRangerName)
    try {
      this.rangers = (localStorageRangers != null) ? JSON.parse(localStorageRangers) : []   //TODO: clean up
      console.log(`RangersService: Loaded ${this.rangers.length} rangers from local storage`)
    } catch (error: any) {
      console.log(`Unable to parse Rangers from Local Storage. Error: ${error.message}`)
    }
    // TODO: Sort by callsign
  }

  // Update localStorage with current Rangers data & Publish update for any Observers
  UpdateLocalStorage() {
    console.log(`RangersService: Saving ${this.rangers.length} rangers to local storage`)
    localStorage.setItem(this.localStorageRangerName, JSON.stringify(this.rangers))
    //console.log("Updated Rangers to " + JSON.stringify(this.rangers))

    this.rangersSubject.next(this.rangers.map(
      ranger => ({
        callsign: ranger.callsign,
        licensee: ranger.licensee,
        licenseKey: ranger.licenseKey,
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

  GetRangers() {
    // TODO: Sort by callsign
    console.log(`GetRangers() returning ${this.rangers.length} Rangers`)
    return this.rangers
  }

  subscribe(observer: Observer<RangerType[]>) {
    this.rangersSubject.subscribe(observer);
  }

  // TODO: verify new report is proper shape/validated here or by caller??? Send as string or object?
  AddRanger_Unused(formData: string): RangerType {
    console.log(`RangerService: Got new ranger: ${formData}`)

    let newRanger: RangerType = JSON.parse(formData)
    //newRanger.id = this.nextId++
    this.rangers.push(newRanger)

    this.UpdateLocalStorage();
    return newRanger;
  }

  LoadRangersFromJSON(fileName: string = '../../../assets/data/Rangers.json') {  // WARN: Replaces any existing Rangers
    console.log(`RangerService: loading new Rangers from ${fileName}`)
    // TODO: Sort by callsign

    debugger

    // also see secretss import as an example: Settings.ts

    this.orangers$ = this.httpClient.get<RangerType[]>('../../../assets/data/Rangers.json') // from pg 281

    //this.rangers = []
    if (rangers != null) {
      // Use JSON file imported at the top
      //this.rangers = JSON.parse(rangers) || []
      // this.rangers = rangers
      /* TODO: Add missing fields:
      Type '{ callsign: string; label: string; licensee: string; licenseKey: string; phone: string; team: string; icon: string; }[]' is not assignable to type 'RangerType[]'.

      Type '{ callsign: string; label: string; licensee: string; licenseKey: string; phone: string; team: string; icon: string; }is missing the following properties from type


      'RangerType': address, image, status, notets(2322)

      */
    }

    // REVIEW: Workaround for "Error: Should not import the named export (imported as 'rangers') from default-exporting module (only default export is available soon)"
    let rangerWorkaround = JSON.stringify(rangers)
    this.rangers2 = JSON.parse(rangerWorkaround)
    console.log(`Got ${this.rangers2.length} rangers (into ARRAY #2!!!) from JSON file.`)
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

  /*
  getFieldReport(id: number) {
    const index = this.findIndex(id);
    return this.rangers[index];
  }

  updateFieldReport(report: RangerType) {
    const index = this.findIndex(report.id);
    this.rangers[index] = report;
    this.update();
  }

  deleteFieldReport(id: number) {
    const index = this.findIndex(id);
    this.rangers.splice(index, 1);
    this.update();
  }
*/

  deleteAllRangers() {
    this.rangers = []
    localStorage.removeItem('rangers')
    // localStorage.clear() // remove all localStorage keys & values from the specific domain you are on. Javascript is unable to get localStorage values from any other domains due to CORS
  }

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
      { callsign: "KB0LJC", licensee: "Hirsch, Justin D", image: "./assets/imgs/REW/male.png", phone: "206-463-0000", address: "St, Vashon, WA", licenseKey: 0, team: "", icon: "", status: "Normal", note: "" },
      { callsign: "AC7TB", licensee: "Sullivan, Timothy X", image: "./assets/imgs/REW/female.png", phone: "206-463-0000", address: "St, Vashon, WA", licenseKey: 0, team: "", icon: "", status: "Normal", note: "" },
      { callsign: "KE7KDQ", licensee: "Cornelison, John", image: "./assets/imgs/REW/ke7kdq.jpg", phone: "206-463-0000", address: "St, Vashon, WA", licenseKey: 0, team: "", icon: "", status: "Normal", note: "" },
      { callsign: "AE7MW", licensee: "Smueles, Robert E", image: "./assets/imgs/REW/RickWallace.png", phone: "206-463-0000", address: "St, Vashon, WA", licenseKey: 0, team: "", icon: "", status: "Normal", note: "" },
      { callsign: "AE7RW", licensee: "York, Randy K", image: "./assets/imgs/REW/VI-0003.jpg", phone: "206-463-0000", address: "St, Vashon, WA", licenseKey: 0, team: "", icon: "", status: "Normal", note: "" },
      { callsign: "AE7SD", licensee: "Danielson, Sharon J", image: "./assets/imgs/REW/VI-0034.jpg", phone: "206-463-0000", address: "St, Vashon, WA", licenseKey: 0, team: "", icon: "", status: "Normal", note: "" },
      { callsign: "AE7TH", licensee: "Hardy, Timothy R", image: "./assets/imgs/REW/VI-0038.jpg", phone: "206-463-0000", address: "St, Vashon, WA", licenseKey: 0, team: "", icon: "", status: "Normal", note: "" },
      { callsign: "AG7TJ", licensee: "Lindgren, Katrina J", image: "./assets/imgs/REW/VI-0041.jpg", phone: "206-463-0000", address: "St, Vashon, WA", licenseKey: 0, team: "", icon: "", status: "Normal", note: "" },
      { callsign: "AK7C", licensee: "Mcdonald, Michael E", image: "./assets/imgs/REW/VI-0056.jpg", phone: "206-463-0000", address: "St, Vashon, WA", licenseKey: 0, team: "", icon: "", status: "Normal", note: "" },
      { callsign: "K1SAB", licensee: "Brown, Steven A", image: "./assets/imgs/REW/VI-0058.jpg", phone: "206-463-0000", address: "St, Vashon, WA", licenseKey: 0, team: "", icon: "", status: "Normal", note: "" },
      { callsign: "K3QNQ", licensee: "Treese, F Mitch A", image: "./assets/imgs/REW/VI-0069.jpg", phone: "206-463-0000", address: "St, Vashon, WA", licenseKey: 0, team: "", icon: "", status: "Normal", note: "" },
      { callsign: "K6AJV", licensee: "Valencia, Andrew J", image: "./assets/imgs/REW/VI-007.jpg", phone: "206-463-0000", address: "St, Vashon, WA", licenseKey: 0, team: "", icon: "", status: "Normal", note: "" },
      { callsign: "K7AJT", licensee: "Tharp, Adam J", image: "./assets/imgs/REW/VI-0073.jpg", phone: "206-463-0000", address: "St, Vashon, WA", licenseKey: 0, team: "", icon: "", status: "Normal", note: "" },
      { callsign: "K7DGL", licensee: "Luechtefeld, Daniel", image: "./assets/imgs/REW/VI-0073.jpg", phone: "206-463-0000", address: "St, Vashon, WA", licenseKey: 0, team: "", icon: "", status: "Normal", note: "" },
      { callsign: "K7KMS", licensee: "Paull, Steven", image: "./assets/imgs/REW/VI-0089.jpg", phone: "206-463-0000", address: "St, Vashon, WA", licenseKey: 0, team: "", icon: "", status: "Normal", note: "" },
      { callsign: "K7NHV", licensee: "Francisco, Albert K", image: "./assets/imgs/REW/male.png", phone: "206-463-0000", address: "St, Vashon, WA", licenseKey: 0, team: "", icon: "", status: "Normal", note: "" },
      { callsign: "K7VMI", licensee: "De Steiguer, Allen L", image: "./assets/imgs/REW/K7VMI.jpg", phone: "206-463-0000", address: "St, Vashon, WA", licenseKey: 0, team: "", icon: "", status: "Normal", note: "" },
      { callsign: "KA7THJ", licensee: "Hanson, Jay R", image: "./assets/imgs/REW/male.png", phone: "206-463-0000", address: "St, Vashon, WA", licenseKey: 0, team: "", icon: "", status: "Normal", note: "" },
      { callsign: "KB7LEV", licensee: "Lysen, Kurt A", image: "./assets/imgs/REW/female.png", phone: "206-463-0000", address: "St, Vashon, WA", licenseKey: 0, team: "", icon: "", status: "Normal", note: "" },
      { callsign: "KB7MTM", licensee: "Meyer, Michael T", image: "./assets/imgs/REW/VI-0123.jpg", phone: "206-463-0000", address: "St, Vashon, WA", licenseKey: 0, team: "", icon: "", status: "Normal", note: "" }
    )
    //console.log(`Next: update LocalStorage: ${this.localStorageRangerName}`)
    this.UpdateLocalStorage();
    //console.log(`returned from: updating LocalStorage: ${this.localStorageRangerName}`)
  }

  // TODO:  getActiveRangers() {
  //Would need to filter for those who've 'checked in' on this incident?
  //return this.rangers }



  /* Needed?!
  sortRangersByTeam() {
    return this.rangers.sort((n1, n2) => {
      if (n1.team > n2.team) { return 1 }
      if (n1.team < n2.team) { return -1 }
      return 0;
    })
  }

  sortRangersByCallsign() {
    return this.rangers.sort((n1, n2) => {
      if (n1.callsign > n2.callsign) { return 1 }
      if (n1.callsign < n2.callsign) { return -1 }
      return 0;
    })
  }
}
*/

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
}
