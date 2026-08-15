# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

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
