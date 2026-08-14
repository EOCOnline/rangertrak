import { LocationType } from './location.interface'

export enum FieldReportSource { Voice, Packet, APRS, Email }

/**
 * A plain, serializable bounding box.
 *
 * Deliberately NOT a Leaflet `LatLngBounds`: FieldReportsType is round-tripped
 * through localStorage as JSON, and a class instance comes back as a bare object
 * with no methods, so every `.getEast()` on a reloaded value threw. Map engines
 * (Leaflet, MapLibre) each take their own bounds shape - convert at the point of
 * use, not in the stored model.
 */
export type BoundsType = {
  north: number,
  south: number,
  east: number,
  west: number
}

/**
 * A packet of all (or selected/filtered) field data for the op period except Rangers or Settings
 */
export type FieldReportsType = {
  version: string,
  date: Date,
  event: string,
  bounds: BoundsType,
  numReport: number,
  maxId: number,
  filter: string, // All reports or not? Guard to ensure a subset never gets writen to localstorage?
  fieldReportArray: FieldReportType[]
}

/**
 * Data to store for each field report
 */
export type FieldReportType = {
  id: number,
  callsign: string,
  //team: string,
  location: LocationType,
  date: Date,
  status: string,
  notes: string
  // source: FieldReportSource
}

/**
 * Field Reports can be tagged with a status. These can have color & associated icons & can be edited by the user.
 * ? FUTURE: Consider replacing "Color" with "CSS_Style" to allow more options?
 */
export type FieldReportStatusType = {
  status: string,
  color: string,
  icon: string
}
