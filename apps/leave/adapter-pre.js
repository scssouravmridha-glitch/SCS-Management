/* SCS Leave Application — আগে-চলা অ্যাডাপ্টার: পিন লগইন স্ক্রিন শুরু থেকেই লুকানো, অ্যাপ সরাসরি */
(function () {
  var s = document.createElement('style');
  s.textContent = '#loginView{display:none!important}#appView.hidden{display:block!important}';
  document.head.appendChild(s);
  try { if (!localStorage.getItem('scs_leave_lang')) localStorage.setItem('scs_leave_lang', 'en'); } catch (e) {}
})();