import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BackToTopComponent } from './back-to-top.component';

describe('BackToTopComponent', () => {
  let component: BackToTopComponent;
  let fixture: ComponentFixture<BackToTopComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ BackToTopComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BackToTopComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('stays hidden on an unscrolled page', () => {
    expect(component.visible()).toBeFalse();
    expect(fixture.nativeElement.querySelector('.back-to-top')).toBeNull();
  });

  it('scrolls the window back to the top when invoked', () => {
    const spy = spyOn(window, 'scrollTo');
    component.toTop();
    expect(spy).toHaveBeenCalled();
    // Whatever the motion preference resolves to in the test browser, it must be one of
    // the two valid behaviours - never undefined, which would silently mean "auto".
    const arg = spy.calls.mostRecent().args[0] as ScrollToOptions;
    expect(arg.top).toBe(0);
    expect(['smooth', 'auto']).toContain(arg.behavior as string);
  });
});
