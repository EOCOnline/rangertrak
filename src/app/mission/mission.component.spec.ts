import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { MissionComponent } from './mission.component';
import { provideSwUpdateStub } from '../../testing/sw-update.stub';

describe('MissionComponent', () => {
  let component: MissionComponent;
  let fixture: ComponentFixture<MissionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ MissionComponent ],
      providers: [
        // E-55: Settings now renders InstallUpdateComponent, which injects UpdateService,
        // which needs SwUpdate present even though it stays disabled here (same reasoning
        // as footer.component.spec.ts).
        provideSwUpdateStub(),
        // HeaderComponent renders MissionReadinessComponent, whose readiness dot is now a
        // routerLink to /settings - needs a Router in every test that mounts the shared
        // page chrome, not just specs that touch routing directly.
        provideRouter([]),
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MissionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Operational Period clamping (E-71)', () => {
    it('pulls the end time up to match when the start moves past it', () => {
      // Establish a known baseline first - MissionService's real, un-mocked default
      // opPeriodStart is "now", so asserting against a hardcoded end time without first
      // pinning the start left this test dependent on wall-clock time at run time.
      component.onNewTimeEventStart(new Date('2026-08-20T09:00:00'));
      component.onNewTimeEventEnd(new Date('2026-08-20T12:00:00'));

      const laterStart = new Date('2026-08-20T14:00:00');
      component.onNewTimeEventStart(laterStart);

      expect(component.opPeriodEnd()).toEqual(laterStart);
    });

    it('snaps the end time to start when set earlier than start', () => {
      const start = new Date('2026-08-20T10:00:00');
      component.onNewTimeEventStart(start);

      component.onNewTimeEventEnd(new Date('2026-08-20T08:00:00'));

      expect(component.opPeriodEnd()).toEqual(start);
    });

    it('leaves the end time alone when it is already after the new start', () => {
      // Same reasoning as the test above - pin a known start before setting the end, so
      // the end isn't clamped against MissionService's real "now" default first.
      component.onNewTimeEventStart(new Date('2026-08-20T06:00:00'));
      const end = new Date('2026-08-20T12:00:00');
      component.onNewTimeEventEnd(end);

      component.onNewTimeEventStart(new Date('2026-08-20T09:00:00'));

      expect(component.opPeriodEnd()).toEqual(end);
    });
  });
});
