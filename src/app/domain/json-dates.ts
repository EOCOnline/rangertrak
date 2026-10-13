/**
 * Turning the ISO strings a JSON round-trip leaves behind back into real `Date` objects.
 *
 * Every persisted type in this app is written with `JSON.stringify` and read with
 * `JSON.parse` - localStorage, a `.rtmission` backup, a Report Packet, a Prep import. JSON
 * has no date type, so a field declared `Date` in its interface comes back a **string**,
 * and TypeScript cannot see it: the value is cast to its interface on the way in and
 * everything downstream believes the declaration.
 *
 * Two ways that bites, and the quiet one is worse:
 *
 *   - **Loud:** anything calling a Date method throws `x.getTime is not a function`.
 *     Found 2026-08-31 on 0.90.5: `buildIcs309Log()` sorts with
 *     `a.date.getTime() - b.date.getTime()`, so generating an ICS-309 communications log
 *     threw for any operator with two or more saved reports. With 0 or 1 report `sort()`
 *     never calls the comparator, which is why it looked fine in light testing.
 *   - **Silent:** a relational comparison just stops working. `someDate < isoString`
 *     coerces both operands with hint Number, `Number(isoString)` is `NaN`, and every
 *     comparison with NaN is false - in BOTH directions, so no branch looks obviously
 *     wrong. That is how the operational-period clamp (E-71) came to accept an end time
 *     before the start for every returning user while its own unit tests stayed green:
 *     the tests built Dates in memory and never round-tripped them.
 *
 * Fix the boundary, not the use site. Coercing inside each consumer is what let both bugs
 * survive - there is always one more consumer. Each persisted type gets its dates restored
 * once, in the migration/merge function every load path already goes through.
 */

/**
 * Returns a copy of `source` with each named field converted to a `Date` when it currently
 * holds something date-like (an ISO string or an epoch number).
 *
 * Deliberately conservative:
 *   - a value that is already a `Date` is left alone
 *   - `undefined`/`null` are left alone, so optional fields stay absent rather than
 *     becoming the epoch
 *   - a value that does not parse is left **exactly as it was**, not replaced with
 *     `new Date()`. Bad data should surface as bad data; inventing a plausible timestamp
 *     inside an incident log is worse than showing an obviously wrong one.
 */
export function rehydrateDateFields<T extends object>(
  source: T,
  fields: readonly string[],
): T {
  // Plain Record, not `T & Record<...>`: TS2862 forbids writing through a generic index.
  const copy = { ...source } as Record<string, unknown>

  for (const field of fields) {
    const value = copy[field]
    if (value === undefined || value === null || value instanceof Date) { continue }
    if (typeof value !== 'string' && typeof value !== 'number') { continue }

    const asDate = new Date(value)
    if (!isNaN(asDate.getTime())) {
      copy[field] = asDate
    }
  }

  return copy as T
}
