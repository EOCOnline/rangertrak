import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { startWith, debounceTime, distinctUntilChanged, switchMap, map } from 'rxjs/operators';
import { FormControl, FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms'

// // https://material.angular.io/components/autocomplete/examples

//import ( DEF_LAT, DEF_LONG } from './SettingsComponent'
//import ( * } from './SettingsComponent'

export interface Callsigns {
  image: string
  callsign: string
  name: string
  phone: string
}

@Component({
  selector: 'rangertrak-entry',
  templateUrl: './entry.component.html',
  styleUrls: ['./entry.component.scss']
})

export class EntryComponent implements OnInit {
  callsignsCtrl = new FormControl();
  filteredCallsigns: Observable<Callsigns[]> | null;


   /*
    Following from 98070 AND 98013 zip codes, MUST be sorted by call sign!
    https://wireless2.fcc.gov/UlsApp/UlsSearch/searchAmateur.jsp
    ToDo, remove/empty Team/Icon
  */
/*
    import {default as AAA} from "VashonCallSigns";
    AAA.targetKey
    // this requires `"resolveJsonModule": true` in tsconfig.json

    import {default as yyy} from './VashonCallSigns.json'
    yyy.primaryMain


ngOnInit(): void {

        this.myService.getResponseData().then((value) => {
            //SUCCESS
            console.log(value);
            this.detailsdata = value;

        }, (error) => {
            //FAILURE
            console.log(error);
        })
    }

<p><b>sales amount:</b> {{ detailsdata?.sales_amount }}</p>
<p><b>collection amount:</b> {{ detailsdata?.collection_amount }}</p>
<p><b>carts amount:</b> {{ detailsdata?.carts_amount }}</p>

*/

// component:
//import * as data from './data.json';
//let greeting = data.greeting;

  callsigns: Callsigns[] = [
    {callsign: "AC7TB", name: "Sullivan, Timothy X", image: "./assets/imgs/REW/female.png", phone: "206-463-0000"},
    {callsign: "KE7KDQ", name: "Cornelison, John", image: "./assets/imgs/REW/ke7kdq.jpg", phone: "206-463-0000"},
    {callsign: "AE7MW", name: "Smueles, Robert E", image: "./assets/imgs/REW/RickWallace.png", phone: "206-463-0000"},
    {callsign: "AE7RW", name: "York, Randy K", image: "./assets/imgs/REW/VI-0003.jpg", phone: "206-463-0000"},
    {callsign: "AE7SD", name: "Danielson, Sharon J", image: "./assets/imgs/REW/VI-0034.jpg", phone: "206-463-0000"},
    {callsign: "AE7TH", name: "Hardy, Timothy R", image: "./assets/imgs/REW/VI-0038.jpg", phone: "206-463-0000"},
    {callsign: "AG7TJ", name: "Lindgren, Katrina J", image: "./assets/imgs/REW/VI-0041.jpg", phone: "206-463-0000"},
    {callsign: "AK7C", name: "Mcdonald, Michael E", image: "./assets/imgs/REW/VI-0056.jpg", phone: "206-463-0000"},
    {callsign: "K1SAB", name: "Brown, Steven A", image: "./assets/imgs/REW/VI-0058.jpg", phone: "206-463-0000"},
    {callsign: "K3QNQ", name: "Treese, F Mitch A", image: "./assets/imgs/REW/VI-0069.jpg", phone: "206-463-0000"},
    {callsign: "K6AJV", name: "Valencia, Andrew J", image: "./assets/imgs/REW/VI-007.jpg", phone: "206-463-0000"},
    {callsign: "K7AJT", name: "Tharp, Adam J", image: "./assets/imgs/REW/VI-0073.jpg", phone: "206-463-0000"},
    {callsign: "K7DGL", name: "Luechtefeld, Daniel", image: "./assets/imgs/REW/VI-0073.jpg", phone: "206-463-0000"},
    {callsign: "K7KMS", name: "Paull, Steven", image: "./assets/imgs/REW/VI-0089.jpg", phone: "206-463-0000"},
    {callsign: "K7NHV", name: "Francisco, Albert K", image: "./assets/imgs/REW/male.png", phone: "206-463-0000"},
    {callsign: "K7VMI", name: "De Steiguer, Allen L", image: "./assets/imgs/REW/K7VMI.jpg", phone: "206-463-0000"},
    {callsign: "KA7THJ", name: "Hanson, Jay R", image: "./assets/imgs/REW/male.png", phone: "206-463-0000"},
    {callsign: "KB0LJC", name: "Hirsch, Justin D", image: "./assets/imgs/REW/male.png", phone: "206-463-0000"},
    {callsign: "KB7LEV", name: "Lysen, Kurt A", image: "./assets/imgs/REW/female.png", phone: "206-463-0000"},
    {callsign: "KB7MTM", name: "Meyer, Michael T", image: "./assets/imgs/REW/VI-0123.jpg", phone: "206-463-0000"}
  ];

  static DEF_LAT = 47.4472
  static DEF_LONG = -122.4627  // Vashon EOC!

  entryDetailsForm!: FormGroup;
  statuses: string[] = ['None', 'Normal', 'Need Rest', 'Urgent', 'Objective Update', 'Check-in', 'Check-out']

  constructor(private fb: FormBuilder) {   //, private service: PostService) {

    this.filteredCallsigns = this.callsignsCtrl.valueChanges.pipe(
      startWith(''),
      map(callsign => (callsign ? this._filterStates(callsign) : this.callsigns.slice())),
    );

  }

  private _filterStates(value: string): Callsigns[] {
    const filterValue = value.toLowerCase();

    return this.callsigns.filter(callsign => callsign.callsign.toLowerCase().includes(filterValue));
  }


  ngOnInit(): void {
    console.log("EntryForm test started at ", Date())


    this.entryDetailsForm = this.fb.group({
      callsignCtrl: [],
      team: ['T1'],
      //whereFormModel: this.fb.group({    //TODO: ERROR Error: Cannot find control with name: 'address' (or 'lat', if address lines get commented out...)

        address: ['default location'],
        lat: [EntryComponent.DEF_LAT
          //,  Validators.required,
          //Validators.minLength(5)
        ],
        long: [EntryComponent.DEF_LONG
          //,Validators.required,
          //Validators.minLength(5)
        ]
      //})
      ,
      //whenFormModel: this.fb.group({
        date: [new Date()]
      //})
      ,
      //whatFormModel: this.fb.group({
        status: [''],
        notes: ['']
      //})
      ,
      publish: [''],
      reset: ['']
    })


    //this.test()
    //this.test2()

    console.log("EntryForm test completed at ", Date())

  }
  /*
  get keywordsControls(): any {
    return (<FormArray>this.entryDetailsForm.get('keywords')).controls;
  }
*/


  onFormSubmit(): void {
    const formData = this.entryDetailsForm.value
    console.log(formData)
    // Call api post service here
  }

}
