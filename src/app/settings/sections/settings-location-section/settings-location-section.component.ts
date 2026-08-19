import { CommonModule } from '@angular/common'
import { ChangeDetectionStrategy, Component, Input } from '@angular/core'
import { FieldTree, FormField } from '@angular/forms/signals'

import { DisclosureComponent } from '../../../shared/disclosure/disclosure.component'
import { SettingsType } from '../../../shared/services/'

/**
 * Location Defaults (lat/lng/PlusCode/w3wLocale) and its guidance disclosure. Sprint C
 * split out of the 429-line settings.component template - see settings.component.ts.
 */
@Component({
  selector: 'rangertrak-settings-location-section',
  standalone: true,
  imports: [CommonModule, FormField, DisclosureComponent],
  templateUrl: './settings-location-section.component.html',
  styleUrls: ['./settings-location-section.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class SettingsLocationSectionComponent {
  @Input({ required: true }) form!: FieldTree<SettingsType>
  @Input({ required: true }) settings!: SettingsType
}
