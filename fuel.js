/*
  ToolMeUp • Fuel & Energy Converter
  Every figure is reduced to one common base: energy per distance (MJ/km).
  That lets any fuel unit (L/100 km, mpg, km/kg…) be compared with any
  electric unit (kWh/100 km, mi/kWh, MPGe…) and with tailpipe CO₂.
  Tabs: Convert · Fill-up · Trip cost · Compare.
*/
(function () {
  "use strict";
  const TM = window.ToolMeUp, K = window.Kit, t = TM.t, $ = (id) => document.getElementById(id);
  const MI = 1.609344, GALUS = 3.785411784, GALUK = 4.54609;

  TM.addStrings({
    f_title: "محوّل استهلاك الوقود والطاقة",
    f_lead: "حوّل بين كل وحدات استهلاك الوقود والكهرباء — لتر/100 كم، ميل/غالون، كم/لتر، كيلوواط ساعة/100 كم، MPGe وانبعاثات CO₂ — واحسب تكلفة رحلتك وقارن بين سيارتين.",
    f_tab_convert: "تحويل", f_tab_fill: "من التعبئة", f_tab_trip: "تكلفة الرحلة", f_tab_cmp: "مقارنة سيارتين",
    f_runs_on: "سيارتك تعمل بـ",
    f_value: "القيمة", f_result: "النتيجة", f_swap: "تبديل الوحدات", f_bad: "أدخل رقماً أكبر من صفر",
    f_formula_lin: "1 {a} = {f} {b}", f_formula_inv: "{b} = {f} ÷ {a}",
    f_g_use: "المستهلك لكل مسافة", f_g_use_h: "الأقل أفضل",
    f_g_go: "المسافة لكل وحدة وقود", f_g_go_h: "الأعلى أفضل",
    f_g_eq: "الطاقة والمكافئات", f_g_eq_h: "للمقارنة بين أنواع الوقود والكهرباء",
    f_g_co2: "انبعاثات CO₂ من العادم", f_g_co2_h: "تقديرية",
    f_scale: "أين تقع سيارتك؟", f_scale_h: "الطاقة لكل 100 كم مقارنة بسيارات نموذجية. اضغط على أي مثال لتجربته.",
    f_you: "أنت",
    f_plain: "كل كيلومتر يستهلك نحو {wh} واط ساعة من الطاقة — أي ما يكفي لشحن هاتف {ph} مرة، و{x}× طاقة سيارة كهربائية موفّرة.",
    f_plain_less: "كل كيلومتر يستهلك نحو {wh} واط ساعة من الطاقة — أي ما يكفي لشحن هاتف {ph} مرة، وأقل من سيارة كهربائية موفّرة.",
    f_ex_ev: "كهربائية موفّرة", f_ex_evsuv: "SUV كهربائية", f_ex_hyb: "هجينة", f_ex_compact: "سيارة صغيرة",
    f_ex_dsuv: "SUV ديزل", f_ex_suv: "SUV كبيرة", f_ex_v8: "بيك أب / V8",
    // Fill-up
    f_fill_t: "احسب الاستهلاك من التعبئة", f_fill_sub: "املأ الخزان (أو اشحن البطارية) بالكامل، وسجّل المسافة المقطوعة حتى التعبئة التالية ثم الكمية التي أضفتها.",
    f_dist: "المسافة المقطوعة", f_added: "الكمية المضافة", f_paid: "المبلغ المدفوع (اختياري)",
    f_see_all: "اعرضها بكل الوحدات", f_cost100: "التكلفة لكل 100 {d}", f_cost1: "التكلفة لكل {d}",
    f_fill_empty: "أدخل المسافة والكمية لترى استهلاكك الحقيقي.",
    // Trip
    f_trip_t: "كم ستكلّف رحلتك؟", f_trip_sub: "أدخل المسافة واستهلاك سيارتك وسعر الوقود أو الكهرباء.",
    f_trip_dist: "مسافة الرحلة", f_round: "ذهاب وعودة", f_cons: "استهلاك السيارة", f_price: "السعر", f_people: "عدد الركاب لتقسيم التكلفة",
    f_tank: "سعة الخزان / البطارية (اختياري)",
    f_need: "الكمية المطلوبة", f_total: "تكلفة الرحلة", f_each: "لكل شخص", f_co2: "CO₂ من العادم",
    f_range: "المدى بخزان ممتلئ", f_stops: "{n} تعبئة أثناء الرحلة", f_stops0: "بدون تعبئة أثناء الرحلة",
    f_per: "لكل {u}", f_km_total: "{n} {d} إجمالاً",
    // Compare
    f_cmp_sub: "أي سيارة أرخص في التشغيل؟ يمكنك مقارنة أي نوعين من الوقود — مثلاً بنزين مقابل كهربائي.",
    f_car_a: "السيارة أ", f_car_b: "السيارة ب", f_fuel: "الوقود",
    f_year_dist: "المسافة السنوية", f_years: "عدد السنوات",
    f_r_energy: "الطاقة لكل 100 كم", f_r_cost100: "التكلفة لكل 100 {d}", f_r_year: "التكلفة السنوية",
    f_r_years: "التكلفة خلال {n} سنوات", f_r_qty: "الوقود السنوي", f_r_co2: "CO₂ السنوي (كغ)", f_diff: "الفرق",
    f_v_cheaper: "{car} أرخص بـ {sum} سنوياً ({pct}% أقل) — أي {total} خلال {n} سنوات.",
    f_v_same: "السيارتان تكلفان تقريباً المبلغ نفسه.",
    f_v_energy: "{car} تستهلك طاقة أقل بـ {x}×.",
    f_note_ev: "انبعاثات الكهرباء والهيدروجين تساوي صفراً عند العادم فقط؛ الانبعاثات الفعلية تعتمد على مصدر الكهرباء أو الهيدروجين.",
    // How-to
    f_how1: "اختر ما تعمل به سيارتك: بنزين، ديزل، E85، غاز مسال، غاز طبيعي، هيدروجين أو كهرباء.",
    f_how2: "اكتب رقماً واختر وحدته. تظهر النتيجة بكل الوحدات فوراً، مقسّمة إلى ما يُستهلك لكل مسافة (الأقل أفضل) والمسافة لكل وحدة (الأعلى أفضل). اضغط على أي قيمة لنسخها أو على اسم الوحدة للتحويل منها.",
    f_how3: "استخدم «من التعبئة» لمعرفة استهلاكك الحقيقي، و«تكلفة الرحلة» لحساب التكلفة والمدى، و«مقارنة سيارتين» لمعرفة أيهما أوفر.",
    f_faq1_q: "لماذا لا يمكن تحويل ميل/غالون بالضرب في رقم ثابت؟",
    f_faq1_a: "لأن ميل/غالون وكم/لتر تقيس المسافة لكل وحدة وقود، بينما لتر/100 كم يقيس الوقود لكل مسافة. العلاقة بينهما عكسية: لتر/100 كم = 235.21 ÷ ميل/غالون (أمريكي)، أو 282.48 ÷ ميل/غالون (بريطاني).",
    f_faq2_q: "ما هو MPGe؟",
    f_faq2_a: "MPGe (ميل لكل غالون مكافئ) هو مقياس وكالة حماية البيئة الأمريكية للسيارات الكهربائية: 33.705 كيلوواط ساعة تعادل طاقة غالون بنزين واحد. كندا تستخدم «لتر مكافئ لكل 100 كم» حيث 1 لتر بنزين = 8.9 كيلوواط ساعة.",
    f_faq3_q: "ما هو «وهم ميل/غالون»؟",
    f_faq3_a: "رفع الكفاءة من 10 إلى 20 ميل/غالون يوفّر وقوداً أكثر من رفعها من 30 إلى 50، لأن الوفر الحقيقي يعتمد على الوقود المستهلك لكل مسافة. لذلك تبيّن المقارنة اللترات والتكلفة لكل 100 كم وليس ميل/غالون فقط.",
    f_faq4_q: "من أين تأتي قيم الطاقة والانبعاثات؟",
    f_faq4_a: "نستخدم قيماً نموذجية (القيمة الحرارية الدنيا): بنزين 8.9 كيلوواط ساعة/لتر، ديزل 9.9، E85 6.5، غاز مسال 6.8، غاز طبيعي 13.1 كيلوواط ساعة/كغ، هيدروجين 33.3 كيلوواط ساعة/كغ. تختلف القيم الفعلية قليلاً حسب الخلطة والبلد. الاستهلاك الكهربائي يُدخل كما يعرضه العدّاد أو الشاحن.",
    f_km: "كم", f_mi: "ميل", f_copy: "نسخ",
    fuel_petrol: "بنزين", fuel_diesel: "ديزل", fuel_e85: "إيثانول E85", fuel_lpg: "غاز مسال LPG", fuel_cng: "غاز طبيعي CNG", fuel_h2: "هيدروجين", fuel_ev: "كهربائي"
  });

  // ---- Fuels: q = native quantity, mj = MJ per native unit (lower heating value),
  // co2 = tailpipe kg CO₂ per native unit, m3 = kg per m³ (gaseous fuels sold by volume).
  // Petrol uses the US EPA gallon-equivalent (33.705 kWh/gal) so MPGe matches mpg.
  const FUELS = [
    { id: "petrol", en: "Petrol", q: "L", mj: 33.705 * 3.6 / GALUS, co2: 2.31, icon: "M5 21V5a2 2 0 012-2h6a2 2 0 012 2v16M4 21h12M15 9h2a2 2 0 012 2v6a1.5 1.5 0 003 0V8l-3-3M8 7h4" },
    { id: "diesel", en: "Diesel", q: "L", mj: 35.8, co2: 2.68, icon: "M12 3s6 6.5 6 11a6 6 0 01-12 0c0-4.5 6-11 6-11zM9.5 14.5a2.5 2.5 0 002.5 2.5" },
    { id: "e85", en: "E85 ethanol", q: "L", mj: 23.4, co2: 1.63, icon: "M5 19c0-8 6-14 14-14 0 8-6 14-14 14zm0 0l7-7" },
    { id: "lpg", en: "LPG (autogas)", q: "L", mj: 24.5, co2: 1.56, icon: "M9 3h6M12 3v3M7 10a4 4 0 014-4h2a4 4 0 014 4v9a2 2 0 01-2 2H9a2 2 0 01-2-2zM7 14h10" },
    { id: "cng", en: "CNG", q: "kg", mj: 47.1, co2: 2.54, m3: 0.75, icon: "M12 3c.5 3 5 5.5 5 10a5 5 0 01-10 0c0-2.5 1.5-4 2.5-5 .2 2 1 3 2 3.5C11 9 11 6 12 3z" },
    { id: "h2", en: "Hydrogen", q: "kg", mj: 120, co2: 0, icon: "M7 5v14M17 5v14M7 12h10" },
    { id: "ev", en: "Electric", q: "kWh", mj: 3.6, co2: 0, icon: "M9 3v5M15 3v5M6 8h12v3a6 6 0 01-12 0zM12 17v4" }
  ];
  const fuelOf = (id) => FUELS.find((f) => f.id === id) || FUELS[0];
  const fuelName = (f) => t("fuel_" + f.id, f.en);

  // ---- Units. k: "fuel" (native quantity), "en" (energy, qf in MJ) or "co2" (qf in kg).
  // qf: quantity per unit; d: km per distance unit; per: distance count; inv: distance per quantity.
  const LIQ = (f) => f.q === "L", GAS = (f) => f.q === "kg", BYVOL = (f) => !!f.m3, CO2 = (f) => f.co2 > 0;
  const VOL = (f) => f.m3;
  const UNITS = [
    { id: "l100", sym: "L/100 km", en: "Litres per 100 km", ar: "لتر لكل 100 كم", k: "fuel", qf: 1, d: 1, per: 100, ok: LIQ },
    { id: "kml", sym: "km/L", en: "Kilometres per litre", ar: "كيلومتر لكل لتر", k: "fuel", qf: 1, d: 1, inv: 1, ok: LIQ },
    { id: "mpgus", sym: "mpg (US)", en: "Miles per US gallon", ar: "ميل لكل غالون أمريكي", k: "fuel", qf: GALUS, d: MI, inv: 1, ok: LIQ },
    { id: "mpguk", sym: "mpg (UK)", en: "Miles per UK gallon", ar: "ميل لكل غالون بريطاني", k: "fuel", qf: GALUK, d: MI, inv: 1, ok: LIQ },
    { id: "mil", sym: "mi/L", en: "Miles per litre", ar: "ميل لكل لتر", k: "fuel", qf: 1, d: MI, inv: 1, ok: LIQ },
    { id: "kmgal", sym: "km/gal (US)", en: "Kilometres per US gallon", ar: "كيلومتر لكل غالون أمريكي", k: "fuel", qf: GALUS, d: 1, inv: 1, ok: LIQ },
    { id: "l100mi", sym: "L/100 mi", en: "Litres per 100 miles", ar: "لتر لكل 100 ميل", k: "fuel", qf: 1, d: MI, per: 100, ok: LIQ },
    { id: "gus100", sym: "gal (US)/100 mi", en: "US gallons per 100 miles", ar: "غالون أمريكي لكل 100 ميل", k: "fuel", qf: GALUS, d: MI, per: 100, ok: LIQ },
    { id: "guk100", sym: "gal (UK)/100 mi", en: "UK gallons per 100 miles", ar: "غالون بريطاني لكل 100 ميل", k: "fuel", qf: GALUK, d: MI, per: 100, ok: LIQ },
    { id: "kg100", sym: "kg/100 km", en: "Kilograms per 100 km", ar: "كيلوغرام لكل 100 كم", k: "fuel", qf: 1, d: 1, per: 100, ok: GAS },
    { id: "kg100mi", sym: "kg/100 mi", en: "Kilograms per 100 miles", ar: "كيلوغرام لكل 100 ميل", k: "fuel", qf: 1, d: MI, per: 100, ok: GAS },
    { id: "kmkg", sym: "km/kg", en: "Kilometres per kilogram", ar: "كيلومتر لكل كيلوغرام", k: "fuel", qf: 1, d: 1, inv: 1, ok: GAS },
    { id: "mikg", sym: "mi/kg", en: "Miles per kilogram", ar: "ميل لكل كيلوغرام", k: "fuel", qf: 1, d: MI, inv: 1, ok: GAS },
    { id: "m3100", sym: "m³/100 km", en: "Cubic metres per 100 km", ar: "متر مكعب لكل 100 كم", k: "fuel", qf: VOL, d: 1, per: 100, ok: BYVOL },
    { id: "kmm3", sym: "km/m³", en: "Kilometres per cubic metre", ar: "كيلومتر لكل متر مكعب", k: "fuel", qf: VOL, d: 1, inv: 1, ok: BYVOL },
    { id: "kwh100", sym: "kWh/100 km", en: "Kilowatt-hours per 100 km", ar: "كيلوواط ساعة لكل 100 كم", k: "en", qf: 3.6, d: 1, per: 100 },
    { id: "whkm", sym: "Wh/km", en: "Watt-hours per km", ar: "واط ساعة لكل كم", k: "en", qf: 0.0036, d: 1, per: 1 },
    { id: "kwh100mi", sym: "kWh/100 mi", en: "Kilowatt-hours per 100 miles", ar: "كيلوواط ساعة لكل 100 ميل", k: "en", qf: 3.6, d: MI, per: 100 },
    { id: "whmi", sym: "Wh/mi", en: "Watt-hours per mile", ar: "واط ساعة لكل ميل", k: "en", qf: 0.0036, d: MI, per: 1 },
    { id: "kmkwh", sym: "km/kWh", en: "Kilometres per kWh", ar: "كيلومتر لكل كيلوواط ساعة", k: "en", qf: 3.6, d: 1, inv: 1 },
    { id: "mikwh", sym: "mi/kWh", en: "Miles per kWh", ar: "ميل لكل كيلوواط ساعة", k: "en", qf: 3.6, d: MI, inv: 1 },
    { id: "mpge", sym: "MPGe", en: "Miles per gallon equivalent (US EPA)", ar: "ميل لكل غالون مكافئ (EPA)", k: "en", qf: 33.705 * 3.6, d: MI, inv: 1 },
    { id: "le100", sym: "Le/100 km", en: "Litres-equivalent per 100 km", ar: "لتر مكافئ لكل 100 كم", k: "en", qf: 8.9 * 3.6, d: 1, per: 100 },
    { id: "mj100", sym: "MJ/100 km", en: "Megajoules per 100 km", ar: "ميغاجول لكل 100 كم", k: "en", qf: 1, d: 1, per: 100 },
    { id: "btumi", sym: "BTU/mi", en: "BTU per mile", ar: "وحدة حرارية بريطانية لكل ميل", k: "en", qf: 0.001055056, d: MI, per: 1 },
    { id: "gco2km", sym: "g CO₂/km", en: "Grams of CO₂ per km", ar: "غرام CO₂ لكل كم", k: "co2", qf: 0.001, d: 1, per: 1, ok: CO2 },
    { id: "gco2mi", sym: "g CO₂/mi", en: "Grams of CO₂ per mile", ar: "غرام CO₂ لكل ميل", k: "co2", qf: 0.001, d: MI, per: 1, ok: CO2 },
    { id: "kgco2100", sym: "kg CO₂/100 km", en: "Kilograms of CO₂ per 100 km", ar: "كيلوغرام CO₂ لكل 100 كم", k: "co2", qf: 1, d: 1, per: 100, ok: CO2 }
  ];
  const byId = (id) => UNITS.find((u) => u.id === id);
  const uname = (u) => (TM.lang() === "ar" ? u.ar : u.en);
  const okFor = (u, f) => !u.ok || u.ok(f);
  const EV_USE = ["kwh100", "whkm", "kwh100mi", "whmi"], EV_GO = ["kmkwh", "mikwh"];

  // Unit groups for a fuel, in display order.
  function groups(f) {
    const ev = f.q === "kWh";
    const native = UNITS.filter((u) => u.k === "fuel" && okFor(u, f));
    const g = [
      { id: "use", items: ev ? EV_USE.map(byId) : native.filter((u) => !u.inv) },
      { id: "go", items: ev ? EV_GO.map(byId) : native.filter((u) => u.inv) },
      { id: "eq", items: (ev ? ["mpge", "le100", "mj100", "btumi"] : ["kwh100", "whkm", "mpge", "le100", "mj100", "btumi"]).map(byId) }
    ];
    if (f.co2 > 0) g.push({ id: "co2", items: UNITS.filter((u) => u.k === "co2") });
    return g;
  }
  const allUnits = (f, noCo2) => groups(f).filter((g) => !(noCo2 && g.id === "co2")).flatMap((g) => g.items);

  // ---- Conversion core (energy per distance, MJ/km) ----
  const qf = (u, f) => (typeof u.qf === "function" ? u.qf(f) : u.qf);
  const mjOf = (u, f) => (u.k === "fuel" ? f.mj : u.k === "en" ? 1 : f.mj / f.co2);
  function toE(u, f, v) {
    const q = qf(u, f), per = u.per || 1;
    return (u.inv ? q / (v * u.d) : (v * q) / (per * u.d)) * mjOf(u, f);
  }
  function fromE(u, f, e) {
    const q = qf(u, f), per = u.per || 1, qpk = e / mjOf(u, f);
    return u.inv ? q / (qpk * u.d) : (qpk * per * u.d) / q;
  }
  const kwh100 = (e) => (e * 100) / 3.6;

  // Amount units (fill-up, price, tank) per fuel: [id, symbol, native units per 1]
  function amountUnits(f) {
    if (f.q === "L") return [["L", "L", 1], ["galus", "gal (US)", GALUS], ["galuk", "gal (UK)", GALUK]];
    if (f.q === "kg") return [["kg", "kg", 1]].concat(f.m3 ? [["m3", "m³", f.m3]] : []);
    return [["kWh", "kWh", 1]];
  }
  const amountOf = (f, id) => amountUnits(f).find((a) => a[0] === id) || amountUnits(f)[0];
  const DU = { km: 1, mi: MI };
  const dSym = (du) => (du === "mi" ? "mi" : "km");
  const dName = (du) => (du === "mi" ? t("f_mi", "mi") : t("f_km", "km"));

  // Defaults per fuel: [from, to, value, price, tank]
  const DEF = {
    petrol: ["l100", "mpgus", "8", "2.6", "55"], diesel: ["l100", "mpguk", "6.5", "2.8", "65"],
    e85: ["l100", "mpgus", "11", "2.1", "55"], lpg: ["l100", "kml", "10", "1.3", "45"],
    cng: ["kg100", "kmkg", "4.5", "2.5", "16"], h2: ["kg100", "mikg", "0.9", "45", "5.6"],
    ev: ["kwh100", "mikwh", "16", "0.3", "75"]
  };

  // Typical vehicles for the energy scale: [key, English, fuel, unit, value]
  const EXAMPLES = [
    ["f_ex_ev", "Efficient EV", "ev", "kwh100", 14], ["f_ex_evsuv", "Electric SUV", "ev", "kwh100", 21],
    ["f_ex_hyb", "Hybrid", "petrol", "l100", 4.5], ["f_ex_compact", "Compact car", "petrol", "l100", 6.5],
    ["f_ex_dsuv", "Diesel SUV", "diesel", "l100", 7.5], ["f_ex_suv", "Large SUV", "petrol", "l100", 11],
    ["f_ex_v8", "Pickup / V8", "petrol", "l100", 15]
  ];
  const SC_MIN = 8, SC_MAX = 200;
  const scalePos = (kw) => Math.max(0, Math.min(100, ((Math.log10(kw) - Math.log10(SC_MIN)) / (Math.log10(SC_MAX) - Math.log10(SC_MIN))) * 100));

  // ---- State (one object, saved to localStorage) ----
  const S = K.load("fuel:state", {});
  S.fuel = fuelOf(S.fuel).id;
  S.conv = S.conv || {}; S.price = S.price || {}; S.tank = S.tank || {};
  S.du = S.du === "mi" ? "mi" : "km";
  S.fill = Object.assign({ dist: "520", amt: "42", au: "", paid: "" }, S.fill);
  S.trip = Object.assign({ dist: "250", round: false, people: "1" }, S.trip);
  S.cmp = Object.assign({
    a: { fuel: "petrol", v: "8", u: "l100", p: "2.6", pu: "L" },
    b: { fuel: "ev", v: "17", u: "kwh100", p: "0.3", pu: "kWh" },
    dist: "15000", years: "5"
  }, S.cmp);
  const save = () => K.save("fuel:state", S);
  function conv(fid) {
    const f = fuelOf(fid), d = DEF[f.id], c = S.conv[f.id] || (S.conv[f.id] = { from: d[0], to: d[1], value: d[2] });
    const ids = allUnits(f).map((u) => u.id);
    if (!ids.includes(c.from)) c.from = d[0];
    if (!ids.includes(c.to)) c.to = d[1];
    return c;
  }
  function price(fid) {
    const f = fuelOf(fid);
    const p = S.price[f.id] || (S.price[f.id] = { p: DEF[f.id][3], u: amountUnits(f)[0][0] });
    if (!amountUnits(f).some((a) => a[0] === p.u)) p.u = amountUnits(f)[0][0];
    return p;
  }
  function tank(fid) {
    const f = fuelOf(fid);
    const p = S.tank[f.id] || (S.tank[f.id] = { v: DEF[f.id][4], u: amountUnits(f)[0][0] });
    if (!amountUnits(f).some((a) => a[0] === p.u)) p.u = amountUnits(f)[0][0];
    return p;
  }
  const fuel = () => fuelOf(S.fuel);
  const pos = (s) => { const v = K.parse(s); return Number.isFinite(v) && v > 0 ? v : NaN; };
  const money = (n) => K.fmt(n, n >= 100 ? 0 : 2);
  const plain = (s) => String(s).replace(/,/g, "");

  // ---- Rendering helpers ----
  function unitOptions(f, noCo2) {
    const gl = { use: t("f_g_use", "Used per distance"), go: t("f_g_go", "Distance per fuel"), eq: t("f_g_eq", "Energy & equivalents"), co2: t("f_g_co2", "Tailpipe CO₂") };
    return groups(f).filter((g) => !(noCo2 && g.id === "co2")).map((g) =>
      '<optgroup label="' + TM.esc(gl[g.id]) + '">' +
      g.items.map((u) => '<option value="' + u.id + '" title="' + TM.esc(uname(u)) + '">' + TM.esc(u.sym) + "</option>").join("") +
      "</optgroup>").join("");
  }
  const amountOptions = (f, prefix) => amountUnits(f).map((a) => '<option value="' + a[0] + '">' + TM.esc((prefix || "") + a[1]) + "</option>").join("");
  const fuelOptions = () => FUELS.map((f) => '<option value="' + f.id + '">' + TM.esc(fuelName(f)) + "</option>").join("");
  const duOptions = () => '<option value="km">km</option><option value="mi">mi</option>';
  function setSel(id, html, value) { const el = $(id); el.innerHTML = html; el.value = value; if (el.selectedIndex < 0) el.selectedIndex = 0; return el.value; }
  function stat(label, value, sub, hero, copy) {
    return '<div class="stat' + (hero ? " stat--hero" : "") + '"><div class="stat__label">' + TM.esc(label) + "</div>" +
      '<div class="stat__value" dir="ltr"' + (copy ? ' data-copy-text="' + TM.esc(plain(copy)) + '" title="' + TM.esc(t("f_copy", "Copy")) + '" role="button" tabindex="0"' : "") + ">" + value + "</div>" +
      (sub ? '<div class="stat__sub">' + sub + "</div>" : "") + "</div>";
  }

  // ---- Fuel chips ----
  function drawFuels() {
    $("f_fuels").innerHTML = FUELS.map((f) =>
      '<button type="button" role="radio" data-fuel="' + f.id + '" aria-checked="' + (f.id === S.fuel) + '">' + TM.icon(f.icon, 20) +
      "<span>" + TM.esc(fuelName(f)) + "</span></button>").join("");
  }
  function setFuel(id) {
    S.fuel = fuelOf(id).id; save();
    drawFuels(); fillConvSelects(); calcConv(); drawFill(); drawTrip();
  }

  // ---- Tab 1: Convert ----
  function fillConvSelects() {
    const f = fuel(), c = conv(f.id), opts = unitOptions(f);
    setSel("f_from", opts, c.from); setSel("f_to", opts, c.to);
    $("f_value").value = c.value;
  }
  function calcConv() {
    const f = fuel(), c = conv(f.id), raw = $("f_value").value;
    c.value = raw; save();
    const v = pos(raw), from = byId(c.from), to = byId(c.to);
    $("f_value").classList.toggle("is-bad", raw.trim() !== "" && !Number.isFinite(v));
    if (!Number.isFinite(v)) {
      $("f_out").textContent = "—"; $("f_formula").textContent = raw.trim() ? t("f_bad", "Enter a number above zero") : "";
      $("f_all").innerHTML = ""; drawScale(NaN); return;
    }
    const e = toE(from, f, v);
    $("f_out").textContent = K.smart(fromE(to, f, e));
    if (from !== to) {
      const one = K.smart(fromE(to, f, toE(from, f, 1)));
      $("f_formula").textContent = !!from.inv === !!to.inv
        ? t("f_formula_lin", "1 {a} = {f} {b}", { a: from.sym, f: one, b: to.sym })
        : t("f_formula_inv", "{b} = {f} ÷ {a}", { a: from.sym, f: one, b: to.sym });
    } else $("f_formula").textContent = "";
    const head = {
      use: [t("f_g_use", "Used per distance"), t("f_g_use_h", "lower is better")],
      go: [t("f_g_go", "Distance per fuel"), t("f_g_go_h", "higher is better")],
      eq: [t("f_g_eq", "Energy & equivalents"), t("f_g_eq_h", "compare across fuels and electric")],
      co2: [t("f_g_co2", "Tailpipe CO₂"), t("f_g_co2_h", "estimate")]
    };
    $("f_all").innerHTML = groups(f).map((g) =>
      '<section class="ugroup"><h2 class="ugroup__title">' + TM.esc(head[g.id][0]) + " <small>" + TM.esc(head[g.id][1]) + "</small></h2>" +
      '<div class="ugrid">' + g.items.map((u) => {
        const val = K.smart(fromE(u, f, e));
        return '<div class="ucell' + (u.id === c.from ? " is-from" : "") + (u.id === c.to ? " is-to" : "") + '">' +
          '<button type="button" class="ucell__name" data-from="' + u.id + '">' + TM.esc(uname(u)) + "</button>" +
          '<button type="button" class="ucell__val" data-copy-text="' + plain(val) + '" dir="ltr">' + val +
          " <small>" + TM.esc(u.sym) + "</small></button></div>";
      }).join("") + "</div></section>").join("");
    drawScale(e);
  }
  function drawTicks() {
    $("f_ticks").innerHTML = EXAMPLES.map((x, i) => {
      const f = fuelOf(x[2]), kw = kwh100(toE(byId(x[3]), f, x[4]));
      return '<button type="button" class="escale__tick' + (i % 2 ? " is-low" : "") + '" style="inset-inline-start:' + scalePos(kw).toFixed(2) + '%" data-ex="' + i + '" title="' +
        TM.esc(x[4] + " " + byId(x[3]).sym + " · " + fuelName(f)) + '"><span>' + TM.esc(t(x[0], x[1])) + "</span></button>";
    }).join("");
    // Small screens: the tick labels hide and these pills take over.
    $("f_expills").innerHTML = EXAMPLES.map((x, i) => '<button type="button" data-ex="' + i + '">' + TM.esc(t(x[0], x[1])) + "</button>").join("");
  }
  function drawScale(e) {
    const mark = $("f_mark");
    if (!Number.isFinite(e)) { mark.hidden = true; $("f_plain").textContent = ""; return; }
    const kw = kwh100(e);
    mark.hidden = false;
    mark.style.insetInlineStart = scalePos(kw).toFixed(2) + "%";
    $("f_mark_v").textContent = K.fmt(kw, kw < 10 ? 1 : 0) + " kWh/100 km";
    const wh = kw * 10, ref = kwh100(toE(byId("kwh100"), fuelOf("ev"), 14)), x = kw / ref;
    const vars = { wh: K.fmt(wh, 0), ph: K.fmt(wh / 15, wh / 15 < 10 ? 1 : 0), x: K.fmt(x, 1) };
    $("f_plain").textContent = x >= 1.05
      ? t("f_plain", "Each km uses about {wh} Wh of energy — enough to charge a phone {ph} times, and {x}× an efficient EV.", vars)
      : t("f_plain_less", "Each km uses about {wh} Wh of energy — enough to charge a phone {ph} times, and no more than an efficient EV.", vars);
  }

  // ---- Tab 2: Fill-up ----
  function drawFill() {
    const f = fuel();
    S.fill.au = setSel("fl_au", amountOptions(f), S.fill.au);
    $("fl_du").value = S.du;
    ["dist", "amt", "paid"].forEach((k) => { $("fl_" + k).value = S.fill[k]; });
    calcFill();
  }
  function calcFill() {
    const f = fuel(), dist = pos(S.fill.dist), amt = pos(S.fill.amt), paid = pos(S.fill.paid), out = $("fl_out");
    if (!Number.isFinite(dist) || !Number.isFinite(amt)) { out.innerHTML = '<p class="muted">' + TM.esc(t("f_fill_empty", "Enter the distance and the amount to see your real consumption.")) + "</p>"; $("fl_go").hidden = true; return; }
    const km = dist * DU[S.du], e = (amt * amountOf(f, S.fill.au)[2] * f.mj) / km;
    const ids = f.q === "L" ? ["l100", "kml", "mpgus", "mpguk"] : f.q === "kg" ? ["kg100", "kmkg", "mikg", "kg100mi"] : ["kwh100", "whkm", "kmkwh", "mikwh"];
    let html = ids.map((id, i) => { const u = byId(id), v = K.smart(fromE(u, f, e)); return stat(uname(u), v + " <small>" + TM.esc(u.sym) + "</small>", "", i === 0, v); }).join("");
    if (Number.isFinite(paid)) {
      const per = paid / dist;
      html += stat(t("f_cost100", "Cost per 100 {d}", { d: dName(S.du) }), money(per * 100), "", false, money(per * 100));
      html += stat(t("f_cost1", "Cost per {d}", { d: dName(S.du) }), K.fmt(per, 3), "", false, K.fmt(per, 3));
    }
    out.innerHTML = html;
    $("fl_go").hidden = false;
    $("fl_go").dataset.e = e;
  }

  // ---- Tab 3: Trip cost ----
  function drawTrip() {
    const f = fuel(), c = conv(f.id), p = price(f.id), tk = tank(f.id);
    const cu = byId(c.from).k === "co2" ? byId(DEF[f.id][0]) : byId(c.from), cv = pos(c.value);
    setSel("tr_u", unitOptions(f, true), cu.id);
    $("tr_v").value = cu.id === c.from || !Number.isFinite(cv) ? c.value : plain(K.smart(fromE(cu, f, toE(byId(c.from), f, cv))));
    $("tr_pu").innerHTML = amountUnits(f).map((a) => '<option value="' + a[0] + '">' + TM.esc(t("f_per", "per {u}", { u: a[1] })) + "</option>").join("");
    $("tr_pu").value = p.u;
    setSel("tr_tu", amountOptions(f), tk.u);
    $("tr_p").value = p.p; $("tr_t").value = tk.v;
    $("tr_dist").value = S.trip.dist; $("tr_du").value = S.du; $("tr_round").checked = !!S.trip.round; $("tr_people").value = S.trip.people;
    calcTrip();
  }
  function calcTrip() {
    const f = fuel(), u = byId($("tr_u").value), v = pos($("tr_v").value), dist = pos(S.trip.dist), out = $("tr_out");
    if (!u || !Number.isFinite(v) || !Number.isFinite(dist)) { out.innerHTML = ""; return; }
    const p = price(f.id), tk = tank(f.id), e = toE(u, f, v);
    const km = dist * DU[S.du] * (S.trip.round ? 2 : 1);
    const pa = amountOf(f, p.u), qty = (e * km) / f.mj / pa[2];
    const pr = pos(p.p), people = Math.max(1, Math.round(pos(S.trip.people) || 1));
    let html = stat(t("f_need", "Amount needed"), K.fmt(qty, qty < 10 ? 2 : 1) + " <small>" + TM.esc(pa[1]) + "</small>",
      TM.esc(t("f_km_total", "{n} {d} in total", { n: K.fmt(km / DU[S.du], 0), d: dName(S.du) })), false, K.fmt(qty, 2));
    if (Number.isFinite(pr)) {
      const cost = qty * pr;
      html = stat(t("f_total", "Trip cost"), money(cost), people > 1 ? TM.esc(money(cost / people) + " " + t("f_each", "per person")) : "", true, money(cost)) + html;
      html += stat(t("f_cost100", "Cost per 100 {d}", { d: dName(S.du) }), money((cost / km) * DU[S.du] * 100), "", false, money((cost / km) * DU[S.du] * 100));
    }
    if (f.co2 > 0) { const kg = (e * km) / f.mj * f.co2; html += stat(t("f_co2", "Tailpipe CO₂"), K.fmt(kg, kg < 10 ? 1 : 0) + " <small>kg</small>", "", false, K.fmt(kg, 1)); }
    const tv = pos(tk.v);
    if (Number.isFinite(tv)) {
      const rangeKm = (tv * amountOf(f, tk.u)[2] * f.mj) / e, n = Math.max(0, Math.ceil(km / rangeKm - 1e-9) - 1);
      html += stat(t("f_range", "Range on a full tank"), K.fmt(rangeKm / DU[S.du], 0) + " <small>" + dSym(S.du) + "</small>",
        TM.esc(n ? t("f_stops", "{n} refill(s) on this trip", { n: n }) : t("f_stops0", "No refill needed on this trip")), false, K.fmt(rangeKm / DU[S.du], 0));
    }
    out.innerHTML = html;
  }

  // ---- Tab 4: Compare ----
  function drawCmp() {
    ["a", "b"].forEach((k) => {
      const car = S.cmp[k], f = fuelOf(car.fuel);
      setSel("c" + k + "_fuel", fuelOptions(), f.id);
      car.u = setSel("c" + k + "_u", unitOptions(f, true), car.u);
      $("c" + k + "_pu").innerHTML = amountUnits(f).map((a) => '<option value="' + a[0] + '">' + TM.esc(t("f_per", "per {u}", { u: a[1] })) + "</option>").join("");
      $("c" + k + "_pu").value = car.pu; if ($("c" + k + "_pu").selectedIndex < 0) $("c" + k + "_pu").selectedIndex = 0;
      car.pu = $("c" + k + "_pu").value;
      $("c" + k + "_v").value = car.v; $("c" + k + "_p").value = car.p;
    });
    $("c_dist").value = S.cmp.dist; $("c_du").value = S.du; $("c_years").value = S.cmp.years;
    calcCmp();
  }
  function carCalc(car, kmYear) {
    const f = fuelOf(car.fuel), u = byId(car.u), v = pos(car.v), pr = pos(car.p);
    if (!u || !okFor(u, f) || !Number.isFinite(v)) return null;
    const e = toE(u, f, v), pa = amountOf(f, car.pu), qty = (e * kmYear) / f.mj / pa[2];
    return { f, e, pa, qty, cost: Number.isFinite(pr) ? qty * pr : NaN, co2: ((e * kmYear) / f.mj) * f.co2 };
  }
  function calcCmp() {
    const dist = pos(S.cmp.dist), years = Math.max(1, Math.round(pos(S.cmp.years) || 1)), body = $("c_table").tBodies[0];
    const kmYear = (dist || 0) * DU[S.du];
    const A = carCalc(S.cmp.a, kmYear), B = carCalc(S.cmp.b, kmYear);
    if (!A || !B || !Number.isFinite(dist)) { body.innerHTML = ""; $("c_verdict").innerHTML = ""; return; }
    const nA = t("f_car_a", "Car A"), nB = t("f_car_b", "Car B");
    const d = dName(S.du), per100 = (c) => (c.cost / kmYear) * DU[S.du] * 100;
    const diff = (a, b, fmt) => { const x = b - a; return (x > 0 ? "+" : x < 0 ? "−" : "") + fmt(Math.abs(x)); };
    const rows = [
      [t("f_r_energy", "Energy per 100 km"), K.fmt(kwh100(A.e), 1) + " kWh", K.fmt(kwh100(B.e), 1) + " kWh", diff(kwh100(A.e), kwh100(B.e), (x) => K.fmt(x, 1) + " kWh")],
      [t("f_r_qty", "Fuel per year"), K.fmt(A.qty, 0) + " " + A.pa[1], K.fmt(B.qty, 0) + " " + B.pa[1], ""]
    ];
    const hasCost = Number.isFinite(A.cost) && Number.isFinite(B.cost);
    if (hasCost) {
      rows.push([t("f_r_cost100", "Cost per 100 {d}", { d: d }), money(per100(A)), money(per100(B)), diff(per100(A), per100(B), money)]);
      rows.push([t("f_r_year", "Cost per year"), money(A.cost), money(B.cost), diff(A.cost, B.cost, money)]);
      rows.push([t("f_r_years", "Cost over {n} years", { n: years }), money(A.cost * years), money(B.cost * years), diff(A.cost * years, B.cost * years, money)]);
    }
    rows.push([t("f_r_co2", "CO₂ per year (kg)"), K.fmt(A.co2, 0), K.fmt(B.co2, 0), diff(A.co2, B.co2, (x) => K.fmt(x, 0))]);
    body.innerHTML = rows.map((r) => "<tr><th scope=\"row\">" + TM.esc(r[0]) + "</th>" + r.slice(1).map((c) => '<td class="num" dir="ltr">' + TM.esc(c) + "</td>").join("") + "</tr>").join("");
    let head = "", sub = "";
    if (hasCost) {
      const lo = A.cost <= B.cost ? [nA, A, B] : [nB, B, A], save1 = lo[2].cost - lo[1].cost, pct = lo[2].cost ? (save1 / lo[2].cost) * 100 : 0;
      head = pct < 1 ? t("f_v_same", "Both cars cost about the same to run.")
        : t("f_v_cheaper", "{car} is cheaper by {sum} a year ({pct}% less) — {total} over {n} years.", { car: lo[0], sum: money(save1), pct: K.fmt(pct, 0), total: money(save1 * years), n: years });
    }
    const ex = A.e <= B.e ? [nA, B.e / A.e] : [nB, A.e / B.e];
    if (ex[1] >= 1.05) sub = t("f_v_energy", "{car} uses {x}× less energy.", { car: ex[0], x: K.fmt(ex[1], 1) });
    if (!head) { head = sub; sub = ""; }
    const zero = A.f.co2 === 0 || B.f.co2 === 0;
    $("c_verdict").innerHTML = (head ? '<div class="verdict verdict--good"><b>' + TM.esc(head) + "</b>" + (sub ? "<span>" + TM.esc(sub) + "</span>" : "") + "</div>" : "") +
      (zero ? '<p class="muted small2">' + TM.esc(t("f_note_ev", "Electric and hydrogen show zero CO₂ at the tailpipe only; real emissions depend on how the electricity or hydrogen is made.")) + "</p>" : "");
  }

  // ---- Wiring ----
  function bindNum(id, set, after) {
    const el = $(id);
    el.addEventListener("input", () => { set(el.value); el.classList.toggle("is-bad", el.value.trim() !== "" && !Number.isFinite(pos(el.value))); save(); after(); });
  }
  function setDu(du) { S.du = du; save(); ["fl_du", "tr_du", "c_du"].forEach((id) => { $(id).value = du; }); calcFill(); calcTrip(); calcCmp(); }

  K.ready(() => {
    ["fl_du", "tr_du", "c_du"].forEach((id) => { $(id).innerHTML = duOptions(); $(id).addEventListener("change", () => setDu($(id).value)); });
    K.tabs("fuel", (id) => { $("f_fuelbar").hidden = id === "compare"; });

    $("f_fuels").addEventListener("click", (e) => { const b = e.target.closest("[data-fuel]"); if (b) setFuel(b.dataset.fuel); });
    $("f_fuels").addEventListener("keydown", (e) => {
      if (!["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp"].includes(e.key)) return;
      e.preventDefault();
      const rtl = document.documentElement.dir === "rtl", fwd = e.key === "ArrowDown" || (e.key === "ArrowRight") !== rtl && e.key !== "ArrowUp";
      const i = FUELS.findIndex((f) => f.id === S.fuel), n = FUELS[(i + (fwd ? 1 : -1) + FUELS.length) % FUELS.length];
      setFuel(n.id); $("f_fuels").querySelector('[data-fuel="' + n.id + '"]').focus();
    });

    // Convert
    $("f_value").addEventListener("input", () => { calcConv(); drawTrip(); });
    $("f_from").addEventListener("change", () => { conv(S.fuel).from = $("f_from").value; calcConv(); drawTrip(); });
    $("f_to").addEventListener("change", () => { conv(S.fuel).to = $("f_to").value; calcConv(); });
    $("f_swap").addEventListener("click", () => {
      const c = conv(S.fuel), out = $("f_out").textContent;
      [c.from, c.to] = [c.to, c.from];
      if (out !== "—") c.value = plain(out);
      fillConvSelects(); calcConv(); drawTrip();
    });
    $("f_out").addEventListener("click", () => { const v = $("f_out").textContent; if (v !== "—") K.copy(plain(v)); });
    $("f_all").addEventListener("click", (e) => {
      const b = e.target.closest("[data-from]");
      if (!b) return;
      const c = conv(S.fuel);
      c.value = b.closest(".ucell").querySelector(".ucell__val").getAttribute("data-copy-text");
      if (b.dataset.from !== c.to) c.from = b.dataset.from; else [c.from, c.to] = [c.to, c.from];
      fillConvSelects(); calcConv(); drawTrip(); $("f_value").focus();
    });
    $("f_scalecard").addEventListener("click", (e) => {
      const b = e.target.closest("[data-ex]");
      if (!b) return;
      const x = EXAMPLES[+b.dataset.ex], c = conv(x[2]);
      c.from = x[3]; c.value = String(x[4]);
      if (c.to === c.from) c.to = DEF[x[2]][1];
      setFuel(x[2]);
    });

    // Fill-up
    bindNum("fl_dist", (v) => { S.fill.dist = v; }, calcFill);
    bindNum("fl_amt", (v) => { S.fill.amt = v; }, calcFill);
    bindNum("fl_paid", (v) => { S.fill.paid = v; }, calcFill);
    $("fl_au").addEventListener("change", () => { S.fill.au = $("fl_au").value; save(); calcFill(); });
    $("fl_go").addEventListener("click", () => {
      const f = fuel(), c = conv(f.id), e = +$("fl_go").dataset.e;
      c.value = plain(K.smart(fromE(byId(c.from), f, e)));
      fillConvSelects(); calcConv(); drawTrip();
      document.querySelector('[data-tabs="fuel"] [data-tab="convert"]').click();
      $("f_value").focus();
    });

    // Trip
    const tripCons = () => {
      const f = fuel(), c = conv(f.id);
      c.from = $("tr_u").value; c.value = $("tr_v").value; save();
      fillConvSelects(); calcConv(); calcTrip();
    };
    $("tr_v").addEventListener("input", tripCons);
    $("tr_u").addEventListener("change", () => {
      // Keep the same consumption, expressed in the newly picked unit.
      const f = fuel(), c = conv(f.id), v = pos($("tr_v").value);
      if (Number.isFinite(v)) $("tr_v").value = plain(K.smart(fromE(byId($("tr_u").value), f, toE(byId(c.from), f, v))));
      tripCons();
    });
    bindNum("tr_p", (v) => { price(S.fuel).p = v; }, calcTrip);
    $("tr_pu").addEventListener("change", () => { price(S.fuel).u = $("tr_pu").value; save(); calcTrip(); });
    bindNum("tr_t", (v) => { tank(S.fuel).v = v; }, calcTrip);
    $("tr_tu").addEventListener("change", () => { tank(S.fuel).u = $("tr_tu").value; save(); calcTrip(); });
    bindNum("tr_dist", (v) => { S.trip.dist = v; }, calcTrip);
    bindNum("tr_people", (v) => { S.trip.people = v; }, calcTrip);
    $("tr_round").addEventListener("change", () => { S.trip.round = $("tr_round").checked; save(); calcTrip(); });

    // Compare
    ["a", "b"].forEach((k) => {
      const car = S.cmp[k];
      $("c" + k + "_fuel").addEventListener("change", () => {
        car.fuel = $("c" + k + "_fuel").value;
        const d = DEF[car.fuel]; car.u = d[0]; car.v = d[2]; car.p = d[3]; car.pu = amountUnits(fuelOf(car.fuel))[0][0];
        save(); drawCmp();
      });
      $("c" + k + "_u").addEventListener("change", () => {
        const f = fuelOf(car.fuel), v = pos(car.v), nu = $("c" + k + "_u").value;
        if (Number.isFinite(v)) car.v = plain(K.smart(fromE(byId(nu), f, toE(byId(car.u), f, v))));
        car.u = nu; $("c" + k + "_v").value = car.v; save(); calcCmp();
      });
      $("c" + k + "_pu").addEventListener("change", () => { car.pu = $("c" + k + "_pu").value; save(); calcCmp(); });
      bindNum("c" + k + "_v", (v) => { car.v = v; }, calcCmp);
      bindNum("c" + k + "_p", (v) => { car.p = v; }, calcCmp);
    });
    bindNum("c_dist", (v) => { S.cmp.dist = v; }, calcCmp);
    bindNum("c_years", (v) => { S.cmp.years = v; }, calcCmp);

    // Keyboard copy on stat values
    document.addEventListener("keydown", (e) => {
      if ((e.key === "Enter" || e.key === " ") && e.target.matches && e.target.matches(".stat__value[data-copy-text]")) { e.preventDefault(); e.target.click(); }
    });

    const redraw = () => { drawFuels(); drawTicks(); fillConvSelects(); calcConv(); drawFill(); drawTrip(); drawCmp(); };
    K.onLang(redraw);
    redraw();
  });
})();
