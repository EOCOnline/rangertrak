import { FieldReportStatusType, statusColorValue } from '../services'

/**
 * Resolves a field report's configured status colour for use as a marker "shadow" (a
 * coloured halo behind the ranger's own shape+colour marker, so a scribe can read urgency
 * at a glance without opening the popup) - raised live, 2026-08-26. Reuses the same
 * `statusColorValue()` indirection the Entry radios and the grids already use, so a marker's
 * halo and the Mission page's own status colour swatch are always the same colour, never a
 * second palette to keep in sync.
 */
export function fieldReportStatusColor(
  status: string,
  fieldReportStatuses: FieldReportStatusType[]
): string | undefined {
  const entry = fieldReportStatuses.find(s => s.status === status)
  return entry ? statusColorValue(entry.color) : undefined
}

/**
 * MapLibre's paint expressions are evaluated by its own WebGL renderer, not the DOM/CSSOM -
 * a `var(--rt-status-urgent)` string that resolves fine inside a Leaflet `L.divIcon`'s real
 * DOM/SVG (ranger-icon.ts) is meaningless there. A raw colour (a user-picked custom status
 * colour) passes through untouched, same tolerance `statusColorValue()` itself documents.
 *
 * **Not just `getComputedStyle(document.documentElement).getPropertyValue(...)` - tried
 * first and confirmed wrong.** `--rt-status-*` (`_tokens.scss`) is declared with
 * `light-dark(#hexLight, #hexDark)` as its value, and `getPropertyValue()` on a custom
 * property returns that raw, UNEVALUATED source text verbatim (custom properties are
 * untyped - the browser has no reason to resolve a colour function inside one). Confirmed
 * live: `getPropertyValue('--rt-status-urgent')` literally returns
 * `"light-dark(#B3261E, #FF6B5E)"`, which MapLibre's own colour parser cannot parse.
 * `getComputedStyle(el).color`, by contrast, is always resolved by the spec - the browser
 * has to serialise `color` as a concrete `rgb()` no matter what produced it. So: apply the
 * candidate value as `color` on a real (connected, so it inherits the page's actual
 * `color-scheme`) element, read the resolved `color` back, discard the element. Not reactive
 * to a live light/dark toggle - resolved once when the GeoJSON is (re)built, same refresh
 * cadence every other marker property already has.
 */
export function resolveCssColorForCanvas(cssColor: string): string {
  if (!cssColor.startsWith('var(')) {
    return cssColor
  }
  // NOT display:none - some engines skip full style resolution for a display:none subtree.
  // Positioned off-screen and non-interactive instead, so it never paints or is reachable,
  // but the browser still resolves `color` on it exactly as it would for any real element.
  const probe = document.createElement('span')
  probe.style.position = 'absolute'
  probe.style.left = '-9999px'
  probe.style.pointerEvents = 'none'
  probe.style.color = cssColor
  document.body.appendChild(probe)
  const resolved = getComputedStyle(probe).color
  probe.remove()
  return resolved || '#888888'
}
