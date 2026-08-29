import { CommonModule } from '@angular/common'
import { ChangeDetectionStrategy, Component, Input } from '@angular/core'
import { FieldTree, FormField } from '@angular/forms/signals'

import { MissionType } from '../../../shared/services/'
import { MATERIAL_IMPORTS } from '../../../material-imports'

/**
 * Maps checkbox, Leaflet settings, Geocoding, and Alternative Map (MapLibre + PMTiles) settings.
 * Sprint C split out of the 429-line mission.component template - see mission.component.ts.
 *
 * The old `formGroupName="leaflet"`/`"google"` wrapper divs are gone - Signal Forms' native
 * dot-path nesting (`form.leaflet.defZoom`, `form.maplibre.defZoom`) needs no ambient group
 * context, cross-component or otherwise.
 */
@Component({
  selector: 'rangertrak-mission-maps-section',
  standalone: true,
  imports: [CommonModule, FormField, ...MATERIAL_IMPORTS],
  templateUrl: './mission-maps-section.component.html',
  styleUrls: ['./mission-maps-section.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class MissionMapsSectionComponent {
  @Input({ required: true }) form!: FieldTree<MissionType>
}
