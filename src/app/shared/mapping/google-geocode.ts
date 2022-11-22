//import { MapInfoWindow, MapMarker, GoogleMap } from '@angular/google-maps'

// https://developers.google.com/maps/documentation/geocoding/overview
// https://developers.google.com/maps/documentation/geocoding/start
// TODO: https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/utils/geocoder

//!BUG: None of these available if offline!!!
export class GoogleGeocode {

  static geocoder: google.maps.Geocoder | null  //= new google.maps.Geocoder

  constructor() {
    //======== Constructor() ============
    try {
      GoogleGeocode.geocoder = new google.maps.Geocoder // || null
    } catch (error) {
      // probably offline?!
      GoogleGeocode.geocoder = null
    }
  }
  // https://developers.google.com/maps/documentation/javascript/geocoding#ReverseGeocoding
  getAddressFromLatLng(latLng: google.maps.LatLng, UpdateAddress: any): string {
    if (!GoogleGeocode.geocoder)
      return "Address lookup requires Internet."

    console.info(`Looking up address: ${JSON.stringify(latLng)}`)

    GoogleGeocode.geocoder
      .geocode({ location: latLng })
      .then((response) => {

        //console.error(`Found address: ${JSON.stringify(response.results)}`)

        if (response.results[0]) {
          console.error(`Found address[0]: ${JSON.stringify(response.results[0].formatted_address)}`)

          // Async update of address field...




          //! BUG: FAILS to run...
          UpdateAddress()//response.results[0].formatted_address)
          console.error(`returned from UpdateAddress()`)

          return (response.results[0].formatted_address)
        } else {
          return ("No address found.") // No results found
        }
      })
      .catch((e) => { return ("Geocoder failed due to: " + e) })
    return ("No immediate address available: await the result!")
  }


  // https://developers.google.com/maps/documentation/javascript/geocoding#GeocodingRequests
  /*
  The GeocoderRequest object literal contains the following fields:
    {
      address: string, OR
      location: LatLng, OR
      placeId: string,
      AND optionally:
      bounds: LatLngBounds,
      componentRestrictions: GeocoderComponentRestrictions,
      region: string
    }
  */

  // https://developers.google.com/maps/documentation/geocoding/requests-geocoding#geocoding-lookup
  // REVIEW:
  isValidAddress(addr: string) //: { position: google.maps.LatLngLiteral | null, address: string, partial_match: string, placeId: string, plus_code: string }
  {
    let encoded
    let err = ""
    try {
      encoded = encodeURI(addr) // https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams/URLSearchParams
      console.log(`isValidAddress returned ${JSON.stringify(encoded)}`)
    } catch (e: any) {
      // Status codes:  https://developers.google.com/maps/documentation/geocoding/requests-geocoding#StatusCodes
      console.error(e);
      encoded = "Bad%20Address"
    }

    // debugger
    // BUG: Needs a promise!
    // BUG: Following hasn't even been tried yet!...
    if (!GoogleGeocode.geocoder)
      return { position: null, address: "Geocoding requires Internet", placeId: "" }

    GoogleGeocode.geocoder
      .geocode({ address: encoded })
      .then(({ results }) => {
        if (results[0]) {
          console.log(`GoogleGeocode.geocoder returning ${JSON.stringify(results[0])}`)
          return {
            position: results[0].geometry.location,
            address: results[0].formatted_address,
            partial_match: results[0].partial_match,
            placeId: results[0].place_id,
            plus_code: results[0].plus_code
          }
        } else {
          return { position: null, address: "", partial_match: "", placeId: "", plus_code: "" }
        }
      })
      .catch((e) => {
        //debugger
        err = "Geocoder failed due to: " + e
        console.error(`GoogleGeocode.geocoder failed with returning ${JSON.stringify(e)}`)
      })
    return { position: null, address: err, partial_match: "", placeId: "", plus_code: "" }
  }

