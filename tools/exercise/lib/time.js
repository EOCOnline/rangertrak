// SPDX-License-Identifier: AGPL-3.0-or-later
// RangerTrak exercise console (E-196 phase 0). Free software under the GNU AGPL v3 or later.

/**
 * Scenario times are plain wall-clock stamps ("2018-01-09T03:45", no zone). Everywhere in the
 * console they are held as MINUTES since the Unix epoch read as UTC, so arithmetic is exact and
 * no machine time zone or daylight-saving change can move a row. Only the catch-up writer turns
 * them back into real instants, and only after rebasing to "now".
 */
export function parseStamp(stamp) {
  const m = /^(\d{4})-(\d\d)-(\d\d)[T ](\d\d):(\d\d)(?::(\d\d))?$/.exec(String(stamp ?? '').trim())
  if (!m) return NaN
  const [, y, mo, d, h, mi] = m.map(Number)
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || h > 23 || mi > 59) return NaN
  const ms = Date.UTC(y, mo - 1, d, h, mi)
  const back = new Date(ms)
  if (back.getUTCMonth() !== mo - 1 || back.getUTCDate() !== d) return NaN   // 2018-02-30 and the like
  return ms / 60000
}

const p2 = n => String(n).padStart(2, '0')

/** Minutes since the epoch back to "YYYY-MM-DDTHH:MM" (scenario wall clock). */
export function formatStamp(minutes) {
  const d = new Date(Math.round(minutes) * 60000)
  return `${d.getUTCFullYear()}-${p2(d.getUTCMonth() + 1)}-${p2(d.getUTCDate())}T${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}`
}

/** "HH:MM" of a scenario time, for display. */
export function formatClock(minutes) {
  const d = new Date(Math.floor(minutes) * 60000)
  return `${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}`
}

/** "Tue 09 Jan 03:45", for headers. */
export function formatLong(minutes) {
  const d = new Date(Math.floor(minutes) * 60000)
  const dow = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getUTCDay()]
  const mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getUTCMonth()]
  return `${dow} ${p2(d.getUTCDate())} ${mon} ${formatClock(minutes)}`
}
