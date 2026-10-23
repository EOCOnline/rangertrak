import { CommonModule } from '@angular/common'
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, computed, inject, signal } from '@angular/core'
import { FieldTree, FormField } from '@angular/forms/signals'

import { MissionType, RadioLogService } from '../../../shared/services/'
import { msgNoClashSentence } from '../../../domain/msg-no'
import { DevicePrefsService } from '../../../shared/services/device-prefs.service'
import { TimePickerComponent } from '../../../shared/'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatCardModule } from '@angular/material/card'

/**
 * Mission identity, Operational Period, and its two time-pickers. Sprint C split out of
 * the 429-line mission.component template - see mission.component.ts for the rest.
 *
 * Takes the whole `settingsForm` FieldTree by reference and drills into its own fields via
 * native dot-path nesting (`form.mission`, etc.) - the Signal Forms equivalent of the old
 * cross-component `[formGroup]`/`formControlName` bridging, and no more awkward than doing
 * it one level down like the old code did.
 */
@Component({
  selector: 'rangertrak-mission-details-section',
  standalone: true,
  imports: [CommonModule, FormField, TimePickerComponent, MatFormFieldModule, MatInputModule, MatCardModule],
  templateUrl: './mission-details-section.component.html',
  styleUrls: ['./mission-details-section.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class MissionDetailsSectionComponent {
  @Input({ required: true }) form!: FieldTree<MissionType>
  @Input({ required: true }) opPeriodStart!: Date
  @Input({ required: true }) opPeriodEnd!: Date
  @Input({ required: true }) timePickerLabelStart!: string
  @Input({ required: true }) timePickerLabelEnd!: string

  private devicePrefs = inject(DevicePrefsService)
  private radioLogService = inject(RadioLogService)

  /** E-220 / D-68: this device's station letter, saved as soon as a valid letter is typed. */
  readonly station = signal(this.devicePrefs.getMsgStation())

  /** Numbers the last merge found on two different entries (two devices on one letter). */
  readonly clashes = this.radioLogService.lastMergeClashes

  readonly clashText = computed(() => msgNoClashSentence(this.clashes()))

  onStationInput(event: Event): void {
    const input = event.target as HTMLInputElement
    const letter = input.value.trim().toUpperCase()
    if (/^[A-Z]$/.test(letter) && this.devicePrefs.setMsgStation(letter)) {
      this.station.set(letter)
      input.value = letter
    }
  }

  @Output() timeEventStart = new EventEmitter<Date>()
  @Output() timeEventEnd = new EventEmitter<Date>()
}
