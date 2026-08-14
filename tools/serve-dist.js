// Minimal static file server for previewing the production build locally, with SPA
// fallback (serves index.html for any path that isn't a real file) so direct navigation
// or a page refresh on a client-side route (/lmap, /map, /reports, /rangers, /settings,
// /log) doesn't 404 - Angular's router only ever runs client-side, so the server has to
// hand back index.html for it to take over. Also supports HTTP Range requests, needed
// for the PMTiles map (the pmtiles library fetches the basemap via byte ranges).
//
// Plain Node http, no dependency - http-server (used before) has no real SPA-fallback
// option, just a reverse-proxy flag that isn't the same thing.
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'dist', 'rangertrak', 'browser');
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;

const MIME = {
  '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff',
  '.pmtiles': 'application/octet-stream', '.txt': 'text/plain'
};

function send(res, filePath, stats, range) {
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

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent(req.url.split('?')[0]);
  let filePath = path.join(ROOT, urlPath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      filePath = path.join(ROOT, 'index.html'); // SPA fallback
    }

    fs.stat(filePath, (err2, stats2) => {
      if (err2) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      send(res, filePath, stats2, req.headers.range);
    });
  });
});

server.listen(PORT, () => console.log(`Serving ${ROOT} at http://localhost:${PORT}`));
