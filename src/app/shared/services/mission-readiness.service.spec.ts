import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';

import { MissionReadinessService } from './mission-readiness.service';

/**
 * The six underlying signals are exercised by their own services (SettingsService,
 * RangerService, StoragePersistenceService) and RangerService.isRealRosterLoaded's own
 * spec. These tests target the level() formula itself - the judgment call documented in
 * the service's own doc comment - by driving the (deliberately public, settable) signals
 * directly, independent of whatever the real subscriptions happened to populate them with.
 */
describe('MissionReadinessService', () => {
  let service: MissionReadinessService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideHttpClient()] });
    service = TestBed.inject(MissionReadinessService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  function setAll(ready: boolean) {
    service.missionNamed.set(ready);
    service.rosterLoaded.set(ready);
    service.opPeriodCurrent.set(ready);
    service.offlineTilesSaved.set(ready);
    service.bundledMapWarmed.set(ready);
    service.storagePersisted.set(ready);
  }

  it('is green only when all six signals pass', () => {
    setAll(true);
    expect(service.level()).toBe('green');
  });

  it('is red when the mission is not named, even if everything else is ready', () => {
    setAll(true);
    service.missionNamed.set(false);
    expect(service.level()).toBe('red');
  });

  it('is red when the roster is not loaded, even if everything else is ready', () => {
    setAll(true);
    service.rosterLoaded.set(false);
    expect(service.level()).toBe('red');
  });

  it('is amber when basic setup is done but the operating period has expired', () => {
    setAll(true);
    service.opPeriodCurrent.set(false);
    expect(service.level()).toBe('amber');
  });

  it('is amber when basic setup is done but offline tiles were never saved', () => {
    setAll(true);
    service.offlineTilesSaved.set(false);
    expect(service.level()).toBe('amber');
  });

  it('is amber when basic setup is done but the bundled map was never warmed', () => {
    setAll(true);
    service.bundledMapWarmed.set(false);
    expect(service.level()).toBe('amber');
  });

  it('is amber when basic setup is done but storage is not protected from eviction', () => {
    setAll(true);
    service.storagePersisted.set(false);
    expect(service.level()).toBe('amber');
  });

  it('is red, not amber, when mission/roster are missing even alongside other gaps', () => {
    setAll(false);
    expect(service.level()).toBe('red');
  });
});
