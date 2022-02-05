import { DOCUMENT } from '@angular/common'
import { Component, Inject, OnInit, ViewChild, isDevMode } from '@angular/core'
import { FormBuilder, FormControl, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms'
import { MatDatepickerModule } from '@angular/material/datepicker'
import { MatInputModule } from '@angular/material/input'
import { NgxMatDatetimePickerModule, NgxMatNativeDateModule, NgxMatTimepickerModule } from '@angular-material-components/datetime-picker'
import { MatSnackBar } from '@angular/material/snack-bar'
import { BrowserAnimationsModule } from '@angular/platform-browser/animations'
import { Observable, debounceTime, map, startWith, switchMap } from 'rxjs'

import { AlertsComponent } from '../alerts/alerts.component'
import { FieldReportService, FieldReportStatuses, RangerService, RangerType, SettingsService, TeamService } from '../shared/services/'
import { MapInfoWindow, MapMarker, GoogleMap } from '@angular/google-maps'
//import { addressType } from '../lmap/lmap.component' // BUG:
// BUG: What3Words,
import { Map, DDToDMS, CodeArea, OpenLocationCode, GoogleGeocode } from '../shared/'
import { LatLng } from 'leaflet';

const Vashon: google.maps.LatLngLiteral = { lat: 47.4471, lng: -122.4627 }

@Component({
  selector: 'rangertrak-entry',
  templateUrl: './entry.component.html',
  styleUrls: ['./entry.component.scss'],
  providers: [RangerService, FieldReportService, SettingsService, TeamService]
})
export class EntryComponent implements OnInit {

  // ------------------ MAP STUFF  ------------------
  // imports this.map as a GoogleMap which is the Angular wrapper around a google.maps.Map...
  @ViewChild(GoogleMap, { static: false }) map!: GoogleMap // even needed?
  // google.maps.Map is NOT the same as GoogleMap...
  gMap?: google.maps.Map
  //map2?: google.maps.Map // unused

  onlyMarker = new google.maps.Marker({
    draggable: false,
    animation: google.maps.Animation.DROP
  }) // i.e., a singleton...

  display?: google.maps.LatLngLiteral
  vashon = new google.maps.LatLng(47.4471, -122.4627)

  zoom = 11
  center: google.maps.LatLngLiteral = Vashon
  options: google.maps.MapOptions = {
    zoomControl: true,
    scrollwheel: true,
    disableDoubleClickZoom: true,
    mapTypeId: 'hybrid',
    maxZoom: 21,
    minZoom: 7,
    draggableCursor: 'crosshair', // https://www.w3.org/TR/CSS21/ui.html#propdef-cursor has others...
    //heading: 90,
  }
  geocoder = new GoogleGeocode
  //w3w = new What3Words

  // --------------- ENTRY FORM -----------------
  // creating controls in a component class, provides immediate access to listen for, update, and validate state of the form input: https://angular.io/guide/reactive-forms#adding-a-basic-form-control
  callsignCtrl = new FormControl()
  addressCtrl = new FormControl()  // TODO: No formControlName="addressCtrl"!!!!
  filteredRangers: Observable<RangerType[]>
  rangers: RangerType[] = []
  fieldReportStatuses
  settings
  entryDetailsForm!: FormGroup

  submitInfo: HTMLElement | null = null
  callInfo: HTMLElement | null = null
  alert: any

  //myTimePicker = null

  constructor(
    private formBuilder: FormBuilder,
    private rangerService: RangerService,
    private fieldReportService: FieldReportService,
    //private settingsService: SettingsService,
    // private teamService: TeamService,
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
    // TODO: NOt working yet...
    console.log(`addressCtrl.valueChanges`)
    // TODO: No formControlName="addressCtrl"!!!!
    this.addressCtrl.valueChanges.pipe(debounceTime(700)).subscribe(newAddr => this.addressCtrlChanged2(newAddr))

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
      address: [''],  // ' , Vashon, WA 98070' ?
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

    // On Location/Address Change subscriptions
    if (this.entryDetailsForm) {
      this.entryDetailsForm.get("lat")?.valueChanges.subscribe(x => {
        console.log('########  latitude value changed: ' + x)
      })

      this.entryDetailsForm.get("long")?.valueChanges.subscribe(x => {
        console.log('##########  longitude value changed: ' + x)
      })

      this.entryDetailsForm.get("address")?.valueChanges.subscribe(x => {
        console.log('#######  address value changed: ' + x)
      })
    }

    console.log(`EntryForm ngOnInit completed at ${Date()}`)
  }

  // this.myReactiveForm.reset(this.myReactiveForm.value)
  // https://angular.io/guide/reactive-forms#!#_reset_-the-form-flags
  // https://stackoverflow.com/a/54048660
  resetForm() {
    console.log("Resetting form...")

    this.entryDetailsForm = this.formBuilder.group({
      id: -2,
      callsign: [''],
      team: ['T0'],
      address: [''], // ' , Vashon, WA 98070' ?
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
    this.entryDetailsForm.markAsPristine();
    this.entryDetailsForm.markAsUntouched();
  }


  // TODO: NOt working yet...
  CallsignChanged(callsign: string) { // Just serves timer for input field - post interaction
    console.log(`EntryForm CallsignChanged()`)

    this.callInfo = this.document.getElementById("enter__Callsign-upshot")
    if (this.callInfo) {
      console.log(`EntryForm CallsignChanged looking for ${callsign}`)
      //let ranger = this.rangers[this.findIndex(callsign)]
      let ranger = this.rangerService.getRanger(callsign)  // REVIEW is this.rangers here & service in sync?
      this.callInfo.innerHTML = `<span>${ranger.callsign} </span> | <small> ${ranger.licensee} | ${ranger.phone}</small > `
      //< img class= "enter__Callsign-img" aria-hidden src = "${ranger.image}" height = "50" >
    } else {
      console.log(`EntryForm CallsignChanged did not find enter__Callsign-upshot`)
    }
  }

  CallsignCtrlChanged() { // NOTE: NEVER CALLED (my error, maybe does now..)!!!, so use workaround above...
    console.log("callsign Ctrl Changed at ", Date(), ". call=" + "myCall")
    // TODO: update #enter__Callsign-upshot
  }


  // FUTURE: provider nicer time picker: https://www.freakyjolly.com/angular-material-109-datepicker-timepicker-tutorial/#Only_Show_Timepicker

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



  /*
  FUTURE: Allow entry of keywords
  get keywordsControls(): any {
  return (<FormArray>this.entryDetailsForm.get('keywords')).controls
  }   */


  // ------------------------------------------------------------------------
  // Map stuff below
  //#region

  onMapInitialized(newMapReference: google.maps.Map) {
    console.log(`onMapInitialized()`)
    this.gMap = newMapReference
    /*
        if (this.gMap == null) {
          console.log("onMapInitialized(): This.gMap is null")
        } else {
          console.log(`onMapInitialized(): this.gMap zoom =${this.gMap.getZoom()}`)
        }
        */
    this.updateOverviewMap()
    console.log(`onMapInitialized done`)
  }

  updateOverviewMap() {
    console.log(`updateOverviewMap`)

    //let latlng = new google.maps.LatLng(SettingsService.Settings.defLat, SettingsService.Settings.defLong)
    //let latlngL = {lat: SettingsService.Settings.defLat, lng: SettingsService.Settings.defLong}

    // TODO: FitBounds to new point, not to DefLat & DefLong  -- do it on addMarker?
    // this.gMap?.setCenter(latlng) // REVIEW: this and/or next line. (Bounds should be private though!)
    this.gMap?.fitBounds(this.fieldReportService.bounds.extend({ lat: SettingsService.Settings.defLat, lng: SettingsService.Settings.defLong }))
    //this.gMap?.setZoom(10) no effect
  }

  onMapMouseMove(event: google.maps.MapMouseEvent) {
    if (event.latLng) {
      this.display = event.latLng.toJSON()
      console.log('moveing()');
    }
    else {
      console.warn('move(): NO event.latLng!!!!!!!!!!!!!');
    }
  }
  //#endregion



  //----------------------------------------------------------------------------------------
  // Address stuff : Move to service/utility for us by big maps? Also future is to chg miniMap out with Leaflet map (for offline use)
  // #region

  // https://developers.google.com/maps/documentation/javascript/places
  // https://developer.what3words.com/tutorial/javascript
  // https://developer.what3words.com/tutorial/detecting-if-text-is-in-the-format-of-a-3-word-address
  // https://askinglot.com/what-is-dirty-and-touched-in-angular
  // https://findanyanswer.com/what-is-dirty-in-angular
  // https://angular.io/guide/form-validation
  // https://qansoft.wordpress.com/2021/05/27/reactive-forms-in-angular-listening-for-changes/
  addressCtrlChanged2(newAddr: string) {
    // TODO: No formControlName="addressCtrl"!!!!
    console.log(`addressCtrlChanged2: ${newAddr} `)

  }

  UpdateLocation(loc: google.maps.LatLngLiteral, title: string = "") {
    console.log("updateLocation() running")
    //this.entryDetailsForm.get(['', 'name'])
    //this.entryDetailsForm.controls['derivedAddress'].setValue('New Derived Address')
    let addr = this.document.getElementById("derivedAddress")
    if (addr) { addr.innerHTML = "New What3Words goes here!" } // TODO: move to another routine...

    if (title == "") {
      title = `${Date.now} at lat ${loc.lat}, lng ${loc.lng}.`
    }

    this.displayMarker(loc, title)
  }

  displayMarker(pos: google.maps.LatLngLiteral, title = 'Latest Location') {
    console.log(`displayMarker at ${pos}, title: ${title}`)

    // Review: will this overwrite/remove any previous marker?
    if (this.gMap) {
      this.onlyMarker.setMap(this.gMap)
    } else {
      console.warn('gMap NOT set in displayMarker!!!!')
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

  /*
     addrInfo: HTMLElement | null = null

     AddressChanged(addr: string) { // Just serves timer for input field - post interaction
       this.addrInfo = this.document.getElementById("enter__Address-upshot")
       if (this.addrInfo) {
         console.log(`EntryForm AdressChanged looking for ${ address }`)
         //let ranger = this.rangers[this.findIndex(callsign)];
         this.addrInfo.innerHTML = `addrInfo goes here`
         //<img class="enter__Address-img" aria-hidden
         // src="${ranger.image}" height="50">
         // <span>${ranger.callsign}</span> | <small> ${ranger.licensee} | ${ranger.phone}</small>`
       }
     }
   */

  // TODO: How to subscribe to the valueChanges observable?
  //  listen for changes in the form's value in the *template* using AsyncPipe or in the *component class* w/ subscribe() method

  // https://www.tektutorialshub.com/angular/valuechanges-in-angular-forms/
  // https://angular.io/api/common/AsyncPipe
  // this.document.getElementById("enter__Lat")?.onchange

  // https://angular.io/api/forms/AbstractControl
  // https://angular.io/api/forms/NgControlStatus ARE CSS Classes.
  // https://angular.io/api/forms
  // https://www.danvega.dev/blog/2017/06/07/angular-forms-clear-input-field/


  /*
  https://www.tektutorialshub.com/angular/valuechanges-in-angular-forms/

  this.reactiveForm.get("firstname").valueChanges.subscribe(selectedValue => {
  console.log('firstname value changed')
  console.log(selectedValue)
  console.log(this.reactiveForm.get("firstname").value)
  console.log(this.reactiveForm.value)    //shows the old first name

  setTimeout(() => {
    console.log(this.reactiveForm.value)   //shows the latest first name
  })

  For Example, the following code will result in the ValueChanges of the firstname. but not of its parent (i.e. top-level form)

  this.reactiveForm.get("firstname").setValue("", { onlySelf: true });

  You can use the onlySelf: true with the setValue, patchValue, markAsUntouched, markAsDirty, markAsPristine, markAsPending, disable, enable, and updateValueAndValidity methods
  })
  */

  addressCtrlChanged(what: string) {
    console.log(`addressCtrlChanged`)
    // TODO: No formControlName="addressCtrl"!!!!

    // this.form.markAsPristine();
    // this.form.markAsUntouched();
    if (this.entryDetailsForm.get('address')?.touched) {
      console.log('address WAS touched')
      this.entryDetailsForm.get('address')?.markAsUntouched
    }
    if (this.entryDetailsForm.get('address')?.dirty) {
      console.log('address WAS dirty')
      this.entryDetailsForm.get('address')?.markAsPristine
    }

    switch (what) {
      case 'addr':

        // if new PlaceId(??? or plus code or ???), then call:
        // TODO: this.geocoder.getLatLngAndAddressFromPlaceID( PlaceID)

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
        let newAddress = this.geocoder.getAddressFromLatLng(ll)

        let addrLabel = this.document.getElementById("addressLabel")
        if (addrLabel) {
          addrLabel.innerText = newAddress
          //addrLabel.markAsPristine()
          //addrLabel. .markAsUntouched()
        }
        this.UpdateLocation( {lat: llat, lng: llng}, `Time: ${Date.now} at Lat: ${llat}, Lng: ${llng}, street: ${newAddress}`)
        break;
      default:
        console.log(`UNEXPECTED ${what} received in AddressCtrlChanged()`)
        break;
    }


    console.log('addressCtrlChanged done') // TODO: No formControlName="addressCtrl"!!!!
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

    let pCode = OpenLocationCode.encode(latDD, lngDD, 11); // OpenLocationCode.encode using default accuracy returns an INVALID +Code!!!
    console.log("updateCoords: Encode returned PlusCode: " + pCode);
    let fullCode;
    if (pCode.length != 0) {

      if (OpenLocationCode.isValid(pCode)) {
        if (OpenLocationCode.isShort(pCode)) {
          // Recover the full code from a short code:
          fullCode = OpenLocationCode.recoverNearest(pCode, SettingsService.Settings.defLat, SettingsService.Settings.defLong)
        } else {
          fullCode = pCode;
          console.log("Shorten +Codes, Global:" + fullCode + ", Lat:" + SettingsService.Settings.defLat + "; Long:" + SettingsService.Settings.defLong);
          // Attempt to trim the first characters from a code; may return same innerText...
          pCode = OpenLocationCode.shorten(fullCode, SettingsService.Settings.defLat, SettingsService.Settings.defLong)
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

  chkPCodes() {
    // REVIEW: Duplicate of code above...
    let pCode = document.getElementById("addresses")!.innerText //value;
    console.log("chkPCodes got '" + pCode + "'");
    if (pCode.length) {

      let result = this.geocoder.getLatLngAndAddressFromPlaceID(pCode)
      if (result.position) {
        document.getElementById("addressLabel")!.innerHTML = result.address
        document.getElementById("lat")!.innerHTML = result.position.lat
        document.getElementById("long")!.innerHTML = result.position.long
      }


      if (OpenLocationCode.isValid(pCode)) {
        if (OpenLocationCode.isShort(pCode)) {
          pCode = OpenLocationCode.recoverNearest(pCode, SettingsService.Settings.defLat, SettingsService.Settings.defLong)
        }

        // Following needs a full (Global) code
        let coord = OpenLocationCode.decode(pCode)
        console.log("chkPCodes got " + pCode + "; returned: lat=" + coord.latitudeCenter + ', long=' + coord.longitudeCenter);

        this.updateCoords(coord.latitudeCenter, coord.longitudeCenter);
      }

      else {
        document.getElementById("addressLabel")!.innerHTML = " is <strong style='color: darkorange;'>Invalid </strong> Try: ";
        document.getElementById("pCodeGlobal")!.innerHTML = SettingsService.Settings.defPlusCode;
      }
    }
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
    console.log('chk3Words - ' + tWords);
    if (tWords.length) {
      // soemthing entered...
      console.log("3Words='" + tWords + "'");
      // this.w3w.w3wAuto()
      /* BUG:
          this.w3w.w3wAuto.autosuggest(tWords, {
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
              // this.w3w.GetLatLongFrom3Words(verifiedWords)
              this.w3w.convertToCoordinates(verifiedWords).then((response: { coordinates: { lat: any; lng: any }; nearestPlace: string }) => {
                //async call HAS returned!
                this.updateCoords(response.coordinates.lat, response.coordinates.lng);
                // NOTE: Not saving nearest place: too vague to be of value
                document.getElementById("addressLabel")!.textContent += "; Near: " + response.nearestPlace;
              });
            })
            .catch(function (error: { code: string; message: string }) {
              errMsg = "[code]=" + error.code + "; [message]=" + error.message + ".";
              */
      errMsg = ""
      console.log("Unable to verify 3 words entered: " + errMsg);
      document.getElementById("addressLabel")!.textContent = "*** Not able to verify 3 words! ***";
      //})
    }
    // async call not returned yet
  }
  //#endregion

  chkAddresses_UNUSED() {
    let tWords // = document.getElementById("addresses")!.innerText
    let addr = document.getElementById("addresses") // ?.innerText
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
          let result = this.geocoder.isValidAddress(addrText)
          //  TODO: Untested/not complete
          console.log(`geocoder.isValidAddress returned: ${JSON.stringify(result)} ++++++++++++++++++++++`)
          //this.chkStreetAddress()
        }
      }
  }

  /*
  chkStreetAddress_UNUSED() {
    //https://developers.google.com/maps/documentation/geocoding/requests-geocoding
    console.log("Got street address to check")
  }
  */

  // ---------------- MISC HELPERS -----------------------------
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


}
