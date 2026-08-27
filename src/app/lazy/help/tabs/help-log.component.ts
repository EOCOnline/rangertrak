import { ChangeDetectionStrategy, Component } from '@angular/core'
import { RouterLink } from '@angular/router'
import { MatButtonModule } from '@angular/material/button'

/**
 * Help tab: a clearly-labelled way to find the Log page.
 *
 * Raised live, 2026-08-27: the Log page has no nav-menu entry (deliberate, E-57(1) - it is
 * a diagnostic tool, not a workflow page) and was only reachable via a link buried in the
 * "Your data" tab's "Reporting a problem" prose - hard enough to find that the maintainer
 * asked directly whether it should be its own tab instead. This tab exists to answer that:
 * a scribe scanning tab labels for "where is the log" now finds one directly, rather than
 * needing to already know which OTHER tab happens to mention it in passing.
 */
@Component({
  selector: 'rangertrak-help-log',
  standalone: true,
  imports: [RouterLink, MatButtonModule],
  templateUrl: './help-log.component.html',
  styleUrls: ['./help-tab.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class HelpLogComponent { }
