import {
  debounceTime, map, Observable, startWith, subscribeOn, Subscription, switchMap
} from 'rxjs'

import { DOCUMENT } from '@angular/common'
import { HttpClient } from '@angular/common/http'
import {
  AfterViewInit, Component, EventEmitter, Inject, Input, isDevMode, NgZone, OnDestroy, OnInit,
  Output, ViewChild
} from '@angular/core'
import {
  FormControl, FormGroup, FormsModule, ReactiveFormsModule, UntypedFormBuilder,
  UntypedFormControl, UntypedFormGroup, Validators
} from '@angular/forms'
import { ThemePalette } from '@angular/material/core'
import { MatSnackBar } from '@angular/material/snack-bar'

import { AlertsComponent, DDToDDM, TimePickerComponent, Utility } from '../shared/'
import {
  FieldReportService, FieldReportStatusType, LocationType, LogService, RangerService, RangerType,
  SettingsService, SettingsType, undefinedAddressFlag, undefinedLocation
} from '../shared/services/'
//import { LocationComponent } from './location.component'

// TODO: IDEA: use https://material.angular.io/components/badge/ ???


@Component({
    selector: 'rangertrak-entry',
    templateUrl: './entry.component.html',
    styleUrls: ['./entry.component.scss'],
    providers: [RangerService, FieldReportService, SettingsService]
    //, TeamService
    // https://angular.io/guide/architecture-services#providing-services: 1 or multiple instances?!
    // per https://angular.io/guide/singleton-services
    ,
    standalone: false
})
export class EntryComponent implements OnInit, AfterViewInit, OnDestroy {
  // following is never referenced: not really in use?!
  @ViewChild('timePicker') timePicker: any; // https://blog.angular-university.io/angular-viewchild/

  //  @ViewChild('LocationComponent') myLocationPickerInstance: any//LocationComponent;
  /** Likely NOT needed...
   * If we need to call any routines from location component,
   * use ViewChild to get a reference of the actual instance we're interacting with.
   * Component initialization shouldn't be done before AfterViewInit lifecycle hook.
   * Queries on @ViewChild can only see elements inside the component's template.
   * https://blog.angular-university.io/angular-viewchild/
   */

  //@Output() newLocationEvent = new EventEmitter<LocationType>()
  // https://angular.io/guide/inputs-outputs & https://angular.io/guide/two-way-binding
  //@Output() locationEvent = new EventEmitter<LocationType>()

  // Get time events from <location> component
  //private locationSubscription!: Subscription

  private id = 'Entry Form'
  title = 'Field Report Entry'
  pageDescr = `Enter data associated with ranger's name, location, status for tracking on maps & spreadsheets`

  // REVIEW: do async auto-subscriptions from the HTML side instead?
  private rangersSubscription!: Subscription
  public rangers: RangerType[] = []
  filteredRangers!: Observable<RangerType[]>

  private settingsSubscription!: Subscription
  public settings!: SettingsType

  // Get time events from <timepicker> component
  //private timeSubscription!: Subscription  //! EVER USED?!
  timePickerLabel = "Enter Report Date, Time"

  alert: AlertsComponent

  // --------------- ENTRY FORM -----------------
  // control creation in a component class = immediate access to listen for, update, and validate state of the form input: https://angular.io/guide/reactive-forms#adding-a-basic-form-control
  // Untyped : https://angular.io/guide/update-to-latest-version#changes-and-deprecations-in-version-14 & https://github.com/angular/angular/pull/43834
  public entryDetailsForm!: FormGroup //UntypedFormGroup
  callsignCtrl = new FormControl() //Untyped
  //readonly imagePath = "'./assets/imgs/rangers/'" // not yet used by *.html

  // Get location events from <location> component
  //public locationChange: Subscription
  public locationParent = undefinedLocation

  minDate = new Date()

  submitInfo: HTMLElement | null = null
  callImg: HTMLElement | null = null
  callInfo: HTMLElement | null = null

  // https://github.com/h2qutc/angular-material-components
  // TODO: Consider for tracking ValueChanges: https://angular.io/guide/observables-in-angular#reactive-forms
  // https://material.angular.io/components/autocomplete/examples#autocomplete-overview; also Ang Dev with TS, pg 140ff; Must be in OnInit, once component properties initialized


