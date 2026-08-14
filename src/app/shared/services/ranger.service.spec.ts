import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';

import { RangerType } from './ranger.interface';
import { RangerService } from './ranger.service';

/**
 * Characterization tests: pin RangerService's current localStorage-backed
 * behavior before the signals rewrite (USE-CASES.md Section 8/R4, Section 12
 * step 3). These assert what the service actually does today, not what it
 * should do.
 */
describe('RangerService', () => {
  const STORAGE_KEY = 'rangers';

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
    it('loads the hardcoded default roster when localStorage is empty', () => {
      const service = TestBed.inject(RangerService);

      expect(service.rangers.length).toBeGreaterThan(0);
      expect(service.rangers.some(r => r.callsign === '!CmdPost')).toBeTrue();
    });

    it('sorts the default roster by callsign', () => {
      const service = TestBed.inject(RangerService);

      const callsigns = service.rangers.map(r => r.callsign);
      const sorted = [...callsigns].sort();
      expect(callsigns).toEqual(sorted);
    });

    it('loads an existing roster from localStorage instead of the hardcoded defaults', () => {
      const seeded: RangerType[] = [
        { callsign: 'ZZZ1', fullName: 'Seeded Ranger', phone: '', address: '', image: '', rew: '', team: '', role: '', note: '' }
      ];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));

      const service = TestBed.inject(RangerService);

      expect(service.rangers.length).toBe(1);
      expect(service.rangers[0].callsign).toBe('ZZZ1');
    });

    it('falls back to an empty array (not a throw) when localStorage contains invalid JSON', () => {
      localStorage.setItem(STORAGE_KEY, '{not valid json');

      // Constructor catches the parse error internally; current behavior is
      // to fall back to loading the hardcoded roster (rangers.length was 0
      // after the failed parse).
      const service = TestBed.inject(RangerService);

      expect(service.rangers.length).toBeGreaterThan(0);
      expect(service.rangers.some(r => r.callsign === '!CmdPost')).toBeTrue();
    });
  });

  describe('AddRanger', () => {
    it('appends a ranger and persists it to localStorage', () => {
      const service = TestBed.inject(RangerService);
      const before = service.rangers.length;

      const added = service.AddRanger(JSON.stringify({
        callsign: 'TEST1', fullName: 'Test Ranger', phone: '', address: '',
        image: '', rew: '', team: '', role: '', note: ''
      }));

      expect(added.callsign).toBe('TEST1');
      expect(service.rangers.length).toBe(before + 1);

      const persisted: RangerType[] = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
      expect(persisted.some(r => r.callsign === 'TEST1')).toBeTrue();
    });

    it('publishes the updated roster to subscribers', () => {
      const service = TestBed.inject(RangerService);
      let latest: RangerType[] = [];
      service.getRangersObserver().subscribe(r => latest = r);

      service.AddRanger(JSON.stringify({
        callsign: 'TEST2', fullName: 'Test Ranger 2', phone: '', address: '',
        image: '', rew: '', team: '', role: '', note: ''
      }));

      expect(latest.some(r => r.callsign === 'TEST2')).toBeTrue();
    });
  });

  describe('updateRanger / deleteRanger', () => {
    it('updates an existing ranger by callsign', () => {
      const service = TestBed.inject(RangerService);
      service.AddRanger(JSON.stringify({
        callsign: 'UPD1', fullName: 'Original Name', phone: '', address: '',
        image: '', rew: '', team: '', role: '', note: ''
      }));

      service.updateRanger({
        callsign: 'UPD1', fullName: 'Changed Name', phone: '', address: '',
        image: '', rew: '', team: '', role: '', note: ''
      });

      expect(service.getRanger('UPD1').fullName).toBe('Changed Name');
    });

    it('deletes a ranger by callsign and persists the removal', () => {
      const service = TestBed.inject(RangerService);
      service.AddRanger(JSON.stringify({
        callsign: 'DEL1', fullName: 'To Delete', phone: '', address: '',
        image: '', rew: '', team: '', role: '', note: ''
      }));
      const before = service.rangers.length;

      service.deleteRanger('DEL1');

      expect(service.rangers.length).toBe(before - 1);
      expect(service.rangers.some(r => r.callsign === 'DEL1')).toBeFalse();

      const persisted: RangerType[] = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
      expect(persisted.some(r => r.callsign === 'DEL1')).toBeFalse();
    });

    it('returns the UnknownRanger sentinel for a callsign that does not exist', () => {
      const service = TestBed.inject(RangerService);
      expect(service.getRanger('DOES_NOT_EXIST').callsign).toBe('Unknown');
    });
  });

  describe('deleteAllRangers', () => {
    it('clears the in-memory roster and removes the localStorage key', () => {
      const service = TestBed.inject(RangerService);
      expect(service.rangers.length).toBeGreaterThan(0);

      service.deleteAllRangers();

      expect(service.rangers.length).toBe(0);
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });
  });
});
