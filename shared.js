/*
  ToolMeUp • shared site chrome
  - TOOLS / CATEGORIES: the single source of truth for every tool. The header
    menu, the home page (cards + category chips) and the "recent tools" list
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
  // tags:  extra keywords (English + Arabic); not used by the UI since search was removed
  // newUntil: optional "YYYY-MM-DD"; the card shows a "New" badge until that date
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
      id: "tires", cat: "automotive", href: "tires.html", newUntil: "2026-12-12",
      icon: "M12 2a10 10 0 100 20 10 10 0 000-20zm0 5a5 5 0 110 10 5 5 0 010-10zM4.5 12H7m10 0h2.5M12 4.5V7m0 10v2.5",
      tags: "tire size compare speedometer speedo error gps diameter إطار عداد سرعة مقارنة",
      en: { name: "Tire Size", title: "Tire Size & Speedometer", desc: "Compare two tire sizes side by side and see how a new size changes your speedometer reading." },
      ar: { name: "مقاس الإطار", title: "مقاس الإطار وعدّاد السرعة", desc: "قارن مقاسين للإطارات جنباً إلى جنب، واعرف كيف يغيّر المقاس الجديد قراءة عدّاد السرعة." }
    },
    {
      id: "fuel", cat: "automotive", href: "fuel.html", newUntil: "2026-12-14",
      icon: "M4 21V5a2 2 0 012-2h6a2 2 0 012 2v16M3 21h12M14 9h2a2 2 0 012 2v5a1.5 1.5 0 003 0V8l-3-3M9.5 7L7.5 11h3l-2 4",
      tags: "fuel economy consumption mpg l/100km km/l kwh/100km wh/km mi/kwh mpge ev electric co2 trip cost petrol diesel lpg cng hydrogen وقود استهلاك كهرباء تكلفة رحلة",
      en: { name: "Fuel & Energy", title: "Fuel & Energy Converter", desc: "Convert L/100 km, mpg, km/L, kWh/100 km, MPGe and CO₂ for any fuel or EV, then work out trip cost or compare two cars." },
      ar: { name: "الوقود والطاقة", title: "محوّل الوقود والطاقة", desc: "حوّل لتر/100 كم، ميل/غالون، كم/لتر، كيلوواط ساعة/100 كم، MPGe وCO₂ لأي وقود أو سيارة كهربائية، واحسب تكلفة الرحلة أو قارن بين سيارتين." }
    },
    {
      id: "calculators", cat: "calc", href: "calculators.html", newUntil: "2026-12-12",
      icon: "M7 3h10a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2zm1 3h8v3H8V6zm0 6h.01M12 12h.01M16 12h.01M8 15h.01M12 15h.01M16 15h.01M8 18h.01M12 18h.01M16 18h.01",
      tags: "calculator percent percentage loan mortgage interest bmi video resolution aspect ratio حاسبة نسبة قرض فائدة كتلة",
      en: { name: "Calculators", title: "Calculator Suite", desc: "Basic, percentage, loan & interest, video ratio & resolution, and BMI calculators in one place." },
      ar: { name: "الحاسبات", title: "مجموعة الحاسبات", desc: "حاسبة أساسية، النسبة المئوية، القروض والفائدة، نسبة أبعاد الفيديو والدقة، ومؤشر كتلة الجسم في مكان واحد." }
    },
    {
      id: "units", cat: "calc", href: "units.html", newUntil: "2026-12-12",
      icon: "M4 7h11m0 0l-3-3m3 3l-3 3M20 17H9m0 0l3-3m-3 3l3 3",
      tags: "unit converter length weight mass temperature speed volume area pressure data psi bar kpa hp kw horsepower torque nm lb-ft celsius fahrenheit km miles kg lb gallon litre liter inch cm feet gb mb تحويل وحدات طول وزن حرارة سرعة ضغط حصان عزم",
      en: { name: "Units", title: "Unit Converter", desc: "Convert length, weight, temperature, speed, volume, area, pressure, data, power and torque — see every unit at once." },
      ar: { name: "الوحدات", title: "محوّل الوحدات", desc: "حوّل الطول والوزن والحرارة والسرعة والحجم والمساحة والضغط والبيانات والقدرة والعزم — وشاهد كل الوحدات دفعة واحدة." }
    },
    {
      id: "datetime", cat: "time", href: "datetime.html", newUntil: "2026-12-12",
      icon: "M12 7v5l3 2M12 3a9 9 0 100 18 9 9 0 000-18z",
      tags: "time zone world clock countdown timer age birthday date difference days between المنطقة الزمنية عد تنازلي عمر",
      en: { name: "Date & Time", title: "Date & Time Tools", desc: "World clock and time zone planner, countdown timer, age calculator and days between dates." },
      ar: { name: "التاريخ والوقت", title: "أدوات التاريخ والوقت", desc: "ساعة عالمية ومخطط للمناطق الزمنية، عدّ تنازلي، حاسبة العمر، والأيام بين تاريخين." }
    },
    {
      id: "devtools", cat: "dev", href: "devtools.html", newUntil: "2026-12-12",
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
      id: "qr", cat: "media", href: "qr.html", newUntil: "2026-12-12",
      icon: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 18h2v2h-2zM14 18h2M18 14h2",
      tags: "qr code generator wifi url link vcard barcode رمز كيو آر واي فاي",
      en: { name: "QR Code", title: "QR Code Generator", desc: "Turn text, links, Wi-Fi details or contacts into a QR code. Pick colors and download PNG or SVG." },
      ar: { name: "رمز QR", title: "مولّد رمز QR", desc: "حوّل النصوص والروابط وبيانات الواي فاي وجهات الاتصال إلى رمز QR. اختر الألوان ونزّله PNG أو SVG." }
    },
    {
      id: "images", cat: "media", href: "images.html", newUntil: "2026-12-12",
      icon: "M4 5h16v14H4zM4 15l4-4 4 4 3-3 5 5M15.5 9.5h.01",
      tags: "image compress resize shrink jpg jpeg png webp photo batch ضغط صور تصغير",
      en: { name: "Images", title: "Image Compressor & Resizer", desc: "Shrink and resize photos in batches with a before/after preview. Download one by one or as a ZIP." },
      ar: { name: "الصور", title: "ضغط الصور وتغيير حجمها", desc: "قلّل حجم الصور وغيّر أبعادها دفعة واحدة مع معاينة قبل/بعد. نزّلها منفردة أو في ملف ZIP." }
    },
    {
      id: "pdf", cat: "media", href: "pdf.html", newUntil: "2026-12-12",
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
    fit_title: "مقاسات الجنوط والإطارات",
    fit_lead: "قارن تركيبات الجنوط والإطارات الجديدة مع ما هو مركّب على سيارتك الآن: الأوفست، البروز، الخلوص وخطأ العداد.",
    fit_s1_t: "التركيب الحالي",
    fit_s1_sub: "الجنوط والإطارات المركّبة على سيارتك اليوم. تتم مقارنة كل شيء بها.",
    fit_s2_t: "تركيبات للمقارنة",
    fit_s2_sub: "أضف تركيبات الجنوط والإطارات التي تفكّر فيها.",
    fit_s3_t: "النتائج",
    fit_s3_sub: "الرسومات والقياسات للتركيب المحدد.",
    ui_ok: "موافق",
    home_all_tools: "جميع الأدوات",
    ui_cancel: "إلغاء",
    skip_link: "انتقل إلى المحتوى",
    // ---- Fitment page: controls, labels, report, sessions ----
    ui_close: "إغلاق",
    u_in: "إنش",
    u_mm: "مم",
    u_rpm: "دورة/ميل",
    u_rpk: "دورة/كم",
    fit_load: "تحميل جلسة",
    fit_reset: "إعادة تعيين",
    fit_reset_q: "هل تريد إعادة جميع الحقول إلى قيمها الافتراضية؟",
    fit_options: "خيارات الحاسبة",
    fit_preset_samples: "أمثلة جاهزة",
    fit_oem_btn: "مقاسات المصنع…",
    fit_oem_title: "حمّل مواصفات الجنط والإطار الأصلية من قاعدة بيانات المصنع",
    fit_h_wheel: "الجنط",
    fit_h_tire: "الإطار",
    fit_h_speedo: "عداد السرعة",
    fit_h_fender: "خلوص الرفرف",
    fit_h_vehicle: "خلوص المركبة",
    fit_h_thresholds: "حدود التحذير",
    fit_rim_diam: "قطر الجنط",
    fit_rim_width: "عرض الجنط",
    fit_offset: "الأوفست ET",
    fit_spacer: "الفاصل (سبيسر)",
    fit_tire_size: "مقاس الإطار",
    fit_correction: "تصحيح العرض (%)",
    fit_bulge: "الانتفاخ (%)",
    fit_speedo_err: "خطأ العداد الحالي (%)",
    fit_arch_clear: "الخلوص الحالي بين الإطار وقوس العجلة",
    fit_advanced: "إعدادات متقدمة (اختياري)",
    fit_inner_clear: "الخلوص الداخلي الحالي حتى المساعد",
    fit_outer_clear: "الخلوص الخارجي الحالي حتى الرفرف",
    fit_min_inner: "أدنى خلوص داخلي",
    fit_min_outer: "أدنى خلوص خارجي",
    fit_add_setup: "إضافة تركيب",
    fit_max: "الحد الأقصى {max} تركيبات",
    fit_max_stag: "الحد الأقصى {max} تركيبات في وضع الأمام والخلف",
    fit_stag_trim_q: "وضع الأمام والخلف يقارن حتى {max} تركيبات. هل تريد حذف التركيبات من {from} إلى {to}؟",
    fit_setup_n: "التركيب {n}",
    fit_baseline: "الحالي",
    fit_copy: "نسخ من الحالي",
    fit_copy_title: "انسخ جميع القيم من التركيب الحالي",
    fit_remove: "حذف هذا التركيب",
    fit_save: "حفظ الجلسة",
    fit_overwrite: "استبدال الجلسة",
    fit_cv_base: "الحالي",
    fit_cv_setup: "التركيب",
    fit_cv_refs: "المساعد/الرفرف",
    fit_cv_hub: "وجه المحور",
    fit_cv_fender: "إظهار الرفرف",
    cv_hub: "المحور",
    cv_strut: "المساعد",
    cv_fender: "الرفرف",
    fit_units: "الوحدات",
    fit_u_metric: "متري",
    fit_u_imperial: "إمبراطوري",
    fit_u_intl: "دولي",
    rep_sec_diff: "فروقات المقاسات",
    rep_sec_wheel: "أبعاد الجنط",
    rep_sec_tire: "أبعاد الإطار",
    rep_ride_height: "تغيّر ارتفاع السيارة",
    rep_arch_change: "تغيّر خلوص قوس العجلة",
    rep_arch_final: "خلوص قوس العجلة النهائي",
    rep_inner_change: "تغيّر الخلوص الداخلي",
    rep_outer_change: "تغيّر الخلوص الخارجي",
    rep_outer_final: "الخلوص الخارجي النهائي",
    rep_speedo_change: "تغيّر خطأ العداد",
    rep_speedo_final: "خطأ العداد النهائي",
    rep_wheel_width: "عرض الجنط",
    rep_wheel_diam: "قطر الجنط",
    rep_offset: "الأوفست",
    rep_backspacing: "المسافة الخلفية (Backspacing)",
    rep_poke: "البروز",
    rep_od: "القطر الكلي",
    rep_section_width: "عرض المقطع",
    rep_sidewall: "ارتفاع الجدار الجانبي",
    rep_circumference: "المحيط",
    rep_revs: "عدد الدورات",
    ses_title: "الجلسات المحفوظة",
    ses_need_setup: "أضف تركيباً واحداً على الأقل قبل حفظ الجلسة",
    ses_bar: "الجلسة: {name}",
    ses_save_prompt: "احفظ الجلسة باسم:",
    ses_saved: "تم حفظ الجلسة.",
    ses_missing: "الجلسة المحمّلة لم تعد موجودة. استخدم «حفظ الجلسة» بدلاً من ذلك.",
    ses_overwrite_q: "هل تريد استبدال الجلسة «{name}» بالقيم الحالية؟",
    ses_overwritten: "تم استبدال الجلسة.",
    ses_none: "لا توجد جلسات محفوظة.",
    ses_load_one: "تحميل هذه الجلسة",
    ses_rename: "إعادة تسمية",
    ses_rename_prompt: "الاسم الجديد للجلسة:",
    ses_delete: "حذف",
    ses_delete_q: "هل تريد حذف الجلسة «{name}»؟",
    // ---- Fitment: OEM presets dialog ----
    oem_title: "مقاسات المصنع",
    oem_intro: "اختر سيارة لتحميل مقاس الجنط والإطار الأصلي (OE) لها. البيانات من Wheel-Size Fitment API.",
    oem_region: "المنطقة",
    oem_make: "الشركة المصنّعة",
    oem_model: "الطراز",
    oem_year: "سنة الصنع",
    oem_trim: "الفئة / المحرك",
    oem_select: "اختر…",
    oem_capture: "نقل إلى التركيب الحالي",
    oem_cap_wheel: "الجنط (القطر، العرض، الأوفست)",
    oem_cap_tire: "الإطار (المقاس)",
    oem_cancel: "إلغاء",
    oem_apply: "تطبيق على التركيب الحالي",
    oem_l_makes: "جارٍ تحميل الشركات…",
    oem_l_models: "جارٍ تحميل الطرازات…",
    oem_l_years: "جارٍ تحميل السنوات…",
    oem_l_fits: "جارٍ تحميل المقاسات…",
    oem_n_makes: "لا توجد شركات لهذه المنطقة.",
    oem_n_models: "لا توجد طرازات.",
    oem_n_years: "لا توجد سنوات.",
    oem_n_fits: "لا توجد سجلات مقاسات لهذه السيارة.",
    oem_n_wheels: "لا توجد بيانات جنوط لهذه الفئة.",
    oem_fitment: "مقاس",
    oem_oe_fits: "مقاسات المصنع (OE)",
    oem_all_fits: "المقاسات المتاحة",
    oem_rear: "الخلفي:",
    oem_err: "حدث خطأ ما.",
    oem_e403: "مفتاح الواجهة البرمجية مفقود أو غير صالح (403).",
    oem_e404: "لم يتم العثور على بيانات (404).",
    oem_e429: "تم بلوغ حد الطلبات (429). حاول لاحقاً.",
    oem_efail: "فشل الطلب ({code}).",
    oem_r_usdm: "الولايات المتحدة (USDM)",
    oem_r_cdm: "كندا",
    oem_r_mxndm: "المكسيك",
    oem_r_ladm: "أمريكا الوسطى والجنوبية",
    oem_r_eudm: "أوروبا (EUDM)",
    oem_r_rus: "روسيا وما حولها",
    oem_r_jdm: "اليابان (JDM)",
    oem_r_chdm: "الصين",
    oem_r_skdm: "كوريا الجنوبية",
    oem_r_sam: "جنوب شرق آسيا",
    oem_r_medm: "الشرق الأوسط",
    oem_r_nadm: "شمال أفريقيا",
    oem_r_sadm: "جنوب أفريقيا",
    oem_r_audm: "أوقيانوسيا (AUDM)",
    // ---- Accessible names for inputs labelled only by a sentence or placeholder ----
    a11y_pct_a1: "النسبة المئوية",
    a11y_pct_a2: "من القيمة",
    a11y_pct_b1: "القيمة الجزئية",
    a11y_pct_b2: "القيمة الكلية",
    a11y_pct_c1: "من القيمة",
    a11y_pct_c2: "إلى القيمة",
    a11y_pct_d1: "القيمة الأصلية",
    a11y_pct_d2: "نسبة التغيّر",
    a11y_cmp_aw: "عرض الدقة A",
    a11y_cmp_ah: "ارتفاع الدقة A",
    a11y_cmp_bw: "عرض الدقة B",
    a11y_cmp_bh: "ارتفاع الدقة B",
    a11y_j_in: "مُدخل JSON",
    a11y_r_pat: "نمط التعبير النمطي",
    a11y_b_in: "النص المراد ترميزه أو فك ترميزه",
    a11y_u_check: "UUID المراد فحصه",
    a11y_tz_add: "أضف مدينة أو منطقة زمنية",
    a11y_ad_date: "تاريخ البداية",
    a11y_ad_sign: "إضافة أو طرح",
    a11y_ad_n: "المقدار",
    a11y_ad_unit: "الوحدة",
    a11y_s_n: "عدد الصفحات لكل ملف",
    a11y_preset: "مقاسات جاهزة",
    // ---- Wget page ----
    wg_title: "أداة التنزيل Wget",
    wg_lead: "اجلب رابطاً بالطريقة والترويسات والمحتوى التي تختارها، أو انسخ موقعاً ثابتاً إلى ملف ZIP — مباشرة من المتصفح.",
    wg_dl_t: "تنزيل ملف",
    wg_dl_sub: "اجلب رابطاً واحداً واحفظه على جهازك. الطريقة والترويسات والمحتوى اختيارية.",
    wg_url: "الرابط",
    wg_method: "الطريقة",
    wg_filename: "اسم الملف (اختياري)",
    wg_auto: "تلقائي",
    wg_adv: "متقدم: الترويسات والمحتوى",
    wg_headers: "الترويسات (كائن JSON)",
    wg_body: "المحتوى",
    wg_body_ph: "محتوى الطلب (لا يُرسل مع GET)",
    wg_dl_btn: "تنزيل الملف",
    wg_cancel: "إلغاء",
    wg_cors: "الروابط من نطاقات أخرى تعمل فقط إذا سمح الخادم بـ CORS؛ وإلا سيحظر المتصفح الطلب.",
    wg_zip_t: "نسخ موقع إلى ملف ZIP",
    wg_zip_sub: "يزحف إلى صفحة ويتبع روابطها وملفاتها ضمن الحدود أدناه، ثم يجمع كل شيء في ملف ZIP واحد.",
    wg_start_url: "رابط البداية",
    wg_depth: "أقصى عمق",
    wg_files: "أقصى عدد ملفات",
    wg_same: "النطاق نفسه فقط",
    wg_zip_btn: "تنزيل الموقع كملف ZIP",
    wg_zip_note: "يعمل بشكل أفضل مع المحتوى الثابت من النطاق نفسه. لا يمكن نسخ الموارد المقيّدة بـ CORS أو المحمية بتسجيل الدخول من المتصفح.",
    wg_legal: "نزّل فقط المحتوى الذي تملكه أو يحق لك الوصول إليه. تُرسل الطلبات من متصفحك باستخدام شبكتك وأي بيانات اعتماد أو ترويسات تضيفها — أنت مسؤول عن طريقة استخدامك لهذه الأداة وعن الالتزام بشروط خدمة الموقع المستهدف والقوانين المعمول بها. لا تستخدمها للوصول إلى مواد غير مصرّح لك باسترجاعها.",
    wg_s_nourl: "يرجى إدخال رابط.",
    wg_s_badurl: "رابط غير صالح.",
    wg_s_hdrobj: "يجب أن تكون الترويسات كائن JSON.",
    wg_s_hdrjson: "صيغة JSON للترويسات غير صالحة.",
    wg_s_start: "جارٍ بدء التنزيل...",
    wg_s_prog: "جارٍ التنزيل: {loaded}/{total} بايت ({pct}%)",
    wg_s_prog_n: "جارٍ التنزيل: {loaded} بايت",
    wg_s_done: "اكتمل: حُفظ باسم {name}",
    wg_s_cancel: "تم الإلغاء.",
    wg_s_err: "خطأ: {msg}",
    wg_z_start: "جارٍ بدء الزحف إلى الموقع...",
    wg_z_prog: "تمت معالجة {done}/{all} ملفات، {bytes} بايت",
    wg_z_done: "اكتمل: حُفظ {n} ملف باسم {name}",
    wg_z_crawled: "تم الزحف إلى {n} ملفات",
    wg_z_zip: "جارٍ إنشاء ملف ZIP...",
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
    opt_simple_title: "تبسيط",
    opt_simple_desc: "يخفي الفاصل (سبيسر) وتصحيح العرض والانتفاخ، ويستخدم القيم الافتراضية: بلا فاصل، تصحيح 0%، انتفاخ 5%.",
    opt_stag_title: "مقاسات مختلفة للأمام والخلف",
    opt_stag_desc: "يضيف عموداً خلفياً لكل تركيب. حتى تركيبين في هذا الوضع.",
    axle_front: "أمامي",
    axle_rear: "خلفي",
    sv_tire_height: "ارتفاع الإطار",
    sv_ride_height: "ارتفاع السيارة",
    sv_fender_gap: "خلوص الرفرف",

    // Site chrome
    nav_home: "الرئيسية",
    nav_all_tools: "كل الأدوات",
    nav_dark: "الوضع الداكن",
    nav_menu: "القائمة",
    nav_close: "إغلاق القائمة",
    home_eyebrow: "خصوصية تامة • بلا تسجيل • بلا تتبّع",
    home_title: "أدوات مجانية <span class=\"grad\">تعمل في متصفحك</span>",
    home_lead: "مجموعة متنامية من الأدوات المفيدة. كل شيء يعمل على جهازك — ملفاتك وبياناتك لا تغادره أبداً.",
    promise1_t: "تعمل على جهازك",
    promise1: "تتم معالجة الملفات داخل متصفحك، ولا يُرفع أي شيء إلى خادم.",
    promise2_t: "بلا حساب وبلا تتبّع",
    promise2: "لا تسجيل ولا إعلانات ولا تحليلات. الإعدادات تُحفظ في متصفحك فقط.",
    promise3_t: "English و العربية",
    promise3: "بدّل اللغة والوضع الداكن من القائمة. الأدوات تدعم الكتابة من اليمين إلى اليسار بالكامل.",
    home_all: "الكل",
    home_recent: "استخدمتها مؤخراً",
    home_new: "جديد",
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
    // Arabic is always right-to-left, even on partly translated pages.
    root.setAttribute("lang", lang === "ar" ? "ar" : "en");
    root.setAttribute("dir", lang === "ar" ? "rtl" : "ltr");
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
  let homeCat = "";
  // "New" badges expire on their own, so they keep meaning something.
  function isNew(x) { return !!x.newUntil && new Date() < new Date(x.newUntil + "T00:00:00"); }
  function cardHtml(x, withCat) {
    const cat = withCat ? CATEGORIES.find(function (c) { return c.id === x.cat; }) : null;
    return '<a class="tcard" href="' + x.href + '" data-hue="' + hueOf(x) + '">' +
      '<span class="tcard__icon">' + iconSvg(x.icon, 24) + "</span>" +
      '<span class="tcard__body">' +
        '<span class="tcard__title">' + esc(L(x, "title")) +
          (isNew(x) ? ' <span class="pill pill--new">' + esc(t("home_new", "New")) + "</span>" : "") + "</span>" +
        '<span class="tcard__desc">' + esc(L(x, "desc")) + "</span>" +
        (cat ? '<span class="tcard__cat">' + esc(currentLang() === "ar" ? cat.ar : cat.en) + "</span>" : "") +
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
    const list = TOOLS.filter(function (x) { return !homeCat || x.cat === homeCat; });
    let html = "";
    const rec = recent().map(function (id) { return TOOLS.find(function (x) { return x.id === id; }); }).filter(Boolean);
    if (!homeCat && rec.length) {
      html += '<section class="tsection tsection--recent"><h2 class="tsection__title">' + esc(t("home_recent", "Recently used")) + "</h2>" +
        '<div class="recent-row">' + rec.map(function (x) {
          return '<a class="recent" href="' + x.href + '" data-hue="' + hueOf(x) + '">' + iconSvg(x.icon, 18) + "<span>" + esc(L(x, "name")) + "</span></a>";
        }).join("") + "</div></section>";
    }
    // "All": one dense grid, each card labelled with its category. Category
    // sections only when a filter chip is on (or the URL has #category).
    if (!homeCat) {
      html += '<section class="tsection"><h2 class="tsection__title">' + esc(t("home_all_tools", "All tools")) + "</h2>" +
        '<div class="tgrid">' + list.map(function (x) { return cardHtml(x, true); }).join("") + "</div></section>";
    }
    CATEGORIES.forEach(function (c) {
      if (!homeCat || homeCat !== c.id) return;
      const items = list.filter(function (x) { return x.cat === c.id; });
      if (!items.length) return;
      html += '<section class="tsection" id="' + c.id + '"><h2 class="tsection__title" data-hue="' + c.hue + '">' +
        esc(currentLang() === "ar" ? c.ar : c.en) + "</h2>" + '<div class="tgrid">' + items.map(cardHtml).join("") + "</div></section>";
    });
    mount.innerHTML = html;
    const count = document.querySelector("[data-home-count]");
    if (count) count.textContent = t("home_count", "{n} tools", { n: TOOLS.length });
  }
  function wireHome() {
    const chips = document.querySelector("[data-home-chips]");
    if (!chips) return;
    if (location.hash && CATEGORIES.some(function (c) { return "#" + c.id === location.hash; })) homeCat = location.hash.slice(1);
    chips.addEventListener("click", function (e) {
      const b = e.target.closest("[data-cat]");
      if (!b) return;
      homeCat = b.getAttribute("data-cat");
      history.replaceState(null, "", homeCat ? "#" + homeCat : location.pathname);
      renderHome();
    });
  }

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
        // The header's backdrop-filter makes it the containing block for
        // fixed children, so the drawer and its backdrop live on <body>.
        ["menuBackdrop", "menuDropdown"].forEach(function (id) {
          const el = document.getElementById(id);
          if (el) document.body.appendChild(el);
        });
      })
      .catch(function () { /* keep whatever is in the page as fallback */ });
  }
  // Main menu: a drawer that slides in from the start side (left in
  // English, right in Arabic), over a dimmed backdrop.
  function wireMenu() {
    const btn = document.getElementById("menuBtn");
    const drawer = document.getElementById("menuDropdown");
    const backdrop = document.getElementById("menuBackdrop");
    const closeBtn = document.getElementById("menuClose");
    if (!btn || !drawer) return;
    const isOpen = function () { return drawer.classList.contains("is-open"); };
    const setOpen = function (open) {
      drawer.classList.toggle("is-open", open);
      if (backdrop) backdrop.classList.toggle("is-open", open);
      drawer.setAttribute("aria-hidden", String(!open));
      drawer.inert = !open; // closed drawer is skipped by Tab and screen readers
      btn.setAttribute("aria-expanded", String(open));
      document.documentElement.classList.toggle("no-scroll", open);
      if (open) {
        playFan(drawer.querySelector(".brand-fan"), 140); // fans open as the drawer slides in
        const here = drawer.querySelector("a.is-here") || drawer.querySelector("a, button");
        setTimeout(function () { if (here) here.focus({ preventScroll: true }); }, 50);
      } else if (drawer.contains(document.activeElement)) {
        btn.focus();
      }
    };
    setOpen(false);
    btn.addEventListener("click", function () { setOpen(!isOpen()); });
    if (closeBtn) closeBtn.addEventListener("click", function () { setOpen(false); });
    if (backdrop) backdrop.addEventListener("click", function () { setOpen(false); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && isOpen()) setOpen(false); });
  }

  function init() {
    addSkipLink();
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
      // Home page: the header logo fans open as the page loads
      if (document.querySelector("[data-home]")) playFan(document.querySelector(".app-header .brand-fan"), 120);
      document.dispatchEvent(new CustomEvent("toolmeup:headerready"));
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  // ---- Accessible dialogs, confirm / prompt and toasts -------------------
  // openDialog(overlay): focus moves into the dialog, Tab stays inside it,
  // Esc and backdrop clicks close it, the page behind is inert, and focus
  // returns to whatever opened it. Returns close().
  // ask() replaces window.confirm / prompt with the same in-page dialog, so
  // it is styled, translated, follows RTL and works where native boxes are
  // blocked (some embeds). Resolves true/false (confirm) or text/null (prompt).
  const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  function openDialog(overlay, opts) {
    opts = opts || {};
    const opener = document.activeElement;
    const dialog = overlay.querySelector('[role="dialog"]') || overlay;
    const others = Array.from(document.body.children).filter(function (el) { return el !== overlay && !el.inert; });
    others.forEach(function (el) { el.inert = true; });
    overlay.classList.add("is-open");
    overlay.setAttribute("aria-hidden", "false");
    const focusables = function () {
      return Array.from(dialog.querySelectorAll(FOCUSABLE)).filter(function (el) { return el.getClientRects().length; });
    };
    let closed = false;
    function close(result) {
      if (closed) return;
      closed = true;
      document.removeEventListener("keydown", onKey, true);
      overlay.removeEventListener("click", onBackdrop);
      others.forEach(function (el) { el.inert = false; });
      overlay.classList.remove("is-open");
      overlay.setAttribute("aria-hidden", "true");
      if (opts.remove) overlay.remove();
      if (opener && opener.focus && document.contains(opener)) opener.focus({ preventScroll: true });
      if (opts.onClose) opts.onClose(result);
    }
    function onKey(e) {
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(); return; }
      if (e.key !== "Tab") return;
      const f = focusables();
      if (!f.length) { e.preventDefault(); return; }
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    function onBackdrop(e) { if (e.target === overlay) close(); }
    document.addEventListener("keydown", onKey, true);
    overlay.addEventListener("click", onBackdrop);
    const target = (opts.initial && dialog.querySelector(opts.initial)) || focusables()[0];
    setTimeout(function () { if (target) target.focus({ preventScroll: true }); if (target && target.select && opts.select) target.select(); }, 30);
    return close;
  }
  function ask(message, o) {
    o = o || {};
    return new Promise(function (resolve) {
      const overlay = document.createElement("div");
      overlay.className = "modal-overlay";
      const isPrompt = o.prompt !== undefined && o.prompt !== null;
      overlay.innerHTML =
        '<div class="modal modal--ask" role="' + (isPrompt ? "dialog" : "alertdialog") + '" aria-modal="true" aria-labelledby="askMsg">' +
          '<div class="modal__body">' +
            '<p class="ask__msg" id="askMsg"></p>' +
            (isPrompt ? '<input class="inp ask__input" type="text" aria-labelledby="askMsg">' : "") +
          "</div>" +
          '<div class="modal__foot">' +
            '<button type="button" class="btn ask__cancel">' + esc(o.cancel || t("ui_cancel", "Cancel")) + "</button>" +
            '<button type="button" class="btn btn--primary ask__ok">' + esc(o.ok || t("ui_ok", "OK")) + "</button>" +
          "</div>" +
        "</div>";
      overlay.querySelector(".ask__msg").textContent = message;
      const input = overlay.querySelector(".ask__input");
      if (input) input.value = o.prompt;
      document.body.appendChild(overlay);
      let result = isPrompt ? null : false;
      const close = openDialog(overlay, {
        remove: true, initial: isPrompt ? ".ask__input" : ".ask__ok", select: isPrompt,
        onClose: function () { resolve(result); }
      });
      const ok = function () { result = isPrompt ? input.value.trim() || null : true; close(); };
      overlay.querySelector(".ask__ok").addEventListener("click", ok);
      overlay.querySelector(".ask__cancel").addEventListener("click", function () { close(); });
      if (input) input.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); ok(); } });
    });
  }
  let toastHost = null;
  function toast(msg, bad) {
    if (window.Kit && window.Kit.toast) return window.Kit.toast(msg, bad);
    if (!toastHost) { toastHost = document.createElement("div"); toastHost.className = "toast-host"; toastHost.setAttribute("aria-live", "polite"); document.body.appendChild(toastHost); }
    const el = document.createElement("div");
    el.className = "toast" + (bad ? " is-bad" : "");
    el.textContent = msg;
    toastHost.appendChild(el);
    setTimeout(function () { el.remove(); }, 2600);
  }

  // ---- Logo: play the fan-opening animation on an inline .brand-fan mark ----
  // (CSS in ui.css; the global prefers-reduced-motion rule turns it off)
  function playFan(svg, delay) {
    if (!svg) return;
    setTimeout(function () {
      svg.classList.remove("is-opening");
      void svg.getBoundingClientRect(); // restart the animation if it already ran
      svg.classList.add("is-opening");
    }, delay || 0);
  }

  // ---- Skip link: first stop for keyboard users, jumps past the header ----
  function addSkipLink() {
    const main = document.querySelector("main");
    if (!main || document.querySelector(".skip-link")) return;
    if (!main.id) main.id = "main";
    if (!main.hasAttribute("tabindex")) main.setAttribute("tabindex", "-1");
    const a = document.createElement("a");
    a.className = "skip-link";
    a.href = "#" + main.id;
    a.setAttribute("data-t", "skip_link");
    a.textContent = "Skip to content";
    document.body.insertBefore(a, document.body.firstChild);
  }

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
    openDialog: openDialog,
    confirm: function (msg, o) { return ask(msg, o); },
    prompt: function (msg, value, o) { return ask(msg, Object.assign({}, o, { prompt: value == null ? "" : String(value) })); },
    toast: toast
  };
})();
