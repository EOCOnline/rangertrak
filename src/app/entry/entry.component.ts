import {
  debounceTime, map, Observable, startWith, subscribeOn, Subscription, switchMap
} from 'rxjs'

import { CommonModule, DOCUMENT } from '@angular/common'
import { HttpClient } from '@angular/common/http'
import {
  AfterViewInit, Component, ElementRef, EventEmitter, Inject, Input, isDevMode, NgZone, OnDestroy,
  OnInit, Output, signal, ViewChild,
  ChangeDetectionStrategy
} from '@angular/core'
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms'
import { form, FormField } from '@angular/forms/signals'
import { SignalFormControl } from '@angular/forms/signals/compat'
import { ThemePalette } from '@angular/material/core'
import { MatSnackBar } from '@angular/material/snack-bar'

// Specific paths, not the '../shared/' barrel - see the note in location.component.ts.
import { Utility } from '../shared/utility'
import { AlertsComponent } from '../shared/alerts/alerts.component'
import { PageComponent } from '../shared/page/page.component'
// Direct path, not the shared/services barrel - see the note in rangers.component.ts.
import { RangerPhotoService } from '../shared/services/ranger-photo.service'
import { TimePickerComponent } from '../shared/time-picker/time-picker.component'
import { DDToDDM } from '../shared/mapping/coordinate'
import {
  FieldReportService, FieldReportStatusType, LocationType, LogService, RangerService, RangerType,
  SettingsService, SettingsType, statusColorValue, undefinedAddressFlag, undefinedLocation
} from '../shared/services/'
//import { LocationComponent } from './location.component'

import { MATERIAL_IMPORTS } from '../material-imports'
import { LocationComponent } from './location.component'
import { MiniLMapComponent } from './mini-lmap.component'

// TODO: IDEA: use https://material.angular.io/components/badge/ ???


@Component({
  selector: 'rangertrak-entry',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormField,
    ...MATERIAL_IMPORTS,
    PageComponent,
    TimePickerComponent,
    LocationComponent,
    MiniLMapComponent,
  ],
  templateUrl: './entry.component.html',
  styleUrls: ['./entry.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  // BUG-2 (2026-08-19): this used to be
  //   providers: [RangerService, FieldReportService, SettingsService]
  // All three are @Injectable({providedIn:'root'}). Re-declaring them here gave Entry its
  // OWN instances, so submitted reports went into a private FieldReportService while the
  // Reports page read the root one - which still held its startup-empty list. The page
  // looked empty until a full reload made every instance re-read localStorage.
  //, TeamService
  // https://angular.io/guide/architecture-services#providing-services: 1 or multiple instances?!
  // per https://angular.io/guide/singleton-services
})
export class EntryComponent implements OnInit, AfterViewInit, OnDestroy {
  // following is never referenced: not really in use?!
  @ViewChild('timePicker') timePicker: any; // https://blog.angular-university.io/angular-viewchild/

  // Sprint D keyboard-first pass: one mechanism covers both initial-load focus and
  // post-submit focus restore (see ngAfterViewInit()/resetEntryForm() below), rather than
  // mixing cdkFocusInitial with a separate manual path.
  @ViewChild('callsignInput') private callsignInputRef?: ElementRef<HTMLInputElement>

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

