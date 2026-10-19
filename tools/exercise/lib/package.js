// SPDX-License-Identifier: AGPL-3.0-or-later
// RangerTrak exercise console (E-196 phase 0). Free software under the GNU AGPL v3 or later.
import { parseCsv } from './csv.js'
import { parseStamp } from './time.js'

/** The columns msel.csv must carry, in this order (PACKAGE.md). */
export const MSEL_COLUMNS = [
  'id', 'scenario_time', 'op_period', 'from', 'to', 'channel', 'message', 'place_id', 'kind', 'delivery',
  'decision_point', 'what_really_happened', 'source_ref', 'casualty_recorded', 'casualty_softened', 'test',
  'teaching_note', 'photo', 'license',
]
export const PLACE_COLUMNS = ['id', 'label', 'type', 'lat', 'lon']
export const TEAM_COLUMNS = ['id', 'tactical_call']

export const KINDS = ['status', 'resource', 'traffic', 'hazard', 'find', 'casualty', 'media', 'test']
export const DELIVERIES = ['background', 'inject']
/** Planted traps (E-196 5b). An empty `test` is the normal case. */
export const TESTS = ['pii', 'wrong-grid', 'unverified-rumor', 'duplicate-report', 'media-call', 'self-deploy']

const BLANK = v => v == null || String(v).trim() === ''

/**
 * Reads and checks a scenario package from its texts. Pure: the caller (the browser, or a test)
 * does the file reading and passes { scenario, msel, places, teams } as strings.
 *
 * Returns { ok, errors, warnings, scenario, msel, places, teams, opPeriods }. Errors are plain
 * sentences that name the row id ("M0146: ...") so an instructor can find the line; a package
 * with any error is not playable (`ok` false), but everything that could be read is still
 * returned so the console can show the instructor what is wrong. Scenario content is never
 * repaired here.
 */
export function loadPackage({ scenario: scenarioText, msel: mselText, places: placesText, teams: teamsText }) {
  const errors = []
  const warnings = []

  // scenario.json
  let scenario = {}
  try {
    scenario = JSON.parse(scenarioText ?? '')
    if (!scenario || typeof scenario !== 'object' || Array.isArray(scenario)) throw new Error('not an object')
  } catch (e) {
    errors.push(`scenario.json: cannot be read (${e.message}).`)
    scenario = {}
  }

  // the three tables
  const table = (name, text, required) => {
    if (BLANK(text)) { errors.push(`${name}: file is missing or empty.`); return [] }
    const t = parseCsv(text)
    t.errors.forEach(e => errors.push(`${name}: ${e}`))
    const missing = required.filter(c => !t.header.includes(c))
    if (missing.length) { errors.push(`${name}: missing column${missing.length > 1 ? 's' : ''} ${missing.join(', ')}.`); return [] }
    return t.rows
  }
  const places = table('places.csv', placesText, PLACE_COLUMNS)
  const teams = table('teams.csv', teamsText, TEAM_COLUMNS)
  const rawMsel = table('msel.csv', mselText, MSEL_COLUMNS)

  const placeIds = new Set()
  for (const p of places) {
    if (BLANK(p.id)) errors.push(`places.csv line ${p._line}: a place has no id.`)
    else if (placeIds.has(p.id)) errors.push(`places.csv: place id ${p.id} is used twice.`)
    placeIds.add(p.id)
    p.lat = Number(p.lat); p.lon = Number(p.lon)
    if (!Number.isFinite(p.lat) || !Number.isFinite(p.lon) || Math.abs(p.lat) > 90 || Math.abs(p.lon) > 180) {
      errors.push(`places.csv ${p.id}: latitude or longitude is not a usable number.`)
    }
  }
  const teamCalls = new Set(teams.map(t => t.tactical_call))

  // msel rows
  const seen = new Set()
  const msel = []
  for (const r of rawMsel) {
    const id = r.id.trim()
    const at = BLANK(id) ? `msel.csv line ${r._line}` : id
    if (BLANK(id)) errors.push(`${at}: a row has no id.`)
    else if (seen.has(id)) errors.push(`${at}: id is used twice.`)
    seen.add(id)

    const t = parseStamp(r.scenario_time)
    if (Number.isNaN(t)) errors.push(`${at}: scenario_time "${r.scenario_time}" is not YYYY-MM-DDTHH:MM.`)
    const op = Number(r.op_period)
    if (BLANK(r.op_period) || !Number.isInteger(op) || op < 0) errors.push(`${at}: op_period "${r.op_period}" is not a whole number.`)
    if (!KINDS.includes(r.kind)) errors.push(`${at}: unknown kind "${r.kind}" (known: ${KINDS.join(', ')}).`)
    if (!DELIVERIES.includes(r.delivery)) errors.push(`${at}: unknown delivery "${r.delivery}" (known: ${DELIVERIES.join(', ')}).`)
    if (!BLANK(r.test) && !TESTS.includes(r.test)) errors.push(`${at}: unknown test "${r.test}" (known: ${TESTS.join(', ')}).`)
    if (!BLANK(r.place_id) && !placeIds.has(r.place_id)) errors.push(`${at}: place_id ${r.place_id} is not in places.csv.`)
    if (BLANK(r.message)) errors.push(`${at}: message is empty.`)
    if (r.kind === 'casualty' && (BLANK(r.casualty_recorded) || BLANK(r.casualty_softened))) {
      errors.push(`${at}: a casualty row needs both casualty_recorded and casualty_softened.`)
    }
    if (r.kind === 'test' && BLANK(r.test)) warnings.push(`${at}: kind is test but the test column is empty.`)
    if (!BLANK(r.test) && r.kind !== 'test' && r.kind !== 'media') warnings.push(`${at}: has a test flag but kind is ${r.kind}.`)
    if (r.kind === 'media' && BLANK(r.source_ref) && BLANK(r.photo)) warnings.push(`${at}: a media row with no source_ref or photo to show.`)
    msel.push({ ...r, id, t, op })
  }

  // Times in order inside each op period (the file order is the script order).
  const lastByOp = new Map()
  for (const r of msel) {
    if (Number.isNaN(r.t) || Number.isNaN(r.op)) continue
    const prev = lastByOp.get(r.op)
    if (prev && r.t < prev.t) errors.push(`${r.id}: time ${r.scenario_time} is earlier than ${prev.id} (${prev.scenario_time}) before it in OP ${r.op}.`)
    else lastByOp.set(r.op, r)
  }

  // Warn only: names in from/to that are not teams (the room display, "All units", walk-ups).
  const unknownParties = new Set()
  for (const r of msel) for (const who of [r.from, r.to]) if (!BLANK(who) && !teamCalls.has(who)) unknownParties.add(who)
  if (unknownParties.size) warnings.push(`from/to names that are not in teams.csv: ${[...unknownParties].join(', ')}.`)

  // scenario.json content
  for (const key of ['title', 'about', 'modeledOn']) {
    if (BLANK(scenario[key])) errors.push(`scenario.json: "${key}" is required.`)
  }
  const hasCasualty = msel.some(r => r.kind === 'casualty')
  if (hasCasualty && BLANK(scenario.contentNote)) {
    errors.push('scenario.json: "contentNote" is required because the package includes casualty rows.')
  }
  if (!Array.isArray(scenario.sources)) warnings.push('scenario.json: "sources" is not a list.')
  if (Number.isNaN(parseStamp(scenario.startTime))) errors.push('scenario.json: "startTime" must be YYYY-MM-DDTHH:MM.')

  const opPeriods = deriveOpPeriods(scenario, msel, errors)

  return { ok: errors.length === 0, errors, warnings, scenario, msel, places, teams, opPeriods, hasCasualty }
}

