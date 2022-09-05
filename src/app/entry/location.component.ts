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

import {
    CodeArea, DDMToDD, DDToDDM, DDToDMS, DMSToDD, GoogleGeocode, OpenLocationCode
} from '../shared/'
//import { MatIconRegistry } from '@angular/material/icon';
import {
    LocationType, LogService, SettingsService, SettingsType, undefinedAddressFlag, undefinedLocation
} from '../shared/services'

/*
https://stackoverflow.com/questions/43270564/dividing-a-form-into-multiple-components-with-validation
https://www.digitalocean.com/community/tutorials/how-to-build-nested-model-driven-forms-in-angular-2
https://stackblitz.com/edit/angular-azzmhu?file=src/app/hello.component.ts
*/





/*

log.service.ts:81 417: Location Component: locationFormModel value changed: {"DD":{"latI":47,"latF":4440,"lngI":-122,"lngF":-5550},"DMS":{"latQ":"N","latD":47,"latM":26,"latS":38.4,"lngQ":"W","lngD":122,"lngM":33,"lngS":18},"DDM":{"latDDMQ":"N","latDDMD":47,"latDDMM":2664,"lngDDMQ":"W","lngDDMD":122,"lngDDMM":3330},"address":"123 Elm St."}
log.service.ts:81 418: Location Component: new Location recieved: {"lat":47.444,"lng":-122.555,"address":"10506 sw 132nd pl, vashon, wa, 98070","derivedFromAddress":false}
log.service.ts:71 419: Location Component: new DMS Location: N 47° 26' 38.4" lat; W 122° 33' 18" lng
log.service.ts:71 420: Location Component: new DDM Location: N 47° 2664' lat; W 122° 3330' lng
log.service.ts:77 421: Location Component: Emitting new Location {"lat":47.444,"lng":-122.555,"address":"10506 sw 132nd pl, vashon, wa, 98070","derivedFromAddress":false}
log.service.ts:81 422: Location Component: locationFormModel value changed: {"DD":{"latI":47,"latF":4440,"lngI":-122,"lngF":-5550},"DMS":{"latQ":"N","latD":47,"latM":26,"latS":38.4,"lngQ":"W","lngD":122,"lngM":33,"lngS":18},"DDM":{"latDDMQ":"N","latDDMD":47,"latDDMM":2664,"lngDDMQ":"W","lngDDMD":122,"lngDDMM":3330},"address":"123 Elm St."}
log.service.ts:81 423: Location Component: new Location recieved: {"lat":47.444,"lng":-122.555,"address":"10506 sw 132nd pl, vashon, wa, 98070","derivedFromAddress":false}
log.service.ts:71 424: Location Component: new DMS Location: N 47° 26' 38.4" lat; W 122° 33' 18" lng
log.service.ts:71 425: Location Component: new DDM Location: N 47° 2664' lat; W 122° 3330' lng
log.service.ts:77 426: Location Component: Emitting new Location {"lat":47.444,"lng":-122.555,"address":"10506 sw 132nd pl, vashon, wa, 98070","derivedFromAddress":false}
*/


@Component({
  //moduleId: module.id,
  selector: 'rangertrak-location',
  templateUrl: './location.component.html',
  styleUrls: ['./location.component.scss']
})
export class LocationComponent implements OnInit, AfterViewInit, OnDestroy {


