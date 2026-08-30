//import dayjs from 'dayjs'
import { CommonModule, DOCUMENT } from '@angular/common'
import {
  Component, computed, EventEmitter, Inject, Input, OnChanges, OnInit, Output, signal,
  SimpleChanges, ViewChild, ChangeDetectionStrategy
} from '@angular/core'
import { form, FormField } from '@angular/forms/signals'
import { MatDatepickerModule } from '@angular/material/datepicker'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatNativeDateModule } from '@angular/material/core'

import {
  FieldReportService, FieldReportStatusType, LocationType, LogService, RangerService, RangerType,
  MissionService, MissionType
} from '../services/'

type TimeSegment = 'hour' | 'minute'




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
export class TimePickerComponent implements OnInit, OnChanges {
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

  // Same reservation pattern as LocationComponent's tabIndexStart/TAB_SLOT_COUNT/ti() -
  // this leaf has two focusable time segments (hour/minute), not one, so a single tabIndex
  // input can no longer address it. Entry.component.ts's statusTabIndex is computed from
  // this same TIME_TAB_SLOT_COUNT.
  @Input() timeTabIndexStart?: number
  // Raised live 2026-08-30: dropped from 3 to 2 - the AM/PM segment is gone now that this
  // picker is 24-hour throughout (see hourDisplay()/onHourChange() below). statusTabIndex's
  // own formula picks up the new count automatically; nothing downstream needed a manual
  // renumber.
  static readonly TIME_TAB_SLOT_COUNT = 2

