import { Observable, Observer, of, ReplaySubject, throwError } from 'rxjs'

/**
 * xlsx and csvImport are imported *dynamically*, inside the two methods that use them,
 * rather than at the top of this file.
 *
 * RangerService is providedIn:'root' and is injected by the Entry page, so it lands in
 * the eager initial bundle. A static `import * as XLSX from 'xlsx'` here therefore pulled
 * the entire SheetJS library (~800KB) into the initial download for every user - to
 * support two buttons on the Rangers page that most users never press. `import type` is
 * erased at compile time and costs nothing at runtime.
 */
import type * as XLSXType from 'xlsx'

import { formatDate } from '@angular/common'
import { HttpClient } from '@angular/common/http'
import { Injectable, OnInit, Optional, signal, SkipSelf } from '@angular/core'

//import { debounceTime, map, startWith } from 'rxjs/operators'
import { LogService, RangerType, UnknownRanger } from './'

/* xlsx.js (C) 2013-present SheetJS -- https://sheetjs.com */
// https://github.com/SheetJS/SheetJS.github.io
// D:\Projects\ImportExcel\sheetjs-master\demos\angular2\src\app\sheetjs.component.ts
type AOA = any[][]  // array of arrays

// TODO: Update server with new/deleted Rangers:  https://angular.io/tutorial/toh-pt6#heroes-and-http


@Injectable({ providedIn: 'root' })
export class RangerService implements OnInit {
  observeRangers$: Observable<RangerType[]> | null = null

  id = 'Ranger Service'

  // rangersSignal is the single source of truth for state. rangersReplay$ is
  // a thin, synchronously-fed notification layer for existing Observable
  // consumers - see the equivalent, more-detailed comment in
  // settings.service.ts for why (toObservable()'s effect-based bridge is
  // asynchronous; several consumers need synchronous emission).
  private rangersSignal = signal<RangerType[]>([])
  private rangersReplay$ = new ReplaySubject<RangerType[]>(1)
  // `rangers` is mutated in place throughout this class (push/splice/sort)
  // rather than reassigned; updateLocalStorageAndPublish() is the single
  // point that syncs that mutable array's current contents out to
  // rangersSignal/rangersReplay$ and localStorage.
  rangers: RangerType[] = []

  private localStorageRangerName = 'rangers'
  excelData: any[][] = [[1, 2], [3, 4]]


  // https://angular.io/guide/architecture-services#providing-services: singleton or multiple service instances?!
  //! REVIEW: Field & Ranger Services BOTH call constructors twice!!
  constructor(
    @Optional() @SkipSelf() existingService: RangerService,
    private httpClient: HttpClient,
    private log: LogService
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
    // REVIEW: this.log.verbose(`Constructor call stack: ${new Error().stack}`, this.id)

    this.LoadRangersFromLocalStorage()
    this.log.verbose(`Got ${this.rangers.length} from Local Storage`, this.id)

    // Maintainer, 2026-08-26: a fresh install used to auto-seed the 18 hardcoded Vashon
    // station callsigns here, unconditionally, for every new user everywhere - "Rangers
    // should start blank. That should indicate a new mission!" A blank roster is now itself
    // the first-run signal (see isRealRosterLoaded() below, simplified now that there's no
    // untouched-default state to distinguish from "real"). The 18 stations are still
    // available, purely opt-in, via the Rangers page's own "Add station callsigns" button
    // (Advanced section - loadHardcodedRangers(), unchanged) for teams that actually want
    // that specific starter set.
    if (this.rangers.length === 0) {
      this.log.verbose(`First run on this browser (or roster was emptied): starting blank. Load a real roster via Import roster/Import Mission, or Rangers > Advanced > Add station callsigns for the Vashon starter set.`, this.id)
    }

    this.updateLocalStorageAndPublish()
  }

  ngOnInit() {
    this.updateLocalStorageAndPublish()
  }

  /**
   * Expose Observable to 3rd parties, but not the actual subject (which could be abused)
   */
  public getRangersObserver(): Observable<RangerType[]> {
    return this.rangersReplay$.asObservable()
  }

