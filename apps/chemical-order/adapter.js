/* =====================================================================
 *  SCS Chemical Order — পেজ অ্যাডাপ্টার (আসল Index.html এর পরে চলে)
 *  - পিন লগইন স্ক্রিন দেখায় না: SCS অ্যাকাউন্ট দিয়ে সরাসরি অ্যাপ
 *  - অ্যাপের ভেতরের সংযোগ (patches.json): এডিটে ইউজার পিন নেই, অ্যাডমিন = Admin Console এর পিন, লগআউট = SCS
 * ===================================================================== */
(function () {
  var st = document.createElement('style');
  st.textContent = '#loginView{display:none!important}';
  document.head.appendChild(st);
  function go() { if (window.__scsChem) __scsChem.go(SCS.role); }
  if (/[?&]scs_test=1/.test(location.search)) { SCS.role = 'admin'; go(); }
  else if (window.SCS && SCS.ready) SCS.ready.then(go);
})();
