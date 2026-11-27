/* =====================================================================
 *  SCS Collection — পেজ অ্যাডাপ্টার: পিন লগইন স্ক্রিন নেই, SCS অ্যাকাউন্ট দিয়ে সরাসরি অ্যাপ
 * ===================================================================== */
(function () {
  function enter() { if (typeof window.__scsColLogin === 'function') window.__scsColLogin(); }
  if (/[?&]scs_test=1/.test(location.search)) { setTimeout(enter, 300); return; }
  if (window.SCS && SCS.ready) SCS.ready.then(function () { setTimeout(enter, 50); });
})();