  /**
   * D-32 readiness signal: true once the roster actually has someone in it.
   *
   * Simplified 2026-08-26: this used to compare against the exact 18 hardcoded station
   * callsigns, because a fresh install auto-seeded those on first run and a plain
   * `length > 0` check couldn't tell "prepared" from "untouched default". Now that a blank
   * roster IS the first-run state - nothing seeds it anymore, "Rangers should start blank,
   * that should indicate a new mission" - there's no untouched-default state left to
   * distinguish from real. Any ranger present, including via the opt-in "Add station
   * callsigns" button, counts as ready; zero rangers means the roster genuinely hasn't been
   * set up yet.
   */
  public static isRealRosterLoaded(rangers: RangerType[]): boolean {
    return rangers.length > 0
  }

  /**
    * Update localStorage with new rangers & notify observers
    * REVIEW: ALSO called from RangerComponent with new updates!
    *
    * TODO: Should new rangers be a parameter/argum,ent?!
    */
  public updateLocalStorageAndPublish() {
    // Do any needed sanity/validation here

    this.log.verbose(`New set of ${this.rangers.length} rangers. Save to local storage & publish`, this.id)
    this.SortRangersByCallsign()   // Only place this needs to be called?

    //! TODO: encrypt user data (in LocalStorage or elsewhere)
    // https://github.com/brix/crypto-js - requires Node.js

    localStorage.setItem(this.localStorageRangerName, JSON.stringify(this.rangers))

    // Signal gets a fresh array copy: this.rangers is mutated in place
    // (push/splice/sort), so passing the same reference to .set() would be
    // treated as "no change" by the signal's default equality check and
    // silently skip notifying signal-based consumers. The Replay layer gets
    // the original live reference, matching the exact prior BehaviorSubject
    // behavior for existing Observable-based consumers.
    this.rangersSignal.set([...this.rangers])
    this.rangersReplay$.next(this.rangers)
  }

  //--------------------------------------------------------------------------
  // 2026-08-26: dropped the `storedRosterWasReadable` bookkeeping flag this method used to
  // maintain - its only consumer was the constructor's auto-seed guard (removed the same
  // day, see the constructor's own comment), which needed to tell "nothing stored yet" apart
  // from "stored, but corrupt" apart from "deliberately emptied". Now that a blank roster is
  // never auto-replaced with anything, all three of those cases correctly land on the same
  // `this.rangers = []` outcome below - there's no longer a decision that depends on which
  // one it was.
  LoadRangersFromLocalStorage() { // WARN: Replaces any existing Rangers
    let localStorageRangers = localStorage.getItem(this.localStorageRangerName)
    try {
      const parsed = (localStorageRangers != null) ? JSON.parse(localStorageRangers) : []
      this.rangers = (localStorageRangers != null && Array.isArray(parsed)) ? parsed : []
      this.log.excessive(`Loaded ${this.rangers.length} rangers from local storage`, this.id)
    } catch (error: any) {
      this.rangers = []
      this.log.verbose(`Unable to parse Rangers from Local Storage. Error: ${error.message}`, this.id)
    }
    this.SortRangersByCallsign()   // TODO: Getting called too often?
  }

  //--------------------------------------------------------------------------

  // Or see code part way thru: https://www.geeksforgeeks.org/how-to-display-loading-screen-when-navigating-between-routes-using-angular/
  // for batsman.component.ts

  // REMOVED: LoadRangersFromJSON() and the `import * as rangers from
  // '../../../assets/data/Rangers.3Feb22.json'` it relied on.
  //
  // That file is gitignored (.gitignore: /src/assets/data/ranger*.json) because it holds
  // a real roster - 286 people with names, phone numbers and street addresses. A static
  // import meant the bundler inlined all of it into the shipped JavaScript, so every
  // deployed build published that roster to anyone who loaded the site. It also made the
  // project unbuildable from a clean clone, which is why CI could not typecheck: the same
  // defect as the secrets.json import (PRIVATE-Roadmap.md Section 9e).
  //
  // Nothing called the method - its only caller was the Rangers page's JSON import
  // button, removed with the other non-working import experiments. Seed data for a fresh
  // install comes from loadHardcodedRangers() below (station callsigns, not people), and
  // a real roster arrives via Import Mission.

