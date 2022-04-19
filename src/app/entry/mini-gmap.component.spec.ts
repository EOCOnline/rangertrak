import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MiniGMapComponent } from './mini-gmap.component';

describe('MiniGMapComponent', () => {
  let component: MiniGMapComponent;
  let fixture: ComponentFixture<MiniGMapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MiniGMapComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MiniGMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
