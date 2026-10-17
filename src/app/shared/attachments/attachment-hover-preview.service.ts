import { Injectable, inject } from '@angular/core'

import { smallerCopyLabelIn } from '../../domain/attachments'
import { ATTACH_CHIP_CLASS } from './attachment-chip-html'
import { placePreview, previewRefs } from './attachment-hover-preview'
import { AttachmentStoreService } from '../services/attachment-store.service'
import { RadioLogService } from '../services/radio-log.service'

/** Hover or focus this long before the panel appears, and leave this long before it goes. */
const SHOW_MS = 300
const HIDE_MS = 120
/** Four-digit on purpose: it must beat Leaflet's controls (800-1000) and the map popup (700). */
const Z_INDEX = 4000
const THUMB_PX = 108

/**
 * Hover (or keyboard focus) a 📎 chip and a small panel shows its first few images (E-194, ADR
 * D-60). ONE delegated listener set on `document`, so the grid, the map popup, the phone cards
 * and the Messages pane need no wiring: anything carrying `.rt-attach-chip` and
 * `data-entry-uid` qualifies. Thumbnails only, never originals; every object URL is revoked
 * when the panel hides. The panel is `aria-hidden` and `pointer-events: none` - the chip's own
 * aria-label describes it, and the viewer (click) is the accessible path. Not shown where
 * there is no hover (touch). Constructed once at startup from `AppComponent`.
 */
@Injectable({ providedIn: 'root' })
export class AttachmentHoverPreviewService {

  private store = inject(AttachmentStoreService)
  private radioLog = inject(RadioLogService)

  private panel?: HTMLElement
  private urls: string[] = []
  private showTimer?: ReturnType<typeof setTimeout>
  private hideTimer?: ReturnType<typeof setTimeout>
  private chip?: HTMLElement
  /** Bumped on every hide so an in-flight thumbnail read never paints a stale panel. */
  private generation = 0

  constructor() {
    const d = document
    d.addEventListener('mouseover', e => this.enter(e))
    d.addEventListener('focusin', e => this.enter(e))
    d.addEventListener('mouseout', e => this.leave(e))
    d.addEventListener('focusout', e => this.leave(e))
    d.addEventListener('click', () => this.hide(), true)
    d.addEventListener('keydown', e => { if (e.key === 'Escape') this.hide() })
    window.addEventListener('scroll', () => this.hide(), true)
  }

  private chipOf(event: Event): HTMLElement | null {
    return (event.target as HTMLElement | null)?.closest?.(`.${ATTACH_CHIP_CLASS}`) as HTMLElement | null
  }

  private enter(event: Event): void {
    const chip = this.chipOf(event)
    if (!chip) return
    if (chip === this.chip) { clearTimeout(this.hideTimer); return }
    if (window.matchMedia('(hover: none)').matches) return
    clearTimeout(this.hideTimer)
    clearTimeout(this.showTimer)
    this.hide()
    this.chip = chip
    this.showTimer = setTimeout(() => void this.show(chip), SHOW_MS)
  }

  private leave(event: Event): void {
    if (!this.chipOf(event)) return
    const to = (event as MouseEvent).relatedTarget as HTMLElement | null
    if (to?.closest?.(`.${ATTACH_CHIP_CLASS}`) === this.chip) return
    clearTimeout(this.showTimer)
    clearTimeout(this.hideTimer)
    this.hideTimer = setTimeout(() => this.hide(), HIDE_MS)
  }