  //See pg. 279...
  //import * as data from filename;
  //let greeting = data.greeting;
  /*   import {default as AAA} from "VashonCallSigns";
        AAA.targetKey
        // this requires `"resolveJsonModule": true` in tsconfig.json

        import {default as yyy} from './Rangers.3Feb22.json'
        import { HttpClient } from '@angular/common/http';
        yyy.primaryMain

        ngOnInit(): void {
            this.myService.getResponseData().then((value) => {
                //SUCCESS
                this.log.verbose(value, this.id);
                this.detailsdata = value;

            }, (error) => {
                //FAILURE
                this.log.verbose(error, this.id);
            })
        }
      <p><b>sales amount:</b> {{ detailsdata?.sales_amount }}</p>
      <p><b>collection amount:</b> {{ detailsdata?.collection_amount }}</p>
      <p><b>carts amount:</b> {{ detailsdata?.carts_amount }}</p>
    */

  //--------------------------------------------------------------------------
  // https://ag-grid.com/javascript-data-grid/excel-import/#example-excel-import"
  // https://github.com/SheetJS/SheetJS/tree/master/demos/angular2/
  LoadRangersFromExcel(eventTarget: any) {  // HTMLInputElement event:target

    // TODO: look at: https://www.npmjs.com/package/fs-browsers
    // TODO: https://h2qutc.github.io/angular-material-components/fileinput
    type AOR = RangerType[]  // array of Rangers

    // wire up file reader
    const target: DataTransfer = <DataTransfer>(eventTarget);

    if (target.files.length !== 1) throw new Error('Cannot use multiple files');
    this.log.verbose(`LoadRangersFromExcel(): About to read contents of ${target.files[0].name}`, this.id)
    const reader: FileReader = new FileReader();
    reader.onload = async (e: any) => {

      // Loaded on demand - see the import-type note at the top of this file.
      const XLSX = await import('xlsx')

      // read workbook
      const ab: ArrayBuffer = e.target.result;
      const wb: XLSXType.WorkBook = XLSX.read(ab);

      // grab first sheet
      const wsname: string = wb.SheetNames[0];
      const ws: XLSXType.WorkSheet = wb.Sheets[wsname];

      //! debugger

      let myJson = JSON.stringify(XLSX.utils.sheet_to_json(ws, { header: 1 }))

      this.log.verbose(`myJson = ${myJson}`, this.id)
      let myJson2 = JSON.parse(myJson)
      this.log.excessive(`myJson2 = ${myJson2}`, this.id)
      this.log.excessive(`1 Got ${this.rangers.length} rangers from Excel file.`, this.id)

      // save data
      this.rangers = <AOR>(myJson2)
      this.log.excessive(`2 Got ${this.rangers.length} rangers from Excel file...`, this.id)

      //this.rangers = JSON.parse(myJson)
    };
    this.log.excessive(`3 Got ${this.rangers.length} rangers from Excel file.`, this.id)

    //this.DisplayRangers_unused(`Excel import from ${target.files[0].name}`)
    this.log.excessive(`4 Got ${this.rangers.length} rangers from Excel file.`, this.id)

    reader.readAsArrayBuffer(target.files[0]);

    this.log.excessive(`5 Got ${this.rangers.length} rangers from Excel file.`, this.id)
    this.SortRangersByCallsign()

    // this.UpdateLocalStorage
    return this.rangers
  }

  /**
   * Empties the roster and *records* that it is deliberately empty.
   *
   * This used to `localStorage.removeItem()`, which made "Delete Rangers" impossible to
   * actually complete: the page reloads, the constructor finds no stored roster, decides
   * this must be a first run, and seeds the 18 hardcoded stations straight back. The old
   * UI text admitted it - "they will immediately get replaced with the hardcoded names!"
   * - but it meant anyone clearing the roster to load their own fought the app.
   *
   * Writing an empty array instead keeps the key present, which is how the constructor
   * now tells "never used this app" from "emptied it on purpose".
   */
  deleteAllRangers() {
    this.rangers = []
    this.updateLocalStorageAndPublish()
    this.log.warn(`Emptied the roster (stored as an empty list, so it stays empty).`, this.id)
  }

  /** Replaces the whole roster wholesale (e.g. restoring from a mission backup). */
  replaceAllRangers(newRangers: RangerType[]) {
    this.rangers = [...newRangers]
    this.updateLocalStorageAndPublish()
  }

