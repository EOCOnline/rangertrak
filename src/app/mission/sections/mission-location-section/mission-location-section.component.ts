import { CommonModule } from '@angular/common'
import { ChangeDetectionStrategy, Component, Input } from '@angular/core'
import { FieldTree, FormField } from '@angular/forms/signals'

import { MissionType } from '../../../shared/services/'
import { MATERIAL_IMPORTS } from '../../../material-imports'

/**
 * Location Defaults (lat/lng) and the coordinate systems Entry offers. Sprint C split out of the
 * 429-line mission.component template - see mission.component.ts. defPlusCode and
 * w3wLocale used to live here too - both removed 2026-08-25 as dead controls (E-89/E-90).
 */
@Component({
  selector: 'rangertrak-mission-location-section',
  standalone: true,
  imports: [CommonModule, FormField, ...MATERIAL_IMPORTS],
  templateUrl: './mission-location-section.component.html',
  styleUrls: ['./mission-location-section.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class MissionLocationSectionComponent {
  @Input({ required: true }) form!: FieldTree<MissionType>
  @Input({ required: true }) settings!: MissionType
}
