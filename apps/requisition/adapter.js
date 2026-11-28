/* =====================================================================
 *  SCS Requisition — পেজ অ্যাডাপ্টার
 *  - পিন লগইন স্ক্রিন নেই: SCS অ্যাকাউন্ট দিয়ে সরাসরি অ্যাপ (adapter-pre.js)
 *  - অ্যাডমিন পিন = Admin Console এর Requisition পিন (শুধু অ্যাপে Admin অ্যাক্সেস থাকলে)
 *  - Summary: ৩টা ভিউ (Cards / Compact / Table) — একই জায়গায় ছোট টগল
 *  - প্রিন্ট: সিল, লোগো, প্যাড সব ছবি পুরো লোড না হলে প্রিন্ট হয় না
 *  - চালানের প্যাড (ব্যাকগ্রাউন্ড ছবি): Admin → Drive Folder অংশে আপলোড
 * ===================================================================== */
(function () {
  function T(en, bn) { return (window.SCS && SCS.lang === 'bn') ? bn : en; }
  function toast(msg, type) { try { showToast(msg, type || 'info'); } catch (e) { alert(msg); } }

  /* ---------------- লগইন / অ্যাডমিন পিন ---------------- */
  function enter() {
    try {
      ADMIN_PIN = (window.SCS_ROLE === 'admin' && window.SCS && SCS.adminPin) ? String(SCS.adminPin) : '\u0000';
      if (!state.isAuthenticated) {
        state.isAuthenticated = true;
        try { sessionStorage.setItem('scs_auth_' + APP_ID, 'true'); } catch (e) {}
        renderCurrentTab();
      }
    } catch (e) { console.warn('requisition adapter', e); }
    loadPad();
  }

  /* ---------------- Summary ভিউ মোড ---------------- */
  var VKEY = 'scs_req_view';
  function view() { try { return localStorage.getItem(VKEY) || 'cards'; } catch (e) { return 'cards'; } }
  function e_(s) { return (typeof esc === 'function') ? esc(s) : String(s == null ? '' : s); }
  function acts(r) {
    var c = jsq(r.challanNo), b = 'inline-flex items-center justify-center w-7 h-7 rounded-lg border cursor-pointer active:scale-95 ';
    var h = '<button type="button" title="Print Challan" onclick="openChallanPreview(\'' + c + '\')" class="' + b + 'bg-pink-600 border-pink-600 text-white">' + ic('printer', 'w-3.5 h-3.5') + '</button>';
    if (!r.delivered) {
      h += '<button type="button" title="Edit" onclick="requestUserEdit(\'' + c + '\')" class="' + b + 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">' + ic('pen-line', 'w-3.5 h-3.5') + '</button>' +
           '<button type="button" title="Deliver" onclick="confirmDeliverRequisition(\'' + c + '\')" class="' + b + 'bg-emerald-600 border-emerald-600 text-white">' + ic('check', 'w-3.5 h-3.5') + '</button>';
    } else {
      h += '<button type="button" title="Upload to Drive" onclick="uploadToDriveManual(\'' + c + '\')" class="' + b + 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">' + ic('cloud-upload', 'w-3.5 h-3.5 text-indigo-600') + '</button>';
    }
    return '<div class="flex items-center gap-1 justify-end">' + h + '</div>';
  }
  function items(r) {
    var l = Array.isArray(r.items) ? r.items : [];
    return l.map(function (it) { return e_(it.item) + ' — ' + e_(it.qty) + ' ' + e_(it.unit); }).join('<br>');
  }
  function compactHtml(list) {
    return list.map(function (r) {
      return '<details class="rounded-xl border ' + (r.delivered ? 'border-emerald-200 dark:border-emerald-900/60' : 'border-slate-200 dark:border-slate-700') + ' bg-white dark:bg-slate-900 px-2.5 py-1.5">' +
        '<summary class="flex items-center gap-2 cursor-pointer list-none">' +
          '<span class="font-mono font-black text-pink-600 dark:text-pink-400 text-sm" data-noi18n>' + e_(cleanChallanNo(r.challanNo)) + '</span>' +
          statusBadge(r) +
          '<span class="text-[11px] text-slate-500" data-noi18n>' + e_(r.date) + '</span>' +
          '<span class="text-xs font-semibold truncate min-w-0 flex-1">' + e_(r.projectName || '-') + '</span>' +
          '<span class="text-[11px] text-slate-500 hidden sm:inline">' + e_(r.requisitionBy || '') + '</span>' +
          '<span class="text-[10px] font-bold text-slate-400">' + ((r.items || []).length) + ' ' + T('items', 'আইটেম') + '</span>' +
          acts(r) +
        '</summary>' +
        '<div class="mt-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-800 text-[11.5px] leading-5">' +
          '<b>' + e_(r.projectAddress || '') + '</b>' + (r.engineerName ? ' · ' + e_(r.engineerName) + ' ' + e_(r.mobileNumber || '') : '') +
          '<div class="mt-1">' + items(r) + '</div></div>' +
      '</details>';
    }).join('');
  }
  function tableHtml(list) {
    var th = 'px-2 py-1.5 text-left text-[10.5px] font-black uppercase tracking-wide text-slate-500 bg-slate-50 dark:bg-slate-800 whitespace-nowrap';
    var td = 'px-2 py-1.5 text-[11.5px] border-t border-slate-100 dark:border-slate-800 align-top';
    return '<div class="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700"><table class="w-full">' +
      '<thead><tr><th class="' + th + '">Challan</th><th class="' + th + '">Date</th><th class="' + th + '">Project</th><th class="' + th + '">Requisition By</th><th class="' + th + '">Items</th><th class="' + th + '">Status</th><th class="' + th + '"></th></tr></thead><tbody>' +
      list.map(function (r) {
        return '<tr><td class="' + td + ' font-mono font-black text-pink-600 whitespace-nowrap" data-noi18n>' + e_(cleanChallanNo(r.challanNo)) + '</td>' +
          '<td class="' + td + ' whitespace-nowrap" data-noi18n>' + e_(r.date) + '</td>' +
          '<td class="' + td + '"><b>' + e_(r.projectName || '-') + '</b><div class="text-[10.5px] text-slate-500">' + e_(r.groupName || r.projectType || '') + '</div></td>' +
          '<td class="' + td + '">' + e_(r.requisitionBy || '-') + '</td>' +
          '<td class="' + td + '">' + items(r) + '</td>' +
          '<td class="' + td + '">' + statusBadge(r) + '</td>' +
          '<td class="' + td + '">' + acts(r) + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }
  function wrapSummary() {
    if (typeof window.buildSummaryCardsHtml !== 'function' || window.__scsReqWrapped) return;
    window.__scsReqWrapped = true;
    var _build = window.buildSummaryCardsHtml;
    window.buildSummaryCardsHtml = function () {
      var v = view();
      if (v === 'cards') return _build.apply(this, arguments);
      var list = getFilteredRequisitions();
      if (!list.length) return _build.apply(this, arguments);
      return v === 'table' ? tableHtml(list) : compactHtml(list);
    };
    var _render = window.renderSummary;
    window.renderSummary = function (c) {
      _render.apply(this, arguments);
      var cnt = document.getElementById('summary-count');
      if (!cnt || document.getElementById('scs-req-views')) return;
      var g = document.createElement('div');
      g.id = 'scs-req-views';
      g.className = 'no-print inline-flex shrink-0 p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800';
      [['cards', '▦', T('Cards', 'কার্ড')], ['compact', '☰', T('Compact list', 'ছোট তালিকা')], ['table', '▤', T('Table', 'টেবিল')]].forEach(function (m) {
        var b = document.createElement('button');
        b.type = 'button'; b.title = m[2];
        b.className = 'w-7 h-6 inline-flex items-center justify-center rounded-md cursor-pointer text-[13px] font-black leading-none ' + (view() === m[0] ? 'bg-white dark:bg-slate-700 text-pink-600 shadow-sm' : 'text-slate-500');
        b.textContent = m[1];
        b.onclick = function () { try { localStorage.setItem(VKEY, m[0]); } catch (e) {} renderCurrentTab(); };
        g.appendChild(b);
      });
      cnt.parentNode.insertBefore(g, cnt);
    };
  }

  /* ---------------- চালানের প্যাড (ব্যাকগ্রাউন্ড) ---------------- */
  window.__reqPad = '';
  function loadPad() {
    try { google.script.run.withSuccessHandler(function (u) { window.__reqPad = u || ''; }).scsGetPad(); } catch (e) {}
  }
  function wrapChallan() {
    if (typeof window.generateChallanDocumentHtml !== 'function' || window.__scsPadWrapped) return;
    window.__scsPadWrapped = true;
    var _gen = window.generateChallanDocumentHtml;
    window.generateChallanDocumentHtml = function () {
      var html = _gen.apply(this, arguments);
      if (!window.__reqPad) return html;
      return '<style>.challan-print-page{background-image:url("' + window.__reqPad.replace(/"/g, '%22') + '")!important;background-size:100% 100%!important;background-repeat:no-repeat!important;background-position:center!important}</style>' + html;
    };
  }
  function shrinkImage(file) {
    return new Promise(function (ok, no) {
      var fr = new FileReader();
      fr.onerror = no;
      fr.onload = function () {
        var im = new Image();
        im.onerror = no;
        im.onload = function () {
          var w = Math.min(1700, im.naturalWidth), h = Math.round(im.naturalHeight * w / im.naturalWidth);
          var c = document.createElement('canvas'); c.width = w; c.height = h;
          var x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); x.drawImage(im, 0, 0, w, h);
          ok(c.toDataURL('image/jpeg', 0.82));
        };
        im.src = fr.result;
      };
      fr.readAsDataURL(file);
    });
  }
  function wrapAdmin() {
    if (typeof window.renderAdminDriveFolder !== 'function' || window.__scsPadAdmin) return;
    window.__scsPadAdmin = true;
    var _r = window.renderAdminDriveFolder;
    window.renderAdminDriveFolder = function (c) {
      _r.apply(this, arguments);
      if (!c) return;
      var box = document.createElement('div');
      box.className = 'mt-3 rounded-2xl border border-slate-200 dark:border-slate-700 p-3 bg-white dark:bg-slate-900';
      box.innerHTML = '<div class="text-sm font-black mb-1">🧾 ' + T('Challan pad (background image)', 'চালানের প্যাড (ব্যাকগ্রাউন্ড ছবি)') + '</div>' +
        '<div class="text-[11.5px] text-slate-500 mb-2">' + T('Upload your letter pad (A4/Letter image). It prints behind every challan page, like Chemical Order.', 'আপনার লেটার প্যাডের ছবি (A4/Letter) দিন। Chemical Order-এর মতো প্রতিটা চালানের পেছনে প্রিন্ট হবে।') + '</div>' +
        '<div class="flex items-center gap-2 flex-wrap">' +
          '<img id="scs-pad-prev" alt="" style="width:64px;height:83px;object-fit:cover;border:1px solid #e2e8f0;border-radius:6px;background:#f8fafc' + (window.__reqPad ? '' : ';display:none') + '" src="' + (window.__reqPad || '') + '">' +
          '<label class="px-3 py-1.5 rounded-xl text-xs font-bold bg-pink-600 text-white cursor-pointer">' + T('Choose image', 'ছবি বাছুন') + '<input id="scs-pad-file" type="file" accept="image/*" style="display:none"></label>' +
          '<button type="button" id="scs-pad-del" class="px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700"' + (window.__reqPad ? '' : ' style="display:none"') + '>' + T('Remove pad', 'প্যাড সরান') + '</button>' +
        '</div>';
      c.appendChild(box);
      function save(v) {
        google.script.run.withSuccessHandler(function () {
          window.__reqPad = v; toast(v ? T('Pad saved', 'প্যাড সেভ হয়েছে') : T('Pad removed', 'প্যাড সরানো হয়েছে'), 'success'); renderCurrentTab();
        }).withFailureHandler(function (e) { toast(e.message || String(e), 'error'); }).scsSetPad(v);
      }
      box.querySelector('#scs-pad-file').onchange = function () {
        var f = this.files && this.files[0]; if (!f) return;
        shrinkImage(f).then(save, function () { toast(T('Could not read the image', 'ছবিটা পড়া যায়নি'), 'error'); });
      };
      box.querySelector('#scs-pad-del').onclick = function () { save(''); };
    };
  }

  /* ---------------- প্রিন্ট: সব ছবি (সিল, লোগো, প্যাড) পুরো লোড হলে তবেই ---------------- */
  var _print = window.print.bind(window);
  function bgUrls(root) {
    var out = [];
    [].forEach.call(root.querySelectorAll('*'), function (el) {
      var b = getComputedStyle(el).backgroundImage;
      var m = b && b !== 'none' && b.match(/url\(["']?([^"')]+)["']?\)/);
      if (m) out.push(m[1]);
    });
    return out;
  }
  function waitImages(root) {
    var imgs = [].slice.call(root.querySelectorAll('img')).filter(function (i) { return i.getAttribute('src'); });
    var jobs = imgs.map(function (im) {
      return new Promise(function (ok, no) {
        if (im.complete && im.naturalWidth > 0) { (im.decode ? im.decode().catch(function () {}) : Promise.resolve()).then(ok); return; }
        im.addEventListener('load', function () { ok(); }, { once: true });
        im.addEventListener('error', function () { no(im.getAttribute('alt') || im.src.slice(0, 60)); }, { once: true });
      });
    }).concat(bgUrls(root).map(function (u) {
      return new Promise(function (ok, no) { var i = new Image(); i.onload = function () { ok(); }; i.onerror = function () { no('pad'); }; i.src = u; });
    }));
    var timeout = new Promise(function (ok, no) { setTimeout(function () { no('timeout'); }, 15000); });
    return Promise.race([Promise.all(jobs), timeout]);
  }
  window.print = function () {
    var root = document.getElementById('printable-challan-root');
    if (!root || !root.innerHTML.trim()) root = document.body;
    toast(T('Preparing print (loading seal & images)...', 'প্রিন্ট তৈরি হচ্ছে (সিল ও ছবি লোড হচ্ছে)...'), 'info');
    waitImages(root).then(function () { setTimeout(_print, 120); }, function (what) {
      toast(T('Print stopped: the seal / pad / logo image could not load (' + what + '). Check the internet and try again.',
        'প্রিন্ট বন্ধ: সিল / প্যাড / লোগোর ছবি লোড হয়নি (' + what + ')। ইন্টারনেট দেখে আবার চেষ্টা করুন।'), 'error');
    });
  };

  function hookAll() { wrapSummary(); wrapChallan(); wrapAdmin(); }
  hookAll();
  if (/[?&]scs_test=1/.test(location.search)) { setTimeout(function () { ADMIN_PIN = '2026'; enter(); }, 0); return; }
  if (window.SCS && SCS.ready) SCS.ready.then(enter);   // SCS.ready = অ্যাকাউন্ট + Admin Console পিন লোড শেষ
})();
