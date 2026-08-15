// Pre-deploy gate: fail loudly if the production build contains API keys.
//
// Roadmap section 9e is explicit that a deploy must not happen while keys are still
// inlined in the bundle. Half of that exposure was closed by the angular.json assets
// "ignore" for data/secrets.json - the file is no longer fetchable. The other half is
// not: settings.service.ts does `import * as secrets from '.../secrets.json'`, so the
// bundler inlines every value into main-XXXX.js regardless of the assets config. That
// import can only go away with the Google Maps removal work.
//
// Until then this script is the guard, so "do not deploy" is enforced by CI rather than
// remembered. Run automatically by `npm run deploy` and by the GitHub Actions workflow.
//
// It NEVER prints a key value - only which provider matched and which file it is in.
const fs = require('fs');
const path = require('path');

const DIST = path.join(__dirname, '..', 'dist', 'rangertrak', 'browser');
const SECRETS = path.join(__dirname, '..', 'src', 'assets', 'data', 'secrets.json');

// Shape-based detection, as a backstop for keys that never lived in secrets.json.
const PATTERNS = [
  { name: 'Google API key', re: /AIza[0-9A-Za-z_-]{35}/g },
  { name: 'Mapbox token', re: /\b[ps]k\.eyJ[0-9A-Za-z_-]{20,}/g },
  { name: 'AWS access key id', re: /\bAKIA[0-9A-Z]{16}\b/g },
  { name: 'Generic bearer secret', re: /\bsk-[A-Za-z0-9]{32,}\b/g }
];

function collectFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...collectFiles(full));
    // Only text-ish outputs can carry an inlined key; skip images and tiles.
    else if (/\.(js|mjs|css|html|json|webmanifest|txt|map)$/i.test(entry.name)) out.push(full);
  }
  return out;
}

// Exact-value detection: whatever is actually in the local secrets.json right now.
// More reliable than shape matching, since it catches providers with no distinctive
// key format (What3Words, for one). Values are used for comparison only, never logged.
function literalSecrets() {
  if (!fs.existsSync(SECRETS)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(SECRETS, 'utf8'));
    const found = [];
    const walk = (node) => {
      if (!node || typeof node !== 'object') return;
      for (const [key, value] of Object.entries(node)) {
        if (typeof value === 'object') walk(value);
        // 12 chars filters out placeholders and short non-secret fields while staying
        // well below the length of any real key.
        else if (key === 'key' && typeof value === 'string' && value.length >= 12) {
          found.push({ name: `secrets.json "${node.name || key}"`, value });
        }
      }
    };
    walk(parsed);
    return found;
  } catch {
    console.warn('  ! secrets.json present but unparseable; relying on shape matching only');
    return [];
  }
}

function main() {
  if (!fs.existsSync(DIST)) {
    console.error(`FAIL: no build at ${DIST} - run "npm run build" first.`);
    process.exit(1);
  }

  const files = collectFiles(DIST);
  const literals = literalSecrets();
  const hits = [];

  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    const rel = path.relative(DIST, file);

    for (const { name, re } of PATTERNS) {
      if (new RegExp(re.source, re.flags).test(text)) hits.push({ name, rel });
    }
    for (const { name, value } of literals) {
      if (text.includes(value)) hits.push({ name, rel });
    }
  }

  console.log(`Scanned ${files.length} built files in dist/rangertrak/browser`);

  if (hits.length === 0) {
    console.log('OK: no API keys found in the build.');
    return;
  }

  console.error('\nFAIL: the production build contains API keys. Do not deploy.\n');
  // Dedupe: one line per provider+file, no values.
  for (const line of new Set(hits.map((h) => `  ${h.name}  ->  ${h.rel}`))) console.error(line);
  console.error(`
Roadmap section 9e lists two ways to clear this:
  1. Blank the "key" values in src/assets/data/secrets.json (untracked, local only)
     once the Google console sweep is done, then rebuild. No code change needed.
  2. Delete the secrets.json import from settings.service.ts along with the Google
     Maps removal. Structural, and the real fix.
`);
  process.exit(1);
}

main();
