import { FieldReportType } from './field-report.interface';
import { RangerType } from './ranger.interface';
import {
  assignRangerIds, backfillReportRangerIds, isRangerId, normalizeRangerId
} from './ranger-migration';

/**
 * ADR D-42 Phase 1. These pin the two properties the whole migration rests on:
 *
 *  1. **Idempotency** - running on already-migrated data changes nothing. Both functions are
 *     designed to be called unconditionally on every load rather than behind a schema-version
 *     gate ([[settings-schema-version-discipline]]), which is only safe if a re-run is inert.
 *  2. **No silent data loss** - a duplicate credential still yields two distinguishable
 *     rangers, and a report whose callsign matches nobody keeps its callsign instead of being
 *     dropped or mis-attached.
 */
describe('ranger-migration (ADR D-42)', () => {

  /** A ranger with just enough shape for these tests. */
  function ranger(callsign: string, extra: Partial<RangerType> = {}): RangerType {
    return {
      callsign, fullName: '', phone: '', image: '', rew: '', team: '', role: '', note: '',
      ...extra
    } as RangerType;
  }

  /** A report with just enough shape for these tests. */
  function report(callsign: string, extra: Record<string, unknown> = {}): FieldReportType {
    return {
      id: 1, callsign, location: { lat: 0, lng: 0, address: '', derivedFromAddress: false },
      date: new Date(), status: 'Normal', notes: '', ...extra
    } as unknown as FieldReportType;
  }

  describe('normalizeRangerId', () => {
    it('keeps an already-ID-shaped credential verbatim, preserving its regional prefix', () => {
      // The real stored shape in this codebase - "VI" for Vashon Island. Rewriting it to
      // REW-0038 would break correspondence with the issuing agency's own records.
      expect(normalizeRangerId('VI-0038')).toBe('VI-0038');
      expect(normalizeRangerId('VI-01')).toBe('VI-01');
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
      expect(isRangerId('TEW-1000')).toBeTrue();
      expect(isRangerId('CmdPost')).toBeFalse();
      expect(isRangerId('')).toBeFalse();
    });
  });

  describe('assignRangerIds', () => {
    it('seeds an id from an existing rew credential', () => {
      const result = assignRangerIds([ranger('ACS1', { rew: 'VI-01' })]);

      expect(result.rangers[0].id).toBe('VI-01');
      expect(result.fromCredential).toBe(1);
      expect(result.synthesized).toBe(0);
    });

    it('synthesizes a TEW id when there is no usable credential', () => {
      const result = assignRangerIds([
        ranger('CERT1'),                              // rew: ''
        ranger('!CmdPost', { rew: 'CmdPost' }),       // rew present but not an identifier
      ]);

      expect(result.rangers[0].id).toBe('TEW-1000');
      expect(result.rangers[1].id).toBe('TEW-1001');
      expect(result.synthesized).toBe(2);
      expect(result.collisions).toBe(0);
    });

    it('gives every ranger an id, including ones with neither callsign nor credential', () => {
      // The exact population D-42 exists for: CERT/MERT responders who are not ham-licensed.
      const result = assignRangerIds([ranger(''), ranger(''), ranger('')]);

      const ids = result.rangers.map(r => r.id);
      expect(ids.every(id => !!id)).withContext('no ranger left without an id').toBeTrue();
      expect(new Set(ids).size).withContext('ids are unique').toBe(3);
    });

    it('breaks a duplicate credential rather than leaving an ambiguous join key', () => {
      // Unlike import-time duplicate-callsign handling (which only warns), this runs
      // automatically with nobody watching - two rangers sharing a join key would silently
      // make every report against either one ambiguous.
      const result = assignRangerIds([
        ranger('ACS1', { rew: 'VI-01' }),
        ranger('ACS2', { rew: 'VI-01' }),
      ]);

      expect(result.rangers[0].id).withContext('first in array order keeps it').toBe('VI-01');
      expect(result.rangers[1].id).toBe('TEW-1000');
      expect(result.rangers[0].id).not.toBe(result.rangers[1].id);
      expect(result.collisions).withContext('reported, not hidden').toBe(1);
    });

    it('is idempotent - a second run changes nothing and reports no work', () => {
      // This is what makes it safe to call unconditionally on every load.
      const first = assignRangerIds([
        ranger('ACS1', { rew: 'VI-01' }),
        ranger('CERT1'),
        ranger('CERT2', { rew: 'VI-01' }),   // collides, gets a TEW
      ]);
      const second = assignRangerIds(first.rangers);

      expect(second.rangers.map(r => r.id)).toEqual(first.rangers.map(r => r.id));
      expect(second.unchanged).toBe(3);
      expect(second.fromCredential).toBe(0);
      expect(second.synthesized).toBe(0);
      expect(second.collisions).toBe(0);
    });

    it('does not renumber a synthesized id on a later run when a new ranger joins', () => {
      // A scribe adding someone mid-mission must not shuffle everyone else's identity.
      const first = assignRangerIds([ranger('CERT1'), ranger('CERT2')]);
      const withNewcomer = [...first.rangers, ranger('CERT3')];
      const second = assignRangerIds(withNewcomer);

      expect(second.rangers[0].id).toBe(first.rangers[0].id);
      expect(second.rangers[1].id).toBe(first.rangers[1].id);
      expect(second.rangers[2].id).withContext('newcomer gets a fresh, unused id').toBe('TEW-1002');
    });

    it('does not mutate the rangers passed in', () => {
      const input = [ranger('ACS1', { rew: 'VI-01' })];
      const snapshot = JSON.stringify(input);

      assignRangerIds(input);

      expect(JSON.stringify(input)).toBe(snapshot);
    });

    it('handles an empty roster (the new blank-start default) without throwing', () => {
      const result = assignRangerIds([]);
      expect(result.rangers).toEqual([]);
      expect(result.synthesized).toBe(0);
    });
  });

  describe('backfillReportRangerIds', () => {
    const roster = assignRangerIds([
      ranger('ACS1', { rew: 'VI-01' }),
      ranger('CERT1'),
    ]).rangers;

    it('resolves a report to the ranger whose callsign it was filed against', () => {
      const result = backfillReportRangerIds([report('ACS1')], roster);

      expect(result.reports[0].rangerId).toBe('VI-01');
      expect(result.resolved).toBe(1);
      expect(result.unmatched).toBe(0);
    });

    it('matches case-insensitively, mirroring the roster warning and photo matching', () => {
      const result = backfillReportRangerIds([report('acs1'), report('  ACS1  ')], roster);

      expect(result.reports.map(r => r.rangerId)).toEqual(['VI-01', 'VI-01']);
      expect(result.resolved).toBe(2);
    });

    it('keeps the callsign on a report that matches nobody, instead of dropping it', () => {
      // A report can outlive the ranger it names. Losing the callsign would destroy the only
      // evidence of who actually reported.
      const result = backfillReportRangerIds([report('GHOST9')], roster);

      expect(result.reports[0].callsign).toBe('GHOST9');
      expect(result.reports[0].rangerId).toBe('');
      expect(result.unmatched).toBe(1);
    });

    it('never mis-attaches a blank-callsign report to some arbitrary ranger', () => {
      const result = backfillReportRangerIds([report(''), report('   ')], roster);

      expect(result.reports.map(r => r.rangerId)).toEqual(['', '']);
      expect(result.unmatched).toBe(2);
    });

    it('keeps the callsign alongside the resolved id, not in place of it', () => {
      const result = backfillReportRangerIds([report('ACS1')], roster);

      expect(result.reports[0].callsign).withContext('primary radio evidence').toBe('ACS1');
      expect(result.reports[0].rangerId).toBe('VI-01');
    });

    it('is idempotent - a second run changes nothing', () => {
      const first = backfillReportRangerIds(
        [report('ACS1'), report('CERT1'), report('GHOST9')], roster);
      const second = backfillReportRangerIds(first.reports, roster);

      expect(second.reports.map(r => (r as any).rangerId))
        .toEqual(first.reports.map(r => (r as any).rangerId));
      expect(second.unchanged).withContext('the two that resolved').toBe(2);
      expect(second.resolved).toBe(0);
    });

    it('re-resolves a previously unmatched report once its ranger exists', () => {
      // Import the roster AFTER the reports - a real ordering during mission setup.
      const orphaned = backfillReportRangerIds([report('MERT1')], roster);
      expect(orphaned.unmatched).toBe(1);

      const widened = assignRangerIds([...roster, ranger('MERT1', { rew: 'VI-21' })]).rangers;
      const rescued = backfillReportRangerIds(orphaned.reports, widened);

      expect(rescued.reports[0].rangerId).toBe('VI-21');
      expect(rescued.resolved).toBe(1);
    });

    it('does not mutate the reports passed in', () => {
      const input = [report('ACS1')];
      const snapshot = JSON.stringify(input);

      backfillReportRangerIds(input, roster);

      expect(JSON.stringify(input)).toBe(snapshot);
    });
  });
});
