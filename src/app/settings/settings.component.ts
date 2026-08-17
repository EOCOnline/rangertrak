import { Subscription } from 'rxjs'

import { CommonModule, DOCUMENT } from '@angular/common'
import { Component, enableProdMode, Inject, OnDestroy, OnInit, ViewChild, ChangeDetectionStrategy } from '@angular/core'
import {
  AbstractControl, FormArray, UntypedFormBuilder, UntypedFormControl, UntypedFormGroup, Validators
} from '@angular/forms'

import { FormsModule, ReactiveFormsModule } from '@angular/forms'

import { PageComponent } from '../shared/page/page.component'
import {
  FieldReportStatusType, InstallableService, LogService, SettingsService, SettingsType
} from '../shared/services/'
//import { Color } from '@angular-material-components/color-picker';
//import { ThemePalette } from '@angular/material/core';
//import { MoodEditor } from './mood-editor.component'
//import { MoodRenderer } from './mood-renderer.component'

import { MATERIAL_IMPORTS } from '../material-imports'
import { SettingsInstructionsComponent } from './sections/settings-instructions/settings-instructions.component'
import { SettingsMissionSectionComponent } from './sections/settings-mission-section/settings-mission-section.component'
import { SettingsLocationSectionComponent } from './sections/settings-location-section/settings-location-section.component'
import { SettingsMapsSectionComponent } from './sections/settings-maps-section/settings-maps-section.component'
import { SettingsFieldReportStatusesComponent } from './sections/settings-field-report-statuses/settings-field-report-statuses.component'
import { SettingsAdvancedOptionsComponent } from './sections/settings-advanced-options/settings-advanced-options.component'

@Component({
  selector: 'rangertrak-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
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
  providers: [SettingsService]
})
export class SettingsComponent implements OnInit, OnDestroy {
  @ViewChild('timePicker') timePicker: any; // https://blog.angular-university.io/angular-viewchild/

  private id = 'Settings Component'
  title = 'Application Settings'
  pageDescr = `Set various defaults and values for use in the program`

  private settingsSubscription!: Subscription
  public settings!: SettingsType

  public settingsEditorForm!: UntypedFormGroup
  //  public leaflet!: FormGroup
  //  public google!: FormGroup

  // Get time events from <timepicker> component
  private timeSubscriptionStart$!: Subscription
  private timeSubscriptionEnd$!: Subscription
  public time!: Date
  dateCtrl = new UntypedFormControl(new Date())
  timepickerFormControlStart!: UntypedFormControl
  timepickerFormControlEnd!: UntypedFormControl

  opPeriodStart = new Date()
  opPeriodEnd = new Date()
  timePickerLabelStart = 'Operational Period Start Time'
  timePickerLabelEnd = 'Operational Period End Time'
  imgDir = "./assets/imgs/"  //! NOTE: Hardcoded, not possible to edit & potential security risk?!

  /**
   * The editable working set behind the status/colour grid, owned here and handed to
   * `SettingsFieldReportStatusesComponent` by reference. Unlike the read-only mirrors
   * elsewhere this cannot be a getter - the user edits these rows and the grid's
   * `addStatus()` pushes to them - so it is re-seeded from the settings subscription
   * instead, next to the form reset that already happens there. Snapshotting it only in
   * ngOnInit meant that after Import Mission the grid still showed the *previous*
   * mission's statuses, and saving from that stale grid wrote them back over the imported
   * ones.
   */
  rowData: FieldReportStatusType[] = []

  /*
  colorCtr: AbstractControl = new FormControl(new Color(255, 243, 200), [Validators.required])
  //colorCtr: string = new FormControl(new Color(255, 243, 0), [Validators.required])
  colorCntlDisabled = false
  touchUi = false
  public color: ThemePalette = 'primary';
*/

  /** E-37: reads through to the one service that knows. Getter, not a field, so it is not
   *  evaluated before the constructor's parameter properties exist. */
  get isInstallable(): boolean { return this.installableService.installable() }

