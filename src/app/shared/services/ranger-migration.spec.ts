import { RangerType } from './ranger.interface';
import {
  isRangerId, migrateRangers, normalizeRangerId, normalizeRangerIds, RANGER_SCHEMA_VERSION
} from './ranger-migration';

/**
 * ADR D-42 Phase 1. These pin the properties the migration seam rests on:
 *
 *  1. **Nothing is invented.** TEW numbers are issued at check-in by the incident, not by
 *     this app - a minted `TEW-1000` would be a fabricated credential that could collide with
 *     a genuinely issued one. A ranger with no number is a legitimate "hasn't checked in yet"
 *     state, reported rather than filled.
 *  2. **Idempotency** - a re-run changes nothing, which is what makes it safe to call on
 *     every load rather than behind a version gate ([[settings-schema-version-discipline]]).
 *  3. **Real stored values survive.** `VI-0038` is not rewritten to `REW-0038`; the regional
 *     prefix presumably matches the issuing agency's own records.
 */
describe('ranger-migration (ADR D-42)', () => {

  /** A ranger with just enough shape for these tests. */
  function ranger(callsign: string, extra: Partial<RangerType> = {}): RangerType {
    return {
      callsign, fullName: '', phone: '', image: '', rew: '', team: '', role: '', note: '',
      ...extra
    } as RangerType;
  }

  describe('normalizeRangerId', () => {
    it('keeps an already-ID-shaped credential verbatim, preserving its regional prefix', () => {
      // The real stored shape in this codebase - "VI" for Vashon Island. Rewriting it to
      // REW-0038 would break correspondence with the issuing agency's own records.
      expect(normalizeRangerId('VI-0038')).toBe('VI-0038');
      expect(normalizeRangerId('VI-01')).toBe('VI-01');
      expect(normalizeRangerId('TEW-1003')).toBe('TEW-1003');
    });

    it('does NOT re-pad digits inside an already-shaped value', () => {
      // VI-1 must not become VI-0001 - the stored string is what matches a real record.
      expect(normalizeRangerId('VI-1')).toBe('VI-1');
    });

    it('upper-cases the prefix so case cannot split one identity into two', () => {
      expect(normalizeRangerId('vi-0038')).toBe('VI-0038');
      expect(normalizeRangerId('Vi-0038')).toBe('VI-0038');
    });

    it('trims surrounding whitespace (the real AddRanger default is "VI-00 ")', () => {
      expect(normalizeRangerId('VI-00 ')).toBe('VI-00');
      expect(normalizeRangerId('  VI-07  ')).toBe('VI-07');
    });

    it('promotes a bare number to the credential prefix, zero-padded', () => {
      expect(normalizeRangerId('38')).toBe('REW-0038');
      expect(normalizeRangerId('1003')).toBe('REW-1003');
    });

    it('rejects anything unusable as an identifier', () => {
      // "CmdPost" is a real stored rew value - a label, not a number.
      expect(normalizeRangerId('CmdPost')).toBe('');
      expect(normalizeRangerId('')).toBe('');
      expect(normalizeRangerId('   ')).toBe('');
      expect(normalizeRangerId(null)).toBe('');
      expect(normalizeRangerId(undefined)).toBe('');
    });

    it('isRangerId agrees with normalizeRangerId on canonical values', () => {
      expect(isRangerId('VI-0038')).toBeTrue();
      expect(isRangerId('TEW-1003')).toBeTrue();
      expect(isRangerId('CmdPost')).toBeFalse();
      expect(isRangerId('')).toBeFalse();
    });
  });

  describe('normalizeRangerIds', () => {
    it('seeds an id from an existing rew credential', () => {
      const result = normalizeRangerIds([ranger('ACS1', { rew: 'VI-01' })]);

      expect(result.rangers[0].id).toBe('VI-01');
      expect(result.identified).toBe(1);
      expect(result.missing).toBe(0);
    });

    it('prefers an explicit id over the rew it would otherwise be seeded from', () => {
      const result = normalizeRangerIds([ranger('ACS1', { id: 'TEW-1003', rew: 'VI-01' } as Partial<RangerType>)]);

      expect(result.rangers[0].id).toBe('TEW-1003');
    });

    it('NEVER invents a number - a ranger who has not checked in has none', () => {
      // The single most important property here. TEW numbers are issued at check-in by the
      // incident; a minted one could collide with a real issued number.
      const result = normalizeRangerIds([
        ranger('CERT1'),                          // rew: ''
        ranger('!CmdPost', { rew: 'CmdPost' }),   // rew present but not an identifier
        ranger(''),                               // nothing at all
      ]);

      expect(result.rangers.map(r => r.id)).toEqual(['', '', '']);
      expect(result.missing).toBe(3);
      expect(result.identified).toBe(0);
    });

    it('reports duplicates rather than silently rewriting one of them', () => {
      // Ambiguous and worth a loud warning, but it is the operator's data to fix - we cannot
      // invent a replacement number, and picking a winner silently would hide a real problem.
      const result = normalizeRangerIds([
        ranger('ACS1', { rew: 'VI-01' }),
        ranger('ACS2', { rew: 'VI-01' }),
        ranger('ACS3', { rew: 'VI-02' }),
      ]);

      expect(result.duplicates).toEqual(['VI-01']);
      expect(result.rangers[0].id).toBe('VI-01');
      expect(result.rangers[1].id).withContext('left as-is, not rewritten').toBe('VI-01');
      expect(result.identified).toBe(3);
    });

    it('treats differently-cased duplicates as the same identity', () => {
      const result = normalizeRangerIds([
        ranger('ACS1', { rew: 'VI-01' }),
        ranger('ACS2', { rew: 'vi-01' }),
      ]);

      expect(result.duplicates).toEqual(['VI-01']);
    });

    it('does not count a missing id as a duplicate of another missing one', () => {
      const result = normalizeRangerIds([ranger('A'), ranger('B'), ranger('C')]);

      expect(result.duplicates).toEqual([]);
      expect(result.missing).toBe(3);
    });

    it('is idempotent - a second run produces identical output', () => {
      // This is what makes it safe to call unconditionally on every load.
      const input = [
        ranger('ACS1', { rew: 'VI-01' }),
        ranger('CERT1'),
        ranger('CERT2', { rew: 'vi-02' }),
      ];
      const first = normalizeRangerIds(input);
      const second = normalizeRangerIds(first.rangers);

      expect(second.rangers).toEqual(first.rangers);
      expect(second.identified).toBe(first.identified);
      expect(second.missing).toBe(first.missing);
      expect(second.duplicates).toEqual(first.duplicates);
    });

    it('does not mutate the rangers passed in', () => {
      const input = [ranger('ACS1', { rew: 'VI-01' })];
      const snapshot = JSON.stringify(input);

      normalizeRangerIds(input);

      expect(JSON.stringify(input)).toBe(snapshot);
    });

    it('handles an empty roster (the blank-start default) without throwing', () => {
      const result = normalizeRangerIds([]);

      expect(result.rangers).toEqual([]);
      expect(result.missing).toBe(0);
      expect(result.duplicates).toEqual([]);
    });
  });

  describe('migrateRangers', () => {
    it('wraps a bare array - the pre-versioning shape localStorage holds today', () => {
      const result = migrateRangers([ranger('ACS1', { rew: 'VI-01' })]);

      expect(result.schemaVersion).toBe(RANGER_SCHEMA_VERSION);
      expect(result.rangers.length).toBe(1);
      expect(result.rangers[0].id).toBe('VI-01');
    });

    it('passes an already-current roster through unchanged', () => {
      const once = migrateRangers([ranger('ACS1', { rew: 'VI-01' })]);
      const twice = migrateRangers(once);

      expect(twice).toEqual(once);
    });

    it('leaves data from a NEWER build alone rather than downgrading it', () => {
      // Someone running an older build against newer data. Silently "migrating" it backwards
      // would lose whatever that newer version added - same reasoning as migrateSettings().
      const future = { schemaVersion: RANGER_SCHEMA_VERSION + 5, rangers: [ranger('ACS1')] };

      const result = migrateRangers(future);

      expect(result.schemaVersion).toBe(RANGER_SCHEMA_VERSION + 5);
      expect(result.rangers.length).toBe(1);
    });

    it('yields an empty current-version roster for anything unusable', () => {
      // A blank roster is a meaningful state since 0.55.0 ("Rangers should start blank"),
      // so this is a correct answer rather than a papered-over failure.
      for (const junk of [null, undefined, 'nonsense', 42, {}]) {
        const result = migrateRangers(junk);
        expect(result.schemaVersion).toBe(RANGER_SCHEMA_VERSION);
        expect(result.rangers).toEqual([]);
      }
    });
  });
});
