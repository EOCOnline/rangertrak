// SPDX-License-Identifier: AGPL-3.0-or-later
// RangerTrak exercise console (E-196 phase 0). Free software under the GNU AGPL v3 or later.
import { opPeriodAt } from './package.js'
import { parseStamp } from './time.js'

export const PACES = [1, 2, 5, 10, 60]
export const INTENSITIES = [25, 50, 100]
export const CASUALTY_REALISM = ['recorded', 'softened', 'per-row']

/** What an instructor can change per class (E-196 5a). Everything here is optional. */
export const DEFAULT_SETTINGS = Object.freeze({
  /** Scenario time (YYYY-MM-DDTHH:MM) to start from; '' = the first row. */
  start: '',
  /** Scenario time to stop at; '' = the last row. */
  stop: '',
  /** Scenario seconds per real second. */
  pace: 1,
  /** Percent of BACKGROUND rows kept: 25, 50 or 100. */
  intensity: 100,
  /** Tactical calls the trainees play. Rows FROM these become cue cards, not log traffic. */
  playedTeams: [],
  /** Row ids switched off. */
  rowOff: [],
  /** Added injects: { id, scenario_time, from, to, channel, message, place_id, teaching_note }. */
  localInjects: [],
  /** 'recorded' | 'softened' (the default) | 'per-row' (see casualtyPerRow). */
  casualtyRealism: 'softened',
  /** For 'per-row': { rowId: 'recorded' | 'softened' }; a row not listed stays softened. */
  casualtyPerRow: {},
  /** Show "what really happened" at all. The console still hides it until the instructor clicks. */
  revealReal: false,
})

/** Settings from a package's defaults and the class's changes, with bad values put right. */
export function normalizeSettings(...layers) {
  const s = { ...DEFAULT_SETTINGS }
  for (const layer of layers) if (layer) Object.assign(s, layer)
  if (!PACES.includes(Number(s.pace))) s.pace = 1
  s.pace = Number(s.pace)
  if (!INTENSITIES.includes(Number(s.intensity))) s.intensity = 100
  s.intensity = Number(s.intensity)
  if (!CASUALTY_REALISM.includes(s.casualtyRealism)) s.casualtyRealism = 'softened'
  s.playedTeams = [...(s.playedTeams ?? [])]
  s.rowOff = [...(s.rowOff ?? [])]
  s.localInjects = [...(s.localInjects ?? [])]
  s.casualtyPerRow = { ...(s.casualtyPerRow ?? {}) }
  s.revealReal = s.revealReal === true
  return s
}

/** FNV-1a, 32 bit. Deterministic, no seed, same everywhere. */
export function hashId(id) {
  let h = 0x811c9dc5
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h >>> 0
}

/**
 * Whether thinning keeps a background row. The row's hash picks a bucket 0..99 and the row stays
 * when its bucket is below the intensity, so the same row is kept or dropped every time, the 25%
 * set is inside the 50% set, and the 50% set is inside the 100% set.
 */
export function keptByThinning(id, intensity) {
  return hashId(id) % 100 < intensity
}

/** Rows that thinning must never drop (E-196 section 3 and the brief). */
export function isProtected(row) {
  return row.delivery === 'inject' || !!row.decision_point || !!row.test || row.kind === 'casualty'
    || row.kind === 'test' || row.kind === 'media'
}

/**
 * The effective script: the package's rows with the class's settings applied. Pure. Each row
 * comes back with:
 *   role  'background' (written to the catch-up file), 'inject' (the controller or SimCell
 *         says it; a cue card), 'played' (a played team's own message: a cue card telling the
 *         trainee what to send) or 'media' (room display). Decision points and test rows keep
 *         their flags and are never thinned.
 *   message   the casualty version the settings chose, for casualty rows
 *   real      "what really happened", only when settings.revealReal is on
 * The input rows are not changed.
 */
export function buildScript(pkg, settingsIn) {
  const s = normalizeSettings(pkg.scenario?.defaults, settingsIn)
  const startMin = s.start ? parseStamp(s.start) : -Infinity
  const stopMin = s.stop ? parseStamp(s.stop) : Infinity
  const off = new Set(s.rowOff)
  const played = new Set(s.playedTeams)

  const rows = []
  for (const r of pkg.msel) {
    if (off.has(r.id)) continue
    if (r.t < startMin || r.t > stopMin) continue
    rows.push(decorate(r, s, played))
  }
  for (const li of s.localInjects) {
    const t = parseStamp(li.scenario_time)
    if (Number.isNaN(t) || t < startMin || t > stopMin || off.has(li.id)) continue
    const op = opPeriodAt(pkg.opPeriods, t)?.n ?? 0
    rows.push({
      id: li.id || `L${rows.length + 1}`, scenario_time: li.scenario_time, t, op_period: String(op), op,
      from: li.from || 'Controller', to: li.to || 'All', channel: li.channel || '', message: li.message || '',
      place_id: li.place_id || '', kind: 'status', delivery: 'inject', decision_point: '', what_really_happened: '',
      source_ref: 'local inject', casualty_recorded: '', casualty_softened: '', test: '', teaching_note: li.teaching_note || '',
      photo: '', license: '', role: 'inject', local: true, real: '',
    })
  }

  // Thinning drops only unprotected background rows.
  const kept = rows.filter(r => r.role !== 'background' || isProtected(r) || keptByThinning(r.id, s.intensity))
  kept.sort((a, b) => a.t - b.t || a.id.localeCompare(b.id))
  return { rows: kept, settings: s }
}

function decorate(r, s, played) {
  let message = r.message
  if (r.kind === 'casualty') {
    const mode = s.casualtyRealism === 'per-row' ? (s.casualtyPerRow[r.id] === 'recorded' ? 'recorded' : 'softened') : s.casualtyRealism
    message = (mode === 'recorded' ? r.casualty_recorded : r.casualty_softened) || r.message
  }
  let role
  if (r.kind === 'media') role = 'media'
  else if (played.has(r.from) && r.kind !== 'test') role = 'played'
  else if (r.delivery === 'inject' || r.kind === 'test') role = 'inject'
  else role = 'background'
  // Casualty and test rows are never background: they are the substance of the class.
  if ((r.kind === 'casualty' || r.test) && role === 'background') role = 'inject'
  return { ...r, message, role, real: s.revealReal ? r.what_really_happened : '' }
}

/** The text a cue card shows for the "expected action" line. */
export function expectedAction(row) {
  if (row.role === 'played') return `${row.from} should report to ${row.to}${row.channel ? ' on ' + row.channel : ''}: ${row.message}`
  return row.teaching_note || ''
}

/** Which casualty versions are in play, so the console can prompt for a stress debrief. */
export function fatalitiesOn(pkg, settings) {
  const s = normalizeSettings(pkg.scenario?.defaults, settings)
  if (s.casualtyRealism === 'recorded') return pkg.msel.some(r => r.kind === 'casualty')
  if (s.casualtyRealism === 'per-row') return pkg.msel.some(r => r.kind === 'casualty' && s.casualtyPerRow[r.id] === 'recorded')
  return false
}
