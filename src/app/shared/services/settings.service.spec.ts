import { TestBed } from '@angular/core/testing';

import { SettingsService } from './settings.service';
import { SettingsType } from './settings.interface';

/**
 * Characterization tests: pin SettingsService's current localStorage-backed
 * behavior before the signals rewrite (USE-CASES.md Section 8/R4, Section 12
 * step 3). These assert what the service actually does today, not what it
 * should do.
 */
describe('SettingsService', () => {
  const STORAGE_KEY = 'appSettings';

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('construction / localStorage round-trip', () => {
    it('initializes hardcoded defaults when localStorage is empty', () => {
      const service = TestBed.inject(SettingsService);

      expect(service.settings.defLat).toBe(47.4472);
      expect(service.settings.defLng).toBe(-122.4627);
      expect(service.settings.defPlusCode).toBe('84VVCGWP+VW');
      expect(service.settings.fieldReportStatuses.length).toBe(7);
    });

    it('stamps settings.version from package.json rather than the hardcoded default', () => {
      const service = TestBed.inject(SettingsService);
      expect(service.settings.version).not.toBe('0');
      expect(service.settings.version.length).toBeGreaterThan(0);
    });

    it('persists the initialized defaults to localStorage', () => {
      TestBed.inject(SettingsService);
      const stored = localStorage.getItem(STORAGE_KEY);
      expect(stored).not.toBeNull();
      const parsed = JSON.parse(stored!);
      expect(parsed.defPlusCode).toBe('84VVCGWP+VW');
    });

    it('loads existing settings from localStorage when present and well-formed', () => {
      const custom = {
        settingsName: '', settingsDate: new Date(),
        mission: '99', event: 'Test Event', eventNotes: '',
        opPeriod: '', opPeriodStart: new Date(), opPeriodEnd: new Date(),
        application: 'RangerTrak', version: '9.9.9', debugMode: false,
        defLat: 1.111, defLng: 2.222, defPlusCode: 'CUSTOM+CODE',
        w3wLocale: 'Nowhere', allowManualPinDrops: false,
        leaflet: { defZoom: 1, markerScheme: '', overviewDifference: 1, overviewMinZoom: 1, overviewMaxZoom: 1 },
        google: { defZoom: 1, markerScheme: '', overviewDifference: 1, overviewMinZoom: 1, overviewMaxZoom: 1 },
        imageDirectory: './assets/imgs/', defFieldReportStatus: 0,
        fieldReportStatuses: []
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(custom));

      const service = TestBed.inject(SettingsService);

      // Current behavior: everything from localStorage is preserved except
      // `version`, which is always overwritten from package.json after load.
      expect(service.settings.mission).toBe('99');
      expect(service.settings.defLat).toBe(1.111);
      expect(service.settings.defPlusCode).toBe('CUSTOM+CODE');
      expect(service.settings.version).not.toBe('9.9.9');
    });

    it('falls back to hardcoded defaults when localStorage JSON lacks the "defPlusCode" marker', () => {
      // The current load check is a naive substring test for "defPlusCode"
      // in the raw stored string, not real schema validation.
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ mission: '42' }));

      const service = TestBed.inject(SettingsService);

      expect(service.settings.defLat).toBe(47.4472);
      expect(service.settings.mission).toBe('');
    });

    it('preserves unparseable localStorage content under a "-BAD" key and falls back to defaults', () => {
      localStorage.setItem(STORAGE_KEY, '{not valid json, has defPlusCode though');

      const service = TestBed.inject(SettingsService);

      expect(service.settings.defLat).toBe(47.4472);
      expect(localStorage.getItem(STORAGE_KEY + '-BAD')).toContain('defPlusCode');
    });
  });

  describe('updateSettings', () => {
    it('persists the new settings to localStorage and publishes to subscribers', () => {
      const service = TestBed.inject(SettingsService);
      let latest: SettingsType | undefined;
      service.getSettingsObserver().subscribe(s => latest = s);

      const updated = { ...service.settings, mission: 'Mission 7' };
      service.updateSettings(updated);

      expect(service.settings.mission).toBe('Mission 7');
      expect(latest?.mission).toBe('Mission 7');
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
      expect(stored.mission).toBe('Mission 7');
    });
  });

  describe('ResetDefaults', () => {
    it('restores hardcoded defaults and persists them', () => {
      const service = TestBed.inject(SettingsService);
      service.updateSettings({ ...service.settings, mission: 'Something Else' });

      const result = service.ResetDefaults();

      expect(result.defLat).toBe(47.4472);
      expect(service.settings.mission).toBe('');
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
      expect(stored.defPlusCode).toBe('84VVCGWP+VW');
    });
  });
});
