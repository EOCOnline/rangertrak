//import dayjs from 'dayjs'
import {
  debounceTime, map, Observable, startWith, subscribeOn, Subscription, switchMap
} from 'rxjs'

import {
  NgxMatDatetimePickerModule, NgxMatNativeDateModule, NgxMatTimepickerModule
} from '@angular-material-components/datetime-picker' // already in app.module.ts
import { DOCUMENT } from '@angular/common'
import { Component, EventEmitter, Inject, Input, OnInit, Output, ViewChild } from '@angular/core'
import {
  FormControl, FormGroup, FormsModule, ReactiveFormsModule, UntypedFormBuilder, UntypedFormGroup,
  Validators
} from '@angular/forms'
import { ThemePalette } from '@angular/material/core'

import {
  FieldReportService, FieldReportStatusType, LocationType, LogService, RangerService, RangerType,
  SettingsService, SettingsType
} from '../services/'




// TODO: Consider https://www.npmjs.com/package/@angular-material-components/datetime-picker as a replacement to current timepicker/colorpicker?
// https://github.com/h2qutc/angular-material-components
// it is updated to NG 16...







// https://blog.briebug.com/blog/5-ways-to-pass-data-into-child-components-in-angular


// https://www.freakyjolly.com/angular-material-109-datepicker-timepicker-tutorial
// https://www.thecodehubs.com/how-to-implement-material-datepicker-and-timepicker-in-angular/
// https://www.concretepage.com/angular-material/angular-material-datepicker-change-event

@Component({
  selector: 'rangertrak-time-picker',
  templateUrl: './time-picker.component.html',
  styleUrls: ['./time-picker.component.scss']
})
export class TimePickerComponent implements OnInit {
  //!TODO: Is this really needed as @Input, or just a variable?!
  //@Input()
  // Untyped
  public timepickerFormGroup!: FormGroup // input from entry.component.ts
  //  @Input() public timepickerFormControl: FormControl // input from entry.component.ts
  //@Input() public timepickerFormControl: FormControl // input from entry.component.ts

  @Output() newTimeEvent = new EventEmitter<Date>()
  // ! @ViewChild('timePicker') timePicker: any; // https://blog.angular-university.io/angular-viewchild/

  // next 2 defaults can be overriden in parent's html: [initialDate] = "initialTime"
  @Input() datePickerLabel = "Enter Date & Time" // [datePickerLabel] = "Enter Date & Time of the Big Bang"
  @Input() initialDate = new Date() //  [initialDate] = "initialTime"

  private id = "DateTime Picker"

  // https://github.com/angular/components/issues/5648
  // https://ng-matero.github.io/extensions/components/datetimepicker/overview (nice)
  // https://vlio20.github.io/angular-datepicker/timeInline (unused)
  // https://h2qutc.github.io/angular-material-components - IN USE HERE!
  //public date = new Date()  //dayjs.Dayjs = dayjs()


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
  public time = new Date()
  public disabled = false
  public showSpinners = true
  public showSeconds = false // only affects display in timePicker
  public touchUi = false
  public enableMeridian = false // 24 hr clock

  minDate!: null | Date // dayjs.Dayjs
  maxDate!: null | Date // dayjs.Dayjs
  public stepHour = 1
  public stepMinute = 1
  public stepSecond = 1
  public color: ThemePalette = 'primary'
  disableMinute = false
  hideTime = false
  //dateCtrl = new FormControl(new Date()) //TODO: Still need to grab the result during submit...!

  defaultOpPeriod = 10 // hours

  constructor(
    private log: LogService,
    private _formBuilder: UntypedFormBuilder,
    @Inject(DOCUMENT) private document: Document) {
    this.log.excessive(`======== Constructor() ============`, this.id)

    // BUG: maybe should be in EntryComponent.ts instead? as locationFrmGrp is there...
    // new values here bubble up as emitted events - see onNewLocation()
    // ! Same code just below too
    // this version just to avoid not-defined error...
    // this.timepickerFormGroup = this._formBuilder.group({
    //   time: [this.time]
    // })

    // REVIEW: Min/Max times ignored?!
    // TODO: These should get passed in
    this._setMinDate(10) // no times early than 10 hours ago
    this._setMaxDate(1)  // no times later than 1 hours from now
  }

  ngOnInit(): void {
    // ! REVIEW: this duplicates code just above AND in parent!!!
    this.timepickerFormGroup = this._formBuilder.group({
      time: [this.initialDate]
    })
    this.log.verbose(`initialDate = ${this.initialDate} in ngInit`, this.id)
  }

  onNewTime(newTime: any) {
    // Do any needed sanity/validation here
    // Based on listing 8.8 in TS dev w/ TS, pg 188

    // todo : validate min/max time?
    this.log.verbose(`Got new time: ${newTime.value}: Emitting!`, this.id)

    this.time = newTime.value
    this.newTimeEvent.emit(this.time)
    //if (! (

    //) {
    // this.log.warn(`New time event had no listeners!`, this.id) }
    // REVIEW: Let parent update the form fields & other data as necessary...
    //this.timeFrmGrp
  }

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

  // closePicker() {
  //   this timePicker.cancel();
  // }

  private _setMinDate(hours: number = this.defaultOpPeriod) {
    //const now = Date.now() //dayjs();
    this.minDate?.setMilliseconds(Date.now() - hours * 60 * 60 * 1000)
  }

  private _setMaxDate(hours: number = this.defaultOpPeriod) {
    //const now = Date.now() //dayjs();
    this.minDate?.setMilliseconds(Date.now() + hours * 60 * 60 * 1000)
  }
}
