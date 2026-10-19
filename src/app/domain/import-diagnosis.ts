/**
 * Plain-language diagnosis of a file someone tried to import (E-198 phase 1, ADR D-57).
 *
 * ONE pure function used by every error path of Restore, Report Packet and Setup file. It says
 * what the file is and what is wrong with it, in words a scribe can act on, and names the right
 * place when it is the wrong kind of file. It reads; it never repairs, drops or guesses content
 * (that is phase 2). The technical reason goes back in `technical`, for `log.error` only.
 *
 * No IO and no Angular: the caller reads the file and passes the first bytes plus, for anything
 * that is not a zip, the whole text.
 */

/** Which import the person was using. */
export type ExpectedImport = 'backup' | 'report-packet' | 'setup-file'

export type DetectedKind =
  | 'backup'
  | 'report-packet'
  | 'setup-file'            // a zip with a Setup file manifest (a plain hand-over has the same shape)
  | 'attachments'           // a backup's attachments companion (zip)
  | 'encrypted-backup'
  | 'encrypted-handover'
  | 'encrypted-attachments'
  | 'spreadsheet'           // CSV or XLSX
  | 'roster-list'           // a bare JSON list of rangers
  | 'cut-off'               // JSON that stops partway
  | 'unknown'

export type ImportProblem =
  | 'none'                  // looks like what was expected (it may still need a passphrase)
  | 'wrong-kind'
  | 'locked'
  | 'cut-off'
  | 'newer-version'
  | 'damaged'
  | 'not-rangertrak'

export type ImportDiagnosis = {
  detected: DetectedKind
  problem: ImportProblem
  /** Plain words for the person. Empty when `problem` is 'none'. */
  message: string
  /** The right place for this file, when it is the wrong kind. */
  goTo?: { label: string, path: string }
  /** The technical reason, for the log only. Never shown. */
  technical: string
}

/** The newest `schemaVersion` this build understands for each JSON kind. */
export type KnownSchemaVersions = { backup: number, reportPacket: number }

const DEFAULT_KNOWN: KnownSchemaVersions = { backup: 1, reportPacket: 1 }

const PLACES = {
  restore: { label: 'Mission > Data safety > Restore', path: '/mission' },
  setup: { label: 'Mission > Setup files', path: '/mission#setup-file' },
  packet: { label: 'Radio Log > Report Packet > Load Report Packet', path: '/radio-log' },
  handover: { label: 'Radio Log > Hand over to another scribe', path: '/radio-log' },
  roster: { label: 'Rangers > Import', path: '/rangers' },
} as const

/** A UTF-8 byte order mark at the start of text: reading it away is reading, not repair. */
export function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text
}

/** The same, for raw bytes. */
export function stripBomBytes(bytes: Uint8Array): Uint8Array {
  return bytes.length >= 3 && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF ? bytes.subarray(3) : bytes
}

const NAMES: Record<ExpectedImport, string> = {
  'backup': 'mission backup',
  'report-packet': 'Report Packet',
  'setup-file': 'Setup file',
}

function make(
  detected: DetectedKind, problem: ImportProblem, message: string, technical: string,
  goTo?: { label: string, path: string },
): ImportDiagnosis {
  return { detected, problem, message, technical, ...(goTo ? { goTo } : {}) }
}

const OK = (detected: DetectedKind): ImportDiagnosis => make(detected, 'none', '', 'looks like the expected kind')

const NOT_RANGERTRAK = (technical: string) =>
  make('unknown', 'not-rangertrak', 'This isn\'t a RangerTrak file.', technical)

function damaged(expected: ExpectedImport, what: string, technical: string): ImportDiagnosis {
  return make(
    expected === 'report-packet' ? 'report-packet' : expected === 'setup-file' ? 'setup-file' : 'backup',
    'damaged',
    `This ${NAMES[expected]} is damaged or was edited by hand (for example re-saved from a spreadsheet or text editor): ${what}. Ask for a fresh copy.`,
    technical)
}

