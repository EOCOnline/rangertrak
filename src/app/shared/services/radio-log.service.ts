import { Observable, Observer, of, ReplaySubject, Subscription, throwError } from 'rxjs'

import { HttpClient } from '@angular/common/http'
import {
  Injectable, OnDestroy, OnInit, Optional, Pipe, PipeTransform, signal, SkipSelf, WritableSignal
} from '@angular/core'

import {
  RadioLogStatusType, RadioLogType, RadioLogEntryType, LogService, RangerType,
  MissionService, MissionType
} from './'
// ADR D-42: versioned storage seam for radio log entries. Direct import, not via the barrel,
// to avoid a cycle - the barrel re-exports this service.
import { migrateRadioLog } from './radio-log-migration'

//import {  } from './ranger.interface'



// TODO: Update server with new reports:  https://angular.io/tutorial/toh-pt6#heroes-and-http

// 2026-08-31: renamed from field-report.service.ts / FieldReportService - a naming holdover
// from before the page itself was renamed Reports -> Radio Log (0.75.0). Class/method/field
// names all follow, including `storageLocalName` (below) - the app has no real users yet
// ([[no-real-users-yet-rename-freely]]), so there is no stored data to orphan by changing it.

//, deps: [LogService, RangerService, LogService]
@Injectable({ providedIn: 'root' })
export class RadioLogService {

  private id = 'Radio Log Service'

  private radioLog!: RadioLogType
  // radioLogSignal is the single source of truth for state.
  // radioLogReplay$ is a thin, synchronously-fed notification layer for
  // existing Observable consumers - see the equivalent, more-detailed
  // comment in mission.service.ts for why (toObservable()'s effect-based
  // bridge is asynchronous; several consumers need synchronous emission).
  // Like RangerService's `rangers`, `radioLog` is mutated in place
  // (push/extend/etc.) rather than reassigned; updateRadioLogAndPublish()
  // is the single point that syncs its current contents out.
  private radioLogSignal!: WritableSignal<RadioLogType>
  private radioLogReplay$ = new ReplaySubject<RadioLogType>(1)

  // REVIEW: No need to enable subscription to selectedRadioLog as they are
  // auto-saved on evey selection and user is single-threaded.
  // Otherwise move to maps which THEN grab the new values.
  private selectedRadioLog!: RadioLogType

  private missionSubscription!: Subscription
  private settings!: MissionType

  public rangers: RangerType[] = []

  private storageLocalName = 'radioLog'
  private serverUri = 'https://localhost:4000/products' // FUTURE:
  private boundsMargin = 0.0025

  // https://angular.io/guide/architecture-services#providing-services: singleton or multiple service instances?!
  //! REVIEW: Field & Ranger Services BOTH call constructors twice!!
  constructor(
    private missionService: MissionService,
    private log: LogService,
    private httpClient: HttpClient,
    @Optional() @SkipSelf() existingService: RadioLogService,
  ) {
    if (existingService) {
      /**
       * see https://angular.io/guide/singleton-services
       * Use @Optional() @SkipSelf() in singleton constructors to ensure
       * future modules don't provide extra copies of this singleton service
       * per pg 84 of Angular Cookbook: do NOT add services to *.module.ts!
       */
      throwError(() => {
        console.error(`This singleton service has already been provided in the application. Avoid providing it again in child modules.`)
        new Error(`This singleton service has already been provided in the application. Avoid providing it again in child modules.`)
      })
    }

    this.log.verbose("======== Constructor() ============", this.id)
    //! REVIEW: this.log.verbose(`Constructor call stack (NOT an error: why called twice?): ${new Error().stack}`, this.id)

    // Subscribe to Settings BEFORE loading reports: MissionService replays its current
    // value synchronously, so this populates this.settings first. Loading first meant a
    // fresh install built its empty RadioLog with version '0' (initEmptyRadioLog
    // falls back when settings are missing), which then failed the version check below
    // and logged a bogus "does NOT match" error on every virgin start.
    this.missionSubscription = this.missionService.getMissionObserver().subscribe({
      next: (newMission) => {
        this.settings = newMission
        this.log.excessive('Received new Settings via subscription.', this.id)
        this.checkRadioLogVersion()
      },
      error: (e) => this.log.error('Settings Subscription got:' + e, this.id),
      complete: () => this.log.info('Settings Subscription complete', this.id)
    })

    this.radioLog = this.loadRadioLogFromLocalStorage()

    this.log.info(`Got v.${this.radioLog.version} for event: ${this.radioLog.event} on  ${this.radioLog.date} with ${this.radioLog.numReport} Field Reports from localstorage`, this.id)

    // REVIEW: bounds actually needs to be an Object, not getting done this a waitForAsync, right?!
    this.recalcRadioLogBounds(this.radioLog)  // Should be extraneous...
    this.radioLogSignal = signal(this.radioLog)
    this.updateRadioLogAndPublish()
  }


