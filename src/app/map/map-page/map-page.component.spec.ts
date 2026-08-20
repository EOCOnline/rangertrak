import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MapPageComponent } from './map-page.component';
import { MapComponent } from '../map.component';

describe('MapPageComponent', () => {
  let component: MapPageComponent;
  let fixture: ComponentFixture<MapPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MapPageComponent]
    })
      .compileComponents();
  });

  beforeEach(async () => {
    fixture = TestBed.createComponent(MapPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    // Let the default Leaflet instance's own zoom-in animation settle before any test tears
    // it down - flipping engines (or destroying the fixture) while it's still in-flight can
    // throw asynchronously from Leaflet's own internal transition-end handler.
    await new Promise(resolve => setTimeout(resolve, 300));
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // E-64: Leaflet is the hardcoded default - no auto-detection, no readiness signals.
  it('mounts Leaflet by default, not MapLibre', async () => {
    expect(component.engine()).toBe('leaflet');
    expect(fixture.nativeElement.querySelector('.lmap-container')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.map-container')).toBeFalsy();
    await new Promise(resolve => setTimeout(resolve, 300)); // let Leaflet's zoom-in animation settle
  });

  // The entire reason MapPageComponent exists as a route-level shell rather than a
  // statically-importing component: MapLibre must stay behind a real dynamic import() so a
  // visitor who never flips the switch never fetches its chunk.
  it('dynamically imports and mounts MapLibre only when the switch is flipped', async () => {
    expect(component.maplibreComponentType()).toBeNull();

    const fakeEvent = { target: { checked: true } } as unknown as Event;
    await component.onEngineSwitchChanged(fakeEvent);
    fixture.detectChanges();

    expect(component.engine()).toBe('maplibre');
    expect(component.maplibreComponentType()).toBe(MapComponent);

    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.map-container')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.lmap-container')).toBeFalsy();
    await new Promise(resolve => setTimeout(resolve, 300));
  });

  it('flipping back to Leaflet unmounts MapLibre and remounts Leaflet', async () => {
    const toMaplibre = { target: { checked: true } } as unknown as Event;
    await component.onEngineSwitchChanged(toMaplibre);
    fixture.detectChanges();
    // Let Leaflet's own zoom-in animation settle before the next mount/destroy cycle -
    // without this, a rapid flip-flip-destroy sequence can outlive a still-in-flight
    // Leaflet-internal animation timer and throw asynchronously in afterAll.
    await new Promise(resolve => setTimeout(resolve, 300));

    const toLeaflet = { target: { checked: false } } as unknown as Event;
    await component.onEngineSwitchChanged(toLeaflet);
    fixture.detectChanges();

    expect(component.engine()).toBe('leaflet');
    expect(fixture.nativeElement.querySelector('.lmap-container')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.map-container')).toBeFalsy();

    await new Promise(resolve => setTimeout(resolve, 300));
  });
});
