/* SCS Worker Attendance & Wage — আগে-চলা অ্যাডাপ্টার: ডিফল্ট ইংরেজি, নিজের সেটিংস বাটন SCS গিয়ারে */
(function () {
  try { if (!localStorage.getItem('lab_lang')) localStorage.setItem('lab_lang', 'en'); } catch (e) {}
  // মোবাইলেও অ্যাপের নাম দেখা যাবে (আসল অ্যাপ ছোট স্ক্রিনে নামটা লুকাতো)
  var s = document.createElement('style');
  s.textContent = '@media (max-width:480px){.scs-topbar .scs-tb-name{display:block!important;font-size:11.5px!important;line-height:1.1!important;white-space:normal!important;max-width:34vw}}';
  document.head.appendChild(s);
  if (!window.SCS || !SCS.absorbButton) return;
  if (/[?&]v=/.test(location.search)) return;   // ভিজিটর লিংক: SCS মেনু নেই
  SCS.absorbButton('header [data-act="gear"]', '👷',
    function () { return SCS.lang === 'bn' ? 'লেবার অ্যাপের সেটিংস ও লগ' : 'Worker app settings & log'; });
})();