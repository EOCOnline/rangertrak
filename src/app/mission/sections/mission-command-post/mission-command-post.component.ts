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

  /**
   * Raised live 2026-08-31: "a URL to click" alongside the address field, so the operator can
   * confirm the /view page actually works without hand-typing it into a second tab. A plain
   * `<a>` (see the template), not a `fetch()`-based reachability check - the latter would hit
   * mixed content: this app is served over HTTPS, the command-post server is deliberately
   * plain HTTP (`command-post-publish.service.ts`'s own "WiFi password is the boundary"
   * design), and browsers block an HTTPS page's own `fetch()`/XHR to an HTTP endpoint
   * outright. A top-level navigation via a link is not subject to that restriction, which is
   * exactly why this is a link and not a live status ping.
   */
  viewUrl(): string {
    const base = (this.form.commandPostServerUrl().value() || '').trim().replace(/\/+$/, '')
    return base ? `${base}/view` : ''
  }
}
