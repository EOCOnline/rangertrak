import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { FieldReportsComponent } from './field-reports.component';

describe('FieldReportsComponent', () => {
  let component: FieldReportsComponent;
  let fixture: ComponentFixture<FieldReportsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ FieldReportsComponent ],
      // HeaderComponent renders MissionReadinessComponent, whose readiness dot is now a
      // routerLink to /settings - needs a Router in every test that mounts the shared
      // page chrome, not just specs that touch routing directly.
      providers: [ provideRouter([]) ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FieldReportsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