  // Use setter to get immediate notification of changes to inputs (pg 182 & 188)
  @Input() set location(location: LocationType) {
    // are object's contents equal: _.isEqual( obj1 , obj2 ) OR JSON.stringify(obj1) === JSON.stringify(obj2)
    if (JSON.stringify(location) === JSON.stringify(undefinedLocation)) {
      this.log.error("Got new location, but it still was 'undefined'", this.id)
    } else {
      this.log.error(`YEAH: Got new location: ${JSON.stringify(location)}`, this.id)

      // REVIEW: Initially called BEFORE ngOnInit()!!!

      // Populate form with initial (& Subsequent updates) from parent.
      // Also reemit address changes which ultimately can get picked up by other (peer) children.
      this.newLocationToFormAndEmit(location)
    }
  }
  @Input() set initialLocationParent(loc: LocationType) {
    this.log.error(`Got new location PARENT: ${JSON.stringify(loc)} - but IGNORING`, this.id)

    //! TODO
    // Gets called twice: during Location Component: Construction (wirth "lat":49,"lng":-110,"address":"Vashonville")&

    // then get 'proper' call above (YEAH: Got new location) with "lat":47.43,"lng":-122.4627,"address":"NO_LOCATION_SET_YET"

    // just after Leaflet miniMap initMap() - & just before location ngOnInit
    // & a 3rd: "lat":47.441,"lng":-122.551,"address":"10506 sw 132nd pl, Apt C, vashon Villas, wa, 98070"

  }

  @Input() locationLabel = "Home Sweet Home"
  //public locationLabel = "label man"
  /*
  @Input() set locationPickerLabel(label: string) {
    this.log.info(`Got new location LABEL: ${label}`, this.id)

    let myNewLabel = label
    //! TODO: Persist this!
  }*/

  // Using mediation pattern (pg 188), this child component emits following event to parent,
  // parent's template has: (newLocationEvent)="onNewLocationParent($event)"
  // Parent's onNewLocationParent($event) gets called.
  // Parent then passes the new location (via binding), to any children as needed
  @Output() locationChange = new EventEmitter<LocationType>()



  private id = "Location Component"
  public locationFormModel!: UntypedFormGroup

  public geocoder = new GoogleGeocode
  //w3w = new What3Words()




  // Cooordinates as Decimal Degrees (DD)
  public latI = 0 // Integer portion
  public latF = 0 // Float portion
  public lngI = 0
  public lngD = 0

  // Cooordinates as Degrees, Minutes & Seconds (DMS)
  public latQ = "N" // Quadrant
  public latD = 0 // Degrees
  public latM = 0 // Minutes
  public latS = 0 // Seconds
  public lngF = 0
  public lngM = 0
  public lngQ = "E"
  public lngS = 0

  // Cooordinates as Degrees & Decimal Minutes (DDM)
  public latDDMQ = "N" // Quadrant
  public latDDMD = 0 // Degrees
  public latDDMM = 0 // Minutes
  public lngDDMQ = "E" // Quadrant
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

  //private mouseEnters = 0
  //private mouseLeaves = 0

  private settingsSubscription!: Subscription
  private settings!: SettingsType

  private formUpdating = false


  constructor(
    private settingsService: SettingsService,
    private _formBuilder: UntypedFormBuilder,
    private log: LogService,
    @Inject(DOCUMENT) private document: Document) {
    this.log.info("Construction", this.id)

    this.initialLocationParent = {
      lat: 49,
      lng: -110,
      address: "Vashonville",
      derivedFromAddress: false
    }


    // https://angular.io/tutorial/toh-pt4#call-it-in-ngoninit states subscribes should happen in OnInit()
    // Settings only needed for Check PCode & What3Words...
    this.settingsSubscription = this.settingsService.getSettingsObserver().subscribe({
      next: (newSettings) => {
        this.settings = newSettings
        this.log.excessive('Received new Settings via subscription.', this.id)
      },
      error: (e) => this.log.error('Settings Subscription got:' + e, this.id),
      complete: () => this.log.info('Settings Subscription complete', this.id)
    })

    this.initForm() // creates blank locationFormModel

    this.log.verbose("Out of constructor", this.id)
  }

