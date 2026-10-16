/**
 * TEMPORARY diagnostic (2026-10-16, John's Print map PDFs): at Chrome's Default scale the map
 * sheet still prints at ~65%, so in a REAL print something is wider than the page and Chrome
 * shrinks the whole sheet to fit. Headless and emulated print lay it out at 100%, so it can only
 * be seen in a real print dialog.
 *
 * While the print layout is active this measures the page and lists the widest elements, then
 * writes one line to the console ("RangerTrak print check: {...}") for John to copy. It reads the
 * layout only and changes nothing. Remove it once the cause is found.
 */
export function armPrintCheck(kind: string): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return () => { }
  }
  const mq = window.matchMedia('print')
  const onChange = () => {
    if (!mq.matches) {
      return
    }
    try {
      const pageW = window.innerWidth
      const doc = document.documentElement
      const name = (el: Element) => el.tagName.toLowerCase()
        + (el.id ? '#' + el.id : '')
        + (typeof el.className === 'string' && el.className.trim()
          ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.') : '')
      const wide: { el: string, right: number, width: number }[] = []
      for (const el of Array.from(document.querySelectorAll('body *'))) {
        const r = el.getBoundingClientRect()
        if (!r.width || r.right <= pageW + 1) continue
        const parent = el.parentElement?.getBoundingClientRect()
        if (parent && parent.right > pageW + 1) continue // only the outermost offender of each branch
        wide.push({ el: name(el), right: Math.round(r.right), width: Math.round(r.width) })
      }
      wide.sort((a, b) => b.right - a.right)
      const frame = document.querySelector('.mapLeaflet-frame, .mapLibre-frame')?.getBoundingClientRect()
      console.info('RangerTrak print check: ' + JSON.stringify({
        kind,
        page: [window.innerWidth, window.innerHeight],
        scroll: [doc.scrollWidth, doc.scrollHeight],
        frame: frame ? [Math.round(frame.width), Math.round(frame.height)] : null,
        body: document.body.className,
        wide: wide.slice(0, 10),
      }))
    } catch (e) {
      console.info('RangerTrak print check failed: ' + (e as Error)?.message)
    }
  }
  mq.addEventListener('change', onChange)
  return () => mq.removeEventListener('change', onChange)
}
