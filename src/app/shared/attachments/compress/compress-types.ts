/**
 * Smaller copies (ADR D-60 item 2, revised 2026-10-17; E-194): the small shared pieces of the
 * compressors. Nothing heavy is imported here, so the Attach UI can ask "can this be done?"
 * without loading the encoders.
 */
export type CompressKind = 'image' | 'video' | 'audio'

/** A smaller copy: the bytes, their MIME type and the file extension to name them with. */
export type CompressResult = { blob: Blob, type: string, ext: string }

export type CompressOptions = {
  /** 0 to 1. Photos are quick and report nothing; video and audio report as they go. */
  onProgress?: (fraction: number) => void
  /** Aborting stops the work and rejects with `CompressCancelledError`. */
  signal?: AbortSignal
}

/** The person pressed Cancel. Not a failure: the caller keeps the original. */
export class CompressCancelledError extends Error {
  constructor() {
    super('The smaller copy was cancelled.')
    this.name = 'CompressCancelledError'
  }
}

/** Photos: longest side, in pixels, and JPEG quality. */
export const IMAGE_MAX_EDGE = 2048
export const IMAGE_QUALITY = 0.85
/** Video: longest side in pixels, and bits per second for the picture and the sound. */
export const VIDEO_MAX_EDGE = 1280
export const VIDEO_BITRATE = 2_500_000
export const VIDEO_AUDIO_BITRATE = 96_000
/** Audio-only files are made mono at this rate. */
export const AUDIO_ONLY_BITRATE = 64_000

export function kindOf(type: string): CompressKind | undefined {
  if (type.startsWith('image/')) return 'image'
  if (type.startsWith('video/')) return 'video'
  if (type.startsWith('audio/')) return 'audio'
  return undefined
}

/** The original's name with the smaller copy's extension: `IMG_1.heic` becomes `IMG_1.jpg`. */
export function smallerName(name: string, ext: string): string {
  const dot = name.lastIndexOf('.')
  const stem = dot > 0 ? name.slice(0, dot) : name
  return `${stem}.${ext}`
}

/** A smaller copy counts only if it really is smaller; otherwise the original is kept (D-60 item 2). */
export function isActuallySmaller(copyBytes: number, originalBytes: number): boolean {
  return copyBytes > 0 && copyBytes < originalBytes
}

/** Said when the copy came out no smaller. */
export const ALREADY_SMALL_NOTE = 'This file is already small; the original was kept.'
