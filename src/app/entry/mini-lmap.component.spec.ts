import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MiniLMapComponent } from './mini-lmap.component';

describe('MiniLMapComponent', () => {
  let component: MiniLMapComponent;
  let fixture: ComponentFixture<MiniLMapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MiniLMapComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MiniLMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
