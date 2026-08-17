import { CommonModule } from '@angular/common'
import { ChangeDetectionStrategy, Component, EventEmitter, Output } from '@angular/core'

import { DisclosureComponent } from '../../../shared/disclosure/disclosure.component'
import {
  BackupService, LogService, SampleDataService, StoragePersistenceService
} from '../../../shared/services/'

/**
 * The "Advanced Options" disclosure: Storage Protection, Mission Backup (export/import),
 * Sample Data, and the Font Explorium. Sprint C split out of the 429-line
 * settings.component template - see settings.component.ts for the rest.
 *
 * Injects its own services directly (all `providedIn: 'root'`) rather than threading them
 * down as Inputs, since none of this section's actions need to hand anything back to the
 * parent except "reset defaults", which does affect sibling sections' displayed `settings`
 * and stays owned there.
 */
@Component({
  selector: 'rangertrak-settings-advanced-options',
  standalone: true,
  imports: [CommonModule, DisclosureComponent],
  templateUrl: './settings-advanced-options.component.html',
  styleUrls: ['./settings-advanced-options.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class SettingsAdvancedOptionsComponent {
  private id = 'Settings Advanced Options Component'

  @Output() resetDefaults = new EventEmitter<void>()

  fonts = ["'Open Sans'", "Montserrat", "Roboto", "'Playfair Display'", "Lato", "Merriweather", "Helvetica", "Lora", "'PT Serif'", "Spectral", "'Times New Roman'", "'Akaya Telivigala'",
    "'Open Sans Condensed'", "'Saira Extra Condensed'", "Boogaloo", "Anton", "'Faster One'", "'Arima Madurai'"]
  // https://en.wikipedia.org/wiki/Pangram
  pangrams = ["Pack my box with five dozen liquor jugs",
    "The quick brown fox jumps over the lazy dog",
    "Glib jocks quiz nymph to vex dwarf.",
    "Sphinx of black quartz, judge my vow.",
    "How vexingly quick daft zebras jump!",
    "The five boxing wizards jump quickly.",
    "Jackdaws love my big sphinx of quartz."]
  pangram: string

  constructor(
    private backupService: BackupService,
    private sampleDataService: SampleDataService,
    public storagePersistence: StoragePersistenceService,
    private log: LogService) {
    this.pangram = this.getPangram()
  }

  onBtnRequestPersistence() {
    this.log.verbose('onBtnRequestPersistence: re-requesting persistent storage.', this.id)
    this.storagePersistence.requestPersistence()
  }

  /**
   * Downloads the current mission (settings + rangers + field reports) as a
   * single JSON file. See PRIVATE-Roadmap.md Section 8/R3.
   */
  onBtnExportMission() {
    // The export bundles the full ranger roster, so it carries the same personal data as
    // the Rangers page warns about - in an unencrypted file this app can no longer
    // protect once written.
    if (!confirm(`Export this mission to a file?\n\n`
      + `The file includes the full ranger roster - legal names, home addresses, personal `
      + `phone numbers and call signs - and is NOT encrypted.\n\n`
      + `Store it somewhere appropriate, share it only with people who need it for this `
      + `mission, and delete it when the mission is over.`)) {
      this.log.verbose('onBtnExportMission: user cancelled export.', this.id)
      return
    }

    this.log.verbose('onBtnExportMission: Exporting mission.', this.id)
    this.backupService.exportMission()
  }

  /**
   * Handles a file picked via the "Import Mission" <input type="file">.
   * Destructive - replaces current settings/rangers/field reports entirely -
   * so this confirms with the user before applying.
   */
  onImportFileSelected(event: Event) {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    input.value = '' // allow re-selecting the same file later

    if (!file) {
      return
    }

    this.backupService.readFileAsMissionExport(file)
      .then(payload => {
        const summary = `Mission "${payload.settings.mission || '(unnamed)'}" exported `
          + `${payload.exportedAt}, with ${payload.rangers.length} rangers and `
          + `${payload.fieldReports.fieldReportArray.length} field reports.`

        if (!confirm(`Import this mission?\n\n${summary}\n\n`
          + `This REPLACES all current settings, rangers, and field reports on this device. `
          + `This cannot be undone - export the current mission first if you want to keep it.`)) {
          this.log.verbose('onImportFileSelected: user cancelled import.', this.id)
          return
        }

        this.backupService.importMission(payload)
        this.log.warn(`Imported mission from ${file.name}.`, this.id)
        alert('Mission imported. Reloading to refresh every screen with the new data...')
        window.location.reload()
      })
      .catch(error => {
        this.log.error(`onImportFileSelected: failed to import ${file.name}: ${error.message}`, this.id)
        alert(`Could not import "${file.name}": ${error.message}`)
      })
  }

  /**
   * Loads the built-in demonstration mission. Destructive - replaces rangers and
   * field reports - so it confirms first, matching onImportFileSelected().
   */
  onBtnLoadSampleData() {
    if (!confirm(`Load the sample mission?\n\n`
      + `This REPLACES all rangers and field reports currently on this device with `
      + `demonstration data, and renames the mission to make that obvious.\n\n`
      + `This cannot be undone - export the current mission first if you want to keep it.`)) {
      this.log.verbose('onBtnLoadSampleData: user cancelled.', this.id)
      return
    }

    this.sampleDataService.loadSampleMission()
    this.log.warn('Loaded the sample mission (demo data).', this.id)
    alert('Sample mission loaded. Reloading to refresh every screen with the new data...')
    window.location.reload()
  }

  getPangram() {
    return this.pangrams[Math.floor(Math.random() * this.pangrams.length)]
  }
}
