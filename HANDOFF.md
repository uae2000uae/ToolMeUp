# ToolMeUp — Handoff

_Last updated: 2026-11-14 · live commit `4a9a812` · Cloud Run revision `toolmeup-00037`_

A **static multi-page website** of free browser tools. Everything runs in the visitor's browser; there's no backend code apart from one nginx proxy. It is served by **nginx on Google Cloud Run**.

Scope rule from the owner: **only features that run in the browser, with no extra hosting cost.**

---

## 1. Ship a change (the normal workflow)

**Deploying = pushing to `master`.** There are no PRs in this repo's history; work is committed straight to `master`, or a side branch is fast-forwarded into it.

```bash
git push origin HEAD:master      # from a worktree/side branch that is ahead of master
```

1. **Bump cache versions** for every JS/CSS file you changed (see §3). Forgetting this is the most common reason a fix "doesn't work" on a phone.
2. Commit and push to `master`.
3. The push fires the **Cloud Build trigger `ToolMeUp-Trigger`**. It runs `cloudbuild.yaml`: Docker build → push to Artifact Registry → `gcloud run deploy`. It takes about 1–2 minutes.
4. Check it:
   ```bash
   gcloud builds list --region=us-central1 --limit=3
   gcloud run services describe toolmeup --region us-central1 --format="value(status.latestReadyRevisionName)"
   ```
   Then `curl` the changed page on the live URL and look for the new `?v=` string.

### Where things live
| Thing | Value |
|---|---|
| Live URL | https://toolmeup-qdyz5ldcyq-uc.a.run.app |
| GCP project / region | `toolmeup` / `us-central1` |
| Cloud Run service | `toolmeup` (1 vCPU / 512 MiB, maxScale 20, startup CPU boost) |
| Images | `us-central1-docker.pkg.dev/toolmeup/toolmeup/toolmeup:<commit sha>` |
| Trigger | `ToolMeUp-Trigger`, **regional (`us-central1`)**, GitHub push to `^master$`, runs as the Compute default service account |
| GitHub | `uae2000uae/ToolMeUp` |

> **Gotcha:** the trigger and its builds are **regional**. Plain `gcloud builds triggers list` and `gcloud builds list` look at the *global* region and show nothing useful (only old failed July builds). Always pass `--region=us-central1`. An earlier version of this file wrongly said "no trigger exists" because of this.

### Rollback
```bash
gcloud run revisions list --service toolmeup --region us-central1 --limit 5
gcloud run services update-traffic toolmeup --region us-central1 --to-revisions=<revision>=100
```
The next push to `master` sends traffic back to the latest revision.

### Manual deploy (only if the trigger is broken)
```bash
gcloud builds submit --region=us-central1 --config cloudbuild.yaml \
  --substitutions=COMMIT_SHA=$(git rev-parse HEAD)
```
Run it from a **clean** checkout: the build context is the working directory (filtered by `.dockerignore`), so uncommitted files would ship.

