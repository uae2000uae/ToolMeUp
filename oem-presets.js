/*
  ToolMeUp • OEM Fitment Presets wizard
  ------------------------------------------------------------------
  A themed modal that pulls factory (OE) wheel/tire specs from the
  Wheel-Size Fitment API and applies them to the baseline setup.

  Data flow (all same-origin, key injected server-side by nginx):
    Region -> /api/wheel-size/makes/
           -> /api/wheel-size/models/
           -> /api/wheel-size/years/
           -> /api/wheel-size/search/by_model/   (trims + OE fitments)

  Applies the factory wheel (rim diameter/width/offset) and tire size to
  the baseline setup.
*/
(function () {
  "use strict";

  var btn = document.getElementById("oemPresetBtn");
  if (!btn) return; // only on the fitment page

  var API = "/api/wheel-size/";

  // 14 global regions (slug -> label). Fitments are region-specific.
  var REGIONS = [
    ["usdm", "USA (USDM)"], ["cdm", "Canada"], ["mxndm", "Mexico"],
    ["ladm", "Central & South America"], ["eudm", "Europe (EUDM)"],
    ["rus", "Russia+"], ["jdm", "Japan (JDM)"], ["chdm", "China"],
    ["skdm", "South Korea"], ["sam", "Southeast Asia"],
    ["medm", "Middle East"], ["nadm", "North Africa"],
    ["sadm", "South Africa"], ["audm", "Oceania (AUDM)"]
  ];

  // ---- tiny helpers ----------------------------------------------------
  function el(tag, attrs, html) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    if (html != null) e.innerHTML = html;
    return e;
  }
  function opt(value, label) {
    var o = document.createElement("option");
    o.value = value; o.textContent = label;
    return o;
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  // Cache responses within a session to conserve API quota.
  var cache = {};
  function fetchJSON(url) {
    if (cache[url]) return Promise.resolve(cache[url]);
    return fetch(url, { headers: { Accept: "application/json" } }).then(function (r) {
      if (!r.ok) {
        var msg = r.status === 403 ? "API key missing or invalid (403)."
          : r.status === 404 ? "No data found (404)."
          : r.status === 429 ? "API request limit reached (429). Try later."
          : "Request failed (" + r.status + ").";
        return r.text().then(function () { throw new Error(msg); });
      }
      return r.json();
    }).then(function (j) { cache[url] = j; return j; });
  }
  function rows(j) { return (j && j.data) ? j.data : (Array.isArray(j) ? j : []); }

  // ---- modal construction (built once, lazily) -------------------------
  var ui = null;
  function buildModal() {
    var overlay = el("div", { class: "modal-overlay", id: "oemModal", "aria-hidden": "true" });
    var modal = el("div", { class: "modal", role: "dialog", "aria-modal": "true", "aria-label": "OEM Fitment Presets" });

    var header = el("div", { class: "modal__head" });
    header.appendChild(el("h3", { class: "modal__title" }, "OEM Fitment Presets"));
    var closeBtn = el("button", { type: "button", class: "modal__close", "aria-label": "Close" }, "&times;");
    header.appendChild(closeBtn);

    var body = el("div", { class: "modal__body" });
    body.innerHTML =
      '<p class="hint">Pick a vehicle to load its factory (OE) wheel &amp; tire spec. Data: Wheel-Size Fitment API.</p>' +
      '<div class="oem-grid">' +
        '<label class="oem-field">Region<select id="oemRegion"></select></label>' +
        '<label class="oem-field">Make<select id="oemMake" disabled></select></label>' +
        '<label class="oem-field">Model<select id="oemModel" disabled></select></label>' +
        '<label class="oem-field">Year<select id="oemYear" disabled></select></label>' +
        '<label class="oem-field">Trim / Engine<select id="oemTrim" disabled></select></label>' +
      '</div>' +
      '<div id="oemStatus" class="oem-status" role="status"></div>' +
      '<div id="oemFitments" class="oem-fitments"></div>' +
      '<div class="oem-capture">' +
        '<div class="oem-capture__title">Capture into baseline</div>' +
        '<label class="toggle"><input type="checkbox" id="oemApplyWheel" checked> <span>Wheel (rim diameter, width, offset)</span></label>' +
        '<label class="toggle"><input type="checkbox" id="oemApplyTire" checked> <span>Tire (size)</span></label>' +
      '</div>';

    var footer = el("div", { class: "modal__foot" });
    var cancel = el("button", { type: "button", class: "" }, "Cancel");
    var apply = el("button", { type: "button", class: "primary", id: "oemApply", disabled: "disabled" }, "Apply to Baseline");
    footer.appendChild(cancel);
    footer.appendChild(apply);

    modal.appendChild(header);
    modal.appendChild(body);
    modal.appendChild(footer);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    ui = {
      overlay: overlay,
      region: overlay.querySelector("#oemRegion"),
      make: overlay.querySelector("#oemMake"),
      model: overlay.querySelector("#oemModel"),
      year: overlay.querySelector("#oemYear"),
      trim: overlay.querySelector("#oemTrim"),
      status: overlay.querySelector("#oemStatus"),
      fitments: overlay.querySelector("#oemFitments"),
      applyWheel: overlay.querySelector("#oemApplyWheel"),
      applyTire: overlay.querySelector("#oemApplyTire"),
      apply: apply
    };

    // Region options
    REGIONS.forEach(function (r) { ui.region.appendChild(opt(r[0], r[1])); });
    ui.region.value = "usdm";

    // Events
    closeBtn.addEventListener("click", close);
    cancel.addEventListener("click", close);
    overlay.addEventListener("click", function (e) { if (e.target === overlay) close(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && isOpen()) close(); });

    ui.region.addEventListener("change", onRegion);
    ui.make.addEventListener("change", onMake);
    ui.model.addEventListener("change", onModel);
    ui.year.addEventListener("change", onYear);
    ui.trim.addEventListener("change", onTrim);
    ui.apply.addEventListener("click", applyToBaseline);
  }

  // ---- state -----------------------------------------------------------
  var currentTrims = [];     // by_model data[]
  var selectedFitment = null; // {front, rear, is_stock,...}

  function setStatus(msg, kind) {
    ui.status.textContent = msg || "";
    ui.status.className = "oem-status" + (kind ? " oem-status--" + kind : "");
  }
  function resetSelect(sel, placeholder) {
    sel.innerHTML = "";
    sel.appendChild(opt("", placeholder));
    sel.disabled = true;
  }
  function fillSelect(sel, items, valueKey, labelFn) {
    sel.innerHTML = "";
    sel.appendChild(opt("", "Select…"));
    items.forEach(function (it) {
      sel.appendChild(opt(typeof it === "object" ? it[valueKey] : it, labelFn(it)));
    });
    sel.disabled = items.length === 0;
  }
  function clearFitments() {
    ui.fitments.innerHTML = "";
    selectedFitment = null;
    ui.apply.disabled = true;
  }

  // ---- cascade ---------------------------------------------------------
  function onRegion() {
    resetSelect(ui.make, "Make");
    resetSelect(ui.model, "Model");
    resetSelect(ui.year, "Year");
    resetSelect(ui.trim, "Trim / Engine");
    clearFitments();
    if (!ui.region.value) return;
    setStatus("Loading makes…", "busy");
    fetchJSON(API + "makes/?region=" + enc(ui.region.value)).then(function (j) {
      var items = rows(j);
      fillSelect(ui.make, items, "slug", function (m) { return m.name || m.name_en || m.slug; });
      setStatus(items.length ? "" : "No makes returned for this region.");
    }).catch(err);
  }
  function onMake() {
    resetSelect(ui.model, "Model");
    resetSelect(ui.year, "Year");
    resetSelect(ui.trim, "Trim / Engine");
    clearFitments();
    if (!ui.make.value) return;
    setStatus("Loading models…", "busy");
    fetchJSON(API + "models/?make=" + enc(ui.make.value) + "&region=" + enc(ui.region.value)).then(function (j) {
      var items = rows(j);
      fillSelect(ui.model, items, "slug", function (m) { return m.name || m.name_en || m.slug; });
      setStatus(items.length ? "" : "No models returned.");
    }).catch(err);
  }
  function onModel() {
    resetSelect(ui.year, "Year");
    resetSelect(ui.trim, "Trim / Engine");
    clearFitments();
    if (!ui.model.value) return;
    setStatus("Loading years…", "busy");
    fetchJSON(API + "years/?make=" + enc(ui.make.value) + "&model=" + enc(ui.model.value) + "&region=" + enc(ui.region.value)).then(function (j) {
      var items = rows(j).map(function (y) {
        if (typeof y === "object") return y.slug || y.year || y.name;
        return y;
      });
      fillSelect(ui.year, items, null, function (y) { return String(y); });
      setStatus(items.length ? "" : "No years returned.");
    }).catch(err);
  }
  function onYear() {
    resetSelect(ui.trim, "Trim / Engine");
    clearFitments();
    if (!ui.year.value) return;
    setStatus("Loading fitments…", "busy");
    var url = API + "search/by_model/?make=" + enc(ui.make.value) +
      "&model=" + enc(ui.model.value) + "&year=" + enc(ui.year.value) +
      "&region=" + enc(ui.region.value);
    fetchJSON(url).then(function (j) {
      currentTrims = rows(j);
      if (!currentTrims.length) { setStatus("No fitment records for this vehicle."); return; }
      ui.trim.innerHTML = "";
      ui.trim.appendChild(opt("", "Select…"));
      currentTrims.forEach(function (t, i) {
        ui.trim.appendChild(opt(String(i), trimLabel(t)));
      });
      ui.trim.disabled = false;
      setStatus("");
      // Auto-select if only one trim
      if (currentTrims.length === 1) { ui.trim.value = "0"; onTrim(); }
    }).catch(err);
  }
  function onTrim() {
    clearFitments();
    if (ui.trim.value === "") return;
    var t = currentTrims[parseInt(ui.trim.value, 10)];
    if (!t) return;
    renderFitments(t);
  }

  function trimLabel(t) {
    var parts = [];
    if (t.trim || t.name) parts.push(t.trim || t.name);
    if (t.engine && (t.engine.name || t.engine.type)) parts.push(t.engine.name || t.engine.type);
    var yrs = (t.start_year || "") + (t.end_year ? "–" + t.end_year : "");
    if (yrs) parts.push("[" + yrs + "]");
    return parts.join(" ") || (t.slug || "Fitment");
  }

  // ---- fitment options -------------------------------------------------
  function fmtCorner(c) {
    if (!c) return "—";
    var tire = c.tire || c.tire_full || "?";
    var rim = [];
    if (c.rim_width != null) rim.push(c.rim_width + "J");
    if (c.rim_diameter != null) rim.push("x" + c.rim_diameter);
    var rimStr = rim.join("");
    if (c.rim_offset != null) rimStr += " ET" + c.rim_offset;
    return tire + "  ·  " + (rimStr || "?");
  }
  function renderFitments(t) {
    var wheels = Array.isArray(t.wheels) ? t.wheels : [];
    var oe = wheels.filter(function (w) { return w.is_stock; });
    var list = oe.length ? oe : wheels; // fall back to all if none flagged
    if (!list.length) { setStatus("This trim has no wheel data."); return; }

    var wrap = el("div", { class: "oem-fit-list" });
    wrap.appendChild(el("div", { class: "oem-capture__title" }, oe.length ? "Factory (OE) fitments" : "Available fitments"));
    list.forEach(function (w, i) {
      var staggered = w.rear && w.front && (w.rear.tire !== w.front.tire || w.rear.rim_width !== w.front.rim_width);
      var id = "oemFit" + i;
      var row = el("label", { class: "oem-fit" });
      row.innerHTML =
        '<input type="radio" name="oemFit" value="' + i + '" id="' + id + '">' +
        '<span class="oem-fit__body">' +
          '<span class="oem-fit__main">' + esc(fmtCorner(w.front)) + '</span>' +
          (staggered ? '<span class="oem-fit__rear">Rear: ' + esc(fmtCorner(w.rear)) + '</span>' : '') +
          (w.is_stock ? '<span class="badge good">OE</span>' : '') +
        '</span>';
      row.querySelector("input").addEventListener("change", function () {
        selectedFitment = w;
        ui.apply.disabled = false;
        wrap.querySelectorAll(".oem-fit").forEach(function (r) { r.classList.remove("is-sel"); });
        row.classList.add("is-sel");
      });
      wrap.appendChild(row);
    });
    ui.fitments.innerHTML = "";
    ui.fitments.appendChild(wrap);

    // Auto-select first
    var first = wrap.querySelector('input[type="radio"]');
    if (first) { first.checked = true; first.dispatchEvent(new Event("change")); }
  }

  // ---- apply -----------------------------------------------------------
  function applyToBaseline() {
    if (!selectedFitment) return;
    var f = selectedFitment.front || {};
    var changed = [];

    if (ui.applyTire.checked && f.tire) {
      setVal("base_tire", String(f.tire).replace(/\s+/g, ""));
      changed.push("base_tire");
    }
    if (ui.applyWheel.checked) {
      if (f.rim_diameter != null) { setVal("base_rim_diam", f.rim_diameter); changed.push("base_rim_diam"); }
      if (f.rim_width != null) { setVal("base_rim_width", f.rim_width); changed.push("base_rim_width"); }
      if (f.rim_offset != null) { setVal("base_offset", f.rim_offset); changed.push("base_offset"); }
    }

    // Fire input/change so any listeners react, then click Apply to recompute.
    changed.forEach(function (id) {
      var e = document.getElementById(id);
      if (e) { e.dispatchEvent(new Event("input", { bubbles: true })); e.dispatchEvent(new Event("change", { bubbles: true })); }
    });
    var applyBtn = document.getElementById("saveBaseline");
    if (applyBtn) applyBtn.click();

    close();
  }

  // ---- misc ------------------------------------------------------------
  function enc(s) { return encodeURIComponent(s); }
  function setVal(id, v) { var e = document.getElementById(id); if (e) e.value = v; }
  function err(e) { setStatus((e && e.message) || "Something went wrong.", "bad"); }

  function isOpen() { return ui && ui.overlay.classList.contains("is-open"); }
  function open() {
    if (!ui) buildModal();
    ui.overlay.classList.add("is-open");
    ui.overlay.setAttribute("aria-hidden", "false");
    if (!ui.make.options.length || ui.make.disabled) onRegion();
  }
  function close() {
    if (ui) { ui.overlay.classList.remove("is-open"); ui.overlay.setAttribute("aria-hidden", "true"); }
  }

  btn.addEventListener("click", open);
})();