  /**
   * Parses a roster from JSON text, for "Import roster" on the Rangers page.
   *
   * Deliberately liberal about the wrapper, because the file a team actually has in hand
   * could reasonably be any of these:
   *   - a bare array:            [ {callsign: ...}, ... ]
   *   - a mission export:        { schemaVersion, settings, rangers: [...], ... }
   *   - a hand-made wrapper:     { rangers: [...] }
   * Importing a roster should not require knowing which of those someone produced.
   *
   * Strict about the contents, though: every entry needs a callsign, because callsign is
   * the key the Entry form's autocomplete and every field report join on. A roster whose
   * rows cannot be referenced is worse than no roster - it looks loaded and is not.
   *
   * Missing optional fields are filled with empty strings rather than left undefined, so
   * the grid and the CSV export do not render "undefined" to an operator.
   *
   * Throws with a message meant to be shown to a user, not logged.
   */
  parseRosterJson(text: string): RangerType[] {
    let parsed: any
    try {
      parsed = JSON.parse(text)
    } catch (error: any) {
      throw new Error(`That file is not valid JSON (${error.message}).`)
    }

    const raw =
      Array.isArray(parsed) ? parsed :
        Array.isArray(parsed?.rangers) ? parsed.rangers :
          null

    if (raw === null) {
      throw new Error(
        'That file does not contain a roster. Expected either a list of rangers, or a mission export with a "rangers" list.')
    }

    if (raw.length === 0) {
      throw new Error('That file contains an empty roster - nothing to import.')
    }

    const rangers: RangerType[] = raw.map((entry: any, i: number) => {
      if (!entry || typeof entry !== 'object') {
        throw new Error(`Entry ${i + 1} is not a ranger record.`)
      }
      const callsign = String(entry.callsign ?? '').trim()
      if (!callsign) {
        throw new Error(
          `Entry ${i + 1} has no "callsign". Every ranger needs one - it is what field reports are filed against.`)
      }
      return {
        callsign,
        // Field-name aliases. Real rosters in hand do not use this app's field names: an
        // FCC-derived export calls the person "licensee", and carries "icon"/"status"
        // where RangerType has "image"/"role". Accepting the aliases is the difference
        // between a roster importing and importing with every Full Name blank.
        fullName: String(entry.fullName ?? entry.licensee ?? entry.name ?? ''),
        phone: String(entry.phone ?? ''),
        image: String(entry.image ?? entry.icon ?? ''),
        rew: String(entry.rew ?? ''),
        team: String(entry.team ?? ''),
        role: String(entry.role ?? entry.status ?? ''),
        note: String(entry.note ?? entry.notes ?? ''),
      } as RangerType
    })

    return rangers
  }

  /**
   * Non-fatal problems worth showing someone before they commit to an import.
   *
   * Duplicate callsigns are the interesting case. Callsign is the key every field report
   * joins on, so duplicates are genuinely ambiguous - but refusing a 286-entry roster over
   * one repeated row is the wrong trade when a team is trying to get set up. Report it and
   * let them decide.
   */
  rosterWarnings(rangers: RangerType[]): string[] {
    const warnings: string[] = []

    // Raised live 2026-08-26, alongside the same flag added to the map marker (a blank
    // callsign there falls back to a fixed "unassigned" icon, ranger-icon.ts) and the
    // Rangers grid (rangers.component.ts). Checked BEFORE the duplicate check below and
    // excluded from it: multiple blank callsigns would otherwise also trip that check
    // (they're all the same empty string), reading as a confusing "1 duplicate callsign: "
    // with nothing printed after the colon, instead of the real, clearer story.
    const blank = rangers.filter(r => !r.callsign.trim()).length
    if (blank) {
      warnings.push(
        `${blank} of ${rangers.length} entries have no callsign - not every volunteer is `
        + `ham-licensed, so this can be expected, but field reports from them will all look `
        + `identical (the same "unassigned" marker) on the map and can't be told apart. `
        + `Give each one any short unique identifier, ham callsign or not.`)
    }

    const signs = rangers.filter(r => r.callsign.trim()).map(r => r.callsign.toUpperCase())
    const duplicates = [...new Set(signs.filter((c, i) => signs.indexOf(c) !== i))]
    if (duplicates.length) {
      warnings.push(
        `${duplicates.length} duplicate callsign${duplicates.length > 1 ? 's' : ''}: `
        + `${duplicates.slice(0, 5).join(', ')}${duplicates.length > 5 ? '...' : ''}. `
        + `Field reports filed against these cannot tell the rows apart.`)
    }

    const nameless = rangers.filter(r => !r.fullName.trim()).length
    if (nameless) {
      warnings.push(`${nameless} of ${rangers.length} entries have no name - only a callsign.`)
    }

    return warnings
  }

