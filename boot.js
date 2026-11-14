/*
  ToolMeUp • boot (load synchronously in <head>, before any stylesheet paints)
  Applies the saved theme and the saved language + text direction (Arabic
  is always RTL, even on partly translated pages), so the
  page never flashes light-then-dark or LTR-then-RTL.
*/
(function () {
  "use strict";
  var root = document.documentElement;
  var theme = null, lang = null;
  try {
    theme = localStorage.getItem("toolmeup:theme");
    lang = localStorage.getItem("toolmeup:lang");
  } catch (_) { /* storage blocked: keep defaults */ }
  if (!theme && window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches) theme = "dark";
  root.setAttribute("data-theme", theme === "dark" ? "dark" : "light");
  // Arabic always flips the page to RTL, including partly translated pages.
  if (lang === "ar") {
    root.setAttribute("lang", "ar");
    root.setAttribute("dir", "rtl");
  }
})();
