import { CommonModule } from '@angular/common'
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core'
import { FieldTree, FormField } from '@angular/forms/signals'

import { SettingsType } from '../../../shared/services/'
import { TimePickerComponent } from '../../../shared/'

/**
 * Mission identity, Operational Period, and its two time-pickers. Sprint C split out of
 * the 429-line settings.component template - see settings.component.ts for the rest.
 *
 * Takes the whole `settingsForm` FieldTree by reference and drills into its own fields via
 * native dot-path nesting (`form.mission`, etc.) - the Signal Forms equivalent of the old
 * cross-component `[formGroup]`/`formControlName` bridging, and no more awkward than doing
 * it one level down like the old code did.
 */
@Component({
  selector: 'rangertrak-settings-mission-section',
  standalone: true,
  imports: [CommonModule, FormField, TimePickerComponent],
  templateUrl: './settings-mission-section.component.html',
  styleUrls: ['./settings-mission-section.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class SettingsMissionSectionComponent {
  @Input({ required: true }) form!: FieldTree<SettingsType>
  @Input({ required: true }) opPeriodStart!: Date
  @Input({ required: true }) opPeriodEnd!: Date
  @Input({ required: true }) timePickerLabelStart!: string
  @Input({ required: true }) timePickerLabelEnd!: string

  @Output() timeEventStart = new EventEmitter<Date>()
  @Output() timeEventEnd = new EventEmitter<Date>()
}