  /**
   * Compares the app version stamped on the stored radio log against the currently
   * running app version.
   *
   * Investigated 2026-08-31 (roadmap backlog item, "latent gap: the check never actually
   * fires on startup"): true, but NOT fixed here on purpose. `version` is the raw app
   * version string (`package.json`), which changes on every single deploy - since "no
   * upgrade logic implemented yet" (this function's own log line already says so), a
   * mismatch is the NORMAL state after any release, for every returning user, not a real
   * anomaly. Making this run on the guaranteed-to-mismatch startup path would turn a silent
   * no-op into a `log.error` on nearly every session - worse than today's gap, not better.
   * Left wired only from the settings subscription's `next` (a live mid-session settings
   * change, comparatively rare) until this compares against something meaningful - a real
   * schema/data version, not the app's own release string.
   */
  private checkRadioLogVersion(): void {
    if (!this.radioLog || !this.settings) { return }

    if (this.radioLog.version == this.settings.version) {
      this.log.excessive('Application version matches version used to store Field Reports.', this.id)
    } else {
      this.log.error(`Application version ${this.settings.version} does NOT match version used to store Field Reports: ${this.radioLog.version}. No upgrade logic implemented yet...`, this.id)
    }
  }

  /**
   * Load any existing radio log from browser's Local Storage
   * FUTURE: If RadioLogType elements/structure changes in a future version, upgrade to that
   * @returns
   */
  private loadRadioLogFromLocalStorage(): RadioLogType {
    let localStorageFieldReports = localStorage.getItem(this.storageLocalName)

    if (localStorageFieldReports == null) {
      this.log.warn(`No Field Reports found in Local Storage. Will rebuild from defaults.`, this.id)
      return this.initEmptyRadioLog()
    }
    else if (localStorageFieldReports.indexOf("version") <= 0) {
      this.log.error(`Field Reports in Local Storage appear corrupted (no version #) & will be stored in Local Storage with key: '${this.storageLocalName}-BAD'. Will rebuild from defaults.`, this.id)
      localStorage.setItem(this.storageLocalName + '-BAD', localStorageFieldReports)
      return this.initEmptyRadioLog()
    } else {
      // ADR D-42 Phase 2: everything stored goes through migrateRadioLog(), which
      // stamps schemaVersion and is where any future transform will live. Returns null when
      // the payload is not a usable store, in which case we fall back to our own initializer
      // rather than have the migration duplicate what 'empty' means.
      //
      // NOTE the corruption check above is a naive indexOf('version') substring search over
      // raw JSON - same class of bug as [[settings-marker-field-trap]]. 'schemaVersion'
      // happens to contain that substring, which is luck rather than design; do not remove
      // the 'version' field without replacing that check with a structural test.
      return migrateRadioLog(JSON.parse(localStorageFieldReports)) ?? this.initEmptyRadioLog()
    }
  }

