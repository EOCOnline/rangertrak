// SPDX-License-Identifier: AGPL-3.0-or-later
import test from 'node:test'
import assert from 'node:assert/strict'
import { createClock, scenarioNow, pause, resume, setRate, jumpTo, jumpToOpPeriod, rebaseMs, unrebaseMin, rowsDue } from './lib/clock.js'

const W0 = 1_000_000_000_000

test('clock: starts paused, runs at the pace, pauses and resumes without drift', () => {
  let c = createClock(100, W0, 1)
  assert.equal(scenarioNow(c, W0 + 60000), 100, 'paused')
  c = resume(c, W0)
  assert.equal(scenarioNow(c, W0 + 5 * 60000), 105)
  c = pause(c, W0 + 5 * 60000)
  assert.equal(scenarioNow(c, W0 + 99 * 60000), 105, 'stands still while paused')
  c = resume(c, W0 + 10 * 60000)
  assert.equal(scenarioNow(c, W0 + 12 * 60000), 107)
})

test('clock: a pace change keeps the time it had reached', () => {
  let c = resume(createClock(0, W0, 1), W0)
  c = setRate(c, W0 + 10 * 60000, 10)
  assert.equal(scenarioNow(c, W0 + 10 * 60000), 10)
  assert.equal(scenarioNow(c, W0 + 12 * 60000), 30)
})

test('clock: jump to a time or an op period keeps the paused state', () => {
  const ops = [{ n: 0, startMin: 0 }, { n: 3, startMin: 5000 }]
  let c = createClock(100, W0, 1)
  c = jumpTo(c, W0, 777)
  assert.equal(scenarioNow(c, W0 + 1e6), 777); assert.ok(c.paused)
  c = jumpToOpPeriod(resume(c, W0), W0, ops, 3)
  assert.equal(scenarioNow(c, W0), 5000); assert.ok(!c.paused)
  assert.equal(scenarioNow(c, W0 + 60000), 5001)
  assert.throws(() => jumpToOpPeriod(c, W0, ops, 9), /no OP 9/)
})

test('rebase: the chosen scenario moment lands on now; earlier rows in the past, later in the future', () => {
  const moment = 50000
  assert.equal(rebaseMs(moment, moment, W0), W0)
  assert.equal(rebaseMs(moment - 60, moment, W0), W0 - 3600000)
  assert.equal(rebaseMs(moment + 30, moment, W0), W0 + 1800000)
  assert.equal(unrebaseMin(rebaseMs(moment - 17, moment, W0), moment, W0), moment - 17)
})

test('rowsDue: rows reached since the last tick, up to and including now', () => {
  const rows = [{ t: 1 }, { t: 2 }, { t: 3 }, { t: 4 }]
  assert.deepEqual(rowsDue(rows, 1, 3).map(r => r.t), [2, 3])
})
