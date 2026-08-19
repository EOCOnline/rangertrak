import { Subscription } from 'rxjs'

import { CommonModule, DOCUMENT } from '@angular/common'
import { ChangeDetectionStrategy, Component, Inject, OnDestroy, OnInit, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { form, FormField, max, min, required } from '@angular/forms/signals'

import { PageComponent } from '../shared/page/page.component'
import {
  FieldReportStatusType, InstallableService, LogService, SETTINGS_SCHEMA_VERSION, SettingsService,
  SettingsType
} from '../shared/services/'

import { MATERIAL_IMPORTS } from '../material-imports'
import { SettingsInstructionsComponent } from './sections/settings-instructions/settings-instructions.component'
import { SettingsMissionSectionComponent } from './sections/settings-mission-section/settings-mission-section.component'
import { SettingsLocationSectionComponent } from './sections/settings-location-section/settings-location-section.component'
import { SettingsMapsSectionComponent } from './sections/settings-maps-section/settings-maps-section.component'
import { SettingsFieldReportStatusesComponent } from './sections/settings-field-report-statuses/settings-field-report-statuses.component'
import { SettingsAdvancedOptionsComponent } from './sections/settings-advanced-options/settings-advanced-options.component'

// Placeholder used only until the real settings arrive via the constructor's synchronous
// subscription below (SettingsService's ReplaySubject(1) replays its last value
// synchronously to a new subscriber, so this is overwritten before first render) - mirrors
// LocationType's undefinedLocation. Field values here are never shown to the user.
const blankSettings: SettingsType = {
  schemaVersion: SETTINGS_SCHEMA_VERSION,
  settingsName: '', settingsDate: new Date(0),
  mission: '', event: '', eventNotes: '', opPeriod: '',
  opPeriodStart: new Date(0), opPeriodEnd: new Date(0),
  application: '', version: '', debugMode: false,
  defLat: 0, defLng: 0, defPlusCode: '', w3wLocale: '', allowManualPinDrops: false,
  googleGeocodingApiKey: '',
  google: { defZoom: 15, markerScheme: '', overviewDifference: 5, overviewMinZoom: 5, overviewMaxZoom: 16 },
  leaflet: { defZoom: 15, markerScheme: '', overviewDifference: 5, overviewMinZoom: 5, overviewMaxZoom: 16 },
  imageDirectory: '', defFieldReportStatus: 0, fieldReportStatuses: [],
}

@Component({
  selector: 'rangertrak-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    FormField,
    ...MATERIAL_IMPORTS,
    PageComponent,
    SettingsInstructionsComponent,
    SettingsMissionSectionComponent,
    SettingsLocationSectionComponent,
    SettingsMapsSectionComponent,
    SettingsFieldReportStatusesComponent,
    SettingsAdvancedOptionsComponent,
  ],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  // Deliberately NOT providing SettingsService: it is providedIn:'root' and a second
  // instance here would diverge from everyone else's. See BUG-2 in entry.component.ts.
})
export class SettingsComponent implements OnInit, OnDestroy {
  private id = 'Settings Component'
  title = 'Application Settings'
  pageDescr = `Set various defaults and values for use in the program`

  private settingsSubscription!: Subscription
  public settings!: SettingsType

  // Single source of truth for the whole editable form - replaces the old
  // UntypedFormGroup built by getFormArrayFromSettingsArray()/torn back down by
  // getSettingsArrayFromFormArray(). Both are gone: the model IS a SettingsType, so no
  // translation layer is needed. Constructed here, as a field initializer, because
  // form()/required() need an injection context (NG0203) - see Sprint D's Entry/Location
  // conversions for the same pattern; only settingsModel.set() (never a new form()) may
  // happen later, e.g. from the subscription below or ngOnInit.
  // Only defLat/defLng carried Validators.required in the old FormBuilder version - kept
  // here as the one behavior-preserving validator; every other field was already
  // unvalidated (some sections' *.hasError('required') template checks were already dead
  // code against fields with no such validator - preserved as-is, not fixed here).
  private settingsModel = signal<SettingsType>(blankSettings)
  // min/max restored here (Sprint E step 5, 2026-08-19) after being stripped as static HTML
  // attributes to fix NG8022 - Signal Forms owns them from schema, not the template. Values
  // are exactly what the old Reactive Forms template attributes were.
  public settingsForm = form(this.settingsModel, (path) => {
    required(path.defLat); min(path.defLat, -89.99); max(path.defLat, 89.99)
    required(path.defLng); min(path.defLng, -179.99); max(path.defLng, 179.99)

    min(path.leaflet.defZoom, 1); max(path.leaflet.defZoom, 22)
    min(path.leaflet.overviewDifference, 1); max(path.leaflet.overviewDifference, 10)
    min(path.leaflet.overviewMinZoom, 1); max(path.leaflet.overviewMinZoom, 10)
    min(path.leaflet.overviewMaxZoom, 3); max(path.leaflet.overviewMaxZoom, 22)

    min(path.google.defZoom, 3); max(path.google.defZoom, 22)
    min(path.google.overviewDifference, 1); max(path.google.overviewDifference, 10)
    min(path.google.overviewMinZoom, 1); max(path.google.overviewMinZoom, 10)
    min(path.google.overviewMaxZoom, 3); max(path.google.overviewMaxZoom, 22)
  })

