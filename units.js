/*
  ToolMeUp • Unit Converter
  Linear units are stored as a factor to the category's base unit;
  temperature uses to/from functions. Fuel economy lives in fuel.html.
*/
(function () {
  "use strict";
  const TM = window.ToolMeUp, K = window.Kit, t = TM.t, $ = (id) => document.getElementById(id);

  TM.addStrings({
    u_title: "محوّل الوحدات",
    u_lead: "اكتب القيمة مرة واحدة وشاهدها بكل الوحدات. اضغط على أي نتيجة لنسخها، أو على اسم الوحدة للتحويل منها.",
    u_value: "القيمة", u_result: "النتيجة", u_swap: "تبديل الوحدات",
    u_bad: "أدخل رقماً صحيحاً",
    u_formula_lin: "1 {a} = {f} {b}",
    u_how1: "اختر الفئة: الطول، الوزن، الحرارة، السرعة، الحجم، المساحة، الضغط، البيانات، القدرة أو عزم الدوران. لاستهلاك الوقود والكهرباء (لتر/100 كم، ميل/غالون، كيلوواط ساعة/100 كم) اضغط على مربّع «<a href=\"fuel.html\">الوقود والطاقة</a>».",
    u_fuel_link: "الوقود والطاقة",
    u_how2: "اكتب القيمة واختر وحدتها. تتحدّث النتيجة الرئيسية والقائمة الكاملة أثناء الكتابة. يمكنك أيضاً كتابة عمليات بسيطة مثل <code>5*12</code> أو <code>3/4</code>.",
    u_how3: "اضغط على أي قيمة في القائمة لنسخها، أو على اسم الوحدة لتصبح هي وحدة الإدخال.",
    u_faq1_q: "لماذا يختلف الغالون الأمريكي عن البريطاني؟",
    u_faq1_a: "الغالون الأمريكي يساوي 3.785 لتر، بينما الغالون الإمبراطوري (البريطاني) يساوي 4.546 لتر، وكلاهما مدرج ضمن الحجم. ولهذا يختلف الميل لكل غالون بينهما — حوّله في <a href=\"fuel.html\">محوّل الوقود والطاقة</a>.",
    u_faq2_q: "ما الفرق بين MB و MiB؟",
    u_faq2_a: "الميغابايت (MB) يعتمد على مضاعفات 1000 (1 MB = 1,000,000 بايت) كما تحسبها شركات الأقراص. أما MiB فيعتمد على 1024 (1 MiB = 1,048,576 بايت) كما تعرضها كثير من أنظمة التشغيل.",
    cat_length: "الطول", cat_mass: "الوزن", cat_temp: "الحرارة", cat_speed: "السرعة", cat_volume: "الحجم", cat_area: "المساحة",
    cat_pressure: "الضغط", cat_data: "البيانات", cat_power: "القدرة", cat_torque: "العزم"
  });

  // [id, English name, Arabic name, factor-to-base | {to, from}]
  const CATS = [
    { id: "length", en: "Length", icon: "M3 17l14-14 4 4L7 21zM7 13l2 2M10 10l2 2M13 7l2 2", def: ["m", "ft"], units: [
      ["mm", "Millimetre", "مليمتر", 0.001], ["cm", "Centimetre", "سنتيمتر", 0.01], ["m", "Metre", "متر", 1], ["km", "Kilometre", "كيلومتر", 1000],
      ["in", "Inch", "بوصة", 0.0254], ["ft", "Foot", "قدم", 0.3048], ["yd", "Yard", "ياردة", 0.9144], ["mi", "Mile", "ميل", 1609.344],
      ["nmi", "Nautical mile", "ميل بحري", 1852], ["µm", "Micrometre", "ميكرومتر", 1e-6]] },
    { id: "mass", en: "Weight", icon: "M6 8h12l2 12H4zM9 8a3 3 0 016 0", def: ["kg", "lb"], units: [
      ["mg", "Milligram", "مليغرام", 1e-6], ["g", "Gram", "غرام", 0.001], ["kg", "Kilogram", "كيلوغرام", 1], ["t", "Tonne", "طن", 1000],
      ["oz", "Ounce", "أونصة", 0.028349523125], ["lb", "Pound", "رطل", 0.45359237], ["st", "Stone", "ستون", 6.35029318],
      ["ton", "US ton", "طن أمريكي", 907.18474], ["ct", "Carat", "قيراط", 0.0002], ["tola", "Tola", "تولة", 0.0116638038]] },
    { id: "temp", en: "Temperature", icon: "M10 14V5a2 2 0 114 0v9a4 4 0 11-4 0z", def: ["C", "F"], units: [
      ["C", "Celsius", "مئوية", { to: (v) => v, from: (v) => v }, "°C"],
      ["F", "Fahrenheit", "فهرنهايت", { to: (v) => (v - 32) * 5 / 9, from: (v) => v * 9 / 5 + 32 }, "°F"],
      ["K", "Kelvin", "كلفن", { to: (v) => v - 273.15, from: (v) => v + 273.15 }, "K"]] },
    { id: "speed", en: "Speed", icon: "M12 14l4-4M4 18a9 9 0 1116 0", def: ["kmh", "mph"], units: [
      ["kmh", "Kilometres per hour", "كيلومتر/ساعة", 1 / 3.6, "km/h"], ["mph", "Miles per hour", "ميل/ساعة", 0.44704, "mph"],
      ["ms", "Metres per second", "متر/ثانية", 1, "m/s"], ["kn", "Knot", "عقدة", 1852 / 3600, "kn"], ["fts", "Feet per second", "قدم/ثانية", 0.3048, "ft/s"],
      ["mach", "Mach (sea level)", "ماخ (مستوى البحر)", 340.29, "Mach"]] },
    { id: "volume", en: "Volume", icon: "M8 3h8M9 3v4l-4 6v6a2 2 0 002 2h10a2 2 0 002-2v-6l-4-6V3", def: ["L", "galus"], units: [
      ["mL", "Millilitre", "مليلتر", 0.001], ["L", "Litre", "لتر", 1], ["m3", "Cubic metre", "متر مكعب", 1000, "m³"],
      ["tsp", "Teaspoon (US)", "ملعقة صغيرة", 0.00492892159375], ["tbsp", "Tablespoon (US)", "ملعقة كبيرة", 0.01478676478125],
      ["floz", "Fluid ounce (US)", "أونصة سائلة", 0.0295735295625, "fl oz"], ["cup", "Cup (US)", "كوب", 0.2365882365],
      ["pt", "Pint (US)", "باينت", 0.473176473], ["qt", "Quart (US)", "كوارت", 0.946352946],
      ["galus", "Gallon (US)", "غالون أمريكي", 3.785411784, "gal (US)"], ["galuk", "Gallon (UK)", "غالون بريطاني", 4.54609, "gal (UK)"],
      ["ft3", "Cubic foot", "قدم مكعب", 28.316846592, "ft³"], ["in3", "Cubic inch", "بوصة مكعبة", 0.016387064, "in³"],
      ["bbl", "Barrel (oil)", "برميل نفط", 158.987294928]] },
    { id: "area", en: "Area", icon: "M4 4h16v16H4zM4 12h16M12 4v16", def: ["m2", "ft2"], units: [
      ["mm2", "Square millimetre", "مليمتر مربع", 1e-6, "mm²"], ["cm2", "Square centimetre", "سنتيمتر مربع", 1e-4, "cm²"],
      ["m2", "Square metre", "متر مربع", 1, "m²"], ["km2", "Square kilometre", "كيلومتر مربع", 1e6, "km²"], ["ha", "Hectare", "هكتار", 1e4],
      ["in2", "Square inch", "بوصة مربعة", 0.00064516, "in²"], ["ft2", "Square foot", "قدم مربع", 0.09290304, "ft²"],
      ["yd2", "Square yard", "ياردة مربعة", 0.83612736, "yd²"], ["ac", "Acre", "فدان (إيكر)", 4046.8564224], ["mi2", "Square mile", "ميل مربع", 2589988.110336, "mi²"]] },
    { id: "pressure", en: "Pressure", icon: "M12 3a9 9 0 100 18 9 9 0 000-18zM12 12l4-3", def: ["psi", "bar"], units: [
      ["psi", "PSI", "رطل/بوصة²", 6894.757293168], ["bar", "Bar", "بار", 1e5], ["kPa", "Kilopascal", "كيلوباسكال", 1000],
      ["Pa", "Pascal", "باسكال", 1], ["MPa", "Megapascal", "ميغاباسكال", 1e6], ["atm", "Atmosphere", "ضغط جوي", 101325],
      ["mmHg", "mmHg", "مم زئبق", 133.322387415], ["inHg", "inHg", "بوصة زئبق", 3386.389], ["kgcm2", "kgf/cm²", "كغ/سم²", 98066.5, "kgf/cm²"]] },
    { id: "data", en: "Data", icon: "M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3zm0 0v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3", def: ["GB", "GiB"], units: [
      ["bit", "Bit", "بت", 0.125], ["B", "Byte", "بايت", 1], ["KB", "Kilobyte", "كيلوبايت", 1e3], ["MB", "Megabyte", "ميغابايت", 1e6],
      ["GB", "Gigabyte", "غيغابايت", 1e9], ["TB", "Terabyte", "تيرابايت", 1e12], ["KiB", "Kibibyte", "كيبيبايت", 1024],
      ["MiB", "Mebibyte", "ميبيبايت", 1048576], ["GiB", "Gibibyte", "جيبيبايت", 1073741824], ["TiB", "Tebibyte", "تيبيبايت", 1099511627776],
      ["Mbit", "Megabit", "ميغابت", 125000]] },
    { id: "power", en: "Power", icon: "M13 3L5 14h6l-1 7 8-11h-6z", def: ["hp", "kW"], units: [
      ["W", "Watt", "واط", 1], ["kW", "Kilowatt", "كيلوواط", 1000], ["hp", "Horsepower (mech.)", "حصان ميكانيكي", 745.69987158227, "hp"],
      ["PS", "Metric horsepower (PS)", "حصان متري", 735.49875, "PS"], ["BTUh", "BTU per hour", "وحدة حرارية/ساعة", 0.29307107, "BTU/h"]] },
    { id: "torque", en: "Torque", icon: "M12 4a8 8 0 108 8M20 4v4h-4", def: ["Nm", "lbft"], units: [
      ["Nm", "Newton-metre", "نيوتن·متر", 1, "N·m"], ["lbft", "Pound-foot", "رطل·قدم", 1.3558179483314, "lb·ft"],
      ["lbin", "Pound-inch", "رطل·بوصة", 0.1129848290276, "lb·in"], ["kgfm", "Kilogram-force metre", "كغ·متر", 9.80665, "kgf·m"]] }
  ];
  const sym = (u) => u[4] || u[0];
  const uname = (u) => (TM.lang() === "ar" ? u[2] : u[1]);
  const catLabel = (c) => t("cat_" + c.id, c.en);
  const toBase = (u, v) => (typeof u[3] === "number" ? v * u[3] : u[3].to(v));
  const fromBase = (u, b) => (typeof u[3] === "number" ? b / u[3] : u[3].from(b));

  const parseValue = K.parse;

  let cat = CATS[0], fromId, toId;
  const state = K.load("units:state", {});

  function drawCats() {
    $("u_cats").innerHTML = CATS.map((c) =>
      '<button type="button" role="tab" data-cat="' + c.id + '" aria-selected="' + (c === cat) + '">' + TM.icon(c.icon, 18) +
      "<span>" + TM.esc(catLabel(c)) + "</span></button>").join("") +
      // Fuel economy & EV energy units have their own tool (Automotive)
      '<a class="ulink" href="fuel.html">' + TM.icon("M4 21V5a2 2 0 012-2h6a2 2 0 012 2v16M3 21h12M14 9h2a2 2 0 012 2v5a1.5 1.5 0 003 0V8l-3-3M9.5 7L7.5 11h3l-2 4", 18) +
      "<span>" + TM.esc(t("u_fuel_link", "Fuel & energy")) + '</span><svg class="ulink__go" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17L17 7M8 7h9v9"/></svg></a>';
  }
  function fillSelects() {
    const opts = cat.units.map((u) => '<option value="' + u[0] + '">' + TM.esc(uname(u)) + " (" + TM.esc(sym(u)) + ")</option>").join("");
    $("u_from").innerHTML = opts; $("u_to").innerHTML = opts;
    $("u_from").value = fromId; $("u_to").value = toId;
  }
  function setCat(id, keepUnits) {
    cat = CATS.find((c) => c.id === id) || CATS[0];
    const saved = state[cat.id] || {};
    if (!keepUnits) {
      fromId = saved.from || cat.def[0];
      toId = saved.to || cat.def[1];
      if (saved.value !== undefined) $("u_value").value = saved.value;
    }
    drawCats(); fillSelects(); calc();
    history.replaceState(null, "", "#" + cat.id);
    K.save("units:cat", cat.id);
  }
  function calc() {
    const raw = $("u_value").value;
    const v = parseValue(raw);
    const from = cat.units.find((u) => u[0] === fromId), to = cat.units.find((u) => u[0] === toId);
    state[cat.id] = { from: fromId, to: toId, value: raw };
    K.save("units:state", state);
    const valid = Number.isFinite(v);
    $("u_value").classList.toggle("is-bad", raw.trim() !== "" && !valid);
    if (!valid) {
      $("u_out").textContent = "—"; $("u_formula").textContent = raw.trim() ? t("u_bad", "Enter a valid number") : "";
      $("u_all").innerHTML = ""; return;
    }
    const base = toBase(from, v);
    $("u_out").textContent = K.smart(fromBase(to, base));
    if (typeof from[3] === "number" && typeof to[3] === "number" && from !== to) {
      $("u_formula").textContent = t("u_formula_lin", "1 {a} = {f} {b}", { a: sym(from), f: K.smart(from[3] / to[3]), b: sym(to) });
    } else $("u_formula").textContent = "";
    $("u_all").innerHTML = cat.units.map((u) => {
      const val = K.smart(fromBase(u, base));
      return '<div class="ucell' + (u[0] === fromId ? " is-from" : "") + (u[0] === toId ? " is-to" : "") + '">' +
        '<button type="button" class="ucell__name" data-from="' + u[0] + '">' + TM.esc(uname(u)) + "</button>" +
        '<button type="button" class="ucell__val" data-copy-text="' + val.replace(/,/g, "") + '" dir="ltr">' + val +
        ' <small>' + TM.esc(sym(u)) + "</small></button></div>";
    }).join("");
  }

  // Old links to the removed fuel-economy category go to the dedicated tool.
  if (location.hash === "#fuel") { location.replace("fuel.html"); return; }

  K.ready(() => {
    const hash = location.hash.slice(1);
    $("u_cats").addEventListener("click", (e) => {
      const b = e.target.closest("[data-cat]");
      if (b) setCat(b.dataset.cat);
    });
    $("u_value").addEventListener("input", calc);
    $("u_from").addEventListener("change", () => { fromId = $("u_from").value; calc(); });
    $("u_to").addEventListener("change", () => { toId = $("u_to").value; calc(); });
    $("u_swap").addEventListener("click", () => {
      const out = $("u_out").textContent;
      [fromId, toId] = [toId, fromId];
      if (out !== "—") $("u_value").value = out.replace(/,/g, "");
      fillSelects(); calc();
    });
    $("u_out").addEventListener("click", () => { const v = $("u_out").textContent; if (v !== "—") K.copy(v.replace(/,/g, "")); });
    $("u_all").addEventListener("click", (e) => {
      const b = e.target.closest("[data-from]");
      if (!b) return;
      const cell = b.closest(".ucell").querySelector(".ucell__val");
      $("u_value").value = cell.getAttribute("data-copy-text");
      if (b.dataset.from !== toId) { fromId = b.dataset.from; } else { [fromId, toId] = [toId, fromId]; }
      fillSelects(); calc();
      $("u_value").focus();
    });
    K.onLang(() => { drawCats(); fillSelects(); calc(); });
    setCat(CATS.some((c) => c.id === hash) ? hash : K.load("units:cat", "length"));
  });
})();
