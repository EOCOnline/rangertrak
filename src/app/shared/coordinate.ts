//import { Injectable, OnInit } from '@angular/core';
//import { JSONSchema, LocalStorage, StorageMap } from '@ngx-pwa/local-storage';

import { UpperCasePipe } from '@angular/common'

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
}

export class Coordinate_Unused {
  constructor(private _lat: number, private _long: number) {
    // TODO: Force all values to X%180 or Y%90 ?
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
// https://www.pgc.umn.edu/apps/convert/
// https://flyandwire.com/2020/08/10/back-to-basics-latitude-and-longitude-dms-dd-ddm/
// https://www.igismap.com/conversion-of-degree-minute-seconds-degree-decimal-minutes-decimal-degree-format-latitude-longitude/
// https://www.earthref.org/content/where-world-are-you-degrees-vs-degrees-minutes-and-seconds
// https://www.cumulations.com/blog/latitude-and-longitude/

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
    sec: 0 | (Math.round(D * 60 % 1 * 6000) / 100)
  }
}

/**
 * Convert DMS to Deg and Decimal minutes
 * Get object {deg:, min:, dir:}
 * min truncated to 4 digits (e.g. 3.1432)
 * dir returns S or N if lng = false (i.e., latitudes)
 * dir returns E or W if lng = true  (a longitude)
 * from https://www.cumulations.com/blog/latitude-and-longitude/
 * https://www.igismap.com/conversion-of-degree-minute-seconds-degree-decimal-minutes-decimal-degree-format-latitude-longitude/
 * https://www.earthref.org/content/where-world-are-you-degrees-vs-degrees-minutes-and-seconds
 * https://www.fcc.gov/media/radio/dms-decimal
 * @param D
 * @param lng
 * @returns
 */

export function DDToDDM(D: number, lng: boolean = false) {
  return {
    dir: D < 0 ? lng ? 'W' : 'S' : lng ? 'E' : 'N',
    deg: 0 | (D < 0 ? D = -D : D),
    min: 0 | Math.round((D % 1) * 60000) / 10
  }
}


/**
 * Convert DMS to Deg and Decimal minutes
 * Get object {deg:, min:, dir:}
 * min truncated to 4 digits (e.g. 3.1432)
 * dir returns S or N if lng = false (i.e., latitudes)
 * dir returns E or W if lng = true  (a longitude)
 * https://www.igismap.com/conversion-of-degree-minute-seconds-degree-decimal-minutes-decimal-degree-format-latitude-longitude/
 * @param D
 * @param M
 * @param S
 * @param Q
 * @returns number
 */
export function DMSToDD(Q: string, D: number, M: number, S: number): number {
  console.info(`DMSToDD got:  ${D}° ${M}' ${S}" ${Q}`)
  return (((Q.toLowerCase() == 'w' || Q.toLowerCase() == 's') ? -1 : 1) * (D
    + Math.round((M / 60 + S / 6000) * (10 ** 4)) / (10 ** 4))) // float portion to 4 decimals
  //+ Number(Math.round((M / 60 + S / 6000) * (10 ** 4)).toFixed(4)))  // alternatively
}

/**
 * Convert DDM to Deg and Decimal minutes
 * Get object {deg:, min:, dir:}
 * min truncated to 4 digits (e.g. 3.1432)
 * dir returns S or N if lng = false (i.e., latitudes)
 * dir returns E or W if lng = true  (a longitude)
 * https://www.igismap.com/conversion-of-degree-minute-seconds-degree-decimal-minutes-decimal-degree-format-latitude-longitude/
 * @param D
 * @param M
 * @param Q
 *
 * @returns number
 */

export function DDMToDD(Q: string, D: number, M: number) {
  // console.info(`DDMToDD got:  ${D}° ${M} ' ${Q}`)
  return (((Q.toLowerCase() == 'w' || Q.toLowerCase() == 's') ? -1 : 1) * (D
    + Math.round((M / 60) * 10 ** 4) / 10 ** 4)) // float portion to 4 decimals
}


/*
Use Google.geocode instead
export function AddressToDD(newAddress: string) {
  let lat = 0
  let lng = 0

  return { lat: lat, lng: lng }
}
*/


// REVIEW: Duplicate of one in Utility class...
export function strToLatLng_Unused(str: string) {
  const latlngStr = str.split(",", 2);
  return new google.maps.LatLng(parseFloat(latlngStr[0]), parseFloat(latlngStr[1]))
}

// Coord is a lat or lng in decimal degrees
class Coord_Unused {
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

