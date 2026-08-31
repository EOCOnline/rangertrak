// E-87 Stage 1 (2026-08-31) - "Command Post Server: serving the mission to nearby devices".
// See `E-87 Command Post Server.md` in the private docs for the full scoping this implements.
//
// Read-only mirror, not a sync server: the PWA running on a scribe's own device POSTs a
// redacted snapshot of the radio log here whenever it changes (opt-in, see MissionType's
// commandPostEnabled/commandPostServerUrl and command-post-publish.service.ts); this process
// just holds the LATEST one in memory and hands it back to anyone who asks. No persistence,
// no write-back, no identity, no conflict resolution - one writer, many readers, matching the
// "structurally simpler read problem" the 2026-08-15 exercise actually validated a need for.
//
// Forked from tools/serve-dist.js rather than extending it in place (the scoping doc's own
// §5 flagged this as a five-minute call either way, not worth blocking on): that file is a
// dev-only local-preview convenience nobody ships; this one is a real end-user feature with a
// different audience, and conflating "preview the build" with "run the command post" in one
// file risked the two drifting into each other by accident. Static-file serving below is
// intentionally the same logic, not a shared module - see that file if this ever needs to be
// reconciled with it.
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'dist', 'rangertrak', 'browser');
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;

// In-memory only, on purpose - see this file's own header comment. Never written to disk:
// the mission may carry field-report notes and coordinates, and this process has no reason
// to persist operator data past its own runtime (D-35).
let latestMission = null;

const MIME = {
  '.html': 'text/html', '.js': 'application/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff',
  '.pmtiles': 'application/octet-stream', '.txt': 'text/plain'
};

function sendStatic(res, filePath, stats, range) {
  const contentType = MIME[path.extname(filePath)] || 'application/octet-stream';

  if (range) {
    const size = stats.size;
    const [startStr, endStr] = range.replace(/bytes=/, '').split('-');
    const start = parseInt(startStr, 10);
    const end = endStr ? parseInt(endStr, 10) : size - 1;
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${size}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': end - start + 1,
      'Content-Type': contentType,
      'Cache-Control': 'no-cache'
    });
    fs.createReadStream(filePath, { start, end }).pipe(res);
  } else {
    res.writeHead(200, {
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
      'Content-Length': stats.size,
      'Cache-Control': 'no-cache'
    });
    fs.createReadStream(filePath).pipe(res);
  }
}

function serveStaticFile(req, res) {
  const urlPath = decodeURIComponent(req.url.split('?')[0]);
  let filePath = path.join(ROOT, urlPath);

  fs.stat(filePath, (err, stats) => {
    // Found live testing this feature, 2026-08-31: a request for exactly `/view` (no
    // trailing slash - the natural, expected form for a typed/QR-coded URL, and what this
    // server's own startup message and the Settings UI both print) resolves to the
    // DIRECTORY `view/`, not a file. `stats.isFile()` is false for a directory, `/view` has
    // no extension, so without this branch it fell straight into the SPA fallback below and
    // silently served the real Angular app's index.html instead of the hand-written viewer
    // page - confirmed live via curl before this fix (`data-beasties-container`, an Angular-
    // build-only marker, showed up in the response for `/view`). Try `<path>/index.html`
    // before falling all the way back to the SPA shell.
    if (!err && stats.isDirectory()) {
      const indexPath = path.join(filePath, 'index.html');
      fs.stat(indexPath, (errIdx, statsIdx) => {
        if (!errIdx && statsIdx.isFile()) {
          sendStatic(res, indexPath, statsIdx, req.headers.range);
          return;
        }
        fallbackToSpaShell(res);
      });
      return;
    }

    if (err || !stats.isFile()) {
      if (path.extname(urlPath)) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end(`Not found: ${urlPath}`);
        return;
      }
      fallbackToSpaShell(res);
      return;
    }

    sendStatic(res, filePath, stats, req.headers.range);
  });
}

function fallbackToSpaShell(res) {
  const filePath = path.join(ROOT, 'index.html');
  fs.stat(filePath, (err, stats) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    sendStatic(res, filePath, stats, undefined);
  });
}

// The PWA runs on its own origin (rangertrak.org, or localhost:4200 in dev) - a different
// origin from this server even when both happen to run on the same laptop, since the port
// differs at minimum. That makes the publish POST a cross-origin request; without these
// headers the browser blocks it before it ever reaches the handlers below. No credentials
// are involved (no cookies, no auth) so a wildcard origin is the simplest correct answer,
// not a shortcut - see command-post-publish.service.ts's own header comment on why there is
// no join-code/auth model in this v1 for a wildcard to weaken.
function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function readJsonBody(req, maxBytes) {
  return new Promise((resolve, reject) => {
    let received = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      received += chunk.length;
      if (received > maxBytes) {
        reject(new Error('Request body too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0];

  if (urlPath === '/api/mission') {
    setCorsHeaders(res);

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.method === 'POST') {
      // 25MB is generous for a JSON radio-log snapshot (no roster, no photos - see
      // command-post-publish.service.ts's own payload shape) and cheap insurance against a
      // misbehaving or malicious client filling this process's memory.
      readJsonBody(req, 25 * 1024 * 1024)
        .then((body) => {
          latestMission = body;
          console.log(`[${new Date().toLocaleTimeString()}] Published: "${body.mission || '(unnamed)'}" - ${(body.reports || []).length} report(s).`);
          res.writeHead(204);
          res.end();
        })
        .catch((e) => {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: `Invalid request body: ${e.message}` }));
        });
      return;
    }

    if (req.method === 'GET') {
      if (!latestMission) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'No mission has published yet.' }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(latestMission));
      return;
    }

    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  serveStaticFile(req, res);
});

// Prints every non-internal IPv4 address this machine has, not just one guess - a laptop at
// a command post commonly has more than one active interface (WiFi + a wired uplink, or a
// USB-tethered phone hotspot) and there is no reliable way to know which one the field
// devices will actually be able to reach. No QR code in this v1 (the scoping doc's own §5
// point 4 left this an open, non-blocking call) - copy-pasteable plain text needs no new
// dependency and works identically whether an operator is reading this over SSH, a serial
// console, or sitting at the laptop itself.
function printLanUrls() {
  const nets = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        addresses.push(net.address);
      }
    }
  }

  console.log('');
  console.log('RangerTrak Command Post Server');
  console.log('==============================');
  console.log(`Serving ${ROOT}`);
  console.log('');
  console.log('Give teams this address to view the live comms log:');
  console.log('');
  if (addresses.length === 0) {
    console.log('  (no non-internal network interface found - check your WiFi/hotspot connection)');
  }
  for (const addr of addresses) {
    console.log(`  http://${addr}:${PORT}/view`);
  }
  console.log(`  http://localhost:${PORT}/view   (this machine only)`);
  console.log('');
  console.log('In RangerTrak\'s own Mission Setup, turn on "Publish to Command Post Server" and');
  console.log(`set the server address to one of the URLs above (without /view), e.g.:`);
  console.log(`  http://${addresses[0] || 'localhost'}:${PORT}`);
  console.log('');
}

server.listen(PORT, () => printLanUrls());
