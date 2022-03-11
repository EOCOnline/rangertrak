//import * as I from "./"
//import { Components as W3W  } from "@what3words/javascript-components"
import { DOCUMENT } from '@angular/common'
import { Component, Inject, OnInit, ViewChild, isDevMode } from '@angular/core'
import { AlertsComponent } from './alerts/alerts.component'
//import { UrlHandlingStrategy } from "@angular/router";
import { SettingsService } from "./services";

// https://github.com/what3words/w3w-node-wrapper has the answers!!!
//import * as W3W from "@what3words/javascript-components"
// import what3words, { ApiVersion, What3wordsService, AutosuggestClient, AutosuggestOptions, AutosuggestResponse, ConvertToCoordinatesClient, ConvertToCoordinatesOptions, ConvertTo3waClient, ConvertTo3waOptions } from '@what3words/api';
import what3words, * as w3w from '@what3words/api';
//import { W3W_REGEX } from "@what3words/javascript-components/dist/types/lib/constants";
import { GoogleMap } from '@angular/google-maps';
// <script src="https://assets.what3words.com/sdk/v3/what3words.js?key=YOUR_apiKey"></script>
// mainly from https://developer.what3words.com/tutorial/javascript

/*
https://github.com/what3words/w3w-node-wrapper/issues/40
 See also: https://dev.to/przpiw/react-pdf-rendering-4g7b & https://github.com/angular/angular-cli/issues/20819


./node_modules/@what3words/api/dist/lib/constants.js:4:11-24 - Error: Module not found: Error: Can't resolve 'os' in 'D:\Projects\RangerTrak\rangertrak\node_modules\@what3words\api\dist\lib'

BREAKING CHANGE: webpack < 5 used to include polyfills for node.js core modules by default.
This is no longer the case. Verify if you need this module and configure a polyfill for it.

If you want to include a polyfill, you need to:
        - add a fallback 'resolve.fallback: { "os": require.resolve("os-browserify/browser") }'
        - install 'os-browserify'
If you don't want to include a polyfill, you can use an empty module like this:
        resolve.fallback: { "os": false }



× Failed to compile.
*/

// from @what3words/javascript-components:
export interface What3wordsAddress33 {
  "iconColor": string;
  "link": boolean;
  "showTooltip": boolean;
  "size": number;
  "target": string;
  "textColor": string;
  "tooltip": boolean;
  "tooltipLocation": string;
  "words": string;
}

export interface What3wordsAutosuggest33 {
  "apiKey": string;
  "autosuggest_focus": string;
  "base_url": string;
  "callback": string;
  "clip_to_bounding_box": string;
  "clip_to_circle": string;
  "clip_to_country": string;
  "clip_to_polygon": string;
  "headers": string;
  "initial_value": string;
  "invalid_address_error_message": string;
  "language": string;
  "n_focus_results": number;
  "name": string;
  "return_coordinates": boolean;
  "typeahead_delay": number;
  //"variant"//: Variant; // Can't find Variant...
}

export interface What3wordsSymbol33 {
  "color": string;
  "size": number;
}


// -----------------------------------------------------------------------------------------
// https://developer.what3words.com/tutorial/javascript


export class What3Words {

  private static apiKey = "YBIMPRHH" // For RangerTrak  // TODO: Hide as a private key
  //const apiKey: string = '<YOUR_apiKey>';

  //const
  config: {
    host: string,
    apiVersion: w3w.ApiVersion,
  } = {
      host: 'https://api.what3words.com',
      apiVersion: w3w.ApiVersion.Version3,  // or v3
    };

  /* The transport is a function responsible for executing the request against the API. Given a
  ClientRequest the transport should return a promise that resolves to TransportResponse. */
  // const
  transport: 'axios' | 'fetch' = 'fetch';

  /* The What3wordsService provides a quick and easy way to instantiate the API clients that can
  be used to make requests against the what3words API. It also provides helper functions for
  setting API configuration, such as host and API version and your API key across
  the what3words API clients.*/
  //const w3wService: What3wordsService = what3words(What3Words.apiKey, this.config, { this.transport });
  //const
  w3wService: w3w.What3wordsService = what3words(What3Words.apiKey, this.config,);

  // Components.What3wordsAddress
  // Components.What3wordsAutosuggest
  // Components.What3wordsSymbol


