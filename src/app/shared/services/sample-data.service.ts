import { Injectable } from '@angular/core'

import {
  FieldReportService, FieldReportsType, FieldReportType, LogService, RangerService, RangerType,
  SettingsService
} from './'

/**
 * A ready-made demonstration mission: a roster and a few hours of field reports
 * spread across Vashon Island.
 *
 * A virgin instance is genuinely empty - no field reports, so the Reports grid says
 * "No Rows To Show" and both maps open on a blank basemap with nothing plotted. That
 * makes it impossible to show the product to anyone, or to eyeball a UI change,
 * without first hand-entering reports one at a time.
 *
 * This differs from FieldReportService.generateFakeData() on purpose. That one
 * scatters random points within ~0.001 degrees of the default coordinate with joke
 * notes - useful for load-testing the grid, useless for a demo, because every marker
 * lands in one indistinguishable clump. The data here is hand-authored and fixed:
 * recognizable Vashon locations far enough apart to exercise map bounds/zoom and
 * marker clustering, every status represented so the grid's color coding is visible,
 * and plausible dispatch-log notes.
 *
 * Report timestamps are the one thing computed rather than fixed - they're offsets
 * back from "now", so the Reports grid's Elapsed column always reads like a mission
 * in progress no matter when the demo is run.
 */
@Injectable({ providedIn: 'root' })
export class SampleDataService {

  private id = 'Sample Data Service'

  /** Marks the loaded mission as demo data, in the UI and in any export of it. */
  public static readonly SAMPLE_MISSION_NAME = 'SAMPLE - Vashon Island Exercise'
  public static readonly SAMPLE_EVENT_NAME = 'Sample Data (demonstration only)'

  constructor(
    private settingsService: SettingsService,
    private rangerService: RangerService,
    private fieldReportService: FieldReportService,
    private log: LogService,
  ) { }

  /**
   * True when this looks like a virgin instance worth offering sample data for:
   * no field reports have ever been entered. The ranger roster is deliberately not
   * part of the test - RangerService seeds a hardcoded roster on first run, so it is
   * never empty and would make this always false.
   */
  public isVirginInstance(): boolean {
    return this.fieldReportService.getCurrentFieldReports().fieldReportArray.length === 0
  }

  /**
   * Replaces the roster and all field reports with the sample mission, and names the
   * mission/event so nobody mistakes demo data for real mission data.
   *
   * Destructive by design - the caller is responsible for confirming with the user.
   * Everything it touches is covered by Export Mission, so a real mission can be
   * saved off first and restored afterwards.
   */
  public loadSampleMission(): void {
    const rangers = this.buildSampleRangers()
    const fieldReports = this.buildSampleFieldReports(rangers)

    // Settings first, then rangers, then reports - the same ordering (and for the same
    // reason) as BackupService.importMission(): replaceAllFieldReports() recalculates
    // bounds and needs current settings already in place.
    this.settingsService.updateSettings({
      ...this.settingsService.settings,
      mission: SampleDataService.SAMPLE_MISSION_NAME,
      event: SampleDataService.SAMPLE_EVENT_NAME,
    })
    this.rangerService.replaceAllRangers(rangers)
    this.fieldReportService.replaceAllFieldReports(fieldReports)

    this.log.warn(`Loaded sample mission: ${rangers.length} rangers, ${fieldReports.numReport} field reports. This is DEMO data.`, this.id)
  }

  // ---------------------------------------------------------------------------

