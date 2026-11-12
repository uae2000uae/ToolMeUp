/*
  ToolMeUp • kit.js — small helpers shared by the tool pages
  (load after shared.js). Exposes window.Kit.
*/
(function () {
  "use strict";
  const TM = window.ToolMeUp;
  const t = (k, f, v) => (TM ? TM.t(k, f, v) : f);

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  // ---- Numbers ----------------------------------------------------------
  // Western digits in both languages (common in the Gulf and easier to copy).
  function fmt(n, maxFrac, minFrac) {
    if (n === null || n === undefined || !Number.isFinite(Number(n))) return "—";
    return Number(n).toLocaleString("en-US", {
      maximumFractionDigits: maxFrac === undefined ? 2 : maxFrac,
      minimumFractionDigits: minFrac || 0
    });
  }
  // Smart precision: more decimals for small numbers, scientific for extremes.
  function smart(n) {
    if (!Number.isFinite(n)) return "—";
    const a = Math.abs(n);
    if (a !== 0 && (a < 1e-6 || a >= 1e15)) return n.toExponential(4).replace("e+", "e");
    if (a >= 1000) return fmt(n, 2);
    if (a >= 1) return fmt(n, 4);
    return fmt(n, 8);
  }
  function num(el) {
    const v = typeof el === "string" ? el : (el && el.value);
    if (v === undefined || v === null || String(v).trim() === "") return NaN;
    return parseFloat(String(v).replace(/,/g, ""));
  }
  function bytes(n) {
    if (!Number.isFinite(n)) return "—";
    const u = ["B", "KB", "MB", "GB"];
    let i = 0;
    while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
    return fmt(n, i ? (n < 10 ? 2 : 1) : 0) + " " + u[i];
  }

  // ---- Toasts & clipboard -------------------------------------------------
  let host = null;
  function toast(msg, bad) {
    if (!host) { host = document.createElement("div"); host.className = "toast-host"; host.setAttribute("aria-live", "polite"); document.body.appendChild(host); }
    const el = document.createElement("div");
    el.className = "toast" + (bad ? " is-bad" : "");
    el.textContent = msg;
    host.appendChild(el);
    setTimeout(() => { el.style.opacity = "0"; el.style.transition = "opacity .3s"; }, 1600);
    setTimeout(() => el.remove(), 2000);
  }
  function copy(text) {
    const done = () => toast(t("copied", "Copied"));
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(String(text)).then(done, () => fallbackCopy(text, done));
    }
    fallbackCopy(text, done);
    return Promise.resolve();
  }
  function fallbackCopy(text, done) {
    const ta = document.createElement("textarea");
    ta.value = String(text); ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); done(); } catch (_) { toast("Copy failed", true); }
    ta.remove();
  }
  // Any element with data-copy="#id" copies that element's value/text;
  // data-copy-text="..." copies the literal text.
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-copy],[data-copy-text]");
    if (!b) return;
    const lit = b.getAttribute("data-copy-text");
    if (lit !== null) return copy(lit);
    const target = $(b.getAttribute("data-copy"));
    if (!target) return;
    const v = "value" in target && target.tagName !== "OUTPUT" ? target.value : target.textContent;
    if (v && v !== "—") copy(v.trim());
  });

  // ---- Downloads ------------------------------------------------------------
  function download(data, filename, type) {
    const blob = data instanceof Blob ? data : new Blob([data], { type: type || "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  // ---- Tabs (segmented control) ---------------------------------------------
  // <div class="seg" data-tabs="name"> <button data-tab="a">…</button> …
  // <section class="pane" data-pane="a">…</section>
  // Deep link: page.html#a. Last tab is remembered per page.
  function tabs(name, onChange) {
    const bar = $('[data-tabs="' + name + '"]');
    if (!bar) return { set: () => {} };
    const key = "toolmeup:tab:" + name;
    const buttons = $$("[data-tab]", bar);
    bar.setAttribute("role", "tablist");
    function set(id, fromUser) {
      const btn = buttons.find((b) => b.getAttribute("data-tab") === id) || buttons[0];
      id = btn.getAttribute("data-tab");
      buttons.forEach((b) => {
        const on = b === btn;
        b.setAttribute("role", "tab");
        b.setAttribute("aria-selected", String(on));
        b.tabIndex = on ? 0 : -1;
      });
      $$("[data-pane]").forEach((p) => {
        if (p.closest("[data-pane-group]") && p.closest("[data-pane-group]").getAttribute("data-pane-group") !== name) return;
        if (!buttons.some((b) => b.getAttribute("data-tab") === p.getAttribute("data-pane"))) return;
        p.hidden = p.getAttribute("data-pane") !== id;
      });
      try { localStorage.setItem(key, id); } catch (_) { /* ignore */ }
      if (fromUser) history.replaceState(null, "", "#" + id);
      if (onChange) onChange(id);
    }
    bar.addEventListener("click", (e) => {
      const b = e.target.closest("[data-tab]");
      if (b) set(b.getAttribute("data-tab"), true);
    });
    bar.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      const rtl = document.documentElement.dir === "rtl";
      const dir = (e.key === "ArrowRight") !== rtl ? 1 : -1;
      const i = buttons.findIndex((b) => b.getAttribute("aria-selected") === "true");
      const next = buttons[(i + dir + buttons.length) % buttons.length];
      set(next.getAttribute("data-tab"), true);
      next.focus();
    });
    let initial = location.hash.slice(1);
    if (!buttons.some((b) => b.getAttribute("data-tab") === initial)) {
      try { initial = localStorage.getItem(key); } catch (_) { initial = null; }
    }
    set(initial || buttons[0].getAttribute("data-tab"), false);
    window.addEventListener("hashchange", () => {
      const h = location.hash.slice(1);
      if (buttons.some((b) => b.getAttribute("data-tab") === h)) set(h, false);
    });
    return { set: set };
  }

  // ---- Drop zones -------------------------------------------------------------
  // <label class="drop"><input type="file" multiple accept="…">…</label>
  function drop(el, onFiles) {
    if (!el) return;
    const input = $("input[type=file]", el);
    ["dragenter", "dragover"].forEach((ev) => el.addEventListener(ev, (e) => { e.preventDefault(); el.classList.add("is-over"); }));
    ["dragleave", "drop"].forEach((ev) => el.addEventListener(ev, (e) => { e.preventDefault(); el.classList.remove("is-over"); }));
    el.addEventListener("drop", (e) => {
      const files = Array.from((e.dataTransfer && e.dataTransfer.files) || []);
      if (files.length) onFiles(files);
    });
    if (input) input.addEventListener("change", () => {
      const files = Array.from(input.files || []);
      input.value = "";
      if (files.length) onFiles(files);
    });
    // Paste images/files anywhere on the page.
    document.addEventListener("paste", (e) => {
      const files = Array.from((e.clipboardData && e.clipboardData.files) || []);
      if (files.length && !el.closest("[hidden]")) onFiles(files);
    });
  }

  // ---- Persistence --------------------------------------------------------------
  function save(key, value) { try { localStorage.setItem("toolmeup:" + key, JSON.stringify(value)); } catch (_) { /* ignore */ } }
  function load(key, def) {
    try { const v = localStorage.getItem("toolmeup:" + key); return v === null ? def : JSON.parse(v); } catch (_) { return def; }
  }
  // Remember the values of inputs marked data-keep across visits.
  function keepInputs(scope) {
    const store = load("inputs:" + scope, {});
    $$("[data-keep]").forEach((el) => {
      const k = el.getAttribute("data-keep") || el.id;
      if (store[k] !== undefined) {
        if (el.type === "checkbox") el.checked = !!store[k]; else el.value = store[k];
      }
      const upd = () => { store[k] = el.type === "checkbox" ? el.checked : el.value; save("inputs:" + scope, store); };
      el.addEventListener("input", upd);
      el.addEventListener("change", upd);
    });
  }

  function debounce(fn, ms) {
    let id;
    return function () { const a = arguments, s = this; clearTimeout(id); id = setTimeout(() => fn.apply(s, a), ms); };
  }
  function onLang(fn) { document.addEventListener("toolmeup:langchange", fn); }
  function onTheme(fn) { document.addEventListener("toolmeup:themechange", fn); }
  function ready(fn) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn);
    else fn();
  }
  // Read a CSS custom property (resolved) from an element.
  function cssVar(name, el) { return getComputedStyle(el || document.documentElement).getPropertyValue(name).trim(); }

  window.Kit = { $, $$, fmt, smart, num, bytes, toast, copy, download, tabs, drop, save, load, keepInputs, debounce, onLang, onTheme, ready, cssVar, t };
})();
