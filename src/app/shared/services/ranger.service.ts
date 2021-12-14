import { Injectable, OnInit } from '@angular/core';

import { Observable, of } from 'rxjs';
import { catchError, mergeMap, toArray } from 'rxjs/operators';
import { LocalStorage, StorageMap, JSONSchema } from '@ngx-pwa/local-storage';

export interface Callsigns {
  image: string
  callsign: string
  name: string
  phone: string
}

// Future: export enum Source {Voice, Packet, APRS, Email}  // If other ways to generate reports are enabled

export class RangerService {

  /*
     Following from 98070 AND 98013 zip codes, MUST be sorted by call sign!
     https://wireless2.fcc.gov/UlsApp/UlsSearch/searchAmateur.jsp
   */

  callsigns: Callsigns[] = [
    { callsign: "KB0LJC", name: "Hirsch, Justin D", image: "./assets/imgs/REW/male.png", phone: "206-463-0000" },
    { callsign: "AC7TB", name: "Sullivan, Timothy X", image: "./assets/imgs/REW/female.png", phone: "206-463-0000" },
    { callsign: "KE7KDQ", name: "Cornelison, John", image: "./assets/imgs/REW/ke7kdq.jpg", phone: "206-463-0000" },
    { callsign: "AE7MW", name: "Smueles, Robert E", image: "./assets/imgs/REW/RickWallace.png", phone: "206-463-0000" },
    { callsign: "AE7RW", name: "York, Randy K", image: "./assets/imgs/REW/VI-0003.jpg", phone: "206-463-0000" },
    { callsign: "AE7SD", name: "Danielson, Sharon J", image: "./assets/imgs/REW/VI-0034.jpg", phone: "206-463-0000" },
    { callsign: "AE7TH", name: "Hardy, Timothy R", image: "./assets/imgs/REW/VI-0038.jpg", phone: "206-463-0000" },
    { callsign: "AG7TJ", name: "Lindgren, Katrina J", image: "./assets/imgs/REW/VI-0041.jpg", phone: "206-463-0000" },
    { callsign: "AK7C", name: "Mcdonald, Michael E", image: "./assets/imgs/REW/VI-0056.jpg", phone: "206-463-0000" },
    { callsign: "K1SAB", name: "Brown, Steven A", image: "./assets/imgs/REW/VI-0058.jpg", phone: "206-463-0000" },
    { callsign: "K3QNQ", name: "Treese, F Mitch A", image: "./assets/imgs/REW/VI-0069.jpg", phone: "206-463-0000" },
    { callsign: "K6AJV", name: "Valencia, Andrew J", image: "./assets/imgs/REW/VI-007.jpg", phone: "206-463-0000" },
    { callsign: "K7AJT", name: "Tharp, Adam J", image: "./assets/imgs/REW/VI-0073.jpg", phone: "206-463-0000" },
    { callsign: "K7DGL", name: "Luechtefeld, Daniel", image: "./assets/imgs/REW/VI-0073.jpg", phone: "206-463-0000" },
    { callsign: "K7KMS", name: "Paull, Steven", image: "./assets/imgs/REW/VI-0089.jpg", phone: "206-463-0000" },
    { callsign: "K7NHV", name: "Francisco, Albert K", image: "./assets/imgs/REW/male.png", phone: "206-463-0000" },
    { callsign: "K7VMI", name: "De Steiguer, Allen L", image: "./assets/imgs/REW/K7VMI.jpg", phone: "206-463-0000" },
    { callsign: "KA7THJ", name: "Hanson, Jay R", image: "./assets/imgs/REW/male.png", phone: "206-463-0000" },
    { callsign: "KB7LEV", name: "Lysen, Kurt A", image: "./assets/imgs/REW/female.png", phone: "206-463-0000" },
    { callsign: "KB7MTM", name: "Meyer, Michael T", image: "./assets/imgs/REW/VI-0123.jpg", phone: "206-463-0000" }
  ];

  constructor() {
    ;
  }

  getRangers() {
    return this.callsigns
  }

  // TODO: or getActiveRangers?!
  getActiveRangers() {
    //Would need to filter for those who've 'checked in' on this incident?
    return this.callsigns
  }

  LoadFromJSON() {
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
