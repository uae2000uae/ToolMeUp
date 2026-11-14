/*
  ToolMeUp • account (Google sign-in + cloud sync of saved tool data)

  Loaded by shared.js on every page once the header is ready.
  - Sign-in: Firebase Authentication, Google provider (popup).
  - Storage: Cloud Firestore (the "lite" REST SDK, no realtime listeners):
      users/{uid}             profile: name, email, photo, created, lastSeen,
                              rev: { <localStorage key>: <ms timestamp> }
      users/{uid}/data/{key}  { k: <localStorage key>, v: <string>, t: <ms> }
    Access is limited to the signed-in owner by firestore.rules.
  - What syncs: every localStorage entry the tools already write
    (toolmeup:*, toolmeup_*, tmu_*), except tab positions, this module's
    own bookkeeping and Developer Tools inputs. Tools need no changes.
  - When: on page load / sign-in (1 read of the profile doc, then only the
    entries that changed elsewhere), and local changes are pushed every 15 s
    and when the tab is hidden. If newer data was pulled in, the page reloads
    once so the tool shows it.
  - Nothing loads for visitors who never sign in: the SDK (~420 KB, ~110 KB
    gzipped) is fetched only when the account dialog opens or a previous
    session is remembered.

  Setup: paste the Firebase web-app config below (see HANDOFF.md §8). While
  it is null the account button stays hidden and the site works as before.
*/
(function () {
  "use strict";

  // Firebase web-app config (public by design; access is enforced by firestore.rules).
  const FIREBASE_CONFIG = {
    apiKey: "AIzaSyCG-SBtEESnBdCu0fkhxOp12qF6wEAW5-E",
    authDomain: "toolmeup-accounts.firebaseapp.com",
    projectId: "toolmeup-accounts",
    appId: "1:649742393423:web:4ec26c885e707ff38c4a3a"
  };

  const SDK_DIR = "vendor/firebase-13.3.0/";
  const SDK_V = "?v=1";
  const FLAG_KEY = "toolmeup:__auth";   // "1" while signed in: preload the SDK on page load
  const META_KEY = "toolmeup:__sync";   // { uid, revs:{key:rev}, hashes:{key:hash}, skipped:[], at }
  const RELOAD_KEY = "toolmeup:__syncreload"; // sessionStorage: reload guard + "restored" toast
  const MAX_BYTES = 900 * 1024;          // Firestore documents are capped at 1 MiB
  const PUSH_EVERY_MS = 15000;

  const TM = window.ToolMeUp;
  if (!TM) return;
  const t = TM.t, esc = TM.esc;

  TM.addStrings({
    acct_btn: "الحساب",
    acct_title: "حسابك",
    acct_pitch_h: "احفظ عملك على كل أجهزتك",
    acct_pitch: "سجّل الدخول بحساب Google لحفظ سجلّ الأدوات والجلسات المحفوظة والإعدادات في حسابك، واسترجاعها على أي جهاز. بدون تسجيل الدخول يبقى كل شيء في هذا المتصفح فقط.",
    acct_signin: "تسجيل الدخول بحساب Google",
    acct_loading: "جارٍ التحميل…",
    acct_privacy: "الملفات التي تعالجها لا تُرفع أبداً، ويمكنك حذف بياناتك المحفوظة في أي وقت.",
    acct_shares_h: "ستطلب Google مشاركة ملفك الأساسي فقط:",
    acct_share_name: "الاسم وصورة الملف الشخصي واللغة، لإظهار من سجّل الدخول",
    acct_share_email: "البريد الإلكتروني، لتمييز حسابك",
    acct_share_no: "لا وصول إلى Gmail أو Drive أو جهات الاتصال أو كلمة المرور",
    acct_signout: "تسجيل الخروج",
    acct_delete: "حذف بياناتي",
    acct_sync_now: "زامن الآن",
    acct_syncing: "جارٍ المزامنة…",
    acct_synced: "تمت المزامنة · {when}",
    acct_sync_err: "تعذّرت المزامنة: {msg}",
    acct_offline: "غير متصل. ستتم المزامنة عند عودة الاتصال.",
    acct_since: "عضو منذ {date}",
    acct_saved_h: "المحفوظ في حسابك",
    acct_saved_none: "لا شيء بعد. استخدم أي أداة وستُحفظ بياناتها هنا تلقائياً.",
    acct_items: "{n} عناصر",
    acct_item1: "عنصر واحد",
    acct_too_big: "كبير جداً للمزامنة: {what}",
    acct_settings: "إعدادات الموقع",
    acct_restored: "تمت استعادة بياناتك المحفوظة",
    acct_welcome: "مرحباً {name}! تتم مزامنة بياناتك الآن.",
    acct_signin_fail: "تعذّر تسجيل الدخول: {msg}",
    acct_popup_blocked: "حُظرت النافذة المنبثقة. اسمح بالنوافذ المنبثقة لهذا الموقع ثم حاول مجدداً.",
    acct_signout_q: "هل تريد أيضاً إزالة بيانات الأدوات المحفوظة من هذا المتصفح؟ ستبقى محفوظة في حسابك.",
    acct_remove: "إزالة",
    acct_keep: "إبقاء",
    acct_delete_q: "حذف كل بياناتك المحفوظة في حسابك نهائياً؟ لا يمكن التراجع عن ذلك. تبقى البيانات الموجودة في هذا المتصفح.",
    acct_deleted: "تم حذف بياناتك من الحساب",
    acct_just_now: "الآن",
    acct_close: "إغلاق"
  });

  if (!FIREBASE_CONFIG) return; // not configured: no button, no network

  // ---- Small helpers ------------------------------------------------------
  const lsGet = function (k) { try { return localStorage.getItem(k); } catch (_) { return null; } };
  const lsSet = function (k, v) { try { localStorage.setItem(k, v); return true; } catch (_) { return false; } };
  const lsDel = function (k) { try { localStorage.removeItem(k); } catch (_) { /* ignore */ } };
  const prefix = function () { return document.documentElement.getAttribute("data-root") || ""; };

  // Never uploaded: tab positions, this module's bookkeeping, and the
  // Developer Tools inputs (regex test text may hold tokens; its FAQ
  // promises that nothing leaves the device).
  const NEVER = /^toolmeup:(?:__|tab:|inputs:devtools$)/;
  function syncable(k) {
    if (!k || NEVER.test(k)) return false;
    return /^(?:toolmeup[:_]|tmu_)/.test(k);
  }
  function localKeys() {
    const out = [];
    try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (syncable(k)) out.push(k); } } catch (_) { /* blocked */ }
    return out;
  }
  // cyrb53: fast 53-bit string hash, enough to notice that a value changed.
  function hash(str) {
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0; i < str.length; i++) {
      const ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
  }
  const byteLen = function (s) { return new Blob([s]).size; };
  const docId = function (k) { return encodeURIComponent(k); };
  function loadMeta() {
    try { const m = JSON.parse(lsGet(META_KEY) || "null"); if (m && m.revs && m.hashes) return m; } catch (_) { /* ignore */ }
    return { uid: null, revs: {}, hashes: {}, skipped: [], at: 0 };
  }
  const saveMeta = function (m) { lsSet(META_KEY, JSON.stringify(m)); };

  // Same key changed here and elsewhere (typically the first sign-in on a
  // device that already has data): lists (histories, recents, sessions) are
  // unioned with this device's entries first; anything else takes the cloud copy.
  function mergeValues(localStr, cloudStr) {
    try {
      const a = JSON.parse(localStr), b = JSON.parse(cloudStr);
      if (Array.isArray(a) && Array.isArray(b)) {
        const seen = new Set(), out = [];
        a.concat(b).forEach(function (item) { const s = JSON.stringify(item); if (!seen.has(s)) { seen.add(s); out.push(item); } });
        return JSON.stringify(out);
      }
    } catch (_) { /* not JSON */ }
    return cloudStr;
  }

  // ---- Firebase (lazy) ----------------------------------------------------
  let sdkP = null, fb = null, user = null, profile = null;
  function loadSdk() {
    if (sdkP) return sdkP;
    const base = new URL(prefix() + SDK_DIR, document.baseURI).href;
    sdkP = Promise.all(["firebase-app", "firebase-auth", "firebase-firestore-lite"].map(function (n) { return import(base + n + ".js" + SDK_V); }))
      .then(function (mods) {
        const A = mods[0], Au = mods[1], F = mods[2];
        const app = A.initializeApp(FIREBASE_CONFIG);
        const auth = Au.getAuth(app);
        auth.languageCode = TM.lang();
        fb = { Au: Au, F: F, auth: auth, db: F.getFirestore(app) };
        Au.onAuthStateChanged(auth, onUser);
        return fb;
      });
    sdkP.catch(function (e) { console.warn("[account] SDK failed to load", e); sdkP = null; });
    return sdkP;
  }

  let justSignedIn = false;
  function onUser(u) {
    const was = user;
    user = u || null;
    if (user) {
      lsSet(FLAG_KEY, "1");
      sync({ pull: true, reloadOnPull: !justSignedIn, signIn: justSignedIn });
      justSignedIn = false;
    } else {
      lsDel(FLAG_KEY);
      profile = null;
      if (was) status = { s: "idle" };
    }
    renderButton();
    renderDialog();
  }

  // ---- Sync ---------------------------------------------------------------
  let syncing = false, again = null, status = { s: "idle" };
  function setStatus(s) { status = s; renderDialog(); }

  async function sync(opts) {
    opts = opts || {};
    if (!user || !fb) return;
    if (syncing) { again = opts.pull ? opts : (again || opts); return; }
    if (!navigator.onLine) { setStatus({ s: "offline" }); return; }
    syncing = true;
    if (opts.pull || opts.manual) setStatus({ s: "syncing" });
    const F = fb.F, db = fb.db, uid = user.uid;
    const pRef = F.doc(db, "users", uid);
    const dRef = function (k) { return F.doc(db, "users", uid, "data", docId(k)); };
    let pulledChange = false;
    try {
      let meta = loadMeta();
      if (meta.uid !== uid) {
        meta = { uid: uid, revs: {}, hashes: {}, skipped: [], at: 0 };
        // No baseline for this user on this device: never push blindly, or
        // local data would overwrite the account's. Compare with the cloud first.
        opts = Object.assign({}, opts, { pull: true });
      }
      let cloudRevs;
      if (opts.pull) {
        const snap = await F.getDoc(pRef);
        profile = snap.exists() ? snap.data() : null;
        cloudRevs = (profile && profile.rev) || {};
      } else {
        cloudRevs = meta.revs; // push only: assume the cloud matches what we last saw
      }

      const keys = new Set(localKeys().concat(Object.keys(cloudRevs), Object.keys(meta.revs), Object.keys(meta.hashes)));
      const pulls = [], pushes = new Set();
      keys.forEach(function (k) {
        if (!syncable(k)) return;
        const local = lsGet(k);
        const localChanged = (local === null ? null : hash(local)) !== (meta.hashes[k] || null);
        const cloudChanged = (cloudRevs[k] || 0) !== (meta.revs[k] || 0);
        if (!localChanged && !cloudChanged) return;
        if (!localChanged) pulls.push({ k: k });
        else if (!cloudChanged || !cloudRevs[k]) pushes.add(k);
        else if (local === null) pulls.push({ k: k });
        else pulls.push({ k: k, merge: true });
      });

      // Pull what changed elsewhere.
      const snaps = await Promise.all(pulls.map(function (p) { return cloudRevs[p.k] ? F.getDoc(dRef(p.k)) : Promise.resolve(null); }));
      pulls.forEach(function (p, i) {
        const k = p.k, snap = snaps[i];
        const cloud = snap && snap.exists() ? snap.data().v : null;
        const local = lsGet(k);
        if (cloud === null) { // deleted on another device
          if (local !== null) { lsDel(k); pulledChange = true; }
          delete meta.revs[k]; delete meta.hashes[k];
          return;
        }
        const next = p.merge ? mergeValues(local, cloud) : cloud;
        if (next !== local) { lsSet(k, next); pulledChange = true; }
        meta.revs[k] = cloudRevs[k];
        meta.hashes[k] = hash(next);
        if (next !== cloud) pushes.add(k); // merged list goes back up
      });

      // Push local changes (Firestore batches hold up to 500 writes).
      const list = Array.from(pushes);
      const skipped = [];
      for (let i = 0; i < list.length; i += 200) {
        const batch = F.writeBatch(db);
        const rev = Date.now();
        const revUpd = {}, done = [];
        list.slice(i, i + 200).forEach(function (k) {
          const v = lsGet(k);
          if (v === null) {
            batch.delete(dRef(k)); revUpd[k] = F.deleteField(); done.push([k, null]);
          } else if (byteLen(v) > MAX_BYTES) {
            skipped.push(k); meta.hashes[k] = hash(v); // don't retry every tick
          } else {
            batch.set(dRef(k), { k: k, v: v, t: rev }); revUpd[k] = rev; done.push([k, v]);
          }
        });
        if (!done.length) continue;
        batch.set(pRef, { rev: revUpd }, { merge: true });
        await batch.commit();
        profile = profile || {};
        profile.rev = Object.assign({}, profile.rev);
        done.forEach(function (d) {
          if (d[1] === null) { delete meta.revs[d[0]]; delete meta.hashes[d[0]]; delete profile.rev[d[0]]; }
          else { meta.revs[d[0]] = rev; meta.hashes[d[0]] = hash(d[1]); profile.rev[d[0]] = rev; }
        });
      }
      if (skipped.length || opts.pull) meta.skipped = skipped.length ? skipped : (opts.pull ? [] : meta.skipped);

      // Profile basics: written on first sign-in, then lastSeen at most daily.
      if (opts.pull) {
        const seen = profile && profile.lastSeen && profile.lastSeen.toMillis ? profile.lastSeen.toMillis() : 0;
        const p = { name: user.displayName || "", email: user.email || "", photo: user.photoURL || "" };
        const stale = !profile || !profile.created || profile.name !== p.name || profile.photo !== p.photo || Date.now() - seen > 864e5;
        if (stale) {
          const upd = Object.assign({}, p, { lastSeen: F.serverTimestamp() });
          if (!profile || !profile.created) upd.created = F.serverTimestamp();
          await F.setDoc(pRef, upd, { merge: true });
          profile = Object.assign({}, profile, p, { created: (profile && profile.created) || new Date(), lastSeen: new Date() });
        }
      }

      meta.at = Date.now();
      saveMeta(meta);
      status = { s: "ok", at: meta.at };
    } catch (e) {
      console.warn("[account] sync failed", e);
      status = { s: "error", msg: (e && (e.code || e.message)) || String(e) };
    } finally {
      syncing = false;
    }
    renderDialog();

    if (opts.signIn) TM.toast(t("acct_welcome", "Welcome, {name}! Your data now syncs.", { name: (user && user.displayName || "").split(" ")[0] || "" }));
    // Newer data arrived: reload once so the tool reads it from storage.
    if (pulledChange && (opts.reloadOnPull || opts.signIn)) {
      let last = 0;
      try { last = +sessionStorage.getItem(RELOAD_KEY) || 0; } catch (_) { /* ignore */ }
      if (Date.now() - last > 15000) {
        try { sessionStorage.setItem(RELOAD_KEY, String(Date.now())); } catch (_) { /* ignore */ }
        setTimeout(function () { location.reload(); }, opts.signIn ? 900 : 0);
        return;
      }
    }
    if (again) { const o = again; again = null; sync(o); }
  }

  function pushSoon() { if (user && fb) sync({ pull: false }); }
  setInterval(function () { if (!document.hidden) pushSoon(); }, PUSH_EVERY_MS);
  document.addEventListener("visibilitychange", function () { if (document.hidden) pushSoon(); });
  window.addEventListener("pagehide", pushSoon);
  window.addEventListener("online", function () { if (user && fb) sync({ pull: true }); });

  // ---- Actions ------------------------------------------------------------
  async function signIn() {
    try {
      const f = await loadSdk();
      f.auth.languageCode = TM.lang();
      justSignedIn = true;
      const provider = new f.Au.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      await f.Au.signInWithPopup(f.auth, provider);
    } catch (e) {
      justSignedIn = false;
      const code = (e && e.code) || "";
      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") return;
      TM.toast(code === "auth/popup-blocked" ? t("acct_popup_blocked", "The sign-in popup was blocked. Allow popups for this site and try again.")
        : t("acct_signin_fail", "Couldn't sign in: {msg}", { msg: code || (e && e.message) || "error" }), true);
    }
  }

  async function signOut() {
    if (!fb) return;
    await sync({ pull: false });
    const wipe = await TM.confirm(t("acct_signout_q", "Also remove the tools' saved data from this browser? It stays saved in your account."),
      { ok: t("acct_remove", "Remove"), cancel: t("acct_keep", "Keep") });
    await fb.Au.signOut(fb.auth);
    lsDel(META_KEY);
    if (wipe) { localKeys().forEach(lsDel); location.reload(); }
  }

  async function deleteCloudData() {
    if (!user || !fb) return;
    const ok = await TM.confirm(t("acct_delete_q", "Permanently delete all the data saved in your account? This can't be undone. Data in this browser stays."),
      { ok: t("acct_delete", "Delete my data") });
    if (!ok) return;
    const F = fb.F, db = fb.db, uid = user.uid;
    try {
      const all = await F.getDocs(F.collection(db, "users", uid, "data"));
      const refs = all.docs.map(function (d) { return d.ref; });
      for (let i = 0; i < refs.length; i += 400) {
        const b = F.writeBatch(db);
        refs.slice(i, i + 400).forEach(function (r) { b.delete(r); });
        await b.commit();
      }
      await F.deleteDoc(F.doc(db, "users", uid));
      lsDel(META_KEY);
      await fb.Au.signOut(fb.auth);
      TM.toast(t("acct_deleted", "Your account data was deleted"));
    } catch (e) {
      TM.toast(t("acct_sync_err", "Sync failed: {msg}", { msg: (e && (e.code || e.message)) || "error" }), true);
    }
  }

  // ---- UI -----------------------------------------------------------------
  const PERSON = '<svg class="qi acct-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0116 0"/></svg>';
  const CHECK = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  const CROSS = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M7 7l10 10M17 7L7 17"/></svg>';
  const GOOGLE_G = '<svg viewBox="0 0 48 48" width="18" height="18" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>';

  let btn = null, overlay = null, closeDlg = null;

  function avatarHtml(cls) {
    if (user && user.photoURL) return '<img class="' + cls + '" src="' + esc(user.photoURL) + '" alt="" referrerpolicy="no-referrer">';
    const ch = ((user && (user.displayName || user.email)) || "?").trim().charAt(0).toUpperCase();
    return '<span class="' + cls + ' acct-initial" aria-hidden="true">' + esc(ch) + "</span>";
  }

  function renderButton() {
    if (!btn) return;
    btn.hidden = false;
    btn.classList.toggle("is-signed-in", !!user);
    btn.innerHTML = user ? avatarHtml("acct-avatar") : PERSON;
    const label = user ? (user.displayName || user.email || t("acct_btn", "Account")) : t("acct_btn", "Account");
    btn.setAttribute("aria-label", label);
    btn.title = label;
  }

  const SHORT = { calc: "calculators", dt: "datetime", dev: "devtools", img: "images", inputs: null };
  function keyTool(k) {
    if (/^tmu_|^toolmeup_report/.test(k)) return "fitment";
    const parts = k.replace(/^toolmeup:/, "").split(":");
    let id = parts[0] === "inputs" ? parts[1] : parts[0];
    if (SHORT[id]) id = SHORT[id];
    return TM.tools.some(function (x) { return x.id === id; }) ? id : null;
  }
  function fmtDate(ms, withTime) {
    try {
      return new Date(ms).toLocaleString(TM.lang() === "ar" ? "ar-u-nu-latn" : undefined,
        withTime ? { dateStyle: "medium", timeStyle: "short" } : { dateStyle: "medium" });
    } catch (_) { return new Date(ms).toDateString(); }
  }
  function ago(ms) {
    const s = Math.round((Date.now() - ms) / 1000);
    if (s < 45) return t("acct_just_now", "just now");
    try {
      const rtf = new Intl.RelativeTimeFormat(TM.lang() === "ar" ? "ar-u-nu-latn" : undefined, { numeric: "auto" });
      if (s < 3600) return rtf.format(-Math.round(s / 60), "minute");
      if (s < 86400) return rtf.format(-Math.round(s / 3600), "hour");
      return rtf.format(-Math.round(s / 86400), "day");
    } catch (_) { return fmtDate(ms, true); }
  }

  function savedRows() {
    const revs = (profile && profile.rev) || loadMeta().revs || {};
    const groups = {};
    Object.keys(revs).forEach(function (k) {
      if (!syncable(k)) return;
      const id = keyTool(k) || "_settings";
      const g = groups[id] || (groups[id] = { id: id, at: 0, items: 0 });
      g.at = Math.max(g.at, revs[k] || 0);
      try { const v = JSON.parse(lsGet(k)); if (Array.isArray(v)) g.items += v.length; } catch (_) { /* ignore */ }
    });
    return Object.keys(groups).map(function (id) { return groups[id]; }).sort(function (a, b) { return b.at - a.at; });
  }

  function statusHtml() {
    if (status.s === "syncing") return '<span class="acct-status is-busy">' + esc(t("acct_syncing", "Syncing…")) + "</span>";
    if (status.s === "offline") return '<span class="acct-status is-warn">' + esc(t("acct_offline", "Offline. Changes will sync when you're back online.")) + "</span>";
    if (status.s === "error") return '<span class="acct-status is-bad">' + esc(t("acct_sync_err", "Sync failed: {msg}", { msg: status.msg })) + "</span>";
    if (status.s === "ok") return '<span class="acct-status is-ok">' + esc(t("acct_synced", "Synced · {when}", { when: ago(status.at) })) + "</span>";
    return "";
  }

  function bodyHtml() {
    if (!user) {
      const ready = !!fb;
      return '<div class="acct-pitch">' +
          '<div class="acct-pitch__icon">' + PERSON + "</div>" +
          '<h3 class="acct-pitch__h">' + esc(t("acct_pitch_h", "Keep your work on every device")) + "</h3>" +
          '<p class="acct-pitch__p">' + esc(t("acct_pitch", "Sign in with Google to keep your tool history, saved sessions and settings in your account and get them back on any device. Without signing in, everything stays in this browser only.")) + "</p>" +
          '<button type="button" class="btn acct-google" data-act="signin"' + (ready ? "" : " disabled") + ">" + GOOGLE_G +
            "<span>" + esc(ready ? t("acct_signin", "Sign in with Google") : t("acct_loading", "Loading…")) + "</span></button>" +
          '<div class="acct-shares">' +
            '<p class="acct-shares__h">' + esc(t("acct_shares_h", "Google will ask to share only your basic profile:")) + "</p>" +
            '<ul class="acct-shares__list">' +
              '<li class="is-yes">' + CHECK + "<span>" + esc(t("acct_share_name", "Name, profile picture and language, to show who's signed in")) + "</span></li>" +
              '<li class="is-yes">' + CHECK + "<span>" + esc(t("acct_share_email", "Email address, to identify your account")) + "</span></li>" +
              '<li class="is-no">' + CROSS + "<span>" + esc(t("acct_share_no", "No access to your Gmail, Drive, contacts or password")) + "</span></li>" +
            "</ul>" +
          "</div>" +
          '<p class="acct-fine">' + esc(t("acct_privacy", "Files you process are never uploaded. You can delete your saved data at any time.")) + "</p>" +
        "</div>";
    }
    const created = profile && profile.created ? (profile.created.toMillis ? profile.created.toMillis() : +new Date(profile.created)) : 0;
    const rows = savedRows();
    const skipped = loadMeta().skipped || [];
    const toolName = function (id) {
      if (id === "_settings") return t("acct_settings", "Site settings");
      const x = TM.tools.find(function (tt) { return tt.id === id; });
      return x ? (TM.lang() === "ar" ? x.ar : x.en).title : id;
    };
    return '<div class="acct-who">' + avatarHtml("acct-who__pic") +
        '<div class="acct-who__txt"><b>' + esc(user.displayName || "") + "</b><span>" + esc(user.email || "") + "</span>" +
        (created ? '<span class="acct-fine">' + esc(t("acct_since", "Member since {date}", { date: fmtDate(created) })) + "</span>" : "") +
        "</div></div>" +
      '<div class="acct-syncline">' + statusHtml() +
        '<button type="button" class="btn btn--sm" data-act="sync"' + (status.s === "syncing" ? " disabled" : "") + ">" + esc(t("acct_sync_now", "Sync now")) + "</button></div>" +
      '<h3 class="acct-h">' + esc(t("acct_saved_h", "Saved in your account")) + "</h3>" +
      (rows.length
        ? '<ul class="acct-list">' + rows.map(function (r) {
            const x = TM.tools.find(function (tt) { return tt.id === r.id; });
            const icon = x ? TM.icon(x.icon, 18) : "";
            const href = x ? prefix() + x.href : null;
            const name = esc(toolName(r.id));
            return '<li class="acct-row">' + '<span class="acct-row__icon">' + icon + "</span>" +
              '<span class="acct-row__name">' + (href ? '<a href="' + esc(href) + '">' + name + "</a>" : name) +
              (r.items ? '<small>' + esc(r.items === 1 ? t("acct_item1", "1 item") : t("acct_items", "{n} items", { n: r.items })) + "</small>" : "") + "</span>" +
              '<time class="acct-row__at">' + esc(r.at ? fmtDate(r.at, true) : "") + "</time></li>";
          }).join("") + "</ul>"
        : '<p class="acct-fine">' + esc(t("acct_saved_none", "Nothing yet. Use any tool and what it saves will show up here automatically.")) + "</p>") +
      (skipped.length ? '<p class="acct-fine is-warn">' + esc(t("acct_too_big", "Too large to sync: {what}", { what: skipped.join(", ") })) + "</p>" : "");
  }

  function footHtml() {
    if (!user) return "";
    return '<button type="button" class="btn btn--ghost acct-danger" data-act="delete">' + esc(t("acct_delete", "Delete my data")) + "</button>" +
      '<button type="button" class="btn" data-act="signout">' + esc(t("acct_signout", "Sign out")) + "</button>";
  }

  function renderDialog() {
    if (!overlay || !overlay.classList.contains("is-open")) return;
    const had = document.activeElement && overlay.contains(document.activeElement) ? document.activeElement.getAttribute("data-act") : null;
    overlay.querySelector(".modal__body").innerHTML = bodyHtml();
    const foot = overlay.querySelector(".modal__foot");
    foot.innerHTML = footHtml();
    foot.hidden = !user;
    const back = had && overlay.querySelector('[data-act="' + had + '"]:not([disabled])');
    if (back) back.focus({ preventScroll: true });
    else if (had) { const s = overlay.querySelector('[data-act]:not([disabled])') || overlay.querySelector(".modal__close"); if (s) s.focus({ preventScroll: true }); }
  }

  function openAccount() {
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.className = "modal-overlay acct-overlay";
      overlay.setAttribute("aria-hidden", "true");
      overlay.innerHTML =
        '<div class="modal acct-modal" role="dialog" aria-modal="true" aria-labelledby="acctTitle">' +
          '<div class="modal__head"><h2 class="modal__title" id="acctTitle"></h2>' +
          '<button type="button" class="modal__close" aria-label="Close">&times;</button></div>' +
          '<div class="modal__body"></div><div class="modal__foot"></div>' +
        "</div>";
      document.body.appendChild(overlay);
      overlay.addEventListener("click", function (e) {
        const b = e.target.closest("[data-act]");
        if (!b || b.disabled) return;
        const act = b.getAttribute("data-act");
        if (act === "signin") signIn();
        else if (act === "sync") sync({ pull: true, manual: true, reloadOnPull: true });
        else if (act === "signout") { if (closeDlg) closeDlg(); signOut(); }
        else if (act === "delete") { if (closeDlg) closeDlg(); deleteCloudData(); }
      });
      overlay.querySelector(".modal__close").addEventListener("click", function () { if (closeDlg) closeDlg(); });
    }
    overlay.querySelector("#acctTitle").textContent = t("acct_title", "Your account");
    overlay.querySelector(".modal__close").setAttribute("aria-label", t("acct_close", "Close"));
    overlay.classList.add("is-open"); // so renderDialog fills it before focus moves in
    renderDialog();
    closeDlg = TM.openDialog(overlay, { initial: user ? ".modal__close" : '[data-act="signin"]', onClose: function () { closeDlg = null; } });
    if (!fb) loadSdk().then(function () { renderDialog(); const s = overlay.querySelector('[data-act="signin"]'); if (s && overlay.contains(document.activeElement) && document.activeElement.classList.contains("modal__close")) s.focus(); })
      .catch(function () { TM.toast(t("acct_signin_fail", "Couldn't sign in: {msg}", { msg: "offline" }), true); });
  }

  function mountButton() {
    btn = document.getElementById("accountBtn");
    if (!btn) return;
    if (!btn.dataset.wired) {
      btn.dataset.wired = "1";
      btn.addEventListener("click", openAccount);
    }
    renderButton();
  }

  function init() {
    mountButton();
    // A remembered session: load the SDK now so sync runs on every page.
    if (lsGet(FLAG_KEY) === "1") loadSdk();
    let reloaded = 0;
    try { reloaded = +sessionStorage.getItem(RELOAD_KEY) || 0; } catch (_) { /* ignore */ }
    if (reloaded && Date.now() - reloaded < 15000) setTimeout(function () { TM.toast(t("acct_restored", "Your saved data was restored")); }, 400);
  }
  document.addEventListener("toolmeup:langchange", function () { renderButton(); if (overlay && overlay.classList.contains("is-open")) { overlay.querySelector("#acctTitle").textContent = t("acct_title", "Your account"); renderDialog(); } });
  init();
})();
