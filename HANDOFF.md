# ToolMeUp — Handoff, Health Check & Benchmarks

_Snapshot: 2026-11-12 · commit `7ddd26d` ("Version 1.1.5", 2026-08-03) · branch `master`_

---

## 1. What this is

A **static multi-page website** (no backend code, no build step for the main site) of free browser tools, served by **nginx on Google Cloud Run**.

| Page | Files | What it does |
|---|---|---|
| Home | `index.html`, `shared.js`, `base.html`, `styles.css` | Tool cards rendered from the `TOOLS` list in `shared.js`; shared header/nav injected from `base.html`; dark mode + Arabic toggle (localStorage) |
| Wheel & Tire Fitment | `fitment.html`, `app.js` (~2,000 lines), `oem-presets.js` | Canvas drawings of wheel/tire setups, compare setups, sessions in localStorage. OEM presets come from the Wheel-Size API through the nginx proxy |
| Wget | `wget.html`, `wget.js` | wget-style downloader in the browser (fetch) |
| DualShock Tool | `Dualshock-tool/` | Vendored third-party WebHID controller calibration app (MIT; credits the_al & Mathias Malmqvist), re-themed with `css/toolmeup-theme.css`. ES modules served unbuilt; has its own gulp/npm toolchain that production does not use |

**Assets:** `static/images/` is **66 MB** (rims 39 MB, wheels 20 MB of reference photos, `temp/` 3.9 MB). `.ai`, `.tif` and stock photos are committed to git.

### Deployment
- `Dockerfile`: `nginx:1.27-alpine`, copies the whole repo into the web root, and fills in `default.conf.template` with `$PORT` and `$WHEEL_SIZE_KEY` at startup.
- `default.conf.template`: `/api/wheel-size/*` proxies to `api.wheel-size.com/v2/*` and adds the secret key on the server side. JSON autoindex is on for `fenders/` and `rims/` (app.js uses it to find new SVGs automatically). Static assets get a 1h cache.
- **Live:** Cloud Run service `toolmeup` in GCP project `toolmeup`, `us-central1`, URL `https://toolmeup-qdyz5ldcyq-uc.a.run.app`, revision `toolmeup-00033`. Limits: 1 vCPU / 512 MiB, maxScale 20, startup CPU boost on.
- `cloudbuild.yaml` describes build → push → deploy, but **no Cloud Build trigger exists** (`gcloud builds triggers list` returns nothing). The trigger in the comments filters on `^main$`, but the repo branch is **`master`**. So deploys are currently manual.

