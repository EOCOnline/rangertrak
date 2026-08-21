import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TimePickerComponent } from './time-picker.component';

describe('TimePickerComponent', () => {
  let component: TimePickerComponent;
  let fixture: ComponentFixture<TimePickerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ TimePickerComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TimePickerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('E-71: updates its displayed time when [initialDate] changes after init, not just on first bind', () => {
    const later = new Date('2026-08-20T14:30:00');
    component.initialDate = later;
    component.ngOnChanges({
      initialDate: { firstChange: false, currentValue: later, previousValue: null, isFirstChange: () => false }
    });
    fixture.detectChanges();

    const timeInput: HTMLInputElement = fixture.nativeElement.querySelector('.timepicker__time-input');
    expect(timeInput.value).toBe('14:30');
  });

  it('does not reapply on the first change - ngOnInit already handled it', () => {
    const initial = component.initialDate;
    spyOn<any>(component, 'applyInitialDate');
    component.ngOnChanges({
      initialDate: { firstChange: true, currentValue: initial, previousValue: undefined, isFirstChange: () => true }
    });

    expect((component as any).applyInitialDate).not.toHaveBeenCalled();
  });
});