  /**
   * A demonstration roster: a command post, two ACS radio teams, three CERT teams,
   * two marine units and three individual rangers - enough variety to show teams,
   * roles and per-ranger icons without naming any real person.
   *
   * Every `image` here is a file that actually ships in assets/imgs/rangers/.
   */
  public buildSampleRangers(): RangerType[] {
    return [
      { callsign: '!CmdPost', fullName: 'Exercise Command Post', phone: '206-555-0100', address: '10014 SW Bank Rd, Vashon, WA 98070', image: 'CmdPost.jpg', rew: 'CmdPost', team: 'Command', role: 'Command', note: 'Net control for the exercise' },

      { callsign: 'ACS1', fullName: 'Radio Team Alpha', phone: '206-555-0111', address: 'Vashon, WA 98070', image: 'ham_blue.png', rew: 'VI-01', team: 'ACS', role: 'Licensed', note: 'Primary voice relay' },
      { callsign: 'ACS2', fullName: 'Radio Team Bravo', phone: '206-555-0112', address: 'Vashon, WA 98070', image: 'ham_red.png', rew: 'VI-02', team: 'ACS', role: 'Licensed', note: 'Packet / digital' },

      { callsign: 'CERT1', fullName: 'CERT Team One', phone: '206-555-0121', address: 'Vashon, WA 98070', image: 'CERT_red.png', rew: 'VI-11', team: 'CERT', role: 'Responder', note: 'North island sweep' },
      { callsign: 'CERT2', fullName: 'CERT Team Two', phone: '206-555-0122', address: 'Vashon, WA 98070', image: 'CERT_green.png', rew: 'VI-12', team: 'CERT', role: 'Responder', note: 'Town center sweep' },
      { callsign: 'CERT3', fullName: 'CERT Team Three', phone: '206-555-0123', address: 'Burton, WA 98013', image: 'CERT_yellow.png', rew: 'VI-13', team: 'CERT', role: 'Responder', note: 'South island sweep' },

      { callsign: 'MERT1', fullName: 'Marine Unit One', phone: '206-555-0131', address: 'Dockton, WA 98070', image: 'MERT_blue.png', rew: 'VI-21', team: 'MERT', role: 'Marine', note: 'Quartermaster Harbor' },
      { callsign: 'MERT2', fullName: 'Marine Unit Two', phone: '206-555-0132', address: 'Vashon, WA 98070', image: 'sail.png', rew: 'VI-22', team: 'MERT', role: 'Marine', note: 'West shore' },

      { callsign: 'Recon1', fullName: 'Mobile Recon One', phone: '206-555-0141', address: 'Vashon, WA 98070', image: 'westy.png', rew: 'VI-31', team: 'Recon', role: 'Mobile', note: 'Roving damage assessment' },
      { callsign: 'Shelter1', fullName: 'Shelter Manager', phone: '206-555-0151', address: '9825 SW 204th St, Vashon, WA 98070', image: 'helmet_orange.png', rew: 'VI-41', team: 'Logistics', role: 'Support', note: 'High school shelter' },
      { callsign: 'Medic1', fullName: 'Field Medic One', phone: '206-555-0161', address: 'Vashon, WA 98070', image: 'helmet_red.png', rew: 'VI-51', team: 'Medical', role: 'Medical', note: 'Roving aid' },
      { callsign: 'Ferry1', fullName: 'Ferry Dock Observer', phone: '206-555-0171', address: 'Vashon Ferry Terminal, WA 98070', image: 'team_blue.png', rew: 'VI-61', team: 'Recon', role: 'Observer', note: 'North terminal' },
    ]
  }

