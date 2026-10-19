/**
 * Builds the "Montecito" sample scenario (E-195) from the scenario tables kept outside the repo
 * (rangertrak-InternalDocs\E-195 Montecito\: msel.csv, places.csv, teams.csv) and writes it as
 * one TypeScript data module the app loads lazily:
 *
 *   node tools/regional/demo/make-montecito-demo.js [inputFolder] [outFile]
 *
 *   inputFolder  default: ..\rangertrak-InternalDocs\E-195 Montecito (a sibling of this repo's
 *                folder), or $MONTECITO_DIR
 *   outFile      default: src/app/shared/services/sample-data-montecito.ts
 *
 * Node built-ins only. Nothing real goes in: every person is invented (seeded, so the output is
 * the same every run), phones are 555-01xx, calls are in the WZ0/KZ0 blocks, credentials use a
 * "DM-" prefix, and the app's own AI demo faces are reused - the same conventions as the
 * Fernhollow region (make-demo-region.js).
 *
 * What goes in, and what does not:
 *   - LOAD POINT. The default load point is day 3 (E-195 section 7.3). The tables so far cover
 *     only OP 0-2 (the evening before, the night of the flows, day 1), so everything through the
 *     end of OP 2 is loaded. When OP 3+ exist in msel.csv they flow in here with no change, and
 *     the load point becomes day 3 as intended.
 *   - CASUALTIES are the SOFTENED wording only (`casualty_softened`). The "as recorded"
 *     column (`casualty_recorded`) is never read. The public in-app demo carries no fatality
 *     text (John, 2026-10-18: "kids might be training"). As a second net, the generator throws
 *     if any output text matches FATALITY_WORDS.
 *   - Rows of kind `media` and `test` are left out (console / instructor only).
 *   - Times: every row becomes `ago` = minutes before the moment of loading, keeping the
 *     scenario's own spacing, so the demo is past-dated like the other samples (E-168).
 *
 * The tables are not committed with this script (and tools/regional/ may hold scripts only -
 * check-regional-tools.js); the generated module is, like the other samples' data.
 */
const fs = require('fs')
const path = require('path')

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..')
const DEFAULT_IN = process.env.MONTECITO_DIR
  || path.resolve(REPO_ROOT, '..', 'rangertrak-InternalDocs', 'E-195 Montecito')
const DEFAULT_OUT = path.join(REPO_ROOT, 'src', 'app', 'shared', 'services', 'sample-data-montecito.ts')

/** Words that must never reach the app. Checked on everything written. */
const FATALITY_WORDS = /deceased|coroner|fatalit|\bdead\b|\bdied\b|\bkilled\b/i

/** Rows of these kinds are console-only and are not shipped. */
const LEFT_OUT_KINDS = new Set(['media', 'test'])

/** The newest entry sits this many minutes in the past when the demo loads. */
const NEWEST_MINUTES_AGO = 20

/** At most this many made-up members per team (keeps the roster near 100 rows). */
const MEMBERS_PER_TEAM_CAP = 4

const STATUS = { normal: 0, location: 1, evidence: 2, rest: 3, checkIn: 4, checkOut: 5, urgent: 6 }

const FIRST = ['Alder', 'Briar', 'Cedar', 'Dune', 'Ember', 'Fable', 'Garnet', 'Hollis', 'Indigo', 'Juniper',
  'Kestrel', 'Linden', 'Marlow', 'Nimbus', 'Oriel', 'Pip', 'Quill', 'Rowan', 'Sorrel', 'Tamsin', 'Umber',
  'Vesper', 'Wren', 'Yarrow', 'Zephyr', 'Basil', 'Clover', 'Dell', 'Elm', 'Fern', 'Gale', 'Heron', 'Iris',
  'Jasper', 'Kit', 'Lark', 'Moss', 'Nettle', 'Olive', 'Pebble']
const LAST = ['Thistlewick', 'Brambleford', 'Cloudhaven', 'Dewbright', 'Emberly', 'Fogbury', 'Gladewick',
  'Hollowmere', 'Inkwell', 'Jollyoak', 'Kettlebrook', 'Larkspur', 'Mistral', 'Nutmeg', 'Oakenshaw',
  'Puddlefoot', 'Quickwater', 'Reedmarsh', 'Stonebridge', 'Tumbleweed', 'Underhill', 'Velvetleaf',
  'Willowby', 'Yewbank', 'Zinnia', 'Ashgrove', 'Barleycorn', 'Copperfield', 'Driftwood', 'Elderbrook',
  'Fernsby', 'Goldfinch', 'Hazelwood', 'Ivybridge', 'Juniperfield', 'Kingfisher', 'Lanternside',
  'Mossgate', 'Nightingale', 'Plumtree']