  constructor(
    private fb: UntypedFormBuilder,
    /*  No suitable injection token for parameter 'fb' of class 'SettingsComponent'.
      Consider using the @Inject decorator to specify an injection token.(-992003)
      settings.component.ts(155, 17): This type does not have a value, so it cannot be used as injection token.
    */
    //private fieldReportService: FieldReportService,
    private installableService: InstallableService,
    private log: LogService,
    //private rangerService: RangerService,
    private settingsService: SettingsService,
    @Inject(DOCUMENT) private document: Document) {
    this.log.verbose('======== Constructor() ============', this.id)

    this.settingsSubscription = this.settingsService.getSettingsObserver().subscribe({
      next: (newSettings) => {
        this.log.excessive(`Received new Settings via subscription: ${JSON.stringify(newSettings)}`, this.id)
        this.settings = newSettings

        // reset form based on new settings...
        this.settingsEditorForm = this.getFormArrayFromSettingsArray()!
        this.rowData = this.settings.fieldReportStatuses

        this.opPeriodStart = this.settings.opPeriodStart
        this.opPeriodEnd = this.settings.opPeriodEnd
        this.log.excessive('Received new Settings via subscription.', this.id)
      },
      error: (e) => this.log.error('Settings Subscription got:' + e, this.id),
      complete: () => this.log.info('Settings Subscription complete', this.id)
    })

    // timeSubscription1$ =
    //timeSubscription2$ =

    // E-37: `installableEvent` used to start as a truthy `1`, so this set isInstallable
    // true on construction, before any browser had offered anything. The service now owns
    // that state and `isInstallable` reads through to it.

    //this.log.verbose('Settings set to static values. But not initialized???', this.id)
  }

  ngOnInit(): void {
    if (this.settings == undefined) {
      this.log.warn('Settings need to be initialized, in ngOnInit.', this.id)
    } else {
      // rowData is seeded by the settings subscription in the constructor (and re-seeded
      // on every later emission), so it is already populated by the time we get here.
      this.log.verbose(`Application: ${this.settings.application} -- Version: ${this.settings.version}`, this.id)
    }

    if (window.isSecureContext) {
      this.log.verbose(`Application running in secure context`, this.id)

      // https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/encrypt
      // https://github.com/mdn/dom-examples/blob/main/web-crypto/encrypt-decrypt/index.html
      // https://info.townsendsecurity.com/rsa-vs-aes-encryption-a-primer

      // https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts
      // Page is a secure context so service workers are now available
      //navigator.serviceWorker.register("/offline-worker.js").then(() => {  ...  })
    }

    this.settingsEditorForm = this.getFormArrayFromSettingsArray()!
    //this.leaflet = this.settingsEditorForm.value.leaflet
    //this.google = this.settingsEditorForm.value.google

    // BUG: Why is this new TIME activity in LOCATION function!!!
    // BUG: Duplicated in time-picker.component - as locationFrmGrp is there...
    // new values here bubble up as emitted events - see onNewLocation()
    // this.timepickerFormControlStart = this._formBuilder.control(
    //   new Date()
    // ) // TODO: Don't need new!

    this.log.verbose("ngInit done ", this.id)
  }

  onNewTimeEventStart(newTime: Date) {
    if (!this.settings) {
      this.log.error(`this.settings is null at onNewTimeEventStart`, this.id)
      return
    }
    // Based on listing 8.8 in TS dev w/ TS, pg 188
    this.log.verbose(`Got new start OpPeriod time: ${(newTime)}`, this.id)
    this.settings.opPeriodStart = newTime
    this.opPeriodStart = newTime

    this.settingsEditorForm.patchValue({ timepickerFormControlStart: newTime })
    this.settingsEditorForm.patchValue({ opPeriodStart: newTime })
    //opPeriodStart: this.settingsEditorForm.value.opPeriodStart,
    // This then automatically gets sent to (any) children via their @Input statements
    // TODO: Might we need to update the form itself, so 'submit' captures it properly?
    // TODO: BUT, we still need to update our local copy:
    //this.timepickerFormControl is where the Event comes up from...
  }

