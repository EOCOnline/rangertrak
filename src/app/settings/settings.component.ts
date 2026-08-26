import { Subscription } from 'rxjs'

import { CommonModule, DOCUMENT } from '@angular/common'
import { ChangeDetectionStrategy, Component, Inject, OnDestroy, OnInit, computed, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { form, FormField, max, min, required } from '@angular/forms/signals'
import { RouterLink } from '@angular/router'

import { PageComponent } from '../shared/page/page.component'
import {
  FieldReportStatusType, LogService, MissionReadinessService, SETTINGS_SCHEMA_VERSION,
  SettingsService, SettingsType
} from '../shared/services/'
import { InstallUpdateComponent } from '../shared/install-update/install-update.component'

import { MATERIAL_IMPORTS } from '../material-imports'
import { SettingsInstructionsComponent } from './sections/settings-instructions/settings-instructions.component'
import { SettingsMissionSectionComponent } from './sections/settings-mission-section/settings-mission-section.component'
import { SettingsLocationSectionComponent } from './sections/settings-location-section/settings-location-section.component'
import { SettingsMapsSectionComponent } from './sections/settings-maps-section/settings-maps-section.component'
import { SettingsFieldReportStatusesComponent } from './sections/settings-field-report-statuses/settings-field-report-statuses.component'
import { SettingsRecipients213Component } from './sections/settings-recipients213/settings-recipients213.component'
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
  defLat: 0, defLng: 0, allowManualPinDrops: false,
  googleGeocodingApiKey: '',
  showDD: true, showDDM: true, showDMS: true, showMGRS: true, showUTM: true, showMaidenhead: true,
  maplibre: { defZoom: 15, markerScheme: '', overviewDifference: 5, overviewMinZoom: 5, overviewMaxZoom: 16 },
  leaflet: { defZoom: 15, markerScheme: '', overviewDifference: 5, overviewMinZoom: 5, overviewMaxZoom: 16 },
  imageDirectory: '', defFieldReportStatus: 0, fieldReportStatuses: [],
  recipientOptions213: [],
}

@Component({
  selector: 'rangertrak-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    FormField,
    RouterLink,
    ...MATERIAL_IMPORTS,
    PageComponent,
    SettingsInstructionsComponent,
    SettingsMissionSectionComponent,
    SettingsLocationSectionComponent,
    SettingsMapsSectionComponent,
    SettingsFieldReportStatusesComponent,
    SettingsRecipients213Component,
    SettingsAdvancedOptionsComponent,
    InstallUpdateComponent,
  ],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  // Deliberately NOT providing SettingsService: it is providedIn:'root' and a second
  // instance here would diverge from everyone else's. See BUG-2 in entry.component.ts.
})
export class SettingsComponent implements OnInit, OnDestroy {
  private id = 'Settings Component'
  title = 'Mission Settings'
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

    min(path.maplibre.defZoom, 3); max(path.maplibre.defZoom, 22)
    min(path.maplibre.overviewDifference, 1); max(path.maplibre.overviewDifference, 10)
    min(path.maplibre.overviewMinZoom, 1); max(path.maplibre.overviewMinZoom, 10)
    min(path.maplibre.overviewMaxZoom, 3); max(path.maplibre.overviewMaxZoom, 22)
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

  /**
   * E-103: the working list behind the recipients-checklist editor, same "re-seeded from the
   * settings subscription" reasoning as rowData above (Import Mission / Reset Defaults must
   * replace this list, not leave a stale one from the previous mission showing).
   */
  recipientOptions213 = signal<string[]>([])