  /**
   * Create a fresh/new/default/initial radio log object
   */
  private initEmptyRadioLog() {

    //(property) RadioLogService.radioLog: RadioLogType
    //Type '{ version: string | undefined; date: Date; event: string; bounds: L.LatLngBounds; numReport: number; maxId: number; filter: string; logEntries: { id: number; callsign: string; lat: number | undefined; ... 4 more ...; note: string; }[]; }' is not assignable to type 'RadioLogType'.ts(2322)

    if (this.settings === undefined) {
      this.log.error(`this.Settings not yet set!`, this.id)
      //throwError(() => new Error(`this.Settings was not yet set in RadioLogService!!!!!`))
      //debugger
      //return null
    }

    return {
      version: this.settings ? this.settings.version : '0',
      date: new Date(),
      event: this.settings ? this.settings.event : '',
      bounds: { north: 89.9, south: -89.9, east: 179.9, west: -179.9 }, // whole world until recalcRadioLogBounds() runs
      numReport: 0,
      maxId: 0,
      filter: '', // All reports or not? Guard to ensure a subset never gets writen to localstorage?
      logEntries: []
    }
  }

  /**
   * Expose Observable to 3rd parties, but not the actual subject (which could be abused)
   */
  public getRadioLogObserver(): Observable<RadioLogType> {
    return this.radioLogReplay$.asObservable()
  }

  /**
   * Synchronous read of the current radio log (e.g. for export/backup).
   * Prefer getRadioLogObserver() for anything reactive.
   */
  public getCurrentRadioLog(): RadioLogType {
    return this.radioLog
  }

  /**
   * Replaces the whole radio log wholesale (e.g. restoring from a mission
   * backup). `newRadioLog.bounds` is ignored if present - bounds are
   * always recalculated fresh, exactly as the constructor already does on
   * every normal load.
   */
  public replaceAllRadioLog(newRadioLog: Omit<RadioLogType, 'bounds'>) {
    this.radioLog = { ...newRadioLog, bounds: this.radioLog.bounds }
    this.recalcRadioLogBounds(this.radioLog)
    this.updateRadioLogAndPublish()
  }

  /**
   * Update localStorage with the new radio log & notify observers
   */
  private updateRadioLogAndPublish() {
    // Do any needed sanity/validation here
    if (this.radioLog.numReport != this.radioLog.logEntries.length) {
      this.log.error(`this.radioLog.numReport=${this.radioLog.numReport} != this.radioLog.logEntries.length ${this.radioLog.logEntries.length}`, this.id)
      this.radioLog.numReport = this.radioLog.logEntries.length
    }

    localStorage.setItem(this.storageLocalName, JSON.stringify(this.radioLog))

    this.log.excessive(`New radio log is available to observers...`, this.id)
    // Signal gets a fresh copy for the same reason as RangerService.rangers:
    // this.radioLog is mutated in place, so .set() with the same
    // reference would be a no-op under the signal's default equality check.
    this.radioLogSignal.set({ ...this.radioLog })
    this.radioLogReplay$.next(this.radioLog)
  }

  /**
   * User has submitted a new radio log entry: store it into localstorage and publish to any subscribers
   *
   * @param formData
   * @returns
   */
  public addRadioLogEntry(formData: string) {
    this.log.info(`Got new radio log entry: ${JSON.stringify(formData)}`, 'RadioLogService')

    let newReport: RadioLogEntryType = JSON.parse(formData) //"[object Object]" is not valid JSON
    newReport.id = this.radioLog.maxId++
    this.radioLog.numReport++
    this.radioLog.logEntries.push(newReport)

    // Recalculate rather than widen the existing box (this used to call Leaflet's
    // LatLngBounds.extend()). Two update paths that disagreed - extend() applied no
    // broadening margin - was D-22; one path means one answer, and the array is small
    // enough that a full pass costs nothing.
    this.recalcRadioLogBounds(this.radioLog)

    this.updateRadioLogAndPublish() // put to localStorage & update subscribers
    return newReport
  }

  /**
   * Persist edits made in place to existing entries - the Radio Log grid
   * binds directly to logEntries, so AG Grid's cell editing mutates these
   * very objects; all that was missing was writing them back out. Bounds are
   * recalculated because an edited lat/lng can move the map's extent.
   */
  public saveEditedRadioLog() {
    this.recalcRadioLogBounds(this.radioLog)
    this.updateRadioLogAndPublish()
  }

  public setSelectedRadioLogEntries(selection: RadioLogEntryType[]) {
    if (this.selectedRadioLog == null) {
      this.selectedRadioLog = this.initEmptyRadioLog()
      this.selectedRadioLog.filter = "As selected by user"
    }
    this.selectedRadioLog.logEntries = selection
    this.selectedRadioLog.numReport = selection.length
    this.recalcRadioLogBounds(this.selectedRadioLog)
    // Update - if subscribed...
  }

