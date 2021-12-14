import { Component, Inject, OnInit, AfterViewInit } from '@angular/core';
import { Observable } from 'rxjs';
import { DOCUMENT, JsonPipe } from '@angular/common';
import { startWith, debounceTime, distinctUntilChanged, switchMap, map } from 'rxjs/operators';
import { FormControl, FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms'
import { MatSnackBar } from '@angular/material/snack-bar';
import { Callsigns, RangerService } from '../shared/services/ranger.service';

//import ( DEF_LAT, DEF_LONG } from './SettingsComponent'
//import ( * } from './SettingsComponent'

/*export interface Callsigns {
  image: string
  callsign: string
  name: string
  phone: string
}
*/

@Component({
  selector: 'rangertrak-entry',
  templateUrl: './entry.component.html',
  styleUrls: ['./entry.component.scss'],
  providers: [RangerService]
})

export class EntryComponent implements OnInit, AfterViewInit {
  callsign = new FormControl()
  filteredCallsigns: Observable<Callsigns[]> | null

  rangers: Callsigns[]

  static DEF_LAT = 47.4472
  static DEF_LONG = -122.4627  // Vashon EOC!
  gCallsign = ''  // TODO: MAT input field not automatically set into entryForm

  entryDetailsForm!: FormGroup;
  statuses: string[] = ['None', 'Normal', 'Need Rest', 'Urgent', 'Objective Update', 'Check-in', 'Check-out']  // TODO: Allow changing list & default of statuses in settings?!


  constructor(private fb: FormBuilder, private _snackBar: MatSnackBar, rangerService: RangerService, @Inject(DOCUMENT) private document: Document) {   //, private service: PostService) {
    this.rangers = rangerService.getRangers()

    // https://material.angular.io/components/autocomplete/examples#autocomplete-overview
    this.filteredCallsigns = this.callsign.valueChanges.pipe(
      startWith(''),
      map(callsign => (callsign ? this._filterStates(callsign) : this.rangers.slice())),
    );
  }

  private _filterStates(value: string): Callsigns[] {
    const filterValue = value.toLowerCase();

    this.gCallsign = filterValue // TODO: MAT input field not automatically set into entryForm
    this.entryDetailsForm.controls['callsign'].setValue(filterValue)

    return this.rangers.filter(callsign => callsign.callsign.toLowerCase().includes(filterValue));
  }


  ngOnInit(): void {
    console.log("EntryForm test started at ", Date())

    this.entryDetailsForm = this.fb.group({
      callsign: [''],
      team: ['T1'],
      whereFormModel: this.fb.group({
        address: ['default location'],
        lat: [EntryComponent.DEF_LAT,
        Validators.required,
        //Validators.minLength(4)
        ],
        long: [EntryComponent.DEF_LONG,
        Validators.required,
        //Validators.minLength(4)
        ]
      }),
      whenFormModel: this.fb.group({
        date: [new Date()]
      }),
      whatFormModel: this.fb.group({
        status: [this.statuses[0]],   // TODO: Allow changing list & default of statuses in settings?!
        notes: ['']
      })
      //,   publish: [''],
      //reset: ['']
    })

    console.log("EntryForm test completed at ", Date())
  }

  /* get keywordsControls(): any {
    return (<FormArray>this.entryDetailsForm.get('keywords')).controls;
  }   */

  openSnackBar(message: string, action: string, duration = 0) {
    this._snackBar.open(message, action, { duration: duration })
  }

  // TODO: This also gets called if the Update Location button is clicked!!
  onFormSubmit(): void {
    //this.entryDetailsForm.controls['callsign'].setValue(this.gCallsign)
    // BUGBUG: Why wasn't this automatically done?  Only Material field in the entry form?!
    const formData = this.entryDetailsForm.value
    console.log(formData)

    this.openSnackBar('Entry Saved: ' + JSON.stringify(formData), 'Nice!', 5000)

    // Call api post service here
  }

  updateLocation() {
    //this.entryDetailsForm.get(['', 'name'])
    //this.entryDetailsForm.controls['team'].setValue('New Derived Address')

    var addr = this.document.getElementById("derivedAddress")
    addr!.innerHTML = "New What3Words goes here!"
  }

  ngAfterViewInit() {
    //console.log("ngAfterViewInit");
    //console.debug(this.divs);
  }
}
