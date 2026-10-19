import { diagnoseImportFile } from '../../domain/import-diagnosis'
import type { ExpectedImport, ImportDiagnosis, KnownSchemaVersions } from '../../domain/import-diagnosis'

/** How much of a file's start the diagnosis needs: zip entry names sit in the first local headers. */
export const DIAGNOSIS_HEAD_BYTES = 8192

/**
 * E-198: reads a picked file for `diagnoseImportFile()`: its first bytes, and (unless it is a zip)
 * its text. The diagnosis itself is pure (domain/import-diagnosis.ts); this is the file IO.
 */
export async function diagnoseFile(
  file: Blob, expected: ExpectedImport, known?: KnownSchemaVersions,
): Promise<ImportDiagnosis> {
  const head = new Uint8Array(await file.slice(0, DIAGNOSIS_HEAD_BYTES).arrayBuffer())
  const isZip = head.length >= 2 && head[0] === 0x50 && head[1] === 0x4B
  const text = isZip ? null : new TextDecoder('utf-8').decode(await file.arrayBuffer())
  return diagnoseImportFile(head, text, expected, known)
}

/** Bytes already in memory (a Setup file is read whole to unzip it): the same diagnosis. */
export function diagnoseBytes(bytes: Uint8Array, expected: ExpectedImport, known?: KnownSchemaVersions): ImportDiagnosis {
  const head = bytes.subarray(0, DIAGNOSIS_HEAD_BYTES)
  const isZip = head.length >= 2 && head[0] === 0x50 && head[1] === 0x4B
  return diagnoseImportFile(head, isZip ? null : new TextDecoder('utf-8').decode(bytes), expected, known)
}

/** What a Setup file import says when its diagnosis found nothing wrong but unzipping or reading it still failed. */
export const SETUP_FILE_DAMAGED_MESSAGE = 'This Setup file is damaged or cut off. Ask for a fresh copy.'

/** The same for a Report Packet that looked right but could not be read. */
export const REPORT_PACKET_DAMAGED_MESSAGE = 'This Report Packet is damaged or was edited by hand. Ask for a fresh copy.'

/** The same for a backup. */
export const BACKUP_DAMAGED_MESSAGE = 'This mission backup is damaged or was edited by hand. Ask for a fresh copy.'
