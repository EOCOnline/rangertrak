import type { RadioLogEntryType } from '../shared/services/radio-log-entry.interface'

/**
 * Attachments on radio log entries (ADR D-60, E-194): the reference an entry carries.
 *
 * Pure (D-57): no injection, no logging, no storage. The bytes live elsewhere
 * (`AttachmentStoreService`, keyed by `sha256`); an entry only ever holds this reference, so
 * every format that carries entries carries the references with no extra work.
 *
 * Times are ISO strings, not `Date`: a reference is merged and compared as plain data and
 * travels through JSON files, so there is nothing to rehydrate.
 */
export type AttachmentRef = {
  /** SHA-256 of the original bytes as received, lowercase hex. The identity of the attachment. */
  sha256: string
  name: string
  /** MIME type as the browser reported it. */
  type: string
  size: number
  /** The file's own `lastModified`, when the browser gave one. */
  capturedAt?: string
  addedAt: string
  /** The operator who attached it, as on the entry itself (D-44). */
  addedBy: string
  /** Set when removed: the bytes are gone but the trace stays (D-60 item 5). Sticky in merges. */
  removed?: { at: string, by: string }
}

export type BudgetLevel = 'ok' | 'warn80' | 'over'

export type BudgetUsage = {
  usedBytes: number
  pct: number
  level: BudgetLevel
}

type HasAttachments = Pick<RadioLogEntryType, 'attachments'>

function earlier(a: string, b: string): boolean {
  const ta = new Date(a).getTime()
  const tb = new Date(b).getTime()
  if (Number.isFinite(ta) && Number.isFinite(tb)) return ta < tb
  return a < b
}

function byAddedThenSha(a: AttachmentRef, b: AttachmentRef): number {
  if (a.addedAt !== b.addedAt) return earlier(a.addedAt, b.addedAt) ? -1 : 1
  return a.sha256 < b.sha256 ? -1 : a.sha256 > b.sha256 ? 1 : 0
}

/**
 * Union by `sha256`. Never drops a reference. `removed` is sticky: removed on either side means
 * removed, and the earlier mark is kept. Where both sides name the same file, the one added
 * first supplies `name`/`addedAt`/`addedBy` (a tie keeps `a`'s). Stable order: `addedAt`, then
 * `sha256`. Inputs are not mutated.
 */
export function mergeAttachmentRefs(
  a: readonly AttachmentRef[] | undefined,
  b: readonly AttachmentRef[] | undefined,
): AttachmentRef[] {
  const bySha = new Map<string, AttachmentRef>()
  for (const ref of [...(a ?? []), ...(b ?? [])]) {
    const seen = bySha.get(ref.sha256)
    if (!seen) { bySha.set(ref.sha256, { ...ref }); continue }
    const base = earlier(ref.addedAt, seen.addedAt) ? { ...ref } : seen
    const marks = [seen.removed, ref.removed].filter((m): m is NonNullable<AttachmentRef['removed']> => !!m)
    if (marks.length) base.removed = { ...marks.reduce((x, y) => (earlier(y.at, x.at) ? y : x)) }
    bySha.set(ref.sha256, base)
  }
  return [...bySha.values()].sort(byAddedThenSha)
}

/** The references not marked removed. */
export function liveRefs(entry: HasAttachments): AttachmentRef[] {
  return (entry.attachments ?? []).filter(r => !r.removed)
}

/** Every fingerprint any entry names, live and removed: the set whose bytes must be kept. */
export function referencedFingerprints(entries: readonly HasAttachments[]): Set<string> {
  const out = new Set<string>()
  for (const e of entries) for (const r of e.attachments ?? []) out.add(r.sha256)
  return out
}

/**
 * The stored fingerprints no reference on the device names. The one rule for deleting bytes
 * (D-60 item 8): a removed-but-referenced fingerprint is NOT an orphan.
 */
export function orphans(storedKeys: Iterable<string>, entries: readonly HasAttachments[]): string[] {
  const kept = referencedFingerprints(entries)
  return [...storedKeys].filter(k => !kept.has(k))
}

/**
 * The stored fingerprints that only REMOVED references name: nothing live wants the bytes any
 * more. D-60 item 5 ("the bytes go, the reference stays") is carried out by deleting exactly
 * these, when a person removes an attachment or a merge brings a removal in. Never a fingerprint
 * with no reference at all (that is `orphans()`'s, with its own reasons) and never one a live
 * reference still names.
 */
export function removedOnly(storedKeys: Iterable<string>, entries: readonly HasAttachments[]): string[] {
  const named = referencedFingerprints(entries)
  const live = new Set<string>()
  for (const e of entries) for (const r of liveRefs(e)) live.add(r.sha256)
  return [...storedKeys].filter(k => named.has(k) && !live.has(k))
}

/**
 * Space used against the mission budget. Each stored fingerprint counts once, however many
 * entries name it, and only fingerprints a live reference names count (removed ones have no
 * bytes). Level 'warn80' from 80%, 'over' from 100%.
 */
export function budgetUsage(
  entries: readonly HasAttachments[],
  sizesBySha: Readonly<Record<string, number>>,
  budgetBytes: number,
): BudgetUsage {
  const live = new Set<string>()
  for (const e of entries) for (const r of liveRefs(e)) live.add(r.sha256)
  let usedBytes = 0
  for (const sha of live) usedBytes += sizesBySha[sha] ?? 0
  const pct = budgetBytes > 0 ? (usedBytes / budgetBytes) * 100 : (usedBytes > 0 ? Infinity : 0)
  const level: BudgetLevel = pct >= 100 ? 'over' : pct >= 80 ? 'warn80' : 'ok'
  return { usedBytes, pct, level }
}

/** The short form: the first 8 and last 4 hex characters (`3f9a12c0…b71e`). */
export function formatFingerprint(sha: string): string {
  return sha.length <= 12 ? sha : `${sha.slice(0, 8)}…${sha.slice(-4)}`
}

/** One live attachment as a printout lists it: its name, the short fingerprint, and whether a thumbnail applies. */
export type PrintAttachment = { name: string, fingerprint: string, sha256: string, isImage: boolean }

/** What a print (ICS-213, ICS-309, summary) lists for an entry: each live attachment, in the entry's stable order. */
export function printAttachments(entry: HasAttachments): PrintAttachment[] {
  return liveRefs(entry).map(r => ({
    name: r.name, fingerprint: formatFingerprint(r.sha256), sha256: r.sha256, isImage: r.type.startsWith('image/'),
  }))
}

/** Bytes per megabyte: the budget setting is in MB and so is every figure shown beside it. */
export const BYTES_PER_MB = 1024 * 1024

/** "412 KB", "41 MB", "1.2 GB": short, for confirms and the budget line. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < BYTES_PER_MB) return `${Math.round(bytes / 1024)} KB`
  if (bytes < 1024 * BYTES_PER_MB) {
    const mb = bytes / BYTES_PER_MB
    return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`
  }
  return `${(bytes / (1024 * BYTES_PER_MB)).toFixed(1)} GB`
}
