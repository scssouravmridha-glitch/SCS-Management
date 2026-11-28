/* SCS Central Store — আগে-চলা অ্যাডাপ্টার: লগইন স্ক্রিন ছাড়া সরাসরি (SCS অ্যাকাউন্ট), ডিফল্ট ইংরেজি */
(function () {
  try {
    if (!/^scs-/.test(localStorage.getItem('scs_store_token') || '')) localStorage.setItem('scs_store_token', 'scs-user');
    if (!localStorage.getItem('scs_store_lang')) localStorage.setItem('scs_store_lang', 'en');
  } catch (e) {}
  // টপবারে দ্বিতীয় "গিয়ার" (Activity Log) -> SCS গিয়ার মেনুর ভেতরে
  if (window.SCS && SCS.absorbButton) SCS.absorbButton('header [data-act="go"][data-v="logs"]', '📜', function () { return SCS.lang === 'bn' ? 'অ্যাক্টিভিটি লগ' : 'Activity log'; });
})();
