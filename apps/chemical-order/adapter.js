/* =====================================================================
 *  SCS Chemical Order — পেজ অ্যাডাপ্টার (আসল Index.html এর পরে চলে)
 *  - পিন লগইন স্ক্রিন দেখায় না: SCS অ্যাকাউন্ট দিয়ে সরাসরি অ্যাপ
 *  - অ্যাপের ভেতরের সংযোগ (patches.json): এডিটে ইউজার পিন নেই, অ্যাডমিন = Admin Console এর পিন, লগআউট = SCS
 * ===================================================================== */
(function () {
  var st = document.createElement('style');
  st.textContent = '#loginView{display:none!important}' +
    // মোবাইলে কাস্টমার অংশ (মোবাইল নম্বর + নাম) এক কলামে, যাতে নম্বরের ঘর পুরো চওড়া হয়
    '@media (max-width:640px){.grid:has(#mobile){grid-template-columns:minmax(0,1fr)!important}.grid:has(#mobile)>*{grid-column:auto!important}#mobile{font-size:16px}}';
  document.head.appendChild(st);
  // History: সবাই দেখতে ও ফিল্টার করতে পারে; মোছার বাটন এখানে নেই (মোছা যায় শুধু Admin পাতার ভেতর থেকে)
  st.textContent += '#viewHistory [data-act="histClear"],#viewHistory [data-act="histDel"]{display:none!important}';
  function T(en, bn) { return (window.SCS && SCS.lang === 'bn') ? bn : en; }
  function call(fn) {
    var a = [].slice.call(arguments, 1);
    return new Promise(function (ok, no) { var r = google.script.run.withSuccessHandler(ok).withFailureHandler(no); r[fn].apply(r, a); });
  }
  function adminCard() {
    var v = document.getElementById('viewAdmin');
    if (!v || v.classList.contains('hidden') || document.getElementById('scs-hist-admin')) return;
    var S = window.__scsChem && __scsChem.S; if (!S || !S.adminPin) return;
    var c = document.createElement('div');
    c.id = 'scs-hist-admin';
    c.className = 'mt-4 rounded-2xl border border-rose-200 dark:border-rose-900 bg-white dark:bg-slate-900 p-3';
    c.innerHTML = '<div class="text-sm font-black mb-1">🕘 ' + T('History cleanup (Admin)', 'হিস্ট্রি মোছা (অ্যাডমিন)') + '</div>' +
      '<div class="text-[11.5px] text-slate-500 mb-2">' + T('Delete old change history. Orders are not touched.', 'পুরনো পরিবর্তনের হিস্ট্রি মুছুন। অর্ডারে কোনো পরিবর্তন হয় না।') + '</div>' +
      '<div class="flex items-center gap-2 flex-wrap"><select id="scs-hist-age" class="inp" style="width:auto">' +
        '<option value="90">' + T('Older than 3 months', '৩ মাসের বেশি পুরনো') + '</option>' +
        '<option value="180">' + T('Older than 6 months', '৬ মাসের বেশি পুরনো') + '</option>' +
        '<option value="365">' + T('Older than 1 year', '১ বছরের বেশি পুরনো') + '</option>' +
        '<option value="ALL">' + T('ALL history', 'সব হিস্ট্রি') + '</option></select>' +
      '<button type="button" id="scs-hist-del" class="btn-p bg-rose-600 text-white">' + T('Delete', 'মুছুন') + '</button></div>';
    v.appendChild(c);
    c.querySelector('#scs-hist-del').onclick = function () {
      var age = c.querySelector('#scs-hist-age').value, btn = this;
      SCS.confirmBox(T('Delete history?', 'হিস্ট্রি মুছবেন?'), age === 'ALL' ? T('ALL change history will be deleted.', 'সব পরিবর্তনের হিস্ট্রি মুছে যাবে।') : T('History older than the selected time will be deleted.', 'বাছাই করা সময়ের চেয়ে পুরনো হিস্ট্রি মুছে যাবে।'), T('Delete', 'মুছুন'), true).then(function (ok) {
        if (!ok) return;
        btn.disabled = true;
        var job = age === 'ALL' ? call('deleteHistory', 'ALL', S.adminPin) : call('getHistory', 100000).then(function (r) {
          var cut = new Date(Date.now() - Number(age) * 86400000).toISOString().slice(0, 10);
          var ids = (r.items || []).filter(function (h) { return String(h.time).slice(0, 10) < cut; }).map(function (h) { return h.id; });
          return ids.length ? call('deleteHistory', ids, S.adminPin) : { deleted: 0 };
        });
        job.then(function (r) { alert(T('Deleted: ', 'মুছে ফেলা হয়েছে: ') + ((r && r.deleted) || 0)); S.hist = null; }, function (e) { alert(e.message || e); })
          .then(function () { btn.disabled = false; });
      });
    };
  }
  new MutationObserver(function () { clearTimeout(adminCard._t); adminCard._t = setTimeout(adminCard, 150); }).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });

  function go() { if (window.__scsChem) __scsChem.go(SCS.role); }
  if (/[?&]scs_test=1/.test(location.search)) { SCS.role = 'admin'; go(); }
  else if (window.SCS && SCS.ready) SCS.ready.then(go);
})();