/** Latin-1 view of the first bytes, enough to read zip entry names (stored in the clear in each local header). */
function asciiHead(head: Uint8Array): string {
  let out = ''
  const n = Math.min(head.length, 8192)
  for (let i = 0; i < n; i++) out += String.fromCharCode(head[i])
  return out
}

function diagnoseZip(head: Uint8Array, expected: ExpectedImport): ImportDiagnosis {
  const names = asciiHead(head)
  const isMissionZip = names.includes('mission-zip.json')
  if (!isMissionZip && (names.includes('[Content_Types].xml') || names.includes('xl/'))) {
    return make('spreadsheet', 'wrong-kind',
      'This looks like a spreadsheet. Roster spreadsheets go in Rangers > Import.',
      'xlsx zip', PLACES.roster)
  }
  if (isMissionZip) {
    if (expected === 'setup-file') return OK('setup-file')
    return make('setup-file', 'wrong-kind',
      'This is a Setup file or a scribe hand-over. Open a Setup file in Mission > Setup files, and a hand-over in Radio Log > Hand over to another scribe.',
      'zip with mission-zip.json', PLACES.setup)
  }
  if (names.includes('attachments.json') || names.includes('attachments/')) {
    return make('attachments', 'wrong-kind',
      expected === 'backup'
        ? 'This is a backup\'s attachments file. Pick it together with the backup in Mission > Data safety > Restore, or on its own to add the photos to entries already on this device.'
        : 'This is an attachments file that goes with a mission backup. Open it in Mission > Data safety > Restore, together with the backup.',
      'zip with attachments', PLACES.restore)
  }
  return NOT_RANGERTRAK('zip with no RangerTrak manifest')
}

/** Whether the brackets are still open at the end, ignoring anything inside strings: the text stops mid-structure. */
function endsMidStructure(text: string): boolean {
  let depth = 0
  let inString = false
  let escaped = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inString) {
      if (escaped) escaped = false
      else if (c === '\\') escaped = true
      else if (c === '"') inString = false
      continue
    }
    if (c === '"') inString = true
    else if (c === '{' || c === '[') depth++
    else if (c === '}' || c === ']') depth--
  }
  return depth > 0 || inString
}

const SECTION_WORDS: Record<string, string> = {
  settings: 'the mission settings',
  rangers: 'the roster',
  radioLog: 'the radio log',
  locations: 'the places',
  aarNotes: 'the after action notes',
  layers: 'the layers',
  photos: 'the ranger photos',
  entries: 'the reports',
}

/** The last top-level section name that started before the cut, in plain words ('' when none). */
function lastSection(text: string): string {
  let last = ''
  const re = /"(settings|rangers|radioLog|locations|aarNotes|layers|photos|entries)"\s*:/g
  for (let m = re.exec(text); m; m = re.exec(text)) last = m[1]
  return last ? SECTION_WORDS[last] : ''
}

function formatSize(chars: number): string {
  if (chars < 1024) return `${chars} bytes`
  if (chars < 1024 * 1024) return `${Math.round(chars / 1024)} KB`
  return `${(chars / (1024 * 1024)).toFixed(1)} MB`
}

function parsePosition(error: unknown): number | null {
  const m = /position (\d+)/.exec(String((error as Error)?.message ?? ''))
  return m ? Number(m[1]) : null
}

function looksLikeDelimited(text: string): boolean {
  const lines = text.split(/\r?\n/).filter(l => l.trim()).slice(0, 5)
  if (lines.length < 2) return false
  for (const sep of [',', '\t', ';']) {
    const counts = lines.map(l => l.split(sep).length - 1)
    if (counts[0] >= 1 && counts.every(c => c === counts[0])) return true
  }
  return false
}

function hasBinary(text: string): boolean {
  // Control characters and the replacement character never appear in text a person typed or exported.
  // eslint-disable-next-line no-control-regex
  return /[\u0000-\u0008\u000E-\u001F�]/.test(text.slice(0, 4096))
}

