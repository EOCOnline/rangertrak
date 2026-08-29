import { ChangeDetectionStrategy, Component } from '@angular/core'
import { RouterLink } from '@angular/router'

/**
 * Help tab: what to do with a device's data once a mission wraps up.
 *
 * F29-33 (2026-08-29): split out of "Your data"'s "Starting a device over" section, which
 * was one paragraph buried at the bottom of a tab mostly about WHERE data lives and WHY the
 * roster is confidential - not WHAT to do once an operational period ends. Kept in sync with
 * "Your data" deliberately (same terms, same page/button references) rather than duplicating
 * its confidentiality reasoning here.
 *
 * Content rule for every tab in this folder: describe only controls that actually exist and
 * work. See "E-84 Documentation Rewrite Plan.md" section 2 for the audited keep/remove list -
 * several controls on screen today are scheduled for removal and must NOT be documented.
 */
@Component({
  selector: 'rangertrak-help-after-mission',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './help-after-mission.component.html',
  styleUrls: ['./help-tab.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class HelpAfterMissionComponent { }
