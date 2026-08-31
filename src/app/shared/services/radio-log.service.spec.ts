import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';

import { RadioLogService } from './radio-log.service';
import { RadioLogType, RadioLogEntryType } from './radio-log-entry.interface';

/**
 * Characterization tests: pin RadioLogService's current localStorage-backed
 * behavior before the signals rewrite (PRIVATE-Roadmap.md Section 8/R4, Section 12
 * step 3), covering the DoD: localStorage round-trip, bounds calc, and
 * report add/select/delete.
 *
 * RangerService and MissionService are used for real (not mocked): all three
 * domain services are simple localStorage wrappers with no network calls in
 * their construction path, so exercising them together is closer to real
 * behavior than stubbing their public surface.
 */
describe('RadioLogService', () => {
  const STORAGE_KEY = 'radioLog';

  function makeReport(overrides: Partial<RadioLogEntryType> = {}): string {
    return JSON.stringify({
      id: 0,
      callsign: 'TEST1',
      location: { lat: 47.4472, lng: -122.4627, address: '', derivedFromAddress: false },
      date: new Date(),
      status: 'Normal',
      notes: '',
      ...overrides
    });
  }

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient()]
    });
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('construction / localStorage round-trip', () => {
    it('initializes an empty report set when localStorage is empty', () => {
      const service = TestBed.inject(RadioLogService);
      let latest!: RadioLogType;
      service.getRadioLogObserver().subscribe(r => latest = r);

      expect(latest.numReport).toBe(0);
      expect(latest.logEntries).toEqual([]);
    });

    it('persists a newly added report to localStorage under the "radioLog" key', () => {
      const service = TestBed.inject(RadioLogService);
      service.addRadioLogEntry(makeReport({ callsign: 'ROUND1' }));

      const stored: RadioLogType = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
      expect(stored.logEntries.length).toBe(1);
      expect(stored.logEntries[0].callsign).toBe('ROUND1');
    });

    it('reloads a previously-saved report set on next construction (the actual round-trip)', () => {
      const first = TestBed.inject(RadioLogService);
      first.addRadioLogEntry(makeReport({ callsign: 'PERSISTED' }));

      // Simulate a fresh app load: new injector, same localStorage.
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({ providers: [provideHttpClient()] });
      const second = TestBed.inject(RadioLogService);

      let latest!: RadioLogType;
      second.getRadioLogObserver().subscribe(r => latest = r);
      expect(latest.logEntries.some(r => r.callsign === 'PERSISTED')).toBeTrue();
    });

    it('rebuilds from defaults and preserves the original under a "-BAD" key when localStorage has no version marker', () => {
      localStorage.setItem(STORAGE_KEY, '{"garbage": true}');

      const service = TestBed.inject(RadioLogService);
      let latest!: RadioLogType;
      service.getRadioLogObserver().subscribe(r => latest = r);

      expect(latest.numReport).toBe(0);
      expect(localStorage.getItem(STORAGE_KEY + '-BAD')).toContain('garbage');
    });
  });

  describe('addRadioLogEntry', () => {
    it('assigns a sequential id and increments maxId', () => {
      const service = TestBed.inject(RadioLogService);
      const r1 = service.addRadioLogEntry(makeReport());
      const r2 = service.addRadioLogEntry(makeReport());

      expect(r2.id).toBe(r1.id + 1);
    });

    it('publishes the updated set to subscribers', () => {
      const service = TestBed.inject(RadioLogService);
      let latest!: RadioLogType;
      service.getRadioLogObserver().subscribe(r => latest = r);

      service.addRadioLogEntry(makeReport({ callsign: 'PUB1' }));

      expect(latest.logEntries.some(r => r.callsign === 'PUB1')).toBeTrue();
      expect(latest.numReport).toBe(1);
    });
  });

  describe('saveEditedRadioLog (grid edits)', () => {
    it('persists in-place edits to localStorage and republishes them', () => {
      const service = TestBed.inject(RadioLogService);
      const added = service.addRadioLogEntry(makeReport({ callsign: 'EDIT1' }));

      // Exactly what AG Grid does when a cell is edited: the grid binds to the
      // service's own report objects, so it mutates this object directly.
      added.notes = 'corrected by scribe';
      added.location.lat = 47.5;
      service.saveEditedRadioLog();

      const stored: RadioLogType = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
      expect(stored.logEntries[0].notes).toBe('corrected by scribe');

      let latest!: RadioLogType;
      service.getRadioLogObserver().subscribe(r => latest = r);
      expect(latest.logEntries[0].notes).toBe('corrected by scribe');
    });

    it('recalculates bounds so an edited coordinate moves the map extent', () => {
      const service = TestBed.inject(RadioLogService);
      const added = service.addRadioLogEntry(makeReport());

      added.location.lat = 48.5;
      added.location.lng = -120.5;
      service.saveEditedRadioLog();

      const bounds = service.getCurrentRadioLog().bounds;
      expect(bounds.north).toBeGreaterThanOrEqual(48.5);
      expect(bounds.west).toBeLessThanOrEqual(-120.5);
    });
  });

  describe('setSelectedRadioLogEntries / getSelectedRadioLogEntries (select)', () => {
    it('returns an empty selection before anything has been selected', () => {
      const service = TestBed.inject(RadioLogService);
      expect(service.getSelectedRadioLogEntries().logEntries).toEqual([]);
      expect(service.getSelectedRadioLogEntries().numReport).toBe(0);
    });

    it('stores and returns exactly the reports passed to setSelectedRadioLogEntries', () => {
      const service = TestBed.inject(RadioLogService);
      const r1 = service.addRadioLogEntry(makeReport({ callsign: 'SEL1' }));
      service.addRadioLogEntry(makeReport({ callsign: 'SEL2' }));

      service.setSelectedRadioLogEntries([r1]);
      const selected = service.getSelectedRadioLogEntries();

      expect(selected.numReport).toBe(1);
      expect(selected.logEntries[0].callsign).toBe('SEL1');
    });
  });

  describe('deleteAllRadioLogEntries (delete)', () => {
    it('empties the report array and removes the localStorage key', () => {
      const service = TestBed.inject(RadioLogService);
      service.addRadioLogEntry(makeReport());
      service.addRadioLogEntry(makeReport());

      service.deleteAllRadioLogEntries();

      let latest!: RadioLogType;
      service.getRadioLogObserver().subscribe(r => latest = r);
      expect(latest.logEntries).toEqual([]);
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });
  });

  describe('recalcRadioLogBounds (bounds calc)', () => {
    // recalcRadioLogBounds() is now the ONLY path that computes bounds - the
    // second path (Leaflet's LatLngBounds.extend() inside addRadioLogEntry(),
    // which applied no broadening margin) was D-22 and is gone. Calling it
    // directly on a hand-built RadioLogType still pins the Sprint 0
    // west-bound fix (was `>`, now `<`) most precisely.
    function reportsWith(points: { lat: number, lng: number }[]): RadioLogType {
      return {
        version: '1', date: new Date(), event: '',
        bounds: undefined as any, // recalcRadioLogBounds always overwrites this
        numReport: points.length, maxId: points.length, filter: '',
        logEntries: points.map((p, i) => ({
          id: i, callsign: `R${i}`, location: { ...p, address: '', derivedFromAddress: false },
          date: new Date(), status: 'Normal', notes: ''
        }))
      };
    }

    it('shrinks the west edge to the westernmost (most negative) longitude across reports', () => {
      // Regression test for the Sprint 0 fix: this comparison used `>`
      // instead of `<`, so west never actually moved past the first report's
      // longitude no matter what came after it.
      const service = TestBed.inject(RadioLogService);
      const reports = reportsWith([{ lat: 47.45, lng: -122.40 }, { lat: 47.45, lng: -122.50 }]);

      service.recalcRadioLogBounds(reports);

      expect(reports.bounds.west).toBe(-122.50);
    });

    it('expands the east edge to the easternmost (least negative) longitude across reports', () => {
      const service = TestBed.inject(RadioLogService);
      const reports = reportsWith([{ lat: 47.45, lng: -122.50 }, { lat: 47.45, lng: -122.40 }]);

      service.recalcRadioLogBounds(reports);

      expect(reports.bounds.east).toBe(-122.40);
    });

    it('tracks north/south correctly across multiple reports', () => {
      const service = TestBed.inject(RadioLogService);
      const reports = reportsWith([{ lat: 47.40, lng: -122.45 }, { lat: 47.50, lng: -122.45 }]);

      service.recalcRadioLogBounds(reports);

      expect(reports.bounds.north).toBe(47.50);
      expect(reports.bounds.south).toBe(47.40);
    });

    it('broadens a too-narrow bounding box to a minimum margin around a single report', () => {
      const service = TestBed.inject(RadioLogService);
      const reports = reportsWith([{ lat: 47.45, lng: -122.45 }]);

      service.recalcRadioLogBounds(reports);

      // A single point has zero width/height, so the broadening margin must apply.
      expect(reports.bounds.east).toBeGreaterThan(-122.45);
      expect(reports.bounds.west).toBeLessThan(-122.45);
      expect(reports.bounds.north).toBeGreaterThan(47.45);
      expect(reports.bounds.south).toBeLessThan(47.45);
    });

    it('centers the bounds on the mission default lat/lng when there are no reports', () => {
      const service = TestBed.inject(RadioLogService);
      const reports = reportsWith([]);

      service.recalcRadioLogBounds(reports);

      // Settings default is (47.4472, -122.4627); with no reports, bounds
      // fall back to that point, broadened by the margin.
      expect(reports.bounds.south).toBeLessThan(47.4472);
      expect(reports.bounds.north).toBeGreaterThan(47.4472);
      expect(reports.bounds.west).toBeLessThan(-122.4627);
      expect(reports.bounds.east).toBeGreaterThan(-122.4627);
    });
  });
});
