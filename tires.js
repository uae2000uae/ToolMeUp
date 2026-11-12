/*
  ToolMeUp • Tire Size & Speedometer
  Parses metric (225/45R17, P/LT prefixes) and flotation (33x12.50R20)
  sizes, compares them, draws them to scale, and works out speedo error.
*/
(function () {
  "use strict";
  const TM = window.ToolMeUp, K = window.Kit, t = TM.t, $ = (id) => document.getElementById(id), esc = TM.esc;
  const CA = "#3b82f6"; // current size color

  TM.addStrings({
    t_title: "مقاس الإطار وعدّاد السرعة",
    t_lead: "اعرف بالضبط كيف يقارَن مقاس الإطار الجديد بمقاسك الحالي — وما الذي تعنيه قراءة عدّاد السرعة فعلاً.",
    t_current: "المقاس الحالي", t_new: "المقاس الجديد", t_swap: "تبديل المقاسين",
    t_tab_compare: "مقارنة المقاسات", t_tab_speedo: "عدّاد السرعة", t_diff: "الفرق",
    t_bad: "مقاس غير مفهوم — جرّب صيغة مثل 225/45R17",
    t_ok_metric: "عرض {w} مم · جدار {a}% · جنط {r}\"", t_ok_flot: "قطر {d}\" · عرض {w}\" · جنط {r}\"",
    t_row_width: "عرض الإطار", t_row_side: "ارتفاع الجدار الجانبي", t_row_rim: "قطر الجنط", t_row_dia: "القطر الكلي",
    t_row_circ: "المحيط", t_row_rkm: "الدورات لكل كم", t_row_rmi: "الدورات لكل ميل", t_row_clear: "تغيّر الخلوص الأرضي", t_row_speedo: "السرعة الحقيقية عند قراءة 100",
    t_v_good: "توافق ممتاز", t_v_good_s: "القطر يختلف بنسبة {p}% — ضمن الحد الموصى به ±3%.",
    t_v_warn: "توافق حدّي", t_v_warn_s: "القطر يختلف بنسبة {p}%. قد يعمل، لكن تأكد من خلوص الرفرف وتأثيره على عدّاد السرعة وأنظمة ABS.",
    t_v_bad: "فرق كبير", t_v_bad_s: "القطر يختلف بنسبة {p}% — أكثر من الحد الموصى به ±3%. توقّع خطأً واضحاً في عدّاد السرعة واحتمال احتكاك.",
    t_indicated: "قراءة العدّاد", t_actual: "سرعتك الحقيقية", t_shows: "قراءة العدّاد", t_real: "السرعة الحقيقية",
    t_act_faster: "أسرع بـ {d} مما يظهر", t_act_slower: "أبطأ بـ {d} مما يظهر", t_act_same: "مطابقة تماماً",
    t_sp_note: "يفترض الحساب أن عدّاد السرعة كان دقيقاً مع المقاس الحالي. عادةً ما تجعل الشركات المصنعة العدّاد يقرأ أعلى قليلاً من السرعة الحقيقية.",
    t_how1: "أدخل مقاس إطارك الحالي والمقاس الذي تفكر فيه كما هو مطبوع على جانب الإطار — مثل <code>225/45R17</code> أو <code>LT265/70R17</code> أو <code>33x12.50R20</code>.",
    t_how2: "<b>مقارنة المقاسات</b> تعرض كل الأبعاد مع رسم بمقياس حقيقي وتقييم للتوافق. توصي معظم الشركات بألا يتجاوز فرق القطر الكلي ±3%.",
    t_how3: "<b>عدّاد السرعة</b> يعرض سرعتك الحقيقية لأي قراءة، بافتراض أن العدّاد كان دقيقاً مع المقاس الحالي.",
    t_faq1_q: "كيف أقرأ مقاس إطار مثل 225/45R17؟",
    t_faq1_a: "225 هو عرض المداس بالمليمتر، و45 هو ارتفاع الجدار الجانبي كنسبة مئوية من العرض (45% من 225 مم ≈ 101 مم)، وR تعني بناءً شعاعياً، و17 هو قطر الجنط بالبوصة.",
    t_faq2_q: "لماذا يجعل الإطار الأكبر عدّاد السرعة يقرأ أقل؟",
    t_faq2_a: "الإطار الأطول يقطع مسافة أكبر في كل دورة. العدّاد يحسب الدورات، لذا عند قراءة 100 تكون السيارة فعلياً أسرع. الإطارات الأصغر تفعل العكس.",
    t_more: "تحتاج الأوفست والفواصل وخلوص الرفرف؟ استخدم حاسبة <a href=\"fitment.html\">مقاسات الجنوط والإطارات</a> الكاملة."
  });

  const COMMON = ["195/65R15", "205/55R16", "215/60R16", "225/45R17", "225/55R18", "235/40R18", "245/40R19", "255/35R20", "265/70R17", "275/55R20", "285/45R22", "33x12.50R20"];

  function parseTire(raw) {
    const s = String(raw || "").toUpperCase().replace(/\s+/g, "");
    let m = /^(?:P|LT|ST|T)?(\d{3})\/(\d{2,3})(?:ZR|R|D|B|-)(\d{2}(?:\.5)?)/.exec(s);
    if (m) {
      const w = +m[1], a = +m[2], r = +m[3], side = w * a / 100;
      return { kind: "metric", w: w, a: a, r: r, side: side, dia: r * 25.4 + 2 * side };
    }
    m = /^(?:LT)?(\d{2}(?:\.\d+)?)X(\d{1,2}(?:\.\d+)?)(?:ZR|R|-|LT)?(\d{2}(?:\.5)?)/.exec(s);
    if (m) {
      const d = +m[1], wi = +m[2], r = +m[3];
      if (r >= d) return null;
      return { kind: "flot", d: d, wi: wi, r: r, w: wi * 25.4, side: (d - r) / 2 * 25.4, dia: d * 25.4, a: ((d - r) / 2 / wi) * 100 };
    }
    return null;
  }
  const circ = (x) => Math.PI * x.dia;
  let unit = K.load("tires:unit", "mm"), spUnit = K.load("tires:spunit", "kmh");
  const len = (mm, dec) => (unit === "in" ? K.fmt(mm / 25.4, dec === undefined ? 2 : dec) + "\"" : K.fmt(mm, dec === undefined ? 1 : dec) + " mm");
  const sgn = (v, f) => (v > 0 ? "+" : v < 0 ? "−" : "±") + f(Math.abs(v));
  const pct = (a, b) => ((b - a) / a) * 100;

  function describe(x) {
    return x.kind === "flot" ? t("t_ok_flot", "{d}\" tall · {w}\" wide · {r}\" rim", { d: x.d, w: x.wi, r: x.r })
      : t("t_ok_metric", "{w} mm wide · {a}% sidewall · {r}\" rim", { w: x.w, a: x.a, r: x.r });
  }

  // ---- drawings ------------------------------------------------------------
  function drawSide(A, B) {
    const W = 400, H = 300, ground = 280, maxD = Math.max(A.dia, B.dia), k = 250 / maxD, cx = 200;
    const circ2 = (x, col, dash, fill) => {
      const R = (x.dia / 2) * k, r = (x.r * 25.4 / 2) * k, cy = ground - R;
      return '<circle cx="' + cx + '" cy="' + cy + '" r="' + R + '" fill="' + (fill || "none") + '"' + (fill ? ' fill-opacity=".14"' : "") + ' stroke="' + col + '" stroke-width="2.5"' + (dash ? ' stroke-dasharray="7 5"' : "") + "/>" +
        '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="' + col + '" stroke-width="1.5" opacity=".7"' + (dash ? ' stroke-dasharray="4 4"' : "") + "/>" +
        '<circle cx="' + cx + '" cy="' + cy + '" r="' + r * 0.25 + '" fill="' + col + '" opacity=".35"/>';
    };
    const hb = K.cssVar("--h", $("t_side"));
    const ta = ground - A.dia * k, tb = ground - B.dia * k;
    $("t_side").setAttribute("viewBox", "0 0 " + W + " " + H);
    $("t_side").innerHTML =
      '<line x1="20" x2="380" y1="' + ground + '" y2="' + ground + '" stroke="currentColor" stroke-width="2" opacity=".35"/>' +
      circ2(B, hb, false, hb) + circ2(A, CA, true) +
      '<line x1="330" x2="360" y1="' + ta + '" y2="' + ta + '" stroke="' + CA + '" stroke-width="1.5"/>' +
      '<line x1="330" x2="360" y1="' + tb + '" y2="' + tb + '" stroke="' + hb + '" stroke-width="1.5"/>' +
      '<text x="366" y="' + (Math.min(ta, tb) - 6) + '" font-size="12" fill="currentColor" text-anchor="end" opacity=".8">' + esc(sgn((B.dia - A.dia) / 2, (v) => len(v))) + "</text>";
  }
  function drawFront(A, B) {
    const ground = 280, maxD = Math.max(A.dia, B.dia), maxW = Math.max(A.w, B.w), k = Math.min(250 / maxD, 220 / maxW), cx = 150;
    const hb = K.cssVar("--h", $("t_front"));
    const rect = (x, col, dash, fill) => {
      const w = x.w * k, h = x.dia * k;
      return '<rect x="' + (cx - w / 2) + '" y="' + (ground - h) + '" width="' + w + '" height="' + h + '" rx="' + Math.min(w * 0.22, 26) + '" fill="' + (fill || "none") + '"' + (fill ? ' fill-opacity=".14"' : "") +
        ' stroke="' + col + '" stroke-width="2.5"' + (dash ? ' stroke-dasharray="7 5"' : "") + "/>";
    };
    $("t_front").innerHTML =
      '<line x1="20" x2="280" y1="' + ground + '" y2="' + ground + '" stroke="currentColor" stroke-width="2" opacity=".35"/>' +
      rect(B, hb, false, hb) + rect(A, CA, true) +
      '<text x="' + cx + '" y="' + (ground - Math.max(A.dia, B.dia) * k - 8) + '" font-size="12" fill="currentColor" text-anchor="middle" opacity=".8">' +
      esc(sgn(B.w - A.w, (v) => len(v, unit === "in" ? 2 : 0))) + "</text>";
  }

  // ---- compare -----------------------------------------------------------------
  function compare(A, B) {
    const p = pct(A.dia, B.dia), ap = Math.abs(p);
    const v = ap <= 3 ? ["good", "t_v_good", "Great match", "t_v_good_s", "Diameter differs by {p}% — within the recommended ±3%."]
      : ap <= 5 ? ["warn", "t_v_warn", "Borderline", "t_v_warn_s", "Diameter differs by {p}%. It may work, but check fender clearance and the effect on the speedometer and ABS."]
        : ["bad", "t_v_bad", "Big difference", "t_v_bad_s", "Diameter differs by {p}% — more than the recommended ±3%. Expect a noticeable speedometer error and possible rubbing."];
    $("t_verdict").className = "verdict verdict--" + v[0];
    $("t_verdict").innerHTML = '<b>' + esc(t(v[1], v[2])) + '</b><span>' + esc(t(v[3], v[4], { p: (p > 0 ? "+" : "") + K.fmt(p, 2) })) + "</span>";
    const rows = [
      ["t_row_width", "Section width", len(A.w, unit === "in" ? 2 : 0), len(B.w, unit === "in" ? 2 : 0), B.w - A.w, (d) => len(d, unit === "in" ? 2 : 0)],
      ["t_row_side", "Sidewall height", len(A.side), len(B.side), B.side - A.side, (d) => len(d)],
      ["t_row_rim", "Rim diameter", A.r + "\"", B.r + "\"", B.r - A.r, (d) => K.fmt(d, 1) + "\""],
      ["t_row_dia", "Overall diameter", len(A.dia), len(B.dia), B.dia - A.dia, (d) => len(d), true],
      ["t_row_circ", "Circumference", len(circ(A), unit === "in" ? 1 : 0), len(circ(B), unit === "in" ? 1 : 0), circ(B) - circ(A), (d) => len(d, unit === "in" ? 1 : 0)],
      ["t_row_rkm", "Revolutions per km", K.fmt(1e6 / circ(A), 0), K.fmt(1e6 / circ(B), 0), 1e6 / circ(B) - 1e6 / circ(A), (d) => K.fmt(d, 0)],
      ["t_row_rmi", "Revolutions per mile", K.fmt(1609344 / circ(A), 0), K.fmt(1609344 / circ(B), 0), 1609344 / circ(B) - 1609344 / circ(A), (d) => K.fmt(d, 0)],
      ["t_row_clear", "Ground clearance change", "—", "—", (B.dia - A.dia) / 2, (d) => len(d)],
      ["t_row_speedo", "Real speed at a reading of 100", "100", K.fmt(100 * B.dia / A.dia, 1), 100 * B.dia / A.dia - 100, (d) => K.fmt(d, 1)]
    ];
    $("t_table").querySelector("tbody").innerHTML = rows.map((r) => {
      const d = r[4], show = Math.abs(d) < 1e-9 ? "—" : sgn(d, r[5]) + (r[6] ? " (" + (p > 0 ? "+" : "") + K.fmt(p, 2) + "%)" : "");
      return "<tr" + (r[6] ? ' class="is-key"' : "") + "><td>" + esc(t(r[0], r[1])) + '</td><td class="num">' + r[2] + '</td><td class="num">' + r[3] +
        '</td><td class="num ' + (d > 1e-9 ? "up" : d < -1e-9 ? "down" : "") + '">' + show + "</td></tr>";
    }).join("");
    drawSide(A, B); drawFront(A, B);
  }

  // ---- speedometer ------------------------------------------------------------------
  function speedo(A, B) {
    const ratio = B.dia / A.dia, ind = +$("t_ind").value, max = spUnit === "kmh" ? 220 : 140, u = spUnit === "kmh" ? "km/h" : "mph";
    $("t_ind").max = max - 20; if (ind > max - 20) $("t_ind").value = max - 20;
    const shown = +$("t_ind").value, real = shown * ratio;
    $("t_ind_v").textContent = shown + " " + u;
    $("t_act").textContent = K.fmt(real, 1) + " " + u;
    const d = real - shown;
    $("t_act_sub").textContent = Math.abs(d) < 0.05 ? t("t_act_same", "Exactly the same") : d > 0 ? t("t_act_faster", "{d} faster than shown", { d: K.fmt(d, 1) + " " + u }) : t("t_act_slower", "{d} slower than shown", { d: K.fmt(-d, 1) + " " + u });
    $("t_act_sub").className = "stat__sub " + (d > 0.05 ? "down" : d < -0.05 ? "up" : "");
    $("t_sp_note").textContent = t("t_sp_note", "Assumes your speedometer was accurate on the current size. From the factory, most speedometers read slightly higher than your true speed.");
    // dial: 240° sweep from 150° to 390°
    const cx = 150, cy = 140, R = 110, a0 = 150, sweep = 240;
    const ang = (v) => ((a0 + (Math.min(v, max) / max) * sweep) * Math.PI) / 180;
    const pt = (v, r) => [cx + Math.cos(ang(v)) * r, cy + Math.sin(ang(v)) * r];
    const arc = (v1, v2, r) => { const p1 = pt(v1, r), p2 = pt(v2, r); return "M" + p1[0] + " " + p1[1] + " A" + r + " " + r + " 0 " + ((v2 - v1) / max * sweep > 180 ? 1 : 0) + " 1 " + p2[0] + " " + p2[1]; };
    const hb = K.cssVar("--h", $("t_dial"));
    let ticks = "";
    for (let v = 0; v <= max; v += spUnit === "kmh" ? 10 : 5) {
      const major = v % (spUnit === "kmh" ? 20 : 20) === 0, p1 = pt(v, R - (major ? 12 : 6)), p2 = pt(v, R);
      ticks += '<line x1="' + p1[0] + '" y1="' + p1[1] + '" x2="' + p2[0] + '" y2="' + p2[1] + '" stroke="currentColor" stroke-width="' + (major ? 2 : 1) + '" opacity="' + (major ? 0.7 : 0.35) + '"/>';
      if (major) { const pl = pt(v, R - 26); ticks += '<text x="' + pl[0] + '" y="' + (pl[1] + 4) + '" font-size="11" text-anchor="middle" fill="currentColor" opacity=".75">' + v + "</text>"; }
    }
    const needle = (v, col, w, len2) => { const p = pt(v, len2); return '<line x1="' + cx + '" y1="' + cy + '" x2="' + p[0] + '" y2="' + p[1] + '" stroke="' + col + '" stroke-width="' + w + '" stroke-linecap="round"/>'; };
    $("t_dial").innerHTML =
      '<path d="' + arc(0, max, R) + '" fill="none" stroke="currentColor" stroke-width="2" opacity=".2"/>' +
      '<path d="' + arc(Math.min(shown, real), Math.max(shown, real), R + 8) + '" fill="none" stroke="' + hb + '" stroke-width="6" stroke-linecap="round" opacity=".55"/>' +
      ticks + needle(shown, "currentColor", 3, R - 18) + needle(real, hb, 4, R - 4) +
      '<circle cx="' + cx + '" cy="' + cy + '" r="7" fill="' + hb + '"/>' +
      '<text x="' + cx + '" y="' + (cy + 46) + '" font-size="26" font-weight="700" text-anchor="middle" fill="' + hb + '">' + K.fmt(real, 0) + "</text>" +
      '<text x="' + cx + '" y="' + (cy + 64) + '" font-size="12" text-anchor="middle" fill="currentColor" opacity=".6">' + u + "</text>";
    const step = spUnit === "kmh" ? 20 : 10, rows = [];
    for (let v = step; v <= (spUnit === "kmh" ? 180 : 110); v += step) {
      const r = v * ratio, dd = r - v;
      rows.push("<tr><td>" + v + " " + u + '</td><td class="num">' + K.fmt(r, 1) + " " + u + '</td><td class="num ' + (dd > 0.05 ? "down" : dd < -0.05 ? "up" : "") + '">' + sgn(dd, (x) => K.fmt(x, 1)) + "</td></tr>");
    }
    $("t_sptable").querySelector("tbody").innerHTML = rows.join("");
  }

  function run() {
    const A = parseTire($("t_a").value), B = parseTire($("t_b").value);
    [["t_a", A], ["t_b", B]].forEach(([id, x]) => {
      $(id).classList.toggle("is-bad", !x);
      $(id + "_ok").textContent = x ? describe(x) : t("t_bad", "Size not recognised — try e.g. 225/45R17");
    });
    if (!A || !B) return;
    compare(A, B); speedo(A, B);
  }

  K.ready(() => {
    K.keepInputs("tires");
    K.tabs("tires", run);
    $("t_common").innerHTML = COMMON.map((s) => '<button type="button" data-s="' + s + '">' + s + "</button>").join("");
    $("t_common").addEventListener("click", (e) => {
      const b = e.target.closest("[data-s]");
      if (!b) return;
      $("t_b").value = b.dataset.s; $("t_b").dispatchEvent(new Event("input"));
    });
    ["t_a", "t_b"].forEach((id) => $(id).addEventListener("input", run));
    $("t_swap").addEventListener("click", () => {
      const a = $("t_a").value; $("t_a").value = $("t_b").value; $("t_b").value = a;
      ["t_a", "t_b"].forEach((id) => $(id).dispatchEvent(new Event("input")));
    });
    const pills = (id, attr, val) => $(id).querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.getAttribute(attr) === val)));
    $("t_units").addEventListener("click", (e) => { const b = e.target.closest("[data-u]"); if (b) { unit = b.dataset.u; K.save("tires:unit", unit); pills("t_units", "data-u", unit); run(); } });
    $("t_spunit").addEventListener("click", (e) => { const b = e.target.closest("[data-s]"); if (b) { spUnit = b.dataset.s; K.save("tires:spunit", spUnit); pills("t_spunit", "data-s", spUnit); run(); } });
    pills("t_units", "data-u", unit); pills("t_spunit", "data-s", spUnit);
    $("t_ind").addEventListener("input", run);
    K.onLang(run); K.onTheme(run);
    run();
  });
})();
