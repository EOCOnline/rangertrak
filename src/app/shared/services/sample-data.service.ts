import { Injectable } from '@angular/core'

import {
  RadioLogService, RadioLogType, RadioLogEntryType, LogService, RangerService, RangerType,
  MissionService
} from './'

/**
 * A ready-made demonstration mission: a roster and a few hours of field reports/messages
 * spread across Vashon Island.
 *
 * A virgin instance is genuinely empty - no field reports, so the Reports grid says
 * "No Rows To Show" and both maps open on a blank basemap with nothing plotted. That
 * makes it impossible to show the product to anyone, or to eyeball a UI change,
 * without first hand-entering reports one at a time.
 *
 * This used to differ from RadioLogService.generateFakeData() on purpose - that one
 * scattered random points within ~0.001 degrees of the default coordinate with joke
 * notes, useful for load-testing the grid but useless for a demo since every marker
 * landed in one indistinguishable clump. It was removed 2026-08-25 as a dead control
 * (E-94) once its only caller, the Field Reports "fake report generator," was removed
 * too. The data here is hand-authored and fixed: recognizable Vashon locations,
 * every status represented so the grid's color coding is visible, and plausible
 * dispatch-log notes.
 *
 * F29-11 (2026-08-29, maintainer's own live note, re-scoped 2026-08-30): three problems with
 * the previous version of this data, fixed here -
 *
 * 1. **Flat roster, no ICS structure.** Twelve interchangeable "Team N" callsigns told no
 *    story about who is actually running an incident. Rewritten around a real command
 *    staff (Incident Commander, three Section Chiefs, a PIO) plus field teams who report to
 *    them - using the existing `role` field, no new data model needed (Teams/Facilities as
 *    real entities is D-a, still deferred).
 * 2. **Names that read as real people.** "Radio Team Alpha," "CERT Team One" were at least
 *    honestly generic, but earlier drafts of this kind of data tend to drift toward
 *    realistic-sounding names that could be mistaken for someone real. Every name here is
 *    deliberately, obviously invented - the point is a demo that reads as a demo.
 * 3. **Reports spread the length of the island at driving-distance intervals.** Real field
 *    teams in this app's own scenario (SAR/CERT on foot, not in vehicles) work a tight
 *    search pattern, not a road trip. Field team positions now cluster within two real
 *    Vashon-Maury parks - Maury Island Marine Park and Dockton Park, both already used as
 *    verified points in the previous version of this file - at distances a walking team
 *    would actually cover. Command staff (Incident Commander, Command Post, the three
 *    Section Chiefs, the PIO) stay near one fixed post, which is the correct picture for
 *    people running an incident rather than searching one.
 *
 * Also new: two ICS-213 messages (`generates213`/`message213`/`recipients213`/`subject213`/
 * `operator`) - the ORIGINAL ask behind F29-11 ("sample data should include messages as well
 * as radio log entries") was never actually met by the previous version, which had zero.
 *
 * Report timestamps are the one thing computed rather than fixed - they're offsets
 * back from "now", so the Reports grid's Elapsed column always reads like a mission
 * in progress no matter when the demo is run.
 */
@Injectable({ providedIn: 'root' })
export class SampleDataService {

  private id = 'Sample Data Service'

  /** Marks the loaded mission as demo data, in the UI and in any export of it. */
  public static readonly SAMPLE_EVENT_NAME = 'Missing Person Exercise'
  public static readonly SAMPLE_EVENT_NOTES = 'Investigate report of several lost individuals'

  /**
   * Raised live 2026-08-30: the mission ID a real agency would actually assign - a
   * year-month-type code, e.g. "2026-08-Search" - rather than the previous fixed
   * "SAMPLE - Vashon Island Exercise" string. Computed at load time (not a static constant)
   * so it always reflects the month the demo is actually run, not the month this file was
   * last edited.
   */
  private static sampleMissionId(): string {
    const now = new Date()
    const yyyy = now.getFullYear()
    const mm = String(now.getMonth() + 1).padStart(2, '0')
    return `${yyyy}-${mm}-Search`
  }

