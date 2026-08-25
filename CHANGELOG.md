# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [0.52.0](https://github.com/EOCOnline/rangertrak/commit/PLACEHOLDER) (2026-08-26)

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
