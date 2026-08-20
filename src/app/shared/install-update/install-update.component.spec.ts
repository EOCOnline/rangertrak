import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideSwUpdateStub } from '../../../testing/sw-update.stub';
import { InstallUpdateComponent } from './install-update.component';

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
});
