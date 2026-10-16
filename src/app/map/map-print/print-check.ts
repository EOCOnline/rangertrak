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
      // Round 2 (John's first result: page 1496 px wide, i.e. Chrome laid the sheet out 1.53x the
      // paper and scaled it to 65%). Once the page has grown, nothing overflows it, so list the
      // widest elements outside the map panes with what could hold them that wide.
      const widest = Array.from(document.querySelectorAll('body *'))
        .filter(el => !el.closest('.leaflet-pane, .leaflet-control-container'))
        .map(el => ({ el, w: el.getBoundingClientRect().width }))
        .filter(x => x.w > pageW * 0.8)
        .map(({ el, w }) => {
          const cs = getComputedStyle(el)
          let depth = 0
          for (let p = el.parentElement; p; p = p.parentElement) depth++
          const kids = Array.from(el.children).map(c => c.getBoundingClientRect().width)
          return {
            el: name(el), depth, w: Math.round(w),
            widestChild: kids.length ? Math.round(Math.max(...kids)) : 0,
            minW: cs.minWidth, cssW: cs.width, inline: (el as HTMLElement).style?.cssText?.slice(0, 80) || '',
            display: cs.display, pos: cs.position,
          }
        })
        .sort((a, b) => b.depth - a.depth)
        .slice(0, 15)
      const frame = document.querySelector('.mapLeaflet-frame, .mapLibre-frame')?.getBoundingClientRect()
      console.info('RangerTrak print check: ' + JSON.stringify({
        kind,
        page: [window.innerWidth, window.innerHeight],
        scroll: [doc.scrollWidth, doc.scrollHeight],
        frame: frame ? [Math.round(frame.width), Math.round(frame.height)] : null,
        body: document.body.className,
        wide: wide.slice(0, 3),
        widest,
      }))
    } catch (e) {
      console.info('RangerTrak print check failed: ' + (e as Error)?.message)
    }
  }
  mq.addEventListener('change', onChange)
  return () => mq.removeEventListener('change', onChange)
}
