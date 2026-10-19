// SPDX-License-Identifier: AGPL-3.0-or-later
// RangerTrak exercise console (E-196 phase 0). Free software under the GNU AGPL v3 or later.

/**
 * The scenario clock (E-196 option A). A clock is a plain value; every function returns a new
 * one and takes the real time as an argument, so nothing here reads the system clock and every
 * rule can be tested.
 *
 *   scenarioMin   the scenario time, in minutes, at the moment `wallMs` (the anchor)
 *   rate          scenario seconds per real second (the pace: 1, 2, 5, 10, 60)
 *   paused        when true the clock stands still at scenarioMin
 */
export function createClock(scenarioMin, wallMs, rate = 1) {
  return { scenarioMin, wallMs, rate, paused: true }
}

/** Scenario minutes at the real time `wallMs`. */
export function scenarioNow(clock, wallMs) {
  if (clock.paused) return clock.scenarioMin
  return clock.scenarioMin + ((wallMs - clock.wallMs) / 60000) * clock.rate
}

const at = (clock, wallMs, patch) => ({ ...clock, scenarioMin: scenarioNow(clock, wallMs), wallMs, ...patch })

export const pause = (clock, wallMs) => at(clock, wallMs, { paused: true })
export const resume = (clock, wallMs) => (clock.paused ? at(clock, wallMs, { paused: false }) : clock)
export const setRate = (clock, wallMs, rate) => at(clock, wallMs, { rate })

/** Jump to a scenario time. Keeps the paused state. */
export function jumpTo(clock, wallMs, scenarioMin) {
  return { ...clock, scenarioMin, wallMs }
}

/** Jump to the start of an op period: opPeriods are [{ n, startMin }]. Throws on an unknown one. */
export function jumpToOpPeriod(clock, wallMs, opPeriods, n) {
  const op = opPeriods.find(o => o.n === n)
  if (!op) throw new Error(`There is no OP ${n} in this scenario.`)
  return jumpTo(clock, wallMs, op.startMin)
}

/**
 * Rebase: the real instant (ms since the epoch) a scenario time takes when the chosen scenario
 * moment `momentMin` is mapped onto `nowMs`. A row one hour before the moment lands one real
 * hour before now; one hour after, one hour ahead. Rebasing uses real minutes, never the pace.
 */
export function rebaseMs(scenarioMin, momentMin, nowMs) {
  return nowMs + (scenarioMin - momentMin) * 60000
}

/** The inverse: the scenario time that a real instant corresponds to under the same rebase. */
export function unrebaseMin(wallMs, momentMin, nowMs) {
  return momentMin + (wallMs - nowMs) / 60000
}

/** The first row time at or after `scenarioMin` among a script's rows, or null. Next-event helper. */
export function nextRowAfter(rows, scenarioMin) {
  for (const r of rows) if (r.t > scenarioMin) return r
  return null
}

/** Rows whose time has been reached since `fromMin` up to and including `toMin`. */
export function rowsDue(rows, fromMin, toMin) {
  return rows.filter(r => r.t > fromMin && r.t <= toMin)
}
