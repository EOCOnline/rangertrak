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
