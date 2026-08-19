import { CommonModule } from '@angular/common'
import { ChangeDetectionStrategy, Component, Input } from '@angular/core'
import { FieldTree, FormField } from '@angular/forms/signals'

import { SettingsType } from '../../../shared/services/'

/**
 * Maps checkbox, Leaflet settings, Geocoding, and Offline Map (PMTiles) settings. Sprint C
 * split out of the 429-line settings.component template - see settings.component.ts.
 *
 * The old `formGroupName="leaflet"`/`"google"` wrapper divs are gone - Signal Forms' native
 * dot-path nesting (`form.leaflet.defZoom`, `form.google.defZoom`) needs no ambient group
 * context, cross-component or otherwise.
 */
@Component({
  selector: 'rangertrak-settings-maps-section',
  standalone: true,
  imports: [CommonModule, FormField],
  templateUrl: './settings-maps-section.component.html',
  styleUrls: ['./settings-maps-section.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class SettingsMapsSectionComponent {
  @Input({ required: true }) form!: FieldTree<SettingsType>
}
