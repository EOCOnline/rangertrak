import {
    BehaviorSubject, debounceTime, fromEvent, map, merge, Observable, Subscription, takeWhile
} from 'rxjs'

import { DOCUMENT } from '@angular/common'
import {
    AfterViewInit, Component, EventEmitter, Inject, Input, OnDestroy, OnInit, Output, ViewChild
} from '@angular/core'
import {
    FormArray, FormControl, FormGroup, UntypedFormBuilder, UntypedFormGroup, Validators
} from '@angular/forms'
// import * as P from '@popperjs/core';
///import { createPopper } from '@popperjs/core';
// import type { StrictModifiers } from '@popperjs/core';
import { faInfoCircle, faMapMarkedAlt } from '@fortawesome/free-solid-svg-icons'
import { mdiAccount, mdiInformationOutline } from '@mdi/js'

//import { MatIconRegistry } from '@angular/material/icon'
import {
    CodeArea, DDMToDD, DDToDDM, DDToDMS, DMSToDD, GoogleGeocode, OpenLocationCode
} from '../shared/'
import {
    LocationType, LogService, SettingsService, SettingsType, undefinedAddressFlag, undefinedLocation
} from '../shared/services'

/*
https://stackoverflow.com/questions/43270564/dividing-a-form-into-multiple-components-with-validation
https://www.digitalocean.com/community/tutorials/how-to-build-nested-model-driven-forms-in-angular-2
https://stackblitz.com/edit/angular-azzmhu?file=src/app/hello.component.ts
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
      this.log.warn(`Got new location: ${JSON.stringify(location)}`, this.id)

      // REVIEW: Initially called BEFORE ngOnInit()!!! : Do we need to store it?!

      // Populate form with initial (& Subsequent updates) from parent.
      // Also reemit address changes which ultimately can get picked up by other (peer) children.
      this.newLocationToFormAndEmit(location)
    }
  }

  // Using mediation pattern (pg 188), this child component emits following event to parent,
  // parent's template has: (newLocationEvent)="onNewLocationParent($event)"
  // Parent's onNewLocationParent($event) gets called.
  // Parent then passes the new location (via binding), to any children (e.g., mini-maps) as needed
  @Output() locationChange = new EventEmitter<LocationType>()

  private id = "Location Component"
  locationFormModel!: FormGroup
  // Untyped : https://angular.io/guide/update-to-latest-version#changes-and-deprecations-in-version-14 & https://github.com/angular/angular/pull/43834

  static geocoder: google.maps.Geocoder | null  //= new google.maps.Geocoder
  geocoder = new GoogleGeocode()
  //w3w = new What3Words()

  // Following provide access to controls in the template
  // Cooordinates as Decimal Degrees (DD)
  latI = 0 // Integer portion
  latF = 0 // Float portion
  lngI = 0
  lngD = 0

  // Cooordinates as Degrees, Minutes & Seconds (DMS)
  latQ = "N" // Quadrant
  latD = 0 // Degrees
  latM = 0 // Minutes
  latS = 0 // Seconds
  lngF = 0
  lngM = 0
  lngQ = "E"
  lngS = 0

  // Cooordinates as Degrees & Decimal Minutes (DDM)
  latDdmQ = "N" // Quadrant
  latDdmD = 0 // Degrees
  latDdmM = 0 // Minutes
  lngDdmQ = "E" // Quadrant
  lngDdmD = 0 // Degrees
  lngDdmM = 0 // Minutes


  //createPopper<StrictModifiers>(referenceElement, popperElement, options)
  // button: HTMLButtonElement | undefined
  //tooltip: HTMLHtmlElement | undefined
  //popperInstance: any //typeof P.createPopper | undefined

  faInfoCircle = faInfoCircle
  faMapMarkedAlt = faMapMarkedAlt
  mdiAccount: string = mdiAccount
  mdiInformationOutline: string = mdiInformationOutline

  //private mouseEnters = 0
  //private mouseLeaves = 0

  private settingsSubscription!: Subscription
  private settings!: SettingsType

  constructor(
    private settingsService: SettingsService,
    private _formBuilder: UntypedFormBuilder,
    private log: LogService,
    @Inject(DOCUMENT) private document: Document) {
    this.log.info("Construction", this.id)

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

    try {
      LocationComponent.geocoder = new google.maps.Geocoder
    } catch (error) {
      // probably offline?!
      LocationComponent.geocoder = null
      this.log.error("Address lookup requires Internet.", this.id)
      // User notified by funky address string
    }

    this.log.verbose("Out of constructor", this.id)
  }

  // Initialize data or fetch external data from services or API (https://geeksarray.com/blog/angular-component-lifecycle)
  ngOnInit(): void {
    this.log.info("ngOnInit", this.id)

    // Get notified when user enters various loction elements - & update the rest of the location

    // https://material.angular.io/components/autocomplete/examples#autocomplete-overview; also Ang Dev with TS, pg 140ff; Must be in OnInit, once component properties initialized
    if (this.locationFormModel) {


      /* Original ideas...NOT used
        this.locationFormModel.valueChanges.pipe(debounceTime(800)).subscribe(x => {
        //this.log.info(`locationFormModel value changed: ${JSON.stringify(x)}`, this.id)
          this.log.info(`locationFormModel NOT updating: process valueChanges()`, this.id)
          // REVIEW: If we're updating form, ignore any updates (or unsubscribe temporarily - but HOW?!)
          this.valueChanges(x)

        this.locationFrmGrp.get('address')!.valueChanges.pipe(debounceTime(700)).subscribe(newAddr => this.addressCtrlChanged2(newAddr))

        / *
        https://netbasal.com/angular-reactive-forms-tips-and-tricks-bb0c85400b58

        https://stackoverflow.com/questions/49861281/angular-reactive-forms-valuechanges-ui-changes-only


        Or use dirty: https://www.usefuldev.com/post/Angular%20Forms:%20how%20to%20get%20only%20the%20changed%20values

        Or can use !yourFormName.pristine to detect only UI changes

        yourControl.valueChanges.pipe(
          filter(() => yourControl.touched)).subscribe(() => {
            ....
          })

        https://stackoverflow.com/questions/58558831/angular-reactive-form-value-changes
        use rxjs and pipeable operators

      })

      Or subscribe to each element in the form...(verbose)
      let latf = this.locationFrmGrp.get("latF")
      if (latf) {
        latf.valueChanges.pipe(debounceTime(700)).subscribe(x => {
          this.log.info('########## lat float value changed: ' + x, this.id)
        })
        this.log.warn('########## lat float value WAS FOUND!!!!', this.id)
      }
      else {
        this.log.error('########## lat float value NOT FOUND!!!!', this.id)
      }

 */
      // https://stackoverflow.com/questions/70366847/angular-on-form-change-event
      // Capture user's location component changes, then call
      // subroutines to recalc/update the rest of the form & update parent & peers (i.e., mini-map)

      // https://www.tektutorialshub.com/angular/valuechanges-in-angular-forms/
      // Initial event is just for control change: NOT yet bubbled up to parent form!
      // DO setTimeout() to allow form to catch up.
      const alive: boolean = true // from original sample, but unused by us

      setTimeout(() => {
        //console.log(this.reactiveForm.value)
      }) // Pause to let parent form get the change event bubbled up from the control

      this.mergeForm(this.locationFormModel, '')
        .pipe(debounceTime(400))  // BUG: If too long, changes get skipped!
        .pipe(takeWhile((_) => alive))
        .subscribe((ctrl: any) => {
          this.log.verbose(`${ctrl.name} changed to: ${ctrl.value}`, this.id)

          switch (ctrl.name) {

            // Coordinates as Decimal Degrees (DD)
            case 'DD.latI':
            case 'DD.latF':
            case 'DD.lngI':
            case 'DD.lngF':
              {
                this.onDdChg()
                break
              }
            // Cooordinates as Degrees, Minutes & Seconds (DMS)
            case 'DMS.latQ':
            case 'DMS.latD':
            case 'DMS.latM':
            case 'DMS.latS':
            case 'DMS.lngQ':
            case 'DMS.lngD':
            case 'DMS.lngM':
            case 'DMS.lngS':
              {
                this.onDmsChg()
                break
              }
            // Cooordinates as Degrees & Decimal Minutes (DDM)
            case 'DDM.latDdmQ':
            case 'DDM.latDdmD':
            case 'DDM.latDdmM':
            case 'DDM.lngDdmQ':
            case 'DDM.lngDdmD':
            case 'DDM.lngDdmM':
              {
                this.onDdmChg()
                break
              }

            case 'address':
              {
                this.onAddressChg()
                break
              }

            default:
              this.log.error(`Unexpected form change: ${ctrl.name}`, this.id)
              break;
          }
        })
    }


    this.log.verbose("out of ngOnInit", this.id)
  }

  /**
    * Called once all HTML elements have been created
    */
  ngAfterViewInit() {

  }


  /**
  * Create Form Model, so we can readily set values & respond to user input
  * NOTE: We never have an OnSubmit() routine...instead subscribing to changes
  *
   */
  initForm() {
    this.locationFormModel = this._formBuilder.group({

      // Coordinates as Decimal Degrees (DD)
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
        latDdmQ: ["N"], // Quadrant
        latDdmD: [0], // Degrees
        latDdmM: [0], // Minutes
        lngDdmQ: ["E"],
        lngDdmD: [0],
        lngDdmM: [0]
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

  /**
   * Extract only form values that have changed...
   * from https://stackoverflow.com/questions/70366847/angular-on-form-change-event
   * @param form
   * @param prefix - unused, but allows adding a prefix to the control name
   * @returns {name: controlName, value: newValue}
   */
  mergeForm(form: FormGroup | FormArray, prefix: string): any {
    if (form instanceof FormArray) {
      // FormArray
      console.error(`prefix is: ${prefix}`, this.id)
      const formArray = form as FormArray;
      const arr = [];
      for (let i = 0; i < formArray.controls.length; i++) {
        const control = formArray.at(i);
        arr.push(
          control instanceof FormGroup
            ? this.mergeForm(control, prefix + i + '.')
            : control.valueChanges.pipe(
              map((value) => ({ name: prefix + i, value: value }))
            )
        );
      }
      return merge(...arr);
    }
    // FormGroup
    return merge(
      ...Object.keys(form.controls).map((controlName: string) => {
        const control = form.get(controlName);
        return control instanceof FormGroup || control instanceof FormArray
          ? this.mergeForm(control, prefix + controlName + '.')

          : control!.valueChanges.pipe(
            map((value) => ({ name: prefix + controlName, value: value }))
          );
      })
    );
  }


  // https://angular.io/guide/template-reference-variables
  onDdChg() {

    //if (!latI && !latF && !lngI && !lngF) {
    this.log.info(`Grab DD values from locationFormModel`, this.id)
    let latI = this.locationFormModel.get("DD.latI")?.value
    let latF = this.locationFormModel.get("DD.latF")?.value
    let lngI = this.locationFormModel.get("DD.lngI")?.value
    let lngF = this.locationFormModel.get("DD.lngF")?.value
    //}

    setTimeout(() => {
      //console.log(this.reactiveForm.value)
    }) // Pause to let parent form get the change event bubbled up from the control


    this.log.error(`new DD values: ${latI}.${latF}°, ${lngI}.${lngF}°`, this.id)
    // these are not updated (yet):
    // this.log.error(`new DD values: ${this.latI}.${this.latF}°, ${this.lngI}.${this.lngF}°`, this.id)

    let lat = parseFloat(latI + "." + latF)
    let lng = parseFloat(lngI + "." + lngF)


    //let derivedAddress = GoogleGeocode.getAddressFromLatLng(new google.maps.LatLng(lat, lng), this.UpdateAddress)
    //this.log.error(`got derived address: ${derivedAddress}`, this.id)
    let derivedAddress = this.DDToAddress(lat, lng)  // ! Haven't updated pCode/What3Words yet

    let enteredLocation = {
      lat: lat,
      lng: lng,
      address: derivedAddress,
      derivedFromAddress: false
    }
    this.log.info(`reset form with:${JSON.stringify(enteredLocation)}`, this.id)
    this.newLocationToFormAndEmit(enteredLocation)
  }


  onDmsChg() { //latQ = "n", latD = 0, latM = 0, latS = 0, lngQ = "e", lngD = 0, lngM = 0, lngS = 0) {

    //if (!latD && !latM && !lngD && !lngS && !lngM && !lngS) {
    this.log.info(`Grabbing DMSvalue changes from locationFormModel`, this.id)
    let latD = this.locationFormModel.get("DMS.latD")?.value
    let latM = this.locationFormModel.get("DMS.latM")?.value
    let latS = this.locationFormModel.get("DMS.latS")?.value
    let latQ = this.locationFormModel.get("DMS.latQ")?.value
    let lngD = this.locationFormModel.get("DMS.lngD")?.value
    let lngM = this.locationFormModel.get("DMS.lngM")?.value
    let lngS = this.locationFormModel.get("DMS.lngS")?.value
    let lngQ = this.locationFormModel.get("DMS.lngQ")?.value
    //}

    this.log.info(`DMS value changed:  ${latD}° ${latM}' ${latS}" ${latQ}, ${lngD}° ${lngM}' ${lngS}" ${lngQ}`, this.id)

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


  onDdmChg() { //latDdmQ: string = 'n', latDdmD: number = 0, latDdmM: number = 0, lngDdmQ: string = 'w', lngDdmD: number = 0, lngDdmM: number = 0) {

    //if (!latDdmD && !latDdmM && !lngDdmD && !lngDdmM) {
    this.log.info(`Grabbing DMSvalue changes from locationFormModel`, this.id)
    let latDdmD = this.locationFormModel.get("DMS.latDdmD")?.value
    let latDdmM = this.locationFormModel.get("DMS.latDdmM")?.value
    let latDdmQ = this.locationFormModel.get("DMS.latDdmQ")?.value
    let lngDdmD = this.locationFormModel.get("DMS.lngDdmD")?.value
    let lngDdmM = this.locationFormModel.get("DMS.lngDdmM")?.value
    let lngDdmQ = this.locationFormModel.get("DMS.lngDdmQ")?.value
    //}

    this.log.info(`DMS value changed:  ${latDdmD}° ${latDdmM}' ${latDdmQ}, ${lngDdmD}° ${lngDdmM}' ${lngDdmQ}`, this.id)

    let latLng = {
      lat: DDMToDD(<string>latDdmQ, latDdmD, latDdmM)!,
      lng: DDMToDD(<string>lngDdmQ, lngDdmD, lngDdmM)!
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


  /**
   * Update form & model with new address
   * also emit new location to notify parent
   *! NOTE: gets called before ngOnInit, during parent's construction
   *
   * @param newLocation: LocationType
   */
  newLocationToFormAndEmit(newLocation: LocationType) {

    // Any location change should drive to a new latDD & LngDD & sent here
    if (newLocation == null) {
      this.log.error(`newLocationToFormAndEmit(): new Location recieved but null or undefined.`, this.id)
      return
    }
    this.log.info(`newLocationToFormAndEmit() new Location recieved: ${JSON.stringify(newLocation)}`, this.id);

    //!  this.location = newLocation
    // REVIEW: Should caller just do this & NOT bother passing as a parameter?
    // REVIEW: should we validate values or has that already been done?

    let latDD = newLocation.lat
    let lngDD = newLocation.lng
    let address = newLocation.address


    this.latI = Math.trunc(latDD)

    //    this.locationFormModel.patchValue({
    //     latI: Math.floor(latDD)
    //  })

    //this.latF = (latDD - this.latI).toFixed(4)
    this.latF = Math.abs(Math.round((latDD - this.latI) * 10000))

    this.lngI = Math.trunc(lngDD)
    this.lngF = Math.abs(Math.round((lngDD - this.lngI) * 10000))

    let latDMS = DDToDMS(latDD)
    this.latQ = latDMS.dir
    this.latD = latDMS.deg
    this.latM = latDMS.min
    this.latS = latDMS.sec

    let lngDMS = DDToDMS(lngDD, true)
    this.lngQ = lngDMS.dir
    this.lngD = lngDMS.deg
    this.lngM = lngDMS.min
    this.lngS = lngDMS.sec

    this.log.excessive(`new DMS Location: ${latDMS.dir} ${latDMS.deg}° ${latDMS.min}' ${latDMS.sec}" lat; ${lngDMS.dir} ${lngDMS.deg}° ${lngDMS.min}' ${lngDMS.sec}" lng`, this.id);

    let latDDM = DDToDDM(latDD)
    this.latDdmQ = latDDM.dir
    this.latDdmD = latDDM.deg
    this.latDdmM = latDDM.min / 100

    let lngDDM = DDToDDM(lngDD, true)
    this.lngDdmQ = lngDDM.dir
    this.lngDdmD = lngDDM.deg
    this.lngDdmM = lngDDM.min / 100

    this.log.excessive(`new DDM Location: ${latDDM.dir} ${latDDM.deg}° ${latDDM.min}' lat; ${lngDDM.dir} ${lngDDM.deg}° ${lngDDM.min}' lng`, this.id)

    // Above sets control values (but display doesn't change),
    // below sets model values (which does update the display).
    // REVIEW: Why aren't they automatically in sync with eachother?!
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
        latDdmQ: this.latDdmQ,
        latDdmD: this.latDdmD,
        latDdmM: this.latDdmM,

        lngDdmQ: this.lngDdmQ,
        lngDdmD: this.lngDdmD,
        lngDdmM: this.lngDdmM,
      },
      address: ""//derivedAddress
    },
      { emitEvent: false }  // Prevent enless loop...
      // https://netbasal.com/angular-reactive-forms-tips-and-tricks-bb0c85400b58
    )

    // Emit new location event to parent: so it & any children can react
    this.log.verbose(`Emitting new Location ${JSON.stringify(newLocation)}`, this.id)
    this.locationChange.emit(newLocation)
  }

  /**
   * NOTE: This also updates/POSTS to the form!!!
   * !TODO: Should it ALSO emit an updated location?!
   * @param lat
   * @param lng
   * @returns
   */
  DDToAddress(lat: number, lng: number) {
    console.info(`Looking up address: ${lat}, ${lng}`, this.id)

    //! TODO: Do we also need to update pCodeGlobal & What3Words?
    if (!LocationComponent.geocoder) {
      return "Address lookup requires Internet"
    }
    else {
      let latLng = new google.maps.LatLng(lat, lng)
      // Reverse Geocode: get address from coordinates
      LocationComponent.geocoder
        .geocode({ location: latLng })
        .then((response) => {
          // this.log.excessive(`Found array of addresses: ${JSON.stringify(response.results)}`, this.id)
          if (response.results[0]) {
            this.log.info(`DDToAddress(): Received a new geocoded address[0]: ${JSON.stringify(response.results[0].formatted_address)}`, this.id)

            // Async update of address field...
            this.log.verbose(`DDToAddress(): Going to update location.address`, this.id)
            //debugger
            //this.location.address = response.results[0].formatted_address
            this.log.verbose(`DDToAddress(): Updated location.address`, this.id)

            this.locationFormModel.patchValue({ address: response.results[0].formatted_address }
              // , { emitEvent: false }  // Prevent enless loop...
              // https://netbasal.com/angular-reactive-forms-tips-and-tricks-bb0c85400b58
            )
            this.log.verbose(`DDToAddress(): Updated locationFormModel.address`, this.id)
            return (response.results[0].formatted_address)
          } else {
            return ("No address found.") // No results found
          }
        })
        .catch((e) => { return ("Geocoder failed due to: " + e) })
      return "" // ("No immediate address available: await the result!")
    }

    //if (!newLocation.derivedFromAddress) {
    // TODO: User entered lat/long, so we need to come up with an approximate address
    // REVIEW: Should LocationType also store PCode/What3Words addresses?
    /*
        let pCode = OpenLocationCode.encode(latDD, lngDD, 11); // OpenLocationCode.encode using default accuracy returns an INVALID +Code!!!
        this.log.verbose("updateCoords: Encode returned PlusCode: " + pCode, this.id)
        let fullCode
        if (pCode.length != 0) {
          if (OpenLocationCode.isValid(pCode)) {
            if (OpenLocationCode.isShort(pCode)) {
              Recover the full code from a short code:
              fullCode = OpenLocationCode.recoverNearest(pCode, this.settings.defLat, this.settings.defLng)
            } else {
              fullCode = pCode;
              this.log.verbose("Shorten +Codes, Global:" + fullCode + ", Lat:" + this.settings.defLat + "; lng:" + this.settings.defLng), this.id;
              Attempt to trim the first characters from a code; may return same innerText...
              pCode = OpenLocationCode.shorten(fullCode, this.settings.defLat, this.settings.defLng)
            }
            this.log.verbose("New PlusCodes: " + pCode + "; Global: " + fullCode, this.id);
            (document.getElementById("addresses") as HTMLInputElement).value = pCode;
            document.getElementById("addressLabel").innerHTML = defPCodeLabel; // as HTMLLabelElement
            (document.getElementById("pCodeGlobal") as HTMLLabelElement).innerHTML = " &nbsp;&nbsp; +Code: " + fullCode;
          } else {
            this.log.verbose("Invalid +PlusCode: " + pCode, this.id);
            document.getElementById("pCodeGlobal")!.innerHTML = " &nbsp;&nbsp; Unable to get +Code"
            document.getElementById("addressLabel").innerHTML = "  is <strong style='color: darkorange;'>Invalid </strong> Try: "; // as HTMLLabelElement
          }
    */

    //}

  }

  onAddressChg() { //newAddress: string = "undefined address"

    let newAddress = this.locationFormModel.get("address")?.value
    this.log.info(`onAddressChg got newAddress: ${JSON.stringify(newAddress)}`, this.id)

    // ! TODO: Check for +Code or What3Words as we cna do this while offline...

    if (!this.geocoder) {
      this.log.error(`Google.Geocoder not available while offline from Internet. Needed to get coordinates from new address: ${JSON.stringify(newAddress)}`, this.id)
    }

    // Regular Geocode: get coordinates from address
    let myTuple = this.geocoder.isValidAddress(newAddress)
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


  chkAddresses() {
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

  // newMarker(loc: google.maps.LatLngLiteral, title: string = "") {  // TODO: Remove google ref
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
  chk3Words(tWords: string) {
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


  chkPCodes(pCode: string) {
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

  chkStreetAddress(addrText: string) {
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
  // onInfoWhere() {
  //   this.log.verbose("onInfoWhere", this.id)
  //   let s = "for Enter the latittude either in degrees decmal or as Degrees Minutes & Seconds"
  // }









  /*
  UpdateAddress_UNUSED(newAddress = "New Geocoded Address here") {

    this.log.error(`UpdateAddress(): GOT NEW Location ${JSON.stringify(newAddress)}`, this.id)

    this.locationFormModel.patchValue({ address: newAddress },
      { emitEvent: false }  // Prevent enless loop...
    )

    this.location.address = newAddress

    // Emit new location event to parent: so it & any children can react
    this.log.error(`UpdateAddress(): Emitting new Location ${JSON.stringify(newAddress)}`, this.id)
    // this.locationChange.emit(this.location)
  }
  */


  // setCtrl(ctrlName: HTMLElement, value: number | string) {
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
    addressCtrlChanged(what: string) {
      this.log.verbose(`addressCtrlChanged`, this.id)
      // TODO: No formControlName="addressCtrl"!!!!

      // this.form.markAsPristine();
      // this.form.markAsUntouched();
      // if (this.locationFrmGrp.get('address')?.touched) {
      //   this.log.excessive('address WAS touched', this.id)
         //this.locationFrmGrp.get('address')?.markAsUntouched
      // }
      // if (this.locationFrmGrp.get('address')?.dirty) {
      //   this.log.excessive('address WAS dirty', this.id)
         //this.location.get('address')?.markAsPristine
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


  ngOnDestroy() {
    this.settingsSubscription.unsubscribe()
  }
}
