import { SettingsType } from './settings.interface'
import {
  DEFAULT_FIELD_REPORT_STATUSES, SETTINGS_SCHEMA_VERSION, migrateSettings
} from './settings-migration'
import { statusColorMeetsAA, statusColorValue, statusInkValue } from './status-color'

/**
 * migrateSettings() is deliberately pure, so these are plain function tests - no TestBed, no
 * browser. The point of the mechanism is that settings written by an older build can arrive
 * at ANY time (localStorage on load, or a mission export months later), so the cases that
 * matter are the awkward ones: absent version, custom colours, reordered/renamed statuses.
 */
describe('migrateSettings', () => {

  /** A v0 (pre-Sprint-E) settings object, with the CSS named colours as originally shipped. */
  function v0Settings(): SettingsType {
    return {
      settingsName: '', settingsDate: new Date(0),
      mission: 'M1', event: '', eventNotes: '', opPeriod: '',
      opPeriodStart: new Date(0), opPeriodEnd: new Date(0),
      application: 'RangerTrak', version: '0.15.8', debugMode: false,
      defLat: 47.4472, defLng: -122.4627, defPlusCode: '', w3wLocale: '',
      allowManualPinDrops: false, googleGeocodingApiKey: '',
      google: { defZoom: 17, markerScheme: '', overviewDifference: 5, overviewMinZoom: 5, overviewMaxZoom: 16 },
      leaflet: { defZoom: 17, markerScheme: '', overviewDifference: 5, overviewMinZoom: 5, overviewMaxZoom: 16 },
      imageDirectory: './assets/imgs/', defFieldReportStatus: 0,
      fieldReportStatuses: [
        { status: 'Normal', color: 'LightYellow', icon: 'a.png' },
        { status: 'Location Report', color: 'Aquamarine', icon: 'b.png' },
        { status: 'Evidence Report', color: 'DarkGoldenrod', icon: 'c.png' },
        { status: 'Need Rest/Food', color: 'Chartreuse', icon: 'd.png' },
        { status: 'Incident Check-in', color: 'Silver', icon: 'e.png' },
        { status: 'Incident Check-out', color: 'DimGray', icon: 'f.png' },
        { status: 'Urgent', color: 'Crimson', icon: 'g.png' },
      ],
    } as unknown as SettingsType
  }

  it('stamps the current schema version on settings that had none', () => {
    const out = migrateSettings(v0Settings())
    expect(out.schemaVersion).toBe(SETTINGS_SCHEMA_VERSION)
  })

  it('converts every legacy default colour to its semantic key', () => {
    const out = migrateSettings(v0Settings())
    expect(out.fieldReportStatuses.map(s => s.color)).toEqual([
      'normal', 'location-report', 'evidence-report', 'need-rest-food',
      'incident-check-in', 'incident-check-out', 'urgent',
    ])
  })

  it('preserves status order, because defFieldReportStatus is an index into it', () => {
    const before = v0Settings()
    const out = migrateSettings(before)
    expect(out.fieldReportStatuses.map(s => s.status))
      .toEqual(before.fieldReportStatuses.map(s => s.status))
    // The default status must still be the one it was before the migration ran.
    expect(out.fieldReportStatuses[out.defFieldReportStatus].status).toBe('Normal')
  })

  it('leaves a colour the user deliberately customised alone', () => {
    const input = v0Settings()
    input.fieldReportStatuses[6].color = '#FF00FF' // user recoloured Urgent
    const out = migrateSettings(input)
    expect(out.fieldReportStatuses[6].color).toBe('#FF00FF')
    // ...while its untouched neighbours still migrate.
    expect(out.fieldReportStatuses[5].color).toBe('incident-check-out')
  })

  it('does not rewrite a status wearing another status\'s old default colour', () => {
    // Matching on colour alone would turn this into 'normal' and silently change its meaning.
    const input = v0Settings()
    input.fieldReportStatuses[6].color = 'LightYellow' // Urgent, but yellow, on purpose
    const out = migrateSettings(input)
    expect(out.fieldReportStatuses[6].color).toBe('LightYellow')
  })

  it('is idempotent - migrating twice changes nothing further', () => {
    const once = migrateSettings(v0Settings())
    const twice = migrateSettings(once)
    expect(twice).toEqual(once)
  })

  it('does not mutate its argument', () => {
    const input = v0Settings()
    migrateSettings(input)
    expect(input.fieldReportStatuses[0].color).toBe('LightYellow')
    expect((input as { schemaVersion?: number }).schemaVersion).toBeUndefined()
  })

  it('leaves settings from a NEWER build alone rather than downgrading them', () => {
    const future = { ...v0Settings(), schemaVersion: SETTINGS_SCHEMA_VERSION + 99 }
    const out = migrateSettings(future)
    expect(out.schemaVersion).toBe(SETTINGS_SCHEMA_VERSION + 99)
    expect(out.fieldReportStatuses[0].color).toBe('LightYellow') // untouched, not "migrated"
  })

  it('falls back to the shipped defaults when statuses are missing entirely', () => {
    const broken = { ...v0Settings(), fieldReportStatuses: undefined } as unknown as SettingsType
    const out = migrateSettings(broken)
    expect(out.fieldReportStatuses).toEqual([...DEFAULT_FIELD_REPORT_STATUSES])
  })

  // BUG-3 (2026-08-19): settings saved before googleGeocodingApiKey existed had no such key,
  // and [formField]="form.googleGeocodingApiKey" cannot build a field for a model property
  // that is absent - it threw on every change-detection pass. This backfill is the fix.
  describe('backfilling fields added after a settings object was saved (BUG-3)', () => {
    function defaults(): SettingsType {
      return { ...v0Settings(), googleGeocodingApiKey: 'DEFAULT-KEY', w3wLocale: 'Default Locale' }
    }

    it('adds a top-level key the stored object never had, from the supplied defaults', () => {
      const stored = v0Settings() as unknown as Record<string, unknown>
      delete stored['googleGeocodingApiKey']
      const out = migrateSettings(stored as unknown as SettingsType, defaults())
      expect(out.googleGeocodingApiKey).toBe('DEFAULT-KEY')
    })

    it('does not overwrite a value the stored object already has, even an empty string', () => {
      const stored = { ...v0Settings(), googleGeocodingApiKey: 'USERS-OWN-KEY' }
      const out = migrateSettings(stored, defaults())
      expect(out.googleGeocodingApiKey).toBe('USERS-OWN-KEY')

      const emptyOnPurpose = { ...v0Settings(), w3wLocale: '' }
      const out2 = migrateSettings(emptyOnPurpose, defaults())
      expect(out2.w3wLocale).toBe('') // '' is a real, deliberate value - not "missing"
    })

    it('backfills one level into nested objects like leaflet/google', () => {
      const stored = v0Settings() as unknown as Record<string, unknown>
      delete (stored['leaflet'] as Record<string, unknown>)['markerScheme']
      const withDefaults = defaults()
      ;(withDefaults as unknown as Record<string, unknown>)['leaflet'] =
        { ...withDefaults.leaflet, markerScheme: 'default-scheme' }

      const out = migrateSettings(stored as unknown as SettingsType, withDefaults)
      expect(out.leaflet.markerScheme).toBe('default-scheme')
      expect(out.leaflet.defZoom).toBe(17) // the user's existing sibling value is untouched
    })

    it('does nothing when no defaults are supplied - callers must opt in deliberately', () => {
      const stored = v0Settings() as unknown as Record<string, unknown>
      delete stored['googleGeocodingApiKey']
      const out = migrateSettings(stored as unknown as SettingsType)
      expect('googleGeocodingApiKey' in out).toBe(false)
    })

    // Recurrence (2026-08-20), confirmed live on 0.16.7 from a real user's exported log:
    // Sprint H added six new SettingsType fields (showDD/showDDM/showDMS/showMGRS/showUTM/
    // showMaidenhead) without bumping SETTINGS_SCHEMA_VERSION. Every user already stamped at
    // version 2 - i.e. everyone who had opened the app before Sprint H shipped - hit
    // `this.field() is not a function` on Settings' six new checkboxes, every change-
    // detection pass, because the version gate skipped backfillMissingFields entirely for
    // anyone already "current". This is the exact scenario: an object already at the
    // CURRENT schema version, still missing a field the live SettingsType now declares.
    it('backfills a field even when the stored object is already at the current schema version', () => {
      const alreadyCurrent = { ...v0Settings(), schemaVersion: SETTINGS_SCHEMA_VERSION } as unknown as Record<string, unknown>
      delete alreadyCurrent['w3wLocale'] // stands in for a field added after this user's last save
      const out = migrateSettings(alreadyCurrent as unknown as SettingsType, defaults())
      expect(out.w3wLocale).toBe('Default Locale')
      expect(out.schemaVersion).toBe(SETTINGS_SCHEMA_VERSION) // not bumped further
    })
  })
})

