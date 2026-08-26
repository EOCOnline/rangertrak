import { CommonModule } from '@angular/common'
import { ChangeDetectionStrategy, Component } from '@angular/core'

import { SectionComponent } from '../../../shared/section/section.component'

/**
 * Static "Instructions" disclosure at the top of the Settings form. Sprint C split out of
 * the 429-line mission.component template - see mission.component.ts for the rest.
 */
@Component({
  selector: 'rangertrak-mission-instructions',
  standalone: true,
  imports: [CommonModule, SectionComponent],
  templateUrl: './mission-instructions.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class MissionInstructionsComponent { }
