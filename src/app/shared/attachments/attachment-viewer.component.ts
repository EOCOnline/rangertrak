import { ChangeDetectionStrategy, Component, DestroyRef, OnDestroy, computed, effect, inject, signal, untracked } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'

import { formatBytes, formatFingerprint } from '../../domain/attachments'
import type { AttachmentRef } from '../../domain/attachments'
import { AttachmentStoreService } from '../services/attachment-store.service'
import { LogService } from '../services/log.service'
import { RadioLogService } from '../services/radio-log.service'
import type { RadioLogEntryType } from '../services/radio-log-entry.interface'
import { UsageStateService } from '../services/usage-state.service'
import { AttachmentIntakeService } from './attachment-intake.service'

/** What opens the viewer: the entry (by its permanent uid) and, optionally, which file to show first. */
export interface AttachmentViewerData {
  uid: string
  sha256?: string
}

/** A swipe shorter than this many pixels is a tap, not a move to the next item. */
const SWIPE_PX = 50

/**
 * The one viewer for an entry's attachments (ADR D-60, E-194), opened from the 📎 chip
 * wherever it appears. Lazy-loaded (see AttachmentViewerService): nothing here is in the main
 * bundle.
 *
 * Bytes are read one at a time, when an item is shown (`loadMedia`), into an object URL that is
 * revoked as soon as the item changes or the dialog closes. The thumbnail strip uses the small
 * stored thumbnails. It reads the entry LIVE (by uid) so Add and Remove show at once.
 *
 * Confidential content (rule 5): nothing here is logged except counts.
 */
