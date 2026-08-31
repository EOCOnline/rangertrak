/**
 * Field-report status colors: the bridge between what settings *store* and what the DOM
 * needs to *paint*.
 *
 * Sprint E moved stored status colors from raw CSS color strings ('LightYellow', '#00ff00')
 * to **semantic keys** ('normal', 'urgent', ...) that resolve to the `--rt-status-*` custom
 * properties emitted by `src/styles/_tokens.scss`. That indirection is what lets one stored
 * value serve both color schemes: a single stored hex cannot, since it is one color and
 * light/dark need two.
 *
 * A stored value may still legitimately be a raw color - the user can pick a custom one in
 * the settings color editor, and un-migrated data can reach here too. So everything below
 * is deliberately TOLERANT: a known key resolves to its token, anything else passes through
 * untouched. That is what allows the migration and the view layer to land independently
 * without a broken state in between.
 */

/**
 * The seven semantic keys. These are the map keys in `src/styles/_status.scss` and therefore
 * the `--rt-status-<key>` names in `_tokens.scss` - keep the three in sync.
 */
export const STATUS_KEYS = [
  'normal',
  'location-report',
  'evidence-report',
  'need-rest-food',
  'incident-check-in',
  'incident-check-out',
  'urgent',
] as const

export type StatusKey = typeof STATUS_KEYS[number]

export function isStatusKey(value: string): value is StatusKey {
  return (STATUS_KEYS as readonly string[]).includes(value)
}

/**
 * The CSS color to paint for a stored status value - as a text color on the Entry radios,
 * or as a cell background in the grids. Semantic keys become `var(--rt-status-*)`, which
 * already carries its own light/dark pair; anything else is passed through as the literal
 * the user chose.
 */
export function statusColorValue(stored: string): string {
  return isStatusKey(stored) ? `var(--rt-status-${stored})` : stored
}

/**
 * The color to place ON TOP of `statusColorValue()` when it is used as a background.
 *
 * For semantic keys this is `--rt-status-ink`, which `_status.scss` defines per scheme
 * (white on the dark light-mode fills, near-black on the lighter dark-mode fills). For a
 * custom color there is no token, so pick whichever of black/white contrasts better -
 * previously nothing was set at all and custom backgrounds inherited whatever text color
 * happened to be in scope, which is how unreadable grid cells happened.
 */
export function statusInkValue(stored: string): string {
  if (isStatusKey(stored)) return 'var(--rt-status-ink)'
  // Raised live 2026-08-27: a freshly-added status row (color: '') read as dark text on a
  // dark background in dark mode. `statusColorValue('')` passes an empty string through as
  // the background, i.e. "no color painted, use the grid's own default cell background" -
  // there is nothing here to contrast against, so this is NOT the "pick black or white for a
  // custom color" case below. `var(--rt-ink)` is the app's own normal, scheme-aware text
  // color - the same one the cell would show with no style override at all.
  if (!stored.trim()) return 'var(--rt-ink)'
  const rgb = parseColor(stored)
  if (!rgb) return '#111111'
  return contrastRatio(rgb, [255, 255, 255]) >= contrastRatio(rgb, [17, 17, 17]) ? '#FFFFFF' : '#111111'
}

export type Rgb = [number, number, number]

/**
 * Parses `#rgb` / `#rrggbb` / `rgb(r,g,b)`. Returns null for anything else - including CSS
 * named colors, which cannot be resolved without a browser and which this file must stay
 * usable without (it is imported by the pure, unit-tested migration).
 */
export function parseColor(value: string): Rgb | null {
  const v = value.trim()

  const hex = v.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)
  if (hex) {
    const h = hex[1]
    const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h
    return [
      parseInt(full.slice(0, 2), 16),
      parseInt(full.slice(2, 4), 16),
      parseInt(full.slice(4, 6), 16),
    ]
  }

  const rgb = v.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i)
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])]

  return null
}

/** WCAG 2.1 relative luminance. */
export function relativeLuminance([r, g, b]: Rgb): number {
  const channel = (c: number) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

/** WCAG 2.1 contrast ratio, 1..21. */
export function contrastRatio(a: Rgb, b: Rgb): number {
  const la = relativeLuminance(a)
  const lb = relativeLuminance(b)
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la]
  return (hi + 0.05) / (lo + 0.05)
}

/**
 * Whether a custom status color clears WCAG AA (4.5:1) against the ink that would be placed
 * on it. Semantic keys always pass - `_status.scss` guarantees it - so they return true
 * without measurement. Unparseable values return true as well: we cannot measure a CSS named
 * color here, and warning on something we have not actually evaluated would be noise.
 */
export function statusColorMeetsAA(stored: string): boolean {
  if (isStatusKey(stored)) return true
  const rgb = parseColor(stored)
  if (!rgb) return true
  const ink = parseColor(statusInkValue(stored))!
  return contrastRatio(rgb, ink) >= 4.5
}
