import { AUDIO_ONLY_BITRATE, VIDEO_AUDIO_BITRATE, VIDEO_BITRATE, VIDEO_MAX_EDGE, kindOf } from './compress-types'

/**
 * Whether a smaller copy can be made here, so the offer is hidden where it cannot work (D-60 item
 * 2: where a browser can't do it, the offer isn't shown). Cheap: it asks the browser's own
 * WebCodecs `isConfigSupported` and imports nothing heavy, so it can sit in the main bundle.
 *
 * Photos need only `createImageBitmap` and a canvas. Video needs an H.264 encoder and a sound
 * encoder (AAC, or Opus where AAC is missing); audio needs the sound encoder. The globals are read
 * at call time, so a test can stand in for the browser.
 */
export async function canCompress(type: string): Promise<boolean> {
  const kind = kindOf(type)
  if (kind === 'image') return typeof createImageBitmap === 'function' && typeof document !== 'undefined'
  if (kind === 'audio') return (await soundChoice(AUDIO_ONLY_BITRATE, 1)) !== undefined
  if (kind === 'video') return (await videoSupported()) && (await soundChoice(VIDEO_AUDIO_BITRATE, 2)) !== undefined
  return false
}

/** Image types the browser always decodes; any other (HEIC, say) is tried once before it is offered. */
const SURE_IMAGES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']

/** `canCompress` for a real file: an unusual photo type is decoded once, and the offer is hidden if that fails. */
export async function canCompressFile(file: Blob): Promise<boolean> {
  if (!(await canCompress(file.type))) return false
  if (kindOf(file.type) !== 'image' || SURE_IMAGES.includes(file.type)) return true
  try {
    const bitmap = await createImageBitmap(file)
    bitmap.close?.()
    return true
  } catch {
    return false
  }
}

async function videoSupported(): Promise<boolean> {
  const Encoder = (globalThis as any).VideoEncoder
  if (!Encoder?.isConfigSupported) return false
  try {
    const r = await Encoder.isConfigSupported({
      codec: 'avc1.4d401f', width: VIDEO_MAX_EDGE, height: 720, bitrate: VIDEO_BITRATE,
    })
    return !!r?.supported
  } catch {
    return false
  }
}

export type SoundChoice = { codec: 'aac' | 'opus', bitrate: number }

/**
 * The sound encodings this browser reports it can do, best first: AAC at the wanted rate; else AAC
 * at 96 kbps or more (some browsers' AAC encoders have no step lower than that); then Opus at the
 * wanted rate. "About 96 kbps" is the target, not a promise. Empty when it can encode neither.
 */
export async function soundChoices(bitrate: number, channels: number): Promise<SoundChoice[]> {
  const Encoder = (globalThis as any).AudioEncoder
  if (!Encoder?.isConfigSupported) return []
  const tries = [
    { codec: 'aac' as const, id: 'mp4a.40.2', bitrate },
    { codec: 'aac' as const, id: 'mp4a.40.2', bitrate: Math.max(bitrate, VIDEO_AUDIO_BITRATE) },
    { codec: 'opus' as const, id: 'opus', bitrate },
  ]
  const out: SoundChoice[] = []
  for (const t of tries) {
    try {
      const r = await Encoder.isConfigSupported({ codec: t.id, sampleRate: 48000, numberOfChannels: channels, bitrate: t.bitrate })
      if (r?.supported && !out.some(o => o.codec === t.codec)) out.push({ codec: t.codec, bitrate: t.bitrate })
    } catch { /* try the next */ }
  }
  return out
}

export async function soundChoice(bitrate: number, channels: number): Promise<SoundChoice | undefined> {
  return (await soundChoices(bitrate, channels))[0]
}

/**
 * A rough size for the smaller copy of a video, from its length: "about 20 MB". Undefined when the
 * browser will not say how long it is. Reads only the file's header, through a `<video>` element.
 */
export function estimateVideoBytes(file: Blob): Promise<number | undefined> {
  return new Promise(resolve => {
    if (typeof document === 'undefined') { resolve(undefined); return }
    const video = document.createElement('video')
    const url = URL.createObjectURL(file)
    const done = (bytes?: number) => { URL.revokeObjectURL(url); video.removeAttribute('src'); resolve(bytes) }
    const timer = setTimeout(() => done(undefined), 4000)
    video.preload = 'metadata'
    video.onloadedmetadata = () => {
      clearTimeout(timer)
      done(Number.isFinite(video.duration) ? Math.round(video.duration * (VIDEO_BITRATE + VIDEO_AUDIO_BITRATE) / 8) : undefined)
    }
    video.onerror = () => { clearTimeout(timer); done(undefined) }
    video.src = url
  })
}
