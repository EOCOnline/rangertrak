import { LatLngBounds } from 'leaflet'

import { LocationType } from './location.interface'

export enum FieldReportSource { Voice, Packet, APRS, Email }

/**
 * A packet of all (or selected/filtered) field data for the op period except Rangers or Settings
 */
export type FieldReportsType = {
  version: string,
  date: Date,
  event: string,
  bounds: LatLngBounds, //!BUG: Relies on Leaflet object type
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
