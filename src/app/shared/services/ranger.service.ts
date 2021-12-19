import { Injectable, OnInit } from '@angular/core';

import { Observable, of } from 'rxjs';
import { catchError, mergeMap, toArray } from 'rxjs/operators';
import { LocalStorage, StorageMap, JSONSchema } from '@ngx-pwa/local-storage';

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

export enum RangerStatus {'', 'Normal', 'Need Rest', 'REW', 'OnSite', 'Checked-in', 'Checked-out'}  // TODO: Allow changing list & default of statuses in settings?!

export class RangerService {

  /*
     Following from 98070 AND 98013 zip codes, MUST be sorted by call sign!
     https://wireless2.fcc.gov/UlsApp/UlsSearch/searchAmateur.jsp
   */

  rangers: RangerType[] =[]

  constructor() {
    ;
  }

  loadRangers() {
    //this.rangers =
    this.LoadFromJSON('rangers.json')  //BUG: Not tested!!!
  }

  getRangers() {
    this.generateFakeData(this.rangers)
    return this.rangers
  }

  generateFakeData(array: RangerType[]) {
      /*
     Following from 98070 AND 98013 zip codes, MUST be sorted by call sign!
     https://wireless2.fcc.gov/UlsApp/UlsSearch/searchAmateur.jsp
   */

    array.push (
      { callsign: "KB0LJC", licensee: "Hirsch, Justin D", image: "./assets/imgs/REW/male.png", phone: "206-463-0000", address: "", licenseKey: 0, team: "", icon: "", status:"Normal", note:"" },
      { callsign: "AC7TB", licensee: "Sullivan, Timothy X", image: "./assets/imgs/REW/female.png", phone: "206-4630000", address: "", licenseKey: 0, team: "", icon: "", status:"Normal", note:"" },
      { callsign: "KE7KDQ", licensee: "Cornelison, John", image: "./assets/imgs/REW/ke7kdq.jpg", phone: "206-4630000", address: "", licenseKey: 0, team: "", icon: "", status:"Normal", note:"" },
      { callsign: "AE7MW", licensee: "Smueles, Robert E", image: "./assets/imgs/REW/RickWallace.png", phone: "206-4630000", address: "", licenseKey: 0, team: "", icon: "", status:"Normal", note:"" },
      { callsign: "AE7RW", licensee: "York, Randy K", image: "./assets/imgs/REW/VI-0003.jpg", phone: "206-4630000", address: "", licenseKey: 0, team: "", icon: "", status:"Normal", note:"" },
      { callsign: "AE7SD", licensee: "Danielson, Sharon J", image: "./assets/imgs/REW/VI-0034.jpg", phone: "206-4630000", address: "", licenseKey: 0, team: "", icon: "", status:"Normal", note:"" },
      { callsign: "AE7TH", licensee: "Hardy, Timothy R", image: "./assets/imgs/REW/VI-0038.jpg", phone: "206-4630000", address: "", licenseKey: 0, team: "", icon: "", status:"Normal", note:"" },
      { callsign: "AG7TJ", licensee: "Lindgren, Katrina J", image: "./assets/imgs/REW/VI-0041.jpg", phone: "206-4630000", address: "", licenseKey: 0, team: "", icon: "", status:"Normal", note:"" },
      { callsign: "AK7C", licensee: "Mcdonald, Michael E", image: "./assets/imgs/REW/VI-0056.jpg", phone: "206-4630000", address: "", licenseKey: 0, team: "", icon: "", status:"Normal", note:"" },
      { callsign: "K1SAB", licensee: "Brown, Steven A", image: "./assets/imgs/REW/VI-0058.jpg", phone: "206-4630000", address: "", licenseKey: 0, team: "", icon: "", status:"Normal", note:"" },
      { callsign: "K3QNQ", licensee: "Treese, F Mitch A", image: "./assets/imgs/REW/VI-0069.jpg", phone: "206-4630000", address: "", licenseKey: 0, team: "", icon: "", status:"Normal", note:"" },
      { callsign: "K6AJV", licensee: "Valencia, Andrew J", image: "./assets/imgs/REW/VI-007.jpg", phone: "206-4630000", address: "", licenseKey: 0, team: "", icon: "", status:"Normal", note:"" },
      { callsign: "K7AJT", licensee: "Tharp, Adam J", image: "./assets/imgs/REW/VI-0073.jpg", phone: "206-4630000", address: "", licenseKey: 0, team: "", icon: "", status:"Normal", note:"" },
      { callsign: "K7DGL", licensee: "Luechtefeld, Daniel", image: "./assets/imgs/REW/VI-0073.jpg", phone: "206-4630000", address: "", licenseKey: 0, team: "", icon: "", status:"Normal", note:"" },
      { callsign: "K7KMS", licensee: "Paull, Steven", image: "./assets/imgs/REW/VI-0089.jpg", phone: "206-4630000", address: "", licenseKey: 0, team: "", icon: "", status:"Normal", note:"" },
      { callsign: "K7NHV", licensee: "Francisco, Albert K", image: "./assets/imgs/REW/male.png", phone: "206-4630000", address: "", licenseKey: 0, team: "", icon: "", status:"Normal", note:"" },
      { callsign: "K7VMI", licensee: "De Steiguer, Allen L", image: "./assets/imgs/REW/K7VMI.jpg", phone: "206-4630000", address: "", licenseKey: 0, team: "", icon: "", status:"Normal", note:"" },
      { callsign: "KA7THJ", licensee: "Hanson, Jay R", image: "./assets/imgs/REW/male.png", phone: "206-4630000", address: "", licenseKey: 0, team: "", icon: "", status:"Normal", note:"" },
      { callsign: "KB7LEV", licensee: "Lysen, Kurt A", image: "./assets/imgs/REW/female.png", phone: "206-4630000", address: "", licenseKey: 0, team: "", icon: "", status:"Normal", note:"" },
      { callsign: "KB7MTM", licensee: "Meyer, Michael T", image: "./assets/imgs/REW/VI-0123.jpg", phone: "206-4630000", address: "", licenseKey: 0, team: "", icon: "", status:"Normal", note:"" }
    )
  }

  // TODO: or getActiveRangers?!
  getActiveRangers() {
    //Would need to filter for those who've 'checked in' on this incident?
    return this.rangers
  }

  LoadFromJSON(fileName:string) {
    //See pg. 279...

    //import * as data from './data.json';
    //let greeting = data.greeting;

    /*   import {default as AAA} from "VashonCallSigns";
          AAA.targetKey
          // this requires `"resolveJsonModule": true` in tsconfig.json

          import {default as yyy} from './VashonCallSigns.json'
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

  }

}
export class Ranger1 {

  static nextId = 1;
  id: Number;
  date: Date;
  callSign: string;
  licensee: string;

  constructor(callSign: string, name: string, licensee: string, team: string, licenseKey: string, phone: string, email: string, icon: string, note: string) {
    this.id = Ranger1.nextId++; // TODO: OK if user restarts app during SAME mission #?
    this.date = new Date();
    this.callSign = callSign;
    this.licensee = licensee;

    // add validation code here?! or in forms code?
  }

  //edit () {   }    TODO: wise to provide this option?!//

  toString(): string {
    return "Ranger ID:" + this.id +
      "; call: " + this.callSign +
      "; licensee: " + this.licensee +
      ";; "
  }

  // Save to disk or ...
  serialize(name: string) {
    ;
  }

  load(name: string) {
    ;
  }

}
