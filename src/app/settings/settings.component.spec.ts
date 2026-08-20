import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SettingsComponent } from './settings.component';
import { provideSwUpdateStub } from '../../testing/sw-update.stub';

describe('SettingsComponent', () => {
  let component: SettingsComponent;
  let fixture: ComponentFixture<SettingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ SettingsComponent ],
      // E-55: Settings now renders InstallUpdateComponent, which injects UpdateService,
      // which needs SwUpdate present even though it stays disabled here (same reasoning as
      // footer.component.spec.ts).
      providers: [ provideSwUpdateStub() ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
