import { ChangeDetectionStrategy, Component, input, output } from '@angular/core'
import { MatButtonModule } from '@angular/material/button'
import { MatChipsModule } from '@angular/material/chips'
import { MatIconModule } from '@angular/material/icon'
import type { FilterChip } from '../../domain/grid-filter-chips'

/**
 * E-190: a strip naming every filter that is hiding rows, each with an x, plus "Show everything".
 * Page-agnostic - the Rangers and Radio Log grids feed it today, the Map later. Renders nothing
 * (no empty band) when there are no chips.
 */
@Component({
  selector: 'rangertrak-filter-chips',
  standalone: true,
  imports: [MatChipsModule, MatButtonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './filter-chips.component.html',
  styleUrl: './filter-chips.component.scss',
})
export class FilterChipsComponent {
  chips = input<FilterChip[]>([])
  clear = output<string>()
  clearAll = output<void>()
}
