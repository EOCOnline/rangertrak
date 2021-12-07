import { Injectable, OnInit } from '@angular/core';

import { Observable, of } from 'rxjs';
import { catchError, mergeMap, toArray } from 'rxjs/operators';
import { LocalStorage, StorageMap, JSONSchema } from '@ngx-pwa/local-storage';

import { Ranger, FieldReport } from './services/';

//@Injectable({  providedIn: 'root' })

export class OpPeriod {

  static nextId = 1;
  id: Number;
  begDate: Date;
  // endDate: Date;  // Who or when does this get set: maybe just have a get last recorded date?
  ranger: Ranger[];
  fieldReports: FieldReport[];


  constructor (
    public name: string,
    // Need to verify this is a unique name?
    ) {
      this.id = OpPeriod.nextId++;
      this.begDate = new Date();
    }

    addParticipant(participant: Ranger) {
      ;
    }

    listRangers() {
      ;
    }

    addFieldReport(fieldReport: FieldReport) {
      ;
    }

    listFieldReport() {  // iterator here?
      ;
    }

    // Save to disk or ...
    serialize(name: string) {
      ;
    }

    load(name: string) {
      ;
    }

  }
