import * as C from "./coordinate"

import { Injectable, OnInit } from '@angular/core';
import { JSONSchema, LocalStorage, StorageMap } from '@ngx-pwa/local-storage';
import { Observable, of } from 'rxjs';
import { catchError, mergeMap, toArray } from 'rxjs/operators';

export enum MapType {
  Google,
  ESRI_Leaflet
}

export interface LayerType {
  id: number
  url: string,
  id2: string,
  attribution: string
}

/*
  // Interface are general, lightweight vs. abstract classes as special-purpose/feature-rich (pg 96, Programming Typescript)
  export interface IMap {
    type: MapType,
    layers: LayerType
    initMap():void
    displayBeautifulMap(num:number) :void
    }
*/

export abstract class Map {
  static nextId = 1;
  id: Number;
  name: string;
  date: Date;

  constructor(name: string) {
    this.id = Map.nextId++; // TODO: OK if user restarts app during SAME mission #?
    this.date = new Date();
    this.name = name;

    // add validation code here?! or in forms code?

    this.initMap()
  }

  toString(): string {
    return "Map name: " + this.name +
      ";; "
  }

  abstract initMap(): void
  abstract display(): void

  onMapClick() { }
}