  // Initialize data or fetch external data from services or API (https://geeksarray.com/blog/angular-component-lifecycle)
  public ngOnInit(): void {
    this.log.info("ngOnInit", this.id)

    // On Location/Address Change subscriptions  // TODO: USE THESE - or not???
    // https://material.angular.io/components/autocomplete/examples#autocomplete-overview; also Ang Dev with TS, pg 140ff; Must be in OnInit, once component properties initialized
    if (this.locationFormModel) {
      //this.locationFormModel.get("latI")?.valueChanges.pipe(debounceTime(700)).subscribe(x => {
      this.locationFormModel.valueChanges.pipe(debounceTime(800)).subscribe(x => {
        //this.log.info(`locationFormModel value changed: ${JSON.stringify(x)}`, this.id)
        if (!this.formUpdating) {
          // REVIEW: If we're updating form, ignore any updates (or unsubscribe temporarily - but HOW?!)
          this.valueChanges(x)
        }

      })
      ///   let latf = this.locationFrmGrp.get("latF")
      ///   if (latf) {
      ///     this.locationFrmGrp.get("latF")?.valueChanges.pipe(debounceTime(700)).subscribe(x => {
      ///       this.log.info('########## lat float value changed: ' + x, this.id)
      ///     })
      ///     this.log.warn('########## lat float value WAS FOUND!!!!', this.id)
      ///   }
      ///   else {
      ///     this.log.error('########## lat float value NOT FOUND!!!!', this.id)
      ///   }
      ///   this.locationFrmGrp.get("lngI")?.valueChanges.pipe(debounceTime(700)).subscribe(x => {
      ///     this.log.info('#######  lng Int value changed: ' + x), this.id
      ///   })
      ///   this.locationFrmGrp.get("lngF")?.valueChanges.pipe(debounceTime(700)).subscribe(x => {
      ///     this.log.info('#######  lng Float value changed: ' + x), this.id
    }


    //this.locationFrmGrp.get('address')!.valueChanges.pipe(debounceTime(700)).subscribe(newAddr => this.addressCtrlChanged2(newAddr))

    this.log.verbose("out of ngOnInit", this.id)
  }

  /**
     * Called once all HTML elements have been created
     */
  ngAfterViewInit() {

  }

  /**
  * Create Form Model, so we can readily set values & respond to user input
  * NOTE: We never have an OnSubmit() routine...
  *
   */
  initForm() {
    this.locationFormModel = this._formBuilder.group({
      DD: this._formBuilder.group({
        latI: [0], // Integer portion
        latF: [0], // Float portion
        lngI: [0],
        lngF: [0]
      }),

      // Cooordinates as Degrees, Minutes & Seconds (DMS)
      DMS: this._formBuilder.group({
        latQ: ["N"], // Quadrant
        latD: [0], // Degrees
        latM: [0], // Minutes
        latS: [0], // Seconds
        lngQ: ["E"],
        lngD: [0],
        lngM: [0],
        lngS: [0]
      }),

      // Cooordinates as Degrees & Decimal Minutes (DDM)
      DDM: this._formBuilder.group({
        latDDMQ: ["N"], // Quadrant
        latDDMD: [0], // Degrees
        latDDMM: [0], // Minutes
        lngDDMQ: ["E"],
        lngDDMD: [0],
        lngDDMM: [0]
      }),

      address: [''] //, Validators.required],
    })


    /*
    https://material.angular.io/components/autocomplete/examples#autocomplete-overview; also Ang Dev with TS, pg 140ff; Must be in OnInit, once component properties initialized
    this.locationFrmGrp.valueChanges.pipe(debounceTime(500)).subscribe(locationFrmGrp => this.locationChanged_noLongerNeeded(locationFrmGrp))
    let addr = this.locationFrmGrp.get("address")
    if (addr) {
      addr.valueChanges.pipe(debounceTime(500)).subscribe(locationFrmGrp => this.locationChanged_noLongerNeeded(locationFrmGrp))
      this.log.verbose("Made reservations!", this.id)
    } else {
      console.warn("could NOT Make reservations")
    }
    this.locationFrmGrp.valueChanges.pipe(debounceTime(500)).subscribe(locationFrmGrp => this.locationChanged_noLongerNeeded(locationFrmGrp))
    return this.locationFrmGrp
    */
  }

