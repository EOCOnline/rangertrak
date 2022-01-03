import { DOCUMENT, JsonPipe } from '@angular/common'
import { AfterViewInit, Component, Inject, OnInit, isDevMode } from '@angular/core'
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms'
import {MDCSlider} from '@material/slider'
import { MatSnackBar } from '@angular/material/snack-bar'
import { Observable, pipe } from 'rxjs'
import { debounceTime, distinctUntilChanged, map, startWith, switchMap } from 'rxjs/operators'

import { SettingsComponent } from '../settings/settings.component'
import { FieldReportService, FieldReportStatuses, RangerService, RangerType, TeamService, TeamType } from '../shared/services/'

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
  smartInput = new FormControl({value:'', disabled:true})
  smartDisabled = true
  numFakes = 30
  //const fakeSlider = new MDCSlider(document.querySelector('.mdc-slider'));


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
      lat:  [this.setting.DEF_LAT,  Validators.required], //Validators.minLength(4)
      long: [this.setting.DEF_LONG, Validators.required], //Validators.minLength(4)
      date: [new Date()],
      status: [FieldReportStatuses[0]],   // TODO: Allow changing list & default of statuses in settings?!
      note: ['']
    })

    this.smartDisabled = !isDevMode()
    console.log("EntryForm ngOnInit completed at ", Date())
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

  // TODO: This also gets called if the Update Location button is clicked!!
  onFormSubmit(): void {
    console.log("Form submit at ", Date())
    let formData = JSON.stringify(this.entryDetailsForm.value)
    console.log(formData)
    this.openSnackBar('Entry Saved: ' + formData, 'Nice!', 5000)

    let newReport = this.fieldReportService.addfieldReport(formData)
    console.log(`Report id # ${newReport.id} has been added.`)

    this.resetForm()
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
