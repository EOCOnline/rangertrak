/**
 * something else already has declared Location, so we use LocationType
 */
export interface LocationType {
  lat: number,
  lng: number,
  address: string
}

export const undefinedAddressFlag = 'NO_LOCATION_SET_YET'
