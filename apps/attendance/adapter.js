/* =====================================================================
 *  SCS Employee Attendance — পেজ অ্যাডাপ্টার (আসল Index.html এর পরে চলে)
 *  - অ্যাপের নিজের "Activity Log" (গিয়ার আইকন) উপরে আলাদা না রেখে SCS সেটিংস মেনুর ভেতরে
 * ===================================================================== */
(function () {
  if (!window.SCS) return;
  SCS.gearExtras = SCS.gearExtras || [];
  SCS.gearExtras.push({
    icon: '📋',
    label: function () { return SCS.lang === 'bn' ? 'হাজিরার অ্যাক্টিভিটি লগ' : 'Attendance activity log'; },
    show: function () { return typeof window.__scsAttLog === 'function'; },
    run: function () { window.__scsAttLog(); }
  });
})();