  /**
   * Field reports for the sample mission.
   *
   * `bounds` is deliberately absent: FieldReportService.replaceAllFieldReports()
   * recalculates it from the report coordinates, exactly as it does for a real import.
   */
  public buildSampleFieldReports(rangers: RangerType[]): Omit<FieldReportsType, 'bounds'> {
    const statuses = this.statusNames()
    const now = Date.now()

    // [callsign, minutesAgo, lat, lng, address, statusIndex, note]
    // Status indices point into the default fieldReportStatuses list:
    // 0 Normal, 1 Location Report, 2 Evidence Report, 3 Need Rest/Food,
    // 4 Incident Check-in, 5 Incident Check-out, 6 Urgent.
    const rows: [string, number, number, number, string, number, string][] = [
      ['!CmdPost', 335, 47.4472, -122.4627, '10014 SW Bank Rd, Vashon', 4, 'Command post established, net open on primary.'],
      ['ACS1', 330, 47.4470, -122.4590, '17705 Vashon Hwy SW, Vashon', 4, 'Checking in, signal strength good to CP.'],
      ['CERT1', 328, 47.4801, -122.4903, 'Cedarhurst Rd SW, Vashon', 4, 'Team of four checking in, starting north sweep.'],
      ['CERT2', 326, 47.4468, -122.4576, 'SW 174th St, Vashon', 4, 'Checked in, beginning town center sweep.'],
      ['CERT3', 324, 47.3951, -122.4652, 'SW Burton Dr, Burton', 4, 'On scene Burton, three responders.'],

      ['Ferry1', 300, 47.5133, -122.4636, 'Vashon Ferry Terminal', 1, 'In position at north terminal, sightline to dock is clear.'],
      ['MERT1', 292, 47.3739, -122.4560, 'Dockton Park boat launch', 1, 'Launched, transiting Quartermaster Harbor.'],
      ['Recon1', 285, 47.4300, -122.4700, 'SW Cemetery Rd, Vashon', 0, 'Roads passable southbound, no obstructions noted.'],
      ['ACS2', 278, 47.4470, -122.4592, '17705 Vashon Hwy SW, Vashon', 0, 'Packet link to CP established, 1200 baud.'],
      ['Shelter1', 270, 47.4402, -122.4610, '9825 SW 204th St, Vashon', 4, 'Shelter open, capacity 120, currently 0 occupants.'],

      ['CERT1', 244, 47.4703, -122.5001, 'Fern Cove, Vashon', 2, 'Photographed downed tree blocking beach access road.'],
      ['CERT2', 236, 47.4455, -122.4548, 'SW Cove Rd, Vashon', 2, 'Two structures with visible damage, photos attached.'],
      ['Medic1', 228, 47.4468, -122.4580, 'Vashon Hwy SW at SW 178th St', 0, 'Staged at town center, no patients at this time.'],
      ['MERT2', 220, 47.4650, -122.5050, 'West shore off Peter Point', 1, 'Position report, transiting north along west shore.'],
      ['CERT3', 212, 47.3878, -122.3743, 'Point Robinson Lighthouse', 1, 'Arrived Point Robinson, beginning shoreline check.'],

      ['Recon1', 190, 47.4050, -122.4200, 'Maury Island Marine Park', 0, 'Access road to marine park is clear.'],
      ['CERT1', 178, 47.4780, -122.4870, 'SW 116th St, Vashon', 6, 'URGENT: partial road collapse, one lane only. Advise reroute.'],
      ['!CmdPost', 174, 47.4472, -122.4627, '10014 SW Bank Rd, Vashon', 0, 'Acknowledged CERT1 road collapse, notifying county roads.'],
      ['Medic1', 166, 47.4779, -122.4869, 'SW 116th St, Vashon', 1, 'Responding to CERT1 location as precaution.'],
      ['ACS1', 158, 47.4470, -122.4590, '17705 Vashon Hwy SW, Vashon', 0, 'Relayed traffic to county EOC, receipt confirmed.'],

      ['CERT2', 140, 47.4230, -122.4300, 'KVI Beach, Vashon', 2, 'Debris field along beach, photographed for assessment.'],
      ['MERT1', 128, 47.3800, -122.4480, 'Quartermaster Harbor, mid-channel', 1, 'Position report, no vessels in distress observed.'],
      ['Shelter1', 116, 47.4402, -122.4610, '9825 SW 204th St, Vashon', 0, 'Six occupants registered, supplies adequate.'],
      ['CERT3', 104, 47.3335, -122.5060, 'Tahlequah Ferry Terminal', 1, 'South terminal checked, dock intact.'],
      ['Recon1', 96, 47.4600, -122.4550, 'SW 148th St, Vashon', 3, 'Requesting rotation, team has been out six hours.'],

      ['Medic1', 78, 47.4779, -122.4869, 'SW 116th St, Vashon', 0, 'No injuries at road collapse site, returning to staging.'],
      ['CERT1', 62, 47.4801, -122.4903, 'Cedarhurst Rd SW, Vashon', 3, 'North sweep complete, requesting food and rest.'],
      ['Ferry1', 48, 47.5133, -122.4636, 'Vashon Ferry Terminal', 0, 'Sailings resumed on normal schedule.'],
      ['MERT2', 34, 47.4700, -122.5000, 'Fern Cove, Vashon', 5, 'Marine unit two off the water, checking out.'],
      ['CERT2', 18, 47.4468, -122.4576, 'SW 174th St, Vashon', 5, 'Town center sweep complete, team checking out.'],
    ]

    const known = new Set(rangers.map(r => r.callsign))
    const fieldReportArray: FieldReportType[] = []

    rows.forEach(([callsign, minutesAgo, lat, lng, address, statusIndex, notes], index) => {
      if (!known.has(callsign)) {
        // Guards the roster and the report table against drifting apart: an unmatched
        // callsign would render as an orphan row the grid can't tie back to a ranger.
        this.log.error(`Sample report ${index} references unknown callsign "${callsign}" - skipped.`, this.id)
        return
      }
      fieldReportArray.push({
        id: fieldReportArray.length,
        callsign,
        location: { lat, lng, address, derivedFromAddress: false },
        date: new Date(now - minutesAgo * 60 * 1000),
        status: statuses[statusIndex] ?? statuses[0],
        notes,
      })
    })

    return {
      version: this.settingsService.settings.version,
      date: new Date(),
      event: SampleDataService.SAMPLE_EVENT_NAME,
      numReport: fieldReportArray.length,
      maxId: fieldReportArray.length,
      filter: '',
      fieldReportArray,
    }
  }

  /**
   * Status *names* as currently configured, so the sample reports color-code correctly
   * in the grid. Users can rename statuses in Settings, and the grid matches on the
   * name string - hardcoding 'Normal' etc. here would silently produce grey rows for
   * anyone who had renamed them.
   */
  private statusNames(): string[] {
    const configured = this.settingsService.settings?.fieldReportStatuses
    if (!configured?.length) {
      this.log.error(`No field report statuses configured; sample reports will have an empty status.`, this.id)
      return ['']
    }
    return configured.map(s => s.status)
  }
}