  onNewTimeEventEnd(newTime: Date) {
    if (!this.settings) {
      this.log.error(`this.settings is null at onNewTimeEventEnd`, this.id)
      return
    }
    // Based on listing 8.8 in TS dev w/ TS, pg 188
    this.log.verbose(`Got new end OpPeriod time: ${newTime}`, this.id)
    this.settings.opPeriodEnd = newTime
    this.opPeriodEnd = newTime
    this.settingsEditorForm.patchValue({ timepickerFormControlEnd: newTime })
    this.settingsEditorForm.patchValue({ opPeriodEnd: newTime })

    // This then automatically gets sent to (any)) children via their @Input statements
    // TODO: Might we need to update the form itself, so 'submit' captures it properly?
    // TODO: BUT, we still need to update our local copy:
    //this.timepickerFormControl is where the Event comes up from...
  }

  async onInstallBtn() {
    this.log.verbose(`onInstallBtn: user asked to install the app`, this.id)
    const outcome = await this.installableService.promptInstall()
    this.log.info(`Install prompt outcome: ${outcome}`, this.id)
  }

  onBtnResetDefaults() {
    this.log.verbose(`onBtnResetDefaults: Reset Settings.`, this.id)
    this.settings = this.settingsService.ResetDefaults() // need to refresh page?!
    //this.reloadPage_unused()
  }

  /**
   * Transforms Settings Array into Form Array
   * TODO: Rename to InitSettingsForm()
   * REVIEW: Do we need a version like entry.component.ts's resetSettingsForm()?
   */
  getFormArrayFromSettingsArray() {
    this.log.verbose("running getFormArrayFromSettingsArray()", this.id)

    if (!this.settings) {
      this.log.error(`this.settings is null at getFormArrayFromSettingsArray`, this.id)
      return
    }

    // NOTE: Form array differs some from SettingsType so need to translate back & forth
    return this.fb.group({
      settingsName: [this.settings.settingsName], // FUTURE: Use if people want to load and saveas, or have various 'templates'
      settingsDate: [this.settings.settingsDate], // when last edited... // not shown for editing

      mission: [this.settings.mission],
      event: [this.settings.event],
      eventNotes: [this.settings.eventNotes],
      opPeriod: [this.settings.opPeriod],

      opPeriodStart: [this.settings.opPeriodStart],
      opPeriodEnd: [this.settings.opPeriodEnd],
      timepickerFormControlStart: [this.settings.opPeriodStart],
      timepickerFormControlEnd: [this.settings.opPeriodEnd],

      application: [this.settings.application], // not shown for editing
      version: [this.settings.version], // not shown for editing
      debugMode: [this.settings.debugMode],

      defLat: [this.settings.defLat, Validators.required],
      defLng: [this.settings.defLng, Validators.required],
      defPlusCode: [this.settings.defPlusCode],
      w3wLocale: [this.settings.w3wLocale],
      allowManualPinDrops: [this.settings.allowManualPinDrops],
      googleGeocodingApiKey: [this.settings.googleGeocodingApiKey],

      leaflet: this.fb.group({
        defZoom: [this.settings.leaflet.defZoom], //, Validators.min(3), Validators.max(21)], //https://www.concretepage.com/angular-2/angular-4-min-max-validation  // or just zoom to bounds?
        markerScheme: [this.settings.leaflet.markerScheme],
        overviewDifference: [this.settings.leaflet.overviewDifference],
        overviewMinZoom: [this.settings.leaflet.overviewMinZoom],
        overviewMaxZoom: [this.settings.leaflet.overviewMaxZoom]
      }),

      google: this.fb.group({
        defZoom: [this.settings.google.defZoom], //, Validators.min(3), Validators.max(21)], //https://www.concretepage.com/angular-2/angular-4-min-max-validation    // or just zoom to bounds?
        markerScheme: [this.settings.google.markerScheme],
        overviewDifference: [this.settings.google.overviewDifference],
        overviewMinZoom: [this.settings.google.overviewMinZoom],
        overviewMaxZoom: [this.settings.google.overviewMaxZoom]
      }),

      imageDirectory: [this.settings.imageDirectory],
      defFieldReportStatus: [this.settings.defFieldReportStatus],
      fieldReportStatuses: [this.settings.fieldReportStatuses]
      // fieldReportKeywords: string[],  // Future...could also just search notes field
    })
  }

