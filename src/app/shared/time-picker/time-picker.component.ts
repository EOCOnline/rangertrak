import { DOCUMENT } from '@angular/common';
import { Component, Inject, Input, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms'
import { ThemePalette } from '@angular/material/core';
import dayjs from 'dayjs';
import { Observable, debounceTime, map, startWith, switchMap, subscribeOn, Subscription } from 'rxjs'
import { FieldReportService, FieldReportStatusType, RangerService, LogService, RangerType, SettingsService, SettingsType, LocationType } from '../services/'

@Component({
  selector: 'rangertrak-time-picker',
  templateUrl: './time-picker.component.html',
  styleUrls: ['./time-picker.component.scss']
})
export class TimePickerComponent implements OnInit {
  @Input() public timepickerFrmControl: FormControl // input from entry.component.ts

  @ViewChild('timePicker') timePicker: any; // https://blog.angular-university.io/angular-viewchild/


  private id = "DateTime Picker"

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
  public time!: Date
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



  constructor(
    private log: LogService,
    private _formBuilder: FormBuilder,
    @Inject(DOCUMENT) private document: Document) {
    this.log.info(`timepicker initialization`, this.id)


    // todo: need to repeatedly update this.locationFrmGrp - keep in sync w/ vals?
    this.timepickerFrmControl = this._formBuilder.group({
      date: [this.date]
    });

    // REVIEW: Min/Max times ignored?!
    // TODO: These should get passed in
    this._setMinDate(10) // no times early than 10 hours ago
    this._setMaxDate(1)  // no times later than 1 hours from now
  }

  ngOnInit(): void {
    this.date = dayjs()
  }

  onNewTime(newTime: any) {
    // Do any needed sanity/validation here
    // Based on listing 8.8 in TS dev w/ TS, pg 188
    // todo : validate min/max time?
    this.log.verbose(`Got new time: ${JSON.stringify(newTime)}`, this.id)
    this.time = JSON.parse(newTime) as Date

    this.log.verbose(`Emit new Location ${JSON.stringify(newLocation)}`, this.id)
    this.newLocationEvent.emit(this.location)
    /*if (! {
      this.log.warn(`New location event had no listeners!`, this.id)
    }*/

    // TODO: BUT, we still need to update our local copy:
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
}