/** [{ n, label, startMin }] sorted by n. A listed start wins; otherwise the first row's time. */
export function deriveOpPeriods(scenario, msel, errors = []) {
  const listed = new Map()
  for (const o of Array.isArray(scenario?.opPeriods) ? scenario.opPeriods : []) {
    const start = parseStamp(o.start)
    if (!Number.isInteger(o.n) || Number.isNaN(start)) {
      errors.push(`scenario.json: op period ${JSON.stringify(o.n)} needs a whole number "n" and a "start" as YYYY-MM-DDTHH:MM.`)
      continue
    }
    listed.set(o.n, { n: o.n, label: o.label || `OP ${o.n}`, startMin: start })
  }
  const first = new Map()
  for (const r of msel) {
    if (!Number.isFinite(r.t) || !Number.isInteger(r.op)) continue
    if (!first.has(r.op) || r.t < first.get(r.op)) first.set(r.op, r.t)
  }
  for (const [n, t] of first) if (!listed.has(n)) listed.set(n, { n, label: `OP ${n}`, startMin: t })
  return [...listed.values()].sort((a, b) => a.n - b.n)
}

/** The op period a scenario time falls in: the last one that has started by then. */
export function opPeriodAt(opPeriods, minutes) {
  let hit = opPeriods[0]
  for (const o of opPeriods) if (o.startMin <= minutes) hit = o
  return hit
}

/** Reads the package files from a folder on disk (Node only; the browser reads its own picker). */
export async function readPackageFolder(dir) {
  const fs = await import('node:fs/promises')
  const path = await import('node:path')
  const read = name => fs.readFile(path.join(dir, name), 'utf8').catch(() => null)
  const [scenario, msel, places, teams] = await Promise.all(['scenario.json', 'msel.csv', 'places.csv', 'teams.csv'].map(read))
  return { scenario, msel, places, teams }
}
