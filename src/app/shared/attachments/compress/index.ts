import { CompressCancelledError, kindOf } from './compress-types'
import type { CompressKind, CompressOptions, CompressResult } from './compress-types'

export { CompressCancelledError, downloadName, smallerName } from './compress-types'
export type { CompressKind, CompressOptions, CompressResult } from './compress-types'

/**
 * The one entry point for smaller copies (ADR D-60 item 2, revised; E-194). Loaded by a dynamic
 * `import()` only when someone makes one, so none of it is in the initial bundle. Photos stay
 * here; video and audio load Mediabunny as a further chunk of their own.
 *
 * Null means it could not be done (an undecodable file, an unsupported encoder): the caller keeps
 * the original. Whether the result is actually smaller is the caller's to check.
 */
export async function compress(file: Blob, kind: CompressKind | undefined, options: CompressOptions = {}): Promise<CompressResult | null> {
  const k = kind ?? kindOf(file.type)
  if (options.signal?.aborted) throw new CompressCancelledError()
  if (k === 'image') return (await import('./image')).compressImage(file, options)
  if (k === 'video' || k === 'audio') return (await import('./media')).compressMedia(file, options)
  return null
}
