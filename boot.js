/*
  ToolMeUp • boot (load synchronously in <head>, before any stylesheet paints)
  Applies the saved theme and, on fully translated pages
  (<html data-i18n="full">), the saved language + text direction, so the
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
  if (root.getAttribute("data-i18n") === "full" && lang === "ar") {
    root.setAttribute("lang", "ar");
    root.setAttribute("dir", "rtl");
  }
})();
