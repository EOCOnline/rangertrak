import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';

import { RangerPhotoService } from './ranger-photo.service';

/**
 * Photos are operator data held on the device (D-35 / E-38). These pin the behaviour that
 * matters in the field: a photo reaches the right callsign, a mismatched file is reported
 * rather than silently dropped, and a ranger with no photo yields no URL so the caller can
 * fall back to the silhouette.
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
    const { stored, unmatched } = await service.importFiles([file('K7VMI.jpg')], ['K7VMI', 'VI-0034']);

    expect(stored).toEqual(['K7VMI']);
    expect(unmatched).toEqual([]);
    expect(service.photoUrl('K7VMI')).toContain('blob:');
  });

  it('matches the filename to the callsign case-insensitively', async () => {
    // The archive holds both "ke7kdq.jpg" and "K7VMI.jpg" - case is not signal.
    const { stored } = await service.importFiles([file('ke7kdq.JPG')], ['KE7KDQ']);

    expect(stored).toEqual(['KE7KDQ']);
    expect(service.photoUrl('ke7kdq')).toContain('blob:');
  });

  it('reports files that match no callsign instead of dropping them silently', async () => {
    const { stored, unmatched } = await service.importFiles(
      [file('K7VMI.jpg'), file('Some_Person.jpg')], ['K7VMI']);

    expect(stored).toEqual(['K7VMI']);
    // The operator has to be told, or they will believe 122 photos loaded when 30 did.
    expect(unmatched).toEqual(['Some_Person.jpg']);
  });

  it('returns no URL for a ranger with no photo, so callers fall back to the silhouette', () => {
    expect(service.photoUrl('NOBODY')).toBe('');
  });

  it('survives being asked about an empty or junk callsign', () => {
    expect(service.photoUrl('')).toBe('');
    expect(service.photoUrl(undefined as any)).toBe('');
  });

  it('clear() forgets every photo but is safe to call twice', async () => {
    await service.importFiles([file('K7VMI.jpg')], ['K7VMI']);
    expect(service.count()).toBe(1);

    await service.clear();
    expect(service.count()).toBe(0);
    expect(service.photoUrl('K7VMI')).toBe('');

    await service.clear();
    expect(service.count()).toBe(0);
  });

  it('persists across a rebuilt service, which is the whole point of storing them', async () => {
    await service.importFiles([file('VI-0034.jpg')], ['VI-0034']);

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideHttpClient()] });
    const rebuilt = TestBed.inject(RangerPhotoService);
    await rebuilt.whenReady();

    expect(rebuilt.count()).toBe(1);
    expect(rebuilt.photoUrl('VI-0034')).toContain('blob:');
    await rebuilt.clear();
  });
});
