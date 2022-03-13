import { FieldReportStatusType } from "./field-report.interface"

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
    defZoom: number,  // or just zoom to bounds?
    markerScheme: string,
    OverviewDifference: number,
    OverviewMinZoom: number,
    OverviewMaxZoom: number
  },

  leaflet: {
    defZoom: number,  // or just zoom to bounds?
    markerScheme: string,
    OverviewDifference: number,
    OverviewMinZoom: number,
    OverviewMaxZoom: number
  },

  defFieldReportStatus: number
  fieldReportStatuses: FieldReportStatusType[],
  // fieldReportKeywords: string[],  // Future...could also just search notes field
}
