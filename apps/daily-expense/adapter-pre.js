/* SCS Daily Expense — আগে-চলা অ্যাডাপ্টার: লগইন স্ক্রিন ছাড়া সরাসরি, ডিফল্ট ইংরেজি */
(function () {
  try {
    if (!/^scs-/.test(localStorage.getItem('scs_exp_token') || '')) { localStorage.setItem('scs_exp_token', 'scs-user'); localStorage.setItem('scs_exp_role', 'user'); localStorage.removeItem('scs_boot'); }
    if (!localStorage.getItem('scs_exp_lang')) localStorage.setItem('scs_exp_lang', 'en');
  } catch (e) {}
})();