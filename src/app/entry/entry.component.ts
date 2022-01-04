import { DOCUMENT, JsonPipe } from '@angular/common'
import { AfterViewInit, Component, Inject, OnInit, isDevMode, ComponentFactoryResolver } from '@angular/core'
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms'
import { MDCSlider } from '@material/slider'
import { MatSnackBar } from '@angular/material/snack-bar'
import { Observable, pipe } from 'rxjs'
import { debounceTime, distinctUntilChanged, map, startWith, switchMap } from 'rxjs/operators'

import { SettingsComponent } from '../settings/settings.component'
import { FieldReportService, FieldReportStatuses, RangerService, RangerType, TeamService, TeamType } from '../shared/services/'
import { SELECT_PANEL_INDENT_PADDING_X } from '@angular/material/select/select'
//import { Console } from 'console';

//@use "@material/slider/styles"

@Component({
  selector: 'rangertrak-entry',
  templateUrl: './entry.component.html',
  styleUrls: ['./entry.component.scss'],
  providers: [RangerService, FieldReportService, TeamService]
})
export class EntryComponent implements OnInit, AfterViewInit {

  callsignCtrl = new FormControl()
  filteredRangers: Observable<RangerType[]> //| null
  rangers: RangerType[] = []
  fieldReportService
  fieldReportStatuses
  setting = SettingsComponent.AppSettings
  entryDetailsForm!: FormGroup
  smartInput = new FormControl({ value: '', disabled: true })
  smartDisabled = true
  numFakes = 30
  //const fakeSlider = new MDCSlider(document.querySelector('.mdc-slider'));
  submitInfo: HTMLElement | null = null
  submitButton: HTMLElement | null = null

  constructor(
    private formBuilder: FormBuilder,
    private _snackBar: MatSnackBar,
    rangerService: RangerService,
    fieldReportService: FieldReportService,
    teamService: TeamService,
    @Inject(DOCUMENT) private document: Document) {   //, private service: PostService) {

    this.rangers = rangerService.getRangers() // TO DO: or getActiveRangers?!
    this.fieldReportService = fieldReportService
    this.fieldReportStatuses = FieldReportStatuses

    this.smartInput.valueChanges.pipe(debounceTime(500)).subscribe(smartest => this.getABCFromServer(smartest))

    // https://material.angular.io/components/autocomplete/examples#autocomplete-overview
    this.filteredRangers = this.callsignCtrl.valueChanges.pipe(
      startWith(''),
      map(callsign => (callsign ? this._filterRangers(callsign) : this.rangers.slice())),
    )
  }

  private _filterRangers(value: string): RangerType[] {
    const filterValue = value.toLowerCase()
    this.entryDetailsForm.value.callsign = filterValue // TODO: Have MAT input field auto sync w/ callsign
    return this.rangers.filter((ranger1) => ranger1.callsign.toLowerCase().includes(filterValue))
  }

  getABCFromServer(myVal: string) {
    let candidates = ["Einstein", "Picasso", "Aunt Mabel", "Ponzi"]
    console.log(`The mysterious person is ${myVal} or aka ${candidates[Math.floor(Math.random() * candidates.length)]}`)
  }

  ngOnInit(): void {
    // console.log(`EntryForm test started at ${Date()} with development mode ${isDevMode()?"":"NOT"} enabled`)

    this.entryDetailsForm = this.formBuilder.group({
      id: -1,
      callsign: ['ngOnInitCallSign'],  // TODO: Not tied to the material design input field...
      team: ['T1'],
      address: ['default location (ngOnInit)'],
      lat: [this.setting.DEF_LAT, Validators.required], //Validators.minLength(4)
      long: [this.setting.DEF_LONG, Validators.required], //Validators.minLength(4)
      date: [new Date()],
      status: [FieldReportStatuses[0]],   // TODO: Allow changing list & default of statuses in settings?!
      note: ['']
    })

    this.submitInfo = this.document.getElementById("enter__Submit-info")
    this.submitButton = this.document.getElementById("enter__Submit-button")

    if (this.submitButton) {
      // button click event
      this.submitButton.addEventListener("click", this.ToggleAnimation, false);
    }
    else {
      console.log("NO submitButton found")
    }
    if (this.submitInfo) {
      this.PrefixedEvent(this.submitInfo, "AnimationStart");
      this.PrefixedEvent(this.submitInfo, "AnimationIteration");
      this.PrefixedEvent(this.submitInfo, "AnimationEnd");
    }
    else {
      console.log("NO submitInfo found")
    }

    this.smartDisabled = !isDevMode()
    console.log(`EntryForm ngOnInit completed at ${Date()}`)
  }