  constructor(
    private _formBuilder: UntypedFormBuilder,
    private rangerService: RangerService,
    private fieldReportService: FieldReportService,
    private log: LogService,
    private settingsService: SettingsService,
    private _snackBar: MatSnackBar,
    private http: HttpClient,
    private zone: NgZone,
    @Inject(DOCUMENT) private document: Document) {

    this.log.excessive(`======== constructor() ============`, this.id)

    // https://angular.io/tutorial/toh-pt4#call-it-in-ngoninit states subscribes should happen in OnInit()
    this.settingsSubscription = this.settingsService.getSettingsObserver().subscribe({
      next: (newSettings) => {
        this.settings = newSettings
        // REVIEW: If new Default Location, do we switch to that, or any currenlty in 'use'?
        if (JSON.stringify(this.locationParent) === JSON.stringify(undefinedLocation)) {
          // Local location has yet to be set

          this.log.excessive('Setting updated location based on default settings.', this.id)
          // Settings just store default lat/lng, not address.
          // Child will figure out the address...
          this.locationParent = {
            lat: this.settings.defLat,
            lng: this.settings.defLng,
            address: undefinedAddressFlag,
            derivedFromAddress: false
          }
        }
        this.log.excessive('Received new Settings via subscription.', this.id)
      },
      error: (e) => this.log.error('Settings Subscription got:' + e, this.id),
      complete: () => this.log.info('Settings Subscription complete', this.id)
    })

    // TODO: Move callSign input to new component?
    this.rangersSubscription = this.rangerService.getRangersObserver().subscribe({
      next: (newRangers) => {
        this.rangers = newRangers
        this.log.excessive('Received new Rangers via subscription.', this.id)
      },
      error: (e) => this.log.error('Rangers Subscription got:' + e, this.id),
      complete: () => this.log.info('Rangers Subscription complete', this.id)
    })

    // TODO: Use Alert Service to avoid passing along doc & snackbar properties!
    this.alert = new AlertsComponent(this._snackBar, this.log, this.settingsService, this.document)

    //! https://material.angular.io/components/autocomplete/examples#autocomplete-overview has this in constructor!
    // also Ang Dev with TS, pg 140ff; Must be in OnInit, once component properties initialized
    this.initFilteredRangers()
    this.log.verbose(`constructor: got new callsign: [does endless loop: ] { JSON.stringify(this.filteredRangers) } `, this.id)

    // OLD:  map(ranger => (ranger ? this._filterRangers(ranger) : this.rangers.slice())),
    // NEW: map(callsign => (callsign ? this._filterRangers(callsign) : this.rangers.slice())),

    // NOTE: workaround for onChange not working...
    // https://material.angular.io/components/autocomplete/examples#autocomplete-overview; also Ang Dev with TS, pg 140ff; Must be in OnInit, once component properties initialized
    this.callsignCtrl.valueChanges.pipe(debounceTime(700)).subscribe(newCall => this.callsignChanged(newCall))
  }

  // https://material.angular.io/components/autocomplete/examples#autocomplete-overview; also Ang Dev with TS, pg 140ff; Must be in OnInit, once component properties initialized
  //this.callsignCtrl.valueChanges.pipe(debounceTime(700)).subscribe(newCall => this.callsignChanged(newCall))

  // https://angular.io/guide/practical-observable-usage#type-ahead-suggestions


  /**
   * Persist new location so when form is submitted it gets recorded...
   * Values automatically propogate to any children (mini-map in this case) via their @Input statements
   *
   * @param newLocation
   */
  onNewLocationEvent(newLocation: LocationType) { //LocationType) {
    // Based on listing 8.8 in TS dev w/ TS, pg 188
    this.log.info(`Entry form (parent) got new Location: ${JSON.stringify(newLocation)}`, this.id)

    //!BUG: The next line *should* propogate new value to all children, but only does so intermittently...
    this.log.info(`locationParent was: ${JSON.stringify(this.locationParent)}`, this.id)
    this.locationParent = newLocation
    //this.locationParent.lat += 0.0000001  //! REMOVE ME!
    this.log.info(`locationParent now: ${JSON.stringify(this.locationParent)}`, this.id)


    // patch entryForm object - as THAT is what gets saved with on form submit
    this.entryDetailsForm.patchValue({ location: newLocation }, { emitEvent: false })
    //! NOTE: emit Event causes endless notification loop; BUT how to notify mini-map?!
    //this.log.info(`Entry form (parent) recorded the new locationParent: ${JSON.stringify(this.locationParent)}`, this.id)
  }

