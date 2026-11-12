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
