import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { FormBuilder, FormGroup, FormArray, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';

import { AppRoutingModule } from './app-routing.module';

import { AppComponent } from './app.component';
import { NavbarComponent } from './navbar/navbar.component';
import { FooterComponent } from './footer/footer.component';
import { AlertsComponent } from './alerts/alerts.component';
import { AboutComponent } from './about/about.component';
import { GmapComponent } from './gmap/gmap.component';
import { LmapComponent } from './lmap/lmap.component';
import { EntryComponent } from './entry/entry.component';
import { FieldReportsComponent } from './field-reports/field-reports.component';
import { SettingsComponent } from './settings/settings.component';
import { RangersComponent } from './rangers/rangers.component';
import {Team, TeamService, Ranger, RangerService, FieldReport, FieldReportService } from './shared/services/';

import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatCardModule } from '@angular/material/card';
import { X404Component } from './x404/x404.component';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { AgGridModule } from 'ag-grid-angular';
//import { DataService } from './shared/services/data.service';
//import { LocalStorageService } from './shared/services/local-storage.service';

@NgModule({
  declarations: [
    AppComponent,
    NavbarComponent,
    FooterComponent,
    AlertsComponent,
    AboutComponent,
    GmapComponent,
    LmapComponent,
    EntryComponent,
    FieldReportsComponent,
    SettingsComponent,
    X404Component,
    RangersComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    MatCardModule,
    FontAwesomeModule,
    ReactiveFormsModule,
    AgGridModule.withComponents([])
  ],
  providers: [TeamService, RangerService, FieldReport, FieldReportService], // Team, Ranger,
  bootstrap: [AppComponent]
})
export class AppModule { }

