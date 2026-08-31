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
  })

  describe('archive tolerance', () => {
    it('finds the manifest by basename when wrapped in a folder, forward slashes', async () => {
      const { zipSync } = await import('fflate')
      const bytes = zipSync({
        'Vashon-2026/mission-zip.json': new TextEncoder().encode(JSON.stringify(manifest())),
        'Vashon-2026/photos/REW-1.jpg': new TextEncoder().encode('img'),
      })
      const { manifest: read, photos } = extractMissionZip(bytes)
      expect(read.settings.mission).toBe('Zip Test Mission')
      expect(photos[0].filename).toBe('REW-1.jpg')
    })

    it('finds the manifest by basename with backslash separators (PowerShell Compress-Archive)', async () => {
      const { zipSync } = await import('fflate')
      const bytes = zipSync({ 'Vashon-2026\\mission-zip.json': new TextEncoder().encode(JSON.stringify(manifest())) })
      const { manifest: read } = extractMissionZip(bytes)
      expect(read.settings.mission).toBe('Zip Test Mission')
    })
  })

  describe('rejections', () => {
    it('rejects bytes that are not a zip at all', () => {
      expect(() => extractMissionZip(new TextEncoder().encode('not a zip'))).toThrowError(/read this file as a zip/)
    })

    it('rejects a zip with no mission-zip.json', async () => {
      // A roster bundle zip (roster.json, no mission-zip.json) must not be mistaken for a
      // Mission Zip - that confusion is exactly what rangers.component.ts's own Mission-Zip
      // detection (finishing checklist gap #6) depends on NOT happening in reverse.
      const { zipSync } = await import('fflate')
      const bytes = zipSync({ 'roster.json': new TextEncoder().encode('[]') })
      expect(() => extractMissionZip(bytes)).toThrowError(/is not a Mission Zip/)
    })

    it('rejects a manifest missing rangers', async () => {
      const { zipSync } = await import('fflate')
      const bad = { schemaVersion: 1, settings: {} }
      const bytes = zipSync({ 'mission-zip.json': new TextEncoder().encode(JSON.stringify(bad)) })
      expect(() => extractMissionZip(bytes)).toThrowError(/not a valid Mission Zip manifest/)
    })

    it('does not mistake a MissionExport JSON for a Mission Zip manifest shape', async () => {
      // MissionExport has `radioLog` where a Mission Zip has none - the two schemas are
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
      expect(read.settings.mission).toBe('Not A Zip')
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
  })
})
