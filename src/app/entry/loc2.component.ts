import { Component, Input } from '@angular/core';
import { FormGroup, FormBuilder } from '@angular/forms';

@Component({
  selector: 'app-child',
  template: `
    <div [formGroup]="loc2">
    <label>Street: </label>
      <input formControlName="street"><br>
    <label>Zip: </label>
      <input formControlName="zip">
    </div>
  `,
  styles: [`h1 { font-family: Lato; }`]
})
export class loc2Component {

  @Input() loc2!: FormGroup;
}
