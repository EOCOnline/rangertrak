// We store app settings/preferences per user & per browser into IndexedDB,
// using a wrapper modeled on the much simpler LocalStorage API

// FROM: @ngx-pwa/local-storage  angular-async-local-storage-main\projects\demo\src\app\app.components.ts
// Doc & package: https://github.com/cyrilletuzi/angular-async-local-storage
// @see doc on IndexedDB {@link https://developer.chrome.com/docs/devtools/storage/indexeddb/}

import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

interface Data {
  title: string;
}

@Component({
  selector: 'rangertrak-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
})

export class SettingsComponent implements OnInit {

  static AppSettings = {
    DEF_LAT: 47.4472,
    DEF_LONG: -122.4627,  // Vashon EOC!
    DEF_PCODE: '84VVCGWP+VW', // or "CGWP+VX Vashon, Washington" = 47.447187,-122.462688
    locale_Name: "Vashon, WA",
    version: '0.11.0',
    DEF_STATUS: 0  // FieldReportStatuses
  }

  settingsEditorForm!: FormGroup;

  constructor(
    private fb: FormBuilder) {
  }

  ngOnInit(): void {
    console.log("settings loaded at ", Date())
    console.log("Version: " + this.Version())

    // TODO: Optionally deserialize values from LocalStorage
    this.settingsEditorForm = this.fb.group({
      latitude: [SettingsComponent.AppSettings.DEF_LONG, Validators.required],
      longitude: [SettingsComponent.AppSettings.DEF_LONG, Validators.required],
      plusCode: [SettingsComponent.AppSettings.DEF_PCODE],
      logToPanel: ['yes'], // null or blank for unchecked
      logToConsole: ['check'], // null or blank for unchecked
      markerSize: ['5'],
      markerShape: [1, Validators.required],
      notes: []
    })

    console.log("settings completed at ", Date())
  }

  serializeToLocalStorage() { }
  deserializeToLocalStorage() { }
  xxxerializeToLocalStorage() { }

  Version() {
    return SettingsComponent.AppSettings.version
  }

  onFormSubmit(): void {
    const formData = this.settingsEditorForm.value
    console.log(formData)
    // TODO: Serialize values to LocalStorage
  }
}
