import { CanDeactivateFn } from '@angular/router'

/**
 * F29-23 (2026-08-30): a shared "are you sure you want to leave?" pattern for any page with
 * a manual Save button, not a Mission-page one-off - the maintainer's own ask was explicit
 * that this should generalise.
 *
 * A component opts in by implementing `HasUnsavedChanges` and adding
 * `canDeactivate: [unsavedChangesGuard]` to its route (see app.routes.ts's `/mission` entry).
 * Nothing here is Mission-specific: `hasUnsavedChanges()` is free to read whatever the page's
 * own dirty signal is (Signal Forms' `dirty()`, a plain boolean, anything).
 *
 * This guard alone only covers IN-APP navigation (the Angular Router). It does nothing for a
 * browser-level exit - closing the tab, refreshing, typing a new URL - which needs its own
 * `window:beforeunload` listener, since that is a browser API tied to the real navigation
 * event, not something a router guard can see. See mission.component.ts's own
 * `@HostListener('window:beforeunload', ...)` for that half of the pattern; a page adopting
 * this guard should add the same listener, reading the same `hasUnsavedChanges()` the guard
 * itself calls, so the two can never disagree about what "unsaved" means.
 */
export interface HasUnsavedChanges {
  hasUnsavedChanges(): boolean
}

export const unsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges> = (component) => {
  if (!component.hasUnsavedChanges()) {
    return true
  }
  return confirm('You have unsaved changes on this page. Leave without saving?')
}
