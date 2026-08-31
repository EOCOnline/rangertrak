import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { MissionReadinessComponent } from './mission-readiness.component';
import { MissionReadinessService } from '../services';

describe('MissionReadinessComponent', () => {
  let component: MissionReadinessComponent;
  let fixture: ComponentFixture<MissionReadinessComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MissionReadinessComponent],
      providers: [provideHttpClient(), provideRouter([])],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MissionReadinessComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders a dot with the current level as a CSS class', () => {
    const readiness = TestBed.inject(MissionReadinessService);
    readiness.missionNamed.set(false);
    fixture.detectChanges();

    const dot: HTMLElement = fixture.nativeElement.querySelector('.readiness-dot');
    expect(dot).toBeTruthy();
    expect(dot.classList.contains('readiness-dot--red')).toBe(true);
  });

  it('the tooltip text names all six signals, never reading as a permission gate', () => {
    expect(component.tooltip).toContain('Mission named');
    expect(component.tooltip).toContain('Real roster loaded');
    expect(component.tooltip).toContain('Operating period current');
    expect(component.tooltip).toContain('Offline map tiles saved');
    expect(component.tooltip).toContain('Alternative map warmed');
    expect(component.tooltip).toContain('Storage protected');
    expect(component.tooltip.toLowerCase()).not.toContain('cannot');
    expect(component.tooltip.toLowerCase()).not.toContain('disabled');
  });

  // 2026-08-31: CI's headless Chrome (Linux) reports `matchMedia('(hover: none)')` as
  // matched by default - no real pointer device in that container - while a local headless
  // Chrome (Windows) reports the opposite, so this test passed locally and failed on every
  // push (5 in a row) until caught here. isTouchOnly() is stubbed explicitly in both tests
  // below so the assertion no longer depends on what the CI/local environment's own ambient
  // hover capability happens to be - see onDotClick()'s own doc comment for why the dot's
  // href needs to differ by touch capability at all.
  it('links to Mission on a non-touch device, where every tracked signal is resolved', () => {
    // A fresh, not-yet-checked fixture - the shared beforeEach above already ran
    // detectChanges() once against the real (unstubbed) isTouchOnly(), so spying afterwards
    // and re-checking would trip NG0100 (ExpressionChangedAfterItHasBeenCheckedError) the
    // moment the stub disagrees with whatever that first check already rendered.
    const freshFixture = TestBed.createComponent(MissionReadinessComponent);
    spyOn(freshFixture.componentInstance, 'isTouchOnly').and.returnValue(false);
    freshFixture.detectChanges();

    const dot: HTMLAnchorElement = freshFixture.nativeElement.querySelector('.readiness-dot');
    expect(dot.getAttribute('href')).toBe('/mission');
  });

  it('renders an inert (non-navigating) dot on a touch-only device, and emits dotActivated on click instead', () => {
    const freshFixture = TestBed.createComponent(MissionReadinessComponent);
    const freshComponent = freshFixture.componentInstance;
    spyOn(freshComponent, 'isTouchOnly').and.returnValue(true);
    freshFixture.detectChanges();

    const dot: HTMLAnchorElement = freshFixture.nativeElement.querySelector('.readiness-dot');
    expect(dot.getAttribute('href')).toBeNull();

    const spy = jasmine.createSpy('dotActivated');
    freshComponent.dotActivated.subscribe(spy);
    dot.click();
    expect(spy).toHaveBeenCalled();
  });

  // F29-21's row-links-to-specific-section test moved to header.component.spec.ts
  // (readinessItems()) - 2026-08-30, this component no longer renders its own tooltip rows,
  // see this file's own header comment.

  it('calls refresh() on init to pick up the async signals for this page view', () => {
    const readiness = TestBed.inject(MissionReadinessService);
    const spy = spyOn(readiness, 'refresh').and.callThrough();

    const freshFixture = TestBed.createComponent(MissionReadinessComponent);
    freshFixture.detectChanges();

    expect(spy).toHaveBeenCalled();
  });
});
