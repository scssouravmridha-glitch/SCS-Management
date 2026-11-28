/* SCS Workspeace — আগে-চলা অ্যাডাপ্টার: পিন লগইন স্ক্রিন ছাড়া সরাসরি (SCS অ্যাকাউন্ট), ডিফল্ট ইংরেজি */
(function () {
  var P = 'scsw_';
  try {
    var v = localStorage.getItem(P + 'sess'), cur = null;
    try { cur = v ? JSON.parse(decodeURIComponent(escape(atob(v)))) : null; } catch (e) {}
    if (!cur || cur.p !== 'scs-account') localStorage.setItem(P + 'sess', btoa(unescape(encodeURIComponent(JSON.stringify({ p: 'scs-account' })))));
    if (!localStorage.getItem(P + 'lang')) localStorage.setItem(P + 'lang', 'en');
  } catch (e) {}
  // পিন-লগইন স্ক্রিন বিল্ডের সময়ই বাদ (patches.json); খোলার সময় SCS এর খোলার স্ক্রিন দেখায়
})();