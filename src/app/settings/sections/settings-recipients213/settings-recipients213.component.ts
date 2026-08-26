import { CommonModule } from '@angular/common'
import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core'
import { FormsModule } from '@angular/forms'

import { DEFAULT_RECIPIENT_OPTIONS_213 } from '../../../shared/services/'

/**
 * E-103: the per-mission definable checklist of routine ICS-213 recipients (Incident
 * Commander, Ops Section, EOC, ...) that Entry's "To (recipient(s))" checkboxes render from -
 * see `SettingsType.recipientOptions213`'s own comment.
 *
 * A plain one-option-per-line textarea rather than the ag-Grid `SettingsFieldReportStatusesComponent`
 * uses for statuses: a recipient option is a single string with no per-row properties (no
 * colour, no icon), so a full grid would be pure overhead for what a scribe using this is
 * going to do 95% of the time - add or rename a line. Parses on blur so a half-typed line
 * mid-edit never produces a change event.
 */
@Component({
  selector: 'rangertrak-settings-recipients213',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings-recipients213.component.html',
  styleUrls: ['./settings-recipients213.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class SettingsRecipients213Component implements OnChanges {
  @Input({ required: true }) options: string[] = []
  @Output() optionsChange = new EventEmitter<string[]>()

  /** The textarea's own working text - only reconciled with `options` on external change. */
  text = ''

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['options']) {
      this.text = this.options.join('\n')
    }
  }

  onBlur() {
    this.optionsChange.emit(this.parse(this.text))
  }

  onBtnRestoreStarterList() {
    this.text = DEFAULT_RECIPIENT_OPTIONS_213.join('\n')
    this.optionsChange.emit([...DEFAULT_RECIPIENT_OPTIONS_213])
  }

  private parse(raw: string): string[] {
    return raw.split('\n').map(line => line.trim()).filter(line => line.length > 0)
  }
}
