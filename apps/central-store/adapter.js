/* SCS Central Store — ড্যাশবোর্ড: "আজকের কার্যক্রম" বাক্সে আজ / এই মাস / এই বছর / লাইফটাইম */
(function () {
  function init() {
    var X = window.__scsStore; if (!X) return;
    var S = X.S;
    try { S.dashPeriod = localStorage.getItem('scs_store_dperiod') || 'today'; } catch (e) { S.dashPeriod = 'today'; }
    var P = [['today', 'Today', 'আজ'], ['month', 'Month', 'মাস'], ['year', 'Year', 'বছর'], ['life', 'Lifetime', 'লাইফটাইম']];
    var bn = function () { return S.lang === 'bn'; };
    window.scsDashTitle = function () {
      var p = S.dashPeriod || 'today', m = S.month || '';
      if (p === 'month') return (bn() ? 'এই মাসের কার্যক্রম' : 'Monthly Activity') + (m ? ' · ' + m : '');
      if (p === 'year') return (bn() ? 'এই বছরের কার্যক্রম' : 'Yearly Activity') + ' · ' + (m ? m.slice(0, 4) : new Date().getFullYear());
      if (p === 'life') return bn() ? 'লাইফটাইম কার্যক্রম' : 'Lifetime Activity';
      return bn() ? 'আজকের কার্যক্রম' : "Today's Activity";
    };
    window.scsDashBtns = function () {
      var cur = S.dashPeriod || 'today';
      return '<div class="flex items-center bg-slate-800/90 border border-slate-700 rounded-lg p-0.5 gap-0.5">' + P.map(function (x) {
        var on = x[0] === cur;
        return '<button type="button" data-act="dash-period" data-v="' + x[0] + '" class="px-2 py-0.5 rounded-md text-[11px] font-bold cursor-pointer transition-all ' +
          (on ? 'bg-pink-600 text-white shadow' : 'text-slate-300 hover:text-white hover:bg-slate-700') + '">' + (bn() ? x[2] : x[1]) + '</button>';
      }).join('') + '</div>';
    };
    X.ACT['dash-period'] = function (el) {
      S.dashPeriod = el.getAttribute('data-v') || 'today';
      try { localStorage.setItem('scs_store_dperiod', S.dashPeriod); } catch (e) {}
      X.soft(); X.load();
    };
    X.soft(); if (S.dashPeriod !== 'today') X.load();
  }
  if (window.SCS_APP_LOADED) init(); else window.addEventListener('scs-app-loaded', init, { once: true });
})();
