import { ChangeDetectionStrategy, Component } from '@angular/core'

/**
 * Help tab: choosing between the two map engines, and route trails.
 *
 * F29-36 (2026-08-29): trimmed of button-pressing instructions (saving an area, reading
 * markers/clusters, isolating selected reports) that duplicated the Map page's own Guide
 * drawer - see this file's own template comment.
 *
 * E-84: the Help page was one long scroll of ~8 prose blocks plus three disclosures, which
 * is why six shipped features ended up documented nowhere - there was no obvious place to
 * put them and no way to tell what was already covered. Each tab is its own component so a
 * section can be rewritten without touching the others, and so the shell stays readable.
 *
 * Content rule for every tab in this folder: describe only controls that actually exist and
 * work. See "E-84 Documentation Rewrite Plan.md" section 2 for the audited keep/remove list -
 * several controls on screen today are scheduled for removal and must NOT be documented.
 */
@Component({
  selector: 'rangertrak-help-maps',
  standalone: true,
  imports: [],
  templateUrl: './help-maps.component.html',
  styleUrls: ['./help-tab.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class HelpMapsComponent { }
