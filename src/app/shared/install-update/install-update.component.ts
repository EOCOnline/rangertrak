import { CommonModule } from '@angular/common'
import { Component, Input, ChangeDetectionStrategy } from '@angular/core'

import { InstallableService, UpdateService } from '../services'

/**
 * E-55: RangerTrak used to offer "install this app" and "a new version is ready" through
 * four different, unrelated implementations - the navbar's own button, Settings' own panel
 * (raw hex colours, a fixed 250px width, opacity:0.8 - see git history), the footer's update
 * indicator, and an entirely separate, never-cleaned-up "Add to Home Screen" button in
 * app.component.ts/.html with its own duplicate `beforeinstallprompt` listener and state
 * (which, unlike the other three, never hid itself after the app was actually installed -
 * InstallableService's `appinstalled` handling didn't apply to it because it wasn't using
 * InstallableService at all). This is the one component now used everywhere: navbar, footer,
 * and Settings all render this instead of their own bespoke markup.
 *
 * An update takes priority over an install offer when both are true at once - a stuck-on-
 * old-build incident (E-43) matters more than a missed install opportunity.
 *
 * E-43 follow-up (2026-08-20): the navbar this renders in is `position: static`, not
 * sticky - confirmed live, scrolling any page 800px hid it completely (top: -47px). A
 * scribe deep in a long Field Reports/Log page during an incident, which is exactly the
 * "stuck on an old build" scenario UpdateService exists for, would not see this instance at
 * all. `[fixed]="true"` (used once, in app.component.html, alongside the back-to-top
 * control) renders ONLY the update-ready state as a `position: fixed` banner independent of
 * scroll and independent of every other instance of this component - it never shows the
 * install offer, since that isn't the urgent case. The navbar/footer/Settings instances are
 * unchanged and still worth keeping: they're the reference a scribe checks deliberately,
 * where the fixed instance is the one that reaches someone who wasn't looking.
 */
@Component({
  selector: 'rangertrak-install-update',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './install-update.component.html',
  styleUrls: ['./install-update.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class InstallUpdateComponent {

  private id = 'Install/Update Component'

  /** Settings gets the fuller explanation; navbar/footer get the compact form only. */
  @Input() detailed = false

  /**
   * E-43: renders only the update-ready state, as a viewport-fixed banner, ignoring
   * `installable` entirely - see the class doc comment. Not meant to be combined with
   * `detailed`.
   */
  @Input() fixed = false

  constructor(
    private installableService: InstallableService,
    private updateService: UpdateService) { }

  get updateReady(): boolean {
    return this.updateService.updateReady()
  }

  get installable(): boolean {
    return this.installableService.installable()
  }

  onReload(): void {
    this.updateService.activateAndReload()
  }

  async onInstall(): Promise<void> {
    await this.installableService.promptInstall()
  }
}
