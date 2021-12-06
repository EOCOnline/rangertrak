import { Injectable, OnInit } from '@angular/core';

import { Observable, of } from 'rxjs';
import { catchError, mergeMap, toArray } from 'rxjs/operators';
import { LocalStorage, StorageMap, JSONSchema } from '@ngx-pwa/local-storage';

import * as C from "./coordinate"

//import { Ranger } from './Ranger';
//import { OriginFieldReport } from './field-report';

//@Injectable({  providedIn: 'root' })

export enum MapType {
  Google,
  ESRI_Leaflet
}

export abstract class iMap {

  //static nextId = 1;
  //id: Number;
  name: string;
  date: Date;

  constructor (name: string)
    {
      //this.id = Map.nextId++; // TODO: OK if user restarts app during SAME mission #?
      this.date = new Date();
      this.name = name;

      // add validation code here?! or in forms code?

      this.initMap()
    }

    //edit () {   }    TODO: wise to provide this option?!

    toString():string {
      return "Map name:" + this.name +
        ";; "
    }

    initMap() {}

    onMapClick() {}

    abstract display(): void


    // Save to disk or ...
    serialize(name: string) {
      ;
    }

    load(name: string) {
      ;
    }

  }
