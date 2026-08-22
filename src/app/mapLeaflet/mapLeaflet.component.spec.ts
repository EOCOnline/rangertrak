import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LmapComponent } from './mapLeaflet.component';

describe('LmapComponent', () => {
  let component: LmapComponent;
  let fixture: ComponentFixture<LmapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LmapComponent]
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

  // E-64 blocker: LmapComponent declared `implements OnDestroy` but never defined one, so
  // neither Leaflet instance was ever torn down on navigation away - invisible until a
  // repeated engine-switch toggle turns the latent leak into a real one. Real L.Map
  // instances (Karma runs in an actual browser via ChromeHeadless, not jsdom), so spying on
  // their own .remove() proves the fix's actual mechanism, not just that a method exists.
  it('removes both Leaflet instances on destroy (E-64 teardown fix)', () => {
    const lMap = (component as unknown as { lMap: { remove: () => void } }).lMap
    const overviewMapLeaflet = (component as unknown as { overviewMapLeaflet: { remove: () => void } }).overviewMapLeaflet
    expect(lMap).toBeTruthy()
    expect(overviewMapLeaflet).toBeTruthy()

    const lMapRemoveSpy = spyOn(lMap, 'remove').and.callThrough()
    const overviewRemoveSpy = spyOn(overviewMapLeaflet, 'remove').and.callThrough()

    fixture.destroy()

    expect(lMapRemoveSpy).toHaveBeenCalledTimes(1)
    expect(overviewRemoveSpy).toHaveBeenCalledTimes(1)
  });
});
