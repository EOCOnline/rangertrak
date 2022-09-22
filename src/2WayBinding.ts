// https://angular.io/guide/two-way-binding
// https://angular.io/generated/live-examples/two-way-binding/stackblitz.html

/// PARENT
import { Component, EventEmitter, Input, Output } from '@angular/core'

@Component({
  selector: 'app-root',
  template: `<h1 id="two-way">Two-way Binding</h1>
  <div id="two-way-1">
    <app-sizer [(size)]="fontSizePx"></app-sizer>
    <div [style.font-size.px]="fontSizePx">Resizable Text</div>
    <label>FontSize (px): <input [(ngModel)]="fontSizePx"></label>
  </div>
  <br>
  <div id="two-way-2">
    <h2>De-sugared two-way binding</h2>
    <app-sizer [size]="fontSizePx" (sizeChange)="fontSizePx=$event"></app-sizer>
  </div>`,
  styleUrls: [],
})

export class AppComponent {
  constructor() { }
  fontSizePx = 16;
}

/////////////////////////////////////////////////
/// CHILD
@Component({
  selector: 'app-sizer',
  template: `<div>
  <button type="button" (click)="dec()" title="smaller">-</button>
  <button type="button" (click)="inc()" title="bigger">+</button>
  <span [style.fontSizePx.px]="size">FontSize: {{ size }}px</span>
  </div>`,
  styleUrls: [],
})

export class SizerComponent {
  @Input() size!: number | string;
  @Output() sizeChange = new EventEmitter<number>();

  dec() { this.resize(-1) }
  inc() { this.resize(+1) }

  resize(delta: number) {
    this.size = Math.min(40, Math.max(8, +this.size + delta));
    this.sizeChange.emit(this.size);
  }
}
