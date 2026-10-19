import { zipSync } from 'fflate'

/**
 * A small corpus of files someone might hand an import (E-198 phase 1): good ones, wrong-kind
 * ones and mangled ones, all built in memory so a spec can run every file through every import.
 * Every name, call sign and place is made up (the Fernhollow region); nothing here is real data.
 */

export type CorpusFile = {
  name: string
  bytes: Uint8Array
  /** The text, for files that are text; null for zips and random bytes (the caller decodes the same way). */
  text: string | null
}

const enc = new TextEncoder()

const entry = (id: number, uid: string, callsign: string, notes: string) => ({
  id, uid, callsign, date: '2026-10-17T14:02:00.000Z', status: 'Normal', notes,
  location: { lat: 47.45, lng: -122.46, address: 'Fernhollow Trailhead' },
})

/** A small, valid mission backup. */
export function sampleBackup() {
  return {
    schemaVersion: 1,
    exportedAt: '2026-10-17T14:02:00.000Z',
    appVersion: '0.99.56-alpha',
    settings: { mission: 'Fernhollow Drill', event: 'Ridge search', opPeriod: '1' },
    rangers: [
      { uid: 'r1', callsign: 'FERN-1', name: 'Alder Test' },
      { uid: 'r2', callsign: 'FERN-2', name: 'Birch Sample' },
    ],
    radioLog: {
      version: '1', maxId: 3, numReport: 3, logEntries: [
        entry(1, 'e1', 'FERN-1', 'At the trailhead.'),
        entry(2, 'e2', 'FERN-2', 'Crossing the footbridge, moss everywhere.'),
        entry(3, 'e3', 'FERN-1', 'Team of four resting at the second switchback. '.repeat(8)),
      ],
    },
    locations: [{ uid: 'p1', name: 'Fernhollow Trailhead' }],
    aarNotes: [{ uid: 'n1', text: 'Relay was weak on the north ridge.' }],
    photos: [{ stem: 'FERN-1', type: 'image/jpeg', data: 'AAAA'.repeat(200) }],
  }
}

/** A valid Report Packet. */
export function samplePacket() {
  return {
    schemaVersion: 1,
    notice: 'CONFIDENTIAL: made-up drill data.',
    exportedAt: '2026-10-17T15:00:00.000Z',
    appVersion: '0.99.56-alpha',
    mission: 'Fernhollow Drill',
    event: 'Ridge search',
    opPeriod: '1',
    operator: 'FERN-7',
    entries: [entry(1, 'x1', 'FERN-7', 'Packet entry one.'), entry(2, 'x2', 'FERN-7', 'Packet entry two.')],
  }
}

const json = (value: unknown) => JSON.stringify(value, null, 2)

function textFile(name: string, text: string): CorpusFile {
  return { name, bytes: enc.encode(text), text }
}

type Import = 'backup' | 'report-packet' | 'setup-file'
type CorpusEntry = CorpusFile & { expectedOk: Import[] }

function zipFile(name: string, files: Record<string, Uint8Array>, expectedOk: Import[]): CorpusEntry {
  return { name, bytes: zipSync(files), text: null, expectedOk }
}

/** UTF-8 BOM + text, as a spreadsheet or Notepad would save it. */
function withBom(text: string): Uint8Array {
  const body = enc.encode(text)
  const out = new Uint8Array(body.length + 3)
  out.set([0xEF, 0xBB, 0xBF], 0)
  out.set(body, 3)
  return out
}

const ENVELOPE = (kind?: string) => ({
  format: 'rangertrak-encrypted-v1',
  kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations: 310000, salt: 'c2FsdA==' },
  cipher: { name: 'AES-GCM', iv: 'aXY=' },
  ciphertext: 'Y2lwaGVydGV4dA==',
  hint: { exportedAt: '2026-10-17T14:02:00.000Z', appVersion: '0.99.56-alpha', ...(kind ? { kind } : {}) },
})

/**
 * The corpus. `expectedOk` names the imports that should accept the file (problem 'none'); every
 * other import must say something, and never 'none'.
 */
export function buildCorpus(): CorpusEntry[] {
  const backupText = json(sampleBackup())
  const cut = (pct: number) => backupText.slice(0, Math.floor(backupText.length * pct / 100))
  const handEdited = { ...sampleBackup(), rangers: { 'FERN-1': { callsign: 'FERN-1' } } }
  const newerBackup = { ...sampleBackup(), schemaVersion: 99 }
  const newerPacket = { ...samplePacket(), schemaVersion: 99 }
  const manifest = {
    schemaVersion: 3, exportedAt: '2026-10-17T14:02:00.000Z', appVersion: '0.99.56-alpha',
    settings: { mission: 'Fernhollow Drill' }, rangers: sampleBackup().rangers, locations: sampleBackup().locations,
  }
  const handoverManifest = { ...manifest, entries: sampleBackup().radioLog.logEntries }
  const randomBytes = new Uint8Array(512)
  let seed = 12345
  for (let i = 0; i < randomBytes.length; i++) { seed = (seed * 1103515245 + 12345) & 0x7fffffff; randomBytes[i] = seed & 0xff }
  randomBytes[0] = 0x07   // never starts like a zip or JSON

  return [
    { ...textFile('backup-good.json', backupText), expectedOk: ['backup'] },
    { name: 'backup-with-bom.json', bytes: withBom(backupText), text: '\uFEFF' + backupText, expectedOk: ['backup'] },
    { ...textFile('backup-truncated-10.json', cut(10)), expectedOk: [] },
    { ...textFile('backup-truncated-50.json', cut(50)), expectedOk: [] },
    { ...textFile('backup-truncated-95.json', cut(95)), expectedOk: [] },
    { ...textFile('backup-newer-schema.json', json(newerBackup)), expectedOk: [] },
    { ...textFile('backup-hand-edited.json', json(handEdited)), expectedOk: [] },
    { ...textFile('backup-encrypted.rtenc.json', json(ENVELOPE())), expectedOk: ['backup'] },
    { ...textFile('attachments-encrypted.rtenc.zip', json(ENVELOPE('attachments'))), expectedOk: ['backup'] },
    { ...textFile('handover-encrypted.rtenc.zip', json(ENVELOPE('handover'))), expectedOk: [] },
    { ...textFile('report-packet.txt', json(samplePacket())), expectedOk: ['report-packet'] },
    { ...textFile('report-packet-newer-schema.txt', json(newerPacket)), expectedOk: [] },
    { ...textFile('report-packet-cut.txt', json(samplePacket()).slice(0, 300)), expectedOk: [] },
    zipFile('setup-file.zip', { 'mission-zip.json': enc.encode(json(manifest)), 'README.txt': enc.encode('made-up') }, ['setup-file']),
    zipFile('handover.zip', { 'mission-zip.json': enc.encode(json(handoverManifest)), 'README.txt': enc.encode('made-up') }, ['setup-file']),
    zipFile('attachments.zip', { ['attachments/' + 'a'.repeat(64) + '.jpg']: new Uint8Array([1, 2, 3]), 'attachments.json': enc.encode('{}') }, []),
    zipFile('roster.xlsx', {
      '[Content_Types].xml': enc.encode('<Types/>'),
      'xl/workbook.xml': enc.encode('<workbook/>'),
    }, []),
    { ...textFile('roster.csv', 'Call sign,Name,Phone\nFERN-1,Alder Test,555-0101\nFERN-2,Birch Sample,555-0102\n'), expectedOk: [] },
    { name: 'random.bin', bytes: randomBytes, text: null, expectedOk: [] },
]
}
