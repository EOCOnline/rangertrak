import { ChangeDetectionStrategy, Component } from '@angular/core'
import { MatExpansionModule } from '@angular/material/expansion'

import { ExpandableSectionComponent } from '../../../shared/expandable-section/expandable-section.component'

/**
 * Help tab: Short answers to the questions the app itself raises most often.
 *
 * E-84: the Help page was one long scroll of ~8 prose blocks plus three disclosures, which
 * is why six shipped features ended up documented nowhere - there was no obvious place to
 * put them and no way to tell what was already covered. Each tab is its own component so a
 * section can be rewritten without touching the others, and so the shell stays readable.
 *
 * Content rule for every tab in this folder: describe only controls that actually exist and
 * work. See "E-84 Documentation Rewrite Plan.md" section 2 for the audited keep/remove list -
 * several controls on screen today are scheduled for removal and must NOT be documented.
 *
 * F29-31 (2026-08-29): answers are now collapsed by default via ExpandableSectionComponent,
 * several can be open at once (`multi` on the wrapping `mat-accordion`).
 */
@Component({
  selector: 'rangertrak-help-faq',
  standalone: true,
  imports: [MatExpansionModule, ExpandableSectionComponent],
  templateUrl: './help-faq.component.html',
  styleUrls: ['./help-tab.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class HelpFaqComponent { }
