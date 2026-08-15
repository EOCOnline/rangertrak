# Current UI screenshots — v0.14.0 (captured 2026-08-14)

Drop the PNGs from the two review batches in this folder. They supersede the
0.11.41 (Oct 2022) captures in the parent directory for all UI-phase planning.

Suggested names, matching the routes they show:

| File | Route | Notes |
| --- | --- | --- |
| `entry.png` | `/` | Field Report Entry — the primary scribe screen |
| `lmap-blank.png` | `/lmap` | Leaflet map **blank on first load** |
| `lmap-loaded.png` | `/lmap` | Same route after F5 — map renders |
| `map-pmtiles.png` | `/map` | MapLibre + PMTiles offline map |
| `reports.png` | `/reports` | Field Reports grid |
| `rangers.png` | `/rangers` | Rangers & Teams grid |
| `settings.png` | `/settings` | Application Settings |
| `about.png` | `/about` | About |
| `log.png` | `/log` | Event Summary Log |

What these captures established is written up in `PRIVATE-Roadmap.md` §19f — read
that rather than re-deriving it from the images.

Note the version stamp: these show **0.14.0**, not 0.14.1. That is not a capture
error — see §19g. The origin was returning a redirect loop and the browser was
being served a cached build by the service worker.
