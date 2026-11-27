/* =====================================================================
 *  SCS Daily Expense — পেজ অ্যাডাপ্টার
 *  - পিন লগইন স্ক্রিন নেই: SCS অ্যাকাউন্ট দিয়ে সরাসরি অ্যাপ
 *  - লগআউট = SCS থেকে লগআউট
 *  - অ্যাপের নিজের "Settings" (অ্যাক্টিভিটি লগ) উপরে আলাদা না রেখে SCS সেটিংস মেনুর ভেতরে
 * ===================================================================== */
(function () {
  var st = document.createElement('style');
  st.textContent = 'button[onclick="openSettings()"]{display:none!important}';
  document.head.appendChild(st);

  if (window.SCS) {
    SCS.gearExtras = SCS.gearExtras || [];
    SCS.gearExtras.push({
      icon: '📋',
      label: function () { return SCS.lang === 'bn' ? 'খরচের সেটিংস ও লগ' : 'Expense settings & log'; },
      show: function () { return typeof window.openSettings === 'function' && window.S && !!S.token; },
      run: function () { window.openSettings(); }
    });
  }

  function enter() {
    if (!window.S || typeof window.boot !== 'function') return;
    if (!window.__scsExpWrapped) {
      window.__scsExpWrapped = true;
      var _out = window.doLogout;
      window.doLogout = function (silent) {
        if (!silent && window.SCS && SCS.signOut) { SCS.signOut(); return; }   // নিশ্চিত করলে তবেই লগআউট
        if (typeof _out === 'function') _out.apply(this, arguments);
        if (silent) setTimeout(enter, 50);     // সেশন শেষ -> নিজে থেকে আবার ঢোকা
      };
    }
    if (!S.token || !/^scs-/.test(S.token)) {
      S.token = 'scs-user'; S.role = 'user';
      try { LS.set('scs_exp_token', S.token); LS.set('scs_exp_role', S.role); LS.set('scs_boot', null); } catch (e) {}
      S.boot = null;
      boot();
    }
  }
  if (window.SCS_APP_LOADED) enter(); else window.addEventListener('scs-app-loaded', enter, { once: true });
})();
