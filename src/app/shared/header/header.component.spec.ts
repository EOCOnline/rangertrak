import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { HeaderComponent } from './header.component';
import { ViewService } from '../services/view.service';
import { MissionType } from '../services';
import { Utility } from '../';

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

  // The readiness tests below switch the view, which ViewService stores; put it back.
  afterEach(() => {
    localStorage.removeItem('rt-view');
    localStorage.removeItem('rt-view-source');
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
    it('has six items in Full view, each linking to the specific page+section that fixes it', () => {
      TestBed.inject(ViewService).setView('full');
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

    it('drops the alternative-map row in Simple view, which hides that map', () => {
      TestBed.inject(ViewService).setView('simple');
      const items = component.readinessItems();
      expect(items.length).toBe(5);
      expect(items.some(i => i.label.includes('Alternative map warmed'))).toBeFalse();
    });
  });

  // 2026-10-19 (AAR): past a day the pill drops seconds so it fits a phone.
  it('pillDuration: hh:mm:ss under a day, "Nd h:mm" from a day on, never signed', () => {
    const day = 24 * 3600 * 1000
    expect(HeaderComponent.pillDuration(Utility.timeDiff(0, (1 * 3600 + 23 * 60 + 45) * 1000))).toBe('1:23:45');
    expect(HeaderComponent.pillDuration(Utility.timeDiff((1 * 3600 + 23 * 60 + 45) * 1000, 0))).toBe('1:23:45');
    expect(HeaderComponent.pillDuration(Utility.timeDiff(0, 11 * day + (19 * 3600 + 52 * 60 + 41) * 1000))).toBe('11d 19:52');
    expect(HeaderComponent.pillDuration(Utility.timeDiff(0, 1 * day + 5 * 60 * 1000))).toBe('1d 0:05');
  });
});