  // FUTURE: provider nicer time picker: https://www.freakyjolly.com/angular-material-109-datepicker-timepicker-tutorial/#Only_Show_Timepicker
  /*
    FUTURE: Allow entry of keywords
    get keywordsControls(): any {
    return (<FormArray>this.entryDetailsForm.get('keywords')).controls
  }   */

  openSnackBar(message: string, action: string, duration = 0) {
    this._snackBar.open(message, action, { duration: duration })
  }

  fade(element: HTMLElement, duration = 3, show = false) {
    console.log(`Start fade Animation at ${Date()}`)

    //this.reset_animation(element)
    //this.sleep(2000)

    //console.log(`Starting fade Animation at ${Date()}`)

    element.style.transitionDuration = "0s"
    // https://developer.mozilla.org/en-US/docs/Web/CSS/transition-timing-function#values
    element.style.transitionTimingFunction = "easeInExpo" // https://easings.net/
    element.style.transitionDelay = "2s"

    if (show) {
      element.style.opacity = "0"
      element.style.transitionDuration = duration + "s"
      element.style.opacity = "1" // Fade in
    } else {
      element.style.opacity = "1" // Fade in
      element.style.transitionDuration = duration + "s"
      element.style.opacity = "0"
    }

    // https://www.sitepoint.com/css3-animation-javascript-event-handlers/
    //element.addEventListener("animationend", this.AnimationListener, true);

    // animation listener events from https://www.sitepoint.com/css3-animation-javascript-event-handlers/
    /*this.PrefixedEvent(element, "AnimationStart");
    this.PrefixedEvent(element, "AnimationIteration");
    this.PrefixedEvent(element, "AnimationEnd");
    */
  }

  sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // from https://www.sitepoint.com/css3-animation-javascript-event-handlers/
  PrefixedEvent(element: HTMLElement, type: string, callback = this.AnimationListener) {
    console.log(`PrefixedEvent at ${Date()}`)

    const pfx = ["webkit", "moz", "MS", "o", ""];
    for (var p = 0; p < pfx.length; p++) {
      if (!pfx[p]) type = type.toLowerCase();
      element.addEventListener(pfx[p] + type, callback, false);
    }
  }

  AnimationListener(e: any) { //arg0: string, AnimationListener: any, arg2: boolean) {
    // https://www.sitepoint.com/css3-animation-javascript-event-handlers/
    // called whenever an animation event occurs. An event object is passed as a single argument.
    // As well as the standard properties and methods, it also provides:
    // animationName: the CSS3 animation name (i.e. flash)
    // elapsedTime: the time in seconds since the animation started.

    /* so...
      example: https://blogs.sitepointstatic.com/examples/tech/animation-api/index.html
      if (e.animationName == "flash" &&
        e.type.toLowerCase().indexOf("animationend") >= 0) {
          ...
      }
    */
    // When the animation ends, the “enable” class is removed so the button can be clicked again.

    this.LogEvent("====  Animation Listener '" + e.animationName + "' type '" + e.type + "' at " + e.elapsedTime.toFixed(2) + " seconds");

    if (e.type.toLowerCase().indexOf("animationend") >= 0) {
      this.LogEvent("Stopping animation...");
      this.ToggleAnimation(e);
    }

    //console.log(`Animation ended. Reset it  at ${Date()}`)
    //let confirm = this.document.getElementById("enter__Submit-confirm") //enter__Submit-confirm
    //if (this.confirm) { this.reset_animation(this.confirm) }

    //throw new Error('Function not implemented.')
  }


  /*
  When the button is clicked, a class of "enable" is applied to the element which starts a CSS3 animation. Animation start, iteration and end events are captured and logged. When animationend is encountered, the "enable" class is removed.*/