describe('status colours', () => {
  it('resolves the shipped defaults to token references, not raw colours', () => {
    for (const s of DEFAULT_FIELD_REPORT_STATUSES) {
      expect(statusColorValue(s.color)).toBe(`var(--rt-status-${s.color})`)
      expect(statusInkValue(s.color)).toBe('var(--rt-status-ink)')
    }
  })

  it('passes a custom colour through untouched', () => {
    expect(statusColorValue('#FF00FF')).toBe('#FF00FF')
  })

  it('picks readable ink for custom colours at both ends of the range', () => {
    expect(statusInkValue('#000080')).toBe('#FFFFFF') // dark navy -> white text
    expect(statusInkValue('#FFFF00')).toBe('#111111') // bright yellow -> near-black text
  })

  it('flags a custom colour that cannot carry readable text', () => {
    // The band that fails against BOTH inks is narrower than "mid grey" intuition suggests:
    // #787878 peaks at 4.42:1 (white 4.42, near-black 4.28) and fails, while #7c7c7c already
    // clears it at 4.52:1 against near-black. Worth pinning precisely - an earlier draft of
    // this test assumed #808080 failed, and it does not (4.78:1 on near-black).
    expect(statusColorMeetsAA('#787878')).toBe(false)
    expect(statusColorMeetsAA('#7c7c7c')).toBe(true)
    expect(statusColorMeetsAA('#000080')).toBe(true)
  })

  it('treats every built-in key as accessible without measuring', () => {
    for (const s of DEFAULT_FIELD_REPORT_STATUSES) {
      expect(statusColorMeetsAA(s.color)).toBe(true)
    }
  })
})
