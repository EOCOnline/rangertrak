import { FieldReportStatusType } from './field-report.interface'

/**
 * This has 'all' event data (aside from Rangers & Field Reports)
 * for readily serialization/dehydration
 */
export type SettingsType = {
  // Persisted-shape version, owned by settings-migration.ts (SETTINGS_SCHEMA_VERSION).
  // Distinct from `version` below, which is the *app* version stamped from package.json on
  // every load and plays no part in migration decisions.
  schemaVersion: number,

  settingsName: string, // FUTURE: Use if people want to load and saveas, or have various 'templates'
  settingsDate: Date, // when last edited...

  mission: string,
  event: string,
  eventNotes: string,
  opPeriod: string,
  opPeriodStart: Date,
  opPeriodEnd: Date,

  application: string,
  version: string,
  debugMode: boolean,

  defLat: number,
  defLng: number,
  defPlusCode: string,
  w3wLocale: string,
  allowManualPinDrops: boolean,

  // User-supplied Google Geocoding API key (optional). Activates GoogleGeocoder as the
  // GeocodingProvider instead of the default, no-key Nominatim. Lives only in this
  // user's localStorage - never in secrets.json, never bundled. Empty string = disabled.
  googleGeocodingApiKey: string,

  // Zoom/overview settings for the MapLibre + PMTiles map (repurposed from its original
  // Google Maps *display* meaning now that GmapComponent is gone - the field name is
  // legacy, the settings UI section is labeled for its current purpose).
  google: {
    defZoom: number,  // or just zoom to bounds?
    markerScheme: string,
    overviewDifference: number,
    overviewMinZoom: number,
    overviewMaxZoom: number
  },

  leaflet: {
    //! TODO: TileProvider: string,
    defZoom: number,  // or just zoom to bounds?
    markerScheme: string,
    overviewDifference: number,
    overviewMinZoom: number,
    overviewMaxZoom: number
  },

  imageDirectory: string,
  defFieldReportStatus: number,
  fieldReportStatuses: FieldReportStatusType[],
  // fieldReportKeywords: string[],  // Future...could also just search notes field
}
