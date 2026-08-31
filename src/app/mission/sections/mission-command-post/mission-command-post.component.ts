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
   * confirm the /view page actually works without hand-typing it into a second tab. Doubles
   * as the one-time certificate-acceptance step now that the server is self-signed HTTPS (see
   * `command-post-server.js`'s own `getOrCreateCert()` comment for why): clicking this link IS
   * the direct visit that shows the browser's "not private" prompt, which must be accepted
   * once before `CommandPostPublishService`'s own `fetch()` can succeed. Still deliberately a
   * plain `<a>`, not a live reachability ping - a fetch()-based check would need that SAME
   * one-time acceptance first, so it could never distinguish "not accepted yet" from "actually
   * down," and would be misleading either way until a device has clicked through once.
   */
  viewUrl(): string {
    const base = (this.form.commandPostServerUrl().value() || '').trim().replace(/\/+$/, '')
    return base ? `${base}/view` : ''
  }

  /**
   * Raised live 2026-08-31, same session as the HTTPS fix: nothing here validates the
   * address at all, so a `http://` entry - old muscle memory, a stale note, a copied-down
   * screenshot from before this fix - is accepted silently and fails with the EXACT SAME
   * symptom ("is the server running?") that caused the whole mixed-content investigation.
   * A field-level check catches this one specific, easy-to-hit mistake before it costs
   * another round of "why isn't this working" - not general URL validation, just the one
   * thing this codebase now knows is silently fatal.
   */
  entersPlainHttp(): boolean {
    return /^http:\/\//i.test((this.form.commandPostServerUrl().value() || '').trim())
  }
}
