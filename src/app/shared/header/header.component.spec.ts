import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { HeaderComponent } from './header.component';
import { MissionType } from '../services';

function settingsWith(mission: string, event: string): MissionType {
  return {
    mission, event, eventNotes: '', opPeriod: '',
    opPeriodStart: new Date(), opPeriodEnd: new Date(),
  } as unknown as MissionType;
}

describe('HeaderComponent', () => {
  let component: HeaderComponent;
  let fixture: ComponentFixture<HeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ HeaderComponent ],
      // Renders MissionReadinessComponent, whose readiness dot is now a routerLink to
      // /settings - needs a Router present. HeaderComponent itself now injects
      // MissionReadinessService directly too (2026-08-30, readinessItems()), which needs
      // HttpClient.
      providers: [ provideRouter([]), provideHttpClient() ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(HeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // E-57(1): eventInfo used to always render "#mission: event", so a fresh install (or the
  // maintainer's own screenshots before Settings was filled in) showed the bare literal
  // "#:" - an isolated fragment in the newly-grouped status cluster.
  describe('eventInfo (E-57(1))', () => {
    it('is empty when neither mission nor event is set', () => {
      component.onNewSettings(settingsWith('', ''));
      expect(component.eventInfo()).toBe('');
    });

    it('is empty when both are only whitespace', () => {
      component.onNewSettings(settingsWith('  ', ' '));
      expect(component.eventInfo()).toBe('');
    });

    it('shows the real format once a mission is set', () => {
      component.onNewSettings(settingsWith('2026-014', ''));
      expect(component.eventInfo()).toBe('#2026-014: ');
    });

    it('shows the real format once an event name is set', () => {
      component.onNewSettings(settingsWith('', 'Vashon SAR Exercise'));
      expect(component.eventInfo()).toBe('#: Vashon SAR Exercise');
    });
  });

  // Raised live 2026-08-30: ported from MissionReadinessComponent's own now-removed
  // `items` getter, since its per-row hover tooltip merged into this component's
  // `.rt-mission-info-panel` - see that component's own updated spec/comment for why.
  describe('readinessItems() (ported from MissionReadinessComponent)', () => {
    it('has six items, each linking to the specific page+section that fixes it', () => {
      const items = component.readinessItems();
      expect(items.length).toBe(6);

      const roster = items.find(i => i.label.includes('Real roster loaded'));
      expect(roster?.route).toBe('/rangers');
      expect(roster?.fragment).toBe('rangersgrid');

      const tiles = items.find(i => i.label.includes('Offline map tiles saved'));
      expect(tiles?.route).toBe('/map');
      expect(tiles?.fragment).toBe('readiness-offline-tiles');

      const warmed = items.find(i => i.label.includes('Alternative map warmed'));
      expect(warmed?.route).toBe('/map');
      expect(warmed?.fragment).toBe('readiness-map-engine-switch');

      const storage = items.find(i => i.label.includes('Storage protected'));
      expect(storage?.route).toBe('/mission');
      expect(storage?.fragment).toBe('readiness-storage-protection');

      const mission = items.find(i => i.label === 'Mission named');
      const opPeriod = items.find(i => i.label.includes('Operating period current'));
      expect(mission?.route).toBe('/mission');
      expect(mission?.fragment).toBe('readiness-mission-details');
      expect(opPeriod?.route).toBe('/mission');
      expect(opPeriod?.fragment).toBe('readiness-mission-details');
    });
  });
});
