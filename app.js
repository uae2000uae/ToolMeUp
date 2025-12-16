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

  // Parse tire sizes: metric (e.g., 225/45R17, 225/45-17) and flotation (31x10.5R15, 33x12.50-20)
  function parseTireSize(raw) {
    if (!raw) return null;
    const s = String(raw).trim().toUpperCase().replace(/\s+/g, "");

    // Metric: 225/45R17 or 225/45-17
    let m = s.match(/^(\d{3})\/(\d{2,3})(?:R|\-)?(\d{2})$/);
    if (m) {
      const sw_mm = parseInt(m[1], 10); // section width mm nominal
      const ar = parseInt(m[2], 10); // aspect ratio %
      const rim_in = parseInt(m[3], 10);
      return { type: 'metric', sw_mm, ar, rim_in };
    }

    // Flotation: 31x10.5R15, 31X10.5-15, 35X12.50R20
    m = s.match(/^(\d{2,3}(?:\.\d)?)X(\d{1,2}(?:\.\d{1,2})?)(?:R|\-)?(\d{2})$/);
    if (m) {
      const od_in = parseFloat(m[1]); // overall diameter inches
      const sec_in = parseFloat(m[2]); // section width inches
      const rim_in = parseInt(m[3], 10);
      return { type: 'flotation', od_in, sec_in, rim_in };
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
    const correction = parseFloat($(`#${prefixRoot}_correction`)?.value || '0') || 0;

    const tireParsed = parseTireSize(tireStr);
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

  // Build comparison table
  function renderComparison(base, setups, unitMode) {
    const wrap = $("#comparison");
    if (!base?.tireGeom) { wrap.innerHTML = '<div class="small">Enter and save a valid baseline to view results.</div>'; return; }
    if (setups.length === 0) { wrap.innerHTML = '<div class="small">Add setups to compare.</div>'; return; }

    const headers = [
      'Setup', 'OD', 'SW', 'Sidewall', 'Circ', 'Revs/mi',
      'Wheel W', 'ET', 'Backspacing', 'Poke',
      'Ride H Δ', 'Inner Δ', 'Outer Δ', 'Speedo Δ'
    ];

    const rows = [];
    for (const s of setups) {
      if (!s.tireGeom || !s.wheelGeom) continue;
      const cmp = compareSetups(base, s);
      const revsMi = s.tireGeom.revsPerMile;
      const checks = clearanceChecks(base, s, { inner: 3, outer: 3 });

      let innerBadge = '', outerBadge = '';
      if (checks.inner) innerBadge = badge(checks.inner.pass ? 'PASS' : 'WARN', checks.inner.pass ? 'good' : 'bad');
      if (checks.outer) outerBadge = badge(checks.outer.pass ? 'PASS' : 'WARN', checks.outer.pass ? 'good' : 'bad');

      const od = displayLength(s.tireGeom.overallDiaMm, unitMode);
      const sw = displayLength(s.tireGeom.sectionWidthMm, unitMode);
      const sidewall = displayLength(s.tireGeom.sidewallMm, unitMode);
      const circ = displayLength(s.tireGeom.circumferenceMm, unitMode);
      const backspacing = displayLength(s.wheelGeom.backspacingMm, unitMode);
      const poke = displayLength(s.wheelGeom.frontspacingMm, unitMode);
      const wheelW = displayLength(inToMm(s.rimWidthIn), unitMode);
      const rideH = displayDelta(cmp.rideHeightDeltaMm, unitMode);
      const innerD = displayDelta(cmp.innerMoveMm, unitMode);
      const outerD = displayDelta(cmp.outerMoveMm, unitMode);
      const speedo = `${cmp.speedoErrPct.toFixed(2)} %`;

      rows.push([
        s.tireStr || '-', od, sw, sidewall, circ, revsMi.toFixed(0),
        wheelW, `${(s.etMm ?? 0).toFixed(0)} mm`, backspacing, poke,
        rideH, `${innerD} ${innerBadge}`, `${outerD} ${outerBadge}`, speedo
      ]);
    }

    let html = '<table class="table"><thead><tr>' + headers.map(h => `<th>${h}</th>`).join('') + '</tr></thead><tbody>';
    for (const r of rows) html += '<tr>' + r.map(c => `<td>${c}</td>`).join('') + '</tr>';
    html += '</tbody></table>';
    wrap.innerHTML = html;
  }

  function displayLength(mm, unitMode) {
    if (unitMode === 'metric') return `${mm.toFixed(1)} mm`;
    if (unitMode === 'imperial') return `${mmToIn(mm).toFixed(2)} in`;
    // both
    return `${mm.toFixed(0)} mm (${mmToIn(mm).toFixed(2)} in)`;
  }
  function displayDelta(mm, unitMode) {
    if (mm == null || isNaN(mm)) return '';
    const sign = mm >= 0 ? '+' : '';
    if (unitMode === 'metric') return `${sign}${mm.toFixed(1)} mm`;
    if (unitMode === 'imperial') return `${sign}${mmToIn(mm).toFixed(2)} in`;
    return `${sign}${mm.toFixed(0)} mm (${sign}${mmToIn(mm).toFixed(2)} in)`;
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

    function drawTire(set, x, color) {
      const r = (set.tireGeom.overallDiaMm / 2) * scale;
      const rimR = (set.tireGeom.rim_in * MM_PER_IN / 2) * scale;
      const cx = x, cy = c.height - margin - r;
      // tire circle
      ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 2 * PI); ctx.stroke();
      // rim
      ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, rimR, 0, 2 * PI); ctx.stroke();
      // ground line
      ctx.strokeStyle = '#888'; ctx.beginPath(); ctx.moveTo(margin, c.height - margin); ctx.lineTo(c.width - margin, c.height - margin); ctx.stroke();
    }

    drawTire(base, c.width * 0.33, '#4aa3ff');
    drawTire(selected, c.width * 0.66, '#22c55e');
  }

  function drawTopView(base, selected) {
    const c = $("#topView");
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, c.width, c.height);
    if (!base?.wheelGeom || !selected?.wheelGeom) return;

    const marginX = 40;
    const marginY = 24;

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

    // Use a single uniform mm->px scale so width and height are in the same units visually
    const headroom = 1.05; // small headroom to avoid clipping
    const scaleX = (c.width - marginX * 2) / (maxWidthMm * headroom);
    const scaleY = (c.height - marginY * 2) / (maxRimMm * headroom);
    const scale = Math.min(scaleX, scaleY);

    const minPxH = 8; // ensure visibility for very small diameters

    // Hub face anchoring: center when ET=0, shift by baseline effective ET
    const centerlineX = c.width / 2;
    const hubFaceX = centerlineX - (base.wheelGeom.effectiveEt || 0) * scale; // positive ET moves inward (left)

    const y = c.height / 2; // overlay both rectangles vertically centered

    // Draw hub assembly image at its original pixel size, centered at the hub face
    if (hubImgLoaded && hubImg && hubImg.width && hubImg.height) {
      const targetW = hubImg.width;
      const targetH = hubImg.height;
      const xImg = hubFaceX - targetW / 2;
      const yImg = y - targetH / 2;
      ctx.save();
      ctx.globalAlpha = .3;
      ctx.imageSmoothingEnabled = true;
      try {
        ctx.drawImage(hubImg, xImg, yImg, targetW, targetH);
      } catch (_) { /* ignore draw errors */ }
      ctx.restore();
    }

    function drawWheelRect(set, color) {
      const innerMm = set.wheelGeom.backspacingMm;
      const outerMm = set.wheelGeom.frontspacingMm;
      const rectX = hubFaceX - innerMm * scale;
      const rectW = (innerMm + outerMm) * scale; // true wheel width in px

      const rimDiamMm = rimMm(set) || maxRimMm;
      let rectH = rimDiamMm * scale; // height equals wheel (rim) diameter in px
      if (rectH < minPxH) rectH = minPxH;

      // wheel rectangle (standing tall)
      ctx.fillStyle = color + '33';
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.rect(rectX, y - rectH / 2, rectW, rectH);
      ctx.fill();
      ctx.stroke();

    }

    // Draw hub face reference line (parallel to wheel height)
    ctx.strokeStyle = '#999';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(hubFaceX, marginY);
    ctx.lineTo(hubFaceX, c.height - marginY);
    ctx.stroke();

    // Draw baseline then selected on top (overlay)
    drawWheelRect(base, '#4aa3ff');
    drawWheelRect(selected, '#22c55e');

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
          <div class="field"><label>Tire size<input id="${id}_tire" placeholder="e.g., 225/40R18"></label></div>
          <div class="field"><label>Brand width correction (%)<input id="${id}_correction" type="number" step="0.1" value="0"></label></div>
        </div>
        <div>
          <div class="field"><label>Rim diameter<input id="${id}_rim_diam" type="number" step="0.1" placeholder="in"></label></div>
          <div class="field"><label>Rim width<input id="${id}_rim_width" type="number" step="0.1" placeholder="in"></label></div>
          <div class="field"><label>Offset ET<input id="${id}_offset" type="number" step="1" placeholder="mm"></label></div>
          <div class="field"><label>Spacer<input id="${id}_spacer" type="number" step="0.1" value="0" placeholder="mm"></label></div>
        </div>
      </div>
      <div class="actions"><button class="remove" type="button">Remove</button></div>
    `;
    wrap.querySelector('.remove').addEventListener('click', () => {
      wrap.remove();
      renderAll();
    });
    $$('#setups .field input', wrap).forEach(inp => inp.addEventListener('input', debounce(renderAll, 50)));
    return wrap;
  }

  // Presets (basic): map tire size => wheel suggestions
  const presetMap = {
    '225/45R17': { rim_d: 17, rim_w: 7.5, et: 45, spacer: 0 },
    '205/55R16': { rim_d: 16, rim_w: 6.5, et: 50, spacer: 0 },
    '265/35R19': { rim_d: 19, rim_w: 9, et: 35, spacer: 0 },
    '31x10.5R15': { rim_d: 15, rim_w: 8, et: -19, spacer: 0 }
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
      const corrected = cmp.speedoErrPct + (baseline?.baseSpeedoError || 0);
      const cls = Math.abs(corrected) > 2 ? 'warn' : 'good';
      alerts.push({ text: `Speedometer change vs baseline: ${corrected.toFixed(2)}%`, cls });
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
      btn.textContent = s.tireStr || s.id;
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
    const all = getSetups();
    const invalids = all.filter(s => s.diamMismatch);
    const setups = all.filter(s => !s.diamMismatch && s.tireGeom && s.wheelGeom);

    // Tabs for selecting which setup to view
    renderTabs(setups);

    renderComparison(baseline, setups, unitMode);

    // Selected setup for visuals/alerts
    const selected = setups.find(s => s.id === selectedSetupId) || setups[0];
    drawSideView(baseline, selected, unitMode);
    drawTopView(baseline, selected);

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
  }

  // Theme toggle
  function initTheme() {
    const toggle = $("#themeToggle");
    toggle.addEventListener('change', () => {
      document.documentElement.setAttribute('data-theme', toggle.checked ? 'dark' : 'light');
    });
  }

  // Unit toggle
  function initUnits() {
    $("#unitToggle").addEventListener('change', renderAll);
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

  // Baseline save
  function initBaseline() {
    $("#saveBaseline").addEventListener('click', saveBaseline);
    // Recompute on input changes for live feedback
    $$('#base input').forEach(inp => inp.addEventListener('input', debounce(() => { if (baseline) saveBaseline(); }, 150)));
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
  }

  // Session save/load
  function serializeSession() {
    const base = {
      tire: $('#base_tire').value,
      correction: parseFloat($('#base_correction').value || '0') || 0,
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
    // Theme and units
    $('#themeToggle').checked = !!sess.themeDark;
    document.documentElement.setAttribute('data-theme', sess.themeDark ? 'dark' : 'light');
    if (sess.unit) $('#unitToggle').value = sess.unit;

    // Baseline
    if (sess.base) {
      $('#base_tire').value = sess.base.tire || '';
      $('#base_correction').value = sess.base.correction ?? 0;
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

  function initSessionIO() {
    const saveBtn = document.getElementById('saveSessionBtn');
    const loadBtn = document.getElementById('loadSessionBtn');
    if (saveBtn) saveBtn.addEventListener('click', saveSession);
    if (loadBtn) loadBtn.addEventListener('click', loadSession);
  }

  // Utilities
  function debounce(fn, wait) {
    let t; return function (...args) { clearTimeout(t); t = setTimeout(() => fn.apply(this, args), wait); };
  }

  // Initialize
  function init() {
    initTheme();
    initUnits();
    initPresets();
    initBaseline();
    initSetups();
    initSessionIO();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
