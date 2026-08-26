import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';

import { RangerPhotoService } from './ranger-photo.service';

/**
 * Photos are operator data held on the device (D-35 / E-38). These pin the behaviour that
 * matters in the field: a photo reaches the right ranger, a mismatched file is reported
 * rather than silently dropped, and a ranger with no photo yields no URL so the caller can
 * fall back to the silhouette. D-42 phase 6: matching tries `id` first, `callsign` second,
 * so photo bundles built against the old callsign-only convention still work.
 */
describe('RangerPhotoService', () => {
  const file = (name: string) =>
    new File([new Blob(['not-really-an-image'], { type: 'image/jpeg' })], name, { type: 'image/jpeg' });

  let service: RangerPhotoService;

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient()] });
    service = TestBed.inject(RangerPhotoService);
    await service.whenReady();
    await service.clear();
  });

  afterEach(async () => {
    await service.clear();
  });

  it('stores a photo against the callsign its filename names', async () => {
    const { stored, unmatched } = await service.importFiles(
      [file('K7VMI.jpg')], [{ callsign: 'K7VMI' }, { id: 'VI-0034' }]);

    expect(stored).toEqual(['K7VMI']);
    expect(unmatched).toEqual([]);
    expect(service.photoUrl({ callsign: 'K7VMI' })).toContain('blob:');
  });

  it('matches the filename to the callsign case-insensitively', async () => {
    // The archive holds both "ke7kdq.jpg" and "K7VMI.jpg" - case is not signal.
    const { stored } = await service.importFiles([file('ke7kdq.JPG')], [{ callsign: 'KE7KDQ' }]);

    expect(stored).toEqual(['KE7KDQ']);
    expect(service.photoUrl({ callsign: 'ke7kdq' })).toContain('blob:');
  });

  it('reports files that match no ranger instead of dropping them silently', async () => {
    const { stored, unmatched } = await service.importFiles(
      [file('K7VMI.jpg'), file('Some_Person.jpg')], [{ callsign: 'K7VMI' }]);

    expect(stored).toEqual(['K7VMI']);
    // The operator has to be told, or they will believe 122 photos loaded when 30 did.
    expect(unmatched).toEqual(['Some_Person.jpg']);
  });

  it('returns no URL for a ranger with no photo, so callers fall back to the silhouette', () => {
    expect(service.photoUrl({ callsign: 'NOBODY' })).toBe('');
  });

  it('survives being asked about an empty or junk ranger', () => {
    expect(service.photoUrl({})).toBe('');
    expect(service.photoUrl({ id: '', callsign: '' })).toBe('');
    expect(service.photoUrl({ callsign: undefined as any })).toBe('');
  });

  it('clear() forgets every photo but is safe to call twice', async () => {
    await service.importFiles([file('K7VMI.jpg')], [{ callsign: 'K7VMI' }]);
    expect(service.count()).toBe(1);

    await service.clear();
    expect(service.count()).toBe(0);
    expect(service.photoUrl({ callsign: 'K7VMI' })).toBe('');

    await service.clear();
    expect(service.count()).toBe(0);
  });

  it('persists across a rebuilt service, which is the whole point of storing them', async () => {
    await service.importFiles([file('VI-0034.jpg')], [{ id: 'VI-0034' }]);

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideHttpClient()] });
    const rebuilt = TestBed.inject(RangerPhotoService);
    await rebuilt.whenReady();

    expect(rebuilt.count()).toBe(1);
    expect(rebuilt.photoUrl({ id: 'VI-0034' })).toContain('blob:');
    await rebuilt.clear();
  });

  // ── D-42 phase 6: id-first, callsign-fallback matching ─────────────────

  it('matches a file named after id even when the ranger also has a callsign', async () => {
    const { stored, unmatched } = await service.importFiles(
      [file('REW-0038.jpg')], [{ id: 'REW-0038', callsign: 'ACS1' }]);

    expect(stored).toEqual(['REW-0038']);
    expect(unmatched).toEqual([]);
    expect(service.photoUrl({ id: 'REW-0038', callsign: 'ACS1' })).toContain('blob:');
  });

  it('falls back to matching by callsign when the file does not match any id - the old build-roster-zip.js convention', async () => {
    const { stored } = await service.importFiles(
      [file('ACS1.jpg')], [{ id: 'REW-0038', callsign: 'ACS1' }]);

    expect(stored).toEqual(['ACS1']);
    // Looked up by the full identity, same as a live component would - the id has no stored
    // photo, but the callsign fallback finds the one filed under the callsign stem.
    expect(service.photoUrl({ id: 'REW-0038', callsign: 'ACS1' })).toContain('blob:');
  });

  it('does not let one ranger\'s callsign match another ranger\'s id', async () => {
    // Guards the priority order itself: if id and callsign maps were merged instead of
    // checked in order, "ACS1" could ambiguously resolve to whichever ranger's entry
    // happened to win the merge.
    const { stored, unmatched } = await service.importFiles(
      [file('ACS1.jpg')], [{ id: 'ACS1' }, { callsign: 'ACS1' }]);

    expect(stored).toEqual(['ACS1']);
    expect(unmatched).toEqual([]);
    // The id match wins - photoUrl() checks id before callsign for the same reason.
    expect(service.photoUrl({ id: 'ACS1' })).toContain('blob:');
  });
});
