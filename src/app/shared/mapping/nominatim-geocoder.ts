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

  // Nominatim's usage policy caps clients at ~1 request/second and returns 429 once that's
  // exceeded - real traffic to worry about here, not just this app's own e2e suite hammering
  // it in a tight loop. A 429 is usually transient (the policy is a rolling window, not a
  // ban), so a couple of backed-off retries turns a real scribe's momentary bad luck into a
  // resolved address instead of a silent failure. Respects Retry-After when the server sends
  // one; otherwise backs off 1s then 2s. Deliberately small (2 retries) - this runs on every
  // debounced keystroke pause, and piling on retries during a genuine outage just delays the
  // "Address lookup requires Internet" fallback message further.
  private async fetchWithRetry(url: string, maxRetries = 2): Promise<Response> {
    let lastResponse: Response | undefined
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const response = await fetch(url)
      if (response.status !== 429) return response
      lastResponse = response
      if (attempt === maxRetries) break
      const retryAfterHeader = Number(response.headers.get('Retry-After'))
      const delayMs = Number.isFinite(retryAfterHeader) && retryAfterHeader > 0
        ? retryAfterHeader * 1000
        : 1000 * 2 ** attempt
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }
    return lastResponse!
  }

  async geocodeAddress(address: string): Promise<GeocodeResult> {
    if (!address || !address.trim()) {
      return { lat: 0, lng: 0, address: '', found: false, error: 'Empty address' }
    }

    try {
      const url = `${this.baseUrl}/search?format=jsonv2&q=${encodeURIComponent(address)}&limit=1`
      const response = await this.fetchWithRetry(url)
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
      const response = await this.fetchWithRetry(url)
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
