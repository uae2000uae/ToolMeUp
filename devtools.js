/*
  ToolMeUp • Developer Tools
  JSON formatter/validator, regex tester (worker + timeout), Base64,
  UUID v4/v7 generator + inspector, lorem ipsum (Latin & Arabic).
*/
(function () {
  "use strict";
  const TM = window.ToolMeUp, K = window.Kit, t = TM.t, $ = (id) => document.getElementById(id), esc = TM.esc;

  TM.addStrings({
    v_title: "أدوات المطورين",
    v_lead: "أدوات يومية للبرمجة والبيانات. كل شيء يبقى داخل هذا التبويب — مناسب للرموز والبيانات الخاصة.",
    v_tab_regex: "التعابير النمطية",
    v_format: "تنسيق", v_minify: "ضغط", v_sort: "ترتيب المفاتيح", v_sample: "مثال", v_json_ph: "ألصق JSON هنا…",
    v_json_ok: "✓ JSON صالح · {type} · {size} · {keys} مفتاح · العمق {depth}",
    v_json_err: "✗ {msg} — السطر {line}، العمود {col}", v_json_empty: "ألصق JSON للتحقق منه وتنسيقه.",
    v_test: "نص الاختبار", v_matches_hl: "المطابقات", v_replace: "الاستبدال بـ", v_result: "النتيجة",
    v_rx_count: "{n} مطابقة", v_rx_none: "لا توجد مطابقات", v_rx_timeout: "استغرق النمط وقتاً طويلاً (احتمال تراجع كارثي) — تم إيقافه.",
    v_rx_capped: " (يتم عرض أول 2000)", v_group: "المجموعة", v_match: "المطابقة", v_index: "الموضع",
    v_encode: "ترميز", v_decode: "فك الترميز", v_urlsafe: "آمن للروابط (base64url)", v_b_ph: "اكتب أو ألصق نصاً…",
    v_use_input: "استخدامه كمدخل", v_b_bad: "نص Base64 غير صالح", v_b_binary: "بيانات ثنائية ({n} بايت) — المعاينة بصيغة hex:",
    v_b_stats: "{a} حرف ← {b} حرف",
    v_file_t: "ملف إلى Base64 / رابط بيانات", v_file_s: "أفلت ملفاً هنا أو اضغط للاختيار", v_file_done: "{name} · {size} → رابط بيانات بطول {n} حرف",
    v_random: "عشوائي", v_time: "مرتب زمنياً", v_count: "العدد", v_upper: "أحرف كبيرة", v_nodash: "بدون شرطات",
    v_generate: "توليد", v_copy_all: "نسخ الكل", v_inspect: "فحص UUID",
    v_version: "الإصدار", v_variant: "النوع", v_created: "تاريخ الإنشاء", v_not_uuid: "ليس UUID صالحاً",
    v_paragraphs: "فقرات", v_sentences: "جُمل", v_words: "كلمات", v_classic: "البدء بـ «Lorem ipsum…»",
    v_lorem_stats: "{w} كلمة · {c} حرف",
    v_how1: "<b>JSON:</b> ألصق النص ليتم التحقق منه أثناء الكتابة. تظهر الأخطاء مع رقم السطر والعمود. نسّق أو اضغط أو رتّب المفاتيح، ثم انسخ أو نزّل.",
    v_how2: "<b>التعابير النمطية:</b> اكتب النمط وفعّل الخيارات. تظهر المطابقات ملوّنة مباشرة مع المجموعات، ويعرض مربع الاستبدال النتيجة. اضغط على أي اختصار لإدراجه.",
    v_how3: "<b>Base64 و UUID ولوريم إيبسوم:</b> النتائج فورية. أفلت ملفاً في Base64 للحصول على رابط بيانات.",
    v_faq1_q: "هل من الآمن لصق الرموز أو البيانات الخاصة؟",
    v_faq1_a: "نعم. كل شيء يعمل داخل تبويب المتصفح ولا يُرسل أي شيء. إغلاق التبويب يمسح البيانات (باستثناء نمط التعبير ونص الاختبار اللذين يُحفظان على جهازك للراحة).",
    v_faq2_q: "UUID الإصدار 4 أم 7؟",
    v_faq2_a: "الإصدار 4 عشوائي بالكامل. أما الإصدار 7 فيبدأ بطابع زمني، لذا تُرتَّب المعرّفات الجديدة حسب وقت إنشائها — وهو أفضل كمفاتيح أساسية في قواعد البيانات."
  });

  // ======================= JSON =======================
  function sortKeys(v) {
    if (Array.isArray(v)) return v.map(sortKeys);
    if (v && typeof v === "object") return Object.keys(v).sort().reduce((o, k) => { o[k] = sortKeys(v[k]); return o; }, {});
    return v;
  }
  function jstats(v) {
    let keys = 0, depth = 0;
    (function walk(x, d) {
      depth = Math.max(depth, d);
      if (Array.isArray(x)) x.forEach((y) => walk(y, d + 1));
      else if (x && typeof x === "object") Object.keys(x).forEach((k) => { keys++; walk(x[k], d + 1); });
    })(v, 0);
    return { keys, depth, type: Array.isArray(v) ? "array" : v === null ? "null" : typeof v };
  }
  function highlight(json) {
    const re = /("(?:\\u[a-fA-F0-9]{4}|\\[^u]|[^\\"])*")(\s*:)?|\b(true|false)\b|\bnull\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g;
    let out = "", last = 0, m;
    while ((m = re.exec(json))) {
      out += esc(json.slice(last, m.index));
      const cls = m[1] ? (m[2] ? "k" : "s") : m[3] ? "b" : m[0] === "null" ? "n" : "d";
      out += '<span class="j-' + cls + '">' + esc(m[1] || m[0]) + "</span>" + (m[2] ? esc(m[2]) : "");
      last = re.lastIndex;
    }
    return out + esc(json.slice(last));
  }
  // Find where JSON breaks (browsers word this differently, and newer ones
  // omit the position), with a small strict scanner. Returns {i, msg}.
  function scanJson(s) {
    let i = 0;
    const fail = (msg) => { throw { i: i, msg: msg }; };
    const ws = () => { while (i < s.length && " \t\n\r".indexOf(s[i]) !== -1) i++; };
    const lit = (w) => { if (s.substr(i, w.length) !== w) fail("Unexpected token"); i += w.length; };
    function str() {
      i++;
      while (i < s.length) {
        const c = s[i];
        if (c === '"') { i++; return; }
        if (c === "\\") { i++; if ('"\\/bfnrtu'.indexOf(s[i]) === -1) fail("Bad escape in string"); if (s[i] === "u") { if (!/^[0-9a-fA-F]{4}$/.test(s.substr(i + 1, 4))) fail("Bad \\u escape"); i += 4; } }
        else if (c < " ") fail("Control character in string (unescaped newline?)");
        i++;
      }
      fail("Unterminated string");
    }
    function val() {
      ws();
      const c = s[i];
      if (c === "{") {
        i++; ws();
        if (s[i] === "}") { i++; return; }
        for (;;) {
          ws(); if (s[i] !== '"') fail("Expected a \"quoted\" property name"); str(); ws();
          if (s[i] !== ":") fail("Expected ':' after property name"); i++; val(); ws();
          if (s[i] === ",") { i++; ws(); if (s[i] === "}") fail("Trailing comma"); continue; }
          if (s[i] === "}") { i++; return; }
          fail("Expected ',' or '}'");
        }
      } else if (c === "[") {
        i++; ws();
        if (s[i] === "]") { i++; return; }
        for (;;) {
          val(); ws();
          if (s[i] === ",") { i++; ws(); if (s[i] === "]") fail("Trailing comma"); continue; }
          if (s[i] === "]") { i++; return; }
          fail("Expected ',' or ']'");
        }
      } else if (c === '"') str();
      else if (c === "t") lit("true");
      else if (c === "f") lit("false");
      else if (c === "n") lit("null");
      else if (c === "-" || (c >= "0" && c <= "9")) {
        const m = /^-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?/.exec(s.slice(i));
        if (!m) fail("Invalid number"); i += m[0].length;
      } else if (c === "'") fail("Use double quotes, not single quotes");
      else if (c === undefined) fail("Unexpected end of input");
      else fail("Unexpected character '" + c + "'");
    }
    try { val(); ws(); if (i < s.length) fail("Unexpected text after the JSON value"); return null; }
    catch (e) { return e && e.msg ? e : { i: s.length, msg: "Invalid JSON" }; }
  }
  function errPos(msg, text) {
    const r = scanJson(text) || { i: text.length, msg: msg };
    const before = text.slice(0, r.i).split("\n");
    return { line: before.length, col: before[before.length - 1].length + 1, msg: r.msg };
  }
  function wireJson() {
    const inp = $("j_in"), out = $("j_out"), st = $("j_status");
    let mode = K.load("dev:jmode", "format"), lastText = "";
    $("j_indent").value = K.load("dev:jindent", "2");
    $("j_sort").checked = K.load("dev:jsort", false);
    function run() {
      const raw = inp.value;
      if (!raw.trim()) { out.innerHTML = ""; lastText = ""; st.className = "note mt"; st.textContent = t("v_json_empty", "Paste JSON to validate and format it."); return; }
      try {
        let v = JSON.parse(raw);
        if ($("j_sort").checked) v = sortKeys(v);
        const ind = $("j_indent").value === "tab" ? "\t" : +$("j_indent").value;
        lastText = mode === "minify" ? JSON.stringify(v) : JSON.stringify(v, null, ind);
        out.innerHTML = lastText.length < 300000 ? highlight(lastText) : esc(lastText);
        const s = jstats(v);
        st.className = "note note--good mt";
        st.textContent = t("v_json_ok", "✓ Valid JSON · {type} · {size} · {keys} keys · depth {depth}", { type: s.type, size: K.bytes(new Blob([lastText]).size), keys: K.fmt(s.keys, 0), depth: s.depth });
      } catch (e) {
        const p = errPos(String(e.message), raw);
        st.className = "note note--bad mt";
        st.textContent = t("v_json_err", "✗ {msg} — line {line}, column {col}", p);
        const lines = raw.split("\n");
        out.innerHTML = lines.map((l, i) => i + 1 === p.line ? '<mark class="j-errline">' + esc(l || " ") + "</mark>" : esc(l)).join("\n");
        lastText = "";
      }
    }
    const setMode = (m) => { mode = m; K.save("dev:jmode", m); $("j_format").classList.toggle("btn--primary", m === "format"); $("j_minify").classList.toggle("btn--primary", m === "minify"); run(); };
    $("j_format").addEventListener("click", () => setMode("format"));
    $("j_minify").addEventListener("click", () => setMode("minify"));
    $("j_indent").addEventListener("change", () => { K.save("dev:jindent", $("j_indent").value); run(); });
    $("j_sort").addEventListener("change", () => { K.save("dev:jsort", $("j_sort").checked); run(); });
    inp.addEventListener("input", K.debounce(run, 120));
    $("j_clear").addEventListener("click", () => { inp.value = ""; run(); inp.focus(); });
    $("j_sample").addEventListener("click", () => {
      inp.value = '{"name":"ToolMeUp","tools":["units","json","qr"],"private":true,"version":2.1,"owner":null,"meta":{"lang":["en","ar"],"rtl":true}}';
      run();
    });
    $("j_dl").addEventListener("click", () => { if (lastText) K.download(lastText, "data.json", "application/json"); });
    K.onLang(run);
    setMode(mode);
  }

  // ======================= Regex =======================
  const CHEATS = [["\\d", "digit"], ["\\w", "word char"], ["\\s", "space"], [".", "any"], ["^", "start"], ["$", "end"], ["\\b", "boundary"],
    ["[abc]", "set"], ["[^abc]", "not in set"], ["a*", "0+"], ["a+", "1+"], ["a?", "0 or 1"], ["{2,4}", "2–4 times"], ["(…)", "group"],
    ["(?:…)", "non-capturing"], ["(?<name>…)", "named group"], ["a|b", "or"], ["[\\w.+-]+@[\\w-]+\\.[\\w.]+", "email"], ["https?://\\S+", "URL"]];
  function wireRegex() {
    const pat = $("r_pat"), text = $("r_text"), rep = $("r_rep"), hl = $("r_hl"), st = $("r_status"), outEl = $("r_out");
    let flags = K.load("dev:rflags", "g");
    if (!text.value) text.value = "Contact ali@example.com or sara@toolmeup.com\nPhone: +971 50 123 4567\nVisit https://example.com/docs today.";
    if (!pat.value) pat.value = "(\\w+)@(\\w+)\\.com";
    const drawFlags = () => $("r_flags").querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(flags.indexOf(b.dataset.f) !== -1)));
    $("r_flags").addEventListener("click", (e) => {
      const b = e.target.closest("[data-f]");
      if (!b) return;
      flags = flags.indexOf(b.dataset.f) !== -1 ? flags.replace(b.dataset.f, "") : flags + b.dataset.f;
      K.save("dev:rflags", flags); drawFlags(); run();
    });
    $("r_cheats").innerHTML = CHEATS.map((c) => '<button type="button" data-ins="' + esc(c[0]) + '" title="' + esc(c[1]) + '"><code>' + esc(c[0]) + "</code></button>").join("");
    $("r_cheats").addEventListener("click", (e) => {
      const b = e.target.closest("[data-ins]");
      if (!b) return;
      const ins = b.dataset.ins.replace("…", "");
      const s = pat.selectionStart ?? pat.value.length, en = pat.selectionEnd ?? s;
      pat.value = pat.value.slice(0, s) + ins + pat.value.slice(en);
      pat.focus();
      const caret = s + (b.dataset.ins.indexOf("…") !== -1 ? b.dataset.ins.indexOf("…") : ins.length);
      pat.setSelectionRange(caret, caret);
      run();
    });
    let worker = null, timer = null, seq = 0;
    function newWorker() { if (worker) worker.terminate(); worker = new Worker("devtools-regex-worker.js?v=20261112p"); }
    function render(res, src) {
      if (res.error) {
        st.className = "note note--bad mt"; st.textContent = res.error;
        hl.textContent = src; outEl.textContent = ""; $("r_table_wrap").hidden = true; return;
      }
      const ms = res.matches;
      st.className = "note mt" + (ms.length ? " note--good" : "");
      st.textContent = ms.length ? t("v_rx_count", "{n} matches", { n: ms.length }) + (res.capped ? t("v_rx_capped", " (showing first 2000)") : "") : t("v_rx_none", "No matches");
      let html = "", last = 0;
      ms.forEach((m, i) => {
        if (m.i < last) return;
        html += esc(src.slice(last, m.i)) + '<mark class="rx-m rx-m' + (i % 2) + '" title="#' + (i + 1) + '">' + (esc(m.s) || "&#8203;") + "</mark>";
        last = m.i + m.s.length;
      });
      hl.innerHTML = html + esc(src.slice(last));
      const ng = ms.reduce((n, m) => Math.max(n, m.g.length), 0);
      if (ms.length && ms.length <= 200) {
        $("r_table").innerHTML = "<thead><tr><th>#</th><th>" + esc(t("v_match", "Match")) + "</th><th>" + esc(t("v_index", "Index")) + "</th>" +
          Array.from({ length: ng }, (_, i) => "<th>" + esc(t("v_group", "Group")) + " " + (i + 1) + "</th>").join("") + "</tr></thead><tbody>" +
          ms.map((m, i) => "<tr><td>" + (i + 1) + '</td><td class="mono">' + esc(m.s) + "</td><td>" + m.i + "</td>" +
            m.g.map((g) => '<td class="mono">' + (g === undefined ? '<span class="muted">—</span>' : esc(g)) + "</td>").join("") + "</tr>").join("") + "</tbody>";
        $("r_table_wrap").hidden = false;
      } else $("r_table_wrap").hidden = true;
      outEl.textContent = res.replaced === null ? "" : res.replaced;
    }
    function run() {
      const my = ++seq, src = text.value;
      if (!worker) newWorker();
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (my !== seq) return;
        newWorker();
        st.className = "note note--bad mt"; st.textContent = t("v_rx_timeout", "Pattern took too long (possible catastrophic backtracking) — stopped.");
      }, 1200);
      worker.onmessage = (e) => { if (my !== seq) return; clearTimeout(timer); render(e.data, src); };
      worker.postMessage({ pat: pat.value, flags: flags, text: src, rep: rep.value === "" ? null : rep.value });
    }
    const deb = K.debounce(run, 120);
    [pat, text, rep].forEach((e) => e.addEventListener("input", deb));
    K.onLang(run);
    drawFlags(); run();
  }

  // ======================= Base64 =======================
  const u8ToB64 = (u8) => { let s = ""; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
  function wireBase64() {
    const inp = $("b_in"), out = $("b_out"), st = $("b_status"), urlSafe = $("b_url");
    let mode = "enc";
    function run() {
      const raw = inp.value;
      if (!raw) { out.textContent = ""; st.textContent = ""; return; }
      try {
        if (mode === "enc") {
          let b = u8ToB64(new TextEncoder().encode(raw));
          if (urlSafe.checked) b = b.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
          out.textContent = b;
        } else {
          let s = raw.trim().replace(/^data:[^,]*,/, "").replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/");
          while (s.length % 4) s += "=";
          const bin = atob(s), u8 = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
          try { out.textContent = new TextDecoder("utf-8", { fatal: true }).decode(u8); }
          catch (_) {
            out.textContent = t("v_b_binary", "Binary data ({n} bytes) — hex preview:", { n: K.fmt(u8.length, 0) }) + "\n" +
              Array.from(u8.subarray(0, 512)).map((b) => b.toString(16).padStart(2, "0")).join(" ") + (u8.length > 512 ? " …" : "");
          }
        }
        st.textContent = t("v_b_stats", "{a} chars → {b} chars", { a: K.fmt(raw.length, 0), b: K.fmt(out.textContent.length, 0) });
        out.classList.remove("is-bad");
      } catch (_) {
        out.textContent = t("v_b_bad", "Not valid Base64"); out.classList.add("is-bad"); st.textContent = "";
      }
    }
    $("b_mode").addEventListener("click", (e) => {
      const b = e.target.closest("[data-m]");
      if (!b) return;
      mode = b.dataset.m;
      $("b_mode").querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      run();
    });
    $("b_swap").addEventListener("click", () => {
      inp.value = out.textContent;
      const other = $("b_mode").querySelector('[data-m="' + (mode === "enc" ? "dec" : "enc") + '"]');
      other.click();
    });
    inp.addEventListener("input", run);
    urlSafe.addEventListener("change", run);
    K.drop($("b_drop"), (files) => {
      const f = files[0], fr = new FileReader();
      fr.onload = () => {
        out.textContent = fr.result;
        st.textContent = t("v_file_done", "{name} · {size} → data URL of {n} chars", { name: f.name, size: K.bytes(f.size), n: K.fmt(fr.result.length, 0) });
      };
      fr.readAsDataURL(f);
    });
    K.onLang(run);
  }

  // ======================= UUID =======================
  const hex = (u8) => Array.from(u8, (b) => b.toString(16).padStart(2, "0")).join("");
  const dashed = (h) => h.slice(0, 8) + "-" + h.slice(8, 12) + "-" + h.slice(12, 16) + "-" + h.slice(16, 20) + "-" + h.slice(20);
  function uuid4() {
    if (crypto.randomUUID) return crypto.randomUUID();
    const b = crypto.getRandomValues(new Uint8Array(16));
    b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
    return dashed(hex(b));
  }
  let lastMs = 0, seqV7 = 0;
  function uuid7() {
    const b = crypto.getRandomValues(new Uint8Array(16));
    let ms = Date.now();
    if (ms <= lastMs) { ms = lastMs; seqV7++; } else { lastMs = ms; seqV7 = 0; }
    for (let i = 5; i >= 0; i--) { b[i] = ms % 256; ms = Math.floor(ms / 256); }
    // 12-bit counter in rand_a keeps IDs from the same millisecond in order.
    b[6] = 0x70 | ((seqV7 >> 8) & 0x0f); b[7] = seqV7 & 0xff;
    b[8] = (b[8] & 0x3f) | 0x80;
    return dashed(hex(b));
  }
  function wireUuid() {
    let ver = "4";
    function gen() {
      const n = Math.min(500, Math.max(1, parseInt($("u_n").value, 10) || 1));
      const list = [];
      for (let i = 0; i < n; i++) {
        let u = ver === "7" ? uuid7() : uuid4();
        if ($("u_nodash").checked) u = u.replace(/-/g, "");
        if ($("u_upper").checked) u = u.toUpperCase();
        if ($("u_braces").checked) u = "{" + u + "}";
        list.push(u);
      }
      $("u_list").textContent = list.join("\n");
    }
    $("u_ver").addEventListener("click", (e) => {
      const b = e.target.closest("[data-v]");
      if (!b) return;
      ver = b.dataset.v;
      $("u_ver").querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      gen();
    });
    ["u_n", "u_upper", "u_nodash", "u_braces"].forEach((id) => $(id).addEventListener("input", gen));
    $("u_gen").addEventListener("click", gen);
    function inspect() {
      const raw = $("u_check").value.trim().replace(/[{}]/g, "").toLowerCase();
      const box = $("u_info");
      if (!raw) { box.innerHTML = ""; return; }
      const h = raw.replace(/-/g, "");
      if (!/^[0-9a-f]{32}$/.test(h)) { box.innerHTML = '<div class="note note--bad">' + esc(t("v_not_uuid", "Not a valid UUID")) + "</div>"; return; }
      const v = parseInt(h[12], 16), varBits = parseInt(h[16], 16);
      const variant = varBits >= 0xe ? "Reserved" : varBits >= 0xc ? "Microsoft" : varBits >= 0x8 ? "RFC 9562" : "NCS";
      let created = "";
      if (v === 7) created = new Date(parseInt(h.slice(0, 12), 16)).toISOString().replace("T", " ").replace("Z", " UTC");
      else if (v === 1) {
        const ts = BigInt("0x" + h.slice(13, 16) + h.slice(8, 12) + h.slice(0, 8));
        created = new Date(Number((ts - 122192928000000000n) / 10000n)).toISOString().replace("T", " ").replace("Z", " UTC");
      }
      const st = (l, v2) => '<div class="stat"><div class="stat__label">' + esc(l) + '</div><div class="stat__value mono small-val">' + esc(v2) + "</div></div>";
      box.innerHTML = st(t("v_version", "Version"), h === "0".repeat(32) ? "Nil" : "v" + v) + st(t("v_variant", "Variant"), variant) + (created ? st(t("v_created", "Created"), created) : "");
    }
    $("u_check").addEventListener("input", inspect);
    gen();
  }

  // ======================= Lorem ipsum =======================
  const LA = ("lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua enim ad minim veniam " +
    "quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo consequat duis aute irure in reprehenderit voluptate velit esse cillum fugiat nulla " +
    "pariatur excepteur sint occaecat cupidatat non proident sunt culpa qui officia deserunt mollit anim id est laborum curabitur pretium tincidunt lacus " +
    "nunc pulvinar sapien ligula aenean vulputate eleifend tellus integer maximus porta mauris").split(" ");
  const AR = ("هذا النص هو مثال لنص يمكن أن يستبدل في نفس المساحة لقد تم توليد هذا من مولد العربى حيث يمكنك أن تولد مثل هذا أو العديد من النصوص الأخرى إضافة " +
    "إلى زيادة عدد الحروف التى يولدها التطبيق إذا كنت تحتاج إلى عدد أكبر الفقرات يتيح لك العربى زيادة الفقرات كما تريد النص لن يبدو مقسما ولا يحوي أخطاء لغوية " +
    "مفيد لمصممي المواقع على وجه الخصوص حيث يحتاج العميل فى كثير من الأحيان أن يطلع على صورة حقيقية لتصميم الموقع ومن هنا وجب على المصمم أن يضع نصوصا مؤقتة " +
    "التصميم ليظهر للعميل الشكل كاملا دور مولد النص العربى أن يوفر على المصمم عناء البحث عن بديل").split(" ");
  const CLASSIC = { la: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.", ar: "هذا النص هو مثال لنص يمكن أن يستبدل في نفس المساحة." };
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  function sentence(words, lang) {
    const n = rnd(7, 15), w = [];
    for (let i = 0; i < n; i++) w.push(words[rnd(0, words.length - 1)]);
    if (n > 9) w[rnd(3, n - 4)] += lang === "ar" ? "،" : ",";
    let s = w.join(" ");
    if (lang === "la") s = s[0].toUpperCase() + s.slice(1);
    return s + ".";
  }
  function wireLorem() {
    let lang = "la", unit = "p";
    const pick = (id, attr, cb) => $(id).addEventListener("click", (e) => {
      const b = e.target.closest("[" + attr + "]");
      if (!b) return;
      $(id).querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      cb(b.getAttribute(attr)); gen();
    });
    pick("l_lang", "data-l", (v) => { lang = v; });
    pick("l_unit", "data-u", (v) => { unit = v; });
    function gen() {
      const n = +$("l_n").value, words = lang === "ar" ? AR : LA;
      $("l_n_out").textContent = n;
      let blocks;
      if (unit === "w") {
        const w = [];
        for (let i = 0; i < n * 5; i++) w.push(words[rnd(0, words.length - 1)]);
        if ($("l_start").checked) w.splice(0, Math.min(5, w.length), ...CLASSIC[lang].replace(/[.,،]/g, "").split(" ").slice(0, 5));
        blocks = [w.slice(0, Math.max(n * 5, 1)).join(" ")];
      } else if (unit === "s") {
        const s = [];
        for (let i = 0; i < n; i++) s.push(sentence(words, lang));
        if ($("l_start").checked) s[0] = CLASSIC[lang];
        blocks = [s.join(" ")];
      } else {
        blocks = [];
        for (let p = 0; p < n; p++) {
          const s = [];
          for (let i = rnd(3, 6); i > 0; i--) s.push(sentence(words, lang));
          blocks.push(s.join(" "));
        }
        if ($("l_start").checked) blocks[0] = CLASSIC[lang] + " " + blocks[0];
      }
      const html = $("l_html").checked;
      const outEl = $("l_out");
      outEl.dir = lang === "ar" ? "rtl" : "ltr";
      outEl.textContent = html ? blocks.map((b) => "<p>" + b + "</p>").join("\n") : blocks.join("\n\n");
      outEl.classList.toggle("mono", html);
      const all = blocks.join(" ");
      $("l_stats").textContent = t("v_lorem_stats", "{w} words · {c} characters", { w: all.split(/\s+/).length, c: K.fmt(all.length, 0) });
    }
    ["l_n", "l_html", "l_start"].forEach((id) => $(id).addEventListener("input", gen));
    $("l_gen").addEventListener("click", gen);
    K.onLang(gen);
    gen();
  }

  K.ready(() => {
    K.keepInputs("devtools");
    K.tabs("dev");
    wireJson(); wireRegex(); wireBase64(); wireUuid(); wireLorem();
  });
})();
