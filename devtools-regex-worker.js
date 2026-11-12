/*
  ToolMeUp • regex worker for devtools.html
  Runs the user's pattern off the main thread so a catastrophic pattern
  can be killed (the page terminates this worker after a timeout).
*/
"use strict";
self.onmessage = function (e) {
  const d = e.data;
  let re;
  try {
    re = new RegExp(d.pat, d.flags);
  } catch (err) {
    self.postMessage({ error: String(err.message || err) });
    return;
  }
  const out = [];
  const MAX = 2000;
  if (d.pat !== "") {
    if (re.global || re.sticky) {
      let m;
      re.lastIndex = 0;
      while ((m = re.exec(d.text)) !== null && out.length < MAX) {
        out.push({ i: m.index, s: m[0], g: m.slice(1), n: m.groups || null });
        if (m[0] === "") re.lastIndex++; // avoid infinite loop on empty matches
      }
    } else {
      const m = re.exec(d.text);
      if (m) out.push({ i: m.index, s: m[0], g: m.slice(1), n: m.groups || null });
    }
  }
  let replaced = null;
  if (d.rep !== null && d.pat !== "") {
    try { replaced = d.text.replace(re, d.rep); } catch (_) { replaced = null; }
  }
  self.postMessage({ matches: out, capped: out.length >= MAX, replaced: replaced });
};
