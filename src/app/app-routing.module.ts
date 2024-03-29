import { NgModule } from '@angular/core'
import { PreloadAllModules, RouterModule, Routes } from '@angular/router'

import { EntryComponent } from './entry/entry.component'
import { FieldReportsComponent } from './field-reports/field-reports.component'
import { GmapComponent } from './gmap/gmap.component'
import { LazyModule } from './lazy/lazy.module'
import { LmapComponent } from './lmap/lmap.component'
import { LogComponent } from './log/log.component'
import { RangersComponent } from './rangers/rangers.component'
import { SettingsComponent } from './settings/settings.component'
import { X404Component } from './x404/x404.component'

//import { UnsavedChangesGuard } from './entry/unsavedChangesGuard ';
//import { UnsavedChangesGuard } from './entry/unsavedChangesGuard'
//import { AboutComponent } from './lazy/about/about.component';

// https://angular.io/guide/router
// https://angular.io/api/router/Resolve#usage-notes - Processing order: BaseGuard, ChildGuard, BaseDataResolver, ChildDataResolver

const routes: Routes = [
  // EAGER Routes

  //{ path: '',   redirectTo: '/entry', pathMatch: 'full' }, // redirects
  { path: '', component: EntryComponent },//, pathMatch: 'full' }, // redirects
  //{ path: 'entry', component: EntryComponent}, //, canActivate: [UnsavedChangesGuard] },
  // , resolve: {SettingsComponent} // causes: Error: Uncaught (in promise): NullInjectorError: R3InjectorError(AppModule)[SettingsComponent -> SettingsComponent -> SettingsComponent]:
  //NullInjectorError: No provider for SettingsComponent!
  // { path: 'entry', component: EntryComponent, resolve: {SettingsComponent: myResolver }}, //, canActivate: [UnsavedChangesGuard] },
  { path: 'reports', component: FieldReportsComponent },
  { path: 'gmap', component: GmapComponent },
  { path: 'lmap', component: LmapComponent },
  { path: 'rangers', component: RangersComponent },
  { path: 'settings', component: SettingsComponent },
  { path: 'log', component: LogComponent },
  // Could add Title = "PageName" // https://angular.io/guide/router#setting-the-page-title


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
  //, bootstrap: [SettingsComponent]
})
export class AppRoutingModule { }

