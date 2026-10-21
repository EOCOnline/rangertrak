# Material Icons subset builder (2026-10-20, PageSpeed pass). See scan.js for the why.
#
# Reads the full font (material-icons-full.woff2, beside this file) and icons-used.txt, and
# writes src/assets/fonts/material-icons-subset.woff2 holding only those icons. Also rewrites
# icons-all.txt, the full font's name list that scan.js matches against.
#
# The font draws icons through 'rlig' ligatures (the letters "map" become the map glyph), so a
# plain character subset keeps everything: every ligature is made of letters that stay. Instead
# this keeps the letter glyphs plus the wanted icon glyphs, with layout closure OFF, so the
# subsetter drops every ligature whose result glyph is gone.
#
#   pip install fonttools brotli
#   python tools/icon-font/subset.py
#   python tools/icon-font/subset.py --names-only   (only rewrite icons-all.txt)
import os
import sys
from fontTools.ttLib import TTFont
from fontTools import subset

HERE = os.path.dirname(os.path.abspath(__file__))
FULL = os.path.join(HERE, 'material-icons-full.woff2')
USED = os.path.join(HERE, 'icons-used.txt')
ALL = os.path.join(HERE, 'icons-all.txt')
OUT = os.path.join(HERE, '..', '..', 'src', 'assets', 'fonts', 'material-icons-subset.woff2')


def ligatures(font):
    """Map each icon name to its ligature glyph."""
    rev = {glyph: chr(code) for code, glyph in font.getBestCmap().items()}
    out = {}
    for lookup in font['GSUB'].table.LookupList.Lookup:
        for st in lookup.SubTable:
            if st.LookupType == 7:
                st = st.ExtSubTable
            for first, ligs in getattr(st, 'ligatures', {}).items():
                for lig in ligs:
                    out[''.join(rev[g] for g in [first] + lig.Component)] = lig.LigGlyph
    return out


font = TTFont(FULL)
names = ligatures(font)
with open(ALL, 'w', newline='\n') as f:
    f.write('\n'.join(sorted(names)) + '\n')
if '--names-only' in sys.argv:  # first run, or a new full font: scan.js needs icons-all.txt
    print(f'{len(names)} names -> {os.path.relpath(ALL)}')
    sys.exit(0)

with open(USED) as f:
    wanted = [line.strip() for line in f if line.strip()]
unknown = [n for n in wanted if n not in names]
if unknown:
    raise SystemExit(f'Not in the full font: {", ".join(unknown)}')

# Letters, digits and underscore: the ligature inputs, and what shows if a name is unknown.
letters = [font.getBestCmap()[ord(c)] for c in '0123456789_abcdefghijklmnopqrstuvwxyz']
options = subset.Options()
options.layout_closure = False
options.layout_features = ['rlig', 'liga']
options.flavor = 'woff2'
options.name_IDs = ['*']
options.notdef_outline = True
sub = subset.Subsetter(options)
sub.populate(glyphs=letters + [names[n] for n in wanted])
sub.subset(font)

kept = set(ligatures(font))
lost = [n for n in wanted if n not in kept]
if lost:
    raise SystemExit(f'Subset lost ligatures: {", ".join(lost)}')
extra = kept - set(wanted)
if extra:
    raise SystemExit(f'Subset kept unrequested ligatures: {", ".join(sorted(extra))}')

font.save(OUT)
print(f'{len(wanted)} icons -> {os.path.relpath(OUT)} ({os.path.getsize(OUT):,} bytes; full font {os.path.getsize(FULL):,})')