  constructor(
    private missionService: MissionService,
    private rangerService: RangerService,
    private radioLogService: RadioLogService,
    private log: LogService,
  ) { }

  /**
   * True when this looks like a virgin instance worth offering sample data for:
   * no field reports have ever been entered. The ranger roster is deliberately not
   * part of the test - RangerService seeds a hardcoded roster on first run, so it is
   * never empty and would make this always false.
   */
  public isVirginInstance(): boolean {
    return this.radioLogService.getCurrentRadioLog().logEntries.length === 0
  }

  /**
   * Replaces the roster and all field reports with the sample mission, and names the
   * mission/event so nobody mistakes demo data for real mission data.
   *
   * Destructive by design - the caller is responsible for confirming with the user.
   * Everything it touches is covered by Back up mission, so a real mission can be
   * saved off first and restored afterwards.
   */
  public loadSampleMission(): void {
    const rangers = this.buildSampleRangers()
    const sampleRadioLog = this.buildSampleRadioLog(rangers)

    // Settings first, then rangers, then reports - the same ordering (and for the same
    // reason) as BackupService.importMission(): replaceAllRadioLog() recalculates
    // bounds and needs current settings already in place.
    this.missionService.updateMission({
      ...this.missionService.settings,
      mission: SampleDataService.sampleMissionId(),
      event: SampleDataService.SAMPLE_EVENT_NAME,
      eventNotes: SampleDataService.SAMPLE_EVENT_NOTES,
    })
    this.rangerService.replaceAllRangers(rangers)
    this.radioLogService.replaceAllRadioLog(sampleRadioLog)

    this.log.warn(`Loaded sample mission: ${rangers.length} rangers, ${sampleRadioLog.numReport} field reports. This is DEMO data.`, this.id)
  }

  // ---------------------------------------------------------------------------

  /**
   * A demonstration roster: an Incident Commander, three Section Chiefs, a PIO and Command
   * Post net control staying at one fixed post, plus six field-team rangers split between
   * two walking-search clusters (see buildSampleRadioLog()). Twelve total, matching the
   * "12 units" the Advanced Options sample-mission note already describes.
   *
   * Every name here is deliberately, obviously invented - this is demo data and should read
   * as such, not as a roster of real people. Every `image` is a file that actually ships in
   * assets/imgs/rangers/.
   */
  public buildSampleRangers(): RangerType[] {
    return [
      // Command staff - one fixed post, not a walking search pattern. Every photo here is an
      // AI-generated synthetic face (thispersondoesnotexist.org, maintainer-supplied
      // 2026-08-29) - a real image, but of no real person, so it's safe to ship in a public
      // repo the same way the drawn icon assets are. Downscaled to 240x240 (~10-14KB each,
      // was ~200-280KB straight off the generator) before committing - these are BUNDLED app
      // assets fetched by every install, not user-uploaded photos, so the same "don't ship
      // more bytes than a 40-60px avatar needs" reasoning RangerPhotoService's own MAX_EDGE
      // applies here even more directly.
      { callsign: 'IC-Actual', fullName: 'Hazel "Compass" Winterbourne', phone: '206-555-0100', image: 'ic-actual.jpg', id: 'IC-1', team: 'Command', role: 'Incident Commander', note: 'Overall exercise command' },
      { callsign: '!CmdPost', fullName: 'Exercise Command Post', phone: '206-555-0101', image: 'CmdPost.jpg', id: 'CP-1', team: 'Command', role: 'Command', note: 'Net control for the exercise' },
      { callsign: 'OpsChief', fullName: 'Ollie Fogbank', phone: '206-555-0110', image: 'ops-chief.jpg', id: 'OPS-1', team: 'Command', role: 'Operations Section Chief', note: 'Directs field teams' },
      { callsign: 'PlanChief', fullName: 'Penny Chartwell', phone: '206-555-0111', image: 'plan-chief.jpg', id: 'PLN-1', team: 'Command', role: 'Planning Section Chief', note: 'Tracks status boards and maps' },
      { callsign: 'LogChief', fullName: 'Iggy Sparrowgrass', phone: '206-555-0112', image: 'log-chief.jpg', id: 'LOG-1', team: 'Command', role: 'Logistics Section Chief', note: 'Supplies, food, rest rotations' },
      { callsign: 'PIO1', fullName: 'Ivy Loudhailer', phone: '206-555-0113', image: 'pio.jpg', id: 'PIO-1', team: 'Command', role: 'Public Information Officer', note: 'Fields press and family inquiries' },

      // Field team - Maury Island Marine Park cluster.
      { callsign: 'CERT1', fullName: 'Gus Underbrush', phone: '206-555-0121', image: 'cert1.jpg', id: 'VI-11', team: 'CERT', role: 'Team Lead', note: 'Marine Park, north loop' },
      { callsign: 'CERT2', fullName: 'Wanda Woodsy', phone: '206-555-0122', image: 'cert2.jpg', id: 'VI-12', team: 'CERT', role: 'Responder', note: 'Marine Park, south loop' },
      { callsign: 'Recon1', fullName: 'Chip Trailblaze', phone: '206-555-0123', image: 'recon1.jpg', id: 'VI-13', team: 'Recon', role: 'Mobile', note: 'Marine Park, beach access trail' },

      // Field team - Dockton Park cluster.
      { callsign: 'CERT3', fullName: 'Marge Tidepool', phone: '206-555-0131', image: 'cert3.jpg', id: 'VI-21', team: 'CERT', role: 'Team Lead', note: 'Dockton Park, north end' },
      { callsign: 'MERT1', fullName: 'Barnaby Fogg', phone: '206-555-0132', image: 'mert1.jpg', id: 'VI-22', team: 'MERT', role: 'Marine', note: 'Dockton Park, boat launch' },
      { callsign: 'Medic1', fullName: 'Dr. Sunny Skipper', phone: '206-555-0133', image: 'medic1.jpg', id: 'VI-23', team: 'Medical', role: 'Medical', note: 'Dockton Park, first-aid post' },
    ]
  }