  /**
   * Transform back from Form Array to Settings Array that SettingsService can save
   *
   * @returns
   */
  getSettingsArrayFromFormArray() { //}: SettingsType { // Can't do with !this.settings guard...
    this.log.verbose("getSettingsArrayFromFormArray", this.id)

    if (!this.settings) {

      this.log.error(`this.settings is null`, this.id)
      return null
    }

    //  this.log.error(`Saving: opPeriodStart = ${this.settingsEditorForm.value.opPeriodStart},
    //  opPeriodEnd = ${this.settingsEditorForm.value.opPeriodEnd}`, this.id)

    return {
      settingsName: this.settingsEditorForm.value.settingsName, // FUTURE: Use if people want to load and saveas, or have various 'templates'
      settingsDate: this.settingsEditorForm.value.settingsDate, // when last edited... // not shown for editing

      mission: this.settingsEditorForm.value.mission,
      event: this.settingsEditorForm.value.event,
      eventNotes: this.settingsEditorForm.value.eventNotes,
      opPeriod: this.settingsEditorForm.value.opPeriod,
      opPeriodStart: this.settingsEditorForm.value.opPeriodStart,
      opPeriodEnd: this.settingsEditorForm.value.opPeriodEnd,

      application: this.settingsEditorForm.value.application, // not shown for editing
      version: this.settingsEditorForm.value.version, // not shown for editing
      debugMode: this.settingsEditorForm.value.debugMode,

      defLat: this.settingsEditorForm.value.defLat,
      defLng: this.settingsEditorForm.value.defLng,
      defPlusCode: this.settingsEditorForm.value.defPlusCode,
      w3wLocale: this.settingsEditorForm.value.w3wLocale,
      allowManualPinDrops: this.settingsEditorForm.value.allowManualPinDrops,
      googleGeocodingApiKey: this.settingsEditorForm.value.googleGeocodingApiKey,

      google: {
        defZoom: this.settingsEditorForm.value.google.defZoom, //, Validators.min(3), Validators.max(21), //https://www.concretepage.com/angular-2/angular-4-min-max-validation    // or just zoom to bounds?
        markerScheme: this.settingsEditorForm.value.google.markerScheme,
        overviewDifference: this.settingsEditorForm.value.google.overviewDifference,
        overviewMinZoom: this.settingsEditorForm.value.google.overviewMinZoom,
        overviewMaxZoom: this.settingsEditorForm.value.google.overviewMaxZoom
      },

      leaflet: {
        defZoom: this.settingsEditorForm.value.leaflet.defZoom, //, Validators.min(3), Validators.max(21), //https://www.concretepage.com/angular-2/angular-4-min-max-validation  // or just zoom to bounds?
        markerScheme: this.settingsEditorForm.value.leaflet.markerScheme,
        overviewDifference: this.settingsEditorForm.value.leaflet.overviewDifference,
        overviewMinZoom: this.settingsEditorForm.value.leaflet.overviewMinZoom,
        overviewMaxZoom: this.settingsEditorForm.value.leaflet.overviewMaxZoom
      },
      imageDirectory: this.imgDir,  //! SECURITY: BUGBUG: Hardcoded image directory: should this be confidential/encrypted for security?
      defFieldReportStatus: this.settingsEditorForm.value.defFieldReportStatus,
      fieldReportStatuses: this.settingsEditorForm.value.fieldReportStatuses
      // fieldReportKeywords: string[],  // Future...could also just search notes field
    }
  }

  reloadPage() {
    //REVIEW: Does this zap existing changes elsewhere on the page (used for reseting field statuses..)
    this.log.verbose(`Reloading window!`, this.id)
    window.location.reload()
  }

  //TODO: If user edits field report status color, need to update background: refreshCells()????
  onFormSubmit(): void {
    this.log.verbose("onFormSubmit: Update Settings...", this.id)
    let newSettings: SettingsType = this.getSettingsArrayFromFormArray()!
    this.settingsService.updateSettings(newSettings)

    // TODO: If Debug disabled then call:
    //enableProdMode()
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
  getPlatform() {
    // TODO:
    this.log.error("getPlatform: UNIMPLEMENTED", this.id)
    // https://material.angular.io/cdk/platform/overview
  }

  ngOnDestroy() {
    this.settingsSubscription?.unsubscribe()
    this.timeSubscriptionStart$?.unsubscribe()
    this.timeSubscriptionEnd$?.unsubscribe()
  }
}