### Known local issue
- The `gh` CLI fails with **HTTP 401** because the `GITHUB_TOKEN` environment variable holds an invalid token. `git push` is unaffected (it uses Git's own credential manager). Fix it only if you want `gh` (PRs, CI status): remove or replace `GITHUB_TOKEN`, then `gh auth login`.

---

## 2. Run locally

```bash
python -m http.server 8123
```
Open http://localhost:8123/. The Wheel-Size OEM presets on the fitment page won't work locally, because the nginx proxy doesn't run there. Docker isn't installed on this machine, so container builds are only tested by Cloud Build and CI.

**Environment:** Windows 11 · Node 22.16 / npm 10.9 · Python 3.13 · gcloud SDK 524 (authenticated, project `toolmeup`).

---

## 3. Conventions

- **Cache versions.** Assets loaded with `?v=` are cached for one year (`immutable`), and HTML is `no-cache`. When you change a JS or CSS file, bump its `?v=` in **every** HTML page that loads it (one search-and-replace). `ui.css`, `styles.css`, `shared.js` and `kit.js` are loaded by all tool pages.
- **No CDNs for new tools.** Libraries live in `vendor/` (qrcode-generator 1.4.4, pdf-lib 1.17.1, JSZip 3.10.1; licenses in `vendor/LICENSES.txt`) and load with `?v=1`. Keep the CSP strict.
- **i18n.** Static text uses `data-t="key"`; placeholders, titles and aria labels use `data-t-ph`, `data-t-title` and `data-t-aria`. Each page registers its Arabic strings with `ToolMeUp.addStrings({...})`, and dynamic text uses `ToolMeUp.t(key, englishFallback, vars)`. Numbers always use Western digits. `fitment.html` and `wget.html` keep the older "hints only" Arabic mode.
- **Browser storage.** Use `Kit.save` / `Kit.load` (localStorage under the `toolmeup:` prefix, errors swallowed). Nothing is sent to a server.
- **DualShock edits** go in the `Dualshock-tool/` sources. Production serves the gulp bundle built inside the Docker image (`npm run build:prod` in that folder to preview it; output in `dist/`).
- **Custom domain:** set the Cloud Run env var `ALLOWED_REFERER_HOST` (e.g. `toolmeup.com`), or OEM presets return 403 on that domain. Also update `sitemap.xml` and `robots.txt`, which use the run.app URL.

---

## 4. Architecture

### Serving
- `Dockerfile`: three stages. Node 22 builds the DualShock bundle, then nginx 1.28-alpine serves the site. Both base images are pinned by digest. At startup, `default.conf.template` is filled in with `$PORT` and `$WHEEL_SIZE_KEY`.
- `default.conf.template` + `nginx/security-headers*.conf`:
  - gzip on.
  - Security headers: CSP, HSTS, nosniff, X-Frame-Options, Referrer-Policy and Permissions-Policy. DualShock gets a looser CSP.
  - 404 for dotfiles and for build or source files (`*.md`, `*.yaml`, `*.sh`, `*.py`, `package*.json`, `Dockerfile`, …).
  - JSON autoindex for `fenders/` and `rims/`.
  - `/api/wheel-size/*` proxies to `api.wheel-size.com/v2/*`, adding the key on the server side. It allows only `makes`, `models`, `years` and `search/by_model`, requires a Referer of this service or `$ALLOWED_REFERER_HOST`, and limits each IP to 10 req/min.
- CI (`.github/workflows/ci.yml`, on push to `master`): static checks (`scripts/ci-checks.sh`), a Docker build + nginx smoke test, and Lighthouse with warn-only budgets (`lighthouserc.json`). CI does **not** deploy; the Cloud Build trigger does.

### Front-end platform
- **`shared.js`:** `TOOLS` and `CATEGORIES` are the single source of truth. The header menu, home cards and category chips, breadcrumbs and "recently used" are all generated from them. To add a tool, add one entry (en + ar text, icon, tags) and create the page.
- **Page template:** copy an existing tool page (e.g. `units.html`). The page needs:
  - `<html data-i18n="full" data-tool="<id>">`;
  - `boot.js` in `<head>`, which applies theme and RTL before first paint;
  - `styles.css` + `ui.css`;
  - `<main class="container tp" data-hue="…">`;
  - `shared.js` → `kit.js` → the page script at the end of `<body>`.
- **`ui.css`:** the design system: tokens, cards, tabs, fields, pills, switches, drop zones, toasts and how-to sections, plus one section per tool. It uses logical CSS properties, so RTL works automatically.
- **`kit.js`:** helpers: `tabs` (deep links via `#tab`), `copy`/`toast`, `download`, `drop`, `keepInputs`, `save`/`load`, number formatting, `onLang`/`onTheme`, `debounce`.

### Tools
| Page | Tool | Notes |
|---|---|---|
| `index.html` | Home | Hero, live search (`/` key), category chips, "recently used", privacy promises |
| `fitment.html` | Wheel & Tire Fitment | `app.js` (~2,000 lines) + `oem-presets.js`. Canvas drawings, front/rear mode, compare setups, sessions in localStorage. Rims preload one at a time in click order after `load` (no flicker) |
| `calculators.html` | Calculator Suite | Basic (keyboard input, history), percentage, loan with yearly chart, savings, video ratio/resolution, BMI |
| `units.html` | Unit Converter | 10 categories; shows every unit at once; arithmetic in the input (`5*12`, shared `Kit.parse`). Fuel economy moved to `fuel.html`: a dashed "Fuel & energy" box links there, and old `units.html#fuel` links redirect |
| `fuel.html` | Fuel & Energy Converter | `fuel.js`. Everything reduces to energy per distance (MJ/km), so fuel units (L/100 km, mpg US/UK, km/L, km/kg, m³…), EV units (kWh/100 km, Wh/km, mi/kWh), equivalents (MPGe, Le/100 km, MJ, BTU) and tailpipe CO₂ all convert into each other. 7 fuels (petrol, diesel, E85, LPG, CNG, H₂, electric) with typical LHV/CO₂ figures in `FUELS`. Log energy scale vs typical cars; tabs: Convert, From a fill-up, Trip cost (split, range, refills), Compare two cars (yearly cost, CO₂). State in `toolmeup:fuel:state` |
| `datetime.html` | Date & Time | World clock, shareable countdown, age with Hijri date, business days, add/subtract dates |
| `devtools.html` | Developer Tools | JSON (error line and column), regex (Web Worker with a 1.2 s kill switch), Base64, UUID v4/v7, lorem ipsum |
| `qr.html` | QR Generator | Link, Wi-Fi, vCard, WhatsApp, email, phone, SMS; square/rounded/dot styles, colors, logo (forces ECC H), contrast warning; PNG/SVG/copy. The preview sits under the Style card. A corner mini preview shows while the main code is scrolled away. **Download history:** the last 20 entries are kept in localStorage (`toolmeup:qr:history`) and can be loaded back with a click. Logos aren't stored |
| `images.html` | Image Compressor | Batch; JPG/WebP/PNG/AVIF; before/after slider; ZIP |
| `pdf.html` | PDF Merge & Split | Merge with reordering and page ranges; split via a page grid; ZIP output |
| `tires.html` | Tire Size & Speedometer | Metric and flotation sizes, to-scale drawings, ±3% verdict, speedometer table |
| `wget.html` | Wget | wget-style downloader in the browser |
| `Dualshock-tool/` | DualShock Tool | Vendored WebHID calibration app (MIT; credits the_al & Mathias Malmqvist). Re-themed and bundled at build time. The upstream analytics and usage beacon were removed |

**SEO:** every page has a `<title>`, meta description, Open Graph tags, a JSON-LD `WebApplication` block, a breadcrumb, and a "How to use" + FAQ section in both languages.

---

## 5. Open work

| Priority | Item | Notes |
|---|---|---|
| P0 | **Shrink the rim/brake artwork** | Still ~41 MB on the fitment page (Break-disk 11 MB, Rim2 8.5 MB). These are Illustrator exports with embedded bitmaps. Export WebP/AVIF at ~1024 px, or `svgo --multipass` and strip the embedded PNG: about 1–2 MB in total. Keep the master files outside `static/` |
| P1 | Real-device testing | QR landscape layout and scanning, very large PDFs and images, and a real controller over WebHID haven't been tested on hardware |
| P2 | DualShock dev toolchain | 16 `npm audit` findings remain (no critical); they need breaking upgrades. Build-only, so users aren't exposed |
| P2 | Cold starts | `/` took ~1.1 s on a first hit. `--min-instances=1` fixes it for a few $/month; it's skipped because of the no-extra-cost rule |
| P2 | Translations | DualShock's non-Arabic languages fall back to English for the 19 newer strings |

### Done (2026-11-12 → 11-14)
- **Serving:** gzip; `.dockerignore` and nginx stop serving build files; the Wheel-Size proxy is locked down; security headers; immutable caching for `?v=` assets; base images pinned.
- **Clean-up:** upstream trackers removed (GA `G-FSXPMDXLLS`, the Search Console file, the `the.al` beacon). `.idea/`, reference photos and `.ai`/`.tif` files are untracked; backups are in `Drawing/repo-archive-2026-11-12/` in the main checkout.
- **Fixes:** the favicon is no longer the 290 KB SVG; each fender is fetched once; DualShock is bundled (49 → 12 requests) and the missing translation keys are added; Wget's JSZip SRI hash is fixed.
- **CI:** static checks, Docker smoke test and Lighthouse on every push.
- **Deploys:** automatic through `ToolMeUp-Trigger`.
- **New tools:** Phase 0 & 1 platform + seven new tools; the calculators WIP was finished and shipped.
- **QR:** the landscape aspect-ratio fix, new layout, corner preview and download history.

---

## 6. Baseline measurements (2026-11-12, before the fixes above)

Kept for comparison. The code and transfer numbers improved after gzip and bundling. The artwork numbers still stand until P0 is done.

| Fitment page asset | Raw | gzip |
|---|---|---|
| `rims/Break-disk.svg` (SVG wrapping a base64 PNG) | 11.2 MB | 8.5 MB |
| `rims/Rim2.svg` | 8.5 MB | 6.4 MB |
| Rim1/3/4/6 | 3.5–4.3 MB each | ~75% |
| Rim0/5/7, 3 fenders, Wheel_Assembly | 0.3–1.9 MB each | ~70% |
| HTML + CSS + JS (all code) | 146 KB | 43 KB |
| **Total** | **41.2 MB** | **30.8 MB** |

- On ~10 Mbps 4G the fitment page needs **~35 s** to load its images. Decode cost: Break-disk 264 ms, Rim2 182 ms. Canvas redraws take <1 ms.
- Production timing (one curl sample each): `/` 1.11 s (cold start), `/fitment.html` 0.40 s, `Rim2.svg` 3.89 s for 8.8 MB.
- Container verification (Cloud Build `6db69935`): the image builds, `nginx -t` passes, and the web root is 44.9 MB. **Smoke tests: 47/47 passed** (status codes, gzip, CSP, cache headers, proxy allow-list, Referer check and 429 rate limit).
- **Method:** Node `zlib` for sizes; `python -m http.server` + the Chromium Performance API for page metrics; `curl -w` for production.
