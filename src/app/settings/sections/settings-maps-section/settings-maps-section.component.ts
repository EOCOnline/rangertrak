import { CommonModule } from '@angular/common'
import { ChangeDetectionStrategy, Component, Input } from '@angular/core'
import { FieldTree, FormField } from '@angular/forms/signals'

import { SettingsType } from '../../../shared/services/'
import { MATERIAL_IMPORTS } from '../../../material-imports'

/**
 * Maps checkbox, Leaflet settings, Geocoding, and Backup Map (MapLibre + PMTiles) settings.
 * Sprint C split out of the 429-line settings.component template - see settings.component.ts.
 *
 * The old `formGroupName="leaflet"`/`"google"` wrapper divs are gone - Signal Forms' native
 * dot-path nesting (`form.leaflet.defZoom`, `form.maplibre.defZoom`) needs no ambient group
 * context, cross-component or otherwise.
 */
@Component({
  selector: 'rangertrak-settings-maps-section',
  standalone: true,
  imports: [CommonModule, FormField, ...MATERIAL_IMPORTS],
  templateUrl: './settings-maps-section.component.html',
  styleUrls: ['./settings-maps-section.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class SettingsMapsSectionComponent {
  @Input({ required: true }) form!: FieldTree<SettingsType>
}