  //! Unimplemented!
  DDToAddress(lat: number, lng: number) {
    this.log.error("DDToAddress returning Uninplemented Address", this.id)
    return "DDToAddress returning Uninplemented Address"
  }


  // https://angular.io/guide/template-reference-variables
  onDdChg(latI = 0, latF = 0, lngI = 0, lngF = 0) {
    this.log.info(`DD value changed: ${latI}.${latF}°, ${lngI}.${lngF}°`, this.id)

    let latLng = {
      lat: latI + latF / 100,
      lng: lngI + lngF / 100
    }

    let derivedAddress = this.DDToAddress(latLng.lat, latLng.lng)

    let enteredLocation = {
      lat: latLng.lat,
      lng: latLng.lng,
      address: derivedAddress,
      derivedFromAddress: false
    }

    this.newLocationToFormAndEmit(enteredLocation)
  }

  onDmsChg(latQ = "n", latD = 0, latM = 0, latS = 0, lngQ = "e", lngD = 0, lngM = 0, lngS = 0) {
    this.log.info(`DMS value changed`, this.id)

    let latLng = {
      lat: DMSToDD(latQ, latD, latM, latS)!,
      lng: DMSToDD(lngQ, lngD, lngM, lngS)!
    }
    let derivedAddress = this.DDToAddress(latLng.lat, latLng.lng)

    let enteredLocation = {
      lat: latLng.lat,
      lng: latLng.lng,
      address: derivedAddress,
      derivedFromAddress: false
    }

    this.newLocationToFormAndEmit(enteredLocation)
  }


  onDdmChg(latDDMQ: string, latDDMD: number, latDDMM: number, lngDDMQ: string, lngDDMD: number, lngDDMM: number) {


    let latLng = {
      lat: DDMToDD(<string>latDDMQ, latDDMD, latDDMM)!,
      lng: DDMToDD(<string>lngDDMQ, lngDDMD, lngDDMM)!
    }

    let derivedAddress = this.DDToAddress(latLng.lat, latLng.lng)

    let enteredLocation = {
      lat: latLng.lat,
      lng: latLng.lng,
      address: "10506 sw 132nd pl, vashon, wa, 98070",
      derivedFromAddress: false
    }

    this.newLocationToFormAndEmit(enteredLocation)
  }

  onAddressChg(newAddress: string) {
    this.log.info(`onAddressChg got newAddress: ${JSON.stringify(newAddress)}`, this.id)
    let googleGeocode = new GoogleGeocode
    let myTuple = googleGeocode.isValidAddress(newAddress)
    // { position: null, address: err, partial_match: "", placeId: "", plus_code: "" }

    if (myTuple.position) {
      let pos = myTuple.position
      let enteredLocation = {
        //! BUG: how to extract lat/lng from pos?????; use PROMISE
        lat: -25,
        lng: 125,
        address: newAddress,
        derivedFromAddress: true
      }

      this.newLocationToFormAndEmit(enteredLocation)
    }
  }

  formSubscribe_unused() {
    this.locationFormModel.valueChanges.pipe(debounceTime(2000)).subscribe(x => {
      //this.log.info(`locationFormModel value changed: ${JSON.stringify(x)}`, this.id)
      if (!this.formUpdating) {
        // REVIEW: If we're updating form, ignore any updates (or unsubscribe temporarily - but HOW?!)
        this.valueChanges(x)
      }
    })
  }

  formUnsubscribe() {

    // this.locationFormModel.valueChanges = null
  }

