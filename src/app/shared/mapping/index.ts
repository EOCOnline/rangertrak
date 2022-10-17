// OK to use this, but... means we have to keep it AND../ index.ts updated: worth it
// Mapps & location library interfaces
export { LayerType, Map, MapType } from './map.interface'
export { CodeArea, OpenLocationCode } from "./open-location-code"  // HAD TO REMMOVE default KEYWORD????
export { GoogleGeocode } from "./google-geocode"
export { DDToDMS, DDToDDM, DMSToDD, DDMToDD, DirEnum, DirType } from "./coordinate"
export { AbstractMap } from "./map"