  // this needs be done for the autocomplete control in the enter comonent to work correctly
  // TODO: Getting called too often?
  SortRangersByCallsign() {
    this.log.excessive(`SortRangersByCallsign: ${this.rangers.length} Rangers in array`, this.id)

    return this.rangers.sort((n1, n2) => {
      if (n1.callsign > n2.callsign) { return 1 }
      if (n1.callsign < n2.callsign) { return -1 }
      return 0;
    })
  }

  // TODO: verify new report is proper shape/validated here or by caller??? Send as string or object?
  public AddRanger(formData: string = ""): RangerType {
    this.log.excessive(`Got new ranger: ${formData}`, this.id)
    let newRanger: RangerType
    if (formData != "") {
      newRanger = JSON.parse(formData)
    } else {
      newRanger = {
        callsign: "!A_New_Tactical", fullName: "AAA_New_Name",        // licenseKey: number
        image: "male.png", rew: "VI-00 ", phone: "206-463-0000", team: "", role: "", note: `Manually added at ${formatDate(Date.now(), 'short', "en-US")}.` //https://angular.io/guide/i18n-common-locale-id
      }
    }
    this.rangers.push(newRanger)

    this.updateLocalStorageAndPublish();
    return newRanger;
  }


  //-------------------  UNUSED -----------------------------
  private displayRangers_unused(msg: string) {
    let len = 10
    if (this.rangers.length < len) len = this.rangers.length
    this.log.excessive(`${msg}: (1st ${len} rows:)`, this.id)
    for (let i = 0; i < len; i++) {
      this.log.excessive(`${i} as $$: ${JSON.stringify(this.rangers[i])}`, this.id)
      //this.log.verbose(`${i} as $$: ${JSON.stringify(this.rangers[i])}`, this.id)
    }
  }

  public async loadRangersFromExcel2() {  // still called by rangers Component from a button
    //debugger
    // Loaded on demand - csvImport pulls in xlsx. See the note at the top of this file.
    const { csvImport } = await import('../../rangers/csvImport')
    let fnc = new csvImport(document)
    fnc.importExcel2()
    //csvImport.importExcel2()
    this.log.verbose(`Got excel file`, this.id)
  }

  getRanger(callsign: string) {
    const index = this.findIndex(callsign);
    if (index >= 0) {
      return this.rangers[index]
    }
    this.log.error(`GetRanger got unknown callsign: ${callsign}`, this.id)
    return UnknownRanger
  }

  updateRanger(ranger: RangerType) {
    const index = this.findIndex(ranger.callsign);
    if (index >= 0) {
      this.rangers[index] = ranger;
      this.updateLocalStorageAndPublish();
    } else {
      this.log.error(`updateRanger got unknown callsign: ${ranger.callsign}`, this.id)
    }
  }

  deleteRanger(callsign: string) {
    const index = this.findIndex(callsign);
    if (index >= 0) {
      this.rangers.splice(index, 1);
      this.updateLocalStorageAndPublish();
    } else {
      this.log.error(`deleteRanger got unknown callsign: ${callsign}`, this.id)
    }
  }

  private findIndex(callsign: string): number {
    for (let i = 0; i < this.rangers.length; i++) {
      if (this.rangers[i].callsign === callsign) return i;
    }
    return -1
  }

  SortRangersByCallsign_unused() {
    this.log.verbose(`SortRangersByCallsign: ${this.rangers.length} Rangers in array`, this.id)

    //debugger
    //return this.rangers

    if (this.rangers.length == 0) {
      return
    }

    //let sorted4 = this.rangers

    this.rangers.sort((a, b) => {
      if (b.callsign > a.callsign) return -1
      if (b.callsign < a.callsign) return 1
      return 0
    })
    //  let sorted = this.rangers.sort((first, second) => first.callsign > second.callsign ? 1 : -1)

    this.log.excessive("SortRangersByCallsign...DONE --- BUT ARE THEY REVERSED?!", this.id)
    return this.rangers
  }

