/// Point is always Decimal Degress
export class Point {
  static Vashon: Point = new Point(new Coord(47.4472), new Coord(-122.4627))
  static Origin: Point = new Point(new Coord(0), new Coord(0))

  // Define static (or class) methods or properties directly to the constructor function, not the prototype object. E.g.,
  //static PointDD.ORIGIN = new PointDD(0, 0)
  //static PointDD.VASHON = new PointDD(47.4472, -122.4627) //EOC

    constructor(public lat: Coord, public lng: Coord) { }
  /*
  constructor(lat: number, lng: number)
  constructor(tWords: string)
  return new Point(new Coord(10), new Coord(20))
}
// todo    constructor(latDMS: Coord, lngDMS: Coord)
constructor(public lat: Coord | number | string, public lng: Coord | number){
  if (typeof lat == 'number')
      this.lat = new Coord(lat)
  if (typeof lng == 'number')
      this.lng = new Coord(lng)

  if (typeof lat != typeof lng)
      MAIN.dbug("error!")
  else if (typeof lat == 'number' && typeof lng == 'number') {
      this.lat = new Coord(lat)
      this.lng = new Coord(lng)
  }
}
  */

  /*
  ToDD(): Point {
      return new Point(this.lat.dd, this.lng.dd)
  }
  ToDMS(): PointDMS {
      return new PointDMS(this.lat.ToDMS(false), this.lng.ToDMS(true))
  }
  DistanceTo(that: Point): number {
      let dx = this.lat.coord - that.lat.coord
      let dy = this.lng.coord - that.lng.coord
      return Math.sqrt(dx*dx + dy*dy)
  }

  toString() : string {
      return "[" + this.lat + ", " + this.lng + "]"
  }

class PointDMS {

  ToString() : string {
      return "[" + this.lat + ", " + this.lng + "]"
  }
*/
}











// https://www.rapidtables.com/convert/number/degrees-minutes-seconds-to-degrees.html
// From: www.stackoverflow.com/questions/5970961
export function DMSToDD(dms: Point) {
  if (!dms) {
      return Number.NaN
  }
  //MAIN.dbug("DMSToDD: dir=" + dms.dir + " deg=" + dms.deg + " min=" + dms.min + " sec=" + dms.sec)
  let neg = 1.0
  switch (dir) {
      case "s":
      case "S":
      case "w":
      case "W":
          neg = -1.0
          MAIN.dbug("DMSToDD: Negative")
  }
  return (neg * (Number(dms.deg) + (dms.min / 60.0) + (dms.sec / 3600.0))).toFixed(6)
}

/*
// https://www.rapidtables.com/convert/number/degrees-minutes-seconds-to-degrees.html
// From: www.stackoverflow.com/questions/5970961
function dmsToDeg (dms) {
if (!dms) {
    return Number.NaN
}
let neg = dms.match(/(^\s?-)|(\s?[SW]\s?$)/) != null ? -1.0 : 1.0
dms = dms.replace(/(^\s?-)|(\s?[NSEW]\s?)$/, '')
dms = dms.replace(/\s/g, '')
let parts = dms.match(/(\d{1,3})[.,°d ]?\s*(\d{0,2})[']?(\d{0,2})[.,]?(\d{0,})(?:["]|[']{2})?/)
if (parts == null) {
    return Number.NaN
}
// parts:
// 0 : degree
// 1 : degree
// 2 : minutes
// 3 : secondes
// 4 : fractions of seconde
let d = (parts[1] ? parts[1] : '0.0') * 1.0
let m = (parts[2] ? parts[2] : '0.0') * 1.0
let s = (parts[3] ? parts[3] : '0.0') * 1.0
let r = (parts[4] ? ('0.' + parts[4]) : '0.0') * 1.0
let dec = (d + (m / 60.0) + (s / 3600.0) + (r / 3600.0)) * neg
return dec
}
*/
