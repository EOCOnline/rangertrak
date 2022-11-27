import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InstallPromptComponent } from './install-prompt.component';

describe('InstallPromptComponent', () => {
  let component: InstallPromptComponent;
  let fixture: ComponentFixture<InstallPromptComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ InstallPromptComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InstallPromptComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
