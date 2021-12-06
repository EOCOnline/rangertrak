import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms'

//import ( DEF_LAT, DEF_LONG } from './SettingsComponent'
//import ( * } from './SettingsComponent'

@Component({
  selector: 'rangertrak-entry',
  templateUrl: './entry.component.html',
  styleUrls: ['./entry.component.scss']
})
export class EntryComponent implements OnInit {

  static DEF_LAT = 47.4472
  static DEF_LONG = -122.4627  // Vashon EOC!

  entryDetailsForm!: FormGroup;
  statuses: string[] = ['None', 'Normal', 'Need Rest', 'Urgent', 'Objective Update']

  constructor(private fb: FormBuilder) { }

  ngOnInit(): void {
    console.log("EntryForm test started at ", Date())

    this.entryDetailsForm = this.fb.group({
      callsign: ['NoCallSign!'
        //,
        //      Validators.required,
        //     Validators.minLength(5)
      ],
      team: ['T1'],
      whereFormModel: this.fb.group({
        address: [''],
        lat: [EntryComponent.DEF_LAT
          //,  Validators.required,
          //Validators.minLength(5)
        ],
        long: [EntryComponent.DEF_LONG
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

    console.log("EntryForm test completed at ", Date())

  }
  get keywordsControls(): any {
    return (<FormArray>this.entryDetailsForm.get('keywords')).controls;
  }

  onFormSubmit(): void {
    const formData = this.entryDetailsForm.value
    console.log(formData)
    // Call api post service here
  }
}
