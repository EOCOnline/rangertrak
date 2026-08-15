//import assert from 'assert'
import {
  BehaviorSubject, debounceTime, fromEvent, map, merge, Observable, Subscription, takeWhile
} from 'rxjs'

import { CommonModule, DOCUMENT } from '@angular/common'
import {
  AfterViewInit, Component, ElementRef, EventEmitter, Inject, Input, OnDestroy, OnInit, Output, SkipSelf,
  ViewChild,
  ChangeDetectionStrategy
} from '@angular/core'
import { FormsModule, ReactiveFormsModule } from '@angular/forms'
import {
  FormArray, FormControl, FormGroup, UntypedFormBuilder, UntypedFormGroup, Validators
} from '@angular/forms'

// https://floating-ui.com superceeds popper.js; https://lokesh-coder.github.io/toppy may be simpler!
//import { computePosition } from '@floating-ui/dom'

import { faInfoCircle, faMapMarkedAlt } from '@fortawesome/free-solid-svg-icons'
import { mdiAccount, mdiInformationOutline } from '@mdi/js'

//import { MatIconRegistry } from '@angular/material/icon'

// Imported from their own files rather than the '../shared/' barrel on purpose: that
// barrel also re-exports the MapLibre style helpers, so pulling anything through it from
// the eagerly-loaded Entry page drags MapLibre (~800KB) into the initial bundle even
// though this page never shows a MapLibre map. Same reasoning as app.config.ts.
import { DDMToDD, DDToDDM, DDToDMS, DMSToDD } from '../shared/mapping/coordinate'
import { GEOCODING_PROVIDER, GeocodingProvider } from '../shared/mapping/geocoding-provider.interface'
import { CodeArea, OpenLocationCode } from '../shared/mapping/open-location-code'

import {
  LocationType, LogService, SettingsService, SettingsType, undefinedAddressFlag, undefinedLocation
} from '../shared/services'

import { MATERIAL_IMPORTS } from '../material-imports'

//! import { What3Words} from '../shared/'
/*
https://stackoverflow.com/questions/43270564/dividing-a-form-into-multiple-components-with-validation
https://www.digitalocean.com/community/tutorials/how-to-build-nested-model-driven-forms-in-angular-2
https://stackblitz.com/edit/angular-azzmhu?file=src/app/hello.component.ts
*/

@Component({
  //moduleId: module.id,
  selector: 'rangertrak-location',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, ...MATERIAL_IMPORTS],
  templateUrl: './location.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./location.component.scss']
})
export class LocationComponent implements OnInit, AfterViewInit, OnDestroy {

  /*
  //!TODO: If we do end up using this getter/setter, we should keep the _location updated elsewhere!
  private _location = undefinedLocation

  // Use setter to get immediate notification of changes to inputs (pg 182 & 188)
  // !but also see 9.2.1 for ngOnChange() implementation...
  @Input() set location(location: LocationType) {
    if (location !== undefined) {
      this._location = location
      this.log.error(`Setter got new location: ${JSON.stringify(location)}`, this.id)
    }
    // Check if object's contents equal: _.isEqual( obj1 , obj2 ) OR JSON.stringify(obj1) === JSON.stringify(obj2)
    if (JSON.stringify(location) === JSON.stringify(undefinedLocation)) {
      this.log.error("Got new location, but it still was 'undefined'", this.id)
    } else {
      this.log.warn(`Got new location: ${JSON.stringify(location)}`, this.id)
      // Initially called after constructor, but BEFORE ngOnInit()
      // Populate form with initial (& any subsequent updates) from parent
      // Also re-emits address changes which (via parent) can get picked up by other (peer) children.
      this.newLocationToFormAndEmit(location)
    }
  }
  get location(): LocationType {
    return this._location
  }
  // see pg 182 (& 188) in AngDev w/TS
*/
  // Using mediation pattern (pg 188), this child component emits following event to parent,
  // parent's template has: (newLocationEvent)="onNewLocationParent($event)"
  // Parent's onNewLocationParent($event) gets called.
  // Parent then passes the new location (via binding), to any children (e.g., mini-maps) as needed
  @Input() location: LocationType = undefinedLocation
  @Output() locationChange = new EventEmitter<LocationType>()

  private id = "Location Component"
  locationFormModel!: FormGroup
  // Untyped : https://angular.io/guide/update-to-latest-version#changes-and-deprecations-in-version-14 & https://github.com/angular/angular/pull/43834

  //!w3w = new What3Words()

