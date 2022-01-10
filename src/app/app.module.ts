import { FieldReportService, FieldReportSource, FieldReportStatuses, FieldReportType, MarkerService, PopupService, RangerService, RangerStatus, RangerType, SettingsService, SettingsType, ShapeService, TeamService, TeamType } from './shared/services/';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';

import { AgGridModule } from 'ag-grid-angular';
import { AgmCoreModule } from '@agm/core';
import { AlertsComponent } from './alerts/alerts.component';
import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { EntryComponent } from './entry/entry.component';
import { FieldReportsComponent } from './field-reports/field-reports.component';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { FooterComponent } from './footer/footer.component';
import { GmapComponent } from './gmap/gmap.component';
import { HttpClientModule } from '@angular/common/http';
import { LazyModule } from './lazy/lazy.module'
import { LmapComponent } from './lmap/lmap.component';
import { LogComponent } from './log/log.component';
import { MAT_SNACK_BAR_DEFAULT_OPTIONS } from '@angular/material/snack-bar';
import { MaterialModule } from './material.module';
import { NavbarComponent } from './navbar/navbar.component';
import { NgModule } from '@angular/core';
import { RangersComponent } from './rangers/rangers.component';
import { SettingsComponent } from './settings/settings.component';
import { X404Component } from './x404/x404.component';

//import { AgmSnazzyInfoWindowModule } from '@agm/snazzy-info-window';


// REVIEW: import of AgmSnazzyInfoWindowModule yields: D:\Projects\RangerTrak\rangertrak\src\app\app.module.ts depends on '@agm/snazzy-info-window'. CommonJS or AMD dependencies can cause optimization bailouts.
// https://angular.io/guide/build#configuring-commonjs-dependencies

// import { MatInputModule } from '@angular/material/input';
// import { MatFormFieldModule } from '@angular/material/form-field';
// import { MatAutocompleteModule } from '@angular/material/autocomplete';

//import {AutocompleteOverviewExample} from './autocomplete-overview-example';
//import {MatNativeDateModule} from '@angular/material/core';
//import { MatCardModule } from '@angular/material/card';

//import { DataService } from './shared/services/data.service';
//import { LocalStorageService } from './shared/services/local-storage.service';

//MatNativeDateModule,

@NgModule({
  imports: [
    BrowserAnimationsModule,
    BrowserModule,
    CommonModule,
    FormsModule,
    HttpClientModule,
    MaterialModule,
    ReactiveFormsModule,
    AppRoutingModule,
    FontAwesomeModule,
    AgGridModule.withComponents([]),
    AgmCoreModule.forRoot({ apiKey: 'AIzaSyDDPgrn2iLu2p4II4H1Ww27dx6pVycHVs4' }),
   // AgmSnazzyInfoWindowModule,
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
    X404Component,
    LogComponent
  ],
  providers: [TeamService, RangerService, FieldReportService, MarkerService, PopupService, SettingsService, ShapeService,
    {provide: MAT_SNACK_BAR_DEFAULT_OPTIONS, useValue: {duration: 2500}}], // Team, Ranger,
  bootstrap: [AppComponent]//,

  //exports: [
    // SettingsComponent
  //]
})
export class AppModule { }

