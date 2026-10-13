// Gate: every key the app persists must have a row in ARCHITECTURE.md's "Data stored on the
// device" table, the input to the rc.1 storage freeze (ADR D-55). Architecture pass step 4.
//
// It reads the source rather than the running app. Every getItem/setItem/removeItem call,
// every indexedDB.open/deleteDatabase and every caches.open/delete in non-spec source has its
// key resolved to a string: a literal, a constant in the same file, an imported constant, or
// `name + '-SUFFIX'` of one of those. A key missing from the table fails. So does a key it
// cannot resolve, which is the point: a new way of naming keys has to be taught to this
// script (or allow-listed below with a reason) instead of slipping past it.
//
// The reverse also fails: a backticked key in the table that no longer appears anywhere in
// the source, so a removed key cannot leave a stale row behind.
//
// Out of scope: the Angular service worker's own caches (ngsw:*), which the framework names.
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const SRC = path.join(ROOT, 'src', 'app')
const DOC = path.join(ROOT, 'ARCHITECTURE.md')
const SECTION = '## Data stored on the device'

// Generic pass-throughs: the key is a parameter, and the real names are found elsewhere.
const PASS_THROUGH = [
  { file: 'shared/storage/record-store.ts', expr: 'key', why: 'RecordStore itself; callers name the keys' },
  { file: 'shared/storage/record-store.ts', expr: 'k', why: 'RecordStore re-writing its own map' },
  { file: 'shared/services/device-prefs.service.ts', expr: 'key', why: 'its *_KEY constants are collected below' },
  { file: 'shared/mapping/cache-first-source.ts', expr: 'this.cacheName', why: 'constructor param; callers pass PMTILES_WARM_CACHE_NAME' },
]
// Files whose *_KEY string constants are keys in their own right (behind a pass-through).
const KEY_CONSTANT_FILES = ['shared/services/device-prefs.service.ts']

function walk(dir) {
  const out = []
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) out.push(...walk(full))
    else if (e.name.endsWith('.ts') && !e.name.endsWith('.spec.ts')) out.push(full)
  }
  return out
}

// Blank out comments, keeping strings and line numbers intact.
function stripComments(src) {
  let out = '', i = 0, quote = null
  while (i < src.length) {
    const c = src[i], n = src[i + 1]
    if (quote) {
      out += c
      if (c === '\\') { out += n ?? ''; i += 2; continue }
      if (c === quote) quote = null
      i++
    } else if (c === '/' && n === '/') {
      while (i < src.length && src[i] !== '\n') i++
    } else if (c === '/' && n === '*') {
      i += 2
      while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) { if (src[i] === '\n') out += '\n'; i++ }
      i += 2
    } else {
      if (c === '\'' || c === '"' || c === '`') quote = c
      out += c
      i++
    }
  }
  return out
}

const files = walk(SRC).map(f => ({
  rel: path.relative(SRC, f).replace(/\\/g, '/'),
  code: stripComments(fs.readFileSync(f, 'utf8')),
}))

// A string literal. Named backreference, so it stays correct inside larger patterns.
const STR = String.raw`(?<q>['"\`])([^'"\`]+)\k<q>`
function constIn(code, name) {
  const m = code.match(new RegExp(String.raw`\b${name}\s*[:=]\s*${STR}`))
  return m ? m[2] : null
}
function resolveName(file, name) {
  const local = constIn(file.code, name)
  if (local !== null) return local
  const alias = file.code.match(new RegExp(String.raw`\b(\w+)\s+as\s+${name}\b`))
  const target = alias ? alias[1] : name
  for (const f of files) {
    const m = f.code.match(new RegExp(String.raw`export\s+const\s+${target}\s*=\s*${STR}`))
    if (m) return m[2]
  }
  return null
}
function resolveExpr(file, expr) {
  expr = expr.trim()
  let m = expr.match(new RegExp(`^${STR}$`))
  if (m) return m[2]
  m = expr.match(new RegExp(String.raw`^(?:this\.)?(\w+)(?:\s*\+\s*${STR})?$`))
  if (m) {
    const base = resolveName(file, m[1])
    return base === null ? null : base + (m[3] ?? '')
  }
  return null
}