  faInfoCircle = faInfoCircle
  faMapMarkedAlt = faMapMarkedAlt
  mdiAccount: string = mdiAccount
  mdiInformationOutline: string = mdiInformationOutline

  private settingsSubscription!: Subscription
  private settings!: SettingsType

  constructor(
    private settingsService: SettingsService,
    private _formBuilder: UntypedFormBuilder,
    private log: LogService,
    @Inject(GEOCODING_PROVIDER) private geocodingProvider: GeocodingProvider,
    // private _toppy: Toppy,
    @Inject(DOCUMENT) private document: Document) {
    this.log.info("======== Constructor() ============", this.id)

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
  ngOnInit(): void {
    this.log.info("ngOnInit", this.id)

    /**
     * Get notified when user enters various loction elements - & update the rest of the location
     *
     * Capture user's location component changes, then call
     * subroutines to recalc/update the rest of the form & update parent & peers (i.e., mini-map)
     *
     * per:
     * https://stackoverflow.com/questions/70366847/angular-on-form-change-event
     * https://www.tektutorialshub.com/angular/valuechanges-in-angular-forms/
     */
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
      TODO: How to subscribe to the valueChanges observable?
        listen for changes in the form's value in the *template* using AsyncPipe or in the *component class* w/ subscribe() method

        https://www.tektutorialshub.com/angular/valuechanges-in-angular-forms/
        https://angular.io/api/common/AsyncPipe
        https://angular.io/api/forms/AbstractControl
        https://angular.io/api/forms/NgControlStatus ARE CSS Classes.
        https://angular.io/api/forms
        https://www.danvega.dev/blog/2017/06/07/angular-forms-clear-input-field/
        https://www.tektutorialshub.com/angular/valuechanges-in-angular-forms/
        https://qansoft.wordpress.com/2021/05/27/reactive-forms-in-angular-listening-for-changes/
 */

      const alive: boolean = true // from original sample, but unused by us

      setTimeout(() => {
        //console.log(this.reactiveForm.value)
      }) // Pause to let parent form get the change event bubbled up from the control

      this.mergeForm(this.locationFormModel, '')
        .pipe(debounceTime(700))  // BUG: If too long, changes (leaving field) get skipped!
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

    // !BUG: Doesn't center on initial (previously received) location...
    this.newLocationToFormAndEmit(this.location)

    // =========================================================
    /*  if using floating-ui.com...
        const referenceElement = document.querySelector('#blockDD');
        const floatingElement = document.querySelector('#tooltipDD') as HTMLBodyElement

        this.applyStyles

        computePosition(referenceElement!, floatingElement, {
          placement: 'top',
        }).then(this.applyStyles)
    */


  }

  /**
    * Called once all HTML elements have been created
    */
  ngAfterViewInit() {
    // doing emit here causes: NG0100: Expression has changed after it was checked
    // this.newLocationToFormAndEmit(this.location)
  }

  /*  if using floating-ui.com...
    applyStyles({ x = 0, y = 0, strategy = 'absolute' }) {
      // const referenceElement = document.querySelector('#button');
      const floatingElement = document.querySelector('#tooltipDD') as HTMLBodyElement
      Object.assign(floatingElement!.style, {
        position: strategy,
        left: `${x}px`,
        top: `${y}px`,
      });
    }
   */

  /**
   * Create Form Model, so we can readily set values & respond to user input
   * NOTE: We never have an OnSubmit() routine...instead subscribing & immediately reacting to changes
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
      // Cooordinates as Degrees & Decimal Minutes (DDM)
      DDM: this._formBuilder.group({
        latDdmQ: ["N"], // Quadrant
        latDdmD: [0], // Degrees
        latDdmM: [0], // Minutes
        lngDdmQ: ["E"],
        lngDdmD: [0],
        lngDdmM: [0]
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


  /**
   * https://angular.io/guide/template-reference-variables
   */
  onDdChg() {
    //this.log.excessive(`Grab DD values from locationFormModel`, this.id)
    let latI = this.locationFormModel.get("DD.latI")?.value
    let latF = this.locationFormModel.get("DD.latF")?.value
    let lngI = this.locationFormModel.get("DD.lngI")?.value
    let lngF = this.locationFormModel.get("DD.lngF")?.value
    this.log.verbose(`new DD values: ${latI}.${latF}°, ${lngI}.${lngF}°`, this.id)

    let lat = parseFloat(latI + "." + latF)
    let lng = parseFloat(lngI + "." + lngF)

    let enteredLocation = {
      lat: lat,
      lng: lng,
      address: undefinedAddressFlag,
      derivedFromAddress: false
    }
    this.newLocationToFormAndEmit(enteredLocation)
  }



  onDdmChg() {
    //this.log.excessive(`Grabbing DMSvalue changes from locationFormModel`, this.id)
    let latDdmD = this.locationFormModel.get("DDM.latDdmD")?.value
    let latDdmM = this.locationFormModel.get("DDM.latDdmM")?.value
    let latDdmQ = this.locationFormModel.get("DDM.latDdmQ")?.value
    let lngDdmD = this.locationFormModel.get("DDM.lngDdmD")?.value
    let lngDdmM = this.locationFormModel.get("DDM.lngDdmM")?.value
    let lngDdmQ = this.locationFormModel.get("DDM.lngDdmQ")?.value

    this.log.excessive(`DMS value changed:  ${latDdmD}° ${latDdmM}' ${latDdmQ}, ${lngDdmD}° ${lngDdmM}' ${lngDdmQ}`, this.id)

    let latLng = {
      lat: DDMToDD(<string>latDdmQ, latDdmD, latDdmM)!,
      lng: DDMToDD(<string>lngDdmQ, lngDdmD, lngDdmM)!
    }
    this.log.verbose(`DDM converted to DD: ${latLng.lat}° ${latLng.lng}°`, this.id)

    let enteredLocation = {
      lat: latLng.lat,
      lng: latLng.lng,
      address: undefinedAddressFlag,
      derivedFromAddress: false
    }

    this.newLocationToFormAndEmit(enteredLocation)
  }

  onDmsChg() {
    //this.log.excessive(`Grabbing DMSvalue changes from locationFormModel`, this.id)
    let latD = this.locationFormModel.get("DMS.latD")?.value
    let latM = this.locationFormModel.get("DMS.latM")?.value
    let latS = this.locationFormModel.get("DMS.latS")?.value
    let latQ = this.locationFormModel.get("DMS.latQ")?.value
    let lngD = this.locationFormModel.get("DMS.lngD")?.value
    let lngM = this.locationFormModel.get("DMS.lngM")?.value
    let lngS = this.locationFormModel.get("DMS.lngS")?.value
    let lngQ = this.locationFormModel.get("DMS.lngQ")?.value

    this.log.verbose(`DMS value changed:  ${latD}° ${latM}' ${latS}" ${latQ}, ${lngD}° ${lngM}' ${lngS}" ${lngQ}`, this.id)

    let latLng = {
      lat: DMSToDD(latQ, latD, latM, latS)!,
      lng: DMSToDD(lngQ, lngD, lngM, lngS)!
    }
    this.log.verbose(`DMS converted to DD: ${latLng.lat}° ${latLng.lng}°`, this.id)

    let enteredLocation = {
      lat: latLng.lat,
      lng: latLng.lng,
      address: undefinedAddressFlag,
      derivedFromAddress: false
    }
    this.newLocationToFormAndEmit(enteredLocation)
  }



  /**
   * Any user changes to the location form triggers an updated location (above) &
   * now we update form & model with new location.
   *
   * Also emit new location to notify parent (& any peers - like a mini-map)
   *
   * NOTE: gets called before ngOnInit, during parent's construction
   * !TODO: Validate values here or in calling routines?
   *
   * @param newLocation: LocationType
   */
  newLocationToFormAndEmit(newLocation: LocationType) {
    this.log.info(`newLocationToFormAndEmit() got a new Location: ${JSON.stringify(newLocation)}`, this.id);

    let latDD = newLocation.lat
    let lngDD = newLocation.lng

    let address = ''
    if (newLocation.derivedFromAddress) {
      address = newLocation.address
      this.updateDerivedLocations(newLocation)
    } else {
      // Async routine to geocode from lat/lng & update location.address
      // REVIEW: Do this early in HOPES that the async geocoding routine will have returned by time we emit a new location... (though mini-map really only needs lat/long)

      // DDToAddress (asynchroniously) calls updateDerivedLocations() too
      this.DDToAddress(newLocation)
    }

    let latI = Math.trunc(latDD)
    // this.latF = Math.abs(Number((latDD - this.latI).toFixed(4))) * 10000  // works too...
    let latF = Math.abs(Math.round((latDD - latI) * 10000))

    let lngI = Math.trunc(lngDD)
    let lngF = Math.abs(Math.round((lngDD - lngI) * 10000))

    let latDDM = DDToDDM(latDD)
    let lngDDM = DDToDDM(lngDD, true)
    this.log.excessive(`new DDM Location: ${latDDM.dir} ${latDDM.deg}° ${latDDM.min / 100}' lat; ${lngDDM.dir} ${lngDDM.deg}° ${lngDDM.min / 100}' lng`, this.id)

    let latDMS = DDToDMS(latDD)
    let lngDMS = DDToDMS(lngDD, true)
    this.log.excessive(`new DMS Location: ${latDMS.dir} ${latDMS.deg}° ${latDMS.min}' ${latDMS.sec}" lat; ${lngDMS.dir} ${lngDMS.deg}° ${lngDMS.min}' ${lngDMS.sec}" lng`, this.id);

    // Set model values - which updates the display & is the only place the current location is kept.
    this.locationFormModel.setValue({
      DD: {
        latI: latI,
        latF: latF,
        lngI: lngI,
        lngF: lngF
      },
      DDM: {
        latDdmQ: latDDM.dir,
        latDdmD: latDDM.deg,
        latDdmM: latDDM.min / 100,

        lngDdmQ: lngDDM.dir,
        lngDdmD: lngDDM.deg,
        lngDdmM: lngDDM.min / 100
      },
      DMS: {
        latQ: latDMS.dir,
        latD: latDMS.deg,
        latM: latDMS.min,
        latS: latDMS.sec,

        lngQ: lngDMS.dir,
        lngD: lngDMS.deg,
        lngM: lngDMS.min,
        lngS: lngDMS.sec
      },
      address: address
    },
      { emitEvent: false }  // Prevent enless loop...
      // https://netbasal.com/angular-reactive-forms-tips-and-tricks-bb0c85400b58
    )

    // Emit new location event to parent: so it & any children can react
    this.log.warn(`newLocationToFormAndEmit() Emitting new Location ${JSON.stringify(newLocation)}`, this.id)
    this.locationChange.emit(newLocation)
  }

  /**
   * Update labels with derived locations
   * REVIEW: Should LocationType also store PCode/What3Words addresses?
   *
   * @param location
   */


  chkPCodes(pCode: string) {
    this.log.verbose(`User entered potential pCode: '${pCode}'. Verify it.`, this.id);
    if (pCode.length) {
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

  updateDerivedLocations(location: LocationType) {
    this.log.verbose(`updateDerivedLocations()`, this.id)

    // DDToAddress already called - if needed...
    //if (location.derivedFromAddress == false) {
    // Updates location.address, but asyncronously
    //let result = this.DDToAddress(location)
    //this.log.verbose(`DDToAddress returned ${result} & ${JSON.stringify(location)}`, this.id)
    //}

    //! duplicate code in ChkPCode()!
    // Check for https://github.com/google/open-location-code (works offline!)
    let pCode = OpenLocationCode.encode(location.lat, location.lng, 11); // OpenLocationCode.encode using default accuracy returns an INVALID +Code!!!
    this.log.verbose(`updateCoords: Encode returned PlusCode: ${pCode}`, this.id)
    let fullCode
    if (pCode.length) {
      if (OpenLocationCode.isValid(pCode)) {
        if (OpenLocationCode.isShort(pCode)) {
          // Recover the full code from a short code:
          fullCode = OpenLocationCode.recoverNearest(pCode, this.settings.defLat, this.settings.defLng)
        } else {
          fullCode = pCode
          this.log.verbose(`Shorten +Codes, Global: ${fullCode}, Lat: ${this.settings.defLat}; lng: ${this.settings.defLng}`, this.id)
          // Attempt to trim the first characters from a code; may return same innerText...
          pCode = OpenLocationCode.shorten(fullCode, this.settings.defLat, this.settings.defLng)
        }
        this.log.verbose(`New PlusCodes: ${pCode} ; Global: ${fullCode}`, this.id);
        //(document.getElementById("addresses") as HTMLInputElement).value = pCode
        //document.getElementById("defaultPCode")!.innerHTML = this.settings.defPlusCode; // as HTMLLabelElement
        (document.getElementById("pCodes") as HTMLLabelElement).innerText = `Derived PlusCodes: +Code: ${pCode} +GlobalPCode: ${fullCode}`
      } else {
        this.log.verbose(`Invalid +PlusCode: ${pCode}`, this.id)
        document.getElementById("pCodes")!.innerText = "Derived +Codes: &nbsp; Unable to get +Code"
        //document.getElementById("derivedAddress")!.innerHTML = "  is <strong style='color: darkorange;'>Invalid </strong> Try: " // as HTMLLabelElement
      }
    }

    this.document.getElementById("derivedAddress")!.innerText = `Derived Address: ${location.address}`

    // Get & update What3Words
    let w3w = "Not.Implemented.Yet!"
    this.document.getElementById("what3Words")!.innerText = `Derived What3Words Code: ${w3w}`

  }


  /**
   * NOTE: following sets DERIVED address
   * in an async manner (i.e., doesn't return an address)
   * Requires Internet access!
   *
   * !TODO: Should it ALSO emit an updated location?!
   *
   * @param location: locationType
   * @returns
   */
  DDToAddress(location: LocationType) {
    this.log.verbose(`DDToAddress() Looking up address: ${location.lat}, ${location.lng}`, this.id)
    // assert(!location.derivedFromAddress)
    if (location.derivedFromAddress) {
      this.log.error(`DDToAddress got a primary address NOT needing derivation!`, this.id)
    }

    // Only show address in model during location emition
    // This control ONLY shows main address if user entered it there
    // for this control/widget: differentiate between derived & 'primary' or user entered addresses
    this.locationFormModel.patchValue({ address: "" }, { emitEvent: false })

    this.geocodingProvider.reverseGeocode(location.lat, location.lng)
      .then((result) => {
        // Async: likely runs after subroutine returns
        if (!result.found) {
          this.log.warn(`DDToAddress: ${result.error}`, this.id)
          return
        }

        this.log.info(`DDToAddress(): Received a new geocoded address: ${result.address}`, this.id)

        location.address = result.address
        // Async update of DERIVED address fields...
        this.updateDerivedLocations(location)

        this.log.warn(`DDToAddress() Emitting new Location ${JSON.stringify(location)}`, this.id)
        this.locationChange.emit(location)
      })
    return ("No immediate address available: await the result!")
  }

  onAddressChg() { //newAddress: string = "undefined address"
    //let tWords // = document.getElementById("addresses")!.innerText // as HTMLInputElement).value
    let newAddress = this.locationFormModel.get("address")?.value
    this.log.verbose(`onAddressChg got newAddress: ${JSON.stringify(newAddress)}`, this.id)

    if (!newAddress || !newAddress.length) {
      this.log.error(`onAddressChggot null or undefined address`, this.id)
      return
    }

    // Now see what kind/format of address we have and get DD
    if (newAddress.includes("+")) {
      this.log.verbose("Got PCode: " + newAddress, this.id)
      this.chkPCodes(newAddress)
    } else {
      let tWords = newAddress.split(".")
      if (tWords.length == 3) {
        this.log.verbose("Got What 3 Words: " + newAddress, this.id)
        this.chk3Words(newAddress)
      } else {
        this.chkStreetAddress(newAddress)
      }
    }
  }

  //----------------------------------------------------------------------------------------
  // Address stuff

  // https://developer.what3words.com/tutorial/detecting-if-text-is-in-the-format-of-a-3-word-address
  // https://developer.what3words.com/tutorial/javascript
  // https://developer.what3words.com/tutorial/detecting-if-text-is-in-the-format-of-a-3-word-address
  chk3Words(tWords: string) {
    this.log.verbose("chk3Words", this.id)
    // A commented-out jQuery $.ajax call to the w3w autosuggest endpoint used to sit
    // here, carrying an API key. It was verbatim from what3words' own tutorial (London
    // coordinates, clip-to-country=BE,GB), so the key was theirs rather than ours - but a
    // key-shaped string in tracked source is a finding whoever reads the repo, and the
    // snippet was dead anyway (jQuery is not a dependency). Removed; see
    // PRIVATE-Roadmap.md Section 9d item 1b. The real integration lives in
    // shared/mapping/3words.ts and takes its key from settings.

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

  chkStreetAddress(addrText: string) {
    this.log.verbose("Got street address to check: " + addrText, this.id)

    this.geocodingProvider.geocodeAddress(addrText).then((result) => {
      if (!result.found) {
        this.log.warn(`chkStreetAddress: ${result.error}`, this.id)
        return
      }

      let enteredLocation: LocationType = {
        lat: result.lat,
        lng: result.lng,
        address: addrText,
        derivedFromAddress: true
      }

      this.newLocationToFormAndEmit(enteredLocation)
    })
  }

  // --------------------------- TOOLTIPS ---------------------------
  /*
  https://floating-ui.com superceeds popper.js; https://lokesh-coder.github.io/toppy may be simpler!

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

  https://floating-ui.com superceeds popper.js

  The hint to display @Input() target!: HTMLElement
  Its positioning (check docs for available options)
  @Input() placement?: string;
  Optional hint target if you desire using other element than specified one
  @Input() appPopper?: HTMLElement;

  The popper instance
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

  ngOnDestroy() {
    this.settingsSubscription?.unsubscribe()
  }
}