  /*
      Got Street address: 10506 sw 132nd pl, vashon, wa, 98070
      google-geocode.ts:49 isValidAddress returned "10506%20sw%20132nd%20pl,%20vashon,%20wa,%2098070"
      entry.component.ts:495 geocoder.isValidAddress returned: {"position":null} ++++++++++++++++++++++
      entry.component.ts:459 addressCtrlChanged done
      google-geocode.ts:62 GoogleGeocode.geocoder returning
      {
        "address_components":[
          {"long_name":"Suite B2","short_name":"Suite B2","types":["subpremise"]},
          {"long_name":"17205","short_name":"17205","types":["street_number"]},
          {"long_name":"Vashon Highway Southwest","short_name":"Vashon Hwy SW","types":["route"]},
          {"long_name":"Vashon","short_name":"Vashon","types":["locality","political"]},
          {"long_name":"King County","short_name":"King County","types":["administrative_area_level_2","political"]},
          {"long_name":"Washington","short_name":"WA","types":["administrative_area_level_1","political"]},
          {"long_name":"United States","short_name":"US","types":["country","political"]},
          {"long_name":"98070","short_name":"98070","types":["postal_code"]},
          {"long_name":"4674","short_name":"4674","types":["postal_code_suffix"]}
      ],
      "formatted_address":"17205 Vashon Hwy SW Suite B2, Vashon, WA 98070, USA",
      "geometry":{
        "location":{"lat":47.4506552,"lng":-122.4613515},
        "location_type":"ROOFTOP",
        "viewport":{"south":47.4493062197085,"west":-122.4627004802915,"north":47.4520041802915,"east":-122.4600025197085}
      },
      "partial_match":true,
      "place_id":"ChIJ6cK8ACZFkFQR_YHGZRMTSlM",
      "types":["establishment","health","point_of_interest","spa"]
  }
  entry.component.ts:154 #######  address value changed: 10506 sw 132nd pl, vashon, wa, 98070
    */
  // https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams/URLSearchParams



  // https://developers.google.com/maps/documentation/javascript/geocoding#GeocodingResults
  getLatLngAndAddressFromPlaceID(placeId: string) //: { position: google.maps.LatLngLiteral | null, address: string, placeId: string }
  //({position:google.maps.LatLng, address:string})
  {
    if (!GoogleGeocode.geocoder)
      return { position: null, address: "Geocoding requires Internet", placeId: "" }

    let err = ""
    GoogleGeocode.geocoder
      .geocode({ placeId: placeId })
      .then(({ results }) => {
        if (results[0]) {
          console.log(`getLatLngAndAddressFromPlaceID geocoder returned: ${JSON.stringify(results)} ++`)
          return {
            position: results[0].geometry.location,
            address: results[0].formatted_address,
            placeId: results[0].place_id
          }
        } else {
          return { position: null, address: "", placeId: "" }
        }
      })
      .catch((e) => {
        // debugger
        err = "Geocoder failed due to: " + e
      })
    /* _.KA {message: 'GEOCODER_GEOCODE: UNKNOWN_ERROR: A geocoding reque… error. The request may succeed if you try again.', stack: 'Error: GEOCODER_GEOCODE: UNKNOWN_ERROR: A geocodin…DPgrn2iLu2p4II4H1Ww27dx6pVycHVs4&token=57451:1:28', name: 'MapsServerError', endpoint: 'GEOCODER_GEOCODE', code: 'UNKNOWN_ERROR'}
    Local
    this: undefined
    e: _.KA {message: 'GEOCODER_GEOCODE: UNKNOWN_ERROR: A geocoding reque… error. The request may succeed if you try again.', stack: 'Error: GEOCODER_GEOCODE: UNKNOWN_ERROR: A geocodin…DPgrn2iLu2p4II4H1Ww27dx6pVycHVs4&token=57451:1:28', name: 'MapsServerError', endpoint: 'GEOCODER_GEOCODE', code: 'UNKNOWN_ERROR'}
    Closure (getLatLngAndAddressFromPlaceID)
    Block
    Closure (9614)
    Window
    Global*/
    return { position: null, address: err, placeId: "" }
  }

}
