import { CommonModule, DOCUMENT, formatDate } from '@angular/common'
import { Component, Inject, ChangeDetectionStrategy } from '@angular/core'

import { LogService, SettingsService, UpdateService } from '../services'

/**
 * Footer component
 */
@Component({
  selector: 'rangertrak-footer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './footer.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./footer.component.scss']
})
export class FooterComponent {

  private id = 'Footer Component'

  today = new Date()

  /**
   * Read through to the service rather than snapshotting into a field in
   * ngOnInit, which is what this used to do. SettingsService.settings reads a
   * signal, so the template picks up later emissions - Import Mission, Load
   * Sample Mission and Reset Settings all republish settings, and the old
   * snapshot left the footer showing the previous mission's version forever.
   */
  get version(): string {
    return this.settingsService.settings?.version ?? ''
  }

  /** A newer build is downloaded and waiting - see UpdateService (R7). */
  get updateReady(): boolean {
    return this.updateService.updateReady()
  }

  /** When the browser last confirmed this build was current. */
  get lastChecked(): string {
    return this.updateService.lastChecked()
  }

  /**
   * The update-check timestamp used to print in the footer as "(checked 8/15/26, 9:01 AM)".
   * It earned its place while R7 was unproven, but 19i confirmed the update path works
   * against the real deployment - so it is now a tooltip on the version instead of standing
   * text. The information is still one hover away, which matters when diagnosing a device
   * that has been offline: "when did this last reach the network?" is a real field question.
   */
  get versionTitle(): string {
    return this.lastChecked
      ? `Last checked for a newer version: ${formatDate(this.lastChecked, 'short', 'en-US')}`
      : 'This build has not yet checked for a newer version on this device'
  }

  constructor(
    private log: LogService,
    private settingsService: SettingsService,
    private updateService: UpdateService,
    @Inject(DOCUMENT) private document: Document) {

    this.log.excessive(`======== Constructor() ============`, this.id)
  }

  onReloadForUpdate(): void {
    this.updateService.activateAndReload()
  }
}
