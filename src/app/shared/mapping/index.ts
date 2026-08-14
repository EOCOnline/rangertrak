// OK to use this, but... means we have to keep it AND../ index.ts updated: worth it
// Mapps & location library interfaces
export { LayerType, Map, MapType } from './map.interface'
export { CodeArea, OpenLocationCode } from "./open-location-code"  // HAD TO REMMOVE default KEYWORD????
export { GeocodingProvider, GeocodeResult, GEOCODING_PROVIDER } from "./geocoding-provider.interface"
export { NominatimGeocoder } from "./nominatim-geocoder"
export { GoogleGeocoder } from "./google-geocoder"
export { buildPmtilesStyle, registerPmtilesProtocol, DEFAULT_PMTILES_URL } from "./map-style"
export { DDToDMS, DDToDDM, DMSToDD, DDMToDD, DirEnum, DirType } from "./coordinate"
export { AbstractMap } from "./map"