### Local environment
Windows 11 · Node 22.16 / npm 10.9 · Python 3.13 · gcloud SDK 524 (authenticated, project `toolmeup`) · **Docker not installed** (so container builds can't be tested locally). Remote: `github.com/uae2000uae/ToolMeUp`.

### ⚠️ Work in progress that is NOT committed (in the main checkout)
`base.html`, `shared.js` and `styles.css` are modified, and `calculators.html` + `calculators.js` are untracked. This looks like a new "Calculators" tool. The main checkout also has `Drawing/` and `Expantion-ideas/` (gitignored). **Commit or stash the WIP before the next deploy:** the Dockerfile copies the working directory, so a deploy from that checkout would ship the unfinished code.

### Run locally
```bash
python -m http.server 8000
```
Then open http://localhost:8000/fitment.html. app.js can also read the Python server's HTML directory listing. OEM presets won't work locally because there is no proxy.

---

## 2. Health check

| Check | Result |
|---|---|
| JS syntax: `app.js`, `shared.js`, `oem-presets.js`, `wget.js`, all 20 DualShock modules (`node --check`) | ✅ pass |
| JSON: 23 language files + 2 manifests | ✅ all valid |
| Local `src`/`href` references in all HTML + `static/` paths in app.js | ✅ none missing |
| Browser console errors (fitment, home, DualShock pages) | ✅ none |
| Tests / linter / CI | ❌ none exist |
| DualShock translations (`scripts/check_translations.py`) | ⚠️ **19 strings missing from all 23 languages** (deadzone/finetune/firmware UI). The script also crashes on Windows unless you run `python -X utf8` |
| `npm audit` (DualShock dev toolchain) | ⚠️ 23 vulns (1 critical `shell-quote`, 16 high). **Dev-only:** production doesn't use the gulp build, so users aren't exposed. Several have no fix (`gulp-htmlmin`, `rollup-stream`) |
| Production: compression | ❌ **No gzip/brotli.** nginx:alpine has gzip off by default |
| Production: exposed files | ❌ `/cloudbuild.yaml` (includes the project number) and `/Dualshock-tool/package.json` are publicly served (HTTP 200) |
| Production: security headers | ❌ No CSP, HSTS, X-Content-Type-Options, Referrer-Policy or frame-ancestors |
| Wheel-Size proxy | ⚠️ Open: anyone can call `/api/wheel-size/*` and use up your API quota. No rate limit, no Referer/Origin check |
| Third-party tracking | ⚠️ DualShock page loads Google Analytics `G-FSXPMDXLLS` and has a Search Console verification file (`googlec4c2e36a49e62fa3.html`), both probably carried over from the upstream project. Confirm they're yours; if not, your visitors' data is going to someone else's analytics. The home page says "nothing is uploaded to a server", which GA on the DualShock page partly contradicts |
| Repo hygiene | ⚠️ `.idea/` (including `workspace.xml` and a .docx) is tracked; 20 MB of reference/stock images and `.ai`/`.tif` source files are in git and in the production image; commit messages repeat ("Version 1.1.4" ×12), so history is hard to read |

---

## 3. Benchmarks

### Production (curl from this machine, one sample each)
| Request | TTFB | Total | Bytes | Encoding |
|---|---|---|---|---|
| `/` (first hit, probably a cold start) | 1.11 s | 1.11 s | 2.2 KB | none |
| `/fitment.html` | 0.40 s | 0.40 s | 10 KB | none |
| `/app.js` | 0.40 s | 0.75 s | 86 KB | none |
| `/static/images/rims/Rim2.svg` | 0.61 s | **3.89 s** | **8.8 MB** | none |
| `/Dualshock-tool/index.html` | 0.40 s | 0.48 s | 28 KB | none |

### Page weight (local server, Chromium, warm disk)
| Page | Requests | Transfer | DOMContentLoaded | Load |
|---|---|---|---|---|
| Home | 7 | ~37 KB local + 47 KB font | 28 ms | 28 ms |
| **Fitment** | 25 | **42.2 MB** | 449 ms | 1,403 ms (local; on real networks it's much slower — see below) |
| DualShock | 49 | 729 KB (3 CDNs + GA) | 2,815 ms | 3,483 ms |

**Where the fitment page's 42 MB goes:** app.js preloads **every** rim plus the brake disk on page load, even though only 1–2 are visible.

| Asset | Raw | gzip | brotli |
|---|---|---|---|
| `rims/Break-disk.svg` (an SVG wrapping a base64 PNG) | 11.2 MB | 8.5 MB | 8.3 MB |
| `rims/Rim2.svg` | 8.5 MB | 6.4 MB | 6.3 MB |
| Rim1/3/4/6 | 3.5–4.3 MB each | ~75% | ~74% |
| Rim0/5/7, 3 fenders, Wheel_Assembly | 0.3–1.9 MB each | ~70% | ~69% |
| `favicon.svg`, `logo.svg` (each) | 290 KB | 212 KB | 207 KB |
| HTML + CSS + JS (all code) | 146 KB | 43 KB | 37 KB |
| **Total** | **41.2 MB** | **30.8 MB** | **30.1 MB** |

What this means:
- Turning on gzip saves only about 25%. **The problem is the artwork, not missing compression.** These are Illustrator exports full of traced paths and embedded bitmaps.
- At a typical 4G speed (~10 Mbps) the fitment page needs **~35 s** to finish loading its images. On a capped mobile data plan, each visit costs ~42 MB.
- Image decode cost: Break-disk 264 ms, Rim2 182 ms, Rim5 14 ms. Once decoded, canvas redraws take <1 ms, so rendering itself is fast.
- `sport.svg` and `SUV.svg` are downloaded twice: once as `<img>` and once via `fetch` to read the wheel-opening circle.
- DualShock: 49 requests because the ES modules aren't bundled, which delays DOMContentLoaded by ~2.8 s.

---

## 4. Recommendations (in priority order)

### P0: do first (big win, low effort)
1. **Shrink the rim/brake artwork.** It is only drawn onto canvases a few hundred px wide, so export each rim as a **WebP/AVIF at about 1024×1024**, or run `svgo --multipass` and strip the embedded PNG. Expect each file to drop to roughly 50–200 KB, about 1–2 MB in total instead of 41 MB (~95% smaller). Keep the master files outside `static/`.
2. ~~Lazy-load rims~~. **Decision: keep preloading**, because loading rims on demand caused visible image swapping. **Done (2026-11-12):** rims now preload one at a time in click order (Rim1 first) after the page `load` event, and each is decoded before use. A click on a rim that isn't ready yet keeps the current rim on screen with a dashed "loading" ring, then switches straight to the new rim (no Rim0 flash). Repeated clicks queue. The brake disk is also decoded before it's first drawn. This fixes the flicker but not the total download size, so step 1 is still the size fix.
3. **Turn on compression in nginx** (add to the server block in `default.conf.template`):
   ```nginx
   gzip on; gzip_comp_level 6; gzip_min_length 1024;
   gzip_types text/css application/javascript application/json image/svg+xml text/plain;
   ```
   This saves ~70% on HTML/JS/CSS/JSON.
4. **Stop serving build files:** add `cloudbuild.yaml`, `HANDOFF.md`, `*.md`, `Dualshock-tool/package.json`, `static/images/temp`, `static/images/wheels`, `**/*.ai` and `**/*.tif` to `.dockerignore`. That also makes the image ~25 MB smaller.
5. **Deal with the uncommitted calculators work** before any deploy (see §1).

### P1: soon
6. **Protect the Wheel-Size proxy:** allow only the endpoints the app uses (`makes|models|years|search/by_model`), check `Referer`/`Origin`, and add `limit_req_zone` (for example 10 requests/min per IP). This stops strangers from using up your quota.
7. **Add security headers:** `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and a CSP that allows only fonts.googleapis/gstatic, cdn.jsdelivr, code.jquery and GA.
8. **Cache properly:** fitment.html already uses `?v=` query strings, so `.js`/`.css`/images can use `Cache-Control: public, max-age=31536000, immutable`. Keep HTML on `no-cache`. Apply the same versioning to `wget.html` and `index.html`, which currently use bare URLs.
9. **Automate deploys:** create the Cloud Build trigger with branch `^master$` (not `^main$`), or a GitHub Action. Pin the base image digest.
10. **Check the GA tag and the Google verification file** on the DualShock page. Replace them with your own or remove them, and update the "nothing is uploaded" wording.

### P2: improvements
11. **Repo cleanup:** untrack `.idea/` (`git rm -r --cached .idea`, then add it to `.gitignore`), and move the reference photos and `.ai`/`.tif` files out of git, either to Git LFS or to `Drawing/`.
12. **Smaller fixes:** shrink `favicon.svg` (290 KB is more than 100× normal; use the PNGs or a simplified SVG), self-host the Inter font or use `font-display: swap` (already set), and avoid the double fender fetch (fetch the text once, then build an Object URL for the `<img>`).
13. **DualShock:** add the 19 missing translation keys to `lang/*.json`; bundle the modules with the existing rollup config (49 → about 8 requests); run `npm audit fix` (non-breaking) for the dev toolchain.
14. **Basic quality gates:** add a small CI job that runs `node --check` on the JS files, validates the JSON files, runs the translation check, and runs Lighthouse CI on `fitment.html` with a budget (for example ≤ 3 MB total, LCP ≤ 2.5 s).
15. **Cold starts:** `/` took 1.1 s on its first hit. If that matters, set `--min-instances=1` (it costs a few $/month); otherwise leave it.

### Expected result after P0
| Metric | Now | After P0 (estimate) |
|---|---|---|
| Fitment page transfer | 42 MB | ~1–3 MB |
| Fitment full load on 4G | ~35 s | ~2–3 s |
| Code transfer (HTML/JS/CSS) | 146 KB | ~43 KB |
| Docker image web root | ~68 MB | ~5 MB |

---

## 5. How these numbers were measured
- Asset sizes: Node `zlib` (gzip level 6, brotli quality 11) on the committed files.
- Page metrics: `python -m http.server` + Chromium Performance API (navigation/resource timing; decode measured with `img.decode()`).
- Production: `curl -w` with `Accept-Encoding: gzip, br`, one sample each (results will vary).
- Static checks: `node --check`, `JSON.parse`, `scripts/check_translations.py`, `npm audit --package-lock-only`, `gcloud run services describe`.
- **Not covered:** Lighthouse/Core Web Vitals under throttling, real-device testing, WebHID with a real controller, the Wheel-Size API itself (I didn't call it, to avoid using your quota), and the Docker build (Docker isn't installed here).

---

## 6. Status update (2026-11-12): what has been done

| # | Item | Status |
|---|---|---|
| P0-1 | Shrink rim/brake artwork | **Open.** Still 41 MB; needs re-exported art |
| P0-2 | Compression | ✅ gzip on in `default.conf.template` |
| P0-3 | Stop shipping build/source files | ✅ `.dockerignore` rewritten; nginx also returns 404 for dotfiles, `*.md/yaml/sh/py/ai/tif`, `package*.json`, `Dockerfile` etc. |
| P0-4 | Uncommitted calculators WIP | ✅ Saved on branch **`wip/calculators`** (`062065b`). The main checkout was left untouched |
| P1-5 | Wheel-Size proxy | ✅ Only `makes`, `models`, `years` and `search/by_model` are allowed (all other `/api/` paths return 404). Referer must be this service's `*.run.app` URL or `$ALLOWED_REFERER_HOST`. Limit is 10 req/min per client IP (burst 10), keyed on the last `X-Forwarded-For` hop |
| P1-6 | Security headers | ✅ CSP, HSTS, nosniff, X-Frame-Options, Referrer-Policy, Permissions-Policy (`nginx/security-headers*.conf`). The DualShock tool gets a looser CSP because it uses inline handlers and CDNs |
| P1-7 | Caching | ✅ HTML is `no-cache`. Assets requested with `?v=` are cached 1 year and marked `immutable`; other assets 1 h. `index.html` and `wget.html` now use `?v=` too |
| P1-8 | Automated deploys | ⚠️ **Partly done.** Base images are pinned by digest (nginx 1.28-alpine, node 22-alpine) and `cloudbuild.yaml` now uses `^master$`. **You still need to:** connect GitHub in Console → Cloud Build → Repositories (one-time OAuth), then run the `gcloud builds triggers create` command in `cloudbuild.yaml` |
| P1-9 | Upstream trackers | ✅ Removed GA `G-FSXPMDXLLS` and the Google verification file (both confirmed to be the upstream project's). Also **disabled the upstream `the.al` usage beacon**, which sent controller serials and Bluetooth addresses to the original author. Home page wording updated |
| P2-10 | Repo cleanup | ✅ `.idea/`, `static/images/temp`, `static/images/wheels`, `*.ai` and `*.tif` are untracked and gitignored (65 files). Backup copies are in `Drawing/repo-archive-2026-11-12/` in the main checkout |
| P2-11 | Favicon / fender double fetch | ✅ The 290 KB SVG favicon is no longer linked (PNG/ICO are used); `favicon.svg` is kept because the `wip/calculators` page still links it. Each fender SVG is now fetched once, and the `<img>` is built from a blob of the same bytes |
| P2-12 | DualShock | ✅ All 19 missing keys are added (Arabic translated; other languages fall back to English). The tool is now **bundled at Docker build time** (49 → 12 requests). `npm audit fix` brought vulns from 23 → 16 (no critical); the rest need breaking upgrades and are build-only |
| P2-13 | CI | ✅ `.github/workflows/ci.yml` runs static checks (`scripts/ci-checks.sh`), a Docker build + nginx smoke test (gzip, headers, 404s, proxy rules, caching), and Lighthouse with warn-only budgets (`lighthouserc.json`) |
| extra | Wget JSZip | ✅ Fixed a wrong SRI hash (the jsDelivr copy was always blocked) and pinned the same hash on all three CDN fallbacks |
| extra | DualShock icons | ✅ Favicon and manifest links were root-relative (`/favicon-32x32.png`), so they 404'd under `/Dualshock-tool/`. They are now relative |

### New conventions
- **When you change a JS or CSS file, bump its `?v=` in every HTML page that loads it.** These assets are now cached for a year, so a forgotten bump means users keep the old file. `styles.css` and `shared.js` are loaded by index, fitment and wget (and calculators).
- **Custom domain:** set the Cloud Run env var `ALLOWED_REFERER_HOST` (e.g. `toolmeup.com`), or OEM presets will return 403 on that domain.
- **Merging this branch into `master` will delete `.idea/` from your working copy** (it is now untracked). Afterwards, restore it from `Drawing/repo-archive-2026-11-12/.idea/`. Git now ignores it.
- **DualShock edits** go in `Dualshock-tool/` sources. Production serves the gulp bundle (`npm run build:prod` in that folder to preview it; output in `dist/`).

### Verification
- **Container (Cloud Build `6db69935`, build + test only, nothing pushed or deployed):** the image builds, including the DualShock gulp stage. `nginx -t` passes on nginx 1.28.3. The web root is 44.9 MB, down from about 68 MB; the remaining bulk is the rim SVGs.
- **Smoke tests: 47/47 passed.**
  - Pages return 200; build, config and source files return 404.
  - gzip works on JS and SVG.
  - The right CSP is served on main pages and on DualShock, along with `nosniff`.
  - Cache headers: 1 year for `?v=` assets, 1 h for unversioned assets, `no-cache` for HTML. `server_tokens` is off.
  - Wheel-Size proxy: unknown endpoints return 404; a missing or foreign Referer returns 403; an allowed Referer is forwarded to Wheel-Size. The rate limit returns 429 per client IP and doesn't affect other IPs.
  - The rim and fender JSON listings work. DualShock is bundled, and GA is gone.
- **Browser (local, same CSP headers):** all four pages load with no CSP errors. DualShock modals, icons and theme work. Fenders draw from the single fetch, and JSZip loads with the corrected hash.
- **Not tested:** the live Wheel-Size API with the real key (the test used a dummy key), and a real controller over WebHID.

---

## 7. Phase 0 & 1: tool platform and new tools (2026-11-12)

The scope was set by the user (see `Expantion-ideas/` in the main checkout): **only features that run in the browser, with no extra hosting cost.**

### What was built
| Page | Tool | Notes |
|---|---|---|
| `index.html` | New home | Hero, live search (`/` key), category chips, "recently used", privacy promises |
| `calculators.html` | Calculator Suite (finished from the WIP) | Basic calculator with keyboard input and history; percentage; loan with yearly chart; savings with monthly deposits; video ratio and resolution comparison; BMI gauge |
| `units.html` | Unit Converter | 11 categories, including fuel economy, power and torque. Shows every unit at once; arithmetic in the input (`5*12`) |
| `datetime.html` | Date & Time | World clock with a time-shift slider; shareable countdown (`#countdown?t=…&n=…`); age with Hijri date; date difference with business days (Sat–Sun or Fri–Sat weekend); add/subtract dates |
| `devtools.html` | Developer Tools | JSON (exact error line and column, syntax colors, sort keys); regex (runs in a Web Worker with a 1.2 s kill switch); Base64 (UTF-8, URL-safe, file → data URL); UUID v4/v7 plus inspector; lorem ipsum (Latin and Arabic) |
| `qr.html` | QR Generator | Link, Wi-Fi, vCard, WhatsApp, email, phone, SMS; square/rounded/dot styles; colors; logo (forces ECC H); contrast warning; PNG/SVG/copy |
| `images.html` | Image Compressor | Batch processing; JPG/WebP/PNG/AVIF; quality; max size or %; before/after slider; ZIP; keeps the original if it would grow |
| `pdf.html` | PDF Merge & Split | Merge with drag-to-reorder and per-file page ranges; split via a page-tile grid (shift-click ranges): extract, remove, or split every N pages to a ZIP |
| `tires.html` | Tire Size & Speedometer | Metric and flotation sizes; table plus to-scale side and front drawings; ±3% verdict; speedometer dial and table (km/h or mph) |

### Architecture (how to add the next tool)
- **`shared.js`:** `TOOLS` and `CATEGORIES` are the single source of truth. The header menu (grouped), home cards and chips, the **Ctrl/⌘K quick-search palette**, breadcrumbs and "recently used" are all generated from them. To add a tool, add one entry (en + ar text, icon path, tags) and create the page.
- **Page template:** copy any new tool page (e.g. `units.html`). The page needs:
  - `<html data-i18n="full" data-tool="<id>">`;
  - `boot.js` in `<head>`, which applies theme and RTL before first paint;
  - `styles.css` + `ui.css`;
  - `<main class="container tp" data-hue="<category hue>">`;
  - `shared.js` → `kit.js` → page script at the end of `<body>`.
- **`ui.css`:** the design system: tokens, cards, segmented tabs, fields, stats, pills, switches, drop zones, toasts, how-to sections, plus one section per tool. It uses logical CSS properties, so RTL works automatically.
- **`kit.js`:** helpers: `Kit.tabs` (deep links via `#tab` and remembers the last tab), `copy`/`toast`, `download`, `drop` (drag, click or paste), `keepInputs` (`data-keep` inputs persist), number formatting, `onLang`/`onTheme`.
- **i18n:**
  - Static text uses `data-t="key"`, and placeholders, titles and aria labels use `data-t-ph`, `data-t-title` and `data-t-aria`.
  - Each page registers its Arabic strings with `ToolMeUp.addStrings({...})`. Dynamic text uses `ToolMeUp.t(key, englishFallback, vars)`.
  - Numbers always use Western digits.
  - `fitment.html` and `wget.html` keep the older "hints only" Arabic mode.
- **Libraries are hosted on the site** in `vendor/` (licenses in `vendor/LICENSES.txt`): qrcode-generator 1.4.4, pdf-lib 1.17.1 and JSZip 3.10.1. They load with `?v=1`, so they're cached for a year. Keep the CSP strict: never add a CDN for a new tool.
- **Cache versions:** all pages now load `styles.css`, `ui.css`, `shared.js`, `kit.js` and the page scripts with `?v=20261112p`. When you change any of them, **bump the version on every page** (one search-and-replace).

### SEO
- Every page has a descriptive `<title>`, meta description, Open Graph tags, a JSON-LD `WebApplication` block, a breadcrumb, and a visible "How to use" + FAQ section in both languages.
- `sitemap.xml` and `robots.txt` use the run.app URL. If you add a custom domain, update both, and set `ALLOWED_REFERER_HOST` (see §6).

### Verified (local server sending the production CSP headers)
- Every page in English and Arabic: the header and menu render, there are no runtime errors, and every `data-t` string is translated (only "ZIP" is identical by design). There is no horizontal overflow at 375 px.
- Functional checks:
  - Loan 100,000 @ 4.5% / 5 y = 1,864.30/month; compound savings 10,000 @ 5% / 10 y = 16,470.09.
  - 8 L/100km = 29.40 mpg (US).
  - Age, Hijri date and business days are correct.
  - JSON error location and regex highlight/replace work, and a catastrophic regex is stopped by the timeout. UTF-8 Base64 and ordered UUID v7 work.
  - Images: 1.77 MB → 164 KB WebP; ZIP and compare view work.
  - PDF: merge with ranges, remove pages, split every 3 → ZIP.
  - Tires: 225/45R17 vs 235/40R18 = +1.72%.
- **Not verified:**
  - Visual screenshots of most pages (the browser window was minimized during testing).
  - Real-device mobile testing.
  - Scanning the QR output with a phone.
  - Very large PDFs and images (memory limits depend on the device).
