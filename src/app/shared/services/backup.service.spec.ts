import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';

import { BackupService, MissionExport } from './backup.service';
import { FieldReportService } from './field-report.service';
import { RangerService } from './ranger.service';
import { MissionService } from './mission.service';

/**
 * Covers PRIVATE-Roadmap.md Section 8/R3 and the Section 12 step 7 DoD literally:
 * "export -> clear storage -> import reproduces the mission exactly."
 */
describe('BackupService', () => {
  const KEYS = ['appSettings', 'rangers', 'fieldReports'];

  function configure() {
    TestBed.configureTestingModule({ providers: [provideHttpClient()] });
  }

  beforeEach(() => {
    localStorage.clear();
    configure();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('buildExportPayload', () => {
    it('bundles current settings, rangers, and field reports with a schema version', () => {
      const settings = TestBed.inject(MissionService);
      const rangers = TestBed.inject(RangerService);
      const fieldReports = TestBed.inject(FieldReportService);
      const backup = TestBed.inject(BackupService);

      settings.updateMission({ ...settings.settings, mission: 'Export Test Mission' });
      rangers.AddRanger(JSON.stringify({
        callsign: 'EXP1', fullName: 'Export Ranger', phone: '',
        image: '', rew: '', team: '', role: '', note: ''
      }));
      fieldReports.addfieldReport(JSON.stringify({
        callsign: 'EXP1',
        location: { lat: 47.4, lng: -122.4, derivedFromAddress: false },
        date: new Date(), status: 'Normal', notes: 'export test report'
      }));

      const payload = backup.buildExportPayload();

      expect(payload.schemaVersion).toBe(1);
      expect(payload.settings.mission).toBe('Export Test Mission');
      expect(payload.rangers.some(r => r.callsign === 'EXP1')).toBeTrue();
      expect(payload.fieldReports.fieldReportArray.some(r => r.notes === 'export test report')).toBeTrue();
      expect((payload.fieldReports as any).bounds).toBeUndefined();
      expect(payload.exportedAt).toBeTruthy();
    });
  });

  describe('export -> clear storage -> import round trip', () => {
    it('reproduces the mission exactly after storage is cleared and reloaded', () => {
      // 1. Build up real mission state.
      const settings = TestBed.inject(MissionService);
      const rangers = TestBed.inject(RangerService);
      const fieldReports = TestBed.inject(FieldReportService);
      const backup = TestBed.inject(BackupService);

      settings.updateMission({ ...settings.settings, mission: 'Roundtrip Mission', event: 'Test Event' });
      rangers.deleteAllRangers();
      rangers.AddRanger(JSON.stringify({
        callsign: 'RT1', fullName: 'Roundtrip Ranger', phone: '',
        image: '', rew: '', team: '', role: '', note: ''
      }));
      fieldReports.deleteAllFieldReports();
      fieldReports.addfieldReport(JSON.stringify({
        callsign: 'RT1',
        location: { lat: 47.41, lng: -122.41, derivedFromAddress: false },
        date: new Date(), status: 'Urgent', notes: 'roundtrip report'
      }));

      // 2. Export.
      const exported: MissionExport = backup.buildExportPayload();

      // 3. Simulate a real "storage wiped" disaster: clear localStorage AND
      // throw away the in-memory service instances, so nothing survives
      // except the exported payload itself - exactly the scenario a mission
      // backup exists to protect against.
      localStorage.clear();
      TestBed.resetTestingModule();
      configure();

      const freshSettings = TestBed.inject(MissionService);
      const freshRangers = TestBed.inject(RangerService);
      const freshFieldReports = TestBed.inject(FieldReportService);
      const freshBackup = TestBed.inject(BackupService);

      // Confirm the "disaster" actually happened: fresh instances do NOT
      // have the roundtrip data (they rebuilt from hardcoded defaults).
      expect(freshSettings.settings.mission).not.toBe('Roundtrip Mission');
      expect(freshRangers.rangers.some(r => r.callsign === 'RT1')).toBeFalse();

      // 4. Import.
      freshBackup.importMission(exported);

      // 5. Reproduces the mission exactly.
      expect(freshSettings.settings.mission).toBe('Roundtrip Mission');
      expect(freshSettings.settings.event).toBe('Test Event');
      expect(freshRangers.rangers.length).toBe(1);
      expect(freshRangers.rangers[0].callsign).toBe('RT1');
      expect(freshFieldReports.getCurrentFieldReports().fieldReportArray.length).toBe(1);
      expect(freshFieldReports.getCurrentFieldReports().fieldReportArray[0].notes).toBe('roundtrip report');
      expect(freshFieldReports.getCurrentFieldReports().fieldReportArray[0].status).toBe('Urgent');

      // Also persisted to localStorage, not just in-memory.
      // ADR D-42/D-43 Phase 2: the roster is stored as a versioned
      // { schemaVersion, rangers } wrapper now, not a bare array.
      const storedRangers = JSON.parse(localStorage.getItem('rangers')!).rangers;
      expect(storedRangers.some((r: any) => r.callsign === 'RT1')).toBeTrue();
      const storedSettings = JSON.parse(localStorage.getItem('appSettings')!);
      expect(storedSettings.mission).toBe('Roundtrip Mission');
    });

    it('recalculates real map bounds after import rather than restoring stale/absent bounds', () => {
      const fieldReports = TestBed.inject(FieldReportService);
      const backup = TestBed.inject(BackupService);

      fieldReports.addfieldReport(JSON.stringify({
        callsign: 'B1',
        location: { lat: 48.0, lng: -121.0, derivedFromAddress: false },
        date: new Date(), status: 'Normal', notes: ''
      }));
      const exported = backup.buildExportPayload();

      backup.importMission(exported);

      const bounds = fieldReports.getCurrentFieldReports().bounds;
      expect(bounds.south).toBeLessThanOrEqual(48.0);
      expect(bounds.north).toBeGreaterThanOrEqual(48.0);
      expect(bounds.west).toBeLessThanOrEqual(-121.0);
      expect(bounds.east).toBeGreaterThanOrEqual(-121.0);
    });
  });

  describe('readFileAsMissionExport', () => {
    it('parses a valid mission export file', async () => {
      const backup = TestBed.inject(BackupService);
      const payload = backup.buildExportPayload();
      const file = new File([JSON.stringify(payload)], 'mission.json', { type: 'application/json' });

      const parsed = await backup.readFileAsMissionExport(file);

      expect(parsed.schemaVersion).toBe(payload.schemaVersion);
      expect(parsed.settings.mission).toBe(payload.settings.mission);
    });

    it('rejects a file that is not valid JSON', async () => {
      const backup = TestBed.inject(BackupService);
      const file = new File(['not json{{{'], 'bad.json', { type: 'application/json' });

      await expectAsync(backup.readFileAsMissionExport(file)).toBeRejected();
    });

    it('rejects a file missing required top-level keys', async () => {
      const backup = TestBed.inject(BackupService);
      const file = new File([JSON.stringify({ schemaVersion: 1 })], 'incomplete.json', { type: 'application/json' });

      await expectAsync(backup.readFileAsMissionExport(file)).toBeRejected();
    });

    it('rejects a file where rangers is not an array', async () => {
      const backup = TestBed.inject(BackupService);
      const bad = { schemaVersion: 1, settings: {}, rangers: 'not-an-array', fieldReports: { fieldReportArray: [] } };
      const file = new File([JSON.stringify(bad)], 'bad-rangers.json', { type: 'application/json' });

      await expectAsync(backup.readFileAsMissionExport(file)).toBeRejected();
    });
  });

  describe('importMission validation', () => {
    it('throws on a structurally invalid payload rather than partially applying it', () => {
      const settings = TestBed.inject(MissionService);
      const backup = TestBed.inject(BackupService);
      const missionBefore = settings.settings.mission;

      expect(() => backup.importMission({ mission: 'nope' } as any)).toThrow();
      expect(settings.settings.mission).toBe(missionBefore);
    });
  });
});
