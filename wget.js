(function(){
  "use strict";

  // ---------------------------------------------------------------------
  // UI wiring (only on pages that have the wget markup)
  // ---------------------------------------------------------------------
  function initWgetTool() {
    // --- Single file section ---
    const urlEl = document.getElementById('wget_url');
    const methodEl = document.getElementById('wget_method');
    const headersEl = document.getElementById('wget_headers');
    const bodyEl = document.getElementById('wget_body');
    const filenameEl = document.getElementById('wget_filename');
    const btn = document.getElementById('wget_download');
    const cancelBtn = document.getElementById('wget_cancel');
    const prog = document.getElementById('wget_progress');
    const statusEl = document.getElementById('wget_status');

    // --- Site mirror section ---
    const zipUrlEl = document.getElementById('zip_url');
    const siteBtn = document.getElementById('wget_site_zip');
    const zipCancelBtn = document.getElementById('zip_cancel');
    const zipProg = document.getElementById('zip_progress');
    const zipStatusEl = document.getElementById('zip_status');

    if (!btn && !siteBtn) return; // UI not present

    function makeStatusSetter(el) {
      return function (msg, isError = false) {
        if (!el) return;
        el.textContent = msg || '';
        el.style.color = isError ? 'var(--bad, #b00020)' : '';
      };
    }
    function makeProgressSetter(el) {
      return function (pct) {
        if (!el) return;
        el.hidden = false;
        if (pct == null) el.removeAttribute('value'); // indeterminate
        else el.value = Math.max(0, Math.min(100, pct));
      };
    }
    const setStatus = makeStatusSetter(statusEl);
    const setProgress = makeProgressSetter(prog);
    const setZipStatus = makeStatusSetter(zipStatusEl);
    const setZipProgress = makeProgressSetter(zipProg);

    function parseUrl(raw, setter) {
      const url = (raw || '').trim();
      if (!url) { setter('Please enter a URL.', true); return null; }
      try { return new URL(url, location.href); } catch (_) { setter('Invalid URL.', true); return null; }
    }

    // Body is ignored for GET — reflect that in the UI.
    function syncBodyState() {
      if (!bodyEl || !methodEl) return;
      const isGet = methodEl.value === 'GET';
      bodyEl.disabled = isGet;
      bodyEl.title = isGet ? 'GET requests cannot carry a body.' : '';
    }
    if (methodEl) methodEl.addEventListener('change', syncBodyState);
    syncBodyState();

    // --- Single file download ---
    let dlController = null;

    async function startDownload() {
      const u = parseUrl(urlEl && urlEl.value, setStatus);
      if (!u) return;

      let headers = {};
      const rawHeaders = (headersEl && headersEl.value || '').trim();
      if (rawHeaders) {
        try {
          const parsed = JSON.parse(rawHeaders);
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) headers = parsed;
          else { setStatus('Headers must be a JSON object.', true); return; }
        } catch (e) {
          setStatus('Invalid headers JSON.', true); return;
        }
      }

      const method = (methodEl && methodEl.value) || 'GET';
      const body = (bodyEl && bodyEl.value) ? bodyEl.value : undefined;
      const filename = (filenameEl && filenameEl.value) ? filenameEl.value.trim() : '';

      dlController = new AbortController();
      btn.disabled = true;
      if (cancelBtn) cancelBtn.hidden = false;
      setStatus('Starting download...');
      setProgress(0);

      try {
        const { filename: savedAs } = await window.wget(u.toString(), {
          method,
          headers,
          body: method === 'GET' || method === 'HEAD' ? undefined : body,
          filename: filename || undefined,
          signal: dlController.signal,
          onProgress: ({ loaded, total, percent }) => {
            if (total) {
              setProgress(percent);
              setStatus(`Downloading: ${loaded}/${total} bytes (${percent.toFixed(1)}%)`);
            } else {
              setProgress(null);
              setStatus(`Downloading: ${loaded} bytes`);
            }
          }
        });
        setProgress(100);
        setStatus(`Completed: saved as ${savedAs}`);
      } catch (err) {
        if (err && err.name === 'AbortError') {
          setStatus('Cancelled.');
        } else {
          console.error(err);
          setStatus(`Error: ${err.message || err}`, true);
        }
        if (prog) prog.hidden = true;
      } finally {
        btn.disabled = false;
        if (cancelBtn) cancelBtn.hidden = true;
        dlController = null;
      }
    }

    if (btn) btn.addEventListener('click', startDownload);
    if (cancelBtn) cancelBtn.addEventListener('click', () => { if (dlController) dlController.abort(); });
    if (urlEl) urlEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') startDownload(); });

    // --- Site mirror to ZIP ---
    let zipController = null;

    async function startSiteZip() {
      if (!window.wgetSiteZip) return;
      const u = parseUrl(zipUrlEl && zipUrlEl.value, setZipStatus);
      if (!u) return;

      const maxDepth = Math.max(0, parseInt(document.getElementById('wget_max_depth')?.value || '2', 10) || 0);
      const maxFiles = Math.max(1, parseInt(document.getElementById('wget_max_files')?.value || '200', 10) || 200);
      const sameOrigin = !!document.getElementById('wget_same_origin')?.checked;

      zipController = new AbortController();
      siteBtn.disabled = true;
      if (zipCancelBtn) zipCancelBtn.hidden = false;
      setZipStatus('Starting site crawl...');
      setZipProgress(0);

      try {
        const { zipName, processed } = await window.wgetSiteZip(u.toString(), {
          maxDepth,
          maxFiles,
          sameOrigin,
          signal: zipController.signal,
          onProgress: ({ queued, processed, addedBytes, status }) => {
            const pct = Math.min(100, (processed / Math.max(1, Math.min(maxFiles, queued))) * 100);
            if (!isFinite(pct)) setZipProgress(null); else setZipProgress(pct);
            setZipStatus(status || `Processed ${processed}/${Math.min(maxFiles, queued)} files, ${addedBytes} bytes`);
          }
        });
        setZipProgress(100);
        setZipStatus(`Completed: ${processed} file(s) saved as ${zipName}`);
      } catch (err) {
        if (err && err.name === 'AbortError') {
          setZipStatus('Cancelled.');
        } else {
          console.error(err);
          setZipStatus(`Error: ${err.message || err}`, true);
        }
        if (zipProg) zipProg.hidden = true;
      } finally {
        siteBtn.disabled = false;
        if (zipCancelBtn) zipCancelBtn.hidden = true;
        zipController = null;
      }
    }

    if (siteBtn) siteBtn.addEventListener('click', startSiteZip);
    if (zipCancelBtn) zipCancelBtn.addEventListener('click', () => { if (zipController) zipController.abort(); });
    if (zipUrlEl) zipUrlEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') startSiteZip(); });
  }

  // ---------------------------------------------------------------------
  // window.wget — download a single URL via fetch, with progress + abort
  // ---------------------------------------------------------------------
  if (!window.wget) {
    window.wget = async function wget(url, opts = {}) {
      const method = opts.method || 'GET';
      const headers = opts.headers || {};
      const body = opts.body;
      const signal = opts.signal;
      const onProgress = typeof opts.onProgress === 'function' ? opts.onProgress : null;

      let resp;
      try {
        resp = await fetch(url, { method, headers, body, signal });
      } catch (err) {
        if (err && err.name === 'AbortError') throw err;
        throw new Error('Request failed — network error or the server does not allow cross-origin (CORS) requests.');
      }
      if (!resp.ok) {
        throw new Error(`wget: request failed (${resp.status} ${resp.statusText})`);
      }

      // Determine filename
      let outName = opts.filename || '';
      const cd = resp.headers.get('Content-Disposition') || resp.headers.get('content-disposition');
      if (!outName && cd) {
        const fnameStar = cd.match(/filename\*=([^']*)''([^;\n\r]+)/i);
        const fnameBasic = cd.match(/filename\s*=\s*"?([^";\n\r]+)"?/i);
        if (fnameStar && fnameStar[2]) outName = decodeURIComponent(fnameStar[2]);
        else if (fnameBasic && fnameBasic[1]) outName = fnameBasic[1];
      }
      if (!outName) {
        try {
          const u = new URL(url, location.href);
          outName = decodeURIComponent(u.pathname.split('/').filter(Boolean).pop() || 'download');
        } catch (_) {
          outName = 'download';
        }
      }

      // Stream with progress if possible
      const total = Number(resp.headers.get('Content-Length') || resp.headers.get('content-length')) || 0;
      let blob;
      if (resp.body && resp.body.getReader) {
        const reader = resp.body.getReader();
        const chunks = [];
        let loaded = 0;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            chunks.push(value);
            loaded += value.byteLength;
            if (onProgress) onProgress({ loaded, total, percent: total ? (loaded / total) * 100 : null });
          }
        }
        blob = new Blob(chunks);
      } else {
        blob = await resp.blob();
      }

      // Trigger browser download
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = outName;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        URL.revokeObjectURL(blobUrl);
        a.remove();
      }, 0);

      return { blob, filename: outName };
    };
  }

  // ---------------------------------------------------------------------
  // JSZip loader (multi-CDN fallback with timeout)
  // ---------------------------------------------------------------------
  let __jszipPromise = null;

  function loadScript(src, opts = {}) {
    const { integrity, crossOrigin, timeout = 10000 } = opts;
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      let done = false;
      const finish = (ok, err) => {
        if (done) return;
        done = true;
        clearTimeout(tid);
        script.onload = script.onerror = null;
        if (!ok) reject(err || new Error('Failed to load script')); else resolve();
      };
      const tid = setTimeout(() => finish(false, new Error('Timeout while loading script')), timeout);
      script.src = src;
      if (integrity) script.integrity = integrity;
      if (crossOrigin) script.crossOrigin = crossOrigin;
      script.async = true;
      script.onload = () => finish(true);
      script.onerror = () => finish(false, new Error('Network error while loading script'));
      document.head.appendChild(script);
    });
  }

  async function ensureJSZipLoaded() {
    if (typeof JSZip !== 'undefined') return JSZip;
    if (__jszipPromise) return __jszipPromise;

    const sources = [
      { url: 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js', integrity: 'sha256-9iSxsysm3Al3cEQb9H9DqTsiYlFtoCReQfHn3fXZi5M=', crossOrigin: 'anonymous' },
      { url: 'https://unpkg.com/jszip@3.10.1/dist/jszip.min.js' },
      { url: 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js' }
    ];

    __jszipPromise = (async () => {
      const errors = [];
      for (const src of sources) {
        try {
          await loadScript(src.url, { integrity: src.integrity, crossOrigin: src.crossOrigin, timeout: 10000 });
          if (typeof JSZip !== 'undefined') return JSZip;
          errors.push(new Error('JSZip global not found after loading ' + src.url));
        } catch (e) {
          errors.push(new Error(src.url + ': ' + (e && e.message ? e.message : e)));
        }
      }
      const err = new Error('Unable to load JSZip from CDNs. Tried: ' + sources.map(s => s.url).join(', '));
      err.causes = errors;
      throw err;
    })();

    try {
      return await __jszipPromise;
    } catch (e) {
      // Reset so next attempt can retry, instead of keeping a rejected promise cached
      __jszipPromise = null;
      throw e;
    }
  }

  // ---------------------------------------------------------------------
  // window.wgetSiteZip — mirror a site (bounded) into a ZIP, with abort
  // ---------------------------------------------------------------------
  if (!window.wgetSiteZip) {
    window.wgetSiteZip = async function wgetSiteZip(startUrl, options = {}) {
      const JSZipLib = await ensureJSZipLoaded();
      const start = new URL(startUrl, location.href);
      const opts = Object.assign({ maxDepth: 2, maxFiles: 200, sameOrigin: true }, options || {});
      const onProgress = typeof opts.onProgress === 'function' ? opts.onProgress : null;
      const signal = opts.signal;

      const throwIfAborted = () => {
        if (signal && signal.aborted) {
          const e = new Error('Aborted');
          e.name = 'AbortError';
          throw e;
        }
      };

      const allowedProtocols = new Set(['http:', 'https:']);
      const isHttp = (u) => allowedProtocols.has(u.protocol);
      const isSameOrigin = (u) => u.origin === start.origin;
      const shouldVisit = (u) => isHttp(u) && (!opts.sameOrigin || isSameOrigin(u));

      const visited = new Set();
      const queue = [{ url: start, depth: 0 }];
      let processed = 0;
      let addedBytes = 0;

      const zip = new JSZipLib();
      const makeZipPath = (u, contentType) => {
        const isHtml = typeof contentType === 'string' && contentType.toLowerCase().includes('text/html');
        let pathname = u.pathname;
        if (!pathname || pathname.endsWith('/')) pathname = pathname + (isHtml ? 'index.html' : 'index');
        let basePath = pathname.replace(/\\+/g, '/');
        if (u.origin !== start.origin) basePath = u.host + basePath;
        if (basePath.startsWith('/')) basePath = basePath.slice(1);
        return basePath || 'index.html';
      };

      const normLink = (raw, base) => {
        try {
          if (!raw) return null;
          raw = raw.trim();
          if (!raw || raw.startsWith('javascript:') || raw.startsWith('data:') || raw.startsWith('mailto:') || raw.startsWith('tel:')) return null;
          const u = new URL(raw, base);
          u.hash = '';
          return u;
        } catch (_) { return null; }
      };

      const enqueue = (u, depth) => {
        const key = u.toString();
        if (visited.has(key)) return;
        if (!shouldVisit(u)) return;
        queue.push({ url: u, depth });
      };

      const extractUrlsFromCss = (cssText, baseUrl) => {
        const urls = [];
        const re = /url\(\s*(["']?)([^)"']+)\1\s*\)/ig;
        let m;
        while ((m = re.exec(cssText)) !== null) {
          const u = normLink(m[2], baseUrl);
          if (u) urls.push(u);
        }
        return urls;
      };

      const extractLinksFromHtml = (htmlText, baseUrl) => {
        const out = [];
        try {
          const parser = new DOMParser();
          const doc = parser.parseFromString(htmlText, 'text/html');
          const push = (u) => { if (u) out.push(u); };
          doc.querySelectorAll('a[href]').forEach(a => push(normLink(a.getAttribute('href'), baseUrl)));
          doc.querySelectorAll('img[src], source[src], video[poster], audio source[src], iframe[src], script[src], link[rel="stylesheet"][href], link[as][href]').forEach(el => {
            const attr = el.getAttribute('src') || el.getAttribute('href') || el.getAttribute('poster');
            push(normLink(attr, baseUrl));
          });
          doc.querySelectorAll('style').forEach(st => {
            const css = st.textContent || '';
            for (const u of extractUrlsFromCss(css, baseUrl)) out.push(u);
          });
          doc.querySelectorAll('[style]').forEach(el => {
            const css = el.getAttribute('style') || '';
            for (const u of extractUrlsFromCss(css, baseUrl)) out.push(u);
          });
        } catch (_) { }
        return out.filter(Boolean);
      };

      const progress = () => {
        if (onProgress) onProgress({ queued: queue.length + visited.size, processed, addedBytes, status: `Crawled ${processed} files` });
      };

      progress();

      while (queue.length && processed < opts.maxFiles) {
        throwIfAborted();
        const { url: cur, depth } = queue.shift();
        const key = cur.toString();
        if (visited.has(key)) continue;
        visited.add(key);

        if (depth > opts.maxDepth) continue;

        let resp;
        try {
          resp = await fetch(cur.toString(), { method: 'GET', credentials: 'same-origin', signal });
        } catch (e) {
          if (e && e.name === 'AbortError') throw e;
          continue;
        }
        if (!resp || !resp.ok) continue;
        const ct = resp.headers.get('Content-Type') || resp.headers.get('content-type') || '';
        const isTextual = /^(text\/|application\/(javascript|json|xml|svg\+xml))/i.test(ct);
        let data;
        try {
          if (isTextual) data = await resp.text(); else data = new Uint8Array(await resp.arrayBuffer());
        } catch (e) { continue; }

        const pathInZip = makeZipPath(cur, ct);
        try {
          if (typeof data === 'string') {
            zip.file(pathInZip, data);
            addedBytes += data.length;
          } else {
            zip.file(pathInZip, data, { binary: true });
            addedBytes += data.byteLength || 0;
          }
        } catch (_) { }

        processed++;
        if (/text\/html/i.test(ct) && depth < opts.maxDepth) {
          const links = extractLinksFromHtml(typeof data === 'string' ? data : '', cur);
          for (const u of links) enqueue(u, depth + 1);
        }
        if (/text\/css/i.test(ct) && depth < opts.maxDepth) {
          const cssText = typeof data === 'string' ? data : '';
          for (const u of extractUrlsFromCss(cssText, cur)) enqueue(u, depth + 1);
        }

        progress();
      }

      throwIfAborted();
      if (onProgress) onProgress({ queued: queue.length + visited.size, processed, addedBytes, status: 'Creating ZIP...' });
      const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });

      const pad = (n) => String(n).padStart(2, '0');
      const dt = new Date();
      const zipName = `site-${start.host}-${dt.getFullYear()}${pad(dt.getMonth()+1)}${pad(dt.getDate())}-${pad(dt.getHours())}${pad(dt.getMinutes())}.zip`;
      const blobUrl = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = zipName;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(blobUrl); a.remove(); }, 0);

      return { blob: zipBlob, zipName, processed };
    };
  }

  // Initialize only on pages that have the wget UI
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWgetTool);
  } else {
    initWgetTool();
  }
})();
