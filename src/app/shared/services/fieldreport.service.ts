import { Injectable, OnInit } from '@angular/core';

import { Observable, of } from 'rxjs';
import { catchError, mergeMap, toArray } from 'rxjs/operators';
import { LocalStorage, StorageMap, JSONSchema } from '@ngx-pwa/local-storage';

import { Ranger } from './Ranger.Service';
//import { OriginFieldReport } from './field-report';

@Injectable({  providedIn: 'root' })

export enum Source {
  Voice,
  Packet,
  APRS,
  Email
}

export class FieldReport {

  static nextId = 1;
  id: Number;
  date: Date;
  callSign: string;
  licensee: string;

  constructor (callSign: string, licensee: string, team: string, lat: number, long: number, status: string, note: string, source: Source)
    {
      // TODO: store callsign & licensee & team OR just "participant"?
      this.id = FieldReport.nextId++; // TODO: OK if user restarts app during SAME mission #?
      this.date = new Date();
      this.callSign = callSign;
      this.licensee = licensee;

      // add validation code here?! or in forms code?
    }

    addParticipant(participant: Participant) {
      ;
    }

    //edit () {   }    TODO: wise to provide this option?!

    toString():string {
      return "Field Report ID:" + this.id +
        "; call: " + this.callSign +
        "; time: " + this.date +
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
