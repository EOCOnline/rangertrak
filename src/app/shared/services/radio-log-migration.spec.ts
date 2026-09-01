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

/**
 * The 0.90.5 JSON-date bug, radio-log half. See json-dates.ts for the class of bug; the
 * concrete symptom here was that buildIcs309Log() threw `getTime is not a function` for any
 * operator with two or more saved reports, because their `date` was an ISO string.
 *
 * These deliberately round-trip through JSON.parse(JSON.stringify(...)) - the same thing
 * localStorage and a .rtmission backup do - rather than hand-writing string literals, so
 * they exercise the real cause rather than a guess at it.
 */
describe('migrateRadioLog date rehydration', () => {

  function roundTripped(extra: Partial<RadioLogType> = {}): RadioLogType {
    const live = {
      version: '0.90.5', date: new Date('2026-08-31T10:00:00.000Z'), event: '',
      bounds: { north: 1, south: -1, east: 1, west: -1 },
      numReport: 2, maxId: 2, filter: '',
      schemaVersion: RADIO_LOG_SCHEMA_VERSION,
      logEntries: [
        {
          id: 0, callsign: 'ACS1', status: 'Normal', notes: '',
          location: { lat: 0, lng: 0, address: '', derivedFromAddress: false },
          date: new Date('2026-08-31T12:00:00.000Z'),
        },
        {
          id: 1, callsign: 'ACS2', status: 'Normal', notes: '',
          location: { lat: 0, lng: 0, address: '', derivedFromAddress: false },
          date: new Date('2026-08-31T09:00:00.000Z'),
          revisedAt: new Date('2026-08-31T13:00:00.000Z'),
          printedAt: new Date('2026-08-31T14:00:00.000Z'),
        },
      ],
      ...extra
    } as RadioLogType;
    return JSON.parse(JSON.stringify(live)) as RadioLogType;
  }

  it('restores the store\'s own date', () => {
    const stored = roundTripped();
    expect(typeof (stored.date as unknown)).toBe('string'); // precondition

    const result = migrateRadioLog(stored);

    expect(result!.date instanceof Date).toBe(true);
  });

  it('restores every entry timestamp, including the optional ones', () => {
    const result = migrateRadioLog(roundTripped());

    expect(result!.logEntries[0].date instanceof Date).toBe(true);
    expect(result!.logEntries[1].date instanceof Date).toBe(true);
    expect(result!.logEntries[1].revisedAt instanceof Date).toBe(true);
    expect(result!.logEntries[1].printedAt instanceof Date).toBe(true);
  });

  it('preserves each instant exactly', () => {
    const result = migrateRadioLog(roundTripped());

    expect(result!.logEntries[0].date.toISOString()).toBe('2026-08-31T12:00:00.000Z');
    expect(result!.logEntries[1].date.toISOString()).toBe('2026-08-31T09:00:00.000Z');
  });

  it('leaves an absent optional timestamp absent, rather than defaulting it to the epoch', () => {
    const result = migrateRadioLog(roundTripped());

    expect(result!.logEntries[0].revisedAt).toBeUndefined();
    expect(result!.logEntries[0].printedAt).toBeUndefined();
  });

  it('restores dates even for a store from a NEWER schema, which is returned unmigrated', () => {
    // The newer-than-we-understand branch returns early. Deserialization still has to
    // happen there or this build throws while rendering data it chose not to migrate.
    const result = migrateRadioLog(roundTripped({
      schemaVersion: RADIO_LOG_SCHEMA_VERSION + 1
    } as Partial<RadioLogType>));

    expect(result!.schemaVersion).toBe(RADIO_LOG_SCHEMA_VERSION + 1);
    expect(result!.logEntries[0].date instanceof Date).toBe(true);
  });

  it('makes a round-tripped store safe to sort the way buildIcs309Log does', () => {
    const result = migrateRadioLog(roundTripped());

    // The exact expression that threw on 0.90.5.
    expect(() => [...result!.logEntries]
      .sort((a, b) => a.date.getTime() - b.date.getTime())).not.toThrow();
  });
});
