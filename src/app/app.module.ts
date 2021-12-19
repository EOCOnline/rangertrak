import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppRoutingModule } from './app-routing.module';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';

import { FormBuilder, FormGroup, FormArray, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

import { MaterialExampleModule } from './material.module';

//import { MatInputModule } from '@angular/material/input';
// import { MatFormFieldModule } from '@angular/material/form-field';
//import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { AgGridModule } from 'ag-grid-angular';


//import {AutocompleteOverviewExample} from './autocomplete-overview-example';
//import {MatNativeDateModule} from '@angular/material/core';
//import { MatCardModule } from '@angular/material/card';

import { AppComponent } from './app.component';
import { NavbarComponent } from './navbar/navbar.component';
import { FooterComponent } from './footer/footer.component';
import { AlertsComponent } from './alerts/alerts.component';
import { GmapComponent } from './gmap/gmap.component';
import { LmapComponent } from './lmap/lmap.component';
import { EntryComponent } from './entry/entry.component';
import { FieldReportsComponent } from './field-reports/field-reports.component';
import { SettingsComponent } from './settings/settings.component';
import { RangersComponent } from './rangers/rangers.component';
import { TeamService, TeamType, RangerService, RangerType, RangerStatus, FieldReportService, FieldReportType, FieldReportSource, FieldReportStatuses } from './shared/services/';


//import { DataService } from './shared/services/data.service';
//import { LocalStorageService } from './shared/services/local-storage.service';

import { X404Component } from './x404/x404.component';

import { LazyModule } from './lazy/lazy.module'
import { MAT_SNACK_BAR_DEFAULT_OPTIONS } from '@angular/material/snack-bar';

//MatNativeDateModule,
@NgModule({
  imports: [
    BrowserAnimationsModule,
    BrowserModule,
    CommonModule,
    FormsModule,
    HttpClientModule,
    MaterialExampleModule,
    ReactiveFormsModule,
    AppRoutingModule,
    FontAwesomeModule,
    AgGridModule.withComponents([]),
    LazyModule
  ],
  declarations: [
    AppComponent,
    NavbarComponent,
    FooterComponent,
    AlertsComponent,
    GmapComponent,
    LmapComponent,
    EntryComponent,
    FieldReportsComponent,
    SettingsComponent,
    RangersComponent,
    X404Component
  ],
  providers: [TeamService, RangerService, FieldReportService,
    {provide: MAT_SNACK_BAR_DEFAULT_OPTIONS, useValue: {duration: 2500}}], // Team, Ranger,
  bootstrap: [AppComponent],

  exports: [
    // SettingsComponent
  ]
})
export class AppModule { }

