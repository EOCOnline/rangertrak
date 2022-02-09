
export class Utility {

  static sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  static strToLatLng(str: string) {
    const latlngStr = str.split(",", 2);
    return new google.maps.LatLng(parseFloat(latlngStr[0]), parseFloat(latlngStr[1]))
  }

  static zeroFill(integ: number, lngth: number) {
    var strg = integ.toString();
    while (strg.length < lngth)
      strg = "0" + strg;
    return strg;
  }

}
