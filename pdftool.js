/*
  ToolMeUp • PDF Merge & Split (pdf.html)
  Uses pdf-lib (vendor/, MIT) for reading/writing and JSZip for ZIP output.
  Everything happens in memory in this tab.
*/
(function () {
  "use strict";
  const TM = window.ToolMeUp, K = window.Kit, t = TM.t, $ = (id) => document.getElementById(id), esc = TM.esc;
  const PDFLib = window.PDFLib;

  TM.addStrings({
    p_title: "دمج وتقسيم PDF",
    p_lead: "ادمج ملفات PDF، واستخرج الصفحات التي تحتاجها، أو قسّم المستند إلى أجزاء — دون رفع أي شيء.",
    p_tab_merge: "دمج", p_tab_split: "تقسيم واستخراج",
    p_drop_many: "أفلت ملفات PDF هنا", p_drop_many_s: "أو اضغط لاختيار عدة ملفات · اسحب البطاقات لتغيير الترتيب",
    p_drop_one: "أفلت ملف PDF هنا", p_drop_one_s: "أو اضغط لاختيار ملف واحد",
    p_pages_n: "{n} صفحة", p_total: "{f} ملف · {p} صفحة في الملف الناتج", p_merge_btn: "دمج وتنزيل",
    p_range_ph: "كل الصفحات", p_up: "تحريك لأعلى", p_down: "تحريك لأسفل", p_remove_file: "إزالة",
    p_all: "الكل", p_none: "لا شيء", p_odd: "الفردية", p_even: "الزوجية", p_ranges: "الصفحات المحددة",
    p_tiles_hint: "اضغط على الصفحات لتحديدها. Shift مع الضغط يحدد نطاقاً.",
    p_extract: "استخراج المحدد", p_extract_s: "الصفحات المحددة ← ملف PDF واحد",
    p_remove: "حذف المحدد", p_remove_s: "كل الصفحات عدا المحددة ← ملف PDF واحد",
    p_every: "تقسيم كل", p_pages_word: "صفحات", p_split_zip: "ZIP",
    p_meta: "{n} صفحة · {size}", p_sel_count: "{n} محددة",
    p_working: "جارٍ المعالجة…", p_done: "تم — جارٍ التنزيل", p_enc: "هذا الملف محمي بكلمة مرور ولا يمكن تعديله هنا.",
    p_bad: "تعذّرت قراءة «{name}» كملف PDF.", p_need_sel: "حدد صفحة واحدة على الأقل.", p_need_left: "لا يمكن حذف كل الصفحات.",
    p_bad_range: "نطاق غير صالح: «{r}»", p_not_pdf: "تم تجاهل {n} ملف ليس PDF",
    p_how1: "<b>الدمج:</b> أفلت عدة ملفات، واسحبها بالترتيب المطلوب، ويمكنك تحديد نطاق صفحات لكل ملف (مثل <code>1-3, 7</code>)، ثم ادمجها.",
    p_how2: "<b>التقسيم والاستخراج:</b> أفلت ملفاً واحداً، وحدد الصفحات بالضغط أو بكتابة النطاقات، ثم استخرجها أو احذفها أو قسّم الملف كل N صفحات في ملف ZIP.",
    p_how3: "تتم معالجة الملفات في تبويب المتصفح هذا. قد تستغرق الملفات الكبيرة بضع ثوانٍ.",
    p_faq1_q: "هل يتم رفع ملفاتي؟",
    p_faq1_a: "لا. مكتبة PDF تعمل داخل متصفحك، لذا لا تغادر مستنداتك جهازك أبداً — مفيد للعقود والهويات والفواتير.",
    p_faq2_q: "لماذا لا يُفتح ملفي؟",
    p_faq2_a: "لا يمكن تعديل ملفات PDF المحمية بكلمة مرور هنا. افتح الملف في قارئ PDF وأزل كلمة المرور (أو اطبعه كـ PDF)، ثم حاول مجدداً."
  });

  // ---- helpers ---------------------------------------------------------------------
  function busy(on, msg) { $("p_busy").hidden = !on; $("p_busy_t").textContent = msg || t("p_working", "Working…"); }
  async function loadPdf(file) {
    const buf = await file.arrayBuffer();
    try { return await PDFLib.PDFDocument.load(buf, { updateMetadata: false }); }
    catch (e) {
      if (/encrypt/i.test(String(e && (e.name + e.message)))) throw new Error(t("p_enc", "This file is password-protected and can't be edited here."));
      throw new Error(t("p_bad", "Couldn't read “{name}” as a PDF.", { name: file.name }));
    }
  }
  // "1-3, 5, 8-" → [0,1,2,4,7,...] (0-based, in typed order, de-duplicated)
  function parseRanges(str, count) {
    const s = String(str || "").trim();
    if (!s) return null;
    const out = [], seen = new Set();
    for (const part of s.split(/[,\s،]+/).filter(Boolean)) {
      const m = /^(\d*)\s*[-–]\s*(\d*)$/.exec(part) || /^(\d+)$/.exec(part);
      if (!m) throw new Error(t("p_bad_range", "Invalid range: “{r}”", { r: part }));
      let a, b;
      if (m.length === 2) { a = b = +m[1]; }
      else { a = m[1] ? +m[1] : 1; b = m[2] ? +m[2] : count; }
      if (a < 1 || b < 1 || a > count || b > count) throw new Error(t("p_bad_range", "Invalid range: “{r}”", { r: part }));
      const step = a <= b ? 1 : -1;
      for (let i = a; step > 0 ? i <= b : i >= b; i += step) if (!seen.has(i)) { seen.add(i); out.push(i - 1); }
    }
    return out;
  }
  function toRanges(idx) {
    const s = idx.slice().sort((a, b) => a - b), parts = [];
    for (let i = 0; i < s.length; i++) {
      let j = i;
      while (j + 1 < s.length && s[j + 1] === s[j] + 1) j++;
      parts.push(i === j ? String(s[i] + 1) : s[i] + 1 + "-" + (s[j] + 1));
      i = j;
    }
    return parts.join(", ");
  }
  async function build(src, indices) {
    const out = await PDFLib.PDFDocument.create();
    const pages = await out.copyPages(src, indices);
    pages.forEach((p) => out.addPage(p));
    return out.save();
  }
  const pdfBlob = (bytes) => new Blob([bytes], { type: "application/pdf" });
  const base = (name) => name.replace(/\.pdf$/i, "");

  // ---- Merge -------------------------------------------------------------------------------
  let files = [], fid = 0;
  function drawMerge() {
    const list = $("m_list");
    list.innerHTML = files.map((f, i) =>
      '<li class="pdf-card" draggable="true" data-i="' + i + '">' +
        '<span class="pdf-card__grip" aria-hidden="true">⋮⋮</span>' +
        '<span class="pdf-card__icon">PDF</span>' +
        '<div class="pdf-card__info"><b title="' + esc(f.file.name) + '">' + esc(f.file.name) + "</b>" +
          '<span class="muted small2">' + esc(t("p_pages_n", "{n} pages", { n: f.doc.getPageCount() })) + " · " + K.bytes(f.file.size) + "</span></div>" +
        '<input class="inp mono pdf-card__range" dir="ltr" data-range="' + i + '" value="' + esc(f.range || "") + '" placeholder="' + esc(t("p_range_ph", "All pages")) + '" aria-label="Pages">' +
        '<div class="pdf-card__acts">' +
          '<button type="button" class="icon-btn" data-mv="-1" aria-label="' + esc(t("p_up", "Move up")) + '"' + (i === 0 ? " disabled" : "") + ">↑</button>" +
          '<button type="button" class="icon-btn" data-mv="1" aria-label="' + esc(t("p_down", "Move down")) + '"' + (i === files.length - 1 ? " disabled" : "") + ">↓</button>" +
          '<button type="button" class="icon-btn" data-rmf aria-label="' + esc(t("p_remove_file", "Remove")) + '">×</button></div></li>').join("");
    $("m_bar").hidden = !files.length;
    let pages = 0;
    files.forEach((f) => { try { const r = parseRanges(f.range, f.doc.getPageCount()); pages += r ? r.length : f.doc.getPageCount(); } catch (_) { /* shown on merge */ } });
    $("m_total").textContent = t("p_total", "{f} files · {p} pages in the result", { f: files.length, p: pages });
  }
  async function addMerge(list) {
    const pdfs = list.filter((f) => /pdf$/i.test(f.type) || /\.pdf$/i.test(f.name));
    if (pdfs.length < list.length) K.toast(t("p_not_pdf", "{n} non-PDF file(s) skipped", { n: list.length - pdfs.length }), true);
    busy(true);
    for (const f of pdfs) {
      try { files.push({ id: ++fid, file: f, doc: await loadPdf(f), range: "" }); }
      catch (e) { K.toast(e.message, true); }
    }
    busy(false); drawMerge();
  }
  function wireMerge() {
    K.drop($("m_drop"), addMerge);
    const list = $("m_list");
    list.addEventListener("click", (e) => {
      const li = e.target.closest("[data-i]");
      if (!li) return;
      const i = +li.dataset.i, mv = e.target.closest("[data-mv]");
      if (mv) { const j = i + +mv.dataset.mv; [files[i], files[j]] = [files[j], files[i]]; drawMerge(); }
      else if (e.target.closest("[data-rmf]")) { files.splice(i, 1); drawMerge(); }
    });
    list.addEventListener("input", (e) => {
      const r = e.target.closest("[data-range]");
      if (r) { files[+r.dataset.range].range = r.value; $("m_total").textContent = ""; K.debounce(drawMergeTotals, 300)(); }
    });
    function drawMergeTotals() {
      let pages = 0;
      files.forEach((f) => { try { const r = parseRanges(f.range, f.doc.getPageCount()); pages += r ? r.length : f.doc.getPageCount(); } catch (_) { /* ignore */ } });
      $("m_total").textContent = t("p_total", "{f} files · {p} pages in the result", { f: files.length, p: pages });
    }
    // Drag to reorder
    let dragFrom = null;
    list.addEventListener("dragstart", (e) => { const li = e.target.closest("[data-i]"); if (!li) return; dragFrom = +li.dataset.i; li.classList.add("is-drag"); e.dataTransfer.effectAllowed = "move"; });
    list.addEventListener("dragend", () => { dragFrom = null; list.querySelectorAll(".is-drag,.is-over").forEach((x) => x.classList.remove("is-drag", "is-over")); });
    list.addEventListener("dragover", (e) => {
      if (dragFrom === null) return;
      e.preventDefault();
      list.querySelectorAll(".is-over").forEach((x) => x.classList.remove("is-over"));
      const li = e.target.closest("[data-i]"); if (li) li.classList.add("is-over");
    });
    list.addEventListener("drop", (e) => {
      if (dragFrom === null) return;
      e.preventDefault(); e.stopPropagation();
      const li = e.target.closest("[data-i]");
      if (!li) return;
      const to = +li.dataset.i, [moved] = files.splice(dragFrom, 1);
      files.splice(to, 0, moved); dragFrom = null; drawMerge();
    });
    $("m_go").addEventListener("click", async () => {
      if (!files.length) return;
      busy(true);
      try {
        const out = await PDFLib.PDFDocument.create();
        for (const f of files) {
          const idx = parseRanges(f.range, f.doc.getPageCount()) || f.doc.getPageIndices();
          (await out.copyPages(f.doc, idx)).forEach((p) => out.addPage(p));
        }
        let name = $("m_name").value.trim() || "merged.pdf";
        if (!/\.pdf$/i.test(name)) name += ".pdf";
        K.download(pdfBlob(await out.save()), name);
        K.toast(t("p_done", "Done — downloading"));
      } catch (e) { K.toast(e.message || String(e), true); }
      busy(false);
    });
  }

  // ---- Split / extract --------------------------------------------------------------------------
  let sdoc = null, sfile = null, sel = new Set(), lastClick = null;
  function drawPages() {
    const n = sdoc.getPageCount();
    const html = [];
    for (let i = 0; i < n; i++) {
      const p = sdoc.getPage(i), sz = p.getSize(), rot = (p.getRotation().angle || 0) % 180 !== 0;
      const w = rot ? sz.height : sz.width, h = rot ? sz.width : sz.height;
      html.push('<button type="button" class="page' + (sel.has(i) ? " is-sel" : "") + '" data-p="' + i + '" style="aspect-ratio:' + (w / h).toFixed(3) + '"><span>' + (i + 1) + "</span></button>");
    }
    $("s_pages").innerHTML = html.join("");
  }
  function syncSel(fromInput) {
    if (!fromInput) $("s_ranges").value = toRanges(Array.from(sel));
    $("s_ranges").classList.remove("is-bad");
    $("s_pages").querySelectorAll("[data-p]").forEach((b) => b.classList.toggle("is-sel", sel.has(+b.dataset.p)));
    $("s_meta").textContent = t("p_meta", "{n} pages · {size}", { n: sdoc.getPageCount(), size: K.bytes(sfile.size) }) + " · " + t("p_sel_count", "{n} selected", { n: sel.size });
  }
  async function openSplit(list) {
    const f = list.find((x) => /pdf$/i.test(x.type) || /\.pdf$/i.test(x.name));
    if (!f) { K.toast(t("p_not_pdf", "{n} non-PDF file(s) skipped", { n: list.length }), true); return; }
    busy(true);
    try {
      sdoc = await loadPdf(f); sfile = f; sel = new Set(); lastClick = null;
      $("s_name").textContent = f.name; $("s_work").hidden = false;
      drawPages(); syncSel();
    } catch (e) { K.toast(e.message, true); }
    busy(false);
  }
  async function act(kind) {
    if (!sdoc) return;
    const n = sdoc.getPageCount();
    const chosen = Array.from(sel).sort((a, b) => a - b);
    try {
      if (kind === "extract") {
        if (!chosen.length) throw new Error(t("p_need_sel", "Select at least one page."));
        busy(true);
        // Keep typed order when the user typed ranges (e.g. "5,1-3" reorders).
        let order = chosen;
        try { const typed = parseRanges($("s_ranges").value, n); if (typed && typed.length === chosen.length) order = typed; } catch (_) { /* use selection */ }
        K.download(pdfBlob(await build(sdoc, order)), base(sfile.name) + "-pages-" + toRanges(chosen).replace(/[ ,]+/g, "_") + ".pdf");
      } else if (kind === "remove") {
        if (!chosen.length) throw new Error(t("p_need_sel", "Select at least one page."));
        const keep = sdoc.getPageIndices().filter((i) => !sel.has(i));
        if (!keep.length) throw new Error(t("p_need_left", "You can't remove every page."));
        busy(true);
        K.download(pdfBlob(await build(sdoc, keep)), base(sfile.name) + "-edited.pdf");
      } else {
        const every = Math.max(1, parseInt($("s_n").value, 10) || 1);
        busy(true);
        const zip = new window.JSZip();
        for (let s = 0; s < n; s += every) {
          const idx = []; for (let i = s; i < Math.min(n, s + every); i++) idx.push(i);
          const label = idx.length === 1 ? String(idx[0] + 1).padStart(String(n).length, "0") : (idx[0] + 1) + "-" + (idx[idx.length - 1] + 1);
          zip.file(base(sfile.name) + "-" + label + ".pdf", await build(sdoc, idx));
          $("p_busy_t").textContent = t("p_working", "Working…") + " " + Math.min(n, s + every) + "/" + n;
        }
        K.download(await zip.generateAsync({ type: "blob" }), base(sfile.name) + "-split.zip");
      }
      K.toast(t("p_done", "Done — downloading"));
    } catch (e) { K.toast(e.message || String(e), true); }
    busy(false);
  }
  function wireSplit() {
    K.drop($("s_drop"), openSplit);
    $("s_pages").addEventListener("click", (e) => {
      const b = e.target.closest("[data-p]");
      if (!b) return;
      const i = +b.dataset.p;
      if (e.shiftKey && lastClick !== null) {
        const [a, z] = lastClick < i ? [lastClick, i] : [i, lastClick];
        for (let k = a; k <= z; k++) sel.add(k);
      } else if (sel.has(i)) sel.delete(i); else sel.add(i);
      lastClick = i; syncSel();
    });
    $("s_sel").addEventListener("click", (e) => {
      const b = e.target.closest("[data-s]");
      if (!b || !sdoc) return;
      const n = sdoc.getPageCount();
      sel = new Set();
      for (let i = 0; i < n; i++) {
        if (b.dataset.s === "all" || (b.dataset.s === "odd" && i % 2 === 0) || (b.dataset.s === "even" && i % 2 === 1)) sel.add(i);
      }
      syncSel();
    });
    $("s_ranges").addEventListener("input", () => {
      if (!sdoc) return;
      try { const r = parseRanges($("s_ranges").value, sdoc.getPageCount()); sel = new Set(r || []); syncSel(true); }
      catch (_) { $("s_ranges").classList.add("is-bad"); }
    });
    $("s_extract").addEventListener("click", () => act("extract"));
    $("s_remove").addEventListener("click", () => act("remove"));
    $("s_split").addEventListener("click", () => act("split"));
  }

  K.ready(() => {
    K.tabs("pdf");
    wireMerge(); wireSplit();
    K.onLang(() => { if (files.length) drawMerge(); if (sdoc) syncSel(); });
  });
})();
