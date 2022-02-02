
export class Utility {

  sleep(ms: number) { return new Promise(resolve => setTimeout(resolve, ms))
}

strToLatLng(str: string) {
  const latlngStr = str.split(",", 2);
  return new google.maps.LatLng(parseFloat(latlngStr[0]), parseFloat(latlngStr[1]))
}

}
