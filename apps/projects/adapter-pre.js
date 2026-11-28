/* SCS Projects — আগে-চলা অ্যাডাপ্টার: লগইন স্ক্রিন ছাড়া সরাসরি (SCS অ্যাকাউন্ট), ডিফল্ট ইংরেজি */
(function () {
  try {
    if (!sessionStorage.getItem('scs_pj_role')) sessionStorage.setItem('scs_pj_role', 'user');
    if (!/^scs-/.test(sessionStorage.getItem('scs_pj_tok') || '')) sessionStorage.setItem('scs_pj_tok', 'scs-user');
    if (!localStorage.getItem('scs_pj_lang')) localStorage.setItem('scs_pj_lang', 'en');
  } catch (e) {}
  // আলাদা ট্যাবে বিল পাতা (bill.html): পিন লগইন ছাড়া সরাসরি
  if (/bill\.html$/.test(location.pathname) && !window.SCS_CTX) {
    window.SCS_CTX = { tok: 'scs-user', lang: (function () { try { return localStorage.getItem('scs_pj_lang') || 'en'; } catch (e) { return 'en'; } })() };
    var s = document.createElement('style'); s.textContent = '#login{display:none!important}'; document.head.appendChild(s);
  }
})();
