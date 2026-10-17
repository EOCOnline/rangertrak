import { Injectable, signal } from '@angular/core'

import { formatBytes, formatFingerprint, isGone, orphans, removedOnly } from '../../domain/attachments'
import type { AttachmentRef } from '../../domain/attachments'
import { LogService } from './log.service'
import { StoragePersistenceService } from './storage-persistence.service'
// Direct import of the module-level singleton, for the same reason RangerPhotoService does it
// (see the comment on its own `recordStore` import).
import { recordStore } from '../storage/record-store'
import { decryptPhoto, encryptPhoto } from '../storage/record-encryption'

/**
 * Attachment bytes (photos, video, audio on a radio log entry), stored on THIS device only.
 * ADR D-60, E-194.
 *
 * The entry carries the reference (`AttachmentRef`, domain/attachments.ts); this holds the
 * bytes, keyed by their SHA-256, so the same file is stored once however many entries name it.
 *
 * Deliberate differences from `RangerPhotoService`, which this is modelled on:
 *
 * 1. **Nothing is loaded up front.** A mission may hold gigabytes of video. Bytes are read one
 *    at a time (`getOriginal`) when the viewer shows them, and lists use the small stored
 *    thumbnails (`getThumb`), only for entries on screen. Do not copy `loadAll()`.
 * 2. **This store never alters bytes.** The fingerprint is taken over the bytes exactly as the
 *    `File` gave them, and they are stored exactly as given: no downscale, no re-encode, EXIF
 *    and GPS included. Only the thumbnail goes through a canvas, so only it is EXIF-free. A
 *    smaller copy (D-60 item 2, revised) is made BEFORE it gets here, by `SmallerCopyService`,
 *    and arrives as an ordinary file with its own fingerprint.
 * 3. **The one place bytes are deleted is `sweepOrphans()`**, which asks `orphans()` (domain).
 *    `remove()` is its low-level helper, not a second rule.
 *
 * Encryption at rest (D-51) uses the same record shape and helpers as the photos: `encryptAll()`
 * and `decryptAll()` are the Enable/Disable halves of Mission > Data safety, in the same order
 * as the photos. Accepted limitation: the store's keys are plaintext fingerprints.
 *
 * Confidential content (rule 5): this service logs counts only, never names, fingerprints or
 * payloads.
 */

// Exported for unlock-form.ts's "Forgot it" flow, which erases the database directly before
// any injector exists (same reason as RANGER_PHOTOS_DB_NAME).
export const ATTACHMENTS_DB_NAME = 'rangertrak-attachments'
const DB_VERSION = 1
const ORIGINALS = 'originals'
const THUMBS = 'thumbs'
type StoreName = typeof ORIGINALS | typeof THUMBS

/** Longest thumbnail edge, in pixels. */
const THUMB_EDGE = 240
const THUMB_QUALITY = 0.7

/** What a plain record looks like in either object store. `size` is the ORIGINAL's byte length. */
interface PlainRecord {
  blob: Blob
  type: string
  size: number
}

/** The encrypted counterpart: the same shape RangerPhotoService stores, plus the size. */
interface EncryptedRecord {
  encrypted: true
  iv: Uint8Array<ArrayBuffer>
  mime: string
  data: ArrayBuffer
  size: number
}

function isEncryptedRecord(value: unknown): value is EncryptedRecord {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return v['encrypted'] === true && v['data'] instanceof ArrayBuffer && v['iv'] instanceof Uint8Array
}

function isPlainRecord(value: unknown): value is PlainRecord {
  if (typeof value !== 'object' || value === null) return false
  return (value as Record<string, unknown>)['blob'] instanceof Blob
}

/** The bytes did not hash to the fingerprint they were presented under. Nothing was stored. */
export class FingerprintMismatchError extends Error {
  constructor(public readonly expected: string) {
    super('The file does not match its fingerprint.')
    this.name = 'FingerprintMismatchError'
  }
}

