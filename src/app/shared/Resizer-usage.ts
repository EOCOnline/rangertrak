import { Component } from '@angular/core'

@Component({
  selector: 'app-root',
  template: '<h1 id="two-way">Two-way Binding</h1> \
  <div id="two-way-1"> \
    <app-sizer [(size)]="fontSizePx"></app-sizer> \
    <div [style.font-size.px]="fontSizePx">Resizable Text</div> \
    <label>FontSize (px): <input [(ngModel)]="fontSizePx"></label> \
  </div> \
  <br> \
  <div id="two-way-2"> \
    <h2>De-sugared two-way binding</h2> \
    <app-sizer [size]="fontSizePx" (sizeChange)="fontSizePx=$event"></app-sizer> \
  </div>',
})
export class AppComponent {
  constructor() { }
  fontSizePx = 16;
}
