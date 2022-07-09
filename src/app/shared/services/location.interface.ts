/**
 * something else already has declared Location, so we use LocationType
 */
export interface LocationType {
  lat: number,
  lng: number,
  address: string
}

export const undefinedAddressFlag = 'NO_LOCATION_SET_YET'
export const undefinedLocation = {
  lat: -1,
  lng: -1,
  address: undefinedAddressFlag
}
// test for object equality (of contents): _.isEqual( obj1 , obj2 ) or JSON.stringify(obj1) === JSON.stringify(obj2)