/** The browser's storage quota cannot take the file. Said plainly to the operator. */
export class AttachmentQuotaError extends Error {
  constructor() {
    super('This device has no room left in browser storage for that file.')
    this.name = 'AttachmentQuotaError'
  }
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer), b => b.toString(16).padStart(2, '0')).join('')
}

/** SHA-256 of these bytes, lowercase hex. Needs a secure context (`crypto.subtle`). */
export async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  return toHex(await crypto.subtle.digest('SHA-256', bytes))
}

@Injectable({ providedIn: 'root' })
export class AttachmentStoreService {

  private id = 'Attachment Store Service'
  private db?: IDBDatabase
  private ready: Promise<void>

  /** fingerprint -> original byte length. Filled on first `sizes()`, kept current after. */
  private sizeCache?: Map<string, number>

  /** fingerprint -> object URL of the stored thumbnail, so a list never re-reads or re-creates it. */
  private thumbUrls = new Map<string, string>()

  private changesSignal = signal(0)
  /** Bumps whenever bytes are added or removed, so budgets and chips can refresh. */
  readonly changes = this.changesSignal.asReadonly()

  constructor(private log: LogService, private persistence: StoragePersistenceService) {
    this.ready = this.open()
      .catch(e => this.log.warn(`Attachments unavailable on this device: ${e?.message ?? e}`, this.id))
  }

  whenReady(): Promise<void> { return this.ready }

  /**
   * Whether a fingerprint can be taken here. `crypto.subtle` needs a secure context; there is no
   * JavaScript fallback on purpose, because an unverifiable fingerprint is worse than none.
   */
  canFingerprint(): boolean {
    return typeof crypto !== 'undefined' && !!crypto.subtle && typeof indexedDB !== 'undefined'
  }

  /** The plain reason Attach is off, or '' when it is available. */
  unavailableReason(): string {
    if (typeof indexedDB === 'undefined') return 'This browser cannot store files on this device.'
    if (typeof crypto === 'undefined' || !crypto.subtle) {
      return 'Attachments need a secure connection (https) so each file can be fingerprinted.'
    }
    return ''
  }

  /**
   * Hashes the file, stores the original unchanged and its thumbnail, and returns the reference
   * for the entry to carry. `addedBy` is the operator, as on the entry (D-44). An original
   * already stored (same fingerprint) is not written twice.
   */
  async add(file: File, addedBy: string): Promise<AttachmentRef> {
    await this.ready
    if (!this.db) throw new Error('attachment store not open')
    if (!this.canFingerprint()) throw new Error(this.unavailableReason())
    // Most browsers grant this silently; asked at app start too, so this is a cheap second chance.
    if (this.persistence.persisted() !== true) void this.persistence.requestPersistence().catch(() => { })

    const bytes = await file.arrayBuffer()
    const sha256 = await sha256Hex(bytes)
    const type = file.type || 'application/octet-stream'
    await this.storeVerified(sha256, file, bytes, type)

    this.log.info('Stored 1 attachment on this device.', this.id)
    return {
      sha256,
      name: file.name,
      type,
      size: file.size,
      ...(file.lastModified ? { capturedAt: new Date(file.lastModified).toISOString() } : {}),
      addedAt: new Date().toISOString(),
      addedBy,
    }
  }

  /**
   * Stores bytes that arrive from a file someone moved (backup zip, hand-over). Re-hashes them:
   * a mismatch throws `FingerprintMismatchError` and stores nothing, never a "close enough".
   */
  async putVerified(sha256: string, bytes: ArrayBuffer | Uint8Array, type: string): Promise<void> {
    await this.ready
    if (!this.db) throw new Error('attachment store not open')
    const buffer = bytes instanceof Uint8Array
      ? bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
      : bytes
    const actual = await sha256Hex(buffer)
    if (actual !== sha256.toLowerCase()) throw new FingerprintMismatchError(sha256)
    const mime = type || 'application/octet-stream'
    await this.storeVerified(actual, new Blob([buffer], { type: mime }), buffer, mime)
  }

