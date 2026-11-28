/* SCS Central Store — আগে-চলা অ্যাডাপ্টার: লগইন স্ক্রিন ছাড়া সরাসরি (SCS অ্যাকাউন্ট), ডিফল্ট ইংরেজি */
(function () {
  try {
    if (!/^scs-/.test(localStorage.getItem('scs_store_token') || '')) localStorage.setItem('scs_store_token', 'scs-user');
    if (!localStorage.getItem('scs_store_lang')) localStorage.setItem('scs_store_lang', 'en');
  } catch (e) {}
  // টেবিলের লেখা: লম্বা লেখার কলাম (ব্র্যান্ড, নাম, মন্তব্য…) বাঁয়ে, সংখ্যা/ছোট কোড মাঝখানে — প্রতিটা কলাম নিজে থেকে দেখে
  (function () {
    var NUM = /^[\s৳$+\-−–—,.:%()\/0-9০-৯×x]*$/i;
    function fix(tb) {
      var rows = tb.tBodies && tb.tBodies[0] ? [].slice.call(tb.tBodies[0].rows, 0, 60) : [];
      if (!rows.length) return;
      var cols = {};
      rows.forEach(function (r) {
        var ci = 0;
        [].forEach.call(r.cells, function (c) {
          var t = (c.textContent || '').replace(/\s+/g, ' ').trim(), k = ci; ci += c.colSpan || 1;
          if (c.colSpan > 1 || !t || t === '-' || c.querySelector('input,select,button,textarea')) return;
          var o = cols[k] || (cols[k] = { n: 0, long: 0 });
          o.n++; if (!NUM.test(t) && t.length > 12) o.long++;
        });
      });
      Object.keys(cols).forEach(function (k) {
        var o = cols[k]; if (!o.n || o.long / o.n < 0.3) return;      // বেশিরভাগ লম্বা লেখা হলে বাঁয়ে
        [].forEach.call(tb.rows, function (r) {
          var ci = 0;
          [].forEach.call(r.cells, function (c) { if (ci === +k && (c.colSpan || 1) === 1) { c.style.textAlign = 'left'; } ci += c.colSpan || 1; });
        });
      });
    }
    var t = 0;
    function run() { t = 0; document.querySelectorAll('#root table').forEach(fix); }
    document.addEventListener('DOMContentLoaded', function () {
      try { new MutationObserver(function () { if (!t) t = setTimeout(run, 60); }).observe(document.body, { childList: true, subtree: true }); } catch (e) {}
    });
  })();
  // টপবারে দ্বিতীয় "গিয়ার" (Activity Log) -> SCS গিয়ার মেনুর ভেতরে
  if (window.SCS && SCS.absorbButton) SCS.absorbButton('header [data-act="go"][data-v="logs"]', '📜', function () { return SCS.lang === 'bn' ? 'অ্যাক্টিভিটি লগ' : 'Activity log'; });
})();
