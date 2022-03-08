import { DOCUMENT } from '@angular/common'
import { Component, Inject, OnInit, ViewChild, isDevMode, Input, NgZone, AfterViewInit, OnDestroy } from '@angular/core';
import { ThemePalette } from '@angular/material/core';
import { FormBuilder, FormControl, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms'
import { HttpClient } from '@angular/common/http';

import { MatSnackBar } from '@angular/material/snack-bar'
import { Observable, debounceTime, map, startWith, switchMap, subscribeOn } from 'rxjs'
import { FieldReport } from './location.interface'
import { AlertsComponent } from '../alerts/alerts.component'
import { FieldReportService, FieldReportStatusType, RangerService, LogService, RangerType, SettingsService, TeamService } from '../shared/services/'

import * as dayjs from 'dayjs' // https://day.js.org/docs/en/ or https://github.com/dayjs/luxon/

import * as P from '@popperjs/core';
//import { createPopper } from '@popperjs/core';
import type { StrictModifiers } from '@popperjs/core';

//import { faMapMarkedAlt, faInfoCircle } from '@fortawesome/free-solid-svg-icons';
//import { mdiAccount, mdiInformationOutline } from '@mdi/js';
//import { lookupCollections, locate } from '@iconify/json'; //https://docs.iconify.design/icons/all.html vs https://docs.iconify.design/icons/icons.html
import { DomSanitizer } from '@angular/platform-browser';
//import { MatIconRegistry } from '@angular/material/icon';// https://material.angular.io/components/icon/examples


// IDEA: use https://material.angular.io/components/badge/ ???

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
export class IconComponent {
  @Input('path') data: string = 'M13,14H11V10H13M13,18H11V16H13M1,21H23L12,2L1,21Z';
}



@Component({
  selector: 'rangertrak-entry',
  templateUrl: './entry.component.html',
  styleUrls: ['./entry.component.scss'],
  providers: [RangerService, FieldReportService, SettingsService, TeamService]
})
export class EntryComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('timePicker') timePicker: any; // https://blog.angular-university.io/angular-viewchild/
  @Input('path') data: string = 'M13,14H11V10H13M13,18H11V16H13M1,21H23L12,2L1,21Z' // dupl of that above
  private id = 'Entry Form'
  public eventInfo = ''
  public dateNow = Date.now()

  myForm!: FormGroup
  //createPopper<StrictModifiers>(referenceElement, popperElement, options)
  locationFrmGrp!: FormGroup

  //; faMapMarkedAlt = faMapMarkedAlt
  // faInfoCircle = faInfoCircle
  //mdiAccount: string = mdiAccount
  //  mdiInformationOutline: string = mdiInformationOutline



  // --------------- ENTRY FORM -----------------
  // control creation in a component class = immediate access to listen for, update, and validate state of the form input: https://angular.io/guide/reactive-forms#adding-a-basic-form-control
  public entryDetailsForm!: FormGroup
  callsignCtrl = new FormControl()
  // addressCtrl = new FormControl()  // TODO: No formControlName="addressCtrl"!!!!
  filteredRangers: Observable<RangerType[]>
  rangers: RangerType[] = []
  fieldReportStatuses: FieldReportStatusType[] = []
  settings

  submitInfo: HTMLElement | null = null
  callInfo: HTMLElement | null = null
  alert: any

  button: HTMLButtonElement | undefined
  tooltip: HTMLHtmlElement | undefined
  popperInstance: any //typeof P.createPopper | undefined

  // --------------- DATE-TIME PICKER -----------------

  // https://github.com/angular/components/issues/5648
  // https://ng-matero.github.io/extensions/components/datetimepicker/overview (nice)
  // https://vlio20.github.io/angular-datepicker/timeInline (unused)
  // https://h2qutc.github.io/angular-material-components - IN USE HERE!
  public date: dayjs.Dayjs = dayjs()


  /*  It looks like you're using the disabled attribute with a reactive form directive.
   If you set disabled to true when you set up this control in your component class,
   the disabled attribute will actually be set in the DOM for
    you. We recommend using this approach to avoid 'changed after checked' errors.

    Example:
    form = new FormGroup({
      first: new FormControl({value: 'Nancy', disabled: true}, Validators.required),
      last: new FormControl('Drew', Validators.required)
    });
  */
  public disabled = false;
  public showSpinners = true;
  public showSeconds = false; // only affects display in timePicker
  public touchUi = false;
  public enableMeridian = false; // 24 hr clock

  minDate!: dayjs.Dayjs | null
  maxDate!: dayjs.Dayjs | null
  public stepHour = 1;
  public stepMinute = 1;
  public stepSecond = 1;
  public color: ThemePalette = 'primary';
  disableMinute = false
  hideTime = false
  dateCtrl = new FormControl(new Date()) //TODO: Still need to grab the result during submit...!

  // https://github.com/h2qutc/angular-material-components
  /* following causes:  No suitable injection token for parameter '_formBuilder' of class 'EntryComponent'.
  Consider using the @Inject decorator to specify an injection token.(-992003)
entry.component.ts(77, 26): This type does not have a value, so it cannot be used as injection token.
*/

  // TODO: Consider for tracking ValueChanges: https://angular.io/guide/observables-in-angular#reactive-forms

  constructor(
    private _formBuilder: FormBuilder,
    private rangerService: RangerService,
    private fieldReportService: FieldReportService,
    private log: LogService,
    private settingsService: SettingsService,
    // private teamService: TeamService,
    private _snackBar: MatSnackBar,
    //iconRegistry: MatIconRegistry, sanitizer: DomSanitizer, // for svg mat icons
    private http: HttpClient,
    private zone: NgZone,
    @Inject(DOCUMENT) private document: Document) {   //, private service: PostService) {

    // https://fonts.google.com/icons && https://material.angular.io/components/icon
    // Note that we provide the icon here as a string literal here due to a limitation in
    // Stackblitz. If you want to provide the icon from a URL, you can use:
    //iconRegistry.addSvgIcon('thumbs-up', sanitizer.bypassSecurityTrustResourceUrl('icon.svg'))
    //iconRegistry.addSvgIconLiteral('thumbs-up', sanitizer.bypassSecurityTrustHtml(THUMBUP_ICON))

    // REVIEW: Min/Max times ignored?!
    this._setMinDate(10) // no times early than 10 hours ago
    this._setMaxDate(1)  // no times later than 1 hours from now
    this.rangers = rangerService.GetRangers() // TODO: or getActiveRangers?!

    this.alert = new AlertsComponent(this._snackBar, this.document)// TODO: Use Alert Service to avoid passing along doc & snackbar properties!!!!
    if (this.rangers.length < 1) {
      this.alert.Banner('Welcome! First load your rangers - at the bottom of the Rangers page.', 'Go to Rangers page', 'Ignore')
      //this.alert.OpenSnackBar(`No Rangers exist. Please go to Advance section at bottom of Ranger page!`, `No Rangers yet exist.`, 2000)
      //TODO: Force navigation to /Rangers?
    }

    this.fieldReportService = fieldReportService
    this.fieldReportStatuses = settingsService.getFieldReportStatuses() // TODO: Need to update if user modified settings page: SUBSCRIBE!! or do every redisplay?? Allowed to change midstream?! (Add only)
    this.settings = SettingsService.Settings

    // NOTE: workaround for onChange not working...
    this.callsignCtrl.valueChanges.pipe(debounceTime(700)).subscribe(newCall => this.CallsignChanged(newCall))


    // https://material.angular.io/components/autocomplete/examples#autocomplete-overview; also Ang Dev with TS, pg 140ff
    this.filteredRangers = this.callsignCtrl.valueChanges.pipe(
      startWith(''),
      map(callsign => (callsign ? this._filterRangers(callsign) : this.rangers.slice())),
    )
    log.verbose(`constructor: ranger ${this.filteredRangers}`, this.id) //JSON.stringify

    this.eventInfo = `Event: ; Mission: ; Op Period: ; `

    // OLD:  map(ranger => (ranger ? this._filterRangers(ranger) : this.rangers.slice())),
    // NEW: map(callsign => (callsign ? this._filterRangers(callsign) : this.rangers.slice())),
  }


  ngOnInit(): void {
    this.log.info(`EntryForm initialization with development mode ${isDevMode() ? "" : "NOT "}enabled`, this.id)
    this.log.verbose("EntryComponent - ngOnInit - Use settings to fill form", this.id)

    // https://angular.io/api/router/Resolve - following fails as SettingsComponent has yet to run...
    // or even https://stackoverflow.com/questions/35655361/angular2-how-to-load-data-before-rendering-the-component
    this.log.info(`Running ${this.settings.application} version ${this.settings.version}`, this.id)  // verifies Settings has been loaded

    /* i.e., entryDetailsForm probably constructed at wrong time?!
    Move the component creation to ngOnInit hook
    error can show up when you are working with ViewChild, and execute code in AfterViewInit.
    https://flexiple.com/angular/expressionchangedafterithasbeencheckederror/
    the binding expression changes after being checked by Angular during the change detection cycle

Error: NG0100: ExpressionChangedAfterItHasBeenCheckedError: Expression has changed after it was checked. Previous value: 'null'. Current value: '{
 "id": -1,
 "callsign": "",
 "team": "T1",
 [...]
 */

    this.entryDetailsForm = this._formBuilder.group({
      id: -1,
      callsign: [''],
      team: ['T1'],
      locationFrmGrp: this.initLocation(),
      date: [new Date()],
      status: [this.fieldReportStatuses[this.settings.defRangerStatus].status],
      note: ['']
    })

    // subscribe to addresses value changes
    this.entryDetailsForm.controls['locationFrmGrp'].valueChanges.subscribe(x => {
      this.log.verbose(`Subscription to locationFrmGrp got: ${x}`, this.id);
    })

    this.submitInfo = this.document.getElementById("enter__Submit-info")

    if (!this.settings.debugMode) {
      this.displayHide("enter__frm-reguritation")
    }

    this.callsignCtrl.valueChanges.pipe(debounceTime(700)).subscribe(newCall => this.CallsignChanged(newCall))

    // These elements got moved to <rangertrak-location> element!
    //this.button = document.querySelector('#button') as HTMLButtonElement
    //this.tooltip = document.querySelector('#tooltip') as HTMLHtmlElement

    // https://angular.io/guide/practical-observable-usage#type-ahead-suggestions

    // https://popper.js.org/docs/v2/constructors/
    // Popper: Invalid reference or popper argument provided. They must be either a DOM element or virtual element.
    // this.popperInstance = P.createPopper(this.button, this.tooltip)
    /* , {
       modifiers: [
         {
           name: 'offset',
           options: {
             offset: [0, 8],
           },
         },
       ],
     }) */
    this.date = dayjs()
    this.log.verbose(` ngOnInit completed`, this.id)
  }


  ngAfterViewInit() {
    // OK to register for form events here
  }

  initLocation() { // TODO: Shouldn't this be in location.component.ts?!

    this.locationFrmGrp = this._formBuilder.group({
      address: [''], //, Validators.required],
      lat: [this.settings.defLat],
      lng: [this.settings.defLng]
    })

    this.locationFrmGrp.valueChanges.pipe(debounceTime(500)).subscribe(locationFrmGrp => this.locationChanged(locationFrmGrp))
    let addr = this.locationFrmGrp.get("address")
    if (addr) {
      addr.valueChanges.pipe(debounceTime(500)).subscribe(locationFrmGrp => this.locationChanged(locationFrmGrp))
      this.log.verbose("Made reservations!", this.id)
    } else {
      console.warn("could NOT Make reservations")
    }
    this.locationFrmGrp.valueChanges.pipe(debounceTime(500)).subscribe(locationFrmGrp => this.locationChanged(locationFrmGrp))
    return this.locationFrmGrp
  }

  private _filterRangers(value: string): RangerType[] {
    this.log.verbose(`_filterRangers  value changed: ${value}`, this.id)

    const filterValue = value.toLowerCase()
    this.entryDetailsForm.value.callsign = filterValue
    return this.rangers.filter((ranger1) => ranger1.callsign.toLowerCase().includes(filterValue))
    /* NEW:
      this.entryDetailsForm.value.callsign = filterValue
      return this.rangers.filter((ranger1) => ranger1.callsign.toLowerCase().includes(filterValue))
    */
    /* OLD:
      this.entryDetailsForm.controls['ranger'].setValue(filterValue) // TODO: MAT input field not automatically set into entryForm
      return this.rangers.filter(ranger => ranger.callsign.toLowerCase().includes(filterValue));
    */
  }

  // this.myReactiveForm.reset(this.myReactiveForm.value)
  // https://angular.io/guide/reactive-forms#!#_reset_-the-form-flags
  // https://stackoverflow.com/a/54048660
  resetForm() {
    this.log.verbose("Resetting form...", this.id)

    this.entryDetailsForm = this._formBuilder.group({
      id: -2,
      callsign: [''],
      team: ['T0'],
      location: this.initLocation(),
      date: [new Date()],  // TODO: reset dateCtrl instead?!
      status: [this.fieldReportStatuses[this.settings.defRangerStatus]],
      note: ['']
    })
    // Allow getting new OnChangeUpdates - or use the subscription?!
    this.entryDetailsForm.markAsPristine();
    this.entryDetailsForm.markAsUntouched();
  }

  locationChanged(loc: FormGroup) {
    this.log.verbose(`locationChanged  ###########################`, this.id)
  }


  // TODO: NOt working yet...
  CallsignChanged(callsign: string) { // Just serves timer for input field - post interaction
    this.log.verbose(`EntryForm CallsignChanged()`, this.id)

    this.callInfo = this.document.getElementById("enter__Callsign-upshot")
    if (this.callInfo) {
      this.log.verbose(`EntryForm CallsignChanged looking for ${callsign}`, this.id)
      //let ranger = this.rangers[this.findIndex(callsign)]
      let ranger = this.rangerService.getRanger(callsign)  // REVIEW is this.rangers here & service in sync?
      this.callInfo.innerHTML = `<span>${ranger.callsign} </span> | <small> ${ranger.licensee} | ${ranger.phone}</small > `
      //< img class= "enter__Callsign-img" aria-hidden src = "${ranger.image}" height = "50" >
    } else {
      this.log.warn(`EntryForm CallsignChanged did not find enter__Callsign-upshot`, this.id)
    }
  }

  CallsignCtrlChanged() { // NOTE: NEVER CALLED (my error, maybe does now..)!!!, so use workaround above...
    this.log.error(`callsignCtrlChanged() called!!!!!!!!!!!!!!!!!!`, this.id)
    return
    let callSign: string = (this.document.getElementById("enter__Callsign-input") as HTMLInputElement).value
    if (callSign) {
      this.log.verbose(`CallsignCtrlChanged() call= ${callSign}`)
      this.CallsignChanged(callSign)
    }

    // TODO: update #enter__Callsign-upshot
  }

  /*
    Ideas for resetting fade: after Submit button, fade the entry details
    https://www.sitepoint.com/css3-animation-javascript-event-handlers/
    https://css-tricks.com/controlling-css-animations-transitions-javascript/
    https://www.smashingmagazine.com/2013/04/css3-transitions-thank-god-specification/#a2
    https://stackoverflow.com/questions/6268508/restart-animation-in-css3-any-better-way-than-removing-the-element
    https://css-tricks.com/restart-css-animation/
    https://gist.github.com/paulirish/5d52fb081b3570c81e3a
  */
  reset_animation(element: HTMLElement) {
    this.log.verbose(`Fade Animation reset`, this.id)
    element.style.animation = 'none';
    element.offsetHeight; // trigger reflow
    element.style.animation = "";
  }

  // save(model: FieldReport) {
  // call API to save FieldReport
  // this.log.verbose(model, this.id);
  //}

  onFormSubmit(formData1: string): void {
    this.log.verbose(`Form submited`, this.id)
    //this.date=this.dateCtrl.value // TODO:
    this.entryDetailsForm.value.date = this.dateCtrl.value
    let formData = JSON.stringify(this.entryDetailsForm.value)

    let newReport = this.fieldReportService.addfieldReport(formData)
    this.log.info(`Report id # ${newReport.id} has been added with: ${formData} `, this.id)

    if (this.submitInfo) {
      // Display fading confirmation to right of Submit button
      this.submitInfo.innerText = `Entry id # ${newReport.id} Saved. ${formData}`
      this.reset_animation(this.submitInfo)
    }
    else {
      this.log.error("Submittion info field not found", this.id)
    }
    this.alert.OpenSnackBar(`Entry id # ${newReport.id} Saved: ${formData}`, `Entry id # ${newReport.id}`, 2000)


    this.resetForm()  // std reset just blanks values, doesn't initialize them...
  }



  /*
  FUTURE: Allow entry of keywords
  get keywordsControls(): any {
  return (<FormArray>this.entryDetailsForm.get('keywords')).controls
  }   */





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



  // --------------- DATE-TIME PICKER -----------------
  toggleMinDate(evt: any) {
    if (evt.checked) {
      this._setMinDate();
    } else {
      this.minDate = null;
    }
  }

  toggleMaxDate(evt: any) {
    if (evt.checked) {
      this._setMaxDate();
    } else {
      this.maxDate = null;
    }
  }

  closePicker() {
    this.timePicker.cancel();
  }

  private _setMinDate(hours: number = 10) {
    const now = dayjs();
    this.minDate = now.subtract(hours, 'hours');
  }

  private _setMaxDate(hours: number = 10) {
    const now = dayjs();
    this.maxDate = now.add(hours, 'hours');
  }

  ngOnDestroy() {
    //this.fieldReportsSubscription$.unsubscribe()
  }
}
