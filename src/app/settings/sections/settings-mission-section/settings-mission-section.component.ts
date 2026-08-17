import { CommonModule } from '@angular/common'
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core'
import { ReactiveFormsModule, UntypedFormGroup } from '@angular/forms'

import { TimePickerComponent } from '../../../shared/'

/**
 * Mission identity, Operational Period, and its two time-pickers. Sprint C split out of
 * the 429-line settings.component template - see settings.component.ts for the rest.
 *
 * Takes the whole `settingsEditorForm` by reference and re-declares `[formGroup]` at its
 * own root - the same pattern the top-level `<form>` already used, just one level down.
 * Avoids the ControlContainer/viewProviders bridging Angular needs for cross-component
 * `formGroupName`, which fails silently at runtime rather than at compile time.
 */
@Component({
  selector: 'rangertrak-settings-mission-section',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TimePickerComponent],
  templateUrl: './settings-mission-section.component.html',
  styleUrls: ['./settings-mission-section.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class SettingsMissionSectionComponent {
  @Input({ required: true }) form!: UntypedFormGroup
  @Input({ required: true }) opPeriodStart!: Date
  @Input({ required: true }) opPeriodEnd!: Date
  @Input({ required: true }) timePickerLabelStart!: string
  @Input({ required: true }) timePickerLabelEnd!: string

  @Output() timeEventStart = new EventEmitter<Date>()
  @Output() timeEventEnd = new EventEmitter<Date>()
}