const found = new Map() // key -> [where]
const unresolved = []
function add(key, where) { if (!found.has(key)) found.set(key, []); found.get(key).push(where) }

const CALL = /\b(?:\w+\.)*(getItem|setItem|removeItem|open|deleteDatabase|delete)\(([^,)]*)/g
for (const file of files) {
  const lines = file.code.split('\n')
  lines.forEach((line, idx) => {
    for (const m of line.matchAll(CALL)) {
      const call = m[0]
      const isStorage = /\.(getItem|setItem|removeItem)\($/.test(call.slice(0, call.indexOf('(') + 1))
      const isIdb = /\bindexedDB\.(open|deleteDatabase)\($/.test(call.slice(0, call.indexOf('(') + 1))
      const isCache = /\bcaches\.(open|delete)\($/.test(call.slice(0, call.indexOf('(') + 1))
      if (!isStorage && !isIdb && !isCache) continue
      const where = `src/app/${file.rel}:${idx + 1}`
      const expr = m[2].trim()
      if (PASS_THROUGH.some(p => p.file === file.rel && p.expr === expr)) continue
      const key = resolveExpr(file, expr)
      if (key === null) unresolved.push(`${where}  ${call.trim()}`)
      else add(key, where)
    }
  })
}
// The key lists RecordStore routes and encrypts.
for (const file of files) {
  for (const m of file.code.matchAll(/export const (MIGRATED_KEYS|ENCRYPTED_KEYS)\s*=\s*\[([^\]]*)\]/g)) {
    for (const s of m[2].matchAll(new RegExp(STR, 'g'))) add(s[2], `src/app/${file.rel} ${m[1]}`)
  }
}
for (const rel of KEY_CONSTANT_FILES) {
  const file = files.find(f => f.rel === rel)
  for (const m of file.code.matchAll(new RegExp(String.raw`\b\w+_KEY\s*=\s*${STR}`, 'g'))) add(m[2], `src/app/${rel}`)
}

// The table: Store and Key columns, every backticked name in each.
const doc = fs.readFileSync(DOC, 'utf8')
const start = doc.indexOf(SECTION)
if (start < 0) { console.error(`check-storage-inventory: "${SECTION}" not found in ARCHITECTURE.md`); process.exit(1) }
const rest = doc.slice(start + SECTION.length)
const end = rest.search(/\n## /)
const body = end < 0 ? rest : rest.slice(0, end)
const documented = new Set()
const rowKeys = []
for (const row of body.split('\n').filter(l => /^\|\s*\d/.test(l))) {
  const cols = row.split('|').map(c => c.trim())
  const [store, key] = [cols[2], cols[3]]
  for (const t of `${store} ${key}`.matchAll(/`([^`]+)`/g)) documented.add(t[1])
  const first = key.match(/^`([^`]+)`/)
  if (first) rowKeys.push(first[1])
}
if (rowKeys.length === 0) { console.error('check-storage-inventory: the table has no rows - has its format changed?'); process.exit(1) }

const missing = [...found.keys()].filter(k => !documented.has(k))
const allSource = files.map(f => f.code).join('\n')
const stale = rowKeys.filter(k => !allSource.includes(`'${k}'`) && !allSource.includes(`"${k}"`) && !allSource.includes(`\`${k}\``)
  && !found.has(k))

let failed = false
if (missing.length) {
  failed = true
  console.error('Persisted keys with no row in ARCHITECTURE.md "Data stored on the device":')
  for (const k of missing) console.error(`  ${k}   (${found.get(k).join(', ')})`)
}
if (unresolved.length) {
  failed = true
  console.error('Storage calls whose key this check cannot resolve (name it with a constant, or teach tools/check-storage-inventory.js):')
  for (const u of unresolved) console.error(`  ${u}`)
}
if (stale.length) {
  failed = true
  console.error('Rows in the table whose key no longer appears in the source:')
  for (const k of stale) console.error(`  ${k}`)
}
if (failed) process.exit(1)
console.log(`check-storage-inventory: ${found.size} persisted keys and stores in the source, all in the table (${rowKeys.length} rows).`)
