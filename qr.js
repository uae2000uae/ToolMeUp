/*
  ToolMeUp • QR Code Generator
  Encoding by qrcode-generator (vendor/, MIT). Rendering (dot styles,
  rounded finder eyes, logo, PNG/SVG export) is done here.
*/
(function () {
  "use strict";
  const TM = window.ToolMeUp, K = window.Kit, t = TM.t, $ = (id) => document.getElementById(id);
  const QR = window.qrcode;
  QR.stringToBytes = QR.stringToBytesFuncs["UTF-8"];

  TM.addStrings({
    q_title: "مولّد رمز QR",
    q_lead: "أنشئ رمز QR لرابط أو شبكة واي فاي أو بطاقة اتصال وغيرها. صمّمه وأضف شعاراً ونزّله — مجاناً، بلا انتهاء صلاحية وبلا روابط تتبّع.",
    q_t_url: "رابط / نص", q_t_vcard: "جهة اتصال", q_t_email: "بريد", q_t_tel: "هاتف",
    q_content: "الرابط أو النص", q_ssid: "اسم الشبكة (SSID)", q_pass: "كلمة المرور", q_enc: "الحماية", q_open: "بدون (مفتوحة)", q_hidden_net: "شبكة مخفية",
    q_name: "الاسم الكامل", q_org: "الشركة", q_phone: "الهاتف", q_email: "البريد الإلكتروني", q_title_job: "المسمى الوظيفي", q_web: "الموقع الإلكتروني",
    q_wa_num: "رقم الهاتف مع رمز الدولة", q_msg: "الرسالة (اختياري)", q_to: "إلى", q_subject: "الموضوع", q_body: "الرسالة",
    q_style: "التصميم", q_dots: "النقاط", q_square: "مربعة", q_rounded: "مستديرة", q_dotted: "دوائر", q_colors: "الألوان",
    q_ecc: "تصحيح الأخطاء", q_margin: "الهامش", q_add_logo: "إضافة شعار", q_rm_logo: "إزالة الشعار",
    q_size: "حجم التنزيل", q_copy_img: "نسخ الصورة", q_mini: "عرض رمز QR",
    q_hist: "سجل التنزيلات", q_hist_clear: "مسح", q_hist_note: "محفوظ في هذا المتصفح فقط. اضغط على أي عنصر لاستعادته.", q_hist_rm: "حذف", q_hist_copy: "نسخ", q_hist_logo: "الشعار غير محفوظ", q_hist_loaded: "تم تحميله في المحرر",
    q_meta: "{v} · {n}×{n} وحدة · {c} حرف · تصحيح {e}",
    q_low_contrast: "التباين منخفض جداً — قد لا يُقرأ الرمز. استخدم لوناً داكناً على خلفية فاتحة.",
    q_inverted: "الألوان معكوسة (فاتح على داكن). بعض القارئات لا تقرأ الرموز المعكوسة.",
    q_too_long: "المحتوى طويل جداً لرمز QR. اختصره (مثلاً باستخدام رابط أقصر).",
    q_empty: "أدخل محتوى لإنشاء الرمز.",
    q_copied_img: "تم نسخ الصورة", q_copy_fail: "متصفحك لا يدعم نسخ الصور — نزّل ملف PNG بدلاً من ذلك.",
    q_how1: "اختر محتوى الرمز — رابط، بيانات واي فاي، بطاقة اتصال، محادثة واتساب، بريد، هاتف أو رسالة نصية — واملأ الحقول.",
    q_how2: "صمّمه: شكل النقاط والألوان وشعار اختياري. تتحقق المعاينة من أن الرمز ما زال قابلاً للقراءة (تباين كافٍ وشعار غير كبير).",
    q_how3: "نزّله PNG للمشاركة أو SVG للطباعة، أو انسخ الصورة مباشرة إلى مستند.",
    q_faq1_q: "هل تنتهي صلاحية رموز QR هذه؟",
    q_faq1_a: "لا. المحتوى مخزّن داخل الرمز نفسه — لا توجد خدمة تحويل وسيطة، لذا يعمل للأبد ولا أحد يتتبع عمليات المسح.",
    q_faq2_q: "ما فائدة تصحيح الأخطاء؟",
    q_faq2_a: "المستويات الأعلى (Q و H) تضيف بيانات احتياطية ليُقرأ الرمز حتى لو غُطّي أو تلف جزء منه — وهذا ضروري عند إضافة شعار، لكن الرمز يصبح أكثر كثافة. إضافة شعار تختار المستوى H تلقائياً."
  });

  const ECC = ["L", "M", "Q", "H"];
  let type = "url", dot = K.load("qr:dot", "square"), logo = null, matrix = null, lastText = "";

  // ---- Content builders --------------------------------------------------------
  const v = (id) => $(id).value.trim();
  const wifiEsc = (s) => s.replace(/([\\;,:"])/g, "\\$1");
  const vEsc = (s) => s.replace(/([\\;,])/g, "\\$1").replace(/\n/g, "\\n");
  function content() {
    switch (type) {
      case "wifi": {
        if (!v("q_ssid")) return "";
        const enc = $("q_encr").value;
        return "WIFI:T:" + enc + ";S:" + wifiEsc(v("q_ssid")) + ";" + (enc !== "nopass" ? "P:" + wifiEsc($("q_pass").value) + ";" : "") + ($("q_hidden").checked ? "H:true;" : "") + ";";
      }
      case "vcard": {
        if (!v("q_vn") && !v("q_vp") && !v("q_ve")) return "";
        const L = ["BEGIN:VCARD", "VERSION:3.0", "N:" + vEsc(v("q_vn")) + ";;;;", "FN:" + vEsc(v("q_vn"))];
        if (v("q_vo")) L.push("ORG:" + vEsc(v("q_vo")));
        if (v("q_vt")) L.push("TITLE:" + vEsc(v("q_vt")));
        if (v("q_vp")) L.push("TEL;TYPE=CELL:" + v("q_vp"));
        if (v("q_ve")) L.push("EMAIL:" + v("q_ve"));
        if (v("q_vw")) L.push("URL:" + v("q_vw"));
        L.push("END:VCARD");
        return L.join("\n");
      }
      case "whatsapp": {
        const n = v("q_wn").replace(/[^\d]/g, "");
        if (!n) return "";
        return "https://wa.me/" + n + (v("q_wm") ? "?text=" + encodeURIComponent(v("q_wm")) : "");
      }
      case "email": {
        if (!v("q_et")) return "";
        const q = [];
        if (v("q_es")) q.push("subject=" + encodeURIComponent(v("q_es")));
        if (v("q_eb")) q.push("body=" + encodeURIComponent(v("q_eb")));
        return "mailto:" + v("q_et") + (q.length ? "?" + q.join("&") : "");
      }
      case "tel": return v("q_tn") ? "tel:" + v("q_tn").replace(/[^\d+]/g, "") : "";
      case "sms": return v("q_sn") ? "SMSTO:" + v("q_sn").replace(/[^\d+]/g, "") + ":" + v("q_sm") : "";
      default: { const s = $("q_url").value.trim(); return s === "https://" || s === "http://" ? "" : s; }
    }
  }

  // ---- Matrix + drawing ---------------------------------------------------------------
  function build(text, ecc) {
    const q = QR(0, ecc);
    q.addData(text, "Byte");
    q.make();
    const n = q.getModuleCount(), m = [];
    for (let r = 0; r < n; r++) { m.push([]); for (let c = 0; c < n; c++) m[r].push(q.isDark(r, c)); }
    return { n: n, m: m, ver: (n - 17) / 4 };
  }
  const inFinder = (r, c, n) => (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7);
  function logoBox(n) {
    // Logo covers at most ~22% of the width (safe with ECC H).
    const s = Math.floor(n * 0.22) | 1;
    const o = Math.floor((n - s) / 2);
    return { o: o, s: s };
  }
  function shapes(mx, cell, margin) {
    // Returns drawing ops in module units, shared by canvas and SVG output.
    const ops = [], n = mx.n, lb = logo ? logoBox(n) : null;
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      if (!mx.m[r][c] || inFinder(r, c, n)) continue;
      if (lb && r >= lb.o - 1 && r < lb.o + lb.s + 1 && c >= lb.o - 1 && c < lb.o + lb.s + 1) continue;
      ops.push({ t: dot, x: c + margin, y: r + margin });
    }
    [[0, 0], [0, n - 7], [n - 7, 0]].forEach(([r, c]) => ops.push({ t: "eye", x: c + margin, y: r + margin }));
    return ops;
  }
  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h);
  }
  function paint(ctx, size, mx) {
    const margin = +$("q_margin").value, total = mx.n + margin * 2, u = size / total;
    const fg = $("q_fg").value, bg = $("q_bg").value;
    ctx.fillStyle = bg; ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = fg;
    shapes(mx, u, margin).forEach((o) => {
      const x = o.x * u, y = o.y * u;
      if (o.t === "square") ctx.fillRect(x, y, u + 0.5, u + 0.5);
      else if (o.t === "dots") { ctx.beginPath(); ctx.arc(x + u / 2, y + u / 2, u * 0.42, 0, Math.PI * 2); ctx.fill(); }
      else if (o.t === "rounded") { rr(ctx, x + u * 0.06, y + u * 0.06, u * 0.88, u * 0.88, u * 0.32); ctx.fill(); }
      else if (o.t === "eye") {
        const round = dot !== "square";
        rr(ctx, x, y, 7 * u, 7 * u, round ? 2.2 * u : 0); ctx.fill();
        ctx.fillStyle = bg; rr(ctx, x + u, y + u, 5 * u, 5 * u, round ? 1.5 * u : 0); ctx.fill();
        ctx.fillStyle = fg; rr(ctx, x + 2 * u, y + 2 * u, 3 * u, 3 * u, round ? 1 * u : 0); ctx.fill();
      }
    });
    if (logo) {
      const lb = logoBox(mx.n), x = (lb.o + margin) * u, s = lb.s * u;
      ctx.fillStyle = bg; rr(ctx, x - u * 0.6, x - u * 0.6, s + u * 1.2, s + u * 1.2, u * 1.2); ctx.fill();
      const ratio = logo.width / logo.height, w = ratio >= 1 ? s : s * ratio, h = ratio >= 1 ? s / ratio : s;
      ctx.drawImage(logo, x + (s - w) / 2, x + (s - h) / 2, w, h);
    }
  }
  function svgString(mx) {
    const margin = +$("q_margin").value, total = mx.n + margin * 2, fg = $("q_fg").value, bg = $("q_bg").value;
    let body = "";
    shapes(mx, 1, margin).forEach((o) => {
      if (o.t === "square") body += "M" + o.x + " " + o.y + "h1v1h-1z";
    });
    let extra = "";
    shapes(mx, 1, margin).forEach((o) => {
      if (o.t === "dots") extra += '<circle cx="' + (o.x + 0.5) + '" cy="' + (o.y + 0.5) + '" r="0.42"/>';
      else if (o.t === "rounded") extra += '<rect x="' + (o.x + 0.06) + '" y="' + (o.y + 0.06) + '" width="0.88" height="0.88" rx="0.32"/>';
      else if (o.t === "eye") {
        const r = dot !== "square";
        extra += '<rect x="' + o.x + '" y="' + o.y + '" width="7" height="7" rx="' + (r ? 2.2 : 0) + '"/>' +
          '<rect x="' + (o.x + 1) + '" y="' + (o.y + 1) + '" width="5" height="5" rx="' + (r ? 1.5 : 0) + '" fill="' + bg + '"/>' +
          '<rect x="' + (o.x + 2) + '" y="' + (o.y + 2) + '" width="3" height="3" rx="' + (r ? 1 : 0) + '"/>';
      }
    });
    let img = "";
    if (logo) {
      const lb = logoBox(mx.n), x = lb.o + margin, s = lb.s;
      const c = document.createElement("canvas"); c.width = 256; c.height = Math.round(256 * logo.height / logo.width);
      c.getContext("2d").drawImage(logo, 0, 0, c.width, c.height);
      img = '<rect x="' + (x - 0.6) + '" y="' + (x - 0.6) + '" width="' + (s + 1.2) + '" height="' + (s + 1.2) + '" rx="1.2" fill="' + bg + '"/>' +
        '<image x="' + x + '" y="' + x + '" width="' + s + '" height="' + s + '" preserveAspectRatio="xMidYMid meet" href="' + c.toDataURL("image/png") + '"/>';
    }
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + total + " " + total + '" shape-rendering="' + (dot === "square" ? "crispEdges" : "geometricPrecision") + '">' +
      '<rect width="100%" height="100%" fill="' + bg + '"/><g fill="' + fg + '">' + (body ? '<path d="' + body + '"/>' : "") + extra + "</g>" + img + "</svg>";
  }

  // ---- Contrast check ---------------------------------------------------------------------------
  function lum(hex) {
    const c = [1, 3, 5].map((i) => parseInt(hex.substr(i, 2), 16) / 255).map((x) => (x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4)));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }

  function render() {
    const text = content();
    const eccIdx = logo ? 3 : +$("q_ecc").value;
    $("q_ecc_v").textContent = ECC[eccIdx];
    $("q_ecc").disabled = !!logo;
    $("q_margin_v").textContent = $("q_margin").value;
    $("q_size_v").textContent = $("q_size").value + " px";
    const cv = $("q_canvas"), warn = $("q_warn"), wrap = $("q_wrap");
    const warnings = [];
    const lf = lum($("q_fg").value), lbg = lum($("q_bg").value);
    const ratio = (Math.max(lf, lbg) + 0.05) / (Math.min(lf, lbg) + 0.05);
    if (ratio < 3) warnings.push(t("q_low_contrast", "Contrast is too low — the code may not scan. Use a dark color on a light background."));
    else if (lf > lbg) warnings.push(t("q_inverted", "Colors are inverted (light on dark). Some scanners can't read inverted codes."));
    if (!text) {
      matrix = null; lastText = "";
      wrap.classList.add("is-empty");
      $("q_meta").textContent = t("q_empty", "Enter some content to create a code.");
      warn.hidden = !warnings.length; warn.textContent = warnings.join(" ");
      const ctx = cv.getContext("2d"); ctx.clearRect(0, 0, cv.width, cv.height);
      updateMini();
      return;
    }
    try { matrix = build(text, ECC[eccIdx]); }
    catch (_) {
      matrix = null; wrap.classList.add("is-empty");
      warn.hidden = false; warn.textContent = t("q_too_long", "That's too much content for a QR code. Shorten it (e.g. use a shorter link).");
      $("q_meta").textContent = ""; updateMini(); return;
    }
    lastText = text;
    wrap.classList.remove("is-empty");
    // Size from the wrap's content box (clientWidth includes its padding),
    // otherwise max-width shrinks only the width and the code is squashed.
    const ws = getComputedStyle(wrap);
    const avail = wrap.clientWidth - parseFloat(ws.paddingLeft) - parseFloat(ws.paddingRight);
    const dpr = window.devicePixelRatio || 1, css = Math.floor(Math.min(avail > 0 ? avail : 320, 360,
      Math.max(180, window.innerHeight - 140))); // keep it on-screen in landscape
    cv.width = cv.height = Math.round(css * dpr);
    cv.style.width = cv.style.height = css + "px";
    paint(cv.getContext("2d"), cv.width, matrix);
    updateMini();
    warn.hidden = !warnings.length; warn.textContent = warnings.join(" ");
    $("q_meta").textContent = t("q_meta", "Version {v} · {n}×{n} modules · {c} characters · ECC {e}", { v: matrix.ver, n: matrix.n, c: text.length, e: ECC[eccIdx] });
  }

  // Corner mini preview: a copy of the code, visible only while the main
  // preview is scrolled out of view.
  let previewVisible = true;
  function updateMini() {
    const mini = $("q_mini");
    mini.hidden = !matrix;
    mini.classList.toggle("is-off", previewVisible);
    if (!matrix) return;
    const mc = $("q_mini_cv"), px = Math.round(88 * (window.devicePixelRatio || 1));
    if (mc.width !== px) mc.width = mc.height = px;
    paint(mc.getContext("2d"), px, matrix);
  }

  // ---- Download history (this browser only) ------------------------------------------------
  const HIST_KEY = "qr:history", HIST_MAX = 20;
  const FIELDS = { url: ["q_url"], wifi: ["q_ssid", "q_pass", "q_encr", "q_hidden"], vcard: ["q_vn", "q_vo", "q_vp", "q_ve", "q_vt", "q_vw"],
    whatsapp: ["q_wn", "q_wm"], email: ["q_et", "q_es", "q_eb"], tel: ["q_tn"], sms: ["q_sn", "q_sm"] };
  const TYPE_LABEL = { url: ["q_t_url", "Link / text"], wifi: ["", "Wi-Fi"], vcard: ["q_t_vcard", "Contact"], whatsapp: ["", "WhatsApp"],
    email: ["q_t_email", "Email"], tel: ["q_t_tel", "Phone"], sms: ["", "SMS"] };
  const loadHist = () => { const h = K.load(HIST_KEY, []); return Array.isArray(h) ? h : []; };
  function summary(e) {
    const f = e.fields || {};
    switch (e.type) {
      case "wifi": return f.q_ssid;
      case "vcard": return f.q_vn || f.q_vp || f.q_ve;
      case "whatsapp": return "+" + f.q_wn;
      case "email": return f.q_et;
      case "tel": return f.q_tn;
      case "sms": return f.q_sn;
      default: return f.q_url;
    }
  }
  function addHistory(fmt) {
    if (!matrix) return;
    const fields = {};
    FIELDS[type].forEach((id) => { const el = $(id); fields[id] = el.type === "checkbox" ? el.checked : el.value; });
    const th = document.createElement("canvas"); th.width = th.height = 96; paint(th.getContext("2d"), 96, matrix);
    const e = { at: Date.now(), fmt: fmt, type: type, fields: fields, dot: dot, fg: $("q_fg").value, bg: $("q_bg").value,
      ecc: $("q_ecc").value, margin: $("q_margin").value, size: $("q_size").value, logo: !!logo, text: lastText, thumb: th.toDataURL("image/png") };
    const sig = (x) => [x.text, x.dot, x.fg, x.bg, x.ecc, x.margin, x.logo].join("|");
    const h = loadHist().filter((x) => sig(x) !== sig(e)); // the same code again moves to the top
    h.unshift(e);
    K.save(HIST_KEY, h.slice(0, HIST_MAX));
    renderHistory();
  }
  function restore(e) {
    Object.keys(e.fields || {}).forEach((id) => {
      const el = $(id); if (!el) return;
      if (el.type === "checkbox") el.checked = !!e.fields[id]; else el.value = e.fields[id];
    });
    dot = e.dot || "square"; K.save("qr:dot", dot);
    $("q_dot").querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x.dataset.d === dot)));
    $("q_fg").value = e.fg; $("q_bg").value = e.bg; K.save("qr:colors", [e.fg, e.bg]);
    $("q_ecc").value = e.ecc; $("q_margin").value = e.margin; $("q_size").value = e.size;
    const btn = $("q_type").querySelector('[data-q="' + e.type + '"]');
    if (btn) btn.click(); else render();
    // Bring the filled-in form into view and flash it so the load is obvious.
    const box = $("q_input");
    box.scrollIntoView({ block: "start" });
    box.classList.remove("is-loaded"); void box.offsetWidth; box.classList.add("is-loaded");
    K.toast(t("q_hist_loaded", "Loaded into the editor") + (e.logo ? " — " + t("q_hist_logo", "logo not saved") : ""));
  }
  function renderHistory() {
    const h = loadHist(), list = $("q_hist");
    $("q_hist_card").hidden = !h.length;
    list.textContent = "";
    const ar = TM.lang ? TM.lang() === "ar" : document.documentElement.lang === "ar";
    h.forEach((e, i) => {
      const li = document.createElement("li");
      const use = document.createElement("button"); use.type = "button"; use.className = "qr-hist__use";
      const img = document.createElement("img"); img.src = e.thumb; img.alt = ""; img.width = img.height = 48;
      const txt = document.createElement("span"); txt.className = "qr-hist__txt";
      const b = document.createElement("b"); b.textContent = summary(e) || e.text || ""; b.dir = "auto";
      const meta = document.createElement("span");
      const tl = TYPE_LABEL[e.type] || TYPE_LABEL.url;
      let when = "";
      try { when = new Date(e.at).toLocaleString(ar ? "ar" : undefined, { dateStyle: "medium", timeStyle: "short" }); } catch (_) { /* ignore */ }
      meta.textContent = [tl[0] ? t(tl[0], tl[1]) : tl[1], e.fmt === "copy" ? t("q_hist_copy", "Copy") : String(e.fmt).toUpperCase(), when]
        .concat(e.logo ? [t("q_hist_logo", "logo not saved")] : []).join(" · ");
      txt.append(b, meta); use.append(img, txt);
      use.addEventListener("click", () => restore(e));
      const rm = document.createElement("button"); rm.type = "button"; rm.className = "btn btn--ghost btn--sm qr-hist__rm";
      rm.textContent = "\u00d7"; rm.setAttribute("aria-label", t("q_hist_rm", "Remove"));
      rm.addEventListener("click", () => { const all = loadHist(); all.splice(i, 1); K.save(HIST_KEY, all); renderHistory(); });
      li.append(use, rm); list.appendChild(li);
    });
  }

  function exportPng() {
    return new Promise((res) => {
      const size = +$("q_size").value, c = document.createElement("canvas");
      c.width = c.height = size;
      paint(c.getContext("2d"), size, matrix);
      c.toBlob(res, "image/png");
    });
  }
  const fileBase = () => "qr-" + type + "-" + new Date().toISOString().slice(0, 10);

  K.ready(() => {
    const deb = K.debounce(render, 60);
    $("q_type").addEventListener("click", (e) => {
      const b = e.target.closest("[data-q]");
      if (!b) return;
      type = b.dataset.q;
      $("q_type").querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      document.querySelectorAll("[data-form]").forEach((f) => { f.hidden = f.dataset.form !== type; });
      K.save("qr:type", type);
      render();
    });
    document.querySelectorAll(".qform input, .qform textarea, .qform select").forEach((el) => { el.addEventListener("input", deb); el.addEventListener("change", deb); });
    $("q_dot").addEventListener("click", (e) => {
      const b = e.target.closest("[data-d]");
      if (!b) return;
      dot = b.dataset.d; K.save("qr:dot", dot);
      $("q_dot").querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      render();
    });
    $("q_dot").querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x.dataset.d === dot)));
    $("q_swatches").addEventListener("click", (e) => {
      const b = e.target.closest("[data-fg]");
      if (!b) return;
      $("q_fg").value = b.dataset.fg; $("q_bg").value = b.dataset.bg;
      K.save("qr:colors", [b.dataset.fg, b.dataset.bg]); render();
    });
    const cols = K.load("qr:colors", null);
    if (cols) { $("q_fg").value = cols[0]; $("q_bg").value = cols[1]; }
    ["q_fg", "q_bg"].forEach((id) => $(id).addEventListener("input", () => { K.save("qr:colors", [$("q_fg").value, $("q_bg").value]); deb(); }));
    ["q_ecc", "q_margin", "q_size"].forEach((id) => $(id).addEventListener("input", render));
    $("q_logo").addEventListener("change", () => {
      const f = $("q_logo").files[0];
      if (!f) return;
      const img = new Image();
      img.onload = () => { logo = img; $("q_logo_rm").hidden = false; render(); };
      img.src = URL.createObjectURL(f);
      $("q_logo").value = "";
    });
    $("q_logo_rm").addEventListener("click", () => { logo = null; $("q_logo_rm").hidden = true; render(); });
    $("q_png").addEventListener("click", () => { if (matrix) { addHistory("png"); exportPng().then((b) => K.download(b, fileBase() + ".png")); } });
    $("q_svg").addEventListener("click", () => { if (matrix) { addHistory("svg"); K.download(svgString(matrix), fileBase() + ".svg", "image/svg+xml"); } });
    $("q_copy").addEventListener("click", () => {
      if (!matrix) return;
      if (!window.ClipboardItem || !navigator.clipboard || !navigator.clipboard.write) { K.toast(t("q_copy_fail", "Your browser can't copy images — download the PNG instead."), true); return; }
      navigator.clipboard.write([new ClipboardItem({ "image/png": exportPng() })])
        .then(() => { addHistory("copy"); K.toast(t("q_copied_img", "Image copied")); }, () => K.toast(t("q_copy_fail", "Your browser can't copy images — download the PNG instead."), true));
    });
    window.addEventListener("resize", K.debounce(render, 150));
    $("q_mini").addEventListener("click", () => $("q_preview").scrollIntoView({ behavior: "smooth", block: "center" }));
    if ("IntersectionObserver" in window) {
      // "Visible" once a third of the code itself is on screen, not a sliver of the card.
      new IntersectionObserver((es) => {
        const v = es[0].isIntersecting && es[0].intersectionRatio >= 0.33;
        if (v !== previewVisible) { previewVisible = v; $("q_mini").classList.toggle("is-off", v); }
      }, { threshold: [0, 0.33, 0.66, 1] }).observe($("q_canvas"));
    }
    K.onLang(() => { render(); renderHistory(); });
    $("q_hist_clear").addEventListener("click", () => { K.save(HIST_KEY, []); renderHistory(); });
    renderHistory();
    const savedType = K.load("qr:type", "url");
    const btn = $("q_type").querySelector('[data-q="' + savedType + '"]');
    if (btn) btn.click(); else render();
  });
})();
