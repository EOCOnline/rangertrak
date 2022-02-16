import { AfterViewInit, Component, ViewChild, ViewContainerRef, } from '@angular/core';
import { Color } from '@angular-material-components/color-picker';
import { ThemePalette } from '@angular/material/core';
import { ICellEditorAngularComp } from 'ag-grid-angular';
import { AbstractControl, FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { ArgumentOutOfRangeError } from 'rxjs';

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
  //colorCtr = new FormControl(new Color(255, 30, 255), [Validators.required])  // TODO: use existing instead of a default color
  colorCtr: FormControl
  colorCntlDisabled = false
  touchUi = false
  public colorPalette: ThemePalette = 'primary';
  public color: string = 'green'
  r:number
  g:number
  b:number
// No suitable injection token for parameter 'r' of class 'ColorEditor'. Consider using the @Inject decorator to specify an injection token.
  constructor() { //r:number, g:number, b:number
    // TODO: use existing color (obtained by @inject() ???) instead of an arbitrary default color
    this.r  = 196
    this.g  = 0
    this.b  = 252

    this.colorCtr = new FormControl(new Color(this.r, this.g, this.b), [Validators.required])
    //console.log(`constructor = ${this.colorCtr.value.hex} from  ${this.color}`)
  }
  // dont use afterGuiAttached for post gui events - hook into ngAfterViewInit instead for this
  ngAfterViewInit() {
    window.setTimeout(() => {
      this.container.element.nativeElement.focus();
    });
  }

  agInit(params: any): void {
/*
agInit = fff300 from  green
color-editor.component.ts:51 setValue = {"r":255,"g":243,"b":0,"a":1,"roundA":1,"hex":"fff300","rgba":"rgba(255,243,0,1)"},
    green to brown
forms.mjs:5112
  It looks like you're using the disabled attribute with a reactive form directive. If you set disabled to true
  when you set up this control in your component class, the disabled attribute will actually be set in the DOM for
  you. We recommend using this approach to avoid 'changed after checked' errors.

  Example:
  form = new FormGroup({
    first: new FormControl({value: 'Nancy', disabled: true}, Validators.required),
    last: new FormControl('Drew', Validators.required)
  });


  onClick = fff300 from  brown
color-editor.component.ts:66 setValue = {"r":255,"g":243,"b":0,"a":1,"roundA":1,"hex":"fff300","rgba":"rgba(255,243,0,1)"},
    brown to fff300

color-editor.component.ts:99 oncolorCtrClosed = ff00ff from  fff300
  */
    this.params = params
    console.log(`agInit = ${this.colorCtr.value.hex} from  ${this.color}`)
    //this.setColor('green') // default color, but causes only one color to be displayed in picker...
    //this.colorCtr
    // this.colorCtr.setValue("green", { // 165d6e
    //   onlySelf  : true
    //  })
/*
       emitEvent?: true,
       emitModelToViewChange?: true,
        emitViewToModelChange?: true
    })
*/

/*
    this.colorCtr.setValue("color", "options", {
       onlySelf?: true,
       emitEvent?: true,
       emitModelToViewChange?: true,
        emitViewToModelChange?: true
    })

    setValue(value: any, options?: { onlySelf?: boolean | undefined; emitEvent?: boolean | undefined; emitModelToViewChange?: boolean | undefined; emitViewToModelChange?: boolean | undefined; } | undefined): void

    Configuration options that determine how the control propagates changes and emits events when the value changes. The configuration options are passed to the AbstractControl#updateValueAndValidity * updateValueAndValidity method.

    onlySelf: When true, each change only affects this control, and not its parent. Default is false.
    emitEvent: When true or not supplied (the default), both the statusChanges and valueChanges observables emit events with the latest status and value when the control value is updated. When false, no events are emitted.
    emitModelToViewChange: When true or not supplied (the default), each change triggers an onChange event to update the view.
    emitViewToModelChange: When true or not supplied (the default), each change triggers an ngModelChange event to update the model.

    Sets a new value for the form control.
    */




  }

  getValue(): any {
    console.log(`getValue = ${this.colorCtr}, ${this.color}`)
    return this.color
  }

  isPopup(): boolean {
    console.log(`isPopup = ${this.colorCtr.value.hex} from  ${this.color}`)
    return false;
  }

  setColor(color: string): void {
    console.log(`setValue = ${JSON.stringify(this.colorCtr.value)},
    ${this.color} to ${color}`)
    this.color = color;
    /*
    (property) AbstractControl.value: any
The current value of the control.

For a FormControl, the current value.
For an enabled FormGroup, the values of enabled controls as an object with a key-value pair for each member of the group.
For a disabled FormGroup, the values of all controls as an object with a key-value pair for each member of the group.
For a FormArray, the values of enabled controls as an array.

setValue(value: any, options?: { onlySelf?: boolean | undefined; emitEvent?: boolean | undefined; emitModelToViewChange?: boolean | undefined; emitViewToModelChange?: boolean | undefined; } | undefined): void
Configuration options that determine how the control propagates changes and emits events when the value changes. The configuration options are passed to the AbstractControl#updateValueAndValidity * updateValueAndValidity method.

onlySelf: When true, each change only affects this control, and not its parent. Default is false.
emitEvent: When true or not supplied (the default), both the statusChanges and valueChanges observables emit events with the latest status and value when the control value is updated. When false, no events are emitted.
emitModelToViewChange: When true or not supplied (the default), each change triggers an onChange event to update the view.
emitViewToModelChange: When true or not supplied (the default), each change triggers an ngModelChange event to update the model.

Sets a new value for the form control.
*/
    this.colorCtr.setValue(color =color)
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
    console.log(`onKeyDown (${key})= ${this.colorCtr.value.hex} from  ${this.color}`)
    if (
      key === 'ArrowLeft' || // left
      key == 'ArrowRight'
    ) {
      // right
      // this.toggleMood();
      event.stopPropagation();
      // TODO: this.params.api.stopEditing();????
    }
  }
  oncolorCtrClosed(event:any) {
    console.log(`oncolorCtrClosed = ${this.colorCtr.value.hex} from  ${this.color} with event:${event}`)
    this.color = this.colorCtr.value.hex
    // TODO: Also close underlying dialog now!
    // event propogations?!
  }
}