  /** Segment position within the time group, 0=hour, 1=minute. */
  ti(offset: number): number | null {
    return this.timeTabIndexStart != null ? this.timeTabIndexStart + offset : null
  }

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
    this.applyInitialDate()
    this.log.verbose(`initialDate = ${this.initialDate} in ngInit`, this.id)
  }

  /**
   * E-71: reacts to `[initialDate]` changing AFTER this component has already initialized
   * - e.g. Settings' Operational Period end picker being clamped up to match a later start
   * time. `[initialDate]` is otherwise only ever read once, in ngOnInit(), so without this
   * a programmatic clamp would update the parent's model correctly but leave this picker's
   * own displayed value silently stale until the page reloaded. Only fires for callers that
   * actually bind `[initialDate]` in their template (Entry's own usage doesn't, and relies
   * on ngOnInit's default `new Date()` instead) - `firstChange` is skipped since ngOnInit
   * already applies the initial value once.
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['initialDate'] && !changes['initialDate'].firstChange) {
      this.applyInitialDate()
    }
  }

  /**
   * Settings round-trip through localStorage as JSON, which has no date type, so
   * opPeriodStart/End come back as ISO *strings* - and [initialDate] is typed Date, so
   * nothing flags it. Calling getHours() on a string threw "is not a function" and took
   * the whole Settings page down. Coerce at the boundary rather than trusting the type.
   */
  private applyInitialDate(): void {
    const initial = this.toDate(this.initialDate)

    const hours = initial.getHours().toString().padStart(2, '0');
    const minutes = initial.getMinutes().toString().padStart(2, '0');
    const timeString = `${hours}:${minutes}`;

    this.timeModel.set({ time: initial, timeOfDay: timeString })
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
   * still fires emission explicitly, matching the original event-driven-only behavior
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

  // ── Segmented hour/minute entry (24-hour) ──────────────────────────────────────────
  //
  // Live review, 2026-08-22: the native `type="time"` input's own segments can't be told
  // apart from JS - `HTMLInputElement.selectionStart/selectionEnd` are unsupported for
  // type="time" (confirmed live: both return null in Chromium) and synthetic keyboard
  // events don't trigger a native input's built-in segment stepping (only real, trusted
  // key presses do) - so the explicit ▲/▼ buttons below could only ever step one hardcoded
  // segment (minutes), never whichever one the scribe had highlighted. Plain `type="number"`
  // fields solve this directly: which one has focus is just `activeSegment` below, no
  // browser internals to fight. Originally three fields (hour/minute/AM-PM); the AM-PM
  // segment was removed 2026-08-30 when this picker switched to 24-hour display throughout.
  //
  // `timeModel().timeOfDay` (24-hour "HH:MM") stays the single source of truth - these
  // are pure display/edit derivations of it, same relationship applyInitialDate() already
  // has with the model.
  private hour24 = computed(() => Number(this.timeModel().timeOfDay.split(':')[0]) || 0)
  private minute24 = computed(() => Number(this.timeModel().timeOfDay.split(':')[1]) || 0)
  // Raised live 2026-08-30: 24-hour display throughout the app - was a 1-12 display value
  // plus a separate AM/PM segment (meridiem, removed). hour24() is already the value to
  // show; padded to two digits so "05:00" reads as unambiguously 24-hour, not a stray
  // single-digit clock.
  hourDisplay = computed(() => this.hour24().toString().padStart(2, '0'))
  minuteDisplay = computed(() => this.minute24().toString().padStart(2, '0'))

  private static readonly SEGMENT_STEP_MINUTES: Record<TimeSegment, number> = { hour: 60, minute: 1 }

  // Which segment last had focus - NOT cleared on blur. The shared ▲/▼ buttons below
  // steal focus to themselves the instant they're clicked (a real DOM focus event fires
  // before their own (click) handler runs), so reading focus live at click-time would
  // always see the button itself, never the segment the scribe actually meant. Sticking
  // with the last-focused segment until a different one is focused matches what a scribe
  // clicking into a field and then reaching for the arrow button actually expects.
  private activeSegment: TimeSegment | null = null

  onSegmentFocus(segment: TimeSegment) { this.activeSegment = segment }

  /**
   * E-50's shared ▲/▼ buttons, now segment-aware. Falls back to minute (the original,
   * only-ever behavior) if nothing has been focused yet this session.
   */
  adjustTime(delta: number) {
    this.stepSegment(this.activeSegment ?? 'minute', delta)
  }

  /** A real key press directly on a focused segment - same rollover math, same result. */
  onSegmentKeyStep(event: Event, segment: TimeSegment, delta: number) {
    event.preventDefault() // native number-input stepping doesn't roll into sibling segments
    this.stepSegment(segment, delta)
  }

  private stepSegment(segment: TimeSegment, delta: number) {
    this.adjustTotalMinutes(delta * TimePickerComponent.SEGMENT_STEP_MINUTES[segment])
  }

  /**
   * E-50: wraps within a single day rather than rolling the date over, matching what the
   * native control's own up/down arrows used to do. Shared by both segments - stepping by
   * 60 minutes (hour) or 1 minute (minute).
   */
  private adjustTotalMinutes(deltaMinutes: number) {
    const { timeOfDay } = this.timeModel()
    const [hours, minutes] = timeOfDay.split(':').map(Number)
    const total = (((hours * 60 + minutes + deltaMinutes) % 1440) + 1440) % 1440
    const newHours = Math.floor(total / 60).toString().padStart(2, '0')
    const newMinutes = (total % 60).toString().padStart(2, '0')
    this.timeModel.update(s => ({ ...s, timeOfDay: `${newHours}:${newMinutes}` }))
    this.onNewTime()
  }

  private setAbsolute(hour24: number, minute: number) {
    const hh = hour24.toString().padStart(2, '0')
    const mm = minute.toString().padStart(2, '0')
    this.timeModel.update(s => ({ ...s, timeOfDay: `${hh}:${mm}` }))
    this.onNewTime()
  }

  /** Commits a typed hour (0-23, 24-hour) on blur/Enter - never mid-keystroke, see onSegmentTyping(). */
  onHourChange(event: Event) {
    const n = parseInt((event.target as HTMLInputElement).value, 10)
    if (isNaN(n)) return
    this.setAbsolute(Math.min(23, Math.max(0, n)), this.minute24())
  }

  onMinuteChange(event: Event) {
    const n = parseInt((event.target as HTMLInputElement).value, 10)
    if (isNaN(n)) return
    this.setAbsolute(this.hour24(), Math.min(59, Math.max(0, n)))
  }

  /**
   * Auto-advances to the next segment once no further digit could still be typed into
   * this one - the same UX native date/time inputs already give for free. Peeks at the
   * raw typed string only; never writes back to the model (that's onHourChange/
   * onMinuteChange, on blur/Enter) so it can't fight the scribe mid-keystroke. `nextEl` is
   * omitted for the last segment (minute) - there is nothing left to advance into.
   */
  onSegmentTyping(event: Event, maxSingleDigit: number, nextEl?: HTMLElement) {
    const value = (event.target as HTMLInputElement).value
    const firstDigit = Number(value[0])
    if (value.length >= 2 || (value.length === 1 && firstDigit > maxSingleDigit)) {
      nextEl?.focus()
    }
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
