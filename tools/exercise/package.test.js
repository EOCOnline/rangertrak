// SPDX-License-Identifier: AGPL-3.0-or-later
import test from 'node:test'
import assert from 'node:assert/strict'
import { loadPackage, opPeriodAt } from './lib/package.js'
import { row, makeTexts } from './test-helpers.js'

test('package: a small good package loads clean', () => {
  const p = loadPackage(makeTexts([row(), row({ id: 'R2', scenario_time: '2030-01-01T09:00' })]))
  assert.deepEqual(p.errors, [])
  assert.ok(p.ok)
  assert.equal(p.msel.length, 2)
  assert.equal(p.opPeriods.length, 1)
})

test('package: errors name the row id', () => {
  const p = loadPackage(makeTexts([
    row({ id: 'R1', kind: 'banana' }),
    row({ id: 'R2', delivery: 'maybe' }),
    row({ id: 'R3', test: 'sneaky' }),
    row({ id: 'R4', place_id: 'P9' }),
    row({ id: 'R5', scenario_time: 'later' }),
    row({ id: 'R1' }),
  ]))
  assert.ok(!p.ok)
  for (const id of ['R1', 'R2', 'R3', 'R4', 'R5']) assert.ok(p.errors.some(e => e.startsWith(id + ':')), `${id} reported`)
  assert.ok(p.errors.some(e => /R1: id is used twice/.test(e)))
})

test('package: times must be in order inside an op period, but may restart in the next', () => {
  const bad = loadPackage(makeTexts([row({ scenario_time: '2030-01-01T09:00' }), row({ id: 'R2', scenario_time: '2030-01-01T08:30' })]))
  assert.ok(bad.errors.some(e => /R2: time .* earlier than R1/.test(e)))
  const ok = loadPackage(makeTexts([row({ scenario_time: '2030-01-01T09:00' }), row({ id: 'R2', op_period: '1', scenario_time: '2030-01-01T08:30' })]))
  assert.deepEqual(ok.errors, [])
})

test('package: missing columns are named', () => {
  const t = makeTexts([row()])
  t.msel = 'id,scenario_time\nR1,2030-01-01T08:00\n'
  const p = loadPackage(t)
  assert.ok(p.errors.some(e => /msel\.csv: missing columns .*op_period/.test(e)))
})

test('package: a casualty row needs both versions, and a content note', () => {
  const t = makeTexts([row({ kind: 'casualty', casualty_recorded: 'x', casualty_softened: '' })], { scenario: { contentNote: '' } })
  const p = loadPackage(t)
  assert.ok(p.errors.some(e => /R1: a casualty row needs both/.test(e)))
  assert.ok(p.errors.some(e => /contentNote/.test(e)))
})

test('package: bad scenario.json and bad coordinates are reported', () => {
  const t = makeTexts([row()])
  t.scenario = '{nope'
  t.places = 'id,label,type,lat,lon\nP1,Place 1,site,north,-122.4\n'
  const p = loadPackage(t)
  assert.ok(p.errors.some(e => /scenario\.json: cannot be read/.test(e)))
  assert.ok(p.errors.some(e => /P1: latitude/.test(e)))
})

test('package: op period lookup', () => {
  const ops = [{ n: 0, startMin: 0 }, { n: 1, startMin: 100 }]
  assert.equal(opPeriodAt(ops, 50).n, 0)
  assert.equal(opPeriodAt(ops, 100).n, 1)
  assert.equal(opPeriodAt(ops, 999).n, 1)
})
