import type { RadioLogEntryType } from '../shared/services/radio-log-entry.interface';
import type { AttachmentRef } from './attachments';
import { mergeEntries } from './entry-merge';

/** ADR D-59: the seven cases the E-188 brief requires, plus the validation moved here. */
describe('entry-merge (D-59)', () => {

  const entry = (over: Partial<RadioLogEntryType> = {}): RadioLogEntryType => ({
    id: 0, uid: 'e-0', callsign: 'K7AAA', rangerUid: 'r-a',
    location: { lat: 47.4, lng: -122.4, address: '', derivedFromAddress: false },
    date: new Date('2026-10-15T10:00:00Z'), status: 'Normal', notes: 'n',
    ...over,
  });

  /** One device: its list and the next display id, merging in what another sent. */
  class Device {
    constructor(public entries: RadioLogEntryType[], public nextId: number) { }
    receive(incoming: RadioLogEntryType[], uidRemap?: Record<string, string>) {
      const r = mergeEntries(this.entries, incoming, { nextId: this.nextId, uidRemap });
      this.entries = r.entries;
      this.nextId = r.nextId;
      return r;
    }
  }

  // Through JSON, as a file would carry them.
  const viaFile = (list: RadioLogEntryType[]) => JSON.parse(JSON.stringify(list)) as RadioLogEntryType[];

  it('1. merging the same file twice: the second time everything is unchanged', () => {
    const b = new Device([], 0);
    const file = viaFile([entry({ id: 0, uid: 'u1' }), entry({ id: 1, uid: 'u2' })]);

    const first = b.receive(file);
    const second = b.receive(file);

    expect(first.added).toBe(2);
    expect(second).toEqual(jasmine.objectContaining({ added: 0, updated: 0, unchanged: 2, rejected: 0 }));
    expect(b.entries.length).toBe(2);
  });

  it('2. round trip A to B (renumbered) and back to A creates no duplicates on A', () => {
    const a = new Device([entry({ id: 0, uid: 'a-0' }), entry({ id: 1, uid: 'a-1' })], 2);
    const b = new Device([entry({ id: 0, uid: 'b-0', callsign: 'K7BBB' })], 1);

    b.receive(viaFile(a.entries));
    expect(b.entries.map(e => e.id)).toEqual([0, 1, 2]);   // A's entries renumbered on B
    const back = a.receive(viaFile(b.entries));

    expect(a.entries.length).toBe(3);                      // A's own two plus B's one
    expect(back.added).toBe(1);
    expect(back.unchanged).toBe(2);
    expect(new Set(a.entries.map(e => e.uid)).size).toBe(3);
  });

  it('3. two senders, same id, same ranger, different uids: both kept', () => {
    const b = new Device([], 0);

    b.receive([entry({ id: 5, uid: 'from-a', rangerUid: 'r-x' })]);
    b.receive([entry({ id: 5, uid: 'from-c', rangerUid: 'r-x' })]);

    expect(b.entries.length).toBe(2);
  });

  it('4. a walk-up typed on both devices: after the remap the incoming entry carries the receiver uid', () => {
    const b = new Device([], 0);
    // mergeRangers() kept B's uid for the person A knew as 'sender-uid'.
    const remap = { 'sender-uid': 'receiver-uid' };

    b.receive([entry({ uid: 'u1', rangerUid: 'sender-uid', toRangerUid: 'sender-uid' })], remap);

    expect(b.entries[0].rangerUid).toBe('receiver-uid');
    expect(b.entries[0].toRangerUid).toBe('receiver-uid');
  });

  describe('5. an edit is carried', () => {
    it('a later revisedAt updates in place and keeps this device display id', () => {
      const b = new Device([entry({ id: 7, uid: 'u1', notes: 'old' })], 8);

      const r = b.receive(viaFile([entry({ id: 2, uid: 'u1', notes: 'corrected', revisedAt: new Date('2026-10-15T11:00:00Z') })]));

      expect(r.updated).toBe(1);
      expect(r.updatedNotes[0].id).toBe(7);
      expect(b.entries.length).toBe(1);
      expect(b.entries[0].notes).toBe('corrected');
      expect(b.entries[0].id).toBe(7);
      expect(b.entries[0].revisedAt instanceof Date).toBe(true);
    });

    it('an earlier or equal revisedAt, or none on both sides, is unchanged', () => {
      const t = new Date('2026-10-15T11:00:00Z');
      const b = new Device([entry({ uid: 'u1', notes: 'mine', revisedAt: t }), entry({ id: 1, uid: 'u2', notes: 'mine' })], 2);

      const r = b.receive(viaFile([
        entry({ uid: 'u1', notes: 'older', revisedAt: new Date('2026-10-15T10:30:00Z') }),
        entry({ id: 1, uid: 'u2', notes: 'same' }),
      ]));

      expect(r.updated).toBe(0);
      expect(r.unchanged).toBe(2);
      expect(b.entries.map(e => e.notes)).toEqual(['mine', 'mine']);
    });

    it('an entry never revised counts as older than any revision', () => {
      const b = new Device([entry({ uid: 'u1', notes: 'unrevised' })], 1);

      const r = b.receive(viaFile([entry({ uid: 'u1', notes: 'revised', revisedAt: new Date('2026-10-15T09:00:00Z') })]));

      expect(r.updated).toBe(1);
      expect(b.entries[0].notes).toBe('revised');
    });

    it('does not let an incoming copy that was never revised overwrite a revised one', () => {
      const b = new Device([entry({ uid: 'u1', notes: 'revised', revisedAt: new Date('2026-10-15T09:00:00Z') })], 1);

      const r = b.receive([entry({ uid: 'u1', notes: 'unrevised' })]);

      expect(r.updated).toBe(0);
      expect(b.entries[0].notes).toBe('revised');
    });
  });

  describe('6. entries with no uid (an older Report Packet) dedupe by sourceUid', () => {
    const legacy = (id: number) => {
      const e = entry({ id, rangerUid: 'r-field' });
      delete e.uid;
      return e;
    };

    it('the same packet twice adds once, and stamps uid and sourceUid on arrival', () => {
      const b = new Device([], 0);
      const packet = viaFile([legacy(0), legacy(1)]);

      const first = b.receive(packet);
      const second = b.receive(packet);

      expect(first.added).toBe(2);
      expect(second).toEqual(jasmine.objectContaining({ added: 0, unchanged: 2 }));
      expect(b.entries.map(e => e.sourceUid)).toEqual(['r-field:0', 'r-field:1']);
      expect(b.entries.every(e => !!e.uid)).toBe(true);
    });

    it('uses the reporter credential for the key and fills a missing rangerUid', () => {
      const noRanger = entry({ id: 3 });
      delete noRanger.uid;
      delete noRanger.rangerUid;

      const r = mergeEntries([], [noRanger], { nextId: 0, reporterCredential: 'REW-9', resolvedUid: 'uid-9' });

      expect(r.entries[0].rangerUid).toBe('uid-9');
      expect(r.entries[0].sourceUid).toBe('REW-9:3');
    });
  });

  describe('7. a bad entry is rejected alone', () => {
    it('merges the rest and names the reject', () => {
      const b = new Device([], 0);

      const r = b.receive([
        entry({ id: 0, uid: 'bad', date: 'garbage' as never }),
        entry({ id: 1, uid: 'good' }),
        entry({ id: 2, uid: 'bad2', location: { lat: 200, lng: 0, address: '', derivedFromAddress: false } }),
        entry({ id: 'zero' as never, uid: 'bad3' }),
      ]);

      expect(r.added).toBe(1);
      expect(r.rejected).toBe(3);
      expect(r.rejectedNotes.map(n => n.uid)).toEqual(['bad', 'bad2', 'bad3']);
      expect(b.entries.map(e => e.uid)).toEqual(['good']);
    });
  });

  describe('attachments (D-60)', () => {
    const att = (c: string, over: Partial<AttachmentRef> = {}): AttachmentRef => ({
      sha256: c.repeat(64), name: c + '.jpg', type: 'image/jpeg', size: 10,
      addedAt: '2026-10-16T10:00:00.000Z', addedBy: 'K7AAA', ...over,
    });

    it('an older revisedAt side still contributes its attachments', () => {
      const b = new Device([entry({ uid: 'u1', revisedAt: new Date('2026-10-15T12:00:00Z'), attachments: [att('a')] })], 1);
      const r = b.receive(viaFile([entry({ uid: 'u1', notes: 'older', revisedAt: new Date('2026-10-15T11:00:00Z'), attachments: [att('b')] })]));
      expect(b.entries[0].notes).toBe('n');
      expect(b.entries[0].attachments!.map(a => a.sha256[0])).toEqual(['a', 'b']);
      expect(r.updated).toBe(1);
    });

    it('a later revisedAt side wins its fields but keeps this device attachments', () => {
      const b = new Device([entry({ uid: 'u1', attachments: [att('a')] })], 1);
      b.receive(viaFile([entry({ uid: 'u1', notes: 'later', revisedAt: new Date('2026-10-15T12:00:00Z') })]));
      expect(b.entries[0].notes).toBe('later');
      expect(b.entries[0].attachments!.map(a => a.sha256[0])).toEqual(['a']);
    });

    it('same attachments both sides stays unchanged, and merging twice adds nothing', () => {
      const b = new Device([entry({ uid: 'u1', attachments: [att('a')] })], 1);
      const file = viaFile([entry({ uid: 'u1', attachments: [att('a'), att('b')] })]);
      expect(b.receive(file).updated).toBe(1);
      expect(b.receive(file)).toEqual(jasmine.objectContaining({ updated: 0, unchanged: 1 }));
    });

    it('a removal on either side sticks', () => {
      const b = new Device([entry({ uid: 'u1', attachments: [att('a')] })], 1);
      b.receive(viaFile([entry({ uid: 'u1', attachments: [att('a', { removed: { at: '2026-10-16T11:00:00Z', by: 'K7BBB' } })] })]));
      expect(b.entries[0].attachments![0].removed?.by).toBe('K7BBB');
      b.receive(viaFile([entry({ uid: 'u1', attachments: [att('a')] })]));
      expect(b.entries[0].attachments![0].removed?.by).toBe('K7BBB');
    });

    it('an entry with no attachments on either side gets no attachments field', () => {
      const b = new Device([entry({ uid: 'u1' })], 1);
      b.receive(viaFile([entry({ uid: 'u1' })]));
      expect('attachments' in b.entries[0]).toBeFalse();
    });
  });

  it('does not mutate its inputs', () => {
    const existing = [entry({ uid: 'u1' })];
    const incoming = [entry({ id: 1, uid: 'u2' }), entry({ uid: 'u1', revisedAt: new Date() })];
    const snap = JSON.stringify([existing, incoming]);

    mergeEntries(existing, incoming, { nextId: 1 });

    expect(JSON.stringify([existing, incoming])).toBe(snap);
  });
});
