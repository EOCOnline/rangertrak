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

### `html_handling: "none"` — required, and not cosmetic

[wrangler.jsonc](wrangler.jsonc) sets `assets.html_handling` to `"none"`. Do not remove
it. The default (`auto-trailing-slash`) answers a request for `/index.html` with a **307
to `/`**. The Angular service worker prefetches `/index.html`, follows that redirect, and
then calls `cache.put()` — which the Cache API **refuses** for a redirected response,
throwing a `TypeError`. The install aborts, `ngsw` caches nothing at all, and the app
silently has no offline capability and never notices a new version.

Confirmed 2026-08-14 by hashing every URL in `ngsw.json`'s prefetch group against what
the site actually served: `/index.html` was the single mismatch, returning 0 bytes (the
307's empty body) where a SHA-1 was expected. Every other file matched.

To check it is still right: `curl -sI https://<host>/index.html` must return **200**, not
307.

### PMTiles needs byte serving, and the asset store does not do it

Workers' static-asset store ignores `Range` and returns the whole file with a 200.
`pmtiles` reads its header and directory by byte range, so the offline map rendered blank
with *"Check that your storage backend supports HTTP Byte Serving"*.

[worker/index.js](worker/index.js) is a Range shim for `/assets/maps/*.pmtiles` **only** —
`run_worker_first` in [wrangler.jsonc](wrangler.jsonc) routes just those paths through the
Worker, so every other request is still served straight from the asset store with no
Worker invocation. The file is ~1.7 MB, small enough to buffer and slice. **If the basemap
ever grows past a few tens of MB, move it to R2** (which does byte serving natively)
rather than raising the buffer.

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

**Done, and declared in [wrangler.jsonc](wrangler.jsonc)** rather than clicked into the
dashboard, so the hostname mapping is reviewable and reproducible:

```jsonc
"routes": [
  { "pattern": "rangertrak.org", "custom_domain": true },
  { "pattern": "www.rangertrak.org", "custom_domain": true }
]
```

`wrangler deploy` creates the custom domains, the proxied DNS records and the
certificate. **Do not hand-create A/AAAA records for these names**, and do not add the
same custom domains through the dashboard — the config already owns them.

⚠️ **Both hostnames serve the app, and that is a data-loss hazard — fix it.** `www`
does not redirect to the apex, so `https://rangertrak.org` and `https://www.rangertrak.org`
are **different origins**, with **separate localStorage**. A scribe who opens one today and
the other tomorrow finds a different mission, a different roster and different field
reports, with nothing to indicate data is missing. Observed live 2026-08-14: the two
hostnames held settings a year apart.

**DECIDED 2026-08-14: `https://rangertrak.org` (no `www`) is the canonical URL.**
`www.rangertrak.org` redirects to it via a **Page Rule** on the `.org` zone — dashboard,
not the repo, and not a Worker change:

- **URL (trigger)** — `www.rangertrak.org/*`
- **Setting** — Forwarding URL, **301** Permanent Redirect
- **Destination** — `https://rangertrak.org/$1`

**The `*` and the `$1` are two halves of one mechanism and are not interchangeable.** The
`*` in the trigger *captures*; `$1` in the destination *replays* what the first `*` matched.
Putting `$1` in the trigger makes it a literal match for a path of `$1`, which no request
ever has, so the rule silently never fires and traffic falls through to the app — looking
exactly like no rule at all. Both mistakes were made here on the way to getting this right.

**Path is preserved for `www` → apex, and deliberately not for `.com` → `.org` (below).**
That asymmetry is intentional: `www.rangertrak.org` is an alias for *this* app with *these*
routes, so `www…/reports` must land on `/reports`; `rangertrak.com` is parked and will
become a different product with routes of its own, so mapping its paths onto `.org` would
be wrong the moment it has any.

⚠️ **Whatever rule you write, scope it to the `www` hostname explicitly.** A rule matching
the zone rather than the hostname also matches the apex, which then redirects to itself
forever. That is not hypothetical — it took the site down for every new visitor while CI
stayed green and the cached PWA hid it from everyone already installed. `check-deployed.js`
now catches it (see "Post-deploy verification"), but the rule is where it starts.

Until the redirect is live, tell users to always use the same URL. There is no way for the
app to merge the two stores after the fact.

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

**Live 2026-08-15**, as two Page Rules on the `rangertrak.com` zone — Page Rules match one
hostname each, so the apex and `www` need one apiece:

| # | URL (trigger)          | Setting                                         |
| - | ---------------------- | ----------------------------------------------- |
| 1 | `rangertrak.com/*`     | Forwarding URL, 301 → `https://rangertrak.org/` |
| 2 | `www.rangertrak.com/*` | Forwarding URL, 301 → `https://rangertrak.org/` |

**No `$1`, deliberately — every `.com` URL lands on the `.org` root.** `.com` is parked and
becomes a different product later, so carrying its paths across would be wrong now and
actively broken once `.com` has routes of its own. This is the opposite of the `www` → apex
rule above, and the difference is the point.

Verify with:

```bash
curl -sI https://rangertrak.com/reports | grep -i "^HTTP\|^location"
# expect: HTTP/2 301  +  location: https://rangertrak.org/   (root, not /reports)

curl -sL -o /dev/null -w "%{http_code} after %{num_redirects} hop(s) -> %{url_effective}\n" \
  https://rangertrak.com/
# expect: 200 after 1 hop(s) -> https://rangertrak.org/
```

Both verified passing on 2026-08-15.

## Smoke test after a deploy

Run in a **real browser**, not headless — see the service worker note below.

> The `workers.dev` URL returns 404 now that the custom domains are attached; test
> against `https://rangertrak.org` directly.

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
- [ ] `curl -sI https://<host>/index.html` returns **200, not 307** — see
      `html_handling` above. A 307 here means no offline support and no update
      detection, silently.
- [ ] `curl -sI -H 'Range: bytes=0-99' https://<host>/assets/maps/vashon.pmtiles`
      returns **206** with a `Content-Range` header.

If any of these is missing, [src/\_headers](src/_headers) is not being honored — stop and
fix that before trusting the update flow, because its failure is silent.

### The update path — the item that affects every existing user

This is the one thing that cannot be checked from a single deploy, and it is the reason
installed PWAs kept serving a 2022 build while the origin was dead. **Deploy twice with
different versions**, then against an install made from the *first* deploy:

- [ ] The Log page reports **"Update checks armed"** — silence used to read as success.
- [ ] The app surfaces **"new version ready — reload"** rather than quietly staying stale.
- [ ] Reloading actually lands on the new version.

> **VERIFIED 2026-08-14, end to end.** An install made from the 0.13.0 deploy detected
> 0.14.0 and offered it on both surfaces: the standing footer button ("New version ready
> - reload") and the snackbar ("A new version of RangerTrak is available - Reload now").
> The footer's "(checked ...)" stamp was current.
>
> This also settles whether `ngsw` populates its caches: `VERSION_READY` is only emitted
> after the service worker has downloaded and cached the *entire* new version, so caching
> works. Headless Chrome reporting an empty `caches.keys()` was an artifact of that
> environment, not a fault in the deployment - which is exactly why this checklist says to
> run in a real browser.

One diagnostic gotcha specific to this hosting: with
`not_found_handling: "single-page-application"`, a request for a file that does not
exist returns **`index.html` with a 200**, not a 404. So a missing or misnamed asset
reaches the service worker as valid-looking HTML and fails a hash check instead of
returning an honest 404. If `ngsw` misbehaves here, check that every file listed in
`ngsw.json` actually exists in the deployment before suspecting the service worker.

That hypothesis proved correct on the first real deploy, though by a different route: it
was not a *missing* file but `/index.html` itself, redirected. The diagnostic is the same
one, and it is worth running first — fetch every URL in `ngsw.json`, SHA-1 each body, and
compare against the manifest's `hashTable`. The mismatch names the culprit immediately.

## Rollback

```bash
npx wrangler deployments list
npx wrangler rollback [<version-id>]
```

Rollback reverts the Worker and its assets together. Clients already holding the old
service worker are unaffected; clients on the bad version recover on next load because
`ngsw.json` is not cached.
