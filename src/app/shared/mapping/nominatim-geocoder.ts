import { GeocodeResult, GeocodingProvider } from './geocoding-provider.interface'

// https://operations.osmfoundation.org/policies/nominatim/ - the default, no-key
// geocoder. Browser fetch() cannot set a custom User-Agent header (browsers block it),
// but the browser's automatic Referer header satisfies Nominatim's stated policy for
// client-side JS apps. Callers are responsible for not calling this per-keystroke - the
// existing debounceTime(700) on the address field in LocationComponent covers that -
// and for surfacing `attribution` in the UI, per policy.
export class NominatimGeocoder implements GeocodingProvider {
  readonly name = 'Nominatim (OpenStreetMap)'
  readonly attribution = '&copy; OpenStreetMap contributors'

  private readonly baseUrl = 'https://nominatim.openstreetmap.org'

  async geocodeAddress(address: string): Promise<GeocodeResult> {
    if (!address || !address.trim()) {
      return { lat: 0, lng: 0, address: '', found: false, error: 'Empty address' }
    }

    try {
      const url = `${this.baseUrl}/search?format=jsonv2&q=${encodeURIComponent(address)}&limit=1`
      const response = await fetch(url)
      if (!response.ok) {
        return { lat: 0, lng: 0, address: '', found: false, error: `Nominatim returned ${response.status}` }
      }
      const results: Array<{ lat: string, lon: string, display_name: string }> = await response.json()
      const result = results[0]
      if (!result) {
        return { lat: 0, lng: 0, address: '', found: false, error: 'No results found' }
      }
      return {
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon),
        address: result.display_name,
        found: true
      }
    } catch (e) {
      return { lat: 0, lng: 0, address: '', found: false, error: `Address lookup requires Internet: ${e}` }
    }
  }

  async reverseGeocode(lat: number, lng: number): Promise<GeocodeResult> {
    try {
      const url = `${this.baseUrl}/reverse?format=jsonv2&lat=${lat}&lon=${lng}`
      const response = await fetch(url)
      if (!response.ok) {
        return { lat, lng, address: '', found: false, error: `Nominatim returned ${response.status}` }
      }
      const result: { display_name?: string } = await response.json()
      if (!result.display_name) {
        return { lat, lng, address: '', found: false, error: 'No address found' }
      }
      return { lat, lng, address: result.display_name, found: true }
    } catch (e) {
      return { lat, lng, address: '', found: false, error: `Address lookup requires Internet: ${e}` }
    }
  }
}
