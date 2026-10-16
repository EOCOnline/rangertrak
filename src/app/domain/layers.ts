/**
 * Layers the device holds (E-187 Layers phase C, ADR D-58 points 6 and 7).
 *
 * A "layer" is a named list of people or places that was imported from a file. The device
 * remembers, for each layer, which records (by `uid`) it brought in, so that:
 *   - re-importing a newer version of the same layer can ask about records that have LEFT it
 *     ("2 people are no longer in Fernhollow CERT. Remove them?" - default No, D-50), and
 *   - "Remove this layer" can take out what the layer brought in, and only that.
 *
 * Nothing here touches `RangerType` or `MissionLocationType`: a record belongs to a layer only
 * because a layer record lists its uid. A record added by hand is in no layer, so it is never
 * offered for removal. A hand-over (D-59) is not a layer and is never recorded.
 *
 * Layer identity is the NAME (trimmed, case-insensitive) plus the kind. A people+places Setup
 * file makes two records with the same name, one of each kind.
 *
 * Pure functions only (D-57): no storage, no injection, no logging. `LayerService` stores and
 * gathers; every rule is here.
 */

export type LayerKind = 'people' | 'places'

export type LayerRecord = {
  /** As the person first typed or the file named it (display). Identity ignores case and padding. */
  name: string
  kind: LayerKind
  /** The "as of" date the file gave itself (YYYY-MM-DD), or the import day for a spreadsheet. */
  asOf: string
  source?: string
  /** The file this version came from. */
  fileName: string
  /** ISO timestamp of the import. */
  importedAt: string
  /** The uids of the records this layer brought in or confirmed, in the last import. */
  uids: string[]
}

export const LAYERS_SCHEMA_VERSION = 1

export type StoredLayers = { schemaVersion: number; layers: LayerRecord[] }

const nameKey = (name: string) => name.trim().toLowerCase()

export function sameLayer(rec: Pick<LayerRecord, 'name' | 'kind'>, name: string, kind: LayerKind): boolean {
  return rec.kind === kind && nameKey(rec.name) === nameKey(name)
}

export function findLayer(layers: readonly LayerRecord[], name: string, kind: LayerKind): LayerRecord | undefined {
  return layers.find(l => sameLayer(l, name, kind))
}

export function layersOfKind(layers: readonly LayerRecord[], kind: LayerKind): LayerRecord[] {
  return layers.filter(l => l.kind === kind)
}

/** Tolerant reader for what was stored: anything unreadable becomes "no layers", never a throw. */
export function parseLayers(raw: unknown): LayerRecord[] {
  let value = raw
  if (typeof raw === 'string') {
    try { value = JSON.parse(raw) } catch { return [] }
  }
  const list: unknown = Array.isArray(value) ? value : (value as Partial<StoredLayers> | null)?.layers
  if (!Array.isArray(list)) return []
  const out: LayerRecord[] = []
  for (const item of list) {
    if (!item || typeof item !== 'object') continue
    const r = item as Partial<LayerRecord>
    const name = typeof r.name === 'string' ? r.name.trim() : ''
    if (!name || (r.kind !== 'people' && r.kind !== 'places')) continue
    out.push({
      name,
      kind: r.kind,
      asOf: typeof r.asOf === 'string' ? r.asOf : '',
      ...(typeof r.source === 'string' && r.source ? { source: r.source } : {}),
      fileName: typeof r.fileName === 'string' ? r.fileName : '',
      importedAt: typeof r.importedAt === 'string' ? r.importedAt : '',
      uids: Array.isArray(r.uids) ? [...new Set(r.uids.filter((u): u is string => typeof u === 'string' && !!u))] : [],
    })
  }
  return out
}

export function serializeLayers(layers: readonly LayerRecord[]): string {
  const stored: StoredLayers = { schemaVersion: LAYERS_SCHEMA_VERSION, layers: [...layers] }
  return JSON.stringify(stored)
}

/**
 * The name a Setup file's `layer` block gives to be recorded, or '' when it must not be: a
 * hand-over (D-59) is never a layer, and a file with no name has nothing to be known by.
 */
export function recordableLayerName(layer: { name?: unknown; kind?: unknown } | undefined | null): string {
  if (!layer || layer.kind === 'handover') return ''
  return typeof layer.name === 'string' ? layer.name.trim() : ''
}

/**
 * A layer name offered for a spreadsheet: the file name without its extension and without a
 * trailing date ("Fernhollow CERT 2026-10-15.xlsx" -> "Fernhollow CERT"). Underscores read as
 * spaces. Blank when nothing sensible is left.
 */
