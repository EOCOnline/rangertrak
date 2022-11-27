import { AgGridModule } from 'ag-grid-angular'

import {
  MAT_COLOR_FORMATS, NGX_MAT_COLOR_FORMATS, NgxMatColorPickerModule
} from '@angular-material-components/color-picker'
//import { MatDatepickerModule } from '@matheo/datepicker'
//import { MatNativeDateModule } from '@matheo/datepicker/core'
import {
  NgxMatDatetimePickerModule, NgxMatNativeDateModule, NgxMatTimepickerModule
} from '@angular-material-components/datetime-picker'
import { CommonModule } from '@angular/common'
import { HttpClientModule } from '@angular/common/http'
import { NgModule, isDevMode } from '@angular/core'
//import { ClockService, FieldReportService, PopupService, RangerService, SettingsService} from './shared/services/' // instead singleton services use "providedIn: 'root'""
import {
  FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators
} from '@angular/forms'
import { GoogleMapsModule } from '@angular/google-maps'
import { MAT_SNACK_BAR_DEFAULT_OPTIONS } from '@angular/material/snack-bar'
import { BrowserModule } from '@angular/platform-browser'
import { BrowserAnimationsModule } from '@angular/platform-browser/animations'
import { ServiceWorkerModule } from '@angular/service-worker'
//import { FontAwesomeModule } from '@fortawesome/angular-fontawesome'
import { MDCBanner } from '@material/banner'

import { environment } from '../environments/environment'
import { AppRoutingModule } from './app-routing.module'
import { AppComponent } from './app.component'
// import { DayjsModule } from 'ngx-dayjs'
import { EntryComponent } from './entry/entry.component'
import { LocationComponent } from './entry/location.component'
import { MiniGMapComponent } from './entry/mini-gmap.component'
import { MiniLMapComponent } from './entry/mini-lmap.component'
import { FieldReportsComponent } from './field-reports/field-reports.component'
import { GmapComponent } from './gmap/gmap.component'
import { LazyModule } from './lazy/lazy.module'
import { LmapComponent } from './lmap/lmap.component'
import { LogComponent } from './log/log.component'
import { MaterialModule } from './material.module'
import { RangersComponent } from './rangers/rangers.component'
import { ColorEditor } from './settings/color-editor.component'
//import { MoodEditor } from './settings/mood-editor.component'
//import { MoodRenderer } from './settings/mood-renderer.component'
import { SettingsComponent } from './settings/settings.component'
import { HeaderComponent } from './shared/'
//import { AgmCoreModule } from '@agm/core'
import { AlertsComponent } from './shared/'
import { FooterComponent } from './shared/'
import { IconsComponent } from './shared/'
import { NavbarComponent } from './shared/'
import {
  FieldReportSource, FieldReportStatusType, FieldReportType, RangerType, SettingsType
} from './shared/services/'
import { TimePickerComponent } from './shared/time-picker/time-picker.component'
import { X404Component } from './x404/x404.component';
import { InstallPromptComponent } from './shared/'


// REVIEW: import of AgmSnazzyInfoWindowModule yields: D:\Projects\RangerTrak\rangertrak\src\app\app.module.ts depends on '@agm/snazzy-info-window'. CommonJS or AMD dependencies can cause optimization bailouts.
// https://angular.io/guide/build#configuring-commonjs-dependencies

@NgModule({

  // Import sub-modules
  imports: [
    BrowserAnimationsModule,
    BrowserModule,
    CommonModule,
    // DayjsModule,
    FormsModule,
    GoogleMapsModule,
    HttpClientModule,
    MaterialModule,
    ReactiveFormsModule,
    AppRoutingModule,   // https://giancarlobuomprisco.com/angular/understanding-angular-modules  & https://angular.io/guide/router
    //FontAwesomeModule,
    AgGridModule,
    // https://angular.io/guide/ngmodule-faq#what-is-the-forroot-method: singleton
    // AgmCoreModule.forRoot({ apiKey: 'API_KEY_GOES_HERE' }),
    // AgmSnazzyInfoWindowModule, // BUG: API_KEY
    LazyModule,
    NgxMatColorPickerModule,
    // MatNativeDateModule,
    // MatDatepickerModule,
    NgxMatDatetimePickerModule,
    NgxMatTimepickerModule,
    NgxMatNativeDateModule,
    ServiceWorkerModule.register('ngsw-worker.js', {
      enabled: environment.production,
      // Register the ServiceWorker as soon as the app is stable
      // or after 30 seconds (whichever comes first).
      registrationStrategy: 'registerWhenStable:30000'
    }),
    ServiceWorkerModule.register('ngsw-worker.js', {
      enabled: !isDevMode(),
      // Register the ServiceWorker as soon as the application is stable
      // or after 30 seconds (whichever comes first).
      registrationStrategy: 'registerWhenStable:30000'
    })
  ],

  // Define all the components, directives and pipes,
  // that are declared and used inside this module.
  // ? If you want to use any of these in multiple modules,
  // bundle it into a separate module & import that in the module
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
    ColorEditor,
    //MoodEditor,
    //MoodRenderer,
    RangersComponent,
    X404Component,
    LogComponent,
    LocationComponent,
    MiniGMapComponent,
    MiniLMapComponent,
    HeaderComponent,
    TimePickerComponent,
    IconsComponent,
    InstallPromptComponent
    //,
    //CircleHatchingComponent
  ],

  // Define any required @Injectables. Any sub-components or modules can get the
  // same @Injectable instance (i.e., a singleton!) via dependency injection.
  // In the case of the AppModule, these @Injectables are application-scoped.

  // Use @Optional() @SkipSelf() in singleton constructors to ensure
  // future modules don't provide extra copies of this singleton service
  // per pg 84 of Angular Cookbook: do NOT add services to *.module.ts!

  // Post Ang 6, do not put here as they are no longer tree-shakable,
  // ? instead use providedin: 'root' at start of every service/singleton
  // per https://angular.io/guide/singleton-services
  providers: [
    //ClockService, FieldReportService, LogService, PopupService, RangerService, SettingsService,
    { provide: MAT_SNACK_BAR_DEFAULT_OPTIONS, useValue: { duration: 2500 } },
    { provide: MAT_COLOR_FORMATS, useValue: NGX_MAT_COLOR_FORMATS }
  ],
  //{provide: MAT_BANNER_DEFAULT_OPTIONS}],
  // Ranger,
  // providers: [File, { provide: RouteReuseStrategy, useClass: IonicRouteStrategy }],

  bootstrap: [AppComponent]//,

  // Make components, directives or pipes available to other modules...
  // ? TODO: Ensure lazy loaded Module has access to all the services it deserves!
  // , exports: [
  //   SettingsComponent
  // ]
})
export class AppModule { }

