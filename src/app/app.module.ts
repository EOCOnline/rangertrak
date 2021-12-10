import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppRoutingModule } from './app-routing.module';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatCardModule } from '@angular/material/card';
import { FormBuilder, FormGroup, FormArray, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { AgGridModule } from 'ag-grid-angular';

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
import {Team, TeamService, Ranger, RangerService, FieldReport, FieldReportService } from './shared/services/';
//import { DataService } from './shared/services/data.service';
//import { LocalStorageService } from './shared/services/local-storage.service';

import { X404Component } from './x404/x404.component';

import { LazyModule } from './lazy/lazy.module'

@NgModule({
  imports: [
    BrowserModule,
    FormsModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    MatCardModule,
    FontAwesomeModule,
    ReactiveFormsModule,
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
    X404Component,
  ],
  providers: [TeamService, RangerService, FieldReport, FieldReportService], // Team, Ranger,
  bootstrap: [AppComponent]
})
export class AppModule { }

