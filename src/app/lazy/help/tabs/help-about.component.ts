import { DatePipe } from '@angular/common'
import { ChangeDetectionStrategy, Component } from '@angular/core'

import { SectionComponent } from '../../../shared/section/section.component'

/**
 * Help tab: what RangerTrak is and who it is for - split out of "Start here" 2026-08-27
 * (raised live: that tab was doing two jobs at once, description and onboarding steps).
 *
 * Content rule for every tab in this folder: describe only controls that actually exist and
 * work. See "E-84 Documentation Rewrite Plan.md" section 2 for the audited keep/remove list -
 * several controls on screen today are scheduled for removal and must NOT be documented.
 *
 * F29-25 (2026-08-29): the About paragraph and How-it's-built section moved here from
 * help.component.html, which used to render them below the tab group - outside
 * mat-tab-group, so they showed under whichever tab was open rather than only on this one.
 * The feedback form that also landed here in that pass moved again, to the Feedback tab
 * (D-d, same day) - see help-feedback.component.ts.
 *
 * Live report, 2026-08-30: the licence section had NOT actually followed the F29-25 move
 * despite this file's own doc comment claiming it had - it was still sitting in
 * help.component.html, outside that page's mat-tab-group, so it kept rendering below every
 * tab rather than only About. Moved here for real now, alongside its `today` (used only by
 * the copyright line's year).
 */
@Component({
  selector: 'rangertrak-help-about',
  standalone: true,
  imports: [SectionComponent, DatePipe],
  templateUrl: './help-about.component.html',
  styleUrls: ['./help-tab.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class HelpAboutComponent {
  today = new Date()
}
