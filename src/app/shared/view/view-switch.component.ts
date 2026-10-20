import { ChangeDetectionStrategy, Component, inject } from '@angular/core'
import { MatButtonToggleModule } from '@angular/material/button-toggle'

import { AppView } from '../../domain/view'
import { ViewService } from '../services/view.service'

/**
 * E-207 / ADR D-62 item 4: the switch between Simple view and Full view, on the Mission page and
 * on Help. The person's own choice, so it records source `user`. Switching only changes what is
 * shown; it never changes or deletes anything.
 */
@Component({
  selector: 'rangertrak-view-switch',
  standalone: true,
  imports: [MatButtonToggleModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-button-toggle-group class="view-switch" hideSingleSelectionIndicator aria-label="View"
      data-testid="view-switch" [value]="view.view()" (change)="onChange($event.value)">
      <mat-button-toggle value="simple" data-testid="view-simple">Simple view</mat-button-toggle>
      <mat-button-toggle value="full" data-testid="view-full">Full view</mat-button-toggle>
    </mat-button-toggle-group>`,
  // AAR 2026-10-19 10pm: Full view wears the same plum as the "Advanced" pills it turns on.
  styles: `
    .view-switch .mat-button-toggle-checked[value=full] {
      background: var(--rt-advanced-tint);
      color     : var(--rt-advanced);
    }`,
})
export class ViewSwitchComponent {
  protected readonly view = inject(ViewService)

  protected onChange(v: AppView): void {
    this.view.setView(v)
  }
}
