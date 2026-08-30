import { Routes } from '@angular/router'

import { EntryComponent } from './entry/entry.component'
import { unsavedChangesGuard } from './shared/guards/unsaved-changes.guard'

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
 * Leaflet with `/map`.
 *
 * Note this trades *initial* download, not total: app.config.ts registers
 * withPreloading(PreloadAllModules), so these chunks are still fetched right after the app
 * becomes stable. That is deliberate for an offline-first PWA - everything still ends up
 * precached and available without a network - but it means the win here is time-to-first-
 * screen, not bytes over the wire across a whole session.
 *
 * E-64 exception: MapLibre is NOT preloaded with `/map`, even though Leaflet is. It sits
 * behind a plain `import()` call inside MapPageComponent's engine-switch handler rather
 * than a second `loadComponent` route, and PreloadAllModules only walks the Routes table
 * above - it has no way to see (or preload) a dynamic import buried inside a component
 * method. A visitor who never flips the switch never fetches it, full session or not.
 */
export const APP_ROUTES: Routes = [
  // EAGER: the landing page, so it must not be a separate round trip.
  { path: '', component: EntryComponent },

  // LAZY: loaded on first navigation (and preloaded in the background - see above).
  // 2026-08-27: was 'reports' - renamed to match the page's new "Radio Log" nav label/title
  // (same "URL matches nav label" convention 'settings'->'mission' and 'about'->'help'
  // already followed). Redirect below covers old bookmarks.
  {
    path: 'radio-log',
    loadComponent: () => import('./field-reports/field-reports.component').then(m => m.FieldReportsComponent)
  },
  // New 2026-08-27: ICS-213 messages (field reports with generates213 set), list + detail
  // view rather than a second grid - see the roadmap's ICS-309/213 scoping note.
  {
    path: 'messages',
    loadComponent: () => import('./messages/messages.component').then(m => m.MessagesComponent)
  },
  // E-64: one route for both engines - MapPageComponent is a thin shell that mounts
  // Leaflet by default and dynamically imports MapLibre only if the on-page switch is
  // flipped, so a visitor who never touches the switch never downloads its ~966KB chunk.
  // `/mapLeaflet` is gone outright (no redirect - see the roadmap's E-64 decisions: existing PWA
  // installs pointing at it are a discounted, power-user-only edge case).
  {
    path: 'map',
    loadComponent: () => import('./map/map-page/map-page.component').then(m => m.MapPageComponent)
  },
  {
    path: 'rangers',
    loadComponent: () => import('./rangers/rangers.component').then(m => m.RangersComponent)
  },
  // 2026-08-22: was 'settings' - every URL now matches its nav label ("Mission"), not
  // the older, more generic route name. Kept as a redirect below rather than a hard
  // break, since this route predates that rename and may be bookmarked.
  {
    path: 'mission',
    loadComponent: () => import('./mission/mission.component').then(m => m.MissionComponent),
    // F29-23 (2026-08-30): warns before navigating away with unsaved Mission edits - the
    // shared guard (src/app/shared/guards/unsaved-changes.guard.ts) only needs the target
    // component to implement HasUnsavedChanges, so any future manual-Save page adopts this
    // the same way, not by rebuilding the guard.
    canDeactivate: [unsavedChangesGuard],
  },
  {
    path: 'log',
    loadComponent: () => import('./log/log.component').then(m => m.LogComponent)
  },

  // LAZY child routes (via dynamic import)
  // 2026-08-22: was 'about' - the nav item and page heading were renamed "About" ->
  // "Help" (E-57(1)) but the URL never followed; redirect below covers old bookmarks.
  {
    path: 'help',
    loadChildren: () => import('./lazy/lazy.routes').then(m => m.LAZY_ROUTES)
  },

  // Redirects for the renames above - old bookmarks/links keep working.
  { path: 'settings', redirectTo: 'mission' },
  { path: 'about', redirectTo: 'help' },
  { path: 'reports', redirectTo: 'radio-log' },

  // Page not found route
  {
    path: '**',
    loadComponent: () => import('./x404/x404.component').then(m => m.X404Component)
  }
]
