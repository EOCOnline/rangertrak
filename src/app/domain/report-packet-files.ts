import { liveRefs } from './attachments'
import type { AttachmentRef } from './attachments'

/**
 * Report Packet with files (ADR D-60 item 6, E-114): the pure rules for sharing a packet's
 * originals beside its `.txt`, and for matching loose files back to the references a merged
 * packet brought in. No file access, no storage (D-57).
 *
 * The `.txt` carries references only; the bytes travel as separate files in the same share
 * sheet. A file arriving later is trusted for nothing but its SHA-256: it is stored only when
 * that matches a live reference on this device, so a stray or swapped file can't enter a mission.
 */

/** Said when the share sheet would not take the photos along with the text. */
export const PHOTOS_LEFT_OUT_MESSAGE = 'Photos weren’t included: send them separately, or use a Hand-over file.'

/** Each distinct fingerprint once, from the entries' live references. First reference wins. */
export function distinctLiveRefs(entries: readonly { attachments?: AttachmentRef[] }[]): AttachmentRef[] {
  const seen = new Map<string, AttachmentRef>()
  for (const e of entries) for (const r of liveRefs(e)) if (!seen.has(r.sha256)) seen.set(r.sha256, r)
  return [...seen.values()]
}

/**
 * File names for the share, unique within it: two different photos can both be called IMG_0001.jpg
 * on a phone. A clash gets the first eight characters of its fingerprint before the extension.
 */
export function shareNames(refs: readonly AttachmentRef[]): Map<string, string> {
  const out = new Map<string, string>()
  const taken = new Set<string>()
  for (const r of refs) {
    let name = r.name || 'attachment'
    if (taken.has(name.toLowerCase())) {
      const dot = name.lastIndexOf('.')
      const tag = r.sha256.slice(0, 8)
      name = dot > 0 ? `${name.slice(0, dot)}-${tag}${name.slice(dot)}` : `${name}-${tag}`
    }
    taken.add(name.toLowerCase())
    out.set(r.sha256, name)
  }
  return out
}

export type SharePlan = 'with-files' | 'text-only' | 'cannot-share'

/**
 * What to hand the share sheet. `canShare` is `navigator.canShare` (or absent). The text on its
 * own is tried when the whole set is refused (size or type), and the caller then says the photos
 * were left out.
 */
export function planShare<F>(
  canShare: ((data: { files: F[] }) => boolean) | undefined, text: F, media: readonly F[],
): SharePlan {
  if (typeof canShare !== 'function') return 'cannot-share'
  if (media.length && canShare({ files: [text, ...media] })) return 'with-files'
  if (canShare({ files: [text] })) return media.length ? 'text-only' : 'with-files'
  return 'cannot-share'
}

export type IncomingFile = { name: string, sha256: string }

export type MediaMatch = { matched: IncomingFile[], unmatched: IncomingFile[] }

/** Splits incoming files by whether a live reference on this device names their fingerprint. */
export function matchMedia(files: readonly IncomingFile[], liveShas: ReadonlySet<string>): MediaMatch {
  const matched: IncomingFile[] = []
  const unmatched: IncomingFile[] = []
  for (const f of files) (liveShas.has(f.sha256.toLowerCase()) ? matched : unmatched).push(f)
  return { matched, unmatched }
}

/** How many of the packet's live references have no bytes on this device. */
export function stillRemote(refs: readonly AttachmentRef[], heldShas: ReadonlySet<string>): number {
  return refs.filter(r => !heldShas.has(r.sha256)).length
}

/** The summary shown after loading a packet and/or its files. Lines with nothing to say are left out. */
export function mediaSummary(r: { added: number, unmatched: number, remote: number }): string[] {
  const lines: string[] = []
  if (r.added) lines.push(`${r.added} attachment${r.added === 1 ? '' : 's'} added.`)
  if (r.unmatched) lines.push(`${r.unmatched} file${r.unmatched === 1 ? '' : 's'} didn’t match any entry (not stored).`)
  if (r.remote) lines.push(`${r.remote} attachment${r.remote === 1 ? ' is' : 's are'} still on the ranger’s phone.`)
  return lines
}
