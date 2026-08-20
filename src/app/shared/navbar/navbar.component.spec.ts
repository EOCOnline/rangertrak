import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';

import { NavbarComponent } from './navbar.component';
import { provideSwUpdateStub } from '../../../testing/sw-update.stub';

describe('NavbarComponent', () => {
  let component: NavbarComponent;
  let fixture: ComponentFixture<NavbarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      // The navbar's routerLink/routerLinkActive directives inject ActivatedRoute,
      // which only exists once a router is configured - NG0201 without this.
      imports: [ RouterTestingModule, NavbarComponent ],
      // E-55: the navbar now renders InstallUpdateComponent, which injects UpdateService,
      // which needs SwUpdate present even though it stays disabled here (same reasoning as
      // footer.component.spec.ts).
      providers: [ provideSwUpdateStub() ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(NavbarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