  /**
   * E-79: the header's readiness dot (ADR D-32) only ever showed the aggregate red/amber/
   * green colour, so a scribe on this page had to hover the header pill and cross-reference
   * its tooltip text back against the sections below to find what was actually wrong.
   * `MissionReadinessService`'s six signals already exist individually - no new
   * decomposition needed, just surfacing them here. Two (mission name, operating period)
   * are set on this very page; the other four (roster, both offline-map signals, storage
   * persistence) are set or fixed elsewhere, so those get a link out rather than a false
   * "see below" pointing at a section that isn't the actual control.
   */
  readonly readinessGaps = computed(() => {
    const r = this.readiness
    const gaps: { label: string, severity: 'red' | 'amber', link?: string, linkText?: string }[] = []
    if (!r.missionNamed()) {
      gaps.push({ label: 'Mission name is not set - see the Mission section below.', severity: 'red' })
    }
    if (!r.rosterLoaded()) {
      gaps.push({
        label: 'Roster is still the untouched sample data.', severity: 'red',
        link: '/rangers', linkText: 'Load the real roster on Rangers',
      })
    }
    if (!r.opPeriodCurrent()) {
      gaps.push({ label: 'Operating period has expired - see the Mission section below.', severity: 'amber' })
    }
    if (!r.offlineTilesSaved()) {
      gaps.push({
        label: 'No offline map tiles saved on this device yet.', severity: 'amber',
        link: '/map', linkText: 'Save an area on the Map page',
      })
    }
    if (!r.bundledMapWarmed()) {
      gaps.push({
        label: 'Backup (MapLibre) map has not been opened on this device yet.', severity: 'amber',
        link: '/map', linkText: 'Open the Map page',
      })
    }
    if (!r.storagePersisted()) {
      gaps.push({ label: 'Storage is not protected from eviction by the browser.', severity: 'amber' })
    }
    return gaps
  })

  constructor(
    private log: LogService,
    private settingsService: SettingsService,
    public readiness: MissionReadinessService,
    @Inject(DOCUMENT) private document: Document) {
    this.log.verbose('======== Constructor() ============', this.id)

    this.settingsSubscription = this.settingsService.getSettingsObserver().subscribe({
      next: (newSettings) => {
        this.log.excessive(`Received new Settings via subscription: ${JSON.stringify(newSettings)}`, this.id)
        this.settings = newSettings

        // reset form based on new settings...
        this.settingsModel.set(newSettings)
        this.rowData.set(this.settings.fieldReportStatuses)
        this.recipientOptions213.set(this.settings.recipientOptions213)

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

  /**
   * E-71. Maintainer, 2026-08-20: "the ending op period time should be the same or later,
   * and set to the same if otherwise older." Enforced from both ends: moving the start past
   * the current end pulls the end up to match (below); setting the end before the current
   * start snaps it to the start (onNewTimeEventEnd). Relies on TimePickerComponent reacting
   * to `[initialDate]` changing after its own init (its `ngOnChanges`) - without that, the
   * clamp would be correct in `settingsModel`/`this.settings` but the end picker's own
   * displayed value would silently disagree until the page was reloaded.
   */
  onNewTimeEventStart(newTime: Date) {
    if (!this.settings) {
      this.log.error(`this.settings is null at onNewTimeEventStart`, this.id)
      return
    }
    this.log.verbose(`Got new start OpPeriod time: ${(newTime)}`, this.id)
    this.settings.opPeriodStart = newTime
    this.opPeriodStart.set(newTime)
    this.settingsModel.update(m => ({ ...m, opPeriodStart: newTime }))

    if (this.opPeriodEnd() < newTime) {
      this.onNewTimeEventEnd(newTime)
    }
  }

  onNewTimeEventEnd(newTime: Date) {
    if (!this.settings) {
      this.log.error(`this.settings is null at onNewTimeEventEnd`, this.id)
      return
    }
    const clamped = newTime < this.opPeriodStart() ? this.opPeriodStart() : newTime
    this.log.verbose(`Got new end OpPeriod time: ${newTime}${clamped !== newTime ? ` (clamped to start: ${clamped})` : ''}`, this.id)
    this.settings.opPeriodEnd = clamped
    this.opPeriodEnd.set(clamped)
    this.settingsModel.update(m => ({ ...m, opPeriodEnd: clamped }))
  }

  /**
   * E-103: the recipients-checklist editor (a plain textarea, one option per line - see
   * SettingsRecipients213Component) emits its parsed list rather than mutating an array in
   * place the way the field-report-statuses grid does, so this mirrors onNewTimeEventStart/
   * End's "child emits, parent writes to both the mirror signal and settingsModel" pattern
   * instead.
   */
  onRecipientOptions213Change(newList: string[]) {
    this.recipientOptions213.set(newList)
    this.settingsModel.update(m => ({ ...m, recipientOptions213: newList }))
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
