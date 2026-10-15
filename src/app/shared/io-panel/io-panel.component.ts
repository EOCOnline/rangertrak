import { ChangeDetectionStrategy, Component, inject } from '@angular/core'

import { MATERIAL_IMPORTS } from '../../material-imports'
import { ExpandableSectionComponent } from '../expandable-section/expandable-section.component'
import { FieldModeService } from '../services/field-mode.service'

/**
 * The "Import, export & print" panel (E-187 Layers, ADR D-58 item 4): one collapsible block at
 * the bottom of Rangers - and, in phase B, Map - that holds the cards for bringing lists in,
 * handing them on and printing them.
 *
 * Deliberately page-agnostic: it knows nothing about rosters or places. A page projects its own
 * `<mat-card appearance="outlined" class="rt-mission-card rt-io-card">`s into it and they sit in
 * the shared `.rt-action-bar-group` grid (side by side on a laptop, stacked on a phone).
 *
 * Shown whenever the device is not in field mode. `fieldModeGuard` already keeps a field phone
 * off both pages, so this is belt and braces and needs no setting of its own.
 */
@Component({
  selector: 'rangertrak-io-panel',
  standalone: true,
  imports: [ExpandableSectionComponent, ...MATERIAL_IMPORTS],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './io-panel.component.html',
  styleUrls: ['./io-panel.component.scss'],
})
export class IoPanelComponent {
  protected readonly fieldMode = inject(FieldModeService)
}
