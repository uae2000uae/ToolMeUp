/*
  ToolMeUp • shared site chrome
  - TOOLS / CATEGORIES: the single source of truth for every tool. The header
    menu, the home page, the quick-search palette and the "recent tools" list
    are all generated from it. To add a tool: add one entry below + its page.
  - Theme (light/dark) and language (English/Arabic) toggles, persisted.
  - i18n: pages marked <html data-i18n="full"> switch fully to Arabic + RTL;
    other pages (fitment) only translate elements marked data-i18n (hints).
*/
(function () {
  "use strict";

  // ---- Categories ------------------------------------------------------
  const CATEGORIES = [
    { id: "automotive", en: "Automotive", ar: "السيارات", hue: "amber" },
    { id: "calc", en: "Calculators & Converters", ar: "الحاسبات والمحوّلات", hue: "blue" },
    { id: "time", en: "Date & Time", ar: "التاريخ والوقت", hue: "indigo" },
    { id: "dev", en: "Developer", ar: "أدوات المطورين", hue: "violet" },
    { id: "media", en: "Images, PDF & QR", ar: "الصور وPDF وQR", hue: "rose" },
    { id: "gaming", en: "Gaming", ar: "الألعاب", hue: "teal" }
  ];

  // ---- Tool manifest ---------------------------------------------------
  // id:    unique key; pages set <html data-tool="id"> to mark themselves
  // cat:   category id (above)
  // href:  page to open
  // icon:  SVG path data (24x24, stroked)
  // tags:  extra search words (English + Arabic)
  // en/ar: { name, title, desc }
  const TOOLS = [
    {
      id: "fitment", cat: "automotive", href: "fitment.html",
      icon: "M12 3a9 9 0 100 18 9 9 0 000-18zm0 4a5 5 0 110 10 5 5 0 010-10zm0 3a2 2 0 100 4 2 2 0 000-4z",
      tags: "wheel rim offset spacer clearance fender poke جنط إطار أوفست",
      en: { name: "Fitment", title: "Wheel & Tire Fitment", desc: "Compare wheel and tire setups against your baseline: offset, spacers, clearances, poke and speedo error, with live drawings." },
      ar: { name: "المقاسات", title: "مقاسات الجنوط والإطارات", desc: "قارن تركيبات الجنوط والإطارات مع تركيبك الحالي: الأوفست، الفواصل، الخلوص، البروز وخطأ العداد مع رسومات حيّة." }
    },
    {
      id: "tires", cat: "automotive", href: "tires.html", isNew: true,
      icon: "M12 2a10 10 0 100 20 10 10 0 000-20zm0 5a5 5 0 110 10 5 5 0 010-10zM4.5 12H7m10 0h2.5M12 4.5V7m0 10v2.5",
      tags: "tire size compare speedometer speedo error gps diameter إطار عداد سرعة مقارنة",
      en: { name: "Tire Size", title: "Tire Size & Speedometer", desc: "Compare two tire sizes side by side and see how a new size changes your speedometer reading." },
      ar: { name: "مقاس الإطار", title: "مقاس الإطار وعدّاد السرعة", desc: "قارن مقاسين للإطارات جنباً إلى جنب، واعرف كيف يغيّر المقاس الجديد قراءة عدّاد السرعة." }
    },
    {
      id: "calculators", cat: "calc", href: "calculators.html", isNew: true,
      icon: "M7 3h10a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2zm1 3h8v3H8V6zm0 6h.01M12 12h.01M16 12h.01M8 15h.01M12 15h.01M16 15h.01M8 18h.01M12 18h.01M16 18h.01",
      tags: "calculator percent percentage loan mortgage interest bmi video resolution aspect ratio حاسبة نسبة قرض فائدة كتلة",
      en: { name: "Calculators", title: "Calculator Suite", desc: "Basic, percentage, loan & interest, video ratio & resolution, and BMI calculators in one place." },
      ar: { name: "الحاسبات", title: "مجموعة الحاسبات", desc: "حاسبة أساسية، النسبة المئوية، القروض والفائدة، نسبة أبعاد الفيديو والدقة، ومؤشر كتلة الجسم في مكان واحد." }
    },
    {
      id: "units", cat: "calc", href: "units.html", isNew: true,
      icon: "M4 7h11m0 0l-3-3m3 3l-3 3M20 17H9m0 0l3-3m-3 3l3 3",
      tags: "unit converter length weight mass temperature speed volume area pressure data fuel mpg l/100km km/l psi bar kpa hp kw horsepower torque nm lb-ft celsius fahrenheit km miles kg lb gallon litre liter inch cm feet gb mb تحويل وحدات طول وزن حرارة سرعة ضغط حصان عزم",
      en: { name: "Units", title: "Unit Converter", desc: "Convert length, weight, temperature, speed, volume, area, pressure, data and fuel economy — see every unit at once." },
      ar: { name: "الوحدات", title: "محوّل الوحدات", desc: "حوّل الطول والوزن والحرارة والسرعة والحجم والمساحة والضغط والبيانات واستهلاك الوقود — وشاهد كل الوحدات دفعة واحدة." }
    },
    {
      id: "datetime", cat: "time", href: "datetime.html", isNew: true,
      icon: "M12 7v5l3 2M12 3a9 9 0 100 18 9 9 0 000-18z",
      tags: "time zone world clock countdown timer age birthday date difference days between المنطقة الزمنية عد تنازلي عمر",
      en: { name: "Date & Time", title: "Date & Time Tools", desc: "World clock and time zone planner, countdown timer, age calculator and days between dates." },
      ar: { name: "التاريخ والوقت", title: "أدوات التاريخ والوقت", desc: "ساعة عالمية ومخطط للمناطق الزمنية، عدّ تنازلي، حاسبة العمر، والأيام بين تاريخين." }
    },
    {
      id: "devtools", cat: "dev", href: "devtools.html", isNew: true,
      icon: "M8 9l-4 3 4 3m8-6l4 3-4 3M13.5 5l-3 14",
      tags: "json formatter validator regex tester base64 encode decode uuid guid lorem ipsum مطور",
      en: { name: "Dev Tools", title: "Developer Tools", desc: "JSON formatter & validator, regex tester, Base64 encode/decode, UUID generator and lorem ipsum." },
      ar: { name: "أدوات المطورين", title: "أدوات المطورين", desc: "منسّق ومدقّق JSON، مختبر التعابير النمطية، ترميز Base64، مولّد UUID، ونص لوريم إيبسوم." }
    },
    {
      id: "wget", cat: "dev", href: "wget.html",
      icon: "M12 3v10m0 0l-4-4m4 4l4-4M5 17v2a2 2 0 002 2h10a2 2 0 002-2v-2",
      tags: "download http request fetch mirror zip تحميل",
      en: { name: "Wget", title: "Wget Downloader", desc: "Fetch a URL with custom method, headers and body, or mirror a same-origin static site to a ZIP." },
      ar: { name: "Wget", title: "أداة التنزيل Wget", desc: "اجلب رابطاً بطريقة وترويسات ومحتوى مخصّص، أو انسخ موقعاً ثابتاً إلى ملف ZIP." }
    },
    {
      id: "qr", cat: "media", href: "qr.html", isNew: true,
      icon: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 18h2v2h-2zM14 18h2M18 14h2",
      tags: "qr code generator wifi url link vcard barcode رمز كيو آر واي فاي",
      en: { name: "QR Code", title: "QR Code Generator", desc: "Turn text, links, Wi-Fi details or contacts into a QR code. Pick colors and download PNG or SVG." },
      ar: { name: "رمز QR", title: "مولّد رمز QR", desc: "حوّل النصوص والروابط وبيانات الواي فاي وجهات الاتصال إلى رمز QR. اختر الألوان ونزّله PNG أو SVG." }
    },
    {
      id: "images", cat: "media", href: "images.html", isNew: true,
      icon: "M4 5h16v14H4zM4 15l4-4 4 4 3-3 5 5M15.5 9.5h.01",
      tags: "image compress resize shrink jpg jpeg png webp photo batch ضغط صور تصغير",
      en: { name: "Images", title: "Image Compressor & Resizer", desc: "Shrink and resize photos in batches with a before/after preview. Download one by one or as a ZIP." },
      ar: { name: "الصور", title: "ضغط الصور وتغيير حجمها", desc: "قلّل حجم الصور وغيّر أبعادها دفعة واحدة مع معاينة قبل/بعد. نزّلها منفردة أو في ملف ZIP." }
    },
    {
      id: "pdf", cat: "media", href: "pdf.html", isNew: true,
      icon: "M7 3h7l5 5v13H7zM14 3v5h5M9.5 13h5M9.5 17h5",
      tags: "pdf merge combine split extract pages دمج تقسيم صفحات",
      en: { name: "PDF", title: "PDF Merge & Split", desc: "Combine PDFs in any order, or split and extract pages — your files never leave your device." },
      ar: { name: "PDF", title: "دمج وتقسيم PDF", desc: "ادمج ملفات PDF بالترتيب الذي تريده، أو قسّمها واستخرج صفحات منها — ملفاتك لا تغادر جهازك." }
    },
    {
      id: "dualshock", cat: "gaming", href: "Dualshock-tool/index.html", external: true,
      icon: "M6 10h4M8 8v4m6-1h.01M17 10h.01M7 6h10a4 4 0 014 4l1 6a2.5 2.5 0 01-4.6 1.4L15 14H9l-2.4 3.4A2.5 2.5 0 012 16l1-6a4 4 0 014-4z",
      tags: "playstation ps4 ps5 controller calibration stick drift deadzone يد تحكم بلايستيشن",
      en: { name: "DualShock", title: "DualShock / DualSense Calibration", desc: "Calibrate and fine-tune PlayStation controller sticks over WebHID: deadzones, ranges and center." },
      ar: { name: "DualShock", title: "معايرة يد DualShock / DualSense", desc: "عاير عصي يد بلايستيشن واضبطها عبر WebHID: المنطقة الميتة والمدى والمركز." }
    }
  ];

  const THEME_KEY = "toolmeup:theme";
  const LANG_KEY = "toolmeup:lang";
  const RECENT_KEY = "toolmeup:recent";

  // ---- Strings ---------------------------------------------------------
  // AR holds every Arabic string: fitment hints (data-i18n), site chrome,
  // and whatever each tool page registers via ToolMeUp.addStrings().
  const AR = {
    hint_offset: "المسافة (مم) من سطح تثبيت الجنط إلى خط منتصفه: الرقم الأعلى يُدخل الجنط أكثر إلى الداخل، والرقم الأقل أو السالب يدفعه إلى الخارج.",
    hint_spacer: "صفيحة (مم) تُركّب بين الصرة والجنط لتدفع الجنط بالكامل إلى الخارج. اتركه فارغاً إذا لم يكن هناك فاصل (سبيسر) مركّباً.",
    hint_tire_size: "الرقم الأول هو عرض الإطار (مم)؛ والثاني هو ارتفاع الجدار الجانبي كنسبة (%) من ذلك العرض. رقم R يؤخذ من قطر الجنط لديك.",
    hint_correction: "بعض أنواع الإطارات تكون أعرض من المذكور، وهذا يساعدنا على التأكد من أن إطارك لا يلامس أي شيء. اتركه 0 إذا كنت لا تعرف قيمته.",
    hint_bulge: "انتفاخ الجدار الجانبي خارج حافة الجنط، كما هو موضح في الرسم. النسبة المعتادة 5%.",
    hint_arch_clearance: "الفجوة (مم) بين أعلى الإطار الحالي وقوس العجلة / بطانة الرفرف. الإطارات الأطول تقلل هذه الفجوة؛ نستخدمها لتحذيرك في حال احتك الإطار.",
    hint_clearance: "يفيدنا لمعرفة مقدار المساحة المتوفرة خلف الجنط لاستخدام جنوط أعرض، وللتأكد من أن الإطارات لا تلامس الجهة الداخلية للجنط أو الرفرف الخارجي. إدخال هذه القيم مع تحديد الحدود الدنيا يساعدنا على تحذيرك عندما تكون قريباً جداً أو أكثر.",
    hint_speedo_intro: "معظم تركيبات المصنع تجعل عداد السرعة يعطي قراءة أعلى من سرعة GPS أو الرادار. تساعدك هذه الحاسبة على معرفة القراءة المتوقعة باستخدام التركيب الجديد.",
    hint_speedo_asper: "بحسب إعداداتك، ",
    hint_thresholds: "هذه حدود التحذير. سنحسب الخلوص بناءً على إعداداتك الحالية المُدخلة وسنحذّرك عند تجاوز الحدود. لن يتم إيقاف الحساب.",
    hint_sessions: "اختر اسم الجلسة لتحميلها.",
    caption_rim_view: "مقارنة المقطع العرضي للجنط والإطار",
    caption_side_view: "مقارنة الإطارات من المنظر الجانبي",
    alert_speedo: "سرعة العداد مقابل الأقمار الاصطناعية: {pct}% أي، عندما يعرض عداد السرعة {indicated} كم/س، تكون سرعتك الفعلية (GPS) {actual} كم/س",
    alert_arch_clear: "خلوص قوس العجلة ← {value} مم (ضيّق دون {warn} مم، واحتمال احتكاك دون {bad} مم)",
    alert_inner_clear: "الخلوص الداخلي ← {value} مم (الحد الأدنى {min} مم)",
    alert_outer_clear: "الخلوص الخارجي ← {value} مم (الحد الأدنى {min} مم)",
    alert_rim_mismatch: "التركيب \"{setup}\": مقاس جنط الإطار {tireRim}\" لا يطابق قطر الجنط {wheelRim}\".",
    report_need_baseline: "أدخل إعداداً أساسياً صحيحاً واحفظه لعرض النتائج.",
    report_need_setups: "أضف تركيبات للمقارنة.",
    rep_ride_height_desc: "مقدار تغيّر ارتفاع السيارة نتيجة اختلاف قطر الإطار",
    rep_arch_change_desc: "التغيّر في خلوص الإطار عن قوس العجلة",
    rep_arch_final_desc: "الفجوة المتبقية بين الإطار وقوس العجلة. أقل من 20 مم تُعد ضيّقة، وأقل من 10 مم قد تسبب احتكاكاً",
    rep_inner_change_desc: "التغيّر في الخلوص باتجاه نظام التعليق",
    rep_outer_change_desc: "التغيّر في الخلوص باتجاه الرفرف",
    rep_outer_final_desc: "الخلوص عن الرفرف. القيمة الموجبة تعني خروج الإطار عن خط الرفرف",
    rep_speedo_change_desc: "الفرق في قراءة عداد السرعة نتيجة تغيّر محيط الإطار",
    rep_speedo_final_desc: "خطأ قراءة عداد السرعة. القيمة السالبة تعني أن العداد يقرأ أبطأ من السرعة الفعلية",
    rep_wheel_width_desc: "عرض الجنط",
    rep_wheel_diam_desc: "قطر الجنط",
    rep_offset_desc: "المسافة من خط منتصف الجنط إلى سطح التثبيت. القيمة الموجبة تعني أن الجنط يقع أكثر إلى الداخل",
    rep_backspacing_desc: "المسافة من سطح تثبيت الصرة إلى الحافة الداخلية للجنط",
    rep_poke_desc: "مقدار بروز الجنط إلى الخارج بعد سطح التثبيت",
    rep_od_desc: "ارتفاع الإطار الكلي من الأرض إلى أعلى نقطة",
    rep_section_width_desc: "أقصى عرض للإطار (شاملاً الانتفاخ)",
    rep_sidewall_desc: "ارتفاع الجدار الجانبي للإطار",
    rep_circumference_desc: "طول محيط الإطار",
    rep_revs_mile_desc: "عدد دورات الإطار في الميل الواحد",
    rep_revs_km_desc: "عدد دورات الإطار في الكيلومتر الواحد",

    // Site chrome
    nav_home: "الرئيسية",
    nav_all_tools: "كل الأدوات",
    nav_dark: "الوضع الداكن",
    nav_search: "بحث",
    palette_ph: "ابحث عن أداة…",
    palette_empty: "لا توجد أداة مطابقة.",
    palette_hint: "↑↓ للتنقل • Enter للفتح • Esc للإغلاق",
    home_eyebrow: "خصوصية تامة • بلا تسجيل • بلا تتبّع",
    home_title: "أدوات مجانية <span class=\"grad\">تعمل في متصفحك</span>",
    home_lead: "مجموعة متنامية من الأدوات المفيدة. كل شيء يعمل على جهازك — ملفاتك وبياناتك لا تغادره أبداً.",
    promise1_t: "تعمل على جهازك",
    promise1: "تتم معالجة الملفات داخل متصفحك، ولا يُرفع أي شيء إلى خادم.",
    promise2_t: "بلا حساب وبلا تتبّع",
    promise2: "لا تسجيل ولا إعلانات ولا تحليلات. الإعدادات تُحفظ في متصفحك فقط.",
    promise3_t: "English و العربية",
    promise3: "بدّل اللغة والوضع الداكن من القائمة. الأدوات تدعم الكتابة من اليمين إلى اليسار بالكامل.",
    home_search_ph: "ابحث في الأدوات… (اضغط / )",
    home_all: "الكل",
    home_recent: "استخدمتها مؤخراً",
    home_new: "جديد",
    home_none: "لا توجد أداة مطابقة لبحثك.",
    home_count: "{n} أداة",
    footer_text: "HTML/CSS/JS ثابتة • تعمل بالكامل في متصفحك • بلا تتبّع",
    crumb_home: "الرئيسية",
    copied: "تم النسخ",
    copy: "نسخ",
    download: "تنزيل",
    clear: "مسح",
    howto: "طريقة الاستخدام",
    privacy_badge: "يعمل على جهازك — لا يتم رفع أي شيء"
  };
  const EXTRA_EN = {}; // English fallbacks some pages register for keys

  // ---- Theme -----------------------------------------------------------
  function storedTheme() {
    try { return localStorage.getItem(THEME_KEY); } catch (_) { return null; }
  }
  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme === "dark" ? "dark" : "light");
    document.dispatchEvent(new CustomEvent("toolmeup:themechange", { detail: { theme: theme } }));
  }
  function saveTheme(theme) {
    try { localStorage.setItem(THEME_KEY, theme); } catch (_) { /* ignore */ }
  }
  const initial = storedTheme();
  if (initial) document.documentElement.setAttribute("data-theme", initial === "dark" ? "dark" : "light");

  function wireThemeToggle() {
    const toggle = document.getElementById("themeToggle");
    if (!toggle) return;
    toggle.checked = (document.documentElement.getAttribute("data-theme") || "light") === "dark";
    toggle.addEventListener("change", function () {
      const theme = toggle.checked ? "dark" : "light";
      applyTheme(theme);
      saveTheme(theme);
    });
  }

  // ---- Language --------------------------------------------------------
  function storedLang() {
    try { return localStorage.getItem(LANG_KEY); } catch (_) { return null; }
  }
  function saveLang(lang) {
    try { localStorage.setItem(LANG_KEY, lang); } catch (_) { /* ignore */ }
  }
  function currentLang() { return storedLang() === "ar" ? "ar" : "en"; }
  function isFullI18n() { return document.documentElement.getAttribute("data-i18n") === "full"; }

  // Swap text/attributes of marked elements. English originals are cached
  // on first touch so switching back restores them exactly.
  const ATTRS = [["data-t-ph", "placeholder"], ["data-t-title", "title"], ["data-t-aria", "aria-label"]];
  function translateTree(root, lang) {
    // Legacy fitment hints: text only, per-element rtl.
    root.querySelectorAll("[data-i18n]").forEach(function (el) {
      if (el === document.documentElement) return;
      const key = el.getAttribute("data-i18n");
      if (el.dataset.en === undefined) el.dataset.en = el.textContent;
      if (lang === "ar" && AR[key]) {
        el.textContent = AR[key];
        el.setAttribute("dir", "rtl");
      } else {
        el.textContent = el.dataset.en;
        el.removeAttribute("dir");
      }
    });
    root.querySelectorAll("[data-t]").forEach(function (el) {
      const key = el.getAttribute("data-t");
      if (el.dataset.en === undefined) el.dataset.en = el.innerHTML;
      el.innerHTML = (lang === "ar" && AR[key]) ? AR[key] : el.dataset.en;
    });
    ATTRS.forEach(function (pair) {
      root.querySelectorAll("[" + pair[0] + "]").forEach(function (el) {
        const key = el.getAttribute(pair[0]);
        const cache = "en" + pair[1].replace(/-./g, function (m) { return m[1].toUpperCase(); });
        if (el.dataset[cache] === undefined) el.dataset[cache] = el.getAttribute(pair[1]) || "";
        el.setAttribute(pair[1], (lang === "ar" && AR[key]) ? AR[key] : el.dataset[cache]);
      });
    });
  }
  function applyLang(lang) {
    const root = document.documentElement;
    if (isFullI18n()) {
      root.setAttribute("lang", lang === "ar" ? "ar" : "en");
      root.setAttribute("dir", lang === "ar" ? "rtl" : "ltr");
    }
    translateTree(document, lang);
    renderToolLinks();
    renderHome();
    renderCrumbs();
    document.dispatchEvent(new CustomEvent("toolmeup:langchange", { detail: { lang: lang } }));
  }
  function wireLangToggle() {
    const toggle = document.getElementById("langToggle");
    if (!toggle) return;
    toggle.checked = currentLang() === "ar";
    toggle.addEventListener("change", function () {
      const lang = toggle.checked ? "ar" : "en";
      saveLang(lang);
      applyLang(lang);
    });
  }

  // Translate for text built in JS: Arabic when active and known, otherwise
  // the English fallback. Both go through fill() for {placeholders}.
  function fill(str, vars) {
    if (!vars) return str;
    return String(str).replace(/\{(\w+)\}/g, function (m, k) {
      return vars[k] !== undefined ? vars[k] : m;
    });
  }
  function t(key, fallback, vars) {
    const ar = currentLang() === "ar" ? AR[key] : null;
    return fill(ar || (fallback !== undefined ? fallback : (EXTRA_EN[key] || key)), vars);
  }
  function L(tool, field) { return (currentLang() === "ar" ? tool.ar : tool.en)[field]; }
  function catName(id) {
    const c = CATEGORIES.find(function (x) { return x.id === id; });
    return c ? (currentLang() === "ar" ? c.ar : c.en) : "";
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function iconSvg(path, size) {
    return '<svg viewBox="0 0 24 24" width="' + (size || 22) + '" height="' + (size || 22) +
      '" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' +
      path + '"/></svg>';
  }
  function hueOf(tool) {
    const c = CATEGORIES.find(function (x) { return x.id === tool.cat; });
    return c ? c.hue : "blue";
  }

  // ---- Recent tools ----------------------------------------------------
  function recent() {
    try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"); } catch (_) { return []; }
  }
  function markVisited(id) {
    if (!id || !TOOLS.some(function (x) { return x.id === id; })) return;
    const list = [id].concat(recent().filter(function (x) { return x !== id; })).slice(0, 4);
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(list)); } catch (_) { /* ignore */ }
  }

  // ---- Search ----------------------------------------------------------
  function norm(s) { return String(s || "").toLowerCase().normalize("NFKD").replace(/[̀-ًͯ-ْ]/g, ""); }
  function matches(tool, q) {
    if (!q) return true;
    const hay = norm([tool.en.name, tool.en.title, tool.en.desc, tool.ar.name, tool.ar.title, tool.ar.desc, tool.tags, catName(tool.cat)].join(" "));
    return norm(q).split(/\s+/).filter(Boolean).every(function (w) { return hay.indexOf(w) !== -1; });
  }
  function score(tool, q) {
    const nq = norm(q);
    if (!nq) return 0;
    if (norm(L(tool, "name")).indexOf(nq) === 0) return 3;
    if (norm(L(tool, "title")).indexOf(nq) !== -1) return 2;
    return 1;
  }

  // ---- Header: tool links in the menu ------------------------------------
  function renderToolLinks() {
    const mount = document.querySelector("[data-tool-links]");
    if (!mount) return;
    const here = document.documentElement.getAttribute("data-tool");
    let html = '<a href="' + prefix() + 'index.html" class="menu-link">' +
      iconSvg("M3 10.5L12 3l9 7.5V21h-6v-6H9v6H3z", 16) + "<span>" + esc(t("nav_home", "Home")) + "</span></a>";
    CATEGORIES.forEach(function (c) {
      const items = TOOLS.filter(function (x) { return x.cat === c.id; });
      if (!items.length) return;
      html += '<div class="menu-group">' + esc(currentLang() === "ar" ? c.ar : c.en) + "</div>";
      items.forEach(function (x) {
        html += '<a href="' + prefix() + x.href + '" class="menu-link' + (x.id === here ? " is-here" : "") +
          '" data-hue="' + hueOf(x) + '">' + iconSvg(x.icon, 16) + "<span>" + esc(L(x, "name")) + "</span></a>";
      });
    });
    mount.innerHTML = html;
  }
  // Pages in sub-folders (DualShock) set data-root="../" on <html>.
  function prefix() { return document.documentElement.getAttribute("data-root") || ""; }

  // ---- Breadcrumb on tool pages --------------------------------------------
  function renderCrumbs() {
    const mount = document.querySelector("[data-crumbs]");
    if (!mount) return;
    const id = document.documentElement.getAttribute("data-tool");
    const tool = TOOLS.find(function (x) { return x.id === id; });
    if (!tool) return;
    mount.innerHTML = '<a href="index.html">' + esc(t("crumb_home", "Home")) + '</a><span aria-hidden="true">/</span>' +
      '<a href="index.html#' + tool.cat + '">' + esc(catName(tool.cat)) + '</a><span aria-hidden="true">/</span>' +
      '<span aria-current="page">' + esc(L(tool, "name")) + "</span>";
  }

  // ---- Home page -------------------------------------------------------
  let homeQuery = "";
  let homeCat = "";
  function cardHtml(x) {
    return '<a class="tcard" href="' + x.href + '" data-hue="' + hueOf(x) + '">' +
      '<span class="tcard__icon">' + iconSvg(x.icon, 24) + "</span>" +
      '<span class="tcard__body">' +
        '<span class="tcard__title">' + esc(L(x, "title")) +
          (x.isNew ? ' <span class="pill pill--new">' + esc(t("home_new", "New")) + "</span>" : "") + "</span>" +
        '<span class="tcard__desc">' + esc(L(x, "desc")) + "</span>" +
      "</span>" +
      '<span class="tcard__go" aria-hidden="true">' + iconSvg("M5 12h14m-5-5l5 5-5 5", 18) + "</span>" +
    "</a>";
  }
  function renderHome() {
    const mount = document.querySelector("[data-home]");
    if (!mount) return;
    const chips = document.querySelector("[data-home-chips]");
    if (chips) {
      chips.innerHTML = '<button type="button" class="chip' + (homeCat ? "" : " is-on") + '" data-cat="">' +
        esc(t("home_all", "All")) + ' <span class="chip__n">' + TOOLS.length + "</span></button>" +
        CATEGORIES.map(function (c) {
          const n = TOOLS.filter(function (x) { return x.cat === c.id; }).length;
          return '<button type="button" class="chip' + (homeCat === c.id ? " is-on" : "") + '" data-cat="' + c.id +
            '" data-hue="' + c.hue + '">' + esc(currentLang() === "ar" ? c.ar : c.en) + ' <span class="chip__n">' + n + "</span></button>";
        }).join("");
    }
    const list = TOOLS.filter(function (x) { return (!homeCat || x.cat === homeCat) && matches(x, homeQuery); });
    let html = "";
    if (homeQuery) {
      list.sort(function (a, b) { return score(b, homeQuery) - score(a, homeQuery); });
      html = list.length ? '<div class="tgrid">' + list.map(cardHtml).join("") + "</div>" :
        '<p class="empty">' + esc(t("home_none", "No tool matches your search.")) + "</p>";
    } else {
      const rec = recent().map(function (id) { return TOOLS.find(function (x) { return x.id === id; }); }).filter(Boolean);
      if (!homeCat && rec.length) {
        html += '<section class="tsection tsection--recent"><h2 class="tsection__title">' + esc(t("home_recent", "Recently used")) + "</h2>" +
          '<div class="recent-row">' + rec.map(function (x) {
            return '<a class="recent" href="' + x.href + '" data-hue="' + hueOf(x) + '">' + iconSvg(x.icon, 18) + "<span>" + esc(L(x, "name")) + "</span></a>";
          }).join("") + "</div></section>";
      }
      CATEGORIES.forEach(function (c) {
        if (homeCat && homeCat !== c.id) return;
        const items = list.filter(function (x) { return x.cat === c.id; });
        if (!items.length) return;
        html += '<section class="tsection" id="' + c.id + '"><h2 class="tsection__title" data-hue="' + c.hue + '">' +
          esc(currentLang() === "ar" ? c.ar : c.en) + "</h2>" + '<div class="tgrid">' + items.map(cardHtml).join("") + "</div></section>";
      });
    }
    mount.innerHTML = html;
    const count = document.querySelector("[data-home-count]");
    if (count) count.textContent = t("home_count", "{n} tools", { n: TOOLS.length });
  }
  function wireHome() {
    const input = document.querySelector("[data-home-search]");
    const chips = document.querySelector("[data-home-chips]");
    if (!input && !chips) return;
    if (location.hash && CATEGORIES.some(function (c) { return "#" + c.id === location.hash; })) homeCat = location.hash.slice(1);
    if (input) {
      input.addEventListener("input", function () { homeQuery = input.value.trim(); renderHome(); });
      input.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          const first = document.querySelector("[data-home] .tcard");
          if (first) first.click();
        } else if (e.key === "Escape") { input.value = ""; homeQuery = ""; renderHome(); }
      });
    }
    if (chips) chips.addEventListener("click", function (e) {
      const b = e.target.closest("[data-cat]");
      if (!b) return;
      homeCat = b.getAttribute("data-cat");
      history.replaceState(null, "", homeCat ? "#" + homeCat : location.pathname);
      renderHome();
    });
  }

  // ---- Quick search palette (Ctrl/⌘ K, or "/") --------------------------------
  let palette = null;
  function buildPalette() {
    const wrap = document.createElement("div");
    wrap.className = "palette";
    wrap.hidden = true;
    wrap.innerHTML =
      '<div class="palette__backdrop" data-close></div>' +
      '<div class="palette__box" role="dialog" aria-modal="true" aria-label="Search tools">' +
        '<div class="palette__field">' + iconSvg("M11 4a7 7 0 100 14 7 7 0 000-14zm9 16l-4.3-4.3", 18) +
          '<input type="search" class="palette__input" autocomplete="off" spellcheck="false">' +
          '<kbd class="kbd">Esc</kbd></div>' +
        '<div class="palette__list" role="listbox"></div>' +
        '<div class="palette__foot"></div>' +
      "</div>";
    document.body.appendChild(wrap);
    const input = wrap.querySelector(".palette__input");
    const list = wrap.querySelector(".palette__list");
    let sel = 0, items = [];
    function draw() {
      const q = input.value.trim();
      items = TOOLS.filter(function (x) { return matches(x, q); });
      if (q) items.sort(function (a, b) { return score(b, q) - score(a, q); });
      if (sel >= items.length) sel = Math.max(0, items.length - 1);
      list.innerHTML = items.length ? items.map(function (x, i) {
        return '<a class="palette__item' + (i === sel ? " is-sel" : "") + '" role="option" href="' + prefix() + x.href +
          '" data-hue="' + hueOf(x) + '"><span class="palette__icon">' + iconSvg(x.icon, 18) + "</span>" +
          '<span class="palette__text"><b>' + esc(L(x, "title")) + "</b><small>" + esc(catName(x.cat)) + "</small></span></a>";
      }).join("") : '<p class="palette__empty">' + esc(t("palette_empty", "No matching tool.")) + "</p>";
      const cur = list.querySelector(".is-sel");
      if (cur) cur.scrollIntoView({ block: "nearest" });
    }
    input.addEventListener("input", function () { sel = 0; draw(); });
    input.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown") { sel = Math.min(items.length - 1, sel + 1); draw(); e.preventDefault(); }
      else if (e.key === "ArrowUp") { sel = Math.max(0, sel - 1); draw(); e.preventDefault(); }
      else if (e.key === "Enter" && items[sel]) { location.href = prefix() + items[sel].href; }
      else if (e.key === "Escape") { close(); }
    });
    wrap.addEventListener("click", function (e) { if (e.target.hasAttribute("data-close")) close(); });
    function open() {
      input.placeholder = t("palette_ph", "Search tools…");
      wrap.querySelector(".palette__foot").textContent = t("palette_hint", "↑↓ to move • Enter to open • Esc to close");
      wrap.hidden = false;
      document.documentElement.classList.add("no-scroll");
      input.value = ""; sel = 0; draw();
      setTimeout(function () { input.focus(); }, 0);
    }
    function close() {
      wrap.hidden = true;
      document.documentElement.classList.remove("no-scroll");
    }
    return { open: open, close: close, el: wrap };
  }
  function openPalette() {
    if (!palette) palette = buildPalette();
    palette.open();
  }
  function isTyping(el) {
    return el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable);
  }
  document.addEventListener("keydown", function (e) {
    if ((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "K")) { e.preventDefault(); openPalette(); }
    else if (e.key === "/" && !isTyping(document.activeElement)) {
      const homeSearch = document.querySelector("[data-home-search]");
      e.preventDefault();
      if (homeSearch) homeSearch.focus(); else openPalette();
    }
  });

  // ---- Shared header (base.html) ----------------------------------------
  function loadSharedHeader() {
    const mount = document.querySelector("header[data-shared-header]");
    if (!mount) return Promise.resolve();
    return fetch(prefix() + "base.html")
      .then(function (r) { if (!r.ok) throw new Error("base.html " + r.status); return r.text(); })
      .then(function (html) {
        mount.innerHTML = html;
        if (prefix()) {
          mount.querySelectorAll("[href]").forEach(function (a) {
            const h = a.getAttribute("href");
            if (!/^(https?:|#|\/)/.test(h)) a.setAttribute("href", prefix() + h);
          });
          mount.querySelectorAll("img[src]").forEach(function (im) { im.setAttribute("src", prefix() + im.getAttribute("src")); });
        }
        const brand = mount.getAttribute("data-brand");
        if (brand) {
          const b = mount.querySelector(".brand-text");
          if (b) b.textContent = brand;
        }
      })
      .catch(function () { /* keep whatever is in the page as fallback */ });
  }
  function wireMenu() {
    const btn = document.getElementById("menuBtn");
    const dd = document.getElementById("menuDropdown");
    if (btn && dd) {
      const close = function () { dd.hidden = true; btn.setAttribute("aria-expanded", "false"); };
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        dd.hidden = !dd.hidden;
        btn.setAttribute("aria-expanded", String(!dd.hidden));
      });
      document.addEventListener("click", function (e) {
        if (!dd.hidden && !dd.contains(e.target) && e.target !== btn) close();
      });
      document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
    }
    const search = document.getElementById("paletteBtn");
    if (search) {
      const kbd = search.querySelector("kbd");
      if (kbd && /Mac|iPhone|iPad/.test(navigator.platform || "")) kbd.textContent = "⌘K";
      search.addEventListener("click", openPalette);
    }
  }

  function init() {
    loadSharedHeader().then(function () {
      wireThemeToggle();
      wireLangToggle();
      wireMenu();
      wireHome();
      markVisited(document.documentElement.getAttribute("data-tool"));
      const lang = currentLang();
      if (lang === "ar") applyLang("ar");
      else { renderToolLinks(); renderHome(); renderCrumbs(); }
      document.documentElement.classList.add("is-ready");
      document.dispatchEvent(new CustomEvent("toolmeup:headerready"));
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  // ---- Public API --------------------------------------------------------
  window.ToolMeUp = {
    tools: TOOLS,
    categories: CATEGORIES,
    lang: currentLang,
    isRtl: function () { return currentLang() === "ar"; },
    hintText: function (key) { return currentLang() === "ar" && AR[key] ? AR[key] : null; },
    t: t,
    esc: esc,
    icon: iconSvg,
    // Register a page's Arabic strings (and optional English defaults).
    addStrings: function (ar, en) {
      Object.keys(ar || {}).forEach(function (k) { AR[k] = ar[k]; });
      Object.keys(en || {}).forEach(function (k) { EXTRA_EN[k] = en[k]; });
    },
    // Re-translate a freshly rendered DOM subtree.
    translate: function (root) { translateTree(root || document, currentLang()); },
    openSearch: openPalette
  };
})();