  /**
   * Called when this.timepickerFormControl has emitted a new event
   *
   * Persist new time/date so when form is submitted it gets recorded...
   *
   * Based on listing 8.8 in TS dev w/ TS, pg 188
   *
   * @param newTime
   */
  onNewTimeEvent(newTime: Date) {
    this.log.verbose(`Got new Report time: ${newTime}`, this.id)
    this.entryDetailsForm.patchValue({ date: newTime })
  }

  /**
   * Initialize data or fetch external data from services or API (https://geeksarray.com/blog/angular-component-lifecycle)
   *
   * Autocomplete must be in OnInit, once component properties initialized
   *
   * https://material.angular.io/components/autocomplete/examples#autocomplete-overview;
   * also Ang Dev with TS, pg 140ff;
   */
  //
  ngOnInit(): void {
    this.log.info(`EntryForm initialization with development mode ${isDevMode() ? "" : "NOT "} enabled`, this.id)

    /*
        this.sha256("hello").then(digestValue => {
          console.error(` ########## SECRET      Digest is: ${digestValue}`)
        });
    */

    this.log.excessive("EntryComponent - ngOnInit - Use settings to fill form", this.id)

    // https://angular.io/api/router/Resolve - following fails as SettingsComponent has yet to run...
    // or even https://stackoverflow.com/questions/35655361/angular2-how-to-load-data-before-rendering-the-component
    this.log.excessive(`Running ${this.settings?.application} version ${this.settings?.version} `, this.id)
    // verifies Settings has been loaded

    /*  if receiving the https://flexiple.com/angular/expressionchangedafterithasbeencheckederror/
        i.e., entryDetailsForm probably constructed at wrong time...
        Move the component creation to ngOnInit hook
        error can show up when you are working with ViewChild, and execute code in AfterViewInit.

        the binding expression changes after being checked by Angular during the change detection cycle
   */


    this.initEntryForm()

    this.submitInfo = this.document.getElementById("enter__Submit-info")
    if (!this.submitInfo) {
      this.log.error(`Could not find enter__Submit-info field`, this.id)
    }

    if (this.settings?.debugMode) {
      Utility.displayShow(this.document.getElementById("enter__frm-reguritation")!)
      Utility.displayShow(this.document.getElementById("enter__where-debug")!)
    }

    if (this.rangers.length < 1) {
      this.alert.Banner('Welcome! First load your rangers (at the bottom of the Rangers page) & then review items in the Settings Page.', 'Go to Rangers, then Settings pages', 'Ignore')
      //this.alert.OpenSnackBar(`No Rangers exist.Please go to Advance section at bottom of Ranger page!`, `No Rangers yet exist.`, 2000)
      //TODO: Force navigation to /Rangers?

      this.log.excessive(` ngOnInit completed`, this.id)
    }
  }


  /**
   * Encrpyt reports before storing them?
   * REVIEW: If so, do so in the read/writing service...not here
   *
   * @param str
   * @returns
   */
  async sha256(str: string) {
    const encoder = new TextEncoder();
    const encdata = encoder.encode(str);
    const buf = await crypto.subtle.digest("SHA-256", encdata);
    return Array.prototype.map.call(new Uint8Array(buf), x => (('00' + x.toString(16)).slice(-2))).join('');
  }

  /**
   * Called once all HTML elements have been created
   */
  ngAfterViewInit() {

  }

  /**
   * https://material.angular.io/components/autocomplete/examples#autocomplete-optgroup
   * @param value
   * @returns
   */
  private _filterRangers(value: string): RangerType[] {
    this.log.excessive(`_filterRangers  value changed: ${value} `, this.id)

    const filterValue = value.toLowerCase()
    this.entryDetailsForm.value.callsign = filterValue
    return this.rangers.filter((ranger1) => ranger1.callsign.toLowerCase().includes(filterValue))
  }

  /**
   * Transforms Settings Array into Form Array
   */
  initEntryForm() {

    if (!this.settings) {
      this.log.error(`this.settings was null in initEntryForm`, this.id)
      return
    }

    this.entryDetailsForm = this._formBuilder.group({
      // matches html's FormControlName="whatever"
      id: -1,
      callsign: [''],
      // team: ['T1'],
      location: this.locationParent,
      date: [new Date()],
      status: [this.settings.fieldReportStatuses[this.settings.defFieldReportStatus].status],
      notes: ['']
    })
  }

  initFilteredRangers() {
    this.filteredRangers = this.callsignCtrl.valueChanges.pipe(
      startWith(''),
      map(callsign => (callsign ? this._filterRangers(callsign) : this.rangers.slice())),
    )
  }

