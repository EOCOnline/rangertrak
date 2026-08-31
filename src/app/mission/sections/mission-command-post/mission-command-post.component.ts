import { CommonModule } from '@angular/common'
import { ChangeDetectionStrategy, Component, Input } from '@angular/core'
import { FieldTree, FormField } from '@angular/forms/signals'

import { MissionType } from '../../../shared/services/'
import { MATERIAL_IMPORTS } from '../../../material-imports'

/**
 * E-87 Stage 1 (2026-08-31): the opt-in publish-to-Command-Post-Server setting. See
 * `command-post-publish.service.ts`'s own header comment for the full design (the roster
 * never goes over the wire, a failed publish is silent/non-fatal, no join code in this v1).
 *
 * Own small section, same reasoning as mission-recipients213/mission-maps-section splitting
 * out of the monolithic mission.component template - this is a genuinely separate concern
 * (LAN publishing) from the settings around it, not a natural fit inside Advanced Options
 * (which is specifically the destructive/replace-your-data section; this is neither).
 */
@Component({
  selector: 'rangertrak-mission-command-post',
  standalone: true,
  imports: [CommonModule, FormField, ...MATERIAL_IMPORTS],
  templateUrl: './mission-command-post.component.html',
  styleUrls: ['./mission-command-post.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class MissionCommandPostComponent {
  @Input({ required: true }) form!: FieldTree<MissionType>
}
