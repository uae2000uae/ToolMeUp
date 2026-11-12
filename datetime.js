/*
  ToolMeUp • Date & Time tools
  World clock + meeting planner, countdown (shareable), age, date difference.
  Uses the browser's Intl time-zone data — no libraries.
*/
(function () {
  "use strict";
  const TM = window.ToolMeUp, K = window.Kit, t = TM.t, $ = (id) => document.getElementById(id);
  const DAY = 864e5;

  TM.addStrings({
    d_title: "أدوات التاريخ والوقت",
    d_lead: "خطّط عبر المناطق الزمنية، واعدد تنازلياً لأي موعد، واحسب الأعمار والأيام بين التواريخ.",
    d_tab_zones: "الساعة العالمية", d_tab_countdown: "العد التنازلي", d_tab_age: "العمر", d_tab_diff: "الفرق بين تاريخين",
    d_zones_t: "الساعة العالمية ومخطط الاجتماعات", d_zones_sub: "اسحب المؤشر لتغيير الوقت ومشاهدته في كل المدن دفعة واحدة.",
    d_add_ph: "أضف مدينة أو منطقة زمنية…", d_now: "العودة إلى الآن", d_shift_now: "الآن", d_shift: "{sign}{h} س {m} د من الآن",
    d_local: "توقيتك المحلي", d_remove: "إزالة", d_same: "نفس توقيتك", d_ahead: "متقدّم {h}", d_behind: "متأخر {h}", d_not_found: "لم يتم العثور على منطقة زمنية مطابقة",
    d_work: "ساعات العمل",
    d_event: "اسم المناسبة", d_event_ph: "يومي المميّز", d_target: "التاريخ والوقت", d_quick: "اختيارات سريعة",
    d_eod: "نهاية اليوم", d_weekend: "عطلة نهاية الأسبوع", d_newyear: "رأس السنة",
    d_days: "يوم", d_hours: "ساعة", d_minutes: "دقيقة", d_seconds: "ثانية",
    d_until: "حتى {when}", d_since: "مرّ منذ {when}", d_done: "🎉 حان الوقت!", d_pick: "اختر تاريخاً ووقتاً لبدء العد التنازلي.",
    d_share: "نسخ رابط المشاركة", d_countdown_default: "العد التنازلي",
    d_birth: "تاريخ الميلاد", d_on: "العمر بتاريخ", d_age: "العمر", d_next_bday: "عيد الميلاد القادم", d_born_on: "وُلدت يوم",
    d_age_main: "{y} سنة", d_age_sub: "{m} شهر و {d} يوم", d_in_days: "بعد {n} يوم", d_today: "اليوم! 🎂", d_turning: "ستبلغ {n}",
    d_hijri: "بالهجري: {h}",
    d_tot_months: "إجمالي الأشهر", d_tot_weeks: "إجمالي الأسابيع", d_tot_days: "إجمالي الأيام", d_tot_hours: "إجمالي الساعات",
    d_between: "عدد الأيام بين تاريخين", d_start: "تاريخ البداية", d_end: "تاريخ النهاية", d_options: "خيارات",
    d_include_end: "احتساب يوم النهاية", d_frisat: "العطلة الجمعة والسبت",
    d_res_days: "الأيام", d_res_weeks: "أسابيع وأيام", d_res_ymd: "سنوات وأشهر وأيام", d_res_bdays: "أيام العمل", d_res_hours: "الساعات",
    d_weeks_days: "{w} أسبوع و {d} يوم", d_ymd: "{y} س، {m} ش، {d} ي",
    d_add_t: "إضافة أو طرح", d_u_days: "أيام", d_u_weeks: "أسابيع", d_u_months: "أشهر", d_u_years: "سنوات", d_u_bdays: "أيام عمل",
    d_how1: "<b>الساعة العالمية:</b> أضف المدن من مربع البحث، ثم اسحب المؤشر لإيجاد وقت يناسب الجميع. ساعات الليل مظلّلة.",
    d_how2: "<b>العد التنازلي:</b> سمِّ المناسبة واختر التاريخ. انسخ رابط المشاركة لإرسال عد تنازلي مباشر لشخص آخر.",
    d_how3: "<b>العمر</b> و<b>الفرق بين تاريخين</b> يحسبان السنوات والأشهر والأيام بدقة، مع المجاميع وأيام العمل.",
    d_faq1_q: "كيف تُحسب أيام العمل؟",
    d_faq1_a: "تُحتسب كل الأيام بين التاريخين ما عدا أيام العطلة الأسبوعية. افتراضياً العطلة هي السبت والأحد (كما في الإمارات منذ 2022)، ويمكنك تغييرها إلى الجمعة والسبت. العطل الرسمية غير مستثناة.",
    d_faq2_q: "ما مدى دقة التاريخ الهجري؟",
    d_faq2_a: "يستخدم تقويم أم القرى المدمج في متصفحك. قد تختلف التواريخ الرسمية بيوم واحد لأنها تعتمد على رؤية الهلال."
  });

  const loc = () => (TM.lang() === "ar" ? "ar-AE-u-nu-latn" : "en-GB");
  const pad = (n) => String(n).padStart(2, "0");

  // ---- Time-zone helpers ------------------------------------------------------
  const LOCAL = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const ALL_TZ = (Intl.supportedValuesOf ? Intl.supportedValuesOf("timeZone") : [
    "UTC", "Asia/Dubai", "Asia/Riyadh", "Asia/Kolkata", "Asia/Tokyo", "Asia/Shanghai", "Asia/Singapore", "Europe/London", "Europe/Paris",
    "Europe/Berlin", "Europe/Moscow", "Africa/Cairo", "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles", "Australia/Sydney"]);
  if (ALL_TZ.indexOf("UTC") === -1) ALL_TZ.unshift("UTC");
  const city = (tz) => (tz === "UTC" ? "UTC" : tz.split("/").pop().replace(/_/g, " "));
  function zoneParts(date, tz) {
    const p = {};
    new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })
      .formatToParts(date).forEach((x) => { p[x.type] = x.value; });
    return p;
  }
  function offsetMin(date, tz) {
    const p = zoneParts(date, tz);
    const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
    return Math.round((asUtc - Math.floor(date.getTime() / 1000) * 1000) / 60000);
  }
  function longName(date, tz) {
    try {
      const parts = new Intl.DateTimeFormat(loc(), { timeZone: tz, timeZoneName: "longGeneric" }).formatToParts(date);
      const n = parts.find((x) => x.type === "timeZoneName");
      return n ? n.value : tz;
    } catch (_) { return tz; }
  }
  const hm = (mins) => { const a = Math.abs(mins); return Math.floor(a / 60) + (a % 60 ? ":" + pad(a % 60) : "") + "h"; };

  let zones = K.load("dt:zones", ["local", "UTC", "Asia/Dubai", "Europe/London", "America/New_York", "Asia/Tokyo"]);
  let shift = 0;
  function drawClocks() {
    const now = new Date(Date.now() + shift * 60000);
    const myOff = offsetMin(now, LOCAL);
    $("tz_clocks").innerHTML = zones.map((z, i) => {
      if (z === LOCAL && zones.indexOf("local") !== -1) return ""; // already shown as "Your time"
      const tz = z === "local" ? LOCAL : z;
      const p = zoneParts(now, tz), h = +p.hour % 24, mm = +p.minute;
      const off = offsetMin(now, tz) - myOff;
      const rel = off === 0 ? t("d_same", "Same as you") : off > 0 ? t("d_ahead", "{h} ahead", { h: hm(off) }) : t("d_behind", "{h} behind", { h: hm(off) });
      const date = new Intl.DateTimeFormat(loc(), { timeZone: tz, weekday: "short", day: "numeric", month: "short" }).format(now);
      const night = h < 6 || h >= 20, dusk = !night && (h < 8 || h >= 18);
      const markerPct = ((h * 60 + mm) / 1440) * 100;
      return '<div class="clock' + (night ? " is-night" : dusk ? " is-dusk" : "") + '">' +
        '<div class="clock__top"><div><b>' + TM.esc(z === "local" ? t("d_local", "Your time") + " · " + city(LOCAL) : city(tz)) + "</b>" +
        '<small>' + TM.esc(longName(now, tz)) + "</small></div>" +
        (z === "local" ? "" : '<button type="button" class="icon-btn clock__x" data-rm="' + i + '" aria-label="' + TM.esc(t("d_remove", "Remove")) + '">×</button>') + "</div>" +
        '<div class="clock__time" dir="ltr">' + pad(h) + ":" + pad(mm) + '<span class="clock__icon">' + (night ? "☾" : "☀") + "</span></div>" +
        '<div class="clock__meta"><span>' + TM.esc(date) + "</span><span>" + TM.esc(rel) + "</span></div>" +
        '<div class="clock__day" dir="ltr" title="' + TM.esc(t("d_work", "Working hours")) + ' 09–17"><span class="clock__work"></span><span class="clock__mark" style="left:' + markerPct + '%"></span></div>' +
        "</div>";
    }).join("");
    const lab = $("tz_shift_label");
    lab.textContent = shift === 0 ? t("d_shift_now", "Now") : t("d_shift", "{sign}{h}h {m}m from now", { sign: shift > 0 ? "+" : "−", h: Math.floor(Math.abs(shift) / 60), m: pad(Math.abs(shift) % 60) });
  }
  function wireZones() {
    $("tz_list").innerHTML = ALL_TZ.map((z) => '<option value="' + z + '">' + city(z) + "</option>").join("");
    const add = () => {
      const q = $("tz_add").value.trim().toLowerCase().replace(/\s+/g, "_");
      if (!q) return;
      const hit = ALL_TZ.find((z) => z.toLowerCase() === q) || ALL_TZ.find((z) => z.toLowerCase().split("/").pop() === q) ||
        ALL_TZ.find((z) => z.toLowerCase().indexOf(q) !== -1);
      if (!hit) { K.toast(t("d_not_found", "No matching time zone found"), true); return; }
      if (zones.indexOf(hit) === -1) zones.push(hit);
      K.save("dt:zones", zones);
      $("tz_add").value = "";
      drawClocks();
    };
    $("tz_add").addEventListener("change", add);
    $("tz_add").addEventListener("keydown", (e) => { if (e.key === "Enter") add(); });
    $("tz_clocks").addEventListener("click", (e) => {
      const b = e.target.closest("[data-rm]");
      if (!b) return;
      zones.splice(+b.dataset.rm, 1); K.save("dt:zones", zones); drawClocks();
    });
    $("tz_shift").addEventListener("input", () => { shift = +$("tz_shift").value; drawClocks(); });
    $("tz_now").addEventListener("click", () => { shift = 0; $("tz_shift").value = 0; drawClocks(); });
    setInterval(() => { if (!document.hidden && !$("tz_clocks").closest("[hidden]")) drawClocks(); }, 1000);
    drawClocks();
  }

  // ---- Countdown ------------------------------------------------------------------
  const toLocalInput = (d) => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + "T" + pad(d.getHours()) + ":" + pad(d.getMinutes());
  function wireCountdown() {
    const nameEl = $("cd_name"), tEl = $("cd_target");
    const saved = K.load("dt:countdown", null);
    const m = /^#countdown\?(.*)$/.exec(location.hash);
    if (m) {
      const q = new URLSearchParams(m[1]);
      if (q.get("t")) tEl.value = q.get("t");
      if (q.get("n")) nameEl.value = q.get("n");
      history.replaceState(null, "", "#countdown");
    } else if (saved) { tEl.value = saved.t || ""; nameEl.value = saved.n || ""; }
    function tick() {
      const target = tEl.value ? new Date(tEl.value) : null;
      $("cd_title").textContent = nameEl.value || t("d_countdown_default", "Countdown");
      const box = $("cd_box");
      if (!target || isNaN(target)) {
        ["cd_d", "cd_h", "cd_m", "cd_s"].forEach((id, i) => { $(id).textContent = i ? "00" : "0"; });
        $("cd_when").textContent = t("d_pick", "Pick a date and time to start counting down.");
        box.classList.remove("is-done", "is-past"); return;
      }
      let diff = target - Date.now();
      const past = diff < 0;
      diff = Math.abs(diff);
      const d = Math.floor(diff / DAY), h = Math.floor(diff / 36e5) % 24, mi = Math.floor(diff / 6e4) % 60, s = Math.floor(diff / 1e3) % 60;
      $("cd_d").textContent = d; $("cd_h").textContent = pad(h); $("cd_m").textContent = pad(mi); $("cd_s").textContent = pad(s);
      const when = new Intl.DateTimeFormat(loc(), { dateStyle: "full", timeStyle: "short" }).format(target);
      box.classList.toggle("is-done", past && diff < 60000);
      box.classList.toggle("is-past", past);
      $("cd_when").textContent = past && diff < 60000 ? t("d_done", "🎉 It's time!") : past ? t("d_since", "Since {when}", { when }) : t("d_until", "Until {when}", { when });
    }
    const persist = () => { K.save("dt:countdown", { t: tEl.value, n: nameEl.value }); tick(); };
    [nameEl, tEl].forEach((e) => e.addEventListener("input", persist));
    $("cd_quick").addEventListener("click", (e) => {
      const b = e.target.closest("[data-q]");
      if (!b) return;
      const d = new Date();
      if (b.dataset.q === "1h") d.setHours(d.getHours() + 1);
      else if (b.dataset.q === "eod") d.setHours(23, 59, 0, 0);
      else if (b.dataset.q === "weekend") { d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7)); d.setHours(0, 0, 0, 0); }
      else if (b.dataset.q === "newyear") { d.setFullYear(d.getFullYear() + 1, 0, 1); d.setHours(0, 0, 0, 0); }
      tEl.value = toLocalInput(d);
      persist();
    });
    $("cd_share").addEventListener("click", () => {
      if (!tEl.value) return;
      const q = new URLSearchParams({ t: tEl.value });
      if (nameEl.value) q.set("n", nameEl.value);
      K.copy(location.origin + location.pathname + "#countdown?" + q.toString());
    });
    setInterval(() => { if (!document.hidden) tick(); }, 1000);
    K.onLang(tick);
    tick();
  }

  // ---- Date maths (all on UTC midnights, so DST never shifts a day) ----------------
  const parseD = (v) => { if (!v) return null; const p = v.split("-").map(Number); return new Date(Date.UTC(p[0], p[1] - 1, p[2])); };
  const iso = (d) => d.getUTCFullYear() + "-" + pad(d.getUTCMonth() + 1) + "-" + pad(d.getUTCDate());
  const todayUTC = () => { const n = new Date(); return new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate())); };
  const dim = (y, m) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  function ymd(a, b) {
    let y = b.getUTCFullYear() - a.getUTCFullYear(), m = b.getUTCMonth() - a.getUTCMonth(), d = b.getUTCDate() - a.getUTCDate();
    if (d < 0) { m--; d += dim(b.getUTCFullYear(), b.getUTCMonth() - 1); }
    if (m < 0) { y--; m += 12; }
    return { y, m, d };
  }
  function addMonths(d, n) {
    const y = d.getUTCFullYear(), m = d.getUTCMonth() + n, day = d.getUTCDate();
    const ty = y + Math.floor(m / 12), tm = ((m % 12) + 12) % 12;
    return new Date(Date.UTC(ty, tm, Math.min(day, dim(ty, tm))));
  }
  const isWeekend = (d, friSat) => { const w = d.getUTCDay(); return friSat ? (w === 5 || w === 6) : (w === 0 || w === 6); };
  const fmtDate = (d, opts) => new Intl.DateTimeFormat(loc(), Object.assign({ timeZone: "UTC" }, opts || { dateStyle: "medium" })).format(d);
  const stat = (label, value, sub, hero) => '<div class="stat' + (hero ? " stat--hero" : "") + '"><div class="stat__label">' + TM.esc(label) +
    '</div><div class="stat__value">' + value + "</div>" + (sub ? '<div class="stat__sub">' + TM.esc(sub) + "</div>" : "") + "</div>";

  function wireAge() {
    const b = $("age_birth"), on = $("age_on");
    on.value = iso(todayUTC());
    function upd() {
      const birth = parseD(b.value), ref = parseD(on.value) || todayUTC();
      if (!birth || birth > ref) { $("age_out").hidden = true; return; }
      const a = ymd(birth, ref);
      $("age_main").textContent = t("d_age_main", "{y} years", { y: a.y });
      $("age_sub").textContent = t("d_age_sub", "{m} months and {d} days", { m: a.m, d: a.d });
      let next = new Date(Date.UTC(ref.getUTCFullYear(), birth.getUTCMonth(), Math.min(birth.getUTCDate(), dim(ref.getUTCFullYear(), birth.getUTCMonth()))));
      if (next < ref) next = new Date(Date.UTC(ref.getUTCFullYear() + 1, birth.getUTCMonth(), Math.min(birth.getUTCDate(), dim(ref.getUTCFullYear() + 1, birth.getUTCMonth()))));
      const nd = Math.round((next - ref) / DAY);
      $("age_next").textContent = nd === 0 ? t("d_today", "Today! 🎂") : t("d_in_days", "in {n} days", { n: K.fmt(nd, 0) });
      $("age_next_sub").textContent = fmtDate(next, { weekday: "long", day: "numeric", month: "long", year: "numeric" }) + " · " +
        t("d_turning", "turning {n}", { n: next.getUTCFullYear() - birth.getUTCFullYear() });
      $("age_wday").textContent = fmtDate(birth, { weekday: "long" });
      let hijri = "";
      try { hijri = new Intl.DateTimeFormat((TM.lang() === "ar" ? "ar-SA" : "en") + "-u-ca-islamic-umalqura-nu-latn", { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" }).format(birth); } catch (_) { /* no Hijri support */ }
      $("age_hijri").textContent = hijri ? t("d_hijri", "Hijri: {h}", { h: hijri }) : "";
      const days = Math.round((ref - birth) / DAY);
      $("age_totals").innerHTML = stat(t("d_tot_months", "Total months"), K.fmt(a.y * 12 + a.m, 0)) + stat(t("d_tot_weeks", "Total weeks"), K.fmt(Math.floor(days / 7), 0)) +
        stat(t("d_tot_days", "Total days"), K.fmt(days, 0)) + stat(t("d_tot_hours", "Total hours"), K.fmt(days * 24, 0));
      $("age_out").hidden = false;
    }
    [b, on].forEach((e) => e.addEventListener("input", upd));
    K.onLang(upd);
    upd();
  }

  function wireDiff() {
    const a = $("df_a"), b = $("df_b"), incl = $("df_incl"), fs = $("df_frisat");
    const today = todayUTC();
    a.value = iso(today); b.value = iso(addMonths(today, 1));
    function upd() {
      let A = parseD(a.value), B = parseD(b.value);
      if (!A || !B) { $("df_out").innerHTML = ""; return; }
      const neg = B < A;
      if (neg) [A, B] = [B, A];
      let days = Math.round((B - A) / DAY) + (incl.checked ? 1 : 0);
      let bdays = 0;
      const end = incl.checked ? B.getTime() : B.getTime() - DAY;
      if (days <= 200000) for (let x = A.getTime(); x <= end; x += DAY) if (!isWeekend(new Date(x), fs.checked)) bdays++;
      const span = ymd(A, incl.checked ? new Date(B.getTime() + DAY) : B);
      const sign = neg ? "−" : "";
      $("df_out").innerHTML =
        stat(t("d_res_days", "Days"), sign + K.fmt(days, 0), "", true) +
        stat(t("d_res_weeks", "Weeks and days"), TM.esc(t("d_weeks_days", "{w} weeks, {d} days", { w: K.fmt(Math.floor(days / 7), 0), d: days % 7 }))) +
        stat(t("d_res_ymd", "Years, months, days"), TM.esc(t("d_ymd", "{y}y {m}m {d}d", span))) +
        stat(t("d_res_bdays", "Business days"), K.fmt(bdays, 0)) +
        stat(t("d_res_hours", "Hours"), K.fmt(days * 24, 0));
    }
    [a, b, incl, fs].forEach((e) => { e.addEventListener("input", upd); e.addEventListener("change", upd); });

    const ad = $("ad_date"), sg = $("ad_sign"), n = $("ad_n"), u = $("ad_unit");
    ad.value = iso(today);
    function updAdd() {
      const d = parseD(ad.value), k = parseInt(n.value, 10) * +sg.value;
      if (!d || !Number.isFinite(k)) { $("ad_out").textContent = "—"; return; }
      let r;
      if (u.value === "d") r = new Date(d.getTime() + k * DAY);
      else if (u.value === "w") r = new Date(d.getTime() + k * 7 * DAY);
      else if (u.value === "m") r = addMonths(d, k);
      else if (u.value === "y") r = addMonths(d, k * 12);
      else {
        r = new Date(d.getTime());
        let left = Math.abs(k);
        const step = k < 0 ? -DAY : DAY;
        while (left > 0) { r = new Date(r.getTime() + step); if (!isWeekend(r, fs.checked)) left--; }
      }
      $("ad_out").textContent = fmtDate(r, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    }
    [ad, sg, n, u, fs].forEach((e) => { e.addEventListener("input", updAdd); e.addEventListener("change", updAdd); });
    K.onLang(() => { upd(); updAdd(); });
    upd(); updAdd();
  }

  K.ready(() => {
    if (/^#countdown\?/.test(location.hash)) { try { localStorage.setItem("toolmeup:tab:dt", "countdown"); } catch (_) { /* ignore */ } }
    K.keepInputs("datetime");
    wireCountdown();
    K.tabs("dt", () => drawClocks());
    wireZones(); wireAge(); wireDiff();
    K.onLang(drawClocks);
  });
})();
