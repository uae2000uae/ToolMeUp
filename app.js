/*
  ToolMeUp • Fitment Calculator (static)
  - Calculations in JS (backend logic on the client), inputs are simple boxes.
  - Supports: tire parsing, geometry, offsets, spacer, clearances, ride height, speedo error,
    thresholds, optional scrub radius, visuals, multiple setups vs baseline, unit toggle.
*/

(function () {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // Units and conversions
  const MM_PER_IN = 25.4;
  const M_PER_IN = 0.0254;
  const PI = Math.PI;

  function mmToIn(mm) { return mm / MM_PER_IN; }
  function inToMm(inch) { return inch * MM_PER_IN; }

  function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

  // Preload hub assembly image for top-view overlay
  const HUB_IMG_SRC = 'static/images/hub_assembly.png';
  const hubImg = new Image();
  let hubImgLoaded = false;
  hubImg.onload = function () {
    hubImgLoaded = true;
    // Trigger a redraw when image becomes available
    try { if (typeof renderAll === 'function') renderAll(); } catch (_) { /* ignore */ }
  };
  hubImg.onerror = function () { hubImgLoaded = false; };
  hubImg.src = HUB_IMG_SRC;

  // Parse tire sizes: metric (e.g., 225/45R17, 225/45-17) and flotation (31x10.5R15, 33x12.50-20).
  // Partial sizes without the rim value (e.g., 235/45 or 31x10.5) take R from rimDiamIn (the wheel's rim diameter input).
  function parseTireSize(raw, rimDiamIn) {
    if (!raw) return null;
    const s = String(raw).trim().toUpperCase().replace(/\s+/g, "");
    const hasRim = rimDiamIn != null && !isNaN(rimDiamIn) && rimDiamIn > 0;

    // Metric: 225/45R17 or 225/45-17
    let m = s.match(/^(\d{3})\/(\d{2,3})(?:R|\-)?(\d{2})$/);
    if (m) {
      const sw_mm = parseInt(m[1], 10); // section width mm nominal
      const ar = parseInt(m[2], 10); // aspect ratio %
      const rim_in = parseInt(m[3], 10);
      return { type: 'metric', sw_mm, ar, rim_in };
    }

    // Partial metric: 235/45 (rim diameter from wheel input)
    m = s.match(/^(\d{3})\/(\d{2,3})(?:R|\-)?$/);
    if (m && hasRim) {
      const sw_mm = parseInt(m[1], 10);
      const ar = parseInt(m[2], 10);
      return { type: 'metric', sw_mm, ar, rim_in: rimDiamIn };
    }

    // Flotation: 31x10.5R15, 31X10.5-15, 35X12.50R20
    m = s.match(/^(\d{2,3}(?:\.\d)?)X(\d{1,2}(?:\.\d{1,2})?)(?:R|\-)?(\d{2})$/);
    if (m) {
      const od_in = parseFloat(m[1]); // overall diameter inches
      const sec_in = parseFloat(m[2]); // section width inches
      const rim_in = parseInt(m[3], 10);
      return { type: 'flotation', od_in, sec_in, rim_in };
    }

    // Partial flotation: 31x10.5 (rim diameter from wheel input)
    m = s.match(/^(\d{2,3}(?:\.\d)?)X(\d{1,2}(?:\.\d{1,2})?)(?:R|\-)?$/);
    if (m && hasRim) {
      const od_in = parseFloat(m[1]);
      const sec_in = parseFloat(m[2]);
      return { type: 'flotation', od_in, sec_in, rim_in: rimDiamIn };
    }

    return null; // unsupported
  }

  // Compute tire geometry
  function tireGeometry(parsed, brandWidthCorrectionPct = 0, rimWidthIn = null) {
    if (!parsed) return null;

    let rim_in = parsed.rim_in;
    let sectionWidthMm, sidewallMm, overallDiaMm, circumferenceMm, revsPerMile;

    if (parsed.type === 'metric') {
      sectionWidthMm = parsed.sw_mm;
      const ar = parsed.ar / 100;
      sidewallMm = sectionWidthMm * ar;
      overallDiaMm = rim_in * MM_PER_IN + 2 * sidewallMm;
    } else {
      // flotation
      const secMm = parsed.sec_in * MM_PER_IN;
      sectionWidthMm = secMm;
      overallDiaMm = parsed.od_in * MM_PER_IN;
      sidewallMm = (overallDiaMm - parsed.rim_in * MM_PER_IN) / 2;
    }

    // Brand/actual section width correction (percent of nominal)
    const corr = (brandWidthCorrectionPct || 0) / 100;
    sectionWidthMm = sectionWidthMm * (1 + corr);

    // Very rough rim width influence: for each 0.5" wider than nominal, section width changes ~5 mm
    // Only apply if metric and rim width known; fallback otherwise.
    if (rimWidthIn && parsed.type === 'metric') {
      // Nominal rim width guideline: sectionWidth(mm)/25.4 * 0.4? We'll use ETRTO approx:
      // Recommended rim width ~ (section width in inches) * 0.7 to 0.9; we'll pick midpoint 0.8 to estimate nominal
      const secIn = sectionWidthMm / MM_PER_IN;
      const nominalRim = secIn * 0.8;
      const halfInSteps = Math.round((rimWidthIn - nominalRim) / 0.5);
      sectionWidthMm += halfInSteps * 5; // 5 mm per 0.5" change
    }

    circumferenceMm = overallDiaMm * PI;
    // revs per mile = 1 mile / circumference
    const mmPerMile = 1609.344 * 1000;
    revsPerMile = mmPerMile / circumferenceMm;

    return {
      rim_in,
      sectionWidthMm,
      sidewallMm,
      overallDiaMm,
      circumferenceMm,
      revsPerMile
    };
  }

  // Wheel/backspacing, offset: ET in mm, wheel width in inches
  function wheelGeometry(rimWidthIn, etMm, spacerMm = 0) {
    if (rimWidthIn == null || etMm == null) return null;
    const totalEt = etMm - (spacerMm || 0); // spacer pushes wheel out, reduces effective ET
    const halfWidthMm = inToMm(rimWidthIn) / 2 * MM_PER_IN; // mistake; correct below
    // fix: inToMm returns mm already; don't multiply again
  }

  // Correct wheel geometry function
  function wheelGeometry2(rimWidthIn, etMm, spacerMm = 0) {
    if (rimWidthIn == null || etMm == null) return null;
    const effectiveEt = etMm - (spacerMm || 0); // mm
    const halfWidthMm = inToMm(rimWidthIn) / 2; // mm
    // Backspacing: hub face to inner edge. Positive ET increases backspacing.
    const backspacingMm = halfWidthMm + effectiveEt;
    // Frontspacing (poke): hub face to outer edge
    const frontspacingMm = halfWidthMm - effectiveEt;
    return { effectiveEt, halfWidthMm, backspacingMm, frontspacingMm };
  }

  // Validate tire rim diameter matches wheel rim diameter (hard requirement)
  function diameterMismatch(tireParsed, rimDiamIn) {
    if (!tireParsed || rimDiamIn == null || isNaN(rimDiamIn)) return null;
    // tireParsed.rim_in is in inches (integer). Allow tiny tolerance for input decimals.
    const diff = Math.abs((tireParsed.rim_in || 0) - rimDiamIn);
    return diff > 0.05 ? { tireRimIn: tireParsed.rim_in, wheelRimIn: rimDiamIn } : null;
  }

  // Compose a setup from fields
  function readSetupFromInputs(prefixRoot) {
    const tireStr = $(`#${prefixRoot}_tire`).value;
    const rimDiamIn = parseFloat($(`#${prefixRoot}_rim_diam`).value);
    const rimWidthIn = parseFloat($(`#${prefixRoot}_rim_width`).value);
    const etMm = parseFloat($(`#${prefixRoot}_offset`).value);
    const spacerMm = parseFloat($(`#${prefixRoot}_spacer`).value) || 0;
    const correction = clamp(parseFloat($(`#${prefixRoot}_correction`)?.value || '0') || 0, -20, 20);
    let bulgePct = parseFloat($(`#${prefixRoot}_bulge`)?.value);
    if (isNaN(bulgePct)) bulgePct = 5;
    bulgePct = clamp(bulgePct, 0, 20);

    const tireParsed = parseTireSize(tireStr, rimDiamIn);
    const tireGeom = tireGeometry(tireParsed, correction, rimWidthIn);
    const wheelGeom = wheelGeometry2(rimWidthIn, etMm, spacerMm);
    const diamError = diameterMismatch(tireParsed, rimDiamIn);

    return {
      id: prefixRoot,
      tireStr,
      rimDiamIn,
      rimWidthIn,
      etMm,
      spacerMm,
      correction,
      bulgePct,
      tireParsed,
      tireGeom,
      wheelGeom,
      diamMismatch: diamError
    };
  }

  // Deltas vs baseline
  function compareSetups(base, cmp) {
    if (!base?.tireGeom || !cmp?.tireGeom) return null;

    const baseT = base.tireGeom, cmpT = cmp.tireGeom;
    const baseW = base.wheelGeom, cmpW = cmp.wheelGeom;

    const rideHeightDeltaMm = (cmpT.overallDiaMm - baseT.overallDiaMm) / 2;

    // Inner and outer positions relative to hub face at wheel centerline:
    // inner extends backspacing; outer extends frontspacing.
    let innerMoveMm = null, outerMoveMm = null;
    if (baseW && cmpW) {
      innerMoveMm = cmpW.backspacingMm - baseW.backspacingMm; // + means closer to strut
      outerMoveMm = cmpW.frontspacingMm - baseW.frontspacingMm; // + means more poke
    }

    // Speedo error: vehicle speed indicated relates to wheel revs. New circumference changes reading.
    const speedoErrPct = (cmpT.circumferenceMm / baseT.circumferenceMm - 1) * 100;

    return {
      rideHeightDeltaMm,
      innerMoveMm,
      outerMoveMm,
      speedoErrPct
    };
  }

  // Clearance checks if baseline clearances provided
  function clearanceChecks(base, cmp, thresholds) {
    const res = { inner: null, outer: null };
    const cmpDelta = compareSetups(base, cmp);
    if (!cmpDelta) return res;

    const minInner = parseFloat($("#th_inner").value || thresholds.inner);
    const minOuter = parseFloat($("#th_outer").value || thresholds.outer);

    const baseInner = parseFloat($("#base_inner_clear").value);
    const baseOuter = parseFloat($("#base_outer_clear").value);

    if (!isNaN(baseInner) && cmpDelta.innerMoveMm != null) {
      const newInner = baseInner - cmpDelta.innerMoveMm; // positive innerMove reduces clearance
      res.inner = { value: newInner, pass: newInner >= minInner, min: minInner };
    }
    if (!isNaN(baseOuter) && cmpDelta.outerMoveMm != null) {
      const newOuter = baseOuter - cmpDelta.outerMoveMm; // more poke reduces outer clearance
      res.outer = { value: newOuter, pass: newOuter >= minOuter, min: minOuter };
    }
    return res;
  }

  // Optional scrub radius estimate: requires KPI and hub geometry
  function scrubRadiusEstimate(setup) {
    const kpi = parseFloat($("#sr_kpi").value);
    const hubOffset = parseFloat($("#sr_hub_offset").value);
    if (!setup?.wheelGeom || isNaN(kpi) || isNaN(hubOffset)) return null;
    // Simplified: project steering axis to ground and compare to tire contact patch center
    // Approximate contact patch center at wheel centerline minus effective ET on ground
    const axisX = hubOffset; // mm from hub face to steering axis at hub height (positive inward)
    const camberHeightMm = setup.tireGeom?.overallDiaMm / 2 || 300;
    const axisRun = camberHeightMm * Math.tan((kpi * PI) / 180);
    const axisAtGround = axisX - axisRun; // mm at ground from hub face line
    const contactCenter = -setup.wheelGeom.effectiveEt; // negative ET pushes out, so negative is outward
    const scrub = contactCenter - axisAtGround; // positive = positive scrub (contact outward of axis)
    return scrub;
  }

  // Rendering helpers
  function fmt(n, unit = '', digits = 1) {
    if (n == null || isNaN(n)) return '';
    return `${n.toFixed(digits)}${unit ? ' ' + unit : ''}`;
  }
  function badge(label, cls) {
    return `<span class="badge ${cls}">${label}</span>`;
  }

  // Structured fitment report (per "Report AI Guide") — one column per setup
  function renderComparison(base, setups, unitMode) {
    const wrap = $("#comparison");
    if (!base?.tireGeom) { wrap.innerHTML = '<div class="small">Enter and save a valid baseline to view results.</div>'; return; }
    const valid = (setups || []).filter(s => s.tireGeom && s.wheelGeom);
    if (!valid.length) { wrap.innerHTML = '<div class="small">Add setups to compare.</div>'; return; }
    // Baseline as first column, then each setup
    const allSets = [base, ...valid];
    const cols = allSets.map(s => ({ s, cmp: compareSetups(base, s), checks: clearanceChecks(base, s, { inner: 3, outer: 3 }) }));

    // Main header row on top (outside the section tables)
    const headCells = allSets.map((s, i) => {
      const name = i === 0 ? 'Baseline' : `Setup ${i}`;
      return `<th>${name}<div class="report-col-sub">${tireLabel(s)}</div></th>`;
    }).join('');
    const headHtml = `<div class="report-head-wrap"><table class="report-table"><thead><tr><th></th>${headCells}</tr></thead></table></div>`;

    // Color the value instead of showing PASS/WARN text
    const mark = (valueHtml, pass) => `<span class="${pass ? 'val-good' : 'val-bad'}">${valueHtml}</span>`;
    const sign = (n, unit, digits = 1) => `${n >= 0 ? '+' : ''}${n.toFixed(digits)}${unit}`;

    // defs: [label, desc, (col) => cellHtml | null]
    function sectionTable(defs) {
      let html = '<table class="report-table"><tbody>';
      for (const [label, desc, fn] of defs) {
        const cells = cols.map(fn);
        if (cells.every(v => v == null)) continue; // hide rows with no data at all
        html += `<tr><td class="report-label">${label}<div class="report-desc">${desc}</div></td>`
          + cells.map(v => `<td class="report-value">${v ?? ''}</td>`).join('')
          + '</tr>';
      }
      return html + '</tbody></table>';
    }

    // --- Fitment Differences (not collapsible) ---
    const diffDefs = [
      ['Ride Height Change', 'How much the vehicle height changes due to tire diameter difference',
        c => displayDeltaSmart(c.cmp.rideHeightDeltaMm, unitMode, 'mm')],
      ['Wheel Arch Clearance Change', 'Change in clearance of the tire to the wheel arch',
        c => displayDeltaSmart(-c.cmp.rideHeightDeltaMm, unitMode, 'mm')],
      ['Inner Clearance Change', 'Change in clearance toward suspension',
        c => {
          if (c.cmp.innerMoveMm == null) return null;
          const v = displayDeltaSmart(-c.cmp.innerMoveMm, unitMode, 'mm');
          return c.checks.inner ? mark(v, c.checks.inner.pass) : v;
        }],
      ['Outer Clearance Change', 'Change in clearance toward fender',
        c => {
          if (c.cmp.outerMoveMm == null) return null;
          const v = displayDeltaSmart(-c.cmp.outerMoveMm, unitMode, 'mm');
          return c.checks.outer ? mark(v, c.checks.outer.pass) : v;
        }],
      ['Final Outer Clearance', 'Clearance from the fender. Positive = out of fender line',
        c => {
          if (!c.checks.outer) return null;
          const f = -c.checks.outer.value; // positive = out of fender line (warning)
          return mark(displayDeltaSmart(f, unitMode, 'mm'), f <= 0);
        }],
      ['Speedometer Error Change', 'Difference in speedometer reading due to tire circumference change',
        c => sign(-c.cmp.speedoErrPct, ' %')],
      ['Final Speedometer Error', 'Speedometer reading error. Negative = reads slower than actual',
        c => {
          const f = -c.cmp.speedoErrPct + (base.baseSpeedoError || 0);
          return mark(sign(f, ' %'), f >= 0);
        }]
    ];

    // --- Wheel Geometry (collapsible) ---
    const wheelDefs = [
      ['Wheel Width', 'Rim width', c => displayLengthSmart(inToMm(c.s.rimWidthIn), unitMode, 'in')],
      ['Wheel Diameter', 'Rim diameter', c => displayLengthSmart(inToMm(c.s.rimDiamIn), unitMode, 'in')],
      ['Offset', 'Distance from wheel centerline to mounting face. Positive = wheel sits further inward',
        c => displayLengthSmart(c.s.etMm, unitMode, 'mm')],
      ['Backspacing', 'Distance from hub mounting face to inner wheel lip',
        c => displayLengthSmart(c.s.wheelGeom.backspacingMm, unitMode, 'mm')],
      ['Poke', 'How far the wheel sticks outward past the mounting face',
        c => displayLengthSmart(c.s.wheelGeom.frontspacingMm, unitMode, 'mm')]
    ];

    // --- Tire Geometry (collapsible) ---
    const revsDesc = (unitMode === 'imperial') ? 'How many times the tire rotates per mile' : 'How many times the tire rotates per km';
    const tireDefs = [
      ['Overall Diameter', 'Total tire height from ground to top',
        c => displayLengthSmart(c.s.tireGeom.overallDiaMm, unitMode, 'mm')],
      ['Section Width', 'Maximum width of the tire (incl. bulge)',
        c => displayLengthSmart(c.s.tireGeom.sectionWidthMm * (1 + (c.s.bulgePct || 0) / 100), unitMode, 'mm')],
      ['Sidewall Height', 'Height of the tire’s sidewall',
        c => displayLengthSmart(c.s.tireGeom.sidewallMm, unitMode, 'mm')],
      ['Circumference', 'Perimeter length of the tire',
        c => displayLengthSmart(c.s.tireGeom.circumferenceMm, unitMode, 'mm')],
      ['Revolutions', revsDesc,
        c => (unitMode === 'imperial')
          ? `${c.s.tireGeom.revsPerMile.toFixed(0)} RpM`
          : `${(1000000 / c.s.tireGeom.circumferenceMm).toFixed(0)} RpK`]
    ];

    wrap.innerHTML = `
      ${headHtml}
      <section class="report-section"><h3 class="report-title">Fitment Differences</h3>${sectionTable(diffDefs)}</section>
      <details class="report-section"><summary class="report-title">Wheel Geometry</summary>${sectionTable(wheelDefs)}</details>
      <details class="report-section"><summary class="report-title">Tire Geometry</summary>${sectionTable(tireDefs)}</details>
    `;
  }

  function displayLength(mm, unitMode) {
    if (unitMode === 'metric') return `${mm.toFixed(0)} mm`;
    if (unitMode === 'imperial') return `${mmToIn(mm).toFixed(1)} in`;
    // both
    return `${mm.toFixed(0)} mm (${mmToIn(mm).toFixed(1)} in)`;
  }
  function displayDelta(mm, unitMode) {
    if (mm == null || isNaN(mm)) return '';
    const sign = mm >= 0 ? '+' : '';
    if (unitMode === 'metric') return `${sign}${mm.toFixed(0)} mm`;
    if (unitMode === 'imperial') return `${sign}${mmToIn(mm).toFixed(1)} in`;
    return `${sign}${mm.toFixed(0)} mm (${sign}${mmToIn(mm).toFixed(1)} in)`;
  }

  // Smart display: when unitMode === 'both', show only the commonly used unit per field
  // preferUnit: 'mm' or 'in'
  function displayLengthSmart(mm, unitMode, preferUnit) {
    if (mm == null || isNaN(mm)) return '';
    if (unitMode === 'metric') return `${mm.toFixed(0)} mm`;
    if (unitMode === 'imperial') return `${mmToIn(mm).toFixed(1)} in`;
    // international: pick preferred unit
    if (preferUnit === 'in') return `${mmToIn(mm).toFixed(1)} in`;
    return `${mm.toFixed(0)} mm`;
  }
  function displayDeltaSmart(mm, unitMode, preferUnit) {
    if (mm == null || isNaN(mm)) return '';
    const sign = mm >= 0 ? '+' : '';
    if (unitMode === 'metric') return `${sign}${mm.toFixed(0)} mm`;
    if (unitMode === 'imperial') return `${sign}${mmToIn(mm).toFixed(1)} in`;
    // international: pick preferred unit
    if (preferUnit === 'in') return `${sign}${mmToIn(mm).toFixed(1)} in`;
    return `${sign}${mm.toFixed(0)} mm`;
  }

  // Visualizations using canvas
  function drawSideView(base, selected, unitMode) {
    const c = $("#sideView");
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, c.width, c.height);
    if (!base?.tireGeom || !selected?.tireGeom) return;

    const margin = 20;
    const maxDia = Math.max(base.tireGeom.overallDiaMm, selected.tireGeom.overallDiaMm);
    const scale = (c.height - margin * 2) / maxDia;

    // Vector wheel side profile (line-art style: treaded tire + spoked rim)
    function drawTire(set, x, color) {
      const r = (set.tireGeom.overallDiaMm / 2) * scale;
      const rimR = (set.tireGeom.rim_in * MM_PER_IN / 2) * scale;
      const cx = x, cy = c.height - margin - r;

      ctx.strokeStyle = color;

      // --- Tire ---
      // Outer circle
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, 2 * PI); ctx.stroke();

      // Tread hatch ticks around the outer edge
      const tickLen = Math.max(3, (r - rimR) * 0.3);
      const ticks = 72;
      ctx.lineWidth = 1;
      for (let i = 0; i < ticks; i++) {
        const a = (i / ticks) * 2 * PI;
        const ca = Math.cos(a), sa = Math.sin(a);
        ctx.beginPath();
        ctx.moveTo(cx + ca * r, cy + sa * r);
        ctx.lineTo(cx + ca * (r - tickLen), cy + sa * (r - tickLen));
        ctx.stroke();
      }
      // Inner tread circle
      ctx.beginPath(); ctx.arc(cx, cy, r - tickLen, 0, 2 * PI); ctx.stroke();

      // --- Rim ---
      const lipR = rimR * 0.92;                 // rim lip (spoke outer end)
      const hubR = Math.max(6, rimR * 0.28);    // hub plate

      // Rim outer edge (tire bead)
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, cy, rimR, 0, 2 * PI); ctx.stroke();
      // Rim lip
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(cx, cy, lipR, 0, 2 * PI); ctx.stroke();

      // Spokes (thin double-line spokes)
      const spokes = 9;
      const dHub = 0.28; // half-angle at hub (rad)
      const dRim = 0.10; // half-angle at rim lip (rad)
      for (let i = 0; i < spokes; i++) {
        const a = (i / spokes) * 2 * PI - PI / 2;
        for (const s of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(a + s * dHub) * hubR, cy + Math.sin(a + s * dHub) * hubR);
          ctx.lineTo(cx + Math.cos(a + s * dRim) * lipR, cy + Math.sin(a + s * dRim) * lipR);
          ctx.stroke();
        }
      }

      // Hub plate, lug holes and center bore
      ctx.beginPath(); ctx.arc(cx, cy, hubR, 0, 2 * PI); ctx.stroke();
      const lugCircleR = hubR * 0.62;
      const lugHoleR = Math.max(1.5, hubR * 0.14);
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * 2 * PI - PI / 2;
        ctx.beginPath();
        ctx.arc(cx + Math.cos(a) * lugCircleR, cy + Math.sin(a) * lugCircleR, lugHoleR, 0, 2 * PI);
        ctx.stroke();
      }
      ctx.beginPath(); ctx.arc(cx, cy, Math.max(2, hubR * 0.22), 0, 2 * PI); ctx.stroke();

      // Valve stem at the bottom of the rim lip
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx, cy + lipR);
      ctx.lineTo(cx, cy + lipR - Math.max(4, rimR * 0.06));
      ctx.stroke();
      ctx.lineWidth = 1;
    }

    // Ground line
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(margin, c.height - margin);
    ctx.lineTo(c.width - margin, c.height - margin);
    ctx.stroke();

    drawTire(base, c.width * 0.33, '#4aa3ff');
    drawTire(selected, c.width * 0.66, '#22c55e');
  }

  // Sidewall C-curve profile (tuned in Drawing/Tyre drawing test.html).
  // Baseline is the straight line (chord) from the tread edge to the rim
  // corner. Each point: h = position along that line (0 = tread edge,
  // 1 = rim corner), b = outward bulge from the line as fraction of max
  // bulge (negative = inward).
  const SIDEWALL_PROFILE = [
    { h: 0.05, b: 0.05 },
    { h: 0.25, b: 0.90 },
    { h: 0.50, b: 1.25 },   // max bulge
    { h: 0.75, b: 0.90 },
    { h: 0.92, b: 0.00 },
    { h: 0.96, b: 0.25 },
    { h: 0.98, b: -0.25 },
    { h: 1.00, b: -0.25 }   // bead: tucks inside rim corner
  ];
  const TREAD_GROOVES = { count: 8, depth: 10 }; // depth in px

  function drawRimView(base, selected) {
    const c = $("#RimView");
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, c.width, c.height);
    if (!base?.wheelGeom || !selected?.wheelGeom) return;

    // Catmull-Rom spline through points, rendered as beziers
    function smoothPath(pts) {
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i - 1] || pts[i];
        const p1 = pts[i];
        const p2 = pts[i + 1];
        const p3 = pts[i + 2] || p2;
        ctx.bezierCurveTo(
          p1.x + (p2.x - p0.x) / 6, p1.y + (p2.y - p0.y) / 6,
          p2.x - (p3.x - p1.x) / 6, p2.y - (p3.y - p1.y) / 6,
          p2.x, p2.y
        );
      }
      ctx.stroke();
    }

    const marginX = 40;
    const marginY = 24;
    // Per-setup tire bulge as fraction of section width (input %, default 5, max 20)
    function bulgeFrac(set) {
      const p = (set.bulgePct != null && !isNaN(set.bulgePct)) ? set.bulgePct : 5;
      return clamp(p, 0, 20) / 100;
    }

    // Helper to get rim diameter in mm (prefer explicit wheel input)
    function rimMm(set) {
      const inVal = (set.rimDiamIn != null && !isNaN(set.rimDiamIn))
        ? set.rimDiamIn
        : (set.tireGeom?.rim_in != null ? set.tireGeom.rim_in : null);
      return inVal != null ? inToMm(inVal) : 0;
    }

    // Wheel width (mm) is backspacing + frontspacing
    function wheelWidthMm(set) {
      return (set.wheelGeom.backspacingMm + set.wheelGeom.frontspacingMm);
    }

    const baseRimMm = rimMm(base);
    const selRimMm = rimMm(selected);
    const maxRimMm = Math.max(baseRimMm, selRimMm, 1);

    const baseWidthMm = wheelWidthMm(base);
    const selWidthMm = wheelWidthMm(selected);
    const maxWidthMm = Math.max(baseWidthMm, selWidthMm, 1);

    // Tire extents (fall back to rim/wheel when tire geometry is missing)
    function tireODMm(set) { return set.tireGeom?.overallDiaMm || rimMm(set); }
    function tireWMm(set) { return set.tireGeom?.sectionWidthMm || wheelWidthMm(set); }
    const maxProfileB = Math.max(...SIDEWALL_PROFILE.map(p => p.b), 1);
    function tireWWithBulgeMm(set) { return tireWMm(set) * (1 + 2 * bulgeFrac(set) * maxProfileB); }
    const maxTireODMm = Math.max(tireODMm(base), tireODMm(selected), maxRimMm);
    const maxTireWMm = Math.max(tireWWithBulgeMm(base), tireWWithBulgeMm(selected), maxWidthMm);

    // Use a single uniform mm->px scale so width and height are in the same units visually
    const headroom = 1.05; // small headroom to avoid clipping
    // Legacy rim-only scale: preserves the rim's relative size vs the hub image
    const rimScaleX = (c.width - marginX * 2) / (maxWidthMm * headroom);
    const rimScaleY = (c.height - marginY * 2) / (maxRimMm * headroom);
    const rimOnlyScale = Math.min(rimScaleX, rimScaleY);
    // Full scale including tire so the whole drawing stays inside the canvas
    const scaleX = (c.width - marginX * 2) / (maxTireWMm * headroom);
    const scaleY = (c.height - marginY * 2) / (maxTireODMm * headroom);
    const scale = Math.min(scaleX, scaleY);

    const minPxH = 8; // ensure visibility for very small diameters

    // Hub face anchoring: center when ET=0, shift by baseline effective ET
    const centerlineX = c.width / 2;
    const hubFaceX = centerlineX - (base.wheelGeom.effectiveEt || 0) * scale; // positive ET moves inward (left)

    const y = c.height / 2; // overlay both rectangles vertically centered

    // Hub image scale factor (keeps the rim's relative size vs the image)
    const imgK = scale / rimOnlyScale;
    // Spacer rectangle height: matches the hub flange in the image (~27% of image height),
    // with a geometry-based fallback if the image is unavailable
    const HUB_FLANGE_FRAC = 0.15;
    const HUB_IMG_NATURAL_H = 630; // hub_assembly.png natural height, used before the image loads
    const hubFlangeH = ((hubImgLoaded && hubImg.height) ? hubImg.height : HUB_IMG_NATURAL_H) * HUB_FLANGE_FRAC * imgK;

    // Draw hub assembly image centered at the hub face.
    if (hubImgLoaded && hubImg && hubImg.width && hubImg.height) {
      const targetW = hubImg.width * imgK;
      const targetH = hubImg.height * imgK;
      const xImg = hubFaceX - targetW / 2;
      const yImg = y - targetH / 2;
      ctx.save();
      ctx.globalAlpha = .3;
      ctx.imageSmoothingEnabled = true;
      // In dark theme, invert only the hub image to improve contrast
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      if (isDark) ctx.filter = 'invert(1)';
      try {
        ctx.drawImage(hubImg, xImg, yImg, targetW, targetH);
      } catch (_) { /* ignore draw errors */ }
      // Reset filter so other drawings are unaffected
      if (isDark) ctx.filter = 'none';
      ctx.restore();
    }

    function drawWheelRect(set, color) {
      const innerMm = set.wheelGeom.backspacingMm;
      const outerMm = set.wheelGeom.frontspacingMm;

      // Spacer: rectangle from the hub face outward, plus a gray anchor line
      // at the new (pushed-out) mounting face
      const spacerMmVal = set.spacerMm || 0;
      if (spacerMmVal > 0) {
        const spacerPx = spacerMmVal * scale;
        const rectH = Math.min(hubFlangeH, c.height - marginY * 2);
        ctx.fillStyle = color + '55';
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.rect(hubFaceX, y - rectH / 2, spacerPx, rectH);
        ctx.fill();
        ctx.stroke();
        // New mounting-face anchor line (gray, like the hub line)
        ctx.strokeStyle = '#999';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(hubFaceX + spacerPx, marginY);
        ctx.lineTo(hubFaceX + spacerPx, c.height - marginY);
        ctx.stroke();
      }

      // Rim rectangle anchored at the hub face (backspacing/frontspacing placement)
      const rimLeftX = hubFaceX - innerMm * scale;
      const rimWidthPx = (innerMm + outerMm) * scale; // true wheel width in px
      const rimRightX = rimLeftX + rimWidthPx;

      const rimDiamMm = rimMm(set) || maxRimMm;
      let rimDiamPx = rimDiamMm * scale; // height equals wheel (rim) diameter in px
      if (rimDiamPx < minPxH) rimDiamPx = minPxH;
      const rimTopY = y - rimDiamPx / 2;
      const rimBottomY = y + rimDiamPx / 2;

      // Draw rim
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.strokeRect(rimLeftX, rimTopY, rimWidthPx, rimDiamPx);

      // Tire profile (requires tire geometry)
      if (!set.tireGeom) return;

      const tireWidthPx = set.tireGeom.sectionWidthMm * scale;
      const sidewallPx = set.tireGeom.sidewallMm * scale;
      const bulgePx = set.tireGeom.sectionWidthMm * bulgeFrac(set) * scale;

      const tireCenterX = (rimLeftX + rimRightX) / 2;
      const tireLeftX = tireCenterX - tireWidthPx / 2;
      const tireRightX = tireCenterX + tireWidthPx / 2;

      const tireTopY = rimTopY - sidewallPx;
      const tireBottomY = rimBottomY + sidewallPx;

      // Draw tire top line (tread)
      ctx.beginPath();
      ctx.moveTo(tireLeftX, tireTopY);
      ctx.lineTo(tireRightX, tireTopY);
      ctx.stroke();

      // Draw tire bottom line (tread)
      ctx.beginPath();
      ctx.moveTo(tireLeftX, tireBottomY);
      ctx.lineTo(tireRightX, tireBottomY);
      ctx.stroke();

      // Tread grooves: short lines from the tread surface into the tire
      // (top line -> down, bottom line -> up)
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let g = 1; g <= TREAD_GROOVES.count; g++) {
        const gx = tireLeftX + (tireWidthPx * g) / (TREAD_GROOVES.count + 1);
        ctx.moveTo(gx, tireTopY);
        ctx.lineTo(gx, tireTopY + TREAD_GROOVES.depth);
        ctx.moveTo(gx, tireBottomY);
        ctx.lineTo(gx, tireBottomY - TREAD_GROOVES.depth);
      }
      ctx.stroke();
      ctx.lineWidth = 2; // restore for sidewalls

      // Sidewall C-curves: one continuous curve from tread edge to rim
      // corner. Each profile point sits on the tread->rim chord at
      // fraction h, pushed outward by its bulge value.
      function drawSidewall(treadX, treadY, rimX, rimY, outwardSign) {
        const pts = [{ x: treadX, y: treadY }];
        for (const p of SIDEWALL_PROFILE) {
          pts.push({
            x: treadX + (rimX - treadX) * p.h + outwardSign * bulgePx * p.b,
            y: treadY + (rimY - treadY) * p.h
          });
        }
        smoothPath(pts);
      }

      drawSidewall(tireLeftX,  tireTopY,    rimLeftX,  rimTopY,    -1);
      drawSidewall(tireRightX, tireTopY,    rimRightX, rimTopY,    +1);
      drawSidewall(tireLeftX,  tireBottomY, rimLeftX,  rimBottomY, -1);
      drawSidewall(tireRightX, tireBottomY, rimRightX, rimBottomY, +1);
    }

    // Draw hub face reference line (parallel to wheel height)
    ctx.strokeStyle = '#999';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(hubFaceX, marginY);
    ctx.lineTo(hubFaceX, c.height - marginY);
    ctx.stroke();

    // Draw baseline then selected on top (overlay), honoring visibility toggles
    const showBase = document.getElementById('rv_show_base')?.checked ?? true;
    const showSetup = document.getElementById('rv_show_setup')?.checked ?? true;
    if (showBase) drawWheelRect(base, '#4aa3ff');
    if (showSetup) drawWheelRect(selected, '#22c55e');

    // Draw current clearance lines vs fixed vehicle references (if baseline clearances provided)
    let xStrutLabel = null;
    let xFenderLabel = null;

    // Strut reference derived from baseline inner edge and baseline inner clearance input
    const baseInnerClearMm = parseFloat($("#base_inner_clear").value);
    if (!isNaN(baseInnerClearMm)) {
      const xBaseInner = hubFaceX - base.wheelGeom.backspacingMm * scale; // baseline inner wheel edge
      const xStrut = xBaseInner - baseInnerClearMm * scale; // vehicle strut position (fixed)
      // Draw a vertical red line at the strut reference position
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(xStrut, marginY);
      ctx.lineTo(xStrut, c.height - marginY);
      ctx.stroke();
      xStrutLabel = xStrut;
    }

    // Fender reference derived from baseline outer edge and baseline outer clearance input
    const baseOuterClearMm = parseFloat($("#base_outer_clear").value);
    if (!isNaN(baseOuterClearMm)) {
      const xBaseOuter = hubFaceX + base.wheelGeom.frontspacingMm * scale; // baseline outer wheel edge
      const xFender = xBaseOuter + baseOuterClearMm * scale; // vehicle fender position (fixed)
      // Draw a vertical red line at the fender reference position
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(xFender, marginY);
      ctx.lineTo(xFender, c.height - marginY);
      ctx.stroke();
      xFenderLabel = xFender;
    }

    // Draw threshold bands as dashed red-filled rectangles (no border), only if corresponding baseline clearances exist
    // Helper: draw dashed horizontal lines clipped to a rectangle
    function drawDashedBand(x, w) {
      if (!isFinite(x) || !isFinite(w) || w <= 0) return;
      const top = marginY;
      const h = c.height - marginY * 2;
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, top, w, h);
      ctx.clip();
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1;
      ctx.setLineDash([0, 0]);
      ctx.globalAlpha = 0.4;
      // horizontal dashed lines every 6 px
      for (let yy = top; yy <= top + h; yy += 7) {
        ctx.beginPath();
        ctx.moveTo(x, yy);
        ctx.lineTo(x + w, yy);
        ctx.stroke();
      }
      ctx.restore();
      // reset alpha and dash for subsequent drawings
      ctx.globalAlpha = 1;
      ctx.setLineDash([]);
    }

    const thInner = parseFloat($("#th_inner").value);
    if (!isNaN(thInner) && xStrutLabel != null) {
      const w = thInner * scale; // extend outward from Strut toward wheel (to the right)
      drawDashedBand(xStrutLabel, w);
    }

    const thOuter = parseFloat($("#th_outer").value);
    if (!isNaN(thOuter) && xFenderLabel != null) {
      const w = Math.abs(thOuter) * scale;
      if (thOuter >= 0) {
        // extend inward from Fender (to the left)
        drawDashedBand(xFenderLabel - w, w);
      } else {
        // negative value: extend outward from Fender (to the right)
        drawDashedBand(xFenderLabel, w);
      }
    }

    // caption labels (small) at top of lines, centered
    ctx.fillStyle = '#9fb0c3';
    ctx.font = '12px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    // Hub face label always shown
    ctx.fillText('Hub', hubFaceX, marginY - 4);
    // Strut/Fender labels only if their lines exist
    if (xStrutLabel != null) ctx.fillText('Strut', xStrutLabel, marginY - 4);
    if (xFenderLabel != null) ctx.fillText('Fender', xFenderLabel, marginY - 4);
  }


  // Dynamic UI: add/remove setups
  function makeSetupCard(idx) {
    const id = `s${idx}`;
    const wrap = document.createElement('div');
    wrap.className = 'setup-card';
    wrap.innerHTML = `
      <h4>Setup ${idx}</h4>
      <div class="grid two">
        <div>
          <div class="field"><label>Rim diameter<input id="${id}_rim_diam" type="number" step="1" placeholder="in"></label></div>
          <div class="field"><label>Rim width<input id="${id}_rim_width" type="number" step="1" placeholder="in"></label></div>
          <div class="field"><label>Offset ET<input id="${id}_offset" type="number" step="1" placeholder="mm"></label></div>
          <div class="field"><label>Spacer<input id="${id}_spacer" type="number" step="1" placeholder="mm"></label></div>
        </div>
        <div>
          <div class="field"><label>Tire size<span class="tire-wrap"><input id="${id}_tire" maxlength="6" placeholder="e.g., 235/45"><span class="tire-suffix" id="${id}_tire_suffix">R—</span></span></label></div>
          <div class="field"><label>Width correction (%)<input id="${id}_correction" type="number" placeholder="%" step="1" min="-20" max="20"></label></div>
          <div class="field"><label>Bulge (%)<input id="${id}_bulge" type="number" placeholder="%" step="1" min="0" max="20" value="10"></label></div>
        </div>
      </div>
      <div class="actions"><button class="remove" type="button">Remove</button></div>
    `;
    wrap.querySelector('.remove').addEventListener('click', () => {
      wrap.remove();
      renderAll();
    });
    // Keep the R-suffix in the tire box synced with this card's rim diameter
    const rimInp = wrap.querySelector(`#${id}_rim_diam`);
    const suffixEl = wrap.querySelector(`#${id}_tire_suffix`);
    const updSuffix = () => {
      const v = parseFloat(rimInp.value);
      suffixEl.textContent = (!isNaN(v) && v > 0) ? `R${v}` : 'R—';
    };
    rimInp.addEventListener('input', updSuffix);
    updSuffix();
    $$('#setups .field input', wrap).forEach(inp => inp.addEventListener('input', debounce(renderAll, 50)));
    return wrap;
  }

  // Presets (basic): map tire size => wheel suggestions
  const presetMap = {
    '225/45R17': { rim_d: 17, rim_w: 7.5, et: 45, spacer: 0 },
    '205/55R16': { rim_d: 16, rim_w: 6.5, et: 50, spacer: 0 },
    '265/35R19': { rim_d: 19, rim_w: 9, et: 35, spacer: 0 }
  };

  function applyPresetTo(prefixRoot, tire) {
    if (!tire) return;
    $(`#${prefixRoot}_tire`).value = tire;
    const p = presetMap[tire];
    if (p) {
      $(`#${prefixRoot}_rim_diam`).value = p.rim_d;
      $(`#${prefixRoot}_rim_width`).value = p.rim_w;
      $(`#${prefixRoot}_offset`).value = p.et;
      $(`#${prefixRoot}_spacer`).value = p.spacer;
    }
  }

  // State
  let baseline = null;
  let selectedSetupId = null; // for Results & Visualizations tabs

  function saveBaseline() {
    const proposed = readSetupFromInputs('base');
    // store some baseline extras on the proposed baseline
    proposed.baseSpeedoError = parseFloat($("#base_speedo_error").value) || 0;

    // Hard validation: tire rim diameter must equal wheel rim diameter
    if (proposed.diamMismatch) {
      const msg = `Baseline invalid: tire rim ${proposed.diamMismatch.tireRimIn}\" does not match wheel rim ${proposed.diamMismatch.wheelRimIn}\".`;
      renderAlerts([{ text: msg, cls: 'bad' }]);
      return; // do not accept baseline
    }

    baseline = proposed;
    renderAll();
  }

  function getSetups() {
    const cards = $$('#setups .setup-card');
    const res = [];
    cards.forEach((card, i) => {
      const id = card.querySelector('input[id$="_tire"]').id.split('_')[0];
      res.push(readSetupFromInputs(id));
    });
    return res;
  }

  function calcAlerts(base, selected) {
    const alerts = [];
    if (!base || !selected) return alerts;

    // Speedo baseline correction
    const cmp = compareSetups(base, selected);
    if (cmp) {
      const corrected = (-cmp.speedoErrPct) + (baseline?.baseSpeedoError || 0);
      const cls = Math.abs(corrected) > 2 ? 'warn' : 'good';
      // Append example conversion at 100 km/h
      const actual100 = 100;
      const indicated100 = actual100 * (1 + corrected / 100);
      const fmt1 = (n) => {
        const s = n.toFixed(1);
        return s.endsWith('.0') ? s.slice(0, -2) : s;
      };
      const example = `When your GPS speed is ${fmt1(actual100)} km/h, Speedometer shows ${fmt1(indicated100)} km/h`;
      alerts.push({ text: `Speedometer vs GPS Speed: ${corrected.toFixed(2)}% So, ` + example, cls });
    }

    // Clearance checks
    const checks = clearanceChecks(base, selected, { inner: 3, outer: 3 });
    if (checks.inner) alerts.push({ text: `Inner clearance → ${checks.inner.value.toFixed(0)} mm (min ${checks.inner.min} mm)`, cls: checks.inner.pass ? 'good' : 'bad' });
    if (checks.outer) alerts.push({ text: `Outer clearance → ${checks.outer.value.toFixed(0)} mm (min ${checks.outer.min} mm)`, cls: checks.outer.pass ? 'good' : 'bad' });

    // Scrub radius (optional)
    const sr = scrubRadiusEstimate(selected);
    if (sr != null && !isNaN(sr)) {
      const cls = Math.abs(sr) > 10 ? 'warn' : 'good';
      alerts.push({ text: `Estimated scrub radius: ${sr.toFixed(1)} mm`, cls });
    }

    return alerts;
  }

  function renderAlerts(alerts) {
    const wrap = $("#alerts");
    wrap.innerHTML = alerts.map(a => `<div class="alert ${a.cls}">${a.text}</div>`).join('');
  }

  // Full tire size label: appends R{rim} from the wheel's rim diameter when the typed size is partial
  function tireLabel(s) {
    const str = (s.tireStr || '').trim();
    if (!str) return s.id;
    const rim = s.tireParsed?.rim_in;
    if (rim != null && !/(?:R|-)\s*\d{2}(?:\.\d+)?$/i.test(str)) {
      return `${str.replace(/(?:R|-)$/i, '')}R${rim}`;
    }
    return str;
  }

  function renderTabs(setups) {
    const tabsWrap = document.getElementById('setupTabs');
    if (!tabsWrap) return;
    tabsWrap.innerHTML = '';
    if (!baseline?.tireGeom || setups.length === 0) return;

    // Ensure selectedSetupId exists among current setups
    const exists = setups.some(s => s.id === selectedSetupId);
    if (!exists) selectedSetupId = setups[0]?.id || null;

    for (const s of setups) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tab' + (s.id === selectedSetupId ? ' active' : '');
      btn.textContent = tireLabel(s);
      btn.dataset.id = s.id;
      btn.addEventListener('click', () => {
        selectedSetupId = s.id;
        renderAll();
      });
      tabsWrap.appendChild(btn);
    }
  }

  function renderAll() {
    const unitMode = $("#unitToggle").value;
    updateTireSuffixes();
    const all = getSetups();
    const invalids = all.filter(s => s.diamMismatch);
    const setups = all.filter(s => !s.diamMismatch && s.tireGeom && s.wheelGeom);

    // Tabs for selecting which setup to view
    renderTabs(setups);

    renderComparison(baseline, setups, unitMode);

    // Selected setup for visuals/alerts
    const selected = setups.find(s => s.id === selectedSetupId) || setups[0];
    drawSideView(baseline, selected, unitMode);
    drawRimView(baseline, selected);

    // Build alerts: hard errors for any invalid setups + dynamic alerts for selected
    const alerts = [];
    if (invalids.length > 0) {
      for (const s of invalids) {
        const msg = `Setup "${s.tireStr || s.id}": tire rim ${s.diamMismatch.tireRimIn}\" does not match wheel rim ${s.diamMismatch.wheelRimIn}\".`;
        alerts.push({ text: msg, cls: 'bad' });
      }
    }
    for (const a of calcAlerts(baseline, selected)) alerts.push(a);
    renderAlerts(alerts);
    // Autosave current state after each render so reload restores it
    if (typeof saveAutoState === 'function') saveAutoState();
  }

  // Theme toggle
  function initTheme() {
    const toggle = $("#themeToggle");
    toggle.addEventListener('change', () => {
      document.documentElement.setAttribute('data-theme', toggle.checked ? 'dark' : 'light');
      if (typeof saveAutoState === 'function') saveAutoState();
      // Redraw views so RimView image updates with inverted colors in dark mode
      if (typeof renderAll === 'function') renderAll();
    });
  }

  // Unit toggle
  function initUnits() {
    const unitSel = $("#unitToggle");
    if (!unitSel) return;
    unitSel.addEventListener('change', renderAll);
  }

  // RimView base/setup visibility toggles
  function initRimViewToggles() {
    ['rv_show_base', 'rv_show_setup'].forEach(id => {
      document.getElementById(id)?.addEventListener('change', renderAll);
    });
  }

  // Preset handling
  function initPresets() {
    const sel = $("#presetSelect");
    if (!sel) return;
    sel.addEventListener('change', (e) => {
      const val = e.target.value;
      if (!val) return;
      // Fill baseline inputs from preset and immediately apply as baseline
      applyPresetTo('base', val);
      saveBaseline();
      renderAll();
    });
  }

  // Sync all tire-box R-suffixes with their rim diameter inputs
  // (covers programmatic changes: presets, session load)
  function updateTireSuffixes() {
    $$('.tire-suffix').forEach(span => {
      const prefix = span.id.replace('_tire_suffix', '');
      const v = parseFloat(document.getElementById(`${prefix}_rim_diam`)?.value);
      span.textContent = (!isNaN(v) && v > 0) ? `R${v}` : 'R—';
    });
  }

  // Update dynamic hint for baseline speedometer error
  function updateSpeedoHint() {
    const el = document.getElementById('base_speedo_hint');
    if (!el) return;
    const val = parseFloat(document.getElementById('base_speedo_error')?.value);
    if (isNaN(val)) { el.textContent = ''; return; }
    const actual = 100; // km/h
    const indicated = actual * (1 + val / 100);
    const fmt1 = n => {
      const s = n.toFixed(1);
      return s.endsWith('.0') ? s.slice(0, -2) : s;
    };
    el.textContent = `when your GPS speed is ${fmt1(actual)} km/h, Speedometer shows ${fmt1(indicated)} km/h`;
  }

  // Baseline save
  function initBaseline() {
    $("#saveBaseline").addEventListener('click', saveBaseline);
    // Recompute on input changes for live feedback and autosave raw inputs
    $$('#base input').forEach(inp => inp.addEventListener('input', debounce(() => {
      if (baseline) saveBaseline();
      if (typeof saveAutoState === 'function') saveAutoState();
    }, 150)));
    // Keep speedo hint in sync while typing
    const sp = document.getElementById('base_speedo_error');
    if (sp) sp.addEventListener('input', updateSpeedoHint);
    // Keep baseline tire R-suffix in sync while typing rim diameter
    const rd = document.getElementById('base_rim_diam');
    if (rd) rd.addEventListener('input', updateTireSuffixes);
    // Initialize hints on load
    updateSpeedoHint();
    updateTireSuffixes();
  }

  // Add setups
  function initSetups() {
    let idx = 1;
    const addBtn = $("#addSetup");
    addBtn.addEventListener('click', () => {
      const card = makeSetupCard(idx++);
      $("#setups").appendChild(card);
      renderAll();
    });
    // expose a helper to programmatically add cards by simulating clicks
    window.__addSetupCard = function () { addBtn.click(); };

    // Autosave when any setup input changes
    const observer = new MutationObserver(() => {
      if (typeof saveAutoState === 'function') saveAutoState();
    });
    observer.observe(document.getElementById('setups'), { childList: true, subtree: true });
  }

  // Session save/load
  const AUTO_KEY = 'tmu_autosave_v1';

  function serializeSession() {
    const base = {
      tire: $('#base_tire').value,
      correction: parseFloat($('#base_correction').value || '0') || 0,
      bulge: $('#base_bulge')?.value ?? '5',
      rim_diam: $('#base_rim_diam').value,
      rim_width: $('#base_rim_width').value,
      offset: $('#base_offset').value,
      spacer: $('#base_spacer').value,
      inner_clear: $('#base_inner_clear').value,
      outer_clear: $('#base_outer_clear').value,
      speedo_error: $('#base_speedo_error').value,
      th_inner: $('#th_inner').value,
      th_outer: $('#th_outer').value,
      sr_kpi: $('#sr_kpi').value,
      sr_hub: $('#sr_hub_offset').value
    };
    const setups = [];
    $$('#setups .setup-card').forEach(card => {
      const get = sel => card.querySelector(sel)?.value || '';
      setups.push({
        tire: get('input[id$="_tire"]'),
        correction: get('input[id$="_correction"]'),
        bulge: get('input[id$="_bulge"]'),
        rim_diam: get('input[id$="_rim_diam"]'),
        rim_width: get('input[id$="_rim_width"]'),
        offset: get('input[id$="_offset"]'),
        spacer: get('input[id$="_spacer"]')
      });
    });
    const unit = $('#unitToggle').value;
    const themeDark = $('#themeToggle').checked;
    return { base, setups, unit, themeDark, selectedSetupId };
  }

  function applySession(sess) {
    if (!sess) return;
    // Units only. Theme is a site-wide preference managed by shared.js
    // (persisted across pages), so we intentionally do not override it here.
    if (sess.unit) $('#unitToggle').value = sess.unit === 'both' ? 'international' : sess.unit;

    // Baseline
    if (sess.base) {
      $('#base_tire').value = sess.base.tire || '';
      $('#base_correction').value = sess.base.correction ?? 0;
      if ($('#base_bulge')) $('#base_bulge').value = (sess.base.bulge === '' || sess.base.bulge == null) ? 5 : sess.base.bulge;
      $('#base_rim_diam').value = sess.base.rim_diam || '';
      $('#base_rim_width').value = sess.base.rim_width || '';
      $('#base_offset').value = sess.base.offset || '';
      $('#base_spacer').value = sess.base.spacer || '';
      $('#base_inner_clear').value = sess.base.inner_clear || '';
      $('#base_outer_clear').value = sess.base.outer_clear || '';
      $('#base_speedo_error').value = sess.base.speedo_error || '';
      $('#th_inner').value = sess.base.th_inner || '';
      $('#th_outer').value = sess.base.th_outer || '';
      $('#sr_kpi').value = sess.base.sr_kpi || '';
      $('#sr_hub_offset').value = sess.base.sr_hub || '';
      // Refresh speedo hint to reflect loaded value
      updateSpeedoHint();
    }

    // Rebuild setups
    $('#setups').innerHTML = '';
    // Add as many cards as needed
    const count = Array.isArray(sess.setups) ? sess.setups.length : 0;
    for (let i = 0; i < count; i++) window.__addSetupCard();
    // Fill values
    const cards = $$('#setups .setup-card');
    cards.forEach((card, i) => {
      const s = sess.setups[i] || {};
      const set = (suffix, val) => {
        const inp = card.querySelector(`input[id$="_${suffix}"]`);
        if (inp) inp.value = val ?? '';
      };
      set('tire', s.tire);
      set('correction', s.correction);
      set('bulge', (s.bulge === '' || s.bulge == null) ? 5 : s.bulge);
      set('rim_diam', s.rim_diam);
      set('rim_width', s.rim_width);
      set('offset', s.offset);
      set('spacer', s.spacer);
    });

    // Save baseline to compute geoms and render
    saveBaseline();

    // Restore selected tab if possible
    selectedSetupId = null;
    const validSetups = getSetups().filter(s => !s.diamMismatch && s.tireGeom && s.wheelGeom);
    if (sess.selectedSetupId && validSetups.some(s => s.id === sess.selectedSetupId)) {
      selectedSetupId = sess.selectedSetupId;
    } else {
      selectedSetupId = validSetups[0]?.id || null;
    }
    renderAll();
  }

  function saveSession() {
    const data = serializeSession();
    const name = prompt('Save session as (name):', new Date().toLocaleString());
    if (!name) return;
    const item = { id: Date.now(), name, ts: Date.now(), data };
    const key = 'tmu_sessions';
    const arr = JSON.parse(localStorage.getItem(key) || '[]');
    arr.push(item);
    localStorage.setItem(key, JSON.stringify(arr));
    alert('Session saved.');
  }

  function loadSession() {
    const key = 'tmu_sessions';
    const arr = JSON.parse(localStorage.getItem(key) || '[]');
    if (!arr.length) { alert('No saved sessions.'); return; }
    let menu = 'Select session to load:\n';
    arr.forEach((it, i) => { menu += `${i + 1}) ${it.name}\n`; });
    const choice = prompt(menu, '1');
    const idx = parseInt(choice, 10) - 1;
    if (isNaN(idx) || idx < 0 || idx >= arr.length) return;
    applySession(arr[idx].data);
  }

  // Autosave current working state to restore on reload
  function saveAutoState() {
    try {
      const data = serializeSession();
      localStorage.setItem(AUTO_KEY, JSON.stringify(data));
    } catch (_) { /* ignore quota or serialization errors */ }
  }

  function tryAutoLoad() {
    try {
      const raw = localStorage.getItem(AUTO_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (data) applySession(data);
    } catch (_) { /* ignore parse errors */ }
  }

  // Reset all fields: clear text boxes, restore HTML defaults, remove setups
  function resetAllFields() {
    if (!confirm('Reset all fields to their defaults?')) return;
    // Remove all setup cards
    const setupsWrap = document.getElementById('setups');
    if (setupsWrap) setupsWrap.innerHTML = '';
    // Restore every baseline-panel input to its HTML default value
    $$('#base input').forEach(inp => {
      if (inp.type === 'checkbox') return;
      inp.value = inp.defaultValue;
    });
    // Speedometer error intentionally has no default value
    const spd = document.getElementById('base_speedo_error');
    if (spd) spd.value = '';
    const preset = document.getElementById('presetSelect');
    if (preset) preset.selectedIndex = 0;
    // Clear computed state and autosave
    baseline = null;
    selectedSetupId = null;
    try { localStorage.removeItem(AUTO_KEY); } catch (_) { /* ignore */ }
    updateSpeedoHint();
    renderAll();
  }

  function initSessionIO() {
    const saveBtn = document.getElementById('saveSessionBtn');
    const loadBtn = document.getElementById('loadSessionBtn');
    const resetBtn = document.getElementById('resetFieldsBtn');
    if (saveBtn) saveBtn.addEventListener('click', saveSession);
    if (loadBtn) loadBtn.addEventListener('click', loadSession);
    if (resetBtn) resetBtn.addEventListener('click', resetAllFields);
  }

  // Utilities
  function debounce(fn, wait) {
    let t; return function (...args) { clearTimeout(t); t = setTimeout(() => fn.apply(this, args), wait); };
  }

  // Initialize
  function init() {
    initTheme();
    const hasFitment = !!document.getElementById('base');
    if (hasFitment) {
      initUnits();
      initRimViewToggles();
      initPresets();
      initBaseline();
      initSetups();
      initSessionIO();
    } else {
      // Minimal wiring for pages without the fitment UI
      initSessionIO();
    }
    // Try to auto-load last working state only on the fitment page
    if (hasFitment) tryAutoLoad();
  }



  document.addEventListener('DOMContentLoaded', init);
})();
