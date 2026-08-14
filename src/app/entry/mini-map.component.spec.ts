import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MiniMapComponent } from './mini-map.component';

describe('MiniMapComponent', () => {
  let component: MiniMapComponent;
  let fixture: ComponentFixture<MiniMapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MiniMapComponent]
    })
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MiniMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('accepts a new location without throwing', () => {
    expect(() => {
      component.locationUpdated = { lat: 47.44, lng: -122.46, address: 'Test Rd', derivedFromAddress: false };
    }).not.toThrow();
  });
});
