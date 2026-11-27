/* =====================================================================
 *  SCS Requisition — পেজ অ্যাডাপ্টার
 *  - পিন লগইন স্ক্রিন নেই: SCS অ্যাকাউন্ট দিয়ে সরাসরি অ্যাপ
 *  - অ্যাডমিন পিন = Admin Console এর Requisition পিন (শুধু অ্যাপে Admin অ্যাক্সেস থাকলে)
 *  - লগআউট = SCS থেকে লগআউট (patches.json)
 * ===================================================================== */
(function () {
  function enter() {
    try {
      ADMIN_PIN = (window.SCS_ROLE === 'admin' && window.SCS && SCS.adminPin) ? String(SCS.adminPin) : '\u0000';
      if (!state.isAuthenticated) {
        state.isAuthenticated = true;
        try { sessionStorage.setItem('scs_auth_' + APP_ID, 'true'); } catch (e) {}
        renderCurrentTab();
      }
    } catch (e) { console.warn('requisition adapter', e); }
  }
  if (/[?&]scs_test=1/.test(location.search)) { setTimeout(function () { ADMIN_PIN = '2026'; enter(); }, 0); return; }
  if (window.SCS && SCS.ready) SCS.ready.then(enter);   // SCS.ready = অ্যাকাউন্ট + Admin Console পিন লোড শেষ
})();
