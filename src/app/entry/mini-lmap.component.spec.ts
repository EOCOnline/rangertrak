import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MiniLMapComponent } from './mini-lmap.component';

describe('MiniLMapComponent', () => {
  let component: MiniLMapComponent;
  let fixture: ComponentFixture<MiniLMapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ MiniLMapComponent ]
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

  // E-64 blocker: same gap as LmapComponent (see its spec) - declared OnDestroy, never
  // defined it, so the map was never torn down leaving Entry. Entry is the most-visited
  // page, so this leak fired on every visit.
  it('removes the Leaflet instance on destroy (E-64 teardown fix)', () => {
    const lMap = (component as unknown as { lMap: { remove: () => void } }).lMap
    expect(lMap).toBeTruthy()

    const removeSpy = spyOn(lMap, 'remove').and.callThrough()

    fixture.destroy()

    expect(removeSpy).toHaveBeenCalledTimes(1)
  });
});
