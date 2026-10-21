import { fakeAsync, tick } from '@angular/core/testing'
import { GoogleGeocoder, GOOGLE_LOOKUP_TIMEOUT_MS } from './google-geocoder'

describe('GoogleGeocoder', () => {
  const g = globalThis as unknown as { google?: unknown }
  let saved: unknown

  beforeEach(() => { saved = g.google })
  afterEach(() => { g.google = saved })

  /** A stand-in for the Maps JS API whose geocode() answers with `answer`. */
  function fakeGoogle(answer: () => Promise<unknown>) {
    g.google = { maps: { Geocoder: class { geocode = answer } } }
  }

  it('gives up when Google never answers (a bad key), instead of waiting forever', fakeAsync(() => {
    fakeGoogle(() => new Promise(() => { /* never settles, as with InvalidKeyMapError */ }))
    let result: { found: boolean, error?: string } | undefined
    new GoogleGeocoder('bad-key').geocodeAddress('Vashon, WA').then(r => result = r)

    tick(GOOGLE_LOOKUP_TIMEOUT_MS - 1)
    expect(result).toBeUndefined()
    tick(1)
    expect(result?.found).toBeFalse()
    expect(result?.error).toContain('check the Google key')
  }))

  it('returns the first result when Google answers in time', fakeAsync(() => {
    fakeGoogle(() => Promise.resolve({ results: [{
      geometry: { location: { lat: () => 47.45, lng: () => -122.46 } },
      formatted_address: 'Vashon, WA, USA',
    }] }))
    let result: { found: boolean, address: string, lat: number } | undefined
    new GoogleGeocoder('key').geocodeAddress('Vashon, WA').then(r => result = r)
    tick()

    expect(result).toEqual(jasmine.objectContaining({ found: true, address: 'Vashon, WA, USA', lat: 47.45 }))
    tick(GOOGLE_LOOKUP_TIMEOUT_MS)  // the timer was cleared; nothing left pending
  }))
})
