/*
  ToolMeUp • Calculator Suite
  Five sub-calculators in tabs: basic, percentage, loan/interest,
  video ratio & pixel size comparison, BMI. No dependencies.
*/
(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const fmt = (n, d) =>
    Number(n).toLocaleString(undefined, {
      maximumFractionDigits: d === undefined ? 2 : d,
      minimumFractionDigits: 0
    });

  // ---- Tabs (with deep-link support: calculators.html#loan) -------------
  const TAB_KEY = "toolmeup:calc-tab";
  function activateTab(name, push) {
    const tabs = document.querySelectorAll("[data-calc-tab]");
    const panes = document.querySelectorAll("[data-calc-pane]");
    let found = false;
    tabs.forEach((t) => {
      const on = t.getAttribute("data-calc-tab") === name;
      if (on) found = true;
      t.classList.toggle("active", on);
      t.setAttribute("aria-selected", String(on));
    });
    if (!found) return;
    panes.forEach((p) => { p.hidden = p.getAttribute("data-calc-pane") !== name; });
    try { localStorage.setItem(TAB_KEY, name); } catch (_) {}
    if (push) history.replaceState(null, "", "#" + name);
  }
  function wireTabs() {
    document.querySelectorAll("[data-calc-tab]").forEach((t) => {
      t.addEventListener("click", () => activateTab(t.getAttribute("data-calc-tab"), true));
    });
    const fromHash = location.hash.replace("#", "");
    let initial = fromHash;
    if (!initial) { try { initial = localStorage.getItem(TAB_KEY); } catch (_) {} }
    activateTab(initial || "basic", false);
  }

  // ---- Basic calculator --------------------------------------------------
  // Small expression evaluator (shunting-yard) — no eval().
  function tokenize(expr) {
    const out = [];
    let i = 0;
    while (i < expr.length) {
      const c = expr[i];
      if (/[0-9.]/.test(c)) {
        let j = i;
        while (j < expr.length && /[0-9.]/.test(expr[j])) j++;
        out.push({ t: "num", v: parseFloat(expr.slice(i, j)) });
        i = j;
      } else if ("+-*/%".includes(c)) {
        // Unary minus: at start or right after another operator
        if (c === "-" && (out.length === 0 || out[out.length - 1].t === "op")) {
          let j = i + 1;
          while (j < expr.length && /[0-9.]/.test(expr[j])) j++;
          if (j === i + 1) return null;
          out.push({ t: "num", v: -parseFloat(expr.slice(i + 1, j)) });
          i = j;
        } else {
          out.push({ t: "op", v: c });
          i++;
        }
      } else return null;
    }
    return out;
  }
  function evaluate(expr) {
    const tokens = tokenize(expr);
    if (!tokens || !tokens.length) return null;
    // "%": postfix percent → divide previous number by 100
    const clean = [];
    for (const tk of tokens) {
      if (tk.t === "op" && tk.v === "%") {
        const prev = clean[clean.length - 1];
        if (!prev || prev.t !== "num") return null;
        prev.v = prev.v / 100;
      } else clean.push(tk);
    }
    if (clean[clean.length - 1].t === "op") return null;
    // two-pass precedence: * / first, then + -
    const pass1 = [];
    for (let i = 0; i < clean.length; i++) {
      const tk = clean[i];
      if (tk.t === "op" && (tk.v === "*" || tk.v === "/")) {
        const a = pass1.pop(), b = clean[++i];
        if (!a || !b || a.t !== "num" || b.t !== "num") return null;
        pass1.push({ t: "num", v: tk.v === "*" ? a.v * b.v : a.v / b.v });
      } else pass1.push(tk);
    }
    let acc = pass1[0].v;
    for (let i = 1; i < pass1.length; i += 2) {
      const op = pass1[i], b = pass1[i + 1];
      if (!op || !b || op.t !== "op" || b.t !== "num") return null;
      acc = op.v === "+" ? acc + b.v : acc - b.v;
    }
    return Number.isFinite(acc) ? acc : null;
  }

  function wireBasic() {
    const exprEl = $("calc_expr"), resEl = $("calc_result"), keys = $("calc_keys");
    if (!keys) return;
    let expr = "";
    let justEvaluated = false;

    function lastNumStart() {
      let i = expr.length;
      while (i > 0 && /[0-9.]/.test(expr[i - 1])) i--;
      return i;
    }
    function render() {
      exprEl.innerHTML = expr ? expr.replace(/\*/g, "×").replace(/\//g, "÷") : "&nbsp;";
      const v = evaluate(expr);
      resEl.textContent = v === null ? (expr ? "…" : "0") : fmt(v, 10);
    }
    function press(k) {
      if (k === "ac") { expr = ""; justEvaluated = false; }
      else if (k === "del") { expr = expr.slice(0, -1); }
      else if (k === "=") {
        const v = evaluate(expr);
        if (v !== null) { expr = String(v); justEvaluated = true; }
      }
      else if (k === "neg") {
        const s = lastNumStart();
        if (s < expr.length) {
          if (s > 0 && expr[s - 1] === "-" && (s === 1 || "+-*/%".includes(expr[s - 2]))) {
            expr = expr.slice(0, s - 1) + expr.slice(s); // remove existing unary minus
          } else {
            expr = expr.slice(0, s) + "-" + expr.slice(s);
          }
        }
      }
      else if ("+-*/%".includes(k)) {
        if (!expr && k !== "-") return;
        if (expr && "+-*/".includes(expr[expr.length - 1])) expr = expr.slice(0, -1) + k;
        else expr += k;
        justEvaluated = false;
      }
      else { // digit or dot
        if (justEvaluated) { expr = ""; justEvaluated = false; }
        if (k === ".") {
          const tail = expr.slice(lastNumStart());
          if (tail.includes(".")) return;
          if (!tail) expr += "0";
        }
        expr += k;
      }
      render();
    }

    keys.addEventListener("click", (e) => {
      const b = e.target.closest("button[data-k]");
      if (b) press(b.getAttribute("data-k"));
    });

    document.addEventListener("keydown", (e) => {
      // only when the Basic tab is visible and no input is focused
      const pane = document.querySelector('[data-calc-pane="basic"]');
      if (!pane || pane.hidden) return;
      const tag = (document.activeElement || {}).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const k = e.key;
      if (/^[0-9.]$/.test(k) || "+-*/%".includes(k)) { press(k); e.preventDefault(); }
      else if (k === "Enter" || k === "=") { press("="); e.preventDefault(); }
      else if (k === "Backspace") { press("del"); e.preventDefault(); }
      else if (k === "Escape") { press("ac"); }
    });

    render();
  }

  // ---- Percentage calculator ---------------------------------------------
  function wirePercent() {
    const rows = [
      { ins: ["pct_a1", "pct_a2"], out: "pct_a_out",
        calc: (a, b) => fmt((a / 100) * b) },
      { ins: ["pct_b1", "pct_b2"], out: "pct_b_out",
        calc: (a, b) => (b === 0 ? null : fmt((a / b) * 100) + "%") },
      { ins: ["pct_c1", "pct_c2"], out: "pct_c_out",
        calc: (a, b) => {
          if (a === 0) return null;
          const p = ((b - a) / Math.abs(a)) * 100;
          return (p >= 0 ? "+" : "") + fmt(p) + "%";
        } },
      { ins: ["pct_d1", "pct_d2"], out: "pct_d_out",
        calc: (a, b) => "↑ " + fmt(a * (1 + b / 100)) + "  /  ↓ " + fmt(a * (1 - b / 100)) }
    ];
    rows.forEach((r) => {
      const els = r.ins.map($);
      if (els.some((e) => !e)) return;
      const upd = () => {
        const vals = els.map((e) => parseFloat(e.value));
        const out = $(r.out);
        if (vals.some((v) => !Number.isFinite(v))) { out.textContent = "—"; return; }
        const res = r.calc(vals[0], vals[1]);
        out.textContent = res === null ? "—" : res;
      };
      els.forEach((e) => e.addEventListener("input", upd));
    });
  }

  // ---- Loan / interest ---------------------------------------------------
  function wireLoan() {
    const amount = $("loan_amount"), rate = $("loan_rate"), years = $("loan_years");
    if (!amount) return;

    function updLoan() {
      const P = parseFloat(amount.value), annual = parseFloat(rate.value), Y = parseFloat(years.value);
      const box = $("loan_summary");
      const tbody = $("loan_schedule").querySelector("tbody");
      if (!(P > 0) || !(Y > 0) || !Number.isFinite(annual) || annual < 0) {
        box.hidden = true; tbody.innerHTML = ""; return;
      }
      const n = Math.round(Y * 12);
      const r = annual / 100 / 12;
      const m = r === 0 ? P / n : (P * r) / (1 - Math.pow(1 + r, -n));
      const total = m * n;
      $("loan_monthly").textContent = fmt(m);
      $("loan_total").textContent = fmt(total);
      $("loan_interest").textContent = fmt(total - P);
      box.hidden = false;

      // yearly amortization
      let bal = P, rows = "";
      for (let y = 1; y <= Math.ceil(Y); y++) {
        let pPaid = 0, iPaid = 0;
        for (let mm = 0; mm < 12 && (y - 1) * 12 + mm < n; mm++) {
          const i = bal * r;
          const p = Math.min(m - i, bal);
          iPaid += i; pPaid += p; bal -= p;
        }
        rows += "<tr><td>" + y + "</td><td>" + fmt(pPaid) + "</td><td>" + fmt(iPaid) +
                "</td><td>" + fmt(Math.max(bal, 0)) + "</td></tr>";
      }
      tbody.innerHTML = rows;
    }
    [amount, rate, years].forEach((e) => e.addEventListener("input", updLoan));

    // simple / compound interest
    const ip = $("int_principal"), ir = $("int_rate"), iy = $("int_years"), ic = $("int_compound");
    function updInt() {
      const P = parseFloat(ip.value), R = parseFloat(ir.value), Y = parseFloat(iy.value);
      const box = $("int_summary");
      if (!(P > 0) || !Number.isFinite(R) || R < 0 || !(Y > 0)) { box.hidden = true; return; }
      const nPer = parseInt(ic.value, 10);
      const A = nPer === 0
        ? P * (1 + (R / 100) * Y)                       // simple
        : P * Math.pow(1 + R / 100 / nPer, nPer * Y);   // compound
      $("int_final").textContent = fmt(A);
      $("int_earned").textContent = fmt(A - P);
      box.hidden = false;
    }
    [ip, ir, iy, ic].forEach((e) => e.addEventListener("input", updInt));
    ic.addEventListener("change", updInt);
  }

  // ---- Video ratio & pixel size ------------------------------------------
  const COMMON_RES = [
    ["SD (480p)", 640, 480], ["HD (720p)", 1280, 720], ["Full HD (1080p)", 1920, 1080],
    ["2K DCI", 2048, 1080], ["QHD (1440p)", 2560, 1440], ["4K UHD", 3840, 2160],
    ["4K DCI", 4096, 2160], ["8K UHD", 7680, 4320],
    ["Vertical HD", 720, 1280], ["Vertical FHD", 1080, 1920], ["Square 1080", 1080, 1080]
  ];
  function gcd(a, b) { return b ? gcd(b, a % b) : a; }
  function ratioOf(w, h) {
    const g = gcd(w, h);
    let rw = w / g, rh = h / g;
    // report friendly names for near-cinema ratios
    if (rw / rh > 2.3 && rw / rh < 2.5) return (rw / rh).toFixed(2) + ":1";
    if (rw > 100 || rh > 100) return (w / h).toFixed(2) + ":1";
    return rw + ":" + rh;
  }
  function nameOf(w, h) {
    const hit = COMMON_RES.find((r) => r[1] === w && r[2] === h);
    return hit ? hit[0] : null;
  }
  function wireVideo() {
    const wEl = $("vid_w"), hEl = $("vid_h"), rEl = $("vid_ratio");
    if (!wEl) return;

    function parseRatio(s) {
      const m = s.split(":");
      if (m.length !== 2) return null;
      const a = parseFloat(m[0]), b = parseFloat(m[1]);
      return a > 0 && b > 0 ? a / b : null;
    }

    let lastEdited = null;
    function upd(src) {
      if (src === "w" || src === "h") lastEdited = src;
      const w = parseInt(wEl.value, 10), h = parseInt(hEl.value, 10);
      const R = rEl.value ? parseRatio(rEl.value) : null;
      const box = $("vid_summary"), info = $("vid_info");

      // Ratio selected + one dimension → fill the other
      if (R) {
        if (lastEdited === "w" && w > 0) hEl.value = Math.round(w / R);
        else if (lastEdited === "h" && h > 0) wEl.value = Math.round(h * R);
        else if (w > 0 && !(h > 0)) hEl.value = Math.round(w / R);
        else if (h > 0 && !(w > 0)) wEl.value = Math.round(h * R);
      }
      const W = parseInt(wEl.value, 10), H = parseInt(hEl.value, 10);
      if (!(W > 0) || !(H > 0)) { box.hidden = true; return; }
      const mp = (W * H) / 1e6;
      const name = nameOf(W, H);
      info.innerHTML =
        "<strong>" + W + " × " + H + "</strong>" +
        (name ? " (" + name + ")" : "") +
        " • ratio <strong>" + ratioOf(W, H) + "</strong>" +
        " • <strong>" + fmt(W * H, 0) + "</strong> px (" + mp.toFixed(2) + " MP)";
      box.hidden = false;
    }
    wEl.addEventListener("input", () => upd("w"));
    hEl.addEventListener("input", () => upd("h"));
    rEl.addEventListener("change", () => upd());

    // comparison
    const ids = ["cmp_aw", "cmp_ah", "cmp_bw", "cmp_bh"];
    function updCmp() {
      const [aw, ah, bw, bh] = ids.map((i) => parseInt($(i).value, 10));
      const box = $("cmp_summary"), info = $("cmp_info"), cv = $("cmp_canvas");
      if (!(aw > 0) || !(ah > 0) || !(bw > 0) || !(bh > 0)) { box.hidden = true; cv.hidden = true; return; }
      const pa = aw * ah, pb = bw * bh;
      const bigger = pb >= pa ? "B" : "A";
      const factor = Math.max(pa, pb) / Math.min(pa, pb);
      info.innerHTML =
        "A: <strong>" + aw + "×" + ah + "</strong> (" + ratioOf(aw, ah) + ", " + fmt(pa, 0) + " px) &nbsp;vs&nbsp; " +
        "B: <strong>" + bw + "×" + bh + "</strong> (" + ratioOf(bw, bh) + ", " + fmt(pb, 0) + " px)<br>" +
        "<strong>" + bigger + "</strong> has <strong>" + factor.toFixed(2) + "×</strong> the pixels of the other.";
      box.hidden = false;

      // draw overlay
      cv.hidden = false;
      const ctx = cv.getContext("2d");
      ctx.clearRect(0, 0, cv.width, cv.height);
      const pad = 20;
      const scale = Math.min(
        (cv.width - pad * 2) / Math.max(aw, bw),
        (cv.height - pad * 2) / Math.max(ah, bh)
      );
      const styles = getComputedStyle(document.documentElement);
      const colA = "#4aa3ff", colB = "#22c55e";
      const fg = styles.getPropertyValue("--fg").trim() || "#888";
      [[aw, ah, colA, "A"], [bw, bh, colB, "B"]].forEach(([w2, h2, col, label]) => {
        const dw = w2 * scale, dh = h2 * scale;
        ctx.strokeStyle = col; ctx.lineWidth = 2.5;
        ctx.fillStyle = col + "22";
        ctx.fillRect(pad, pad, dw, dh);
        ctx.strokeRect(pad, pad, dw, dh);
        ctx.fillStyle = col;
        ctx.font = "600 13px Inter, sans-serif";
        ctx.fillText(label + " " + w2 + "×" + h2, pad + dw - ctx.measureText(label + " " + w2 + "×" + h2).width - 6,
          pad + dh - 8 > pad + 14 ? pad + dh - 8 : pad + 14);
      });
      ctx.fillStyle = fg;
    }
    ids.forEach((i) => $(i).addEventListener("input", updCmp));

    // reference table
    const tbody = $("vid_reference").querySelector("tbody");
    tbody.innerHTML = COMMON_RES.map(
      (r) => "<tr><td>" + r[0] + "</td><td>" + r[1] + "×" + r[2] + "</td><td>" +
             ratioOf(r[1], r[2]) + "</td><td>" + ((r[1] * r[2]) / 1e6).toFixed(2) + "</td></tr>"
    ).join("");
  }

  // ---- BMI ---------------------------------------------------------------
  function wireBmi() {
    const imp = $("bmi_imperial");
    if (!imp) return;
    const metricBox = $("bmi_metric_fields"), impBox = $("bmi_imperial_fields");

    function categorize(bmi) {
      if (bmi < 18.5) return ["Underweight", "warn"];
      if (bmi < 25) return ["Normal weight", "good"];
      if (bmi < 30) return ["Overweight", "warn"];
      return ["Obese", "bad"];
    }
    function upd() {
      let kg, m;
      if (imp.checked) {
        const lb = parseFloat($("bmi_lb").value);
        const ft = parseFloat($("bmi_ft").value) || 0;
        const inch = parseFloat($("bmi_in").value) || 0;
        const totalIn = ft * 12 + inch;
        kg = lb * 0.45359237;
        m = totalIn * 0.0254;
      } else {
        kg = parseFloat($("bmi_kg").value);
        m = parseFloat($("bmi_cm").value) / 100;
      }
      const box = $("bmi_summary"), scale = $("bmi_scale");
      if (!(kg > 0) || !(m > 0)) { box.hidden = true; scale.hidden = true; return; }
      const bmi = kg / (m * m);
      const [cat, cls] = categorize(bmi);
      const resEl = $("bmi_result");
      resEl.textContent = "BMI: " + bmi.toFixed(1) + " — " + cat;
      resEl.className = "alert " + cls;

      // healthy weight range for this height
      const lo = 18.5 * m * m, hi = 24.9 * m * m;
      const rangeEl = $("bmi_range");
      if (imp.checked) {
        rangeEl.textContent = "Healthy weight range for your height: " +
          fmt(lo / 0.45359237, 1) + " – " + fmt(hi / 0.45359237, 1) + " lb";
      } else {
        rangeEl.textContent = "Healthy weight range for your height: " +
          fmt(lo, 1) + " – " + fmt(hi, 1) + " kg";
      }
      box.hidden = false;

      // marker position on the 15–40 scale
      const pct = Math.min(Math.max((bmi - 15) / (40 - 15), 0), 1) * 100;
      $("bmi_marker").style.left = pct + "%";
      scale.hidden = false;
    }

    imp.addEventListener("change", () => {
      metricBox.hidden = imp.checked;
      impBox.hidden = !imp.checked;
      upd();
    });
    ["bmi_kg", "bmi_cm", "bmi_lb", "bmi_ft", "bmi_in"].forEach((i) =>
      $(i).addEventListener("input", upd)
    );
  }

  // ---- Init --------------------------------------------------------------
  function init() {
    wireTabs();
    wireBasic();
    wirePercent();
    wireLoan();
    wireVideo();
    wireBmi();
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
