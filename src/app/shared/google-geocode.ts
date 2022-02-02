import { MapInfoWindow, MapMarker, GoogleMap } from '@angular/google-maps'

// https://developers.google.com/maps/documentation/geocoding/overview
// https://developers.google.com/maps/documentation/geocoding/start
// TODO: https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/utils/geocoder

export class GoogleGeocode {

  static geocoder = new google.maps.Geocoder

  constructor() { }

  getAddressFromLatLng(latLng: google.maps.LatLng): string {
    GoogleGeocode.geocoder
      .geocode({ location: latLng })
      .then((response) => {
        if (response.results[0]) {
          return (response.results[0].formatted_address)
        } else {
          return ("") // No results found
        }
      })
      .catch((e) => { return ("Geocoder failed due to: " + e) })
    return ("?")
  }

  // https://developers.google.com/maps/documentation/geocoding/requests-geocoding#geocoding-lookup
  // REVIEW:
  isValidAddress(addr: string) {
    let encoded
    let err
    try {
      encoded = encodeURI(addr) // https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams/URLSearchParams
    } catch (e: any) {
      // Status codes:  https://developers.google.com/maps/documentation/geocoding/requests-geocoding#StatusCodes
      console.error(e);
      encoded = "Bad%20Address"
    }

    // BUG: Following hasn't even been tried yet!...
    GoogleGeocode.geocoder
    .geocode({ address: encoded })
    .then(({ results }) => {
      if (results[0]) {
        return {
          position: results[0].geometry.location,
          address: results[0].formatted_address,
          partial_match: results[0].partial_match,
          plus_code: results[0].plus_code
        }

      } else {
        return { position: null, address: "" }
      }
    })
    .catch((e) => { err = "Geocoder failed due to: " + e })
    return { position: null, address: err }

  }


  // https://developers.google.com/maps/documentation/javascript/geocoding#GeocodingResults
  getLatLngAndAddressFromPlaceID(placeId: string): any
  //({position:google.maps.LatLng, address:string})
  {
    let err = ""
    GoogleGeocode.geocoder
      .geocode({ placeId: placeId })
      .then(({ results }) => {
        if (results[0]) {
          return {
            position: results[0].geometry.location,
            address: results[0].formatted_address
          }

        } else {
          return { position: null, address: "" }
        }
      })
      .catch((e) => { err = "Geocoder failed due to: " + e })
    return { position: null, address: err }
  }
}
