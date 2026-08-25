import { CommonModule } from '@angular/common'
import { ChangeDetectionStrategy, Component, Input } from '@angular/core'
import { FieldTree, FormField } from '@angular/forms/signals'

import { SectionComponent } from '../../../shared/section/section.component'
import { SettingsType } from '../../../shared/services/'

/**
 * Location Defaults (lat/lng) and its guidance section. Sprint C split out of the
 * 429-line settings.component template - see settings.component.ts. defPlusCode and
 * w3wLocale used to live here too - both removed 2026-08-25 as dead controls (E-89/E-90).
 */
@Component({
  selector: 'rangertrak-settings-location-section',
  standalone: true,
  imports: [CommonModule, FormField, SectionComponent],
  templateUrl: './settings-location-section.component.html',
  styleUrls: ['./settings-location-section.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class SettingsLocationSectionComponent {
  @Input({ required: true }) form!: FieldTree<SettingsType>
  @Input({ required: true }) settings!: SettingsType
}
