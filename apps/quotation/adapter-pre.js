/* SCS Quotation — আগে-চলা অ্যাডাপ্টার: পিন লগইন স্ক্রিন ছাড়া সরাসরি (SCS অ্যাকাউন্ট), ডিফল্ট ইংরেজি */
(function () {
  var P = 'scsq_';
  try {
    var v = localStorage.getItem(P + 'sess'), cur = null;
    try { cur = v ? JSON.parse(decodeURIComponent(escape(atob(v)))) : null; } catch (e) {}
    if (!cur || cur.p !== 'scs-account') localStorage.setItem(P + 'sess', btoa(unescape(encodeURIComponent(JSON.stringify({ p: 'scs-account' })))));
    if (!localStorage.getItem(P + 'lang')) localStorage.setItem(P + 'lang', 'en');
  } catch (e) {}
  var s = document.createElement('style'); s.textContent = '#login{visibility:hidden}'; document.head.appendChild(s);
  setTimeout(function () { s.textContent = ''; }, 6000);   // কোনো কারণে ঢুকতে না পারলে ৬ সেকেন্ড পর লগইন স্ক্রিন দেখায়
})();