/*
  ToolMeUp • Image Compressor & Resizer
  Decode with createImageBitmap (honours EXIF orientation), draw to a
  canvas at the target size, re-encode with canvas.toBlob. Batch, ZIP via
  vendored JSZip. Nothing leaves the browser.
*/
(function () {
  "use strict";
  const TM = window.ToolMeUp, K = window.Kit, t = TM.t, $ = (id) => document.getElementById(id), esc = TM.esc;

  TM.addStrings({
    i_title: "ضغط الصور وتغيير حجمها",
    i_lead: "صغّر الصور للبريد الإلكتروني والمواقع وتطبيقات المراسلة. تتم معالجة صورك على هذا الجهاز ولا تُرفع أبداً.",
    i_drop_t: "أفلت الصور هنا", i_drop_s: "أو اضغط للاختيار · يمكنك أيضاً اللصق (Ctrl+V) · JPG و PNG و WebP و GIF و AVIF",
    i_images: "الصور", i_before: "قبل", i_after: "بعد", i_saved: "التوفير", i_zip: "تنزيل الكل (ZIP)",
    i_settings: "الإعدادات", i_format: "صيغة الإخراج", i_same: "نفس الصيغة", i_quality: "الجودة", i_smaller: "حجم أصغر", i_better: "جودة أفضل",
    i_resize: "تغيير الحجم", i_none: "الحجم الأصلي", i_maxside: "حد أقصى", i_maxw: "أقصى عرض", i_maxh: "أقصى ارتفاع", i_email: "بريد", i_scale: "النسبة",
    i_meta_note: "تتم إعادة ترميز الصور، وهذا يزيل أيضاً البيانات الوصفية المخفية مثل موقع GPS.",
    i_working: "جارٍ المعالجة…", i_kept: "تم الإبقاء على الأصل", i_failed: "تعذّرت قراءة هذه الصورة", i_compare: "مقارنة", i_remove: "إزالة",
    i_not_image: "تم تجاهل {n} ملف ليس صورة",
    i_how1: "أفلت صورة أو أكثر (أو الصق لقطة شاشة). يتم ضغطها فوراً بالإعدادات الظاهرة على الجانب.",
    i_how2: "عدّل الجودة والصيغة والحجم — تتحدّث كل الصور. اضغط على الصورة المصغّرة للمقارنة قبل/بعد بمؤشر سحب.",
    i_how3: "نزّل الصور واحدة تلو الأخرى، أو كلها دفعة واحدة في ملف ZIP.",
    i_faq1_q: "أي صيغة أختار؟",
    i_faq1_a: "WebP يعطي أصغر حجم مع دعم كل المتصفحات الحديثة — ممتاز للمواقع. JPG الأفضل للتوافق (البريد والتطبيقات القديمة). PNG يحافظ على الحواف الحادة والشفافية لكنه كبير للصور الفوتوغرافية. AVIF أصغر من WebP حيثما كان مدعوماً.",
    i_faq2_q: "لماذا أصبحت إحدى الصور أكبر؟",
    i_faq2_a: "الصور المضغوطة جيداً مسبقاً (أو لقطات PNG المحوّلة إلى JPG بجودة عالية) قد يزيد حجمها. عندها يتم الإبقاء على الأصل تلقائياً مع وسمه «تم الإبقاء على الأصل»."
  });

  const EXT = { "image/jpeg": "jpg", "image/webp": "webp", "image/png": "png", "image/avif": "avif" };
  const S = Object.assign({ fmt: "same", q: 80, rmode: "none", mw: 1920, mh: 1920, pct: 50 }, K.load("img:settings", {}));
  let items = [], seq = 0, queue = Promise.resolve();

  function targetType(file) {
    if (S.fmt !== "same") return S.fmt;
    return EXT[file.type] && file.type !== "image/avif" ? file.type : "image/webp"; // GIF/BMP/HEIC → WebP
  }
  function targetSize(w, h) {
    if (S.rmode === "pct") return [Math.max(1, Math.round(w * S.pct / 100)), Math.max(1, Math.round(h * S.pct / 100))];
    if (S.rmode === "max") {
      const k = Math.min(1, (S.mw || w) / w, (S.mh || h) / h);
      return [Math.max(1, Math.round(w * k)), Math.max(1, Math.round(h * k))];
    }
    return [w, h];
  }
  function encode(bmp, w, h, type) {
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const ctx = c.getContext("2d");
    if (type === "image/jpeg") { ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, w, h); } // JPG has no transparency
    ctx.imageSmoothingQuality = "high";
    // Downscale in halving steps for sharper results on big reductions.
    let src = bmp, sw = bmp.width, sh = bmp.height;
    while (sw / 2 > w && sh / 2 > h) {
      const tmp = document.createElement("canvas");
      tmp.width = Math.round(sw / 2); tmp.height = Math.round(sh / 2);
      const tc = tmp.getContext("2d"); tc.imageSmoothingQuality = "high"; tc.drawImage(src, 0, 0, tmp.width, tmp.height);
      src = tmp; sw = tmp.width; sh = tmp.height;
    }
    ctx.drawImage(src, 0, 0, w, h);
    return new Promise((res) => c.toBlob(res, type, S.q / 100));
  }
  async function process(it) {
    const my = ++it.run;
    it.state = "working"; draw(it);
    try {
      if (!it.bmp) it.bmp = await createImageBitmap(it.file);
      const [w, h] = targetSize(it.bmp.width, it.bmp.height);
      const type = targetType(it.file);
      let blob = await encode(it.bmp, w, h, type);
      if (my !== it.run) return;
      it.kept = false;
      // Same format and size but bigger? Keep the original bytes.
      if (blob && blob.size >= it.file.size && type === it.file.type && w === it.bmp.width && h === it.bmp.height) { blob = it.file; it.kept = true; }
      if (!blob) throw new Error("encode");
      if (it.url) URL.revokeObjectURL(it.url);
      it.out = blob; it.url = URL.createObjectURL(blob); it.w = w; it.h = h; it.type = blob.type || type;
      it.state = "done";
    } catch (_) { it.state = "failed"; }
    draw(it); summary();
  }
  function outName(it) {
    const base = it.file.name.replace(/\.[^.]+$/, "");
    return it.kept ? it.file.name : base + "-min." + (EXT[it.type] || "img");
  }
  function draw(it) {
    let li = document.querySelector('[data-id="' + it.id + '"]');
    if (!li) {
      li = document.createElement("li");
      li.className = "img-item"; li.dataset.id = it.id;
      $("i_list").appendChild(li);
    }
    const saved = it.out ? 1 - it.out.size / it.file.size : 0;
    li.classList.toggle("is-working", it.state === "working");
    li.innerHTML =
      '<button type="button" class="img-thumb" data-act="cmp" aria-label="' + esc(t("i_compare", "Compare")) + '">' +
        (it.url ? '<img src="' + it.url + '" alt="">' : "") + (it.state === "working" ? '<span class="spinner"></span>' : "") + "</button>" +
      '<div class="img-info"><b title="' + esc(it.file.name) + '">' + esc(it.file.name) + "</b>" +
        '<span class="muted small2" dir="ltr">' + (it.bmp ? it.bmp.width + "×" + it.bmp.height + (it.w && (it.w !== it.bmp.width || it.h !== it.bmp.height) ? " → " + it.w + "×" + it.h : "") : "") + "</span>" +
        '<span class="small2"><span class="muted">' + K.bytes(it.file.size) + "</span>" +
          (it.state === "done" ? " → <b>" + K.bytes(it.out.size) + "</b>" : it.state === "working" ? " · " + esc(t("i_working", "Working…")) : it.state === "failed" ? ' · <span class="down">' + esc(t("i_failed", "Couldn't read this image")) + "</span>" : "") +
        "</span></div>" +
      '<div class="img-badge ' + (it.kept ? "is-kept" : saved > 0 ? "up" : "down") + '">' + (it.state === "done" ? (it.kept ? esc(t("i_kept", "Kept original")) : (saved > 0 ? "−" : "+") + Math.abs(Math.round(saved * 100)) + "%") : "") + "</div>" +
      '<div class="img-acts">' +
        (it.state === "done" ? '<button type="button" class="icon-btn" data-act="dl" aria-label="Download">' + TM.icon("M12 4v12m0 0l-4-4m4 4l4-4M4 20h16", 18) + "</button>" : "") +
        '<button type="button" class="icon-btn" data-act="rm" aria-label="' + esc(t("i_remove", "Remove")) + '">' + TM.icon("M6 6l12 12M18 6L6 18", 18) + "</button></div>";
  }
  function summary() {
    const done = items.filter((x) => x.state === "done");
    $("i_summary").hidden = !items.length;
    const before = done.reduce((s, x) => s + x.file.size, 0), after = done.reduce((s, x) => s + x.out.size, 0);
    $("i_count").textContent = items.length;
    $("i_before").textContent = done.length ? K.bytes(before) : "—";
    $("i_after").textContent = done.length ? K.bytes(after) : "—";
    const p = before ? Math.round((1 - after / before) * 100) : 0;
    $("i_saved").textContent = done.length ? (p >= 0 ? "−" : "+") + Math.abs(p) + "%" : "—";
    $("i_saved").className = p >= 0 ? "up" : "down";
    $("i_zip").disabled = !done.length;
  }
  function addFiles(files) {
    const imgs = files.filter((f) => /^image\//.test(f.type));
    if (imgs.length < files.length) K.toast(t("i_not_image", "{n} non-image file(s) skipped", { n: files.length - imgs.length }), true);
    imgs.forEach((f) => {
      const it = { id: ++seq, file: f, run: 0, state: "queued" };
      items.push(it); draw(it);
      queue = queue.then(() => process(it));
    });
    summary();
  }
  const reprocess = K.debounce(() => { items.forEach((it) => { queue = queue.then(() => process(it)); }); }, 250);

  function syncSettings() {
    const pills = (id, attr, val) => $(id).querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.getAttribute(attr) === String(val))));
    pills("i_fmt", "data-f", S.fmt); pills("i_rmode", "data-r", S.rmode);
    $("i_q").value = S.q; $("i_q_v").textContent = S.q;
    $("i_q_wrap").hidden = S.fmt === "image/png";
    $("i_max_wrap").hidden = $("i_presets").hidden = S.rmode !== "max";
    $("i_pct_wrap").hidden = S.rmode !== "pct";
    $("i_mw").value = S.mw; $("i_mh").value = S.mh; $("i_pct").value = S.pct; $("i_pct_v").textContent = S.pct + "%";
    K.save("img:settings", S);
  }
  const change = () => { syncSettings(); reprocess(); };

  // ---- Before/after compare -------------------------------------------------------
  let origUrl = null;
  function openCompare(it) {
    if (!it.url) return;
    if (origUrl) URL.revokeObjectURL(origUrl);
    origUrl = URL.createObjectURL(it.file);
    $("i_cmp_a").src = origUrl; $("i_cmp_b").src = it.url;
    $("i_cmp_name").textContent = it.file.name + " · " + K.bytes(it.file.size) + " → " + K.bytes(it.out.size);
    $("i_cmp_range").value = 50; setCut(50);
    $("i_cmp").showModal();
  }
  function setCut(p) {
    $("i_cmp_clip").style.clipPath = "inset(0 0 0 " + p + "%)";
    $("i_cmp_handle").style.left = p + "%";
  }

  K.ready(() => {
    const canAvif = document.createElement("canvas").toDataURL("image/avif").indexOf("image/avif") !== -1;
    $("i_avif").hidden = !canAvif;
    if (!canAvif && S.fmt === "image/avif") S.fmt = "image/webp";
    K.drop($("i_drop"), addFiles);
    $("i_fmt").addEventListener("click", (e) => { const b = e.target.closest("[data-f]"); if (b) { S.fmt = b.dataset.f; change(); } });
    $("i_rmode").addEventListener("click", (e) => { const b = e.target.closest("[data-r]"); if (b) { S.rmode = b.dataset.r; change(); } });
    $("i_presets").addEventListener("click", (e) => { const b = e.target.closest("[data-p]"); if (b) { S.mw = S.mh = +b.dataset.p; change(); } });
    $("i_q").addEventListener("input", () => { S.q = +$("i_q").value; change(); });
    $("i_pct").addEventListener("input", () => { S.pct = +$("i_pct").value; change(); });
    $("i_mw").addEventListener("input", () => { S.mw = parseInt($("i_mw").value, 10) || 0; change(); });
    $("i_mh").addEventListener("input", () => { S.mh = parseInt($("i_mh").value, 10) || 0; change(); });
    $("i_list").addEventListener("click", (e) => {
      const b = e.target.closest("[data-act]");
      if (!b) return;
      const it = items.find((x) => x.id === +b.closest("[data-id]").dataset.id);
      if (!it) return;
      if (b.dataset.act === "dl" && it.out) K.download(it.out, outName(it));
      else if (b.dataset.act === "cmp") openCompare(it);
      else if (b.dataset.act === "rm") {
        it.run++; if (it.url) URL.revokeObjectURL(it.url); if (it.bmp && it.bmp.close) it.bmp.close();
        items = items.filter((x) => x !== it);
        b.closest("li").remove(); summary();
      }
    });
    $("i_clear").addEventListener("click", () => {
      items.forEach((it) => { it.run++; if (it.url) URL.revokeObjectURL(it.url); if (it.bmp && it.bmp.close) it.bmp.close(); });
      items = []; $("i_list").innerHTML = ""; summary();
    });
    $("i_zip").addEventListener("click", async () => {
      const zip = new window.JSZip(), used = {};
      items.filter((x) => x.state === "done").forEach((it) => {
        let n = outName(it);
        if (used[n]) n = n.replace(/(\.[^.]+)$/, "-" + (++used[n]) + "$1"); else used[n] = 1;
        zip.file(n, it.out);
      });
      const blob = await zip.generateAsync({ type: "blob" });
      K.download(blob, "images-" + new Date().toISOString().slice(0, 10) + ".zip");
    });
    $("i_cmp_range").addEventListener("input", () => setCut(+$("i_cmp_range").value));
    $("i_cmp_stage").addEventListener("pointermove", (e) => {
      if (!(e.buttons & 1) && e.pointerType === "mouse") return;
      const r = $("i_cmp_stage").getBoundingClientRect();
      const p = Math.min(100, Math.max(0, ((e.clientX - r.left) / r.width) * 100));
      $("i_cmp_range").value = p; setCut(p);
    });
    $("i_cmp_close").addEventListener("click", () => $("i_cmp").close());
    $("i_cmp").addEventListener("click", (e) => { if (e.target === $("i_cmp")) $("i_cmp").close(); });
    K.onLang(() => { items.forEach(draw); });
    syncSettings();
  });
})();
