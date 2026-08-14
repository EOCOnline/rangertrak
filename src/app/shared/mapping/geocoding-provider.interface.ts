import { InjectionToken } from '@angular/core'

export interface GeocodeResult {
  lat: number
  lng: number
  address: string
  found: boolean
  error?: string
}

export interface GeocodingProvider {
  readonly name: string
  readonly attribution: string
  geocodeAddress(address: string): Promise<GeocodeResult>
  reverseGeocode(lat: number, lng: number): Promise<GeocodeResult>
}

export const GEOCODING_PROVIDER = new InjectionToken<GeocodingProvider>('GEOCODING_PROVIDER')