  public getSelectedRadioLogEntries(): RadioLogType {
    // TODO: Use setter & getters?, pg 452 Ang Dev w/ TS
    if (this.selectedRadioLog == null) {
      this.log.warn(`User hasn't selected any rows yet,
      so we're returning an empty array for the selected radio log!`, this.id)
      this.selectedRadioLog = this.initEmptyRadioLog()
      this.selectedRadioLog.filter = "As selected by user"
      this.selectedRadioLog.logEntries = []
      this.selectedRadioLog.numReport = 0
    }
    return this.selectedRadioLog
  }

  public deleteAllRadioLogEntries() {
    // TODO: reset header properties too?!
    this.radioLog.logEntries = []
    localStorage.removeItem(this.storageLocalName)
    this.radioLog.maxId = 0 // REVIEW: is this desired???
  }


  // ------------------ BOUNDS ---------------------------

  /**
   * recalcRadioLogBounds
   *
   * The single place radio log bounds are computed. Writes a plain
   * BoundsType - map engines convert it to their own type at the point of use.
   *
   * @param reports
   * @returns
   */
  recalcRadioLogBounds(reports: RadioLogType) {
    this.log.verbose(`recalcRadioLogBounds got ${reports.logEntries.length} field reports`, this.id)

    if (!this.settings) {
      this.log.error('this.settings is undefined', this.id)
      throwError(() => new Error('this.settings is undefined'))
      return
    }
    let north
    let west
    let south
    let east

    if (reports.logEntries.length) {
      north = reports.logEntries[0].location.lat
      west = reports.logEntries[0].location.lng
      south = reports.logEntries[0].location.lat
      east = reports.logEntries[0].location.lng

      // https://www.w3docs.com/snippets/javascript/how-to-find-the-min-max-elements-in-an-array-in-javascript.html
      // concludes with: "the results show that the standard loop is the fastest"

      for (let i = 1; i < reports.logEntries.length; i++) {
        if (reports.logEntries[i].location.lat > north) {
          north = reports.logEntries[i].location.lat //Math.round(reports.logEntries[i].location.lat * 10000) / 10000
        }
        if (reports.logEntries[i].location.lat < south) {
          south = reports.logEntries[i].location.lat //Math.round(reports.logEntries[i].location.lat * 10000) / 10000
        }
        if (reports.logEntries[i].location.lng > east) {
          east = reports.logEntries[i].location.lng //Math.round(reports.logEntries[i].location.lng * 10000) / 10000
        }
        if (reports.logEntries[i].location.lng < west) {
          west = reports.logEntries[i].location.lng //Math.round(reports.logEntries[i].location.lng * 10000) / 10000
        }
      }
      // Round to 4 decimal places
      north = Math.round(north * 10 ** 4) / 10 ** 4
      south = Math.round(south * 10 ** 4) / 10 ** 4
      east = Math.round(east * 10 ** 4) / 10 ** 4
      west = Math.round(west * 10 ** 4) / 10 ** 4
    } else {
      // no field reports yet! Rely on broadening processing below
      north = this.settings.defLat
      west = this.settings.defLng
      south = this.settings.defLat
      east = this.settings.defLng
    }

    // Broaden boundaries to minimum values
    this.log.info(`recalcRadioLogBounds got E:${east} W:${west} N:${north} S:${south} `, this.id)
    if (east - west < 2 * this.boundsMargin) {
      east += this.boundsMargin
      west -= this.boundsMargin
      this.log.info(`recalcRadioLogBounds BROADENED to E:${east} W:${west} `, this.id)
    }
    if (north - south < 2 * this.boundsMargin) {
      north += this.boundsMargin
      south -= this.boundsMargin
      this.log.info(`recalcRadioLogBounds BROADENED to N:${north} S:${south} `, this.id)
    }

    reports.bounds = { north, south, east, west }
    this.log.excessive(`New bounds: E: ${east};  N: ${north};  W: ${west};  S: ${south};  `, this.id)
  }

}
