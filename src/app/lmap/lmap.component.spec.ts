import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LmapComponent } from './lmap.component';

describe('LmapComponent', () => {
  let component: LmapComponent;
  let fixture: ComponentFixture<LmapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ LmapComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(LmapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
