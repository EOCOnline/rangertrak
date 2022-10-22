import { FieldReportStatusType } from './field-report.interface'

/**
 * This has 'all' event data (aside from Rangers & Field Reports)
 * for readily serialization/dehydration
 */
export type SettingsType = {
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

  google: {
    //! TODO: type: string,  // e.g., google.maps.MapTypeId.ROADMAP
    // https://developers.google.com/maps/documentation/javascript/maptypes
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
