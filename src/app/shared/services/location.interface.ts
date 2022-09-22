/**
 * something else already has declared Location, so we use LocationType
 *
 * TODO: We could also store derived pCode & What3Words.
 * (We do store them if they were the 'original' user provided location)
 */
export interface LocationType {
  lat: number,
  lng: number,
  address: string,
  derivedFromAddress: boolean  // REVIEW: Maybe should be an enum: DD, streetAddress, PCode, or What3Words?
}

export const undefinedAddressFlag = 'NO_LOCATION_SET_YET'
export const undefinedLocation = {
  lat: -1,
  lng: -1,
  address: undefinedAddressFlag,
  derivedFromAddress: false // Did location originate from an address (perhaps imperfectly geocoded) or a lat/long
}
// test for object equality (of contents): _.isEqual( obj1 , obj2 ) or JSON.stringify(obj1) === JSON.stringify(obj2)
