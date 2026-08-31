import { RadioLogType } from './radio-log-entry.interface';
import { RADIO_LOG_SCHEMA_VERSION, migrateRadioLog } from './radio-log-migration';

/**
 * The radio-log versioning seam (2026-08-26). There is deliberately no data transform
 * behind it yet - no legacy reports exist to transform - so these pin the seam's *contract*
 * rather than any particular migration: what counts as a usable store, what happens to data
 * from a newer build, and that a re-run is inert.
 */
describe('radio-log-migration', () => {

  function store(extra: Partial<RadioLogType> = {}): RadioLogType {
    return {
      version: '0.55.0', date: new Date(), event: '',
      bounds: { north: 1, south: -1, east: 1, west: -1 },
      numReport: 0, maxId: 0, filter: '', logEntries: [],
      ...extra
    } as RadioLogType;
  }

  it('stamps the current version onto an unversioned store', () => {
    const result = migrateRadioLog(store());

    expect(result).not.toBeNull();
    expect(result!.schemaVersion).toBe(RADIO_LOG_SCHEMA_VERSION);
  });

  it('preserves everything else while stamping', () => {
    const original = store({ event: 'Exercise', numReport: 3, maxId: 7 });

    const result = migrateRadioLog(original)!;

    expect(result.event).toBe('Exercise');
    expect(result.numReport).toBe(3);
    expect(result.maxId).toBe(7);
    expect(result.version).toBe('0.55.0');
  });

  it('is idempotent - a second run changes nothing', () => {
    const once = migrateRadioLog(store())!;
    const twice = migrateRadioLog(once)!;

    expect(twice).toEqual(once);
  });

  it('leaves data from a NEWER build alone rather than downgrading it', () => {
    const future = store({ schemaVersion: RADIO_LOG_SCHEMA_VERSION + 5 } as Partial<RadioLogType>);

    const result = migrateRadioLog(future)!;

    expect(result.schemaVersion).toBe(RADIO_LOG_SCHEMA_VERSION + 5);
  });

  it('returns null for anything that is not a usable store', () => {
    // null means "call your own initializer" - building an empty store needs MissionService,
    // and that logic already lives in RadioLogService.initEmptyRadioLog().
    for (const junk of [null, undefined, 'nonsense', 42, [], {}]) {
      expect(migrateRadioLog(junk)).toBeNull();
    }
  });

  it('rejects an object missing the report array specifically', () => {
    const { logEntries, ...withoutArray } = store();

    expect(migrateRadioLog(withoutArray)).toBeNull();
  });

  it('does not mutate the store passed in', () => {
    const original = store();
    const snapshot = JSON.stringify(original);

    migrateRadioLog(original);

    expect(JSON.stringify(original)).toBe(snapshot);
  });
});