function describeBackupProblem(o: Record<string, any>): string | null {
  if (typeof o['schemaVersion'] !== 'number') return 'it has no version number'
  if (!o['settings'] || typeof o['settings'] !== 'object' || Array.isArray(o['settings'])) return 'the mission settings are missing or are not in the right form'
  if (!('rangers' in o)) return 'the roster is missing'
  if (!Array.isArray(o['rangers'])) return 'the roster is not a list'
  if (!o['radioLog'] || typeof o['radioLog'] !== 'object') return 'the radio log is missing'
  if (!Array.isArray(o['radioLog'].logEntries)) return 'the radio log entries are not a list'
  return null
}

function describePacketProblem(o: Record<string, any>): string | null {
  if (typeof o['schemaVersion'] !== 'number') return 'it has no version number'
  if (!Array.isArray(o['entries'])) return 'the reports are not a list'
  return null
}

function wrongKindMessage(detected: 'backup' | 'report-packet', expected: ExpectedImport): ImportDiagnosis {
  if (detected === 'backup') {
    if (expected === 'report-packet') {
      return make('backup', 'wrong-kind',
        'This is a mission backup. Restoring it replaces everything; to add someone\'s entries, ask them for a Report Packet.',
        'backup given to Report Packet import', PLACES.restore)
    }
    return make('backup', 'wrong-kind',
      'This is a mission backup, not a Setup file. Restore it from Mission > Data safety > Restore.',
      'backup given to Setup file import', PLACES.restore)
  }
  if (expected === 'backup') {
    return make('report-packet', 'wrong-kind',
      'This is a Report Packet, not a mission backup. Add its reports from Radio Log > Report Packet > Load Report Packet.',
      'Report Packet given to Restore', PLACES.packet)
  }
  return make('report-packet', 'wrong-kind',
    'This is a Report Packet, not a Setup file. Add its reports from Radio Log > Report Packet > Load Report Packet.',
    'Report Packet given to Setup file import', PLACES.packet)
}

/**
 * Says what `head` (the first bytes of the file; a few KB is plenty) and `text` (the whole file as
 * text, or null for a zip or anything that is not text) are, measured against what the person was
 * importing. `problem: 'none'` means it looks right; the import itself still decides the rest
 * (a passphrase, a record-by-record check).
 */
export function diagnoseImportFile(
  head: Uint8Array,
  text: string | null,
  expected: ExpectedImport,
  known: KnownSchemaVersions = DEFAULT_KNOWN,
): ImportDiagnosis {
  const bytes = stripBomBytes(head)

  // A zip: "PK". Setup files, hand-overs, attachments companions and .xlsx all are.
  if (bytes.length >= 2 && bytes[0] === 0x50 && bytes[1] === 0x4B) return diagnoseZip(bytes, expected)

  if (text === null) return NOT_RANGERTRAK('not text and not a zip')
  const trimmed = stripBom(text).trimStart()
  if (!trimmed) return NOT_RANGERTRAK('empty file')
  if (hasBinary(trimmed)) return NOT_RANGERTRAK('binary content')

  if (trimmed[0] === '{') {
    let parsed: unknown
    try {
      parsed = JSON.parse(trimmed)
    } catch (error) {
      const position = parsePosition(error)
      const atEnd = position !== null && position >= trimmed.length - 2
      if (atEnd || endsMidStructure(trimmed)) {
        // The file does not say how long it should have been, so no percentage is invented: what
        // arrived, and where it stops, are both facts.
        const where = lastSection(trimmed)
        return make('cut-off', 'cut-off',
          `This file is cut off: only about ${formatSize(trimmed.length)} of it arrived${where ? `, and it stops partway through ${where}` : ''}. Ask for it again, or copy it again.`,
          `JSON ends early (${(error as Error).message}); ${trimmed.length} chars read`)
      }
      return damaged(expected, 'it can no longer be read as a whole',
        `JSON syntax error with balanced brackets: ${(error as Error).message}`)
    }
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return NOT_RANGERTRAK('JSON, but not an object')
    return diagnoseObject(parsed as Record<string, any>, expected, known)
  }

  if (trimmed[0] === '[') {
    let list: unknown
    let parsedOk = true
    try {
      list = JSON.parse(trimmed)
    } catch {
      parsedOk = false
    }
    if (parsedOk) {
      if (Array.isArray(list) && list.some(r => r && typeof r === 'object' && ('callsign' in r || 'callSign' in r))) {
        return make('roster-list', 'wrong-kind',
          'This looks like a list of rangers. Roster files go in Rangers > Import.', 'bare roster JSON list', PLACES.roster)
      }
    } else if (endsMidStructure(trimmed)) {
      return make('cut-off', 'cut-off',
        `This file is cut off: only about ${formatSize(trimmed.length)} of it arrived. Ask for it again, or copy it again.`,
        'JSON list ends early')
    }
    return NOT_RANGERTRAK('JSON list that is not a roster')
  }

  if (looksLikeDelimited(trimmed)) {
    return make('spreadsheet', 'wrong-kind',
      'This looks like a spreadsheet. Roster spreadsheets go in Rangers > Import.', 'delimited text', PLACES.roster)
  }
  return NOT_RANGERTRAK('text that is not JSON or a table')
}

