# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

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
