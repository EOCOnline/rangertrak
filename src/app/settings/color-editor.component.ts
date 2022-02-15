import { AfterViewInit, Component, ViewChild, ViewContainerRef, } from '@angular/core';
import { Color } from '@angular-material-components/color-picker';
import { ThemePalette } from '@angular/material/core';
import { ICellEditorAngularComp } from 'ag-grid-angular';
import { AbstractControl, FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';

// https://www.ag-grid.com/angular-data-grid/component-cell-editor
// TODO: Based on boolean value for icons: we need a selection from a panel of icons...
@Component({
  selector: 'editor-cell',
  templateUrl: './color-editor-component.html',
  styleUrls: ['./color-editor-component.scss',],
})
export class ColorEditor implements ICellEditorAngularComp, AfterViewInit {
  private params: any;

  @ViewChild('container', { read: ViewContainerRef })
  public container!: ViewContainerRef;

  //colorCtr: AbstractControl = new FormControl(new Color(255, 243, 0), [Validators.required])
  colorCtr = new FormControl(new Color(255, 243, 0), [Validators.required])
  colorCntlDisabled = false
  touchUi = false
  public colorPalette: ThemePalette = 'primary';
  public color: string = 'green'

  // dont use afterGuiAttached for post gui events - hook into ngAfterViewInit instead for this
  ngAfterViewInit() {
    window.setTimeout(() => {
      this.container.element.nativeElement.focus();
    });
  }

  agInit(params: any): void {
    this.params = params
    this.setColor('brown') // default color
  }

  getValue(): any {
    console.log(`getValue = ${this.colorCtr}, ${this.color}`)
    return this.color
  }

  isPopup(): boolean {
    return true;
  }

  setColor(color: string): void {
    console.log(`setValue = ${JSON.stringify(this.colorCtr.value)},
    ${this.color} to ${color}`)
    this.color = color;
  }

  onClick(event: any) {
    console.log(`onClick = ${this.colorCtr.value.hex} from  ${this.color}`)
    this.setColor(this.colorCtr.value.hex);
    this.params.api.stopEditing();
  }

  onMouseDown(event: any): void {
    const key = event.key;
    console.log(`onClick = ${this.colorCtr.value.hex} from  ${this.color}`)
    this.setColor(this.colorCtr.value.hex);
    event.stopPropagation();

  }

  onKeyDown(event: any): void {
    const key = event.key;
    if (
      key === 'ArrowLeft' || // left
      key == 'ArrowRight'
    ) {
      // right
      // this.toggleMood();
      event.stopPropagation();
    }
  }
}
