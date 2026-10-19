/**
 * Dates for download file names, in the device's own time zone.
 *
 * `new Date().toISOString().slice(0, 10)` is the UTC date, so a backup made at 8:46 PM Pacific on
 * the 18th was named for the 19th. People read the date in a file name as "the day I made it".
 * Use these for every file name; keep `toISOString()` for timestamps stored inside files.
 */

const pad = (n: number): string => String(n).padStart(2, '0')

/** `2026-10-18`: the local calendar date of `when` (default: now). Accepts a Date or an ISO string / epoch ms. */
export function localDateStamp(when: Date | string | number = new Date()): string {
  const d = when instanceof Date ? when : new Date(when)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** `20261018-2046`: the local date and time of `when`, to the minute, for names that must not collide within a day. */
export function localDateTimeStamp(when: Date | string | number = new Date()): string {
  const d = when instanceof Date ? when : new Date(when)
  return `${localDateStamp(d).replace(/-/g, '')}-${pad(d.getHours())}${pad(d.getMinutes())}`
}
