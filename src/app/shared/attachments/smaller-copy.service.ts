import { Injectable, signal } from '@angular/core'

import type { AttachmentRef } from '../../domain/attachments'
import { sha256Hex } from '../services/attachment-store.service'
import { canCompressFile, estimateVideoBytes } from './compress/can-compress'
import { CompressCancelledError, isActuallySmaller, kindOf, smallerName } from './compress/compress-types'

/** A smaller copy, ready to store, with the note of what it was made from (the original's fingerprint is taken first). */
export type SmallerCopy = {
  file: File
  compressed: Pick<NonNullable<AttachmentRef['compressed']>, 'fromSha256' | 'fromSize' | 'fromType'>
}

/** Why no smaller copy came back: it came out no smaller, the person cancelled, or it could not be done. */
export type SmallerCopyMiss = 'not-smaller' | 'cancelled' | 'failed'

/** The work in progress, for the progress line and its Cancel. */
export type SmallerCopyJob = { label: string, pct: number | undefined }

/**
 * Makes smaller copies of photos, video and audio (ADR D-60 item 2, revised 2026-10-17; E-194).
 * The sender uses it at Attach and the receiver from the viewer; both get the same rules.
 *
 * This service is light and sits in the main bundle: it asks `canCompressFile` (browser feature
 * checks only) and loads the encoders by dynamic `import()` the moment a copy is actually made.
 * One copy is made at a time; `job` shows it and `cancel()` stops it, with the original kept.
 * Nothing is logged but counts: names and fingerprints are confidential (rule 5).
 */
@Injectable({ providedIn: 'root' })
export class SmallerCopyService {

  private jobSignal = signal<SmallerCopyJob | null>(null)
  /** The copy being made now, or null. Video can take a while, so this carries a percentage. */
  readonly job = this.jobSignal.asReadonly()

  private abort?: AbortController

  /** Whether to show the "Smaller copy" choice for this file on this browser. */
  canOffer(file: File): Promise<boolean> {
    return canCompressFile(file)
  }

  /** "about 20 MB" worth of bytes for a video, when the browser will say how long it is. */
  estimate(file: File): Promise<number | undefined> {
    return kindOf(file.type) === 'video' ? estimateVideoBytes(file) : Promise.resolve(undefined)
  }

  /** Stops the copy being made. The caller then keeps the original. */
  cancel(): void { this.abort?.abort() }

  /**
   * Hashes `file` first (that fingerprint is what a camera-roll copy can be matched to later), makes
   * the smaller copy and checks that it really is smaller. The copy keeps the original's
   * `lastModified`, so the capture time stays. Never throws for an ordinary miss: see `SmallerCopyMiss`.
   */
  async make(file: File): Promise<SmallerCopy | SmallerCopyMiss> {
    const kind = kindOf(file.type)
    if (!kind) return 'failed'
    const abort = new AbortController()
    this.abort = abort
    this.jobSignal.set({ label: file.name, pct: undefined })
    const release = await this.keepAwake(kind !== 'image')
    try {
      const fromSha256 = await sha256Hex(await file.arrayBuffer())
      const { compress } = await import('./compress')
      const result = await compress(file, kind, {
        signal: abort.signal,
        onProgress: f => this.jobSignal.set({ label: file.name, pct: Math.round(f * 100) }),
      })
      if (!result) return 'failed'
      if (!isActuallySmaller(result.blob.size, file.size)) return 'not-smaller'
      return {
        file: new File([result.blob], smallerName(file.name, result.ext), { type: result.type, lastModified: file.lastModified }),
        compressed: { fromSha256, fromSize: file.size, fromType: file.type || 'application/octet-stream' },
      }
    } catch (e) {
      return e instanceof CompressCancelledError ? 'cancelled' : 'failed'
    } finally {
      release()
      this.jobSignal.set(null)
      this.abort = undefined
    }
  }

  /** Keeps a phone's screen on while video or audio is converted (Wake Lock, where there is one). */
  private async keepAwake(wanted: boolean): Promise<() => void> {
    if (!wanted) return () => { }
    try {
      const lock = await (navigator as any).wakeLock?.request?.('screen')
      return () => { void lock?.release?.().catch?.(() => { }) }
    } catch {
      return () => { }
    }
  }
}