  // Keyboard-first tab order (Sprint D), Sprint H revision: these used to be five
  // separate hardcoded literals in the template (21, 22, 23, 24, 25, 26), each
  // silently assuming Location's field count was fixed at 19. Adding MGRS/UTM grew
  // that count, so the whole chain is now computed from one base plus each field's
  // own slot count - correct once, instead of five places each hardcoding an offset.
  callsignTabIndex = 1
  locationTabIndexStart = 2
  dateTabIndex = this.locationTabIndexStart + LocationComponent.TAB_SLOT_COUNT
  timeTabIndex = this.dateTabIndex + 1
  statusTabIndex = this.timeTabIndex + 1
  notesTabIndex = this.statusTabIndex + 1
  resetTabIndex = this.notesTabIndex + 1
  submitTabIndex = this.resetTabIndex + 1

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
  // Sprint D: id/location/date/notes never touch Material controls that lack [formField]
  // support, so they're a native signal form. callsign (mat-autocomplete) and status
  // (mat-radio-group) don't support [formField] in the installed Angular Material
  // (angular/components#32072, still open) - those two stay classic FormControls, upgraded
  // to SignalFormControl for signal-side readability, living in their own small FormGroup
  // bound the old way (formControlName) in the template. See plan §3 / Context.
  // Real initial value (location: this.locationParent) is set by initEntryForm(), called
  // from ngOnInit() - NOT here, since this field initializer runs before locationParent's
  // own declaration below is assigned.
  private entryModel = signal({ id: -1, location: undefinedLocation, date: new Date(), notes: '' })
  public entryForm = form(this.entryModel)

  // Constructed once, here, as a field initializer - like entryForm above. SignalFormControl's
  // constructor needs an injection context (NG0203), which a field initializer is but a method
  // called from ngOnInit() is not. initEntryForm()/resetAll() below set VALUES on these existing
  // controls rather than constructing new ones. Initial status is corrected once settings
  // arrive - see initEntryForm().
  public entryControlsForm = new FormGroup({
    status: new SignalFormControl('')
  })
  // The one and only callsign control. It drives the mat-autocomplete's filtering AND is what
  // gets saved - see BUG-1 in entry.component.html. Typed to string so .value needs no cast.
  callsignCtrl = new FormControl<string>('', { nonNullable: true })
  //readonly imagePath = "'./assets/imgs/rangers/'" // not yet used by *.html

  // Get location events from <location> component
  //public locationChange: Subscription
  public locationParent = undefinedLocation

  // E-48(1): bumped on every reset (see resetAll() below) so LocationComponent can tell
  // "a fresh report started" apart from "the position changed" - see its own comment.
  formGeneration = 0

  minDate = new Date()

  submitInfo: HTMLElement | null = null
  callImg: HTMLElement | null = null
  callInfo: HTMLElement | null = null

  // https://github.com/h2qutc/angular-material-components
  // TODO: Consider for tracking ValueChanges: https://angular.io/guide/observables-in-angular#reactive-forms
  // https://material.angular.io/components/autocomplete/examples#autocomplete-overview; also Ang Dev with TS, pg 140ff; Must be in OnInit, once component properties initialized


  constructor(
    private rangerService: RangerService,
    private photos: RangerPhotoService,
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

    // patch entryForm's model - as THAT is what gets saved with on form submit
    this.entryModel.update(m => ({ ...m, location: newLocation }))
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
    this.entryModel.update(m => ({ ...m, date: newTime }))
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
    this.callsignInputRef?.nativeElement.focus()
  }

  /**
   * https://material.angular.io/components/autocomplete/examples#autocomplete-optgroup
   * @param value
   * @returns
   */
  private _filterRangers(value: string): RangerType[] {
    this.log.excessive(`_filterRangers  value changed: ${value} `, this.id)

    const filterValue = value.toLowerCase()
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

    this.entryModel.set({
      id: -1,
      location: this.locationParent,
      date: new Date(),
      notes: ''
    })
    this.callsignCtrl.setValue('')
    this.entryControlsForm.setValue({
      status: this.settings.fieldReportStatuses[this.settings.defFieldReportStatus].status
    })
  }

  /**
   * Combined value across both form halves - split only because of the mat-autocomplete/
   * mat-radio-group [formField] interop gap (see entryControlsForm above), not a
   * meaningful data boundary. Used for both submission and the debug regurgitation panel.
   */
  mergedFormValue() {
    return {
      ...this.entryModel(),
      callsign: this.callsignCtrl.value,
      status: this.entryControlsForm.value.status
    }
  }

