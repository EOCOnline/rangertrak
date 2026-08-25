import { FieldReportsType } from './field-report.interface';
import { FIELD_REPORT_SCHEMA_VERSION, migrateFieldReports } from './field-report-migration';

/**
 * The field-report versioning seam (2026-08-26). There is deliberately no data transform
 * behind it yet - no legacy reports exist to transform - so these pin the seam's *contract*
 * rather than any particular migration: what counts as a usable store, what happens to data
 * from a newer build, and that a re-run is inert.
 */
describe('field-report-migration', () => {

  function store(extra: Partial<FieldReportsType> = {}): FieldReportsType {
    return {
      version: '0.55.0', date: new Date(), event: '',
      bounds: { north: 1, south: -1, east: 1, west: -1 },
      numReport: 0, maxId: 0, filter: '', fieldReportArray: [],
      ...extra
    } as FieldReportsType;
  }

  it('stamps the current version onto an unversioned store', () => {
    const result = migrateFieldReports(store());

    expect(result).not.toBeNull();
    expect(result!.schemaVersion).toBe(FIELD_REPORT_SCHEMA_VERSION);
  });

  it('preserves everything else while stamping', () => {
    const original = store({ event: 'Exercise', numReport: 3, maxId: 7 });

    const result = migrateFieldReports(original)!;

    expect(result.event).toBe('Exercise');
    expect(result.numReport).toBe(3);
    expect(result.maxId).toBe(7);
    expect(result.version).toBe('0.55.0');
  });

  it('is idempotent - a second run changes nothing', () => {
    const once = migrateFieldReports(store())!;
    const twice = migrateFieldReports(once)!;

    expect(twice).toEqual(once);
  });

  it('leaves data from a NEWER build alone rather than downgrading it', () => {
    const future = store({ schemaVersion: FIELD_REPORT_SCHEMA_VERSION + 5 } as Partial<FieldReportsType>);

    const result = migrateFieldReports(future)!;

    expect(result.schemaVersion).toBe(FIELD_REPORT_SCHEMA_VERSION + 5);
  });

  it('returns null for anything that is not a usable store', () => {
    // null means "call your own initializer" - building an empty store needs SettingsService,
    // and that logic already lives in FieldReportService.initEmptyFieldReports().
    for (const junk of [null, undefined, 'nonsense', 42, [], {}]) {
      expect(migrateFieldReports(junk)).toBeNull();
    }
  });

  it('rejects an object missing the report array specifically', () => {
    const { fieldReportArray, ...withoutArray } = store();

    expect(migrateFieldReports(withoutArray)).toBeNull();
  });

  it('does not mutate the store passed in', () => {
    const original = store();
    const snapshot = JSON.stringify(original);

    migrateFieldReports(original);

    expect(JSON.stringify(original)).toBe(snapshot);
  });
});
