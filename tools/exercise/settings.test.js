// SPDX-License-Identifier: AGPL-3.0-or-later
import test from 'node:test'
import assert from 'node:assert/strict'
import { loadPackage } from './lib/package.js'
import { buildScript, keptByThinning, hashId, normalizeSettings, fatalitiesOn, expectedAction } from './lib/settings.js'
import { row, makeTexts } from './test-helpers.js'

const many = n => Array.from({ length: n }, (_, i) => row({
  id: `B${String(i).padStart(4, '0')}`, scenario_time: `2030-01-01T${String(8 + Math.floor(i / 60)).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}`,
}))

const pkgOf = rows => { const p = loadPackage(makeTexts(rows)); assert.deepEqual(p.errors, []); return p }

test('thinning: deterministic, nested, and roughly the right size', () => {
  const ids = Array.from({ length: 2000 }, (_, i) => `M${i}`)
  const k = pct => ids.filter(id => keptByThinning(id, pct))
  assert.deepEqual(k(50), k(50))
  assert.equal(k(100).length, ids.length)
  const k25 = new Set(k(25)), k50 = new Set(k(50))
  assert.ok([...k25].every(id => k50.has(id)), '25% set is inside the 50% set')
  assert.ok(Math.abs(k50.size / ids.length - 0.5) < 0.05)
  assert.ok(Math.abs(k25.size / ids.length - 0.25) < 0.05)
  assert.equal(hashId('M0001'), hashId('M0001'))
})

test('thinning applies to background rows only; injects, decision points, tests, casualties stay', () => {
  const rows = [
    ...many(300),
    ...Array.from({ length: 60 }, (_, i) => row({ id: `I${i}`, scenario_time: '2030-01-01T14:00', delivery: 'inject' })),
    ...Array.from({ length: 60 }, (_, i) => row({ id: `D${i}`, scenario_time: '2030-01-01T14:01', decision_point: 'Talk.' })),
    ...Array.from({ length: 60 }, (_, i) => row({ id: `T${i}`, scenario_time: '2030-01-01T14:02', kind: 'test', test: 'pii' })),
    ...Array.from({ length: 60 }, (_, i) => row({ id: `C${i}`, scenario_time: '2030-01-01T14:03', kind: 'casualty', casualty_recorded: 'r', casualty_softened: 's' })),
  ]
  const p = pkgOf(rows)
  const { rows: out } = buildScript(p, { intensity: 25 })
  const count = prefix => out.filter(r => r.id.startsWith(prefix)).length
  for (const x of 'IDTC') assert.equal(count(x), 60, `${x} rows all kept`)
  assert.ok(count('B') < 130 && count('B') > 40, `background thinned to about a quarter (${count('B')})`)
  assert.deepEqual(buildScript(p, { intensity: 25 }).rows.map(r => r.id), out.map(r => r.id))
})

test('casualty realism: softened by default, recorded on request, per row', () => {
  const p = pkgOf([
    row({ id: 'C1', kind: 'casualty', delivery: 'inject', message: 'soft one', casualty_recorded: 'rec one', casualty_softened: 'soft one' }),
    row({ id: 'C2', scenario_time: '2030-01-01T08:05', kind: 'casualty', delivery: 'inject', message: 'soft two', casualty_recorded: 'rec two', casualty_softened: 'soft two' }),
  ])
  const msg = (s, id) => buildScript(p, s).rows.find(r => r.id === id).message
  assert.equal(msg({}, 'C1'), 'soft one')
  assert.equal(msg({ casualtyRealism: 'recorded' }, 'C1'), 'rec one')
  assert.equal(msg({ casualtyRealism: 'per-row', casualtyPerRow: { C2: 'recorded' } }, 'C1'), 'soft one')
  assert.equal(msg({ casualtyRealism: 'per-row', casualtyPerRow: { C2: 'recorded' } }, 'C2'), 'rec two')
  assert.equal(fatalitiesOn(p, {}), false)
  assert.equal(fatalitiesOn(p, { casualtyRealism: 'recorded' }), true)
  assert.equal(fatalitiesOn(p, { casualtyRealism: 'per-row', casualtyPerRow: { C2: 'recorded' } }), true)
  // The input rows are not changed by building a script.
  assert.equal(p.msel[0].message, 'soft one')
})

test('played teams: their own messages become cue cards, not log traffic', () => {
  const p = pkgOf([row({ id: 'R1', from: 'A' }), row({ id: 'R2', from: 'B', scenario_time: '2030-01-01T08:05' })])
  const out = buildScript(p, { playedTeams: ['A'] }).rows
  assert.equal(out.find(r => r.id === 'R1').role, 'played')
  assert.equal(out.find(r => r.id === 'R2').role, 'background')
  assert.match(expectedAction(out[0]), /A should report to B/)
})

test('start and stop points, per-row off, and local injects', () => {
  const p = pkgOf(many(30))
  const win = buildScript(p, { start: '2030-01-01T08:10', stop: '2030-01-01T08:19' }).rows
  assert.equal(win.length, 10)
  const off = buildScript(p, { rowOff: ['B0001'] }).rows
  assert.ok(!off.some(r => r.id === 'B0001'))
  const added = buildScript(p, { localInjects: [{ id: 'L1', scenario_time: '2030-01-01T08:15', message: 'The local repeater fails.' }] }).rows
  const l = added.find(r => r.id === 'L1')
  assert.equal(l.role, 'inject'); assert.ok(l.local)
  assert.ok(added.indexOf(l) > 0, 'sorted into time order')
})

test('reveal: what really happened is withheld unless the setting is on', () => {
  const p = pkgOf([row({ id: 'R1', decision_point: 'Q?', what_really_happened: 'It rained.' })])
  assert.equal(buildScript(p, {}).rows[0].real, '')
  assert.equal(buildScript(p, { revealReal: true }).rows[0].real, 'It rained.')
})

test('settings: bad values are put right and package defaults are layered under class changes', () => {
  const s = normalizeSettings({ pace: 7, intensity: 33, casualtyRealism: 'wild' }, { pace: 10 })
  assert.equal(s.pace, 10); assert.equal(s.intensity, 100); assert.equal(s.casualtyRealism, 'softened')
})