  /**
   * Gets called on any changes to Location Component fields
   * Need to figure out what changed, and if the change makes a 'sensible' address:
   * If so, update via event any subscribers: (i.e., the parent compoennt & map)
   */
  /* Gets: {
    "DD":{"latI":40,"latF":0,"lngI":0,"lngF":0},
    "DMS":{"latQ":"N","latD":0,"latM":0,"latS":0,"lngQ":"E","lngD":0,"lngM":0,"lngS":0},
    "DDM":{"latDDMQ":"N","latDDMD":0,"latDDMM":0,"lngDDMQ":"E","lngDDMD":0,"lngDDMM":0},
    "address":""
  }
  */
  public valueChanges(e: any) {
    this.log.info(`locationFormModel value changed: ${JSON.stringify(e)}`, this.id)

    //let enteredLocation = undefinedLocation

    // Verify changes are 'done': make sense & are valid

    let enteredLocation = {
      lat: 47.444,
      lng: -122.555,
      address: "10506 sw 132nd pl, vashon, wa, 98070",
      derivedFromAddress: false
    }

    //
    this.newLocationToFormAndEmit(enteredLocation)
  }



  /**
   * Update form with new address
   * ALSO updates location.address
   * also emit new location to notify parent
   *
   * @param newLocation: LocationType
   */
  public newLocationToFormAndEmit(newLocation: LocationType) {
    // https://www.cumulations.com/blog/latitude-and-longitude/

    // Any location change should drive to a new latDD & LngDD & sent here
    if (newLocation == null) {
      this.log.error(`newLocationToFormAndEmit(): new Location recieved but null or undefined.`, this.id)
      return
    }
    this.log.info(`new Location recieved: ${JSON.stringify(newLocation)}`, this.id);
    this.formUpdating = true
    // REVIEW: If we're updating form, ignore any updates (or unsubscribe temporarily - but HOW?!)

    //!  this.location = newLocation
    // REVIEW: Should caller just do this & NOT bother passing as a parameter?
    // REVIEW: should we validate values or has that already been done?

    let latDD = newLocation.lat
    let lngDD = newLocation.lng
    let address = newLocation.address

    if (newLocation.derivedFromAddress) {
      // User entered an address: Try to come up with lat/long for it
      this.log.error(`Unimplemented logic: deriving lat/long from an address!!!!!!!`, this.id);

      // ! BUG: should be:
      //latDD = this.geocoder.getLatLngAndAddressFromPlaceID()
      //lngDD = newLocation.lng
    }

    this.latI = Math.trunc(latDD)

    //    this.locationFormModel.patchValue({
    //     latI: Math.floor(latDD)
    //  })


    //this.latF = (latDD - this.latI).toFixed(4)
    this.latF = Math.round((latDD - this.latI) * 10000)

    this.lngI = Math.trunc(lngDD)
    this.lngF = Math.round((lngDD - this.lngI) * 10000)

    let latDMS = DDToDMS(latDD)
    this.latQ = latDMS.dir
    this.latD = latDMS.deg
    this.latM = latDMS.min
    this.latS = latDMS.sec

    let lngDMS = DDToDMS(lngDD, true)
    this.log.excessive(`new DMS Location: ${latDMS.dir} ${latDMS.deg}° ${latDMS.min}' ${latDMS.sec}" lat; ${lngDMS.dir} ${lngDMS.deg}° ${lngDMS.min}' ${lngDMS.sec}" lng`, this.id);
    this.lngQ = lngDMS.dir
    this.lngD = lngDMS.deg
    this.lngM = lngDMS.min
    this.lngS = lngDMS.sec

    let latDDM = DDToDDM(latDD)
    this.latDDMQ = latDDM.dir
    this.latDDMD = latDDM.deg
    this.latDDMM = latDDM.min

    let lngDDM = DDToDDM(lngDD, true)
    this.log.excessive(`new DDM Location: ${latDDM.dir} ${latDDM.deg}° ${latDDM.min}' lat; ${lngDDM.dir} ${lngDDM.deg}° ${lngDDM.min}' lng`, this.id);
    this.lngDDMQ = lngDDM.dir
    this.lngDDMD = lngDDM.deg
    this.lngDDMM = lngDDM.min


    if (!newLocation.derivedFromAddress) {
      // TODO: User entered lat/long, so we need to come up with an approximate address
      // REVIEW: Should LocationType also store PCode/What3Words addresses?
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
    }

    this.locationFormModel.setValue({

      DD: {
        latI: this.latI,
        latF: this.latF,
        lngI: this.lngI,
        lngF: this.lngF,
      },

      DMS: {
        latQ: this.latQ,
        latD: this.latD,
        latM: this.latM,
        latS: this.latS,

        lngQ: this.lngQ,
        lngD: this.lngD,
        lngM: this.lngM,
        lngS: this.lngS,
      },

      DDM: {
        latDDMQ: this.latDDMQ,
        latDDMD: this.latDDMD,
        latDDMM: this.latDDMM,

        lngDDMQ: this.lngDDMQ,
        lngDDMD: this.lngDDMD,
        lngDDMM: this.lngDDMM,
      },
      address: "123 Elm St."
    })



    // Emit new location event to parent: so it & any children can react
    this.log.verbose(`Emitting new Location ${JSON.stringify(newLocation)}`, this.id)
    this.locationChange.emit(this.location)

    this.formUpdating = false // reenable subscription to location updates
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


  // // This is a floosy way to capture user input: get rid of it!
  // // See Ang Cookbook, pg 349ff
  // onMouseEnter() {
  //   if (!(this.mouseEnters++ % 10)) {
  //     this.log.verbose(`Mouse Entered Locationform ${this.mouseEnters} times`, this.id)
  //   }
  //   // TODO: establish events & control updates?
  // }
  // onMouseLeave() {
  //   if (!(this.mouseLeaves++ % 10)) {
  //     this.log.verbose(`Mouse Left Location form ${this.mouseLeaves} times`, this.id)
  //   }
  //   // TODO: tear down events & control updates?
  // }


  /*
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

          /  *
                  let addrLabel = this.document.getElementById("addressLabel") // as HTMLLabelElement
                  if (addrLabel) {
                    addrLabel.innerText = newAddress
                    //addrLabel.markAsPristine()
                    //addrLabel. .markAsUntouched()
                  }
                  *   /
          this.newMarker({ lat: llat, lng: llng }, `Time: ${Date.now} at Lat: ${llat}, Lng: ${llng}, street: ${newAddress}`)
          break;
        default:
          this.log.error(`UNEXPECTED ${what} received in AddressCtrlChanged()`, this.id)
          break;
      }
      this.log.verbose('addressCtrlChanged done', this.id) // TODO: No formControlName="addressCtrl"!!!!
    }
  */

  public chkAddresses() {
    this.log.verbose("chkAddresses()", this.id)

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

  // public newMarker(loc: google.maps.LatLngLiteral, title: string = "") {  // TODO: Remove google ref
  //   this.log.verbose("newMarker()", this.id)

  //   let addr = this.document.getElementById("derivedAddress")
  //   // ERROR: if (addr) { addr.innerHTML = "New What3Words goes here!" } // TODO: move to another routine...
  //   //this.document.getElementById("enter__Where-Address-upshot").value = this.location.address


  //   if (title == "") {
  //     title = `${Date.now} at lat ${loc.lat}, lng ${loc.lng}.`
  //   }

  //   //BUG: UPDATE MAP!  Need to emit 'new location'!

  //   console.error(`New Location ${loc} titled ${title}: Emit me to map`)
  //   // this.displayMarker(loc, title)
  // }



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
        //let newLocation: LocationType =
        this.newLocationToFormAndEmit({ lat: coord.latitudeCenter, lng: coord.longitudeCenter, address: "", derivedFromAddress: false })
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
  // public onInfoWhere() {
  //   this.log.verbose("onInfoWhere", this.id)
  //   let s = "for Enter the latittude either in degrees decmal or as Degrees Minutes & Seconds"
  // }

  ngOnDestroy() {
    this.settingsSubscription.unsubscribe()
  }
}
