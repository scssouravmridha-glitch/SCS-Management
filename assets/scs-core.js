/* ================================================================
 *  SCS Management — shared core (loaded by every page and every app)
 *  - Supabase client, account / access checks
 *  - Language (English default, Bangla optional)
 *  - Company logo (changeable from Admin Console)
 *  - Settings menu in each app's top bar: notifications, activity log,
 *    profile, push notifications, logout
 *  - Admin PIN for app admin panels
 * ================================================================ */
(function () {
  'use strict';
  var CFG = window.SCS_CONFIG || {};
  var configured = CFG.SUPABASE_URL && CFG.SUPABASE_URL.indexOf('YOUR-PROJECT') === -1 &&
    CFG.SUPABASE_ANON_KEY && CFG.SUPABASE_ANON_KEY.indexOf('YOUR-ANON') === -1;

  var sb = null;
  if (configured && window.supabase && window.supabase.createClient) {
    sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'scs-management-auth' }
    });
  }

  var readyResolve, readyReject;
  var ready = new Promise(function (res, rej) { readyResolve = res; readyReject = rej; });
  ready.catch(function () {});

  var SCS = { config: CFG, configured: !!configured, sb: sb, me: null, app: null, role: null, ready: ready };

  /* ---------------- site base (Netlify = "/", GitHub Pages = "/repo-name/") ---------------- */
  // এই ফাইলের ঠিকানা থেকে সাইটের শুরুর ফোল্ডার বের করা — তাই যেকোনো হোস্টে, যেকোনো সাব-ফোল্ডারে চলে
  (function () {
    var src = (document.currentScript && document.currentScript.src) || '';
    var base = '/';
    try { if (src) base = new URL(src.replace(/assets\/scs-core\.js.*$/, ''), location.href).pathname; } catch (e) {}
    SCS.base = base.charAt(base.length - 1) === '/' ? base : base + '/';
  })();
  /** '/admin.html' -> সাইটের base অনুযায়ী ঠিক ঠিকানা (GitHub Pages: '/repo/admin.html') */
  SCS.url = function (p) {
    p = p == null ? '/' : String(p);
    if (/^([a-z][a-z0-9+.-]*:|#|\/\/)/i.test(p)) return p;
    if (p.charAt(0) === '/') return p.indexOf(SCS.base) === 0 && SCS.base !== '/' ? p : SCS.base + p.slice(1);
    return p;
  };
  /** পুরো ঠিকানা (https://.../) — লগইন/রিসেট লিংকের জন্য */
  SCS.siteUrl = function () { return location.origin + SCS.base; };
  // HTML-এ লেখা "/..." লিংকগুলো সাব-ফোল্ডারে চললে ক্লিকের আগেই ঠিক করে দেওয়া
  if (SCS.base !== '/') {
    var fixA = function (e) {
      var a = e.target && e.target.closest && e.target.closest('a[href]');
      if (!a) return;
      var h = a.getAttribute('href');
      if (h && h.charAt(0) === '/' && h.charAt(1) !== '/' && h.indexOf(SCS.base) !== 0) a.setAttribute('href', SCS.url(h));
    };
    ['pointerdown', 'mousedown', 'focusin', 'click', 'auxclick', 'contextmenu', 'touchstart'].forEach(function (ev) { document.addEventListener(ev, fixA, true); });
  }

  function ls(k, v) {
    try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {}
    return null;
  }

  /* ---------------- language ---------------- */
  SCS.lang = ls('scs_lang') === 'bn' ? 'bn' : 'en';
  SCS.t = function (en, bn) { return SCS.lang === 'bn' && bn != null ? bn : en; };
  SCS.applyI18n = function (root) {
    root = root || document;
    document.documentElement.lang = SCS.lang;
    root.querySelectorAll('[data-i]').forEach(function (el) { var p = el.getAttribute('data-i').split('|'); el.textContent = SCS.lang === 'bn' && p[1] ? p[1] : p[0]; });
    root.querySelectorAll('[data-ih]').forEach(function (el) { var p = el.getAttribute('data-ih').split('|'); el.innerHTML = SCS.lang === 'bn' && p[1] ? p[1] : p[0]; });
    root.querySelectorAll('[data-ph]').forEach(function (el) { var p = el.getAttribute('data-ph').split('|'); el.placeholder = SCS.lang === 'bn' && p[1] ? p[1] : p[0]; });
    root.querySelectorAll('[data-tt]').forEach(function (el) { var p = el.getAttribute('data-tt').split('|'); el.title = SCS.lang === 'bn' && p[1] ? p[1] : p[0]; });
  };
  SCS.setLang = function (l) {
    SCS.lang = l === 'bn' ? 'bn' : 'en';
    ls('scs_lang', SCS.lang); ls('scs_language', SCS.lang);   // Chemical Order + Attendance-ও একই ভাষা পায়
    SCS.applyI18n();
    document.dispatchEvent(new CustomEvent('scs:lang', { detail: SCS.lang }));
  };
  var T = SCS.t;

  /* ---------------- helpers ---------------- */
  SCS.esc = function (s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };
  SCS.err = function (e) {
    if (!e) return 'Unknown error';
    var m = e.message || e.error_description || e.msg || String(e);
    if (/row-level security|permission denied|42501/i.test(m)) m = T('Your account does not have permission for this (Permission denied).', 'এই কাজের অনুমতি আপনার অ্যাকাউন্টে নেই (Permission denied).');
    if (/Failed to fetch|NetworkError|Load failed/i.test(m)) m = T('Cannot reach the server — check your internet connection.', 'ইন্টারনেট/সার্ভার সংযোগ পাওয়া যাচ্ছে না (Network error).');
    return m;
  };
  SCS.q = function (p) {
    return Promise.resolve(p).then(function (r) {
      if (r && r.error) throw new Error(SCS.err(r.error));
      return r ? r.data : r;
    });
  };

  var TZ = CFG.TIMEZONE || 'Asia/Dhaka';
  SCS.parts = function (d) {
    d = d instanceof Date ? d : new Date(d);
    if (isNaN(d.getTime())) return null;
    var f = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    var o = {};
    f.formatToParts(d).forEach(function (p) { o[p.type] = p.value; });
    if (o.hour === '24') o.hour = '00';
    return o;
  };
  /** pattern: yyyy MM dd HH mm ss MMM (Jan) d (1) */
  SCS.fmt = function (d, pattern) {
    var p = SCS.parts(d);
    if (!p) return '';
    var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return String(pattern || 'yyyy-MM-dd HH:mm:ss').replace(/yyyy|MMM|MM|dd|HH|mm|ss|d/g, function (t) {
      switch (t) {
        case 'yyyy': return p.year; case 'MMM': return MON[Number(p.month) - 1]; case 'MM': return p.month;
        case 'dd': return p.day; case 'HH': return p.hour; case 'mm': return p.minute; case 'ss': return p.second;
        case 'd': return String(Number(p.day));
      }
      return t;
    });
  };
  SCS.ago = function (d) {
    var s = Math.max(0, (Date.now() - new Date(d).getTime()) / 1000);
    if (s < 60) return T('just now', 'এইমাত্র');
    if (s < 3600) return Math.floor(s / 60) + T(' min ago', ' মিনিট আগে');
    if (s < 86400) return Math.floor(s / 3600) + T(' h ago', ' ঘণ্টা আগে');
    return SCS.fmt(d, 'd MMM yyyy, HH:mm');
  };
  SCS.shortId = function () {
    var a = new Uint8Array(6); (window.crypto || window.msCrypto).getRandomValues(a);
    return Array.prototype.map.call(a, function (x) { return ('0' + x.toString(16)).slice(-2); }).join('').slice(0, 8);
  };
  SCS.loadScript = function (src) {
    return new Promise(function (res, rej) {
      var s = document.createElement('script');
      s.src = src; s.async = false;
      s.onload = function () { res(); };
      s.onerror = function () { rej(new Error('Could not load ' + src)); };
      document.body.appendChild(s);
    });
  };

  /* ---------------- company logo ---------------- */
  SCS.DEFAULT_LOGO = SCS.url('/assets/logo.png');
  SCS.logo = ls('scsb_logo') || SCS.DEFAULT_LOGO;
  SCS.applyLogo = function (root) {
    (root || document).querySelectorAll('img[data-scs-logo]').forEach(function (img) {
      if (img.getAttribute('src') !== SCS.logo) img.src = SCS.logo;
      img.onerror = function () { img.onerror = null; img.src = SCS.DEFAULT_LOGO; };
    });
  };
  /** অ্যাপের আইকন: Admin Console থেকে আপলোড করা ছবি (লিংক) হলে <img>, না হলে ইমোজি */
  SCS.isIconImg = function (v) { return /^(https?:|data:image\/|\/)/i.test(String(v || '').trim()); };
  SCS.iconHtml = function (a, fallback) {
    var v = String((a && a.icon) || '').trim();
    if (SCS.isIconImg(v)) return '<img class="scs-aimg" src="' + SCS.esc(v) + '" alt="" loading="lazy" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;display:block" />';
    return SCS.esc(v || fallback || '📦');
  };
  SCS.loadBranding = function () {
    if (!sb) return Promise.resolve(SCS.logo);
    return sb.from('sys_settings').select('value').eq('key', 'branding').maybeSingle().then(function (r) {
      var v = r && r.data && r.data.value || {};
      var url = v.logoUrl || SCS.DEFAULT_LOGO;
      if (url !== SCS.logo) { SCS.logo = url; ls('scsb_logo', url === SCS.DEFAULT_LOGO ? null : url); SCS.applyLogo(); document.dispatchEvent(new CustomEvent('scs:logo', { detail: url })); }
      return url;
    }, function () { return SCS.logo; });
  };

  /* ---------------- auth / account ---------------- */
  SCS.session = function () {
    if (!sb) return Promise.resolve(null);
    return sb.auth.getSession().then(function (r) { return r && r.data ? r.data.session : null; });
  };

  SCS.loadMe = function () {
    if (!sb) return Promise.reject(new Error('Supabase is not configured (assets/config.js)'));
    return SCS.session().then(function (session) {
      if (!session) return null;
      var uid = session.user.id;
      return Promise.all([
        SCS.q(sb.from('profiles').select('*').eq('id', uid).maybeSingle()),
        SCS.q(sb.from('app_access').select('app_key, role').eq('user_id', uid)),
        SCS.q(sb.from('apps').select('*').eq('active', true).order('sort_order'))
      ]).then(function (r) {
        var profile = r[0] || { id: uid, email: session.user.email, status: 'pending', is_super_admin: false, full_name: '', phone: '', photo_url: '' };
        var access = {};
        (r[1] || []).forEach(function (a) { access[a.app_key] = a.role; });
        var me = {
          id: uid,
          email: profile.email || session.user.email,
          name: (profile.full_name || '').trim() || session.user.email,
          photo: profile.photo_url || '',
          profile: profile,
          isSuper: !!profile.is_super_admin && profile.status === 'active',
          active: profile.status === 'active',
          complete: !!((profile.full_name || '').trim() && (profile.phone || '').trim() && profile.photo_url),
          access: access,
          apps: r[2] || [],
          session: session
        };
        SCS.me = me;
        return me;
      });
    });
  };

  SCS.roleFor = function (me, appKey) {
    if (!me || !me.active) return null;
    if (me.isSuper) return 'admin';
    return me.access[appKey] || null;
  };

  /** হোম পেজের ভেতরে (জাতীয় সংগীত বাজার সময়) খোলা অ্যাপ হলে হোমের নিয়ন্ত্রণ, না হলে null */
  SCS.shell = function () { try { return window.top !== window && window.top.SCS_SHELL ? window.top.SCS_SHELL : null; } catch (e) { return null; } };
  // হোমের ভেতরে খোলা অ্যাপ: হোমের লিংকে ক্লিক -> অ্যাপ বন্ধ করে হোমে (হোমের ভেতরে আরেকটা হোম খোলে না)
  document.addEventListener('click', function (e) {
    var sh = SCS.shell(); if (!sh) return;
    var a = e.target.closest && e.target.closest('a[href]'); if (!a) return;
    var u = new URL(a.href, location.href), home = new URL(SCS.url('/'), location.href);
    if (u.origin === home.origin && (u.pathname === home.pathname || u.pathname === home.pathname + 'index.html')) { e.preventDefault(); sh.close(); }
  }, true);
  /** শর্ত মিলে যাওয়া হেডারের বাটন সবসময় লুকানো (অ্যাপের CSS টপকেও) */
  SCS.hideMatch = function (test) {
    function run() { [].forEach.call(document.querySelectorAll('header button, header a'), function (b) { if (test(b) && b.style.getPropertyValue('display') !== 'none') b.style.setProperty('display', 'none', 'important'); }); }
    var mo = new MutationObserver(function () { clearTimeout(mo._t); mo._t = setTimeout(run, 40); });
    function start() { run(); mo.observe(document.body, { childList: true, subtree: true }); }
    if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
  };
  /** ছোট নিশ্চিতকরণ পপআপ -> Promise<boolean> */
  SCS.confirmBox = function (title, text, okLabel, danger) {
    injectCss();
    return new Promise(function (resolve) {
      var w = document.createElement('div');
      w.className = 'scs-ui scs-cfm';
      w.innerHTML = '<div class="bx" role="dialog" aria-modal="true"><div class="ic">' + (danger ? '⚠️' : '❔') + '</div><b>' + SCS.esc(title) + '</b>' +
        (text ? '<p>' + SCS.esc(text) + '</p>' : '') +
        '<div class="bt"><button type="button" data-no>' + T('Cancel', 'বাতিল') + '</button><button type="button" data-ok class="' + (danger ? 'd' : '') + '">' + SCS.esc(okLabel || T('OK', 'ঠিক আছে')) + '</button></div></div>';
      function done(v) { w.remove(); document.removeEventListener('keydown', onKey); resolve(v); }
      function onKey(e) { if (e.key === 'Escape') done(false); }
      w.addEventListener('click', function (e) { if (e.target === w || e.target.closest('[data-no]')) done(false); else if (e.target.closest('[data-ok]')) done(true); });
      document.addEventListener('keydown', onKey);
      document.body.appendChild(w);
      setTimeout(function () { var b = w.querySelector('[data-ok]'); if (b) b.focus(); }, 30);
    });
  };
  /** লগআউট: সবসময় আগে নিশ্চিত করতে বলে (force = true দিলে সরাসরি) */
  SCS.signOut = function (force) {
    if (force !== true) {
      return SCS.confirmBox(T('Log out?', 'লগআউট করবেন?'), T('You will be signed out of SCS Management and all apps on this device.', 'এই ডিভাইসে SCS Management ও সব অ্যাপ থেকে লগআউট হয়ে যাবেন।'), T('Log out', 'লগআউট'), true)
        .then(function (ok) { if (ok) return SCS.signOut(true); });
    }
    try {
      Object.keys(localStorage).forEach(function (k) {
        if (/^scs_/.test(k) && !/lang|theme/.test(k)) localStorage.removeItem(k);
      });
    } catch (e) {}
    var p = Promise.resolve();
    try { if (SCS.push && SCS.push.forget) p = SCS.push.forget(); } catch (e) {}
    var win = SCS.shell() ? window.top : window;   // হোমের ভেতরে খোলা অ্যাপ থেকে লগআউট -> পুরো পেজ
    return p.catch(function () {}).then(function () { return sb ? sb.auth.signOut() : null; })
      .then(function () { win.location.href = SCS.url('/'); }, function () { win.location.href = SCS.url('/'); });
  };
  SCS.backToPortal = function () { location.href = SCS.url('/'); };

  SCS.accessToken = function () {
    return SCS.session().then(function (s) { return s ? s.access_token : ''; });
  };

  /**
   * সার্ভারের কাজ (SMS/ইমেইল কোড, পুশ, কাস্টমার SMS)।
   * প্রথমে Supabase Edge Function "scs-api" (যেকোনো হোস্টে চলে); না পেলে Netlify function।
   * config.js এ API: 'supabase' | 'netlify' দিয়ে নির্দিষ্ট করা যায় (ডিফল্ট 'auto')।
   */
  var FN_MAP = { 'password-reset': 'auth', push: 'push', 'send-sms': 'sms' };
  var apiMode = CFG.API || ls('scs_api_mode') || 'auto';
  function readResp(r, where) {
    return r.text().then(function (t) {
      var j = null; try { j = JSON.parse(t); } catch (e) {}
      var msg = (j && (j.error || j.message || j.msg)) || '';
      if (!r.ok) { var e = new Error(msg || ('Server error ' + r.status)); e.status = r.status; e.where = where; e.missing = r.status === 404 && /function was not found|not found/i.test(msg || 'not found') && !/Unknown function|No account|Order not found|Employee/i.test(msg); e.jwt = r.status === 401 && /jwt|authorization header/i.test(msg); throw e; }
      return j;
    });
  }
  function callSupabase(name, body, opts, tok) {
    var anon = CFG.SUPABASE_ANON_KEY || '';
    var h = { 'Content-Type': 'application/json', apikey: anon };
    if (tok) h.Authorization = 'Bearer ' + tok; else if (/^eyJ/.test(anon)) h.Authorization = 'Bearer ' + anon;
    var url = String(CFG.SUPABASE_URL || '').replace(/\/+$/, '') + '/functions/v1/scs-api?fn=' + (FN_MAP[name] || name);
    return fetch(url, { method: opts.method || 'POST', headers: h, body: opts.method === 'GET' ? undefined : JSON.stringify(body || {}) })
      .then(function (r) { return readResp(r, 'supabase'); });
  }
  function callNetlify(name, body, opts, tok) {
    var h = { 'Content-Type': 'application/json' };
    if (tok) h.Authorization = 'Bearer ' + tok;
    return fetch(SCS.url('/.netlify/functions/' + name), { method: opts.method || 'POST', headers: h, body: opts.method === 'GET' ? undefined : JSON.stringify(body || {}) })
      .then(function (r) { return readResp(r, 'netlify'); });
  }
  SCS.callFn = function (name, body, opts) {
    opts = opts || {};
    return (opts.anon ? Promise.resolve('') : SCS.accessToken()).then(function (tok) {
      if (apiMode === 'netlify') return callNetlify(name, body, opts, tok);
      return callSupabase(name, body, opts, tok).catch(function (e) {
        var netErr = !e.status;   // ফাংশন নেই / CORS / নেটওয়ার্ক
        if (apiMode === 'supabase' || !(e.missing || e.jwt || netErr)) throw e;
        return callNetlify(name, body, opts, tok).then(function (r) { apiMode = 'netlify'; ls('scs_api_mode', 'netlify'); return r; }, function (e2) {
          if (e.jwt) throw new Error(T('Server function "scs-api": turn OFF "Verify JWT" in Supabase → Edge Functions → scs-api → Settings.', 'সার্ভার ফাংশন "scs-api": Supabase → Edge Functions → scs-api → Settings এ "Verify JWT" বন্ধ করুন।'));
          if (e.missing || netErr) throw new Error(T('Server function not found. Deploy "scs-api" in Supabase → Edge Functions (see DEPLOY.md), or deploy on Netlify.', 'সার্ভার ফাংশন পাওয়া যায়নি। Supabase → Edge Functions এ "scs-api" ডিপ্লয় করুন (DEPLOY.md দেখুন), অথবা Netlify তে ডিপ্লয় করুন।') + ' (Server error 404 / not set up)');
          throw e2;
        });
      });
    });
  };

  /* ---------------- storage ---------------- */
  SCS.upload = function (path, blob, contentType) {
    return SCS.q(sb.storage.from('scs-files').upload(path, blob, { upsert: true, contentType: contentType || blob.type || 'application/octet-stream' })).then(function () { return path; });
  };
  SCS.download = function (path) { return SCS.q(sb.storage.from('scs-files').download(path)); };
  SCS.removeFile = function (path) { return SCS.q(sb.storage.from('scs-files').remove([path])); };
  SCS.signedUrl = function (path, secs) {
    return SCS.q(sb.storage.from('scs-files').createSignedUrl(path, secs || 600)).then(function (d) { return d.signedUrl; });
  };
  /** পাবলিক bucket (প্রোফাইল ছবি, লোগো) -> স্থায়ী URL */
  SCS.uploadPublic = function (path, blob, contentType) {
    return SCS.q(sb.storage.from('scs-public').upload(path, blob, { upsert: true, cacheControl: '31536000', contentType: contentType || blob.type || 'application/octet-stream' })).then(function () {
      return sb.storage.from('scs-public').getPublicUrl(path).data.publicUrl;
    });
  };
  SCS.blobToDataUrl = function (blob) {
    return new Promise(function (res, rej) {
      var r = new FileReader();
      r.onload = function () { res(String(r.result)); };
      r.onerror = function () { rej(r.error); };
      r.readAsDataURL(blob);
    });
  };
  SCS.dataUrlToBlob = function (dataUrl) {
    var m = String(dataUrl || '').match(/^data:([^;]+);base64,(.*)$/);
    if (!m) throw new Error('Invalid data URL');
    var bin = atob(m[2]), arr = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: m[1] });
  };
  /** ছবি ছোট করে JPEG (প্রোফাইল ছবি, ডকুমেন্ট) */
  SCS.resizeImage = function (file, max, quality) {
    max = max || 1600; quality = quality || 0.85;
    if (!/^image\/(png|jpe?g|webp|gif|bmp)$/i.test(file.type)) return Promise.resolve(file);
    return new Promise(function (res) {
      var img = new Image(), url = URL.createObjectURL(file);
      img.onload = function () {
        var s = Math.min(1, max / Math.max(img.width, img.height));
        if (s === 1 && file.size < 600 * 1024) { URL.revokeObjectURL(url); res(file); return; }
        var c = document.createElement('canvas');
        c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        var g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        c.toBlob(function (b) { res(b || file); }, 'image/jpeg', quality);
      };
      img.onerror = function () { URL.revokeObjectURL(url); res(file); };
      img.src = url;
    });
  };

  /* ---------------- UI styles (namespaced) ---------------- */
  var cssDone = false;
  function injectCss() {
    if (cssDone) return; cssDone = true;
    var css = document.createElement('style');
    css.id = 'scs-ui-css';
    css.textContent =
      '.scs-ui,.scs-ui *{box-sizing:border-box;font-family:"Hind Siliguri","Inter",system-ui,-apple-system,sans-serif}' +
      '.scs-gear{position:relative;display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:12px;border:1px solid rgba(255,255,255,.3);background:rgba(255,255,255,.18);color:#fff;cursor:pointer;flex:none;padding:0;transition:background .15s,transform .1s}' +
      '.scs-gear:hover{background:rgba(255,255,255,.3)}.scs-gear:active{transform:scale(.95)}' +
      '.scs-gear.dark{border-color:#e5e7eb;background:#f3f4f6;color:#111827}.scs-gear.dark:hover{background:#e5e7eb}' +
      '.scs-gear svg{width:19px;height:19px}' +
      '.scs-gear .dot{position:absolute;top:-5px;right:-5px;min-width:18px;height:18px;padding:0 5px;border-radius:99px;background:#ef4444;color:#fff;font-size:10.5px;font-weight:800;line-height:18px;text-align:center;border:2px solid #fff;display:none}' +
      '.scs-gear .dot.on{display:block}' +
      '.scs-menu{position:fixed;z-index:2147483600;width:300px;max-width:calc(100vw - 16px);background:#fff;color:#111827;border:1px solid #e5e7eb;border-radius:18px;box-shadow:0 24px 60px rgba(15,23,42,.22);padding:8px;display:none;animation:scsPop .14s ease-out}' +
      '.scs-menu.open{display:block}' +
      '@keyframes scsPop{from{opacity:0;transform:translateY(-6px) scale(.98)}to{opacity:1;transform:none}}' +
      '.scs-menu .u{display:flex;gap:10px;align-items:center;padding:8px 8px 12px;border-bottom:1px solid #f1f5f9;margin-bottom:6px}' +
      '.scs-menu .u img,.scs-menu .u .ph{width:42px;height:42px;border-radius:50%;object-fit:cover;flex:none;background:#fce7f3;color:#be185d;display:flex;align-items:center;justify-content:center;font-weight:800}' +
      '.scs-menu .u b{display:block;font-size:14px;line-height:1.2}.scs-menu .u small{display:block;font-size:11.5px;color:#6b7280;word-break:break-all}' +
      '.scs-menu .r{display:inline-block;margin-top:4px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;padding:2px 8px;border-radius:99px;background:#fce7f3;color:#be185d}' +
      '.scs-menu .it{display:flex;align-items:center;gap:10px;width:100%;text-align:left;padding:10px;border-radius:12px;font-size:13.5px;font-weight:600;color:#111827;text-decoration:none;background:none;border:0;cursor:pointer}' +
      '.scs-menu .it:hover{background:#f3f4f6}.scs-menu .it .ic{width:22px;text-align:center;font-size:15px}' +
      '.scs-menu .it .cnt{margin-left:auto;background:#ef4444;color:#fff;border-radius:99px;font-size:11px;font-weight:800;padding:1px 7px}' +
      '.scs-menu .it .sw{margin-left:auto;font-size:11px;font-weight:700;color:#6b7280}' +
      '.scs-menu .sep{height:1px;background:#f1f5f9;margin:6px 4px}' +
      '.scs-menu .lg{display:flex;gap:4px;margin:4px 6px 2px;background:#f3f4f6;border-radius:10px;padding:3px}' +
      '.scs-menu .lg button{flex:1;border:0;background:none;border-radius:8px;padding:6px;font-size:12px;font-weight:700;color:#6b7280;cursor:pointer}' +
      '.scs-menu .lg button.on{background:#fff;color:#e91e63;box-shadow:0 1px 3px rgba(0,0,0,.1)}' +
      '.scs-sheet{position:fixed;inset:0;z-index:2147483601;background:rgba(15,23,42,.55);backdrop-filter:blur(2px);display:flex;justify-content:flex-end}' +
      '.scs-sheet .pn{width:min(980px,100%);height:100%;background:#f5f5f7;display:flex;flex-direction:column;animation:scsSlide .18s ease-out;box-shadow:-20px 0 60px rgba(0,0,0,.2)}' +
      '.scs-sheet.narrow .pn{width:min(440px,100%)}' +
      '@keyframes scsSlide{from{transform:translateX(30px);opacity:.6}to{transform:none;opacity:1}}' +
      '.scs-sheet .hd{display:flex;align-items:center;gap:10px;padding:12px 14px;background:#fff;border-bottom:1px solid #e5e7eb;color:#111827}' +
      '.scs-sheet .hd b{flex:1;font-size:16px}' +
      '.scs-sheet .hd button{border:0;background:#f3f4f6;border-radius:10px;padding:7px 11px;font-weight:700;font-size:12.5px;cursor:pointer;color:#111827}' +
      '.scs-sheet .bd{flex:1;overflow:auto}.scs-sheet iframe{width:100%;height:100%;border:0;display:block}' +
      '.scs-nt{display:flex;gap:10px;padding:12px 14px;border-bottom:1px solid #e5e7eb;background:#fff;color:#111827;text-decoration:none;cursor:pointer}' +
      '.scs-nt.new{background:#fff5f9}.scs-nt .b{width:8px;height:8px;border-radius:50%;background:#e91e63;margin-top:7px;flex:none;visibility:hidden}.scs-nt.new .b{visibility:visible}' +
      '.scs-nt h4{margin:0;font-size:14px}.scs-nt p{margin:2px 0 0;font-size:12.5px;color:#4b5563}.scs-nt small{font-size:11px;color:#9ca3af}' +
      '.scs-empty{padding:50px 16px;text-align:center;color:#6b7280;font-size:14px}' +
      '.scs-tip{margin:12px;padding:12px;border-radius:12px;background:#eff6ff;color:#1d4ed8;font-size:12.5px;line-height:1.55}' +
      '.scs-toast{position:fixed;left:50%;top:14px;transform:translateX(-50%);z-index:2147483602;background:#111827;color:#fff;padding:11px 16px;border-radius:14px;font-size:13px;font-weight:600;box-shadow:0 14px 40px rgba(0,0,0,.3);max-width:92vw;cursor:pointer;animation:scsPop .16s ease-out}' +
      '.scs-pin{position:fixed;inset:0;z-index:2147483603;background:rgba(15,23,42,.6);backdrop-filter:blur(3px);display:flex;align-items:center;justify-content:center;padding:16px}' +
      '.scs-pin .bx{width:100%;max-width:320px;background:#fff;color:#111827;border-radius:22px;padding:22px;text-align:center;box-shadow:0 30px 70px rgba(0,0,0,.3)}' +
      '.scs-pin h3{margin:6px 0 4px;font-size:17px}.scs-pin p{margin:0 0 14px;font-size:12.5px;color:#6b7280}' +
      '.scs-pin input{width:100%;text-align:center;font-size:24px;letter-spacing:10px;padding:10px;border:1px solid #e5e7eb;border-radius:14px;outline:none}' +
      '.scs-pin input:focus{border-color:#e91e63;box-shadow:0 0 0 3px rgba(233,30,99,.15)}' +
      '.scs-pin .er{color:#dc2626;font-size:12.5px;min-height:18px;margin-top:6px}' +
      '.scs-pin .bt{display:flex;gap:8px;margin-top:8px}.scs-pin .bt button{flex:1;border:0;border-radius:12px;padding:11px;font-weight:700;cursor:pointer}' +
      '.scs-pin .bt .c{background:#f3f4f6;color:#111827}.scs-pin .bt .o{background:#e91e63;color:#fff}' +
      '.scs-fab{position:fixed;right:12px;top:12px;z-index:2147483000;display:flex;gap:6px}.scs-fab .scs-gear{background:#111827;border-color:#111827;box-shadow:0 8px 24px rgba(0,0,0,.25)}' +
      'a.scs-gear{text-decoration:none}' +
      '@media (max-width:480px){header .scs-gear{width:32px;height:32px;border-radius:10px}header .scs-gear svg{width:17px;height:17px}}' +
      /* অ্যাপের টপ বার: সব অ্যাপে একই রকম সরু; মোবাইলে নাম ছোট হয়ে সব বাটন এক লাইনে */
      '.scs-hdr .scs-gear{width:32px;height:32px;border-radius:10px}.scs-hdr .scs-gear svg{width:17px;height:17px}' +
      '.scs-hrow{flex-wrap:nowrap!important;min-width:0;padding-top:5px!important;padding-bottom:5px!important;min-height:0!important}' +
      '.scs-hrow>:first-child{min-width:0!important;flex:0 1 auto!important;overflow:hidden}' +
      '.scs-hslot{flex-wrap:nowrap!important;flex:0 0 auto!important;align-items:center!important;gap:5px!important;margin-left:auto}' +
      '.scs-hslot>button,.scs-hslot>a{height:32px!important;min-height:0!important;flex:none!important;box-sizing:border-box}' +
      '@media (max-width:640px){' +
        '.scs-hrow{gap:6px!important;padding-left:8px!important;padding-right:8px!important}' +
        // অ্যাপের পুরো নাম দেখা যাবে: দরকারে ছোট অক্ষরে দুই লাইনে
        '.scs-hrow>:first-child *{white-space:normal!important;text-overflow:clip!important;overflow:visible!important;word-break:normal}' +
        '.scs-hrow>:first-child em,.scs-hrow>:first-child small,.scs-hrow>:first-child i:not(:only-child){display:none!important}' +
        '.scs-hrow>:first-child img{width:22px!important;height:22px!important}' +
        '.scs-hrow>:first-child img,.scs-hrow>:first-child i,.scs-hrow>:first-child [data-scs-logo]{flex:none!important;overflow:visible!important;text-overflow:clip!important}' +
        '.scs-hrow>:first-child h1,.scs-hrow>:first-child b,.scs-hrow>:first-child span,.scs-hrow>:first-child div{font-size:12px!important;line-height:1.12!important;letter-spacing:-.1px}' +
        '.scs-hrow>:first-child{padding-top:3px!important;padding-bottom:3px!important;max-width:42vw}' +
        '.scs-hslot{gap:3px!important}' +
        '.scs-hslot>button,.scs-hslot>a,.scs-hslot .scs-gear{height:29px!important;min-width:29px!important;width:auto;padding:0 6px!important;border-radius:9px!important;font-size:11.5px!important}' +
        '.scs-hslot .scs-gear{width:29px!important;padding:0!important}' +
        '.scs-hslot svg{width:15px!important;height:15px!important}' +
        '.scs-hslot>button:has(svg)>span:not(.dot):not(:has(svg)):not(:has(img)){display:none!important}' +
        // মেনু বার ভেঙে নিচে না নেমে এক লাইনে, আঙুল দিয়ে ডানে-বামে সরানো যায়
        '.scs-swipe{display:flex!important;flex-wrap:nowrap!important;overflow-x:auto!important;overflow-y:hidden!important;-webkit-overflow-scrolling:touch;scrollbar-width:none;scroll-snap-type:x proximity;grid-template-columns:none!important;max-width:100%}' +
        '.scs-swipe::-webkit-scrollbar{display:none}' +
        '.scs-swipe>*{flex:0 0 auto!important;scroll-snap-align:start;white-space:nowrap}' +
      '}' +
      /* নিশ্চিতকরণ পপআপ */
      '.scs-cfm{position:fixed;inset:0;z-index:2147483600;background:rgba(15,23,42,.55);backdrop-filter:blur(3px);display:flex;align-items:center;justify-content:center;padding:16px;animation:scsFade .15s ease}' +
      '.scs-cfm .bx{width:100%;max-width:340px;background:#fff;color:#0f172a;border-radius:18px;padding:20px 18px 16px;text-align:center;box-shadow:0 24px 60px rgba(0,0,0,.3);font-family:inherit}' +
      '.scs-cfm .ic{font-size:30px;line-height:1;margin-bottom:6px}.scs-cfm b{display:block;font-size:17px;margin-bottom:4px}.scs-cfm p{margin:0 0 14px;font-size:13.5px;color:#475569;line-height:1.5}' +
      '.scs-cfm .bt{display:flex;gap:8px}.scs-cfm .bt button{flex:1;height:40px;border-radius:12px;border:1px solid #e2e8f0;background:#f8fafc;color:#0f172a;font-weight:700;font-size:14px;cursor:pointer}' +
      '.scs-cfm .bt button[data-ok]{background:#e91e63;border-color:#e91e63;color:#fff}.scs-cfm .bt button.d{background:#dc2626;border-color:#dc2626}' +
      '@keyframes scsFade{from{opacity:0}to{opacity:1}}' +
      '.scs-hd-logo{width:100%;height:100%;object-fit:contain;border-radius:inherit;background:#fff;padding:2px}' +
      '@media print{.scs-gear,.scs-menu,.scs-sheet,.scs-fab,.scs-toast{display:none!important}}';
    document.head.appendChild(css);
  }

  var GEAR_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>';

  function toast(text, onClick) {
    injectCss();
    var d = document.createElement('div');
    d.className = 'scs-ui scs-toast'; d.textContent = text;
    d.onclick = function () { d.remove(); if (onClick) onClick(); };
    document.body.appendChild(d);
    setTimeout(function () { d.remove(); }, 6000);
  }
  SCS.toast = toast;

  /* ---------------- side sheet (activity log, notifications) ---------------- */
  function sheet(title, bodyHtml, narrow, extraBtn) {
    injectCss();
    var old = document.querySelector('.scs-sheet'); if (old) old.remove();
    var d = document.createElement('div');
    d.className = 'scs-ui scs-sheet' + (narrow ? ' narrow' : '');
    d.innerHTML = '<div class="pn"><div class="hd"><b>' + title + '</b>' + (extraBtn || '') + '<button type="button" data-x>✕ ' + T('Close', 'বন্ধ') + '</button></div><div class="bd">' + bodyHtml + '</div></div>';
    d.addEventListener('click', function (e) { if (e.target === d || e.target.closest('[data-x]')) d.remove(); });
    document.body.appendChild(d);
    return d;
  }
  SCS.sheet = sheet;

  SCS.openActivity = function (appKey) {
    sheet('🕘 ' + T('Activity Log', 'অ্যাক্টিভিটি লগ'), '<iframe src="' + SCS.url('/activity.html') + '?embed=1' + (appKey ? '&app=' + encodeURIComponent(appKey) : '') + '"></iframe>', false,
      '<button type="button" onclick="window.open(\'' + SCS.url('/activity.html') + (appKey ? '?app=' + encodeURIComponent(appKey) : '') + '\',\'_blank\')">↗ ' + T('Full page', 'পুরো পেজ') + '</button>');
  };

  /* ---------------- notifications ---------------- */
  var N = SCS.notif = { list: [], unread: 0, listeners: [] };
  N.onChange = function (fn) { N.listeners.push(fn); };
  function nEmit() { N.listeners.forEach(function (f) { try { f(N.unread, N.list); } catch (e) {} }); }
  N.load = function () {
    if (!sb || !SCS.me) return Promise.resolve([]);
    return SCS.q(sb.from('notifications').select('*').eq('user_id', SCS.me.id).order('id', { ascending: false }).limit(60)).then(function (rows) {
      N.list = rows || [];
      N.unread = N.list.filter(function (n) { return !n.read_at; }).length;
      nEmit();
      return N.list;
    }).catch(function () { return []; });
  };
  N.markAllRead = function () {
    if (!N.unread) return Promise.resolve();
    var now = new Date().toISOString();
    N.list.forEach(function (n) { if (!n.read_at) n.read_at = now; });
    N.unread = 0; nEmit();
    return SCS.q(sb.from('notifications').update({ read_at: now }).eq('user_id', SCS.me.id).is('read_at', null)).catch(function () {});
  };
  N.clearAll = function () {
    N.list = []; N.unread = 0; nEmit();
    return SCS.q(sb.from('notifications').delete().eq('user_id', SCS.me.id)).catch(function () {});
  };
  N.subscribe = function () {
    if (!sb || !SCS.me || !sb.channel || N._ch) return;
    try {
      N._ch = sb.channel('scs-ntf-' + SCS.me.id).on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: 'user_id=eq.' + SCS.me.id },
        function (p) {
          var n = p.new; if (!n) return;
          N.list.unshift(n); N.unread++; nEmit();
          toast('🔔 ' + n.title + (n.body ? ' — ' + n.body : ''), function () { if (n.url) location.href = n.url; });
        }).subscribe();
    } catch (e) {}
  };
  N.open = function () {
    function render() {
      var d = document.querySelector('.scs-sheet .bd'); if (!d) return;
      var tip = '';
      if (SCS.push.supported() && SCS.push.permission() !== 'granted') tip = '<div class="scs-tip">🔔 ' + T('Turn on push notifications to get alerts on this phone/computer even when the app is closed.', 'অ্যাপ বন্ধ থাকলেও এই ফোন/কম্পিউটারে নোটিফিকেশন পেতে পুশ নোটিফিকেশন চালু করুন।') + ' <a href="#" data-push-on style="font-weight:800;color:#e91e63">' + T('Turn on', 'চালু করুন') + '</a></div>';
      d.innerHTML = tip + (N.list.length ? N.list.map(function (n) {
        return '<a class="scs-nt' + (n.read_at ? '' : ' new') + '" href="' + SCS.esc(SCS.url(n.url || '/')) + '"><span class="b"></span><div><h4>' + SCS.esc(n.title) + '</h4>' + (n.body ? '<p>' + SCS.esc(n.body) + '</p>' : '') + '<small>' + SCS.esc(SCS.ago(n.created_at)) + '</small></div></a>';
      }).join('') : '<div class="scs-empty">' + T('No notifications yet.', 'এখনো কোনো নোটিফিকেশন নেই।') + '</div>');
    }
    var s = sheet('🔔 ' + T('Notifications', 'নোটিফিকেশন'), '', true, '<button type="button" data-clear>' + T('Clear all', 'সব মুছুন') + '</button>');
    s.addEventListener('click', function (e) {
      if (e.target.closest('[data-clear]')) { N.clearAll().then(render); }
      if (e.target.closest('[data-push-on]')) { e.preventDefault(); SCS.push.enable().then(function () { toast(T('Push notifications are on for this device.', 'এই ডিভাইসে পুশ নোটিফিকেশন চালু হয়েছে।')); render(); }).catch(function (er) { alert(SCS.err(er)); }); }
    });
    render();
    N.load().then(function () { render(); setTimeout(N.markAllRead, 1500); });
  };

  /* ---------------- push (service worker) ---------------- */
  var P = SCS.push = {};
  P.supported = function () { return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window; };
  P.permission = function () { return 'Notification' in window ? Notification.permission : 'denied'; };
  P.isIOS = function () { return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); };
  P.standalone = function () { return (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true; };
  function urlB64ToUint8(b64) {
    var pad = '='.repeat((4 - b64.length % 4) % 4), raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
    var out = new Uint8Array(raw.length); for (var i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i); return out;
  }
  P.register = function () {
    if (!('serviceWorker' in navigator)) return Promise.resolve(null);
    return navigator.serviceWorker.register(SCS.url('/sw.js'), { scope: SCS.base }).catch(function () { return null; });
  };
  P.current = function () {
    if (!P.supported()) return Promise.resolve(null);
    return navigator.serviceWorker.getRegistration(SCS.base).then(function (reg) { return reg ? reg.pushManager.getSubscription() : null; }).catch(function () { return null; });
  };
  P.enable = function () {
    if (!P.supported()) {
      if (P.isIOS() && !P.standalone()) return Promise.reject(new Error(T('On iPhone/iPad: open this site in Safari → Share → "Add to Home Screen", open SCS from the home screen, then turn on notifications.', 'iPhone/iPad এ: Safari তে সাইটটি খুলে Share → "Add to Home Screen" দিন, হোম স্ক্রিন থেকে SCS খুলে তারপর নোটিফিকেশন চালু করুন।')));
      return Promise.reject(new Error(T('This browser does not support push notifications.', 'এই ব্রাউজারে পুশ নোটিফিকেশন সাপোর্ট করে না।')));
    }
    return Notification.requestPermission().then(function (perm) {
      if (perm !== 'granted') throw new Error(T('Notifications are blocked. Allow notifications for this site in your browser settings.', 'নোটিফিকেশন ব্লক করা আছে। ব্রাউজার সেটিংসে এই সাইটের নোটিফিকেশন Allow করুন।'));
      return P.register();
    }).then(function () { return navigator.serviceWorker.ready; }).then(function (reg) {
      return SCS.callFn('push', null, { method: 'GET', anon: true }).then(function (k) {
        return reg.pushManager.getSubscription().then(function (old) {
          return old || reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToUint8(k.publicKey) });
        });
      });
    }).then(function (sub) {
      var j = sub.toJSON();
      return SCS.q(sb.from('push_subscriptions').upsert({ user_id: SCS.me.id, endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth, user_agent: navigator.userAgent.slice(0, 200) }, { onConflict: 'endpoint' }));
    });
  };
  P.disable = function () {
    return P.current().then(function (sub) {
      if (!sub) return;
      var ep = sub.endpoint;
      return sub.unsubscribe().catch(function () {}).then(function () { return SCS.q(sb.from('push_subscriptions').delete().eq('endpoint', ep)).catch(function () {}); });
    });
  };
  /** লগআউটের সময়: এই ডিভাইস আর এই অ্যাকাউন্টের নোটিফিকেশন পাবে না */
  P.forget = function () { return SCS.me ? P.disable() : Promise.resolve(); };
  P.isOn = function () { return P.current().then(function (s) { return !!s && P.permission() === 'granted'; }); };
  P.test = function () { return SCS.callFn('push', { test: true }); };
  /** জমে থাকা নোটিফিকেশন পুশ করা (নতুন অর্ডার ইত্যাদির পর) */
  P.dispatch = function () { return SCS.callFn('push', { dispatch: true }).catch(function () {}); };

  /* ---------------- admin PIN ---------------- */
  SCS.adminPin = null;
  SCS.adminUnlocked = false;
  SCS.loadAdminPin = function (appKey) {
    if (!sb || SCS.role !== 'admin') return Promise.resolve(null);
    return sb.from('app_pins').select('pin').eq('app_key', appKey).maybeSingle().then(function (r) {
      SCS.adminPin = r && r.data && r.data.pin ? String(r.data.pin) : '2026';
      window.SCS_ADMIN_PIN = SCS.adminPin;
      return SCS.adminPin;
    }, function () { SCS.adminPin = '2026'; window.SCS_ADMIN_PIN = SCS.adminPin; return SCS.adminPin; });
  };
  /** অ্যাডমিন পিন সঠিক কি না (শুধু Admin রোলের জন্য) */
  SCS.checkAdminPin = function (pin) {
    var ok = SCS.role === 'admin' && SCS.adminPin != null && String(pin == null ? '' : pin) === SCS.adminPin;
    if (ok) SCS.adminUnlocked = true;
    return ok;
  };
  window.SCS_CHECK_ADMIN_PIN = SCS.checkAdminPin;
  /** পিন চাওয়ার নিজস্ব পপআপ -> Promise<boolean> */
  SCS.askAdminPin = function () {
    injectCss();
    if (SCS.role !== 'admin') {
      alert(T('Admin access is required. Ask the SCS Management admin to make you an Admin of this app.', 'এই কাজের জন্য Admin অ্যাক্সেস লাগবে। SCS Management অ্যাডমিনের কাছে অনুমতি চান।'));
      return Promise.resolve(false);
    }
    if (SCS.adminUnlocked) return Promise.resolve(true);
    return new Promise(function (res) {
      var d = document.createElement('div');
      d.className = 'scs-ui scs-pin';
      d.innerHTML = '<div class="bx"><div style="font-size:30px">🔐</div><h3>' + T('Admin PIN', 'অ্যাডমিন পিন') + '</h3><p>' + T('Enter the admin PIN to continue.', 'চালিয়ে যেতে অ্যাডমিন পিন দিন।') + '</p>' +
        '<input type="password" inputmode="numeric" autocomplete="off" maxlength="12" /><div class="er"></div>' +
        '<div class="bt"><button type="button" class="c">' + T('Cancel', 'বাতিল') + '</button><button type="button" class="o">' + T('Unlock', 'খুলুন') + '</button></div></div>';
      document.body.appendChild(d);
      var inp = d.querySelector('input');
      function done(v) { d.remove(); res(v); }
      function go() { if (SCS.checkAdminPin(inp.value)) done(true); else { d.querySelector('.er').textContent = T('Wrong PIN', 'ভুল পিন'); inp.value = ''; inp.focus(); } }
      d.querySelector('.o').onclick = go;
      d.querySelector('.c').onclick = function () { done(false); };
      inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') go(); if (e.key === 'Escape') done(false); });
      setTimeout(function () { inp.focus(); }, 30);
    });
  };

  /* ---------------- full-screen notice ---------------- */
  function notice(title, body, buttons) {
    var d = document.createElement('div');
    d.id = 'scs-notice';
    d.setAttribute('style', 'position:fixed;inset:0;z-index:2147483646;background:#f5f5f7;display:flex;align-items:center;justify-content:center;padding:20px;font-family:"Hind Siliguri",system-ui,sans-serif');
    d.innerHTML = '<div style="max-width:440px;width:100%;background:#fff;border:1px solid #e5e7eb;border-radius:22px;padding:28px;box-shadow:0 20px 50px rgba(0,0,0,.08);text-align:center;color:#1f2937">' +
      '<img data-scs-logo alt="SCS" style="width:72px;height:72px;object-fit:contain;margin:0 auto 10px;display:block" />' +
      '<h2 style="margin:0 0 8px;font-size:19px">' + title + '</h2><p style="margin:0 0 18px;font-size:14px;color:#4b5563;line-height:1.6">' + body + '</p>' +
      (buttons || '<a href="' + SCS.url('/') + '" style="display:inline-block;background:#e91e63;color:#fff;text-decoration:none;padding:10px 18px;border-radius:12px;font-weight:700">' + T('Go to SCS Management', 'SCS Management এ যান') + '</a>') +
      '</div>';
    document.body.appendChild(d);
    SCS.applyLogo(d);
  }
  SCS.notice = notice;

  /* ---------------- settings (gear) menu ---------------- */
  /**
   * opts: { appKey, appName, role, dark (gear style for light headers) }
   * returns the gear button element
   */
  SCS.makeGear = function (opts) {
    injectCss();
    opts = opts || {};
    var me = SCS.me;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'scs-ui scs-gear' + (opts.dark ? ' dark' : '');
    btn.setAttribute('data-scs-gear', '1');
    btn.title = T('Settings', 'সেটিংস');
    btn.innerHTML = GEAR_SVG + '<span class="dot"></span>';
    var menu = document.querySelector('.scs-menu');
    if (!menu) {
      menu = document.createElement('div');
      menu.className = 'scs-ui scs-menu';
      document.body.appendChild(menu);
      document.addEventListener('click', function (e) {
        if (!menu.contains(e.target) && !e.target.closest('[data-scs-gear]')) menu.classList.remove('open');
      });
      window.addEventListener('resize', function () { menu.classList.remove('open'); });
    }
    function paintDot() {
      document.querySelectorAll('[data-scs-gear] .dot').forEach(function (dot) {
        dot.textContent = N.unread > 99 ? '99+' : String(N.unread);
        dot.classList.toggle('on', N.unread > 0);
      });
    }
    N.onChange(paintDot);
    paintDot();

    function renderMenu() {
      var ph = me.photo ? '<img src="' + SCS.esc(me.photo) + '" alt="" />' : '<span class="ph">' + SCS.esc(me.name.charAt(0).toUpperCase()) + '</span>';
      var roleTxt = opts.appKey ? (opts.appName || opts.appKey) + ' · ' + (opts.role === 'admin' ? 'Admin' : 'User') : (me.isSuper ? 'Super Admin' : T('Member', 'সদস্য'));
      var h = '<div class="u">' + ph + '<div style="min-width:0"><b>' + SCS.esc(me.name) + '</b><small>' + SCS.esc(me.email) + (me.profile.employee_id ? ' · ' + SCS.esc(me.profile.employee_id) : '') + '</small><span class="r">' + SCS.esc(roleTxt) + '</span></div></div>';
      h += '<button type="button" class="it" data-m="notif"><span class="ic">🔔</span>' + T('Notifications', 'নোটিফিকেশন') + (N.unread ? '<span class="cnt">' + N.unread + '</span>' : '') + '</button>';
      if (me.active) h += '<button type="button" class="it" data-m="activity"><span class="ic">🕘</span>' + T('Activity Log', 'অ্যাক্টিভিটি লগ') + '</button>';
      if (opts.appKey && opts.role === 'admin' && opts.onAdmin) h += '<button type="button" class="it" data-m="admin"><span class="ic">🔐</span>' + T('Admin panel', 'অ্যাডমিন প্যানেল') + '</button>';
      // অ্যাপের নিজের সেটিং/লগ বাটন (উপরে আলাদা আইকন না রেখে এই মেনুতেই)
      (SCS.gearExtras || []).forEach(function (x, i) {
        if (x.show && !x.show()) return;
        h += '<button type="button" class="it" data-m="x' + i + '"><span class="ic">' + (x.icon || '•') + '</span>' + SCS.esc(typeof x.label === 'function' ? x.label() : x.label) + '</button>';
      });
      h += '<button type="button" class="it" data-m="push"><span class="ic">📲</span>' + T('Push notifications', 'পুশ নোটিফিকেশন') + '<span class="sw" data-pushsw>…</span></button>';
      h += '<div class="sep"></div>';
      h += '<a class="it" href="' + SCS.url('/profile.html') + '"><span class="ic">👤</span>' + T('My profile', 'আমার প্রোফাইল') + '</a>';
      if (opts.appKey) h += '<a class="it" href="' + SCS.url('/') + '"><span class="ic">🏠</span>SCS Management</a>';
      if (me.isSuper) h += '<a class="it" href="' + SCS.url('/admin.html') + '"><span class="ic">🛡️</span>' + T('Admin Console', 'অ্যাডমিন কনসোল') + '</a>';
      if (opts.showLang !== false) h += '<div class="lg"><button type="button" data-lang="en" class="' + (SCS.lang === 'en' ? 'on' : '') + '">English</button><button type="button" data-lang="bn" class="' + (SCS.lang === 'bn' ? 'on' : '') + '">বাংলা</button></div>';
      h += '<div class="sep"></div><button type="button" class="it" data-m="out"><span class="ic">↩</span>' + T('Logout', 'লগআউট') + '</button>';
      menu.innerHTML = h;
      P.isOn().then(function (on) { var s = menu.querySelector('[data-pushsw]'); if (s) { s.textContent = on ? T('ON', 'চালু') : T('OFF', 'বন্ধ'); s.style.color = on ? '#059669' : '#6b7280'; } });
    }
    function place() {
      var r = btn.getBoundingClientRect();
      var w = Math.min(300, window.innerWidth - 16);
      var left = Math.min(Math.max(8, r.right - w), window.innerWidth - w - 8);
      menu.style.left = left + 'px';
      menu.style.top = Math.min(r.bottom + 8, window.innerHeight - 100) + 'px';
      menu.style.maxHeight = (window.innerHeight - r.bottom - 20) + 'px';
      menu.style.overflow = 'auto';
    }
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (menu.classList.contains('open') && menu._owner === btn) { menu.classList.remove('open'); return; }
      menu._owner = btn; menu._opts = opts; renderMenu(); place(); menu.classList.add('open');
    });
    if (!menu._wired) {
      menu._wired = true;
      menu.addEventListener('click', function (e) {
        var o = menu._opts || {};
        var lg = e.target.closest('[data-lang]');
        if (lg) {
          SCS.setLang(lg.getAttribute('data-lang'));
          if (o.onLang) o.onLang(SCS.lang); else if (o.appKey) location.reload();
          menu.classList.remove('open'); return;
        }
        var m = e.target.closest('[data-m]'); if (!m) return;
        var k = m.getAttribute('data-m');
        menu.classList.remove('open');
        if (/^x\d+$/.test(k)) { var ex = (SCS.gearExtras || [])[+k.slice(1)]; if (ex && ex.run) ex.run(); return; }
        if (k === 'notif') N.open();
        if (k === 'activity') SCS.openActivity(o.appKey || '');
        if (k === 'admin' && o.onAdmin) o.onAdmin();
        if (k === 'out') SCS.signOut();
        if (k === 'push') {
          P.isOn().then(function (on) {
            if (on) {
              if (confirm(T('Push notifications are ON for this device.\n\nOK = send a test notification\nCancel = keep as is', 'এই ডিভাইসে পুশ নোটিফিকেশন চালু আছে।\n\nOK = টেস্ট নোটিফিকেশন পাঠান\nCancel = যেমন আছে'))) {
                P.test().then(function (r) { toast(r && r.sent ? T('Test notification sent', 'টেস্ট নোটিফিকেশন পাঠানো হয়েছে') : T('Sent, but no device received it. Turn it off and on again.', 'পাঠানো হয়েছে, কিন্তু কোনো ডিভাইস পায়নি। বন্ধ করে আবার চালু করুন।')); }).catch(function (er) { alert(SCS.err(er)); });
              } else if (confirm(T('Turn OFF push notifications on this device?', 'এই ডিভাইসে পুশ নোটিফিকেশন বন্ধ করবেন?'))) {
                P.disable().then(function () { toast(T('Push notifications turned off', 'পুশ নোটিফিকেশন বন্ধ হয়েছে')); });
              }
            } else {
              P.enable().then(function () { toast(T('Push notifications are on for this device.', 'এই ডিভাইসে পুশ নোটিফিকেশন চালু হয়েছে।')); }).catch(function (er) { alert(SCS.err(er)); });
            }
          });
        }
      });
    }
    return btn;
  };

  /** টপ বারের হোম বাটন — SCS Management হোম পেজ (অন্য অ্যাপে যাওয়ার জন্য) */
  SCS.makeHome = function (dark) {
    injectCss();
    var a = document.createElement('a');
    a.href = SCS.url('/');
    a.className = 'scs-ui scs-gear' + (dark ? ' dark' : '');
    a.setAttribute('data-scs-home', '1');
    a.title = T('SCS Management home — switch apps', 'SCS Management হোম — অন্য অ্যাপে যান');
    a.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h5v-6h4v6h5V9.5"/></svg>';
    // হোম পেজের ভেতরে খোলা থাকলে (গান বাজার সময়): হোম বাটন = অ্যাপ বন্ধ করে হোমে ফেরা (গান চলতে থাকে)
    a.addEventListener('click', function (e) { var sh = SCS.shell(); if (sh) { e.preventDefault(); sh.close(); } });
    return a;
  };

  /** টপ বারের Recent activity বাটন — ক্লিক করলে অ্যাক্টিভিটি লগ খোলে */
  SCS.makeActivityBtn = function (appKey, dark) {
    injectCss();
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'scs-ui scs-gear' + (dark ? ' dark' : '');
    b.setAttribute('data-scs-activity', '1');
    b.title = T('Recent activity', 'সাম্প্রতিক অ্যাক্টিভিটি');
    b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v4h4"/><path d="M12 7v5l3 2"/></svg>';
    b.addEventListener('click', function (e) { e.stopPropagation(); SCS.openActivity(appKey || ''); });
    return b;
  };

  /* ---------------- রিয়েল-টাইম: ডাটাবেসে কিছু বদলালে সাথে সাথে অ্যাপ আপডেট ---------------- */
  // প্রতিটা অ্যাপের কোন টেবিল দেখতে হবে (নতুন অ্যাপে bootApp(..., { live: [...] }) দিয়ে দেওয়া যায়)
  SCS.LIVE_TABLES = {
    'chemical-order': ['chem_orders', 'chem_products', 'chem_sellers', 'chem_settings'],
    'attendance': ['att_records', 'att_employees', 'att_settings'],
    'monthly-report': ['mr_month_data', 'mr_settings', 'chem_orders', 'att_monthly_summary']
  };
  /** tables বদলালে onChange (একসাথে অনেক বদলালে একবারই); অ্যাপ লুকানো থাকলে ফিরে এলে */
  SCS.live = function (tables, onChange) {
    if (!sb || !tables || !tables.length) return null;
    var t = null, pending = false;
    function fire() {
      if (document.hidden) { pending = true; return; }
      clearTimeout(t); t = setTimeout(function () { try { onChange(); } catch (e) { console.warn(e); } }, 350);
    }
    document.addEventListener('visibilitychange', function () { if (!document.hidden && pending) { pending = false; fire(); } });
    try {
      var ch = sb.channel('scs-live-' + SCS.shortId());
      tables.forEach(function (tb) { ch = ch.on('postgres_changes', { event: '*', schema: 'public', table: tb }, fire); });
      ch.subscribe();
      return ch;
    } catch (e) { return null; }
  };
  /** পুরনো অ্যাপগুলো "পেজে ফিরে এলে নতুন ডাটা আনে" — সেই সংকেত দিয়ে সাথে সাথে রিফ্রেশ করানো */
  SCS.liveNudge = function () { document.dispatchEvent(new Event('visibilitychange')); };

  /** নোটিফিকেশন চালু করা (লোড, লাইভ, পুশ ডিসপ্যাচ) */
  SCS.startNotifications = function () {
    if (!SCS.me || !SCS.me.active) return;
    N.load();
    N.subscribe();
    P.register();
    setTimeout(P.dispatch, 4000);
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') N.load(); });
  };

  /* ---------------- app header integration ---------------- */
  function visible(el) { return !!(el && (el.offsetWidth || el.offsetHeight || el.getClientRects().length)); }
  /** অ্যাপের টপ বারে সেটিংস আইকন + লোগো বসানো (React রি-রেন্ডার হলেও আবার বসে) */
  function mountInHeader(appKey, role, opts) {
    opts = opts || {};
    var appInfo = (SCS.me.apps || []).filter(function (a) { return a.key === appKey; })[0] || { name: appKey };
    var gear = null, tries = 0, fab = null;
    function findHeader() {
      var hs = [].slice.call(document.querySelectorAll(opts.header || 'header'));
      for (var i = 0; i < hs.length; i++) if (visible(hs[i]) && !hs[i].closest('#scs-notice')) return hs[i];
      return null;
    }
    function rightSlot(h) {
      var sel = opts.slot || window.SCS_HEADER_SLOT;
      if (sel) { var s = h.querySelector(sel); if (s) return s; }
      // হেডারের ভেতরের সারি (একটাই র‍্যাপার থাকলে তার ভেতরে) -> ডান দিকের বাটনের গ্রুপ
      var row = h;
      while (row && row.children.length === 1) row = row.firstElementChild;
      if (!row || row === h && !h.children.length) return null;
      return row.lastElementChild && row.lastElementChild !== row.firstElementChild ? row.lastElementChild : row;
    }
    function swapLogo(h) {
      h.querySelectorAll('img[alt="SCS Logo"]:not([data-scs-logo])').forEach(function (img) { img.setAttribute('data-scs-logo', '1'); img.style.objectFit = 'contain'; });
      [].slice.call(h.querySelectorAll('div,span')).forEach(function (el) {
        if (el.children.length === 0 && el.textContent.trim() === 'SCS' && el.offsetWidth < 70 && !el.querySelector('img')) {
          el.innerHTML = '<img data-scs-logo alt="SCS" class="scs-hd-logo" />';
          el.style.padding = '0'; el.style.overflow = 'hidden';
        }
      });
      SCS.applyLogo(h);
    }
    function ensure() {
      var h = findHeader();
      if (!h) {
        if (++tries > 40 && !fab) {   // হেডার না পেলে ভাসমান বাটন
          fab = document.createElement('div'); fab.className = 'scs-ui scs-fab';
          gear = SCS.makeGear({ appKey: appKey, appName: appInfo.name, role: role, onAdmin: opts.onAdmin });
          fab.appendChild(SCS.makeHome(false)); fab.appendChild(gear); document.body.appendChild(fab);
        }
        return;
      }
      swapLogo(h);
      if (h.querySelector('[data-scs-gear]')) return;
      var slot = rightSlot(h); if (!slot) return;
      if (fab) { fab.remove(); fab = null; }
      gear = SCS.makeGear({ appKey: appKey, appName: appInfo.name, role: role, dark: !!opts.darkGear, onAdmin: opts.onAdmin });
      var home = SCS.makeHome(!!opts.darkGear);
      if (/^(BUTTON|A|INPUT|SELECT|IMG|LABEL)$/.test(slot.tagName)) {
        // সমতল হেডার (ডানে আলাদা গ্রুপ নেই, যেমন Quotation/Workspace): বাটনের ভেতরে নয় —
        // ফাঁকা জায়গার (spacer) ঠিক পরে, ডানের সব বাটনের আগে: Home, Settings, তারপর বাকিগুলো
        var row = slot.parentElement, kids = [].slice.call(row.children), at = -1;
        kids.forEach(function (c, i) { if (!c.querySelector('button,a,input') && !/^(BUTTON|A)$/.test(c.tagName) && parseFloat(getComputedStyle(c).flexGrow) > 0) at = i; });
        var before = at >= 0 ? kids[at + 1] : kids.filter(function (c, i) { return i > 0 && /^(BUTTON|A)$/.test(c.tagName); })[0] || slot;
        row.insertBefore(gear, before); row.insertBefore(home, gear);
        h.classList.add('scs-hdr', 'scs-hflat'); row.classList.add('scs-hrow');
      } else {
        slot.insertBefore(gear, slot.firstChild);
        slot.insertBefore(home, gear);
        // সব অ্যাপের টপ বার একই রকম সরু, মোবাইলে এক লাইনে (CSS: .scs-hdr / .scs-hrow / .scs-hslot)
        h.classList.add('scs-hdr'); slot.classList.add('scs-hslot');
        if (slot.parentElement && slot.parentElement !== h.parentElement) slot.parentElement.classList.add('scs-hrow');
      }
      document.documentElement.classList.add('scs-has-hdr');
    }
    var mo = new MutationObserver(function () { clearTimeout(mo._t); mo._t = setTimeout(ensure, 60); });
    mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'src'] });
    var iv = setInterval(function () { ensure(); if (tries > 60) clearInterval(iv); }, 250);
    ensure();
  }

  /* ---------------- অ্যাপের নিজের সেটিংস বাটন -> SCS গিয়ার মেনু (শুধু সেই অ্যাপের পেজে) ---------------- */
  /** sel = অ্যাপের বাটনের CSS selector; বাটনটা লুকিয়ে গিয়ার মেনুতে একটা লাইন যোগ হয় */
  SCS.absorbButton = function (sel, icon, label) {
    sel = sel.split(',').map(function (s) { return s.trim() + ':not([data-scs-gear])'; }).join(',');   // SCS এর নিজের গিয়ার বাদ
    var st = document.createElement('style');
    st.textContent = sel + '{display:none!important}';
    (document.head || document.documentElement).appendChild(st);
    // অ্যাপের CSS (যেমন Tailwind এর লেয়ার) টপকে গেলেও লুকানো থাকে: সরাসরি এলিমেন্টে
    function hideNow() { [].forEach.call(document.querySelectorAll(sel), function (b) { if (b.style.getPropertyValue('display') !== 'none') b.style.setProperty('display', 'none', 'important'); }); }
    var hmo = new MutationObserver(function () { clearTimeout(hmo._t); hmo._t = setTimeout(hideNow, 30); });
    function startHide() { hideNow(); hmo.observe(document.body, { childList: true, subtree: true }); }
    if (document.body) startHide(); else document.addEventListener('DOMContentLoaded', startHide);
    SCS.gearExtras = SCS.gearExtras || [];
    SCS.gearExtras.push({
      icon: icon || '⚙️', label: label,
      show: function () { return !!document.querySelector(sel); },
      run: function () { var b = document.querySelector(sel); if (b) b.click(); }
    });
  };

  /** শর্ত মিলে যাওয়া বাটন (যেমন হেডারের Sync) লুকিয়ে গিয়ার মেনুতে — অ্যাপের বাটন selector না জানলেও */
  SCS.absorbMatch = function (test, icon, label) {
    function find() { return [].filter.call(document.querySelectorAll('header button, header a'), function (b) { return !b.closest('[data-scs-gear]') && !b.classList.contains('scs-gear') && test(b); }); }
    function hideNow() { find().forEach(function (b) { if (b.style.getPropertyValue('display') !== 'none') b.style.setProperty('display', 'none', 'important'); b.__scsAbs = 1; }); }
    var mo = new MutationObserver(function () { clearTimeout(mo._t); mo._t = setTimeout(hideNow, 40); });
    function start() { hideNow(); mo.observe(document.body, { childList: true, subtree: true }); }
    if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
    SCS.gearExtras = SCS.gearExtras || [];
    SCS.gearExtras.push({ icon: icon, label: label, show: function () { return find().length > 0; }, run: function () { var b = find()[0]; if (b) b.click(); } });
  };
  /* রিয়েল-টাইম থাকায় হেডারের Sync বাটন দরকার নেই -> গিয়ার মেনুতে "Refresh data" */
  function syncToGear() {
    if (syncToGear.on) return; syncToGear.on = true;
    SCS.absorbMatch(function (b) {
      var s = ((b.getAttribute('title') || '') + ' ' + (b.getAttribute('onclick') || '') + ' ' + (b.getAttribute('data-act') || '') + ' ' + (b.getAttribute('data-a') || '') + ' ' + (b.id || '') + ' ' + (b.textContent || '')).trim();
      return /(^|\W)(sync|syncnow|syncall|triggersync|hsync)|সিঙ্ক/i.test(s);
    }, '🔄', function () { return SCS.lang === 'bn' ? 'ডাটা রিফ্রেশ (সিঙ্ক)' : 'Refresh data (sync)'; });
  }

  /* ---------------- মেনু বার: মোবাইলে সোয়াইপ + রিলোডে আগের ট্যাব ---------------- */
  function navWatch(appKey) {
    var KEY = 'scs_tab_' + appKey, restored = false, t = null;
    var mobile = window.matchMedia ? window.matchMedia('(max-width: 640px)') : { matches: false };
    function items(el) { return [].slice.call(el.children).filter(function (c) { return /^(BUTTON|A)$/.test(c.tagName) && c.offsetWidth; }); }
    // পপআপ/মোডাল (fixed) বা কিপ্যাডের ভেতরের বাটন মেনু নয়
    function inOverlay(el) {
      for (var x = el; x && x !== document.body; x = x.parentElement) {
        var ps = getComputedStyle(x).position;
        if (ps === 'fixed' || x.getAttribute('role') === 'dialog' || x.getAttribute('aria-modal') === 'true') return true;
      }
      return false;
    }
    function looksLikeKeypad(k) {
      var short = k.filter(function (c) { return (c.textContent || '').trim().length <= 2; }).length;
      return short >= Math.ceil(k.length / 2);
    }
    var known = [];
    function navs() {
      // আগে পাওয়া মেনু এখনো পেজে থাকলে আবার খোঁজার দরকার নেই (দ্রুত)
      known = known.filter(function (el) { return document.body.contains(el) && items(el).length >= 3; });
      if (known.length) return known;
      var hdr = document.querySelector('header.scs-hdr') || document.querySelector('header');
      var hb = hdr ? hdr.getBoundingClientRect().bottom : 0;
      var seen = [], out = [];
      [].forEach.call(document.querySelectorAll('button,a'), function (b) { var p = b.parentElement; if (p && seen.indexOf(p) < 0) seen.push(p); });
      seen.forEach(function (el) {
        if (out.length >= 2 || el.closest('header') || el.closest('.scs-ui')) return;
        var k = items(el); if (k.length < 3 || looksLikeKeypad(k)) return;
        var r = el.getBoundingClientRect();
        if (r.top < hb - 4 || r.top >= hb + 220 || el.querySelector('input,select,textarea') || inOverlay(el)) return;
        out.push(el);
      });
      known = out;
      return out;
    }
    function label(b) { return (b.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40); }
    function run() {
      var list = navs();
      list.forEach(function (el) {
        var k = items(el);
        // মোবাইলে একাধিক লাইনে ভাঙলে -> এক লাইনে সোয়াইপ
        if (mobile.matches) {
          var tops = {}; k.forEach(function (c) { tops[Math.round(c.getBoundingClientRect().top)] = 1; });
          if (Object.keys(tops).length > 1 || el.classList.contains('scs-swipe')) el.classList.add('scs-swipe');
        }
        if (!el.__scsTab) {
          el.__scsTab = true;
          el.addEventListener('click', function (e) {
            var b = e.target.closest('button,a'); if (!b || b.parentElement !== el) return;
            try { sessionStorage.setItem(KEY, label(b)); } catch (x) {}
          });
        }
      });
      // রিলোডের পর আগের ট্যাবে (অ্যাডমিন/লগআউট ট্যাব বাদ)
      if (!restored && list.length) {
        restored = true;
        var want = ''; try { want = sessionStorage.getItem(KEY) || ''; } catch (x) {}
        if (want && !/admin|অ্যাডমিন|প্রশাসক|logout|লগআউট|^all \d|export|এক্সপোর্ট/i.test(want)) {
          var b = items(list[0]).filter(function (c) { return label(c) === want; })[0];
          if (b && !b.classList.contains('active') && b.getAttribute('aria-current') !== 'page') setTimeout(function () { b.click(); }, 80);
        }
      }
    }
    if (navWatch.on) return; navWatch.on = true;
    injectCss();
    // হালকা: পেজ বদলালে সর্বোচ্চ প্রতি ৬০০ms এ একবার (টাইপ করার সময় ধীর হয় না)
    var last = 0;
    function schedule() {
      clearTimeout(t);
      var wait = Math.max(250, 600 - (Date.now() - last));
      t = setTimeout(function () { last = Date.now(); run(); }, wait);
    }
    var mo = new MutationObserver(schedule);
    mo.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('resize', schedule);
    setTimeout(run, 400);
  }

  /* ---------------- কোম্পানির লাইব্রেরি পিকার (📚): অ্যাপের সেটিংসে সিল/সিগনেচার/লোগো/প্যাড ---------------- */
  var LIB_RE = /(seal|signature|sign\b|sig\b|signat|logo|letter\s*head|\bpad\b|সিল|স্বাক্ষর|সিগনেচার|লোগো|প্যাড)/i;
  function libKind(s) {
    s = String(s || '');
    if (/seal|সিল/i.test(s)) return 'seal';
    if (/sign|sig\b|স্বাক্ষর|সিগনেচার/i.test(s)) return 'signature';
    if (/logo|লোগো/i.test(s)) return 'logo';
    if (/pad|letter\s*head|প্যাড/i.test(s)) return 'pad';
    return '';
  }
  function fieldText(el) {
    var lab = el.id ? document.querySelector('label[for="' + el.id + '"]') : null;
    var s = [el.placeholder, el.getAttribute('aria-label'), el.title, el.name, el.id, el.className, lab && lab.textContent, el.closest('label') && el.closest('label').textContent].join(' ');
    var p = el.parentElement;
    for (var i = 0; i < 2 && p; i++, p = p.parentElement) { var tx = (p.textContent || '').trim(); if (tx.length < 160) s += ' ' + tx; }
    // ঘরের ঠিক আগের লেবেল/শিরোনাম (যেমন Workspace: <label>Seal image link</label><div><input></div>)
    for (var x = el, k = 0; x && k < 3; x = x.parentElement, k++) {
      var pv = x.previousElementSibling;
      if (pv && !pv.querySelector('input,select,textarea')) { var pt = (pv.textContent || '').trim(); if (pt && pt.length < 120) { s += ' ' + pt; break; } }
    }
    return s;
  }
  function setVal(el, v) {
    var d = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value');
    if (d && d.set) d.set.call(el, v); else el.value = v;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }
  /* লাইব্রেরির তালিকা একবার আনা হয় (৫ মিনিট মনে রাখা) আর ছবিগুলো আগেই ব্রাউজারে লোড — বাছাই সাথে সাথে */
  var libRows = null, libAt = 0;
  SCS.libList = function (fresh) {
    if (!fresh && libRows && Date.now() - libAt < 300000) return Promise.resolve(libRows);
    return SCS.q(sb.from('brand_assets').select('*').order('kind').order('sort_order').order('created_at')).then(function (rows) {
      libRows = rows || []; libAt = Date.now();
      libRows.forEach(function (a) { var im = new Image(); im.src = a.url; });   // আগেই ক্যাশে
      return libRows;
    });
  };
  var LIB_KINDS = [['', 'All', 'সব'], ['pad', 'Pad / Letterhead', 'প্যাড / লেটারহেড'], ['seal', 'Seal', 'সিল'], ['signature', 'Signature', 'সিগনেচার'], ['logo', 'Logo', 'লোগো'], ['other', 'Other', 'অন্যান্য']];
  SCS.pickAsset = function (kind) {
    injectCss();
    return SCS.libList().then(function (rows) {
      return new Promise(function (resolve) {
        var w = document.createElement('div'); w.className = 'scs-ui scs-cfm';
        var cur = kind && rows.some(function (a) { return a.kind === kind; }) ? kind : '';
        function list() { return rows.filter(function (a) { return !cur || a.kind === cur; }); }
        function draw() {
          var l = list();
          w.innerHTML = '<div class="bx" style="max-width:560px;text-align:left"><b>📚 ' + T('Company library', 'কোম্পানির লাইব্রেরি') + '</b>' +
            '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">' + LIB_KINDS.filter(function (k) { return !k[0] || rows.some(function (a) { return a.kind === k[0]; }); }).map(function (k) {
              return '<button type="button" data-kind="' + k[0] + '" style="border:1px solid ' + (cur === k[0] ? '#e91e63;background:#e91e63;color:#fff' : '#e2e8f0;background:#fff;color:#0f172a') + ';border-radius:999px;padding:4px 11px;font-size:12px;font-weight:700;cursor:pointer">' + T(k[1], k[2]) + '</button>';
            }).join('') + '</div>' +
            (l.length ? '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px;max-height:56vh;overflow:auto;margin:10px 0">' + l.map(function (a, i) {
              return '<button type="button" data-pick="' + i + '" style="border:1px solid #e2e8f0;border-radius:12px;background:#fff;padding:6px;cursor:pointer;text-align:center">' +
                '<img src="' + SCS.esc(a.url) + '" alt="" loading="eager" style="height:84px;width:100%;object-fit:contain;display:block"><div style="font-size:11.5px;font-weight:700;margin-top:4px;color:#0f172a">' + SCS.esc(a.title) + '</div></button>';
            }).join('') + '</div>' : '<p>' + T('The library is empty. Upload in SCS Management → Admin Console → Documents.', 'লাইব্রেরি খালি। SCS Management → Admin Console → Documents এ আপলোড করুন।') + '</p>') +
            '<div class="bt"><button type="button" data-no>' + T('Cancel', 'বাতিল') + '</button></div></div>';
        }
        draw();
        w.addEventListener('click', function (e) {
          var kb = e.target.closest('[data-kind]');
          if (kb) { cur = kb.getAttribute('data-kind'); draw(); return; }
          var b = e.target.closest('[data-pick]');
          if (b) { var a = list()[+b.getAttribute('data-pick')]; w.remove(); resolve(a); return; }
          if (e.target === w || e.target.closest('[data-no]')) { w.remove(); resolve(null); }
        });
        document.body.appendChild(w);
      });
    });
  };
  function libWatch() {
    if (libWatch.on) return; libWatch.on = true;
    function scan() {
      [].forEach.call(document.querySelectorAll('input:not([data-scs-lib])'), function (el) {
        var type = (el.type || 'text').toLowerCase();
        if (type !== 'text' && type !== 'url' && !(type === 'file' && /image/.test(el.accept || 'image'))) return;
        if (el.closest('.scs-ui') || !el.offsetParent && type !== 'file') return;
        var txt = fieldText(el);
        if (type !== 'file' && /folder|ফোল্ডার/i.test((el.placeholder || '') + ' ' + (el.value || '') + ' ' + (el.id || ''))) return;   // ফোল্ডারের লিংক ছবি নয়
        var imgLink = type !== 'file' && (/drive\.google\.com\/(file|uc|open|thumbnail)/i.test(el.placeholder || '') || (/drive\.google|drive link|ড্রাইভ/i.test(txt) && /image|ছবি|url|link|লিংক/i.test(txt)));
        if (!LIB_RE.test(txt) && !imgLink) return;
        if (type !== 'file' && /(^|\W)(name|title|নাম)(\W|$)/i.test((el.placeholder || '') + ' ' + (el.getAttribute('aria-label') || '')) && !imgLink) return;   // নামের ঘর নয়
        el.setAttribute('data-scs-lib', '1');
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'scs-ui'; b.textContent = '📚';
        b.title = T('Pick from the company library', 'কোম্পানির লাইব্রেরি থেকে বাছুন');
        b.style.cssText = 'margin-left:4px;padding:4px 8px;border-radius:9px;border:1px solid #fbcfe8;background:#fdf2f8;cursor:pointer;font-size:14px;line-height:1;vertical-align:middle';
        var anchor = type === 'file' ? (el.closest('label') || el) : el;
        if (type === 'file' && getComputedStyle(anchor).display === 'none') anchor = anchor.parentElement || anchor;
        anchor.insertAdjacentElement('afterend', b);
        b.onclick = function (e) {
          e.preventDefault(); e.stopPropagation();
          SCS.pickAsset(libKind(txt)).then(function (a) {
            if (!a) return;
            if (type !== 'file') {
              setVal(el, a.url);
              // পাশেই অ্যাপের "Load / লোড / Apply" বাটন থাকলে সেটাও চাপা (ছবি সাথে সাথে দেখায়)
              var row = el.parentElement, lb = row && [].filter.call(row.querySelectorAll('button'), function (x) { return x !== b && !x.classList.contains('scs-ui') && /^(load|লোড|apply|প্রয়োগ|set|preview)\b/i.test((x.textContent || '').trim()); })[0];
              if (lb) setTimeout(function () { lb.click(); }, 30);
              return;
            }
            // ফাইল চাওয়া ঘর: লাইব্রেরির ছবিটাই ফাইল হিসেবে বসানো
            fetch(a.url).then(function (r) { return r.blob(); }).then(function (bl) {
              var f = new File([bl], (a.title || 'image').replace(/[^\w.-]+/g, '_') + '.' + ((bl.type.split('/')[1] || 'png').replace('jpeg', 'jpg')), { type: bl.type || 'image/png' });
              var dt = new DataTransfer(); dt.items.add(f); el.files = dt.files;
              el.dispatchEvent(new Event('change', { bubbles: true }));
            }).catch(function (er) { alert(SCS.err(er)); });
          });
        };
      });
    }
    var t = null;
    new MutationObserver(function () { clearTimeout(t); t = setTimeout(scan, 350); }).observe(document.body, { childList: true, subtree: true });
    setTimeout(scan, 600);
  }

  SCS._navWatch = function (k) {   // লোকাল টেস্ট মোডের জন্য
    navWatch(k); syncToGear(); libWatch();
    try { if (!SCS.me) SCS.me = { apps: [], profile: {}, test: true }; mountInHeader(k, 'admin', {}); } catch (e) { console.warn(e); }
  };

  /* ---------------- app boot ---------------- */
  /**
   * SCS.bootApp('app-key', ['app.js'], { header: 'css selector', darkGear: false, onAdmin: fn })
   * window.SCS_ROLE = 'admin' | 'user'; window.SCS_ADMIN_PIN (শুধু Admin রোলে)
   */
  SCS.bootApp = function (appKey, scripts, opts) {
    SCS.app = appKey;
    opts = opts || {};
    if (!configured) {
      notice(T('Supabase setup pending', 'Supabase সেটআপ বাকি'), T('Add your Supabase URL and anon key in <code>assets/config.js</code>.', '<code>assets/config.js</code> ফাইলে আপনার Supabase URL ও anon key বসান।'), ' ');
      readyReject(new Error('Not configured'));
      return;
    }
    SCS.loadBranding();
    SCS.loadMe().then(function (me) {
      if (!me) { location.replace(SCS.url('/') + '?next=' + encodeURIComponent(location.pathname + location.search)); return; }
      if (me.profile.status === 'disabled') { notice(T('Account disabled', 'অ্যাকাউন্ট বন্ধ'), T('Your account has been disabled by the admin.', 'আপনার অ্যাকাউন্টটি অ্যাডমিন বন্ধ করে রেখেছেন।')); return; }
      if (!me.complete || me.profile.must_change_pw) { location.replace(SCS.url('/profile.html') + '?next=' + encodeURIComponent(location.pathname + location.search)); return; }
      if (!me.active) { notice(T('Waiting for approval', 'অনুমোদনের অপেক্ষায়'), T('Your account has not been approved yet. You can open the app after the admin approves it.', 'আপনার অ্যাকাউন্ট এখনো অ্যাডমিন অনুমোদন দেননি। অনুমোদনের পর অ্যাপে ঢুকতে পারবেন।')); return; }
      var role = SCS.roleFor(me, appKey);
      if (!role) { notice(T('No access', 'অ্যাক্সেস নেই'), T('Your account does not have access to this app. Ask the admin for access.', 'এই অ্যাপে কাজ করার অনুমতি আপনার অ্যাকাউন্টে নেই। অ্যাডমিনের কাছে অ্যাক্সেস চান।')); return; }
      SCS.role = role;
      window.SCS_ROLE = role;
      var emp = me.profile.employee_id || '';
      window.SCS_EMP_ID = emp;
      return SCS.loadAdminPin(appKey).then(function () {
        readyResolve(me);
        mountInHeader(appKey, role, opts);
        try { navWatch(appKey); } catch (e) {}
        try { syncToGear(); } catch (e) {}
        try { libWatch(); SCS.libList().catch(function () {}); } catch (e) {}   // লাইব্রেরি পিকার: সবার জন্য (তালিকা আগেই আনা)
        SCS.startNotifications();
        sb.auth.onAuthStateChange(function (ev) { if (ev === 'SIGNED_OUT') location.href = SCS.url('/'); });
        var chain = Promise.resolve();
        (scripts || []).forEach(function (src) { chain = chain.then(function () { return SCS.loadScript(src); }); });
        var liveTables = opts.live || SCS.LIVE_TABLES[appKey];
        if (liveTables) chain.then(function () { SCS.live(liveTables, opts.onLive || SCS.liveNudge); });
        chain.catch(function (e) { notice(T('Could not load', 'লোড হয়নি'), SCS.esc(e.message)); });
      });
    }).catch(function (e) {
      notice(T('Connection problem', 'সংযোগ সমস্যা'), SCS.esc(SCS.err(e)), '<button onclick="location.reload()" style="background:#e91e63;color:#fff;border:0;padding:10px 18px;border-radius:12px;font-weight:700;cursor:pointer">' + T('Try again', 'আবার চেষ্টা করুন') + '</button>');
      readyReject(e);
    });
  };

  /* ---------------- portal pages (index, admin, activity, profile) ---------------- */
  /** পোর্টাল পেজের হেডারে লোগো, ভাষা ও সেটিংস মেনু */
  SCS.portalHeader = function (me, slot) {
    SCS.applyLogo();
    if (!me || !slot) return;
    if (me.active && !slot.querySelector('[data-scs-activity]')) slot.appendChild(SCS.makeActivityBtn(''));
    // সাইটের ঠিকানা ডাটাবেসে (সার্ভার থেকে পুশ নোটিফিকেশন / রিমাইন্ডারের জন্য)
    var siteNow = SCS.siteUrl().replace(/\/$/, '');
    if (me.isSuper && !/^(localhost|127\.|\[::1\])/.test(location.hostname) && ls('scs_site_saved') !== siteNow) {
      // site = ওয়েবসাইটের ঠিকানা; api = Supabase সার্ভার ফাংশন (ডাটাবেস এখান দিয়ে পুশ নোটিফিকেশন পাঠায়)
      sb.from('sys_settings').upsert([
        { key: 'site', value: { url: siteNow } },
        { key: 'api', value: { url: String(CFG.SUPABASE_URL || '').replace(/\/+$/, '') + '/functions/v1/scs-api', anon: CFG.SUPABASE_ANON_KEY || '' } }
      ]).then(function (r) { if (r && !r.error) ls('scs_site_saved', siteNow); });
    }
    var g = SCS.makeGear({ onLang: function () { location.reload(); } });
    slot.appendChild(g);
    SCS.startNotifications();
  };

  window.SCS = SCS;
})();
