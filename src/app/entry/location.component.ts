import { DOCUMENT } from '@angular/common';
import { AfterViewInit, Component, Inject, Input, OnInit, ViewChild } from '@angular/core';
import { FormControl, FormGroup, Validators, FormBuilder } from '@angular/forms';
import { debounceTime, fromEvent, Observable } from 'rxjs';
import { Map, DDToDMS, CodeArea, OpenLocationCode, GoogleGeocode } from '../shared/' // BUG: , What3Words

import * as P from '@popperjs/core';
//import { createPopper } from '@popperjs/core';
import type { StrictModifiers } from '@popperjs/core';

import { faMapMarkedAlt, faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import { mdiAccount, mdiInformationOutline } from '@mdi/js';
//import { lookupCollections, locate } from '@iconify/json'; //https://docs.iconify.design/icons/all.html vs https://docs.iconify.design/icons/icons.html
import { DomSanitizer } from '@angular/platform-browser';
import { MatIconRegistry } from '@angular/material/icon';// https://material.

import { SettingsService } from '../shared/services';
/*
https://stackoverflow.com/questions/43270564/dividing-a-form-into-multiple-components-with-validation
https://www.digitalocean.com/community/tutorials/how-to-build-nested-model-driven-forms-in-angular-2
https://stackblitz.com/edit/angular-azzmhu?file=src/app/hello.component.ts
ICONS: see pg 164, Ang Dev w/ TS
*/

const THUMBUP_ICON =
  `
  <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px">
    <path d="M0 0h24v24H0z" fill="none"/>
    <path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.` +
  `44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5` +
  `1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-1.91l-.01-.01L23 10z"/>
  </svg>
`

// https://popper.js.org/docs/v2/constructors/
type Placement =
  | 'auto'
  | 'auto-start'
  | 'auto-end'
  | 'top'
  | 'top-start'
  | 'top-end'
  | 'bottom'
  | 'bottom-start'
  | 'bottom-end'
  | 'right'
  | 'right-start'
  | 'right-end'
  | 'left'
  | 'left-start'
  | 'left-end';
type Strategy = 'absolute' | 'fixed';
/*type Options = {|
  placement: Placement, // "bottom"
  modifiers: Array<$Shape<Modifier<any>>>, // []
  strategy: PositioningStrategy, // "absolute",
  onFirstUpdate?: ($Shape<State>) => void, // undefined
|};*/

@Component({
  selector: 'icon',
  template: `
    <svg version="1.1" viewBox="0 0 24 24" style="display:inline-block;width:1.5rem">
        <path [attr.d]="data" d="M13,14H11V10H13M13,18H11V16H13M1,21H23L12,2L1,21Z" />
    </svg>
  `
})
export class IconComponent2 {
  // #region Properties (1)

  @Input('path') public data: string = 'M13,14H11V10H13M13,18H11V16H13M1,21H23L12,2L1,21Z';

  // #endregion Properties (1)
}

@Component({
  //moduleId: module.id,
  selector: 'rangertrak-location',
  templateUrl: './location.component.html',
  styleUrls: ['./location.component.scss']
})
export class LocationComponent implements OnInit, AfterViewInit {
  // #region Properties (33)

  // Grab reference to location portion of parent's entry form
  @Input() public locationFrmGrp: FormGroup // input from entry.component.ts

  /*
  LocationComponent - out of ngOnInit
core.mjs:6485 ERROR Error: formControlName must be used with a
parent formGroup directive.  You'll want to add a formGroup
directive and pass it an existing FormGroup instance
(you can create one in your class).
    Example:
  <div [formGroup]="myGroup">
    <input formControlName="firstName">
  </div>
  In your class:
  this.myGroup = new FormGroup({
      firstName: new FormControl()
  });
    at controlParentException (forms.mjs:1474:12)
    at FormControlName._checkParentType (forms.mjs:5906:23)

    at refreshComponent (core.mjs:10655:1)
defaultErrorLogger @ core.mjs:6485

mini-lmap.component.ts:70 Init Leaflet minimap..........
*/
  //@Input('location') location: FormGroup;
  //@Input('group') location: FormGroup;


  //@Input() location: FormGroup// | null = null //location: FormGroup;
  // public locationForm!: FormGroup
  //  public location2: FormGroup
  //locationCtrl = new FormControl()  // TODO: No formControlName="addressCtrl"!!!!
  //@Input() group: FormGroup;

  public address = ""
  // Grab reference to #elements in template (vs. getElementById)
  // TODO: Remove all these! Per bottom pg 137, go to [FormControl]="nameToUse"
  @ViewChild('latI') elLatI: any
  @ViewChild('latF') elLatF!: HTMLInputElement

  @ViewChild('latQ') elLatQ!: HTMLInputElement
  @ViewChild('latD') elLatD!: HTMLInputElement
  @ViewChild('latM') elLatM!: HTMLInputElement
  @ViewChild('latS') elLatS!: HTMLInputElement

  @ViewChild('lngF') elLngF!: HTMLInputElement
  @ViewChild('lngI') elLngI!: HTMLInputElement

  @ViewChild('lngQ') elLngQ!: HTMLInputElement
  @ViewChild('lngD') elLngD!: HTMLInputElement
  @ViewChild('lngM') elLngM!: HTMLInputElement
  @ViewChild('lngS') elLngS!: HTMLInputElement

  public geocoder = new GoogleGeocode
  //w3w = new What3Words()

  public lat: number // Deg Decimal
  public latI = 0 // Integer portion
  public latF = 0 // Float portion
  public latQ = "N" // Quadrant
  public latD = 0 // Degrees
  public latM = 0 // Minutes
  public latS = 0 // Seconds

  public lng: number
  public lngI = 0
  public lngD = 0
  public lngF = 0
  public lngM = 0
  public lngQ = "E"
  public lngS = 0


  //createPopper<StrictModifiers>(referenceElement, popperElement, options)
  // button: HTMLButtonElement | undefined
  //tooltip: HTMLHtmlElement | undefined
  //popperInstance: any //typeof P.createPopper | undefined

  public faInfoCircle = faInfoCircle
  public faMapMarkedAlt = faMapMarkedAlt
  public mdiAccount: string = mdiAccount
  public mdiInformationOutline: string = mdiInformationOutline

  // #endregion Properties (33)

  // #region Constructors (1)

  constructor(
    private settingsService: SettingsService,
    private _formBuilder: FormBuilder,
    iconRegistry: MatIconRegistry, sanitizer: DomSanitizer, // for svg mat icons
    @Inject(DOCUMENT) private document: Document) {
    console.log("LocationComponent - constructor")

    this.lat = SettingsService.Settings.defLat
    this.lng = SettingsService.Settings.defLng
    this.newLocation(this.lat, this.lng)
    debugger
    // ?initialize our location (duplicate!!! of that in EntryComponent.ts)
    this.locationFrmGrp = this._formBuilder.group({
      address: ['', Validators.required],
      lat: [SettingsService.Settings.defLat],
      lng: [SettingsService.Settings.defLng]
    });

    // https://fonts.google.com/icons && https://material.angular.io/components/icon
    // Note that we provide the icon here as a string literal here due to a limitation in
    // Stackblitz. If you want to provide the icon from a URL, you can use:
    iconRegistry.addSvgIcon('thumbs-up', sanitizer.bypassSecurityTrustResourceUrl('icon.svg'))
    //iconRegistry.addSvgIconLiteral('thumbs-up', sanitizer.bypassSecurityTrustHtml(THUMBUP_ICON))
    console.log("LocationComponent - out of constructor")
  }

  // #endregion Constructors (1)

  // #region Public Methods (11)

  public ngOnInit(): void {
    console.log("LocationComponent - ngOnInit")

    this.newLocation(SettingsService.Settings.defLat, SettingsService.Settings.defLng)

    /*
            this.button = document.querySelector('#button') as HTMLButtonElement
            this.tooltip = document.querySelector('#tooltip') as HTMLHtmlElement
            // https://popper.js.org/docs/v2/constructors/
            this.popperInstance = P.createPopper(this.button, this.tooltip, {
              modifiers: [
                {
                  name: 'offset',
                  options: {
                    offset: [0, 8],
                  },
                },
              ],
            })
      */

    console.log("LocationComponent - out of ngOnInit")
  }

  public ngAfterViewInit() {
    //let keyup$ = Observable.fromEvent(this.elLatI.nativeElement, 'keyup')

    // On Location/Address Change subscriptions  // TODO: USE THESE!!!
    if (this.locationFrmGrp) {
      this.locationFrmGrp.get("latI")?.valueChanges.pipe(debounceTime(700)).subscribe(x => {
        console.log('########  latitude value changed: ' + x)
      })
      this.locationFrmGrp.get("latF")?.valueChanges.pipe(debounceTime(700)).subscribe(x => {
        console.log('########## lat float value changed: ' + x)
      })
      this.locationFrmGrp.get("lngF")?.valueChanges.pipe(debounceTime(700)).subscribe(x => {
        console.log('#######  lng Float value changed: ' + x)
      })

      // TODO: NOt working yet...
      console.log(`addressCtrl.valueChanges`)
      // TODO: No formControlName="addressCtrl"!!!!
      // Error: Uncaught (in promise): TypeError: Cannot read properties of null (reading 'valueChanges')  TypeError: Cannot read properties of null (reading 'valueChanges')
      //this.locationFrmGrp.get('address')!.valueChanges.pipe(debounceTime(700)).subscribe(newAddr => this.addressCtrlChanged2(newAddr))
    }
  }





  public newLocation(latDD: number, lngDD: number) {
    console.log(`updateCoords with new Coordinates: lat: ${latDD}, lng: ${lngDD}`);

    this.lat = latDD
    this.lng = lngDD

    this.latI = Math.floor(latDD)
    // {{latI}} shows [object HTMLInputElement]
    this.lngI = Math.floor(lngDD)
    //this.elLatI.innerText = this.latI.toString()  // BUG: .value fails or
    //     Uncaught (in promise): TypeError: Cannot set properties of undefined (setting 'innerText')
    // TypeError: Cannot set properties of undefined (setting 'innerText')
    //     at LocationComponent.newLocation (location.component.ts:237:5)


    //this.latF = (latDD - this.latI).toFixed(4)
    this.latF = Math.round((latDD - this.latI) * 10000)
    this.lngF = Math.round((lngDD - this.lngI) * 10000)
    // this.setCtrl("enter__Where--LatI", this.latI)
    // this.setCtrl("enter__Where--LatD", this.latF)
    // this.setCtrl("enter__Where--LngI", this.lngI)
    // this.setCtrl("enter__Where--LngD", this.lngF)

    let latDMS = DDToDMS(latDD, false);
    this.latQ = latDMS.dir
    this.latD = latDMS.deg
    this.latM = latDMS.min
    this.latS = latDMS.sec
    // this.setCtrl("latitudeQ", latDMS.dir)
    // this.setCtrl("latitudeD", latDMS.deg)
    // this.setCtrl("latitudeM", latDMS.min)
    // this.setCtrl("latitudeS", latDMS.sec)

    let lngDMS = DDToDMS(lngDD, true);
    this.lngQ = lngDMS.dir
    this.lngD = lngDMS.deg
    this.lngM = lngDMS.min
    this.lngS = lngDMS.sec
    // this.setCtrl("longitudeQ", lngDMS.dir)
    // this.setCtrl("longitudeD", lngDMS.deg)
    // this.setCtrl("longitudeM", lngDMS.min)
    // this.setCtrl("longitudeS", lngDMS.sec)

    // TODO: this.address =""
    /*
        let pCode = OpenLocationCode.encode(latDD, lngDD, 11); // OpenLocationCode.encode using default accuracy returns an INVALID +Code!!!
        console.log("updateCoords: Encode returned PlusCode: " + pCode)
        let fullCode
        if (pCode.length != 0) {
          if (OpenLocationCode.isValid(pCode)) {
            if (OpenLocationCode.isShort(pCode)) {
              // Recover the full code from a short code:
              fullCode = OpenLocationCode.recoverNearest(pCode, SettingsService.Settings.defLat, SettingsService.Settings.defLng)
            } else {
              fullCode = pCode;
              console.log("Shorten +Codes, Global:" + fullCode + ", Lat:" + SettingsService.Settings.defLat + "; lng:" + SettingsService.Settings.defLng);
              // Attempt to trim the first characters from a code; may return same innerText...
              pCode = OpenLocationCode.shorten(fullCode, SettingsService.Settings.defLat, SettingsService.Settings.defLng)
            }
            console.log("New PlusCodes: " + pCode + "; Global: " + fullCode);
            //(document.getElementById("addresses") as HTMLInputElement).value = pCode;
            //document.getElementById("addressLabel").innerHTML = defPCodeLabel; // as HTMLLabelElement
            (document.getElementById("pCodeGlobal") as HTMLLabelElement).innerHTML = " &nbsp;&nbsp; +Code: " + fullCode;
          } else {
            console.log("Invalid +PlusCode: " + pCode);
            document.getElementById("pCodeGlobal")!.innerHTML = " &nbsp;&nbsp; Unable to get +Code"
            //document.getElementById("addressLabel").innerHTML = "  is <strong style='color: darkorange;'>Invalid </strong> Try: "; // as HTMLLabelElement
          }
    */
    // TODO: EMIT AN EVENT!!!!
  }

  public setCtrl_unused(ctrlName: string, value: number | string) {
    console.log(`setCtrl()`)
    let ctrl = this.document.getElementById(ctrlName) as HTMLInputElement
    if (!ctrl) {
      console.warn(`setCtrl(): Could not find element: ${ctrlName}`)
    } else {
      ctrl.value = value.toString()
      //console.log(`setCtrl(): set ${ctrlName} to ${value}: ${ctrl.value}`)
    }
  }


  /*
    //this.addressCtrlChanged('lat') // HACK: to display marker
    this.UpdateLocation_unused ({ lat: latDD, lng: lngDD }) {
    //ToDO: Update 3 words too!
    //if (initialized) this.displaySmallMap(latDD, lngDD);
    }
*/







  // TODO: https://github.com/angular-material-extensions/google-maps-autocomplete
  public addressCtrlChanged(what: string) {
    console.log(`addressCtrlChanged`)
    // TODO: No formControlName="addressCtrl"!!!!

    // this.form.markAsPristine();
    // this.form.markAsUntouched();
    // if (this.locationFrmGrp.get('address')?.touched) {
    //   console.log('address WAS touched')
    //   //this.locationFrmGrp.get('address')?.markAsUntouched
    // }
    // if (this.locationFrmGrp.get('address')?.dirty) {
    //   console.log('address WAS dirty')
    //   //this.location.get('address')?.markAsPristine
    // }

    switch (what) {
      case 'addr':

        this.chkAddresses()
        // if new PlaceId(??? or plus code or ???), then call:
        // TODO: this.geocoder.getLatLngAndAddressFromPlaceID( PlaceID)

        // https://developer.what3words.com/tutorial/javascript-autosuggest-component-v4
        // https://developer.what3words.com/tutorial/combining-the-what3words-js-autosuggest-component-with-a-google-map
        // https://developer.what3words.com/tutorial/javascript
        // https://developer.what3words.com/tutorial/displaying-the-what3words-grid-on-a-google-map

        // Get new lat-lng

        break;
      case 'lat':
      case 'latI':
      case 'latD':
      case 'lng':
      case 'lngI':
      case 'lngD':

        let llat = Number((this.document.getElementById("enter__Where--LatI") as HTMLInputElement).value)
          + Number((this.document.getElementById("enter__Where--LatD") as HTMLInputElement).value) / 100
        let llng = Number((this.document.getElementById("enter__Where--LngI") as HTMLInputElement).value)
          + Number((this.document.getElementById("enter__Where--LngI") as HTMLInputElement).value) / 100
        let ll = new google.maps.LatLng(llat, llng) // Move from Google to Leaflet!
        let newAddress = this.geocoder.getAddressFromLatLng(ll)  // TODO: Disable!!
        console.log(`addressCtrlChanged new ll: ${JSON.stringify(ll)}; addr: ${newAddress}`)

        this.newLocation(llat, llng)
        /*
                let addrLabel = this.document.getElementById("addressLabel") // as HTMLLabelElement
                if (addrLabel) {
                  addrLabel.innerText = newAddress
                  //addrLabel.markAsPristine()
                  //addrLabel. .markAsUntouched()
                }
                */
        this.newMarker({ lat: llat, lng: llng }, `Time: ${Date.now} at Lat: ${llat}, Lng: ${llng}, street: ${newAddress}`)
        break;
      default:
        console.log(`UNEXPECTED ${what} received in AddressCtrlChanged()`)
        break;
    }
    console.log('addressCtrlChanged done') // TODO: No formControlName="addressCtrl"!!!!
  }


  public chkAddresses() {
    console.log("LocationComponent - chkAddresses")

    /* if JSON.stringify(addr): gets
    TypeError: Converting circular structure to JSON
        --> starting at object with constructor 'TView'
        |     property 'blueprint' -> object with constructor 'LViewBlueprint'
        --- index 1 closes the circle
        at JSON.stringify (<anonymous>)
        at EntryComponent.chkAddresses (entry.component.ts:465:47)
        at EntryComponent.addressCtrlChanged (entry.component.ts:424:14)
        */

    let tWords // = document.getElementById("addresses")!.innerText // as HTMLInputElement).value
    let addr = document.getElementById("addressCtrl") as HTMLInputElement// ?.innerText
    console.log(`Looking into address: ${addr}`)
    if (addr == null)
      return
    //debugger
    let addrText = addr.value;
    console.log(`Got some kind of address: ${addrText}`)
    if (addrText.length) {
      if (addrText.includes("+")) {
        console.log("Got PCode: " + addrText)
        this.chkPCodes(addrText)
      } else {
        tWords = addrText.split(".")
        if (tWords.length == 3) {
          console.log("Got What 3 Words: " + addrText)
          this.chk3Words(addrText)
        } else {
          let result = this.chkStreetAddress(addrText)
          let addrLabel = document.getElementById("addressLabel") as HTMLLabelElement
          /*
          if (result.position) {
            addrLabel.innerText
              = `STREET ADDRESS: Formatted address: ${result.address}; Google PlaceID: ${result.placeId}; Position: ${result.position}; partial_match: ${result.partial_match}; placeId: ${result.placeId}; plus_code: ${result.plus_code}`
          } else {
            addrLabel.innerText = `STREET ADDRESS: unable to geocode. ${result.address}`
          }
          */
        }
      }
    }
  }

  // resetForm(){}

  //----------------------------------------------------------------------------------------
  // Address stuff : Move to service/utility for use by big maps?
  // #region

  // https://developers.google.com/maps/documentation/javascript/places
  // https://developer.what3words.com/tutorial/javascript
  // https://developer.what3words.com/tutorial/detecting-if-text-is-in-the-format-of-a-3-word-address
  // https://askinglot.com/what-is-dirty-and-touched-in-angular
  // https://findanyanswer.com/what-is-dirty-in-angular
  // https://angular.io/guide/form-validation
  // https://qansoft.wordpress.com/2021/05/27/reactive-forms-in-angular-listening-for-changes/

  public newMarker(loc: google.maps.LatLngLiteral, title: string = "") {  // TODO: Remove google ref
    console.log("updateLocation() running")

    let addr = this.document.getElementById("derivedAddress")
    // ERROR: if (addr) { addr.innerHTML = "New What3Words goes here!" } // TODO: move to another routine...
    //this.document.getElementById("enter__Where--Address-upshot").value = this.address


    if (title == "") {
      title = `${Date.now} at lat ${loc.lat}, lng ${loc.lng}.`
    }

    //BUG: UPDATE MAP!  Need to emit 'new location'!

    console.error(`New Location ${loc} titled ${title}: Emit me to map`)
    // this.displayMarker(loc, title)
  }



  // TODO: How to subscribe to the valueChanges observable?
  //  listen for changes in the form's value in the *template* using AsyncPipe or in the *component class* w/ subscribe() method

  // https://www.tektutorialshub.com/angular/valuechanges-in-angular-forms/
  // https://angular.io/api/common/AsyncPipe
  // this.document.getElementById("enter__Where--Lat")?.onchange

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



  // https://developer.what3words.com/tutorial/detecting-if-text-is-in-the-format-of-a-3-word-address
  public chk3Words(tWords: string) {
    console.log("LocationComponent - chk3Words")
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

    // let tWords = document.getElementById("addresses")!.innerText;// as HTMLInputElement).value
    console.log('chk3Words - ' + tWords);
    if (tWords.length) {
      // soemthing entered...
      console.log("3Words='" + tWords + "'");
      //this.w3w.w3wAuto(tWords)
      /* BUG:
          this.w3w.w3wAuto.autosuggest(tWords, {
            nFocusResults: 1,
            //clipTo####: ["US"],
            cliptoboundingbox: { south_lat, west_lng, north_lat, east_lng }, // Clip prevents ANY values outside region
            focus: { lat: SettingsService.Settings.defLat, lng: SettingsService.Settings.deflng }, // Focus prioritizes words closer to this point
            nResults: 1
          })
            .then((response: { suggestions: { words: any }[] }) => {
              const verifiedWords = response.suggestions[0].words;
              console.log("Verified Words='" + verifiedWords + "'");
              if (tWords != verifiedWords) {
                document.getElementById("addressLabel")!.textContent = " Verified as: " + verifiedWords; // as HTMLLabelElement
              } else {
                document.getElementById("addressLabel")!.textContent = " Verified.";
              }
              // this.w3w.GetLatlngFrom3Words(verifiedWords)
              this.w3w.convertToCoordinates(verifiedWords).then((response: { coordinates: { lat: any; lng: any }; nearestPlace: string }) => {
                //async call HAS returned!
                this.updateCoords(response.coordinates.lat, response.coordinates.lng);
                // NOTE: Not saving nearest place: too vague to be of value
                document.getElementById("addressLabel")!.textContent += "; Near: " + response.nearestPlace; // as HTMLLabelElement
              });
            })
            .catch(function (error: { code: string; message: string }) {
              errMsg = "[code]=" + error.code + "; [message]=" + error.message + ".";
              */

      // TODO:       this.updateCoords(lat,lng)
      errMsg = ""
      console.log("Unable to verify 3 words entered: " + errMsg);
      document.getElementById("addressLabel")!.textContent = "*** Not able to verify 3 words! ***"; // as HTMLLabelElement
      //})
    }
    // async call not returned yet
  }


  public chkPCodes(pCode: string) {
    // REVIEW: Duplicate of code above...
    //let pCode = document.getElementById("addresses")!.innerText //value;
    console.log("chkPCodes got '" + pCode + "'");
    if (pCode.length) {
      let result = this.geocoder.getLatLngAndAddressFromPlaceID(pCode)
      console.log(`chkPCode of ${pCode} got result:${JSON.stringify(result)}`);

      if (result.position) {
        //    (document.getElementById("addressLabel") as HTMLLabelElement).innerText = result.address;
        (document.getElementById("enter__Where--Lat") as HTMLInputElement).value = "result.position.lat";
        // BUG: position has type of never????!!!!
        (document.getElementById("lng") as HTMLInputElement).value = "JSON.stringify(result.position)";
      }
      else {
        console.log(`chkPCode of ${pCode} got NULL result!!!`);
      }

      if (OpenLocationCode.isValid(pCode)) {
        if (OpenLocationCode.isShort(pCode)) {
          pCode = OpenLocationCode.recoverNearest(pCode, SettingsService.Settings.defLat, SettingsService.Settings.defLng)
        }

        // Following needs a full (Global) code
        let coord = OpenLocationCode.decode(pCode)
        console.log("chkPCodes got " + pCode + "; returned: lat=" + coord.latitudeCenter + ', lng=' + coord.longitudeCenter);

        this.newLocation(coord.latitudeCenter, coord.longitudeCenter);
      }

      else {
        //    document.getElementById("addressLabel")!.innerHTML = " is <strong style='color: darkorange;'>Invalid </strong> Try: " + SettingsService.Settings.defPlusCode
        //document.getElementById("pCodeGlobal")!.innerHTML = SettingsService.Settings.defPlusCode
      }
    }
  }

  public chkStreetAddress(addrText: string) {
    //https://developers.google.com/maps/documentation/geocoding/requests-geocoding
    console.log("Got street address to check: " + addrText)
    // Type 'GeocoderResult' must have a '[Symbol.iterator]()' method that returns an iterator.
    //let result:google.maps.GeocoderResult = this.geocoder.isValidAddress(addrText)
    //  return this.geocoder.isValidAddress(addrText)
    // TODO: this.updateCoords(lat,lng)
  }



  // --------------------------- POPPER ---------------------------
  /*
    // https://popper.js.org/docs/v2/tutorial/
    // TODO: https://popper.js.org/
    // https://popper.js.org/docs/v2/

    show() {
      if (this.tooltip) {
        this.tooltip.setAttribute('data-show', '');
      }

      // Enable the event listeners
      this.popperInstance.setOptions((options: { modifiers: any }) => ({
        ...options,
        modifiers: [
          ...options.modifiers,
          { name: 'eventListeners', enabled: true },
        ],
      }))

      // update the tooltip position
      if (this.popperInstance) {
        //this.popperInstance.update();
      }
    }

    hide() {
      if (this.tooltip) {
        this.tooltip.removeAttribute('data-show')
      }

      // Disable the event listeners
      this.popperInstance.setOptions((options: { modifiers: any }) => ({
        ...options,
        modifiers: [
          ...options.modifiers,
          { name: 'eventListeners', enabled: false },
        ],
      }))
    }

    myPop() {  // TODO: Not supposed to be hidden in a routine...
      const showEvents = ['mouseenter', 'focus']
      const hideEvents = ['mouseleave', 'blur']

      showEvents.forEach((event) => {
        if (this.button) {
          this.button.addEventListener(event, this.show)
        }
      })

      hideEvents.forEach((event) => {
        if (this.button) {
          this.button.addEventListener(event, this.hide);
        }
      })
}
 */

  // https://bobrov.dev/angular-popper/
  // https://sergeygultyayev.medium.com/use-popper-js-in-angular-projects-7b34f18da1c
  // https://github.com/gultyaev/angular-popper-example

  // The hint to display
  //  @Input() target!: HTMLElement
  // Its positioning (check docs for available options)
  //  @Input() placement?: string;
  // Optional hint target if you desire using other element than
  // specified one
  //  @Input() appPopper?: HTMLElement;

  // The popper instance
  /*
  popper: popper;
  private readonly defaultConfig: PopperOptions = {
    placement: 'top',
    removeOnDestroy: true
  };
  constructor(private readonly el: ElementRef) {}
  ngOnInit(): void {
    // An element to position the hint relative to
    const reference = this.appPopper ? this.appPopper : this.el.nativeElement;
    this.popper = new Popper(reference, this.target, this.defaultConfig);
  }
  ngOnDestroy(): void {
    if (!this.popper) {
      return;
    }

    this.popper.destroy();
  }

    popcorn = this.document.querySelector('#popcorn') as HTMLAnchorElement // BUG:
    tooltip = this.document.querySelector('#tooltip') as HTMLAnchorElement

    createPopper(popcorn: HTMLAnchorElement, tooltip: HTMLAnchorElement, {
      //   placement: 'top-end',
    }) {
    }
  */
  public onInfoWhere() {
    console.log("LocationComponent - onInfoWhere")
    let s = "for Enter the latittude either in degrees decmal or as Degrees Minutes & Seconds"
  }


  // #endregion Public Methods (11)
}
