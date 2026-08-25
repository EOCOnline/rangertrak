/**
 * A well-mixed string hash, shared by E-80's teamColorFor() (mapLeaflet.component.ts) and
 * E-86's rangerIconFor() (ranger-icon.ts) - both need a deterministic "turn an arbitrary
 * name into a number" step to pick a colour (and, for rangerIconFor, a shape) with no
 * lookup table or stored assignment.
 *
 * A naive `hash = hash*31 + charCode` accumulator (the original implementation of both
 * functions, before this was extracted) has a real bug for exactly the names this app
 * actually sees: SAR team/ranger callsigns are commonly sequential ("ACS1", "ACS2",
 * "ACS3", "Team1", "Team2"...). Two inputs differing by one character's char code differ
 * by only that same small amount in the final hash too, which barely moves `hash % 360`
 * (colour) or a small modulus (shape index) - confirmed live 2026-08-24: "ACS1" and
 * "ACS3" landed 2 hue-degrees apart (indistinguishable) and on the identical shape. The
 * Murmur3-style finalizer below (avalanche mixing) fixes this: a one-character difference
 * in input produces an unpredictable, well-spread difference in output.
 */
export function hashString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0
  }
  h ^= h >>> 16
  h = Math.imul(h, 0x85ebca6b)
  h ^= h >>> 13
  h = Math.imul(h, 0xc2b2ae35)
  h ^= h >>> 16
  return Math.abs(h)
}
