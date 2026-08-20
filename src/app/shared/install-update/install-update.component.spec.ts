import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideSwUpdateStub } from '../../../testing/sw-update.stub';
import { InstallUpdateComponent } from './install-update.component';
import { UpdateService } from '../services';

describe('InstallUpdateComponent', () => {
  let component: InstallUpdateComponent;
  let fixture: ComponentFixture<InstallUpdateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ InstallUpdateComponent ],
      // Injects UpdateService, which needs SwUpdate present even though it stays
      // disabled here (same reasoning as footer.component.spec.ts, which this
      // component's update-ready state used to live in).
      providers: [ provideHttpClient(), provideSwUpdateStub() ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(InstallUpdateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders nothing when neither installable nor an update is ready', () => {
    expect(component.installable).toBeFalse();
    expect(component.updateReady).toBeFalse();
    expect(fixture.nativeElement.querySelector('.rt-install-update')).toBeNull();
  });

  describe('[fixed]=true (E-43)', () => {
    it('renders nothing while no update is ready, even if installable', () => {
      fixture.componentRef.setInput('fixed', true);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.rt-install-update')).toBeNull();
    });

    it('renders the sticky update banner once an update is ready, and nothing else', () => {
      fixture.componentRef.setInput('fixed', true);
      TestBed.inject(UpdateService).updateReady.set(true);
      fixture.detectChanges();
      const el = fixture.nativeElement.querySelector('.rt-install-update');
      expect(el).not.toBeNull();
      expect(el.classList.contains('rt-install-update--fixed')).toBeTrue();
      expect(el.classList.contains('rt-install-update--update')).toBeTrue();
      // The install offer must never appear in the fixed instance, regardless of
      // `installable` - see the component's doc comment on why.
      expect(fixture.nativeElement.querySelector('.rt-install-update--install')).toBeNull();
      // The actual E-43 claim, checked against Angular's real scoped stylesheet (not a
      // synthetic DOM injection, which emulated view encapsulation would silently ignore -
      // see tools/e2e-adjacent verification script's own comment on that trap).
      const style = getComputedStyle(el);
      expect(style.position).toBe('sticky');
      expect(Number(style.zIndex)).toBeGreaterThan(900); // above the back-to-top control
    });
  });
});
