import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { RadioLogComponent } from './radio-log.component';

describe('RadioLogComponent', () => {
  let component: RadioLogComponent;
  let fixture: ComponentFixture<RadioLogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ RadioLogComponent ],
      // HeaderComponent renders MissionReadinessComponent, whose readiness dot is now a
      // routerLink to /settings - needs a Router in every test that mounts the shared
      // page chrome, not just specs that touch routing directly.
      providers: [ provideRouter([]) ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(RadioLogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
