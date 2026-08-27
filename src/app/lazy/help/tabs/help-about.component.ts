import { ChangeDetectionStrategy, Component } from '@angular/core'

/**
 * Help tab: what RangerTrak is and who it is for - split out of "Start here" 2026-08-27
 * (raised live: that tab was doing two jobs at once, description and onboarding steps).
 *
 * Content rule for every tab in this folder: describe only controls that actually exist and
 * work. See "E-84 Documentation Rewrite Plan.md" section 2 for the audited keep/remove list -
 * several controls on screen today are scheduled for removal and must NOT be documented.
 */
@Component({
  selector: 'rangertrak-help-about',
  standalone: true,
  imports: [],
  templateUrl: './help-about.component.html',
  styleUrls: ['./help-tab.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class HelpAboutComponent { }
