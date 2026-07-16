/*
  ToolMeUp • shared site chrome
  - Single source of truth for the tool list (TOOLS manifest)
  - Renders the tool cards on the hub
  - Persists the light/dark theme across pages via localStorage
  Header nav links are plain HTML in each page. Add a new tool by
  appending one entry to TOOLS below and adding a nav link to each page.
*/
(function () {
  "use strict";

  // ---- Tool manifest ---------------------------------------------------
  // id:       unique key (also used to mark the active nav link)
  // name:     short label shown in nav
  // title:    full title shown on the hub card
  // href:     page to open
  // desc:     one-line description for the hub card
  // icon:     inline SVG path data (24x24 viewBox) for the card glyph
  // external: true if it is a self-contained sub-app (opens in same tab)
  const TOOLS = [
    {
      id: "fitment",
      name: "Fitment",
      title: "Wheel & Tire Fitment Calculator",
      href: "fitment.html",
      desc: "Compare wheel/tire setups against a baseline: diameter, offset, spacers, clearances, speedo error and more.",
      icon: "M12 3a9 9 0 100 18 9 9 0 000-18zm0 4a5 5 0 110 10 5 5 0 010-10zm0 3a2 2 0 100 4 2 2 0 000-4z"
    },
    {
      id: "wget",
      name: "Wget",
      title: "Wget Downloader",
      href: "wget.html",
      desc: "Fetch a URL with custom method, headers and body, or mirror a same-origin static site to a ZIP — right from the browser.",
      icon: "M12 3v10m0 0l-4-4m4 4l4-4M5 17v2a2 2 0 002 2h10a2 2 0 002-2v-2"
    },
    {
      id: "dualshock",
      name: "DualShock-Tool",
      title: "DualShock / DualSense Calibration",
      href: "Dualshock-tool/index.html",
      desc: "Calibrate and fine-tune PlayStation controller sticks over WebHID — deadzones, ranges and center calibration.",
      icon: "M6 10h4M8 8v4m6-1h.01M17 10h.01M7 6h10a4 4 0 014 4l1 6a2.5 2.5 0 01-4.6 1.4L15 14H9l-2.4 3.4A2.5 2.5 0 012 16l1-6a4 4 0 014-4z",
      external: true
    }
  ];

  const THEME_KEY = "toolmeup:theme";
  const LANG_KEY = "toolmeup:lang";

  // ---- Hint translations (Arabic) --------------------------------------
  // Only elements marked with data-i18n are translated; layout and page
  // direction are untouched — hints get dir="rtl" for correct Arabic flow.
  const AR = {
    hint_offset: "المسافة (مم) من سطح تثبيت الجنط إلى خط منتصفه: الرقم الأعلى يُدخل الجنط أكثر إلى الداخل، والرقم الأقل أو السالب يدفعه إلى الخارج.",
    hint_spacer: "صفيحة (مم) تُركّب بين الصرة والجنط لتدفع الجنط بالكامل إلى الخارج. اتركه فارغاً إذا لم يكن هناك فاصل (سبيسر) مركّباً.",
    hint_tire_size: "الرقم الأول هو عرض الإطار (مم)؛ والثاني هو ارتفاع الجدار الجانبي كنسبة (%) من ذلك العرض. رقم R يؤخذ من قطر الجنط لديك.",
    hint_correction: "بعض أنواع الإطارات تكون أعرض من المذكور، وهذا يساعدنا على التأكد من أن إطارك لا يلامس أي شيء. اتركه 0 إذا كنت لا تعرف قيمته.",
    hint_bulge: "انتفاخ الجدار الجانبي خارج حافة الجنط، كما هو موضح في الرسم. النسبة المعتادة 5%.",
    hint_arch_clearance: "الفجوة (مم) بين أعلى الإطار الحالي وقوس العجلة / بطانة الرفرف. الإطارات الأطول تقلل هذه الفجوة؛ نستخدمها لتحذيرك قبل أن يحتك الإطار.",
    hint_clearance: "هذا مفيد لمعرفة مقدار المساحة المتوفرة خلف الجنط لاستخدام جنوط أعرض، وللتأكد من أن الإطارات لا تلامس الجهة الداخلية للجنط أو الرفرف الخارجي. إدخال هذه القيم مع تحديد الحدود الدنيا يساعدنا على تحذيرك عندما تكون قريباً جداً أو أكثر.",
    hint_speedo_intro: "معظم تركيبات المصنع تجعل عداد السرعة يعطي قراءة أعلى من سرعة GPS أو الرادار. تساعدك هذه الحاسبة على معرفة القراءة المتوقعة باستخدام التركيب الجديد.",
    hint_speedo_asper: "بحسب إعداداتك، ",
    hint_thresholds: "هذه حدود التحذير. سنحسب الخلوص بناءً على إعداداتك الحالية المُدخلة وسنحذّرك عند تجاوز الحدود. لن يتم إيقاف الحساب.",
    hint_scrub: "معاملات هندسية إضافية يمكنك إدخالها عند حساب تركيب الإطارات/الجنوط أو هندسة نظام التعليق، وتساعدك على حساب نصف قطر الاحتكاك (scrub radius) بدقة أعلى بدلاً من الاعتماد على قيم المصنع العامة.",
    hint_sessions: "انقر على اسم الجلسة لتحميلها."
  };

  // ---- Theme -----------------------------------------------------------
  function storedTheme() {
    try { return localStorage.getItem(THEME_KEY); } catch (_) { return null; }
  }
  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme === "dark" ? "dark" : "light");
  }
  function saveTheme(theme) {
    try { localStorage.setItem(THEME_KEY, theme); } catch (_) { /* ignore */ }
  }

  // Apply persisted theme as early as possible to avoid a flash.
  const initial = storedTheme();
  if (initial) applyTheme(initial);

  function wireThemeToggle() {
    const toggle = document.getElementById("themeToggle");
    if (!toggle) return;
    const current = document.documentElement.getAttribute("data-theme") || "light";
    toggle.checked = current === "dark";
    toggle.addEventListener("change", function () {
      const theme = toggle.checked ? "dark" : "light";
      applyTheme(theme);
      saveTheme(theme);
    });
  }

  // ---- Language (hints only) --------------------------------------------
  function storedLang() {
    try { return localStorage.getItem(LANG_KEY); } catch (_) { return null; }
  }
  function saveLang(lang) {
    try { localStorage.setItem(LANG_KEY, lang); } catch (_) { /* ignore */ }
  }
  function currentLang() {
    return storedLang() === "ar" ? "ar" : "en";
  }
  function applyLang(lang) {
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      const key = el.getAttribute("data-i18n");
      // Remember the original English text the first time we touch the node.
      if (el.dataset.en === undefined) el.dataset.en = el.textContent;
      if (lang === "ar" && AR[key]) {
        el.textContent = AR[key];
        el.setAttribute("dir", "rtl");
      } else {
        el.textContent = el.dataset.en;
        el.removeAttribute("dir");
      }
    });
    // Let pages refresh any dynamically generated hints (e.g. speedo hint).
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

  // ---- Hub cards -------------------------------------------------------
  function renderCards() {
    const mount = document.querySelector("[data-tool-cards]");
    if (!mount) return;
    mount.innerHTML = TOOLS.map(function (t) {
      return (
        '<a class="tool-card" href="' + t.href + '">' +
          '<span class="tool-card__icon" aria-hidden="true">' +
            '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" ' +
            'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
            '<path d="' + t.icon + '"/></svg>' +
          "</span>" +
          '<span class="tool-card__body">' +
            '<span class="tool-card__title">' + t.title + "</span>" +
            '<span class="tool-card__desc">' + t.desc + "</span>" +
          "</span>" +
          '<span class="tool-card__go" aria-hidden="true">&rarr;</span>' +
        "</a>"
      );
    }).join("");
  }

  // ---- Shared header (base.html) ----------------------------------------
  // Pages carry an empty <header class="app-header" data-shared-header
  // data-brand="..."> and the nav markup lives once in base.html.
  function loadSharedHeader() {
    const mount = document.querySelector("header[data-shared-header]");
    if (!mount) return Promise.resolve();
    return fetch("base.html")
      .then(function (r) { if (!r.ok) throw new Error("base.html " + r.status); return r.text(); })
      .then(function (html) {
        mount.innerHTML = html;
        const brand = mount.getAttribute("data-brand");
        if (brand) {
          const b = mount.querySelector(".brand");
          if (b) b.textContent = brand;
        }
      })
      .catch(function () { /* keep whatever is in the page as fallback */ });
  }

  // ---- Header kebab menu -------------------------------------------------
  function wireMenu() {
    const btn = document.getElementById("menuBtn");
    const dd = document.getElementById("menuDropdown");
    if (!btn || !dd) return;
    function close() { dd.hidden = true; btn.setAttribute("aria-expanded", "false"); }
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      dd.hidden = !dd.hidden;
      btn.setAttribute("aria-expanded", String(!dd.hidden));
    });
    document.addEventListener("click", function (e) {
      if (!dd.hidden && !dd.contains(e.target) && e.target !== btn) close();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") close();
    });
  }

  function init() {
    loadSharedHeader().then(function () {
      wireThemeToggle();
      wireLangToggle();
      wireMenu();
      renderCards();
      if (currentLang() === "ar") applyLang("ar");
      // Let page scripts know the injected header is ready to wire up.
      document.dispatchEvent(new CustomEvent("toolmeup:headerready"));
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Expose for any page that wants the list or current hint language
  window.ToolMeUp = { tools: TOOLS, lang: currentLang, hintText: function (key) {
    return currentLang() === "ar" && AR[key] ? AR[key] : null;
  } };
})();
