import { planShare } from '../../domain/report-packet-files'

/**
 * Hands a Report Packet to the person: the OS share sheet where there is one, a download
 * everywhere else. Shared by Radio Log's Build Report Packet and Entry's field-mode send, which
 * used to carry the same share code twice.
 *
 * D-60 item 6: the originals this device holds ride in the SAME share as the `.txt`, as loose
 * files, when the sheet accepts the set. If it refuses (size or type) the `.txt` goes alone and
 * the caller says the photos were left out. The download fallback downloads the `.txt` and then
 * each file.
 *
 * - `shared`: the share sheet took everything.
 * - `shared-text-only`: it took the `.txt` but not the files.
 * - `downloaded`: no share sheet, or it was cancelled or failed; the files were downloaded.
 */
export type SendOutcome = 'shared' | 'shared-text-only' | 'downloaded'

export async function sendReportPacket(
  text: string, filename: string, media: readonly File[], doc: Document,
  onShareFailed: (message: string) => void = () => { },
): Promise<SendOutcome> {
  const textFile = new File([text], filename, { type: 'text/plain' })
  const canShare = typeof navigator.canShare === 'function' ? (d: { files: File[] }) => navigator.canShare(d) : undefined
  const plan = planShare(canShare, textFile, media)

  if (plan !== 'cannot-share') {
    const files = plan === 'with-files' ? [textFile, ...media] : [textFile]
    try {
      await navigator.share({ files, title: 'RangerTrak Report Packet' })
      return plan === 'text-only' ? 'shared-text-only' : 'shared'
    } catch (e: unknown) {
      // AbortError = the person cancelled the share sheet - not a failure, just fall through to
      // the plain download so they still have a way to get the files.
      onShareFailed(e instanceof Error ? e.message : String(e))
    }
  }

  for (const f of [textFile, ...media]) {
    const url = URL.createObjectURL(f)
    const a = doc.createElement('a')
    a.href = url
    a.download = f.name
    a.click()
    URL.revokeObjectURL(url)
  }
  return 'downloaded'
}