  /**
   * Reinitializes Form Array values - without recrating a new object
   *
   * https://angular.io/guide/reactive-forms#!#_reset_-the-form-flags
   * https://stackoverflow.com/a/54048660
   */
  resetEntryForm() {

    //Utility.getUsers()


    if (!this.settings) {
      this.log.error(`this.settings was null in initEntryForm`, this.id)
      return
    }
    this.log.verbose("Resetting form...", this.id)
    this.entryDetailsForm.reset() // this clears flags on the model like touched, dirty, etc.

    // !REVIEW: Should we reset locationParent to default location (from settings)?
    this.entryDetailsForm.setValue({
      id: -2,
      callsign: [''],
      //team: ['T0'],
      location: this.locationParent,
      date: [new Date()],
      status: [this.settings.fieldReportStatuses[this.settings.defFieldReportStatus]],
      notes: ['']
    })

    // !BUG: Need to reset callsign too: otherwise filtered to just this one!
    //this._filterRangers("")
    this.initFilteredRangers()
  }

  callsignChanged(callsign: string) { // Just serves timer for input field - post interaction
    this.log.excessive(`EntryForm CallsignChanged()`, this.id)

    this.callImg = this.document.getElementById("enter__Callsign-image")
    this.callInfo = this.document.getElementById("enter__Callsign-upshot")
    if (this.callImg && this.callInfo) {
      this.log.verbose(`EntryForm callsignChanged looking for ${callsign}`, this.id)

      let ranger = this.rangerService.getRanger(callsign)
      this.callImg.innerHTML = `<img style="height:60px; margin-bottom:-15px;" text="${ranger.fullName}" aria-hidden src="${this.settings.imageDirectory}rangers/${ranger.image}"/>`
      this.callInfo.innerHTML = `<span class="enter__Callsign-info">${ranger.fullName}<br> ${ranger.phone}<br>${ranger.rew ? ranger.rew : "No REW!"}</span>`

    } else {
      this.log.warn(`EntryForm CallsignChanged did not find enter__Callsign-image or enter__Callsign-upshot`, this.id)
    }
  }

  callsignCtrlChanged() { // NOTE: NEVER CALLED (my error, maybe does now..)!!!, so use workaround above...
    this.log.error(`callsignCtrlChanged() called!!!`, this.id)
    return
    let callSign: string = (this.document.getElementById("enter__Callsign-input") as HTMLInputElement).value
    if (callSign) {
      this.log.excessive(`CallsignCtrlChanged() call = ${callSign} `)
      this.callsignChanged(callSign)
    }
  }

  /**
   * Save entries to Reports data storage...
   *
   * Ensure we have obtained values from child components (timePicker & location) to persist/submit
   *
   * @param formData1
   *
   */
  onFormSubmit(formData: string): void {
    this.log.excessive(`Submit Form`, this.id)

    // NOTE: Afterward, we will just reset the form. Otherwise (if reusing the form) create a deep copy of the form-model:
    // result.entryDetailsForm = Object.assign({}, result.entryDetailsForm)

    /* FUTURE: Allow keywords, or search Notes for semicolon delimited tokens?
    get keywordsControls(): any {
    return (<FormArray>this.entryDetailsForm.get('keywords')).controls
    }   */

    let formDataJSON = JSON.stringify(this.entryDetailsForm.value)

    let newReport = this.fieldReportService.addfieldReport(formDataJSON)
    this.log.info(`Report id # ${newReport.id} has been added with: ${formDataJSON} `, this.id)

    if (this.submitInfo) {
      // Display fading confirmation to right of Submit button
      this.submitInfo.innerText = `Entry id # ${newReport.id} Saved. Data: ${formDataJSON}`
      Utility.resetMaterialFadeAnimation(this.submitInfo)
    }
    else {
      this.log.error("Submit Info field not found. Could not display report confirmation confirmation", this.id)
    }
    this.alert.OpenSnackBar(`Entry id # ${newReport.id} Saved: ${formDataJSON} `, `Entry id # ${newReport.id} `, 3000)

    this.resetEntryForm()  // std reset just blanks values, doesn't initialize the various form fields...
  }

  ngOnDestroy() {
    //this.locationChange?.unsubscribe()
    this.rangersSubscription?.unsubscribe()
    this.settingsSubscription?.unsubscribe()
    //this.timeSubscription?.unsubscribe()
  }
}
