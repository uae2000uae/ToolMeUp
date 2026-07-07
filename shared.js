/*
  ToolMeUp • shared site chrome
  - Single source of truth for the tool list (TOOLS manifest)
  - Renders the header nav on every page and the tool cards on the hub
  - Persists the light/dark theme across pages via localStorage
  Add a new tool by appending one entry to TOOLS below — the nav and hub
  cards update automatically, no other file needs editing.
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

  // ---- Header nav ------------------------------------------------------
  function renderNav() {
    const mount = document.querySelector("[data-nav]");
    if (!mount) return;
    const activeId = mount.getAttribute("data-active") || "";
    const links = TOOLS
      .filter(function (t) { return t.id !== activeId; })
      .map(function (t) {
        return '<a href="' + t.href + '" title="Open ' + t.title + '">' + t.name + "</a>";
      })
      .join("");
    // Home link when not already on the hub
    const home = activeId === "home"
      ? ""
      : '<a href="index.html" title="All tools">Home</a>';
    mount.insertAdjacentHTML("afterbegin", home + links);
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

  function init() {
    wireThemeToggle();
    renderNav();
    renderCards();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Expose for any page that wants the list
  window.ToolMeUp = { tools: TOOLS };
})();
