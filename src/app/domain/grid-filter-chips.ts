/**
 * E-190: plain-language labels for whatever column filters are switched on in a data grid, so a
 * scribe can see at a glance what is hiding rows ("Team: CERT", "Status: Urgent or Evidence").
 *
 * Framework-free (D-57): the model is typed loosely because ag-grid's own types cannot be
 * imported here. The shapes handled are ag-grid 36's text, number and date filter models and
 * their AND/OR combinations. Anything else becomes "<Header>: filtered" - a filtered column is
 * never dropped silently and nothing here throws.
 */

export type FilterChip = { key: string; label: string }

/** Longest value text shown on a chip before it is cut with an ellipsis. */
export const CHIP_VALUE_MAX = 40

type Loose = Record<string, unknown>

/** `spaced` conditions read "Lat < 47.4"; the rest read "Team: CERT". */
type Part = { text: string; spaced: boolean }

function isRecord(v: unknown): v is Loose {
  return typeof v === 'object' && v !== null
}

function truncate(s: string): string {
  return s.length > CHIP_VALUE_MAX ? s.slice(0, CHIP_VALUE_MAX - 1) + '…' : s
}

/** "2026-10-15 00:00:00" -> "2026-10-15"; a real time of day is kept, without seconds. */
function trimDate(v: unknown): string {
  const s = String(v ?? '').trim()
  const m = /^(\d{4}-\d{2}-\d{2})(?:[ T](\d{2}:\d{2})(?::\d{2})?)?/.exec(s)
  if (!m) return s
  return m[2] && m[2] !== '00:00' ? `${m[1]} ${m[2]}` : m[1]
}

/** One simple condition, or null if it is not a shape we know. */
function describeCondition(c: unknown): Part | null {
  if (!isRecord(c)) return null
  const kind = c['filterType']
  const type = c['type']
  if (kind !== 'text' && kind !== 'number' && kind !== 'date') return null
  if (type === 'blank') return { text: 'blank', spaced: false }
  if (type === 'notBlank') return { text: 'not blank', spaced: false }
  const isDate = kind === 'date'
  const val = (v: unknown) => truncate(isDate ? trimDate(v) : String(v ?? ''))
  const main = isDate ? c['dateFrom'] : c['filter']
  const word = (text: string): Part => ({ text, spaced: false })
  const sym = (text: string): Part => ({ text, spaced: true })
  switch (type) {
    case 'contains': return word(val(main))
    case 'equals': return sym(`= ${val(main)}`)
    case 'notEqual': return sym(`≠ ${val(main)}`)
    case 'notContains': return word(`not ${val(main)}`)
    case 'startsWith': return word(`${val(main)}…`)
    case 'endsWith': return word(`…${val(main)}`)
    case 'lessThan': return sym(`< ${val(main)}`)
    case 'lessThanOrEqual': return sym(`≤ ${val(main)}`)
    case 'greaterThan': return sym(`> ${val(main)}`)
    case 'greaterThanOrEqual': return sym(`≥ ${val(main)}`)
    case 'inRange':
      return sym(isDate
        ? `${val(c['dateFrom'])}–${val(c['dateTo'])}`
        : `${val(c['filter'])}–${val(c['filterTo'])}`)
    default: return null
  }
}

function describeOne(header: string, model: unknown): string {
  const filtered = `${header}: filtered`
  if (isRecord(model) && Array.isArray(model['conditions'])) {
    const parts = (model['conditions'] as unknown[]).map(describeCondition)
    if (parts.length === 0 || parts.some(p => p === null)) return filtered
    const known = parts as Part[]
    const joiner = String(model['operator']).toUpperCase() === 'OR' ? ' or ' : ' and '
    const spaced = known.every(p => p.spaced)
    return `${header}${spaced ? ' ' : ': '}${known.map(p => p.text).join(joiner)}`
  }
  const one = describeCondition(model)
  return one === null ? filtered : `${header}${one.spaced ? ' ' : ': '}${one.text}`
}

export function describeGridFilters(
  model: Record<string, unknown> | null | undefined,
  headerFor: (colId: string) => string,
): FilterChip[] {
  if (!isRecord(model)) return []
  const chips: FilterChip[] = []
  for (const key of Object.keys(model)) {
    let header = key
    try { header = headerFor(key) || key } catch { /* keep the colId */ }
    let label: string
    try { label = describeOne(header, model[key]) } catch { label = `${header}: filtered` }
    chips.push({ key, label })
  }
  return chips
}
