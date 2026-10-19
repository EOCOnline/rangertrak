import { liveRefs } from './attachments'
import type { AttachmentRef } from './attachments'

/**
 * The import safety copy's pure rules (E-198 phase 1, ADR D-57): when it expires, what Undo would
 * lose, and which attachment fingerprints it holds. No injection, storage or logging here; the
 * IO is `shared/services/import-safety.service.ts`.
 */

/** The RecordStore key the copy lives under (in MIGRATED_KEYS and ENCRYPTED_KEYS; ARCHITECTURE.md row 13c). */
export const IMPORT_SAFETY_KEY = 'importSafetyCopy'

/** Which import took the copy. The Report Packet and Setup file imports merge; Restore replaces. */
export type ImportSafetyReason = 'restore' | 'report-packet' | 'setup-file'

/** What is recorded beside the copy, so the card can say what the last import was. */
export type ImportSafetyMeta = {
  /** ISO time the copy was taken, just before the import changed anything. */
  takenAt: string
  reason: ImportSafetyReason
  /** The file that was imported (its name only, never its content). */
  fileName: string
  /** The app version that took the copy. */
  appVersion: string
}

/** The copy stays for 24 hours (E-198, John 2026-10-18). */
export const IMPORT_SAFETY_TTL_MS = 24 * 60 * 60 * 1000

/** True once the copy is 24 hours old (or its time cannot be read, which is treated as old). */
export function isSafetyCopyExpired(meta: Pick<ImportSafetyMeta, 'takenAt'>, now: number = Date.now()): boolean {
  const taken = Date.parse(meta.takenAt)
  if (!Number.isFinite(taken)) return true
  return now - taken >= IMPORT_SAFETY_TTL_MS
}

/** The moment the copy expires, as epoch ms (NaN when its time cannot be read). */
export function safetyCopyExpiresAt(meta: Pick<ImportSafetyMeta, 'takenAt'>): number {
  return Date.parse(meta.takenAt) + IMPORT_SAFETY_TTL_MS
}

type HasUid = { uid?: string }

/**
 * The entries on the device now that the copy does not have, by `uid`: exactly what Undo would
 * lose. An entry with no uid cannot be matched, so it counts as not in the copy (it is new).
 */
export function entriesSince<T extends HasUid>(copyEntries: readonly HasUid[], current: readonly T[]): T[] {
  const inCopy = new Set<string>()
  for (const e of copyEntries) if (e.uid) inCopy.add(e.uid)
  return current.filter(e => !e.uid || !inCopy.has(e.uid))
}

type HasAttachments = { attachments?: AttachmentRef[] }

/** The fingerprints the copy's entries name through a LIVE reference: the bytes Undo needs to keep. */
export function heldFingerprints(copyEntries: readonly HasAttachments[]): Set<string> {
  const held = new Set<string>()
  for (const e of copyEntries) for (const r of liveRefs(e)) held.add(r.sha256)
  return held
}

/**
 * The held fingerprints as a pseudo-entry the orphan and release rules already understand, so a
 * held fingerprint is "named by a live reference" for both `orphans()` and `removedOnly()`.
 */
export function holdAsEntries(held: ReadonlySet<string>): HasAttachments[] {
  if (!held.size) return []
  return [{
    attachments: [...held].map(sha256 => ({
      sha256, name: '', type: '', size: 0, addedAt: '', addedBy: '',
    })),
  }]
}

/** "14:02" style local time, for the card and the Undo confirm. */
export function clockTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return 'an unknown time'
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
}

/** The sentence the card opens with: what the last import was. */
export function describeLastImport(meta: ImportSafetyMeta): string {
  const at = clockTime(meta.takenAt)
  const file = meta.fileName ? `"${meta.fileName}"` : 'a file'
  switch (meta.reason) {
    case 'restore': return `Last import: Restore of ${file}, ${at}.`
    case 'report-packet': return `Last import: Report Packet ${file}, ${at}.`
    case 'setup-file': return `Last import: Setup file ${file}, ${at}.`
  }
}