  // Mutated in the constructor's settings-subscription next callback, alongside the
  // already-signal settingsModel below - bringing these two in line with it (Sprint G).
  opPeriodStart = signal(new Date())
  opPeriodEnd = signal(new Date())
  timePickerLabelStart = 'Operational Period Start Time'
  timePickerLabelEnd = 'Operational Period End Time'
  imgDir = "./assets/imgs/"  //! NOTE: Hardcoded, not possible to edit & potential security risk?!

  /**
   * The editable working set behind the status/colour grid, owned here and handed to
   * `SettingsFieldReportStatusesComponent` by reference. Unlike the read-only mirrors
   * elsewhere this cannot be a getter - the user edits these rows and the grid's
   * `addStatus()` pushes to them - so it is re-seeded from the settings subscription
   * instead, next to the model reset that already happens there. Snapshotting it only in
   * ngOnInit meant that after Import Mission the grid still showed the *previous*
   * mission's statuses, and saving from that stale grid wrote them back over the imported
   * ones. Same array reference as settingsModel().fieldReportStatuses - grid mutations are
   * visible on submit without any explicit sync.
   */
  rowData = signal<FieldReportStatusType[]>([])

  /** E-37: reads through to the one service that knows. Getter, not a field, so it is not
   *  evaluated before the constructor's parameter properties exist. */
  get isInstallable(): boolean { return this.installableService.installable() }

  constructor(
    private installableService: InstallableService,
    private log: LogService,
    private settingsService: SettingsService,
    @Inject(DOCUMENT) private document: Document) {
    this.log.verbose('======== Constructor() ============', this.id)

    this.settingsSubscription = this.settingsService.getSettingsObserver().subscribe({
      next: (newSettings) => {
        this.log.excessive(`Received new Settings via subscription: ${JSON.stringify(newSettings)}`, this.id)
        this.settings = newSettings

        // reset form based on new settings...
        this.settingsModel.set(newSettings)
        this.rowData.set(this.settings.fieldReportStatuses)

        this.opPeriodStart.set(this.settings.opPeriodStart)
        this.opPeriodEnd.set(this.settings.opPeriodEnd)
        this.log.excessive('Received new Settings via subscription.', this.id)
      },
      error: (e) => this.log.error('Settings Subscription got:' + e, this.id),
      complete: () => this.log.info('Settings Subscription complete', this.id)
    })
  }

  ngOnInit(): void {
    if (this.settings == undefined) {
      this.log.warn('Settings need to be initialized, in ngOnInit.', this.id)
    } else {
      // rowData is seeded by the settings subscription in the constructor (and re-seeded
      // on every later emission), so it is already populated by the time we get here.
      this.log.verbose(`Application: ${this.settings.application} -- Version: ${this.settings.version}`, this.id)
    }

    this.log.verbose("ngInit done ", this.id)
  }

  onNewTimeEventStart(newTime: Date) {
    if (!this.settings) {
      this.log.error(`this.settings is null at onNewTimeEventStart`, this.id)
      return
    }
    this.log.verbose(`Got new start OpPeriod time: ${(newTime)}`, this.id)
    this.settings.opPeriodStart = newTime
    this.opPeriodStart.set(newTime)
    this.settingsModel.update(m => ({ ...m, opPeriodStart: newTime }))
  }

  onNewTimeEventEnd(newTime: Date) {
    if (!this.settings) {
      this.log.error(`this.settings is null at onNewTimeEventEnd`, this.id)
      return
    }
    this.log.verbose(`Got new end OpPeriod time: ${newTime}`, this.id)
    this.settings.opPeriodEnd = newTime
    this.opPeriodEnd.set(newTime)
    this.settingsModel.update(m => ({ ...m, opPeriodEnd: newTime }))
  }

  async onInstallBtn() {
    this.log.verbose(`onInstallBtn: user asked to install the app`, this.id)
    const outcome = await this.installableService.promptInstall()
    this.log.info(`Install prompt outcome: ${outcome}`, this.id)
  }

  onBtnResetDefaults() {
    this.log.verbose(`onBtnResetDefaults: Reset Settings.`, this.id)
    this.settings = this.settingsService.ResetDefaults() // need to refresh page?!
  }

  reloadPage() {
    //REVIEW: Does this zap existing changes elsewhere on the page (used for reseting field statuses..)
    this.log.verbose(`Reloading window!`, this.id)
    window.location.reload()
  }

  onFormSubmit(): void {
    this.log.verbose("onFormSubmit: Update Settings...", this.id)
    const newSettings: SettingsType = {
      ...this.settingsModel(),
      imageDirectory: this.imgDir,  //! SECURITY: BUGBUG: Hardcoded image directory: should this be confidential/encrypted for security?
    }
    this.settingsService.updateSettings(newSettings)

    this.log.verbose(`onFormSubmit: Reloading window!`, this.id)
    this.reloadPage()
  }

  //TODO: Use Utility functions with same name...
  displayHide(htmlElementID: string) {
    let e = this.document.getElementById(htmlElementID)
    if (e) {
      e.style.visibility = "hidden";
    }
  }

  displayShow(htmlElementID: string = 'settings__ColorChart-img') {
    let e = this.document.getElementById(htmlElementID)
    if (e) {
      e.style.visibility = "visible";
    }
  }

  ngOnDestroy() {
    this.settingsSubscription?.unsubscribe()
  }
}
