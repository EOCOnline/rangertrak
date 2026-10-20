import { entriesSince } from './import-safety'

/**
 * Restore preview (E-198 phase 1, ADR D-57): the pure comparison between what is on the device
 * and what is in a backup file, shown before anything is replaced. No injection or IO.
 */

/** What one side (the device, or the file) holds, reduced to what the preview shows. */
export type RestoreSide = {
  mission: string
  /** The file's `exportedAt`; '' for the device (it is not a backup). */
  exportedAt: string
  /** The file's `appVersion`; '' for the device. */
  appVersion: string
  entries: readonly { uid?: string, date?: unknown }[]
  rangers: number
  places: number
  /** After-action notes (kind `aar`). ICS-214 lines are counted apart, below (E-04 / D-63). */
  aarNotes: number
  /** ICS-214 activity lines (kind `activity`). */
  activityLines: number
  /** Ranger photos. null = the side does not say (an older backup has no `photos`; the device's stay). */
  photos: number | null
}

export type RestoreRow = { label: string, device: string, file: string }

export type RestorePreview = {
  rows: RestoreRow[]
  /** Entries on this device whose uid is not in the file: what Restore replaces and loses. */
  notInFile: number
  /** "N entries on this device are not in the file and will be replaced." */
  notInFileLine: string
  /** Set when the file was made by a newer RangerTrak than this one: a warning, never a block. */
  newerVersionWarning: string
}

/** "0.99.56-alpha" -> [0, 99, 56]. Anything unreadable gives null. */
export function parseVersion(version: string): number[] | null {
  const m = /^v?(\d+)\.(\d+)\.(\d+)/.exec((version ?? '').trim())
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null
}

/**
 * True when `candidate` is a later release than `current`. Compares major, minor and patch only:
 * the pre-release tag (`-alpha`) is not ordered, because every release in this series carries one.
 */
export function isNewerVersion(candidate: string, current: string): boolean {
  const a = parseVersion(candidate)
  const b = parseVersion(current)
  if (!a || !b) return false
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] > b[i]
  }
  return false
}

function timeOf(value: unknown): number {
  if (value instanceof Date) return value.getTime()
  if (typeof value === 'string' || typeof value === 'number') return Date.parse(String(value)) || (typeof value === 'number' ? value : NaN)
  return NaN
}

/** The newest entry's time as epoch ms, or null when there are no readable times. */
export function newestEntryTime(entries: readonly { date?: unknown }[]): number | null {
  let newest: number | null = null
  for (const e of entries) {
    const t = timeOf(e.date)
    if (Number.isFinite(t) && (newest === null || t > newest)) newest = t
  }
  return newest
}

function pad(n: number): string { return String(n).padStart(2, '0') }

/** "2026-10-17 14:02" in the viewer's local time; '' for no time. */
export function formatLocalMinute(ms: number | null): string {
  if (ms === null || !Number.isFinite(ms)) return ''
  const d = new Date(ms)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`
}

/**
 * The two columns of the Restore preview. `thisAppVersion` is the running app's version, for the
 * "made by a newer RangerTrak" warning.
 */
export function compareForRestore(device: RestoreSide, file: RestoreSide, thisAppVersion: string): RestorePreview {
  const lost = entriesSince(file.entries, device.entries)
  const notInFile = lost.length

  const fileIsNewer = isNewerVersion(file.appVersion, thisAppVersion)
  const rows: RestoreRow[] = [
    { label: 'Mission', device: device.mission || '(unnamed)', file: file.mission || '(unnamed)' },
    { label: 'Backed up', device: 'not a backup', file: file.exportedAt ? formatLocalMinute(Date.parse(file.exportedAt)) || file.exportedAt : 'unknown' },
    { label: 'Made by RangerTrak', device: thisAppVersion, file: fileIsNewer ? `made by a newer RangerTrak (${file.appVersion})` : (file.appVersion || 'unknown') },
    { label: 'Radio log entries', device: String(device.entries.length), file: String(file.entries.length) },
    { label: 'Newest entry', device: formatLocalMinute(newestEntryTime(device.entries)) || 'none', file: formatLocalMinute(newestEntryTime(file.entries)) || 'none' },
    { label: 'Rangers (roster)', device: String(device.rangers), file: String(file.rangers) },
    { label: 'Places', device: String(device.places), file: String(file.places) },
    { label: 'After action notes', device: String(device.aarNotes), file: String(file.aarNotes) },
    { label: 'ICS-214 log lines', device: String(device.activityLines), file: String(file.activityLines) },
    {
      label: 'Ranger photos',
      device: device.photos === null ? '?' : String(device.photos),
      file: file.photos === null ? 'not in this file (photos here stay)' : String(file.photos),
    },
  ]

  const notInFileLine = notInFile === 0
    ? 'Every entry on this device is also in the file.'
    : `${plural(notInFile, 'entry', 'entries')} on this device ${notInFile === 1 ? 'is' : 'are'} not in the file and will be replaced.`

  const newerVersionWarning = fileIsNewer
    ? `This file was made by a newer RangerTrak (${file.appVersion}). It will probably restore fine, but update this device when you can.`
    : ''

  return { rows, notInFile, notInFileLine, newerVersionWarning }
}