// The app's own AI demo faces (src/assets/imgs/rangers/), cycled.
const FACES = ['cert1.jpg', 'cert2.jpg', 'cert3.jpg', 'ic-actual.jpg', 'log-chief.jpg', 'medic1.jpg',
  'mert1.jpg', 'ops-chief.jpg', 'pio.jpg', 'plan-chief.jpg', 'recon1.jpg']

/** Small deterministic PRNG (mulberry32): the same seed always gives the same roster. */
function rng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6D2B79F5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Minimal RFC 4180 reader: quoted cells, doubled quotes, CRLF or LF. Returns objects by header.
 * A row with extra cells is an unquoted comma inside `mergeExtraInto` (places.csv has one in a
 * label); the extras are put back into that column. Any other width mismatch is an error.
 */
function parseCsv(text, mergeExtraInto) {
  const src = text.replace(/^﻿/, '')
  const rows = []
  let row = [], cell = '', quoted = false
  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    if (quoted) {
      if (c === '"') {
        if (src[i + 1] === '"') { cell += '"'; i++ } else quoted = false
      } else cell += c
    } else if (c === '"') quoted = true
    else if (c === ',') { row.push(cell); cell = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++
      row.push(cell); cell = ''
      rows.push(row); row = []
    } else cell += c
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row) }
  const nonEmpty = rows.filter(r => r.some(x => x !== ''))
  const head = nonEmpty.shift()
  return nonEmpty.map((r, n) => {
    const extra = r.length - head.length
    if (extra > 0 && mergeExtraInto && head.includes(mergeExtraInto)) {
      const at = head.indexOf(mergeExtraInto)
      r = [...r.slice(0, at), r.slice(at, at + extra + 1).join(','), ...r.slice(at + extra + 1)]
    }
    if (r.length !== head.length) throw new Error(`CSV row ${n + 2} has ${r.length} cells, expected ${head.length}`)
    return Object.fromEntries(head.map((h, i) => [h, r[i]]))
  })
}

/** 'YYYY-MM-DDTHH:MM' read as a plain wall-clock time (no zone), in minutes since the epoch. */
function minutesOf(stamp) {
  const m = /^(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d)/.exec(stamp)
  if (!m) throw new Error(`Bad scenario_time "${stamp}"`)
  return Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]) / 60000
}

/** The place type -> the Locations category name (the defaults where one fits). */
const LOCATION_TYPE = {
  'command post': 'Command Post', staging: 'Staging Area', 'fire station': 'Fire Station', eoc: 'EOC',
  comms: 'EOC', hospital: 'Ranger First Aid', helispot: 'Helispot', assistance: 'Family Assistance',
  shelter: 'Shelter', 'creek corridor': 'Creek Corridor', hazard: 'Hazard', closure: 'Road Closure',
  incident: 'Hazard', tcp: 'Traffic Control', zone: 'Evacuation Boundary', 'home site marker': 'Home Site',
}

/**
 * Real agencies are named by type in the radio log (E-195 section 3), so the tables' few real
 * names are swapped for generic ones in every text the app shows - messages, tactical calls and
 * roster notes - and REAL_NAMES then fails the run if one is left.
 */
const GENERIC = [
  [/(^|[.!?]\s+)NWS\b/g, '$1The weather service'], [/\bNWS\b/g, 'the weather service'],
  [/(^|[.!?]\s+)USGS\b/g, '$1The federal survey'], [/\bUSGS\b/g, 'the federal survey'],
  [/\bCHP\b/g, 'Highway Patrol'], [/\bCaltrans\b/g, 'State Roads'], [/\bRed Cross\b/g, 'Relief agency'],
  [/\bCoast Guard\b/g, 'Maritime service'], [/\bNavy\b/g, 'Naval air'], [/\bNational Guard\b/g, 'State guard'],
]
const REAL_NAMES = /\b(NWS|USGS|CHP|Caltrans|Red Cross|Coast Guard|Navy|National Guard|FEMA|Cal ?Fire)\b/
const generic = text => GENERIC.reduce((t, [re, to]) => t.replace(re, to), text)

