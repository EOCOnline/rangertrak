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

    const hourInput: HTMLInputElement = fixture.nativeElement.querySelector('.rt-datetime__seg--hour');
    const minuteInput: HTMLInputElement = fixture.nativeElement.querySelector('.rt-datetime__seg--minute');
    // 24-hour display (2026-08-30): 14:30, not 2:30 PM - no AM/PM segment any more.
    expect(hourInput.value).toBe('14');
    expect(minuteInput.value).toBe('30');
  });

  it('segment-aware ▲/▼: steps whichever segment last had focus, not always minutes', () => {
    // 14:30 -> hour segment focused -> step up -> 15:30
    component.initialDate = new Date('2026-08-20T14:30:00');
    component.ngOnChanges({
      initialDate: { firstChange: false, currentValue: component.initialDate, previousValue: null, isFirstChange: () => false }
    });
    fixture.detectChanges();

    component.onSegmentFocus('hour');
    component.adjustTime(1);
    fixture.detectChanges();

    const hourInput: HTMLInputElement = fixture.nativeElement.querySelector('.rt-datetime__seg--hour');
    const minuteInput: HTMLInputElement = fixture.nativeElement.querySelector('.rt-datetime__seg--minute');
    expect(hourInput.value).toBe('15');
    expect(minuteInput.value).toBe('30');
  });

  it('segment-aware ▲/▼: falls back to minute when nothing has been focused yet', () => {
    component.initialDate = new Date('2026-08-20T14:30:00');
    component.ngOnChanges({
      initialDate: { firstChange: false, currentValue: component.initialDate, previousValue: null, isFirstChange: () => false }
    });
    fixture.detectChanges();

    component.adjustTime(1);
    fixture.detectChanges();

    const minuteInput: HTMLInputElement = fixture.nativeElement.querySelector('.rt-datetime__seg--minute');
    expect(minuteInput.value).toBe('31');
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
