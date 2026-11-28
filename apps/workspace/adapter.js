/* SCS Workspace / Quotation — পেজের মাপ বদলালে (A4 / Letter / Legal) সেই মাপের প্যাড নিজে থেকেই বসে */
(function () {
  function padKind(p) {
    if (!p) return '';
    if (/^(a4|letter|legal)$/.test(p.size)) return p.size;
    var n = String(p.name || '');
    return /letter/i.test(n) ? 'letter' : /legal/i.test(n) ? 'legal' : /a4/i.test(n) ? 'a4' : '';
  }
  // অ্যাপের নিজের হ্যান্ডলারের আগে (capture) — প্যাড বদলে দিই, তারপর অ্যাপ পেজের মাপ বসায়
  document.addEventListener('change', function (e) {
    var t = e.target;
    if (!t || t.id !== 'pgSel' || typeof S === 'undefined' || !S.doc || S.ro) return;
    var want = t.value; if (!want) return;
    var pads = (S.cfg && S.cfg.pads) || [], cur = S.doc.pad == null ? 0 : S.doc.pad;
    if (cur < 0 || padKind(pads[cur]) === want) return;          // লেটারহেড ছাড়া বা আগেই মিলে আছে
    for (var i = 0; i < pads.length; i++) if (padKind(pads[i]) === want) { S.doc.pad = i; break; }
  }, true);
})();