  constructor(
    //@Inject(DOCUMENT) private document: Document
  ) {

  }
  /*
    reg = W3W_REGEX
    w3w = W3W

    a: What3wordsAddress = {"iconColor": "red",
    "link": false,
    "showTooltip": true,
    "size": 5,
    "target": "target",
    "textColor": "blue",
    "tooltip": true,
    "tooltipLocation": "top",
    "words": "///existed.unanswered.articulated"}

    b: What3wordsAutosuggest = {
      "apiKey": What3Words.apiKey,
    "autosuggest_focus": "existed.unanswered.articulated",
    "base_url": "base",
    "callback": "callback()",
    "clip_to_bounding_box": "",
    "clip_to_circle": "",
    "clip_to_country": "US",
    "clip_to_polygon": "",
    "headers": "",
    "initial_value": "",
    "invalid_address_error_message": "Bad Address...",
    "language": "English",
    "n_focus_results": 2,
    "name": "John",
    "return_coordinates": false,
    "typeahead_delay": 5,
    //"variant"//: Variant; // Can't find Variant...
    }

    c: What3wordsSymbol = {"color": "green",
      "size": 7}

    // reg
    // w3w

    test() {
      // let x = W3W.
    }
  */

  static settings = {
    "async": true,
    "crossDomain": true,
    "url": "https://api.what3words.com/v3/autosuggest?key=" + What3Words.apiKey + "&input=index.home.r&n-results=5&focus=51.521251%2C-0.203586&clip-to-country=BE%2CGB",
    "method": "GET",
    "headers": {}
  }


