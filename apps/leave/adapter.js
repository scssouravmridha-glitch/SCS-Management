/* =====================================================================
 *  SCS Leave Application — পেজ অ্যাডাপ্টার (আসল Index.html এর পরে চলে)
 *  - পিন লগইন স্ক্রিন দেখায় না: SCS অ্যাকাউন্ট দিয়ে সরাসরি অ্যাপ
 *  - আবেদন ফর্মে নিজের নাম আগে থেকে বাছাই করা থাকে
 *  - লগআউট = SCS থেকে লগআউট
 * ===================================================================== */
(function () {
  var st = document.createElement('style');
  st.textContent = '#loginView{display:none!important}';
  document.head.appendChild(st);

  var _load = window.loadData;
  if (typeof _load === 'function') {
    loadData = async function () {
      var me = window.SCS && SCS.me && SCS.me.profile ? String(SCS.me.profile.employee_id || '') : '';
      var r = await _load.apply(this, arguments);
      if (me && window.state && (state.employees || []).some(function (e) { return String(e.employeeId) === me; })) {
        if (!state.__scsPicked) { state.selectedEmployeeId = me; state.__scsPicked = true; try { renderAll(); } catch (e) {} }
      }
      return r;
    };
  }
  logout = function () { if (window.SCS && SCS.signOut) SCS.signOut(); };

  function go() {
    var lv = document.getElementById('loginView'), av = document.getElementById('appView');
    if (lv) lv.classList.add('hidden');
    if (av) av.classList.remove('hidden');
    loadData();
  }
  if (/[?&]scs_test=1/.test(location.search)) go();
  else if (window.SCS && SCS.ready) SCS.ready.then(go);
})();
