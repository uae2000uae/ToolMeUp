(function(){
  // Minimal UI to use window.wget from the page
  function initWgetTool() {
    const urlEl = document.getElementById('wget_url');
    const methodEl = document.getElementById('wget_method');
    const headersEl = document.getElementById('wget_headers');
    const bodyEl = document.getElementById('wget_body');
    const filenameEl = document.getElementById('wget_filename');
    const btn = document.getElementById('wget_download');
    const prog = document.getElementById('wget_progress');
    const statusEl = document.getElementById('wget_status');
    if (!btn || !urlEl) return; // UI not present

    function setStatus(msg, isError = false) {
      if (!statusEl) return;
      statusEl.textContent = msg || '';
      statusEl.style.color = isError ? 'var(--danger, #b00020)' : '';
    }

    function setProgressPercent(pct) {
      if (!prog) return;
      if (pct == null) {
        // indeterminate
        prog.removeAttribute('value');
      } else {
        prog.value = Math.max(0, Math.min(100, pct));
      }
    }

    btn.addEventListener('click', async () => {
      const url = (urlEl.value || '').trim();
      if (!url) { setStatus('Please enter a URL.', true); return; }
      // Quick URL validation
      try { new URL(url, location.href); } catch (_) { setStatus('Invalid URL.', true); return; }

      let headers = {};
      const rawHeaders = (headersEl && headersEl.value || '').trim();
      if (rawHeaders) {
        try {
          const parsed = JSON.parse(rawHeaders);
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) headers = parsed;
          else setStatus('Headers must be a JSON object. Using none.', true);
        } catch (e) {
          setStatus('Invalid headers JSON. Using none.', true);
        }
      }

      const method = (methodEl && methodEl.value) || 'GET';
      const body = (bodyEl && bodyEl.value) ? bodyEl.value : undefined;
      const filename = (filenameEl && filenameEl.value) ? filenameEl.value.trim() : '';

      btn.disabled = true;
      setStatus('Starting download...');
      setProgressPercent(0);

      try {
        const { filename: savedAs } = await window.wget(url, {
          method,
          headers,
          body: method === 'GET' || method === 'HEAD' ? undefined : body,
          filename: filename || undefined,
          onProgress: ({ loaded, total, percent }) => {
            if (total) {
              setProgressPercent(percent);
              setStatus(`Downloading: ${loaded}/${total} bytes (${percent.toFixed(1)}%)`);
            } else {
              setProgressPercent(null);
              setStatus(`Downloading: ${loaded} bytes`);
            }
          }
        });
        setProgressPercent(100);
        setStatus(`Completed: saved as ${savedAs}`);
      } catch (err) {
        console.error(err);
        setStatus(`Error: ${err.message || err}`, true);
      } finally {
        btn.disabled = false;
      }
    });

    // Site to ZIP button
    const siteBtn = document.getElementById('wget_site_zip');
    if (siteBtn && window.wgetSiteZip) {
      siteBtn.addEventListener('click', async () => {
        const startUrl = (urlEl.value || '').trim();
        if (!startUrl) { setStatus('Please enter a URL.', true); return; }
        let u;
        try { u = new URL(startUrl, location.href); } catch (_) { setStatus('Invalid URL.', true); return; }
        const maxDepth = Math.max(0, parseInt(document.getElementById('wget_max_depth')?.value || '2', 10) || 0);
        const maxFiles = Math.max(1, parseInt(document.getElementById('wget_max_files')?.value || '200', 10) || 200);
        const sameOrigin = !!document.getElementById('wget_same_origin')?.checked;

        siteBtn.disabled = true;
        btn.disabled = true;
        setStatus('Starting site crawl...');
        setProgressPercent(0);
        try {
          const { zipName } = await window.wgetSiteZip(u.toString(), {
            maxDepth,
            maxFiles,
            sameOrigin,
            onProgress: ({ queued, processed, addedBytes, status }) => {
              const pct = Math.min(100, (processed / Math.max(1, Math.min(maxFiles, queued))) * 100);
              if (!isFinite(pct)) setProgressPercent(null); else setProgressPercent(pct);
              setStatus(status || `Processed ${processed}/${Math.min(maxFiles, queued)} files, ${addedBytes} bytes`);
            }
          });
          setProgressPercent(100);
          setStatus(`Completed: saved as ${zipName}`);
        } catch (err) {
          console.error(err);
          setStatus(`Error: ${err.message || err}`, true);
        } finally {
          siteBtn.disabled = false;
          btn.disabled = false;
        }
      });
    }
  }

  // Expose a wget-like helper globally for downloading files via Fetch
  if (!window.wget) {
    window.wget = async function wget(url, opts = {}) {
      const method = opts.method || 'GET';
      const headers = opts.headers || {};
      const body = opts.body;
      const onProgress = typeof opts.onProgress === 'function' ? opts.onProgress : null;

      const resp = await fetch(url, { method, headers, body });
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

  // Ensure JSZip is loaded on demand (with multi-CDN fallback and timeout)
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
          // Loaded but global not set – treat as failure and try next
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
      const lib = await __jszipPromise;
      return lib;
    } catch (e) {
      // Reset so next attempt can retry, instead of keeping a rejected promise cached
      __jszipPromise = null;
      throw e;
    }
  }

  // Mirror a site (bounded) into a ZIP and download it.
  if (!window.wgetSiteZip) {
    window.wgetSiteZip = async function wgetSiteZip(startUrl, options = {}) {
      const JSZipLib = await ensureJSZipLoaded();
      const start = new URL(startUrl, location.href);
      const opts = Object.assign({ maxDepth: 2, maxFiles: 200, sameOrigin: true }, options || {});
      const onProgress = typeof opts.onProgress === 'function' ? opts.onProgress : null;

      const allowedProtocols = new Set(['http:', 'https:']);
      const isHttp = (u) => allowedProtocols.has(u.protocol);
      const isSameOrigin = (u) => u.origin === start.origin;
      const shouldVisit = (u) => isHttp(u) && (!opts.sameOrigin || isSameOrigin(u));

      const visited = new Set();
      const queue = [{ url: start, depth: 0 }];
      let processed = 0;
      let addedBytes = 0;

      const zip = new JSZip();
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
        const { url: cur, depth } = queue.shift();
        const key = cur.toString();
        if (visited.has(key)) continue;
        visited.add(key);

        if (depth > opts.maxDepth) continue;

        let resp;
        try {
          resp = await fetch(cur.toString(), { method: 'GET', credentials: 'same-origin' });
        } catch (e) {
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
  document.addEventListener('DOMContentLoaded', initWgetTool);
})();