import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { EntryComponent } from './entry/entry.component';
import { FieldReportsComponent } from './field-reports/field-reports.component';
import { GmapComponent } from './gmap/gmap.component';
import { LmapComponent } from './lmap/lmap.component';
import { RangersComponent } from './rangers/rangers.component';
import { SettingsComponent } from './settings/settings.component';
import { AboutComponent } from './about/about.component';
import { X404Component } from './x404/x404.component';

const routes: Routes = [
  { path: '', component: EntryComponent },
  { path: 'reports', component: FieldReportsComponent },
  { path: 'gmap', component: GmapComponent },
  { path: 'lmap', component: LmapComponent },
  { path: 'rangers', component: RangersComponent },
  { path: 'settings', component: SettingsComponent },
  { path: 'about', component: AboutComponent },
  { path: '**', component: X404Component }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  // ReactiveFormsModule
  exports: [RouterModule]
})
export class AppRoutingModule { }
