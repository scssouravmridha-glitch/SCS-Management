/* SCS Monthly Report — আগে-চলা অ্যাডাপ্টার: অ্যাপের নিজের Settings বাটন SCS গিয়ারের ভেতরে (শুধু এই অ্যাপে) */
(function () {
  if (!window.SCS || !SCS.absorbButton) return;
  SCS.absorbButton('header button[title="Settings"], header button[title="সেটিংস"]', '📊',
    function () { return SCS.lang === 'bn' ? 'রিপোর্ট সেটিংস ও লগ' : 'Report settings & log'; });
})();
/* জাতীয় সংগীত এখন SCS Management এর হোম পেজ থেকে বাজে (সব অ্যাপে চলতে থাকে) — এই অ্যাপের নিজের গানের বাটন লুকানো */
(function () {
  if (!window.SCS || !SCS.hideMatch) return;
  SCS.hideMatch(function (b) { return /^play\b|^pause\b|music|গান|সংগীত/i.test((b.getAttribute('title') || '') + ' ' + (b.getAttribute('data-act') || '')); });
})();
