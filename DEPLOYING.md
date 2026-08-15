# Deploying RangerTrak

RangerTrak is hosted as a **Cloudflare Worker serving static assets** — not a Cloudflare
Pages project. There is no server code: [wrangler.jsonc](wrangler.jsonc) has no `main`,
only an `assets` block. The Worker exists so that server-side routes (the feedback
endpoint, a What3Words proxy) can be added later without changing hosting.

- For the developer workflow, see [DEVELOPING.md](DEVELOPING.md).
- For how the app is put together, see [ARCHITECTURE.md](ARCHITECTURE.md).

> **Two unrelated things are called "worker."** This document means the **Cloudflare
> Worker** — our server at the edge. The **service worker** is the browser-side script
> from [ngsw-config.json](ngsw-config.json) that caches the app for offline use. They
> interact in exactly one place: the `_headers` rules below.

## One-time setup

### 1. Cloudflare API token

Create a token at **My Profile → API Tokens → Create Token**, using the
**Edit Cloudflare Workers** template. It needs:

| Scope   | Permission                | Needed for                   |
| ------- | ------------------------- | ---------------------------- |
| Account | Workers Scripts — Edit    | every deploy                 |
| Zone    | Workers Routes — Edit     | attaching the custom domain  |
| Account | Workers KV Storage — Edit | only once KV is used         |

### 2. GitHub repository secrets

In `github.com/EOCOnline/rangertrak` → **Settings → Secrets and variables → Actions**:

| Secret                  | Value                                               |
| ----------------------- | --------------------------------------------------- |
| `CLOUDFLARE_API_TOKEN`  | The token from step 1                               |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare dashboard → Workers & Pages → Account ID |

### 3. Local wrangler login (only for manual deploys)

```bash
npx wrangler login
npx wrangler whoami     # confirm the right account
```

## How a deploy happens

Pushing to `main` runs [.github/workflows/deploy.yml](.github/workflows/deploy.yml):
`npm ci` → `npm run build` → **secret gate** → `wrangler deploy`. It can also be
triggered manually from the Actions tab (`workflow_dispatch`).

To deploy by hand:

```bash
npm run deploy       # build + secret gate + wrangler deploy
npm run deploy:dry   # validate config and asset directory, upload nothing
```

Never run `npx wrangler deploy` directly — it skips the secret gate.

## The secret gate

[tools/check-no-secrets.js](tools/check-no-secrets.js) scans the built bundle for API
keys and **fails the build if it finds any**, so a deploy cannot republish them. It
checks both key shapes (Google `AIza…`, Mapbox `pk./sk.`, AWS) and the literal values
currently in your local `src/assets/data/secrets.json`. It never prints a key value.

This exists because `settings.service.ts` does
`import * as secrets from '.../secrets.json'`, which inlines every value into
`main-XXXX.js` no matter what the `angular.json` assets config ignores. Clearing that
requires either blanking the local `secrets.json` values or removing the import
alongside the Google Maps removal.

If the gate fires, **fix the exposure — do not bypass the gate.**

## Caching and the service worker

[src/\_headers](src/_headers) is copied to the output root by an `assets` entry in
[angular.json](angular.json) and sets `Cache-Control: no-cache` on `index.html`,
`ngsw.json`, `ngsw-worker.js`, `safety-worker.js`, and `manifest.webmanifest`.

These are the service worker's control plane. If any is served stale, browsers keep
running the previous release indefinitely — which is exactly what happened in August
2026, when installed PWAs kept serving a cached 2022 build while the origin was dead
and every new visitor got a 525 error. Everything else keeps Cloudflare's default ETag
revalidation, which is already correct because the bundles have hashed filenames.

## DNS

Both zones are registered at and served by Cloudflare. Nothing has ever been
successfully hosted on either one — the 2022-era site was a Firebase deploy on an
account that is now dead.

### Stale IONOS records — removed 2026-08-14

Both zones pointed at retired IONOS origins, which is why `rangertrak.org` returned
**525** (Cloudflare could not complete a TLS handshake with an origin that was gone).
Ten dead records were deleted — apex and `www` A/AAAA on each zone, plus the
`_domainconnect` CNAME to `_domainconnect.1and1.com` on each:

| Zone             | Dead origin was                               |
| ---------------- | --------------------------------------------- |
| `rangertrak.org` | `74.208.236.140` / `2607:f1c0:100f:f000::249` |
| `rangertrak.com` | `74.208.236.164` / `2607:f1c0:100f:f000::273` |

The `_dmarc` TXT on each zone was deliberately kept — a `p=none` DMARC policy on a
domain that sends no mail is correct and worth having.

Inspect either zone at any time with the domain tooling:

```bash
python cf.py dns rangertrak.org      # in D:\Projects\domainManagement\Claude
```

### rangertrak.org → the Worker

