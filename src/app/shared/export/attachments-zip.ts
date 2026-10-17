import { unzipSync, zipSync, Zippable } from 'fflate'

/**
 * Attachment bytes in a zip (ADR D-60 item 6, E-194): the layout shared by the backup companion
 * file (`rangertrak-<mission>-<date>-attachments.zip`) and the hand-over file's `attachments/`
 * folder. Files sit at `attachments/<sha256><ext>`, STORED not compressed (`level: 0`): photos,
 * video and audio are already compressed, and compressing them again costs time on a phone for
 * nothing. The name carries the fingerprint, so a reader never has to trust a manifest to know
 * which bytes are which, and re-hashes them anyway.
 *
 * Pure bytes in, bytes out (D-57 in spirit): no storage, no DOM, no logging. Built and read in
 * memory, which is fine desk to desk; the commit message records the largest size tested.
 */

export const ATTACHMENTS_DIR = 'attachments'
/** The backup companion's small index of references by fingerprint. */
export const ATTACHMENTS_INDEX = 'attachments.json'
/** `hint.kind` of the encrypted envelope around the companion zip, so it is told apart from an encrypted backup. */
export { ATTACHMENTS_KIND } from './handover-kind'

export type AttachmentFile = {
  sha256: string
  name: string
  type: string
  bytes: Uint8Array
}

const EXTENSION_BY_TYPE: Record<string, string> = {
  'image/jpeg': '.jpg', 'image/png': '.png', 'image/gif': '.gif', 'image/webp': '.webp', 'image/heic': '.heic',
  'video/mp4': '.mp4', 'video/quicktime': '.mov', 'video/webm': '.webm',
  'audio/mpeg': '.mp3', 'audio/mp4': '.m4a', 'audio/wav': '.wav', 'audio/x-wav': '.wav', 'audio/ogg': '.ogg', 'audio/webm': '.weba',
}

const TYPE_BY_EXTENSION: Record<string, string> = Object.fromEntries(
  Object.entries(EXTENSION_BY_TYPE).map(([type, ext]) => [ext, type]))

const SHA256_HEX = /^[0-9a-f]{64}$/

/** The extension a stored file gets: its own name's, else one for its type, else none. */
function extensionFor(name: string, type: string): string {
  const own = name.match(/\.[A-Za-z0-9]{1,8}$/)?.[0]?.toLowerCase()
  return own ?? EXTENSION_BY_TYPE[type] ?? ''
}

/** Where a file lives in the zip: `attachments/<sha256><ext>`. */
export function attachmentPath(sha256: string, name: string, type: string): string {
  return `${ATTACHMENTS_DIR}/${sha256}${extensionFor(name, type)}`
}

/** The zip entries for these files, each stored without compression. */
export function attachmentZipEntries(files: readonly AttachmentFile[]): Zippable {
  const out: Zippable = {}
  for (const f of files) out[attachmentPath(f.sha256, f.name, f.type)] = [f.bytes, { level: 0 }]
  return out
}

/**
 * Pulls the attachment files out of an unzipped archive: everything under `attachments/` whose
 * file name is a 64-hex fingerprint plus an optional extension. `type` is a best guess from the
 * extension (the caller prefers the type its own references carry).
 */
export function attachmentsFromUnzipped(entries: Record<string, Uint8Array>): { sha256: string, type: string, bytes: Uint8Array }[] {
  const out: { sha256: string, type: string, bytes: Uint8Array }[] = []
  for (const [path, bytes] of Object.entries(entries)) {
    const parts = path.split(/[/\\]/)
    if (parts.length < 2 || parts[parts.length - 2] !== ATTACHMENTS_DIR) continue
    const file = parts[parts.length - 1]
    const dot = file.lastIndexOf('.')
    const stem = (dot > 0 ? file.slice(0, dot) : file).toLowerCase()
    if (!SHA256_HEX.test(stem)) continue
    out.push({ sha256: stem, type: TYPE_BY_EXTENSION[dot > 0 ? file.slice(dot).toLowerCase() : ''] ?? 'application/octet-stream', bytes })
  }
  return out
}

/** True for a path inside the attachments folder (so the photo reader can leave it alone). */
export function isAttachmentPath(path: string): boolean {
  const parts = path.split(/[/\\]/)
  return parts.length >= 2 && parts[parts.length - 2] === ATTACHMENTS_DIR
}

/** The backup companion: `attachments/<sha><ext>` for each file plus a small `attachments.json`. */
export function buildAttachmentsZipBytes(files: readonly AttachmentFile[], exportedAt: string): Uint8Array {
  const index = {
    schemaVersion: 1,
    exportedAt,
    files: Object.fromEntries(files.map(f => [f.sha256, { name: f.name, type: f.type, size: f.bytes.length }])),
  }
  return zipSync({
    ...attachmentZipEntries(files),
    [ATTACHMENTS_INDEX]: new TextEncoder().encode(JSON.stringify(index, null, 2)),
  })
}

export type AttachmentsZip = {
  files: { sha256: string, name: string, type: string, bytes: Uint8Array }[]
}

/**
 * Reads a backup companion. Throws a message meant to be shown (same convention as
 * `extractMissionZip`). Names and types come from `attachments.json` when it has the
 * fingerprint, else the file name's own extension; nothing is trusted: the caller re-hashes.
 */
export function readAttachmentsZip(bytes: Uint8Array): AttachmentsZip {
  let entries: Record<string, Uint8Array>
  try {
    entries = unzipSync(bytes)
  } catch (error: any) {
    throw new Error(`Could not read this file as a zip (${error.message}).`)
  }
  if (Object.keys(entries).some(k => /(^|[/\\])mission-zip\.json$/.test(k))) {
    throw new Error('This is a Setup or hand-over file, not an attachments file. Merge it from Radio Log → Hand over to another scribe.')
  }

  let index: { files?: Record<string, { name?: string, type?: string }> } = {}
  const indexKey = Object.keys(entries).find(k => /(^|[/\\])attachments\.json$/.test(k))
  if (indexKey) {
    try { index = JSON.parse(new TextDecoder().decode(entries[indexKey])) } catch { /* the file names still say what is what */ }
  }

  const files = attachmentsFromUnzipped(entries).map(f => ({
    sha256: f.sha256,
    name: index.files?.[f.sha256]?.name ?? f.sha256,
    type: index.files?.[f.sha256]?.type ?? f.type,
    bytes: f.bytes,
  }))
  if (!files.length) throw new Error('This zip holds no attachments.')
  return { files }
}
