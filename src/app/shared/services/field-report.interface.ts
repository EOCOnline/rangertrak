import { LatLngBounds } from "leaflet"

/**
 * Data to store with every field report entry
 */
export type FieldReportType = {
  id: number,
  callsign: string,
  //team: string,
  lat: number,
  lng: number,
  address: string,
  date: Date,
  status: string,
  notes: string,
  // source: FieldReportSource
}

/**
 * A packet of all field data for the op period
 * except Rangers or Settings
 */
export type FieldReportsType = {
  version: string,
  date: Date,
  event: string,
  bounds: LatLngBounds,
  numReport: number,
  maxId: number,
  filter: string, // All reports or not? Guard to ensure a subset never gets writen to localstorage?
  fieldReportArray: FieldReportType[]
}

/**
 *
 */
export type FieldReportStatusType = {
  status: string,
  color: string,
  icon: string
}
