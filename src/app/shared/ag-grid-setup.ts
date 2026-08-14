import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community'

let registered = false

/**
 * Registers AG Grid's community feature modules, once per app run.
 *
 * AG Grid v33+ ships nothing by default: every feature lives in a module that has to be
 * registered before a grid is created, or the grid renders an empty shell and logs error
 * #272.
 *
 * This deliberately does NOT live in main.ts. Registering there pulled the whole AG Grid
 * bundle (~1MB) into the eager initial chunk, defeating the route-level code splitting in
 * app.routes.ts - the app would download a grid library up front for a landing page that
 * has no grid on it. Calling it from each grid component's constructor instead keeps AG
 * Grid inside the lazily-loaded chunks of the only three routes that use it
 * (Reports, Rangers, Settings), while still guaranteeing registration happens before any
 * grid is constructed.
 */
export function ensureAgGridRegistered(): void {
  if (registered) {
    return
  }
  ModuleRegistry.registerModules([AllCommunityModule])
  registered = true
}
