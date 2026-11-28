/* =====================================================================
 *  SCS Apps Script Host — পেজের দিক
 *  - অ্যাপের আসল Index.html এর google.script.run -> Web Worker (runtime.js) এ আসল Code.gs
 *  - লগইন টোকেন, অ্যাপের রোল ও অ্যাডমিন পিন worker কে দেয়
 *  - অন্য কেউ ডাটা বদলালে (Supabase Realtime) অ্যাপকে সাথে সাথে রিফ্রেশ করায়
 *  - নোটিফিকেশন ইভেন্ট (নতুন অর্ডার, ছুটির আবেদন ...) ডাটাবেসে পাঠায়
 *
 *  ব্যবহার (apps/<key>/index.html এর <head> এ, অ্যাপের নিজের স্ক্রিপ্টের আগে):
 *    <script src="../../assets/config.js"></script>
 *    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js"></script>
 *    <script src="../../assets/scs-core.js"></script>
 *    <script src="../../assets/gas/host.js" data-app="chemical-order"></script>
 *    ... অ্যাপের আসল Index.html ...
 *    <script src="adapter.js"></script>
 * ===================================================================== */
(function () {
  'use strict';
  var me = document.currentScript;
  var APP = (me && me.getAttribute('data-app')) || '';
  var SERVER_ADAPTER = (me && me.getAttribute('data-server')) || '';
  var VER = ((me && me.src || '').match(/[?&]v=([^&#]+)/) || [])[1] || '';   // ক্যাশ এড়াতে build-app.ps1 এর ভার্সন
  // যে অ্যাপগুলোর ডাটা এই অ্যাপ পড়ে (যেমন Report ← Chemical Order) — ওগুলো বদলালেও লাইভ রিফ্রেশ
  var LINKED = String((me && me.getAttribute('data-linked')) || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
  var BASE_DIR = (me && me.src || '').replace(/host\.js.*$/, '');
  var test = /[?&]scs_test=1/.test(location.search) || (window.SCS_GAS_TEST === true);

  var worker = null, ready = false, seq = 0, pending = {}, queue = [], fatal = null;
  var H = window.SCS_GAS_HOST = {
    app: APP, ready: false, onReady: [], onRemoteChange: [], onEvent: {}, calls: 0,
    /** অ্যাডাপ্টার: কোন ফাংশনের পর কোন নোটিফিকেশন ইত্যাদি */
    after: {},
    serverAdapter: '',
    files: {}
  };

  function post(msg) { if (worker) worker.postMessage(msg); }
  function send(fn, args) {
    return new Promise(function (res, rej) {
      var id = ++seq;
      pending[id] = { res: res, rej: rej, fn: fn, args: args };
      var m = { type: fn === '__triggers' ? 'triggers' : 'call', id: id, fn: fn, args: args };
      if (fatal) { delete pending[id]; rej(new Error(fatal)); return; }
      if (!ready) queue.push(m); else post(m);
    });
  }
  H.call = function (fn) { return send(fn, [].slice.call(arguments, 1)); };
  /** worker এর সেটিং বদলানো (যেমন এমপ্লয়ি তালিকা নতুন করে) */
  H.setCfg = function (c) { post({ type: 'cfg', cfg: c }); };
  /** পরীক্ষার জন্য: মেমরি ডাটাবেস ও Activity Log দেখা */
  H.dump = function () { return new Promise(function (res) { var id = ++seq; pending['d' + id] = { res: res }; post({ type: 'dump', id: id }); }); };
  H.callArgs = send;

  /* ---------------- google.script.run (অ্যাপের আসল কোড এটাই ডাকে) ---------------- */
  function clone(v) { if (v === undefined || v === null || typeof v !== 'object') return v; try { return JSON.parse(JSON.stringify(v)); } catch (e) { return v; } }
  function runner(ok, fail, user) {
    return new Proxy({}, {
      get: function (_t, name) {
        if (name === 'withSuccessHandler') return function (f) { return runner(f, fail, user); };
        if (name === 'withFailureHandler') return function (f) { return runner(ok, f, user); };
        if (name === 'withUserObject') return function (u) { return runner(ok, fail, u); };
        if (typeof name !== 'string' || name === 'then') return undefined;
        return function () {
          var args = [].slice.call(arguments).map(clone);
          send(name, args).then(function (v) {
            if (ok) { try { ok(v, user); } catch (e) { console.error(e); } }
          }, function (e) {
            console.warn('[SCS ' + APP + '] ' + name + ' failed:', e.message);
            if (fail) { try { fail(e, user); } catch (x) { console.error(x); } }
          });
        };
      }
    });
  }
  window.google = window.google || {};
  window.google.script = window.google.script || {};
  Object.defineProperty(window.google.script, 'run', { configurable: true, get: function () { return runner(null, null, undefined); } });
  window.google.script.host = { close: function () {}, setHeight: function () {}, setWidth: function () {}, editor: { focus: function () {} }, origin: location.origin };
  window.google.script.url = { getLocation: function (cb) { var p = {}; new URLSearchParams(location.search).forEach(function (v, k) { p[k] = v; }); cb({ hash: location.hash.slice(1), parameter: p, parameters: {} }); } };
  window.google.script.history = { push: function () {}, replace: function () {}, setChangeHandler: function () {} };

  /* ---------------- worker থেকে বার্তা ---------------- */
  function onMsg(ev) {
    var m = ev.data || {};
    if (m.type === 'ready') {
      ready = H.ready = true;
      queue.splice(0).forEach(post);
      H.onReady.forEach(function (f) { try { f(); } catch (e) { console.error(e); } });
      // বাকি থাকা টাইম-ট্রিগার (অটো ব্যাকআপ ইত্যাদি) — একটু পরে, ব্যাকগ্রাউন্ডে
      if (!test) setTimeout(function () { send('__triggers', []).catch(function () {}); }, 15000);
      return;
    }
    if (m.type === 'fatal') {
      fatal = m.error; console.error(m.error);
      Object.keys(pending).forEach(function (id) { pending[id].rej(new Error(fatal)); delete pending[id]; });
      if (window.SCS && SCS.notice) SCS.notice(SCS.t('App could not start', 'অ্যাপ চালু হয়নি'), SCS.esc(fatal));
      return;
    }
    if (m.type === 'committed') { H.lastCommit = Date.now(); return; }
    if (m.type === 'chunks') { if (!test) saveChunks(m.items || []); return; }
    if (m.type === 'chunksKeep') { if (!test) keepChunks(m.pre, m.keep || []); return; }
    if (m.type === 'dump') { var dp = pending['d' + m.id]; if (dp) { delete pending['d' + m.id]; dp.res(m); } return; }
    if (m.type === 'notify') { fireNotify(m); return; }
    if (m.type === 'result') {
      var p = pending[m.id]; if (!p) return; delete pending[m.id];
      H.calls++;
      if (m.ok) {
        p.res(m.value);
        var hook = H.after[p.fn];
        if (hook) setTimeout(function () { try { hook(m.value, p.args); } catch (e) { console.warn(e); } }, 0);
      } else p.rej(new Error(m.error));
    }
  }
  function fireNotify(m) {
    if (test || !window.SCS || !SCS.sb) return;
    var args = { p_app: APP, p_event: m.event, p_title: m.title, p_body: m.body || '', p_url: m.url || ('/apps/' + APP + '/'), p_target: m.target || null };
    if (m.task) args.p_task = m.task;   // কাজের নোটিফিকেশন: "পরে মনে করিয়ে দিন" + কাজ বাকি থাকলে ভদ্র রিমাইন্ডার
    SCS.sb.rpc('scs_app_notify', args).then(function (r) {
      if (r && r.error && args.p_task) { delete args.p_task; return SCS.sb.rpc('scs_app_notify', args); }   // পুরনো ডাটাবেস (v15 SQL চালানো হয়নি)
    }).then(function () { if (SCS.push && SCS.push.dispatch) SCS.push.dispatch(); });
  }
  /** অ্যাডাপ্টার পেজ থেকে নোটিফিকেশন পাঠাতে */
  H.notify = function (event, title, body, url, target, task) { fireNotify({ event: event, title: title, body: body, url: url, target: target, task: task }); };

  /* ---------------- চালু করা ---------------- */
  function getText(url) { return fetch(url, { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error('Could not load ' + url + ' (' + r.status + ')'); return r.text(); }); }
  /* ---------------- বড় শিটের টুকরো এই ডিভাইসে জমা (IndexedDB) ----------------
   *  প্রথমবার যে টুকরো নামে সেটা এখানে থাকে; পরের বার অ্যাপ খুললে শুধু বদলানো টুকরোই নামে — তাই দ্রুত খোলে */
  var CDB = null;
  function cdb() {
    if (CDB) return CDB;
    CDB = new Promise(function (res) {
      try {
        var r = indexedDB.open('scs-chunks', 1);
        r.onupgradeneeded = function () { r.result.createObjectStore('c'); };
        r.onsuccess = function () { res(r.result); }; r.onerror = function () { res(null); };
      } catch (e) { res(null); }
    });
    return CDB;
  }
  function eachKey(db, pre, fn) {
    return new Promise(function (res) {
      try {
        var tx = db.transaction('c', fn.write ? 'readwrite' : 'readonly'), rq = tx.objectStore('c').openCursor(IDBKeyRange.bound(pre, pre + '￿'));
        rq.onsuccess = function () { var c = rq.result; if (c) { fn(c); c.continue(); } else res(); };
        rq.onerror = function () { res(); };
      } catch (e) { res(); }
    });
  }
  function seedChunks() {
    return cdb().then(function (db) {
      if (!db) return [];
      var out = [];
      return Promise.all([APP].concat(LINKED).map(function (a) { return eachKey(db, a + '|', function (c) { out.push({ k: c.key, d: c.value }); }); })).then(function () { return out; });
    }).catch(function () { return []; });
  }
  function saveChunks(items) {
    cdb().then(function (db) { if (!db) return; try { var st = db.transaction('c', 'readwrite').objectStore('c'); items.forEach(function (x) { st.put(x.d, x.k); }); } catch (e) {} });
  }
  function keepChunks(pre, keep) {
    cdb().then(function (db) {
      if (!db) return; var k = {}; keep.forEach(function (h) { k[pre + h] = 1; });
      var del = function (c) { if (!k[c.key]) c.delete(); }; del.write = true;
      eachKey(db, pre, del);
    });
  }

  function start(opts) {
    var codeUrl = opts.code || 'Code.gs';
    Promise.all([getText(codeUrl), opts.serverAdapter ? getText(opts.serverAdapter) : Promise.resolve(H.serverAdapter || ''), test ? Promise.resolve([]) : seedChunks()]).then(function (r) {
      worker = new Worker(BASE_DIR + 'runtime.js' + (VER ? '?v=' + VER : ''));
      worker.onmessage = onMsg;
      worker.onerror = function (e) { fatal = 'Engine error: ' + (e.message || e); onMsg({ data: { type: 'fatal', error: fatal } }); };
      worker.postMessage({ type: 'init', cfg: opts.cfg, code: r[0], adapter: r[1], files: H.files, seed: opts.seed || null, chunks: r[2] });
    }).catch(function (e) { onMsg({ data: { type: 'fatal', error: e.message } }); });
  }
  H.start = start;

  /** অ্যাপের UI স্ক্রিপ্ট — অ্যাকাউন্ট/রোল জানা হওয়ার পরে লোড (লগইন স্ক্রিন এড়াতে) */
  window.SCS_GAS_LOAD = function (src) {
    var go = function () {
      var s = document.createElement('script'); s.src = src;
      // অ্যাপের UI লোড শেষ -> adapter.js এর কাজ (window 'scs-app-loaded' ইভেন্ট)
      s.onload = function () {
        window.SCS_APP_LOADED = true; window.__scsStarted = true;
        // অ্যাপের নিজের "লোড হচ্ছে" পর্দা (যেমন #scs-boot) সরানো
        setTimeout(function () { var b = document.getElementById('scs-boot'); if (b) b.style.display = 'none'; }, 50);
        try { window.dispatchEvent(new Event('scs-app-loaded')); } catch (e) {}
      };
      document.body.appendChild(s);
    };
    if (test) { if (H.ready) go(); else H.onReady.push(go); return; }
    var wait = function () { if (window.SCS && SCS.ready) SCS.ready.then(go, function () {}); else setTimeout(wait, 30); };
    wait();
  };

  /** অ্যাপের পুরনো "পেজে ফিরে এলে রিফ্রেশ" নিয়ম দিয়ে সাথে সাথে রিফ্রেশ */
  H.nudge = function () {
    if (H.onRemoteChange.length) H.onRemoteChange.forEach(function (f) { try { f(); } catch (e) { console.warn(e); } });
    else document.dispatchEvent(new Event('visibilitychange'));
  };

  function profilesForEngine() {
    // এমপ্লয়ি অটো-সিঙ্ক: সক্রিয় এমপ্লয়ি প্রোফাইল (নাম, মোবাইল, ছবি, ID, পদবি)
    return SCS.q(SCS.sb.rpc('scs_app_employees', { p_app: APP })).catch(function () { return []; });
  }

  if (test) {
    // লোকাল পরীক্ষা: মেমরি ডাটাবেস, Admin রোল (পিন 2026)
    window.SCS_ROLE = 'admin';
    if (window.SCS) { SCS.role = 'admin'; SCS.adminPin = '2026'; }
    window.addEventListener('DOMContentLoaded', function () {
      if (window.SCS && SCS._navWatch) setTimeout(function () { SCS._navWatch(APP); }, 500);
      start({ cfg: { app: APP, appName: APP, store: 'memory', role: 'admin', adminPin: '2026', user: { id: 'test-user', email: 'tester@example.com', name: 'Test Admin' }, site: location.origin + '/', tz: 'Asia/Dhaka', employees: window.SCS_GAS_TEST_EMPLOYEES || [] }, serverAdapter: H.serverAdapterUrl || SERVER_ADAPTER, seed: window.SCS_GAS_TEST_SEED });
    });
    return;
  }

  /* SCS অ্যাকাউন্ট দিয়ে চালু (scs-core এর bootApp এর পরে) */
  function boot() {
    if (!window.SCS) { setTimeout(boot, 30); return; }
    SCS.bootApp(APP, [], H.bootOpts || {});
    SCS.ready.then(function (meInfo) {
      return Promise.all([SCS.accessToken(), profilesForEngine()]).then(function (r) {
        var cfg = {
          app: APP, appName: ((meInfo.apps || []).filter(function (a) { return a.key === APP; })[0] || {}).name || APP,
          store: 'supabase', url: String(SCS.config.SUPABASE_URL).replace(/\/+$/, ''), anon: SCS.config.SUPABASE_ANON_KEY,
          token: r[0], api: String(SCS.config.SUPABASE_URL).replace(/\/+$/, '') + '/functions/v1/scs-api',
          role: SCS.role, adminPin: SCS.adminPin, tz: (SCS.config.TIMEZONE || 'Asia/Dhaka'), lang: SCS.lang,
          site: SCS.siteUrl(), user: { id: meInfo.id, email: meInfo.email, name: meInfo.name, employeeId: meInfo.profile.employee_id || '' },
          employees: r[1] || []
        };
        start({ cfg: cfg, serverAdapter: H.serverAdapterUrl || SERVER_ADAPTER });
        // টোকেন নবায়ন হলে worker কে দেওয়া
        SCS.sb.auth.onAuthStateChange(function (ev, session) { if (session && session.access_token) post({ type: 'token', token: session.access_token }); });
        setInterval(function () { SCS.accessToken().then(function (t) { post({ type: 'token', token: t }); }); }, 5 * 60 * 1000);
        // রিয়েল-টাইম: এই অ্যাপের কোনো শিট অন্য কেউ বদলালে
        SCS.live && (function () {
          var t = null;
          try {
            var onChange = function () {
              if (H.lastCommit && Date.now() - H.lastCommit < 1500) return;   // নিজের সেভ
              clearTimeout(t); t = setTimeout(function () { if (!document.hidden) H.nudge(); else H._pendingNudge = true; }, 300);
            };
            var ch = SCS.sb.channel('gas-' + APP + '-' + SCS.shortId());
            [APP].concat(LINKED).forEach(function (a) {
              ch = ch.on('postgres_changes', { event: '*', schema: 'public', table: 'gas_versions', filter: 'app_key=eq.' + a }, onChange);
            });
            ch.subscribe();
          } catch (e) {}
          document.addEventListener('visibilitychange', function () { if (!document.hidden && H._pendingNudge) { H._pendingNudge = false; setTimeout(H.nudge, 50); } });
        })();
      });
    });
  }
  /* ---------------- ভিজিটর লিংক (লগইন ছাড়া শুধু দেখা) ----------------
   * ?v=<টোকেন> থাকলে: SCS লগইন লাগে না। ডাটাবেসের gas_visitor_data ফাংশন লিংক (আর পিন থাকলে পিন)
   * যাচাই করে শুধু দেখার জন্য ডাটা দেয়; ভিজিটরের কিছুই ডাটাবেসে লেখা হয় না (মেমরি স্টোর)। */
  var VISIT = (APP === 'worker-attendance' || (me && me.hasAttribute('data-visitor'))) ? String(new URLSearchParams(location.search).get('v') || '').replace(/[^A-Za-z0-9]/g, '').slice(0, 64) : '';
  function visitorRpc(pin) {
    var base = String(window.SCS_CONFIG && SCS_CONFIG.SUPABASE_URL || (window.SCS && SCS.config && SCS.config.SUPABASE_URL) || '').replace(/\/+$/, '');
    var anon = (window.SCS_CONFIG && SCS_CONFIG.SUPABASE_ANON_KEY) || (window.SCS && SCS.config && SCS.config.SUPABASE_ANON_KEY) || '';
    return fetch(base + '/rest/v1/rpc/gas_visitor_data', {
      method: 'POST', headers: { apikey: anon, Authorization: 'Bearer ' + anon, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_app: APP, p_token: VISIT, p_pin: pin || '' })
    }).then(function (r) { return r.json(); });
  }
  function visitorStart(d) {
    if (worker) { try { worker.terminate(); } catch (e) {} worker = null; }
    ready = H.ready = false;
    start({ cfg: { app: APP, appName: APP, store: 'memory', role: 'user', visitor: true, user: { id: 'visitor', email: '', name: 'Visitor' },
      site: location.href.replace(/apps\/[^/]+\/.*$/, ''), tz: 'Asia/Dhaka', employees: [] },
      serverAdapter: H.serverAdapterUrl || SERVER_ADAPTER, seed: { sheets: (d && d.sheets) || [], props: (d && d.props) || [] } });
  }
  function visitorBoot() {
    document.documentElement.classList.add('scs-visitor');
    visitorRpc('').then(function (d) {
      if (!d || d.ok === false && !d.pin) { visitorStart({ props: [] }); return; }   // লিংক বন্ধ/ভুল -> অ্যাপ নিজেই "deny" দেখায়
      visitorStart(d);
    }, function () { visitorStart({ props: [] }); });
    // পিন দিলে: আগে সার্ভারে যাচাই করে পুরো ডাটা আনা, তারপর অ্যাপের নিজের যাচাই
    var _send = send;
    send = function (fn, args) {
      if (fn !== 'visitorLogin') return _send(fn, args);
      return visitorRpc(args && args[1]).then(function (d) {
        if (!d || !d.ok) return { success: false };
        visitorStart(d);
        return _send(fn, args);
      });
    };
  }
  if (VISIT && !test) visitorBoot(); else boot();
})();
