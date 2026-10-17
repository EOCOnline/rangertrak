import { CompressCancelledError, IMAGE_MAX_EDGE, IMAGE_QUALITY } from './compress-types'
import type { CompressOptions, CompressResult } from './compress-types'

/**
 * A photo, redrawn through a canvas: longest side at most 2048 px, JPEG at quality 0.85. The canvas
 * carries none of the photo's own EXIF or location data, which is part of what the sender is told.
 * EXIF orientation is applied while decoding, so a phone photo is not turned on its side.
 * Null when the browser cannot decode the file (HEIC on Chrome, say).
 */
export async function compressImage(file: Blob, options: CompressOptions = {}): Promise<CompressResult | null> {
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    return null
  }
  try {
    if (options.signal?.aborted) throw new CompressCancelledError()
    const scale = Math.min(1, IMAGE_MAX_EDGE / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    // JPEG has no transparency: a transparent PNG would turn black without this.
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', IMAGE_QUALITY))
    return blob ? { blob, type: 'image/jpeg', ext: 'jpg' } : null
  } finally {
    bitmap.close?.()
  }
}
