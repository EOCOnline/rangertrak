import { CommonModule } from '@angular/common'
import { ChangeDetectionStrategy, Component, Input, OnDestroy, signal } from '@angular/core'
import { FieldTree, FormField } from '@angular/forms/signals'

import { LogService, MissionType } from '../../../shared/services/'
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
export class MissionCommandPostComponent implements OnDestroy {
  @Input({ required: true }) form!: FieldTree<MissionType>

  constructor(private log: LogService) {
    this.phoneMediaQuery.addEventListener('change', this.onPhoneMediaChange)
  }

  /**
   * Asked directly, 2026-08-31: "does the mission section explain it won't work, just on a
   * laptop running an OS - if running on a smartphone?" Before this it only ever said so in
   * generic prose (the note above, "on a command-post laptop... a phone or tablet can publish
   * ... but cannot run the server itself"), true for every reader but not TARGETED at someone
   * actually reading it on a phone right now. Same breakpoint/pattern `radio-log.component.ts`'s
   * own `isPhone` already established (`(max-width: 575px)`, matching `_breakpoints.scss`'s
   * `phone` mixin) - reused rather than a second detection mechanism - drives an extra,
   * specific callout in the template for that case, on top of the general explanation, which
   * stays because it's also what a LAPTOP user reads when wondering whether a teammate's phone
   * could run this instead.
   */
  private phoneMediaQuery = window.matchMedia('(max-width: 575px)')
  isPhone = signal(this.phoneMediaQuery.matches)
  private onPhoneMediaChange = (e: MediaQueryListEvent) => this.isPhone.set(e.matches)

  ngOnDestroy(): void {
    this.phoneMediaQuery.removeEventListener('change', this.onPhoneMediaChange)
  }

  /**
   * Raised live 2026-08-31: "does the entry field explain it & maybe display it so it can be
   * copy/pasted elsewhere in the future?" - the server address only ever lived in the
   * console's own scrollback and whatever got typed into the field once; nothing let the
   * operator grab it back out of RangerTrak itself later (hours in, to tell a new viewer, with
   * the terminal window long since scrolled past or closed). Same `navigator.clipboard.
   * writeText()` idiom `location.component.ts`'s `copyCoordinate()` already established for
   * exactly this "click a read-only value to copy it" need, reused rather than invented fresh
   * - including its `.catch()`, since clipboard access can be refused (insecure context, a
   * permissions policy) and a silent failure would leave the operator believing a copy
   * happened when it didn't.
   */
  copiedField = signal<'address' | 'view' | null>(null)

  /**
   * Asked directly, 2026-08-31: should the copy buttons go disabled/inactive with a note on
   * browsers where they cannot work, smartphones included? Checked rather than assumed: a
   * BLANKET phone check would be wrong (modern mobile Safari/Chrome support
   * `navigator.clipboard.writeText()` fine) - the real, narrower condition is whether the API
   * itself exists at all, which is also the gap `copyToClipboard()` had before this: calling
   * `.writeText()` when `navigator.clipboard` is undefined throws SYNCHRONOUSLY, before any
   * Promise exists to `.catch()` - an uncaught error, not the graceful failure the `.catch()`
   * below only handles the (much more common) case of - permission refused, not API absent.
   */
  clipboardAvailable = typeof navigator !== 'undefined'
    && typeof navigator.clipboard?.writeText === 'function'

  /**
   * Reported live 2026-08-31, v0.90: "copy didn't seem to work." The real bug, found by
   * re-reading this rather than guessing at a browser quirk: a failed `writeText()` only ever
   * logged to the Log page - nowhere a user testing a button would think to look. Silent
   * failure and silent success looked identical from the button itself. `clipboardAvailable`
   * only confirms the API EXISTS; the write can still be refused at call time (a permissions
   * policy, an unfocused document, a one-off browser quirk), and now that case is visible -
   * same `alert()` convention this app already uses for every other user-facing failure
   * (mission-zip.ts, report-packet.ts, prep.component.ts).
   */
  copyToClipboard(field: 'address' | 'view', value: string): void {
    if (!this.clipboardAvailable) {
      return // button is disabled in this state - see the template - but guard here too
    }
    navigator.clipboard.writeText(value)
      .then(() => {
        this.copiedField.set(field)
        this.log.excessive(`Command Post ${field} "${value}" copied to clipboard`, 'Mission Command Post')
      })
      .catch(err => {
        this.log.error(`Command Post ${field} NOT copied to clipboard, error: ${err}`, 'Mission Command Post')
        alert(`Could not copy to the clipboard. Select the text and copy it manually.\n\n${value}`)
      })
  }

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
