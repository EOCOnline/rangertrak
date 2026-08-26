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

  /**
   * 2026-08-26 (maintainer): "Default coordinate format for Entry" becomes a real
   * single-choice radio group instead of five independent checkboxes that only happened to
   * behave like one (location.component.ts's preferredSystems() already picked just the
   * first checked one - see this section's own template comment). Maidenhead drops out of
   * the set entirely here: it was never one of the five switchable coordinate systems
   * (LocationComponent.SYSTEM_ORDER), just a sixth checkbox riding along in the same grid.
   * Backed by the same five boolean fields (no schema change) - mat-radio-group is a
   * Material CVA component, so [value]/(change) here rather than [formField], same reason
   * as the mat-checkbox group this replaces.
   */
  currentDefaultFormat(): 'DD' | 'DDM' | 'DMS' | 'MGRS' | 'UTM' {
    if (this.form.showDD().value()) return 'DD'
    if (this.form.showDDM().value()) return 'DDM'
    if (this.form.showDMS().value()) return 'DMS'
    if (this.form.showMGRS().value()) return 'MGRS'
    if (this.form.showUTM().value()) return 'UTM'
    return 'DD'
  }

  selectDefaultFormat(system: 'DD' | 'DDM' | 'DMS' | 'MGRS' | 'UTM'): void {
    this.form.showDD().value.set(system === 'DD')
    this.form.showDDM().value.set(system === 'DDM')
    this.form.showDMS().value.set(system === 'DMS')
    this.form.showMGRS().value.set(system === 'MGRS')
    this.form.showUTM().value.set(system === 'UTM')
  }
}
