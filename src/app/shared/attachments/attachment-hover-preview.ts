import { liveRefs } from '../../domain/attachments'
import type { AttachmentRef } from '../../domain/attachments'

/** Most thumbnails the hover panel shows; the rest become "+N more" (E-194). */
export const PREVIEW_MAX = 4

/** Gap between the chip and the panel, in px. */
const GAP = 8
/** Least distance the panel keeps from a viewport edge, in px. */
const MARGIN = 8

/** Which live attachments the hover panel draws, in entry order, and how many it leaves out. */
export function previewRefs(
  entry: { attachments?: readonly AttachmentRef[] } | undefined,
  max = PREVIEW_MAX,
): { shown: AttachmentRef[]; more: number } {
  const live = entry ? liveRefs(entry as Parameters<typeof liveRefs>[0]) : []
  return { shown: live.slice(0, max), more: Math.max(0, live.length - max) }
}

/**
 * Where the fixed-position panel goes: beside the chip (to its right, top-aligned), flipped
 * to its left when it would run off the right edge, then clamped inside the viewport. If it
 * is also too tall to sit beside the chip it is clamped vertically; callers keep it smaller
 * than the viewport.
 */
export function placePreview(
  chip: { top: number; left: number; right: number; bottom: number },
  panel: { width: number; height: number },
  viewport: { width: number; height: number },
): { top: number; left: number } {
  let left = chip.right + GAP
  if (left + panel.width > viewport.width - MARGIN) left = chip.left - GAP - panel.width
  left = Math.max(MARGIN, Math.min(left, viewport.width - panel.width - MARGIN))

  let top = chip.top
  if (top + panel.height > viewport.height - MARGIN) top = chip.bottom - panel.height
  top = Math.max(MARGIN, Math.min(top, viewport.height - panel.height - MARGIN))
  return { top, left }
}