function statusFor(row, message) {
  const text = message.toLowerCase()
  if ((row.kind === 'status' || row.kind === 'resource')
    && /pull(ing)? out|clearing\.|returning to quarters|releas|demobiliz|stand(ing)? down|checking out|back in service/.test(text)) {
    return STATUS.checkOut
  }
  // Crew relief and shift change: the closest of the app's statuses to "Need Rest/Food".
  if (/\b(shift change|rotate|rotation|hours on)\b/.test(text)) return STATUS.rest
  switch (row.kind) {
    case 'casualty': return STATUS.urgent
    case 'hazard': return STATUS.evidence
    case 'find':
      return /request|need|injur|trapp|extract|hoist|medic|critical/.test(text) ? STATUS.urgent : STATUS.evidence
    case 'resource':
      if (/releas|demobiliz|stand(ing)? down|checking out|out of service|returning to quarters/.test(text)) return STATUS.checkOut
      if (/check(ing|ed)? in|on location|arrived|en route|reporting/.test(text)) return STATUS.checkIn
      return STATUS.normal
    case 'status':
      if (/\b(rest|relief|resupply|fatigue|exhaust|need(s)? (food|water))\b/.test(text)) return STATUS.rest
      if (/contacted|need extraction/.test(text)) return STATUS.location
      return STATUS.normal
    case 'traffic':
      return /trapp|roof|cannot walk|oxygen|water rising|injur|collapsed|rescue/.test(text) ? STATUS.urgent : STATUS.normal
    default: return STATUS.normal
  }
}

/**
 * The pure part: three parsed tables in, the scenario object out. Exported so the test can feed
 * it a small made-up fixture and prove what it keeps and drops.
 */
function makeMontecito({ msel, places, teams }) {
  // Real agency names become generic ones first, everywhere, so the rest never sees them.
  const g = o => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, typeof v === 'string' ? generic(v) : v]))
  msel = msel.map(g)
  teams = teams.map(g)
  const rand = rng(195)
  const used = { names: new Set(), calls: new Set() }

  const placeById = new Map(places.map(p => [p.id, p]))
  places.forEach(p => {
    if (!Number.isFinite(Number(p.lat)) || !Number.isFinite(Number(p.lon))) throw new Error(`Place ${p.id} has no usable coordinates`)
  })
  const outPlaces = places.map(p => ({
    id: p.id, label: p.label, type: LOCATION_TYPE[p.type] ?? 'Hazard',
    lat: Number(p.lat), lon: Number(p.lon),
  }))

  // ── Roster: made-up members per team, lead first ──────────────────────────────────────
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const pick = list => list[Math.floor(rand() * list.length)]
  const rangers = []
  const membersByTeam = new Map()
  teams.forEach(team => {
    const count = Math.max(1, Math.min(Number(team.members) || 1, MEMBERS_PER_TEAM_CAP))
    const members = []
    for (let i = 0; i < count; i++) {
      let name
      do { name = `${pick(FIRST)} ${pick(LAST)}` } while (used.names.has(name))
      used.names.add(name)
      let call
      do { call = `${rand() < 0.5 ? 'WZ0' : 'KZ0'}${pick(letters)}${pick(letters)}${pick(letters)}` } while (used.calls.has(call))
      used.calls.add(call)
      const n = rangers.length
      const medical = /ambulance|hospital/.test(team.type)
      const role = i === 0 ? 'Team Lead' : medical ? 'Medical' : 'Responder'
      rangers.push({
        callsign: call, fullName: name,
        phone: `${n < 100 ? 805 : 626}-555-01${String(n % 100).padStart(2, '0')}`,
        image: FACES[n % FACES.length], id: `DM-${String(101 + n).padStart(4, '0')}`,
        team: team.tactical_call, role, note: `${team.type}, ${team.agency_type}`,
      })
      members.push(rangers[n])
    }
    membersByTeam.set(team.tactical_call, members)
  })

  const tacticalCalls = teams.map(t => ({ name: t.tactical_call, callsign: membersByTeam.get(t.tactical_call)[0].callsign }))
  const leadOf = name => membersByTeam.get(name)?.[0]

  // Two scribes keep the log: the first covers OP 0 and 1, the second takes over in OP 2
  // (a scribe hand-over, E-188). Both come from the net-control team.
  const scribePool = membersByTeam.get('Net Control') ?? membersByTeam.get(teams[0].tactical_call)
  const scribes = [scribePool[0].fullName, (scribePool[1] ?? scribePool[0]).fullName]

  // ── Rows ────────────────────────────────────────────────────────────────────────────────
  const kept = msel.filter(r => !LEFT_OUT_KINDS.has(r.kind))
  const text = r => {
    if (r.kind !== 'casualty') return r.message
    // Softened wording only. The recorded column is never read.
    if (!r.casualty_softened) throw new Error(`Casualty row ${r.id} has no casualty_softened text`)
    return r.casualty_softened
  }
  const stamps = kept.map(r => minutesOf(r.scenario_time))
  const newest = Math.max(...stamps)
  const rows = kept
    .map((r, i) => ({ r, t: stamps[i] }))
    .sort((a, b) => a.t - b.t)
    .map(({ r, t }) => {
      const message = text(r)
      const fromTeam = membersByTeam.has(r.from)
      // Walk-up callers and other non-team senders are logged by the station that took them.
      const loggedBy = fromTeam ? r.from : (membersByTeam.has(r.to) ? r.to : teams[0].tactical_call)
      const placeId = r.place_id || (/^(Dispatch|Net Control)$/.test(r.from) ? 'P05' : 'P01')
      if (!placeById.has(placeId)) throw new Error(`Row ${r.id}: place ${placeId} is not in places.csv`)
      const row = {
        id: r.id, call: leadOf(loggedBy).callsign, ago: Math.round(newest - t) + NEWEST_MINUTES_AGO,
        place: placeId, status: statusFor(r, message),
        source: r.channel === 'Phone' ? 'Phone' : 'Voice',
        scribe: r.op_period === '2' ? 1 : 0, notes: message,
      }
      if (fromTeam && membersByTeam.has(r.to) && r.to !== r.from) row.to = r.to
      return row
    })

  const firstOp2 = kept.filter(r => r.op_period === '2').map(r => minutesOf(r.scenario_time))
  const opStart = firstOp2.length ? Math.min(...firstOp2) : Math.min(...stamps)
  const out = {
    event: 'Montecito debris flows (modeled)',
    eventNotes: 'Modeled on the January 9, 2018 debris flows in Montecito, California. The people, teams and '
      + 'messages are invented; the scale, phases and problems follow the public record.',
    center: { place: 'P01' },
    currentOpPeriod: { name: 'Op 2', startAgo: Math.round(newest - opStart) + NEWEST_MINUTES_AGO },
    scribes,
    places: outPlaces,
    tacticalCalls,
    rangers,
    rows,
  }

  const flat = JSON.stringify(out)
  const real = REAL_NAMES.exec(flat)
  if (real) throw new Error(`Generated data names a real agency ("${real[0]}") - agencies go by type`)
  const hit = FATALITY_WORDS.exec(flat)
  if (hit) throw new Error(`Generated data contains "${hit[0]}" - no fatality text may reach the app`)
  return out
}

