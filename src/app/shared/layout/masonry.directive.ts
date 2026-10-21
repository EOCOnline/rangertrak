import { DestroyRef, Directive, ElementRef, inject, output } from '@angular/core'

/** Row unit of the masonry grid, in px. Must match `grid-auto-rows` in `.rt-card-grid` (styles/_patterns.scss). */
export const MASONRY_ROW_UNIT = 4

/**
 * Masonry for the one card grid, `.rt-card-grid` (E-169, E-210). The grid keeps DOM order, so keyboard and screen
 * reader order stay right (CSS `columns` would scramble both); this only measures each card
 * and tells the grid how many small rows it needs, as the custom property
 * `--rt-masonry-span`. The stylesheet (`.rt-card-grid` in styles/_patterns.scss) turns that
 * into `grid-row-end: span N` only where the grid is on (tablet and wider, never in print),
 * so on a phone this does nothing visible and the cards flow normally.
 *
 * The grid items are the cards, which may sit inside section components that are
 * `display: contents`; those hosts are looked through. A ResizeObserver covers every
 * later size change (an expansion panel opening - the panel body the grid sits in is observed too, a grid loading, a font arriving), and a
 * MutationObserver notices cards that appear or go away. No timers and no Zone: the app is
 * zoneless (D-17), and both observers are plain DOM callbacks that touch no Angular state.
 *
 * Does not use `grid-template-rows: masonry` (not shipped in Chrome) or a library.
 */
@Directive({
  selector: '[rtMasonry]',
  host: { class: 'rt-card-grid' },
})
export class MasonryDirective {
  /** Fires after the spans were (re)applied; a page can use it to re-scroll to a deep link. */
  readonly laidOut = output<void>()

  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement
  private frame = 0
  private items: HTMLElement[] = []

  private readonly resizeObserver = new ResizeObserver(() => this.schedule())
  private readonly mutationObserver = new MutationObserver(() => {
    this.rescan()
    this.schedule()
  })

  constructor() {
    this.mutationObserver.observe(this.el, { childList: true, subtree: true })
    // A grid inside an expansion panel (the Import cards) measures 0 while the panel is shut and
    // sits in a body whose size animates open: re-measure whenever that body changes size.
    const panelBody = this.el.closest('.mat-expansion-panel-content')
    if (panelBody) this.resizeObserver.observe(panelBody)
    this.rescan()
    this.schedule()
    inject(DestroyRef).onDestroy(() => {
      this.resizeObserver.disconnect()
      this.mutationObserver.disconnect()
      if (this.frame) cancelAnimationFrame(this.frame)
    })
  }

  /** The grid's items: direct children, looking through `display: contents` hosts. */
  private collectItems(): HTMLElement[] {
    const found: HTMLElement[] = []
    for (const child of Array.from(this.el.children) as HTMLElement[]) {
      if (getComputedStyle(child).display === 'contents') {
        found.push(...(Array.from(child.children) as HTMLElement[]))
      } else {
        found.push(child)
      }
    }
    return found
  }

  private rescan(): void {
    const next = this.collectItems()
    if (next.length === this.items.length && next.every((n, i) => n === this.items[i])) return
    this.resizeObserver.disconnect()
    this.items = next
    for (const item of next) this.resizeObserver.observe(item)
    const panelBody = this.el.closest('.mat-expansion-panel-content')
    if (panelBody) this.resizeObserver.observe(panelBody)
  }

  private schedule(): void {
    if (this.frame) return
    this.frame = requestAnimationFrame(() => {
      this.frame = 0
      this.apply()
    })
  }

  private apply(): void {
    // Read every size first, then write every span, so the reads never see a half-updated grid.
    const spans = this.items.map(item => {
      const marginBottom = parseFloat(getComputedStyle(item).marginBottom) || 0
      const height = item.getBoundingClientRect().height + marginBottom
      return Math.max(1, Math.ceil(height / MASONRY_ROW_UNIT))
    })
    this.items.forEach((item, i) => item.style.setProperty('--rt-masonry-span', String(spans[i])))
    this.laidOut.emit()
  }
}
