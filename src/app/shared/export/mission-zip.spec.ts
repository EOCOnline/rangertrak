import { MissionType } from '../services/mission.interface'
import { RangerType, UnknownRanger } from '../services/ranger.interface'

import { buildMissionZipBytes, extractMissionZip, MISSION_ZIP_SCHEMA_VERSION, MissionZipManifest } from './mission-zip'

describe('mission-zip', () => {
  const ranger = (over: Partial<RangerType>): RangerType => ({ ...UnknownRanger, ...over })

  const manifest = (over: Partial<MissionZipManifest> = {}): MissionZipManifest => ({
    schemaVersion: MISSION_ZIP_SCHEMA_VERSION,
    exportedAt: '2026-08-31T00:00:00.000Z',
    appVersion: '0.90.0',
    settings: { mission: 'Zip Test Mission' } as any as MissionType,
    rangers: [ranger({ callsign: 'Z1', id: 'REW-1' })],
    ...over,
  })

  describe('round trip', () => {
    it('reproduces the manifest and photos exactly', async () => {
      const built = manifest({ locations: [{ name: 'Command Post', type: 'Command Post', lat: 47.4, lng: -122.4 }] })
      const photos = [{ stem: 'REW-1', blob: new Blob(['fake-jpeg-bytes'], { type: 'image/jpeg' }) }]

      const bytes = await buildMissionZipBytes(built, photos)
      const { manifest: read, photos: readPhotos } = extractMissionZip(bytes)

      expect(read).toEqual(built)
      expect(readPhotos.length).toBe(1)
      expect(readPhotos[0].filename).toBe('REW-1.jpg')
      expect(new TextDecoder().decode(readPhotos[0].bytes)).toBe('fake-jpeg-bytes')
    })

    it('round-trips with no photos and no locations', async () => {
      const built = manifest()
      const bytes = await buildMissionZipBytes(built, [])
      const { manifest: read, photos } = extractMissionZip(bytes)

      expect(read).toEqual(built)
      expect(photos).toEqual([])
    })

    // v2 (2026-08-31): a category-bearing Setup file is now a normal shape, not just the
    // always-both-present v1 case above - these pin that each category can travel alone.
    it('round-trips a rangers-only manifest (no settings, no locations)', async () => {
      const { settings, locations, ...rangersOnly } = manifest()
      const built = rangersOnly as MissionZipManifest

      const bytes = await buildMissionZipBytes(built, [])
      const { manifest: read } = extractMissionZip(bytes)

      expect(read).toEqual(built)
      expect(read.settings).toBeUndefined()
      expect(read.locations).toBeUndefined()
      expect(read.rangers?.length).toBe(1)
    })

    it('round-trips a locations-only manifest (no settings, no rangers)', async () => {
      const { settings, rangers, ...locationsOnly } = manifest({
        locations: [{ name: 'Staging Area', type: 'Staging Area', lat: 47.5, lng: -122.5 }],
      })
      const built = locationsOnly as MissionZipManifest

      const bytes = await buildMissionZipBytes(built, [])
      const { manifest: read } = extractMissionZip(bytes)

      expect(read).toEqual(built)
      expect(read.settings).toBeUndefined()
      expect(read.rangers).toBeUndefined()
      expect(read.locations?.length).toBe(1)
    })
  })

  describe('archive tolerance', () => {
    it('finds the manifest by basename when wrapped in a folder, forward slashes', async () => {
      const { zipSync } = await import('fflate')
      const bytes = zipSync({
        'Vashon-2026/mission-zip.json': new TextEncoder().encode(JSON.stringify(manifest())),
        'Vashon-2026/photos/REW-1.jpg': new TextEncoder().encode('img'),
      })
      const { manifest: read, photos } = extractMissionZip(bytes)
      expect(read.settings?.mission).toBe('Zip Test Mission')
      expect(photos[0].filename).toBe('REW-1.jpg')
    })

    it('finds the manifest by basename with backslash separators (PowerShell Compress-Archive)', async () => {
      const { zipSync } = await import('fflate')
      const bytes = zipSync({ 'Vashon-2026\\mission-zip.json': new TextEncoder().encode(JSON.stringify(manifest())) })
      const { manifest: read } = extractMissionZip(bytes)
      expect(read.settings?.mission).toBe('Zip Test Mission')
    })
  })

  describe('rejections', () => {
    it('rejects bytes that are not a zip at all', () => {
      expect(() => extractMissionZip(new TextEncoder().encode('not a zip'))).toThrowError(/read this file as a zip/)
    })

    it('rejects a zip with no mission-zip.json', async () => {
      // A roster bundle zip (roster.json, no mission-zip.json) must not be mistaken for a
      // Setup file - that confusion is exactly what rangers.component.ts's own mergeRangers()
      // path (E-109 Setup files) depends on NOT happening in reverse.
      const { zipSync } = await import('fflate')
      const bytes = zipSync({ 'roster.json': new TextEncoder().encode('[]') })
      expect(() => extractMissionZip(bytes)).toThrowError(/is not a Setup file/)
    })

    // v2: a manifest with settings/rangers both omitted used to be impossible (both were
    // required); now it is a genuinely empty manifest - nothing to apply - which is the one
    // shape that must still be rejected. A manifest carrying only ONE category (the old
    // fixture here, `{schemaVersion, settings: {}}`) is now perfectly valid, so that fixture
    // moved to the round-trip describe block above instead of staying a rejection case.
    it('rejects a manifest with no categories at all', async () => {
      const { zipSync } = await import('fflate')
      const bad = { schemaVersion: MISSION_ZIP_SCHEMA_VERSION, exportedAt: '2026-08-31T00:00:00.000Z', appVersion: '0.90.0' }
      const bytes = zipSync({ 'mission-zip.json': new TextEncoder().encode(JSON.stringify(bad)) })
      expect(() => extractMissionZip(bytes)).toThrowError(/not a valid Setup file manifest/)
    })

    it('does not mistake a MissionExport JSON for a Setup file manifest shape', async () => {
      // MissionExport has `radioLog` where a Setup file has none - the two schemas are
      // deliberately never unified (see mission-zip.ts's own header comment), but a
      // MissionExport still happens to satisfy extractMissionZip()'s loose shape check
      // (it has settings + rangers too). That is expected and fine: the file EXTENSION
      // (.json vs .zip) and the manifest entry name are what actually keep them apart in
      // practice, not manifest validation - this test documents that boundary rather than
      // asserting a rejection that would be wrong to add.
      const { zipSync } = await import('fflate')
      const missionExportShaped = {
        schemaVersion: 1, exportedAt: '2026-08-31T00:00:00.000Z', appVersion: '0.90.0',
        settings: { mission: 'Not A Zip' }, rangers: [], radioLog: { logEntries: [] },
      }
      const bytes = zipSync({ 'mission-zip.json': new TextEncoder().encode(JSON.stringify(missionExportShaped)) })
      const { manifest: read } = extractMissionZip(bytes)
      expect(read.settings?.mission).toBe('Not A Zip')
    })
  })

  describe('README.txt', () => {
    it('is included in the archive with a confidentiality notice', async () => {
      const bytes = await buildMissionZipBytes(manifest(), [])
      const { unzipSync } = await import('fflate')
      const entries = unzipSync(bytes)
      const readme = new TextDecoder().decode(entries['README.txt'])
      expect(readme).toContain('CONFIDENTIAL')
    })

    it('does not throw when every category is absent', async () => {
      const { settings, rangers, locations, ...bare } = manifest()
      const bytes = await buildMissionZipBytes(bare as MissionZipManifest, [])
      const { unzipSync } = await import('fflate')
      const entries = unzipSync(bytes)
      const readme = new TextDecoder().decode(entries['README.txt'])
      expect(readme).toContain('no categories')
    })
  })
})
