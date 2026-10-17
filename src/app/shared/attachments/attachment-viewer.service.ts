import { Injectable, inject } from '@angular/core'
import { MatDialog } from '@angular/material/dialog'

/**
 * Opens the attachment viewer (ADR D-60, E-194). The viewer is imported only now, the first
 * time anyone opens it, so none of it is in the main bundle. One entry point for every 📎 chip:
 * the grid, the phone card, Messages, the map popup, and the Entry form.
 */
@Injectable({ providedIn: 'root' })
export class AttachmentViewerService {

  private dialog = inject(MatDialog)

  async open(uid: string | undefined, sha256?: string): Promise<void> {
    if (!uid) return
    const { AttachmentViewerComponent } = await import('./attachment-viewer.component')
    this.dialog.open(AttachmentViewerComponent, {
      data: { uid, sha256 },
      autoFocus: false,
      maxWidth: '96vw',
    })
  }
}