  async has(sha256: string): Promise<boolean> {
    await this.ready
    if (!this.db) return false
    return (await this.tx<number>(ORIGINALS, 'readonly', s => s.count(sha256))) > 0
  }

  /** The original, exactly as stored. Throws when there are no bytes here. */
  async getOriginal(sha256: string): Promise<Blob> {
    const blob = await this.read(ORIGINALS, sha256)
    if (!blob) throw new Error('attachment bytes are not on this device')
    return blob
  }

  async getThumb(sha256: string): Promise<Blob | undefined> {
    return this.read(THUMBS, sha256)
  }

  /** An object URL for the thumbnail, made once and kept until the bytes go. '' when none. */
  async thumbUrl(sha256: string): Promise<string> {
    const known = this.thumbUrls.get(sha256)
    if (known) return known
    const blob = await this.getThumb(sha256)
    if (!blob) return ''
    const raced = this.thumbUrls.get(sha256)
    if (raced) return raced
    const url = URL.createObjectURL(blob)
    this.thumbUrls.set(sha256, url)
    return url
  }

  /** Every stored fingerprint and its original byte length. */
  async sizes(): Promise<Record<string, number>> {
    await this.ready
    if (!this.sizeCache) {
      const cache = new Map<string, number>()
      if (this.db) {
        await new Promise<void>((resolve, reject) => {
          const req = this.db!.transaction(ORIGINALS, 'readonly').objectStore(ORIGINALS).openCursor()
          req.onsuccess = () => {
            const cursor = req.result
            if (!cursor) { resolve(); return }
            const v = cursor.value as PlainRecord | EncryptedRecord
            cache.set(String(cursor.key), typeof v.size === 'number' ? v.size : 0)
            cursor.continue()
          }
          req.onerror = () => reject(req.error)
        })
      }
      this.sizeCache = cache
    }
    return Object.fromEntries(this.sizeCache)
  }

  /** Deletes the bytes and the thumbnail for one fingerprint. Callers decide WHEN: see sweepOrphans(). */
  async remove(sha256: string): Promise<void> {
    await this.ready
    if (!this.db) return
    await this.txMulti([ORIGINALS, THUMBS], s => { s.delete(sha256) })
    this.forget(sha256)
    this.bump()
  }

  /**
   * THE rule for deleting bytes (D-60 item 8): deletes every stored fingerprint that no
   * reference on the device names, live or removed. Run after a removal and after anything that
   * replaces the entries. Logs the count only. Returns how many fingerprints went.
   */
  async sweepOrphans(entries: readonly Pick<AttachmentHolder, 'attachments'>[]): Promise<number> {
    await this.ready
    if (!this.db) return 0
    const keys = new Set<string>([
      ...(await this.tx<IDBValidKey[]>(ORIGINALS, 'readonly', s => s.getAllKeys())).map(String),
      ...(await this.tx<IDBValidKey[]>(THUMBS, 'readonly', s => s.getAllKeys())).map(String),
    ])
    const gone = orphans(keys, entries)
    if (!gone.length) return 0
    await this.txMulti([ORIGINALS, THUMBS], s => { for (const sha of gone) s.delete(sha) })
    for (const sha of gone) this.forget(sha)
    this.bump()
    this.log.info(`Removed ${gone.length} attachments nothing refers to from this device.`, this.id)
    return gone.length
  }

  /**
   * D-60 item 5, "the bytes go, the reference stays": deletes the bytes only REMOVED references
   * still name (nothing live wants them). Run after a person removes an attachment and after a
   * merge brings a removal in. A fingerprint with no reference at all is sweepOrphans()'s.
   * Logs the count only. Returns how many fingerprints went.
   */
  async releaseRemoved(entries: readonly Pick<AttachmentHolder, 'attachments'>[]): Promise<number> {
    await this.ready
    if (!this.db) return 0
    const keys = (await this.tx<IDBValidKey[]>(ORIGINALS, 'readonly', s => s.getAllKeys())).map(String)
    const gone = removedOnly(keys, entries)
    if (!gone.length) return 0
    await this.txMulti([ORIGINALS, THUMBS], s => { for (const sha of gone) s.delete(sha) })
    for (const sha of gone) this.forget(sha)
    this.bump()
    this.log.info(`Deleted ${gone.length} removed attachments' bytes from this device.`, this.id)
    return gone.length
  }

