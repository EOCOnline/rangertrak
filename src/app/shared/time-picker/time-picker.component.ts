//import dayjs from 'dayjs'
import { CommonModule, DOCUMENT } from '@angular/common'
import {
  Component, computed, EventEmitter, Inject, Input, OnInit, Output, signal, ViewChild,
  ChangeDetectionStrategy
} from '@angular/core'
import { form, FormField } from '@angular/forms/signals'
import { MatDatepickerModule } from '@angular/material/datepicker'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatNativeDateModule } from '@angular/material/core'

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
  standalone: true,
  imports: [
    CommonModule,
    FormField,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    MatNativeDateModule
  ],
  templateUrl: './time-picker.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./time-picker.component.scss']
})
export class TimePickerComponent implements OnInit {
  private timeModel = signal({ time: new Date(), timeOfDay: '' })
  public timeForm = form(this.timeModel)

  @Output() newTimeEvent = new EventEmitter<Date>()
  // ! @ViewChild('timePicker') timePicker: any; // https://blog.angular-university.io/angular-viewchild/

  // next 2 defaults can be overriden in parent's html: [initialDate] = "initialTime"
  @Input() datePickerLabel = "Enter Date & Time" // [datePickerLabel] = "Enter Date & Time of the Big Bang"
  // Typed to include string because that is what callers actually pass once settings have
  // been through localStorage - see toDate() / ngOnInit().
  @Input() initialDate: Date | string = new Date() //  [initialDate] = "initialTime"

  // Left unset (no tabindex attribute rendered) unless a parent needs this leaf slotted
  // into an explicit keyboard-first tab sequence - see Entry's usage vs. Settings'.
  @Input() dateTabIndex?: number
  @Input() timeTabIndex?: number

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
  public color: 'primary' | 'accent' | 'warn' = 'primary'
  disableMinute = false
  hideTime = false
  //dateCtrl = new FormControl(new Date()) //TODO: Still need to grab the result during submit...!

  defaultOpPeriod = 10 // hours

  constructor(
    private log: LogService,
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
    // Settings round-trip through localStorage as JSON, which has no date type, so
    // opPeriodStart/End come back as ISO *strings* - and [initialDate] is typed Date, so
    // nothing flags it. Calling getHours() on a string threw "is not a function" and took
    // the whole Settings page down. Coerce at the boundary rather than trusting the type.
    const initial = this.toDate(this.initialDate)

    const hours = initial.getHours().toString().padStart(2, '0');
    const minutes = initial.getMinutes().toString().padStart(2, '0');
    const timeString = `${hours}:${minutes}`;

    this.timeModel.set({ time: initial, timeOfDay: timeString })

    this.log.verbose(`initialDate = ${this.initialDate} in ngInit`, this.id)
  }

  /**
   * Accepts whatever actually arrives on [initialDate] - a Date, an ISO string from
   * deserialized settings, or something unusable - and always returns a valid Date,
   * falling back to now rather than letting an Invalid Date propagate into the form.
   */
  private toDate(value: Date | string): Date {
    const date = value instanceof Date ? value : new Date(value)
    if (isNaN(date.getTime())) {
      this.log.error(`initialDate was not a usable date (${JSON.stringify(value)}); defaulting to now.`, this.id)
      return new Date()
    }
    return date
  }

  /**
   * Pure derivation of the combined date+time from the model - replaces the old
   * FormGroup.valueChanges subscription. Read, not subscribed to: onNewTime() below
   * still fires emission explicitly, matching the original event-driven-only behaviour
   * (no emission on load, only on user-facing date/time DOM events).
   */
  private combinedTime = computed<Date>(() => {
    const { time, timeOfDay } = this.timeModel()
    if (!time || !timeOfDay) return time

    const [hours, minutes] = timeOfDay.split(':').map(Number)
    const combined = new Date(time)
    combined.setHours(hours, minutes, 0, 0)
    return combined
  })

  onNewTime() {
    // todo : validate min/max time?
    const combined = this.combinedTime()
    this.time = combined
    this.newTimeEvent.emit(combined)
    this.log.verbose(`Combined date/time emitted: ${combined}`, this.id)
  }

  /**
   * E-50: the explicit up/down stepper buttons next to the time field - a visible
   * equivalent to the native time input's own (easy-to-miss) arrow-key stepping.
   * Wraps within a single day rather than rolling the date over, matching what the
   * native control's own up/down arrows do.
   */
  adjustTime(deltaMinutes: number) {
    const { timeOfDay } = this.timeModel()
    const [hours, minutes] = timeOfDay.split(':').map(Number)
    const total = (((hours * 60 + minutes + deltaMinutes) % 1440) + 1440) % 1440
    const newHours = Math.floor(total / 60).toString().padStart(2, '0')
    const newMinutes = (total % 60).toString().padStart(2, '0')
    this.timeModel.update(s => ({ ...s, timeOfDay: `${newHours}:${newMinutes}` }))
    this.onNewTime()
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
