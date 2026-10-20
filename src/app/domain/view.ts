/**
 * E-207 / ADR D-62 (2026-10-19, John): Simple view and Full view. ONE list of what is advanced,
 * decided in one place. Pure rules - no Angular, Leaflet, DOM or storage imports (src/app/domain/
 * is for exactly that) - so the spec can run every case without a browser. The service
 * (shared/services/view.service.ts) gathers the context and keeps the view; components only ask
 * `ViewService.isShown(id)`.
 *
 * The rule everything follows: a control is hidden ONLY when the view is Simple AND the mission
 * does not use it ("uses it" = non-empty or not at its default). Hiding never clears, resets or
 * saves anything. Warnings, alerts, readiness (D-32), backup and storage-protection status never
 * appear in this list, so they always show. Field mode (E-114) is a separate, stricter setting.
 */
export type AppView = 'simple' | 'full'

/** Where the current view came from. `user` and `setup` are never overridden by a later suggestion. */
export type ViewSource = 'default' | 'upgrade' | 'setup' | 'user'

/**
 * What the rules may look at. Plain numbers and booleans, assembled by ViewService from the
 * services the app already has, so this file needs no knowledge of them.
 */
export type ViewContext = {
  /** The radio log status list differs from the default list. */
  statusesCustomised: boolean,
  /** The location category list differs from the default list. */
  locationCategoriesCustomised: boolean,
  /** Mission locations (places). */
  locationCount: number,
  /** Geocoding key set, or any map setting (zoom defaults) not at its default. */
  mapSettingsCustomised: boolean,
  /** Listed ICS-213 recipients differ from the default list, or auto-print / extra copies are set. */
  recipientsCustomised: boolean,
  /** Tactical call signs on the mission. */
  tacticalCallCount: number,
  /** The RangerTrak Board is switched on or has an address. */
  boardInUse: boolean,
  /** Live attachments on the mission's radio log entries. */
  attachmentCount: number,
  /** Device encryption is on. */
  encryptionOn: boolean,
  /** This device is a field phone (E-114). */
  fieldMode: boolean,
  /** Debug mode is on. */
  debugMode: boolean,
  /** Radio log entries with an ICS-213 (generated, addressed or with a message). */
  ics213EntryCount: number,
  /** Radio log entries whose source is not the default. */
  nonDefaultSourceCount: number,
  /** Layers loaded on this device (people and places). */
  layerCount: number,
}

export type AdvancedFeature = {
  /** Stable kebab-case id. Docs, help and e2e read these. */
  id: string,
  label: string,
  /** True when the mission uses this, so Simple view must show it. */
  isInUse: (ctx: ViewContext) => boolean,
}

const never = () => false

export const ADVANCED_FEATURES: ReadonlyArray<AdvancedFeature> = [
  // Navigation
  { id: 'debug-log', label: 'Debug log', isInUse: ctx => ctx.debugMode },
  // Mission page
  { id: 'statuses', label: 'Radio log statuses', isInUse: ctx => ctx.statusesCustomised },
  { id: 'location-categories', label: 'Location categories', isInUse: ctx => ctx.locationCategoriesCustomised },
  { id: 'locations-list', label: 'Locations', isInUse: ctx => ctx.locationCount > 0 },
  { id: 'maps', label: 'Maps and geocoding', isInUse: ctx => ctx.mapSettingsCustomised },
  { id: 'recipients213', label: 'Listed message recipients', isInUse: ctx => ctx.recipientsCustomised },
  { id: 'tactical-calls', label: 'Tactical call signs', isInUse: ctx => ctx.tacticalCallCount > 0 },
  { id: 'board', label: 'RangerTrak Board', isInUse: ctx => ctx.boardInUse },
  { id: 'attachments-budget', label: 'Attachments budget', isInUse: ctx => ctx.attachmentCount > 0 },
  { id: 'setup-file', label: 'Setup file', isInUse: never },
  { id: 'device-encryption', label: 'Device encryption', isInUse: ctx => ctx.encryptionOn },
  { id: 'advanced-debug', label: 'Advanced and debug', isInUse: ctx => ctx.fieldMode || ctx.debugMode },
  { id: 'field-phone', label: 'Field phone', isInUse: ctx => ctx.fieldMode },
  // Entry
  { id: 'stations', label: 'From and To station', isInUse: ctx => ctx.tacticalCallCount > 0 },
  { id: 'source', label: 'Source', isInUse: ctx => ctx.nonDefaultSourceCount > 0 },
  { id: 'coord-format', label: 'Coordinate format picker', isInUse: never },
  { id: 'attachments', label: 'Attachments', isInUse: ctx => ctx.attachmentCount > 0 },
  { id: 'ics213', label: 'ICS-213 message fields', isInUse: ctx => ctx.ics213EntryCount > 0 || ctx.recipientsCustomised },
  { id: 'evidence-location', label: 'Evidence location', isInUse: never },
  // Map
  { id: 'maplibre', label: 'Alternative map', isInUse: never },
  { id: 'map-layers-extra', label: 'Extra map layers', isInUse: never },
  { id: 'print-map', label: 'Print map', isInUse: never },
  { id: 'places-import', label: 'Places import and export', isInUse: ctx => ctx.locationCount > 0 },
  // Rangers & Teams
  { id: 'layers-panel', label: 'Import, export and print layers', isInUse: ctx => ctx.layerCount > 1 },
]

/**
 * Whether a control shows. Full shows everything. An unknown id shows (a typo must never hide a
 * control). In Simple it shows only while the mission uses it.
 */
export function isShown(id: string, view: AppView, ctx: ViewContext): boolean {
  if (view === 'full') return true
  const feature = ADVANCED_FEATURES.find(f => f.id === id)
  return !feature || feature.isInUse(ctx)
}

/**
 * The view to start in when the device has no stored choice. A device that already holds mission
 * data starts in Full, so nobody upgrading loses sight of controls they were using (D-62 item 5);
 * a new install starts in Simple. Either way the caller stores it at once so it never flips later.
 */
export function initialView(i: { stored: AppView | null, hasMissionData: boolean }): { view: AppView, source: ViewSource } | null {
  if (i.stored) return null
  return i.hasMissionData ? { view: 'full', source: 'upgrade' } : { view: 'simple', source: 'default' }
}

/**
 * A Setup file's suggested view (D-62 item 6). Applies only while the device has no choice of its
 * own: the source is still `default` or `upgrade`. Applying it records `setup`, so it is applied
 * once and never over `setup` or `user`. Returns null when it should be ignored.
 */
export function applySuggestedView(i: { suggested: unknown, source: ViewSource | null }): { view: AppView, source: ViewSource } | null {
  if (i.suggested !== 'simple' && i.suggested !== 'full') return null
  if (i.source !== 'default' && i.source !== 'upgrade') return null
  return { view: i.suggested, source: 'setup' }
}

/**
 * Whether a control wears the "Advanced" marker: in Full view, every control Simple view can hide
 * (whether or not this mission happens to use it), so core and extra stay visible at a glance.
 */
export function isAdvanced(id: string, view: AppView): boolean {
  return view === 'full' && ADVANCED_FEATURES.some(f => f.id === id)
}
