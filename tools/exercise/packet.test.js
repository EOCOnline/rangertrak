// SPDX-License-Identifier: AGPL-3.0-or-later
import test from 'node:test'
import assert from 'node:assert/strict'
import { loadPackage } from './lib/package.js'
import { buildScript } from './lib/settings.js'
import { buildCatchUp, makePacket, exerciseUid, statusFor, NOTE_PREFIX, REPORT_PACKET_SCHEMA_VERSION, packetFilename } from './lib/packet.js'
import { generateStress, stressPackets } from './lib/stress.js'
import { parseStamp } from './lib/time.js'
import { row, makeTexts } from './test-helpers.js'

const NOW = Date.UTC(2026, 9, 18, 15, 0)   // an arbitrary real instant

const pkg = () => {
  const p = loadPackage(makeTexts([
    row({ id: 'R1', scenario_time: '2030-01-01T08:00', message: 'first, with comma' }),
    row({ id: 'R2', scenario_time: '2030-01-01T09:00', message: 'second', channel: 'Phone', place_id: '' }),
    row({ id: 'R3', scenario_time: '2030-01-01T10:00', message: 'an inject', delivery: 'inject' }),
    row({ id: 'R4', scenario_time: '2030-01-01T11:00', message: 'later', op_period: '1' }),
  ], { scenario: { opPeriods: [{ n: 0, start: '2030-01-01T08:00' }, { n: 1, start: '2030-01-01T11:00' }] } }))
  assert.deepEqual(p.errors, [])
  return p
}

test('catch-up: background rows up to T only, rebased so T equals now', () => {
  const p = pkg()
  const script = buildScript(p, {}).rows
  const T = parseStamp('2030-01-01T10:30')
  const r = buildCatchUp({ pkg: p, script, toMin: T, nowMs: NOW })
  assert.equal(r.count, 2, 'R1 and R2; the inject and the later row are not written')
  const dates = r.packet.entries.map(e => new Date(e.date).getTime())
  assert.equal(dates[0], NOW - 150 * 60000)       // 08:00 is 2h30 before 10:30
  assert.equal(dates[1], NOW - 90 * 60000)
  assert.ok(dates.every(d => d < NOW))
})

test('catch-up: a second file starts where the first stopped', () => {
  const p = pkg()
  const script = buildScript(p, {}).rows
  const a = buildCatchUp({ pkg: p, script, toMin: parseStamp('2030-01-01T09:30'), nowMs: NOW })
  const b = buildCatchUp({ pkg: p, script, fromMin: parseStamp('2030-01-01T09:30'), toMin: parseStamp('2030-01-01T11:30'), nowMs: NOW + 1000 })
  assert.equal(a.count, 2); assert.equal(b.count, 1)
  assert.equal(b.packet.opPeriod, '1')
})

test('catch-up: scenarioClock says where the scenario stood when the file was made', () => {
  const p = pkg()
  const T = parseStamp('2030-01-01T10:30')
  const r = buildCatchUp({ pkg: p, script: buildScript(p, {}).rows, toMin: T, nowMs: NOW })
  assert.deepEqual(r.packet.scenarioClock, { realAt: new Date(NOW).toISOString(), scenarioAt: '2030-01-01T10:30:00.000Z' })
  // Same offset the entries were rebased with: the 08:00 row is 150 real minutes before realAt.
  const offset = Date.parse(r.packet.scenarioClock.scenarioAt) - Date.parse(r.packet.scenarioClock.realAt)
  assert.equal(Date.parse('2030-01-01T08:00:00Z') - offset, new Date(r.packet.entries[0].date).getTime())
  assert.equal(makePacket({ entries: [], title: 't', opPeriod: '', nowMs: NOW }).scenarioClock, undefined, 'optional')
})

