import { RadioLogEntryType } from '../services/radio-log-entry.interface'

import { buildReportPacket, parseReportPacket, reportPacketFilename, REPORT_PACKET_SCHEMA_VERSION } from './report-packet'

describe('report-packet', () => {
  const entry = (over: Partial<RadioLogEntryType> = {}): RadioLogEntryType => ({
    id: 0, callsign: 'R1',
    location: { lat: 47.4, lng: -122.4, address: '', derivedFromAddress: false },
    date: new Date('2026-08-31T12:00:00Z'), status: 'Normal', notes: 'test',
    ...over,
  })

  describe('buildReportPacket / parseReportPacket round trip', () => {
    it('reproduces the entries and packet-level fields exactly', () => {
      const built = buildReportPacket({
        entries: [entry(), entry({ id: 1, callsign: 'R2' })],
        settings: { mission: 'Vashon Search', event: 'Missing Hiker', opPeriod: 'Period 1' },
        operator: 'J. Ranger',
        appVersion: '0.91.0',
      })

      // A plain JSON.parse(JSON.stringify(...)) round trip, same as this app's own
      // localStorage load path (radio-log-migration.ts revives no Date objects either) -
      // `date` survives as the same ISO string, not a re-hydrated Date instance, so compare
      // through the same serialization rather than expecting object-identity equality.
      const parsed = parseReportPacket(JSON.stringify(built))

      expect(JSON.stringify(parsed)).toBe(JSON.stringify(built))
      expect(parsed.entries.length).toBe(2);
      expect(parsed.schemaVersion).toBe(REPORT_PACKET_SCHEMA_VERSION)
    })

    it('round-trips with zero entries', () => {
      const built = buildReportPacket({
        entries: [], settings: { mission: '', event: '', opPeriod: '' },
        operator: '', appVersion: '0.91.0',
      })

      const parsed = parseReportPacket(JSON.stringify(built))

      expect(parsed.entries).toEqual([])
    })

    it('does not mutate the entries array passed in', () => {
      const entries = [entry()]
      const snapshot = [...entries]

      buildReportPacket({ entries, settings: { mission: '', event: '', opPeriod: '' }, operator: '', appVersion: '0.91.0' })

      expect(entries).toEqual(snapshot)
    })
  })

  describe('notice', () => {
    it('is present and reads as a confidentiality warning', () => {
      const built = buildReportPacket({
        entries: [], settings: { mission: '', event: '', opPeriod: '' },
        operator: '', appVersion: '0.91.0',
      })

      expect(built.notice).toContain('CONFIDENTIAL')
    })
  })

  describe('rejections', () => {
    it('rejects text that is not JSON at all', () => {
      expect(() => parseReportPacket('not json{{{')).toThrowError(/not valid JSON/)
    })

    it('rejects an object missing schemaVersion', () => {
      expect(() => parseReportPacket(JSON.stringify({ entries: [] })))
        .toThrowError(/missing schemaVersion/)
    })

    it('rejects an object where entries is not an array', () => {
      expect(() => parseReportPacket(JSON.stringify({ schemaVersion: 1, entries: 'nope' })))
        .toThrowError(/"entries" is not an array/)
    })

    it('does not mistake a MissionExport JSON for a Report Packet', () => {
      // MissionExport has `rangers`/`radioLog.logEntries`, never a top-level `entries` array -
      // the shape check above already keeps the two apart without a dedicated cross-check.
      const missionExportShaped = {
        schemaVersion: 1, exportedAt: '2026-08-31T00:00:00.000Z', appVersion: '0.91.0',
        settings: { mission: 'Not A Packet' }, rangers: [], radioLog: { logEntries: [] },
      }
      expect(() => parseReportPacket(JSON.stringify(missionExportShaped)))
        .toThrowError(/"entries" is not an array/)
    })

    it('passes through a newer schemaVersion untouched rather than mangling it', () => {
      const fromTheFuture = { schemaVersion: 99, entries: [], mission: 'Future Mission' }
      const parsed = parseReportPacket(JSON.stringify(fromTheFuture))
      expect(parsed.schemaVersion).toBe(99)
      expect(parsed.mission).toBe('Future Mission')
    })
  })

  describe('reportPacketFilename', () => {
    it('sanitizes the mission name and uses a .txt extension', () => {
      const name = reportPacketFilename('Vashon Search #3!', '2026-08-31T12:00:00.000Z')
      expect(name).toBe('rangertrak-report-packet-Vashon_Search_3_-2026-08-31.txt')
    })

    it('falls back to "mission" when the mission name is blank', () => {
      const name = reportPacketFilename('', '2026-08-31T12:00:00.000Z')
      expect(name).toContain('report-packet-mission-')
    })
  })
})
