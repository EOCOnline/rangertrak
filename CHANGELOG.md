# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [0.82.1](https://github.com/EOCOnline/rangertrak/commit/TBD) (2026-08-29)

### Fixes

* **map:** the "Just those... selected" and "Use MapLibre..." toggles below each engine's overview map dropped to full width underneath it on a phone, instead of wrapping into the narrower column beside it - raised live from a phone screenshot. MDC's slide-toggle lays its switch+label out as an unconstrained line with no wrap, so the whole control needed one long line that didn't fit beside the floated 175px overview map and dropped below it instead. Capped to the space actually available beside the map, with the label now wrapping onto more than one line - saves real vertical space on a phone.

## [0.82.0](https://github.com/EOCOnline/rangertrak/commit/e35b86dfd95fe5022b5d53404f795daa854c42a4) (2026-08-29)

### Fixes

* **map:** MapLibre's report markers now colour by ranger identity (the same `rangerColorFor()` Leaflet's own markers and route trails already use), instead of every report rendering as an identical red dot. This was never a regression - MapLibre never had a per-ranger marker system built for it at all. Distinct per-ranger *shapes* (matching Leaflet's) would need a bigger change (a `symbol` layer with pre-registered images) and isn't done here; colour alone answers the reported complaint. The basemap-not-rendering half of this report is still open - see the roadmap for what was and wasn't ruled out this pass.
* **entry:** dropped the operator field's "Optional - blank is fine" placeholder text.

## [0.81.0](https://github.com/EOCOnline/rangertrak/commit/a0e49940356781a154364537fcbe9d99b7eef832) (2026-08-29)

### Features

* **entry:** Source now includes "Phone" (F29-43), and is finally shown - a Radio Log column and an ICS-309 export column, since capturing it on every report and never surfacing it anywhere made adding a new option pointless on its own (F29-46).
* **entry:** operator identity (D-44, ADR-worthy) - a name field right above Submit, stamped onto each report at the moment it's filed and never looked up later, so a mid-mission shift change can't retroactively re-attribute a past report. Carries forward from the previous entry within the same session (no persisted setting, no device default); collapses to a compact summary line with an edit affordance once set, so the hot path doesn't carry a permanently-open extra input for the common case of many entries by the same scribe. Fills ICS-213's "8 Approved by Name" and a new `Ics309LogHeader.preparedBy`; also a Radio Log column.
* **entry:** a genuinely new "Subject" field, last inside the "Also generate an ICS-213" section, right after Message - fills "4 Subject", declared on the real ICS-213 form since the original PDF-fill work but never actually populated, so it printed blank on every 213 generated until now.
* **mission:** the "Ranger ID field name" setting now states the operational expectation plainly - every responder should have their own, and anyone without one shows as not yet checked in - worded as an expectation, not an enforced rule the app will block on (F29-45).

## [0.80.0](https://github.com/EOCOnline/rangertrak/commit/81fbd3194e2f349691884c232bdf09df04a72638) (2026-08-29)

### Features

* **help:** restructured the Help page (D-d, F29-32, F29-33) - "Start here" and "Mission setup" merged into one onboarding checklist (still eight tabs total: a new "After mission" tab, split out of "Your data", offsets the merge); FAQ moved up next to About, its answers collapsed by default and independently expandable; "Log" renamed "Feedback" and now carries the in-app feedback form (moved on from "About", where it landed as an interim stop in the previous release) with the diagnostic log folded in as an optional, closed-by-default section.
* **shared:** new `ExpandableSectionComponent` - a collapsed-by-default, click-to-open block, sibling to the always-open `SectionComponent`. Built once and reused for the FAQ, the Log-inside-Feedback section, and both Rangers' and Mission's danger zones (F29-18) - a stray click can no longer land on a destructive button, and the section stays visually out of the way as the exceptional action it is. This is a deliberate, named exception to the 2026-08-25 "remove all collapsible sections" decision, not a reversal of it - `SectionComponent` itself is untouched and still always renders open.
* **log:** a "Copy log to clipboard" button (F29-29), so the diagnostic log can be pasted straight into the feedback form or a GitHub issue - replaces an instruction to "export the log and attach it to your report," which was never actually possible with a plain-text feedback form.

### Fixes

* **help:** fixed two spots that still promised "attach the log to your report" - a leftover from before the clipboard button existed.

## [0.79.0](https://github.com/EOCOnline/rangertrak/commit/5bb97b1993a0bca0414e6b5b8fe64478523eb33e) (2026-08-29)

### Fixes

* **rangers:** "Clear photos" used to unconditionally promise rangers would show the generic silhouette afterward - false whenever a ranger's roster entry already names its own `image`, a separate source (untouched by the on-device photo store this button actually clears). Read as the button not working when it had; the confirmation dialog now says so accurately.
* **mission:** the Field Report status grid's `no this.gridApi yet in refreshStatusGrid()` console log, previously firing on every normal page load - it was being called on the very first `rowData` binding, before ag-Grid had mounted. The grid's own `onGridReady()` already refreshes itself once it exists; the early call only mattered for a later reassignment (import/reset), which is what it still does.
* **perf:** preconnect to `nominatim.openstreetmap.org` (Entry's reverse-geocode of the mission's default position sits on the critical path on first load) and fix the navbar GitHub mark rendering slightly out of square (32x29 against its real 32x32 source), both flagged by a PageSpeed Insights pass. Also adds a `profiling` build configuration (production's optimized output plus hidden source maps) for local DevTools investigation, kept separate from the `production` configuration CI actually deploys.

## [0.78.0](https://github.com/EOCOnline/rangertrak/commit/fe0c047af70555e12d27a3e26543ffde813d8335) (2026-08-29)

### Fixes

* **rangers:** column order changed to Image, [Ranger ID], Call Sign, Full Name, Phone, Role, Notes - identity now leads the row instead of trailing it.
* **header:** a `|` now separates the mission pill's operational-period label from the elapsed-time clock, so a bare number can't be misread as a clock time - enlarged and heavier than surrounding text, since a plain `|` at body-sm size was easy to lose, especially in dark mode.
* **help:** the marmot backdrop's opacity raised from 0.15 to 0.30 (an absolute change, not a relative one) - reported as too dim to read as a photograph at the old value.
* **guide:** roster-import guidance now says "a UNIQUE ID" instead of "at least an id"; the stale "(Before v0.15.3 ...)" parenthetical about the built-in station list is removed.
* **radio-log:** the CallSign column's header no longer reads the mission's "Ranger ID field name" (`idFieldLabel`) while the column itself still shows callsign data - a mission that renamed that label (e.g. to "REW") could show a column headed "REW" full of callsigns. The header now always says "Callsign", matching what the column actually holds. (Whether to collapse this column with the roster's own id column, when a mission's id field IS the callsign, is a separate, still-open question.)
* **help:** the About/Send Feedback/How-it's-built content that used to sit below the tab group - and so rendered beneath whichever tab was open, not just About - now lives inside the About tab itself, once instead of on every tab.
* **nav,mission,map:** "Backup Map" retired app-wide in favour of "Alternative Map" (ADR D-31, reversed 2026-08-29) - the old wording ranked the two map engines against each other rather than naming an actual difference between them.
* **forms:** the app-wide outlined `mat-form-field` notches its floating label into the field's own top edge; a few extra px of top margin keeps that notch from colliding with whatever content sits directly above the field.

## [0.77.2](https://github.com/EOCOnline/rangertrak/commit/4170b9d2b26bc8d3a60ba80ab49113f7fc701e3d) (2026-08-27)

### Fixes

* **entry:** a short +Code entered in its normal shareable form - "CODE LOCALITY", e.g. "FGPM+MC7 Vashon, Washington" - silently did nothing on Enter or Tab, in Where's address field, even after `0.76.0`'s Enter-key fix. Root cause: `chkPCodes()` validated the WHOLE string including the locality text, and every letter/space/comma in a locality fails `OpenLocationCode`'s own alphabet check, so `isValid()` returned false and the function did nothing at all - no error, no fallback. Now only the first whitespace-delimited token (the code itself, which never contains spaces) is validated/decoded; the locality text is ignored, since a short code is already recovered against this mission's own default lat/lng, a better reference for an incident-local code anyway.

## [0.77.1](https://github.com/EOCOnline/rangertrak/commit/9c64a19553e309a2b6f03b2a56df383ae1866c7f) (2026-08-27)

### Fixes

* **app,mission:** `0.77.0`'s new app-wide update bar duplicated Mission's own pre-existing `[detailed]` instance, showing two identical "Reload now" bars on that one page. `InstallUpdateComponent` gets two new inputs, `showUpdate`/`showInstall` (both default `true`, so navbar/footer are unaffected) - the app-shell instance now sets `[showInstall]="false"` (version updates only, everywhere - a scribe mid-incident needs these to be impossible to miss), and Mission's own instance sets `[showUpdate]="false"` (install offer only, with its fuller explanation - the update half is already covered app-wide). An "install this app" offer stays low-key (footer, plus Mission's explanation) rather than competing for attention on an incident-tracking page.

## [0.77.0](https://github.com/EOCOnline/rangertrak/commit/250b156b5d780251ac0b36db00a565b9e689f6cd) (2026-08-27)

### Features

* **app:** the "Reload now - a new version is ready" bar (previously only shown inline on Mission, `[detailed]` mode of the shared `InstallUpdateComponent`) now also renders app-wide, just below the navbar on every page - revisits E-57(1)'s earlier "top banner -> footer only" call, since the footer's `[stickyBottom]` instance only pins near the bottom of view once a page has actually scrolled that far, so a short page could go a while without a visible prompt. Mission keeps its own instance too - same intentional multi-surface overlap `InstallUpdateComponent`'s own doc comment already covers for navbar/footer/Settings.
* **entry:** the ranger picker's label ("CallSign") now reads this mission's own "Ranger ID field name" (`idFieldLabel`, Mission Setup) instead of always "Callsign" - same live-settings pattern already used by the Rangers grid's id column.
* **radio-log:** four grid fixes/renames at once - the `id` column (this report's own sequential number, not a ranger identifier) renamed "ID" to "#", clearer about what it actually is; the CallSign column's header now reads the mission's "Ranger ID field name" too, same as Entry's picker above; CallSign text now colours by ranger identity (`rangerColorFor`, the same hash-based colour already used for that ranger's map marker/trail), so one person's reports are easy to pick out scanning the column; Address and Notes both get a real AG Grid cell tooltip (`tooltipField`) showing the full value on hover over the whole cell, not just the visible truncated characters; Notes' minimum width raised from 200 to 260 for more room on longer entries.

### Fixes

* **mission:** the Field Report Recipients card renamed "ICS-213 recipients" to "Listed Message Recipients" (mentioning 213 in the subtitle instead), and its suggested starter list shortened/simplified from the original ten entries (Incident Commander, Ops Section, Planning Section, Situation Awareness, Logistics Section, Finance/Admin Section, EOC, Sheriff/Police, Air unit, Utilities) to Incident Commander, Ops, Planning, Logistics, Finance, EOC, LEO, PI. Existing missions' own saved lists are untouched - this only changes what "Restore suggested starter list" restores and what a brand-new mission starts with.

## [0.76.0](https://github.com/EOCOnline/rangertrak/commit/78007d5f8d9aff767e5fd89cb60a69aadaf6b6f9) (2026-08-27)

### Fixes

* **entry:** the evidence-location checkbox's label (long enough with the Alt+click hint appended) could run past its section's own width toward the mini-map beside it instead of wrapping - `mat-checkbox`'s host and internal form-field both shrink-to-fit by default, so a bare checkbox wasn't guaranteed to stay capped at the section's width in every layout it could end up in. Forced to a full-width block with the icon top-aligned instead. Also dropped "above" from the hint text, since the map isn't always positioned above the checkbox.
* **entry:** typing a street address, +Code, or Maidenhead locator into Where's address field and pressing Enter did nothing - the field only handled the native `change` event, which browsers fire on Enter only as part of implicit form submission, and Entry's Submit button is disabled until the whole report is valid, which suppresses that path entirely. Added an explicit Enter-key handler that runs the lookup directly. This was also why the derived Address/+Code/Maidenhead panel only ever updated from a map click. Renamed "+Codes" to "+Code" in that panel to match the singular value shown.
* **map:** the "Save this area for offline use"/"Remove saved tiles" buttons on the full map page stretched the full page width (block-level flex items with no width constraint); now shrink-wrapped to their own content. The tile-count/size estimates that used to sit as their own full-width rows above and below the buttons are now appended inside each button's own label instead.

## [0.75.0](https://github.com/EOCOnline/rangertrak/commit/860a678877fbbfd9d31bb294eba442d8b5746264) (2026-08-27)

### Features

* **radio-log,messages:** the ICS-309/213 IA restructuring - Reports is now Radio Log (route `reports` → `radio-log`, redirect kept for old links; same grid, same behavior, just renamed) and a genuinely new Messages page (route `messages`) shows every field report with "Also generate an ICS-213" checked. Messages is deliberately not a second AG Grid clone - a list of messages plus an expanded detail pane for the selected one, since a message is opt-in per report and the list is expected to stay short. A **Print as ICS-213** button on the detail pane fills FEMA's real ICS-213 form (`fillIcs213Pdf()`, shipped `0.57.0` but never wired to any UI until now) and downloads the result as a PDF. `FieldReportType` has no Subject or Approved-by field today, so those two of the form's eight fillable fields print blank rather than invented.
* **guide,help:** every Reports/`/reports` reference across the Guide drawer and the Help page's tabs updated to Radio Log/`/radio-log`, plus a new Messages Guide entry - a rename that only touched the nav label and left every cross-reference stale would have been worse than not renaming at all.

## [0.74.0](https://github.com/EOCOnline/rangertrak/commit/a6a95bb36bc2dc42c71d6d08ab9d60f7b5c1baf9) (2026-08-27)

### Features

* **help:** "Start here" split into two tabs - it was doing two jobs at once (what RangerTrak is, and the first-five-minutes walkthrough). A new About tab carries the former; Start here keeps the onboarding steps and the offline-capability reference table.
* **help:** a new Log tab gives the Log page (deliberately absent from the main nav - it is a diagnostic tool, not a workflow page) a clearly-labelled way to be found, rather than only a link buried in the Your data tab's "Reporting a problem" prose.
* **mission,rangers:** per-mission label for a ranger's unique identifier (`idFieldLabel`, `MissionType`) - WA calls it REW; an IMT or another agency calls it something else, and a large multi-agency incident may have several systems in play with no single right answer. Only the label is settable (Mission Setup, under the Mission card); the identifier itself is still required to be unique. The Rangers grid's id column header now reads this setting live. Additive-only field, defaults to "ID" - no `MISSION_SCHEMA_VERSION` bump needed, `backfillMissingFields` supplies the default to any returning user, same mechanism `recipientOptions213` already relies on.

### Fixes

* **mission:** removed a real leftover - a static "Instructions" disclosure block dating to Sprint C, still rendering below the Danger zone on Mission Setup, that survived every later M3/E-84 pass untouched. Its substance already duplicated the `/mission` Guide entry (which the E-84 pass had written specifically to replace exactly this kind of on-page block); the one line with no equivalent (a generic "zoom with Ctrl+scroll" browser tip) wasn't RangerTrak-specific enough to be worth keeping either.

## [0.73.0](https://github.com/EOCOnline/rangertrak/commit/3066ce60e60f2f1c128017d5a95558d1438f4b64) (2026-08-27)

### Fixes

* **map:** the MapLibre basemap rendering blank (water/roads/buildings/landuse missing, only field-report markers visible - hillshade, a separate external source, was unaffected). Root cause: the Mission Readiness cache-warming fetch added in `0.68.0` did a plain `fetch(DEFAULT_PMTILES_URL)` from `MapLibreComponent`'s constructor, racing `pmtiles-js`'s own Range-based fetch of that same URL from `ngAfterViewInit()` moments later - both firing within milliseconds of each other let the browser coalesce them, handing the Range-requesting caller a full 200 response instead of the 206 partial one it needed (confirmed via `tools/serve-dist.js`'s own Range logic being correct in isolation). Moved the warming fetch to run only after the map's `'load'` event, once its own basemap fetches have already resolved, closing the race entirely; verified via `tools/e2e.js --full`'s `checkMapEngineSwitch`, which reproduced this exact error reliably before the fix and is clean after it, not just `ng build`.
* **entry:** Notes for radio log textarea capped to 600px on laptop-up screens - unconstrained, it spanned the full ~1000px form width despite being only 4 rows tall.

## [0.72.0](https://github.com/EOCOnline/rangertrak/commit/1412f30c2afc725e3e33fa79ac23ebeaf73bebd4) (2026-08-27)

### Fixes

* **rangers,mission:** the "Import roster"/"Import photos" (Rangers) and "Import mission" (Mission Advanced) file-picker controls were `<label matButton="outlined">` - `matButton`'s own selector only matches `button`/`a` elements, so it silently never attached, and all three rendered as bare unstyled text next to their real-button siblings. Now real `matButton` buttons that trigger their hidden `<input type="file">` via `.click()`, called synchronously inside the button's own click handler (opens the native file picker fine - the user-activation flag carries through a synchronous call).
* **guide:** several Rangers/Map guide-content corrections from live feedback: a "colour"/"color" inconsistency; the roster-import note said every entry "needs at least a callsign" (stale since D-42/D-43 - it needs an id, callsign is optional); the photo-naming line said "callsign" only (should be id-or-callsign) and didn't name accepted formats; "Tactical call signs" reworded to plainly describe rangers needing a unique id (often a state-issued credential) rather than framing it around ham-radio callsigns; the MapLibre offline-tiles note now says plainly that there is no in-app way to prepare additional coverage beyond the bundled pilot region today.

### Also this session

* Investigated a live report of the MapLibre basemap rendering blank (hillshade, a separate external source, unaffected) - matches this repo's own previously-known `checkMapEngineSwitch` e2e console-error failure exactly. Found a real suspect (`fetch(DEFAULT_PMTILES_URL)` in `mapLibreComponent`'s constructor, added `0.68.0`, competing with `pmtiles-js`'s own Range-based fetches of the same URL) and applied `cache: 'no-store'` to it - **tested and NOT confirmed**: the exact same e2e error still reproduced afterward. Left in as a real improvement on its own merits, but the actual cause is still unknown. See `Private Roadmap.md` for the full write-up - this is now the top open item.

## [0.71.0](https://github.com/EOCOnline/rangertrak/commit/729861196b65681fdb27764b1b57aedf7f5e718b) (2026-08-27)

### Fixes

* **entry:** root-caused (not just re-described) the long-standing Entry phone-viewport overflow - `.enter__Callsign` had `padding: 5px 5px` on the default `content-box` sizing, so its phone-breakpoint `width: 100%` added that 10px on top of the parent's available width instead of including it. Now `box-sizing: border-box`. One real, measured contributor found and fixed; a second, smaller overflow source remains on the same page and is not yet found - see `Private Roadmap.md`'s Path to 0.99.0-alpha checklist.
* **entry:** Notes for radio log textarea defaults to 4 rows instead of 5, per live feedback.
* **guide:** the Map page's guide content said "marker shape and colour" (should read "color" for consistency with the rest of that sentence) and understated MapLibre's offline limitation - it only works offline within its bundled pilot-region file, with no in-app way to prepare additional coverage before a mission; the guide now says so plainly and points to Leaflet's "Save this area" as the alternative for missions outside that region.

## [0.70.0](https://github.com/EOCOnline/rangertrak/commit/7695624f069cfc2b5c04a290f400d446b64c6f4a) (2026-08-27)

Material-M3 completeness audit: the redesign had been assumed complete since `0.58.0`/`0.59.0`,
but this was never actually re-verified against the code. It wasn't - three components had
non-Material markup left over, plus three straggler hardcoded colours the token layer was
supposed to have replaced everywhere by now.

### Fixes

* **feedback:** the in-app feedback form (Help page) was still entirely pre-M3 - a stale `.eButton`/plain `<textarea>`/`<input>`/`<label>` combination. `entry.component.scss`'s own comment from the `0.58.0` pass claimed all four copies of this rule (entry, mission, feedback, mission-advanced-options) were removed - three were, this one was missed and its markup never updated to match. Now `matButton`/`mat-form-field`/`matInput`, same as the other three.
* **log:** the "Save Log File" and "Clear Log" buttons were bare, unstyled native `<button>` elements - not even the `.eButton` class, no class at all. Now `matButton="outlined"`, with Clear Log using the same warn-palette treatment as Field Reports' and Mission's own danger buttons. The whole severity-colour palette (`.excessive`/`.verbose`/`.info`/`.warn`/`.error`) and the log panel's own background/border were hardcoded hex, never tokenized even at Sprint A - now resolve through `--rt-ink-*`/`--rt-readiness-*`/`--rt-notice-*`, so the Log page finally responds to light/dark and skin switching like every other page.
* **entry,field-reports:** three straggler hardcoded hex colours the token layer should have replaced - `entry.component.scss`'s error-state border/text (`#b3261e` → `--rt-readiness-red`, an exact match already used elsewhere) and Field Reports' `.cell-fail`/`.cell-pass` (`#f44336`/`#4caf50` → `--rt-readiness-red`/`--rt-readiness-green`).
* **map,mapLeaflet:** the map-engine switch, the terrain-hillshade toggle, and both engines' "All ({{n}}) / just those selected" control were raw `<input type="checkbox">` styled by hand - inconsistent with Entry's own coordinate-system toggle, already standardized to `<mat-slide-toggle>` back on 2026-08-22. All four converted; `tools/e2e.js`'s map-engine-switch checks updated from mutating a native checkbox's `.checked` property to clicking the toggle's underlying button and reading `aria-checked` (confirmed against a real `--full` run before and after, not just `ng build`).

### Also this session (documentation only, no code)

* Corrected a research error from earlier the same session: a claim that the Guide drawer rollout never extended past Entry was wrong - the design is route-driven and centralized in the shared header, and `guide-content.ts` already has full content for all five main routes. See `Private Roadmap.md`'s START HERE section and its own struck-through backlog row for the full correction.
* Brought `Private Roadmap.md`'s START HERE section current from `0.53.0` (16 releases stale) through `0.69.0`, and reconciled this document against the GitHub issue tracker's own current state (23 issues closed by the maintainer 2026-08-26, 11 remain open, all already tracked here).
* Confirmed, via `git stash` + a clean `--full` e2e run on unmodified `main`, that five e2e failures are pre-existing and unrelated to this batch: an Entry-page phone-width overflow (`.enter__form` 408px / document 425px against a 390px device - not yet root-caused, `.mapLeaflet-container`'s recent explicit `width: min(35vw, 500px)` is the leading suspect but unconfirmed), and a MapLibre PMTiles console error on the engine-switch round trip ("Server returned no content-length header"). Neither blocks this push; both are recorded as new Path-to-0.99.0-alpha rows.

## [0.69.0](https://github.com/EOCOnline/rangertrak/compare/v0.68.0...v0.69.0) (2026-08-27)


### Features

* **map:** mile grid overlay on the Leaflet map ([e7cecae](https://github.com/EOCOnline/rangertrak/commit/e7cecaeecb3a8ebc9ed6c8ce148deed6d8ab5eeb))

## [0.68.0](https://github.com/EOCOnline/rangertrak/compare/v0.67.0...v0.68.0) (2026-08-27)


### Bug Fixes

* **entry:** clean up derived-coordinate/213 text and default recipients ([d704fcc](https://github.com/EOCOnline/rangertrak/commit/d704fcc8d6dbab9b9e127a0376d2ac0d94ed8f1b))
* **map:** the bundled MapLibre readiness signal could never turn green ([97daf71](https://github.com/EOCOnline/rangertrak/commit/97daf715e5e017284a3076f2207a2131cf073155))

## [0.67.0](https://github.com/EOCOnline/rangertrak/compare/v0.66.0...v0.67.0) (2026-08-27)


### Features

* **theme:** complete the redesign canvas's five-scheme skin set; surface Alt+click on the evidence checkbox ([f699ba4](https://github.com/EOCOnline/rangertrak/commit/f699ba4a6229c3d79867665b093a96ec397fa4dc))

## [0.66.0](https://github.com/EOCOnline/rangertrak/compare/v0.65.0...v0.66.0) (2026-08-27)


### Features

* **map:** scale legend and print-only mission title/timestamp (E-item 13) ([9e9a217](https://github.com/EOCOnline/rangertrak/commit/9e9a217df87a98f791dd1c688baaf8dd0cd8839a))

## [0.65.0](https://github.com/EOCOnline/rangertrak/compare/v0.64.0...v0.65.0) (2026-08-27)


### Features

* **entry:** Alt+click the mini-map to mark an evidence location (E-item 5) ([c575423](https://github.com/EOCOnline/rangertrak/commit/c5754239782280aa9a1b95878327fbb7d1b7582e))

## [0.64.0](https://github.com/EOCOnline/rangertrak/compare/v0.63.1...v0.64.0) (2026-08-27)


### Features

* **theme:** runtime colour-scheme switcher (E-item 3, the mockup's 3 skins) ([0675714](https://github.com/EOCOnline/rangertrak/commit/0675714d72708b6a4674fa7c404320edca03370d))

### [0.63.1](https://github.com/EOCOnline/rangertrak/compare/v0.63.0...v0.63.1) (2026-08-27)


### Bug Fixes

* **mission:** floatLabel="always" on every remaining placeholder field ([8fc60a4](https://github.com/EOCOnline/rangertrak/commit/8fc60a4a25956abb7b1e51596fc338d2355891bc))

## [0.63.0](https://github.com/EOCOnline/rangertrak/compare/v0.62.0...v0.63.0) (2026-08-27)


### Features

* **navbar,header:** collapse phone nav behind a hamburger menu ([7c15993](https://github.com/EOCOnline/rangertrak/commit/7c1599381f824a7117db6474f03e923c042a8cd4))

## [0.62.0](https://github.com/EOCOnline/rangertrak/compare/v0.61.2...v0.62.0) (2026-08-27)


### Features

* **entry,mission:** app-wide spacing scale, Material density -2, cap mini-map growth ([3e186d0](https://github.com/EOCOnline/rangertrak/commit/3e186d05c5f406b0208eb992e6cc491564d70331))

### [0.61.2](https://github.com/EOCOnline/rangertrak/compare/v0.61.1...v0.61.2) (2026-08-27)


### Bug Fixes

* **entry:** cap form width, pair Lat/Lng on one row, drop redundant info icon ([b0e0b12](https://github.com/EOCOnline/rangertrak/commit/b0e0b125218b4a7d53c3585f8343c47ebf9b2179))

### [0.61.1](https://github.com/EOCOnline/rangertrak/compare/v0.61.0...v0.61.1) (2026-08-26)


### Features

* **guide:** About RangerTrak paragraph atop the Entry page's guide ([bf3b260](https://github.com/EOCOnline/rangertrak/commit/bf3b2600dcff2f06c3a001f11561976ad5b91856))

## [0.61.0](https://github.com/EOCOnline/rangertrak/compare/v0.60.0...v0.61.0) (2026-08-26)


### Features

* **mission,entry:** default coordinate format is a real radio choice; drop Maidenhead toggle ([16cdf98](https://github.com/EOCOnline/rangertrak/commit/16cdf989b5de1f4ce34f4a15f2f2874fade1f4f9))

## [0.60.0](https://github.com/EOCOnline/rangertrak/compare/v0.59.2...v0.60.0) (2026-08-26)


### Features

* **entry:** embedded field labels, Source chip style, real fix for submit contrast ([54ee42e](https://github.com/EOCOnline/rangertrak/commit/54ee42e0c4ba91cee59b5524594b0bd29120ddda)), closes [#962f10](https://github.com/EOCOnline/rangertrak/issues/962f10) [#442C2](https://github.com/EOCOnline/rangertrak/issues/442C2)

### [0.59.2](https://github.com/EOCOnline/rangertrak/compare/v0.59.1...v0.59.2) (2026-08-26)


### Bug Fixes

* **entry,mapLeaflet:** submit-button contrast, Note label, trail badge, Mobile icon ([8b8fdfc](https://github.com/EOCOnline/rangertrak/commit/8b8fdfccf8b797ea08e7deca91ae3e48e299acbb))

### [0.59.1](https://github.com/EOCOnline/rangertrak/compare/v0.31.0...v0.59.1) (2026-08-26)


### Features

* **cla:** draft E-23 CLA and gating workflow (ADR D-01) ([d7295de](https://github.com/EOCOnline/rangertrak/commit/d7295de9b9a7a7bfc052f01490c5b05ba71d6fb0))
* **entry,header,services,e2e:** E-83 - reopenable Entry welcome panel (0.43.0) ([db9f3dd](https://github.com/EOCOnline/rangertrak/commit/db9f3dd76ede29c6a8152550fc4d1a1f1440877d))
* **entry,settings:** E-103 per-mission recipient checklist for ICS-213 "To" ([587817c](https://github.com/EOCOnline/rangertrak/commit/587817cf301189ab8c23ba30b1ef751878f6c196))
* **entry:** D-42 phase 4 - attribute reports by rangerUid; no-callsign rangers selectable ([78fa3c8](https://github.com/EOCOnline/rangertrak/commit/78fa3c819c9c54d71dd35966a3cb2070bd8e5a3d))
* **entry:** E-104 - one editable coordinate format at a time, others read-only ([5b37485](https://github.com/EOCOnline/rangertrak/commit/5b374851d42dcba4a2508414da9e37ffd7475e97))
* **entry:** E-41 phase 1 - source type and opt-in ICS-213 fields (0.52.0) ([50f547d](https://github.com/EOCOnline/rangertrak/commit/50f547d8687499dd8a75ab7c63ad9bfa8bfc210e)), closes [angular/components#32072](https://github.com/angular/components/issues/32072)
* **entry:** evidence/clue location - range and bearing, own map marker (0.53.0) ([a09d7d8](https://github.com/EOCOnline/rangertrak/commit/a09d7d876c691a9e5c850f5bf0ad8da9d69502ce))
* **entry:** rebuild the flagship Field Entry screen on Material M3 ([17e5697](https://github.com/EOCOnline/rangertrak/commit/17e56978c546dade43c752a348dd4896ddb5611d)), closes [angular/components#32072](https://github.com/angular/components/issues/32072)
* **export:** ICS-213 PDF fill service, against the real official form ([81b35b1](https://github.com/EOCOnline/rangertrak/commit/81b35b1d01636fce40c5218f7aff2c87a3588a25))
* **export:** ICS-309 log data shaper ([d231241](https://github.com/EOCOnline/rangertrak/commit/d23124176a26e5452f5f1db68dbd3de15c693544))
* **guide:** one Guide drawer replaces the on-page instruction blocks ([2fd9a3d](https://github.com/EOCOnline/rangertrak/commit/2fd9a3d643cc611c305643858e295c7fa681e002))
* **help,shared,field-reports,rangers,mapLeaflet,map,entry:** E-84 documentation rewrite + map marker tooltip time format (0.44.0) ([204720e](https://github.com/EOCOnline/rangertrak/commit/204720e0efaa2f6d8a3279290b961bf76f79562d))
* **install-update:** hover panel explains what install/update involves (0.36.0) ([94d868a](https://github.com/EOCOnline/rangertrak/commit/94d868a76cc8b0f5959270e7d5e18957afae186b))
* **lmap:** show offline saved-area size and a live estimate ([b9a111c](https://github.com/EOCOnline/rangertrak/commit/b9a111c7759687125dab2738c6f2441aa44fb04b))
* **map,field-reports:** E-11 evidence-location visible on main map and Reports ([50af972](https://github.com/EOCOnline/rangertrak/commit/50af972cf6ac6fd5acfa0a65ea37d1233fb1a14b))
* **map,mapLeaflet,entry:** status colour halo on map markers (0.49.0) ([2ca40fe](https://github.com/EOCOnline/rangertrak/commit/2ca40fe3ec7afbf654d6c54c186eb0543f2893d2)), closes [#hex1](https://github.com/EOCOnline/rangertrak/issues/hex1) [#hex2](https://github.com/EOCOnline/rangertrak/issues/hex2)
* **map,mapLeaflet:** terrain relief overlay with a real visibility toggle, both engines (0.48.0) ([dbc4e03](https://github.com/EOCOnline/rangertrak/commit/dbc4e03ffca161de1b4e6b0bb4b9f9ecd5990e6c))
* **map,rangers:** flag missing callsigns instead of silently collapsing them (0.51.0) ([dd97974](https://github.com/EOCOnline/rangertrak/commit/dd97974d4c8d7962355ee7c158e6cc954a210942)), closes [#c0392](https://github.com/EOCOnline/rangertrak/issues/c0392) [#c0392](https://github.com/EOCOnline/rangertrak/issues/c0392)
* **map:** full-screen toggle for both map engines (E-78, 0.46.0) ([7307b5b](https://github.com/EOCOnline/rangertrak/commit/7307b5b1d945d8e881108f26ad37b281a74a684a))
* **mapLeaflet,e2e:** E-80 follow-on - static elapsed-time label on route trails (0.42.0) ([64363d4](https://github.com/EOCOnline/rangertrak/commit/64363d446e33dbf75c1cbbdfd52ec0cc79bf5c2f))
* **mapLeaflet,e2e:** E-80 phase 1 - static per-callsign team route trails (0.38.0) ([2c074ce](https://github.com/EOCOnline/rangertrak/commit/2c074ce1f2fe310edd33ba2cd73311c750933e03))
* **mapLeaflet,e2e:** E-85 phase 1 - Leaflet base-layer switcher infrastructure (0.39.0) ([eb4f84e](https://github.com/EOCOnline/rangertrak/commit/eb4f84e0e43cf6c1bd1cad58cf06f594c536ab1c))
* **mapLeaflet,e2e:** E-85 phase 2 - wire in OpenTopoMap as first alternate base layer (0.40.0) ([b57f47e](https://github.com/EOCOnline/rangertrak/commit/b57f47eabd865401e5590402ed8450a444e6368b))
* **mapLeaflet:** saved offline tiles verification overlay (0.50.0) ([777fade](https://github.com/EOCOnline/rangertrak/commit/777fadea0cd2bd572e732e2cb5be41e4120c1112))
* **mapping,mapLeaflet,e2e:** E-86 - unique per-ranger map markers (0.41.0) ([be7f75a](https://github.com/EOCOnline/rangertrak/commit/be7f75a8db47fc967d6c5003535b5f6d549fb809))
* **mapping:** D-42 phase 5 - distinct markers/trails for callsignless rangers ([6208b34](https://github.com/EOCOnline/rangertrak/commit/6208b34e347588e2feae88d6a5db1b886ba2a1c9))
* **mission,settings:** name the specific readiness gap(s), not just the aggregate dot (E-79, 0.47.0) ([a892a40](https://github.com/EOCOnline/rangertrak/commit/a892a40b3ad37e427d65e35db3c7991e4b5735c9))
* **mission:** rebuild the Mission page on Material M3 ([78ca124](https://github.com/EOCOnline/rangertrak/commit/78ca124c9e3416dc060384c59d5c11bc2de6e3e5)), closes [angular/components#32072](https://github.com/angular/components/issues/32072) [#teamgrid1](https://github.com/EOCOnline/rangertrak/issues/teamgrid1) [#962f10](https://github.com/EOCOnline/rangertrak/issues/962f10)
* **nav,entry,settings:** theme switcher, header/Where/When live-review fixes (0.32.0) ([319a09c](https://github.com/EOCOnline/rangertrak/commit/319a09c13ac94f2865c1546760081d93cf2afd5f))
* **rangers,reports:** D-42 phase 2 - wire the migrations into the load paths ([aee5a82](https://github.com/EOCOnline/rangertrak/commit/aee5a82ac19c1b5b634fa3a4c557b0d508b814aa))
* **rangers,reports:** schema-version seam for both stores; IDs are never minted ([38f6aba](https://github.com/EOCOnline/rangertrak/commit/38f6aba863242aa7f5102e84039a5e473e198b72))
* **rangers:** ADR D-42 phase 1 - ranger id model + migration, not yet wired ([24d8147](https://github.com/EOCOnline/rangertrak/commit/24d8147736726f74cb4b803cc889892d35f6739b))
* **rangers:** D-42 phase 3 - CRUD keys on the surrogate uid, lookups name their key ([578a5d1](https://github.com/EOCOnline/rangertrak/commit/578a5d140a3f8c23b64638261ae588714b062c72))
* **rangers:** D-42 phase 6 - photo matching accepts id or callsign ([7309e1e](https://github.com/EOCOnline/rangertrak/commit/7309e1e251e5de4923bd1876e91ff04875207089))
* **rangers:** D-42 phase 7 - id replaces callsign/rew across the UI surface ([1233846](https://github.com/EOCOnline/rangertrak/commit/1233846a4b3148e655a9928fa3409c489a399c0a))
* **rangers:** D-42 phase 8 - retire rew from RangerType ([98a4df7](https://github.com/EOCOnline/rangertrak/commit/98a4df7a3ef7f483fd84ba5ecaa207e29fc115fb))
* **rangers:** internal surrogate key (uid) as the ranger/report join key ([e8fa0ff](https://github.com/EOCOnline/rangertrak/commit/e8fa0ff375da27910515a2a890aa4fc99f3d9665))
* **rangers:** warn on roster import when entries have no callsign (0.51.1) ([8093b4d](https://github.com/EOCOnline/rangertrak/commit/8093b4d138f832ffb6b43efeaaab6ef39755c9cd))
* **routes,nav,grid,toggle:** URLs match nav labels, AG-Grid help moved (0.35.0) ([a1f988c](https://github.com/EOCOnline/rangertrak/commit/a1f988ce63677a710a12daf43231e630dbdedcde))
* **shared,navbar,field-reports,settings,entry,mapping:** remove collapsible sections and dead controls app-wide, drop dead settings fields (0.45.0) ([ca7fcf9](https://github.com/EOCOnline/rangertrak/commit/ca7fcf941a6218dcbf6b7daecd786686e283bebe))
* **styles:** Material M3 foundation - global field appearance + page patterns ([113a354](https://github.com/EOCOnline/rangertrak/commit/113a354ec90460472a05223b42ab1bb4347b668e))
* **time-picker,footer,settings:** segmented hour/min/AM-PM entry (0.34.0) ([af17493](https://github.com/EOCOnline/rangertrak/commit/af17493eac293e349c29453ff6384d7064654bb4))


### Bug Fixes

* **deps:** install xlsx from SheetJS's own CDN, clearing its 2 CVEs ([c126d3f](https://github.com/EOCOnline/rangertrak/commit/c126d3f15e8a803ea9184e52bad0b967a2d4cd2b))
* **deps:** remove unused jshint ([cbe33f3](https://github.com/EOCOnline/rangertrak/commit/cbe33f3a6eb040ba9d644c0bca1db066e28becf8))
* **deps:** remove unused mock-browser, clearing both critical CVEs ([e1624fb](https://github.com/EOCOnline/rangertrak/commit/e1624fbf9e7a3bc6812444d9634bfce55865466a))
* **deps:** remove unused xlsx-style ([0ad65f3](https://github.com/EOCOnline/rangertrak/commit/0ad65f3f2de3b241454c07ad4dd7e2b70b84371c))
* **e2e:** repair checkSettingsFormSave, which had been aborting the suite ([66f264c](https://github.com/EOCOnline/rangertrak/commit/66f264c8db61bbf78f5039db02a75d263b4a58f8)), closes [#2](https://github.com/EOCOnline/rangertrak/issues/2) [#2](https://github.com/EOCOnline/rangertrak/issues/2)
* **entry,footer:** Entry-screen spacing/sizing pass from live screenshots ([32c64b1](https://github.com/EOCOnline/rangertrak/commit/32c64b1cd6cfc7d8c309f885b857e34f76baba1d))
* **entry,install-update,routes,e2e:** phone-width panel overflow, dead /about redirect, stale AG Grid v36 e2e selectors ([d51fd7d](https://github.com/EOCOnline/rangertrak/commit/d51fd7df1fac330502c3d45cd59a0fbd53ec7e83))
* **entry:** 213 section fields render regardless of the checkbox ([8e2e41d](https://github.com/EOCOnline/rangertrak/commit/8e2e41d49926fff4c5192ea20a322508d9c6a8fe))
* **entry:** callsign autocomplete no longer auto-opens over the mini-map (E-66, 0.47.1) ([5233f49](https://github.com/EOCOnline/rangertrak/commit/5233f4941799ad60b86ae75742c6e7248bf6164d))
* **entry:** coordinate-system toggles keep their tab stops when hidden ([53060cb](https://github.com/EOCOnline/rangertrak/commit/53060cb93f3c4b8375d4b91d91ef90e1f08a56f2))
* **entry:** reserve layout space for the derived-location block (CLS) ([b67ac49](https://github.com/EOCOnline/rangertrak/commit/b67ac495a0ecae6bd1527295421ffc0028bf7cbb))
* **entry:** restore access to every coordinate format; quiet the submit confirmation ([48eb69a](https://github.com/EOCOnline/rangertrak/commit/48eb69ad00b4d7f01eca2b3b1fecd831b437a506))
* **entry:** standard coordinate toggle, sized MGRS/UTM fields (0.37.0) ([ef5817f](https://github.com/EOCOnline/rangertrak/commit/ef5817fc7a9e82837472116964767dc9035a2bac))
* **entry:** Where-section cleanup from live review ([f5a0e45](https://github.com/EOCOnline/rangertrak/commit/f5a0e45a7994c9d2ae8e24830d56dc26424ef1ce))
* **footer:** vertically centre the Install pill in the footer row ([925a41e](https://github.com/EOCOnline/rangertrak/commit/925a41edded741a11fe032e3fe7780652653b5ab))
* **grids:** size columns to their content instead of an even share ([832d639](https://github.com/EOCOnline/rangertrak/commit/832d63992d232e094058f9ff623c9477e47945ce))
* **help:** reference-table row labels distinguishable from their description on phone (0.49.2) ([06523ef](https://github.com/EOCOnline/rangertrak/commit/06523ef2518b08bb5c6613a6a697f4df6eb0c01c))
* **map,entry:** engine switch above Instructions on both engines; drop mini-map status halo (0.49.1) ([8d2ab08](https://github.com/EOCOnline/rangertrak/commit/8d2ab085644484dcb28bb9365ceff13ed81fc7df))
* **map,mapLeaflet:** hillshade tiles actually load (0.48.1) ([589f7c5](https://github.com/EOCOnline/rangertrak/commit/589f7c5f07372a329d130e8567767ab7becff5a6))
* **mapLeaflet,mapping:** sequential-name hash collision, offline controls out of the map, minor UI polish (0.43.1) ([4c8d3db](https://github.com/EOCOnline/rangertrak/commit/4c8d3dbe1be66bd9de2852626dc20dfd070a0467))
* **mapLeaflet,mapping:** trail colours match markers, offline control restyled, overview map no longer overlaps footer (0.44.1) ([6fd77c1](https://github.com/EOCOnline/rangertrak/commit/6fd77c1953740a5f99584bb450c81c28ec927b6a))
* **map:** MapLibre stays mounted after navigating away from /map and back (E-77, 0.45.1) ([60a77ab](https://github.com/EOCOnline/rangertrak/commit/60a77abe20937c7f55a6c193dbe89fb4a92cb6e8))
* **mapping,mapLeaflet,help:** retry Nominatim 429s, stop savetiles control from float-escaping its wrapper, clarify Field Entry nav ([bb4ad6d](https://github.com/EOCOnline/rangertrak/commit/bb4ad6dd18b2449ae2093b9492b69bd51e5b4144))
* **navbar,entry,settings,footer:** live-review fixes round 2 (0.33.0) ([8b06661](https://github.com/EOCOnline/rangertrak/commit/8b06661c845578684f43a1495663f9482eec411c))
* **rangers,header:** blank-start roster, drop address PII, reorder pages, CLS fixes ([35b6cae](https://github.com/EOCOnline/rangertrak/commit/35b6caeb2fc6a1530dd98c000023a71ba7e7409a))
* **settings:** MGRS/UTM off by default so "Show all systems" does something ([9d59477](https://github.com/EOCOnline/rangertrak/commit/9d59477cd330d46938b01c28a3d0531ca05b4f6d))
* **settings:** sticky Save/Cancel bar and live mission-readiness gaps ([ebf9507](https://github.com/EOCOnline/rangertrak/commit/ebf9507c1ade44c32fdddd7d60cc16230f9a6032))
* **site:** E-44 audit pass - fonts, favicon, dead code, security headers ([f1478dd](https://github.com/EOCOnline/rangertrak/commit/f1478ddc064064901e71de636350005fc002831b))
* **test:** pin jasmine-core back to 5.13, undoing the v7 bump ([eee5936](https://github.com/EOCOnline/rangertrak/commit/eee59361ef83ab0a5a65e7fc7e83a9e012d11605))

## [0.59.0](https://github.com/EOCOnline/rangertrak/commit/HEAD) (2026-08-26)

### Fixes

* **entry:** every coordinate format is reachable again from the Where switcher, regardless of Mission Settings. E-104 replaced the old "Show all coordinate systems" toggle with a one-format-at-a-time switcher, but that toggle had also been the only way to reach a format Settings hadn't enabled - and MGRS/UTM default off, so an unexpected MGRS/UTM radio call became impossible to enter without a trip to Mission Settings first, mid-incident. The switcher now always offers all five; Settings' checkboxes only pick which format Entry OPENS on
* **entry:** the fading confirmation that landed at the TOP of the page on every submit (a snackbar dumping the whole serialized report over the page header) is debug-mode only now. The fading line beside the Submit button stays, and shows just the report id unless debug mode is on

### Features

* **entry:** the derived coordinate rows follow the existing derived-address styling - small italic text on the same tinted panel, under one "Derived" divider, instead of a second bordered panel with its own heading
* **entry:** click any derived coordinate to copy it to the clipboard, with a brief "copied" acknowledgement. Same idiom the two Leaflet maps already use for click-to-copy; reading MGRS back over the radio or pasting a position into a separate CAD/ICS system no longer means retyping a 15-character grid reference by hand

## [0.58.0](https://github.com/EOCOnline/rangertrak/commit/HEAD) (2026-08-26)

Start of the Material-M3 redesign. Mockups for the whole app: https://claude.ai/code/artifact/a6e52cb1-0759-4eb0-9930-4d1af4dd07e7

### Features

* **styles:** Material M3 foundation. `MAT_FORM_FIELD_DEFAULT_OPTIONS` sets `appearance: 'outline'` and `subscriptSizing: 'dynamic'` app-wide, so every field - including ones converted from bare `<input>` markup - picks up the house style with no per-field attribute. New `styles/_patterns.scss` defines the page-structure blocks (`.rt-action-bar`, `.rt-danger-zone`, `.rt-alert`, `.rt-field-grid`) once instead of per page
* **mission:** the Mission page rebuilt on Material. Every control was a bare `<input>` with an inline pixel width and a `<span class="strong">Label: </span>` beside it; they are `<mat-form-field>`s, `<mat-checkbox>`es and `matButton`s now, laid out as six outlined cards in a two-column grid that collapses to one on a phone. Destructive actions (Reset settings, Import mission, Load sample mission) are fenced in a Danger zone instead of sharing an "Advanced Options" block with the non-destructive export and storage-protection controls
* **guide:** one Guide drawer, opened from a button in every page header, replaces the on-page instruction blocks - Field Reports' Tips, Rangers' Instructions and Privacy, both map engines' Instructions, and the grid keyboard help. Content lives as data in a single `guide-content.ts`, which is what finally makes the twice-requested "is all this verbiage still true?" audit a one-file review. Settles E-57(2), open since 2026-08-22

### Fixes

* **grids:** columns size to their content instead of an even share. Both grids called `sizeColumnsToFit()`, which distributes grid width and ignores per-column `flex` - so on Field Reports `Address` (flex 30) genuinely rendered narrower than `Lat` (flex 1), and Lat/Lng each took ~290px to show 9 characters while addresses truncated. Replaced with `autoSizeStrategy: { type: 'fitCellContents' }` plus honest per-column min/max bounds; exactly one column per grid (Notes) keeps `flex` so it absorbs leftover width
* **footer:** the Install pill sat 10px above the footer's centreline. `.rt-footer__left` centres with flex, which aligns each item's *margin* box - so the pill's lone `margin-bottom: 20px` (added for viewport clearance when stuck) pushed it up. The clearance moved onto the sticky offset instead
* **e2e:** `checkSettingsFormSave()` had been throwing a TypeError partway through and aborting the rest of the run - repairing it took the suite from 110 checks to **149**, so ~39 assertions had silently not been executing. It also looked up the Save button as `.settings__Save-button` (capital S) against a template that renders `settings__save-button`, so that assertion could never have passed. Both controls now use `data-testid`, and a new guard asserts the checkbox actually toggled rather than letting "the saved value matches what we set" pass vacuously

## [0.57.0](https://github.com/EOCOnline/rangertrak/commit/1835529c3031cfc9e946ca763c3c7f452ec4300c) (2026-08-26)

### Features

* **export:** ICS-213 PDF fill service - fills FEMA's own real fillable form (downloaded and verified field-by-field, not a layout drawn from scratch), and an ICS-309 log data shaper that orders field reports chronologically into Time/From/Message rows. First two of four pieces toward a printable 309/213 workflow (E-31/E-41 phase 3); not wired into any UI yet.

### Fixes

* **entry:** the ICS-213 section's fields (Reply requested/213 Message/To) rendered regardless of the "Also generate an ICS-213" checkbox - an unconditional `display: flex` was overriding the browser's native `[hidden]` behavior. Caught live and verified fixed before/after with a real browser, not just read from the code.
* **settings:** MGRS/UTM coordinate systems are off by default now, so Entry's "Show all coordinate systems" toggle actually reveals something the first time someone tries it, instead of everything already being shown
* **entry:** moved the evidence/clue-location section into the Where area (it IS a location) instead of after the entire ICS-213 section, recomputing the full keyboard tab-order chain to match; renamed "Message" to "213 Message" and added hover-tooltips clarifying it from Notes (the always-saved communications-log entry vs. a separate addressed message some reports also generate); the ICS-213 section now reads as a clearly bounded box instead of a thin indent
* **field-reports:** `recipients213` changed from a bare string to a list - a per-mission definable recipient checklist is coming, and a list is the natural fit for it and for future delivery options (email, etc.)

### Features

* **rangers,entry,field-reports,mapping:** ADR D-42/D-43 - rangers no longer join to field reports by callsign. An internal surrogate `uid` (app-minted, never shown) is the real join key; a new `id` field (`REW-0038`/`TEW-1003`, or a preserved regional credential like `VI-0038`) replaces the WA-specific `rew` column as the displayed, searchable credential. Not every CERT/MERT responder is ham-licensed, so a ranger with no callsign is now a fully supported case throughout - selectable on Entry, attributed correctly on Reports, given a real distinct map marker/trail instead of collapsing into the shared "unassigned" icon, and matched by id-or-callsign for locally-stored photos. Both the roster and field-report stores gained real migration machinery (previously bare `JSON.parse()`) with a versioned wrapper, canonicalizing existing credentials on load without ever inventing one - a TEW/REW number is issued by the incident at check-in, not by this app. The Rangers grid's `REW` column is now `ID`, and roster import accepts a callsign-less entry as long as it carries a resolvable id/rew

### Fixes

* **rangers:** removed a real amateur radio callsign baked into `westy.png` (used by both the hardcoded station starter set and the sample demo mission) and a real name/callsign sitting in a dead commented-out tooltip example - neither belongs in a public repo

## [0.55.0](https://github.com/EOCOnline/rangertrak/commit/7d52ed4c77402f91115da73c7c81f669c483072e) (2026-08-26)

### Features

* **rangers:** a fresh install no longer auto-seeds the 18 hardcoded Vashon station callsigns - the roster starts blank, indicating a new mission; the stations remain available opt-in via Rangers > Advanced > "Add station callsigns"

### Fixes

* **rangers:** removed `address` (home address) from the ranger data model entirely - confirmed unused by any feature, unlike phone/rew/image; updated every export confirmation dialog and doc that mentioned it, and added context that a callsign already resolves to more via the FCC's public licensee lookup
* **rangers,field-reports:** moved the Instructions/Tips/Privacy/keyboard-help sections below the grid on both pages, so the grid is the first prominent thing visible
* **header:** `timeElapsed$`/`timeLeft$`/the clock used `interval(1000)`, which doesn't emit immediately - the header's status cluster rendered empty for a full second, measured live as the dominant remaining CLS contributor; switched to `timer(0, 1000)`
* **navbar:** added explicit width/height to the GitHub icon (Lighthouse: unsized image, second-largest layout-shift culprit)

## [0.54.2](https://github.com/EOCOnline/rangertrak/commit/b67ac495a0ecae6bd1527295421ffc0028bf7cbb) (2026-08-26)

### Fixes

* **entry:** Location's derived-results block (Address/+Codes/MGRS/UTM/Maidenhead) was `display:none` until ready, so it popped in at full height once the location resolved - measured live as a 0.35-0.40 CLS score, the dominant layout-instability cause on the page. Switched to `visibility:hidden`, which reserves the same space from first paint while keeping the exact DOM-persistence guarantee the reveal logic depends on

## [0.54.1](https://github.com/EOCOnline/rangertrak/commit/c88b7ad4e3269052a81d9c6784441baaff7ec93e) (2026-08-26)

### Fixes

* **site:** securityheaders.com scan follow-up - added `Cross-Origin-Resource-Policy: same-origin` (enforcing) and `Cross-Origin-Embedder-Policy-Report-Only: credentialless` (deliberately not enforcing - confirmed live that OpenStreetMap's tile servers send no CORP header, so the strict `require-corp` mode would likely break the map tiles)

## [0.54.0](https://github.com/EOCOnline/rangertrak/commit/1415a1d05e2eba7dea9cb70a1a8bf7b1a1cb9c00) (2026-08-26)

### Features

* **map:** checking "Saved offline tiles" on the Leaflet map now zooms out to fit the saved-tiles extent, so it doesn't land on an empty view; unchecking it does not reset the view

### Fixes

* **site:** E-44 audit pass - trimmed a stale 8-family Google Fonts request down to the real three (Roboto, Faster One, Material Icons - the last one was never actually loaded despite live ligature-icon usages rendering as unstyled text), fixed a broken meta description tag, removed the dead keyless What3Words script include, added a real `robots.txt`, deleted the fully-dead `IconsComponent`, added a `Cross-Origin-Opener-Policy` header, and fixed `favicon.ico` shipping the stale pre-2022 icon due to a build-glob path mismatch with the E-62 fix

## [0.53.0](https://github.com/EOCOnline/rangertrak/commit/a09d7d876c691a9e5c850f5bf0ad8da9d69502ce) (2026-08-26)

### Features

* **entry:** evidence/clue location - range and bearing from the reporter's own position, hidden by default behind a checkbox, drawn as its own marker on the Entry mini-map

## [0.52.0](https://github.com/EOCOnline/rangertrak/commit/50f547d8687499dd8a75ab7c63ad9bfa8bfc210e) (2026-08-26)

### Features

* **entry:** E-41 phase 1 - every report now records a source type (Voice/Packet/APRS/Email), and can optionally flag itself as also generating an ICS-213 (reply-requested, message, recipients) - data collection only, no export yet

## [0.51.1](https://github.com/EOCOnline/rangertrak/commit/8093b4d138f832ffb6b43efeaaab6ef39755c9cd) (2026-08-26)

### Features

* **rangers:** roster import now warns when entries have no callsign, alongside the existing duplicate/nameless warnings

## [0.51.0](https://github.com/EOCOnline/rangertrak/commit/dd97974d4c8d7962355ee7c158e6cc954a210942) (2026-08-26)

### Features

* **map,rangers:** a report or ranger with no callsign now flags distinctly on the map (a fixed dashed-red "?" marker) and on the Rangers grid, instead of silently blending in

## [0.50.0](https://github.com/EOCOnline/rangertrak/commit/777fadea0cd2bd572e732e2cb5be41e4120c1112) (2026-08-26)

### Features

* **mapLeaflet:** "Saved offline tiles" overlay - a browsable, verifiable view of which map areas are actually cached, not just a running total

## [0.49.2](https://github.com/EOCOnline/rangertrak/commit/06523ef2518b08bb5c6613a6a697f4df6eb0c01c) (2026-08-26)

### Bug Fixes

* **help:** reference-table row labels (e.g. "Google Geocoding API key") no longer read as identical body text on phone width

## [0.49.1](https://github.com/EOCOnline/rangertrak/commit/8d2ab085644484dcb28bb9365ceff13ed81fc7df) (2026-08-26)

### Bug Fixes

* **map:** the MapLibre engine-switch checkbox now renders above each engine's own Instructions section, not below it, on both engines
* **entry:** reverted the status halo on the Entry mini-map's markers - that map is a deliberately minimal position-picker, not a mission overview

## [0.49.0](https://github.com/EOCOnline/rangertrak/commit/2ca40fe3ec7afbf654d6c54c186eb0543f2893d2) (2026-08-26)

### Features

* **map,mapLeaflet,entry:** map markers show a coloured "shadow" halo for the report's status (Normal/Urgent/Need Rest/...), using the same colours configured on the Mission page - both map engines and the Entry mini-map

## [0.48.1](https://github.com/EOCOnline/rangertrak/commit/589f7c5f07372a329d130e8567767ab7becff5a6) (2026-08-26)

### Bug Fixes

* **map,mapLeaflet:** hillshade overlay tiles actually load - wrong Esri service URL (missing the `Elevation/` folder segment) made every tile 404 on both engines

## [0.48.0](https://github.com/EOCOnline/rangertrak/commit/dbc4e03ffca161de1b4e6b0bb4b9f9ecd5990e6c) (2026-08-25)

### Features

* **map,mapLeaflet:** terrain relief (hillshade) overlay with a real visibility toggle on both map engines

## [0.47.1](https://github.com/EOCOnline/rangertrak/commit/5233f4941799ad60b86ae75742c6e7248bf6164d) (2026-08-25)

### Bug Fixes

* **entry:** callsign autocomplete no longer auto-opens covering the whole roster on load or after submit+reset (E-66)

## [0.47.0](https://github.com/EOCOnline/rangertrak/commit/a892a40b3ad37e427d65e35db3c7991e4b5735c9) (2026-08-25)

### Features

* **mission,settings:** Mission page names which specific readiness gap(s) are behind the header's red/amber dot, not just the aggregate colour (E-79)

## [0.46.0](https://github.com/EOCOnline/rangertrak/commit/7307b5b1d945d8e881108f26ad37b281a74a684a) (2026-08-25)

### Features

* **map:** full-screen toggle on the shared map page shell, working for both Leaflet and MapLibre (E-78)

## [0.45.1](https://github.com/EOCOnline/rangertrak/commit/60a77abe20937c7f55a6c193dbe89fb4a92cb6e8) (2026-08-25)

### Bug Fixes

* **map:** MapLibre stays mounted after navigating away from /map and back with it already selected, instead of rendering neither engine (E-77) ([60a77ab](https://github.com/EOCOnline/rangertrak/commit/60a77abe20937c7f55a6c193dbe89fb4a92cb6e8))

## [0.45.0](https://github.com/EOCOnline/rangertrak/commit/ca7fcf941a6218dcbf6b7daecd786686e283bebe) (2026-08-25)

### Features

* **shared,rangers,field-reports,settings,map,help:** remove every collapsible section app-wide - `DisclosureComponent` is now `SectionComponent`, always visible, no click-to-expand ([ca7fcf9](https://github.com/EOCOnline/rangertrak/commit/ca7fcf941a6218dcbf6b7daecd786686e283bebe))
* **navbar,field-reports,settings,entry,mapping:** remove dead controls found by the E-84 audit - navbar's unwired search box, Reports' fake-report generator and dead refresh buttons, Settings' dead refresh button, the What3Words derived row (E-88, E-92 through E-95)
* **settings:** drop the dead `w3wLocale`/`defPlusCode` settings and the unimported `plus-code.ts` file, with a `schemaVersion` 3→4 migration (E-89, E-90, E-91)

## [0.44.1](https://github.com/EOCOnline/rangertrak/commit/6fd77c1953740a5f99584bb450c81c28ec927b6a) (2026-08-25)

### Bug Fixes

* **mapLeaflet,mapping:** route trails now match their ranger's marker colour (E-97), offline "Save this area" control restyled off Leaflet's own white-card chrome (E-98), overview mini-map no longer overlaps the footer (E-99) ([6fd77c1](https://github.com/EOCOnline/rangertrak/commit/6fd77c1953740a5f99584bb450c81c28ec927b6a))

## [0.44.0](https://github.com/EOCOnline/rangertrak/commit/204720e0efaa2f6d8a3279290b961bf76f79562d) (2026-08-25)

### Features

* **help,shared,field-reports,rangers:** E-84 - Help page tabs, on-page text fixes, deduplicated grid-keyboard-help component, FIELD-GUIDE.md and README.md rewrite per the documentation audit ([204720e](https://github.com/EOCOnline/rangertrak/commit/204720e0efaa2f6d8a3279290b961bf76f79562d))

### Bug Fixes

* **mapping,mapLeaflet,map,entry:** map marker tooltips show short local time + "N min ago", not the raw `Date` object ([204720e](https://github.com/EOCOnline/rangertrak/commit/204720e0efaa2f6d8a3279290b961bf76f79562d))

## [0.43.1](https://github.com/EOCOnline/rangertrak/commit/4c8d3dbe1be66bd9de2852626dc20dfd070a0467) (2026-08-24)

### Bug Fixes

* **mapLeaflet,mapping:** sequential-name hash collision, offline controls out of the map, minor UI polish ([4c8d3db](https://github.com/EOCOnline/rangertrak/commit/4c8d3dbe1be66bd9de2852626dc20dfd070a0467))

## [0.43.0](https://github.com/EOCOnline/rangertrak/commit/db9f3dd76ede29c6a8152550fc4d1a1f1440877d) (2026-08-24)

### Features

* **entry,header,services,e2e:** E-83 - reopenable Entry welcome panel ([db9f3dd](https://github.com/EOCOnline/rangertrak/commit/db9f3dd76ede29c6a8152550fc4d1a1f1440877d))

## [0.42.0](https://github.com/EOCOnline/rangertrak/commit/64363d446e33dbf75c1cbbdfd52ec0cc79bf5c2f) (2026-08-24)

### Features

* **mapLeaflet,e2e:** E-80 follow-on - static elapsed-time label on route trails ([64363d4](https://github.com/EOCOnline/rangertrak/commit/64363d446e33dbf75c1cbbdfd52ec0cc79bf5c2f))

## [0.41.0](https://github.com/EOCOnline/rangertrak/commit/be7f75a8db47fc967d6c5003535b5f6d549fb809) (2026-08-24)

### Features

* **mapping,mapLeaflet,e2e:** E-86 - unique per-ranger map markers ([be7f75a](https://github.com/EOCOnline/rangertrak/commit/be7f75a8db47fc967d6c5003535b5f6d549fb809))

## [0.40.0](https://github.com/EOCOnline/rangertrak/commit/b57f47eabd865401e5590402ed8450a444e6368b) (2026-08-24)

### Features

* **mapLeaflet,e2e:** E-85 phase 2 - wire in OpenTopoMap as first alternate base layer ([b57f47e](https://github.com/EOCOnline/rangertrak/commit/b57f47eabd865401e5590402ed8450a444e6368b))

## [0.39.0](https://github.com/EOCOnline/rangertrak/commit/eb4f84e0e43cf6c1bd1cad58cf06f594c536ab1c) (2026-08-24)

### Features

* **mapLeaflet,e2e:** E-85 phase 1 - Leaflet base-layer switcher infrastructure ([eb4f84e](https://github.com/EOCOnline/rangertrak/commit/eb4f84e0e43cf6c1bd1cad58cf06f594c536ab1c))

## [0.38.0](https://github.com/EOCOnline/rangertrak/commit/2c074ce1f2fe310edd33ba2cd73311c750933e03) (2026-08-24)

### Features

* **mapLeaflet,e2e:** E-80 phase 1 - static per-callsign team route trails ([2c074ce](https://github.com/EOCOnline/rangertrak/commit/2c074ce1f2fe310edd33ba2cd73311c750933e03))

## [0.37.0](https://github.com/EOCOnline/rangertrak/commit/ef5817fc7a9e82837472116964767dc9035a2bac) (2026-08-21)

### Bug Fixes

* **entry:** standard coordinate toggle, sized MGRS/UTM fields ([ef5817f](https://github.com/EOCOnline/rangertrak/commit/ef5817fc7a9e82837472116964767dc9035a2bac))
* **entry,install-update,routes,e2e:** phone-width panel overflow, dead /about redirect, stale AG Grid v36 e2e selectors ([d51fd7d](https://github.com/EOCOnline/rangertrak/commit/d51fd7df1fac330502c3d45cd59a0fbd53ec7e83))

_Also landed under this version, not separately bumped: `mapL` → `mapLeaflet` rename ([958ec38](https://github.com/EOCOnline/rangertrak/commit/958ec3896073d1eb613ee8bf0315c6405f904409)), About → Help component rename ([47983c4](https://github.com/EOCOnline/rangertrak/commit/47983c4902746718314c064041800787758deac1))._

## [0.36.0](https://github.com/EOCOnline/rangertrak/commit/94d868a76cc8b0f5959270e7d5e18957afae186b) (2026-08-21)

### Features

* **install-update:** hover panel explains what install/update involves ([94d868a](https://github.com/EOCOnline/rangertrak/commit/94d868a76cc8b0f5959270e7d5e18957afae186b))

## [0.35.0](https://github.com/EOCOnline/rangertrak/commit/a1f988ce63677a710a12daf43231e630dbdedcde) (2026-08-21)

### Features

* **routes,nav,grid,toggle:** URLs match nav labels, AG-Grid help moved ([a1f988c](https://github.com/EOCOnline/rangertrak/commit/a1f988ce63677a710a12daf43231e630dbdedcde))

## [0.34.0](https://github.com/EOCOnline/rangertrak/commit/af17493eac293e349c29453ff6384d7064654bb4) (2026-08-21)

### Features

* **time-picker,footer,settings:** segmented hour/min/AM-PM entry ([af17493](https://github.com/EOCOnline/rangertrak/commit/af17493eac293e349c29453ff6384d7064654bb4))

## [0.33.0](https://github.com/EOCOnline/rangertrak/commit/8b06661c845578684f43a1495663f9482eec411c) (2026-08-21)

### Bug Fixes

* **navbar,entry,settings,footer:** live-review fixes round 2 ([8b06661](https://github.com/EOCOnline/rangertrak/commit/8b06661c845578684f43a1495663f9482eec411c))

## [0.32.0](https://github.com/EOCOnline/rangertrak/commit/319a09c13ac94f2865c1546760081d93cf2afd5f) (2026-08-21)

A larger batch than most releases here - a toolchain bump (ag-grid v35→v36, Angular
22.1.3) and its fallout, plus a session of live-review fixes across Entry/Settings/footer.

### Features

* **nav,entry,settings:** theme switcher, header/Where/When live-review fixes ([319a09c](https://github.com/EOCOnline/rangertrak/commit/319a09c13ac94f2865c1546760081d93cf2afd5f))
* **lmap:** show offline saved-area size and a live estimate ([b9a111c](https://github.com/EOCOnline/rangertrak/commit/b9a111c7759687125dab2738c6f2441aa44fb04b))
* **cla:** draft E-23 CLA and gating workflow (ADR D-01) ([d7295de](https://github.com/EOCOnline/rangertrak/commit/d7295de9b9a7a7bfc052f01490c5b05ba71d6fb0))

### Bug Fixes

* **entry:** Where-section cleanup from live review ([f5a0e45](https://github.com/EOCOnline/rangertrak/commit/f5a0e45a7994c9d2ae8e24830d56dc26424ef1ce))
* **deps:** install xlsx from SheetJS's own CDN, clearing its 2 CVEs ([c126d3f](https://github.com/EOCOnline/rangertrak/commit/c126d3f15e8a803ea9184e52bad0b967a2d4cd2b))
* **entry,footer:** Entry-screen spacing/sizing pass from live screenshots ([32c64b1](https://github.com/EOCOnline/rangertrak/commit/32c64b1cd6cfc7d8c309f885b857e34f76baba1d))
* **deps:** remove unused xlsx-style ([0ad65f3](https://github.com/EOCOnline/rangertrak/commit/0ad65f3f2de3b241454c07ad4dd7e2b70b84371c))
* **deps:** remove unused jshint ([cbe33f3](https://github.com/EOCOnline/rangertrak/commit/cbe33f3a6eb040ba9d644c0bca1db066e28becf8))
* **deps:** remove unused mock-browser, clearing both critical CVEs ([e1624fb](https://github.com/EOCOnline/rangertrak/commit/e1624fbf9e7a3bc6812444d9634bfce55865466a))
* **test:** pin jasmine-core back to 5.13, undoing the v7 bump ([eee5936](https://github.com/EOCOnline/rangertrak/commit/eee59361ef83ab0a5a65e7fc7e83a9e012d11605))

_Also landed under this version: `chore(deps)` toolchain bump - ag-grid v36, Angular
22.1.3, wrangler 4.125 ([cacfeb3](https://github.com/EOCOnline/rangertrak/commit/cacfeb36a9efdd1d4b81a857781cd7f64de40d3a)), the commit several of this version's own fixes exist to clean up after._

## [0.31.0](https://github.com/EOCOnline/rangertrak/compare/v0.30.0...v0.31.0) (2026-08-21)


### Features

* **feedback:** in-app feedback endpoint, files public GitHub issues (ADR D-15) ([be2ad5a](https://github.com/EOCOnline/rangertrak/commit/be2ad5a1d6ca8134cee73d6e9ddc680545f16abb))

## [0.30.0](https://github.com/EOCOnline/rangertrak/compare/v0.29.0...v0.30.0) (2026-08-21)


### Features

* **settings:** E-73 - gate Field Report status renaming instead of just warning ([5be7551](https://github.com/EOCOnline/rangertrak/commit/5be75519b8e402b5a17a731424dfc7b26f85add0))


### Bug Fixes

* **entry:** compact the mini-map's header/footer text at tablet-down widths ([92b9ba3](https://github.com/EOCOnline/rangertrak/commit/92b9ba35df23c9ec9786d6b46cd25beea4ab8d09))
* **settings:** E-71 - clamp Operational Period end to start ([b85cdd6](https://github.com/EOCOnline/rangertrak/commit/b85cdd602d216f1a0284e8a149a312637a1d33d2))

## [0.29.0](https://github.com/EOCOnline/rangertrak/compare/v0.28.0...v0.29.0) (2026-08-21)


### Features

* **entry:** mini-map reflows under Where and shrinks to 30% at tablet-down widths ([7812087](https://github.com/EOCOnline/rangertrak/commit/78120878abd510bc1466985647ec1fe8dc907f2c))


### Bug Fixes

* **entry,header:** close mini-map float-intrusion gap; fix oversized status pill; link readiness dot to Settings ([7c995d0](https://github.com/EOCOnline/rangertrak/commit/7c995d05bca7a48881456ba1bdb7fc2ed8cb8b49))

## [0.28.0](https://github.com/EOCOnline/rangertrak/compare/v0.27.0...v0.28.0) (2026-08-21)


### Bug Fixes

* **settings:** unify the date/time picker widget; single update notice; restore footer font ([0080649](https://github.com/EOCOnline/rangertrak/commit/00806490e73f038f2cd027ed73d041f590770555))

## [0.27.0](https://github.com/EOCOnline/rangertrak/compare/v0.26.0...v0.27.0) (2026-08-20)


### Features

* **header:** group the mission status readout into one cluster ([d342aed](https://github.com/EOCOnline/rangertrak/commit/d342aedbe10256c0af6c2b256de76af36916bc92))

## [0.26.0](https://github.com/EOCOnline/rangertrak/compare/v0.25.0...v0.26.0) (2026-08-20)


### Features

* **navbar:** brand mark replaces Home; E-62 cheap-tier icon fixes ([22b77dd](https://github.com/EOCOnline/rangertrak/commit/22b77dd7ff6d2be8f2b997574a8e2eff516be77a))

## [0.25.0](https://github.com/EOCOnline/rangertrak/compare/v0.24.0...v0.25.0) (2026-08-20)


### Bug Fixes

* **readiness:** stop crashing getStorageLength() on every page view ([23ab061](https://github.com/EOCOnline/rangertrak/commit/23ab061598271f008b64ac1991290fdc1efe966d))

## [0.24.0](https://github.com/EOCOnline/rangertrak/compare/v0.23.0...v0.24.0) (2026-08-20)


### Features

* **nav:** rename About to Help, move Log off the main menu ([b83582f](https://github.com/EOCOnline/rangertrak/commit/b83582ffff0bf81efd2b04e0d31e2e4781437918))

## [0.23.0](https://github.com/EOCOnline/rangertrak/compare/v0.22.0...v0.23.0) (2026-08-20)


### Features

* **install-update:** simplify to a v0.12-era pill, move to a footer chip ([c338bfb](https://github.com/EOCOnline/rangertrak/commit/c338bfbe3d49d38fa470ca78890dbf3173f06314))

## [0.22.0](https://github.com/EOCOnline/rangertrak/compare/v0.21.0...v0.22.0) (2026-08-20)


### Features

* **header:** add the mission readiness indicator ([891d51a](https://github.com/EOCOnline/rangertrak/commit/891d51ac2a632f4bf9411fefccd70f11f876c889))

## [0.21.0](https://github.com/EOCOnline/rangertrak/compare/v0.20.0...v0.21.0) (2026-08-20)

## [0.20.0](https://github.com/EOCOnline/rangertrak/compare/v0.19.0...v0.20.0) (2026-08-20)


### Features

* **map:** collapse Map/Backup map into one page with an engine switch ([482ad62](https://github.com/EOCOnline/rangertrak/commit/482ad62d4bd023b0d8f9a0d46e2b3c60b380ac1b))

## [0.19.0](https://github.com/EOCOnline/rangertrak/compare/v0.18.0...v0.19.0) (2026-08-20)


### Bug Fixes

* **maps:** purge Google Maps leftovers, rename settings.google to maplibre ([e389ddf](https://github.com/EOCOnline/rangertrak/commit/e389ddf4e250ecf8c46576e700e44b1f35cb163a))

## [0.18.0](https://github.com/EOCOnline/rangertrak/compare/v0.17.0...v0.18.0) (2026-08-20)


### Bug Fixes

* **entry:** stop section-header rules from running under the mini-map ([fc07f98](https://github.com/EOCOnline/rangertrak/commit/fc07f980cea8d2751da7d9ddb70d96af526dc913))

## [0.17.0](https://github.com/EOCOnline/rangertrak/compare/v0.16.9...v0.17.0) (2026-08-20)


### Bug Fixes

* **navbar:** route brand link internally instead of opening stale www origin ([a507970](https://github.com/EOCOnline/rangertrak/commit/a507970b3686c20c2d22619f56cc4055de422ea5))

### [0.16.9](https://github.com/EOCOnline/rangertrak/compare/v0.16.8...v0.16.9) (2026-08-20)


### Bug Fixes

* **about:** restore Menu Keyboard interaction section, mislabeled AG Grid ([185fa46](https://github.com/EOCOnline/rangertrak/commit/185fa463963b0749b45619832445c20dcabfcc2a))

### [0.16.8](https://github.com/EOCOnline/rangertrak/compare/v0.16.7...v0.16.8) (2026-08-20)


### Bug Fixes

* **settings:** backfill missing fields on every load, not just a version bump ([6ae1d9c](https://github.com/EOCOnline/rangertrak/commit/6ae1d9c35c9c6e00dc97f244af65444b3dddddf0))

### [0.16.7](https://github.com/EOCOnline/rangertrak/compare/v0.16.6...v0.16.7) (2026-08-20)


### Bug Fixes

* **e44:** stop declaring a Strict-Transport-Security header nobody reads ([f9ab27f](https://github.com/EOCOnline/rangertrak/commit/f9ab27f41f82cb4d8e16fabe851f5499fdd5f888))

### [0.16.6](https://github.com/EOCOnline/rangertrak/compare/v0.16.5...v0.16.6) (2026-08-20)


### Features

* **e44:** security headers - HSTS/nosniff/frame-deny/referrer-policy enforcing, CSP report-only ([da0dd48](https://github.com/EOCOnline/rangertrak/commit/da0dd48aaf7800d58aa73255568ec6140a2454f8))

### [0.16.5](https://github.com/EOCOnline/rangertrak/compare/v0.16.4...v0.16.5) (2026-08-20)


### Features

* **e45:** nudge visitors stranded on the old www. origin toward the canonical host ([7cd9562](https://github.com/EOCOnline/rangertrak/commit/7cd95627b174cc41b0dbabf208cc9bc80b04596c))

### [0.16.4](https://github.com/EOCOnline/rangertrak/compare/v0.16.3...v0.16.4) (2026-08-20)


### Bug Fixes

* **e43:** update-ready notice now stays visible regardless of scroll position ([bdee1e3](https://github.com/EOCOnline/rangertrak/commit/bdee1e3a5cfeca8d10165f9116b8e23631b80208))

### [0.16.3](https://github.com/EOCOnline/rangertrak/compare/v0.16.2...v0.16.3) (2026-08-20)


### Bug Fixes

* **e67:** mini-map now fills its box - it had been rendering at ~36% width, at every size ([a6e50c6](https://github.com/EOCOnline/rangertrak/commit/a6e50c64eeba9a9eb2394c69842478fc25ffc45a))

### [0.16.2](https://github.com/EOCOnline/rangertrak/compare/v0.16.1...v0.16.2) (2026-08-20)


### Features

* **e57:** floating back-to-top control on tall pages ([6fe078b](https://github.com/EOCOnline/rangertrak/commit/6fe078b5a8bea7ae1e8df63156b01dc930eb40e4))


### Bug Fixes

* **e48:** derived values actually clear on submit; harden a flaky file-input lookup ([79689c7](https://github.com/EOCOnline/rangertrak/commit/79689c794754a504327a773bca56160945d03e13))
* **e65:** every route now fits a phone, and the e2e check can finally see when one doesn't ([ff1622c](https://github.com/EOCOnline/rangertrak/commit/ff1622ca2d5fab2f440d845503e029dcb63b20a2))

### [0.16.1](https://github.com/EOCOnline/rangertrak/compare/v0.16.0...v0.16.1) (2026-08-20)


### Features

* **sprint-i:** app chrome polish - phase 4, sprint complete (E-53, E-54, E-55, E-42) ([5396b02](https://github.com/EOCOnline/rangertrak/commit/5396b020d7bd4db305814e5449446ed2209b2d2e)), closes [#0B5FA8](https://github.com/EOCOnline/rangertrak/issues/0B5FA8) [#1976d2](https://github.com/EOCOnline/rangertrak/issues/1976d2)

## [0.16.0](https://github.com/EOCOnline/rangertrak/compare/v0.15.14...v0.16.0) (2026-08-20)


### Features

* **sprint-i:** entry screen polish - phases 1-3 (E-46, E-61, E-47, E-52, E-48, E-49, E-50, E-51) ([0795cef](https://github.com/EOCOnline/rangertrak/commit/0795cef0037d459f8f06590d3bc966d68317273a))

### [0.15.14](https://github.com/EOCOnline/rangertrak/compare/v0.15.13...v0.15.14) (2026-08-19)


### Features

* **sprint-h:** add MGRS, UTM, and Maidenhead coordinate systems ([762b417](https://github.com/EOCOnline/rangertrak/commit/762b417739c962b2358a6e8cd76acb7efdcda949))

### [0.15.13](https://github.com/EOCOnline/rangertrak/compare/v0.15.12...v0.15.13) (2026-08-19)


### Features

* **sprint-g:** convert remaining callback-mutated fields to signals ([5f7a496](https://github.com/EOCOnline/rangertrak/commit/5f7a496742b62fdbbec7e9acdbc31406bb2a9bb0))

### [0.15.12](https://github.com/EOCOnline/rangertrak/compare/v0.15.11...v0.15.12) (2026-08-19)


### Features

* **sprint-f:** re-theme AG Grid onto the v35 Theming API, phone card carve-out for Field Reports ([972b48d](https://github.com/EOCOnline/rangertrak/commit/972b48de010a8c44656a533ce19d88b9c2a84a37))

### [0.15.11](https://github.com/EOCOnline/rangertrak/compare/v0.15.10...v0.15.11) (2026-08-19)


### Features

* **sprint-e:** accessibility sweep, evidence-based via Lighthouse (step 6) ([72378b2](https://github.com/EOCOnline/rangertrak/commit/72378b259867f26c7188a3372aecd0e253b31023)), closes [#e1e8](https://github.com/EOCOnline/rangertrak/issues/e1e8)

### [0.15.10](https://github.com/EOCOnline/rangertrak/compare/v0.15.9...v0.15.10) (2026-08-19)


### Features

* **sprint-e:** restore min/max/pattern as Signal Forms schema validators (step 5) ([4faa7f6](https://github.com/EOCOnline/rangertrak/commit/4faa7f6355c666fcd79bd6a9412972fb8a1bcb60))

### [0.15.9](https://github.com/EOCOnline/rangertrak/compare/v0.15.8...v0.15.9) (2026-08-19)


### Features

* **settings:** migrate status colours to accessible semantic keys ([1aaa8ec](https://github.com/EOCOnline/rangertrak/commit/1aaa8ec3fac513a163030432a93e3f6f3bf4be1a))


### Bug Fixes

* **entry:** callsign was never actually saved to the report (BUG-1) ([fb1cdb3](https://github.com/EOCOnline/rangertrak/commit/fb1cdb3d4bf0d688b7491407eda8d7ba15255328))
* **entry:** guard the derived-location DOM writes against a destroyed view ([a84fa4a](https://github.com/EOCOnline/rangertrak/commit/a84fa4a485c19a75aa280e35307e2ee7001ee370))
* **services:** five components ran their own private singleton (BUG-2) ([3964a4d](https://github.com/EOCOnline/rangertrak/commit/3964a4d958fdb215731388200bb2724655a456d2))
* **settings:** backfill fields added after a settings object was saved (BUG-3) ([4e30ff5](https://github.com/EOCOnline/rangertrak/commit/4e30ff59ad44de5bc48249d45e77e1cc29854452))

### [0.15.8](https://github.com/EOCOnline/rangertrak/compare/v0.15.7...v0.15.8) (2026-08-19)


### Features

* **sprint-d:** convert Entry to Angular Signal Forms ([2a25bf5](https://github.com/EOCOnline/rangertrak/commit/2a25bf528742ef944d3a478060cf7be5ca5f523b)), closes [angular/components#32072](https://github.com/angular/components/issues/32072)
* **sprint-d:** convert Location to Angular Signal Forms ([60d6008](https://github.com/EOCOnline/rangertrak/commit/60d6008a2ece80df16cf62bd4a19d78518daf2c4))
* **sprint-d:** convert Settings to Angular Signal Forms ([a65bb95](https://github.com/EOCOnline/rangertrak/commit/a65bb95aec41ddf5c10d61bbd2fe35c20572cd65))
* **sprint-d:** convert Time-picker to Angular Signal Forms ([9dcff2e](https://github.com/EOCOnline/rangertrak/commit/9dcff2ec675819deba63d006897fd4408c1c3bf4))


### Bug Fixes

* **sprint-d:** remove min/max/pattern attributes NG8022 disallows on [formField] ([dd9c98e](https://github.com/EOCOnline/rangertrak/commit/dd9c98ea6cbaeb5420865f64723cfcb0a9daf35d))

### [0.15.7](https://github.com/EOCOnline/rangertrak/compare/v0.15.6...v0.15.7) (2026-08-17)


### Features

* **settings:** break settings.component into sections (Sprint C) ([0a66e49](https://github.com/EOCOnline/rangertrak/commit/0a66e49cba64f87b2b20ddfad0dfde425842a455))

### [0.15.6](https://github.com/EOCOnline/rangertrak/compare/v0.15.5...v0.15.6) (2026-08-15)


### Features

* **rangers:** one-step bundle import, and make the Install buttons real ([d801433](https://github.com/EOCOnline/rangertrak/commit/d801433d02adb5da4e693ceda037aa59e1cb802f))

### [0.15.5](https://github.com/EOCOnline/rangertrak/compare/v0.15.4...v0.15.5) (2026-08-15)


### Features

* **rangers:** ranger photos, stored on the device and never in the repo ([16e6e71](https://github.com/EOCOnline/rangertrak/commit/16e6e710b07cd1537b3a7409726d4f68ffe87eb4))

### [0.15.4](https://github.com/EOCOnline/rangertrak/compare/v0.15.3...v0.15.4) (2026-08-15)


### Bug Fixes

* **rangers:** say what deleting the roster actually does ([42b5b76](https://github.com/EOCOnline/rangertrak/commit/42b5b765f42696e1faa8df141c6dc37a499a22ac))

### [0.15.3](https://github.com/EOCOnline/rangertrak/compare/v0.15.2...v0.15.3) (2026-08-15)


### Features

* **rangers:** import and export a roster on its own, and make deletion stick ([5e60248](https://github.com/EOCOnline/rangertrak/commit/5e60248d53f422087ba801b77095b542bd83ea2e))

### [0.15.2](https://github.com/EOCOnline/rangertrak/compare/v0.15.1...v0.15.2) (2026-08-15)


### Features

* **nav:** D-31 - rename the two map pages "Map" and "Backup map" ([cd87078](https://github.com/EOCOnline/rangertrak/commit/cd87078c57d1bea70a34fcdc7624ef34cf5f5068))


### Bug Fixes

* **settings:** the Save button kept the electric yellow Entry's Submit lost ([64f58e9](https://github.com/EOCOnline/rangertrak/commit/64f58e9818484e76ec5e80a126eff6efc3e20ed1)), closes [#teamgrid1](https://github.com/EOCOnline/rangertrak/issues/teamgrid1)

### [0.15.1](https://github.com/EOCOnline/rangertrak/compare/v0.15.0...v0.15.1) (2026-08-15)


### Features

* **rangers:** make the confidentiality notice a dismissable bar ([7d9c521](https://github.com/EOCOnline/rangertrak/commit/7d9c521a7982d61b71e8201890d198ad7be6bdf7)), closes [#d9a300](https://github.com/EOCOnline/rangertrak/issues/d9a300) [#fff8e1](https://github.com/EOCOnline/rangertrak/issues/fff8e1) [#8a6100](https://github.com/EOCOnline/rangertrak/issues/8a6100)


### Bug Fixes

* **ui:** six hardcoded colours and layouts that Sprint A missed ([d5ba589](https://github.com/EOCOnline/rangertrak/commit/d5ba58998ad2cc4066a52571b8f91c2047f97b08)), closes [#7d1f02](https://github.com/EOCOnline/rangertrak/issues/7d1f02)

## [0.15.0](https://github.com/EOCOnline/rangertrak/compare/v0.14.1...v0.15.0) (2026-08-15)


### Features

* **theme:** a real token layer and M3 theme - Sprint A ([9b36722](https://github.com/EOCOnline/rangertrak/commit/9b367226b26a2d54ea13138fe66b96f8b6f8a0f1)), closes [#0d60a9](https://github.com/EOCOnline/rangertrak/issues/0d60a9) [#a53c19](https://github.com/EOCOnline/rangertrak/issues/a53c19) [#962f10](https://github.com/EOCOnline/rangertrak/issues/962f10)


### Bug Fixes

* **hosting:** stop re-attaching www to the Worker, which broke its redirect ([44a1e5e](https://github.com/EOCOnline/rangertrak/commit/44a1e5e0e2af239cb87e6d6abad2c98a3058d228))
* **maps:** three components shared id="map", so Leaflet drew into the wrong one ([927e0ec](https://github.com/EOCOnline/rangertrak/commit/927e0ecdbc475da6cb73ca1bac8e4fbc78934436))
* **ui:** the A2HS button says "Add to Home Scree" ([d643d28](https://github.com/EOCOnline/rangertrak/commit/d643d286c06f18af82e17a99168cf0363b3e2300))

### [0.14.1](https://github.com/EOCOnline/rangertrak/compare/v0.14.0...v0.14.1) (2026-08-15)


### Bug Fixes

* **privacy:** remove real roster data and a key-shaped string from tracked source ([17bfc95](https://github.com/EOCOnline/rangertrak/commit/17bfc951ba7c39931b572fd4c4bdaeb95d92228e))
* **state:** stop snapshotting settings that later change ([b3803f5](https://github.com/EOCOnline/rangertrak/commit/b3803f5105271ea1eec74c8efbdb46bcd77e64fb))

## [0.14.0](https://github.com/EOCOnline/rangertrak/compare/v0.13.0...v0.14.0) (2026-08-15)

A hosting and defect-clearing release, and the first one actually deployed by CI to
<https://rangertrak.org>. Nothing here is new functionality — it is the known problems
cleared out before the interface work starts.

### Fixed — things that had never worked

- **New versions were never installed.** An installed copy kept serving the build it had
  cached, so browsers still ran 0.12.0 after 0.13.0 shipped. The app detected the new
  version and did nothing with it. It now tells you a version is ready, installs it when
  you accept, and never reloads the page out from under you mid-report. The footer shows
  a standing "new version ready" button and when it last checked.
- **The "Add to Home Screen" button could never appear.** Its event handler was wired to
  the wrong class member, so it threw on every load instead of running.
- **The Leaflet map opens zoomed to your reports.** The map extent was stored in a form
  that did not survive being saved, so zoom-to-fit had been switched off and markers
  opened off-screen.
- **The "show only selected reports" switch works**, and no longer carries a `[Broken:]`
  label. The switch and the map had disagreed about its state, and the code that would
  have redrawn the markers was unimplemented.
- **Corrections typed into the Reports grid are saved**, automatically. The grid was
  editable but a "Save Reports" button alerted "UNIMPLEMENTED" and every edit was lost on
  reload. Editing a latitude or longitude now moves the report; invalid values are
  refused rather than stored.
- **The Leaflet map no longer opens blank** when reached from another page.
- **The Entry page no longer logs errors on every load.**
- **Report counts** no longer drift.

### Fixed — hosting

- **The offline map renders again.** The new host does not support HTTP byte serving, and
  the map data is read in byte ranges; a small Worker now serves that one file properly.
- **Cache headers** keep the service-worker control files from being served stale, which
  is what silently pinned users to old builds.

### Security and privacy

- **API keys are no longer bundled.** Five inlined credentials (Google Maps, Firebase,
  two Mapbox tokens, AgmCore) were being published inside the application JavaScript on
  every deploy. A pre-deploy scan now fails the build if any reappear.
- **A roster of 286 real people** — names, phone numbers and street addresses — was being
  compiled into the shipped JavaScript and published to anyone who loaded the site. It is
  gone. Rosters come from Import Mission.

### Internal

- The project can be built from a clean clone for the first time: two imports of
  gitignored files meant it never could, which is why CI had never run.
- Deploys run from `main` via GitHub Actions, gated on typecheck, the full test suite,
  and the secret scan.
- Test suite: 80 specs, all passing (was 73 of 78).
- Initial download 1.96 MB → 1.73 MB.

### Known issues

- **The navbar and page layouts are unpolished** — the interface pass is the next work.
- **`rangertrak.com` does not yet redirect** to `.org`.
- Offline operation after the first visit is not yet confirmed on the live site, though
  the update mechanism proves the app is being cached.

## [0.13.0](https://github.com/EOCOnline/rangertrak/compare/v0.12.0...v0.13.0) (2026-08-14)

A repair-and-harden release. Several core screens had stopped working; all are
functional again, and verified in a real browser rather than only by a passing build.

### Fixed — screens that were not working

- **Rangers and Field Reports grids showed nothing at all.** AG Grid v33+ requires its
  feature modules to be registered before a grid is created; without that each grid
  rendered an empty shell. Both listings work again.
- **The offline map (MapLibre + PMTiles) rendered a blank grey panel.** Its worker was
  never shipped, so the basemap *and* every report marker silently failed to draw.
- **The Field Reports page threw on load**, taking the whole page down, from a Material
  slider binding that has been invalid since Material v15.
- **The Settings page crashed** whenever stored settings were reloaded, because dates
  round-trip through storage as text.
- **The Field Reports Address column was blank for every report** — bound to the wrong
  field while the addresses were present in the data.
- **"Save Log File" did nothing** beyond logging "UNIMPLEMENTED".

### Added

- **Sample mission** — a demonstration roster and about thirty field reports across
  recognizable locations, loadable in one click for demos, training, and seeing how a
  screen looks with realistic data.
- **Crash reporting into the Log page.** Uncaught exceptions and rejected promises now
  appear in the log, where a field user can actually see them and export them. Previously
  the log only contained what the code chose to log.
- **Log export** as CSV, with proper quoting.
- **Confidentiality warnings** on the Rangers page and before any export of roster or log
  data.
- **A loading placeholder** for the Entry page mini-map.

### Security

- **Fixed an injection flaw on the Log page.** Log messages — which include free-text
  ranger notes and serialized field reports — were written into the page as raw HTML, so
  content typed from radio traffic could execute. All entries are now escaped.
- The in-app About page stated the wrong software licence.

### Performance

- **Initial download cut from 4.95 MB to 1.96 MB** (999 kB to 355 kB transferred) by
  loading each screen only when opened. The first screen now paints without waiting for
  the grid, spreadsheet, and mapping libraries.
- **Log rendering no longer degrades over a long mission** — it previously rebuilt every
  entry each time a new one arrived.
- The in-memory log is now bounded rather than growing for the life of the session.

### Documentation

- New **[Field Guide](FIELD-GUIDE.md)** for operators: what each screen does, and how to
  prepare a device so it works when the network doesn't — including the step people
  forget, which is opening the offline map once while connected.
- New **[Developing guide](DEVELOPING.md)**; **[Architecture](ARCHITECTURE.md)** now
  covers the two map engines, geocoding, and a plan for encryption at rest.
- The README is now a short front door rather than a catch-all, and no longer promises
  features that do not exist.

## [0.12.0](https://github.com/EOCOnline/rangertrak/compare/v0.11.40...v0.12.0) (2026-08-14)

### [0.11.45](https://github.com/EOCOnline/RangerTrak/compare/v0.11.44...v0.11.45) (2024-02-26)

### [0.11.44](https://github.com/EOCOnline/RangerTrak/compare/v0.11.40...v0.11.44) (2022-11-25)

- Basic functinoality but Field Report Selection not yet working.

### [0.11.41](https://github.com/EOCOnline/RangerTrak/compare/v0.11.40...v0.11.41) (2022-10-22)

### [0.11.40](https://github.com/EOCOnline/RangerTrak/compare/v0.11.38...v0.11.40) (2022-09-24)

- See EXTENSIVE rlease notes at: <https://github.com/EOCOnline/rangertrak/releases/tag/v0.11.40>

### [0.11.38](https://github.com/EOCOnline/RangerTrak/compare/v0.11.37...v0.11.38) (2022-02-12)

### 0.11.37 (2022-02-11)

- Typescript version at time we started version control.

### 0.11.36 (2022-02-6)

- Initial stable 4.2 Javascript Version, released Sep 9, 2020, first used at an ACS/CERT exercise