  ShapedAs3Words(threeWords: string): boolean {
    // from https://developer.what3words.com/tutorial/detecting-if-text-is-in-the-format-of-a-3-word-address
    var regex = /^\/{0,}[^0-9`~!@#$%^&*()+\-_=[{\]}\\|'<,.>?/";:£§º©®\s]{1,}[.｡。･・︒។։။۔።।][^0-9`~!@#$%^&*()+\-_=[{\]}\\|'<,.>?/";:£§º©®\s]{1,}[.｡。･・︒។։။۔።।][^0-9`~!@#$%^&*()+\-_=[{\]}\\|'<,.>?/";:£§º©®\s]{1,}$/;

    if (regex.test(threeWords))
      // is the format of a three word address
      return true
    else
      // is NOT a three word address
      return false
  }

  Get3WordsFromLatLong(lat: number, lng: number, lang: string = 'en'): string {
    /**
     * Converts a coordinate to a 3 word address
     * @param {Object} coordinates - The coordinate object
     * @param {number} coordinates.lat - The latitude
     * @param {number} coordinates.lng - The longitude
     * @param {string} [language=en] - The language to return the 3 word address in
     * @returns {Promise} Promise 3 word address response
     */

    /* Property 'convertTo3wa' does not exist on type '(apiKey?: string | undefined, config?: ApiClientConfiguration | undefined, opts?: { transport: "axios" | "fetch" | Transport; } | undefined) => What3wordsService'. */

    const client: w3w.ConvertTo3waClient = w3w.ConvertTo3waClient.init(What3Words.apiKey)
    const options: w3w.ConvertTo3waOptions = { coordinates: { lat: lat, lng: lng } };
    // debugger
    client.run(options)
      .then((res: any/*ConvertTo3waResponse*/) => console.log('Convert to 3wa', res));
    // debugger

    /*
        w3w.ConvertTo3waClient.convertTo3wa({ lat, lng }, lang)
          .then(function (response: any) {
            console.log("[convertTo3wa]", JSON.stringify(response));
            return response
          })
          .catch(function (error: any) {
            console.log("[code]", error.code);
            console.log("[message]", error.message)
            return `Error: [code]: ${error.code} [message]: ${error.message}`
          })
          */
    return "No suggested 3 words"
  }

  GetLatLongFrom3Words(threeWords: string) {
    /**
     * Returns coordinates for a 3 word address
     * @param {string} words - The 3 word address words to convert to coordinates
     * @returns {Promise} - Promise coordinates response
     */


    const client: w3w.ConvertToCoordinatesClient = w3w.ConvertToCoordinatesClient.init(What3Words.apiKey)
    const options: w3w.ConvertToCoordinatesOptions = { words: threeWords };

    // debugger
    client.run(options)
      .then((res: any /*ConvertToCoordinatesResponse*/) => console.log('Convert to coordinates', res));
    // debugger

    /*
        w3w.convertToCoordinates("filled.count.soap")
          .then(function (response: any) {
            console.log("[convertToCoordinates]", response);
          })
          .catch(function (error: any) {
            console.log("[code]", error.code);
            console.log("[message]", error.message);
          })
    */

    if (threeWords.length) {
      // something entered...

      console.log("3Words='" + threeWords + "'")
      /*
            w3w.autosuggest(threeWords, {
              nFocusResults: 1,
              //clipTo####: ["US"], - done by default
              // TODO: cliptoboundingbox: { south_lat, west_lng, north_lat, east_lng }, // Clip prevents ANY values outside region
              focus: { lat: this.settingsService.settings.defLat, lng: this.settingsService.settings.defLong }, // Focus prioritizes words closer to this point
              nResults: 1
            })
              .then(function (response: any) {
                what3words.api.verifiedWords = response.suggestions[0].words
                console.log("Verified Words='" + what3words.api.verifiedWords + "'")
                if (threeWords != what3words.api.verifiedWords) {
                  // TODO: Don't tie to HTML!!!
                  document.getElementById("addressLabel")!.textContent = " Verified as: " + what3words.api.verifiedWords
                } else {
                  document.getElementById("addressLabel")!.textContent = " Verified."
                }
                what3words.api.convertToCoordinates(what3words.api.verifiedWords).then(function (response: any) {
                  //async call HAS returned!
                  what3words.api.updateCoords(response.coordinates.lat, response.coordinates.lng)
                  // NOTE: Not saving nearest place: too vague to be of value
                  document.getElementById("addressLabel")!.textContent += " Near: " + response.nearestPlace
                })
              })
              .catch(function (error: any) {
                let errMsg = "[code]=" + error.code + " [message]=" + error.message + "."
                console.log("Unable to verify 3 words entered: " + errMsg)
                document.getElementById("addressLabel")!.textContent = "*** Not able to verify 3 words! ***"
              })
              */
    }
    // async call not returned yet

  }



  getGrid(southwest: google.maps.LatLngLiteral, northeast: google.maps.LatLngLiteral) {
    /**
   * Returns a section of the what3words grid
   * @param {Object} boundingBox - The bounding box for the grid to return
   * @param {Object} [boundingBox.southwest] - The coordinates of the southwest corner of the bounding box
   * @param {Object} [boundingBox.southwest.lat] - The latitude of the southwest corner of the bounding box
   * @param {Object} [boundingBox.southwest.lng] - The longitude of the southwest corner of the bounding box
   * @param {Object} [boundingBox.northeast] - The coordinates of the northeast corner of the bounding box
   * @param {Object} [boundingBox.northeast.lat] - The latitude of the northeast corner of the bounding box
   * @param {Object} [boundingBox.northeast.lng] - The longitude of the northeast corner of the bounding box
   * @return {Promise} - Promise the grid section
   */

    // see https://github.com/what3words/w3w-node-wrapper#grid-section
    /*
    w3w.gridSection({
      southwest: southwest, // { lat: 51.508341, lng: -0.125499 },
      northeast: northeast // { lat: 51.507341, lng: -0.124499 }
    })
      .then(function (response: any) {
        console.log("[gridSection]", response)
      })
      .catch(function (error: any) {
        console.log("[code]", error.code)
        console.log("[message]", error.message);
      })
  }


  /*
  $.ajax(settings).done(function (response) {
    MAIN.dbug("ddd=" + response)
  })
    */

    // No 3 word results outside these values allowed!!
    // south_lat <= north_lat & west_lng <= east_lng
    /*
    let south_lat = 46.0
    let north_lat = 49.0
    let west_lng = -124.0
    let east_lng = -120.0
    let errMsg = ""
    */
    //let threeWords = document.getElementById("address")!.innerHTML // was 'addresses'...
    //MAIN.dbug(threeWords)

  }

  w3wAuto(w3wSuggestion: string) {

    const client: w3w.AutosuggestClient = w3w.AutosuggestClient.init(What3Words.apiKey);
    const options: w3w.AutosuggestOptions = {
      input: w3wSuggestion,
    }
    let res
    // debugger
    client.run(options)
      .then((res: w3w.AutosuggestResponse) =>
        console.log(`suggestions for "${w3wSuggestion}"`, JSON.stringify(res))
      );
    // debugger
    return res

    /*
    "apiKey": string;
      "autosuggest_focus": string;
      "base_url": string;
      "callback": string;
      "clip_to_bounding_box": string;
      "clip_to_circle": string;
      "clip_to_country": string;
      "clip_to_polygon": string;
      "headers": string;
      "initial_value": string;
      "invalid_address_error_message": string;
      "language": string;
      "n_focus_results": number;
      "name": string;
      "return_coordinates": boolean;
      "typeahead_delay": number;
      */


    /*   what3words.api.autosuggest("freshen.overlook.clo", {
         nFocusResults: 1,
         clipToCountry: ["FR"],
         focus: { lat: 48.856618, lng: 2.3522411 },
         nResults: 1

       })
         .then(function (response: { suggestions: { words: any }[] }) {
           var words = response.suggestions[0].words;

           let top3wa = document.getElementById("top3wa");
           top3wa!.innerHTML += words;

           what3words.api.convertToCoordinates(words).then(function (response: { coordinates: { lat: string; lng: string }; nearestPlace: string }) {
             let coords = document.getElementById("coords");
             let nearestPlace = document.getElementById("nearest_place");

             coords!.innerHTML += response.coordinates.lat + ', ' + response.coordinates.lng;
             nearestPlace!.innerHTML += response.nearestPlace;
           });
         })
         .catch(function (error: { code: any; message: any; }) {
           console.log("[code]", error.code);
           console.log("[message]", error.message);
         });
   */
  }


















  // Javascript autosuggest tutorial:
  // https://developer.what3words.com/tutorial/javascript-autosuggest-component-v4
  private autoSuggestOptions_UNUSED() {
    /* AutoSuggest
    When presented with a 3 words address which may be incorrectly entered, AutoSuggest returns a list of potential correct 3 word addresses. It needs the first two words plus at least the first character of the third word to produce suggestions.

    This method provides corrections for mis-typed words (including plural VS singular), and words being in the wrong order.

    Optionally, clipping can narrow down the possibilities, and limit results to:

    One or more countries
    A geographic area (a circle, box or polygon)
    This dramatically improves results, so we recommend that you use clipping if possible.

    To improve results even further, set the focus to user’s current location. This will make autosuggest return results which are closer to the user.

    More information about autosuggest, including returned results is available in the what3words REST API documentation.

    Example: Basic Autosuggest call
    */
    /**
     * Returns autosuggest results for a search term
     * @param {string} input - The input to search for autosuggests
     * @param {Object} [options] - The result filter and clipping options
     * @param {Object} [options.focus] - The coordinates for the focus of the search
     * @param {number} [options.focus.lat] - The latitude of the focus
     * @param {number} [options.focus.lng] - The longitude of the focus
     * @param {string} [options.nFocusResults] - The number of focused results
     * @param {string[]} [options.clipToCountry] - The countries to clip results to
     * @param {Object} [options.clipToBoundingBox] - The bounding box to clip results within
     * @param {Object} [options.clipToBoundingBox.southwest] - The coordinates of the southwest corner of the clipping box
     * @param {Object} [options.clipToBoundingBox.southwest.lat] - The latitude of the southwest corner of the clipping box
     * @param {Object} [options.clipToBoundingBox.southwest.lng] - The longitude of the southwest corner of the clipping box
     * @param {Object} [options.clipToBoundingBox.northeast] - The coordinates of the northeast corner of the clipping box
     * @param {Object} [options.clipToBoundingBox.northeast.lat] - The latitude of the northeast corner of the clipping box
     * @param {Object} [options.clipToBoundingBox.northeast.lng] - The longitude of the northeast corner of the clipping box
     * @param {Object} [options.clipToCircle] - The circle to clip results within
     * @param {Object} [options.clipToCircle.center] - The center of the circle to clip results within
     * @param {number} [options.clipToCircle.center.lat] - The latitude of the center of the circle to clip results within
     * @param {number} [options.clipToCircle.center.lng] - The longitude of the center of the circle to clip results within
     * @param {number} [options.clipToCircle.radius] - The radius of the circle to clip results within
     * @param {number[]} [options.clipToPolygon] - An array of polygon coordinates to clip results within
     * @param {string} [options.inputType] - 'text' | 'vocon-hybrid' | 'nmdp-asr' | 'generic-voice'
     * @param {string} [options.language] - The language to return autosuggest results in
     * @param {boolean} [options.preferLang] - Whether to bias towards results that are over land vs over the sea.
     * @returns {Promise} - Promise 3 word address autosuggestions response
     **/
    /*
    w3w.autosuggest("fun.with.code")
      .then(function (response: any) {
        console.log("[autosuggest]", response);
      })
      .catch(function (error: any) {
        console.log("[code]", error.code);
        console.log("[message]", error.message);
      })

    // Other AutoSuggest forms
    what3words.api.autosuggest("fun.with.code", { clipToCountry: ["FR", "DE"] }).then(function (response: any) { console.log("[autosuggest]", response) })
    what3words.api.autosuggest("fun.with.code", { clipToCircle: { center: { lat: 51.4243877, lng: -0.34745 }, radius: 50 } })
    what3words.api.autosuggest("fun.with.code", { clipToPolygon: [51.421, -0.343, 52.6, 2.3324, 54.234, 8.343, 51.421, -0.343] })
    what3words.api.autosuggest("fun.with.code", {
      clipToBoundingBox: {
        southwest: { lat: 51.521, lng: -0.343 },
        northeast: { lat: 52.6, lng: 2.3324 }
      }
    })
    what3words.api.autosuggest("fun.with.code", { focus: { lat: 51.4243877, lng: -0.34745 } })
    what3words.api.autosuggest("fun with code", { inputType: "generic-voice", language: "en" })
    */
  }
}
