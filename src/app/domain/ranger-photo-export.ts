/**
 * Photo export, pure parts: which stored photo belongs to a ranger, and what to call it in the
 * zip. Framework-free (D-57). The matching rule is the one the photo store itself uses to show a
 * photo: the ranger's id first, then the call sign, upper-cased and trimmed.
 */

export interface PhotoIdentity {
  id?: string
  callsign?: string
}

/** The key a photo is stored under: trimmed and upper-cased. */
export function photoStem(s?: string): string {
  return String(s || '').trim().toUpperCase()
}

/**
 * The stored-photo stem for a ranger (id first, then call sign), or null when none of the
 * ranger's keys has a photo. `hasPhoto` asks the store whether a stem has one.
 */
export function stemForRanger(ranger: PhotoIdentity, hasPhoto: (stem: string) => boolean): string | null {
  const byId = photoStem(ranger.id)
  if (byId && hasPhoto(byId)) return byId
  const byCallsign = photoStem(ranger.callsign)
  if (byCallsign && hasPhoto(byCallsign)) return byCallsign
  return null
}

/** The distinct stems that have photos for these rangers, in roster order. */
export function photoStemsFor(rangers: readonly PhotoIdentity[], hasPhoto: (stem: string) => boolean): string[] {
  const seen = new Set<string>()
  for (const r of rangers) {
    const stem = stemForRanger(r, hasPhoto)
    if (stem) seen.add(stem)
  }
  return [...seen]
}

/** File extension for an image MIME type: jpg, png, webp or gif, else jpg. */
export function extensionForMime(mime?: string): string {
  switch (String(mime || '').trim().toLowerCase()) {
    case 'image/png': return 'png'
    case 'image/webp': return 'webp'
    case 'image/gif': return 'gif'
    default: return 'jpg'
  }
}

/** The zip entry name for a photo, which "Import photos" reads straight back in. */
export function photoEntryName(stem: string, mime?: string): string {
  return `${stem}.${extensionForMime(mime)}`
}
