import { Injectable, OnInit } from '@angular/core';
import { JSONSchema, LocalStorage, StorageMap } from '@ngx-pwa/local-storage';
import { Observable, of } from 'rxjs';
import { catchError, mergeMap, toArray } from 'rxjs/operators';

import { FaStackItemSizeDirective } from '@fortawesome/angular-fontawesome';
import { OpPeriod } from './op-period';

//@Injectable({  providedIn: 'root' })

export class Mission {

  static nextId = 1;
  id: Number;
  begDate: Date;
  // endDate: Date;  // Who or when does this get set: maybe just have a get last recorded date?
  //opPeriods:  Array<OpPeriod>;
  //opPeriods2: OpPeriod[] = null;


  constructor (
    public name: string,
    // Need to verify this is a unique name?
    ) {
      this.id = Mission.nextId++;
      this.begDate = new Date();
    }

    addOpPeriod(opPeriod: OpPeriod) {
      //this.opPeriods.push(...items, opPeriod);
    }

    listOpPeriods() {
      ; // return OpPeriod[]
    }

    // Save to disk or ...
    serialize(name: string) {
      ;
    }

    load(name: string) {
      ;
    }

  }
