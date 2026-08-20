// Split out of map-style.ts so this one constant can be imported without dragging in
// maplibre-gl (~800KB, imported eagerly at that file's top for addProtocol/setWorkerUrl).
// MissionReadinessService (D-32) needs this path but must stay light - it's root-provided
// and rendered via HeaderComponent on every page, including the eager Entry page, so
// importing map-style.ts here would undo E-64's work keeping MapLibre out of the initial
// bundle.
//
// NOTE: this is a normal static asset under /assets/**, which ngsw-config.json caches with
// installMode "lazy" - so it is cached on FIRST REQUEST, not at install time. The offline
// map therefore only works offline after the /map page has been opened once while
// connected. See FIELD-GUIDE.md ("Warm start").
export const DEFAULT_PMTILES_URL = '/assets/maps/vashon.pmtiles'