  /**
   * Stored status colour -> a CSS colour for the status radio labels. Semantic keys resolve
   * to their --rt-status-* token (which carries light/dark); a custom colour passes through.
   * See status-color.ts.
   */
  statusColor(stored: string): string {
    return statusColorValue(stored)
  }

  /** Combined validity across both form halves - drives Submit's [disabled] and the debug panel. */
  formValid() {
    return this.entryForm().valid() && this.entryControlsForm.valid && this.callsignCtrl.valid
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
    this.resetAll()

    // !BUG: Need to reset callsign too: otherwise filtered to just this one!
    //this._filterRangers("")
    this.initFilteredRangers()

    // After the reset values above have settled, not before - restores focus to callsign
    // for the next entry, same as the initial-load focus in ngAfterViewInit().
    this.callsignInputRef?.nativeElement.focus()
  }

  /**
   * Resets all three pieces of the split form together - the native signal form
   * (id/location/date/notes), the standalone callsignCtrl, and the classic FormGroup holding
   * status (both kept classic for the mat-autocomplete/mat-radio-group interop gap - see
   * entryControlsForm above). One helper covering all of them so a future edit cannot reset
   * some and forget the rest.
   */
  private resetAll() {
    // !REVIEW: Should we reset locationParent to default location (from settings)?
    this.entryModel.set({
      id: -2,
      location: this.locationParent,
      date: new Date(),
      notes: ''
    })
    this.callsignCtrl.reset('')
    this.entryControlsForm.reset({
      status: this.settings.fieldReportStatuses[this.settings.defFieldReportStatus].status
    })
    this.formGeneration++
  }

  callsignChanged(callsign: string) { // Just serves timer for input field - post interaction
    this.log.excessive(`EntryForm CallsignChanged()`, this.id)

    this.callImg = this.document.getElementById("enter__Callsign-image")
    this.callInfo = this.document.getElementById("enter__Callsign-upshot")
    if (this.callImg && this.callInfo) {
      // An empty callsign is the normal state right after a reset (see resetAll()) - not an
      // "unknown" one. Routing it through getRanger() logged a false GetRanger error on
      // every single submit, once callsignCtrl started actually being reset (BUG-1 fix,
      // 2026-08-19) instead of being silently orphaned as it was before.
      if (!callsign) {
        this.callImg.innerHTML = ''
        this.callInfo.innerHTML = ''
        return
      }

      this.log.verbose(`EntryForm callsignChanged looking for ${callsign}`, this.id)

      let ranger = this.rangerService.getRanger(callsign)

      // E-38. This is the photo's whole purpose: confirming *who* a report is about, while
      // it is being entered. Order: a photograph stored on this device (D-35 - never in the
      // repo), then whatever the roster names, then the generic silhouette. The silhouette
      // matters because the previous fallback was a broken-image icon.
      const localPhoto = this.photos.photoUrl(ranger.callsign)
      const src = localPhoto
        || (ranger.image
          ? `${this.settings.imageDirectory}rangers/${ranger.image}`
          : `${this.settings.imageDirectory}rangers/androgynous.svg`)

      this.callImg.innerHTML = `<img style="height:60px; margin-bottom:-15px;" alt="Photo of ${ranger.fullName || ranger.callsign}" src="${src}"/>`
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
  onFormSubmit(): void {
    this.log.excessive(`Submit Form`, this.id)

    // NOTE: Afterward, we will just reset the form. Otherwise (if reusing the form) create a deep copy of the form-model:
    // result.entryDetailsForm = Object.assign({}, result.entryDetailsForm)

    /* FUTURE: Allow keywords, or search Notes for semicolon delimited tokens?
    get keywordsControls(): any {
    return (<FormArray>this.entryDetailsForm.get('keywords')).controls
    }   */

    let formDataJSON = JSON.stringify(this.mergedFormValue())

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