@Component({
  selector: 'rangertrak-attachment-viewer',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './attachment-viewer.component.html',
  styleUrls: ['./attachment-viewer.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class AttachmentViewerComponent implements OnDestroy {
  private id = 'Attachment Viewer Component'

  private data = inject<AttachmentViewerData>(MAT_DIALOG_DATA)
  private store = inject(AttachmentStoreService)
  private radioLog = inject(RadioLogService)
  private intake = inject(AttachmentIntakeService)
  private usage = inject(UsageStateService)
  private log = inject(LogService)

  readonly entry = signal<RadioLogEntryType | undefined>(undefined)
  readonly refs = computed<AttachmentRef[]>(() => this.entry()?.attachments ?? [])
  readonly index = signal(0)
  readonly current = computed<AttachmentRef | undefined>(() => this.refs()[this.index()])
  private readonly currentSha = computed(() => this.current()?.sha256 ?? '')
  private readonly currentRemoved = computed(() => !!this.current()?.removed)
  private readonly stripKey = computed(() => this.refs().map(r => r.sha256 + (r.removed ? '-' : '+')).join(','))

  /** thumbnail object URLs by fingerprint ('' = none: show a type icon). */
  readonly thumbs = signal<Record<string, string>>({})
  /** 'loading' | 'ready' | 'elsewhere' (no bytes here) | 'removed' | 'error' */
  readonly state = signal<'loading' | 'ready' | 'elsewhere' | 'removed' | 'error'>('loading')
  readonly mediaUrl = signal('')
  readonly copied = signal(false)
  readonly busy = signal(false)
  readonly message = signal('')

  readonly canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  private loadToken = 0
  private touchStartX: number | null = null

  constructor() {
    let picked = false
    this.radioLog.getRadioLogObserver().pipe(takeUntilDestroyed(inject(DestroyRef))).subscribe(radioLog => {
      const found = radioLog.logEntries.find(e => e.uid === this.data.uid)
      // A shallow copy, so the signal changes even though the entry is edited in place.
      this.entry.set(found ? { ...found } : undefined)
      if (found && !picked) {
        picked = true
        const at = found.attachments?.findIndex(r => r.sha256 === this.data.sha256) ?? -1
        this.index.set(Math.max(0, at))
      }
      // Removing the last one, say, can leave the index past the end.
      if (this.index() >= (found?.attachments?.length ?? 0)) this.index.set(Math.max(0, (found?.attachments?.length ?? 1) - 1))
    })

    effect(() => {
      this.stripKey()
      this.store.changes()
      untracked(() => void this.loadThumbs())
    })
    effect(() => {
      this.currentSha()
      this.currentRemoved()
      this.store.changes()
      untracked(() => void this.loadMedia())
    })
  }

  ngOnDestroy(): void {
    this.loadToken++
    this.revokeMedia()
  }

  // ── display helpers ──────────────────────────────────────────────────

  shortFingerprint(sha: string): string { return formatFingerprint(sha) }
  sizeText(bytes: number): string { return formatBytes(bytes) }

  kind(ref: AttachmentRef): 'image' | 'video' | 'audio' | 'other' {
    if (ref.type.startsWith('image/')) return 'image'
    if (ref.type.startsWith('video/')) return 'video'
    if (ref.type.startsWith('audio/')) return 'audio'
    return 'other'
  }

  iconFor(ref: AttachmentRef): string {
    const k = this.kind(ref)
    return k === 'video' ? 'videocam' : k === 'audio' ? 'audiotrack' : k === 'image' ? 'image' : 'attach_file'
  }

  /** "16/10/2026 14:02", local, 24-hour (this app uses a 24-hour clock throughout). */
  when(iso: string | undefined): string {
    if (!iso) return ''
    const d = new Date(iso)
    if (isNaN(d.getTime())) return ''
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}`
  }

  clock(iso: string): string {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
  }

  // ── moving between items ─────────────────────────────────────────────

  select(i: number): void { if (i >= 0 && i < this.refs().length) this.index.set(i) }
  next(): void { this.select(this.index() + 1) }
  previous(): void { this.select(this.index() - 1) }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowRight') { this.next(); event.preventDefault() }
    else if (event.key === 'ArrowLeft') { this.previous(); event.preventDefault() }
  }

  onTouchStart(event: TouchEvent): void { this.touchStartX = event.changedTouches[0]?.clientX ?? null }

  onTouchEnd(event: TouchEvent): void {
    if (this.touchStartX === null) return
    const dx = (event.changedTouches[0]?.clientX ?? this.touchStartX) - this.touchStartX
    this.touchStartX = null
    if (dx <= -SWIPE_PX) this.next()
    else if (dx >= SWIPE_PX) this.previous()
  }

  // ── loading ──────────────────────────────────────────────────────────

  private revokeMedia(): void {
    const url = this.mediaUrl()
    if (url) URL.revokeObjectURL(url)
    this.mediaUrl.set('')
  }

  private async loadThumbs(): Promise<void> {
    const out: Record<string, string> = {}
    for (const ref of this.refs()) {
      if (ref.removed || out[ref.sha256] !== undefined) continue
      try { out[ref.sha256] = await this.store.thumbUrl(ref.sha256) } catch { out[ref.sha256] = '' }
    }
    this.thumbs.set(out)
  }

  private async loadMedia(): Promise<void> {
    const token = ++this.loadToken
    this.revokeMedia()
    const ref = this.current()
    if (!ref) { this.state.set('loading'); return }
    if (ref.removed) { this.state.set('removed'); return }
    this.state.set('loading')
    try {
      if (!(await this.store.has(ref.sha256))) {
        if (token === this.loadToken) this.state.set('elsewhere')
        return
      }
      const blob = await this.store.getOriginal(ref.sha256)
      if (token !== this.loadToken) return
      this.mediaUrl.set(URL.createObjectURL(blob.type ? blob : new Blob([blob], { type: ref.type })))
      this.state.set('ready')
    } catch (e: any) {
      this.log.error(`Could not open an attachment: ${e?.message ?? e}`, this.id)
      if (token === this.loadToken) this.state.set('error')
    }
  }

  // ── actions ──────────────────────────────────────────────────────────

  async onCopyFingerprint(): Promise<void> {
    const ref = this.current()
    if (!ref) return
    try {
      await navigator.clipboard.writeText(ref.sha256)
      this.copied.set(true)
      setTimeout(() => this.copied.set(false), 2000)
    } catch {
      // Clipboard blocked: show the full value so it can be copied by hand.
      prompt('Fingerprint (SHA-256), select and copy:', ref.sha256)
    }
  }

  /** Downloads the original under its own name, byte for byte. */
  async onSave(): Promise<void> {
    const ref = this.current()
    if (!ref || ref.removed) return
    try {
      const blob = await this.store.getOriginal(ref.sha256)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = ref.name
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (e: any) {
      this.message.set('Could not save that file.')
      this.log.error(`Could not save an attachment: ${e?.message ?? e}`, this.id)
    }
  }

  async onShare(): Promise<void> {
    const ref = this.current()
    if (!ref || ref.removed) return
    try {
      const file = new File([await this.store.getOriginal(ref.sha256)], ref.name, { type: ref.type })
      if (navigator.canShare && !navigator.canShare({ files: [file] })) {
        this.message.set('This device cannot share that kind of file. Use Save instead.')
        return
      }
      await navigator.share({ files: [file], title: ref.name })
    } catch (e: any) {
      // Closing the share sheet is an AbortError, not a failure.
      if (e?.name !== 'AbortError') this.message.set('Could not share that file. Use Save instead.')
    }
  }

  async onAdd(input: HTMLInputElement): Promise<void> {
    const entry = this.entry()
    const files = Array.from(input.files ?? [])
    input.value = ''
    if (!entry?.uid || !files.length) return
    this.busy.set(true)
    this.message.set('')
    try {
      const accepted = await this.intake.vet(files)
      const { added, failed } = await this.intake.attach(entry.uid, accepted, true)
      if (failed.length) this.message.set(`Could not attach: ${failed.join(', ')}.`)
      const first = added[0]
      if (first) {
        const at = this.refs().findIndex(r => r.sha256 === first.sha256)
        if (at >= 0) this.index.set(at)
      }
    } finally {
      this.busy.set(false)
    }
  }

  /**
   * Removal leaves a trace (D-60 item 5): the reference stays, marked with when and by whom;
   * the bytes go (unless another live reference still names the same file). In Incident mode
   * the confirm is typed, like the other destructive confirms on live missions.
   */
  async onRemove(): Promise<void> {
    const entry = this.entry()
    const ref = this.current()
    if (!entry?.uid || !ref || ref.removed) return
    const question = `Remove "${ref.name}" from this entry?\n\n`
      + `The file is deleted from this device. The entry keeps a note that it was removed, and when and by whom.`
    if (this.usage.mode() === 'incident') {
      const typed = prompt(`${question}\n\nThis is a real incident. To go ahead, type  REMOVE  below.`)
      if (typed === null || typed.trim().toLowerCase() !== 'remove') return
    } else if (!confirm(question)) {
      return
    }
    this.busy.set(true)
    try {
      const removed: AttachmentRef = { ...ref, removed: { at: new Date().toISOString(), by: this.intake.operatorName() } }
      this.radioLog.mergeEntryAttachments(entry.uid, [removed], true)
      const entries = this.radioLog.getCurrentRadioLog().logEntries
      await this.store.releaseRemoved(entries)
      await this.store.sweepOrphans(entries)
      this.message.set('')
    } finally {
      this.busy.set(false)
    }
  }
}
