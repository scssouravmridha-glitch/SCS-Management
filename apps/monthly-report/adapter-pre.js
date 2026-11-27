/* SCS Monthly Report — আগে-চলা অ্যাডাপ্টার: অ্যাপের নিজের Settings বাটন SCS গিয়ারের ভেতরে (শুধু এই অ্যাপে) */
(function () {
  if (!window.SCS || !SCS.absorbButton) return;
  SCS.absorbButton('header button[title="Settings"], header button[title="সেটিংস"]', '📊',
    function () { return SCS.lang === 'bn' ? 'রিপোর্ট সেটিংস ও লগ' : 'Report settings & log'; });
})();