import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GEOCODING_PROVIDER, NominatimGeocoder } from '../shared';
import { LocationComponent } from './location.component';

describe('LocationComponent', () => {
  let component: LocationComponent;
  let fixture: ComponentFixture<LocationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ LocationComponent ],
      providers: [
        { provide: GEOCODING_PROVIDER, useValue: new NominatimGeocoder() }
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(LocationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // E-114 §1a (2026-08-31): "the ranger will almost always use the same coordinate system,
  // so initially we offer ALL OPTIONS, then just default to that."
  describe('remembered coordinate format', () => {
    afterEach(() => {
      localStorage.removeItem('lastCoordinateFormat');
    });

    it('setActiveSystem persists the choice for next time', () => {
      component.setActiveSystem('UTM');
      expect(localStorage.getItem('lastCoordinateFormat')).toBe('UTM');
    });

    it('a fresh component opens on the remembered format, outranking the mission default', () => {
      localStorage.setItem('lastCoordinateFormat', 'MGRS');

      const freshFixture = TestBed.createComponent(LocationComponent);
      freshFixture.detectChanges();

      expect(freshFixture.componentInstance.activeSystem()).toBe('MGRS');
    });

    it('ignores a garbage stored value rather than crashing', () => {
      localStorage.setItem('lastCoordinateFormat', 'not-a-real-format');

      const freshFixture = TestBed.createComponent(LocationComponent);
      expect(() => freshFixture.detectChanges()).not.toThrow();
      expect(freshFixture.componentInstance.activeSystem()).toBe('DD');
    });
  });
});
