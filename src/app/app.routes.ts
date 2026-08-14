import { Routes } from '@angular/router'

import { EntryComponent } from './entry/entry.component'
import { FieldReportsComponent } from './field-reports/field-reports.component'
import { LmapComponent } from './lmap/lmap.component'
import { LogComponent } from './log/log.component'
import { MapComponent } from './map/map.component'
import { RangersComponent } from './rangers/rangers.component'
import { SettingsComponent } from './settings/settings.component'
import { X404Component } from './x404/x404.component'

// https://angular.io/guide/router
// https://angular.io/api/router/Resolve#usage-notes - Processing order: BaseGuard, ChildGuard, BaseDataResolver, ChildDataResolver

export const APP_ROUTES: Routes = [
  // EAGER Routes
  { path: '', component: EntryComponent },
  { path: 'reports', component: FieldReportsComponent },
  { path: 'lmap', component: LmapComponent },
  { path: 'map', component: MapComponent },
  { path: 'rangers', component: RangersComponent },
  { path: 'settings', component: SettingsComponent },
  { path: 'log', component: LogComponent },

  // LAZY Routes: preloaded right after root app module (via dynamic import)
  {
    path: 'about',
    loadChildren: () => import('./lazy/lazy.routes').then(m => m.LAZY_ROUTES)
  },

  // Page not found route
  { path: '**', component: X404Component }
]