  private async show(chip: HTMLElement): Promise<void> {
    const uid = chip.dataset['entryUid']
    if (!uid || !chip.isConnected) return
    const entry = this.radioLog.getCurrentRadioLog().logEntries.find(e => e.uid === uid)
    const { shown, more } = previewRefs(entry)
    if (!shown.length) return
    const gen = ++this.generation

    const panel = document.createElement('div')
    panel.setAttribute('aria-hidden', 'true')
    panel.setAttribute('data-testid', 'attachment-hover-preview')
    panel.style.cssText = `position:fixed;z-index:${Z_INDEX};pointer-events:none;box-sizing:border-box;`
      + 'max-width:min(92vw,520px);padding:8px;border-radius:var(--rt-radius,8px);'
      + 'background:var(--rt-surface,#fff);color:var(--rt-ink,#000);border:1px solid var(--rt-line-strong,#888);'
      + 'box-shadow:0 4px 16px rgba(0,0,0,.35);font:inherit;font-size:.85rem;visibility:hidden;top:0;left:0'

    const row = document.createElement('div')
    row.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px'
    panel.append(row)

    const urls: string[] = []
    for (const ref of shown) {
      const tile = document.createElement('div')
      tile.style.cssText = `width:${THUMB_PX}px;text-align:center;overflow:hidden`
      const thumb = ref.type.startsWith('image/') ? await this.thumb(ref.sha256) : undefined
      if (gen !== this.generation) { urls.forEach(u => URL.revokeObjectURL(u)); return }
      if (thumb) {
        const url = URL.createObjectURL(thumb)
        urls.push(url)
        const img = document.createElement('img')
        img.src = url
        img.alt = ref.name
        img.style.cssText = `display:block;width:${THUMB_PX}px;height:${THUMB_PX}px;object-fit:cover;`
          + 'border-radius:4px;background:var(--rt-surface-2,#eee)'
        tile.append(img)
      } else {
        const icon = document.createElement('div')
        icon.style.cssText = `display:flex;align-items:center;justify-content:center;width:${THUMB_PX}px;`
          + `height:${THUMB_PX}px;border-radius:4px;background:var(--rt-surface-2,#eee);color:var(--rt-ink-2,#444)`
        const glyph = document.createElement('span')
        glyph.className = 'material-icons'
        glyph.style.fontSize = '40px'
        glyph.textContent = ref.type.startsWith('video/') ? 'videocam' : ref.type.startsWith('audio/') ? 'audiotrack' : 'attach_file'
        icon.append(glyph)
        tile.append(icon)
      }
      const name = document.createElement('div')
      name.textContent = ref.name
      name.style.cssText = 'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:2px'
      tile.append(name)
      const label = smallerCopyLabelIn(entry!, ref)
      if (label) {
        const tag = document.createElement('div')
        tag.textContent = 'smaller copy'
        tag.title = label
        tag.setAttribute('data-testid', 'attachment-smaller-tag')
        tag.style.cssText = 'margin-top:2px;font-size:.75em;color:var(--rt-ink-2,#444);border:1px solid currentColor;border-radius:999px;display:inline-block;padding:0 6px'
        tile.append(tag)
      }
      row.append(tile)
    }

    if (more) {
      const m = document.createElement('div')
      m.textContent = `+${more} more`
      m.style.cssText = 'margin-top:6px;color:var(--rt-ink-2,#444)'
      panel.append(m)
    }
    const hint = document.createElement('div')
    hint.textContent = 'Click to open'
    hint.style.cssText = 'margin-top:6px;color:var(--rt-ink-3,#666);font-size:.8em'
    panel.append(hint)

    document.body.append(panel)
    this.panel = panel
    this.urls = urls
    const w = panel.offsetWidth, h = panel.offsetHeight
    const { top, left } = placePreview(chip.getBoundingClientRect(), { width: w, height: h },
      { width: window.innerWidth, height: window.innerHeight })
    panel.style.top = `${top}px`
    panel.style.left = `${left}px`
    panel.style.visibility = 'visible'
  }

  private async thumb(sha: string): Promise<Blob | undefined> {
    try { return await this.store.getThumb(sha) } catch { return undefined }
  }

  private hide(): void {
    clearTimeout(this.showTimer)
    clearTimeout(this.hideTimer)
    this.generation++
    this.chip = undefined
    this.panel?.remove()
    this.panel = undefined
    for (const u of this.urls) URL.revokeObjectURL(u)
    this.urls = []
  }
}