  /**
   * Stores bytes that arrived in a file someone moved (a backup's companion zip, a hand-over's
   * `attachments/` folder) for the references these entries carry. Only a fingerprint a LIVE
   * reference names is stored; the rest is counted as unreferenced and ignored, so a stray file
   * can never become an orphan. Every file is re-hashed (`putVerified`): a mismatch is listed
   * by name in the result and nothing is stored for it. Returns counts and the mismatched names;
   * logs counts only.
   */
  async restoreVerified(
    files: readonly { sha256: string, name?: string, type?: string, bytes: Uint8Array }[],
    entries: readonly Pick<AttachmentHolder, 'attachments'>[],
  ): Promise<{ stored: number, alreadyHere: number, unreferenced: number, mismatched: string[] }> {
    const refs = new Map<string, AttachmentRef>()
    for (const e of entries) for (const r of e.attachments ?? []) if (!isGone(r) && !refs.has(r.sha256)) refs.set(r.sha256, r)
    let stored = 0
    let alreadyHere = 0
    let unreferenced = 0
    const mismatched: string[] = []
    for (const file of files) {
      const ref = refs.get(file.sha256)
      if (!ref) { unreferenced++; continue }
      if (await this.has(file.sha256)) { alreadyHere++; continue }
      try {
        await this.putVerified(file.sha256, file.bytes, ref.type || file.type || '')
        stored++
      } catch (e) {
        if (e instanceof FingerprintMismatchError) mismatched.push(ref.name || file.name || formatFingerprint(file.sha256))
        else throw e
      }
    }
    this.log.info(`Restored ${stored} attachments to this device; ${mismatched.length} did not match their fingerprint.`, this.id)
    return { stored, alreadyHere, unreferenced, mismatched }
  }

  /** How many attachments and bytes a sweep would delete if these entries replaced the current ones. */
  async wouldSweep(entries: readonly Pick<AttachmentHolder, 'attachments'>[]): Promise<{ count: number, bytes: number }> {
    const sizes = await this.sizes()
    const gone = orphans(Object.keys(sizes), entries)
    return { count: gone.length, bytes: gone.reduce((sum, sha) => sum + (sizes[sha] ?? 0), 0) }
  }

  /**
   * The line a destructive confirm adds when attachments exist: "This also deletes N
   * attachments (X MB) from this device." '' when none would go. `replacement` is the
   * entries the device will hold afterward (empty for a clear).
   */
  async deletionNotice(replacement: readonly Pick<AttachmentHolder, 'attachments'>[]): Promise<string> {
    const { count, bytes } = await this.wouldSweep(replacement)
    if (!count) return ''
    return `\n\nThis also deletes ${count} attachment${count === 1 ? '' : 's'} (${formatBytes(bytes)}) from this device.`
  }

  /**
   * Whether the browser's quota can take `bytes` more. True when the browser will not say:
   * the quota is a hard limit only when it is known to be one.
   */
  async hasRoomFor(bytes: number): Promise<boolean> {
    try {
      const { usage, quota } = await navigator.storage.estimate()
      if (typeof usage !== 'number' || typeof quota !== 'number') return true
      return usage + bytes <= quota
    } catch {
      return true
    }
  }

  // ── encryption at rest (D-51) ─────────────────────────────────────────

