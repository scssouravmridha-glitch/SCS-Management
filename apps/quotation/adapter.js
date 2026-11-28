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

/* =====================================================================
 *  পেজের মার্জিন — লাইভ (v15.2)
 *  - টুলবারের ⇱ বাটন এখন একটা প্যানেল খোলে: উপরের, নিচের, পাশের মার্জিন আর প্রতি পেজে লেখা কোথা থেকে শুরু
 *  - মান বদলালেই পেজ সাথে সাথে নতুন মাপে সাজে (সেভ চাপতে হয় না, "ঠিক আছে" চাপলে কাজটা ইতিহাসে যায়)
 *  - Admin > পেজ সেটিংসের মার্জিন সেভ করলে খোলা কোটেশনেও সেটাই বসে
 * ===================================================================== */
(function () {
  if (typeof DO === 'undefined' || typeof S === 'undefined') return;
  var MM = 96 / 25.4;                       // ১ মিমি = কত px
  var toMM = function (px) { return Math.round((px || 0) / MM * 10) / 10; };
  var toPX = function (mm) { return Math.max(0, Math.round((Number(mm) || 0) * MM)); };
  var bn = function () { return S.lang === 'bn'; };
  var LL = function (en, b) { return bn() ? b : en; };
  var raf = 0, tmo = 0;
  function redraw() {
    var run = function () { cancelAnimationFrame(raf); clearTimeout(tmo); raf = tmo = 0; try { refresh({ noProps: true }); } catch (e) {} };
    cancelAnimationFrame(raf); clearTimeout(tmo);
    raf = requestAnimationFrame(run); tmo = setTimeout(run, 60);   // পরের ফ্রেমে; ট্যাব আড়ালে থাকলেও
  }

  var css = document.createElement('style');
  css.textContent =
    '.mgp{position:fixed;right:14px;top:84px;z-index:350;width:300px;max-width:calc(100vw - 20px);max-height:calc(100vh - 100px);overflow:auto;background:#fff;color:#0f172a;border:1px solid #f3c4d8;border-radius:18px;box-shadow:0 18px 50px rgba(15,23,42,.22);padding:14px;font-size:13px}' +
    'body.dark .mgp{background:#111827;color:#e5e7eb;border-color:#374151}' +
    '.mgp h4{margin:0 0 2px;font-size:15px}.mgp .mu{color:#64748b;font-size:11.5px;margin:0 0 10px}' +
    '.mgp .r{display:flex;align-items:center;gap:6px;margin:7px 0}.mgp .r>span{flex:1;font-weight:700}' +
    '.mgp .r button{width:30px;height:30px;border-radius:9px;border:1px solid #e5e7eb;background:#f8fafc;font-weight:800;cursor:pointer;color:inherit}' +
    'body.dark .mgp .r button{background:#1f2937;border-color:#374151}' +
    '.mgp .r input{width:66px;height:30px;text-align:center;border:1px solid #e5e7eb;border-radius:9px;font:inherit;font-weight:700;background:transparent;color:inherit}' +
    '.mgp .r small{width:26px;color:#64748b}' +
    '.mgp .sec{border-top:1px solid #f1f5f9;margin-top:10px;padding-top:8px}' +
    '.mgp .ft{display:flex;gap:6px;flex-wrap:wrap;margin-top:12px}.mgp .ft button{flex:1;min-width:80px;border:0;border-radius:10px;padding:9px;font-weight:700;cursor:pointer;background:#f1f5f9;color:#0f172a}' +
    '.mgp .ft .pk{background:#e91e63;color:#fff}' +
    '#pages .guide{transition:top .12s ease}';
  document.head.appendChild(css);

  var box = null, before = null;
  function close(keep) {
    if (!box) return;
    if (!keep && before) { S.doc.m = before.m; S.doc.pageTop = before.pt; redraw(); }
    else if (keep && before && JSON.stringify(before) !== JSON.stringify({ m: S.doc.m, pt: S.doc.pageTop || {} })) { try { commit(); } catch (e) {} }
    box.remove(); box = null; before = null;
  }
  function row(key, label, mm) {
    return '<div class="r"><span>' + label + '</span><button type="button" data-st="' + key + '|-1">−</button><input data-k="' + key + '" type="number" step="0.5" min="0" max="150" value="' + mm + '"><button type="button" data-st="' + key + '|1">+</button><small>mm</small></div>';
  }
  function render() {
    var d = S.doc, n = S.pageCount || 1, pt = d.pageTop || {}, h = '';
    h += '<h4>📐 ' + LL('Page margins', 'পেজের মার্জিন') + '</h4><p class="mu">' + LL('Changes show on the page at once.', 'বদলালেই পেজে সাথে সাথে দেখাবে।') + '</p>';
    h += row('t', LL('Top', 'উপরে'), toMM(d.m.t)) + row('b', LL('Bottom', 'নিচে'), toMM(d.m.b)) + row('s', LL('Left & right', 'দুই পাশে'), toMM(d.m.s));
    h += '<div class="sec"><b>' + LL('Text starts lower on a page', 'কোনো পেজে লেখা আরো নিচ থেকে শুরু') + '</b><p class="mu">' + LL('Extra space under the top margin (0 = none).', 'উপরের মার্জিনের নিচে বাড়তি ফাঁকা (0 = নেই)।') + '</p>';
    h += row('all', LL('All pages', 'সব পেজ'), '');
    for (var i = 0; i < n; i++) h += row('p' + i, LL('Page ', 'পেজ ') + (i + 1), toMM(pt[i] || 0));
    h += '</div><div class="ft"><button type="button" data-a="def">↺ ' + LL('Default', 'ডিফল্ট') + '</button><button type="button" data-a="x">' + LL('Cancel', 'বাতিল') + '</button><button type="button" class="pk" data-a="ok">✓ ' + LL('Done', 'ঠিক আছে') + '</button></div>';
    box.innerHTML = h;
  }
  function apply(key, mm) {
    var d = S.doc, px = toPX(mm);
    if (key === 't' || key === 'b' || key === 's') { d.m = Object.assign({}, d.m); d.m[key] = Math.max(key === 's' ? 0 : 4, px); }
    else {
      var pt = Object.assign({}, d.pageTop || {});
      if (key === 'all') { for (var i = 0; i < (S.pageCount || 1); i++) { if (px) pt[i] = px; else delete pt[i]; } }
      else { var p = key.slice(1); if (px) pt[p] = px; else delete pt[p]; }
      d.pageTop = pt;
    }
    redraw();
  }
  DO.tbPS = function () {
    if (!S.doc || S.ro) return;
    if (box) { close(true); return; }
    before = { m: Object.assign({}, S.doc.m), pt: Object.assign({}, S.doc.pageTop || {}) };
    box = document.createElement('div'); box.className = 'mgp';
    document.body.appendChild(box); render();
    box.addEventListener('input', function (e) {
      var k = e.target.getAttribute('data-k'); if (!k) return;
      if (e.target.value === '') return;
      apply(k, e.target.value);
      if (k === 'all') box.querySelectorAll('input[data-k^="p"]').forEach(function (x) { x.value = e.target.value; });
    });
    box.addEventListener('click', function (e) {
      var st = e.target.closest('[data-st]');
      if (st) {
        var p = st.getAttribute('data-st').split('|'), inp = box.querySelector('input[data-k="' + p[0] + '"]');
        var v = Math.max(0, Math.round(((parseFloat(inp.value) || 0) + Number(p[1])) * 2) / 2);
        inp.value = v; inp.dispatchEvent(new Event('input', { bubbles: true })); return;
      }
      var a = e.target.closest('[data-a]'); if (!a) return;
      var k = a.getAttribute('data-a');
      if (k === 'ok') close(true);
      else if (k === 'x') close(false);
      else if (k === 'def') {
        var m = (S.cfg && S.cfg.margins) || { top: 1, bottom: 1, side: 0.6 };
        S.doc.m = { t: Math.round(m.top * 96), b: Math.round(m.bottom * 96), s: Math.round(m.side * 96) }; S.doc.pageTop = {};
        render(); redraw();
      }
    });
  };
  // টুলবারের বাটন: 📐 পেজের মার্জিন
  if (typeof renderTools === 'function') {
    var _rt = renderTools;
    renderTools = function () {
      var r = _rt.apply(this, arguments);
      var b = document.querySelector('#tools [data-do="tbPS"]');
      if (b) { b.textContent = '📐'; b.setAttribute('data-tip', LL('Page margins (top, bottom, sides) — live', 'পেজের মার্জিন (উপর, নিচ, পাশ) — লাইভ')); }
      return r;
    };
    try { renderTools(); } catch (e) {}
  }
  // অন্য কোটেশন খুললে / পাতা বদলালে প্যানেল বন্ধ
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && box) close(false); });

  // Admin > মার্জিন সেভ: খোলা কোটেশনেও সাথে সাথে বসে
  if (typeof api === 'function') {
    var _api = api;
    api = function (fn, a1) {
      var p = _api.apply(this, arguments);
      if (fn === 'saveConfig' && p && p.then) p.then(function (c) {
        try {
          var m = (c && c.margins) || JSON.parse(a1).margins;
          if (m && S.doc && !S.ro) { S.doc.m = { t: Math.round(m.top * 96), b: Math.round(m.bottom * 96), s: Math.round(m.side * 96) }; markDirty(); redraw(); }
        } catch (e) {}
      });
      return p;
    };
  }
})();
