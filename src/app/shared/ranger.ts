import { Injectable, OnInit } from '@angular/core';

import { Observable, of } from 'rxjs';
import { catchError, mergeMap, toArray } from 'rxjs/operators';
import { LocalStorage, StorageMap, JSONSchema } from '@ngx-pwa/local-storage';

//import { Ranger } from './Ranger';
//import { OriginFieldReport } from './field-report';

//@Injectable({  providedIn: 'root' })

export enum Soussrrrs {
  Voice,
  Packet,
  APRS,
  Email
}

export class Ranger {

  static nextId = 1;
  id: Number;
  date: Date;
  callSign: string;
  licensee: string;

  constructor (callSign: string, name: string, licensee: string, team: string, licenseKey: string, phone: string, email: string, icon: string, note: string)
    {
      this.id = Ranger.nextId++; // TODO: OK if user restarts app during SAME mission #?
      this.date = new Date();
      this.callSign = callSign;
      this.licensee = licensee;

      // add validation code here?! or in forms code?
    }

    //edit () {   }    TODO: wise to provide this option?!

    toString():string {
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