function diagnoseObject(o: Record<string, any>, expected: ExpectedImport, known: KnownSchemaVersions): ImportDiagnosis {
  // An encrypted envelope (the structure encrypted-file.ts writes).
  if (o['format'] === 'rangertrak-encrypted-v1' && typeof o['ciphertext'] === 'string') {
    const kind = o['hint']?.kind
    if (kind === 'handover') {
      if (expected === 'setup-file') {
        return make('encrypted-handover', 'locked',
          'This file is locked with a passphrase. Open it from Radio Log > Hand over to another scribe.',
          'encrypted hand-over given to Setup file import', PLACES.handover)
      }
      return make('encrypted-handover', 'wrong-kind',
        'This is a locked scribe hand-over file. Open it from Radio Log > Hand over to another scribe.',
        'encrypted hand-over', PLACES.handover)
    }
    if (kind === 'attachments') {
      if (expected === 'backup') return OK('encrypted-attachments')
      return make('encrypted-attachments', 'wrong-kind',
        'This is a locked attachments file that goes with a mission backup. Open it in Mission > Data safety > Restore, together with the backup.',
        'encrypted attachments file', PLACES.restore)
    }
    if (expected === 'backup') return OK('encrypted-backup')
    return make('encrypted-backup', 'wrong-kind',
      expected === 'report-packet'
        ? 'This is a locked mission backup. Restoring it replaces everything; to add someone\'s entries, ask them for a Report Packet.'
        : 'This file is locked with a passphrase, and it is not a Setup file. A mission backup is restored from Mission > Data safety > Restore; a scribe hand-over is opened from Radio Log > Hand over to another scribe.',
      'encrypted backup', PLACES.restore)
  }

  const backupLike = 'radioLog' in o || 'rangers' in o
  const packetLike = 'entries' in o && ('notice' in o || 'operator' in o || 'opPeriod' in o || 'mission' in o)

  if (backupLike) {
    if (expected !== 'backup') return wrongKindMessage('backup', expected)
    if (typeof o['schemaVersion'] === 'number' && o['schemaVersion'] > known.backup) {
      return make('backup', 'newer-version',
        'Made by a newer RangerTrak. Update this device first.',
        `backup schemaVersion ${o['schemaVersion']} > ${known.backup}`)
    }
    const problem = describeBackupProblem(o)
    if (problem) return damaged('backup', problem, `backup structure: ${problem}`)
    return OK('backup')
  }

  if (packetLike || (expected === 'report-packet' && 'entries' in o)) {
    if (expected !== 'report-packet') return wrongKindMessage('report-packet', expected)
    if (typeof o['schemaVersion'] === 'number' && o['schemaVersion'] > known.reportPacket) {
      return make('report-packet', 'newer-version',
        'Made by a newer RangerTrak. Update this device first.',
        `packet schemaVersion ${o['schemaVersion']} > ${known.reportPacket}`)
    }
    const problem = describePacketProblem(o)
    if (problem) return damaged('report-packet', problem, `packet structure: ${problem}`)
    return OK('report-packet')
  }

  return NOT_RANGERTRAK('JSON object with no RangerTrak markers')
}
