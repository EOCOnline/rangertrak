#!/usr/bin/env bash
# Rebuilds the Alternative map's bundled PMTiles files (E-124 split, 2026-09-26):
#
#   world-z5-<build>.pmtiles           z0-5 world background. Downloaded by every device that
#                                      opens the Alternative map, and only by those.
#   demo-<scenario>-<build>.pmtiles    z6-15 street detail for one demo scenario. Downloaded
#                                      only while that demo is the loaded mission AND the
#                                      Alternative map is open - never for a real mission.
#
# The build date is in every filename on purpose: Cache Storage keys on the URL, so a file
# replaced under the same name would keep being served from every device that already warmed
# it (see src/app/shared/mapping/pmtiles-config.ts). After running this, update the URLs in
# pmtiles-config.ts to the new <build> and delete the old files.
#
# Needs the pmtiles CLI: `go install github.com/protomaps/go-pmtiles@latest`
# (the binary installs as go-pmtiles; set PMTILES=/path/to/it if it isn't `pmtiles` on PATH).
#
# Usage: tools/build-demo-maps.sh [YYYYMMDD]   (default: today's Protomaps build)
#        ONLY=oso tools/build-demo-maps.sh 20261018   cuts just that one demo (no world file, no others)
set -euo pipefail

BUILD="${1:-$(date -u +%Y%m%d)}"
SRC="https://build.protomaps.com/${BUILD}.pmtiles"
OUT="$(dirname "$0")/../src/assets/maps"
PMTILES="${PMTILES:-pmtiles}"

# Demo areas, west,south,east,north. Keep each box tight: every extra square km at z15 is
# downloaded by everyone who opens that demo's map.
declare -A DEMOS=(
  [grand-canyon]="-112.20,36.03,-112.07,36.12"  # Bright Angel Trail to Plateau Point, Hopi to Mather Point
  [vashon]="-122.53,47.32,-122.40,47.51"         # Vashon and Maury islands
  [state-fair]="-77.428,37.842,-77.411,37.854"         # State Fair of Virginia, Meadow Event Park, Doswell VA (tight: ~1.5 x 1.3 km around the grounds, bbox from OSM)
  [oso]="-122.23,47.96,-121.57,48.30"            # E-195: County EOC (Everett, southwest) to the east command post (Darrington, northeast), padded; z6-14 only, see DEMO_MAXZOOM
  [montecito]="-119.80,34.39,-119.51,34.50"      # E-195: Santa Barbara County EOC (west) to Carpinteria shelter (east), Hwy 154 to US 101; 5.0 MB from build 20261018
)

# A demo whose box is large stops at a lower zoom to stay near ~8 MB. Default is 15.
# oso: 46 x 34 km (every place from the EOC to the east command post); z15 would be 9.7 MB, z14 is 5.0 MB.
declare -A DEMO_MAXZOOM=(
  [oso]=14
)

if [ -z "${ONLY:-}" ]; then
  "$PMTILES" extract "$SRC" "$OUT/world-z5-${BUILD}.pmtiles" --maxzoom=5
  "$PMTILES" verify "$OUT/world-z5-${BUILD}.pmtiles"
fi

for id in "${!DEMOS[@]}"; do
  if [ -n "${ONLY:-}" ] && [ "$id" != "$ONLY" ]; then continue; fi
  "$PMTILES" extract "$SRC" "$OUT/demo-${id}-${BUILD}.pmtiles" --bbox="${DEMOS[$id]}" --minzoom=6 --maxzoom="${DEMO_MAXZOOM[$id]:-15}"
  "$PMTILES" verify "$OUT/demo-${id}-${BUILD}.pmtiles"
done

ls -l "$OUT"