/** The module text: one row per line so a diff stays readable. */
function render(data) {
  const { rows, rangers, places, tacticalCalls, ...rest } = data
  const line = o => '  ' + JSON.stringify(o)
  const arr = list => '[\n' + list.map(line).join(',\n') + ',\n]'
  return `/* eslint-disable */
// GENERATED by tools/regional/demo/make-montecito-demo.js (E-195) - do not edit by hand.
// Loaded only when the Montecito demo loads (a dynamic import in sample-data.service.ts), so it
// is its own chunk and never part of the initial bundle. Everything here is invented: people,
// teams and messages are made up; softened casualty wording only; no fatality text.
// Load point: the end of OP 2 (the tables cover OP 0-2 so far; this becomes day 3 once later op
// periods exist). \`ago\` is minutes before the moment of loading.

export type MontecitoPlace = { id: string, label: string, type: string, lat: number, lon: number }
export type MontecitoRow = {
  id: string, call: string, ago: number, place: string, status: number,
  source: 'Voice' | 'Phone', scribe: number, notes: string, to?: string,
}
export type MontecitoRanger = {
  callsign: string, fullName: string, phone: string, image: string, id: string,
  team: string, role: string, note: string,
}
export type MontecitoDemo = {
  event: string, eventNotes: string, center: { place: string },
  currentOpPeriod: { name: string, startAgo: number }, scribes: string[],
  places: MontecitoPlace[], tacticalCalls: { name: string, callsign: string }[],
  rangers: MontecitoRanger[], rows: MontecitoRow[],
}

export const MONTECITO_DEMO: MontecitoDemo = {
${Object.entries(rest).map(([k, v]) => `  ${k}: ${JSON.stringify(v)},`).join('\n')}
  places: ${arr(places)},
  tacticalCalls: ${JSON.stringify(tacticalCalls)},
  rangers: ${arr(rangers)},
  rows: ${arr(rows)},
}
`
}

function readTables(dir) {
  const read = (f, merge) => parseCsv(fs.readFileSync(path.join(dir, f), 'utf8'), merge)
  return { msel: read('msel.csv'), places: read('places.csv', 'label'), teams: read('teams.csv') }
}

function main() {
  const [inDir = DEFAULT_IN, outFile = DEFAULT_OUT] = process.argv.slice(2)
  const data = makeMontecito(readTables(inDir))
  fs.writeFileSync(outFile, render(data))
  console.log(`Wrote ${outFile}: ${data.rows.length} log entries, ${data.rangers.length} roster rows, `
    + `${data.tacticalCalls.length} tactical calls, ${data.places.length} places.`)
}

module.exports = { makeMontecito, render, readTables, parseCsv, DEFAULT_IN, DEFAULT_OUT, FATALITY_WORDS }
if (require.main === module) main()
