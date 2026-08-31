import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { GEOCODING_PROVIDER, NominatimGeocoder } from '../shared';
import { FieldModeService } from '../shared/services';
import { EntryComponent } from './entry.component';

describe('EntryComponent', () => {
  let component: EntryComponent;
  let fixture: ComponentFixture<EntryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ EntryComponent ],
      providers: [
        { provide: GEOCODING_PROVIDER, useValue: new NominatimGeocoder() },
        // HeaderComponent renders MissionReadinessComponent, whose readiness dot is now a
        // routerLink to /settings - needs a Router in every test that mounts the shared
        // page chrome, not just specs that touch routing directly.
        provideRouter([]),
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(EntryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // E-114 §1a/§2b (2026-08-31): GPS auto-fill and the connectivity indicator are field-mode
  // only - a command-post/scribe laptop's own position/connectivity has never mattered to
  // Entry (see tryGpsAutoFill()'s and isOnline's own doc comments in entry.component.ts).
  describe('field mode', () => {
    afterEach(() => {
      localStorage.removeItem('fieldMode');
    });

    it('does not request a GPS fix on a normal (non-field-mode) device', () => {
      const spy = spyOn(navigator.geolocation, 'getCurrentPosition');
      const freshFixture = TestBed.createComponent(EntryComponent);
      freshFixture.detectChanges();
      expect(spy).not.toHaveBeenCalled();
    });

    it('requests a GPS fix once on a field-mode device', () => {
      // FieldModeService is providedIn: 'root' - a singleton within this TestBed module, and
      // the outer beforeEach above already constructed EntryComponent (and so its enabled
      // signal) before this test runs. Setting localStorage directly here would arrive too
      // late for that already-initialized signal to see it - enable() updates the SAME live
      // instance EntryComponent already has injected, not just localStorage.
      TestBed.inject(FieldModeService).enable();
      const spy = spyOn(navigator.geolocation, 'getCurrentPosition');
      const freshFixture = TestBed.createComponent(EntryComponent);
      freshFixture.detectChanges();
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('shows the connectivity indicator only on a field-mode device', () => {
      TestBed.inject(FieldModeService).enable();
      const freshFixture = TestBed.createComponent(EntryComponent);
      freshFixture.detectChanges();
      const el: HTMLElement = freshFixture.nativeElement.querySelector('.entry-connectivity');
      expect(el).toBeTruthy();
    });

    it('hides the connectivity indicator on a normal device', () => {
      const el: HTMLElement = fixture.nativeElement.querySelector('.entry-connectivity');
      expect(el).toBeFalsy();
    });
  });
});