  /**
   * Field reports and messages for the sample mission.
   *
   * `bounds` is deliberately absent: RadioLogService.replaceAllRadioLog()
   * recalculates it from the report coordinates, exactly as it does for a real import.
   */
  public buildSampleRadioLog(rangers: RangerType[]): Omit<RadioLogType, 'bounds'> {
    const statuses = this.statusNames()
    const now = Date.now()

    // Command post - one fixed location for the whole exercise.
    const CP = { lat: 47.4472, lng: -122.4627, address: '10014 SW Bank Rd, Vashon' }
    // Two real Vashon-Maury parks, each covered by a walking-distance cluster of points
    // (roughly 100-500m apart) rather than one pin - the previous version of this data had
    // field teams scattered island-wide at car-trip distances, which is not how a foot
    // search actually moves.
    const MAURY = { lat: 47.4050, lng: -122.4200, name: 'Maury Island Marine Park' }
    const DOCKTON = { lat: 47.3739, lng: -122.4560, name: 'Dockton Park' }
    // Live report, 2026-08-30: every OTHER report below sits on land (trail, dock, or
    // shoreline) - a boat-team marker plotted mid-harbor first read as a data error, not a
    // boat, when it was the only water-based point in the set. Restored as a real water track
    // for MERT1 specifically (see its four Quartermaster Harbor waypoints below) - one of the
    // several team tracks on the water is the ask, not zero and not all of them.

    type Row = {
      callsign: string
      minutesAgo: number
      lat: number
      lng: number
      address: string
      statusIndex: number
      notes: string
      source?: RadioLogEntryType['source']
      operator?: string
      generates213?: boolean
      replyRequested213?: boolean
      subject213?: string
      message213?: string
      recipients213?: string[]
    }

    // Status indices point into the default radioLogStatuses list:
    // 0 Normal, 1 Location Report, 2 Evidence Report, 3 Need Rest/Food,
    // 4 Incident Check-in, 5 Incident Check-out, 6 Urgent.
    const rows: Row[] = [
      // ── Command staff check in from the post ──────────────────────────────────
      { callsign: '!CmdPost', minutesAgo: 335, ...CP, statusIndex: 4, notes: 'Command post established, net open on primary.', source: 'Voice', operator: 'Ivy Loudhailer' },
      { callsign: 'IC-Actual', minutesAgo: 333, ...CP, statusIndex: 4, notes: 'Assuming command for the exercise.', source: 'Voice', operator: 'Hazel "Compass" Winterbourne' },
      { callsign: 'OpsChief', minutesAgo: 330, ...CP, statusIndex: 4, notes: 'Ops section staffed, briefing field teams now.', source: 'Voice', operator: 'Ollie Fogbank' },
      { callsign: 'PlanChief', minutesAgo: 328, ...CP, statusIndex: 4, notes: 'Status boards up, map display ready.', source: 'Voice', operator: 'Penny Chartwell' },
      { callsign: 'LogChief', minutesAgo: 326, ...CP, statusIndex: 4, notes: 'Water and snacks staged for rotating teams.', source: 'Voice', operator: 'Iggy Sparrowgrass' },
      { callsign: 'PIO1', minutesAgo: 324, ...CP, statusIndex: 4, notes: 'Media staging area set up at the road entrance.', source: 'Voice', operator: 'Ivy Loudhailer' },

      // ── Maury Island Marine Park cluster - walking search pattern ─────────────
      { callsign: 'CERT1', minutesAgo: 300, lat: MAURY.lat, lng: MAURY.lng, address: `${MAURY.name} - main trailhead`, statusIndex: 4, notes: 'Team of two checking in, starting north loop on foot.', source: 'Voice', operator: 'Ollie Fogbank' },
      { callsign: 'CERT2', minutesAgo: 296, lat: MAURY.lat + 0.0018, lng: MAURY.lng - 0.0022, address: `${MAURY.name} - south loop junction`, statusIndex: 4, notes: 'Checked in, beginning south loop.', source: 'Voice', operator: 'Ollie Fogbank' },
      { callsign: 'Recon1', minutesAgo: 288, lat: MAURY.lat - 0.0012, lng: MAURY.lng + 0.0028, address: `${MAURY.name} - beach access trail`, statusIndex: 0, notes: 'Beach access trail passable, tide line clear.', source: 'Voice', operator: 'Ollie Fogbank' },
      { callsign: 'CERT1', minutesAgo: 250, lat: MAURY.lat + 0.0035, lng: MAURY.lng + 0.0010, address: `${MAURY.name} - north bluff overlook`, statusIndex: 2, notes: 'Downed branch partially blocking the overlook spur, photographed for assessment.', source: 'Voice', operator: 'Ollie Fogbank' },
      { callsign: 'CERT2', minutesAgo: 210, lat: MAURY.lat + 0.0025, lng: MAURY.lng - 0.0035, address: `${MAURY.name} - south loop, mile 1`, statusIndex: 0, notes: 'South loop clear so far, continuing toward the point.', source: 'Voice', operator: 'Ollie Fogbank' },
      {
        callsign: 'Recon1', minutesAgo: 180, lat: MAURY.lat - 0.0020, lng: MAURY.lng + 0.0015, address: `${MAURY.name} - beach access trail, low tide flats`, statusIndex: 6,
        notes: 'URGENT: hiker with a twisted ankle at the low tide flats, cannot self-evacuate.', source: 'Phone', operator: 'Ollie Fogbank',
        generates213: true, replyRequested213: true, subject213: 'Injured hiker, Marine Park beach trail',
        message213: 'One hiker, ankle injury, unable to walk out. Requesting Medic1 respond to the beach access trail low tide flats. Not life-threatening but needs assistance evacuating before the tide turns.',
        recipients213: ['Incident Commander', 'Ops'],
      },
      { callsign: 'Recon1', minutesAgo: 172, lat: MAURY.lat - 0.0020, lng: MAURY.lng + 0.0015, address: `${MAURY.name} - beach access trail, low tide flats`, statusIndex: 0, notes: 'Staying with the hiker, keeping them warm and off the wet sand until Medic1 arrives.', source: 'Voice', operator: 'Ollie Fogbank' },
      { callsign: 'CERT1', minutesAgo: 140, lat: MAURY.lat + 0.0035, lng: MAURY.lng + 0.0010, address: `${MAURY.name} - north bluff overlook`, statusIndex: 5, notes: 'North loop complete, no further hazards found, checking out.', source: 'Voice', operator: 'Ollie Fogbank' },
      { callsign: 'CERT2', minutesAgo: 96, lat: MAURY.lat + 0.0025, lng: MAURY.lng - 0.0035, address: `${MAURY.name} - south loop, mile 1`, statusIndex: 3, notes: 'South loop complete, team requesting food and rest.', source: 'Voice', operator: 'Ollie Fogbank' },

      // ── Dockton Park cluster - walking search pattern ──────────────────────────
      { callsign: 'CERT3', minutesAgo: 292, lat: DOCKTON.lat, lng: DOCKTON.lng, address: `${DOCKTON.name} - boat launch`, statusIndex: 4, notes: 'Team checked in at the boat launch, beginning shoreline sweep.', source: 'Voice', operator: 'Penny Chartwell' },
      { callsign: 'MERT1', minutesAgo: 284, lat: DOCKTON.lat + 0.0008, lng: DOCKTON.lng - 0.0015, address: `${DOCKTON.name} - marina dock`, statusIndex: 4, notes: 'Launched from the marina, transiting Quartermaster Harbor at idle speed.', source: 'Packet', operator: 'Penny Chartwell' },
      { callsign: 'Medic1', minutesAgo: 276, lat: DOCKTON.lat - 0.0010, lng: DOCKTON.lng + 0.0012, address: `${DOCKTON.name} - picnic shelter`, statusIndex: 4, notes: 'First-aid post set up at the picnic shelter, staged and ready.', source: 'Voice', operator: 'Penny Chartwell' },
      { callsign: 'CERT3', minutesAgo: 244, lat: DOCKTON.lat + 0.0022, lng: DOCKTON.lng + 0.0018, address: `${DOCKTON.name} - north shoreline trail`, statusIndex: 2, notes: 'Debris field along the north shoreline, photographed for assessment.', source: 'Voice', operator: 'Penny Chartwell' },
      // Live report, 2026-08-30: a small boat-patrol track on the water is wanted after all -
      // just not the WHOLE sample mission, which is otherwise deliberately on-foot (see the
      // land-only note above). Four waypoints down Quartermaster Harbor and back, bookended
      // by the marina dock check-in/check-out above and below - the one team in this data set
      // that's actually afloat.
      { callsign: 'MERT1', minutesAgo: 260, lat: DOCKTON.lat - 0.0015, lng: DOCKTON.lng - 0.0025, address: 'Quartermaster Harbor, north entrance', statusIndex: 0, notes: 'Position report, no vessels in distress observed.', source: 'Packet', operator: 'Penny Chartwell' },
      { callsign: 'MERT1', minutesAgo: 230, lat: DOCKTON.lat - 0.0035, lng: DOCKTON.lng - 0.0040, address: 'Quartermaster Harbor, mid-channel', statusIndex: 0, notes: 'Continuing south down the channel, harbor clear so far.', source: 'Packet', operator: 'Penny Chartwell' },
      { callsign: 'MERT1', minutesAgo: 200, lat: DOCKTON.lat - 0.0055, lng: DOCKTON.lng - 0.0030, address: 'Quartermaster Harbor, south end near the point', statusIndex: 0, notes: 'Rounding the point, visual sweep of the shoreline.', source: 'Packet', operator: 'Penny Chartwell' },
      { callsign: 'MERT1', minutesAgo: 170, lat: DOCKTON.lat - 0.0030, lng: DOCKTON.lng - 0.0060, address: 'Quartermaster Harbor, west shore', statusIndex: 0, notes: 'Heading back up-channel toward the dock.', source: 'Packet', operator: 'Penny Chartwell' },
      {
        callsign: 'CERT3', minutesAgo: 160, lat: DOCKTON.lat + 0.0022, lng: DOCKTON.lng + 0.0018, address: `${DOCKTON.name} - north shoreline trail`, statusIndex: 6,
        notes: 'URGENT: possible propane smell near the park maintenance shed, evacuating the picnic area as a precaution.', source: 'Voice', operator: 'Penny Chartwell',
        generates213: true, replyRequested213: true, subject213: 'Possible gas leak, Dockton Park maintenance shed',
        message213: 'Team reports a possible propane odor near the maintenance shed on the north shoreline trail. Clearing the picnic shelter as a precaution and holding a 50m perimeter. Requesting Logistics confirm whether county gas utility should be notified.',
        recipients213: ['Incident Commander', 'Logistics'],
      },
      { callsign: 'Medic1', minutesAgo: 152, lat: DOCKTON.lat - 0.0010, lng: DOCKTON.lng + 0.0012, address: `${DOCKTON.name} - picnic shelter`, statusIndex: 0, notes: 'Relocated first-aid post away from the shed as a precaution, no injuries.', source: 'Voice', operator: 'Penny Chartwell' },
      { callsign: 'MERT1', minutesAgo: 100, lat: DOCKTON.lat + 0.0008, lng: DOCKTON.lng - 0.0015, address: `${DOCKTON.name} - marina dock`, statusIndex: 5, notes: 'Marine sweep complete, back at the dock, checking out.', source: 'Packet', operator: 'Penny Chartwell' },
      { callsign: 'CERT3', minutesAgo: 60, lat: DOCKTON.lat + 0.0022, lng: DOCKTON.lng + 0.0018, address: `${DOCKTON.name} - north shoreline trail`, statusIndex: 5, notes: 'Shoreline sweep complete, propane smell traced to a stored camp stove, resolved. Checking out.', source: 'Voice', operator: 'Penny Chartwell' },

      // ── Wrap-up ────────────────────────────────────────────────────────────────
      { callsign: 'IC-Actual', minutesAgo: 30, ...CP, statusIndex: 0, notes: 'Both parks swept, no outstanding hazards. Standing down field teams.', source: 'Voice', operator: 'Hazel "Compass" Winterbourne' },
      { callsign: '!CmdPost', minutesAgo: 12, ...CP, statusIndex: 5, notes: 'Exercise complete, closing net.', source: 'Voice', operator: 'Ivy Loudhailer' },
    ]

    const known = new Set(rangers.map(r => r.callsign))
    const logEntries: RadioLogEntryType[] = []

    rows.forEach((row, index) => {
      if (!known.has(row.callsign)) {
        // Guards the roster and the report table against drifting apart: an unmatched
        // callsign would render as an orphan row the grid can't tie back to a ranger.
        this.log.error(`Sample report ${index} references unknown callsign "${row.callsign}" - skipped.`, this.id)
        return
      }
      logEntries.push({
        id: logEntries.length,
        callsign: row.callsign,
        location: { lat: row.lat, lng: row.lng, address: row.address, derivedFromAddress: false },
        date: new Date(now - row.minutesAgo * 60 * 1000),
        status: statuses[row.statusIndex] ?? statuses[0],
        notes: row.notes,
        source: row.source,
        operator: row.operator,
        generates213: row.generates213,
        replyRequested213: row.replyRequested213,
        subject213: row.subject213,
        message213: row.message213,
        recipients213: row.recipients213,
      })
    })

    return {
      version: this.missionService.settings.version,
      date: new Date(),
      event: SampleDataService.SAMPLE_EVENT_NAME,
      numReport: logEntries.length,
      maxId: logEntries.length,
      filter: '',
      logEntries,
    }
  }

  /**
   * Status *names* as currently configured, so the sample reports color-code correctly
   * in the grid. Users can rename statuses in Settings, and the grid matches on the
   * name string - hardcoding 'Normal' etc. here would silently produce grey rows for
   * anyone who had renamed them.
   */
  private statusNames(): string[] {
    const configured = this.missionService.settings?.radioLogStatuses
    if (!configured?.length) {
      this.log.error(`No field report statuses configured; sample reports will have an empty status.`, this.id)
      return ['']
    }
    return configured.map(s => s.status)
  }
}
