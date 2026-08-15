import { EMPTY } from 'rxjs'

import { SwUpdate } from '@angular/service-worker'

/**
 * Test double for SwUpdate.
 *
 * @angular/service-worker ships no test double of its own, and
 * provideServiceWorker() is not part of the testing config, so any component
 * that reaches UpdateService fails to construct with NG0201. That is what the
 * three AppComponent specs were failing on (PRIVATE-Roadmap.md Section 18/D).
 *
 * isEnabled: false is the honest shape for a test environment - no service
 * worker is registered, so UpdateService.init() returns early exactly as it
 * does under `ng serve`. versionUpdates/unrecoverable are EMPTY to satisfy the
 * type rather than because anything consumes them; a spec that wants to drive
 * update behavior should supply its own Subject instead.
 */
export const swUpdateStub = {
  isEnabled: false,
  versionUpdates: EMPTY,
  unrecoverable: EMPTY,
  checkForUpdate: () => Promise.resolve(false),
  activateUpdate: () => Promise.resolve(false)
}

/** Convenience provider: `providers: [provideSwUpdateStub()]` */
export function provideSwUpdateStub() {
  return { provide: SwUpdate, useValue: swUpdateStub }
}
