import * as L from 'leaflet'

import { hashString } from './hash-color'

/**
 * E-86 (narrowed 2026-08-24: "ignore the team concept for now, just make ranger markers
 * unique"): every ranger gets a distinct marker - shape AND colour, both derived purely
 * from their callsign - so the same ranger looks identical everywhere (main map, Entry
 * mini-map) and across sessions/devices, with no stored state and no roster lookup
 * needed at draw time.
 *
 * E-97 (2026-08-25): route trails used to colour by `teamColorFor(team)` while markers
 * coloured by callsign here - since team is usually blank (E-80 explicitly deferred it),
 * nearly every trail fell through to one grey "unknown" colour, reading as "trails are
 * all one colour." `rangerColorFor()` is exported so both the marker fill and the trail
 * stroke come from the same callsign-keyed function and can't drift apart again.
 */

// Plain shape outlines, stroked white so they stay legible over any tile colour
// (satellite, OpenTopoMap's greens/browns, etc.) - filled colour is what varies per ranger.
const MARKER_SHAPES: ((fill: string) => string)[] = [
  fill => `<circle cx="10" cy="10" r="8" fill="${fill}"/>`,
  fill => `<rect x="2" y="2" width="16" height="16" fill="${fill}"/>`,
  fill => `<polygon points="10,1 19,18 1,18" fill="${fill}"/>`,
  fill => `<polygon points="10,1 19,10 10,19 1,10" fill="${fill}"/>`,
  fill => `<polygon points="10,1 12.7,7.2 19.5,7.6 14.2,11.9 16.2,18.5 10,14.8 3.8,18.5 5.8,11.9 0.5,7.6 7.3,7.2" fill="${fill}"/>`,
]

/**
 * A deterministic colour for a given ranger callsign - same callsign always yields the
 * same colour, no lookup or stored assignment required. Shared by the marker fill
 * (`rangerIconFor`, below) and the route-trail stroke (`mapLeaflet.component.ts`'s
 * `drawTrails()`), so a ranger's trail and marker can never show different colours.
 *
 * Callers with a genuinely blank callsign should use `rangerIconFor`'s own dedicated
 * "unassigned" marker (below) instead of this function - kept `|| 'Unknown'` here only
 * because `drawTrails()` still calls this directly for a trail's stroke colour, and a trail
 * has no equivalent "unassigned" treatment (yet) to fall back to.
 */
export function rangerColorFor(callsign: string): string {
  const hash = hashString(callsign || 'Unknown')
  return `hsl(${hash % 360}, 65%, 42%)`
}

// Fixed appearance, deliberately NOT drawn from the hash-based shape/colour system below -
// a report with no callsign at all isn't "a ranger who happens to hash to this look," it's a
// data gap, and needs to read as visually different from every possible real marker, not
// just different from whichever real marker it happened to collide with. Dashed red ring
// (never used by any hashed shape's own stroke) + a literal "?" - no ambiguity about what it
// means at a glance, on a map a scribe is reading quickly under time pressure.
const UNASSIGNED_MARKER = `<circle cx="10" cy="10" r="8" fill="#ffffff" stroke="#c0392b" stroke-width="2" stroke-dasharray="3,2"/><text x="10" y="14.5" text-anchor="middle" font-size="12" font-weight="700" fill="#c0392b" font-family="sans-serif">?</text>`

/**
 * A deterministic, distinct Leaflet icon for a given ranger callsign - same callsign
 * always yields the same shape+colour, no lookup or stored assignment required. Shape and
 * colour are derived from independent bit ranges of one hash, so the two don't visibly
 * correlate (two rangers sharing a colour won't reliably also share a shape).
 *
 * Raised live 2026-08-26, after a report noted not every ranger has a real ham callsign:
 * a genuinely blank `callsign` used to fall through to `hashString('Unknown')`, so EVERY
 * report with no callsign got the identical shape+colour - indistinguishable from each
 * other, and looking exactly as "normal" as a real ranger's marker. Now routed to a fixed
 * `UNASSIGNED_MARKER` instead - it can't tell two different blank-callsign reports apart
 * either (there is no data to distinguish them on), but at least it no longer hides that
 * gap behind a marker that looks like a real, consistent identity.
 *
 * `statusColor` (raised live, 2026-08-26): an optional halo drawn BEHIND the ranger's own
 * shape, so a report's configured status (Normal/Need Rest/Urgent/...) reads at a glance on
 * the map without opening the popup - the same colour the Mission page's status editor and
 * the Entry/Reports status controls already use (`fieldReportStatusColor()`, this module's
 * sibling file), not a second palette. A real SVG circle behind the shape rather than a CSS
 * `filter: drop-shadow(...)` - Leaflet's `divIcon` container is sized exactly to `iconSize`
 * (no guaranteed overflow room for a blurred filter to bleed into without clipping), where
 * an SVG element drawn inside a larger viewBox has no such risk. Omitted entirely (falls
 * back to the plain 20x20 icon) when no status colour resolves, so a report with an unknown/
 * blank status draws exactly as it always has.
 */
export function rangerIconFor(callsign: string, statusColor?: string): L.DivIcon {
  const shape = callsign?.trim()
    ? MARKER_SHAPES[Math.floor(hashString(callsign) / 360) % MARKER_SHAPES.length](rangerColorFor(callsign))
    : UNASSIGNED_MARKER

  if (!statusColor) {
    return L.divIcon({
      className: 'rt-ranger-marker',
      html: `<svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" stroke="white" stroke-width="1" stroke-linejoin="round">${shape}</svg>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
      popupAnchor: [0, -10],
    })
  }

  // Halo sits in its own 28x28 viewBox with the shape's original 0-20 coordinate system
  // shifted +4/+4 via <g transform>, so MARKER_SHAPES' own path/point coordinates need no
  // change to support this.
  return L.divIcon({
    className: 'rt-ranger-marker',
    html: `<svg width="28" height="28" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
      <circle cx="14" cy="14" r="13" fill="${statusColor}" opacity="0.55"/>
      <g transform="translate(4,4)" stroke="white" stroke-width="1" stroke-linejoin="round">${shape}</g>
    </svg>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  })
}
