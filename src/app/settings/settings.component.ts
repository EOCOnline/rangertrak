import { DOCUMENT } from '@angular/common'
import { Component, enableProdMode, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FieldReportService, RangerService, SettingsService, SettingsType } from '../shared/services/'

@Component({
  selector: 'rangertrak-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
  //providers: [SettingsService]
})
export class SettingsComponent implements OnInit {
  settings: SettingsType
  settingsEditorForm!: FormGroup

  constructor(
    private fb: FormBuilder,
    private fieldReportService: FieldReportService,
    private rangerService: RangerService,
    private settingsService: SettingsService,
    @Inject(DOCUMENT) private document: Document) {
    //this.settings = settingService()
    this.settings = SettingsService.Settings // only using static functions/values from the service...
    //console.log('Application Settings set to static values. But not initialized???')
  }

  ngOnInit(): void {
    if (this.settings == undefined) {
      console.log('WARN: Application Settings need to be initialized.')
    } else {
      console.log(`SettingsComponent: Application: ${this.settings.application} -- Version: ${this.settings.version}`)
    }

    this.settingsEditorForm = this.getFormArrayFromSettingsArray()

    console.log("settings component ngInit done at ", Date())
  }

  onBtnResetDefaults() {
    SettingsService.ResetDefaults()
  }





  getFormArrayFromSettingsArray() {
    // NOTE: Form array differs some from SettingsType so need to translate back & forth
    return this.fb.group({
      application: [this.settings.application], // not shown for editing
      version: [this.settings.version], // not shown for editing
      id: [this.settings.id],
      name: [this.settings.name],
      note: [this.settings.note],
      latitude: [this.settings.defLat, Validators.required],
      longitude: [this.settings.defLong, Validators.required],
      plusCode: [this.settings.defPlusCode],
      w3wLocale: [this.settings.w3wLocale],
      markerSize: [this.settings.markerSize],
      markerShape: [this.settings.markerShape, Validators.required],
      defRangerStatus: [this.settings.defRangerStatus], // not shown for editing
      debugMode: [this.settings.debugMode], // not shown for editing
      logToPanel: [this.settings.logToPanel], // null or blank for unchecked 'yes'
      logToConsole: [this.settings.logToConsole], // null or blank for unchecked 'check'
    })
  }

  getSettingsArrayFromFormArray(): SettingsType {
    return {
      application: this.settingsEditorForm.value.application as string,
      version: this.settingsEditorForm.value.version as string,
      id: this.settingsEditorForm.value.id as number,
      name: this.settingsEditorForm.value.name as string,
      note: this.settingsEditorForm.value.note as string,
      defLat: this.settingsEditorForm.value.latitude as number,
      defLong: this.settingsEditorForm.value.longitude as number,
      defPlusCode: this.settingsEditorForm.value.plusCode as string,
      w3wLocale: this.settingsEditorForm.value.w3wLocale as string,
      markerSize: this.settingsEditorForm.value.markerSize as number,
      markerShape: this.settingsEditorForm.value.markerShape as number,
      defRangerStatus: this.settingsEditorForm.value.defRangerStatus as number,
      debugMode: this.settingsEditorForm.value.debugMode as boolean,
      logToPanel: this.settingsEditorForm.value.logToPanel as boolean,
      logToConsole: this.settingsEditorForm.value.logToConsole as boolean,
    }
  }

  onFormSubmit(): void {
    console.log("Update Application Settings...")
    let newSettings: SettingsType = this.getSettingsArrayFromFormArray()
    SettingsService.Update(newSettings)

    // TODO: If Debug disabled then call:
    //enableProdMode()

  }
}
