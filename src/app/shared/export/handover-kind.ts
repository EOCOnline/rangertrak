import { isEncryptedFile } from '../crypto/encrypted-file'
import type { EncryptedFile } from '../crypto/encrypted-file'

/**
 * E-188: recognising a hand-over file from its bytes, with no heavy imports (no fflate), so the
 * eager BackupService can use it. Re-exported from handover-file.ts.
 */

/** The envelope's plain `hint.kind` for a hand-over, so any screen can recognise one without the passphrase. */
export const HANDOVER_KIND = 'handover'

export const HANDOVER_NOT_A_BACKUP_MESSAGE =
  'This is a scribe hand-over file, not a mission backup. Merge it from Radio Log → Hand over to another scribe.'
export const LOCKED_FILE_MESSAGE =
  'This file is locked with a passphrase. Open it from Radio Log → Hand over to another scribe.'


/** Looks inside the file's bytes (not its name) for the encrypted envelope; null for a plain zip. */
export function readEnvelope(bytes: Uint8Array): EncryptedFile | null {
  // A zip starts with "PK"; the envelope is JSON text starting with "{".
  if (bytes.length < 2 || looksLikeZip(bytes)) {
    return null
  }
  try {
    const parsed = JSON.parse(new TextDecoder().decode(bytes))
    return isEncryptedFile(parsed) ? parsed : null
  } catch {
    return null
  }
}

export type OpenedBytesKind =
  | { kind: 'zip' }
  | { kind: 'encrypted-handover', envelope: EncryptedFile }
  | { kind: 'encrypted-other', envelope: EncryptedFile }
  | { kind: 'unknown' }

/** True if the bytes begin with the zip signature "PK". */
export function looksLikeZip(bytes: Uint8Array): boolean {
  return bytes.length >= 2 && bytes[0] === 0x50 && bytes[1] === 0x4b
}

/** Classifies opened file bytes (pure; no passphrase needed): plain zip, encrypted hand-over, other encrypted file. */
export function classifyOpenedBytes(bytes: Uint8Array): OpenedBytesKind {
  if (looksLikeZip(bytes)) return { kind: 'zip' }
  const envelope = readEnvelope(bytes)
  if (!envelope) return { kind: 'unknown' }
  return envelope.hint?.kind === HANDOVER_KIND
    ? { kind: 'encrypted-handover', envelope }
    : { kind: 'encrypted-other', envelope }
}

