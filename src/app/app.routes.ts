import { Routes } from '@angular/router'

import { EntryComponent } from './entry/entry.component'

// https://angular.io/guide/router
// https://angular.io/api/router/Resolve#usage-notes - Processing order: BaseGuard, ChildGuard, BaseDataResolver, ChildDataResolver

/**
 * Only the Entry page (the landing route, and the screen an operator spends a mission in)
 * is eager. Everything else is a `loadComponent` split point.
 *
 * Every route used to be eager, which meant the initial bundle carried AG Grid, xlsx,
 * MapLibre and the full map/grid page code before the first screen could render - most of
 * it for pages a given user might never open. The heavy libraries now land in the chunk of
 * the route that actually uses them: AG Grid + xlsx with Reports/Rangers/Settings/Log,
 * MapLibre with the offline map.
 *
 * Note this trades *initial* download, not total: app.config.ts registers
 * withPreloading(PreloadAllModules), so these chunks are still fetched right after the app
 * becomes stable. That is deliberate for an offline-first PWA - everything still ends up
 * precached and available without a network - but it means the win here is time-to-first-
 * screen, not bytes over the wire across a whole session.
 */
export const APP_ROUTES: Routes = [
  // EAGER: the landing page, so it must not be a separate round trip.
  { path: '', component: EntryComponent },

  // LAZY: loaded on first navigation (and preloaded in the background - see above).
  {
    path: 'reports',
    loadComponent: () => import('./field-reports/field-reports.component').then(m => m.FieldReportsComponent)
  },
  {
    path: 'lmap',
    loadComponent: () => import('./lmap/lmap.component').then(m => m.LmapComponent)
  },
  {
    path: 'map',
    loadComponent: () => import('./map/map.component').then(m => m.MapComponent)
  },
  {
    path: 'rangers',
    loadComponent: () => import('./rangers/rangers.component').then(m => m.RangersComponent)
  },
  {
    path: 'settings',
    loadComponent: () => import('./settings/settings.component').then(m => m.SettingsComponent)
  },
  {
    path: 'log',
    loadComponent: () => import('./log/log.component').then(m => m.LogComponent)
  },

  // LAZY child routes (via dynamic import)
  {
    path: 'about',
    loadChildren: () => import('./lazy/lazy.routes').then(m => m.LAZY_ROUTES)
  },

  // Page not found route
  {
    path: '**',
    loadComponent: () => import('./x404/x404.component').then(m => m.X404Component)
  }
]
