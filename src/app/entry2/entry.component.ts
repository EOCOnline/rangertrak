import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { startWith, debounceTime, distinctUntilChanged, switchMap, map } from 'rxjs/operators';
import { FormControl, FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms'


export interface State {
  flag: string;
  name: string;
  population: string;
}

@Component({
  selector: 'rangertrak-entry2',
  templateUrl: './entry.component.html',  //./entry1
  styleUrls: ['./entry.component.scss']
})

export class Entry2Component implements OnInit {   //implements OnInit
  stateCtrl = new FormControl();
  filteredStates: Observable<State[]> | null;

  states: State[] = [
    {
      name: 'Arkansas',
      population: '2.978M',
      // https://commons.wikimedia.org/wiki/File:Flag_of_Arkansas.svg
      flag: 'https://upload.wikimedia.org/wikipedia/commons/9/9d/Flag_of_Arkansas.svg',
    },
    {
      name: 'California',
      population: '39.14M',
      // https://commons.wikimedia.org/wiki/File:Flag_of_California.svg
      flag: 'https://upload.wikimedia.org/wikipedia/commons/0/01/Flag_of_California.svg',
    },
    {
      name: 'Florida',
      population: '20.27M',
      // https://commons.wikimedia.org/wiki/File:Flag_of_Florida.svg
      flag: 'https://upload.wikimedia.org/wikipedia/commons/f/f7/Flag_of_Florida.svg',
    },
    {
      name: 'Washinton',
      population: '7.7M',
      // https://commons.wikimedia.org/wiki/File:Flag_of_Washington.svg
      flag: 'https://upload.wikimedia.org/wikipedia/commons/f/f7/Flag_of_Washington.svg',
    },
  ];

  //entryDetailsForm!: FormGroup;
  constructor() {   //, private service: PostService) {
    this.filteredStates = this.stateCtrl.valueChanges.pipe(
      startWith(''),
      map(state => (state ? this._filterStates(state) : this.states.slice())),
    );
  }


  private _filterStates(value: string): State[] {
    const filterValue = value.toLowerCase();

    return this.states.filter(state => state.name.toLowerCase().includes(filterValue));
  }



  ngOnInit(): void {
    console.log("EntryForm2 test started at ", Date())
/*
    this.entryDetailsForm = this.fb.group({
      callsign: ['NoCallSign!',
        Validators.required,
        Validators.minLength(5)
      ],
      //stateCtrl: [],
      //state2: ['BrownCow'],

      //this.callsignauto[''],
      team: ['T1'],
      whereFormModel: this.fb.group({

        //TODO: ERROR Error: Cannot find control with name: 'address' (or 'lat', if address lines get commented out...)

        addressxx: ['default location'],
        lat: [Entry2Component.DEF_LAT
          //,  Validators.required,
          //Validators.minLength(5)
        ],
        long: [Entry2Component.DEF_LONG
          //,Validators.required,
          //Validators.minLength(5)
        ]
      }),
      whenFormModel: this.fb.group({
        date: [new Date()]
      }),
      whatFormModel: this.fb.group({
        status: [''],
        notes: ['']
      }),
      publish: [''],
      reset: ['']
    })


    //this.test()
    //this.test2()
    this.filteredStates = this.stateCtrl.valueChanges.pipe(
      startWith(''),
      map(state => (state ? this._filterStates(state) : this.states.slice())),
    );

    this.stateCtrl.enable()
*/



    console.log("EntryForm 2test completed at ", Date())

  }
  /*
  get keywordsControls(): any {
    return (<FormArray>this.entryDetailsForm.get('keywords')).controls;
  }

  onFormSubmit(): void {
    const formData = this.entryDetailsForm.value
    console.log(formData)
    // Call api post service here
  }
  */
}