  // start/stop animation
  ToggleAnimation(e: Event) {
    console.log(`================ ToggleAnimation at ${Date()}`)
    this.submitInfo = this.document.getElementById("enter__Submit-info")
    //BUG: TypeError: Cannot read properties of undefined (reading 'getElementById')
    this.submitButton = this.document.getElementById("enter__Submit-button")

    if (this.submitInfo) {
      var on = (this.submitInfo.className != "");
      this.LogEvent("==== Animation is " + (on ? "disabled.\n" : "enabled."));
      if (this.submitButton) {
        this.submitButton.textContent = "Click to " + (on ? "start" : "stop") + " animation";
      }else {
        console.log("NO submitButton found!!!")
      }
      this.submitInfo.className = (on ? "" : "enable");
      if (e) e.preventDefault();
    }else {
      console.log("NO submitInfo found!!!")
    }
  };

  // log event in the console
  LogEvent(msg: string) {
    console.log(msg)
    /*
    log.textContent += msg + "\n";
    var ot = log.scrollHeight - log.clientHeight;
    if (ot > 0) log.scrollTop = ot;
    */
  }


  // https://css-tricks.com/controlling-css-animations-transitions-javascript/
  // https://www.smashingmagazine.com/2013/04/css3-transitions-thank-god-specification/#a2
  // https://stackoverflow.com/questions/6268508/restart-animation-in-css3-any-better-way-than-removing-the-element
  // https://css-tricks.com/restart-css-animation/
  reset_animation(element: HTMLElement) {
    console.log(`Resetting Animation at ${Date()}`)
    element.style.animation = 'none';
    element.offsetHeight; // trigger reflow https://gist.github.com/paulirish/5d52fb081b3570c81e3a
    //element.style.animation = "";
  }

  // TODO: This also gets called if the Update Location button is clicked!!
  onFormSubmit(): void {
    console.log(`Form submit at ${Date()}`)
    let formData = JSON.stringify(this.entryDetailsForm.value)


    let newReport = this.fieldReportService.addfieldReport(formData)
    console.log(`Report id # ${newReport.id} has been added.`)
    console.log(formData)

    if (this.submitInfo) {
      this.submitInfo.innerText = `Entry id # ${newReport.id} Saved. ${formData}`
      this.fade(this.submitInfo, 3)

    }
    else {
      console.log("NO this.submitInfo ID FOUND!!!")
    }
    this.openSnackBar(`Entry id # ${newReport.id} Saved: ${formData}`, `Entry id # ${newReport.id}`, 2000)

    ////////// BUG: this.resetForm()
  }

  callsignCtrlChanged() {
    console.log("callsign Ctrl Changed at ", Date(), ". call=" + "myCall")
  }


  // TODO: Reset form: Callsign to blank, current date, status/notes
  resetForm() {
    console.log("Resetting form...")

    this.entryDetailsForm = this.formBuilder.group({
      id: -2,
      callsign: ['resetFormCallSign'],  // TODO: Not tied to the material design input field...
      team: ['T0'],
      address: ['default location (reset)'],
      lat: [this.setting.DEF_LAT,
      Validators.required,
        //Validators.minLength(4)
      ],
      long: [this.setting.DEF_LONG,
      Validators.required,
        //Validators.minLength(4)
      ],
      date: [new Date()],
      status: [FieldReportStatuses[0]],   // TODO: Allow changing list & default of statuses in settings?!
      notes: ['']
    })
  }

  generateFakeFieldReports(num = this.numFakes) {
    this.fieldReportService.generateFakeData(num)
    console.log(`Generated ${num} FAKE Field Reports`)
  }

  updateLocation() {
    console.log("updateLocation() running")
    //this.entryDetailsForm.get(['', 'name'])
    //this.entryDetailsForm.controls['derivedAddress'].setValue('New Derived Address')
    var addr = this.document.getElementById("derivedAddress")
    if (addr) { addr.innerHTML = "New What3Words goes here!" }
  }

  ngAfterViewInit() {
    console.log("ngAfterViewInit")
  }
}