export function suggestLayerName(fileName: string): string {
  let base = fileName.replace(/^.*[\\/]/, '').replace(/\.[a-z0-9]{1,5}$/i, '')
  base = base.replace(/[_]+/g, ' ')
  // Trailing dates: 2026-10-15, 2026_10_15, 20261015, 15Oct2026, Oct 15 2026, and the dash before them.
  const dates = [
    /[\s\-.]*\d{4}[-./ ]\d{1,2}[-./ ]\d{1,2}$/,
    /[\s\-.]*\d{1,2}[-./ ]\d{1,2}[-./ ]\d{4}$/,
    /[\s\-.]*\d{8}$/,
    /[\s\-.]*\d{1,2}\s?[A-Za-z]{3,9}\s?\d{2,4}$/,
    /[\s\-.]*[A-Za-z]{3,9}\s?\d{1,2},?\s?\d{4}$/,
  ]
  for (const re of dates) {
    const next = base.replace(re, '')
    if (next !== base) { base = next; break }
  }
  return base.replace(/\s+/g, ' ').replace(/[\s\-.]+$/, '').trim()
}

/** Every uid held by a layer other than the named one. */
export function heldByOtherLayers(layers: readonly LayerRecord[], name: string, kind: LayerKind): Set<string> {
  const held = new Set<string>()
  for (const l of layers) {
    if (sameLayer(l, name, kind)) continue
    if (l.kind !== kind) continue
    l.uids.forEach(u => held.add(u))
  }
  return held
}

/**
 * Records that were in the previous version of this layer, are not in the new one, and are not
 * held by any other layer: what a re-import should ask about. Empty for a layer not seen before.
 * Call it BEFORE `recordLayerImport()`, with the layers as they were.
 */
export function leftThisLayer(
  layers: readonly LayerRecord[], name: string, kind: LayerKind, newUids: readonly string[],
): string[] {
  const previous = findLayer(layers, name, kind)
  if (!previous) return []
  const now = new Set(newUids)
  const elsewhere = heldByOtherLayers(layers, name, kind)
  return previous.uids.filter(u => !now.has(u) && !elsewhere.has(u))
}

export type LayerImport = {
  name: string
  kind: LayerKind
  asOf: string
  source?: string
  fileName: string
  importedAt: string
  /** The uids the import wrote or confirmed. */
  uids: readonly string[]
}

/** The layer list after an import: this layer's record replaced in place, or appended when new. */
export function recordLayerImport(layers: readonly LayerRecord[], imp: LayerImport): LayerRecord[] {
  const name = imp.name.trim()
  const rec: LayerRecord = {
    name, kind: imp.kind, asOf: imp.asOf,
    ...(imp.source ? { source: imp.source } : {}),
    fileName: imp.fileName, importedAt: imp.importedAt,
    uids: [...new Set(imp.uids.filter(u => !!u))],
  }
  const at = layers.findIndex(l => sameLayer(l, name, imp.kind))
  if (at < 0) return [...layers, rec]
  // Keep the name as first recorded; identity ignores case, so a retyped "fernhollow cert" is the same layer.
  const next = [...layers]
  next[at] = { ...rec, name: layers[at].name }
  return next
}

export type LayerRemoval = {
  /** Uids that only this layer holds: what "Remove this layer" takes out. */
  remove: string[]
  /** Uids another layer also holds: kept. */
  keptShared: string[]
}

/** What removing a layer removes. Records added by hand are not in any layer, so never appear. */
export function removalFor(layers: readonly LayerRecord[], name: string, kind: LayerKind): LayerRemoval {
  const layer = findLayer(layers, name, kind)
  if (!layer) return { remove: [], keptShared: [] }
  const elsewhere = heldByOtherLayers(layers, name, kind)
  return {
    remove: layer.uids.filter(u => !elsewhere.has(u)),
    keptShared: layer.uids.filter(u => elsewhere.has(u)),
  }
}

/** The layer list without the named layer's record. */
export function withoutLayer(layers: readonly LayerRecord[], name: string, kind: LayerKind): LayerRecord[] {
  return layers.filter(l => !sameLayer(l, name, kind))
}

/** Forgets uids that no longer exist on the device (after a replace, a restore, a delete). */
export function pruneLayers(layers: readonly LayerRecord[], kind: LayerKind, liveUids: ReadonlySet<string>): LayerRecord[] {
  return layers.map(l => l.kind === kind ? { ...l, uids: l.uids.filter(u => liveUids.has(u)) } : l)
}

/** How many of a layer's records are still on the device. */
export function liveCount(layer: LayerRecord, liveUids: ReadonlySet<string>): number {
  return layer.uids.filter(u => liveUids.has(u)).length
}