  /**
   * Re-encrypts every stored original and thumbnail under `key` - the Enable half of Mission >
   * Data safety, in the same order as `RangerPhotoService.encryptAll()`. Attempts every record,
   * then THROWS if any failed, so the caller cannot report "encryption is on" while a file
   * stayed in the clear. Reads from IndexedDB one record at a time.
   */
  async encryptAll(key: CryptoKey): Promise<void> {
    await this.ready
    if (!this.db) return
    let done = 0
    let failures = 0
    for (const store of [ORIGINALS, THUMBS] as const) {
      const keys = await this.tx<IDBValidKey[]>(store, 'readonly', s => s.getAllKeys())
      for (const k of keys) {
        try {
          const value = await this.tx<unknown>(store, 'readonly', s => s.get(k))
          if (!isPlainRecord(value)) continue
          const record = await this.toEncryptedRecord(key, value.blob, value.size)
          await this.tx(store, 'readwrite', s => s.put(record, k))
          done++
        } catch (e: any) {
          this.log.error(`Could not encrypt a stored attachment: ${e?.message ?? e}`, this.id)
          failures++
        }
      }
    }
    this.log.warn(`Encrypted ${done} stored attachment records on this device.`, this.id)
    if (failures) {
      throw new Error(`could not encrypt ${failures} attachment file(s); `
        + `they remain unencrypted on this device. Turn encryption off and on again to retry.`)
    }
  }

  /**
   * Reverses encryptAll(), the Disable half. Called with the verified key BEFORE
   * `RecordStore.disableEncryption()`, and THROWS on any failure, for the reason
   * `RangerPhotoService.decryptAll()` gives: a file left encrypted would be stranded the moment
   * the key goes.
   */
  async decryptAll(key: CryptoKey): Promise<void> {
    await this.ready
    if (!this.db) return
    let done = 0
    let failures = 0
    for (const store of [ORIGINALS, THUMBS] as const) {
      const keys = await this.tx<IDBValidKey[]>(store, 'readonly', s => s.getAllKeys())
      for (const k of keys) {
        try {
          const value = await this.tx<unknown>(store, 'readonly', s => s.get(k))
          if (!isEncryptedRecord(value)) continue
          const plaintext = await decryptPhoto(key, value.iv, value.data)
          const record: PlainRecord = { blob: new Blob([plaintext], { type: value.mime }), type: value.mime, size: value.size }
          await this.tx(store, 'readwrite', s => s.put(record, k))
          done++
        } catch (e: any) {
          this.log.error(`Could not decrypt a stored attachment while disabling encryption: ${e?.message ?? e}`, this.id)
          failures++
        }
      }
    }
    this.log.warn(`Decrypted ${done} stored attachment records on this device.`, this.id)
    if (failures) {
      throw new Error(`could not decrypt ${failures} attachment file(s); `
        + `they are still encrypted and encryption was not turned off.`)
    }
  }

  // ── internals ────────────────────────────────────────────────────────

  private async storeVerified(sha256: string, original: Blob, bytes: ArrayBuffer, type: string): Promise<void> {
    try {
      if (!(await this.has(sha256))) {
        await this.put(ORIGINALS, sha256, original, type, bytes.byteLength)
      }
      // A thumbnail missing for a stored image (an earlier failure) is made again here.
      if (type.startsWith('image/') && (await this.getThumb(sha256)) === undefined) {
        const thumb = await this.makeThumb(original)
        if (thumb) await this.put(THUMBS, sha256, thumb, thumb.type, bytes.byteLength)
      }
    } catch (e: any) {
      if (e?.name === 'QuotaExceededError') throw new AttachmentQuotaError()
      throw e
    }
    this.sizeCache?.set(sha256, bytes.byteLength)
    this.bump()
  }

  /** Writes one record, encrypted when this session holds a key. `size` is the ORIGINAL's length. */
  private async put(store: StoreName, sha256: string, blob: Blob, type: string, size: number): Promise<void> {
    const key = recordStore.getEncryptionKey()
    const record: PlainRecord | EncryptedRecord = key
      ? await this.toEncryptedRecord(key, blob, size)
      : { blob, type, size }
    await this.tx(store, 'readwrite', s => s.put(record, sha256))
  }

