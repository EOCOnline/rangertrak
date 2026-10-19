// SPDX-License-Identifier: AGPL-3.0-or-later
// RangerTrak exercise console (E-196 phase 0). Free software under the GNU AGPL v3 or later.
import { entryFromRow, centroid, makePacket, packetFilename } from './packet.js'

/** Small deterministic PRNG (mulberry32): the same seed always gives the same traffic. */
export function rng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6D2B79F5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Fernhollow-style made-up teams and places, for stress runs with no scenario. Nothing real. */
export const BUILT_IN = Object.freeze({
  title: 'Stress test (made-up)',
  teams: ['Alpha 1', 'Alpha 2', 'Bravo 1', 'Bravo 2', 'Charlie 1', 'Charlie 2', 'Delta 1', 'Echo 1', 'Medic 1', 'Roads 1', 'Net Control', 'Command'].map(t => ({ tactical_call: t })),
  places: Array.from({ length: 16 }, (_, i) => ({
    id: `S${String(i + 1).padStart(2, '0')}`, label: `Fernhollow site ${i + 1}`, type: 'site',
    lat: 47.40 + (i % 4) * 0.01, lon: -122.50 + Math.floor(i / 4) * 0.01,
  })),
})

const TEMPLATES = [
  ['status', '{from} on scene at {place}, all personnel accounted for, continuing assignment.'],
  ['status', '{from} to {to}, moving to {place}, ETA ten minutes.'],
  ['resource', '{from} at {place}, four personnel, one vehicle, available for assignment.'],
  ['resource', '{from} checking in at {place}, requesting tasking.'],
  ['traffic', '{from} to {to}, road clear at {place}, no obstruction, resuming patrol.'],
  ['traffic', '{from} to {to}, relaying a message for {to}: confirm supply count at {place}.'],
  ['hazard', '{from} reports standing water across the access to {place}, passable with care.'],
  ['hazard', '{from} reports a downed branch at {place}, one lane open.'],
  ['find', '{from} at {place}, located one vehicle, empty, locked. Marking and moving on.'],
  ['status', '{from} requests a rest rotation at {place}, crew fatigue after two hours.'],
]

/**
 * N entries an hour for M hours (E-196 stress injector). Pure and seeded. Entry times run from
 * `endMs - hours` to `endMs`, evenly spread with a little jitter and always in order, and every
 * entry carries the [EXERCISE] note prefix like the catch-up file.
 *
 * Returns the entries (ids 1..n) and the per-entry source rows used.
 */
export function generateStress({ rate, hours, endMs, seed = 1, teams = BUILT_IN.teams, places = BUILT_IN.places, runId = 'stress' }) {
  if (!(rate > 0) || !(hours > 0)) throw new Error('rate and hours must both be above zero.')
  const total = Math.round(rate * hours)
  const rand = rng(seed)
  const calls = teams.map(t => t.tactical_call)
  const placeById = new Map(places.map(p => [p.id, p]))
  const fallback = centroid(places)
  const spanMs = hours * 3600000
  const startMs = endMs - spanMs
  const step = spanMs / total
  const pick = list => list[Math.floor(rand() * list.length)]

  const entries = []
  for (let i = 0; i < total; i++) {
    const [kind, tpl] = pick(TEMPLATES)
    const from = pick(calls)
    let to = pick(calls)
    if (to === from) to = calls[(calls.indexOf(from) + 1) % calls.length]
    const place = pick(places)
    const message = tpl.replace(/\{from\}/g, from).replace(/\{to\}/g, to).replace(/\{place\}/g, place.label)
    const row = { id: `X${String(i + 1).padStart(6, '0')}`, from, to, channel: 'Tac 1', message, kind, place_id: place.id }
    const dateMs = Math.min(endMs, Math.round(startMs + i * step + rand() * step * 0.5))
    entries.push(entryFromRow(row, { n: i + 1, dateMs, placeById, fallback, scenarioId: 'stress', runId }))
  }
  return entries
}

/**
 * The stress run as one or more Report Packets. `splitMinutes` of 0 makes one file; otherwise
 * one file per interval of that many minutes, in time order. Each file's entry ids restart at 1,
 * as a real device's would; the uids stay unique across the whole run.
 */
export function stressPackets({ rate, hours, nowMs, seed = 1, splitMinutes = 0, scenarioPkg = null, title }) {
  const teams = scenarioPkg?.teams?.length ? scenarioPkg.teams : BUILT_IN.teams
  const places = scenarioPkg?.places?.length ? scenarioPkg.places : BUILT_IN.places
  const label = title || scenarioPkg?.scenario?.title || BUILT_IN.title
  const all = generateStress({ rate, hours, endMs: nowMs, seed, teams, places })
  const groups = []
  if (splitMinutes > 0) {
    const startMs = nowMs - hours * 3600000
    const size = splitMinutes * 60000
    for (const e of all) {
      const k = Math.min(Math.floor((new Date(e.date).getTime() - startMs) / size), Math.ceil((hours * 60) / splitMinutes) - 1)
      ;(groups[k] ||= []).push(e)
    }
  } else groups.push(all)
  return groups.filter(Boolean).map((g, k, arr) => {
    const entries = g.map((e, i) => ({ ...e, id: i + 1 }))
    const packet = makePacket({ entries, title: `${label} stress`, opPeriod: '', nowMs })
    const part = arr.length > 1 ? `stress-part${String(k + 1).padStart(2, '0')}of${String(arr.length).padStart(2, '0')}` : 'stress'
    return { packet, filename: packetFilename(`${label}`, packet.exportedAt, part), text: JSON.stringify(packet), count: entries.length }
  })
}
