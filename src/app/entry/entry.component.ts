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

//@use "@material/slider/styles"

@Component({
  selector: 'rangertrak-entry',
  templateUrl: './entry.component.html',
  styleUrls: ['./entry.component.scss'],
  providers: [RangerService, FieldReportService, TeamService]
})
export class EntryComponent implements OnInit{ //}, AfterViewInit {


  autoTicks = false;
  disabled = false;
  invert = false;
  max = 100;
  min = 0;
  showTicks = false;
  step = 1;
  thumbLabel = true;
  fakeValue = 0;
  vertical = false;
  tickInterval = 1;





  callsignCtrl = new FormControl()
  filteredRangers: Observable<RangerType[]>
  rangers: RangerType[] = []
  //fieldReportService
  fieldReportStatuses
  setting = SettingsComponent.AppSettings
  entryDetailsForm!: FormGroup
  sliderDetailsForm!: FormGroup
  numFakes = 30
  nFakes = 10
  //const fakeSlider = new MDCSlider(document.querySelector('.mdc-slider'));
  submitInfo: HTMLElement | null = null
  callInfo: HTMLElement | null = null

  constructor(
    private formBuilder: FormBuilder,
    private _snackBar: MatSnackBar,
    private rangerService: RangerService,
    private fieldReportService: FieldReportService,
    private teamService: TeamService,
    @Inject(DOCUMENT) private document: Document) {   //, private service: PostService) {

    this.rangers = rangerService.getRangers() // TODO: or getActiveRangers?!
    this.fieldReportService = fieldReportService
    this.fieldReportStatuses = FieldReportStatuses

    // NOTE: workaround for onChange not working...
    this.callsignCtrl.valueChanges.pipe(debounceTime(1000)).subscribe(newCall => this.CallsignChanged(newCall))

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

  private findIndex(call: string): number {
    for (let i = 0; i < this.rangers.length; i++) {
      if (this.rangers[i].callsign === call) return i;
    }
    throw new Error(`Ranger with id ${call} was not found!`);
  }

  CallsignChanged(callsign: string) { // Just serves timer for input field - post interaction
    this.callInfo = this.document.getElementById("enter__Callsign-upshot")
    if (this.callInfo) {
      let ranger = this.rangers[this.findIndex(callsign)];
      this.callInfo.innerHTML = `<img class="enter__Callsign-img" aria-hidden
      src="${ranger.image}" height="50">
      <span>${ranger.callsign}</span> | <small> ${ranger.licensee} | ${ranger.phone}</small>`
    }
  }

  CallsignCtrlChanged() { // NOTE: NEVER CALLED!!!, so use workaround above...
    console.log("callsign Ctrl Changed at ", Date(), ". call=" + "myCall")
    // TODO: update #enter__Callsign-upshot
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

    console.log(`EntryForm ngOnInit completed at ${Date()}`)
  }

  formatLabel(value: number) {
    if (value >= 1000) {
      return Math.round(value / 1000) + 'k';
    }
    return value;
  }

  // FUTURE: provider nicer time picker: https://www.freakyjolly.com/angular-material-109-datepicker-timepicker-tutorial/#Only_Show_Timepicker
  /*
    FUTURE: Allow entry of keywords
    get keywordsControls(): any {
    return (<FormArray>this.entryDetailsForm.get('keywords')).controls
  }   */

  openSnackBar(message: string, action: string, duration = 0) {
    // https://material.angular.io/components/snack-bar/overview
    this._snackBar.open(message, action, { duration: duration, verticalPosition: 'top'})
  }

  sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /*
    https://www.sitepoint.com/css3-animation-javascript-event-handlers/
    https://css-tricks.com/controlling-css-animations-transitions-javascript/
    https://www.smashingmagazine.com/2013/04/css3-transitions-thank-god-specification/#a2
    https://stackoverflow.com/questions/6268508/restart-animation-in-css3-any-better-way-than-removing-the-element
    https://css-tricks.com/restart-css-animation/
    https://gist.github.com/paulirish/5d52fb081b3570c81e3a
  */
  reset_animation(element: HTMLElement) {
    console.log(`Reset Animation at ${Date()}`)
    element.style.animation = 'none';
    element.offsetHeight; // trigger reflow
    element.style.animation = "";
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
      this.reset_animation(this.submitInfo)
    }
    else {
      console.log("NO this.submitInfo ID FOUND!!!")
    }
    this.openSnackBar(`Entry id # ${newReport.id} Saved: ${formData}`, `Entry id # ${newReport.id}`, 2000)

    //this.entryDetailsForm.reset()
    this.resetForm()
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

  /* What was the purpose?!
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
  */
}


export class SliderParams {
  autoTicks = false;
  disabled = false;
  invert = false;
  max = 100;
  min = 0;
  showTicks = false;
  step = 1;
  thumbLabel = false;
  fakeValue = 0;
  vertical = false;
  tickInterval = 1;
}