  private async toEncryptedRecord(key: CryptoKey, blob: Blob, size: number): Promise<EncryptedRecord> {
    const { iv, ciphertext } = await encryptPhoto(key, await blob.arrayBuffer())
    return { encrypted: true, iv, mime: blob.type || 'application/octet-stream', data: ciphertext, size }
  }

  private async read(store: StoreName, sha256: string): Promise<Blob | undefined> {
    await this.ready
    if (!this.db) return undefined
    const value = await this.tx<unknown>(store, 'readonly', s => s.get(sha256))
    if (isPlainRecord(value)) return value.blob
    if (!isEncryptedRecord(value)) return undefined
    const key = recordStore.getEncryptionKey()
    if (!key) throw new Error('attachment is encrypted and no key is available this session')
    return new Blob([await decryptPhoto(key, value.iv, value.data)], { type: value.mime })
  }

  /**
   * A small JPEG for lists and prints. Drawn through a canvas, so it carries no EXIF (the
   * original keeps its own). Undefined when the browser cannot decode the image (a HEIC it
   * does not support, say): the UI then shows a type icon, and the original is untouched.
   */
  private async makeThumb(file: Blob): Promise<Blob | undefined> {
    try {
      const bitmap = await createImageBitmap(file)
      const scale = Math.min(1, THUMB_EDGE / Math.max(bitmap.width, bitmap.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(bitmap.width * scale))
      canvas.height = Math.max(1, Math.round(bitmap.height * scale))
      const ctx = canvas.getContext('2d')
      if (!ctx) { bitmap.close?.(); return undefined }
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
      bitmap.close?.()
      return (await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/jpeg', THUMB_QUALITY))) ?? undefined
    } catch {
      return undefined
    }
  }

  private forget(sha256: string): void {
    this.sizeCache?.delete(sha256)
    const url = this.thumbUrls.get(sha256)
    if (url) { URL.revokeObjectURL(url); this.thumbUrls.delete(sha256) }
  }

  private bump(): void { this.changesSignal.update(n => n + 1) }

  private open(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') { reject(new Error('no IndexedDB')); return }
      const req = indexedDB.open(ATTACHMENTS_DB_NAME, DB_VERSION)
      req.onupgradeneeded = () => {
        const db = req.result
        for (const name of [ORIGINALS, THUMBS]) {
          if (!db.objectStoreNames.contains(name)) db.createObjectStore(name)
        }
      }
      req.onsuccess = () => { this.db = req.result; resolve() }
      req.onerror = () => reject(req.error)
    })
  }

  /** Resolves on `transaction.oncomplete`, for the reason RangerPhotoService.tx() gives. */
  private tx<T>(store: StoreName, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.db) { reject(new Error('attachment store not open')); return }
      const transaction = this.db.transaction(store, mode)
      const req = fn(transaction.objectStore(store))
      let result: T
      req.onsuccess = () => { result = req.result }
      req.onerror = () => reject(req.error)
      transaction.oncomplete = () => resolve(result)
      transaction.onabort = () => reject(transaction.error ?? req.error ?? new Error('attachment store transaction aborted'))
      transaction.onerror = () => reject(transaction.error ?? req.error ?? new Error('attachment store transaction error'))
    })
  }

  /** One readwrite transaction over several stores, so originals and thumbnails go together. */
  private txMulti(stores: StoreName[], fn: (s: IDBObjectStore) => void): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) { reject(new Error('attachment store not open')); return }
      const transaction = this.db.transaction(stores, 'readwrite')
      for (const name of stores) fn(transaction.objectStore(name))
      transaction.oncomplete = () => resolve()
      transaction.onabort = () => reject(transaction.error ?? new Error('attachment store transaction aborted'))
      transaction.onerror = () => reject(transaction.error ?? new Error('attachment store transaction error'))
    })
  }
}

/** Anything that carries references: a radio log entry. */
type AttachmentHolder = { attachments?: AttachmentRef[] }
