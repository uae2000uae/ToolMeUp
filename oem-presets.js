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
  // Arabic via shared.js; static parts of the modal carry data-t so the
  // language button re-translates them in place.
  function T(key, en, vars) { return (window.ToolMeUp && window.ToolMeUp.t) ? window.ToolMeUp.t(key, en, vars) : en; }
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
        var msg = r.status === 403 ? T("oem_e403", "API key missing or invalid (403).")
          : r.status === 404 ? T("oem_e404", "No data found (404).")
          : r.status === 429 ? T("oem_e429", "API request limit reached (429). Try later.")
          : T("oem_efail", "Request failed ({code}).", { code: r.status });
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
    var modal = el("div", { class: "modal", role: "dialog", "aria-modal": "true", "aria-labelledby": "oemModalTitle" });

    var header = el("div", { class: "modal__head" });
    header.appendChild(el("h3", { class: "modal__title", id: "oemModalTitle", "data-t": "oem_title" }, "OEM Fitment Presets"));
    var closeBtn = el("button", { type: "button", class: "modal__close", "aria-label": "Close", "data-t-aria": "ui_close" }, "&times;");
    header.appendChild(closeBtn);

    var body = el("div", { class: "modal__body" });
    body.innerHTML =
      '<p class="hint" data-t="oem_intro">Pick a vehicle to load its factory (OE) wheel &amp; tire spec. Data: Wheel-Size Fitment API.</p>' +
      '<div class="oem-grid">' +
        '<label class="oem-field"><span data-t="oem_region">Region</span><select id="oemRegion"></select></label>' +
        '<label class="oem-field"><span data-t="oem_make">Make</span><select id="oemMake" disabled></select></label>' +
        '<label class="oem-field"><span data-t="oem_model">Model</span><select id="oemModel" disabled></select></label>' +
        '<label class="oem-field"><span data-t="oem_year">Year</span><select id="oemYear" disabled></select></label>' +
        '<label class="oem-field"><span data-t="oem_trim">Trim / Engine</span><select id="oemTrim" disabled></select></label>' +
      '</div>' +
      '<div id="oemStatus" class="oem-status" role="status"></div>' +
      '<div id="oemFitments" class="oem-fitments"></div>' +
      '<div class="oem-capture">' +
        '<div class="oem-capture__title" data-t="oem_capture">Capture into baseline</div>' +
        '<label class="toggle"><input type="checkbox" id="oemApplyWheel" checked> <span data-t="oem_cap_wheel">Wheel (rim diameter, width, offset)</span></label>' +
        '<label class="toggle"><input type="checkbox" id="oemApplyTire" checked> <span data-t="oem_cap_tire">Tire (size)</span></label>' +
      '</div>';

    var footer = el("div", { class: "modal__foot" });
    var cancel = el("button", { type: "button", class: "", "data-t": "oem_cancel" }, "Cancel");
    var apply = el("button", { type: "button", class: "primary", id: "oemApply", disabled: "disabled", "data-t": "oem_apply" }, "Apply to Baseline");
    footer.appendChild(cancel);
    footer.appendChild(apply);

    modal.appendChild(header);
    modal.appendChild(body);
    modal.appendChild(footer);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    if (window.ToolMeUp && window.ToolMeUp.translate) window.ToolMeUp.translate(overlay);

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
    REGIONS.forEach(function (r) {
      var o = opt(r[0], T("oem_r_" + r[0], r[1]));
      o.dataset.en = r[1]; o.setAttribute("data-t", "oem_r_" + r[0]);
      ui.region.appendChild(o);
    });
    ui.region.value = "usdm";

    // Events
    // Backdrop clicks and Esc are handled by ToolMeUp.openDialog (see open())
    closeBtn.addEventListener("click", function () { close(); });
    cancel.addEventListener("click", function () { close(); });

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
    sel.appendChild(opt("", T("oem_select", "Select…")));
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
    resetSelect(ui.make, T("oem_make", "Make"));
    resetSelect(ui.model, T("oem_model", "Model"));
    resetSelect(ui.year, T("oem_year", "Year"));
    resetSelect(ui.trim, T("oem_trim", "Trim / Engine"));
    clearFitments();
    if (!ui.region.value) return;
    setStatus(T("oem_l_makes", "Loading makes…"), "busy");
    fetchJSON(API + "makes/?region=" + enc(ui.region.value)).then(function (j) {
      var items = rows(j);
      fillSelect(ui.make, items, "slug", function (m) { return m.name || m.name_en || m.slug; });
      setStatus(items.length ? "" : T("oem_n_makes", "No makes returned for this region."));
    }).catch(err);
  }
  function onMake() {
    resetSelect(ui.model, T("oem_model", "Model"));
    resetSelect(ui.year, T("oem_year", "Year"));
    resetSelect(ui.trim, T("oem_trim", "Trim / Engine"));
    clearFitments();
    if (!ui.make.value) return;
    setStatus(T("oem_l_models", "Loading models…"), "busy");
    fetchJSON(API + "models/?make=" + enc(ui.make.value) + "&region=" + enc(ui.region.value)).then(function (j) {
      var items = rows(j);
      fillSelect(ui.model, items, "slug", function (m) { return m.name || m.name_en || m.slug; });
      setStatus(items.length ? "" : T("oem_n_models", "No models returned."));
    }).catch(err);
  }
  function onModel() {
    resetSelect(ui.year, T("oem_year", "Year"));
    resetSelect(ui.trim, T("oem_trim", "Trim / Engine"));
    clearFitments();
    if (!ui.model.value) return;
    setStatus(T("oem_l_years", "Loading years…"), "busy");
    fetchJSON(API + "years/?make=" + enc(ui.make.value) + "&model=" + enc(ui.model.value) + "&region=" + enc(ui.region.value)).then(function (j) {
      var items = rows(j).map(function (y) {
        if (typeof y === "object") return y.slug || y.year || y.name;
        return y;
      });
      fillSelect(ui.year, items, null, function (y) { return String(y); });
      setStatus(items.length ? "" : T("oem_n_years", "No years returned."));
    }).catch(err);
  }
  function onYear() {
    resetSelect(ui.trim, T("oem_trim", "Trim / Engine"));
    clearFitments();
    if (!ui.year.value) return;
    setStatus(T("oem_l_fits", "Loading fitments…"), "busy");
    var url = API + "search/by_model/?make=" + enc(ui.make.value) +
      "&model=" + enc(ui.model.value) + "&year=" + enc(ui.year.value) +
      "&region=" + enc(ui.region.value);
    fetchJSON(url).then(function (j) {
      currentTrims = rows(j);
      if (!currentTrims.length) { setStatus(T("oem_n_fits", "No fitment records for this vehicle.")); return; }
      ui.trim.innerHTML = "";
      ui.trim.appendChild(opt("", T("oem_select", "Select…")));
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
    return parts.join(" ") || (t.slug || T("oem_fitment", "Fitment"));
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
    if (!list.length) { setStatus(T("oem_n_wheels", "This trim has no wheel data.")); return; }

    var wrap = el("div", { class: "oem-fit-list" });
    wrap.appendChild(el("div", { class: "oem-capture__title" }, oe.length ? T("oem_oe_fits", "Factory (OE) fitments") : T("oem_all_fits", "Available fitments")));
    list.forEach(function (w, i) {
      var staggered = isStaggeredFitment(w);
      var id = "oemFit" + i;
      var row = el("label", { class: "oem-fit" });
      row.innerHTML =
        '<input type="radio" name="oemFit" value="' + i + '" id="' + id + '">' +
        '<span class="oem-fit__body">' +
          '<span class="oem-fit__main">' + esc(fmtCorner(w.front)) + '</span>' +
          (staggered ? '<span class="oem-fit__rear">' + esc(T("oem_rear", "Rear:")) + ' ' + esc(fmtCorner(w.rear)) + '</span>' : '') +
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
  // A fitment is staggered when its rear corner differs from the front
  function isStaggeredFitment(w) {
    var fr = w && w.front, rr = w && w.rear;
    if (!fr || !rr) return false;
    return ["tire", "rim_diameter", "rim_width", "rim_offset"].some(function (k) {
      return rr[k] != null && String(rr[k]) !== String(fr[k]);
    });
  }

  // Fill one axle of the baseline ("base" = front, "base_r" = rear)
  function fillAxle(prefix, f, changed) {
    var tire = f.tire || f.tire_full;
    if (ui.applyTire.checked && tire) {
      // Normalize to the partial tire-field format (no rim suffix);
      // the rim diameter goes into the wheel field instead.
      var norm = (window.TMU && window.TMU.stripRimFromTireSize)
        ? window.TMU.stripRimFromTireSize(tire)
        : { size: String(tire).replace(/\s+/g, ""), rimIn: null };
      setVal(prefix + "_tire", norm.size);
      changed.push(prefix + "_tire");
      // If the wheel isn't being applied (or has no diameter), still set the
      // rim diameter from the tire size so the R-suffix stays correct.
      if (norm.rimIn != null && !(ui.applyWheel.checked && f.rim_diameter != null)) {
        setVal(prefix + "_rim_diam", norm.rimIn);
        changed.push(prefix + "_rim_diam");
      }
    }
    if (ui.applyWheel.checked) {
      if (f.rim_diameter != null) { setVal(prefix + "_rim_diam", f.rim_diameter); changed.push(prefix + "_rim_diam"); }
      if (f.rim_width != null) { setVal(prefix + "_rim_width", f.rim_width); changed.push(prefix + "_rim_width"); }
      if (f.rim_offset != null) { setVal(prefix + "_offset", f.rim_offset); changed.push(prefix + "_offset"); }
    }
  }

  async function applyToBaseline() {
    if (!selectedFitment) return;
    var f = selectedFitment.front || {};
    var changed = [];
    var tmu = window.TMU || {};

    // A staggered factory fitment switches the calculator to front/rear
    // mode (the user may decline if it would remove setups).
    if (isStaggeredFitment(selectedFitment) && tmu.setStaggered && !(tmu.isStaggered && tmu.isStaggered())) {
      await tmu.setStaggered(true);
    }
    fillAxle("base", f, changed);
    // Rear column: the factory rear corner, or the front one for a square fitment
    if (tmu.isStaggered && tmu.isStaggered()) {
      fillAxle("base_r", selectedFitment.rear || f, changed);
    }

    // Fire input/change so any listeners react, then recompute the baseline.
    changed.forEach(function (id) {
      var e = document.getElementById(id);
      if (e) { e.dispatchEvent(new Event("input", { bubbles: true })); e.dispatchEvent(new Event("change", { bubbles: true })); }
    });
    if (window.TMU && window.TMU.applyBaseline) window.TMU.applyBaseline();

    close();
  }

  // ---- misc ------------------------------------------------------------
  function enc(s) { return encodeURIComponent(s); }
  function setVal(id, v) { var e = document.getElementById(id); if (e) e.value = v; }
  function err(e) { setStatus((e && e.message) || T("oem_err", "Something went wrong."), "bad"); }

  // Focus, Tab trap, Esc, backdrop click and the inert page come from
  // ToolMeUp.openDialog (shared.js); closeDialog is the function it returns.
  var closeDialog = null;
  function open() {
    if (!ui) buildModal();
    if (window.ToolMeUp && window.ToolMeUp.openDialog) {
      closeDialog = window.ToolMeUp.openDialog(ui.overlay, { initial: "#oemRegion", onClose: function () { closeDialog = null; } });
    } else {
      ui.overlay.classList.add("is-open");
    }
    if (!ui.make.options.length || ui.make.disabled) onRegion();
  }
  function close() {
    if (closeDialog) closeDialog();
    else if (ui) ui.overlay.classList.remove("is-open");
  }

  btn.addEventListener("click", open);
})();
