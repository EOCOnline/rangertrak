import { CommonModule } from '@angular/common'
import { ChangeDetectionStrategy, Component, Input } from '@angular/core'
import { ReactiveFormsModule, UntypedFormGroup } from '@angular/forms'

/**
 * Maps checkbox, Leaflet settings, Geocoding, and Offline Map (PMTiles) settings. Sprint C
 * split out of the 429-line settings.component template - see settings.component.ts.
 *
 * `formGroupName="leaflet"` / `"google"` keep working unchanged here because they resolve
 * within the same component view as the `[formGroup]` directive this component's own root
 * declares - no cross-component ControlContainer bridging needed.
 */
@Component({
  selector: 'rangertrak-settings-maps-section',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './settings-maps-section.component.html',
  styleUrls: ['./settings-maps-section.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class SettingsMapsSectionComponent {
  @Input({ required: true }) form!: UntypedFormGroup
}
