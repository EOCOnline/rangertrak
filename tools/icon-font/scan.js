// Material Icons subset: which icon names does the app use? (2026-10-20, PageSpeed pass.)
//
// The full Material Icons font is 128 KB and holds ~2,200 icons; the app uses a few hundred.
// src/assets/fonts/material-icons-subset.woff2 keeps only the names listed in
// tools/icon-font/icons-used.txt, which this script writes. subset.py builds the font from it.
//
// A name the subset lacks renders as its literal words ("content_copy"), which is wide enough
// to overflow a phone. So the scan is a deliberate SUPERSET: every icon name that appears in
// src/ as a whole quoted string ('map', "check", `warning`) or as the whole text of an element
// (<mat-icon>map</mat-icon>, <i class="material-icons">map</i>), in any file, used as an icon
// or not. That catches the dynamic cases too (`{{ m.icon }}` reads a literal from a .ts table;
// `iconFor()` returns literals). A name built at runtime from pieces ('signal_' + n) would
// slip past - don't build icon names that way.
//
//   node tools/icon-font/scan.js            rewrite icons-used.txt (then run subset.py)
//   node tools/icon-font/scan.js --check    CI gate: fail if src/ uses a name the subset lacks
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..', '..')
const SRC = path.join(ROOT, 'src')
const ALL = path.join(__dirname, 'icons-all.txt')
const USED = path.join(__dirname, 'icons-used.txt')
const EXTENSIONS = ['.ts', '.html', '.scss', '.css', '.json', '.js']

function readList(file) {
  return new Set(fs.readFileSync(file, 'utf8').split(/\r?\n/).map(s => s.trim()).filter(Boolean))
}

function walk(dir) {
  const out = []
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) out.push(...walk(full))
    else if (EXTENSIONS.includes(path.extname(e.name))) out.push(full)
  }
  return out
}

const allNames = readList(ALL)
const found = new Set()
const patterns = [/(['"`])([a-z0-9_]+)\1/g, />\s*([a-z0-9_]+)\s*</g]
for (const file of walk(SRC)) {
  const text = fs.readFileSync(file, 'utf8')
  for (const re of patterns) {
    for (const m of text.matchAll(re)) {
      const name = m[m.length - 1]
      if (allNames.has(name)) found.add(name)
    }
  }
}

if (process.argv.includes('--check')) {
  const used = readList(USED)
  const missing = [...found].filter(n => !used.has(n)).sort()
  if (missing.length) {
    console.error(`Icon font subset is missing ${missing.length} icon(s) used in src/: ${missing.join(', ')}`)
    console.error('Run: node tools/icon-font/scan.js && python tools/icon-font/subset.py')
    process.exit(1)
  }
  console.log(`Icon font subset covers all ${found.size} icon names found in src/.`)
} else {
  fs.writeFileSync(USED, [...found].sort().join('\n') + '\n')
  console.log(`Wrote ${found.size} icon names to ${path.relative(ROOT, USED)}. Now run: python tools/icon-font/subset.py`)
}