Deploy first and verify on the `rangertrak.<subdomain>.workers.dev` URL. Then attach
the custom domain: Workers & Pages → `rangertrak` → Settings → Domains & Routes → Add
custom domain, for both `rangertrak.org` and `www.rangertrak.org`.

Cloudflare creates the proxied records and provisions the certificate itself. **Do not
hand-create A/AAAA records** — the conflicting records that used to be there are gone
precisely so this attach is clean. Wait for the certificate to go active, then run the
smoke test below against the real hostname.

### rangertrak.com → redirect to .org

`.com` is parked, redirecting to `.org` until it becomes the commercial tier. It is a
**Redirect Rule**, not a Worker, so it costs nothing at runtime and is deleted in one
click when `.com` becomes a real application.

Four proxied placeholder records were added 2026-08-14 so the hostname resolves to
Cloudflare's edge and the rule has traffic to act on:

| Type | Name                 | Content     | Proxied |
| ---- | -------------------- | ----------- | ------- |
| A    | `rangertrak.com`     | `192.0.2.1` | yes     |
| AAAA | `rangertrak.com`     | `100::`     | yes     |
| A    | `www.rangertrak.com` | `192.0.2.1` | yes     |
| AAAA | `www.rangertrak.com` | `100::`     | yes     |

Those addresses are the RFC 5737 documentation range and the RFC 6666 discard prefix —
deliberately unroutable. Because the records are proxied, the redirect fires at the
edge and nothing ever connects to them.

The rule itself (Zone `rangertrak.com` → Rules → Redirect Rules → Create):

- **If** — `hostname` equals `rangertrak.com` **or** equals `www.rangertrak.com`
- **Then** — Dynamic redirect, status **301**, preserve query string
- **Expression** — `concat("https://rangertrak.org", http.request.uri.path)`

Verify with:

```bash
curl -sI https://rangertrak.com/reports | grep -i "^HTTP\|^location"
# expect: HTTP/2 301  +  location: https://rangertrak.org/reports
```

## Smoke test after a deploy

Run in a **real browser**, not headless — see the service worker note below. Against the
`workers.dev` URL first, then the custom domain.

### Routing and assets

- [ ] `/` loads and the app boots with no console errors.
- [ ] A deep link typed directly — `/entry`, `/rangers`, `/reports` — loads instead of
      404ing. This is `not_found_handling: "single-page-application"` working.
- [ ] `/favicon.ico` returns 200.
- [ ] Both map engines render (Leaflet and MapLibre). MapLibre's worker is an `.mjs`
      module worker and browsers refuse to start one unless it is served with a
      JavaScript MIME type — if the MapLibre map is blank, check the `Content-Type` on
      `/assets/maplibre/maplibre-gl-worker.mjs` first.
- [ ] The offline map page renders. The PMTiles basemap is fetched by **HTTP range
      request**; confirm a `.pmtiles` request returns **206 Partial Content**, not 200.
      MIME type and range support are the two ways the previous host broke this page.
- [ ] DevTools → Network, go offline, reload: the app still loads.

### Cache headers

- [ ] `curl -sI https://<host>/ngsw.json | grep -i cache-control` shows `no-cache`.
- [ ] Same for `/ngsw-worker.js` and `/index.html`.

If any of these is missing, [src/\_headers](src/_headers) is not being honored — stop and
fix that before trusting the update flow, because its failure is silent.

### The update path — the item that affects every existing user

This is the one thing that cannot be checked from a single deploy, and it is the reason
installed PWAs kept serving a 2022 build while the origin was dead. **Deploy twice with
different versions**, then against an install made from the *first* deploy:

- [ ] The Log page reports **"Update checks armed"** — silence used to read as success.
- [ ] The app surfaces **"new version ready — reload"** rather than quietly staying stale.
- [ ] Reloading actually lands on the new version.

> **The service worker has never been verified end to end.** Browser testing on
> 2026-08-14 found that `ngsw` registers, activates, and controls the page with no
> errors and a 200 on `/ngsw.json`, but `caches.keys()` stays empty and
> `checkForUpdate()` never settles. That was headless Chrome against the plain Node
> preview server, so it may be an artifact of that environment — or real. **This
> deployment is the first genuine test.** Treat a pass here as the first real evidence,
> and do it in a normal browser so a headless quirk cannot be the explanation.

One diagnostic gotcha specific to this hosting: with
`not_found_handling: "single-page-application"`, a request for a file that does not
exist returns **`index.html` with a 200**, not a 404. So a missing or misnamed asset
reaches the service worker as valid-looking HTML and fails a hash check instead of
returning an honest 404. If `ngsw` misbehaves here, check that every file listed in
`ngsw.json` actually exists in the deployment before suspecting the service worker.

## Rollback

```bash
npx wrangler deployments list
npx wrangler rollback [<version-id>]
```

Rollback reverts the Worker and its assets together. Clients already holding the old
service worker are unaffected; clients on the bad version recover on next load because
`ngsw.json` is not cached.