  //--------------------------------------------------------------------------
  loadHardcodedRangers() {
    this.log.verbose("Adding all hardcoded Rangers", this.id)

    /* Following from 98070 AND 98013 zip codes, MUST be sorted by call sign!
        https://wireless2.fcc.gov/UlsApp/UlsSearch/searchAmateur.jsp
  */
    // REVIEW: push (i.e., add) vs. replace?
    this.rangers.push(

      // NOTE: The image names are case-sensitive!!
      { callsign: "!CmdPost", fullName: "ACS-CERT Cmd Post", phone: "206-463-", image: "CmdPost.jpg", rew: "CmdPost", team: "T0", role: "Licensed", note: "-" },

      { callsign: "ACS1", fullName: "ACS-CERT Team 1", phone: "206-463-", image: "ham_blue.png", rew: "", team: "T1", role: "Licensed", note: "-" },
      { callsign: "ACS2", fullName: "ACS-CERT Team 2", phone: "206-463-", image: "ham_red.png", rew: "", team: "T1", role: "Licensed", note: "-" },
      { callsign: "ACS3", fullName: "ACS-CERT Team 3", phone: "206-463-", image: "ham_yellow.png", rew: "", team: "T1", role: "Licensed", note: "-" },
      { callsign: "ACS4", fullName: "ACS-CERT Team 4", phone: "206-463-", image: "team_brown.png", rew: "", team: "T1", role: "Licensed", note: "-" },

      { callsign: "CERT1", fullName: "CERT 1", phone: "206-463-", image: "CERT_red.png", rew: "", team: "CERT1", role: "Licensed", note: "-" },
      { callsign: "CERT2", fullName: "CERT 2", phone: "206-463-", image: "CERT_green.png", rew: "", team: "CERT2", role: "Licensed", note: "-" },
      { callsign: "CERT3", fullName: "CERT 3", phone: "206-463-", image: "CERT_yellow.png", rew: "", team: "CERT3", role: "Licensed", note: "-" },
      { callsign: "CERT4", fullName: "CERT 4", phone: "206-463-", image: "CERT_blue.png", rew: "", team: "CERT4", role: "Licensed", note: "-" },
      { callsign: "CERT5", fullName: "CERT 5", phone: "206-463-", image: "CERT_brown.png", rew: "", team: "CERT5", role: "Licensed", note: "-" },
      { callsign: "CERT6", fullName: "CERT 6", phone: "206-463-", image: "CERT_purple.png", rew: "", team: "CERT6", role: "Licensed", note: "-" },

      { callsign: "MERT1", fullName: "MERT 1", phone: "206-463-", image: "MERT_red.png", rew: "", team: "MERT1", role: "Licensed", note: "-" },
      { callsign: "MERT2", fullName: "MERT 2", phone: "206-463-", image: "MERT_green.png", rew: "", team: "MERT2", role: "Licensed", note: "-" },
      { callsign: "MERT3", fullName: "MERT 3", phone: "206-463-", image: "MERT_yellow.png", rew: "", team: "MERT3", role: "Licensed", note: "-" },
      { callsign: "MERT4", fullName: "MERT 4", phone: "206-463-", image: "MERT_blue.png", rew: "", team: "MERT4", role: "Licensed", note: "-" },
      { callsign: "MERT5", fullName: "MERT 5", phone: "206-463-", image: "Yacht_purple.png", rew: "", team: "MERT5", role: "Licensed", note: "-" },
      { callsign: "MERT6", fullName: "MERT 6", phone: "206-463-", image: "sail.png", rew: "", team: "MERT6", role: "Licensed", note: "-" },

      { callsign: "Mobile", fullName: "John's Mobile", phone: "206-463-", image: "westy.png", rew: "", team: "MERT6", role: "Licensed", note: "-" },
    )


    // A second, commented-out roster of ~307 entries used to sit here: 267 distinct real
    // names and 197 street addresses for licensed amateurs in the 98070/98013 ZIPs, pulled
    // from the FCC ULS. It was dead code - already commented out, never executed - but it
    // was *tracked* source in a public repository, which is a worse place for neighbours'
    // home addresses than a gitignored data file (see PRIVATE-Roadmap.md Section 9f).
    //
    // Deleted 2026-08-14. The live seed above is stations only. Real rosters arrive via
    // Import Mission; the fictional demo roster lives in SampleDataService.
    //this.log.verbose(`Next: update LocalStorage: ${this.localStorageRangerName}`, this.id)
    this.SortRangersByCallsign()
    this.updateLocalStorageAndPublish();
    //this.log.verbose(`returned from: updating LocalStorage: ${this.localStorageRangerName}`, this.id)
  }

  // FUTURE:  getActiveRangers() {
  // filter for Ranger.status == 'checked in' ?
  // return this.rangers }
}



