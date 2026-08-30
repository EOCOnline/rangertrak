import { RangerType } from './ranger.interface';
import {
  isRangerId, migrateRangers, newRangerUid, normalizeRangerId, normalizeRangerIds,
  RANGER_SCHEMA_VERSION
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

  /**
   * A ranger with just enough shape for these tests. `extra` is deliberately untyped
   * (rather than `Partial<RangerType>`) so it can still carry a legacy `rew` property -
   * D-42 phase 8 dropped `rew` from `RangerType` itself, but `normalizeRangerIds()` must
   * keep reading it off raw, untyped data for the v0 migration step (see that function's
   * own header comment), and these tests are what pin that behavior.
   */
  function ranger(callsign: string, extra: Record<string, unknown> = {}): RangerType {
    return {
      callsign, fullName: '', phone: '', image: '', team: '', role: '', note: '',
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

  describe('newRangerUid / the surrogate key', () => {
    it('mints something unique every time', () => {
      const uids = new Set(Array.from({ length: 500 }, () => newRangerUid()));

      expect(uids.size).toBe(500);
      expect([...uids].every(u => typeof u === 'string' && u.length > 8)).toBeTrue();
    });
  });

  describe('normalizeRangerIds - the surrogate key (uid)', () => {
    it('mints a uid for every ranger, including ones with no credential at all', () => {
      // The whole point of the surrogate: `id` and `callsign` can BOTH be blank, so neither
      // can carry the join. `uid` always can.
      const result = normalizeRangerIds([ranger(''), ranger('CERT1'), ranger('ACS1', { rew: 'VI-01' })]);

      const uids = result.rangers.map(r => r.uid);
      expect(uids.every(u => !!u)).withContext('every ranger has a uid').toBeTrue();
      expect(new Set(uids).size).withContext('all distinct').toBe(3);
      expect(result.uidsMinted).toBe(3);
    });

    it('preserves an existing uid - it is the join key and must be stable', () => {
      // If a uid changed on load, every report pointing at it would orphan.
      const result = normalizeRangerIds([ranger('ACS1', { uid: 'stable-uid-1' })]);

      expect(result.rangers[0].uid).toBe('stable-uid-1');
      expect(result.uidsMinted).toBe(0);
    });

    it('RE-MINTS a duplicated uid, unlike a duplicated credential', () => {
      // The asymmetry that justifies having a surrogate at all. A shared uid is always
      // corruption (hand-edited file, copy-pasted row) and ours to fix silently. A shared
      // credential is a real claim about two people that only the operator can adjudicate -
      // see the duplicate-id test below, which deliberately does NOT rewrite anything.
      const result = normalizeRangerIds([
        ranger('A', { uid: 'same' }),
        ranger('B', { uid: 'same' }),
      ]);

      expect(result.rangers[0].uid).toBe('same');
      expect(result.rangers[1].uid).not.toBe('same');
      expect(result.uidsMinted).toBe(1);
    });

    it('is idempotent for uids - a second run mints nothing', () => {
      const first = normalizeRangerIds([ranger('A'), ranger('B'), ranger('C')]);
      const second = normalizeRangerIds(first.rangers);

      expect(second.rangers.map(r => r.uid)).toEqual(first.rangers.map(r => r.uid));
      expect(second.uidsMinted).toBe(0);
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
      const result = normalizeRangerIds([ranger('ACS1', { id: 'TEW-1003', rew: 'VI-01' })]);

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
      // would lose whatever that newer version added - same reasoning as migrateMission().
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
