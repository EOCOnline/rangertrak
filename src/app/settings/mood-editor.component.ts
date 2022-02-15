import {
  AfterViewInit,
  Component,
  ViewChild,
  ViewContainerRef,
} from '@angular/core';
import { ICellEditorAngularComp } from 'ag-grid-angular';


// TODO: Based on boolean value for icons: we need a selection from a panel of icons...
@Component({
  selector: 'editor-cell',
  templateUrl: './mood-editor-component.html',
  styleUrls: ['./mood-editor-component.scss'],
})
export class MoodEditor implements ICellEditorAngularComp, AfterViewInit {
  private params: any;

  @ViewChild('container', { read: ViewContainerRef })
  public container!: ViewContainerRef;
  public happy = false;

  // dont use afterGuiAttached for post gui events - hook into ngAfterViewInit instead for this
  ngAfterViewInit() {
    window.setTimeout(() => {
      this.container.element.nativeElement.focus();
    });
  }

  agInit(params: any): void {
    this.params = params;
    this.setHappy(params.value === 'Happy');
  }

  getValue(): any {
    return this.happy ? 'Happy' : 'Sad';
  }

  isPopup(): boolean {
    return true;
  }

  setHappy(happy: boolean): void {
    this.happy = happy;
  }

  toggleMood(): void {
    this.setHappy(!this.happy);
  }

  onClick(happy: boolean) {
    this.setHappy(happy);
    this.params.api.stopEditing();
  }

  onKeyDown(event: any): void {
    const key = event.key;
    if (
      key === 'ArrowLeft' || // left
      key == 'ArrowRight'
    ) {
      // right
      this.toggleMood();
      event.stopPropagation();
    }
  }
}