test('catch-up: the Report Packet shape the app reads', () => {
  const p = pkg()
  const r = buildCatchUp({ pkg: p, script: buildScript(p, {}).rows, toMin: parseStamp('2030-01-01T10:30'), nowMs: NOW })
  const k = r.packet
  assert.equal(k.schemaVersion, REPORT_PACKET_SCHEMA_VERSION)
  assert.deepEqual(Object.keys(k).sort(), ['appVersion', 'entries', 'event', 'exportedAt', 'mission', 'notice', 'operator', 'opPeriod', 'scenarioClock', 'schemaVersion'].sort())
  assert.match(k.mission, /EXERCISE/); assert.match(k.notice, /EXERCISE/); assert.match(r.filename, /EXERCISE/)
  assert.match(r.filename, /^rangertrak-report-packet-.*\.txt$/)
  assert.deepEqual(JSON.parse(r.text), k)
  for (const e of k.entries) {
    assert.equal(typeof e.id, 'number'); assert.equal(typeof e.callsign, 'string'); assert.equal(typeof e.status, 'string')
    assert.ok(e.uid && typeof e.uid === 'string')
    assert.ok(e.notes.startsWith(NOTE_PREFIX), 'EXERCISE in each entry note')
    assert.ok(Number.isFinite(new Date(e.date).getTime()))
    assert.ok(Math.abs(e.location.lat) <= 90 && Math.abs(e.location.lng) <= 180)
    assert.equal(e.location.derivedFromAddress, false)
  }
  assert.deepEqual(k.entries.map(e => e.id), [1, 2])
  assert.equal(k.entries[0].location.address, 'Place 1')
  assert.equal(k.entries[1].source, 'Phone')
  assert.match(k.entries[1].location.address, /no place given/)
  assert.equal(k.entries[0].notes, '[EXERCISE] first, with comma')
})

test('catch-up: uids are stable for the same row and run, and differ across runs', () => {
  assert.equal(exerciseUid('s', 'R1'), exerciseUid('s', 'R1'))
  assert.notEqual(exerciseUid('s', 'R1'), exerciseUid('s', 'R2'))
  assert.notEqual(exerciseUid('s', 'R1', 'a'), exerciseUid('s', 'R1', 'b'))
  assert.match(exerciseUid('s', 'R1'), /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/)
})

test('catch-up: statuses are names the app knows', () => {
  const known = ['Normal', 'Location Report', 'Evidence Report', 'Need Rest/Food', 'Incident Check-in', 'Incident Check-out', 'Urgent']
  for (const r of [{ kind: 'casualty' }, { kind: 'hazard' }, { kind: 'find', message: 'needs hoist' }, { kind: 'resource', message: 'checking in' }, { kind: 'status', message: 'pulling out' }, { kind: 'traffic', message: 'x' }]) {
    assert.ok(known.includes(statusFor({ message: '', ...r })), JSON.stringify(r))
  }
})

test('filename carries EXERCISE and is filesystem safe', () => {
  const f = packetFilename('Montecito debris flows (Jan 8-9, 2018)', '2026-10-18T15:00:00.000Z', 'catch-up-to-OP1')
  assert.match(f, /^rangertrak-report-packet-EXERCISE-Montecito_debris_flows_Jan_8-9_2018_-catch-up-to-OP1-2026-10-18\.txt$/)
})

test('stress: count, spread, order, determinism, split', () => {
  const entries = generateStress({ rate: 2000, hours: 3, endMs: NOW, seed: 7 })
  assert.equal(entries.length, 6000)
  const times = entries.map(e => new Date(e.date).getTime())
  assert.ok(times.every((t, i) => i === 0 || t >= times[i - 1]), 'in order')
  assert.ok(times[0] >= NOW - 3 * 3600000 && times.at(-1) <= NOW)
  assert.equal(new Set(entries.map(e => e.uid)).size, 6000, 'uids unique')
  assert.deepEqual(entries, generateStress({ rate: 2000, hours: 3, endMs: NOW, seed: 7 }))
  assert.notDeepEqual(entries[0].notes, generateStress({ rate: 2000, hours: 3, endMs: NOW, seed: 8 })[0].notes + 'x')
  assert.ok(entries.every(e => e.notes.startsWith(NOTE_PREFIX)))

  const one = stressPackets({ rate: 100, hours: 2, nowMs: NOW })
  assert.equal(one.length, 1); assert.equal(one[0].count, 200)
  const split = stressPackets({ rate: 100, hours: 2, nowMs: NOW, splitMinutes: 30 })
  assert.equal(split.length, 4)
  assert.equal(split.reduce((a, s) => a + s.count, 0), 200)
  assert.equal(new Set(split.map(s => s.filename)).size, 4, 'file names differ')
  assert.deepEqual(split[1].packet.entries.map(e => e.id).slice(0, 3), [1, 2, 3])
  assert.match(split[0].filename, /EXERCISE/)
  assert.throws(() => generateStress({ rate: 0, hours: 1, endMs: NOW }), /above zero/)
})

test('stress: can draw on a scenario\'s teams and places', () => {
  const p = pkg()
  const [one] = stressPackets({ rate: 60, hours: 1, nowMs: NOW, scenarioPkg: p })
  assert.ok(one.packet.entries.every(e => ['A', 'B'].includes(e.tacticalCall)))
  assert.ok(one.packet.entries.every(e => e.location.address === 'Place 1'))
})
