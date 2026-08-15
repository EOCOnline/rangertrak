import { CommonModule } from '@angular/common'
import { ChangeDetectionStrategy, Component, Input } from '@angular/core'

import { HeaderComponent } from '../header/header.component'

/**
 * The shell every routed page sits in.
 *
 * Before this, all eight routed pages opened with the same two lines -
 *
 *    <pageHeader [parentTitle]="title" [pageDescription]="pageDescr"></pageHeader>
 *    <section class="main">
 *
 * - and every one of them then defined `.main { margin: 0 1em }` in its own stylesheet.
 * Eight copies of a two-property rule, one of which had quietly drifted to
 * `margin: 0 0 0 1em`. That is the per-page duplication Sprint B exists to remove
 * (PRIVATE-Roadmap.md 19c).
 *
 * Usage:
 *    <rangertrak-page [title]="title" [description]="pageDescr">
 *      ...page content...
 *    </rangertrak-page>
 *
 * `showHeader` exists for About, which is the one page with no mission strip of its own.
 */
@Component({
  selector: 'rangertrak-page',
  standalone: true,
  imports: [CommonModule, HeaderComponent],
  templateUrl: './page.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./page.component.scss']
})
export class PageComponent {
  @Input() title = ''
  @Input() description = ''
  @Input() showHeader = true
}
