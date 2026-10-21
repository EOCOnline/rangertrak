/// <reference types="@types/google.maps" />
import { GeocodeResult, GeocodingProvider } from './geocoding-provider.interface'

// Optional geocoder, only ever constructed when the user has supplied their own Google
// API key in Settings (see mission.component.ts) - the key lives in that user's
// localStorage, never in secrets.json, never bundled. The Google Maps JS script is only
// loaded lazily, on first actual geocode call, not at construction - so simply having a
// key configured doesn't cost a network request until it's used.
// A bad or restricted key makes Google log InvalidKeyMapError and never settle geocode(), so a
// lookup would wait forever. Give up after this long instead (found 2026-10-21, E-162 follow-up).
export const GOOGLE_LOOKUP_TIMEOUT_MS = 10_000

export class GoogleGeocoder implements GeocodingProvider {
  readonly name = 'Google Maps'
  readonly attribution = 'Address data &copy; Google'

  private scriptLoadPromise: Promise<void> | null = null

  constructor(private apiKey: string) { }

  private loadScript(): Promise<void> {
    if (this.scriptLoadPromise) {
      return this.scriptLoadPromise
    }
    this.scriptLoadPromise = new Promise<void>((resolve, reject) => {
      if (typeof google !== 'undefined' && google.maps?.Geocoder) {
        resolve()
        return
      }
      const script = document.createElement('script')
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(this.apiKey)}`
      script.async = true
      script.onload = () => resolve()
      script.onerror = () => reject(new Error('Failed to load Google Maps JS API'))
      document.head.appendChild(script)
    })
    return this.scriptLoadPromise
  }

  private withTimeout<T>(lookup: Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Google did not answer; check the Google key')), GOOGLE_LOOKUP_TIMEOUT_MS)
      lookup.then(
        value => { clearTimeout(timer); resolve(value) },
        error => { clearTimeout(timer); reject(error) })
    })
  }

  private async getGeocoder(): Promise<google.maps.Geocoder> {
    await this.loadScript()
    return new google.maps.Geocoder()
  }

  async geocodeAddress(address: string): Promise<GeocodeResult> {
    try {
      const geocoder = await this.getGeocoder()
      const response = await this.withTimeout(geocoder.geocode({ address }))
      const result = response.results[0]
      if (!result) {
        return { lat: 0, lng: 0, address: '', found: false, error: 'No results found' }
      }
      return {
        lat: result.geometry.location.lat(),
        lng: result.geometry.location.lng(),
        address: result.formatted_address,
        found: true
      }
    } catch (e) {
      return { lat: 0, lng: 0, address: '', found: false, error: `Address lookup requires Internet: ${e}` }
    }
  }

  async reverseGeocode(lat: number, lng: number): Promise<GeocodeResult> {
    try {
      const geocoder = await this.getGeocoder()
      const response = await this.withTimeout(geocoder.geocode({ location: { lat, lng } }))
      const result = response.results[0]
      if (!result) {
        return { lat, lng, address: '', found: false, error: 'No address found' }
      }
      return { lat, lng, address: result.formatted_address, found: true }
    } catch (e) {
      return { lat, lng, address: '', found: false, error: `Address lookup requires Internet: ${e}` }
    }
  }
}
