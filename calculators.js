/*
  ToolMeUp • Calculator Suite
  Basic (with history), percentage, loan + savings, video ratio & pixel
  comparison, BMI. No dependencies beyond shared.js + kit.js.
*/
(function () {
  "use strict";
  const TM = window.ToolMeUp, K = window.Kit;
  const t = TM.t, $ = (id) => document.getElementById(id), fmt = K.fmt;
  const money = (n) => K.fmt(n, 2, 2);

  TM.addStrings({
    c_title: "مجموعة الحاسبات",
    c_lead: "حاسبات يومية تتحدّث فوراً أثناء الكتابة — حساب أساسي، نسب مئوية، قروض وفوائد، دقة الفيديو، ومؤشر كتلة الجسم.",
    c_tab_basic: "أساسية", c_tab_percent: "النسبة المئوية", c_tab_loan: "القروض والفائدة", c_tab_video: "الفيديو والبكسل", c_tab_bmi: "كتلة الجسم",
    c_history: "السجل",
    c_basic_hint: "استخدم لوحة المفاتيح: الأرقام و + − * / % ، و<span class=\"kbd\">Enter</span> للنتيجة، و<span class=\"kbd\">Backspace</span> للحذف، و<span class=\"kbd\">Esc</span> للمسح. اضغط على أي سطر في السجل لإعادة استخدامه.",
    c_hist_empty: "لا توجد عمليات بعد.",
    c_pct_a1: "كم يساوي", c_pct_a2: "% من", c_pct_b: "يساوي كم % من", c_pct_c1: "نسبة التغيّر من", c_pct_c2: "إلى", c_pct_d: "بزيادة / نقصان",
    c_pct_hint: "كل سطر يعمل بشكل مستقل. اضغط على النتيجة لنسخها.",
    c_loan_t: "قسط القرض", c_loan_sub: "أقساط شهرية متساوية، مثل قرض السيارة أو التمويل العقاري.",
    c_loan_amount: "مبلغ القرض", c_rate: "نسبة الفائدة السنوية (%)", c_term: "المدة (بالسنوات)",
    c_monthly: "القسط الشهري", c_total_paid: "إجمالي المدفوع", c_total_interest: "إجمالي الفائدة",
    c_interest_share: "{pct}% من إجمالي المدفوع",
    c_principal: "أصل المبلغ", c_interest: "الفائدة", c_schedule: "الجدول السنوي",
    c_year: "السنة", c_principal_paid: "المدفوع من الأصل", c_interest_paid: "الفائدة المدفوعة", c_balance: "الرصيد المتبقي",
    c_int_t: "الادخار: الفائدة البسيطة والمركّبة", c_int_sub: "اعرف كيف ينمو المال مع الوقت، مع إمكانية إيداع شهري.",
    c_years: "السنوات", c_monthly_dep: "إيداع شهري", c_compounding: "التركيب",
    c_simple: "بسيطة", c_yearly: "سنوي", c_monthly_c: "شهري", c_daily: "يومي",
    c_final: "المبلغ النهائي", c_contributed: "ما أودعته", c_earned: "الفائدة المكتسبة",
    c_vid_t: "الدقة ونسبة الأبعاد", c_vid_sub: "أدخل المقاس لمعرفة النسبة وعدد الميغابكسل — أو اختر نسبة واكتب بُعداً واحداً لمعرفة الآخر.",
    c_width: "العرض (بكسل)", c_height: "الارتفاع (بكسل)", c_ratio: "نسبة الأبعاد", c_ratio_auto: "تلقائي (من العرض × الارتفاع)",
    c_pixels: "البكسلات", c_mp: "{mp} ميغابكسل",
    c_cmp_t: "مقارنة دقّتين", c_common: "الدقّات الشائعة", c_name: "الاسم", c_resolution: "الدقة",
    c_cmp_info: "<b>{big}</b> تحتوي على <b>{x}×</b> من بكسلات <b>{small}</b> ({pa} مقابل {pb} بكسل).",
    c_cmp_same: "الدقّتان تحتويان على نفس عدد البكسلات.",
    c_bmi_t: "مؤشر كتلة الجسم", c_imperial: "وحدات إمبراطورية (رطل، قدم/بوصة)",
    c_weight_kg: "الوزن (كغ)", c_height_cm: "الطول (سم)", c_weight_lb: "الوزن (رطل)", c_height_ft: "الطول (قدم)", c_height_in: "الطول (بوصة)",
    c_healthy: "الوزن الصحي لطولك",
    c_under: "نقص في الوزن", c_normal: "وزن طبيعي", c_over: "زيادة في الوزن", c_obese: "سمنة",
    c_bmi_note: "مؤشر كتلة الجسم مقياس أولي فقط، ولا يأخذ في الاعتبار الكتلة العضلية أو العمر أو تركيب الجسم — استشر مختصاً للحصول على نصيحة طبية.",
    c_how1: "اختر الحاسبة من التبويبات في الأعلى. يتم تذكّر التبويب، ويمكنك فتح أحدها مباشرة برابط مثل <code>calculators.html#loan</code>.",
    c_how2: "اكتب الأرقام — تتحدّث النتائج فوراً، ولا حاجة لزر «احسب».",
    c_how3: "اضغط على أي نتيجة لنسخها. تُحفظ مدخلات القرض والادخار على جهازك.",
    c_faq1_q: "كيف يُحسب القسط الشهري للقرض؟",
    c_faq1_a: "بمعادلة الإطفاء القياسية: القسط = P × r / (1 − (1 + r)<sup>−n</sup>)، حيث P مبلغ القرض، وr الفائدة الشهرية، وn عدد الأشهر. لا تشمل الرسوم أو التأمين.",
    c_faq2_q: "ما الفرق بين الفائدة البسيطة والمركّبة؟",
    c_faq2_a: "الفائدة البسيطة تُحتسب على المبلغ الأصلي فقط. أما المركّبة فتُحتسب أيضاً على الفائدة المتراكمة، لذا ينمو الرصيد أسرع كلما زاد تكرار التركيب."
  });

  // ---- Basic calculator: tiny evaluator (no eval) ------------------------------
  function tokenize(expr) {
    const out = [];
    let i = 0;
    while (i < expr.length) {
      const c = expr[i];
      if (/[0-9.]/.test(c)) {
        let j = i;
        while (j < expr.length && /[0-9.e]/.test(expr[j])) j++;
        out.push({ t: "num", v: parseFloat(expr.slice(i, j)) });
        i = j;
      } else if ("+-*/%".includes(c)) {
        if (c === "-" && (out.length === 0 || out[out.length - 1].t === "op")) {
          let j = i + 1;
          while (j < expr.length && /[0-9.]/.test(expr[j])) j++;
          if (j === i + 1) return null;
          out.push({ t: "num", v: -parseFloat(expr.slice(i + 1, j)) });
          i = j;
        } else { out.push({ t: "op", v: c }); i++; }
      } else return null;
    }
    return out;
  }
  function evaluate(expr) {
    const tokens = tokenize(expr);
    if (!tokens || !tokens.length) return null;
    const clean = [];
    for (const tk of tokens) {
      if (tk.t === "op" && tk.v === "%") {
        const prev = clean[clean.length - 1];
        if (!prev || prev.t !== "num") return null;
        prev.v = prev.v / 100;
      } else clean.push(tk);
    }
    if (clean[clean.length - 1].t === "op") return null;
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
    return Number.isFinite(acc) ? Math.round(acc * 1e12) / 1e12 : null;
  }
  const pretty = (e) => e.replace(/\*/g, " × ").replace(/\//g, " ÷ ").replace(/(\d)([+-])/g, "$1 $2 ");

  function wireBasic() {
    const exprEl = $("calc_expr"), resEl = $("calc_result"), keys = $("calc_keys"), histEl = $("calc_history");
    let expr = "", justEvaluated = false;
    let history = K.load("calc:history", []);
    const lastNumStart = () => { let i = expr.length; while (i > 0 && /[0-9.]/.test(expr[i - 1])) i--; return i; };
    function drawHistory() {
      histEl.innerHTML = history.length ? history.map((h, i) =>
        '<li><button type="button" data-h="' + i + '"><span>' + TM.esc(pretty(h.e)) + "</span><b>= " + fmt(h.v, 10) + "</b></button></li>").join("")
        : '<li class="muted small2">' + TM.esc(t("c_hist_empty", "No calculations yet.")) + "</li>";
    }
    function render() {
      exprEl.textContent = expr ? pretty(expr) : " ";
      const v = evaluate(expr);
      resEl.textContent = v === null ? (expr ? "…" : "0") : fmt(v, 10);
      resEl.classList.toggle("is-long", resEl.textContent.length > 12);
    }
    function press(k) {
      if (k === "ac") { expr = ""; justEvaluated = false; }
      else if (k === "del") expr = expr.slice(0, -1);
      else if (k === "=") {
        const v = evaluate(expr);
        if (v !== null && /[+\-*/%]/.test(expr.replace(/^-/, ""))) {
          history.unshift({ e: expr, v: v });
          history = history.slice(0, 12);
          K.save("calc:history", history);
          drawHistory();
        }
        if (v !== null) { expr = String(v); justEvaluated = true; }
      } else if (k === "neg") {
        const s = lastNumStart();
        if (s < expr.length) {
          if (s > 0 && expr[s - 1] === "-" && (s === 1 || "+-*/%".includes(expr[s - 2]))) expr = expr.slice(0, s - 1) + expr.slice(s);
          else expr = expr.slice(0, s) + "-" + expr.slice(s);
        }
      } else if ("+-*/%".includes(k)) {
        if (!expr && k !== "-") return;
        if (expr && "+-*/".includes(expr[expr.length - 1])) expr = expr.slice(0, -1) + k;
        else expr += k;
        justEvaluated = false;
      } else {
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
      if (!b) return;
      b.classList.add("is-hit"); setTimeout(() => b.classList.remove("is-hit"), 120);
      press(b.getAttribute("data-k"));
    });
    resEl.addEventListener("click", () => { if (resEl.textContent !== "0") K.copy(resEl.textContent.replace(/,/g, "")); });
    histEl.addEventListener("click", (e) => {
      const b = e.target.closest("[data-h]");
      if (!b) return;
      expr = history[+b.getAttribute("data-h")].e; justEvaluated = false; render();
    });
    $("calc_hist_clear").addEventListener("click", () => { history = []; K.save("calc:history", history); drawHistory(); });
    document.addEventListener("keydown", (e) => {
      const pane = document.querySelector('[data-pane="basic"]');
      if (!pane || pane.hidden || e.ctrlKey || e.metaKey || e.altKey) return;
      const tag = (document.activeElement || {}).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const k = e.key;
      let m = null;
      if (/^[0-9.]$/.test(k) || "+-*/%".includes(k)) m = k;
      else if (k === "Enter" || k === "=") m = "=";
      else if (k === "Backspace") m = "del";
      else if (k === "Escape") m = "ac";
      if (m === null) return;
      e.preventDefault();
      const btn = keys.querySelector('[data-k="' + m + '"]');
      if (btn) { btn.classList.add("is-hit"); setTimeout(() => btn.classList.remove("is-hit"), 120); }
      press(m);
    });
    K.onLang(drawHistory);
    drawHistory();
    render();
  }

  // ---- Percentage -----------------------------------------------------------------
  function wirePercent() {
    const rows = [
      { ins: ["pct_a1", "pct_a2"], out: "pct_a_out", calc: (a, b) => fmt((a / 100) * b, 6) },
      { ins: ["pct_b1", "pct_b2"], out: "pct_b_out", calc: (a, b) => (b === 0 ? null : fmt((a / b) * 100, 4) + "%") },
      { ins: ["pct_c1", "pct_c2"], out: "pct_c_out", calc: (a, b) => {
        if (a === 0) return null;
        const p = ((b - a) / Math.abs(a)) * 100;
        return (p >= 0 ? "+" : "") + fmt(p, 4) + "%";
      } },
      { ins: ["pct_d1", "pct_d2"], out: "pct_d_out", calc: (a, b) => "↑ " + fmt(a * (1 + b / 100), 4) + "   ↓ " + fmt(a * (1 - b / 100), 4) }
    ];
    rows.forEach((r) => {
      const els = r.ins.map($), out = $(r.out);
      const upd = () => {
        const vals = els.map((e) => parseFloat(e.value));
        const res = vals.some((v) => !Number.isFinite(v)) ? null : r.calc(vals[0], vals[1]);
        out.textContent = res === null ? "—" : res;
        out.classList.toggle("is-on", res !== null);
      };
      els.forEach((e) => e.addEventListener("input", upd));
      out.addEventListener("click", () => { if (out.textContent !== "—") K.copy(out.textContent.replace(/[↑↓]/g, "").trim()); });
    });
  }

  // ---- Loan & savings -------------------------------------------------------------------
  function wireLoan() {
    const amount = $("loan_amount"), rate = $("loan_rate"), years = $("loan_years");
    function updLoan() {
      const P = parseFloat(amount.value), annual = parseFloat(rate.value), Y = parseFloat(years.value);
      const box = $("loan_summary"), tbody = $("loan_schedule").querySelector("tbody"), chart = $("loan_chart");
      if (!(P > 0) || !(Y > 0) || !Number.isFinite(annual) || annual < 0) { box.hidden = true; return; }
      const n = Math.round(Y * 12), r = annual / 100 / 12;
      const m = r === 0 ? P / n : (P * r) / (1 - Math.pow(1 + r, -n));
      const total = m * n, interest = total - P;
      $("loan_monthly").textContent = money(m);
      $("loan_total").textContent = money(total);
      $("loan_interest").textContent = money(interest);
      $("loan_interest_pct").textContent = t("c_interest_share", "{pct}% of everything you pay", { pct: fmt((interest / total) * 100, 1) });
      $("loan_bar_p").style.width = (P / total) * 100 + "%";
      $("loan_bar_i").style.width = (interest / total) * 100 + "%";
      box.hidden = false;
      let bal = P, rows = "", bars = "";
      const yearsData = [];
      for (let y = 1; y <= Math.ceil(n / 12); y++) {
        let pPaid = 0, iPaid = 0;
        for (let mm = 0; mm < 12 && (y - 1) * 12 + mm < n; mm++) {
          const i = bal * r, p = Math.min(m - i, bal);
          iPaid += i; pPaid += p; bal -= p;
        }
        yearsData.push([pPaid, iPaid]);
        rows += "<tr><td>" + y + '</td><td class="num">' + money(pPaid) + '</td><td class="num">' + money(iPaid) + '</td><td class="num">' + money(Math.max(bal, 0)) + "</td></tr>";
      }
      const maxY = Math.max.apply(null, yearsData.map((d) => d[0] + d[1]));
      yearsData.forEach((d, i) => {
        bars += '<div class="sched__col" title="' + (i + 1) + '"><span class="sched__i" style="height:' + (d[1] / maxY) * 100 + '%"></span>' +
          '<span class="sched__p" style="height:' + (d[0] / maxY) * 100 + '%"></span><small>' + (i + 1) + "</small></div>";
      });
      tbody.innerHTML = rows;
      chart.innerHTML = yearsData.length <= 40 ? bars : "";
    }
    [amount, rate, years].forEach((e) => e.addEventListener("input", updLoan));

    const ip = $("int_principal"), ir = $("int_rate"), iy = $("int_years"), idep = $("int_dep"), pills = $("int_compound");
    let nPer = K.load("calc:compound", 12);
    function setPill() { pills.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(+b.dataset.n === nPer))); }
    pills.addEventListener("click", (e) => {
      const b = e.target.closest("button[data-n]");
      if (!b) return;
      nPer = +b.dataset.n; K.save("calc:compound", nPer); setPill(); updInt();
    });
    function updInt() {
      const P = parseFloat(ip.value) || 0, R = parseFloat(ir.value), Y = parseFloat(iy.value), D = parseFloat(idep.value) || 0;
      const box = $("int_summary");
      if (!(P > 0 || D > 0) || !Number.isFinite(R) || R < 0 || !(Y > 0)) { box.hidden = true; return; }
      const months = Math.round(Y * 12);
      let A;
      if (nPer === 0) {
        A = P * (1 + (R / 100) * Y);
        for (let k = 1; k <= months; k++) A += D * (1 + (R / 100) * ((months - k) / 12));
      } else {
        // Monthly deposits at month end; balance compounds nPer times a year.
        const mRate = Math.pow(1 + R / 100 / nPer, nPer / 12) - 1;
        A = P;
        for (let k = 0; k < months; k++) A = A * (1 + mRate) + D;
      }
      const put = P + D * months;
      $("int_final").textContent = money(A);
      $("int_in").textContent = money(put);
      $("int_earned").textContent = money(A - put);
      box.hidden = false;
    }
    [ip, ir, iy, idep].forEach((e) => e.addEventListener("input", updInt));
    setPill(); updLoan(); updInt();
  }

  // ---- Video ratio & pixels --------------------------------------------------------------
  const COMMON = [
    ["SD 480p", 640, 480], ["HD 720p", 1280, 720], ["Full HD 1080p", 1920, 1080], ["2K DCI", 2048, 1080],
    ["QHD 1440p", 2560, 1440], ["UltraWide 1440p", 3440, 1440], ["4K UHD", 3840, 2160], ["4K DCI", 4096, 2160],
    ["8K UHD", 7680, 4320], ["Vertical HD", 720, 1280], ["Vertical FHD (Reels/TikTok)", 1080, 1920],
    ["Instagram portrait", 1080, 1350], ["Square 1080", 1080, 1080]
  ];
  const gcd = (a, b) => (b ? gcd(b, a % b) : a);
  function ratioOf(w, h) {
    const g = gcd(w, h), rw = w / g, rh = h / g;
    if (rw > 50 || rh > 50) return (w / h).toFixed(2) + ":1";
    return rw + ":" + rh;
  }
  const nameOf = (w, h) => { const hit = COMMON.find((r) => r[1] === w && r[2] === h); return hit ? hit[0] : ""; };
  function wireVideo() {
    const wEl = $("vid_w"), hEl = $("vid_h"), rEl = $("vid_ratio");
    const parseRatio = (s) => { const m = s.split(":"); const a = parseFloat(m[0]), b = parseFloat(m[1]); return a > 0 && b > 0 ? a / b : null; };
    let last = null;
    function upd(src) {
      if (src) last = src;
      const R = rEl.value ? parseRatio(rEl.value) : null;
      const w0 = parseInt(wEl.value, 10), h0 = parseInt(hEl.value, 10);
      if (R) {
        if (last === "w" && w0 > 0) hEl.value = Math.round(w0 / R);
        else if (last === "h" && h0 > 0) wEl.value = Math.round(h0 * R);
        else if (w0 > 0) hEl.value = Math.round(w0 / R);
      }
      const W = parseInt(wEl.value, 10), H = parseInt(hEl.value, 10);
      if (!(W > 0) || !(H > 0)) { $("vid_summary").hidden = true; return; }
      $("vid_r").textContent = ratioOf(W, H);
      $("vid_name").textContent = nameOf(W, H) || W + " × " + H;
      $("vid_px").textContent = fmt(W * H, 0);
      $("vid_mp").textContent = t("c_mp", "{mp} megapixels", { mp: ((W * H) / 1e6).toFixed(2) });
      $("vid_summary").hidden = false;
    }
    wEl.addEventListener("input", () => upd("w"));
    hEl.addEventListener("input", () => upd("h"));
    rEl.addEventListener("change", () => upd());

    const ids = ["cmp_aw", "cmp_ah", "cmp_bw", "cmp_bh"];
    function updCmp() {
      const [aw, ah, bw, bh] = ids.map((i) => parseInt($(i).value, 10));
      const info = $("cmp_info"), stage = $("cmp_stage"), cv = $("cmp_canvas");
      if (!(aw > 0 && ah > 0 && bw > 0 && bh > 0)) { info.hidden = true; stage.hidden = true; return; }
      const pa = aw * ah, pb = bw * bh;
      info.innerHTML = pa === pb ? TM.esc(t("c_cmp_same", "Both have the same number of pixels.")) :
        t("c_cmp_info", "<b>{big}</b> has <b>{x}×</b> the pixels of <b>{small}</b> ({pa} vs {pb} px).", {
          big: pb > pa ? "B" : "A", small: pb > pa ? "A" : "B", x: (Math.max(pa, pb) / Math.min(pa, pb)).toFixed(2),
          pa: fmt(Math.max(pa, pb), 0), pb: fmt(Math.min(pa, pb), 0) });
      info.hidden = false; stage.hidden = false;
      const dpr = window.devicePixelRatio || 1, cssW = stage.clientWidth || 800, cssH = Math.round(cssW * 0.42);
      cv.width = cssW * dpr; cv.height = cssH * dpr; cv.style.height = cssH + "px";
      const ctx = cv.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cssW, cssH);
      const pad = 18, scale = Math.min((cssW - pad * 2) / Math.max(aw, bw), (cssH - pad * 2) / Math.max(ah, bh));
      const fg = K.cssVar("--fg");
      [[aw, ah, "#3b82f6", "A"], [bw, bh, "#f43f5e", "B"]].sort((x, y) => y[0] * y[1] - x[0] * x[1]).forEach(([w2, h2, col, label]) => {
        const dw = w2 * scale, dh = h2 * scale, x = (cssW - dw) / 2, y = (cssH - dh) / 2;
        ctx.fillStyle = col + "26"; ctx.strokeStyle = col; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, dw, dh, 6) : ctx.rect(x, y, dw, dh); ctx.fill(); ctx.stroke();
        ctx.fillStyle = col; ctx.font = "600 13px Inter, system-ui, sans-serif";
        ctx.fillText(label + "  " + w2 + "×" + h2, x + 8, y + 18);
      });
      ctx.fillStyle = fg;
    }
    ids.forEach((i) => $(i).addEventListener("input", updCmp));
    window.addEventListener("resize", K.debounce(updCmp, 150));
    $("vid_reference").querySelector("tbody").innerHTML = COMMON.map((r) =>
      "<tr><td>" + r[0] + "</td><td>" + r[1] + "×" + r[2] + "</td><td>" + ratioOf(r[1], r[2]) + '</td><td class="num">' + ((r[1] * r[2]) / 1e6).toFixed(2) + "</td></tr>").join("");
    $("vid_reference").addEventListener("click", (e) => {
      const tr = e.target.closest("tbody tr");
      if (!tr) return;
      const m = tr.children[1].textContent.split("×");
      wEl.value = m[0]; hEl.value = m[1]; rEl.value = ""; upd();
      wEl.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  // ---- BMI ---------------------------------------------------------------------------------------
  function wireBmi() {
    const imp = $("bmi_imperial");
    const cats = [[18.5, "c_under", "Underweight", "down"], [25, "c_normal", "Normal weight", "up"], [30, "c_over", "Overweight", "down"], [Infinity, "c_obese", "Obese", "down"]];
    function upd() {
      $("bmi_metric_fields").hidden = imp.checked;
      $("bmi_imperial_fields").hidden = !imp.checked;
      let kg, m;
      if (imp.checked) {
        kg = parseFloat($("bmi_lb").value) * 0.45359237;
        m = ((parseFloat($("bmi_ft").value) || 0) * 12 + (parseFloat($("bmi_in").value) || 0)) * 0.0254;
      } else {
        kg = parseFloat($("bmi_kg").value);
        m = parseFloat($("bmi_cm").value) / 100;
      }
      if (!(kg > 0) || !(m > 0)) { $("bmi_summary").hidden = true; return; }
      const bmi = kg / (m * m), c = cats.find((x) => bmi < x[0]);
      $("bmi_value").textContent = bmi.toFixed(1);
      const catEl = $("bmi_cat");
      catEl.textContent = t(c[1], c[2]);
      catEl.className = "stat__sub " + c[3];
      const lo = 18.5 * m * m, hi = 24.9 * m * m;
      $("bmi_range").textContent = imp.checked ? fmt(lo / 0.45359237, 0) + "–" + fmt(hi / 0.45359237, 0) + " lb" : fmt(lo, 1) + "–" + fmt(hi, 1) + " kg";
      $("bmi_marker").style.left = Math.min(Math.max((bmi - 15) / 25, 0), 1) * 100 + "%";
      $("bmi_summary").hidden = false;
    }
    imp.addEventListener("change", upd);
    ["bmi_kg", "bmi_cm", "bmi_lb", "bmi_ft", "bmi_in"].forEach((i) => $(i).addEventListener("input", upd));
    K.onLang(upd);
    upd();
  }

  K.ready(() => {
    K.keepInputs("calculators");
    K.tabs("calc");
    wireBasic(); wirePercent(); wireLoan(); wireVideo(); wireBmi();
  });
})();
