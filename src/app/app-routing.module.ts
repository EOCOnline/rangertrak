import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

import { EntryComponent } from './entry/entry.component';
import { FieldReportsComponent } from './field-reports/field-reports.component';
import { GmapComponent } from './gmap/gmap.component';
import { LazyModule } from './lazy/lazy.module';
import { LmapComponent } from './lmap/lmap.component';
import { NgModule } from '@angular/core';
import { RangersComponent } from './rangers/rangers.component';
import { SettingsComponent } from './settings/settings.component';
//import { UnsavedChangesGuard } from './entry/unsavedChangesGuard ';
import { X404Component } from './x404/x404.component';

//import { UnsavedChangesGuard } from './entry/unsavedChangesGuard'
//import { AboutComponent } from './lazy/about/about.component';


const routes: Routes = [
  // EAGER Routes
  { path: '', component: EntryComponent}, //, canActivate: [UnsavedChangesGuard] },
  { path: 'reports', component: FieldReportsComponent },
  { path: 'gmap', component: GmapComponent },
  { path: 'lmap', component: LmapComponent },
  { path: 'rangers', component: RangersComponent },
  { path: 'settings', component: SettingsComponent },

  // LAZY Routes: preloaded right after root app module (via dynamic import module)
  {
    path: 'about',
    loadChildren: () => LazyModule // WAS import('./lazy/lazy.module').then(module => module.
  },

  // Page not found route
  { path: '**', component: X404Component }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })],  // lazy loads ASAP!
  exports: [RouterModule]
})
export class AppRoutingModule { }

