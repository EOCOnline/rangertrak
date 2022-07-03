//import { Injectable, OnInit } from '@angular/core';
//import { JSONSchema, LocalStorage, StorageMap } from '@ngx-pwa/local-storage';

// REVIEW: Much of this is overlap with:
// https://developers.google.com/maps/documentation/javascript/coordinates
// https://developers.google.com/maps/documentation/javascript/reference/coordinates

const id = "Coordinate Utility"

export enum DirEnum {
  E = 'East',
  W = 'West',
  N = 'North',
  S = 'South'
}
export type DirType = 'E' | 'W' | 'N' | 'S'

class PointSample {
  constructor(private _age: number,
    private _firstName: string,
    private _lastName: string) {
  }

  /*
  public get age() {
    return this._age;
  }

  public set age(theAge: number) {
    if (theAge <= 0 || theAge >= 200) {
      throw new Error('The age is invalid');
    }
    this._age = theAge;
  }

  public get FullName(): string {
    return `${this._firstName} ${this._lastName}`;
  }

  public set fullName(name: string) {
    let parts = name.split(' ');
    if (parts.length != 2) {
      throw new Error('Invalid name format: first last');
    }
    this._firstName = parts[0];
    this._lastName = parts[1];
  }
  */
}

export class Coordinate {
  constructor(private _lat: number, private _long: number) {
    if (_lat < -180 || _lat > 180)
      throw new Error('latatude is over 180 or under -180 degrees.')
    if (_long < -180 || _long > 180)
      throw new Error('longitude is over 180 or under -180 degrees.')
    //this.lat = lat;
    //this.long = long;
  }

  toString(): string {
    return "lat: " + this._lat +
      "; long: " + this._long
  }

  public get Point() {
    return (this._lat, this._long);
  }

  //toDMS(ptDD: PointDD) {  }

  // Save to disk or ...
  serialize(name: string) {
    ;
  }

  load(name: string) {
    ;
  }
}


// Get object {deg:, min:, sec:, dir:}
// sec truncated to two digits (e.g. 3.14)
// dir returns S or N if lng = false (for latitudes)
// dir returns E or W if lng (longitude) = true
// N.B.: may not work for angles between -1° and 0°
// from www.stackoverflow.com/questions/5786025
export function DDToDMS(D: number, lng: boolean = false) {
  /*
  if (!D) {
      this.log.verbose("Invalid number received for Decimal Degrees!", this.id)
      return Number.NaN
  }
  */
  /*
    this.log.verbose("DDtoDMS: D=" + D + " lng=" + lng, this.id)
    let dirr = D<0?lng?'W':'S':lng?'E':'N'
    let degg = 0|(D<0?D=-D:D)
    let minn = 0|D%1*60
    let secc = (0|D*60%1*6000)/100
    this.log.verbose("DDtoDMS: dir=" + dirr + " deg=" + degg + " min" + minn + " sec=" + secc, this.id)
  */
  return {
    dir: D < 0 ? lng ? 'W' : 'S' : lng ? 'E' : 'N',
    deg: 0 | (D < 0 ? D = -D : D),
    min: 0 | D % 1 * 60,
    sec: (0 | D * 60 % 1 * 6000) / 100
  }
}

/**
 * Convert DMS to Deg and Decimal minutes
 * Get object {deg:, min:, dir:}
 * min truncated to 3 digits (e.g. 3.143)
 * dir returns S or N if lng = false (for latitudes)
 * dir returns E or W if lng (longitude) = true
 * from https://www.cumulations.com/blog/latitude-and-longitude/
 * @param D
 * @param lng
 * @returns
 */

export function DDToDDM(D: number, lng: boolean = false) {
  return {
    dir: D < 0 ? lng ? 'W' : 'S' : lng ? 'E' : 'N',
    deg: 0 | (D < 0 ? D = -D : D),
    min: Math.round((D % 1) * 60000) / 1000
  }
}

// REVIEW: Duplicate of one in Utility class...
export function strToLatLng(str: string) {
  const latlngStr = str.split(",", 2);
  return new google.maps.LatLng(parseFloat(latlngStr[0]), parseFloat(latlngStr[1]))
}

// Coord is a lat or lng in decimal degrees
class Coord {
  constructor(public coord: number) {
    try {
      // TODO: Could map larger/smaller values using modulus
      // coord = coord % 360.0
      if (isNaN(coord)) throw "Coordinate is not a number"
      if (coord < -180) throw "Coordinate under -180 degrees."
      if (coord > 180) throw "Coordinate over 180 degrees."
      // this.log.excessive("Coordinate passed range check...", this.id)
    }
    catch (err: unknown) {
      // this.log.verbose("Bad Coordinate at Coord(): " + err.message, this.id)
    }
  }
  // Get object {deg:, min:, sec:, dir:}
  // sec truncated to two digits (e.g. 3.14)
  // dir returns S or N if lng = false (for latitudes)
  // dir returns E or W if lng (longitude) = true
  // N.B.: may not work for angles between -1° and 0°
  // from www.stackoverflow.com/questions/5786025
  /*
  ToDMS(lng: boolean): CoordDMS {
    return new CoordDMS(
      this.coord < 0 ? lng ? Direction.W : Direction.S : lng ? Direction.E : Direction.N,
      0 | (this.coord < 0 ? this.coord = -this.coord : this.coord),
      0 | this.coord % 1 * 60,
      (0 | this.coord * 60 % 1 * 6000) / 100
    )
  }

  ToNumber(): number {
     return this.coord
  }

  */
}

