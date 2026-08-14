import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';

import { FieldReportService } from './field-report.service';
import { FieldReportsType, FieldReportType } from './field-report.interface';

/**
 * Characterization tests: pin FieldReportService's current localStorage-backed
 * behavior before the signals rewrite (PRIVATE-Roadmap.md Section 8/R4, Section 12
 * step 3), covering the DoD: localStorage round-trip, bounds calc, and
 * report add/select/delete.
 *
 * RangerService and SettingsService are used for real (not mocked): all three
 * domain services are simple localStorage wrappers with no network calls in
 * their construction path, so exercising them together is closer to real
 * behavior than stubbing their public surface.
 */
describe('FieldReportService', () => {
  const STORAGE_KEY = 'fieldReports';

  function makeReport(overrides: Partial<FieldReportType> = {}): string {
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
      const service = TestBed.inject(FieldReportService);
      let latest!: FieldReportsType;
      service.getFieldReportsObserver().subscribe(r => latest = r);

      expect(latest.numReport).toBe(0);
      expect(latest.fieldReportArray).toEqual([]);
    });

    it('persists a newly added report to localStorage under the "fieldReports" key', () => {
      const service = TestBed.inject(FieldReportService);
      service.addfieldReport(makeReport({ callsign: 'ROUND1' }));

      const stored: FieldReportsType = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
      expect(stored.fieldReportArray.length).toBe(1);
      expect(stored.fieldReportArray[0].callsign).toBe('ROUND1');
    });

    it('reloads a previously-saved report set on next construction (the actual round-trip)', () => {
      const first = TestBed.inject(FieldReportService);
      first.addfieldReport(makeReport({ callsign: 'PERSISTED' }));

      // Simulate a fresh app load: new injector, same localStorage.
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({ providers: [provideHttpClient()] });
      const second = TestBed.inject(FieldReportService);

      let latest!: FieldReportsType;
      second.getFieldReportsObserver().subscribe(r => latest = r);
      expect(latest.fieldReportArray.some(r => r.callsign === 'PERSISTED')).toBeTrue();
    });

    it('rebuilds from defaults and preserves the original under a "-BAD" key when localStorage has no version marker', () => {
      localStorage.setItem(STORAGE_KEY, '{"garbage": true}');

      const service = TestBed.inject(FieldReportService);
      let latest!: FieldReportsType;
      service.getFieldReportsObserver().subscribe(r => latest = r);

      expect(latest.numReport).toBe(0);
      expect(localStorage.getItem(STORAGE_KEY + '-BAD')).toContain('garbage');
    });
  });

  describe('addfieldReport', () => {
    it('assigns a sequential id and increments maxId', () => {
      const service = TestBed.inject(FieldReportService);
      const r1 = service.addfieldReport(makeReport());
      const r2 = service.addfieldReport(makeReport());

      expect(r2.id).toBe(r1.id + 1);
    });

    it('publishes the updated set to subscribers', () => {
      const service = TestBed.inject(FieldReportService);
      let latest!: FieldReportsType;
      service.getFieldReportsObserver().subscribe(r => latest = r);

      service.addfieldReport(makeReport({ callsign: 'PUB1' }));

      expect(latest.fieldReportArray.some(r => r.callsign === 'PUB1')).toBeTrue();
      expect(latest.numReport).toBe(1);
    });
  });

  describe('setSelectedFieldReports / getSelectedFieldReports (select)', () => {
    it('returns an empty selection before anything has been selected', () => {
      const service = TestBed.inject(FieldReportService);
      expect(service.getSelectedFieldReports().fieldReportArray).toEqual([]);
      expect(service.getSelectedFieldReports().numReport).toBe(0);
    });

    it('stores and returns exactly the reports passed to setSelectedFieldReports', () => {
      const service = TestBed.inject(FieldReportService);
      const r1 = service.addfieldReport(makeReport({ callsign: 'SEL1' }));
      service.addfieldReport(makeReport({ callsign: 'SEL2' }));

      service.setSelectedFieldReports([r1]);
      const selected = service.getSelectedFieldReports();

      expect(selected.numReport).toBe(1);
      expect(selected.fieldReportArray[0].callsign).toBe('SEL1');
    });
  });

  describe('deleteAllFieldReports (delete)', () => {
    it('empties the report array and removes the localStorage key', () => {
      const service = TestBed.inject(FieldReportService);
      service.addfieldReport(makeReport());
      service.addfieldReport(makeReport());

      service.deleteAllFieldReports();

      let latest!: FieldReportsType;
      service.getFieldReportsObserver().subscribe(r => latest = r);
      expect(latest.fieldReportArray).toEqual([]);
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });
  });

  describe('recalcFieldBounds (bounds calc)', () => {
    // NOTE: addfieldReport() does NOT call recalcFieldBounds() - it only
    // calls Leaflet's native LatLngBounds.extend(), which has its own
    // (correct) min/max unioning and applies no broadening margin. The
    // custom min/max + broadening logic below lives ONLY in
    // recalcFieldBounds() itself (called by the constructor and by
    // generateFakeData()), so it must be exercised directly to actually
    // test it - which also means calling it directly on a hand-built
    // FieldReportsType is the correct way to pin the Sprint 0 west-bound
    // fix (field-report.service.ts recalcFieldBounds: was `>`, now `<`).
    function reportsWith(points: { lat: number, lng: number }[]): FieldReportsType {
      return {
        version: '1', date: new Date(), event: '',
        bounds: undefined as any, // recalcFieldBounds always overwrites this
        numReport: points.length, maxId: points.length, filter: '',
        fieldReportArray: points.map((p, i) => ({
          id: i, callsign: `R${i}`, location: { ...p, address: '', derivedFromAddress: false },
          date: new Date(), status: 'Normal', notes: ''
        }))
      };
    }

    it('shrinks the west edge to the westernmost (most negative) longitude across reports', () => {
      // Regression test for the Sprint 0 fix: this comparison used `>`
      // instead of `<`, so west never actually moved past the first report's
      // longitude no matter what came after it.
      const service = TestBed.inject(FieldReportService);
      const reports = reportsWith([{ lat: 47.45, lng: -122.40 }, { lat: 47.45, lng: -122.50 }]);

      service.recalcFieldBounds(reports);

      expect(reports.bounds.getWest()).toBe(-122.50);
    });

    it('expands the east edge to the easternmost (least negative) longitude across reports', () => {
      const service = TestBed.inject(FieldReportService);
      const reports = reportsWith([{ lat: 47.45, lng: -122.50 }, { lat: 47.45, lng: -122.40 }]);

      service.recalcFieldBounds(reports);

      expect(reports.bounds.getEast()).toBe(-122.40);
    });

    it('tracks north/south correctly across multiple reports', () => {
      const service = TestBed.inject(FieldReportService);
      const reports = reportsWith([{ lat: 47.40, lng: -122.45 }, { lat: 47.50, lng: -122.45 }]);

      service.recalcFieldBounds(reports);

      expect(reports.bounds.getNorth()).toBe(47.50);
      expect(reports.bounds.getSouth()).toBe(47.40);
    });

    it('broadens a too-narrow bounding box to a minimum margin around a single report', () => {
      const service = TestBed.inject(FieldReportService);
      const reports = reportsWith([{ lat: 47.45, lng: -122.45 }]);

      service.recalcFieldBounds(reports);

      // A single point has zero width/height, so the broadening margin must apply.
      expect(reports.bounds.getEast()).toBeGreaterThan(-122.45);
      expect(reports.bounds.getWest()).toBeLessThan(-122.45);
      expect(reports.bounds.getNorth()).toBeGreaterThan(47.45);
      expect(reports.bounds.getSouth()).toBeLessThan(47.45);
    });

    it('centers the bounds on the mission default lat/lng when there are no reports', () => {
      const service = TestBed.inject(FieldReportService);
      const reports = reportsWith([]);

      service.recalcFieldBounds(reports);

      // Settings default is (47.4472, -122.4627); with no reports, bounds
      // fall back to that point, broadened by the margin.
      expect(reports.bounds.contains([47.4472, -122.4627])).toBeTrue();
    });
  });
});
