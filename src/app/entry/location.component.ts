import { BehaviorSubject, debounceTime, fromEvent, Observable, Subscription } from 'rxjs'

import { DOCUMENT } from '@angular/common'
import {
    AfterViewInit, Component, EventEmitter, Inject, Input, OnDestroy, OnInit, Output, ViewChild
} from '@angular/core'
import { FormControl, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms'
// import * as P from '@popperjs/core';
///import { createPopper } from '@popperjs/core';
// import type { StrictModifiers } from '@popperjs/core';
import { faInfoCircle, faMapMarkedAlt } from '@fortawesome/free-solid-svg-icons'
import { mdiAccount, mdiInformationOutline } from '@mdi/js'

import { CodeArea, DDToDDM, DDToDMS, GoogleGeocode, OpenLocationCode } from '../shared/'
//import { MatIconRegistry } from '@angular/material/icon';
import {
    LocationType, LogService, SettingsService, SettingsType, undefinedAddressFlag
} from '../shared/services'

/*
https://stackoverflow.com/questions/43270564/dividing-a-form-into-multiple-components-with-validation
https://www.digitalocean.com/community/tutorials/how-to-build-nested-model-driven-forms-in-angular-2
https://stackblitz.com/edit/angular-azzmhu?file=src/app/hello.component.ts
*/
const magicTempNumber = 12  // BUG: same as magicNumber2 in entryComponent.ts: i.e., "undefined"

@Component({
  //moduleId: module.id,
  selector: 'rangertrak-location',
  templateUrl: './location.component.html',
  styleUrls: ['./location.component.scss']
})
export class LocationComponent implements OnInit, OnDestroy {
  // Grab reference to location portion of parent's entry form
  @Input() public locationFrmGrp!: UntypedFormGroup // input from entry.component.ts
  @Input() public initialLoc: LocationType = { lat: magicTempNumber, lng: magicTempNumber, address: undefinedAddressFlag }
  // input from entry.component.ts

  // We emit following event to parent,
  // parent's template has: (newLocationEvent)="onNewLocation($event)"
  // Parent's onNewLocation($event) gets called.
  // Parent then passes the new location (via binding), to any children as needed
  @Output() newLocationEvent = new EventEmitter<LocationType>()

  // @Input('location') location: FormGroup;
  // @Input('group') location: FormGroup;
  // @Input() location: FormGroup// | null = null //location: FormGroup;
  // public locationForm!: FormGroup
  // public location2: FormGroup
  // locationCtrl = new FormControl()  // TODO: No formControlName="addressCtrl"!!!!


  public myLat = 56.7890 // BUG:
  private id = "Location Component"

  // Grab reference to #elements in template (vs. getElementById)
  // TODO: Remove all these! Per bottom pg 137, go to [FormControl]="nameToUse"
  // @ViewChild('latI') elLatI!: HTMLInputElement
  // @ViewChild('latF') elLatF!: HTMLInputElement

  // @ViewChild('latQ') elLatQ!: HTMLInputElement
  // @ViewChild('latD') elLatD!: HTMLInputElement
  // @ViewChild('latM') elLatM!: HTMLInputElement
  // @ViewChild('latS') elLatS!: HTMLInputElement

  // @ViewChild('lngF') elLngF!: HTMLInputElement
  // @ViewChild('lngI') elLngI!: HTMLInputElement

  // @ViewChild('lngQ') elLngQ!: HTMLInputElement
  // @ViewChild('lngD') elLngD!: HTMLInputElement
  // @ViewChild('lngM') elLngM!: HTMLInputElement
  // @ViewChild('lngS') elLngS!: HTMLInputElement

  public geocoder = new GoogleGeocode
  //w3w = new What3Words()

  public location!: LocationType

  public latI = 0 // Integer portion
  public latF = 0 // Float portion

  public latQ = "N" // Quadrant
  public latD = 0 // Degrees
  public latM = 0 // Minutes
  public latS = 0 // Seconds

  public latDDMQ = "N" // Quadrant
  public latDDMD = 0 // Degrees
  public latDDMM = 0 // Minutes

  public lngI = 0
  public lngD = 0

  public lngF = 0
  public lngM = 0
  public lngQ = "E"
  public lngS = 0

  public lngDDMQ = "N" // Quadrant
  public lngDDMD = 0 // Degrees
  public lngDDMM = 0 // Minutes

  //createPopper<StrictModifiers>(referenceElement, popperElement, options)
  // button: HTMLButtonElement | undefined
  //tooltip: HTMLHtmlElement | undefined
  //popperInstance: any //typeof P.createPopper | undefined

  public faInfoCircle = faInfoCircle
  public faMapMarkedAlt = faMapMarkedAlt
  public mdiAccount: string = mdiAccount
  public mdiInformationOutline: string = mdiInformationOutline

  private settingsSubscription: Subscription
  private settings!: SettingsType
  //private locationSubject$: BehaviorSubject<LocationType>


  constructor(
    private settingsService: SettingsService,
    private _formBuilder: UntypedFormBuilder,
    private log: LogService,
    @Inject(DOCUMENT) private document: Document) {
    this.log.info("Construction", this.id)

    //! TODO: Move ALL subscribes to AfterViewInit() !!!!
    this.settingsSubscription = this.settingsService.getSettingsObserver().subscribe({
      next: (newSettings) => {
        this.settings = newSettings
        this.log.excessive('Received new Settings via subscription.', this.id)
      },
      error: (e) => this.log.error('Settings Subscription got:' + e, this.id),
      complete: () => this.log.info('Settings Subscription complete', this.id)
    })

    //this.locationFrmGrp = _formBuilder.group(LocationType)

    //{
    //   lat: [],
    //   lng: [],
    //   address: []
    // })

    this.log.verbose("Out of constructor", this.id)
  }

  /**
   * Expose Observable to 3rd parties, but not the actual subject (which could be abused)

  public getLocationObserver(): Observable<LocationType> {
    return this.locationSubject$!.asObservable()
  }*/
  // #endregion Constructors (1)

  // #region Public Methods (11)

  // Initialize data or fetch external data from services or API (https://geeksarray.com/blog/angular-component-lifecycle)
  public ngOnInit(): void {
    this.log.info("ngOnInit", this.id)
    if (!this.settings) {
      this.log.error(`this.settings was null in ngOnInit`, this.id)
      return
    }

    // TODO: Give up the thread/sleep(500) to let the values come though?!
    if (this.initialLoc.lat != magicTempNumber && this.initialLoc.lng != magicTempNumber) {
      // Use initial Location values passed from parent's html form
      this.location = this.initialLoc
    } else {
      // Use defaults if parent didn't pass any in
      this.location = {
        lat: this.settings ? this.settings.defLat : 0,
        lng: this.settings ? this.settings.defLng : 0,
        address: ''
      }
    }

    // BUG: duplicate of locationFrmGrp creation in EntryComponent.ts
    // new values here bubble up as emitted events - see onNewLocation()
    // this.locationFrmGrp = this._formBuilder.group({
    //   lat: [this.location.lat],
    //   lng: [this.location.lng],
    //   address: [this.location.address, Validators.required]
    // })

    // showNewLocation ALSO updates location.address & emits new location event to parent
    this.newLocationToFormAndEmit(this.location.lat, this.location.lng)



    //!Following also done in constructor: only need 1!
    //this.newLocationToFormAndEmit(this.settings.defLat, this.settings.defLng)
    //this.onNewLocation(this.location) // Emit new location event to parent

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


    //let keyup$ = Observable.fromEvent(this.elLatI.nativeElement, 'keyup')

    // On Location/Address Change subscriptions  // TODO: USE THESE - or not???
    if (this.locationFrmGrp) {
      this.locationFrmGrp.get("latI")?.valueChanges.pipe(debounceTime(700)).subscribe(x => {
        this.log.info('########  latitude int value changed: ' + x, this.id)
      })
      let latf = this.locationFrmGrp.get("latF")
      if (latf) {
        this.locationFrmGrp.get("latF")?.valueChanges.pipe(debounceTime(700)).subscribe(x => {
          this.log.info('########## lat float value changed: ' + x, this.id)
        })
        this.log.warn('########## lat float value WAS FOUND!!!!', this.id)
      }
      else {
        this.log.error('########## lat float value NOT FOUND!!!!', this.id)
      }
      this.locationFrmGrp.get("lngI")?.valueChanges.pipe(debounceTime(700)).subscribe(x => {
        this.log.info('#######  lng Int value changed: ' + x), this.id
      })
      this.locationFrmGrp.get("lngF")?.valueChanges.pipe(debounceTime(700)).subscribe(x => {
        this.log.info('#######  lng Float value changed: ' + x), this.id
      })

      // TODO: NOt working yet...
      //this.log.excessive(`addressCtrl.valueChanges`, this.id)
      // TODO: No formControlName="addressCtrl"!!!!
      // Error: Uncaught (in promise): TypeError: Cannot read properties of null (reading 'valueChanges')  TypeError: Cannot read properties of null (reading 'valueChanges')
      //this.locationFrmGrp.get('address')!.valueChanges.pipe(debounceTime(700)).subscribe(newAddr => this.addressCtrlChanged2(newAddr))
    } else {
      // ! ***************************** next line getting hit!
      this.log.error(`locationFrmGrp not available yet in ngOnInit`, this.id)
    }

    this.log.verbose("out of ngOnInit", this.id)
  }

  // See Ang Cookbook, pg 349ff
  onMouseEnter() {
    // TODO: establish events & control updates?
  }

  onMouseLeave() {
    // TODO: tear down events & control updates?
  }

  /**
   * Update form with new address
   * ALSO updates location.address
   * also emits new location to notify others
   *
   * @param latDD
   * @param lngDD
   */
  public newLocationToFormAndEmit(latDD: number, lngDD: number) {
    // todo: need to repeatedly update this.locationFrmGrp - keep in sync w/ vals?
    // https://www.cumulations.com/blog/latitude-and-longitude/

    // Any location change should drive to a new latDD & LngDD & sent here
    this.log.info(`new DD Location: ${latDD}° lat; ${lngDD}° lng`, this.id);

    this.location.lat = latDD
    this.location.lng = lngDD

    this.latI = Math.floor(latDD)
    //this.latF = (latDD - this.latI).toFixed(4)
    this.latF = Math.round((latDD - this.latI) * 10000)
    // {{latI}} shows [object HTMLInputElement]
    //this.elLatI.innerText = this.latI.toString()  // BUG: .value fails or
    //     Uncaught (in promise): TypeError: Cannot set properties of undefined (setting 'innerText')
    // TypeError: Cannot set properties of undefined (setting 'innerText')
    //     at LocationComponent.newLocation (location.component.ts:237:5)

    this.lngI = Math.floor(lngDD)
    this.lngF = Math.round((lngDD - this.lngI) * 10000)

    // this.setCtrl("enter__Where-LatI", this.latI)
    // this.setCtrl("enter__Where-LatD", this.latF)
    // this.setCtrl("enter__Where-LngI", this.lngI)
    // this.setCtrl("enter__Where-LngD", this.lngF)

    let latDMS = DDToDMS(latDD)
    this.latQ = latDMS.dir
    this.latD = latDMS.deg
    this.latM = latDMS.min
    this.latS = latDMS.sec
    // this.setCtrl("latitudeQ", latDMS.dir)
    // this.setCtrl("latitudeD", latDMS.deg)
    // this.setCtrl("latitudeM", latDMS.min)
    // this.setCtrl("latitudeS", latDMS.sec)

    let lngDMS = DDToDMS(lngDD, true)
    this.log.excessive(`new DMS Location: ${latDMS.dir} ${latDMS.deg}° ${latDMS.min}' ${latDMS.sec}" lat; ${lngDMS.dir} ${lngDMS.deg}° ${lngDMS.min}' ${lngDMS.sec}" lng`, this.id);
    this.lngQ = lngDMS.dir
    this.lngD = lngDMS.deg
    this.lngM = lngDMS.min
    this.lngS = lngDMS.sec
    // this.setCtrl("longitudeQ", lngDMS.dir)
    // this.setCtrl("longitudeD", lngDMS.deg)
    // this.setCtrl("longitudeM", lngDMS.min)
    // this.setCtrl("longitudeS", lngDMS.sec)

    let latDDM = DDToDDM(latDD)
    this.latDDMQ = latDDM.dir
    this.latDDMD = latDDM.deg
    this.latDDMM = latDDM.min

    let lngDDM = DDToDDM(lngDD, true)
    this.log.excessive(`new DDM Location: ${latDDM.dir} ${latDDM.deg}° ${latDDM.min}' lat; ${lngDDM.dir} ${lngDDM.deg}° ${lngDDM.min}' lng`, this.id);
    this.lngDDMQ = lngDDM.dir
    this.lngDDMD = lngDDM.deg
    this.lngDDMM = lngDDM.min


    // TODO: this.location.address =""
    /*
        let pCode = OpenLocationCode.encode(latDD, lngDD, 11); // OpenLocationCode.encode using default accuracy returns an INVALID +Code!!!
        this.log.verbose("updateCoords: Encode returned PlusCode: " + pCode, this.id)
        let fullCode
        if (pCode.length != 0) {
          if (OpenLocationCode.isValid(pCode)) {
            if (OpenLocationCode.isShort(pCode)) {
              // Recover the full code from a short code:
              fullCode = OpenLocationCode.recoverNearest(pCode, this.settings.defLat, this.settings.defLng)
            } else {
              fullCode = pCode;
              this.log.verbose("Shorten +Codes, Global:" + fullCode + ", Lat:" + this.settings.defLat + "; lng:" + this.settings.defLng), this.id;
              // Attempt to trim the first characters from a code; may return same innerText...
              pCode = OpenLocationCode.shorten(fullCode, this.settings.defLat, this.settings.defLng)
            }
            this.log.verbose("New PlusCodes: " + pCode + "; Global: " + fullCode, this.id);
            //(document.getElementById("addresses") as HTMLInputElement).value = pCode;
            //document.getElementById("addressLabel").innerHTML = defPCodeLabel; // as HTMLLabelElement
            (document.getElementById("pCodeGlobal") as HTMLLabelElement).innerHTML = " &nbsp;&nbsp; +Code: " + fullCode;
          } else {
            this.log.verbose("Invalid +PlusCode: " + pCode, this.id);
            document.getElementById("pCodeGlobal")!.innerHTML = " &nbsp;&nbsp; Unable to get +Code"
            //document.getElementById("addressLabel").innerHTML = "  is <strong style='color: darkorange;'>Invalid </strong> Try: "; // as HTMLLabelElement
          }
    */
    this.emitNewLocation(this.location) // Emit new location event to parent
  }

  /**
   * onNewLocation:
   * @param newLocation
   *
   */
  public emitNewLocation(newLocation: LocationType) { // Or LocationEvent?!
    // Do any needed sanity/validation here
    // Based on listing 8.8 in TS dev w/ TS, pg 188
    this.log.verbose(`Emitting new Location ${JSON.stringify(newLocation)}`, this.id)

    this.newLocationEvent.emit(this.location)
    /*if (! {
      this.log.warn(`New location event had no listeners!`, this.id)
    }*/
  }


  // public setCtrl(ctrlName: HTMLElement, value: number | string) {
  //   this.log.excessive(`setCtrl(${ctrlName} to ${value})`, this.id)
  //   // let ctrl = this.document.getElementById(ctrlName) as HTMLInputElement
  //   // if (!ctrl) {
  //   //   this.log.warn(`setCtrl(): Could not find element: ${ctrlName}`, this.id)
  //   // } else {
  //     ctrlName.value = value.toString()
  //     //this.log.excessive(`setCtrl(): set ${ctrlName} to ${value}: ${ctrl.value}`, this.id)
  //  // }
  // }


  // TODO: https://github.com/angular-material-extensions/google-maps-autocomplete
  public addressCtrlChanged(what: string) {
    this.log.verbose(`addressCtrlChanged`, this.id)
    // TODO: No formControlName="addressCtrl"!!!!

    // this.form.markAsPristine();
    // this.form.markAsUntouched();
    // if (this.locationFrmGrp.get('address')?.touched) {
    //   this.log.excessive('address WAS touched', this.id)
    //   //this.locationFrmGrp.get('address')?.markAsUntouched
    // }
    // if (this.locationFrmGrp.get('address')?.dirty) {
    //   this.log.excessive('address WAS dirty', this.id)
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

        let llat = Number((this.document.getElementById("enter__Where-LatI") as HTMLInputElement).value)
          + Number((this.document.getElementById("enter__Where-LatD") as HTMLInputElement).value) / 100
        let llng = Number((this.document.getElementById("enter__Where-LngI") as HTMLInputElement).value)
          + Number((this.document.getElementById("enter__Where-LngI") as HTMLInputElement).value) / 100
        let ll = new google.maps.LatLng(llat, llng) // Move from Google to Leaflet!
        let newAddress = this.geocoder.getAddressFromLatLng(ll)  // TODO: Disable!!
        this.log.verbose(`addressCtrlChanged new latlng: ${JSON.stringify(ll)}; addr: ${newAddress}`, this.id)

        this.newLocationToFormAndEmit(llat, llng)

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
        this.log.error(`UNEXPECTED ${what} received in AddressCtrlChanged()`, this.id)
        break;
    }
    this.log.verbose('addressCtrlChanged done', this.id) // TODO: No formControlName="addressCtrl"!!!!
  }


  public chkAddresses() {
    this.log.verbose("LocationComponent - chkAddresses", this.id)

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
    this.log.verbose(`Looking into address: ${addr}`, this.id)
    if (addr == null)
      return
    //debugger
    let addrText = addr.value;
    this.log.verbose(`Got some kind of address: ${addrText}`, this.id)
    if (addrText.length) {
      if (addrText.includes("+")) {
        this.log.verbose("Got PCode: " + addrText, this.id)
        this.chkPCodes(addrText)
      } else {
        tWords = addrText.split(".")
        if (tWords.length == 3) {
          this.log.verbose("Got What 3 Words: " + addrText, this.id)
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
    this.log.verbose("newMarker()", this.id)

    let addr = this.document.getElementById("derivedAddress")
    // ERROR: if (addr) { addr.innerHTML = "New What3Words goes here!" } // TODO: move to another routine...
    //this.document.getElementById("enter__Where-Address-upshot").value = this.location.address


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
  // this.document.getElementById("enter__Where-Lat")?.onchange

  // https://angular.io/api/forms/AbstractControl
  // https://angular.io/api/forms/NgControlStatus ARE CSS Classes.
  // https://angular.io/api/forms
  // https://www.danvega.dev/blog/2017/06/07/angular-forms-clear-input-field/

  /*
  https://www.tektutorialshub.com/angular/valuechanges-in-angular-forms/

  this.reactiveForm.get("firstname").valueChanges.subscribe(selectedValue => {
  this.log.verbose('firstname value changed', this.id)
  this.log.verbose(selectedValue, this.id)
  this.log.excessive(this.reactiveForm.get("firstname").value, this.id)
  this.log.excessive(this.reactiveForm.value, this.id)    //shows the old first name

  setTimeout(() => {
    this.log.excessive(this.reactiveForm.value, this.id)   //shows the latest first name
  }, 1000)

  For Example, the following code will result in the ValueChanges of the firstname. but not of its parent (i.e. top-level form)

  this.reactiveForm.get("firstname").setValue("", { onlySelf: true });

  You can use the onlySelf: true with the setValue, patchValue, markAsUntouched, markAsDirty, markAsPristine, markAsPending, disable, enable, and updateValueAndValidity methods
  })
  */



  // https://developer.what3words.com/tutorial/detecting-if-text-is-in-the-format-of-a-3-word-address
  public chk3Words(tWords: string) {
    this.log.verbose("chk3Words", this.id)
    /*let settings = {
      "async": true,
      "crossDomain": true,
      "url": "https://api.what3words.com/v3/autosuggest?key=0M5I8UPF&input=index.home.r&n-results=5&focus=51.521251%2C-0.203586&clip-to-country=BE%2CGB",
      "method": "GET",
      "headers": {}
    }

    $.ajax(settings).done(function (response) {
      this.log.excessive("ddd=" +response, this.id);
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
    this.log.verbose('chk3Words - ' + tWords, this.id);
    if (tWords.length) {
      // soemthing entered...
      this.log.verbose("3Words='" + tWords + "'", this.id);
      //this.w3w.w3wAuto(tWords)
      /* BUG:
          this.w3w.w3wAuto.autosuggest(tWords, {
            nFocusResults: 1,
            //clipTo####: ["US"],
            cliptoboundingbox: { south_lat, west_lng, north_lat, east_lng }, // Clip prevents ANY values outside region
            focus: { lat: this.settings.defLat, lng: this.settings.deflng }, // Focus prioritizes words closer to this point
            nResults: 1
          })
            .then((response: { suggestions: { words: any }[] }) => {
              const verifiedWords = response.suggestions[0].words;
              this.log.verbose("Verified Words='" + verifiedWords + "'", this.id);
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
      this.log.info("Unable to verify 3 words entered: " + errMsg, this.id);
      document.getElementById("addressLabel")!.textContent = "*** Not able to verify 3 words! ***"; // as HTMLLabelElement
      //})
    }
    // async call not returned yet
  }


  public chkPCodes(pCode: string) {
    // REVIEW: Duplicate of code above...
    //let pCode = document.getElementById("addresses")!.innerText //value;
    this.log.verbose("chkPCodes got '" + pCode + "'", this.id);
    if (pCode.length) {
      let result = this.geocoder.getLatLngAndAddressFromPlaceID(pCode)
      this.log.verbose(`chkPCode of ${pCode} got result:${JSON.stringify(result)}`, this.id);

      if (result.position) {
        //    (document.getElementById("addressLabel") as HTMLLabelElement).innerText = result.address;
        (document.getElementById("enter__Where-Lat") as HTMLInputElement).value = "result.position.lat";
        // BUG: position has type of never????!!!!
        (document.getElementById("lng") as HTMLInputElement).value = "JSON.stringify(result.position)";
      }
      else {
        this.log.warn(`chkPCode of ${pCode} got NULL result!!!`, this.id);
      }

      if (!this.settings) {
        this.log.error(`this.settings was null in chkPCodes`, this.id)
        return
      }

      if (OpenLocationCode.isValid(pCode)) {
        if (OpenLocationCode.isShort(pCode)) {
          pCode = OpenLocationCode.recoverNearest(pCode, this.settings.defLat, this.settings.defLng)
        }

        // Following needs a full (Global) code
        let coord = OpenLocationCode.decode(pCode)
        this.log.verbose("chkPCodes got " + pCode + "; returned: lat=" + coord.latitudeCenter + ', lng=' + coord.longitudeCenter, this.id);

        this.newLocationToFormAndEmit(coord.latitudeCenter, coord.longitudeCenter)
      }

      else {
        //    document.getElementById("addressLabel")!.innerHTML = " is <strong style='color: darkorange;'>Invalid </strong> Try: " + this.settings.defPlusCode
        //document.getElementById("pCodeGlobal")!.innerHTML = this.settings.defPlusCode
      }
    }
  }

  public chkStreetAddress(addrText: string) {
    //https://developers.google.com/maps/documentation/geocoding/requests-geocoding
    this.log.verbose("Got street address to check: " + addrText, this.id)
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
    this.log.verbose("onInfoWhere", this.id)
    let s = "for Enter the latittude either in degrees decmal or as Degrees Minutes & Seconds"
  }

  ngOnDestroy() {
    this.settingsSubscription.unsubscribe()
  }
  // #endregion Public Methods (11)
}
