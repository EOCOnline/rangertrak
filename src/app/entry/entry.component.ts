import { DOCUMENT } from '@angular/common'
import { Component, Inject, OnInit, ViewChild, isDevMode } from '@angular/core'
import { FormBuilder, FormControl, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms'
import { MatDatepickerModule } from '@angular/material/datepicker'
import { MatInputModule } from '@angular/material/input'
import {
  NgxMatDatetimePickerModule,
  NgxMatNativeDateModule,
  NgxMatTimepickerModule
} from '@angular-material-components/datetime-picker'
import { MatSnackBar } from '@angular/material/snack-bar'
import { BrowserAnimationsModule } from '@angular/platform-browser/animations'
import { Observable, debounceTime, map, startWith, switchMap } from 'rxjs'

import { AlertsComponent } from '../alerts/alerts.component'
import { FieldReportService, FieldReportStatuses, RangerService, RangerType, SettingsService, TeamService } from '../shared/services/'
import { MapInfoWindow, MapMarker, GoogleMap } from '@angular/google-maps'
import { addressType } from '../lmap/lmap.component' // BUG:
import { DDToDMS } from '../shared/coordinate'


const Vashon: google.maps.LatLngLiteral = { lat: 47.4471, lng: -122.4627 }

@Component({
  selector: 'rangertrak-entry',
  templateUrl: './entry.component.html',
  styleUrls: ['./entry.component.scss'],
  providers: [RangerService, FieldReportService, SettingsService, TeamService]
})
export class EntryComponent implements OnInit {

  // imports this.map as a GoogleMap which is the Angular wrapper around a google.maps.Map...
  @ViewChild(GoogleMap, { static: false }) map!: GoogleMap // even needed?
  // google.maps.Map is NOT the same as GoogleMap...
  gMap?: google.maps.Map
  map2?: google.maps.Map // unused

  onlyMarker = new google.maps.Marker({
    draggable: false,
    animation: google.maps.Animation.DROP
  }) // i.e., a singleton...

  display?: google.maps.LatLngLiteral;
  vashon = new google.maps.LatLng(47.4471, -122.4627)

  zoom = 13
  center: google.maps.LatLngLiteral = Vashon
  options: google.maps.MapOptions = {
    zoomControl: true,
    scrollwheel: true,
    disableDoubleClickZoom: true,
    mapTypeId: 'hybrid',
    maxZoom: 18,
    minZoom: 8,
    draggableCursor: 'crosshair', // https://www.w3.org/TR/CSS21/ui.html#propdef-cursor has others...
    //heading: 90,
  }


  callsignCtrl = new FormControl()
  addressCtrl = new FormControl()
  filteredRangers: Observable<RangerType[]>
  rangers: RangerType[] = []
  fieldReportStatuses
  settings
  entryDetailsForm!: FormGroup

  submitInfo: HTMLElement | null = null
  callInfo: HTMLElement | null = null
  alert: any

  constructor(
    private formBuilder: FormBuilder,
    private rangerService: RangerService,
    private fieldReportService: FieldReportService,
    private settingsService: SettingsService,
    private teamService: TeamService,
    private _snackBar: MatSnackBar,
    @Inject(DOCUMENT) private document: Document) {   //, private service: PostService) {

    this.rangers = rangerService.GetRangers() // TODO: or getActiveRangers?!

    this.alert = new AlertsComponent(this._snackBar, this.document)// TODO: Use Alert Service to avoid passing along doc & snackbar properties!!!!
    if (this.rangers.length < 1) {
      this.alert.Banner('Welcome! First load your rangers - at the bottom of the Rangers page.', 'Go to Rangers page', 'Ignore')
      //this.alert.OpenSnackBar(`No Rangers exist. Please go to Advance section at bottom of Ranger page!`, `No Rangers yet exist.`, 2000)
      //TODO: Force navigation to /Rangers?
    }

    this.fieldReportService = fieldReportService
    this.fieldReportStatuses = FieldReportStatuses
    this.settings = SettingsService.Settings

    // NOTE: workaround for onChange not working...
    this.callsignCtrl.valueChanges.pipe(debounceTime(700)).subscribe(newCall => this.CallsignChanged(newCall))
    this.addressCtrl.valueChanges.pipe(debounceTime(700)).subscribe(newCall => this.CallsignChanged(newCall))

    // https://material.angular.io/components/autocomplete/examples#autocomplete-overview
    this.filteredRangers = this.callsignCtrl.valueChanges.pipe(
      startWith(''),
      map(callsign => (callsign ? this._filterRangers(callsign) : this.rangers.slice())),
    )
  }

  private _filterRangers(value: string): RangerType[] {
    const filterValue = value.toLowerCase()
    this.entryDetailsForm.value.callsign = filterValue
    return this.rangers.filter((ranger1) => ranger1.callsign.toLowerCase().includes(filterValue))
  }

  displayHide(htmlElementID: string) {
    let e = this.document.getElementById(htmlElementID)
    if (e) {
      e.style.visibility = "hidden";
    }
  }

  displayShow(htmlElementID: string) {
    let e = this.document.getElementById(htmlElementID)
    if (e) {
      e.style.visibility = "visible";
    }
  }

  ngOnInit(): void {
    console.log(`EntryForm test started at ${Date()} with development mode ${isDevMode() ? "" : "NOT "}enabled`)
    console.log("EntryComponent - ngOnInit - Use settings to fill form")

    // https://angular.io/api/router/Resolve - following fails as SettingsComponent has yet to run...
    // or even https://stackoverflow.com/questions/35655361/angular2-how-to-load-data-before-rendering-the-component

    console.log(`Running ${this.settings.application} version ${this.settings.version}`)

    this.entryDetailsForm = this.formBuilder.group({
      id: -1,
      callsign: [''],
      team: ['T1'],
      address: ['default location (ngOnInit)'],
      lat: [this.settings.defLat, Validators.required], //Validators.minLength(4)
      long: [this.settings.defLong, Validators.required], //Validators.minLength(4)
      date: [new Date()],
      status: [FieldReportStatuses[0]],   // TODO: Allow changing list & default of statuses in settings?!
      note: ['']
    })

    this.submitInfo = this.document.getElementById("enter__Submit-info")

    if (!this.settings.debugMode) {
      this.displayHide("enter__frm-reguritation")
    }

    console.log(`EntryForm ngOnInit completed at ${Date()}`)
  }



  private findIndex(call: string): number {
    for (let i = 0; i < this.rangers.length; i++) {
      if (this.rangers[i].callsign == call) return i;
    }
    throw new Error(`Entry-findIndex(): Ranger with id ${call} was not found!`);
  }

  CallsignChanged(callsign: string) { // Just serves timer for input field - post interaction
    this.callInfo = this.document.getElementById("enter__Callsign-upshot")
    if (this.callInfo) {
      console.log(`EntryForm CallsignChanged looking for ${callsign}`)
      let ranger = this.rangers[this.findIndex(callsign)];
      this.callInfo.innerHTML = `<img class="enter__Callsign-img" aria-hidden
      src="${ranger.image}" height="50">
      <span>${ranger.callsign}</span> | <small> ${ranger.licensee} | ${ranger.phone}</small>`
    }
  }

  CallsignCtrlChanged() { // NOTE: NEVER CALLED!!!, so use workaround above...
    console.log("callsign Ctrl Changed at ", Date(), ". call=" + "myCall")
    // TODO: update #enter__Callsign-upshot
  }

  /*
  addrInfo: HTMLElement | null = null

  AddressChanged(addr: string) { // Just serves timer for input field - post interaction
    this.addrInfo = this.document.getElementById("enter__Address-upshot")
    if (this.addrInfo) {
      console.log(`EntryForm AdressChanged looking for ${address}`)
      //let ranger = this.rangers[this.findIndex(callsign)];
      this.addrInfo.innerHTML = `addrInfo goes here`
      //<img class="enter__Address-img" aria-hidden
      // src="${ranger.image}" height="50">
      // <span>${ranger.callsign}</span> | <small> ${ranger.licensee} | ${ranger.phone}</small>`
    }
  }
*/
  AddressCtrlChanged(what: string) {

    switch (what) {
      case 'addr':

        // if new PlaceId, then cll: thisgetLatLngAndAddressFromPlaceID()

        // https://developer.what3words.com/tutorial/javascript-autosuggest-component-v4
        // https://developer.what3words.com/tutorial/combining-the-what3words-js-autosuggest-component-with-a-google-map
        // https://developer.what3words.com/tutorial/javascript
        // https://developer.what3words.com/tutorial/displaying-the-what3words-grid-on-a-google-map


        // Get new lat-lng

        break;
      case 'lat':
      case 'lng':

        let llat = Number(this.document.getElementById("enter__Lat")?.innerText)
        let llng = Number(this.document.getElementById("enter__Long")?.innerText)
        //this.document.getElementById("enter__Long")?.innerText
        //this.document.getElementById("enter__Long")?.innerText
        let ll = new google.maps.LatLng(llat, llng)
        let newAddress = this.getAddressFromLatLng(ll)

        let aadrs = this.document.getElementById("addressLabel")
        if (aadrs) {
          aadrs.innerText = newAddress
        }
        break;
      default:
        console.log(`UNEXPECTED ${what} received in AddressCtrlChanged()`)
        break;
    }

    this.updateLocation()
  }

  // FUTURE: provider nicer time picker: https://www.freakyjolly.com/angular-material-109-datepicker-timepicker-tutorial/#Only_Show_Timepicker
  /*
    FUTURE: Allow entry of keywords
    get keywordsControls(): any {
    return (<FormArray>this.entryDetailsForm.get('keywords')).controls
  }   */

  // sleep(ms: number) { return new Promise(resolve => setTimeout(resolve, ms)); }

  /*
    https://www.sitepoint.com/css3-animation-javascript-event-handlers/
    https://css-tricks.com/controlling-css-animations-transitions-javascript/
    https://www.smashingmagazine.com/2013/04/css3-transitions-thank-god-specification/#a2
    https://stackoverflow.com/questions/6268508/restart-animation-in-css3-any-better-way-than-removing-the-element
    https://css-tricks.com/restart-css-animation/
    https://gist.github.com/paulirish/5d52fb081b3570c81e3a
  */
  reset_animation(element: HTMLElement) {
    console.log(`Fade Animation reset`)
    element.style.animation = 'none';
    element.offsetHeight; // trigger reflow
    element.style.animation = "";
  }

  // TODO: This also gets called if the Update Location button is clicked!!
  onFormSubmit(formData1: string): void {
    console.log(`Form submit at ${Date()}`)
    let formData = JSON.stringify(this.entryDetailsForm.value)

    let newReport = this.fieldReportService.addfieldReport(formData)
    console.log(`Report id # ${newReport.id} has been added.`)
    console.log("formData:  " + formData)
    //console.log("formData1: " + JSON.stringify(formData1))

    if (this.submitInfo) {
      // Display fading confirmation to right of Submit button
      this.submitInfo.innerText = `Entry id # ${newReport.id} Saved. ${formData}`
      this.reset_animation(this.submitInfo)
    }
    else {
      console.log("NO this.submitInfo ID FOUND!!!")
    }
    this.alert.OpenSnackBar(`Entry id # ${newReport.id} Saved: ${formData}`, `Entry id # ${newReport.id}`, 2000)

    //this.entryDetailsForm.reset() // std reset just blanks values, doesn't initialize them...
    this.resetForm()
  }


  // TODO: Reset form: Callsign to blank, current date, status/note
  resetForm() {
    console.log("Resetting form...")

    this.entryDetailsForm = this.formBuilder.group({
      id: -2,
      callsign: [''],
      team: ['T0'],
      address: ['default location (reset)'],
      lat: [this.settings.defLat,
      Validators.required,
        //Validators.minLength(4)
      ],
      long: [this.settings.defLong,
      Validators.required,
        //Validators.minLength(4)
      ],
      date: [new Date()],
      status: [FieldReportStatuses[this.settings.defRangerStatus]],   // TODO: Allow changing list & default of statuses in settings?!
      note: ['']
    })
  }

  updateLocation() {
    console.log("updateLocation() running")
    //this.entryDetailsForm.get(['', 'name'])
    //this.entryDetailsForm.controls['derivedAddress'].setValue('New Derived Address')
    let addr = this.document.getElementById("derivedAddress")
    if (addr) { addr.innerHTML = "New What3Words goes here!" }
    this.displayMarker(this.vashon, 'Title:Latest Location')
  }

  // ------------------------------------------------------------------------
  // Map stuff below

  displayMarker(pos: google.maps.LatLng, title = 'Latest Location') {
    // Review: will this overwrite/remove any previous marker?
    if (this.gMap) {
      this.onlyMarker.setMap(this.gMap)
    }
    this.onlyMarker.setPosition(pos)
    this.onlyMarker.setTitle(title)

    /* label: {
       // label: this.labels[this.labelIndex++ % this.labels.length],
       text: "grade", // https://fonts.google.com/icons: rocket, join_inner, noise_aware, water_drop, etc.
       fontFamily: "Material Icons",
       color: "#ffffff",
       fontSize: "18px",
     },
     */
  }

  onMapInitialized(mappy: google.maps.Map) {
    console.log(`onMapInitialized()`)
    this.gMap = mappy

    if (this.gMap == null) {
      console.log("onMapInitialized(): This.gMap is null")
    } else {
      console.log(`onMapInitialized(): this.gMap zoom =${this.gMap.getZoom()}`)
    }
    //this.createOverviewMap()
    this.updateOverviewMap()
  }

  /*
  zoomIn() {
    if (this.options.maxZoom != null) {
      if (this.zoom < this.options.maxZoom) this.zoom++
    }
  }

  zoomOut() {
    if (this.options.minZoom != null) {
      if (this.zoom > this.options.minZoom) this.zoom--
    }
  }
*/

  updateOverviewMap() {
    // https://developers.google.com/maps/documentation/javascript/examples/marker-simple#maps_marker_simple-typescript

    let latlng = new google.maps.LatLng(SettingsService.Settings.defLat, SettingsService.Settings.defLong)
    // REVIEW: Or better yet, ensure the new latlng is already being shown: inside the map bounds?
    this.gMap?.setCenter(latlng)
    // this.gMap?.setZoom(14)
    // this.gMap?.setOptions({draggableCursor:"crosshair"}) // https://www.w3.org/TR/CSS21/ui.html#propdef-cursor has others...
  }

  move(event: google.maps.MapMouseEvent) {
    if (event.latLng) {
      this.display = event.latLng.toJSON()
      console.log('moveing()');
    }
    else {
      console.log('move(): NO event.latLng!!!!!!!!!!!!!');
    }
  }

  //----------------------------------------------------------------------------------------
  // Address stuff : Move to service???

  //https://developers.google.com/maps/documentation/javascript/places
  // https://developer.what3words.com/tutorial/javascript

  // https://developer.what3words.com/tutorial/detecting-if-text-is-in-the-format-of-a-3-word-address

  chkAddresses() {
    let tWords = document.getElementById("addresses")
    let addr = document.getElementById("addresses")
    console.log("Got address: " + addr)
    if (addr == null)
      return
    let addrText = addr.innerText //value;
    console.log("Got address: " + addrText)
    if (addrText.length)
      if (addrText.includes("+")) {
        this.chkPCodes()
      } else {
        tWords = addrText.split(".")
        if (tWords.length == 3) {
          this.chk3Words()
        } else {
          this.chkStreetAddress()
        }
      }
  }

  chkStreetAddress() {
    console.log("Got street address to check")
  }

  chkPCodes() {
    // https://developer.what3words.com/tutorial/ux-guidelines
    // https://developer.what3words.com/tutorial/javascript
    // https://developer.what3words.com/tutorial/displaying-the-what3words-grid-on-a-google-map

    // #region +Code doc
    // https://plus.codes/developers
    // https://github.com/google/open-location-code/wiki
    /*
       Plus Codes refer to variable-sized rectangles - NOT a point! (The regions do have center points however.)

       Only 20 characters are valid: "23456789CFGHJMPQRVWX"

       Global RegEx: /(^|\s)([23456789C][23456789CFGHJMPQRV][23456789CFGHJMPQRVWX]{6}\+[23456789CFGHJMPQRVWX]{2,3})(\s|$)/?i
       This extracts (in capturing group 2) a global code at the start or end of a string, or enclosed with spaces, but not in the middle of a string.

       Local RegEx: /(^|\s)([23456789CFGHJMPQRVWX]{4,6}\+[23456789CFGHJMPQRVWX]{2,3})(\s|$)/?i

       If the query matches, and the user has not entered any other text, then another location must be used to recover the original code. If you are displaying a map to the user, then use the current map center, pass it to the recoverNearest() method to get a global code, and then decode it as above.

       If there is no map, you can use the device location. If you have no map and cannot determine the device location, a local code is not sufficient and you should display a message back to the user asking them to provide a town or city name or the full global code.

       * * *

       Open Location Codes are encodings of WGS84 latitude and longitude coordinates in degrees. Decoding a code returns an area, not a point. The area of a code depends on the length (longer codes are more precise with smaller areas). A two-digit code has height and width[height_width] of 20 degrees, and with each pair of digits added to the code, both height and width are divided by 20.

       The first digit of the code identifies the row (latitude), and the second digit the column (longitude). Subsequent steps divide that area into a 20 x 20 grid, and use one digit to identify the row and another to identify the column.

       If the query matches, and the user has not entered any other text, then another location must be used to recover the original code. If you are displaying a map to the user, then use the current map center, pass it to the recoverNearest() method to get a global code, and then decode it as above.

       globalPCode = encode(latDD,longDD);  // Need locality/focus (within half a degree latitude and half a degree longitude, or ideally 1/4 degree, 25km at equator) pt to get local +code.

       The shorten() method in the OLC library may remove 2, 4, 6 or even 8 characters, depending on how close the reference location is. Although all of these are valid, we recommend only removing the first 4 characters, so that plus codes have a consistent appearance.
    */
    // #endregion

    //
    let pCode = document.getElementById("addresses")!.innerText //value;
    console.log("chkPCodes got '" + pCode + "'");
    if (pCode.length) {

      let result = this.getLatLngAndAddressFromPlaceID(pCode)
      if (result.position) {
        document.getElementById("addressLabel")!.innerHTML = result.address
        document.getElementById("lat")!.innerHTML = result.position.lat
        document.getElementById("long")!.innerHTML = result.position.long
      }

      /*
            if (this.isValid(pCode)) {
              if (pCode.isShort) {
                pCode = this.recoverNearest(pCode, SettingsService.Settings.defLat, SettingsService.Settings.defLong); //OpenLocationCode.recoverNearest
              }

              // Following needs a full (Global) code
              let coord = this.decode(pCode); //OpenLocationCode.decode
              console.log("chkPCodes got " + pCode + "; returned: lat=" + coord.latitudeCenter + ', long=' + coord.longitudeCenter);

              this.updateCoords(coord.latitudeCenter, coord.longitudeCenter);
            }
            */
      else {
        document.getElementById("addressLabel")!.innerHTML = " is <strong style='color: darkorange;'>Invalid </strong> Try: ";
        document.getElementById("pCodeGlobal")!.innerHTML = SettingsService.Settings.defPlusCode;
      }
    }
  }

  w3wAuto() {
    what3words.api.autosuggest("freshen.overlook.clo", {
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

  }


  // https://developer.what3words.com/tutorial/detecting-if-text-is-in-the-format-of-a-3-word-address

  chk3Words() {
    /*let settings = {
      "async": true,
      "crossDomain": true,
      "url": "https://api.what3words.com/v3/autosuggest?key=0M5I8UPF&input=index.home.r&n-results=5&focus=51.521251%2C-0.203586&clip-to-country=BE%2CGB",
      "method": "GET",
      "headers": {}
    }

    $.ajax(settings).done(function (response) {
      console.log("ddd=" +response);
    });
    */

    // No 3 word results outside these values allowed!!
    // south_lat <= north_lat & west_lng <= east_lng
    let south_lat = 46.0;
    let north_lat = 49.0;
    let west_lng = -124.0;
    let east_lng = -120.0;
    let errMsg = "";

    let tWords = document.getElementById("addresses")!.innerText;
    console.log(tWords);
    if (tWords.length) {
      // soemthing entered...
      console.log("3Words='" + tWords + "'");
      what3words.api.autosuggest(tWords, {
        nFocusResults: 1,
        //clipTo####: ["US"],
        cliptoboundingbox: { south_lat, west_lng, north_lat, east_lng }, // Clip prevents ANY values outside region
        focus: { lat: SettingsService.Settings.defLat, lng: SettingsService.Settings.defLong }, // Focus prioritizes words closer to this point
        nResults: 1
      })
        .then((response: { suggestions: { words: any }[] }) => {
          const verifiedWords = response.suggestions[0].words;
          console.log("Verified Words='" + verifiedWords + "'");
          if (tWords != verifiedWords) {
            document.getElementById("addressLabel")!.textContent = " Verified as: " + verifiedWords;
          } else {
            document.getElementById("addressLabel")!.textContent = " Verified.";
          }
          what3words.api.convertToCoordinates(verifiedWords).then((response: { coordinates: { lat: any; lng: any }; nearestPlace: string }) => {
            //async call HAS returned!
            this.updateCoords(response.coordinates.lat, response.coordinates.lng);
            // NOTE: Not saving nearest place: too vague to be of value
            document.getElementById("addressLabel")!.textContent += "; Near: " + response.nearestPlace;
          });
        })
        .catch(function (error: { code: string; message: string }) {
          errMsg = "[code]=" + error.code + "; [message]=" + error.message + ".";
          console.log("Unable to verify 3 words entered: " + errMsg);
          document.getElementById("addressLabel")!.textContent = "*** Not able to verify 3 words! ***";
        });
    }
    // async call not returned yet
  }

  updateCoords(latDD: number, lngDD: number) {
    console.log("New Coordinates: lat:" + latDD + "; lng:" + lngDD);

    document.getElementById("latitudeDD")!.innerText = latDD.toString()
    document.getElementById("longitudeDD")!.innerText = lngDD.toString()

    const latDMS = DDToDMS(latDD, false);
    document.getElementById("latitudeQ")!.innerText = latDMS.dir.toString()
    document.getElementById("latitudeD")!.innerText = latDMS.deg.toString()
    document.getElementById("latitudeM")!.innerText = latDMS.min.toString()
    document.getElementById("latitudeS")!.innerText = latDMS.sec.toString()

    const lngDMS = DDToDMS(lngDD, true);
    document.getElementById("longitudeQ")!.innerText = lngDMS.dir.toString()
    document.getElementById("longitudeD")!.innerText = lngDMS.deg.toString()
    document.getElementById("longitudeM")!.innerText = lngDMS.min.toString()
    document.getElementById("longitudeS")!.innerText = lngDMS.sec.toString()

    let pCode = encode(latDD, lngDD, 11); // OpenLocationCode.encode using default accuracy returns an INVALID +Code!!!
    console.log("updateCoords: Encode returned PlusCode: " + pCode);
    let fullCode;
    if (pCode.length != 0) {

      if (isValid(pCode)) {
        if (pCode.isShort) {
          // Recover the full code from a short code:
          fullCode = recoverNearest(pCode, SettingsService.Settings.defLat, SettingsService.Settings.defLong); //OpenLocationCode.recoverNearest
        } else {
          fullCode = pCode;
          console.log("Shorten +Codes, Global:" + fullCode + ", Lat:" + SettingsService.Settings.defLat + "; Long:" + SettingsService.Settings.defLong);
          // Attempt to trim the first characters from a code; may return same innerText...
          pCode = shorten(fullCode, SettingsService.Settings.defLat, SettingsService.Settings.defLong); //OpenLocationCode.shorten
        }
        console.log("New PlusCodes: " + pCode + "; Global: " + fullCode);
        //document.getElementById("addresses")!.innerText = pCode;
        //document.getElementById("addressLabel").innerHTML = defPCodeLabel;
        document.getElementById("pCodeGlobal")!.innerHTML = " &nbsp;&nbsp; +Code: " + fullCode;
      } else {
        console.log("Invalid +PlusCode: " + pCode);
        document.getElementById("pCodeGlobal")!.innerHTML = " &nbsp;&nbsp; Unable to get +Code"
        //document.getElementById("addressLabel").innerHTML = "  is <strong style='color: darkorange;'>Invalid </strong> Try: ";
      }
    }

    //ToDO: Update 3 words too!
    //if (initialized) this.displaySmallMap(latDD, lngDD);
  }

  strToLatLng(str: string) {
    const latlngStr = str.split(",", 2);
    return new google.maps.LatLng(parseFloat(latlngStr[0]), parseFloat(latlngStr[1]))
  }

  getAddressFromLatLng(latLng: google.maps.LatLng): string {
    const geocoder = new google.maps.Geocoder()

    geocoder
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

  // https://developers.google.com/maps/documentation/javascript/geocoding#GeocodingResults
  getLatLngAndAddressFromPlaceID(placeId: string): any
  //({position:google.maps.LatLng, address:string})
  {
    let err = ""
    const geocoder = new google.maps.Geocoder
    geocoder
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
