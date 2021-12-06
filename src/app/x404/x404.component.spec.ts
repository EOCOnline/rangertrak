import { ComponentFixture, TestBed } from '@angular/core/testing';

import { X404Component } from './x404.component';

describe('X404Component', () => {
  let component: X404Component;
  let fixture: ComponentFixture<X404Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ X404Component ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(X404Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
