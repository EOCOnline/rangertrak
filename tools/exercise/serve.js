#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
// RangerTrak exercise console (E-196 phase 0). Free software under the GNU AGPL v3 or later.
//
// A tiny static server for the console, so its ES modules load (browsers refuse module scripts
// from file:// pages). Serves tools/exercise/ only, on 127.0.0.1, read only.
//
//   node tools/exercise/serve.js            then open http://127.0.0.1:8095/console.html
//   node tools/exercise/serve.js --port=8123
//
// Any other static server pointed at tools/exercise/ works just as well. Stop it with Ctrl+C.
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const arg = process.argv.find(a => a.startsWith('--port='))
const PORT = arg ? Number(arg.slice(7)) : Number(process.env.PORT) || 8095

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.csv': 'text/csv; charset=utf-8', '.md': 'text/markdown; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
  '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.webm': 'video/webm',
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost')
  let rel
  try { rel = decodeURIComponent(url.pathname) } catch { res.writeHead(400).end('Bad request'); return }
  if (rel === '/') rel = '/console.html'
  const file = path.resolve(ROOT, '.' + rel)
  if (file !== ROOT && !file.startsWith(ROOT + path.sep)) { res.writeHead(403).end('Forbidden'); return }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404).end('Not found'); return }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' })
    fs.createReadStream(file).pipe(res)
  })
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Exercise console: http://127.0.0.1:${PORT}/console.html   (Ctrl+C to stop)`)
})
