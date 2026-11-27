/* SCS Collection — আগে-চলা অ্যাডাপ্টার: ডিফল্ট ইংরেজি, লগইন স্ক্রিন ছাড়া সরাসরি, নিজের সেটিংস বাটন SCS গিয়ারে */
(function () {
  try {
    if (!localStorage.getItem('scs_col_lang')) localStorage.setItem('scs_col_lang', 'en');
    if (!sessionStorage.getItem('scs_col_role')) sessionStorage.setItem('scs_col_role', 'user');
  } catch (e) {}
  if (!window.SCS || !SCS.absorbButton) return;
  SCS.absorbButton('header [data-a="nav"][title*="Settings"], header [data-a="nav"][title*="সেটিংস"]', '💰',
    function () { return SCS.lang === 'bn' ? 'কালেকশন সেটিংস ও লগ' : 'Collection settings & log'; });
})();