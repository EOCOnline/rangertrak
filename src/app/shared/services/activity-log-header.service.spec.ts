import { TestBed } from '@angular/core/testing';

import { ActivityLogHeaderService } from './activity-log-header.service';
import { recordStore } from '../storage/record-store';

describe('ActivityLogHeaderService (E-04 / D-63)', () => {
  beforeEach(async () => {
    localStorage.clear();
    await recordStore.resetForTests();
  });

  afterEach(async () => {
    localStorage.clear();
    await recordStore.resetForTests();
  });

  it('starts as the empty header', () => {
    expect(TestBed.inject(ActivityLogHeaderService).header()).toEqual({ name: '', icsPosition: '', homeAgency: '', resources: [] });
  });

  it('saves a normalised header under the activityLogHeader key', () => {
    const service = TestBed.inject(ActivityLogHeaderService);
    service.save({ name: ' Pat ', resources: [{ name: 'Sam' }, {}] });
    expect(service.header().name).toBe('Pat');
    expect(service.header().resources.length).toBe(1);
    expect(JSON.parse(recordStore.getItem('activityLogHeader')!).name).toBe('Pat');
  });

  it('reads a stored header back, and clears it', () => {
    recordStore.setItem('activityLogHeader', JSON.stringify({ name: 'Stored', icsPosition: 'Net control' }));
    const service = TestBed.inject(ActivityLogHeaderService);
    expect(service.header().name).toBe('Stored');
    service.clear();
    expect(service.header().name).toBe('');
    expect(recordStore.getItem('activityLogHeader')).toBeNull();
  });

  it('reads damaged storage as the empty header', () => {
    recordStore.setItem('activityLogHeader', '{not json');
    expect(TestBed.inject(ActivityLogHeaderService).header().name).toBe('');
  });
});
