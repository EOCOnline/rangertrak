/**
 * Mints a fresh random identifier (a UUID). Shared by ranger rows (`RangerType.uid`, ADR D-42)
 * and radio log entries (`RadioLogEntryType.uid`, ADR D-59): both need a key that two devices
 * can mint independently without colliding, and that carries no real-world meaning.
 *
 * `crypto.randomUUID()` needs a secure context (HTTPS and localhost both are), but this app is
 * built to run in odd places, so it degrades rather than throwing: `getRandomValues` first,
 * `Math.random` only as a last resort.
 */
export function newUid(): string {
  const c: Crypto | undefined = typeof crypto !== 'undefined' ? crypto : undefined

  if (typeof c?.randomUUID === 'function') {
    return c.randomUUID()
  }

  if (typeof c?.getRandomValues === 'function') {
    const bytes = c.getRandomValues(new Uint8Array(16))
    bytes[6] = (bytes[6] & 0x0f) | 0x40   // version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80   // variant 10x
    const hex = [...bytes].map(b => b.toString(16).padStart(2, '0')).join('')
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
  }

  return 'uid-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10)
}
