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
    expect(component.tooltip).toContain('Backup map warmed');
    expect(component.tooltip).toContain('Storage protected');
    expect(component.tooltip.toLowerCase()).not.toContain('cannot');
    expect(component.tooltip.toLowerCase()).not.toContain('disabled');
  });

  it('links to Settings, where every tracked signal is resolved', () => {
    const dot: HTMLAnchorElement = fixture.nativeElement.querySelector('.readiness-dot');
    expect(dot.getAttribute('href')).toBe('/settings');
  });

  it('calls refresh() on init to pick up the async signals for this page view', () => {
    const readiness = TestBed.inject(MissionReadinessService);
    const spy = spyOn(readiness, 'refresh').and.callThrough();

    const freshFixture = TestBed.createComponent(MissionReadinessComponent);
    freshFixture.detectChanges();

    expect(spy).toHaveBeenCalled();
  });
});
