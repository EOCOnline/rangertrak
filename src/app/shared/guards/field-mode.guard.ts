import { inject } from '@angular/core'
import { CanActivateFn, Router } from '@angular/router'

import { FieldModeService } from '../services'

/**
 * E-114 §1a (2026-08-31): the route-level half of field mode's Entry+Help-only restriction -
 * navbar.component.html already hides the links, but hiding a link doesn't stop a typed URL,
 * a stale bookmark, or a PWA shortcut pinned before the device was switched into field mode.
 * Redirects to Home ('') rather than blocking with no destination, same reasoning as this
 * codebase's other redirect-not-dead-end routes (app.routes.ts's settings/about/reports).
 *
 * Same `CanActivateFn` shape as `unsavedChangesGuard`
 * (shared/guards/unsaved-changes.guard.ts), but `canActivate` rather than `canDeactivate` -
 * this blocks ENTERING a route, not leaving one.
 */
export const fieldModeGuard: CanActivateFn = () => {
  const fieldMode = inject(FieldModeService)
  const router = inject(Router)

  if (!fieldMode.enabled()) {
    return true
  }
  return router.parseUrl('/')
}
