/* projects UI — Apps Script Index.html থেকে (tools/build-app.ps1) */
if(!window.SCS_GAS_HOST){(function(){var k='scs_reload_projects';try{if(!sessionStorage.getItem(k)){sessionStorage.setItem(k,'1');location.replace(location.pathname+'?r='+Date.now()+location.hash);return}}catch(e){}alert('This page is outdated: please upload the new apps/projects/index.html to the site, then reload.\nপেজটা পুরনো: সাইটে নতুন apps/projects/index.html আপলোড করে রিলোড করুন।')})();throw new Error('SCS: outdated index.html')}
try{sessionStorage.removeItem('scs_reload_projects')}catch(e){}
(function () {
'use strict';
var G = typeof google !== 'undefined' && google.script && google.script.run;
var $ = function (s) { return document.querySelector(s); };
var ls = function (k, v) { try { if (v === undefined) return localStorage.getItem('scs_pj_' + k); localStorage.setItem('scs_pj_' + k, v); } catch (e) { return null; } };
var ss = function (k, v) { try { if (v === undefined) return sessionStorage.getItem('scs_pj_' + k); if (v === null) sessionStorage.removeItem('scs_pj_' + k); else sessionStorage.setItem('scs_pj_' + k, v); } catch (e) { return null; } };
var n = function (v) { v = parseFloat(v); return isFinite(v) ? v : 0; };
var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
var uid = function (p) { return p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); };
var pad = function (x) { return ('0' + x).slice(-2); };
var todayStr = function () { var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
var MN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
var MB = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];

/* ---------- Local fallback (শুধু টেস্ট/স্ট্যান্ডঅ্যালোন; Apps Script-এ ব্যবহৃত হয় না) ---------- */
var COLS = ['projects', 'entries', 'bills', 'labor', 'subs', 'subpays', 'chems'];
var MK = (function () {
  var K = 'scs_pj_mock';
  var g = function () { var d; try { d = JSON.parse(localStorage.getItem(K)); } catch (e) {} d = d || { settings: {}, pin: '2026' }; COLS.forEach(function (c) { d[c] = d[c] || []; }); return d; };
  var p = function (s) { localStorage.setItem(K, JSON.stringify(s)); };
  var na = function (pin) { if (pin !== g().pin) throw new Error('Wrong admin PIN'); };
  var up = function (s, c, o) { var i = s[c].findIndex(function (x) { return x.id === o.id; }); if (i < 0) s[c].push(o); else s[c][i] = o; };
  var M = {
    ping: function (sid, j) { var K2 = 'scs_pj_pres', m = {}, now = Date.now(), info = JSON.parse(j || '{}'); try { m = JSON.parse(localStorage.getItem(K2)) || {}; } catch (e) {} Object.keys(m).forEach(function (k) { if (now - m[k].t > 35000) delete m[k]; }); if (info.gone) delete m[sid]; else { info.t = now; m[sid] = info; } localStorage.setItem(K2, JSON.stringify(m)); return { rev: M.getRev(), online: Object.keys(m).map(function (k) { var o = m[k]; o.sid = k; o.ago = Math.round((now - o.t) / 1000); return o; }) }; },
    pinInfo: function () { return { lens: [4] }; },
    loginLoad: function (pin) { var r = M.loginCheck(pin); return r ? { role: r, data: M.loadAll() } : { role: '' }; },
    testEmail: function (pin) { na(pin); return { email: 'ow***@x.com', left: 99 }; },
    exportFull: function (pin) { na(pin); var s = g(), d = {}; COLS.forEach(function (c) { d[c] = s[c]; }); return { app: 'SCS Projects', version: 3, kind: 'full', exportedAt: new Date().toISOString(), data: d, settings: s.settings, log: s.log || [] }; },
    getAutoBackup: function () { return Object.assign({ on: false, every: 'h1', hour: 2, keep: 7, prune: true, skip: true, triggers: 0 }, g().ab || {}); },
    saveAutoBackup: function (pin, j) { na(pin); var s = g(), c = JSON.parse(j); s.ab = Object.assign(s.ab || {}, c, { folderName: c.folder ? 'SCS Backups' : (s.ab || {}).folderName, triggers: c.on ? 1 : 0 }); p(s); return M.getAutoBackup(); },
    runBackupNow: function (pin) { na(pin); var s = g(); s.ab = Object.assign(s.ab || {}, { last: new Date().toISOString(), lastFile: 'SCS_AutoBackup_test.json', lastUrl: '#' }); p(s); return { file: 'SCS_AutoBackup_test.json', url: '#', pruned: 0 }; },
    getRev: function () { return String((localStorage.getItem(K) || '').length); },
    loadAll: function () { var s = g(), o = { settings: s.settings }; COLS.forEach(function (c) { o[c] = s[c]; }); return o; },
    saveRecord: function (c, j, w) { var s = g(), o = JSON.parse(j), old = s[c].find(function (x) { return x.id === o.id; }); s.log = s.log || []; s.log.push({ at: new Date().toISOString(), act: old ? 'edit' : 'add', coll: c, id: o.id, pid: c === 'projects' ? o.id : o.pid, json: old ? JSON.stringify({ before: old, after: o }) : j, by: w }); up(s, c, o); p(s); return true; },
    saveRecords: function (c, j, w) { var s = g(); s.log = s.log || []; JSON.parse(j).forEach(function (o) { s.log.push({ at: new Date().toISOString(), act: 'add', coll: c, id: o.id, pid: o.pid, json: JSON.stringify(o), by: w }); up(s, c, o); }); p(s); return true; },
    deleteRecords: function (j, pin) { if (!M.loginCheck(pin)) throw new Error('Wrong PIN'); var s = g(); s.log = s.log || []; JSON.parse(j).forEach(function (r) { var c = r.c, id = r.id; s[c].filter(function (x) { return x.id === id; }).forEach(function (x) { s.log.push({ at: new Date().toISOString(), act: 'delete', coll: c, id: id, pid: c === 'projects' ? id : x.pid, json: JSON.stringify(x), by: 'admin' }); }); s[c] = s[c].filter(function (x) { return x.id !== id; }); if (c === 'projects') COLS.forEach(function (k) { if (k !== 'projects') s[k] = s[k].filter(function (x) { return x.pid !== id; }); }); }); p(s); return true; },
    getLog: function (pid) { return (g().log || []).filter(function (r) { return !pid || r.pid === pid; }).slice().reverse(); },
    loginCheck: function (pin) { var d = g(); return pin === (d.upin || '2019') ? 'user' : (pin === d.pin ? 'admin' : ''); },
    changeUserPin: function (a, nw) { na(a); var s = g(); if (nw === s.pin) throw new Error('Admin PIN and User PIN must be different.'); s.upin = nw; p(s); return true; },
    recoveryInfo: function () { var s = g().rec || {}; return { email: s.email ? 'ow***@x.com' : '', phone: s.phone ? '8801****78' : '', sms: !!(s.phone && s.sms), smsKey: !!s.sms, any: !!(s.email || (s.phone && s.sms)) }; },
    testSms: function (pin) { na(pin); if (!g().rec || !g().rec.phone) throw new Error('Save the recovery mobile number first.'); return { phone: '8801****78' }; },
    saveRecovery: function (pin, e, ph, sm) { na(pin); var s = g(); s.rec = s.rec || {}; if (e) s.rec.email = e === '-' ? '' : e; if (ph) s.rec.phone = ph === '-' ? '' : ph; if (sm) s.rec.sms = sm === '-' ? '' : sm; p(s); return M.recoveryInfo(); },
    sendResetCode: function (via) { if (!M.recoveryInfo().any) throw new Error('No recovery email or SMS gateway is set up.'); return { sent: via === 'both' ? ['email', 'sms'] : [via || 'email'], email: 'ow***@x.com', phone: '' }; },
    resetPinWithCode: function (code, which, nw) { if (code !== '123456') throw new Error('Wrong code.'); var s = g(); if (which === 'admin') s.pin = nw; else s.upin = nw; p(s); return true; },
    verifyAdmin: function (pin) { return pin === g().pin; },
    changeAdminPin: function (o, nw) { na(o); var s = g(); s.pin = nw; p(s); return true; },
    saveSetting: function (k, v) { var s = g(); s.settings[k] = String(v); p(s); return true; },
    exportAll: function (pin) { na(pin); var s = g(), d = {}; COLS.forEach(function (c) { d[c] = s[c]; }); return { app: 'SCS Projects', version: 2, exportedAt: new Date().toISOString(), data: d }; },
    restoreData: function (pin, t, mode) { na(pin); var o = JSON.parse(t), s = g(); if (o.app !== 'SCS Projects') throw new Error('Not an SCS Projects backup'); COLS.forEach(function (c) { if (mode === 'replace') s[c] = []; (o.data[c] || []).forEach(function (x) { up(s, c, x); }); }); p(s); return { mode: mode }; },
    resetAll: function (pin) { na(pin); var s = g(); COLS.forEach(function (c) { s[c] = []; }); p(s); return true; }
  };
  return M;
})();
function srv(fn) {
  var a = [].slice.call(arguments, 1), ms = fn === 'loadAll' ? 60000 : 45000;
  return new Promise(function (ok, no) {
    var done = false, t = setTimeout(function () { if (!done) { done = true; no(new Error(L('Server did not respond — please retry', 'সার্ভার সাড়া দেয়নি — আবার চেষ্টা করুন'))); } }, ms);
    var fin = function (f, v) { if (done) return; done = true; clearTimeout(t); f(v); };
    if (G) google.script.run.withSuccessHandler(function (v) { fin(ok, v); }).withFailureHandler(function (e) { fin(no, new Error(e && e.message ? e.message : String(e))); })[fn].apply(null, a);
    else { try { fin(ok, MK[fn].apply(null, a)); } catch (e) { fin(no, e); } }
  });
}
/* ---------- State ---------- */
var now = new Date();
var S = {
  lang: ls('lang') || 'en', theme: ls('theme') || 'light', role: ss('role') || '', pin: '', view: 'dash', pid: '', edit: false, tab: 'labor',
  month: now.getMonth() + 1, year: now.getFullYear(), day: todayStr(), q: '', st: 'all', hf: 'all', cal: null, lov: {}, err: '', rev: '', syncing: false, histOpen: false, per: 'life', pmonth: now.getFullYear() + '-' + pad(now.getMonth() + 1), pdate: todayStr(), vm: ls('vm2') || 'folder', atab: 'sec', dtab: 'bk', stab: 'pins', gper: ls('gper') || 'life', sel: '', actOpen: true, tok: ss('tok') || '', billOpen: false, sid: ss('sid') || (function () { var x = uid('s'); ss('sid', x); return x; })(), online: [], co: '', psort: ls('psort') || 'status', lta: {}, lda: {}, lens: (function () { try { return JSON.parse(ls('lens')) || [4]; } catch (e) { return [4]; } })(), verifying: false, pinBad: false, ab: null, setTab: 'gen', gearOpen: false, focus: false, fsFold: false, lg: { pid: 'all', per: 'all', day: todayStr(), month: todayStr().slice(0, 7), act: 'all' }, marks: {}, hp: { per: 'day', day: '', month: '' }, htab: 'list', logCache: null, logAct: 'all', subOpen: ls('subOpen') !== '0', backupDone: false, loading: false,
  bk: { scope: 'all', year: String(now.getFullYear()), month: now.getFullYear() + '-' + pad(now.getMonth() + 1), from: '', to: '', day: todayStr() },
  rs: null, rsText: '', rsMode: 'merge', rsFile: '',
  xp: { coOff: {}, off: {}, scope: 'life', year: String(now.getFullYear()), month: now.getFullYear() + '-' + pad(now.getMonth() + 1), from: '', to: '', detail: true }
};
var D = { projects: [], entries: [], bills: [], labor: [], subs: [], subpays: [], chems: [] };
var C = { editPin: 'true', currency: '৳', company: 'Swarup Construction Solution', tagline: '"Honesty is our Business Capital"', userCanEdit: 'false', userCanDelete: 'false' };
var L = function (e, b) { return S.lang === 'bn' ? b : e; };
var cur = function () { return C.currency || '৳'; };
var fmt = function (v) { return n(v).toLocaleString('en-IN', { maximumFractionDigits: 2 }); };
var money = function (v) { return cur() + ' ' + fmt(v); };
var isAdmin = function () { return S.role === 'admin'; };

/* ---------- Classes (আসল অ্যাপ থেকে নেওয়া) ---------- */
var BTN_P = 'px-3.5 py-1.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold shadow-sm shadow-pink-600/30 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer';
var BTN_S = 'flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-pink-50 hover:text-pink-600 hover:border-pink-300 dark:hover:bg-slate-700 active:scale-95 transition-all cursor-pointer shadow-xs';
var BTN_D = 'px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer disabled:opacity-50';
var SBTN = 'inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-xs';
var SBTN_O = 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-pink-300 hover:text-pink-600';
var BTN_G = 'px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer disabled:opacity-50';
var NAVB = 'flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer active:scale-95 ';
var NAV_ON = NAVB + 'bg-pink-600 text-white shadow-sm shadow-pink-600/30';
var NAV_DK = NAVB + 'bg-slate-900 text-white shadow-sm';
var NAV_OFF = NAVB + 'text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-pink-50 dark:hover:bg-slate-700';
var HB = 'flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/15 hover:bg-white/25 active:scale-95 transition-all border border-white/25 cursor-pointer text-white';
var CARD = 'bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 mb-3';
var INP = 'w-full p-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs';
var LBL = 'block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1';
var PILL = 'text-[11px] px-2 py-0.5 rounded-full bg-pink-50 dark:bg-pink-950/60 text-pink-700 dark:text-pink-300 font-bold border border-pink-200 dark:border-pink-800';
var TH = 'py-2 px-2 border border-slate-600';
var TD = 'py-1.5 px-2 border border-slate-300 dark:border-slate-700';
var TDN = TD + ' text-right font-mono';
var TAB_ON = 'flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap bg-pink-600 text-white shadow-xs font-bold';
var TAB_OFF = 'flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800';

/* ---------- Icons ---------- */
var IC = {
  dash: '<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>',
  folder: '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
  gear: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
  shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  edit: '<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/>',
  trash: '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>',
  print: '<path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6"/><rect x="6" y="14" width="12" height="8" rx="1"/>',
  down: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>',
  up: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/>',
  globe: '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
  out: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>',
  lock: '<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  billm: '<path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h4"/><path d="M13 2v5h5"/><path d="M8 9h3M8 13h4"/><rect x="12.5" y="11" width="9" height="11" rx="1.2" transform="rotate(0)"/><path d="M12.5 14h2.5M12.5 17h3.5M12.5 20h2.5"/>',
  sync: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
  up2: '<path d="m18 15-6-6-6 6"/>', cl: '<path d="m15 18-6-6 6-6"/>', cr: '<path d="m9 18 6-6-6-6"/>', cd: '<path d="m6 9 6 6 6-6"/>',
  cal: '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>',
  trend: '<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>',
  wallet: '<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>',
  alert: '<circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  truck: '<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>',
  flask: '<path d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2"/><path d="M8.5 2h7"/><path d="M7 16h10"/>',
  bill: '<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 17.5v-11"/>',
  check: '<path d="M20 6 9 17l-5-5"/>', x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  back: '<path d="M10 5a2 2 0 0 0-1.344.519l-6.328 5.74a1 1 0 0 0 0 1.481l6.328 5.741A2 2 0 0 0 10 19h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z"/><path d="m12 9 6 6"/><path d="m18 9-6 6"/>',
  arrow: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  db: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5"/><path d="M3 12a9 3 0 0 0 18 0"/>',
  sliders: '<line x1="21" x2="14" y1="4" y2="4"/><line x1="10" x2="3" y1="4" y2="4"/><line x1="21" x2="12" y1="12" y2="12"/><line x1="8" x2="3" y1="12" y2="12"/><line x1="21" x2="16" y1="20" y2="20"/><line x1="12" x2="3" y1="20" y2="20"/><line x1="14" x2="14" y1="2" y2="6"/><line x1="8" x2="8" y1="10" y2="14"/><line x1="16" x2="16" y1="18" y2="22"/>',
  list: '<line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/>',
  rows: '<rect width="18" height="7" x="3" y="3" rx="1"/><rect width="18" height="7" x="3" y="14" rx="1"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  max: '<path d="M15 3h6v6"/><path d="M9 21H3v-6"/><path d="m21 3-7 7"/><path d="m3 21 7-7"/>',
  refresh: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>'
};
var ic = function (k, c) { return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="' + (c || 'w-4 h-4') + '">' + IC[k] + '</svg>'; };
var LOGO = 'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2064%2064%22%3E%3Crect%20width%3D%2264%22%20height%3D%2264%22%20rx%3D%2214%22%20fill%3D%22white%22%2F%3E%3Ccircle%20cx%3D%2232%22%20cy%3D%2232%22%20r%3D%2226%22%20fill%3D%22none%22%20stroke%3D%22%23e5007d%22%20stroke-width%3D%225%22%2F%3E%3Ctext%20x%3D%2232%22%20y%3D%2238%22%20text-anchor%3D%22middle%22%20font-family%3D%22Arial%2Csans-serif%22%20font-size%3D%2218%22%20font-weight%3D%22700%22%20fill%3D%22%23334155%22%3ESCS%3C%2Ftext%3E%3C%2Fsvg%3E';

/* ---------- Calculations ---------- */
/* কেমিক্যালের টাকা: সরাসরি টাকা দেওয়া থাকলে সেটি, না হলে পরিমাণ × রেট */
/* সাবকন্ট্রাক্টরের বিল: সরাসরি টাকা থাকলে সেটি, না হলে পরিমাণ × রেট */
function subAmt(x) { return x && x.amount !== undefined && x.amount !== null && x.amount !== '' ? n(x.amount) : n(x.qty) * n(x.rate); }
function chemAmt(x) { return x && x.amount !== undefined && x.amount !== null && x.amount !== '' ? n(x.amount) : n(x.qty) * n(x.rate); }
function chemDesc(x) { return (x.name || '') + (n(x.qty) ? ' ' + fmt(x.qty) + ' ' + (x.unit || '') : '') + (n(x.rate) && n(x.qty) && Math.abs(n(x.qty) * n(x.rate) - chemAmt(x)) < 0.01 ? ' @ ' + fmt(x.rate) : ''); }
function pStats(pid, m) {
  m = m || function () { return true; };
  var o = { labors: 0, laborAmt: 0, subBill: 0, subPaid: 0, chem: 0, ta: 0, da: 0, other: 0, transport: 0, comm: 0, bill: 0, vat: 0, tax: 0, recv: 0 };
  D.labor.forEach(function (x) { if (x.pid === pid && m(x.date)) { o.labors += n(x.count); o.laborAmt += n(x.amount); } });
  D.subs.forEach(function (x) { if (x.pid === pid && m(x.date)) o.subBill += subAmt(x); });
  D.subpays.forEach(function (x) { if (x.pid === pid && m(x.date)) o.subPaid += n(x.amount); });
  D.chems.forEach(function (x) { if (x.pid === pid && m(x.date)) o.chem += chemAmt(x); });
  D.entries.forEach(function (x) { if (x.pid === pid && m(x.date)) { o.ta += n(x.ta); o.da += n(x.da); o.other += n(x.other); o.transport += n(x.transport); o.comm += n(x.commission); } });
  D.bills.forEach(function (b) { if (b.pid !== pid || !m(b.date)) return; o.vat += n(b.vat) + n(b.tax) + n(b.ait); if (b.kind === 'payment') { o.recv += n(b.amount) - n(b.vat) - n(b.tax) - n(b.ait); o.gcoll = (o.gcoll || 0) + n(b.amount); } else o.bill += n(b.amount); });
  o.exp = o.laborAmt + o.subBill + o.chem + o.ta + o.da + o.other + o.transport + o.comm;
  o.subDue = o.subBill - o.subPaid;
  o.net = o.bill - o.vat - o.tax; o.due = o.net - o.recv; o.profit = o.net - o.exp;
  o.cash = o.recv - (o.laborAmt + o.subPaid + o.chem + o.ta + o.da + o.other + o.transport + o.comm);
  return o;
}
function eTotal(e) { return n(e.laborAmt) + n(e.chemAmt) + n(e.ta) + n(e.da) + n(e.other) + n(e.transport); }
function sumAll(list, m) {
  var t = null;
  list.forEach(function (p) { var s = pStats(p.id, m); if (!t) { t = {}; Object.keys(s).forEach(function (k) { t[k] = 0; }); } Object.keys(s).forEach(function (k) { t[k] += s[k]; }); });
  return t || pStats('-');
}
function dayStats(match) {
  var o = { exp: 0, labors: 0, laborAmt: 0, subBill: 0, subPaid: 0, chem: 0, chemCnt: 0, ta: 0, da: 0, other: 0, transport: 0, comm: 0, cnt: 0, bill: 0, recv: 0, pays: 0, projs: {} };
  D.labor.forEach(function (x) { if (!match(x.date)) return; o.cnt++; o.labors += n(x.count); o.laborAmt += n(x.amount); o.projs[x.pid] = 1; });
  D.subs.forEach(function (x) { if (!match(x.date)) return; o.cnt++; o.subBill += subAmt(x); o.projs[x.pid] = 1; });
  D.subpays.forEach(function (x) { if (match(x.date)) o.subPaid += n(x.amount); });
  D.chems.forEach(function (x) { if (!match(x.date)) return; o.cnt++; o.chemCnt++; o.chem += chemAmt(x); o.projs[x.pid] = 1; });
  D.entries.forEach(function (x) { if (!match(x.date)) return; o.cnt++; o.ta += n(x.ta); o.da += n(x.da); o.other += n(x.other); o.transport += n(x.transport); o.comm += n(x.commission); o.projs[x.pid] = 1; });
  D.bills.forEach(function (b) { if (!match(b.date)) return; if (b.kind === 'payment') { o.recv += n(b.amount) - n(b.vat) - n(b.tax) - n(b.ait); o.pays++; } else o.bill += n(b.amount); });
  o.exp = o.laborAmt + o.subBill + o.chem + o.ta + o.da + o.other + o.transport + o.comm;
  return o;
}
/* গ্লোবাল পিরিয়ড (লাইফটাইম / মাসিক) — প্রজেক্ট লিস্ট ও ড্যাশবোর্ডের প্রজেক্ট টেবিলে প্রযোজ্য */
function gMatch() { if (S.gper !== 'month') return null; var pre = S.year + '-' + pad(S.month); return function (d) { return (d || '').indexOf(pre) === 0; }; }
function gLabel() { return S.gper !== 'month' ? L('Lifetime (start to date)', 'লাইফটাইম (শুরু থেকে আজ পর্যন্ত)') : (S.lang === 'bn' ? MB : MN)[S.month - 1] + ' ' + S.year; }
function gPill() { return '<span class="text-[11px] font-bold px-2 py-0.5 rounded-full ' + (S.gper === 'month' ? 'bg-sky-100 text-sky-700 border border-sky-200' : 'bg-emerald-100 text-emerald-700 border border-emerald-200') + '">' + esc(gLabel()) + '</span>'; }
/* সাবকন্ট্রাক্টর অনুযায়ী বিল / পেমেন্ট / বাকি */
function subDues(pid, m) {
  var o = {}, k = function (x) { var key = (pid ? '' : x.pid + '|') + x.sub; if (!o[key]) o[key] = { sub: x.sub, pid: x.pid, bill: 0, paid: 0, works: 0 }; return o[key]; };
  D.subs.forEach(function (x) { if ((!pid || x.pid === pid) && (!m || m(x.date)) && x.sub) { var r = k(x); r.bill += subAmt(x); r.works++; } });
  D.subpays.forEach(function (x) { if ((!pid || x.pid === pid) && (!m || m(x.date)) && x.sub) k(x).paid += n(x.amount); });
  return Object.keys(o).map(function (key) { var r = o[key]; r.due = r.bill - r.paid; return r; }).sort(function (a, b) { return b.due - a.due; });
}
var byDate = function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; };
var proj = function (id) { return D.projects.find(function (p) { return p.id === id; }); };

/* ---------- Toast / Modal ---------- */
var tmr;
function toast(msg, type) {
  var cls = type === 'error' ? 'bg-rose-950/90 border-rose-700 text-rose-100' : type === 'info' ? 'bg-slate-900/90 border-slate-600 text-slate-100' : 'bg-emerald-950/90 border-emerald-700 text-emerald-100';
  $('#toast').innerHTML = '<div class="fixed bottom-5 right-5 z-50 animate-slide-up pointer-events-none"><div class="flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-2xl border backdrop-blur-md text-xs font-semibold ' + cls + '">' + ic(type === 'error' ? 'alert' : 'check', 'w-4 h-4 shrink-0') + '<span>' + esc(msg) + '</span></div></div>';
  clearTimeout(tmr); tmr = setTimeout(function () { $('#toast').innerHTML = ''; }, 3500);
}
function modal(html, wide) {
  $('#modal').innerHTML = '<div class="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/60 backdrop-blur-xs" data-a="mbg"><div class="w-full ' + (wide ? 'max-w-2xl' : 'max-w-md') + ' max-h-[92vh] overflow-y-auto rounded-3xl p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl text-slate-900 dark:text-slate-100" data-a="mbox">' + html + '</div></div>';
  markScrollers(); if ($('#mf')) { updPresence(); pingSoon(); }
}
function closeModal() { var had = !!$('#mf'); $('#modal').innerHTML = ''; if (had) pingSoon(); }
function mHead(t) { return '<div class="flex items-center justify-between mb-4"><h3 class="text-base font-black">' + t + '</h3><button type="button" data-a="mclose" class="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer text-slate-500">' + ic('x') + '</button></div>'; }
function ask(msg, label, cb, danger) {
  modal(mHead(L('Please confirm', 'নিশ্চিত করুন')) + '<p class="text-xs text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">' + msg + '</p><div class="flex justify-end gap-2"><button type="button" data-a="mclose" class="' + BTN_S + '">' + L('Cancel', 'বাতিল') + '</button><button type="button" id="askok" class="' + (danger ? BTN_D : BTN_P) + '">' + label + '</button></div>');
  $('#askok').onclick = function () { closeModal(); cb(); };
}
var triNote = function () { return '<p class="col-span-2 text-[10px] text-slate-500 -mt-1">' + L('Fill any two of Quantity, Rate and Amount — the third fills itself. Or give only the Amount.', 'পরিমাণ, রেট ও টাকা — যেকোনো দুটি দিলে তৃতীয়টি নিজে বসবে। অথবা শুধু টাকা দিন।') + '</p>'; };
var fld = function (lbl, inner, cls) { return '<div class="' + (cls || '') + '"><label class="' + LBL + '">' + lbl + '</label>' + inner + '</div>'; };
var inp = function (name, val, type, ph, extra) { return '<input name="' + name + '" type="' + (type || 'text') + '" value="' + esc(val == null ? '' : val) + '" placeholder="' + esc(ph || '') + '" class="' + INP + '" ' + (extra || '') + '>'; };
var numi = function (name, val, ph) { return inp(name, val || val === 0 ? val : '', 'number', ph || '0', 'min="0" step="any" inputmode="decimal"'); };
/* পরিমাণ / রেট / টাকা — যেকোনো দুটি দিলে তৃতীয়টি নিজে বসে; শুধু টাকা দিলেও চলবে */
var triInp = function (name, val, role, ph) { return inp(name, val || val === 0 ? val : '', 'number', ph || '0', 'min="0" step="any" inputmode="decimal" data-tri="' + role + '"'); };
function triCalc(t) {
  var g = t.closest('.crow') || t.closest('#mf'); if (!g) return;
  var role = t.getAttribute('data-tri'), f = function (r) { return g.querySelector('[data-tri=' + r + ']'); };
  var ord = (g.getAttribute('data-tord') || '').split(',').filter(function (x) { return x && x !== role; });
  if (t.value.trim() !== '') ord.unshift(role); g.setAttribute('data-tord', ord.slice(0, 2).join(','));
  t.classList.remove('pj-auto');
  if (ord.length < 2) return;
  var a = ord[0], b = ord[1], c = ['q', 'r', 'a'].filter(function (x) { return x !== a && x !== b; })[0], fc = f(c);
  if (!fc) return;
  var q = n((f('q') || {}).value), r = n((f('r') || {}).value), am = n((f('a') || {}).value), v = '';
  if (c === 'a') v = q * r; else if (c === 'r') v = q ? am / q : ''; else v = r ? am / r : '';
  fc.value = v === '' ? '' : String(+(+v).toFixed(4)); fc.classList.add('pj-auto');
}
var mv = function (name) { var el = $('#mf [name="' + name + '"]'); return el ? el.value : ''; };

/* ---------- Data ops ---------- */
function load(silent) {
  if (loadP) return loadP;
  var t0 = Date.now(); setSync(true);
  loadP = srv('loadAll').then(function (d) { return d.rev ? { rev: d.rev, d: d } : srv('getRev').catch(function () { return S.rev; }).then(function (rev) { return { rev: rev, d: d }; }); }).then(function (r) {
    var ch = applyData(r.d), first = S.loading, wasErr = !!S.err; S.rev = r.rev; S.loading = false; S.err = ''; lastOk = Date.now(); cacheSet(r.d);
    if (ch || first || wasErr) render(); if (!silent) toast(L('Data synced', 'ডাটা সিঙ্ক হয়েছে'));
  }).catch(function (e) {
    S.loading = false; S.err = e.message || String(e); render(); if (!silent) toast(S.err, 'error');
  }).then(function () {
    var w = Math.max(0, 700 - (Date.now() - t0)); loadP = null; setTimeout(function () { setSync(false); updSync(); }, w);
  });
  return loadP;
}
function save(coll, o) {
  S.logCache = null;
  var arr = D[coll], i = arr.findIndex(function (x) { return x.id === o.id; });
  if (i < 0) arr.push(o); else arr[i] = o;
  var key = coll + '|' + o.id; outbox[key] = { c: coll, o: o };
  render();
  return track(srv('saveRecord', coll, JSON.stringify(o), S.role)).then(function () { delete outbox[key]; toast(L('Saved', 'সংরক্ষিত হয়েছে')); }).catch(function (e) { delete outbox[key]; toast(L('Save failed: ', 'সেভ হয়নি: ') + e.message, 'error'); load(true); });
}
function del(coll, id, pin) { return delMany([{ c: coll, id: id }], pin); }
/* এক বা একাধিক রেকর্ড ডিলিট (সার্ভারে পিন যাচাই হয়, লগে থেকে যায়) */
function delMany(list, pin) {
  var keys = [];
  list.forEach(function (r) {
    D[r.c] = D[r.c].filter(function (x) { return x.id !== r.id; });
    if (r.c === 'projects') { COLS.forEach(function (k) { if (k !== 'projects') D[k] = D[k].filter(function (x) { return x.pid !== r.id; }); }); if (S.pid === r.id) { S.pid = ''; S.view = 'projects'; } }
    var key = r.c + '|' + r.id; outbox[key] = { c: r.c, del: r.id }; keys.push(key);
  });
  S.marks = {}; S.logCache = null; render(); if (S.histOpen) histModal();
  var clr = function () { keys.forEach(function (k) { delete outbox[k]; }); };
  return track(srv('deleteRecords', JSON.stringify(list), pin, S.role)).then(function () { clr(); toast(list.length > 1 ? list.length + L(' entries deleted', 'টি এন্ট্রি ডিলিট হয়েছে') : L('Deleted', 'ডিলিট হয়েছে'), 'info'); if (S.histOpen) histModal(); }).catch(function (e) { clr(); toast(e.message, 'error'); load(true); });
}
function dl(name, text, mime) {
  var b = new Blob([text], { type: mime || 'application/json' }), a = document.createElement('a');
  a.href = URL.createObjectURL(b); a.download = name; document.body.appendChild(a); a.click();
  setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

/* ---------- Views ---------- */
/* SCS: পিন-লগইন স্ক্রিন বাদ (SCS অ্যাকাউন্টই লগইন) */
function loginView() { return SCS.startHTML(); }
function header() {
  var HB2 = 'flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold bg-white/15 hover:bg-white/25 active:scale-95 transition-all border border-white/25 cursor-pointer text-white';
  return '<div class="no-print"><header class="no-print sticky top-0 z-40 w-full bg-pink-600 text-white shadow-md"><div class="w-full px-2 sm:px-3 lg:px-4 h-10 flex items-center justify-between gap-2"><div class="flex items-center gap-2">' +
    '<div class="bg-white text-slate-900 px-2 py-0.5 rounded-lg shadow-xs flex items-center gap-1.5 border border-pink-200"><img data-logo="1" alt="SCS Logo" class="pj-tlogo" src="' + esc(logoSrc()) + '"><span class="font-extrabold text-xs sm:text-sm tracking-tight whitespace-nowrap text-slate-900 font-sans">SCS Projects</span></div>' +
    '<div class="hidden md:flex items-baseline gap-2 text-[10px]"><span class="font-bold text-white">' + esc(C.company) + '</span><span class="italic text-pink-200">' + esc(C.tagline) + '</span></div></div>' +
    '<div class="flex items-center gap-1"><button type="button" data-a="billall" title="' + L('Bills & Measurements — all companies', 'বিল ও মেজারমেন্ট — সব কোম্পানি') + '" aria-label="Bills & Measurements" class="pj-hbill">' + ic('billm', 'w-4 h-4') + '</button><span id="onl"></span><span id="syncinfo" class="hidden md:flex items-center gap-1 text-[10px] text-pink-100 mr-1"></span><button type="button" data-a="sync" title="Sync" class="' + HB2 + '">' + ic('sync', 'w-3.5 h-3.5' + (S.syncing ? ' animate-spin' : '')) + '<span class="hidden sm:inline">Sync</span></button>' +
    '<div class="relative"><button type="button" data-a="gear" title="' + L('Settings · Export · Activity Log', 'সেটিংস · এক্সপোর্ট · অ্যাক্টিভিটি লগ') + '" aria-label="Settings" class="flex items-center gap-0.5 p-1 rounded-lg active:scale-95 transition-all border cursor-pointer ' + (S.view === 'settings' ? 'bg-white text-pink-600 border-white' : 'bg-white/15 hover:bg-white/25 border-white/25 text-white') + '">' + ic('gear', 'w-3.5 h-3.5') + '</button></div>' +
    '<button type="button" data-a="lang" class="' + HB2 + '">' + ic('globe', 'w-3.5 h-3.5') + '<span class="font-bold">' + (S.lang === 'bn' ? 'EN' : 'বাং') + '</span></button>' +
    '<button type="button" data-a="theme" title="Dark Mode" class="p-1 rounded-lg bg-white/15 hover:bg-white/25 active:scale-95 transition-all border border-white/25 cursor-pointer text-white">' + ic(S.theme === 'dark' ? 'sun' : 'moon', 'w-3.5 h-3.5') + '</button>' +
    '<button type="button" data-a="logout" title="Logout" class="p-1 rounded-lg bg-rose-700/80 hover:bg-rose-800 active:scale-95 transition-all border border-rose-500/40 cursor-pointer text-white">' + ic('out', 'w-3.5 h-3.5') + '</button></div></div></header></div>';
}
function nav() {
  var v = S.view, mo = (S.lang === 'bn' ? MB : MN), mopts = '', yopts = '';
  mo.forEach(function (m, i) { mopts += '<option value="' + (i + 1) + '"' + (S.month === i + 1 ? ' selected' : '') + ' class="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">' + m + '</option>'; });
  for (var y = 2022; y <= 2035; y++) yopts += '<option value="' + y + '"' + (S.year === y ? ' selected' : '') + ' class="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">' + y + '</option>';
  var ed = '<button type="button" data-a="editmode" title="Edit Mode" class="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold cursor-pointer active:scale-95 transition-all border ' + (S.edit ? 'bg-amber-500 text-white border-amber-600 shadow-xs' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-amber-50') + '">' + ic(S.edit ? 'edit' : 'lock', 'w-3 h-3') + '<span><span class="hidden sm:inline">' + L('Edit Mode', 'এডিট মোড') + ': </span>' + (S.edit ? 'ON' : 'OFF') + '</span></button>';
  var sub = '';
  if (v === 'projects' || v === 'project') {
    var cnt = function (k) { return D.projects.filter(function (p) { return k === 'all' || p.status === k; }).length; };
    var chips = [['all', 'All Projects', 'অল প্রজেক্ট'], ['running', 'Running', 'রানিং'], ['completed', 'Completed', 'কমপ্লিটেড'], ['hold', 'On Hold', 'স্থগিত']].map(function (c) {
      return '<button type="button" data-a="st" data-v="' + c[0] + '" class="px-2 py-0.5 rounded-lg text-[11px] font-semibold whitespace-nowrap cursor-pointer active:scale-95 transition-all ' + (S.st === c[0] && v === 'projects' ? 'bg-pink-600 text-white shadow-xs' : 'text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700') + '">' + L(c[1], c[2]) + ' (' + cnt(c[0]) + ')</button>';
    }).join('');
    var vm = [['folder', 'folder', 'Folders'], ['list', 'list', 'List'], ['card', 'dash', 'Card'], ['compact', 'rows', 'Compact']].map(function (x) { return '<button type="button" data-a="vm" data-v="' + x[0] + '" title="' + x[2] + '" class="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-bold cursor-pointer ' + (S.vm === x[0] && v === 'projects' ? 'bg-pink-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800') + '">' + ic(x[1], 'w-3 h-3') + '<span class="hidden sm:inline">' + x[2] + '</span></button>'; }).join('');
    sub = '<div class="w-full border-t border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70"><div class="w-full px-2 sm:px-3 lg:px-4 py-1 flex items-center flex-wrap gap-x-3 gap-y-1"><div class="flex items-center gap-1 overflow-x-auto">' + chips + '</div><div class="flex items-center gap-0.5 p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">' + vm + '</div><div class="relative flex items-center ml-auto"><span class="absolute left-1.5 text-slate-400 pointer-events-none">' + ic('search', 'w-3 h-3') + '</span><input data-f="q" value="' + esc(S.q) + '" placeholder="' + L('Search…', 'সার্চ…') + '" class="pj-search pl-5 pr-1.5 py-0.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-[11px]"></div></div></div>';
  }
  return '<div class="no-print"><nav class="no-print w-full bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 transition-colors shadow-xs"><div class="w-full px-2 sm:px-3 lg:px-4"><div class="flex flex-row flex-wrap items-center justify-between gap-1.5 py-1"><div class="flex items-center flex-wrap gap-1.5">' +
    '<button type="button" data-a="nav" data-v="dash" class="' + (v === 'dash' ? NAV_ON : NAV_OFF) + '">' + ic('dash', 'w-3.5 h-3.5') + '<span>' + L('Dashboard', 'ড্যাশবোর্ড') + '</span></button>' +
    '<button type="button" data-a="nav" data-v="projects" class="' + (v === 'projects' || v === 'project' ? NAV_ON : NAV_OFF) + '">' + ic('folder', 'w-3.5 h-3.5') + '<span>' + L('Projects', 'প্রজেক্টস') + '</span></button>' +
    '<button type="button" data-a="nav" data-v="due" class="' + (v === 'due' ? NAV_ON : NAV_OFF) + '">' + ic('alert', 'w-3.5 h-3.5') + '<span>' + L('Project Due List', 'প্রজেক্ট ডিউ লিস্ট') + '</span></button>' +
    '<button type="button" data-a="nav" data-v="admin" class="' + (v === 'admin' ? NAV_DK : NAV_OFF) + '">' + ic('shield', 'w-3.5 h-3.5') + '<span>Admin</span></button></div>' +
    '<div class="flex items-center gap-1.5">' + ed + '<div class="flex items-center gap-0.5 p-0.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">' + [['life', 'Lifetime', 'লাইফটাইম'], ['month', 'Monthly', 'মাসিক']].map(function (x) { return '<button type="button" data-a="gper" data-v="' + x[0] + '" class="px-1.5 py-0.5 rounded-md text-[11px] font-bold cursor-pointer active:scale-95 ' + (S.gper === x[0] ? 'bg-pink-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700') + '">' + L(x[1], x[2]) + '</button>'; }).join('') + '</div><div class="' + (S.gper === 'life' ? 'pj-dim ' : '') + 'flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded-lg shadow-xs"><button type="button" data-a="mprev" class="p-0.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300">' + ic('cl', 'w-3.5 h-3.5') + '</button>' +
    '<select data-f="month" class="bg-transparent text-[11px] font-bold text-slate-800 dark:text-slate-100 cursor-pointer">' + mopts + '</select><select data-f="year" class="bg-transparent text-[11px] font-bold text-pink-600 dark:text-pink-400 cursor-pointer border-l border-slate-200 dark:border-slate-700 pl-1">' + yopts + '</select>' +
    '<button type="button" data-a="mnext" class="p-0.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300">' + ic('cr', 'w-3.5 h-3.5') + '</button></div></div></div></div>' + sub + '</nav></div>';
}
function stat(label, val, sub, grad, icn, go) {
  return '<div ' + (go ? 'data-a="nav" data-v="' + go + '" ' : '') + 'class="group cursor-pointer rounded-3xl p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-md hover:shadow-xl hover:border-pink-300 dark:hover:border-pink-900/50 transition-all duration-200 flex flex-col justify-between"><div class="flex items-center justify-between mb-3"><span class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">' + label + '</span><div class="p-2.5 rounded-2xl bg-gradient-to-tr ' + grad + ' shadow-sm group-hover:scale-110 transition-transform text-white">' + ic(icn, 'w-5 h-5') + '</div></div><div><div class="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100 font-sans tracking-tight">' + val + '</div><div class="mt-1 flex items-center justify-between text-[11px] text-slate-400"><span>' + sub + '</span>' + (go ? '<span class="text-pink-600 dark:text-pink-400 font-bold group-hover:translate-x-1 transition-transform">' + L('View', 'দেখুন') + ' →</span>' : '') + '</div></div></div>';
}
function tile(label, val, sub, color, hover) {
  return '<div class="p-2.5 sm:p-3.5 rounded-2xl bg-white/5 border border-white/10 hover:border-' + hover + '/50 transition-all"><span class="text-[10px] sm:text-xs text-slate-400 font-semibold block mb-0.5">' + label + '</span><div class="text-sm sm:text-lg md:text-xl font-black ' + color + ' font-sans">' + val + '</div><div class="text-[9px] sm:text-[11px] text-slate-400 mt-0.5">' + sub + '</div></div>';
}
function dashView() {
  var mo = (S.lang === 'bn' ? MB : MN)[S.month - 1] + ' ' + S.year, pre = S.year + '-' + pad(S.month);
  var t = dayStats(function (d) { return d === S.day; }), m = dayStats(function (d) { return (d || '').indexOf(pre) === 0; }), A = sumAll(D.projects);
  var running = D.projects.filter(function (p) { return p.status === 'running'; }).length, gm = gMatch(), AP = sumAll(D.projects, gm);
  var rows = D.projects.map(function (p, i) {
    var s = pStats(p.id, gm);
    return '<tr data-a="openp" data-id="' + p.id + '" class="cursor-pointer hover:bg-pink-50 dark:hover:bg-slate-800"><td class="' + TD + ' text-center">' + (i + 1) + '</td><td class="' + TD + ' font-bold">' + esc(p.name) + '</td><td class="' + TD + ' text-center">' + stPill(p.status) + '</td><td class="' + TDN + '">' + fmt(s.exp) + '</td><td class="' + TDN + '">' + fmt(s.bill) + '</td><td class="' + TDN + '">' + fmt(s.net) + '</td><td class="' + TDN + ' text-emerald-700 dark:text-emerald-400">' + fmt(s.recv) + '</td><td class="' + TDN + ' text-rose-600">' + fmt(s.due) + '</td><td class="' + TDN + ' font-bold ' + (s.profit < 0 ? 'text-rose-600' : 'text-emerald-700 dark:text-emerald-400') + '">' + fmt(s.profit) + '</td></tr>';
  }).join('') || '<tr><td colspan="9" class="' + TD + ' text-center text-slate-400 py-6">' + L('No projects yet', 'কোনো প্রজেক্ট নেই') + '</td></tr>';
  return '<div class="space-y-3">' + printHead(L('DASHBOARD SUMMARY', 'ড্যাশবোর্ড সামারি') + ' — ' + mo) + '<div class="no-print flex flex-row items-center justify-between gap-2 pb-1 border-b border-slate-200 dark:border-slate-800"><div><h1 class="text-base sm:text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2"><span>' + L('Dashboard Summary', 'ড্যাশবোর্ড সামারি') + '</span><span class="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300">' + mo + '</span></h1></div><div class="flex items-center gap-2"><button type="button" data-a="printp" class="' + BTN_S + '">' + ic('print', 'w-3.5 h-3.5') + '<span>Print</span></button><button type="button" data-a="nav" data-v="projects" class="' + BTN_P + '"><span>' + L('View Projects', 'প্রজেক্টস দেখুন') + '</span>' + ic('arrow', 'w-3.5 h-3.5') + '</button></div></div>' +
    '<div class="rounded-3xl p-3 md:p-4 bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 text-white shadow-xl border border-slate-700/60"><div class="flex flex-col md:flex-row md:items-center justify-between gap-2 pb-2 border-b border-slate-700/70"><div class="flex items-center gap-2.5"><div class="w-3 h-3 rounded-full bg-emerald-400 animate-pulse"></div><div><h2 class="text-base sm:text-lg font-black tracking-tight flex items-center gap-2"><span>' + L("Today's Live Operations & Financials", 'আজকের লাইভ অপারেশন ও আর্থিক হিসাব') + '</span><span class="text-[11px] font-mono px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">LIVE</span></h2><p class="text-xs text-slate-400">' + L("Real-time audit of the day's expenses, labor, income and new bills", 'দিনের খরচ, লেবার, আয় ও নতুন বিলের রিয়েল-টাইম হিসাব') + '</p></div></div>' +
    '<div class="flex items-center gap-2 bg-slate-800/90 border border-slate-700 px-3 py-1.5 rounded-2xl">' + ic('cal', 'w-3.5 h-3.5 text-pink-400') + '<span class="text-xs text-slate-400 font-semibold">' + L('Date:', 'তারিখ:') + '</span><input type="date" data-f="day" value="' + S.day + '" class="bg-transparent text-xs font-bold text-white focus:outline-hidden cursor-pointer"></div></div>' +
    '<div class="grid grid-cols-3 gap-2 sm:gap-2.5 mt-2.5">' +
    tile(L("Today's Total Expense", 'আজকের মোট খরচ'), money(t.exp), t.cnt + ' ' + L('Entries', 'এন্ট্রি') + ' · ' + Object.keys(t.projs).length + ' ' + L('Projects', 'প্রজেক্ট'), 'text-rose-400', 'rose-400') +
    tile(L("Today's Labors", 'আজকের লেবার'), fmt(t.labors), L('Paid: ', 'প্রদত্ত: ') + money(t.laborAmt), 'text-sky-400', 'sky-400') +
    tile(L("Today's Income", 'আজকের আয় (কালেকশন)'), money(t.recv), t.pays + ' ' + L('Collections', 'টি কালেকশন'), 'text-emerald-400', 'emerald-400') +
    tile(L("Today's Chemical", 'আজকের কেমিক্যাল'), money(t.chem), t.chemCnt + ' ' + L('items', 'টি আইটেম'), 'text-violet-400', 'violet-400') +
    tile(L("Today's Subcontractor", 'আজকের সাবকন্ট্রাক্টর'), money(t.subBill), L('Bill · Paid ', 'বিল · দেওয়া ') + money(t.subPaid), 'text-cyan-400', 'cyan-400') +
    tile(L("Today's TA + DA", 'আজকের টিএ + ডিএ'), money(t.ta + t.da), 'TA ' + fmt(t.ta) + ' · DA ' + fmt(t.da), 'text-amber-400', 'amber-400') +
    tile(L('Goods Transport + Other + Comm.', 'গুডস ট্রান্সপোর্ট + অন্যান্য + কমিশন'), money(t.transport + t.other + t.comm), L('Goods Tr. ', 'গুডস ট্রা. ') + fmt(t.transport) + L(' · Other ', ' · অন্যান্য ') + fmt(t.other) + L(' · Comm. ', ' · কমিশন ') + fmt(t.comm), 'text-pink-400', 'pink-400') +
    tile(L("Today's New Bill", 'আজকের নতুন বিল'), money(t.bill), L('Receivable raised today', 'আজ যে বিল করা হয়েছে'), 'text-blue-400', 'blue-400') +
    tile(L("Today's Net (Income − Expense)", 'আজকের নেট (আয় − খরচ)'), money(t.recv - t.exp), t.recv - t.exp < 0 ? L('Spent more than received', 'আয়ের চেয়ে খরচ বেশি') : L('Cash positive', 'নগদ ধনাত্মক'), t.recv - t.exp < 0 ? 'text-rose-400' : 'text-emerald-400', 'emerald-400') + '</div></div>' +
    '<div><div class="text-xs font-extrabold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">' + L('All Projects — Lifetime', 'সকল প্রজেক্ট — সর্বমোট') + '</div><div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">' +
    stat(L('Running Projects', 'চলমান প্রজেক্ট'), String(running), L('Total ', 'মোট ') + D.projects.length, 'from-blue-600 to-cyan-600', 'folder', 'projects') +
    stat(L('Total Expense', 'মোট খরচ'), money(A.exp), L('Labor, sub, chemical, TA/DA, other', 'লেবার, সাব, কেমিক্যাল, টিএ/ডিএ, অন্যান্য'), 'from-rose-600 to-pink-600', 'wallet', 'projects') +
    stat(L('Total Bill', 'মোট বিল'), money(A.bill), L('VAT, TAX & AIT: ', 'ভ্যাট, ট্যাক্স ও এআইটি: ') + money(A.vat + A.tax), 'from-violet-600 to-purple-600', 'bill', 'projects') +
    stat(L('Net Receivable', 'নেট প্রাপ্য'), money(A.net), L('After VAT & Tax', 'ভ্যাট ও ট্যাক্স বাদে'), 'from-blue-600 to-indigo-600', 'trend', 'projects') +
    stat(L('Collected', 'কালেকশন'), money(A.recv), L('Received from company so far', 'কোম্পানি থেকে এ পর্যন্ত পাওয়া'), 'from-emerald-600 to-teal-600', 'check', 'projects') +
    stat(L('Total Due', 'মোট বাকি'), money(A.due), (function () { var dl = dueList(''); var cos = {}; dl.forEach(function (x) { cos[coName(x.p) || x.p.name] = 1; }); return dl.length ? dl.length + L(' projects · ', ' টি প্রজেক্ট · ') + Object.keys(cos).length + L(' companies have due →', ' টি কোম্পানির ডিউ আছে →') : L('No due 🎉', 'কোনো ডিউ নেই 🎉'); })(), 'from-orange-600 to-amber-600', 'alert', 'due') +
    stat(L('Net Profit', 'নেট লাভ'), money(A.profit), L('Net receivable − expense', 'নেট প্রাপ্য − খরচ'), 'from-emerald-600 to-green-600', 'trend', 'projects') +
    stat(L('Subcontractor Payable', 'সাবকন্ট্রাক্টর পাবে'), money(A.subDue), L('Bill ', 'বিল ') + money(A.subBill) + L(' · Paid ', ' · দেওয়া ') + money(A.subPaid), 'from-sky-600 to-blue-600', 'users', 'projects') + '</div></div>' +
    '<div><div class="text-xs font-extrabold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">' + mo + ' — ' + L('Monthly', 'মাসিক') + '</div><div class="grid grid-cols-2 lg:grid-cols-4 gap-4">' +
    stat(L('Monthly Expense', 'মাসিক খরচ'), money(m.exp), m.cnt + ' ' + L('Entries', 'এন্ট্রি'), 'from-rose-600 to-pink-600', 'wallet') +
    stat(L('Monthly Labors', 'মাসিক লেবার'), fmt(m.labors), money(m.laborAmt), 'from-sky-600 to-blue-600', 'users') +
    stat(L('Monthly Bill', 'মাসিক বিল'), money(m.bill), L('New receivable', 'নতুন প্রাপ্য'), 'from-violet-600 to-purple-600', 'bill') +
    stat(L('Monthly Income', 'মাসিক আয়'), money(m.recv), m.pays + ' ' + L('payments', 'টি পেমেন্ট'), 'from-emerald-600 to-teal-600', 'check') + '</div></div>' +
    '<div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3 shadow-xs"><div class="text-sm font-bold mb-2 flex items-center flex-wrap gap-2"><span>' + L('Project-wise Dashboard', 'প্রজেক্ট-ভিত্তিক ড্যাশবোর্ড') + '</span>' + gPill() + '</div><div class="overflow-x-auto"><table class="w-full border-collapse text-xs font-sans print-table"><thead><tr class="bg-slate-800 text-white font-bold text-center border-b border-slate-700"><th class="' + TH + ' w-10">SL</th><th class="' + TH + ' text-left">' + L('Project', 'প্রজেক্ট') + '</th><th class="' + TH + '">' + L('Status', 'স্ট্যাটাস') + '</th><th class="' + TH + ' text-right">' + L('Expense', 'খরচ') + '</th><th class="' + TH + ' text-right">' + L('Bill', 'বিল') + '</th><th class="' + TH + ' text-right">' + L('Net Receivable', 'নেট প্রাপ্য') + '</th><th class="' + TH + ' text-right text-emerald-300">' + L('Received', 'প্রাপ্ত') + '</th><th class="' + TH + ' text-right text-rose-300">' + L('Due', 'বাকি') + '</th><th class="' + TH + ' text-right text-amber-200">' + L('Profit', 'লাভ') + '</th></tr></thead><tbody class="divide-y divide-slate-300 dark:divide-slate-700 font-medium">' + rows + '</tbody>' +
    '<tfoot><tr class="bg-slate-100 dark:bg-slate-800 font-black text-xs border-t-2 border-slate-800"><td colspan="3" class="' + TD + ' text-center uppercase tracking-wider">Total =</td><td class="' + TDN + '">' + fmt(AP.exp) + '</td><td class="' + TDN + '">' + fmt(AP.bill) + '</td><td class="' + TDN + '">' + fmt(AP.net) + '</td><td class="' + TDN + '">' + fmt(AP.recv) + '</td><td class="' + TDN + '">' + fmt(AP.due) + '</td><td class="' + TDN + '">' + fmt(AP.profit) + '</td></tr></tfoot></table></div></div>' + subDueCard(null, null, L('Subcontractor Dues — All Projects (Lifetime)', 'সাবকন্ট্রাক্টর বাকি — সকল প্রজেক্ট (লাইফটাইম)')) + sigHtml('dash') + '</div>';
}
function stPill(s) {
  var m = { running: ['Running', 'চলমান', 'bg-emerald-100 text-emerald-700 border-emerald-200'], completed: ['Completed', 'সম্পন্ন', 'bg-blue-100 text-blue-700 border-blue-200'], hold: ['On Hold', 'স্থগিত', 'bg-amber-100 text-amber-700 border-amber-200'] }[s] || ['—', '—', 'bg-slate-100 text-slate-600 border-slate-200'];
  return '<span class="text-[11px] px-2 py-0.5 rounded-full font-bold border ' + m[2] + '">' + L(m[0], m[1]) + '</span>';
}
/* ---------- প্রজেক্ট: সাজানো (A→Z) ও কোম্পানি-ফোল্ডার ---------- */
function sortP(list) {
  var ord = { running: 0, hold: 1, completed: 2 }, nm = function (p) { return String(p.name || '').toLowerCase(); };
  return list.slice().sort(function (a, b) {
    if (S.psort === 'az') return nm(a).localeCompare(nm(b));
    if (S.psort === 'za') return nm(b).localeCompare(nm(a));
    return ((ord[a.status] || 0) - (ord[b.status] || 0)) || nm(a).localeCompare(nm(b));
  });
}
function pCard(p, gm) {
  var s = pStats(p.id, gm);
  return '<div data-a="openp" data-id="' + p.id + '" class="cursor-pointer rounded-2xl p-3.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-md hover:shadow-xl hover:border-pink-300 transition-all"><div class="flex items-start justify-between gap-2 mb-2"><div class="min-w-0"><div class="font-black text-sm text-slate-900 dark:text-slate-100 truncate">' + esc(p.name) + '</div><div class="text-[11px] text-slate-500 truncate">' + esc(p.client) + (p.location ? ' · ' + esc(p.location) : '') + '</div></div>' + stPill(p.status) + '</div><div class="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">' + [[L('Expense', 'খরচ'), s.exp, 'text-rose-600'], [L('Bill', 'বিল'), s.bill, 'text-blue-600'], [L('Collected', 'কালেকশন'), s.recv, 'text-emerald-600'], [L('Due', 'বাকি'), s.due, 'text-orange-600']].map(function (x) { return '<div><div class="text-slate-500 font-semibold">' + x[0] + '</div><div class="text-sm font-black ' + x[2] + '">' + money(x[1]) + '</div></div>'; }).join('') + '</div><div class="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]"><span class="text-slate-500 font-semibold">' + L('Net profit', 'নেট লাভ') + '</span><span class="font-black ' + (s.profit < 0 ? 'text-rose-600' : 'text-emerald-600') + '">' + money(s.profit) + '</span></div></div>';
}
function folderCard(co, ps, gm) {
  var T = { due: 0, recv: 0, bill: 0, exp: 0 }, run = 0;
  ps.forEach(function (p) { var s = pStats(p.id, gm); T.due += s.due; T.recv += s.recv; T.bill += s.bill; T.exp += s.exp; if (p.status === 'running') run++; });
  return '<div data-a="opco" data-v="' + esc(co) + '" class="pj-folder cursor-pointer rounded-2xl p-3.5 border-2 border-amber-300 dark:border-amber-800 bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/30 dark:to-slate-900 shadow-md hover:shadow-xl hover:border-amber-500 transition-all"><div class="flex items-start justify-between gap-2 mb-2"><div class="flex items-center gap-2.5 min-w-0"><div class="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">' + ic('folder', 'w-5 h-5') + '</div><div class="min-w-0"><div class="font-black text-sm text-slate-900 dark:text-slate-100 truncate">' + esc(co) + '</div><div class="text-[11px] text-slate-500">' + ps.length + L(' projects', 'টি প্রজেক্ট') + ' · ' + run + L(' running', 'টি চলমান') + '</div></div></div></div>' +
    '<div class="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">' + [[L('Bill', 'বিল'), T.bill, 'text-blue-600'], [L('Collected', 'কালেকশন'), T.recv, 'text-emerald-600'], [L('Expense', 'খরচ'), T.exp, 'text-rose-600'], [L('Due', 'বাকি'), T.due, 'text-orange-600']].map(function (x) { return '<div><div class="text-slate-500 font-semibold">' + x[0] + '</div><div class="text-sm font-black ' + x[2] + '">' + money(x[1]) + '</div></div>'; }).join('') + '</div><div class="mt-2 pt-2 border-t border-amber-200/70 dark:border-slate-800 text-[11px] text-slate-500 truncate">' + ps.slice(0, 4).map(function (p) { return esc(p.name); }).join(' · ') + (ps.length > 4 ? ' …' : '') + '</div></div>';
}
function folderBody(list, gm, q) {
  var grid = function (h) { return '<div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">' + h + '</div>'; };
  if (q) return grid(list.map(function (p) { return pCard(p, gm); }).join(''));
  var g = {}; list.forEach(function (p) { var c = coName(p); (g[c] = g[c] || []).push(p); });
  if (S.co && g[S.co]) {
    var ps = g[S.co];
    return '<div class="flex items-center flex-wrap gap-2 mb-2 px-3 py-2 rounded-xl border-2 border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800"><button type="button" data-a="opco" data-v="" class="flex items-center gap-1 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-pink-600 cursor-pointer">' + ic('cl', 'w-3.5 h-3.5') + L('All companies', 'সব কোম্পানি') + '</button><span class="text-slate-400">/</span><span class="flex items-center gap-1.5 text-sm font-black">' + ic('folder', 'w-4 h-4 text-amber-600') + esc(S.co) + '</span><span class="' + PILL + '">' + ps.length + '</span></div>' + grid(ps.map(function (p) { return pCard(p, gm); }).join(''));
  }
  S.co = '';
  var items = [];
  Object.keys(g).forEach(function (c) { if (c && g[c].length > 1) items.push({ f: 1, name: c, ps: g[c] }); else g[c].forEach(function (p) { items.push({ f: 0, name: p.name, p: p }); }); });
  var lc = function (x) { return String(x.name || '').toLowerCase(); }, ord = { running: 0, hold: 1, completed: 2 };
  items.sort(function (a, b) {
    if (S.psort === 'za') return lc(b).localeCompare(lc(a));
    if (S.psort === 'az') return lc(a).localeCompare(lc(b));
    return (b.f - a.f) || (a.f ? lc(a).localeCompare(lc(b)) : ((ord[a.p.status] || 0) - (ord[b.p.status] || 0)) || lc(a).localeCompare(lc(b)));
  });
  return grid(items.map(function (it) { return it.f ? folderCard(it.name, it.ps, gm) : pCard(it.p, gm); }).join(''));
}
function coRename(old) {
  var cos = xCompanies().filter(Boolean);
  modal(mHead(L('Rename company', 'কোম্পানির নাম এডিট')) + '<p class="text-[11px] text-slate-500 mb-2">' + L('All projects of this company get the new name. Choosing an existing name merges them into that folder.', 'এই কোম্পানির সব প্রজেক্টে নতুন নাম বসবে। আগের কোনো নাম বেছে নিলে সেই ফোল্ডারে চলে যাবে।') + '</p><label class="' + LBL + '">' + L('Current name', 'বর্তমান নাম') + '</label><div class="text-sm font-black mb-2">' + esc(old) + '</div><label class="' + LBL + '">' + L('New name', 'নতুন নাম') + '</label><input id="conew" list="dl-co2" value="' + esc(old) + '" class="' + INP + ' mb-3">' + dlist('dl-co2', cos) + '<div class="flex justify-end gap-2"><button type="button" data-a="mclose" class="' + BTN_S + '">' + L('Cancel', 'বাতিল') + '</button><button type="button" id="conewok" class="' + BTN_P + '">' + ic('check', 'w-3.5 h-3.5') + L('Save', 'সংরক্ষণ') + '</button></div>');
  var el = $('#conew'); el.focus(); el.select();
  var go = function () { var nw = el.value.trim(); if (!nw) return toast(L('Enter a name', 'নাম দিন'), 'error'); closeModal(); if (nw !== old) renameCompany(old, nw); };
  $('#conewok').onclick = go; el.onkeydown = function (e) { if (e.key === 'Enter') go(); };
}
function renameCompany(old, nw) {
  var list = D.projects.filter(function (p) { return coName(p) === old; }).map(function (p) { var o = {}; Object.keys(p).forEach(function (k) { o[k] = p[k]; }); o.client = nw; return o; });
  if (!list.length) return;
  var keys = list.map(function (o) { var i = D.projects.findIndex(function (x) { return x.id === o.id; }); D.projects[i] = o; var k = 'projects|' + o.id; outbox[k] = { c: 'projects', o: o }; return k; });
  if (S.co === old) S.co = nw; S.logCache = null; render();
  track(srv('saveRecords', 'projects', JSON.stringify(list), S.role)).then(function () { keys.forEach(function (k) { delete outbox[k]; }); toast(L('Company renamed in ', 'কোম্পানির নাম বদলানো হয়েছে: ') + list.length + L(' project(s)', 'টি প্রজেক্টে')); }).catch(function (e) { keys.forEach(function (k) { delete outbox[k]; }); toast(e.message, 'error'); load(true); });
}
function projectsView() {
  var q = S.q.toLowerCase(), ord = { running: 0, hold: 1, completed: 2 };
  var list = D.projects.filter(function (p) { return (S.st === 'all' || p.status === S.st) && (!q || (p.name + ' ' + (p.client || '') + ' ' + (p.location || '')).toLowerCase().indexOf(q) >= 0); }); list = sortP(list);
  var gm = gMatch(), A = sumAll(list, gm), body, none = '<div class="text-center text-slate-400 text-xs py-8">' + L('No projects here.', 'এখানে কোনো প্রজেক্ট নেই।') + '</div>';
  if (S.vm === 'folder') {
    body = folderBody(list, gm, q);
    if (!list.length) body = none;
  } else if (S.vm === 'card') {
    body = '<div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">' + list.map(function (p) { return pCard(p, gm); }).join('') + '</div>';
    if (!list.length) body = none;
  } else if (S.vm === 'compact') {
    body = '<div class="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-2">' + list.map(function (p) { var s = pStats(p.id, gm); return '<div data-a="openp" data-id="' + p.id + '" class="cursor-pointer rounded-xl px-2.5 py-2 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-pink-300 transition-all"><div class="text-xs font-bold truncate">' + esc(p.name) + '</div><div class="flex items-center justify-between mt-1">' + stPill(p.status) + '<span class="text-[11px] font-black text-orange-600">' + L('Due ', 'বাকি ') + fmt(s.due) + '</span></div></div>'; }).join('') + '</div>';
    if (!list.length) body = none;
  } else {
    var rows = list.map(function (p, i) { var s = pStats(p.id, gm); return '<tr class="hover:bg-pink-50 dark:hover:bg-slate-800 cursor-pointer" data-a="openp" data-id="' + p.id + '"><td class="' + TD + ' text-center">' + (i + 1) + '</td><td class="' + TD + ' font-bold text-pink-700 dark:text-pink-300">' + esc(p.name) + '</td><td class="' + TD + '">' + esc(p.client) + '</td><td class="' + TD + '">' + esc(p.location) + '</td><td class="' + TD + ' text-center">' + stPill(p.status) + '</td><td class="' + TDN + '">' + fmt(s.exp) + '</td><td class="' + TDN + '">' + fmt(s.bill) + '</td><td class="' + TDN + ' text-emerald-700 dark:text-emerald-400">' + fmt(s.recv) + '</td><td class="' + TDN + ' text-rose-600">' + fmt(s.due) + '</td></tr>'; }).join('');
    body = '<div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-2 shadow-xs">' + printHead(L('PROJECT LIST', 'প্রজেক্ট তালিকা') + ' — ' + esc(gLabel())) + '<div class="overflow-x-auto"><table class="w-full border-collapse text-xs font-sans print-table"><thead><tr class="bg-slate-800 text-white font-bold text-center border-b border-slate-700"><th class="' + TH + ' w-10">SL</th><th class="' + TH + ' text-left">' + L('Project', 'প্রজেক্ট') + '</th><th class="' + TH + ' text-left">' + L('Client', 'ক্লায়েন্ট') + '</th><th class="' + TH + ' text-left">' + L('Location', 'লোকেশন') + '</th><th class="' + TH + '">' + L('Status', 'স্ট্যাটাস') + '</th><th class="' + TH + ' text-right">' + L('Expense', 'খরচ') + '</th><th class="' + TH + ' text-right">' + L('Bill', 'বিল') + '</th><th class="' + TH + ' text-right text-emerald-300">' + L('Collected', 'কালেকশন') + '</th><th class="' + TH + ' text-right text-rose-300">' + L('Due', 'বাকি') + '</th></tr></thead><tbody class="divide-y divide-slate-300 dark:divide-slate-700 font-medium">' + (rows || '<tr><td colspan="9" class="' + TD + ' text-center text-slate-400 py-8">' + L('No projects here.', 'এখানে কোনো প্রজেক্ট নেই।') + '</td></tr>') + '</tbody><tfoot><tr class="bg-slate-100 dark:bg-slate-800 font-black text-xs border-t-2 border-slate-800"><td colspan="5" class="' + TD + ' text-center uppercase tracking-wider">Total =</td><td class="' + TDN + '">' + fmt(A.exp) + '</td><td class="' + TDN + '">' + fmt(A.bill) + '</td><td class="' + TDN + '">' + fmt(A.recv) + '</td><td class="' + TDN + '">' + fmt(A.due) + '</td></tr></tfoot></table></div>' + sigHtml('list') + '</div>';
  }
  return '<div class="space-y-2"><div class="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl px-3 py-1.5 shadow-xs"><div class="flex items-center flex-wrap gap-2"><div class="w-1.5 h-1.5 rounded-full bg-pink-600"></div><h2 class="text-sm font-bold text-slate-800 dark:text-slate-100">' + L('PROJECTS', 'প্রজেক্টস') + '</h2><span class="' + PILL + '">' + list.length + ' / ' + D.projects.length + '</span>' + gPill() + '</div><div class="flex items-center flex-wrap gap-1.5"><select data-f="psort" title="' + L('Sort', 'সাজান') + '" class="p-1.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-xs font-semibold cursor-pointer">' + [['status', 'Sort: Status', 'সাজান: স্ট্যাটাস'], ['az', 'Sort: A → Z', 'সাজান: A → Z'], ['za', 'Sort: Z → A', 'সাজান: Z → A']].map(function (o) { return '<option value="' + o[0] + '"' + (S.psort === o[0] ? ' selected' : '') + '>' + L(o[1], o[2]) + '</option>'; }).join('') + '</select><button type="button" data-a="csvp" class="' + BTN_S + '">' + ic('down', 'w-3.5 h-3.5') + '<span>CSV</span></button><button type="button" data-a="printp" class="' + BTN_S + '">' + ic('print', 'w-3.5 h-3.5') + '<span>Print</span></button><button type="button" data-a="manage" class="' + BTN_S + '">' + ic('sliders', 'w-3.5 h-3.5') + '<span>' + L('Manage Projects', 'প্রজেক্ট ম্যানেজ') + '</span></button><button type="button" data-a="addp" class="' + BTN_P + '">' + ic('plus', 'w-3.5 h-3.5') + '<span>' + L('Add Project', 'প্রজেক্ট যোগ করুন') + '</span></button></div></div>' + body + '</div>';
}
function printHead(title) {
  return '<div class="pj-ph pj-phead pb-2 mb-2 border-b border-slate-300"><img data-logo="1" alt="logo" class="pj-plogo" src="' + esc(logoSrc()) + '"><div class="pj-phc text-center"><div class="text-[11px] tracking-wide font-semibold text-slate-600 uppercase">' + esc(C.company) + ' • <span class="italic text-pink-600">' + esc(C.tagline) + '</span></div><div class="text-base font-black text-slate-900">' + title + '</div></div><div class="pj-plogo"></div></div>';
}
/* প্রিন্টের নিচে সিগনেচার — কোন পেজে থাকবে, কয়টা, কী লেখা — Admin > প্রিন্ট ও সিগনেচার থেকে সেট হয় */
var SIG_PAGES = [['project', 'Project statement', 'প্রজেক্ট স্টেটমেন্ট'], ['list', 'Project list', 'প্রজেক্ট তালিকা'], ['report', 'Export report (PDF)', 'এক্সপোর্ট রিপোর্ট (PDF)'], ['dash', 'Dashboard', 'ড্যাশবোর্ড']];
function sigCfg() {
  var d = { on: { project: 1, list: 0, report: 1, dash: 0 }, labels: ['Prepared By', 'Checked By', 'Approved By'] };
  try { var o = JSON.parse(C.sig || ''); if (o && Array.isArray(o.labels)) { d.labels = o.labels; d.on = o.on || d.on; } } catch (e) {}
  return d;
}
function sigHtml(page, report) {
  var c = sigCfg(); if (!c.on[page] || !c.labels.length) return '';
  return '<div class="' + (report ? 'xr-sg' : 'pj-ph pj-sg') + '" style="grid-template-columns:repeat(' + c.labels.length + ',minmax(0,1fr))">' + c.labels.map(function (l) { return '<div>' + esc(l) + '</div>'; }).join('') + '</div>';
}
function sigTab() {
  var d = S.sigDraft || (S.sigDraft = JSON.parse(JSON.stringify(sigCfg())));
  var pages = SIG_PAGES.map(function (pg) { return '<label class="flex items-center gap-2 px-2 py-1.5 rounded-lg border cursor-pointer text-xs ' + (d.on[pg[0]] ? 'border-pink-400 bg-pink-50 dark:bg-pink-950/40' : 'border-slate-200 dark:border-slate-700') + '"><input type="checkbox" data-sigpg="' + pg[0] + '"' + (d.on[pg[0]] ? ' checked' : '') + '><span class="font-semibold">' + L(pg[1], pg[2]) + '</span><span class="ml-auto text-[10px] font-bold ' + (d.on[pg[0]] ? 'text-emerald-700' : 'text-slate-400') + '">' + (d.on[pg[0]] ? L('Signature ON', 'সিগনেচার আছে') : L('No signature', 'সিগনেচার নেই')) + '</span></label>'; }).join('');
  var cnt = ''; for (var i = 0; i <= 6; i++) cnt += '<option value="' + i + '"' + (d.labels.length === i ? ' selected' : '') + '>' + i + '</option>';
  var labs = d.labels.map(function (l, i) { return '<div><label class="' + LBL + '">' + L('Signature ', 'সিগনেচার ') + (i + 1) + '</label><input data-siglab="' + i + '" value="' + esc(l) + '" class="' + INP + '"></div>'; }).join('');
  var prev = d.labels.length ? '<div class="grid gap-6 text-center text-[11px] font-semibold mt-8" style="grid-template-columns:repeat(' + d.labels.length + ',minmax(0,1fr))">' + d.labels.map(function (l) { return '<div class="border-t border-slate-700 dark:border-slate-300 pt-1">' + esc(l || '—') + '</div>'; }).join('') + '</div>' : '<p class="text-xs text-slate-400">' + L('No signature lines', 'কোনো সিগনেচার লাইন নেই') + '</p>';
  return '<div class="' + CARD + '"><div class="text-xs font-bold mb-1">' + L('Signature lines on prints & reports', 'প্রিন্ট ও রিপোর্টের নিচে সিগনেচার') + '</div><p class="text-[11px] text-slate-500 mb-3">' + L('Choose on which pages the signature lines are printed, how many there are and what each one says. The company logo (Logo Setup) is printed at the top-left of every print and report.', 'কোন কোন পেজের প্রিন্টে সিগনেচার থাকবে, কয়টা থাকবে আর প্রতিটিতে কী লেখা থাকবে তা বেছে নিন। লোগো সেটআপের লোগো প্রতিটি প্রিন্ট ও রিপোর্টের উপরে বাম কোণে আসবে।') + '</p>' +
    '<div class="text-[11px] font-bold text-slate-500 mb-1">1. ' + L('Pages', 'পেজ') + '</div><div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mb-3">' + pages + '</div>' +
    '<div class="text-[11px] font-bold text-slate-500 mb-1">2. ' + L('Number of signatures', 'সিগনেচারের সংখ্যা') + '</div><select data-sigcnt="1" class="' + INP + ' max-w-[11rem] mb-3">' + cnt + '</select>' +
    (labs ? '<div class="text-[11px] font-bold text-slate-500 mb-1">3. ' + L('Text under each line', 'প্রতিটি লাইনের নিচের লেখা') + '</div><div class="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">' + labs + '</div>' : '') +
    '<div class="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-3 mb-3"><div class="text-[10px] font-bold uppercase text-slate-400">' + L('Preview', 'প্রিভিউ') + '</div>' + prev + '</div>' +
    '<div class="grid grid-cols-1 sm:grid-cols-3 gap-2"><input id="sigpin" type="password" inputmode="numeric" maxlength="8" autocomplete="off" placeholder="' + L('Admin PIN', 'অ্যাডমিন পিন') + '" class="' + INP + ' font-mono"><button type="button" data-a="sigsave" class="' + BTN_P + ' justify-center">' + L('Save signature setup', 'সিগনেচার সেটআপ সেভ') + '</button><button type="button" data-a="sigdef" class="' + BTN_S + ' justify-center">' + L('Back to default', 'ডিফল্টে ফেরত') + '</button></div></div>';
}
function sigRead() { var d = S.sigDraft; if (!d) return; [].forEach.call(document.querySelectorAll('[data-siglab]'), function (el) { d.labels[n(el.getAttribute('data-siglab'))] = el.value; }); }
/* একই তারিখের এন্ট্রি এক সারিতে; একই কলামে দুটি পড়লে পরের সারিতে যায় */
function slotsOf(r) {
  if (r.k === 'labor') return ['L'];
  if (r.k === 'subs') return ['S'];
  if (r.k === 'subpays') return ['SP'];
  if (r.k === 'chems') return ['C'];
  if (r.k === 'bill') return ['B'];
  if (r.k === 'pay') return ['P'];
  var o = []; [['ta', 'ta'], ['da', 'da'], ['tr', 'tr'], ['ot', 'ot'], ['cm', 'cm']].forEach(function (a) { if (n(r[a[1]])) o.push(a[0]); });
  return o.length ? o : ['E'];
}
function mergeRows(R) {
  var out = [], byD = {}, SUM = ['lq', 'la', 'sb', 'sp', 'ca', 'ta', 'da', 'tr', 'ot', 'cm', 'te', 'bill', 'vat', 'coll', 'ncoll'];
  R.forEach(function (r) {
    var sl = slotsOf(r), sub = (r.k === 'subs' || r.k === 'subpays') ? r.sname : null, list = byD[r.d] || (byD[r.d] = []), row = null;
    for (var i = 0; i < list.length && !row; i++) {
      var c = list[i];
      if (sl.some(function (k) { return c.used[k]; })) continue;
      if (sub !== null && c.sname !== undefined && c.sname !== sub) continue;
      row = c;
    }
    if (!row) { row = { d: r.d, used: {}, recs: [], key: r.d + '#' + list.length }; SUM.forEach(function (k) { row[k] = 0; }); list.push(row); out.push(row); }
    sl.forEach(function (k) { row.used[k] = 1; });
    SUM.forEach(function (k) { row[k] += n(r[k]); });
    if (sub !== null) row.sname = sub;
    if (r.k === 'subs') { row.sdesc = r.sdesc; row.sq = r.sq; row.sr = r.sr; }
    else if (r.k === 'subpays' && !row.sdesc) row.sdesc = r.sdesc;
    if (r.k === 'chems') { row.cn = r.cn; row.cq = r.cq; row.cr = r.cr; }
    if (r.bal !== undefined) row.bal = r.bal;
    if (r.sd !== undefined) row.sd = r.sd;
    row.recs.push(r);
  });
  return out;
}
function subDueCard(pid, m, title, life) {
  var P = subDues(pid, m), L2 = life ? subDues(pid, null) : null, T = { b: 0, p: 0, d: 0, l: 0 };
  var rows = L2 ? L2.map(function (r) { var x = P.find(function (y) { return y.sub === r.sub && y.pid === r.pid; }) || { bill: 0, paid: 0, due: 0 }; return { sub: r.sub, pid: r.pid, bill: x.bill, paid: x.paid, due: x.due, life: r.due }; }) : P;
  if (!rows.length && !(L2 && L2.length)) return pid ? '' : '<div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3 shadow-xs text-xs text-slate-400">' + title + ' — ' + L('no subcontractor work yet', 'এখনও কোনো সাবকন্ট্রাক্টরের কাজ নেই') + '</div>';
  var body = rows.map(function (r, i) {
    T.b += r.bill; T.p += r.paid; T.d += r.due; var ld = L2 ? r.life : 0, owe = L2 ? r.life : r.due; T.l += ld; var pp = proj(r.pid);
    return '<tr><td class="' + TD + ' text-center">' + (i + 1) + '</td><td class="' + TD + ' font-bold">' + esc(r.sub) + '</td>' + (pid ? '' : '<td class="' + TD + '">' + esc(pp ? pp.name : '—') + '</td>') + '<td class="' + TDN + '">' + fmt(r.bill) + '</td><td class="' + TDN + ' text-teal-700 dark:text-teal-400">' + fmt(r.paid) + '</td><td class="' + TDN + ' font-black ' + (r.due > 0 ? 'text-rose-600' : 'text-emerald-700 dark:text-emerald-400') + '">' + fmt(r.due) + '</td>' + (L2 ? '<td class="' + TDN + ' font-bold text-orange-700 dark:text-orange-400">' + fmt(ld) + '</td>' : '') +
      '<td class="' + TD + ' text-center no-print">' + (owe > 0 ? '<button type="button" data-a="paysub" data-id="' + r.pid + '" data-v="' + esc(r.sub) + '" class="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-teal-600 hover:bg-teal-700 text-white cursor-pointer active:scale-95">' + L('Pay', 'পেমেন্ট') + '</button>' : '<span class="text-[11px] text-emerald-700 font-bold">✔ ' + L('Clear', 'পরিশোধিত') + '</span>') + '</td></tr>';
  }).join('');
  var open = pid ? S.subOpen : true;
  return '<div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-2.5 shadow-xs' + (pid ? ' no-print' : '') + '"><div class="flex items-center justify-between gap-2 ' + (open ? 'mb-2' : '') + '"><div class="text-sm font-bold flex items-center gap-2">' + ic('users', 'w-4 h-4 text-cyan-600') + '<span>' + title + '</span><span class="text-[11px] font-black px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">' + L('Due ', 'বাকি ') + money(L2 ? T.l : T.d) + '</span></div>' + (pid ? '<button type="button" data-a="subtog" class="' + BTN_S + '">' + ic(open ? 'cd' : 'cr', 'w-3.5 h-3.5') + '<span>' + (open ? L('Hide', 'লুকান') : L('Show', 'দেখুন')) + '</span></button>' : '') + '</div>' +
    (open ? '<div class="overflow-x-auto"><table class="w-full border-collapse text-xs print-table"><thead><tr class="bg-slate-800 text-white font-bold"><th class="' + TH + ' w-8">SL</th><th class="' + TH + ' text-left">' + L('Subcontractor', 'সাবকন্ট্রাক্টর') + '</th>' + (pid ? '' : '<th class="' + TH + ' text-left">' + L('Project', 'প্রজেক্ট') + '</th>') + '<th class="' + TH + ' text-right">' + L('Work Bill', 'কাজের বিল') + '</th><th class="' + TH + ' text-right">' + L('Paid', 'দেওয়া') + '</th><th class="' + TH + ' text-right">' + (L2 ? L('Due (this period)', 'বাকি (এই সময়ে)') : L('Due', 'বাকি')) + '</th>' + (L2 ? '<th class="' + TH + ' text-right">' + L('Lifetime Due', 'লাইফটাইম বাকি') + '</th>' : '') + '<th class="' + TH + ' no-print"></th></tr></thead><tbody>' + (body || '<tr><td colspan="8" class="' + TD + ' text-center text-slate-400 py-3">' + L('No subcontractor work in this period', 'এই সময়ে সাবকন্ট্রাক্টরের কাজ নেই') + '</td></tr>') + '</tbody><tfoot><tr class="bg-slate-100 dark:bg-slate-800 font-black"><td colspan="' + (pid ? 2 : 3) + '" class="' + TD + ' text-center uppercase">Total</td><td class="' + TDN + '">' + fmt(T.b) + '</td><td class="' + TDN + '">' + fmt(T.p) + '</td><td class="' + TDN + ' text-rose-600">' + fmt(T.d) + '</td>' + (L2 ? '<td class="' + TDN + ' text-orange-700">' + fmt(T.l) + '</td>' : '') + '<td class="' + TD + ' no-print"></td></tr></tfoot></table></div>' : '') + '</div>';
}
function projectView() {
  var p = proj(S.pid); if (!p) return projectsView();
  var m = perMatch(), s = pStats(p.id, m), idx = D.projects.indexOf(p) + 1, life = S.per === 'life', LS = life ? s : pStats(p.id), R = mergeRows(ledger(p.id, m));
  var nz = function (v) { return n(v) ? fmt(v) : ''; }, NC = 25, FS = S.focus, T = { lq: 0, la: 0, sb: 0, sp: 0, ca: 0, ta: 0, da: 0, tr: 0, ot: 0, cm: 0, te: 0, bill: 0, vat: 0, coll: 0, ncoll: 0 };
  var cell = function (v, cls) { return '<td class="' + TD + ' text-center align-middle font-mono' + (cls ? ' ' + cls : '') + ' whitespace-nowrap">' + v + '</td>'; };
  var TL = TD + ' text-left align-middle';
  var counts = {}; R.forEach(function (r) { counts[r.d] = (counts[r.d] || 0) + 1; });
  var seen = {}, rows = R.map(function (r) {
    Object.keys(T).forEach(function (k) { T[k] += n(r[k]); });
    var dc = seen[r.d] ? '' : '<td rowspan="' + counts[r.d] + '" class="' + TD + ' whitespace-nowrap font-bold text-center align-middle bg-slate-50 dark:bg-slate-800/60">' + esc(r.d) + '</td>'; seen[r.d] = 1;
    var notes = r.recs.filter(function (x) { return x.note; }).map(function (x) { return noteChip(x.k, x.note); }).join('');
    return '<tr' + (FS ? ' data-a="frow" data-v="' + esc(r.d) + '" title="' + L('Open this date in Entry History to edit / delete (PIN)', 'এডিট / ডিলিট করতে এই তারিখের এন্ট্রি হিস্ট্রি খুলুন (পিন)') + '" class="pj-row cursor-pointer"' : ' class="pj-row"') + '>' + dc + cell(r.lq ? fmt(r.lq) : '') + cell(nz(r.la), 'font-bold') +
      '<td class="' + TL + '">' + esc(r.sdesc || '') + '</td>' + cell(esc(r.sq || '')) + cell(r.sr ? fmt(r.sr) : '') + cell(nz(r.sb), 'font-bold') + cell(nz(r.sp), 'text-teal-700') + cell(r.sd === undefined ? '' : fmt(r.sd), 'font-bold text-purple-700 dark:text-purple-400') +
      '<td class="' + TL + '">' + esc(r.cn || '') + '</td>' + cell(esc(r.cq || '')) + cell(r.cr ? fmt(r.cr) : '') + cell(nz(r.ca), 'font-bold') + cell(nz(r.ta)) + cell(nz(r.da)) + cell(nz(r.tr)) + cell(nz(r.ot)) + cell(nz(r.cm)) + cell(nz(r.te), 'font-black text-rose-600') +
      cell(nz(r.bill), 'text-blue-700 dark:text-blue-400 font-bold') + cell(nz(r.vat)) + cell(nz(r.coll), 'text-emerald-700 dark:text-emerald-400 font-bold') + cell(r.bal === undefined ? '' : fmt(r.bal), 'text-orange-700 dark:text-orange-400 font-bold') + cell(nz(r.ncoll), 'text-green-800 dark:text-green-300 font-black bg-green-50/70 dark:bg-green-950/30') + '<td class="' + TL + ' min-w-[90px]">' + notes + '</td></tr>';
  }).join('') || '<tr><td colspan="' + NC + '" class="' + TD + ' text-center text-slate-400 py-6">' + L('No records in this period', 'এই সময়ে কোনো রেকর্ড নেই') + '</td></tr>';
  var g = function (t, cs, rs, c) { return '<th colspan="' + (cs || 1) + '" rowspan="' + (rs || 1) + '" class="' + TH + ' text-center ' + (c || '') + '">' + t + '</th>'; };
  var h2 = function (t, c) { return '<th class="' + TH + ' text-center font-semibold bg-slate-700 ' + (c || '') + '">' + t + '</th>'; };
  var head = '<tr class="bg-slate-800 text-white font-bold">' + g(L('Date', 'তারিখ'), 1, 2) + g(L('Labor', 'লেবার'), 2, 1, 'bg-sky-800') + g(L('Subcontractor', 'সাবকন্ট্রাক্টর'), 6, 1, 'bg-cyan-800') + g(L('Chemical', 'কেমিক্যাল'), 4, 1, 'bg-violet-800') + g('TA', 1, 2, 'bg-amber-800') + g('DA', 1, 2, 'bg-amber-800') + g(L('Goods Transport', 'গুডস ট্রান্সপোর্ট'), 1, 2, 'bg-amber-800') + g(L('Other', 'অন্যান্য'), 1, 2, 'bg-amber-800') + g(L('Eng. Comm.', 'ইঞ্জি. কমিশন'), 1, 2, 'bg-pink-800') + g(L('Total Expense', 'মোট খরচ'), 1, 2, 'bg-rose-800') + g(L('Billing & Collection', 'বিল ও কালেকশন'), 5, 1, 'bg-blue-800') + g(L('Note / Purpose', 'নোট / উদ্দেশ্য'), 1, 2) + '</tr>' +
    '<tr class="text-white font-semibold">' + h2(L('Qty', 'সংখ্যা')) + h2(L('Amount', 'টাকা')) + h2(L('Name / Work', 'নাম / কাজ')) + h2(L('Qty', 'পরিমাণ')) + h2(L('Rate', 'রেট')) + h2(L('Bill', 'বিল')) + h2(L('Paid', 'দেওয়া')) + h2(L('Sub. Due', 'সাব. বাকি'), 'text-purple-200') + h2(L('Name', 'নাম')) + h2(L('Qty', 'পরিমাণ')) + h2(L('Rate', 'রেট')) + h2(L('Amount', 'টাকা')) + h2(L('Bill', 'বিল'), 'text-blue-200') + h2(L('VAT, TAX & AIT', 'ভ্যাট, ট্যাক্স ও এআইটি')) + h2(L('Collection', 'কালেকশন'), 'text-emerald-200') + h2(L('Due Balance', 'বাকি (ব্যালেন্স)'), 'text-orange-200') + h2(L('Net Collection (after VAT/TAX)', 'নিট কালেকশন (ভ্যাট/ট্যাক্স বাদে)'), 'text-green-200') + '</tr>';
  var E3 = '<td class="' + TD + '"></td>';
  var tr = '<tr class="bg-slate-100 dark:bg-slate-800 font-black text-xs border-t-2 border-slate-800"><td class="' + TD + ' text-center uppercase">Total</td>' + cell(fmt(T.lq)) + cell(fmt(T.la)) + E3 + E3 + E3 + cell(fmt(T.sb)) + cell(fmt(T.sp)) + cell(fmt(LS.subDue), 'text-purple-700') + E3 + E3 + E3 + cell(fmt(T.ca)) + cell(fmt(T.ta)) + cell(fmt(T.da)) + cell(fmt(T.tr)) + cell(fmt(T.ot)) + cell(fmt(T.cm)) + cell(fmt(T.te), 'text-rose-600') + cell(fmt(T.bill)) + cell(fmt(T.vat)) + cell(fmt(T.coll)) + cell(fmt(LS.due), 'text-orange-700') + cell(fmt(T.ncoll), 'text-green-800') + E3 + '</tr>';
  var neg = function (v) { return v < 0 ? 'text-rose-600' : 'text-emerald-700 dark:text-emerald-400'; };
  var items = [[L('Net Receivable (Bill − VAT, TAX & AIT)', 'নেট প্রাপ্য (বিল − ভ্যাট, ট্যাক্স ও এআইটি)'), money(s.net), 'text-indigo-700 dark:text-indigo-400'], [L('Collected', 'কালেকশন'), money(s.recv), 'text-emerald-700 dark:text-emerald-400'], [L('DUE — still to receive', 'বাকি — এখনও পাবো'), money(s.due), 'text-rose-600'], [L('Total Expense', 'মোট খরচ'), money(s.exp), 'text-rose-600'], [L('NET PROFIT (Net Receivable − Expense)', 'নেট লাভ (নেট প্রাপ্য − খরচ)'), money(s.profit), neg(s.profit)], [L('Sub. payable (Bill − Paid)', 'সাব পাবে (বিল − দেওয়া)'), money(s.subDue), 'text-purple-700'], [L('Cash position (Collected − Paid out)', 'নগদ অবস্থা (কালেকশন − নগদ খরচ)'), money(s.cash), neg(s.cash)]];
  if (life) { items.push([L('Contract value', 'কন্ট্রাক্ট মূল্য'), money(p.contract), '']); items.push([L('Yet to bill', 'এখনও বিল বাকি'), money(n(p.contract) - s.bill), '']); }
  var base = Math.floor(NC / items.length), extra = NC - base * items.length;
  var res = '<tr class="bg-white dark:bg-slate-900 border-t-2 border-slate-800">' + items.map(function (it, i) { return '<td colspan="' + (base + (i < extra ? 1 : 0)) + '" class="' + TD + ' align-top"><div class="text-[9px] uppercase font-bold text-slate-500 dark:text-slate-400 leading-tight">' + it[0] + '</div><div class="text-xs font-black font-mono ' + it[2] + '">' + it[1] + '</div></td>'; }).join('') + '</tr>';
  var tbl = '<div class="' + (FS ? 'pj-fs-scroll' : 'pj-lwrap') + '" id="' + (FS ? 'fsScroll' : 'ledgerBox') + '"><table class="w-full border-collapse text-[11px] font-sans print-table pj-ledger"><thead>' + head + '</thead><tbody class="font-medium">' + rows + '</tbody><tfoot>' + tr + res + '</tfoot></table></div>';
  var seg = [['life', 'Lifetime', 'লাইফটাইম'], ['month', 'Month', 'মাস'], ['day', 'Today', 'আজ'], ['date', 'Date', 'তারিখ']].map(function (x) { return '<button type="button" data-a="per" data-v="' + x[0] + '" class="px-2 py-0.5 rounded-md text-[11px] font-bold cursor-pointer active:scale-95 transition-all ' + (S.per === x[0] ? 'bg-pink-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800') + '">' + L(x[1], x[2]) + '</button>'; }).join('');
  var pinp = S.per === 'month' ? '<input type="month" data-f="pmonth" value="' + S.pmonth + '" class="p-0.5 border border-slate-300 dark:border-slate-700 rounded-md bg-slate-50 dark:bg-slate-800 text-[11px]">' : S.per === 'date' ? '<input type="date" data-f="pdate" value="' + S.pdate + '" class="p-0.5 border border-slate-300 dark:border-slate-700 rounded-md bg-slate-50 dark:bg-slate-800 text-[11px]">' : '';
  var mini = [[L('Total Expense', 'মোট খরচ'), 'exp', 'text-rose-600'], [L('Total Bill', 'মোট বিল'), 'bill', 'text-blue-600'], [L('VAT, TAX & AIT', 'ভ্যাট, ট্যাক্স ও এআইটি'), 'vat', 'text-amber-600'], [L('Net Receivable', 'নেট প্রাপ্য'), 'net', 'text-indigo-600'], [L('Collected', 'কালেকশন'), 'recv', 'text-emerald-600'], [L('Due (to receive)', 'বাকি (পাবো)'), 'due', 'text-orange-600'], [L('Sub. Payable', 'সাব. পাবে'), 'subDue', 'text-purple-600'], [L('Net Profit', 'নেট লাভ'), 'profit', s.profit < 0 ? 'text-rose-600' : 'text-emerald-600']].map(function (x) { return '<div class="rounded-lg px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs"><div class="text-[9px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 leading-tight">' + x[0] + '</div><div class="text-sm font-black ' + x[2] + ' font-sans leading-tight">' + money(s[x[1]]) + '</div>' + (life ? '' : '<div class="text-[10px] text-slate-500 leading-tight">' + L('Lifetime: ', 'লাইফটাইম: ') + '<b class="font-mono">' + fmt(LS[x[1]]) + '</b></div>') + '</div>'; }).join('');
  var lifeBox = '<div class="no-print rounded-xl px-3 py-2 border ' + (LS.due > 0 ? 'border-orange-300 bg-orange-50 dark:bg-orange-950/20' : 'border-emerald-300 bg-emerald-50 dark:bg-emerald-950/20') + ' flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]"><b class="uppercase tracking-wide text-slate-700 dark:text-slate-200">' + L('Lifetime (start → today)', 'লাইফটাইম (শুরু → আজ)') + ':</b>' +
    [[L('Contract', 'কন্ট্রাক্ট'), n(p.contract), ''], [L('Billed', 'বিল হয়েছে'), LS.bill, 'text-blue-700'], [L('Net receivable', 'নেট প্রাপ্য'), LS.net, 'text-indigo-700'], [L('Received', 'পাওয়া গেছে'), LS.recv, 'text-emerald-700'], [L('Not received yet', 'এখনও পাওয়া যায়নি'), LS.due, 'text-rose-600'], [L('Yet to bill', 'বিল করা বাকি'), n(p.contract) ? n(p.contract) - LS.bill : 0, 'text-amber-700'], [L('Expense', 'খরচ'), LS.exp, 'text-rose-600'], [L('Profit', 'লাভ'), LS.profit, LS.profit < 0 ? 'text-rose-600' : 'text-emerald-700']].filter(function (x, i) { return i !== 0 && i !== 5 || n(p.contract); }).map(function (x) { return '<span>' + x[0] + ': <b class="font-mono ' + x[2] + '">' + fmt(x[1]) + '</b></span>'; }).join('') + '</div>';
  if (FS) {
    var fb = 'p-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-pink-50 dark:hover:bg-slate-700 cursor-pointer text-slate-600 dark:text-slate-200';
    return '<div class="pj-fs bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"><div class="pj-fs-bar flex items-center flex-wrap gap-2 px-2 py-1.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">' +
      '<span class="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span><b class="text-xs uppercase">' + esc(p.name) + '</b><span class="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">' + L('Edit Mode', 'এডিট মোড') + '</span>' +
      (S.fsFold ? '' : '<div class="flex items-center gap-0.5 p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">' + seg + '</div>' + pinp + '<button type="button" data-a="addE" class="' + BTN_P + '">' + ic('plus', 'w-3.5 h-3.5') + '<span>' + L('Add Entry', 'অ্যাড এন্ট্রি') + '</span></button><button type="button" data-a="hist" class="' + BTN_S + '">' + ic('refresh', 'w-3.5 h-3.5') + '<span>' + L('Entry History', 'এন্ট্রি হিস্ট্রি') + '</span></button><span class="hidden md:inline text-[10px] text-slate-500">' + L('Tap a row → edit / delete that date’s entries (PIN)', 'সারিতে ট্যাপ → ওই তারিখের এন্ট্রি এডিট / ডিলিট (পিন)') + '</span>') +
      '<div class="ml-auto flex items-center gap-1"><button type="button" data-a="fsfold" title="' + (S.fsFold ? L('Show menu', 'মেনু দেখান') : L('Fold menu', 'মেনু ভাঁজ করুন')) + '" class="' + fb + '">' + ic(S.fsFold ? 'cd' : 'up2', 'w-3.5 h-3.5') + '</button><button type="button" data-a="fsclose" title="' + L('Close Edit Mode (Esc)', 'এডিট মোড বন্ধ (Esc)') + '" class="p-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white cursor-pointer">' + ic('x', 'w-3.5 h-3.5') + '</button></div></div><div id="coedit" class="px-2 pt-1"></div>' + tbl + '</div>';
  }
  return '<div class="space-y-2"><div class="no-print flex flex-col lg:flex-row lg:items-center justify-between gap-1.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl px-3 py-1.5 shadow-xs"><div class="flex items-center flex-wrap gap-2"><button type="button" data-a="pback" title="' + L('Back to projects', 'প্রজেক্ট তালিকা') + '" class="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-pink-50 cursor-pointer border border-slate-200 dark:border-slate-700">' + ic('cl', 'w-3.5 h-3.5') + '</button><h2 class="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5"><span class="text-pink-600 font-extrabold">' + idx + '.</span><span class="uppercase">' + esc(p.name) + '</span></h2>' + stPill(p.status) +
    '<div class="flex items-center gap-0.5 p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">' + seg + '</div>' + pinp + '<button type="button" data-a="bill" data-v="" title="' + L('Bills & Measurements of this project', 'এই প্রজেক্টের বিল ও মেজারমেন্ট') + '" class="pj-billbtn bill ml-1" aria-label="Bills & Measurements">' + ic('billm', 'w-4 h-4') + '</button></div><div class="flex items-center flex-wrap gap-1.5"><button type="button" data-a="addE" class="' + BTN_P + '">' + ic('plus', 'w-3.5 h-3.5') + '<span>' + L('Add Entry', 'অ্যাড এন্ট্রি') + '</span></button><button type="button" data-a="hist" class="' + BTN_S + '">' + ic('refresh', 'w-3.5 h-3.5') + '<span>' + L('Entry History', 'এন্ট্রি হিস্ট্রি') + '</span></button><button type="button" data-a="printp" class="' + BTN_S + '">' + ic('print', 'w-3.5 h-3.5') + '<span>Print</span></button><button type="button" data-a="csvp" class="' + BTN_S + '">' + ic('down', 'w-3.5 h-3.5') + '<span>CSV</span></button></div></div>' +
    '<div id="coedit" class="no-print"></div><div class="no-print grid grid-cols-2 lg:grid-cols-4 gap-1.5">' + mini + '</div>' + lifeBox +
    '<div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-2 shadow-xs">' + printHead(L('PROJECT STATEMENT', 'প্রজেক্ট স্টেটমেন্ট') + ' — ' + esc(p.name).toUpperCase() + ' (' + esc(perLabel()) + ')') +
    '<div class="text-[11px] text-slate-500 dark:text-slate-400 mb-1.5 flex flex-wrap items-center gap-x-4 gap-y-1"><button type="button" data-a="focus" title="' + L('Edit Mode — full screen with frozen header', 'এডিট মোড — ফুল স্ক্রিন, হেডার ফ্রিজ') + '" class="no-print order-last ml-auto flex items-center gap-1 px-1.5 py-0.5 rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 hover:bg-amber-100 cursor-pointer text-[10px] font-bold">' + ic('max', 'w-3 h-3') + L('Edit Mode', 'এডিট মোড') + '</button>' + [[L('Client', 'ক্লায়েন্ট'), p.client], [L('Contact', 'কন্টাক্ট'), [p.cperson, p.cphone ? bdFmt(p.cphone) : ''].filter(Boolean).join(' · ')], [L('Location', 'লোকেশন'), p.location], [L('Start', 'শুরু'), p.start], [L('End', 'শেষ'), p.end], [L('Contract', 'কন্ট্রাক্ট'), p.contract ? money(p.contract) : ''], [L('Note', 'নোট'), p.note]].filter(function (x) { return x[1]; }).map(function (x) { return '<span><b class="text-slate-700 dark:text-slate-200">' + x[0] + ':</b> ' + esc(x[1]) + '</span>'; }).join('') + '</div>' + tbl +
    sigHtml('project') + '</div></div>';
}
function genView() {
  var btn = function (a, v, on, t) { return '<button type="button" data-a="' + a + '" data-v="' + v + '" class="px-4 py-2 rounded-xl text-xs font-bold cursor-pointer active:scale-95 transition-all ' + (on ? 'bg-pink-600 text-white shadow-xs' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700') + '">' + t + '</button>'; };
  return '<div class="space-y-4"><div class="bg-slate-900 text-white rounded-2xl px-5 py-3.5 shadow-md border border-slate-800 flex items-center gap-2.5"><div class="w-9 h-9 rounded-xl bg-pink-600/20 text-pink-400 flex items-center justify-center shrink-0 border border-pink-500/30">' + ic('gear', 'w-5 h-5') + '</div><div><h1 class="text-base sm:text-lg font-bold text-white leading-tight">' + L('General Settings', 'সাধারণ সেটিংস') + '</h1><p class="text-[11px] text-slate-400">' + L('Language, theme, currency and display name — sensitive settings are inside Admin', 'ভাষা, থিম, মুদ্রা ও প্রদর্শনের নাম — সংবেদনশীল সেটিংস Admin-এ আছে') + '</p></div></div>' +
    '<div class="' + CARD + '"><div class="text-xs font-bold mb-2">' + L('Language', 'ভাষা') + '</div><div class="flex gap-2">' + btn('setlang', 'bn', S.lang === 'bn', 'বাংলা') + btn('setlang', 'en', S.lang === 'en', 'English') + '</div></div>' +
    '<div class="' + CARD + '"><div class="text-xs font-bold mb-2">' + L('Theme', 'থিম') + '</div><div class="flex gap-2">' + btn('settheme', 'light', S.theme !== 'dark', L('Light', 'লাইট')) + btn('settheme', 'dark', S.theme === 'dark', L('Dark', 'ডার্ক')) + '</div></div>' +
    '<div class="' + CARD + '"><div class="text-xs font-bold mb-1">' + L('Your name on this device', 'এই ডিভাইসে আপনার নাম') + '</div><p class="text-[11px] text-slate-500 mb-2">' + L('Shown to others in “Online now” and in edit warnings.', '“এখন অনলাইনে” তালিকা ও এডিট সতর্কতায় অন্যরা এই নাম দেখবে।') + '</p><div class="flex gap-2"><input id="s-myname" maxlength="30" value="' + esc(ls('myname') || '') + '" placeholder="' + esc(myName()) + '" class="' + INP + ' max-w-[16rem]"><button type="button" data-a="savename" class="px-4 py-2 rounded-xl bg-pink-600 text-white text-xs font-bold cursor-pointer active:scale-95">' + L('Save', 'সংরক্ষণ') + '</button></div></div>' +
    '<div class="' + CARD + '"><div class="text-xs font-bold mb-1">' + L('Currency & Display Name', 'মুদ্রা ও প্রদর্শনের নাম') + '</div><p class="text-[11px] text-slate-500 mb-2">' + L('Shown in headers, reports and print.', 'হেডার, রিপোর্ট ও প্রিন্টে দেখানো হবে।') + '</p><div class="grid grid-cols-1 sm:grid-cols-4 gap-2"><input id="s-cur" maxlength="4" value="' + esc(C.currency) + '" placeholder="৳" class="' + INP + '"><input id="s-co" value="' + esc(C.company) + '" class="' + INP + ' sm:col-span-1"><input id="s-tag" value="' + esc(C.tagline) + '" class="' + INP + '"><button type="button" data-a="savegen" class="px-4 py-2 rounded-xl bg-pink-600 text-white text-xs font-bold cursor-pointer active:scale-95">' + L('Save', 'সংরক্ষণ') + '</button></div></div></div>';
}
function subTabs(key, list) {
  return '<div class="flex items-center gap-1 flex-wrap p-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 mb-3">' + list.map(function (t) { return '<button type="button" data-a="' + key + '" data-v="' + t[0] + '" class="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer active:scale-95 transition-all ' + (S[key] === t[0] ? 'bg-slate-900 text-white dark:bg-pink-600' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800') + '">' + ic(t[3], 'w-3 h-3') + '<span>' + L(t[1], t[2]) + '</span></button>'; }).join('') + '</div>';
}
function adminView() {
  if (['logo', 'print', 'billset', 'data', 'sec'].indexOf(S.atab) < 0) S.atab = 'sec';
  var tabs = [['logo', 'Logo Setup', 'লোগো সেটআপ', 'dash'], ['print', 'Print & Signature', 'প্রিন্ট ও সিগনেচার', 'print'], ['billset', 'Bill & Measurement', 'বিল ও মেজারমেন্ট', 'bill'], ['data', 'Backup, Restore & Reset', 'ব্যাকআপ, রিস্টোর ও রিসেট', 'db'], ['sec', 'Security & Privacy', 'সিকিউরিটি ও প্রাইভেসি', 'shield']].map(function (t) { return '<button type="button" data-a="atab" data-v="' + t[0] + '" class="' + (S.atab === t[0] ? TAB_ON : TAB_OFF) + '">' + ic(t[3], 'w-3.5 h-3.5') + '<span>' + L(t[1], t[2]) + '</span></button>'; }).join('');
  var pw = function (id, ph) { return '<input id="' + id + '" type="password" inputmode="numeric" maxlength="8" autocomplete="off" placeholder="' + ph + '" class="' + INP + ' font-mono">'; };
  var body = '';
  if (S.atab === 'sec') {
    body = subTabs('stab', [['pins', 'Admin & User PIN', 'অ্যাডমিন ও ইউজার পিন', 'lock'], ['lock', 'Edit Mode Lock', 'এডিট মোড লক', 'edit'], ['rec', 'PIN Recovery (Email & SMS)', 'পিন রিকভারি (ইমেইল ও এসএমএস)', 'alert']]);
    if (S.stab === 'lock') body += '<div class="' + CARD + '"><div class="flex items-center justify-between gap-3"><div><div class="text-xs font-bold mb-1">' + L('Require PIN to turn on Edit Mode', 'এডিট মোড চালু করতে পিন লাগবে') + '</div><p class="text-[11px] text-slate-500">' + L('When OFF, Edit Mode switches on with one click. Changing this needs the admin PIN.', 'বন্ধ করলে এক ক্লিকেই এডিট মোড চালু হবে। এই সেটিং বদলাতে অ্যাডমিন পিন লাগবে।') + '</p></div><button type="button" data-a="editpin" class="px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer shrink-0 ' + (C.editPin === 'false' ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200' : 'bg-emerald-600 text-white') + '">' + (C.editPin === 'false' ? L('PIN not required', 'পিন লাগবে না') : L('PIN required', 'পিন লাগবে')) + '</button></div></div>';
    else if (S.stab === 'rec') body += recCard();
    else body += '<div class="' + CARD + '"><div class="text-xs font-bold mb-1">' + L('Change Admin PIN (4–8 digits)', 'অ্যাডমিন পিন পরিবর্তন (৪–৮ সংখ্যা)') + '</div><p class="text-[11px] text-slate-500 mb-2">' + L('The new PIN is saved in the Google Sheet and applies on every device. It is also the password for Backup / Restore / Reset.', 'নতুন পিন গুগল শিটে সেভ হয় ও সব ডিভাইসে কাজ করে। এটিই ব্যাকআপ / রিস্টোর / রিসেটের পাসওয়ার্ড।') + '</p><div class="grid grid-cols-1 sm:grid-cols-4 gap-2">' + pw('p0', L('Current PIN', 'বর্তমান পিন')) + pw('p1', L('New PIN (4–8)', 'নতুন পিন (৪–৮)')) + pw('p2', L('Confirm new PIN', 'নতুন পিন নিশ্চিত করুন')) + '<button type="button" data-a="chpin" class="px-4 py-2 rounded-xl bg-pink-600 text-white text-xs font-bold cursor-pointer disabled:opacity-50 active:scale-95">' + L('Change PIN', 'পিন পরিবর্তন') + '</button></div></div>' +
      '<div class="' + CARD + '"><div class="text-xs font-bold mb-1">' + L('Change User PIN (4–8 digits)', 'ইউজার পিন পরিবর্তন (৪–৮ সংখ্যা)') + '</div><p class="text-[11px] text-slate-500 mb-2">' + L('The PIN that normal users log in with. Needs the admin PIN to change.', 'সাধারণ ইউজার যে পিনে লগইন করে। বদলাতে অ্যাডমিন পিন লাগবে।') + '</p><div class="grid grid-cols-1 sm:grid-cols-4 gap-2">' + pw('up0', L('Admin PIN', 'অ্যাডমিন পিন')) + pw('up1', L('New user PIN', 'নতুন ইউজার পিন')) + pw('up2', L('Confirm new user PIN', 'নতুন ইউজার পিন নিশ্চিত করুন')) + '<button type="button" data-a="chupin" class="px-4 py-2 rounded-xl bg-pink-600 text-white text-xs font-bold cursor-pointer active:scale-95">' + L('Change User PIN', 'ইউজার পিন পরিবর্তন') + '</button></div></div>';
  } else if (S.atab === 'logo') {
    body = logoTab();
  } else if (S.atab === 'print') {
    body = sigTab();
  } else if (S.atab === 'billset') {
    body = billSetTab();
  } else {
    body = subTabs('dtab', [['bk', 'Backup (JSON)', 'ব্যাকআপ (JSON)', 'down'], ['auto', 'Auto Backup (Google Drive)', 'অটো ব্যাকআপ (গুগল ড্রাইভ)', 'sync'], ['rs', 'Restore', 'রিস্টোর', 'up'], ['rz', 'Reset', 'রিসেট', 'trash']]);
    if (S.dtab === 'rs') body += rsTab();
    else if (S.dtab === 'auto') body += abTab();
    else if (S.dtab === 'rz') body += '<div class="' + CARD + '"><div class="text-xs font-bold mb-1 text-rose-600">' + L('Reset — wipe all data and start fresh', 'রিসেট — সব ডাটা মুছে নতুন করে শুরু') + '</div>' + (!S.backupDone ? '<div class="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-3 text-xs"><p class="font-semibold text-amber-800 dark:text-amber-300 mb-2">' + L('Reset is locked. First take a full Lifetime backup (Backup tab) in this session.', 'রিসেট লক করা আছে। আগে ব্যাকআপ ট্যাব থেকে এই সেশনে ফুল লাইফটাইম ব্যাকআপ নিন।') + '</p><button type="button" data-a="dtab" data-v="bk" class="' + BTN_P + '">' + ic('down', 'w-3.5 h-3.5') + '<span>' + L('Go to Backup', 'ব্যাকআপে যান') + '</span></button></div>' :
      '<label class="flex items-start gap-2 text-xs mb-3"><input type="checkbox" id="rzbk" ' + (S.rzOk ? 'checked' : '') + ' data-a="rzchk" class="mt-0.5"><span>' + L('I have downloaded and safely stored the full backup file.', 'আমি ফুল ব্যাকআপ ফাইল ডাউনলোড করে নিরাপদে রেখেছি।') + '</span></label>' + (S.rzOk ? '<div class="grid grid-cols-1 sm:grid-cols-3 gap-2"><input id="rztype" placeholder="' + L('Type RESET to confirm', 'নিশ্চিত করতে RESET লিখুন') + '" class="' + INP + ' font-mono" autocomplete="off">' + pw('rzpin', L('Admin PIN (password)', 'অ্যাডমিন পিন (পাসওয়ার্ড)')) + '<button type="button" id="rzgo" data-a="dorz" disabled class="' + BTN_D + ' justify-center">' + ic('trash', 'w-4 h-4') + '<span>' + L('Reset All Data', 'সব ডাটা রিসেট') + '</span></button></div>' : '')) + '</div>';
    else {
      var b = S.bk, yopts = '';
      for (var y = 2022; y <= 2035; y++) yopts += '<option value="' + y + '"' + (String(y) === b.year ? ' selected' : '') + '>' + y + '</option>';
      var sc = [['all', 'Lifetime (A to Z — everything)', 'লাইফটাইম (A থেকে Z — সব ডাটা)'], ['year', 'Year-wise', 'বছর অনুযায়ী'], ['month', 'Month-wise', 'মাস অনুযায়ী'], ['range', 'Date range', 'তারিখ থেকে তারিখ'], ['day', 'Single date', 'নির্দিষ্ট তারিখ']].map(function (o) { return '<option value="' + o[0] + '"' + (b.scope === o[0] ? ' selected' : '') + '>' + L(o[1], o[2]) + '</option>'; }).join('');
      var extra = b.scope === 'year' ? '<select data-bk="year" class="' + INP + '">' + yopts + '</select>' : b.scope === 'month' ? '<input type="month" data-bk="month" value="' + b.month + '" class="' + INP + '">' : b.scope === 'range' ? '<div class="flex gap-2 items-center"><input type="date" data-bk="from" value="' + b.from + '" class="' + INP + '"><span class="text-xs text-slate-500">' + L('to', 'থেকে') + '</span><input type="date" data-bk="to" value="' + b.to + '" class="' + INP + '"></div>' : b.scope === 'day' ? '<input type="date" data-bk="day" value="' + b.day + '" class="' + INP + '">' : '';
      body += '<div class="' + CARD + '"><div class="text-xs font-bold mb-1">' + L('Backup — Export data as JSON', 'ব্যাকআপ — JSON ফরম্যাটে ডাটা এক্সপোর্ট') + '</div><p class="text-[11px] text-slate-500 mb-3">' + L('Export every project, expense, bill and payment — plus all Bills & Measurements (documents, numbers, letterhead / seal / signature settings). The JSON file can be reused anywhere or restored here later. Admin PIN is required.', 'সকল প্রজেক্ট, খরচ, বিল ও পেমেন্ট — সাথে সব বিল ও মেজারমেন্ট (ডকুমেন্ট, নম্বর, প্যাড / সিল / সিগনেচার সেটিংস) এক্সপোর্ট হবে। JSON ফাইল অন্য জায়গায় ব্যবহার বা পরে এখানে রিস্টোর করা যাবে। অ্যাডমিন পিন লাগবে।') + '</p><div class="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2"><select data-bk="scope" class="' + INP + '">' + sc + '</select><div class="sm:col-span-2">' + extra + '</div></div><div class="grid grid-cols-1 sm:grid-cols-3 gap-2">' + pw('bkpin', L('Admin PIN (password)', 'অ্যাডমিন পিন (পাসওয়ার্ড)')) + '<button type="button" data-a="dobk" class="' + BTN_G + ' justify-center sm:col-span-2">' + ic('down', 'w-4 h-4') + '<span>' + L('Download JSON Backup', 'JSON ব্যাকআপ ডাউনলোড') + '</span></button></div><div class="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2"><p class="text-[11px] text-slate-500"><b class="text-slate-700 dark:text-slate-200">' + L('FULL backup', 'সম্পূর্ণ ব্যাকআপ') + '</b> — ' + L('all data + all settings + activity log in one file (uses the PIN above).', 'সব ডাটা + সব সেটিংস + অ্যাক্টিভিটি লগ একটি ফাইলে (উপরের পিন লাগবে)।') + '</p><button type="button" data-a="dofull" class="' + BTN_P + ' justify-center shrink-0">' + ic('db', 'w-4 h-4') + '<span>' + L('Download FULL Backup', 'সম্পূর্ণ ব্যাকআপ ডাউনলোড') + '</span></button></div>' + (S.backupDone ? '<p class="text-[11px] font-semibold text-emerald-700 mt-2">✔ ' + L('Full lifetime backup completed in this session — Reset is now available.', 'এই সেশনে ফুল লাইফটাইম ব্যাকআপ হয়েছে — এখন রিসেট করা যাবে।') + '</p>' : '<p class="text-[11px] font-semibold text-amber-700 mt-2">' + L('Tip: take a Lifetime backup before any Reset.', 'পরামর্শ: রিসেটের আগে লাইফটাইম ব্যাকআপ নিন।') + '</p>') + '</div>';
    }
  }
  return '<div class="space-y-4"><div class="bg-slate-900 text-white rounded-2xl px-5 py-3.5 shadow-md border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div class="flex items-center gap-2.5"><div class="w-9 h-9 rounded-xl bg-pink-600/20 text-pink-400 flex items-center justify-center shrink-0 border border-pink-500/30">' + ic('shield', 'w-5 h-5') + '</div><div><h1 class="text-base sm:text-lg font-bold text-white leading-tight">' + L('Admin Control & System Settings', 'অ্যাডমিন কন্ট্রোল ও সিস্টেম সেটিংস') + '</h1><p class="text-[11px] text-slate-400">' + L('Logo, backup / restore / reset, security & privacy', 'লোগো, ব্যাকআপ / রিস্টোর / রিসেট, সিকিউরিটি ও প্রাইভেসি') + '</p></div></div><div class="flex items-center gap-2"><button type="button" data-a="sync" class="' + BTN_P + '"><span>Sync Data</span></button></div></div>' +
    '<div class="flex items-center gap-1 sm:gap-2 overflow-x-auto pb-1 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold">' + tabs + '</div><div>' + body + '</div></div>';
}
function render() {
  document.documentElement.classList.toggle('dark', S.theme === 'dark');
  var root = $('#root');
  if (!S.role) { root.innerHTML = loginView(); return; }
  if (S.focus && S.view === 'project' && proj(S.pid)) {
    var sc = $('#fsScroll'), st = sc ? [sc.scrollTop, sc.scrollLeft] : null;
    root.innerHTML = projectView();
    var sc2 = $('#fsScroll'), r1 = document.querySelector('.pj-fs .pj-ledger thead tr');
    if (r1) $('.pj-fs').style.setProperty('--h1', r1.getBoundingClientRect().height + 'px');
    if (sc2 && st) { sc2.scrollTop = st[0]; sc2.scrollLeft = st[1]; }
    markScrollers(); updPresence(); billWarmSoon(); if (S._pv !== 'fs|' + S.pid) { S._pv = 'fs|' + S.pid; pingSoon(); } return;
  }
  S.focus = false;
  var lb0 = $('#ledgerBox'), lst = lb0 ? [lb0.scrollTop, lb0.scrollLeft] : null;
  var v = S.view === 'dash' ? dashView() : S.view === 'projects' ? projectsView() : S.view === 'due' ? dueView() : S.view === 'project' ? projectView() : S.view === 'settings' || S.view === 'export' ? settingsView() : (isAdmin() ? adminView() : projectsView());
  if (S.loading && !D.projects.length) { var sk = function (c) { return '<div class="pj-skel rounded-2xl ' + c + '"></div>'; }; v = '<div class="space-y-3"><div class="flex items-center gap-2 text-xs font-semibold text-slate-400">' + ic('sync', 'w-4 h-4 animate-spin') + L('Loading data…', 'ডাটা লোড হচ্ছে…') + '</div>' + sk('h-28') + '<div class="grid grid-cols-2 lg:grid-cols-4 gap-3">' + sk('h-24') + sk('h-24') + sk('h-24') + sk('h-24') + '</div>' + sk('h-64') + '</div>'; }
  else if (S._lv !== S.view + '|' + S.pid) { v = '<div class="pj-fade">' + v + '</div>'; }
  S._lv = S.view + '|' + S.pid;
  var banner = S.err ? '<div class="no-print flex items-center justify-between gap-2 px-3 py-1.5 mb-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-[11px] text-rose-700 dark:text-rose-300 font-semibold"><span>⚠ ' + L('Could not reach the database: ', 'ডাটাবেসের সাথে সংযোগ হয়নি: ') + esc(S.err) + ' — ' + L('showing the last loaded data. Retrying automatically…', 'শেষবার লোড হওয়া ডাটা দেখানো হচ্ছে। নিজে নিজে আবার চেষ্টা করা হচ্ছে…') + '</span><button type="button" data-a="sync" class="' + BTN_S + '">' + L('Retry now', 'এখনই চেষ্টা করুন') + '</button></div>' : '';
  var badB = (S.bad && S.bad.length) ? '<div class="no-print px-3 py-1.5 mb-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 text-[11px] text-amber-800 dark:text-amber-300 font-semibold">⚠ ' + S.bad.length + ' ' + L('row(s) in the DB_Records sheet could not be read and are NOT shown (sheet rows: ', 'টি সারি DB_Records শিট থেকে পড়া যায়নি, তাই দেখানো হচ্ছে না (শিটের সারি: ') + esc(S.bad.slice(0, 8).map(function (b) { return b.row; }).join(', ')) + (S.bad.length > 8 ? '…' : '') + ').</div>' : '';
  root.innerHTML = '<div class="min-h-screen flex flex-col transition-colors duration-200 bg-slate-100/70 dark:bg-slate-950 text-slate-900 dark:text-slate-100">' + header() + nav() +
    '<main class="flex-1 w-full px-2 sm:px-3 lg:px-4 py-2 print:max-w-none print:w-full print:p-0 print:m-0 overflow-x-hidden">' + banner + badB + v + '</main>' +
    '<footer class="no-print border-t border-slate-200 dark:border-slate-800 py-3 text-center text-xs text-slate-400"><div class="w-full px-4 flex flex-col sm:flex-row items-center justify-between gap-2"><span>© 2026 ' + esc(C.company) + ' (SCS). All Rights Reserved.</span><span class="text-pink-600 dark:text-pink-400 font-semibold">' + esc(C.tagline) + '</span></div></footer></div>';
  setTimeout(fhBuild, 0);
  var lb1 = $('#ledgerBox'), lr1 = lb1 && lb1.querySelector('.pj-ledger thead tr'); if (lr1) lb1.style.setProperty('--h1', lr1.getBoundingClientRect().height + 'px'); if (lb1 && lst) { lb1.scrollTop = lst[0]; lb1.scrollLeft = lst[1]; }
    updSync(); markScrollers(); updPresence(); billWarmSoon(); if (S._pv !== S.view + '|' + S.pid + '|' + S.focus) { S._pv = S.view + '|' + S.pid + '|' + S.focus; pingSoon(); }
}
/* ---------- সেটিংস (গিয়ার আইকন): সাধারণ সেটিংস · এক্সপোর্ট · অ্যাক্টিভিটি লগ ---------- */
var STG = [['gen', 'General Settings', 'সাধারণ সেটিংস', 'sliders'], ['export', 'Export', 'এক্সপোর্ট', 'down'], ['log', 'Activity Log', 'অ্যাক্টিভিটি লগ', 'refresh']];
function gearMenu() {
  if (!S.gearOpen) return '';
  return '<div id="gearmenu" class="absolute right-0 top-full mt-1.5 w-52 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl p-1 z-50 text-slate-800 dark:text-slate-100">' + STG.map(function (t) { return '<button type="button" data-a="stg" data-v="' + t[0] + '" class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer hover:bg-pink-50 dark:hover:bg-slate-800 ' + (S.view === 'settings' && S.setTab === t[0] ? 'text-pink-600' : '') + '">' + ic(t[3], 'w-4 h-4') + L(t[1], t[2]) + '</button>'; }).join('') + '</div>';
}
function settingsView() {
  if (STG.every(function (t) { return t[0] !== S.setTab; })) S.setTab = 'gen';
  var tabs = '<div class="flex items-center gap-1 sm:gap-2 overflow-x-auto pb-1 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold mb-3">' + STG.map(function (t) { return '<button type="button" data-a="stg" data-v="' + t[0] + '" class="' + (S.setTab === t[0] ? TAB_ON : TAB_OFF) + '">' + ic(t[3], 'w-3.5 h-3.5') + '<span>' + L(t[1], t[2]) + '</span></button>'; }).join('') + '</div>';
  return tabs + (S.setTab === 'export' ? exportView() : S.setTab === 'log' ? logView() : genView());
}
/* ---------- অ্যাক্টিভিটি লগ — শুধু দেখা যাবে (এডিট / ডিলিট নেই) ---------- */
var FLD = { cperson: ['Contact person', 'কন্টাক্ট পারসন'], cphone: ['Mobile', 'মোবাইল'], date: ['Date', 'তারিখ'], pid: ['Project', 'প্রজেক্ট'], count: ['Labor qty', 'লেবার সংখ্যা'], rate: ['Rate', 'রেট'], amount: ['Amount', 'টাকা'], sub: ['Subcontractor', 'সাবকন্ট্রাক্টর'], work: ['Work', 'কাজ'], unit: ['Unit', 'ইউনিট'], qty: ['Quantity', 'পরিমাণ'], name: ['Name', 'নাম'], ta: ['TA', 'টিএ'], da: ['DA', 'ডিএ'], transport: ['Goods Transport', 'গুডস ট্রান্সপোর্ট'], other: ['Other', 'অন্যান্য'], commission: ['Commission', 'কমিশন'], eng: ['Engineer', 'ইঞ্জিনিয়ার'], kind: ['Kind', 'ধরন'], vat: ['VAT, TAX & AIT', 'ভ্যাট, ট্যাক্স ও এআইটি'], tax: ['Tax', 'ট্যাক্স'], ait: ['AIT', 'এআইটি'], note: ['Note', 'নোট'], client: ['Client', 'ক্লায়েন্ট'], location: ['Location', 'লোকেশন'], start: ['Start', 'শুরু'], end: ['End', 'শেষ'], status: ['Status', 'স্ট্যাটাস'], contract: ['Contract', 'কন্ট্রাক্ট'] };
function fval(k, v) {
  if (v === undefined || v === null || v === '') return '—';
  if (k === 'pid') { var pp = proj(v); return pp ? pp.name : v; }
  if (k === 'kind') return v === 'payment' ? L('Collection', 'কালেকশন') : L('Bill', 'বিল');
  if (typeof v === 'number') return fmt(v);
  return String(v);
}
function diffHtml(coll, b, a) {
  if (!b || !a || typeof b !== 'object' || typeof a !== 'object') return '';
  var keys = {}; Object.keys(b).concat(Object.keys(a)).forEach(function (k) { if (k !== 'id' && k !== 'createdAt') keys[k] = 1; });
  var rows = Object.keys(keys).filter(function (k) { return JSON.stringify(b[k] === undefined ? null : b[k]) !== JSON.stringify(a[k] === undefined ? null : a[k]) && !((b[k] === undefined || b[k] === '' || b[k] === 0) && (a[k] === undefined || a[k] === '' || a[k] === 0)); });
  var ib = recInfo(coll, b), ia = recInfo(coll, a);
  if (ib.amt !== ia.amt && rows.indexOf('amount') < 0) rows.push('_total');
  if (!rows.length) return '<div class="text-[10px] text-slate-400">' + L('Saved again without changes', 'কোনো পরিবর্তন ছাড়া আবার সেভ হয়েছে') + '</div>';
  return '<table class="pj-diff mt-1"><thead><tr><th>' + L('Field', 'ঘর') + '</th><th>' + L('Before (old)', 'আগে (পুরোনো)') + '</th><th></th><th>' + L('Now (new)', 'এখন (নতুন)') + '</th></tr></thead><tbody>' + rows.map(function (k) {
    var lb = k === '_total' ? [L('Total amount', 'মোট টাকা'), ''] : (FLD[k] || [k, k]), ov = k === '_total' ? fmt(ib.amt) : fval(k, b[k]), nv = k === '_total' ? fmt(ia.amt) : fval(k, a[k]);
    return '<tr><td class="font-semibold">' + esc(L(lb[0], lb[1] || lb[0])) + '</td><td class="pj-old">' + esc(ov) + '</td><td class="text-slate-400">→</td><td class="pj-new">' + esc(nv) + '</td></tr>';
  }).join('') + '</tbody></table>';
}
var ldate = function (s) { var d = new Date(s); return isNaN(d) ? '' : d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
function logView() {
  var c = S.logCache, f = S.lg;
  if (!c || c.pid !== '*') {
    S.logCache = { pid: '*', rows: null };
    srv('getLog', '', 2000).then(function (rows) { if (S.logCache && S.logCache.pid === '*') { S.logCache.rows = rows; if (S.view === 'settings' && S.setTab === 'log') render(); } }).catch(function (e) { S.logCache = { pid: '*', rows: [], err: e.message }; if (S.view === 'settings' && S.setTab === 'log') render(); });
    c = S.logCache;
  }
  var head = '<div class="bg-slate-900 text-white rounded-2xl px-5 py-3.5 shadow-md border border-slate-800 flex items-center justify-between gap-3 mb-3"><div class="flex items-center gap-2.5"><div class="w-9 h-9 rounded-xl bg-pink-600/20 text-pink-400 flex items-center justify-center shrink-0 border border-pink-500/30">' + ic('refresh', 'w-5 h-5') + '</div><div><h1 class="text-base sm:text-lg font-bold text-white leading-tight">' + L('Activity Log', 'অ্যাক্টিভিটি লগ') + '</h1><p class="text-[11px] text-slate-400">' + L('Every entry added, edited or deleted in all projects — view only, cannot be edited or deleted', 'সকল প্রজেক্টে কোন এন্ট্রি যোগ, এডিট বা ডিলিট হয়েছে — শুধু দেখা যাবে, এডিট বা ডিলিট করা যাবে না') + '</p></div></div><button type="button" data-a="logref" class="' + BTN_P + '">' + ic('refresh', 'w-3.5 h-3.5') + '<span>' + L('Refresh', 'রিফ্রেশ') + '</span></button></div>';
  if (!c.rows) return head + '<p class="text-xs text-slate-400 py-10 text-center">' + L('Loading log…', 'লগ লোড হচ্ছে…') + '</p>';
  if (c.err) return head + '<p class="text-xs text-rose-600">' + esc(c.err) + '</p>';
  var pname = function (id) { var pp = proj(id); return pp ? pp.name : ''; }, pids = {};
  D.projects.forEach(function (pp) { pids[pp.id] = 1; }); c.rows.forEach(function (r) { if (r.pid) pids[r.pid] = 1; });
  var popts = '<option value="all">' + L('All projects', 'সকল প্রজেক্ট') + '</option>' + Object.keys(pids).sort(function (a, b) { return (pname(a) || 'zzz' + a).localeCompare(pname(b) || 'zzz' + b); }).map(function (id) { var nm = pname(id); if (!nm) { var dr = c.rows.find(function (r) { return r.coll === 'projects' && r.id === id; }), o = dr ? safeParse(dr.json) : null; nm = (o && (o.name || (o.after && o.after.name))) || id; nm += ' (' + L('deleted', 'ডিলিট হয়েছে') + ')'; } return '<option value="' + esc(id) + '"' + (f.pid === id ? ' selected' : '') + '>' + esc(nm) + '</option>'; }).join('');
  var m = f.per === 'day' ? function (r) { return ldate(r.at) === f.day; } : f.per === 'month' ? function (r) { return ldate(r.at).indexOf(f.month) === 0; } : function () { return true; };
  var base = c.rows.filter(function (r) { return (f.pid === 'all' || r.pid === f.pid) && m(r); });
  var list = base.filter(function (r) { return f.act === 'all' || r.act === f.act; });
  var cnt = function (a) { return base.filter(function (r) { return a === 'all' || r.act === a; }).length; };
  var segB = function (a, cur, v, t) { return '<button type="button" data-a="' + a + '" data-v="' + v + '" class="px-2 py-0.5 rounded-md text-[11px] font-bold cursor-pointer ' + (cur === v ? 'bg-pink-600 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800') + '">' + t + '</button>'; };
  var SEG = 'flex items-center gap-0.5 p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700';
  var per = '<div class="' + SEG + '">' + segB('lgper', f.per, 'all', L('All time', 'সব সময়')) + segB('lgper', f.per, 'day', L('Date', 'তারিখ')) + segB('lgper', f.per, 'month', L('Month', 'মাস')) + '</div>' + (f.per === 'day' ? '<input type="date" data-lg="day" value="' + f.day + '" class="p-1 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-xs">' : f.per === 'month' ? '<input type="month" data-lg="month" value="' + f.month + '" class="p-1 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-xs">' : '');
  var acts = '<div class="' + SEG + '">' + [['all', 'All', 'সব'], ['add', 'Added', 'যোগ'], ['edit', 'Edited', 'এডিট'], ['delete', 'Deleted', 'ডিলিট']].map(function (x) { return segB('lgact', f.act, x[0], L(x[1], x[2]) + ' (' + cnt(x[0]) + ')'); }).join('') + '</div>';
  var tm = function (s) { var d = new Date(s); return isNaN(d) ? esc(s) : ldate(s) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()); };
  var rows = list.map(function (r, i) {
    var o = safeParse(r.json), a = ACTS[r.act] || [r.act, r.act, 'bg-slate-100 text-slate-700 border-slate-200'], info, extra = '';
    if (r.act === 'edit' && o && o.after) { info = recInfo(r.coll, o.after); extra = diffHtml(r.coll, o.before, o.after); }
    else info = recInfo(r.coll, o);
    var cat = info.k === 'proj' ? ['Project', 'প্রজেক্ট', 'bg-slate-100 text-slate-700 border-slate-200'] : CATS[info.k];
    var pn = pname(r.pid) || (r.pid ? (((r.coll === 'projects' && info.desc) || r.pid) + ' (' + L('deleted', 'ডিলিট হয়েছে') + ')') : '—');
    return '<tr class="' + (r.act === 'delete' ? 'bg-rose-50/60 dark:bg-rose-950/20' : r.act === 'edit' ? 'bg-amber-50/60 dark:bg-amber-950/10' : '') + '"><td class="' + TD + ' text-center align-top">' + (i + 1) + '</td><td class="' + TD + ' whitespace-nowrap font-mono text-[11px] align-top">' + tm(r.at) + '</td><td class="' + TD + ' text-center align-top"><span class="text-[10px] px-1.5 py-0.5 rounded-full font-bold border ' + a[2] + '">' + L(a[0], a[1]) + '</span></td><td class="' + TD + ' align-top font-semibold">' + esc(pn) + '</td><td class="' + TD + ' text-center align-top">' + (cat ? '<span class="text-[10px] px-1.5 py-0.5 rounded-full font-bold border ' + cat[2] + '">' + L(cat[0], cat[1]) + '</span>' : '') + '</td><td class="' + TD + ' whitespace-nowrap align-top">' + esc(info.d) + '</td><td class="' + TD + ' align-top">' + (r.act === 'edit' ? '<div class="text-[11px] text-slate-500">' + esc(info.desc) + '</div>' + extra : esc(info.desc)) + '</td><td class="' + TDN + ' font-bold align-top">' + (info.amt ? fmt(info.amt) : '') + '</td><td class="' + TD + ' text-center text-[11px] align-top">' + esc(r.by || '—') + '</td></tr>';
  }).join('') || '<tr><td colspan="9" class="' + TD + ' text-center text-slate-400 py-6">' + L('No activity for this filter', 'এই ফিল্টারে কোনো অ্যাক্টিভিটি নেই') + '</td></tr>';
  return head + '<div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3 shadow-xs"><div class="flex items-center flex-wrap gap-2 mb-3"><select data-lg="pid" class="' + INP + ' max-w-[16rem]">' + popts + '</select>' + per + '<div class="ml-auto">' + acts + '</div></div>' +
    '<div class="overflow-x-auto"><table class="w-full border-collapse text-xs print-table"><thead><tr class="bg-slate-800 text-white font-bold"><th class="' + TH + ' w-8">SL</th><th class="' + TH + ' text-left">' + L('When', 'কখন') + '</th><th class="' + TH + '">' + L('Action', 'কাজ') + '</th><th class="' + TH + ' text-left">' + L('Project', 'প্রজেক্ট') + '</th><th class="' + TH + '">' + L('Type', 'ধরন') + '</th><th class="' + TH + ' text-left">' + L('Entry date', 'এন্ট্রির তারিখ') + '</th><th class="' + TH + ' text-left">' + L('Details (edits: before → now)', 'বিবরণ (এডিট: আগে → এখন)') + '</th><th class="' + TH + ' text-right">' + L('Amount', 'টাকা') + '</th><th class="' + TH + '">' + L('By', 'কে') + '</th></tr></thead><tbody>' + rows + '</tbody></table></div><p class="text-[10px] text-slate-400 mt-2">🔒 ' + L('Read-only. The log is stored in the DB_Log sheet; deleted entries keep their full data there.', 'শুধু দেখার জন্য। লগ DB_Log শিটে থাকে; ডিলিট হওয়া এন্ট্রির পুরো ডাটাও সেখানে থেকে যায়।') + '</p></div>';
}
/* ---------- অনলাইন উপস্থিতি ---------- */
function devLabel() {
  var u = navigator.userAgent || '', os = /iPhone|iPad/.test(u) ? 'iPhone/iPad' : /Android/.test(u) ? 'Android' : /Mac OS X|Macintosh/.test(u) ? 'Mac' : /Windows/.test(u) ? 'Windows' : /Linux/.test(u) ? 'Linux' : 'Device';
  var br = /Edg\//.test(u) ? 'Edge' : /OPR\//.test(u) ? 'Opera' : /Firefox\//.test(u) ? 'Firefox' : /Chrome\//.test(u) ? 'Chrome' : /Safari\//.test(u) ? 'Safari' : '';
  return os + (br ? ' · ' + br : '');
}
var myName = function () { return ls('myname') || (S.role === 'admin' ? 'Admin' : 'User'); };
function editingPid() {
  var f = $('#mf'); if (f) { if (f.getAttribute('data-c') === 'projects') return f.getAttribute('data-id') || 'new'; var ps = f.querySelector('[name=pid]'); return ps ? ps.value : S.pid; }
  if (S.focus && S.view === 'project') return S.pid;
  return '';
}
function presInfo() { return { tok: S.tok || '', name: myName(), role: S.role, dev: devLabel(), view: S.view, pid: S.view === 'project' ? S.pid : '', edit: editingPid() }; }
var pinging = false, pingT = null;
function pingNow() {
  if (!S.role) return Promise.resolve(S.rev);
  if (pinging) return Promise.resolve(S.rev);
  pinging = true;
  return srv('ping', S.sid, JSON.stringify(presInfo())).then(function (r) { pinging = false; S.online = (r && r.online) || []; updPresence(); return r ? r.rev : S.rev; }, function (e) { pinging = false; throw e; });
}
function pingSoon() { clearTimeout(pingT); pingT = setTimeout(function () { if (S.role && !document.hidden) pingNow().catch(function () {}); }, 450); }
var others = function () { return (S.online || []).filter(function (o) { return o.sid !== S.sid; }); };
var whoName = function (o) { return (o.name || (o.role === 'admin' ? 'Admin' : 'User')) + (o.dev ? ' (' + o.dev + ')' : ''); };
function updPresence() {
  var el = $('#onl'), all = S.online || [], ot = others();
  if (el) el.innerHTML = all.length ? '<button type="button" data-a="onlist" title="' + L('Who is online', 'কে কে অনলাইনে') + '" class="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold bg-white/15 hover:bg-white/25 border border-white/25 cursor-pointer text-white">' + ic('users', 'w-3.5 h-3.5') + '<span>' + all.length + '</span><span class="hidden sm:inline font-semibold">' + L('online', 'অনলাইন') + '</span>' + (ot.some(function (o) { return o.edit; }) ? '<span class="w-1.5 h-1.5 rounded-full bg-amber-300 animate-pulse"></span>' : '<span class="w-1.5 h-1.5 rounded-full bg-emerald-300"></span>') + '</button>' : '';
  /* প্রজেক্ট পেজের ব্যানার */
  var cb = $('#coedit');
  if (cb) {
    var here = ot.filter(function (o) { return o.pid === S.pid || o.edit === S.pid; }), ed = here.filter(function (o) { return o.edit === S.pid; }), vw = here.filter(function (o) { return o.edit !== S.pid; });
    cb.innerHTML = (ed.length ? '<div class="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-amber-400 bg-amber-50 dark:bg-amber-950/30 text-[11px] font-semibold text-amber-800 dark:text-amber-300">' + ic('edit', 'w-3.5 h-3.5 shrink-0') + '<span>⚠ ' + esc(ed.map(whoName).join(', ')) + L(' is editing this project right now — coordinate before saving the same entry.', ' এখন এই প্রজেক্টে এডিট করছেন — একই এন্ট্রি সেভ করার আগে মিলিয়ে নিন।') + '</span></div>' : '') +
      (vw.length ? '<div class="flex items-center gap-2 px-3 py-1 mt-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-[11px] text-slate-600 dark:text-slate-300">' + ic('users', 'w-3.5 h-3.5 shrink-0') + '<span>' + esc(vw.map(whoName).join(', ')) + L(' also viewing this project', ' এই প্রজেক্ট দেখছেন') + '</span></div>' : '');
  }
  /* ফর্মের উপরে সতর্কতা */
  var f = $('#mf');
  if (f) {
    var ep = editingPid(), w = ot.filter(function (o) { return ep && o.edit === ep; }), box = $('#mfwarn');
    if (w.length) { if (!box) { box = document.createElement('div'); box.id = 'mfwarn'; box.className = 'col-span-2'; f.insertBefore(box, f.firstChild); } box.innerHTML = '<div class="px-3 py-1.5 rounded-xl border border-rose-300 bg-rose-50 dark:bg-rose-950/30 text-[11px] font-semibold text-rose-700 dark:text-rose-300">⚠ ' + esc(w.map(whoName).join(', ')) + L(' is entering / editing in this same project now.', ' এই একই প্রজেক্টে এখন এন্ট্রি / এডিট করছেন।') + '</div>'; }
    else if (box) box.remove();
  }
}
function onlineModal() {
  var VW = { dash: L('Dashboard', 'ড্যাশবোর্ড'), projects: L('Projects list', 'প্রজেক্ট তালিকা'), project: L('Project', 'প্রজেক্ট'), settings: L('Settings', 'সেটিংস'), admin: 'Admin', export: L('Export', 'এক্সপোর্ট') };
  var rows = (S.online || []).slice().sort(function (a, b) { return (b.sid === S.sid) - (a.sid === S.sid); }).map(function (o) {
    var pp = proj(o.edit) || proj(o.pid), me = o.sid === S.sid;
    return '<div class="flex items-center gap-2.5 py-2 border-b border-slate-100 dark:border-slate-800"><div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0 ' + (o.role === 'admin' ? 'bg-pink-600' : 'bg-sky-600') + '">' + esc((o.name || '?').charAt(0).toUpperCase()) + '</div><div class="min-w-0 flex-1"><div class="text-xs font-bold truncate">' + esc(o.name || '—') + (me ? ' <span class="text-[10px] font-semibold text-emerald-600">(' + L('you', 'আপনি') + ')</span>' : '') + ' <span class="text-[10px] px-1.5 py-px rounded-full border ' + (o.role === 'admin' ? 'border-pink-200 text-pink-700 bg-pink-50' : 'border-sky-200 text-sky-700 bg-sky-50') + '">' + (o.role === 'admin' ? 'Admin' : 'User') + '</span></div><div class="text-[11px] text-slate-500 truncate">' + esc(o.dev || '') + ' · ' + (o.edit ? '<b class="text-amber-600">✎ ' + L('editing ', 'এডিট করছেন: ') + esc(pp ? pp.name : (o.edit === 'new' ? L('a new project', 'নতুন প্রজেক্ট') : '')) + '</b>' : esc((VW[o.view] || o.view || '') + (o.pid && pp ? ': ' + pp.name : ''))) + '</div></div><span class="text-[10px] text-slate-400 shrink-0">' + (o.ago < 15 ? L('now', 'এখন') : o.ago + 's') + '</span></div>';
  }).join('') || '<p class="text-xs text-slate-400">' + L('Nobody else is online.', 'আর কেউ অনলাইনে নেই।') + '</p>';
  modal(mHead(L('Online now', 'এখন অনলাইনে') + ' (' + (S.online || []).length + ')') + rows + '<p class="text-[10px] text-slate-400 mt-2">' + L('Updates every ~10 seconds. Set your own name in Settings → General.', 'প্রায় ১০ সেকেন্ড পর পর আপডেট হয়। নিজের নাম দিন: সেটিংস → সাধারণ সেটিংস।') + '</p>');
}
/* ---------- বিল ও মেজারমেন্ট (Bill.html) — প্রজেক্টের ভেতরেই ফুল স্ক্রিনে খোলে ---------- */
var BILLX = { html: null, hash: '' };
function billHtml() {
  if (BILLX.html) return Promise.resolve(BILLX.html);
  var cached = null; try { cached = JSON.parse(localStorage.getItem('scs_pj_billhtml') || 'null'); } catch (e) {}
  var okHtml = function (h) { return !!h && h.length > 100000 && /<head/i.test(h) && /<\/html>\s*$/i.test(h); };
  if (cached && !okHtml(cached.html)) { cached = null; try { localStorage.removeItem('scs_pj_billhtml'); } catch (e) {} }
  return srv('getBillHtml', cached && cached.hash || '').then(function (r) {
    if (r.same && cached) BILLX.html = cached.html;
    else if (!okHtml(r.html)) throw new Error(L('The Bill page did not load completely — paste the full Index.html again and deploy a New version.', 'বিলের পেজ পুরোটা আসেনি — Index.html পুরোটা আবার পেস্ট করে New version ডিপ্লয় করুন।'));
    else { BILLX.html = r.html; try { localStorage.setItem('scs_pj_billhtml', JSON.stringify({ hash: r.hash, html: r.html })); } catch (e) { try { localStorage.removeItem('scs_pj_billhtml'); } catch (e2) {} } }
    BILLX.hash = r.hash; return BILLX.html;
  }).catch(function (e) { if (cached && cached.html) { BILLX.html = cached.html; return cached.html; } throw e; });
}
/* ---------- বিল ও মেজারমেন্ট — প্রজেক্টের ভেতরেই, ব্রাউজারের মতো ট্যাবে ---------- */
var BT = { tabs: [], act: null, seq: 0, timer: null };
function billBase(all) { var p = all ? {} : (proj(S.pid) || {}); return { tok: S.tok || '', role: S.role, company: coName(p), project: p.name || '', pid: p.id || '', lang: S.lang, dark: S.theme === 'dark' }; }
function billBar(p, kind) {
  var kb = function (k, lab, ttl) { return '<button type="button" data-a="billk" data-v="' + k + '" title="' + ttl + '" class="pj-bk ' + ((kind || '') === k ? 'on' : '') + '">' + lab + '</button>'; };
  return '<button type="button" data-a="billclose" title="' + L('Back', 'ফিরে যান') + '" class="pj-bback">' + ic('cl', 'w-3.5 h-3.5') + '<span class="pj-bpn">' + esc(p ? p.name : 'SCS Projects') + '</span></button>' +
    '<div id="billtabs" class="pj-btabs"></div>' +
    '<div class="pj-bright"><span id="bsave" class="pj-bpill" title="' + L('Saving status', 'সেভের অবস্থা') + '"></span><button type="button" data-a="onlist" id="bonl" class="pj-bk" title="' + L('Who is online', 'কে কে অনলাইনে') + '"></button>' +
    '<button type="button" data-a="bsync" title="' + L('Sync — show the latest from everyone', 'সিঙ্ক — সবার সর্বশেষ আপডেট দেখুন') + '" class="pj-bk">' + ic('sync', 'w-3.5 h-3.5') + '</button>' +
    '<button type="button" data-a="ball" title="' + L('All projects — all bills & measurements of every company', 'সব প্রজেক্ট — সব কোম্পানির সব বিল ও মেজারমেন্ট') + '" class="pj-bk">🗂<span class="pj-bkt"> ' + L('All projects', 'সব প্রজেক্ট') + '</span></button>' +
    '<div id="billkinds" class="flex items-center gap-1">' + kb('', L('All', 'সব'), L('All', 'সব')) + kb('bill', '📄<span class="pj-bkt"> ' + L('Bills', 'বিল') + '</span>', L('Bills', 'বিল')) + kb('meas', '📐<span class="pj-bkt"> ' + L('Meas.', 'মেজারমেন্ট') + '</span>', L('Measurements', 'মেজারমেন্ট')) + '</div><button type="button" data-a="billtab" title="' + L('Open in a separate browser tab', 'আলাদা ব্রাউজার ট্যাবে খুলুন') + '" class="pj-bk">⧉</button><button type="button" data-a="billclose" title="' + L('Close (Esc)', 'বন্ধ (Esc)') + '" class="p-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white cursor-pointer">' + ic('x', 'w-4 h-4') + '</button></div>';
}
function billWarmSoon() { if (S.view !== 'project' || !G || BILLX.wt) return; BILLX.wt = setTimeout(function () { BILLX.wt = 0; if (S.view === 'project') billWarm(); }, 600); }
function billOv() {
  var ov = $('#billov');
  if (!ov) { document.body.insertAdjacentHTML('beforeend', '<div id="billov" class="pj-billov" style="display:none"><div id="billbar" class="pj-billbar"></div><div id="billbody" class="pj-billbody"></div></div>'); ov = $('#billov'); }
  return ov;
}
/* প্রজেক্ট খুললেই বিল পেজ চুপচাপ (লুকানো) তৈরি থাকে — বাটনে চাপলে সঙ্গে সঙ্গে দেখা যায় */
function billWarm() {
  if (!G || !S.pid || !proj(S.pid)) return;
  if (document.querySelector('.pj-billfr[data-t="btm"]')) return;
  if (BILLX.warming) return; BILLX.warming = true;
  billOv();
  billHtml().then(function (html) { BILLX.warming = false; if (!document.querySelector('.pj-billfr[data-t="btm"]')) mkBillFrame('btm', { main: true, kind: '' }, html); })
    .catch(function () { BILLX.warming = false; });
}
function mkBillFrame(id, o, html) {
  var ctx = billBase(); Object.keys(o).forEach(function (k) { ctx[k] = o[k]; });
  var inj = '<style>#login{display:none!important}</style><script>window.SCS_CTX=' + JSON.stringify(ctx).replace(/</g, '\\u003c') + ';try{window.google=window.parent.google;}catch(e){}<\/script>';
  var fr = document.createElement('iframe'); fr.className = 'pj-billfr'; fr.setAttribute('data-t', id); fr.title = 'Bill';
  if (o.main) fr.id = 'billfr';
  fr.style.display = BT.act === id && S.billOpen ? 'block' : 'none';
  billOv(); $('#billbody').appendChild(fr); fr.srcdoc = html.replace(/<head>/i, '<head>' + inj);
  return fr;
}
function openBill(kind, all) {
  var p = !all && S.view === 'project' ? proj(S.pid) : null;
  if (!G) return toast(L('Bills & Measurements open in the deployed app (Google Apps Script).', 'বিল ও মেজারমেন্ট ডিপ্লয় করা অ্যাপে (Google Apps Script) খোলে।'), 'error');
  var ov = billOv();
  $('#billbar').innerHTML = billBar(p, kind);
  ov.style.display = 'flex'; document.documentElement.classList.add('pj-noscroll'); S.billOpen = true;
  clearInterval(BT.timer);
  BT = { tabs: [{ id: 'btm', main: true, docId: '', label: '📁 ' + L('List', 'তালিকা') }], act: 'btm', seq: BT.seq || 0, timer: setInterval(billTabLabels, 700) };
  var w = billWin('btm'), b = billBase(!p); BT.all = !p;
  if (w) { try { if (w.SCSB_goto) w.SCSB_goto({ company: b.company, project: b.project, pid: b.pid, kind: kind || '', openId: '', newKind: '', scopeAll: !p }); } catch (e) {} showBillTab('btm'); return; }
  showBillTab('btm');
  if (BILLX.warming) { var t0 = setInterval(function () { if (!BILLX.warming) { clearInterval(t0); if (billWin('btm')) { var w2 = billWin('btm'); try { w2.SCSB_goto && w2.SCSB_goto({ company: b.company, project: b.project, kind: kind || '' }); } catch (e) {} showBillTab('btm'); } else openBill(kind); } }, 50); return; }
  billHtml().then(function (html) { if (!billWin('btm')) mkBillFrame('btm', p ? { main: true, kind: kind || '' } : { main: true, kind: kind || '', company: '', project: '', pid: '' }, html); showBillTab(BT.act); })
    .catch(function (e) { toast(L('Could not open: ', 'খোলা যায়নি: ') + e.message, 'error'); closeBill(true); });
}
function addBillTab(o) {
  var id = 'bt' + (++BT.seq), tab = { id: id, main: false, docId: o.openId || '', label: '…' };
  BT.tabs.push(tab); showBillTab(id);
  billHtml().then(function (html) {
    if (!S.billOpen || !BT.tabs.some(function (x) { return x.id === id; })) return;
    mkBillFrame(id, o, html); showBillTab(BT.act);
  }).catch(function (e) { toast(L('Could not open: ', 'খোলা যায়নি: ') + e.message, 'error'); closeBillTab(id, true); });
}
window.SCSBillTab = function (o) {
  if (!S.billOpen) return; o = o || {};
  var have = o.openId && BT.tabs.filter(function (x) { return !x.main && x.docId === o.openId; })[0];
  if (have) { showBillTab(have.id); var w = billWin(have.id); if (o.mode === 'edit' && w && w.S && w.S.ro && w.editCurrent) { w.S.ro = false; w.S.dirty = false; try { w.resetHist(); w.renderTools(); w.refresh(); } catch (e) {} } return; }
  addBillTab(o);
};
function billWin(id) { var f = document.querySelector('.pj-billfr[data-t="' + id + '"]'); try { return f && f.contentWindow; } catch (e) { return null; } }
function showBillTab(id) {
  BT.act = id;
  [].forEach.call(document.querySelectorAll('.pj-billfr'), function (f) { f.style.display = f.getAttribute('data-t') === id ? 'block' : 'none'; });
  var main = BT.tabs[0] && BT.tabs[0].id === id, kd = $('#billkinds'); if (kd) kd.style.display = main ? 'flex' : 'none';
  paintBillTabs();
}
function paintBillTabs() {
  var box = $('#billtabs'); if (!box) return;
  box.innerHTML = BT.tabs.map(function (tb) { return '<div class="pj-btab' + (tb.id === BT.act ? ' on' : '') + (tb.dirty ? ' dirty' : '') + '"><button type="button" data-a="btshow" data-v="' + tb.id + '" class="pj-btlab" title="' + esc(tb.label) + '">' + esc(tb.label) + '</button>' + (tb.main ? '' : '<button type="button" data-a="btx" data-v="' + tb.id + '" class="pj-btx" title="' + L('Close tab', 'ট্যাব বন্ধ') + '">×</button>') + '</div>'; }).join('');
}
function billStatus() {
  var sv = $('#bsave'), on = $('#bonl'); if (!sv) return;
  var w = billWin(BT.act), st = null; try { st = w && w.SCSB_state && w.SCSB_state(); } catch (e) {}
  var h = '', cls = 'pj-bpill';
  if (st && st.doc && st.view === 'Builder' && !st.ro) {
    if (st.saving) { h = ic('sync', 'w-3 h-3 animate-spin') + '<span>' + L('Saving…', 'সেভ হচ্ছে…') + '</span>'; cls += ' sv'; }
    else if (st.err) { h = '⚠ <span>' + L('Not saved', 'সেভ হয়নি') + '</span>'; cls += ' er'; }
    else if (st.dirty) { h = '● <span>' + L('Changes…', 'পরিবর্তন…') + '</span>'; cls += ' dt'; }
    else { var t = st.at ? new Date(st.at) : null; h = '✓ <span>' + L('Saved', 'সেভ হয়েছে') + (t ? ' ' + pad(t.getHours()) + ':' + pad(t.getMinutes()) : '') + '</span>'; cls += ' ok'; }
    if (st.others) h += '<b class="pj-bwarn" title="' + L('Someone else is editing this one too', 'আরেকজনও এটি এডিট করছে') + '">✎' + st.others + '</b>';
  } else if (st && st.doc && st.ro) h = '👁 <span>' + L('View only', 'শুধু দেখা') + '</span>';
  if (sv.innerHTML !== h) sv.innerHTML = h; sv.className = cls; sv.style.display = h ? '' : 'none';
  var n = (S.online || []).length || 1, oh = ic('users', 'w-3.5 h-3.5') + '<span>' + n + '</span>';
  if (on.innerHTML !== oh) on.innerHTML = oh;
}
function billTabLabels() {
  if (!S.billOpen) { clearInterval(BT.timer); return; }
  billStatus();
  var ch = false;
  BT.tabs.forEach(function (tb) {
    var w = billWin(tb.id), lab = tb.label, dirty = false;
    try {
      if (w && w.S) {
        var d = w.S.doc, kd = d && d.kind === 'meas' ? '📐 ' : '📄 ';
        if (d && w.S.view === 'Builder') { lab = (w.S.ro ? '👁 ' : '✎ ') + kd + (d.no || L('New', 'নতুন')); dirty = !!w.S.dirty && !w.S.ro; if (!tb.main) tb.docId = d.id; }
        else lab = tb.main ? '📁 ' + L('List', 'তালিকা') : '📁 ' + L('List', 'তালিকা');
      }
    } catch (e) {}
    if (lab !== tb.label || dirty !== !!tb.dirty) { tb.label = lab; tb.dirty = dirty; ch = true; }
  });
  if (ch) paintBillTabs();
}
function closeBillTab(id, force) {
  var tb = BT.tabs.filter(function (x) { return x.id === id; })[0]; if (!tb) return;
  var w = billWin(id);
  if (!force && w && w.S && w.S.dirty && !w.S.ro) { ask(L('This tab has unsaved changes. Close it anyway?', 'এই ট্যাবে সেভ না করা পরিবর্তন আছে। তবুও বন্ধ করবেন?'), L('Close', 'বন্ধ করুন'), function () { closeBillTab(id, true); }, true); return; }
  if (tb.main) return closeBill(force);
  var f = document.querySelector('.pj-billfr[data-t="' + id + '"]'); if (f) f.remove();
  var i = BT.tabs.indexOf(tb); BT.tabs.splice(i, 1);
  showBillTab((BT.tabs[Math.max(0, i - 1)] || BT.tabs[0]).id);
}
function closeBill(force) {
  if (!force && S.billOpen) {
    var dirty = BT.tabs.filter(function (tb) { var w = billWin(tb.id); try { return w && w.S && w.S.dirty && !w.S.ro; } catch (e) { return false; } });
    if (dirty.length) { showBillTab(dirty[0].id); ask(L('Some tabs have unsaved changes. Close all anyway?', 'কিছু ট্যাবে সেভ না করা পরিবর্তন আছে। তবুও সব বন্ধ করবেন?'), L('Close all', 'সব বন্ধ'), function () { closeBill(true); }, true); return; }
  }
  clearInterval(BT.timer); BT = { tabs: [], act: null, seq: BT.seq || 0, timer: null };
  [].forEach.call(document.querySelectorAll('.pj-billfr'), function (f) { if (f.getAttribute('data-t') !== 'btm') f.remove(); else f.style.display = 'none'; });
  var mw = billWin('btm'); try { if (mw && mw.S && mw.S.view === 'Builder') { mw.S.dirty = false; mw.showView('Companies'); } } catch (e) {}
  var ov = $('#billov'); if (ov) ov.style.display = 'none';
  document.documentElement.classList.remove('pj-noscroll'); S.billOpen = false;
}
function billNewTab() { srv('billApi', 'getAppUrl', []).then(function (u) { if (!u) throw new Error('No app link'); window.open(u + (u.indexOf('?') >= 0 ? '&' : '?') + 'page=bill', '_blank'); }).catch(function (e) { toast(e.message, 'error'); }); }
/* ---------- Admin → বিল ও মেজারমেন্ট: প্যাড, সিল, লোগো, সিগনেচার, মার্জিন, নম্বর — নিজে হাতে ---------- */
function bcLoad() {
  if (S.bc) return;
  S.bc = { loading: true };
  srv('billApi', 'getBootstrap', []).then(function (b) { S.bc = JSON.parse(JSON.stringify(b.config)); S.bcNext = b.nextNo; if (S.view === 'admin' && S.atab === 'billset') render(); })
    .catch(function (e) { S.bc = { err: e.message }; if (S.view === 'admin' && S.atab === 'billset') render(); });
}
function bcRead() {
  var c = S.bc; if (!c || c.loading || c.err) return;
  var v = function (el, k) { var x = el.querySelector('[data-k=' + k + ']'); return x ? x.value.trim() : ''; };
  c.pads = [].map.call(document.querySelectorAll('.bc-pad'), function (r) { return { name: v(r, 'name') || 'Pad', src: v(r, 'src'), size: v(r, 'size') || 'auto' }; });
  var old = c.seals || [];
  c.seals = [].map.call(document.querySelectorAll('.bc-seal'), function (r, i) { var o = old[i] || {}; return { name: v(r, 'name') || 'Seal', url: v(r, 'url'), w: n(v(r, 'w')) || 110, x: o.x == null ? 560 : o.x, y: o.y == null ? -20 : o.y, op: n(v(r, 'op')) || (o.op == null ? 0.9 : o.op) }; });
  var sg = c.signatories || (c.signatories = { count: 2, list: [] });
  [].forEach.call(document.querySelectorAll('.bc-sig'), function (r, i) { var g = sg.list[i] || (sg.list[i] = {}); g.title = v(r, 'title'); g.name = v(r, 'name'); g.designation = v(r, 'des'); g.org = v(r, 'org'); g.img = v(r, 'img'); });
  var q = function (id) { var e = $('#' + id); return e ? e.value.trim() : ''; };
  if ($('#bc-sigc')) sg.count = n(q('bc-sigc')) || 2;
  if ($('#bc-logo')) c.logo = q('bc-logo');
  if ($('#bc-page')) c.defPage = q('bc-page');
  c.margins = { top: n(q('bc-mt')) || 1.45, bottom: n(q('bc-mb')) || 0.8, side: n(q('bc-ms')) || 0.55 };
  if ($('#bc-gap')) c.sigGap = n(q('bc-gap'));
  c.numbering = c.numbering || {}; if ($('#bc-pre')) c.numbering.prefix = q('bc-pre') || 'SCSB'; if ($('#bc-mpre')) c.numbering.mprefix = q('bc-mpre') || 'SCSM'; if ($('#bc-start')) c.numbering.startSeq = n(q('bc-start')) || 1;
  if ($('#bc-cur')) c.currency = q('bc-cur') || 'Taka';
}
function billSetTab() {
  bcLoad();
  var c = S.bc, I = 'w-full p-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-xs';
  if (c.loading) return '<div class="' + CARD + ' text-xs text-slate-400">' + L('Loading bill settings…', 'বিলের সেটিংস লোড হচ্ছে…') + '</div>';
  if (c.err) return '<div class="' + CARD + ' text-xs text-rose-600">' + esc(c.err) + L(' — make sure BillCode.gs is added and deployed.', ' — BillCode.gs যোগ করে ডিপ্লয় হয়েছে কিনা দেখুন।') + '</div>';
  var sec = function (t, sub, body) { return '<div class="' + CARD + '"><div class="text-xs font-bold mb-0.5">' + t + '</div>' + (sub ? '<p class="text-[11px] text-slate-500 mb-2">' + sub + '</p>' : '') + body + '</div>'; };
  var rm = function (a, i) { return '<button type="button" data-a="' + a + '" data-v="' + i + '" title="' + L('Remove', 'মুছুন') + '" class="p-1 rounded-lg hover:bg-rose-100 text-rose-600 cursor-pointer">' + ic('x', 'w-3.5 h-3.5') + '</button>'; };
  var sizeSel = function (v) { return '<select data-k="size" class="' + I + '">' + [['a4', 'A4'], ['letter', 'Letter'], ['legal', 'Legal'], ['auto', L('Auto', 'অটো')]].map(function (o) { return '<option value="' + o[0] + '"' + (v === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>'; };
  var pads = (c.pads || []).map(function (p, i) { return '<div class="bc-pad grid grid-cols-12 gap-1.5 items-center mb-1.5"><input data-k="name" value="' + esc(p.name) + '" placeholder="' + L('Name, e.g. SCS Pad A4', 'নাম, যেমন SCS Pad A4') + '" class="col-span-3 ' + I + '"><input data-k="src" value="' + esc(p.src) + '" placeholder="https://drive.google.com/file/d/…/view" class="col-span-6 ' + I + ' font-mono"><div class="col-span-2">' + sizeSel(p.size) + '</div><div class="col-span-1 flex justify-end">' + rm('bcpadx', i) + '</div></div>'; }).join('');
  var sealHead = '<div class="grid grid-cols-12 gap-1.5 mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-500"><span class="col-span-3">' + L('Name', 'নাম') + '</span><span class="col-span-5">' + L('Image link', 'ছবির লিংক') + '</span><span class="col-span-2">' + L('Default size (px)', 'ডিফল্ট সাইজ (px)') + '</span><span class="col-span-1">' + L('Opacity', 'স্বচ্ছতা') + '</span></div>';
  var seals = (c.seals || []).map(function (p, i) { return '<div class="bc-seal grid grid-cols-12 gap-1.5 items-center mb-1.5"><input data-k="name" value="' + esc(p.name) + '" placeholder="' + L('Name', 'নাম') + '" class="col-span-3 ' + I + '"><input data-k="url" value="' + esc(p.url) + '" placeholder="https://drive.google.com/file/d/…/view" class="col-span-5 ' + I + ' font-mono"><input data-k="w" type="number" value="' + esc(p.w) + '" title="' + L('Width (px)', 'প্রস্থ (px)') + '" class="col-span-2 ' + I + '"><input data-k="op" type="number" step="0.05" min="0.1" max="1" value="' + esc(p.op == null ? 0.9 : p.op) + '" title="' + L('Opacity 0.1–1', 'স্বচ্ছতা ০.১–১') + '" class="col-span-1 ' + I + '"><div class="col-span-1 flex justify-end">' + rm('bcsealx', i) + '</div></div>'; }).join('');
  var sg = c.signatories || { count: 2, list: [] }, sigs = '';
  for (var i = 0; i < 4; i++) { var g = sg.list[i] || {}; sigs += '<div class="bc-sig rounded-xl border border-slate-200 dark:border-slate-700 p-2 mb-2' + (i >= sg.count ? ' opacity-40' : '') + '"><div class="text-[11px] font-black text-slate-500 mb-1">' + (i + 1) + (i >= sg.count ? ' — ' + L('not printed (increase “How many”)', 'প্রিন্ট হবে না (“কয়টি” বাড়ান)') : '') + '</div><div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5"><input data-k="title" value="' + esc(g.title || '') + '" placeholder="' + L('Heading, e.g. Prepared By / RECEIVED BY', 'শিরোনাম, যেমন Prepared By / RECEIVED BY') + '" class="' + I + '"><input data-k="name" value="' + esc(g.name || '') + '" placeholder="' + L('Person name (empty = sign by hand)', 'নাম (খালি = হাতে সই)') + '" class="' + I + '"><input data-k="des" value="' + esc(g.designation || '') + '" placeholder="' + L('Designation', 'পদবী') + '" class="' + I + '"><input data-k="org" value="' + esc(g.org || '') + '" placeholder="' + L('Company under the signatory', 'স্বাক্ষরকারীর নিচে কোম্পানি') + '" class="' + I + '"><input data-k="img" value="' + esc(g.img || '') + '" placeholder="' + L('Signature image link (Google Drive / URL) — optional', 'সইয়ের ছবির লিংক (গুগল ড্রাইভ / URL) — ঐচ্ছিক') + '" class="sm:col-span-2 ' + I + ' font-mono"></div></div>'; }
  var m = c.margins || {}, nb = c.numbering || {};
  return '<div class="rounded-xl border border-sky-200 bg-sky-50 dark:bg-sky-950/20 dark:border-sky-900 px-3 py-2 mb-3 text-[11px] text-sky-800 dark:text-sky-300">ℹ ' + L('These settings are used by every Bill and Measurement (the same settings also appear inside Bill → Admin). Google Drive links must be shared as “Anyone with the link” or belong to this account.', 'এই সেটিংস সব বিল ও মেজারমেন্টে ব্যবহার হয় (বিল → Admin-এও একই সেটিংস দেখা যায়)। গুগল ড্রাইভের লিংক “Anyone with the link” শেয়ার করা থাকতে হবে, অথবা এই অ্যাকাউন্টের হতে হবে।') + '</div>' +
    sec('1. ' + L('Letterhead pads (background)', 'লেটারহেড প্যাড (ব্যাকগ্রাউন্ড)'), L('Add your pad images — A4 and Letter, as many as you need (up to 6). The first one is the default; switch pads anytime inside a bill. The page size follows the pad.', 'আপনার প্যাডের ছবি দিন — A4 ও Letter, যতগুলো লাগে (৬টি পর্যন্ত)। প্রথমটি ডিফল্ট; বিলের ভেতরে যেকোনো সময় প্যাড বদলানো যায়। পেজের মাপ প্যাড অনুযায়ী হয়।'),
      (pads || '<p class="text-[11px] text-slate-400 mb-2">' + L('No pad yet.', 'এখনও কোনো প্যাড নেই।') + '</p>') + '<div class="flex flex-wrap items-center gap-2 mt-1"><button type="button" data-a="bcpad" class="' + SBTN + ' ' + SBTN_O + '">' + ic('plus', 'w-3 h-3') + L('Add pad', 'প্যাড যোগ') + '</button><label class="text-[11px] text-slate-500 ml-auto">' + L('Page size without a pad', 'প্যাড ছাড়া পেজের মাপ') + '</label><select id="bc-page" class="' + I + ' max-w-[8rem]">' + [['a4', 'A4'], ['letter', 'Letter'], ['legal', 'Legal']].map(function (o) { return '<option value="' + o[0] + '"' + (c.defPage === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></div>') +
    sec('2. ' + L('Seals & stamps', 'সিল ও স্ট্যাম্প'), L('Seal images (PNG with transparent background works best). Place them on a bill from the Seal tool.', 'সিলের ছবি (স্বচ্ছ ব্যাকগ্রাউন্ডের PNG সবচেয়ে ভালো)। বিলে Seal টুল দিয়ে বসান।'),
      (seals ? sealHead + seals : '<p class="text-[11px] text-slate-400 mb-2">' + L('No seal yet.', 'এখনও কোনো সিল নেই।') + '</p>') + '<button type="button" data-a="bcseal" class="' + SBTN + ' ' + SBTN_O + ' mt-1">' + ic('plus', 'w-3 h-3') + L('Add seal', 'সিল যোগ') + '</button>') +
    sec('3. ' + L('Signatures (footer)', 'সিগনেচার (নিচে)'), L('Heading, name, designation, company and signature image — like SCS Quotation. Leave the name and image empty to sign by hand.', 'শিরোনাম, নাম, পদবী, কোম্পানি ও সইয়ের ছবি — SCS Quotation-এর মতো। হাতে সই করতে নাম ও ছবি খালি রাখুন।'),
      '<div class="flex items-center gap-2 mb-2"><label class="text-[11px] font-semibold text-slate-500">' + L('How many', 'কয়টি') + '</label><select id="bc-sigc" data-a="bcsigc" class="' + I + ' max-w-[5rem]">' + [1, 2, 3, 4].map(function (k) { return '<option' + (sg.count === k ? ' selected' : '') + '>' + k + '</option>'; }).join('') + '</select><label class="text-[11px] font-semibold text-slate-500 ml-3">' + L('Space for signing (px)', 'সইয়ের জায়গা (px)') + '</label><input id="bc-gap" type="number" value="' + esc(c.sigGap == null ? 36 : c.sigGap) + '" class="' + I + ' max-w-[5rem]"></div>' + sigs) +
    sec('4. ' + L('Logo, margins & numbers', 'লোগো, মার্জিন ও নম্বর'), '',
      '<div class="grid grid-cols-2 sm:grid-cols-4 gap-2"><div class="col-span-2"><label class="' + LBL + '">' + L('Logo image link', 'লোগোর ছবির লিংক') + '</label><input id="bc-logo" value="' + esc(c.logo || '') + '" placeholder="https://drive.google.com/file/d/…" class="' + I + ' font-mono"></div><div><label class="' + LBL + '">' + L('Currency word (In-Words)', 'কথায় মুদ্রার নাম') + '</label><input id="bc-cur" value="' + esc(c.currency || 'Taka') + '" class="' + I + '"></div><div></div>' +
      '<div><label class="' + LBL + '">' + L('Top margin (inch)', 'উপরের মার্জিন (ইঞ্চি)') + '</label><input id="bc-mt" type="number" step="0.05" value="' + esc(m.top) + '" class="' + I + '"></div><div><label class="' + LBL + '">' + L('Bottom margin (inch)', 'নিচের মার্জিন (ইঞ্চি)') + '</label><input id="bc-mb" type="number" step="0.05" value="' + esc(m.bottom) + '" class="' + I + '"></div><div><label class="' + LBL + '">' + L('Side margin (inch)', 'পাশের মার্জিন (ইঞ্চি)') + '</label><input id="bc-ms" type="number" step="0.05" value="' + esc(m.side) + '" class="' + I + '"></div><div></div>' +
      '<div><label class="' + LBL + '">' + L('Bill number prefix', 'বিল নম্বরের শুরু') + '</label><input id="bc-pre" value="' + esc(nb.prefix || 'SCSB') + '" class="' + I + ' font-mono"></div><div><label class="' + LBL + '">' + L('Measurement number prefix', 'মেজারমেন্ট নম্বরের শুরু') + '</label><input id="bc-mpre" value="' + esc(nb.mprefix || 'SCSM') + '" class="' + I + ' font-mono"></div><div><label class="' + LBL + '">' + L('Serial starts from', 'সিরিয়াল শুরু') + '</label><input id="bc-start" type="number" min="1" value="' + esc(nb.startSeq || 1) + '" class="' + I + '"></div><div class="col-span-2 sm:col-span-4 text-[11px] text-slate-500">' + L('Bills and measurements share one continuous serial. Next: ', 'বিল ও মেজারমেন্ট একই ধারাবাহিক সিরিয়ালে চলে। পরের: ') + '<b class="font-mono text-slate-800 dark:text-slate-200">' + esc(S.bcNext || '') + '</b> · <b class="font-mono text-slate-800 dark:text-slate-200">' + esc(String(S.bcNext || '').replace(nb.prefix || 'SCSB', nb.mprefix || 'SCSM')) + '</b></div></div>') +
    '<div class="' + CARD + ' flex flex-wrap items-center gap-2"><input id="bc-pin" type="password" inputmode="numeric" maxlength="8" autocomplete="off" placeholder="' + L('Admin PIN', 'অ্যাডমিন পিন') + '" class="' + I + ' font-mono max-w-[9rem]"><button type="button" data-a="bcsave" class="' + BTN_P + '">' + ic('check', 'w-3.5 h-3.5') + L('Save bill settings', 'বিলের সেটিংস সেভ') + '</button><button type="button" data-a="bcreload" class="' + BTN_S + '">' + ic('refresh', 'w-3.5 h-3.5') + L('Reload', 'আবার লোড') + '</button></div>' +
    '<div class="' + CARD + '"><div class="text-xs font-bold mb-1">⇩ ' + L('Or copy everything from SCS Quotation', 'অথবা SCS Quotation থেকে সব কপি করুন') + '</div><p class="text-[11px] text-slate-500 mb-2">' + L('Paste the link of the SCS Quotation database Google Sheet: its pads, seals, logo, margins and saved templates are copied here.', 'SCS Quotation-এর ডাটাবেজ গুগল শিটের লিংক দিন: প্যাড, সিল, লোগো, মার্জিন ও সেভ করা টেমপ্লেট এখানে কপি হবে।') + '</p><div class="grid grid-cols-1 sm:grid-cols-4 gap-2"><input id="qimp-link" placeholder="https://docs.google.com/spreadsheets/d/…" class="' + INP + ' font-mono sm:col-span-2"><input id="qimp-pin" type="password" inputmode="numeric" maxlength="8" autocomplete="off" placeholder="' + L('Admin PIN', 'অ্যাডমিন পিন') + '" class="' + INP + ' font-mono"><button type="button" data-a="qimp" class="' + BTN_P + ' justify-center">' + L('Copy settings', 'সেটিংস কপি') + '</button></div></div>';
}
/* ---------- Forms ---------- */
/* ---------- বাংলাদেশি মোবাইল নম্বর ---------- */
function bdPhone(v) {
  var d = String(v || '').replace(/[০-৯]/g, function (c) { return String('০১২৩৪৫৬৭৮৯'.indexOf(c)); }).replace(/\D/g, '');
  if (d.indexOf('880') === 0) d = d.slice(2); else if (d.indexOf('88') === 0 && d.length === 13) d = d.slice(2);
  if (d.length === 10 && d[0] === '1') d = '0' + d;
  return /^01[3-9]\d{8}$/.test(d) ? d : '';
}
function bdFmt(v) { var d = bdPhone(v); return d ? d.slice(0, 5) + '-' + d.slice(5) : String(v || ''); }
/* ---------- টাকা কথায় (ইংরেজি, লাখ/কোটি) ---------- */
function wordsBD(num) {
  var n = Math.round(Math.abs(n2(num))), A = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'], T = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  function n2(x) { return Number(x) || 0; }
  function two(x) { return x < 20 ? A[x] : T[Math.floor(x / 10)] + (x % 10 ? ' ' + A[x % 10] : ''); }
  function three(x) { return x >= 100 ? A[Math.floor(x / 100)] + ' Hundred' + (x % 100 ? ' ' + two(x % 100) : '') : two(x); }
  function w(x) {
    if (x >= 10000000) return w(Math.floor(x / 10000000)) + ' Crore' + (x % 10000000 ? ' ' + w(x % 10000000) : '');
    var o = [], lk = Math.floor(x / 100000), th = Math.floor(x % 100000 / 1000), r = x % 1000;
    if (lk) o.push(two(lk) + ' Lakh'); if (th) o.push(two(th) + ' Thousand'); if (r) o.push(three(r));
    return o.join(' ');
  }
  return (n ? w(n) : 'Zero') + ' Taka Only';
}
/* ---------- প্রজেক্ট ডিউ: কোন তারিখ পর্যন্ত কত বাকি, কবে থেকে বাকি ---------- */
function dueOf(pid, asof) {
  var ok = function (b) { return b.pid === pid && (!asof || (b.date || '') <= asof); };
  var ch = D.bills.filter(function (b) { return ok(b) && b.kind !== 'payment'; }).sort(function (a, b) { return (a.date || '') < (b.date || '') ? -1 : 1; });
  var paid = 0; D.bills.forEach(function (b) { if (ok(b) && b.kind === 'payment') paid += n(b.amount); });
  var tot = 0, rem = paid, from = '', lastPay = '';
  ch.forEach(function (b) { var net = n(b.amount) - n(b.vat) - n(b.tax) - n(b.ait); tot += net; if (from) return; if (rem >= net - 0.5) rem -= net; else from = b.date; });
  D.bills.forEach(function (b) { if (ok(b) && b.kind === 'payment' && (b.date || '') > lastPay) lastPay = b.date; });
  return { due: tot - paid, from: from, lastPay: lastPay };
}
function dueAsOf() { var m = S.dueMode || 'now'; return m === 'date' ? (S.dueDate || todayStr()) : m === 'month' ? (function () { var x = (S.dueMonth || todayStr().slice(0, 7)).split('-'), y = +x[0], mo = +x[1]; return x[0] + '-' + x[1] + '-' + pad(new Date(y, mo, 0).getDate()); })() : ''; }
function dueList(asof) {
  return D.projects.map(function (p) { var a = dueOf(p.id, asof), now = asof ? dueOf(p.id, '') : a; return { p: p, due: a.due, from: a.from, now: now.due, lastPay: now.lastPay }; })
    .filter(function (x) { return x.due > 0.5 || (asof && x.now > 0.5); })
    .sort(dueSorter());
}
function dueSorter() {
  var k = S.dueSort || 'az', nm = function (x) { return String(x.p.name || '').toLowerCase(); };
  return function (a, b) {
    if (k === 'za') return nm(b).localeCompare(nm(a));
    if (k === 'lo') return a.due - b.due || nm(a).localeCompare(nm(b));
    if (k === 'hi') return b.due - a.due || nm(a).localeCompare(nm(b));
    return nm(a).localeCompare(nm(b));
  };
}
function daysSince(d, to) { if (!d) return 0; var a = new Date(d + 'T00:00:00'), b = to ? new Date(to + 'T00:00:00') : new Date(); return Math.max(0, Math.floor((b - a) / 864e5)); }
function dueView() {
  var asof = dueAsOf(), past = !!asof && asof < todayStr(), q = (S.dueQ || '').toLowerCase();
  var all = dueList(asof), L0 = all.filter(function (x) { return !q || [x.p.name, x.p.client, x.p.cperson, x.p.cphone].join(' ').toLowerCase().indexOf(q) >= 0; });
  var T = { due: 0, now: 0 }, cos = {}; L0.forEach(function (x) { T.due += x.due; T.now += x.now; cos[coName(x.p) || x.p.name] = 1; });
  var C = TD + ' text-center align-middle', CL = TD + ' text-left align-middle';
  var rows = L0.map(function (x, i) {
    var p = x.p, ph = p.cphone ? bdFmt(p.cphone) : '', dd = daysSince(x.from, asof || '');
    return '<tr class="hover:bg-pink-50/60 dark:hover:bg-slate-800/60"><td class="' + C + '">' + (i + 1) + '</td>' +
      '<td class="' + CL + '"><button type="button" data-a="openp" data-id="' + p.id + '" class="text-left font-bold hover:text-pink-600 cursor-pointer">' + esc(p.name) + '</button>' + (p.client && p.client.toUpperCase() !== String(p.name).toUpperCase() ? '<div class="text-[10px] text-slate-500">' + esc(p.client) + '</div>' : '') + '</td>' +
      '<td class="' + C + '">' + (p.cperson ? esc(p.cperson) : '<button type="button" data-a="editp" data-id="' + p.id + '" class="no-print text-[10px] text-slate-400 hover:text-pink-600 cursor-pointer">+ ' + L('add', 'যোগ করুন') + '</button>') + '</td>' +
      '<td class="' + C + ' font-mono whitespace-nowrap">' + (ph ? '<a href="tel:' + bdPhone(p.cphone) + '" class="text-blue-700 dark:text-blue-400 hover:underline">' + esc(ph) + '</a>' : '—') + '</td>' +
      '<td class="' + C + ' whitespace-nowrap">' + (x.from ? '<div class="font-semibold">' + esc(x.from) + '</div><div class="text-[10px] ' + (dd > 90 ? 'text-rose-600 font-bold' : dd > 30 ? 'text-amber-600 font-semibold' : 'text-slate-500') + '">' + dd + L(' days', ' দিন') + '</div>' : '—') + '</td>' +
      '<td class="' + C + ' font-mono font-black text-orange-700 dark:text-orange-400 whitespace-nowrap">' + fmt(x.due) + '</td>' +
      (past ? '<td class="' + C + ' font-mono font-black whitespace-nowrap ' + (x.now > x.due ? 'text-rose-600' : 'text-emerald-700 dark:text-emerald-400') + '">' + fmt(x.now) + '</td>' : '') + '</tr>';
  }).join('') || '<tr><td colspan="' + (past ? 7 : 6) + '" class="' + C + ' py-6 text-slate-400">' + L('No due 🎉', 'কোনো ডিউ নেই 🎉') + '</td></tr>';
  var head = '<tr class="bg-slate-800 text-white font-bold">' + ['SL', L('Project / Company', 'প্রজেক্ট / কোম্পানি'), L('Contact Person', 'কন্টাক্ট পারসন'), L('Mobile', 'মোবাইল'), L('Due From', 'কবে থেকে ডিউ'), asof ? L('Due on ', 'ডিউ — ') + asof : L('Due Amount', 'ডিউ টাকা')].concat(past ? [L('Due Now', 'এখন ডিউ')] : []).map(function (h, i) { return '<th class="' + TH + (i === 1 ? ' text-left' : ' text-center') + '">' + h + '</th>'; }).join('') + '</tr>';
  var foot = '<tr class="bg-slate-100 dark:bg-slate-800 font-black border-t-2 border-slate-800"><td colspan="5" class="' + TD + ' text-center uppercase">' + L('Total Due', 'মোট ডিউ') + '</td><td class="' + C + ' font-mono text-orange-700 dark:text-orange-400">' + fmt(T.due) + '</td>' + (past ? '<td class="' + C + ' font-mono">' + fmt(T.now) + '</td>' : '') + '</tr>' +
    '';
  var words = '<div class="mt-2 px-3 py-2 rounded-lg border-2 border-slate-800 dark:border-slate-600 text-xs leading-relaxed"><b>' + L('In Words: ', 'কথায়: ') + '</b><span class="italic font-semibold">' + wordsBD(T.due) + '</span>' + (past ? '<div class="text-slate-500 mt-0.5"><b>' + L('Due now in words: ', 'এখনকার ডিউ কথায়: ') + '</b>' + wordsBD(T.now) + '</div>' : '') + '</div>';
  var mb = function (k, lab) { return '<button type="button" data-a="duem" data-v="' + k + '" class="px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ' + ((S.dueMode || 'now') === k ? 'bg-pink-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700') + '">' + lab + '</button>'; };
  var pick = (S.dueMode === 'date' ? '<input type="date" data-f="dued" value="' + esc(S.dueDate || todayStr()) + '" class="' + INP + ' !w-auto !py-1 text-xs">' : S.dueMode === 'month' ? '<input type="month" data-f="duemo" value="' + esc(S.dueMonth || todayStr().slice(0, 7)) + '" class="' + INP + ' !w-auto !py-1 text-xs">' : '');
  var CC = { blue: ['#1d4ed8', '#eff6ff', '#93c5fd'], violet: ['#6d28d9', '#f5f3ff', '#c4b5fd'], orange: ['#c2410c', '#fff7ed', '#fdba74'], rose: ['#be123c', '#fff1f2', '#fda4af'], green: ['#15803d', '#f0fdf4', '#86efac'] };
  var chip = function (lab, val, col) { var c = CC[col] || CC.blue; return '<div class="pj-chip rounded-xl px-3 py-1.5 shadow-xs" style="border:2px solid ' + c[2] + ';background:' + c[1] + ';--cc:' + c[0] + '"><div class="text-[10px] font-extrabold uppercase tracking-wide" style="color:' + c[0] + '">' + lab + '</div><div class="text-base font-black" style="color:' + c[0] + '">' + val + '</div></div>'; };
  return '<div class="space-y-3">' + printHead(L('PROJECT DUE LIST', 'প্রজেক্ট ডিউ লিস্ট') + ' — ' + (asof ? L('as on ', 'তারিখ পর্যন্ত: ') + asof : L('as on today ', 'আজ পর্যন্ত ') + todayStr())) +
    '<div class="no-print flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-slate-200 dark:border-slate-800"><h1 class="text-base sm:text-lg font-black flex items-center gap-2">' + ic('alert', 'w-5 h-5 text-orange-600') + L('Project Due List', 'প্রজেক্ট ডিউ লিস্ট') + '</h1>' +
    '<div class="flex flex-wrap items-center gap-1.5"><div class="flex items-center gap-0.5 p-0.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">' + mb('now', L('Now', 'এখন')) + mb('date', L('On a date', 'নির্দিষ্ট তারিখ')) + mb('month', L('Month end', 'মাস শেষে')) + '</div>' + pick +
    '<select data-f="duesort" title="' + L('Sort', 'সাজানো') + '" class="' + INP + ' !w-auto !py-1 text-xs font-bold">' + [['az', 'A → Z'], ['za', 'Z → A'], ['lo', L('Amount: low → high', 'টাকা: কম → বেশি')], ['hi', L('Amount: high → low', 'টাকা: বেশি → কম')]].map(function (o) { return '<option value="' + o[0] + '"' + ((S.dueSort || 'az') === o[0] ? ' selected' : '') + '>' + L('Sort: ', 'সাজানো: ') + o[1] + '</option>'; }).join('') + '</select>' +
    '<input data-f="dueq" value="' + esc(S.dueQ || '') + '" placeholder="' + L('Search project / person / mobile', 'প্রজেক্ট / নাম / মোবাইল খুঁজুন') + '" class="' + INP + ' !w-48 !py-1 text-xs">' +
    '<button type="button" data-a="printp" class="' + BTN_S + '">' + ic('print', 'w-3.5 h-3.5') + '<span>Print</span></button><button type="button" data-a="csvdue" class="' + BTN_S + '">' + ic('down', 'w-3.5 h-3.5') + '<span>CSV</span></button></div></div>' +
    '<div class="flex flex-wrap gap-2">' + chip(L('Projects with due', 'ডিউ আছে এমন প্রজেক্ট'), L0.length, 'blue') + chip(L('Companies', 'কোম্পানি'), Object.keys(cos).length, 'violet') + chip(asof ? L('Total due on ', 'মোট ডিউ — ') + asof : L('Total due now', 'এখন মোট ডিউ'), money(T.due), 'orange') + (past ? chip(L('Total due now', 'এখন মোট ডিউ'), money(T.now), T.now > T.due ? 'rose' : 'green') + chip(L('Change since then', 'তখন থেকে পরিবর্তন'), (T.now - T.due >= 0 ? '+' : '−') + money(Math.abs(T.now - T.due)), T.now > T.due ? 'rose' : 'green') : '') + '</div>' +
    '<div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-2 shadow-xs"><div class="pj-lwrap" id="dueBox"><table class="w-full border-collapse text-xs print-table pj-ledger pj-due"><thead>' + head + '</thead><tbody>' + rows + '</tbody><tfoot>' + foot + '</tfoot></table></div>' + words + '</div></div>';
}
function csvDue() {
  var asof = dueAsOf(), past = !!asof && asof < todayStr(), L0 = dueList(asof), r = [['PROJECT DUE', asof ? 'as on ' + asof : 'as on ' + todayStr()], [], ['SL', 'Project', 'Company', 'Contact Person', 'Mobile', 'Due From', 'Days', asof ? 'Due on ' + asof : 'Due Amount'].concat(past ? ['Due Now'] : [])], t = 0, tn = 0;
  L0.forEach(function (x, i) { t += x.due; tn += x.now; r.push([i + 1, x.p.name, x.p.client || '', x.p.cperson || '', x.p.cphone ? bdFmt(x.p.cphone) : '', x.from || '', x.from ? daysSince(x.from, asof || '') : '', x.due].concat(past ? [x.now] : [])); });
  r.push(['', 'TOTAL', '', '', '', '', '', t].concat(past ? [tn] : []), ['', 'In Words: ' + wordsBD(t)]);
  return dl('SCS_Project_Due_' + (asof || todayStr()) + '.csv', csvRows(r), 'text/csv;charset=utf-8');
}
function projForm(p) {
  p = p || { status: 'running' };
  modal(mHead(p.id ? L('Edit Project', 'প্রজেক্ট এডিট') : L('Add Project', 'নতুন প্রজেক্ট')) + '<form id="mf" class="grid grid-cols-2 gap-3" data-c="projects" data-id="' + esc(p.id || '') + '">' +
    fld(L('Project Name *', 'প্রজেক্টের নাম *'), inp('name', p.name), 'col-span-2') + fld(L('Company (folder)', 'কোম্পানি (ফোল্ডার)'), inp('client', p.client, 'text', L('e.g. Rupayan', 'যেমন: রূপায়ণ'), 'list="dl-co" autocomplete="off"') + dlist('dl-co', xCompanies().filter(Boolean))) + fld(L('Location', 'লোকেশন'), inp('location', p.location)) +
    fld(L('Contact Person (optional)', 'কন্টাক্ট পারসন (ঐচ্ছিক)'), inp('cperson', p.cperson, 'text', L('e.g. Mr. Karim, PM', 'যেমন: করিম সাহেব, পিএম'))) + fld(L('Mobile (optional)', 'মোবাইল (ঐচ্ছিক)'), inp('cphone', p.cphone ? bdFmt(p.cphone) : '', 'tel', '01XXX-XXXXXX', 'inputmode="tel" autocomplete="tel"')) +
    fld(L('Start Date', 'শুরুর তারিখ'), inp('start', p.start, 'date')) + fld(L('End Date', 'শেষের তারিখ'), inp('end', p.end, 'date')) +
    fld(L('Status', 'স্ট্যাটাস'), '<select name="status" class="' + INP + '">' + [['running', 'Running', 'চলমান'], ['completed', 'Completed', 'সম্পন্ন'], ['hold', 'On Hold', 'স্থগিত']].map(function (o) { return '<option value="' + o[0] + '"' + (p.status === o[0] ? ' selected' : '') + '>' + L(o[1], o[2]) + '</option>'; }).join('') + '</select>') + fld(L('Contract / Work Order Value', 'কন্ট্রাক্ট / ওয়ার্ক অর্ডারের মূল্য'), numi('contract', p.contract)) +
    fld(L('Note', 'নোট'), '<textarea name="note" rows="2" class="' + INP + '">' + esc(p.note || '') + '</textarea>', 'col-span-2') +
    '<div class="col-span-2 flex justify-end gap-2 pt-1"><button type="button" data-a="mclose" class="' + BTN_S + '">' + L('Cancel', 'বাতিল') + '</button><button type="submit" class="' + BTN_P + '">' + ic('check', 'w-3.5 h-3.5') + '<span>' + L('Save', 'সংরক্ষণ') + '</span></button></div></form>');
}
function billForm(x, kind) {
  x = x || { kind: kind || 'bill', date: S.day || todayStr() };
  var pay = x.kind === 'payment', oldVat = !pay && (n(x.vat) || n(x.tax) || n(x.ait));
  modal(fhead('bills', x, pay ? L('Add Collection (received)', 'কালেকশন যোগ (পাওয়া টাকা)') : L('Add Bill', 'বিল যোগ'), pay ? L('Edit Collection', 'কালেকশন এডিট') : L('Edit Bill', 'বিল এডিট')) + '<input type="hidden" name="kind" value="' + x.kind + '">' + fld(L('Project *', 'প্রজেক্ট *'), pidSel(x.pid)) + fld(L('Date *', 'তারিখ *'), inp('date', x.date, 'date')) +
    fld(pay ? L('Collection amount * (before VAT/TAX cut)', 'কালেকশনের টাকা * (ভ্যাট/ট্যাক্স কাটার আগে)') : L('Bill amount *', 'বিলের টাকা *'), numi('amount', x.amount), 'col-span-2') +
    (pay || oldVat ? '<div class="col-span-2 rounded-xl border border-amber-300 bg-amber-50/70 dark:bg-amber-950/20 p-2.5"><div class="text-[11px] font-bold text-amber-800 dark:text-amber-300 mb-0.5">' + (pay ? L('VAT, TAX & AIT deducted — total (optional)', 'কাটা ভ্যাট, ট্যাক্স ও এআইটি — মোট (ঐচ্ছিক)') : L('VAT, TAX & AIT saved on this old bill', 'এই পুরোনো বিলে সেভ করা ভ্যাট, ট্যাক্স ও এআইটি')) + '</div><div class="text-[10px] text-amber-700/80 dark:text-amber-300/70 mb-1.5">' + (pay ? L('Fill only if the company deducted it from this payment — otherwise leave empty.', 'কোম্পানি এই পেমেন্ট থেকে কেটে রাখলে তবেই দিন — না কাটলে খালি রাখুন।') : L('New bills no longer take VAT/TAX/AIT — enter it with the Collection instead. You can clear this box.', 'নতুন বিলে আর ভ্যাট/ট্যাক্স/এআইটি নেওয়া হয় না — কালেকশনের সময় দিন। চাইলে ঘরটি খালি করে দিন।')) + '</div>' + numi('vat', n(x.vat) + n(x.tax) + n(x.ait) || '', L('VAT + TAX + AIT together', 'ভ্যাট + ট্যাক্স + এআইটি একসাথে')) + '</div>' : '') +
    fld(L('Purpose / Note', 'উদ্দেশ্য / নোট'), inp('note', x.note, 'text', pay ? L('e.g. 1st running bill payment', 'যেমন: ১ম রানিং বিলের টাকা') : L('e.g. 1st running bill', 'যেমন: ১ম রানিং বিল')), 'col-span-2') +
    tot(pay ? L('Net collection (in hand) = Collection − VAT/TAX/AIT', 'নিট কালেকশন (হাতে পাওয়া) = কালেকশন − ভ্যাট/ট্যাক্স/এআইটি') : L('Bill amount (receivable)', 'বিলের টাকা (প্রাপ্য)'), n(x.amount) - n(x.vat) - n(x.tax) - n(x.ait)) + btnRow());
}
function submitForm(form) {
  var c = form.getAttribute('data-c'), id = form.getAttribute('data-id'), g = mv, after = function () { if (S.histOpen) histModal(); };
  if (c === 'projects') {
    var nm = g('name').trim(); if (!nm) return toast(L('Project name is required', 'প্রজেক্টের নাম দিন'), 'error');
    var ph = String(g('cphone') || '').trim(), phn = ph ? bdPhone(ph) : '';
    if (ph && !phn) return toast(L('Mobile number is not valid — use Bangladeshi format 01XXXXXXXXX', 'মোবাইল নম্বর সঠিক নয় — 01XXXXXXXXX ফরম্যাটে দিন'), 'error');
    var old = proj(id) || {}, o = { id: id || uid('p'), name: nm, client: g('client').trim(), location: g('location').trim(), cperson: String(g('cperson') || '').trim(), cphone: phn, start: g('start'), end: g('end'), status: g('status'), contract: n(g('contract')), note: g('note').trim(), createdAt: old.createdAt || new Date().toISOString() };
    closeModal(); return save('projects', o).then(function () { if (!id) { S.pid = o.id; S.view = 'project'; render(); } });
  }
  var pid = g('pid'), note = g('note').trim(); if (!pid) return toast(L('Choose a project', 'প্রজেক্ট বাছুন'), 'error');
  if (c === 'labor' && !id) {
    var ds = S.cal.sel.slice().sort(), cm = n(g('count')), am = n(g('amount'));
    if (!ds.length) return toast(L('Select at least one day', 'কমপক্ষে একটি দিন বাছুন'), 'error');
    var list = ds.map(function (d) { var q = n(S.lov[d]) || cm, a = n(S.lav[d]) || am; return { id: uid('l'), pid: pid, date: d, count: q, amount: a, rate: q ? a / q : 0, note: note }; }).filter(function (x) { return x.count > 0 || x.amount > 0; });
    var ta0 = n(g('ta')), da0 = n(g('da')), pick = function (map, d, def) { return map[d] !== undefined && map[d] !== '' ? n(map[d]) : def; };
    var elist = ds.map(function (d) { return { id: uid('e'), pid: pid, date: d, ta: pick(S.lta, d, ta0), da: pick(S.lda, d, da0), transport: 0, other: 0, note: note }; }).filter(function (x) { return x.ta > 0 || x.da > 0; });
    if (!list.length && !elist.length) return toast(L('Enter the labor quantity / amount or TA / DA', 'লেবার সংখ্যা / টাকা অথবা টিএ / ডিএ দিন'), 'error');
    closeModal(); S.pid = pid; if (list.length) saveMany('labor', list); if (elist.length) saveMany('entries', elist); return after();
  }
  if (c === 'chems' && !id) {
    var date = g('date'); if (!date) return toast(L('Date is required', 'তারিখ দিন'), 'error');
    var rowsC = [].map.call(document.querySelectorAll('#mf .crow'), function (r) { var f = function (k) { return r.querySelector('[data-cr=' + k + ']').value; }; var q = n(f('qty')), rt = n(f('rate')), da = f('amt').trim(), am = da !== '' ? n(da) : q * rt; return { id: uid('c'), pid: pid, date: date, name: f('name').trim(), unit: f('unit').trim(), qty: q, rate: da !== '' ? (q ? am / q : 0) : rt, amount: am, note: note }; }).filter(function (x) { return x.name; });
    if (!rowsC.length) return toast(L('Enter at least one chemical', 'কমপক্ষে একটি কেমিক্যাল দিন'), 'error');
    closeModal(); S.pid = pid; S.day = date; saveMany('chems', rowsC); return after();
  }
  var r = { id: id || uid(c.charAt(0)), pid: pid, date: g('date'), note: note };
  if (!r.date) return toast(L('Date is required', 'তারিখ দিন'), 'error');
  var coll = c;
  if (c === 'labor') { r.count = n(g('count')); r.amount = n(g('amount')); r.rate = r.count ? r.amount / r.count : 0; }
  else if (c === 'subs') { if (!g('sub').trim()) return toast(L('Subcontractor name is required', 'সাবকন্ট্রাক্টরের নাম দিন'), 'error'); r.sub = g('sub').trim(); r.work = g('work').trim(); r.unit = g('unit').trim(); r.qty = n(g('qty')); r.rate = n(g('rate')); r.amount = g('amount').trim() !== '' ? n(g('amount')) : r.qty * r.rate; }
  else if (c === 'subpays') { if (!g('sub') || n(g('amount')) <= 0) return toast(L('Choose subcontractor and amount', 'সাবকন্ট্রাক্টর ও টাকার পরিমাণ দিন'), 'error'); r.sub = g('sub'); r.amount = n(g('amount')); }
  else if (c === 'chems') { if (!g('name').trim()) return toast(L('Chemical name is required', 'কেমিক্যালের নাম দিন'), 'error'); r.name = g('name').trim(); r.unit = g('unit').trim(); r.qty = n(g('qty')); var da = g('amount').trim(), rt = n(g('rate')); r.amount = da !== '' ? n(da) : r.qty * rt; r.rate = da !== '' ? (r.qty ? r.amount / r.qty : 0) : rt; }
  else if (c === 'entries') { r.ta = n(g('ta')); r.da = n(g('da')); r.transport = n(g('transport')); r.other = n(g('other')); }
  else if (c === 'comm') { if (n(g('commission')) <= 0) return toast(L('Commission amount is required', 'কমিশনের টাকা দিন'), 'error'); coll = 'entries'; r.commission = n(g('commission')); r.eng = g('eng').trim(); }
  else if (c === 'bills') { if (n(g('amount')) <= 0) return toast(L('Amount is required', 'টাকার পরিমাণ দিন'), 'error'); r.kind = g('kind'); r.amount = n(g('amount')); r.vat = n(g('vat')); r.tax = 0; r.ait = 0; }   /* ভ্যাট + ট্যাক্স + এআইটি একসাথে একটি ঘরে */
  closeModal(); S.pid = pid; S.day = r.date; save(coll, r); after();
}
/* ---------- Print / CSV ---------- */
function csvCell(v) { v = String(v == null ? '' : v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
function csvRows(rows) { return '\ufeff' + rows.map(function (r) { return r.map(csvCell).join(','); }).join('\r\n'); }
function csvProject() {
  var p = proj(S.pid), name = (p ? p.name : 'projects').replace(/[^\w\u0980-\u09FF-]+/g, '_');
  if (!p) {
    var rows = [['SL', 'Project', 'Client', 'Location', 'Status', 'Expense', 'Bill', 'VAT', 'Tax', 'Net Receivable', 'Collected', 'Due', 'Profit']];
    D.projects.forEach(function (x, i) { var s = pStats(x.id); rows.push([i + 1, x.name, x.client, x.location, x.status, s.exp, s.bill, s.vat, s.tax, s.net, s.recv, s.due, s.profit]); });
    return dl('SCS_Projects_List.csv', csvRows(rows), 'text/csv;charset=utf-8');
  }
  var m = perMatch(), s = pStats(p.id, m), r = [['Project', p.name], ['Client', p.client], ['Period', perLabel()], [], ['Date', 'Category', 'Labor Qty', 'Labor Amount', 'Subcontractor / Work', 'Sub Qty', 'Sub Rate', 'Sub Bill', 'Sub Paid', 'Chemical', 'Chem Qty', 'Chem Rate', 'Chem Amount', 'TA', 'DA', 'Goods Transport', 'Other', 'Eng Commission', 'Total Expense', 'Bill', 'VAT, TAX & AIT', 'Collection', 'Due Balance', 'Net Collection (after VAT/TAX)', 'Note']];
  ledger(p.id, m).forEach(function (x) { r.push([x.d, CATS[x.k][0], x.lq, x.la, x.sdesc, x.sq, x.sr, x.sb, x.sp, x.cn, x.cq, x.cr, x.ca, x.ta, x.da, x.tr, x.ot, x.cm, x.te, x.bill, x.vat, x.coll, x.bal, x.ncoll || '', x.note]); });
  r.push([], ['SUMMARY'], ['Total Expense', s.exp], ['Subcontractor payable', s.subDue], ['Total Bill', s.bill], ['VAT, TAX & AIT', s.vat], ['Net Receivable', s.net], ['Collected', s.recv], ['Due', s.due], ['Net Profit', s.profit], ['Cash position', s.cash]);
  dl('SCS_' + name + '.csv', csvRows(r), 'text/csv;charset=utf-8');
}
/* ---------- Export (কোম্পানি / প্রজেক্ট / সময় অনুযায়ী PDF ও CSV) ---------- */
var coName = function (p) { return String(p.client || '').trim(); };
function xCompanies() { var o = {}; D.projects.forEach(function (p) { o[coName(p)] = 1; }); return Object.keys(o).sort(function (a, b) { return !a ? 1 : !b ? -1 : a.localeCompare(b); }); }
var coLbl = function (c) { return c || L('(No company)', '(কোম্পানি নেই)'); };
function xSel() { var x = S.xp; return D.projects.filter(function (p) { return !x.coOff[coName(p)] && !x.off[p.id]; }); }
function xRange() {
  var x = S.xp;
  if (x.scope === 'year') return { f: x.year + '-01-01', t: x.year + '-12-31', l: L('Year ', 'বছর ') + x.year };
  if (x.scope === 'month') { var pr = x.month.split('-'); return { f: x.month + '-01', t: x.month + '-31', l: (S.lang === 'bn' ? MB : MN)[n(pr[1]) - 1] + ' ' + pr[0] }; }
  if (x.scope === 'range') return { f: x.from || '0000-00-00', t: x.to || '9999-99-99', l: (x.from || '…') + ' → ' + (x.to || '…') };
  return { f: '', t: '', l: L('Lifetime (start to date)', 'লাইফটাইম (শুরু থেকে আজ পর্যন্ত)') };
}
function xMatch() { var r = xRange(); if (!r.f) return function () { return true; }; return function (d) { d = d || ''; return d >= r.f && d <= r.t; }; }
var XK = [['exp', 'Expense', 'খরচ'], ['bill', 'Bill', 'বিল'], ['vat', 'VAT/TAX/AIT', 'ভ্যাট/ট্যাক্স/এআইটি'], ['net', 'Net Receivable', 'নেট প্রাপ্য'], ['recv', 'Collected', 'কালেকশন'], ['due', 'Due', 'বাকি'], ['profit', 'Profit', 'লাভ'], ['subDue', 'Sub. Payable', 'সাব. পাবে']];
function xData() {
  var list = xSel(), m = xMatch(), groups = {}, G = {};
  list.forEach(function (p) { var c = coName(p); (groups[c] = groups[c] || []).push({ p: p, s: pStats(p.id, m) }); });
  XK.forEach(function (k) { G[k[0]] = 0; });
  var cos = Object.keys(groups).sort(function (a, b) { return !a ? 1 : !b ? -1 : a.localeCompare(b); }).map(function (c) {
    var T = {}; XK.forEach(function (k) { T[k[0]] = 0; }); groups[c].forEach(function (r) { XK.forEach(function (k) { T[k[0]] += r.s[k[0]]; G[k[0]] += r.s[k[0]]; }); });
    return { co: c, rows: groups[c], T: T };
  });
  return { cos: cos, G: G, m: m, r: xRange(), n: list.length };
}
function xReport(X) {
  var th = function (t, c) { return '<th class="' + (c || '') + '">' + t + '</th>'; }, td = function (v, c) { return '<td class="' + (c || '') + '">' + v + '</td>'; };
  var head = '<tr>' + th('SL') + th(L('Project', 'প্রজেক্ট'), 'l') + th(L('Status', 'স্ট্যাটাস')) + XK.map(function (k) { return th(L(k[1], k[2]), 'r'); }).join('') + '</tr>';
  var sl = 0, body = X.cos.map(function (g) {
    return '<tr class="xr-co"><td colspan="' + (3 + XK.length) + '">' + esc(coLbl(g.co)) + ' — ' + g.rows.length + ' ' + L('project(s)', 'টি প্রজেক্ট') + '</td></tr>' +
      g.rows.map(function (r) { sl++; return '<tr>' + td(sl, 'c') + td(esc(r.p.name), 'l b') + td(esc(({ running: L('Running', 'চলমান'), completed: L('Completed', 'সম্পন্ন'), hold: L('On Hold', 'স্থগিত') })[r.p.status] || ''), 'c') + XK.map(function (k) { return td(fmt(r.s[k[0]]), 'r'); }).join('') + '</tr>'; }).join('') +
      (X.cos.length > 1 ? '<tr class="xr-sub"><td colspan="3" class="r">' + L('Subtotal', 'উপমোট') + ' — ' + esc(coLbl(g.co)) + '</td>' + XK.map(function (k) { return td(fmt(g.T[k[0]]), 'r'); }).join('') + '</tr>' : '');
  }).join('') || '<tr><td colspan="' + (3 + XK.length) + '" class="c">' + L('No projects selected', 'কোনো প্রজেক্ট বাছাই করা হয়নি') + '</td></tr>';
  var foot = '<tr class="xr-tot"><td colspan="3" class="r">' + L('GRAND TOTAL', 'সর্বমোট') + '</td>' + XK.map(function (k) { return td(fmt(X.G[k[0]]), 'r'); }).join('') + '</tr>';
  var h = '<div class="xr"><div class="xr-h"><img data-logo="1" alt="logo" class="xr-logo" src="' + esc(logoSrc()) + '"><div class="xr-hc"><div class="xr-co1">' + esc(C.company) + ' • <i>' + esc(C.tagline) + '</i></div><div class="xr-t">' + L('PROJECT REPORT', 'প্রজেক্ট রিপোর্ট') + '</div><div class="xr-m">' + L('Period: ', 'সময়: ') + '<b>' + esc(X.r.l) + '</b> · ' + L('Companies: ', 'কোম্পানি: ') + '<b>' + esc(X.cos.map(function (g) { return coLbl(g.co); }).join(', ') || '—') + '</b> · ' + L('Generated: ', 'তৈরি: ') + todayStr() + '</div></div><div class="xr-logo"></div></div>' +
    '<div class="xr-st">' + L('Summary', 'সারসংক্ষেপ') + ' (' + cur() + ')</div><table class="xr-tb">' + '<thead>' + head + '</thead><tbody>' + body + '</tbody><tfoot>' + foot + '</tfoot></table>';
  if (S.xp.detail) X.cos.forEach(function (g) { g.rows.forEach(function (r) {
    var R = ledger(r.p.id, X.m), te = 0, tb = 0, tv = 0, tc = 0;
    h += '<div class="xr-pb"><div class="xr-st">' + esc(r.p.name) + ' <span>(' + esc(coLbl(g.co)) + (r.p.location ? ' · ' + esc(r.p.location) : '') + ')</span></div><table class="xr-tb"><thead><tr>' + th(L('Date', 'তারিখ')) + th(L('Type', 'ধরন')) + th(L('Details', 'বিবরণ'), 'l') + th(L('Note', 'নোট'), 'l') + th(L('Expense', 'খরচ'), 'r') + th(L('Bill', 'বিল'), 'r') + th(L('VAT/TAX/AIT', 'ভ্যাট/ট্যাক্স/এআইটি'), 'r') + th(L('Collection', 'কালেকশন'), 'r') + '</tr></thead><tbody>' +
      (R.map(function (x) { te += n(x.te); tb += n(x.bill); tv += n(x.vat); tc += n(x.coll); return '<tr>' + td(esc(x.d), 'c nw') + td(L(CATS[x.k][0], CATS[x.k][1]), 'c') + td(esc(x.desc), 'l') + td(esc(x.note || ''), 'l') + td(n(x.te) ? fmt(x.te) : '', 'r') + td(n(x.bill) ? fmt(x.bill) : '', 'r') + td(n(x.vat) ? fmt(x.vat) : '', 'r') + td(n(x.coll) ? fmt(x.coll) : '', 'r') + '</tr>'; }).join('') || '<tr><td colspan="8" class="c">' + L('No records in this period', 'এই সময়ে কোনো রেকর্ড নেই') + '</td></tr>') +
      '</tbody><tfoot><tr class="xr-tot"><td colspan="4" class="r">' + L('Total', 'মোট') + ' — ' + L('Due: ', 'বাকি: ') + fmt(r.s.due) + ' · ' + L('Profit: ', 'লাভ: ') + fmt(r.s.profit) + '</td>' + td(fmt(te), 'r') + td(fmt(tb), 'r') + td(fmt(tv), 'r') + td(fmt(tc), 'r') + '</tr></tfoot></table></div>';
  }); });
  return h + sigHtml('report', true) + '</div>';
}
function exportView() {
  var x = S.xp, cos = xCompanies(), onCos = cos.filter(function (c) { return !x.coOff[c]; });
  var X = xData(), yopts = '';
  for (var y = 2022; y <= 2035; y++) yopts += '<option value="' + y + '"' + (String(y) === x.year ? ' selected' : '') + '>' + y + '</option>';
  var chk = function (attr, val, on, label, sub) { return '<label class="flex items-center gap-2 px-2 py-1.5 rounded-lg border cursor-pointer text-xs ' + (on ? 'border-pink-400 bg-pink-50 dark:bg-pink-950/40' : 'border-slate-200 dark:border-slate-700') + '"><input type="checkbox" ' + attr + '="' + esc(val) + '"' + (on ? ' checked' : '') + '><span class="font-semibold truncate">' + label + '</span>' + (sub ? '<span class="ml-auto text-[10px] text-slate-500 shrink-0">' + sub + '</span>' : '') + '</label>'; };
  var coBox = cos.map(function (c) { return chk('data-xco', c, !x.coOff[c], esc(coLbl(c)), D.projects.filter(function (p) { return coName(p) === c; }).length + ' ' + L('proj.', 'টি')); }).join('') || '<p class="text-xs text-slate-400">' + L('No projects yet', 'কোনো প্রজেক্ট নেই') + '</p>';
  var pBox = D.projects.filter(function (p) { return !x.coOff[coName(p)]; }).map(function (p) { return chk('data-xp', p.id, !x.off[p.id], esc(p.name), esc(coLbl(coName(p)))); }).join('') || '<p class="text-xs text-slate-400">' + L('Select at least one company', 'কমপক্ষে একটি কোম্পানি বাছাই করুন') + '</p>';
  var sc = [['life', 'Lifetime', 'লাইফটাইম'], ['year', 'Year', 'বছর'], ['month', 'Month', 'মাস'], ['range', 'Date range', 'তারিখ থেকে তারিখ']].map(function (o) { return '<button type="button" data-a="xscope" data-v="' + o[0] + '" class="px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer active:scale-95 ' + (x.scope === o[0] ? 'bg-pink-600 text-white shadow-xs' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700') + '">' + L(o[1], o[2]) + '</button>'; }).join('');
  var extra = x.scope === 'year' ? '<select data-xf="year" class="' + INP + ' max-w-[11rem]">' + yopts + '</select>' : x.scope === 'month' ? '<input type="month" data-xf="month" value="' + x.month + '" class="' + INP + ' max-w-[11rem]">' : x.scope === 'range' ? '<div class="flex gap-2 items-center"><input type="date" data-xf="from" value="' + x.from + '" class="' + INP + '"><span class="text-xs text-slate-500">→</span><input type="date" data-xf="to" value="' + x.to + '" class="' + INP + '"></div>' : '';
  var allBtn = function (a, t) { return '<button type="button" data-a="' + a + '" class="text-[11px] font-bold text-pink-600 hover:underline cursor-pointer">' + t + '</button>'; };
  return '<div class="space-y-3"><div class="bg-slate-900 text-white rounded-2xl px-5 py-3.5 shadow-md border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div class="flex items-center gap-2.5"><div class="w-9 h-9 rounded-xl bg-pink-600/20 text-pink-400 flex items-center justify-center shrink-0 border border-pink-500/30">' + ic('down', 'w-5 h-5') + '</div><div><h1 class="text-base sm:text-lg font-bold text-white leading-tight">' + L('Export Reports', 'রিপোর্ট এক্সপোর্ট') + '</h1><p class="text-[11px] text-slate-400">' + L('Pick companies, projects and a period — then download PDF or CSV', 'কোম্পানি, প্রজেক্ট ও সময় বাছাই করুন — তারপর PDF বা CSV ডাউনলোড করুন') + '</p></div></div><div class="flex items-center gap-2"><button type="button" data-a="xpdf" class="' + BTN_D + '"' + (X.n ? '' : ' disabled') + '>' + ic('print', 'w-4 h-4') + '<span>PDF</span></button><button type="button" data-a="xcsv" class="' + BTN_G + '"' + (X.n ? '' : ' disabled') + '>' + ic('down', 'w-4 h-4') + '<span>CSV</span></button></div></div>' +
    '<div class="grid grid-cols-1 lg:grid-cols-3 gap-3"><div class="' + CARD + ' mb-0"><div class="flex items-center justify-between mb-2"><div class="text-xs font-bold">1. ' + L('Companies', 'কোম্পানি') + ' <span class="text-slate-400 font-medium">(' + onCos.length + '/' + cos.length + ')</span></div><div class="flex gap-2">' + allBtn('xcoall', L('All', 'সব')) + allBtn('xconone', L('None', 'কোনোটি না')) + '</div></div><div class="space-y-1 max-h-64 overflow-y-auto">' + coBox + '</div></div>' +
    '<div class="' + CARD + ' mb-0"><div class="flex items-center justify-between mb-2"><div class="text-xs font-bold">2. ' + L('Projects', 'প্রজেক্ট') + ' <span class="text-slate-400 font-medium">(' + X.n + ')</span></div><div class="flex gap-2">' + allBtn('xpall', L('All', 'সব')) + allBtn('xpnone', L('None', 'কোনোটি না')) + '</div></div><div class="space-y-1 max-h-64 overflow-y-auto">' + pBox + '</div></div>' +
    '<div class="' + CARD + ' mb-0"><div class="text-xs font-bold mb-2">3. ' + L('Period', 'সময়') + '</div><div class="flex flex-wrap gap-1.5 mb-2">' + sc + '</div>' + extra + '<div class="text-xs font-bold mt-3 mb-1.5">4. ' + L('Contents', 'বিষয়বস্তু') + '</div><label class="flex items-center gap-2 text-xs cursor-pointer"><input type="checkbox" data-xf="detail"' + (x.detail ? ' checked' : '') + '><span>' + L('Include each project’s detailed statement', 'প্রতিটি প্রজেক্টের বিস্তারিত হিসাব যুক্ত করুন') + '</span></label><p class="text-[10px] text-slate-400 mt-3">' + L('PDF opens the print dialog — choose “Save as PDF”. CSV opens in Excel / Google Sheets.', 'PDF বাটনে প্রিন্ট ডায়ালগ খুলবে — “Save as PDF” বাছুন। CSV এক্সেল / গুগল শিটে খোলা যায়।') + '</p></div></div>' +
    '<div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3 shadow-xs"><div class="text-xs font-bold mb-2 flex items-center gap-2">' + L('Preview', 'প্রিভিউ') + '<span class="' + PILL + '">' + esc(X.r.l) + '</span></div><div class="overflow-x-auto xr-prev">' + xReport(X) + '</div></div></div>';
}
function xPdf() {
  var X = xData(); if (!X.n) return toast(L('Select at least one project', 'কমপক্ষে একটি প্রজেক্ট বাছাই করুন'), 'error');
  var box = $('#xprint'); box.innerHTML = xReport(X); document.body.classList.add('xprinting');
  var t0 = document.title; document.title = 'SCS_Report_' + X.r.l.replace(/[^\wঀ-৿-]+/g, '_') + '_' + todayStr();
  var done = function () { document.body.classList.remove('xprinting'); box.innerHTML = ''; document.title = t0; window.removeEventListener('afterprint', done); };
  window.addEventListener('afterprint', done);
  setTimeout(function () { window.print(); setTimeout(done, 1500); }, 60);
}
function xCsv() {
  var X = xData(); if (!X.n) return toast(L('Select at least one project', 'কমপক্ষে একটি প্রজেক্ট বাছাই করুন'), 'error');
  var r = [['SCS Projects — Report'], ['Company', C.company], ['Period', X.r.l], ['Companies', X.cos.map(function (g) { return coLbl(g.co); }).join(' | ')], ['Generated', todayStr()], [], ['SUMMARY'], ['SL', 'Company', 'Project', 'Location', 'Status', 'Contract'].concat(XK.map(function (k) { return k[1]; }))], sl = 0;
  X.cos.forEach(function (g) { g.rows.forEach(function (x) { sl++; r.push([sl, coLbl(g.co), x.p.name, x.p.location || '', x.p.status || '', n(x.p.contract)].concat(XK.map(function (k) { return x.s[k[0]]; }))); }); if (X.cos.length > 1) r.push(['', 'Subtotal — ' + coLbl(g.co), '', '', '', ''].concat(XK.map(function (k) { return g.T[k[0]]; }))); });
  r.push(['', 'GRAND TOTAL', '', '', '', ''].concat(XK.map(function (k) { return X.G[k[0]]; })));
  if (S.xp.detail) {
    r.push([], ['DETAILS'], ['Company', 'Project', 'Date', 'Category', 'Details', 'Labor Qty', 'Labor Amount', 'Sub Bill', 'Sub Paid', 'Chemical Amount', 'TA', 'DA', 'Goods Transport', 'Other', 'Eng Commission', 'Total Expense', 'Bill', 'VAT, TAX & AIT', 'Collection', 'Note']);
    X.cos.forEach(function (g) { g.rows.forEach(function (x) { ledger(x.p.id, X.m).forEach(function (e) { r.push([coLbl(g.co), x.p.name, e.d, CATS[e.k][0], e.desc, e.lq, e.la, e.sb, e.sp, e.ca, e.ta, e.da, e.tr, e.ot, e.cm, e.te, e.bill, e.vat, e.coll, e.note]); }); }); });
  }
  dl('SCS_Report_' + X.r.l.replace(/[^\wঀ-৿-]+/g, '_') + '_' + todayStr() + '.csv', csvRows(r), 'text/csv;charset=utf-8');
  toast(L('CSV downloaded', 'CSV ডাউনলোড হয়েছে'));
}
/* ---------- অটো ব্যাকআপ (গুগল ড্রাইভ) ---------- */
var AB_OPTS = [['m5', 'Every 5 minutes', 'প্রতি ৫ মিনিটে'], ['m10', 'Every 10 minutes', 'প্রতি ১০ মিনিটে'], ['m15', 'Every 15 minutes', 'প্রতি ১৫ মিনিটে'], ['m30', 'Every 30 minutes', 'প্রতি ৩০ মিনিটে'], ['h1', 'Every hour', 'প্রতি ঘণ্টায়'], ['h2', 'Every 2 hours', 'প্রতি ২ ঘণ্টায়'], ['h4', 'Every 4 hours', 'প্রতি ৪ ঘণ্টায়'], ['h6', 'Every 6 hours', 'প্রতি ৬ ঘণ্টায়'], ['h12', 'Every 12 hours', 'প্রতি ১২ ঘণ্টায়'], ['d1', 'Once a day', 'দিনে একবার']];
function abTab() {
  if (!S.ab) { S.ab = { loading: true }; srv('getAutoBackup').then(function (r) { S.ab = r; S.abDraft = null; render(); }).catch(function (e) { S.ab = { err: e.message }; render(); }); }
  var a = S.ab;
  if (a.loading) return '<div class="' + CARD + ' text-xs text-slate-400">' + L('Loading…', 'লোড হচ্ছে…') + '</div>';
  var d = S.abDraft || (S.abDraft = { on: !!a.on, folder: '', every: a.every || 'h1', hour: a.hour == null ? 2 : a.hour, keep: a.keep || 7, prune: a.prune !== false, skip: a.skip !== false });
  var tm = function (iso) { if (!iso) return '—'; var t = new Date(iso); return isNaN(t) ? iso : t.getFullYear() + '-' + pad(t.getMonth() + 1) + '-' + pad(t.getDate()) + ' ' + pad(t.getHours()) + ':' + pad(t.getMinutes()); };
  var running = a.on && a.triggers > 0;
  var status = '<div class="rounded-xl border p-3 mb-3 text-xs ' + (running ? 'border-emerald-300 bg-emerald-50 dark:bg-emerald-950/20' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50') + '"><div class="flex items-center gap-2 font-bold mb-1"><span class="w-2 h-2 rounded-full ' + (running ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400') + '"></span>' + (running ? L('Auto backup is ON', 'অটো ব্যাকআপ চালু আছে') + ' — ' + L((AB_OPTS.find(function (o) { return o[0] === a.every; }) || AB_OPTS[4])[1], (AB_OPTS.find(function (o) { return o[0] === a.every; }) || AB_OPTS[4])[2]) : L('Auto backup is OFF', 'অটো ব্যাকআপ বন্ধ')) + '</div>' +
    '<div class="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5 text-[11px]"><div>' + L('Folder: ', 'ফোল্ডার: ') + '<b>' + esc(a.folderName || (a.folder ? a.folder : L('not set', 'সেট করা নেই'))) + '</b>' + (a.folder ? ' <a target="_blank" rel="noopener" class="text-pink-600 hover:underline" href="https://drive.google.com/drive/folders/' + esc(a.folder) + '">' + L('open', 'খুলুন') + ' ↗</a>' : '') + '</div><div>' + L('Last backup: ', 'শেষ ব্যাকআপ: ') + '<b>' + tm(a.last) + '</b>' + (a.lastUrl ? ' <a target="_blank" rel="noopener" class="text-pink-600 hover:underline" href="' + esc(a.lastUrl) + '">' + esc(a.lastFile || '') + ' ↗</a>' : '') + '</div><div>' + L('Last check: ', 'শেষ চেক: ') + tm(a.lastRun) + '</div><div>' + L('Keep: ', 'রাখা হবে: ') + (a.prune ? (a.keep || 7) + L(' days (older → Drive Trash)', ' দিন (পুরোনো → ড্রাইভের ট্র্যাশে)') : L('all (no auto delete)', 'সব (অটো ডিলিট বন্ধ)')) + '</div></div>' +
    (a.lastErr ? '<div class="mt-1.5 text-[11px] font-semibold text-rose-600">⚠ ' + esc(a.lastErr) + '</div>' : '') + (a.err ? '<div class="mt-1.5 text-[11px] font-semibold text-rose-600">⚠ ' + esc(a.err) + '</div>' : '') + '</div>';
  var sw = function (key, on, t, sub) { return '<label class="flex items-start gap-2 rounded-xl border px-3 py-2 cursor-pointer text-xs ' + (on ? 'border-pink-400 bg-pink-50 dark:bg-pink-950/40' : 'border-slate-200 dark:border-slate-700') + '"><input type="checkbox" data-ab="' + key + '"' + (on ? ' checked' : '') + ' class="mt-0.5"><span><b>' + t + '</b>' + (sub ? '<br><span class="text-[10px] text-slate-500">' + sub + '</span>' : '') + '</span></label>'; };
  var hours = ''; for (var h = 0; h < 24; h++) hours += '<option value="' + h + '"' + (n(d.hour) === h ? ' selected' : '') + '>' + pad(h) + ':00</option>';
  return '<div class="' + CARD + '"><div class="text-xs font-bold mb-1">' + L('Auto Backup to Google Drive (JSON)', 'গুগল ড্রাইভে অটো ব্যাকআপ (JSON)') + '</div><p class="text-[11px] text-slate-500 mb-3">' + L('Everything is backed up: all projects and entries, all settings (PINs, logo, signatures…), recovery email/phone and the Activity Log. Each backup is one JSON file in your Drive folder and can be restored from the Restore tab.', 'সব কিছুর ব্যাকআপ হবে: সব প্রজেক্ট ও এন্ট্রি, সব সেটিংস (পিন, লোগো, সিগনেচার…), রিকভারি ইমেইল/মোবাইল এবং অ্যাক্টিভিটি লগ। প্রতিটি ব্যাকআপ ড্রাইভ ফোল্ডারে একটি JSON ফাইল — রিস্টোর ট্যাব থেকে ফেরত আনা যাবে।') + '</p>' + status +
    '<div class="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2"><div class="sm:col-span-2"><label class="' + LBL + '">' + L('Google Drive folder link', 'গুগল ড্রাইভ ফোল্ডারের লিংক') + (a.folder ? ' <span class="text-slate-400">' + L('(leave empty to keep the current folder)', '(খালি রাখলে আগের ফোল্ডারই থাকবে)') + '</span>' : '') + '</label><input data-ab="folder" value="' + esc(d.folder) + '" placeholder="https://drive.google.com/drive/folders/XXXXXXXX" class="' + INP + ' font-mono"></div>' +
    '<div><label class="' + LBL + '">' + L('How often', 'কত সময় পর পর') + '</label><select data-ab="every" class="' + INP + '">' + AB_OPTS.map(function (o) { return '<option value="' + o[0] + '"' + (d.every === o[0] ? ' selected' : '') + '>' + L(o[1], o[2]) + '</option>'; }).join('') + '</select></div>' +
    (d.every === 'd1' ? '<div><label class="' + LBL + '">' + L('At what time (approx.)', 'কখন (আনুমানিক)') + '</label><select data-ab="hour" class="' + INP + '">' + hours + '</select></div>' : '<div></div>') +
    '<div><label class="' + LBL + '">' + L('Keep backups of the last … days', 'শেষ কত দিনের ব্যাকআপ রাখবে') + '</label><input data-ab="keep" type="number" min="1" max="365" value="' + esc(d.keep) + '" class="' + INP + '"></div></div>' +
    '<div class="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">' + sw('on', d.on, L('Auto backup ON', 'অটো ব্যাকআপ চালু'), L('Turn off any time', 'যেকোনো সময় বন্ধ করা যাবে')) + sw('prune', d.prune, L('Delete older backups', 'পুরোনো ব্যাকআপ ডিলিট'), L('Older than the days above go to Drive Trash', 'উপরের দিনের চেয়ে পুরোনো ফাইল ড্রাইভের ট্র্যাশে যাবে')) + sw('skip', d.skip, L('Skip if nothing changed', 'কিছু না বদলালে বাদ'), L('No new file when no data changed — saves Drive space', 'ডাটা না বদলালে নতুন ফাইল হবে না — জায়গা বাঁচে')) + '</div>' +
    '<div class="grid grid-cols-1 sm:grid-cols-3 gap-2"><input id="abpin" type="password" inputmode="numeric" maxlength="8" autocomplete="off" placeholder="' + L('Admin PIN', 'অ্যাডমিন পিন') + '" class="' + INP + ' font-mono"><button type="button" data-a="absave" class="' + BTN_P + ' justify-center">' + ic('check', 'w-4 h-4') + '<span>' + L('Save schedule', 'শিডিউল সেভ করুন') + '</span></button><button type="button" data-a="abnow" class="' + BTN_G + ' justify-center">' + ic('up', 'w-4 h-4') + '<span>' + L('Back up now', 'এখনই ব্যাকআপ') + '</span></button></div>' +
    '<p class="text-[10px] text-slate-400 mt-2">' + L('The folder must belong to (or be shared as Editor with) the Google account that owns this sheet. The schedule runs on Google’s servers even when no one has the app open.', 'ফোল্ডারটি অবশ্যই শিটের মালিকের গুগল অ্যাকাউন্টের হতে হবে (অথবা Editor হিসেবে শেয়ার করা)। অ্যাপ বন্ধ থাকলেও গুগলের সার্ভারে নিজে নিজে ব্যাকআপ চলবে।') + '</p></div>';
}
/* ---------- Admin actions ---------- */
function bkScope() {
  var b = S.bk, f = '', t = '';
  if (b.scope === 'year') { f = b.year + '-01-01'; t = b.year + '-12-31'; }
  else if (b.scope === 'month') { f = b.month + '-01'; t = b.month + '-31'; }
  else if (b.scope === 'range') { f = b.from || '0000-00-00'; t = b.to || '9999-99-99'; }
  else if (b.scope === 'day') { f = t = b.day; }
  return { type: b.scope, from: f, to: t };
}
/* ব্যাকআপে বিল ও মেজারমেন্ট: বাছাই করা সময়ের (তারিখ অনুযায়ী) বিল/মেজারমেন্ট আর তাদের পুরো কনটেন্ট; সেটিংস সবসময় */
function billFilter(bs, inr) {
  if (!bs || !bs.BL_Index || !bs.BL_Index.length) return 0;
  var h = bs.BL_Index[0], di = h.indexOf('Date'), keep = {};
  bs.BL_Index = [h].concat(bs.BL_Index.slice(1).filter(function (r) { var ok = r[0] !== '' && inr(String(r[di] || '').slice(0, 10)); if (ok) keep[r[0]] = 1; return ok; }));
  if (bs.BL_Data && bs.BL_Data.length) bs.BL_Data = [bs.BL_Data[0]].concat(bs.BL_Data.slice(1).filter(function (r) { return keep[r[0]]; }));
  return bs.BL_Index.length - 1;
}
function billCount(bs) { return bs && bs.BL_Index ? Math.max(0, bs.BL_Index.length - 1) : 0; }
function doBackup() {
  var pin = $('#bkpin').value; if (!pin) return toast(L('Enter admin PIN', 'অ্যাডমিন পিন দিন'), 'error');
  var sc = bkScope();
  if (sc.type === 'range' && (!S.bk.from || !S.bk.to)) return toast(L('Choose both dates', 'দুটি তারিখই দিন'), 'error');
  srv('exportAll', pin).then(function (o) {
    var inr = function (d) { return sc.type === 'all' || ((d || '') >= sc.from && (d || '') <= sc.to); }, cnt = 0;
    o.scope = sc; COLS.forEach(function (c) { if (c !== 'projects') { o.data[c] = (o.data[c] || []).filter(function (x) { return inr(x.date); }); cnt += o.data[c].length; } });
    var nb = billFilter(o.billSheets, inr);
    var tag = sc.type === 'all' ? 'lifetime' : sc.type === 'day' ? sc.from : sc.type === 'month' ? S.bk.month : sc.type === 'year' ? S.bk.year : sc.from + '_to_' + sc.to;
    dl('SCS_Projects_Backup_' + tag + '_' + todayStr() + '.json', JSON.stringify(o, null, 2));
    if (sc.type === 'all') { S.backupDone = true; ss('bk', '1'); }
    render(); toast(L('Backup downloaded: ', 'ব্যাকআপ ডাউনলোড হয়েছে: ') + o.data.projects.length + ' ' + L('projects', 'প্রজেক্ট') + ', ' + cnt + ' ' + L('records', 'রেকর্ড') + ', ' + nb + ' ' + L('bills & measurements', 'বিল ও মেজারমেন্ট'));
  }).catch(function (e) { toast(e.message, 'error'); });
}
function rsCheck() { var go = $('#rsgo'); if (go) go.disabled = !(S.rs && $('#rspin').value.length >= 4); }
function rzCheck() { var go = $('#rzgo'); if (go) go.disabled = !($('#rztype').value === 'RESET' && $('#rzpin').value.length >= 4); }

function needEdit(fn) {
  if (S.edit) return fn && fn();
  if (C.editPin === 'false') { S.edit = true; render(); toast(L('Edit Mode is ON', 'এডিট মোড চালু হয়েছে')); if (fn) fn(); return; }
  modal(mHead(L('Enable Edit Mode', 'এডিট মোড চালু করুন')) + '<p class="text-xs text-slate-500 mb-3">' + L('Adding, editing and deleting need Edit Mode. Enter your PIN to continue.', 'অ্যাড, এডিট ও ডিলিট করতে এডিট মোড লাগবে। চালু করতে পিন দিন।') + '</p><input id="gatepin" type="password" inputmode="numeric" maxlength="8" autocomplete="off" class="' + INP + ' font-mono mb-3" placeholder="PIN"><div class="flex justify-end gap-2"><button type="button" data-a="mclose" class="' + BTN_S + '">' + L('Cancel', 'বাতিল') + '</button><button type="button" id="gateok" class="' + BTN_P + '">' + L('Enable', 'চালু করুন') + '</button></div>');
  var run = function (quiet) { return srv('loginCheck', $('#gatepin').value).then(function (r) { if (r) { S.edit = true; closeModal(); render(); toast(L('Edit Mode is ON', 'এডিট মোড চালু হয়েছে')); if (fn) fn(); } else if (!quiet) toast(L('Incorrect PIN!', 'ভুল পিন!'), 'error'); }).catch(function (e) { toast(e.message, 'error'); }); };
  gateWire(run);
}
function manageProjects() {
  var rows = D.projects.slice().sort(function (a, b) { return String(a.name || '').toLowerCase().localeCompare(String(b.name || '').toLowerCase()); }).map(function (p, i) { return '<div class="flex items-center justify-between gap-2 py-1.5 border-b border-slate-100 dark:border-slate-800"><div class="min-w-0"><div class="text-xs font-bold truncate">' + (i + 1) + '. ' + esc(p.name) + '</div><div class="text-[11px] text-slate-500 truncate">' + esc(p.client) + '</div></div><div class="flex gap-1 shrink-0"><button type="button" data-a="editp" data-id="' + p.id + '" class="' + BTN_S + '">' + ic('edit', 'w-3.5 h-3.5') + '<span>Edit</span></button><button type="button" data-a="delp" data-id="' + p.id + '" class="' + BTN_S + ' text-rose-600">' + ic('trash', 'w-3.5 h-3.5') + '<span>Delete</span></button></div></div>'; }).join('') || '<p class="text-xs text-slate-400">' + L('No projects', 'কোনো প্রজেক্ট নেই') + '</p>';
  var cos = xCompanies().filter(Boolean), coRows = cos.map(function (c) { var k = D.projects.filter(function (p) { return coName(p) === c; }).length; return '<div class="flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900 text-xs">' + ic('folder', 'w-3.5 h-3.5 text-amber-600') + '<b>' + esc(c) + '</b><span class="text-[10px] text-slate-500">(' + k + ')</span><button type="button" data-a="coren" data-v="' + esc(c) + '" title="' + L('Rename', 'নাম এডিট') + '" class="p-0.5 rounded hover:bg-amber-100 text-amber-700 cursor-pointer">' + ic('edit', 'w-3 h-3') + '</button></div>'; }).join('');
  modal(mHead(L('Manage Projects', 'প্রজেক্ট ম্যানেজ')) + (coRows ? '<div class="text-[11px] font-bold text-slate-500 mb-1">' + L('Companies', 'কোম্পানি') + '</div><div class="flex flex-wrap gap-1.5 mb-3">' + coRows + '</div>' : '') + '<div class="text-[11px] font-bold text-slate-500 mb-1">' + L('Projects', 'প্রজেক্ট') + '</div><p class="text-[11px] text-slate-500 mb-2">' + L('Editing or deleting a project always asks for a PIN.', 'প্রজেক্ট এডিট বা ডিলিট করতে সবসময় পিন লাগবে।') + '</p>' + rows, true);
}
/* ---------- Entry chooser & forms ---------- */
var pidSel = function (cur0) { return '<select name="pid" class="' + INP + '">' + D.projects.map(function (p) { return '<option value="' + p.id + '"' + ((cur0 || S.pid) === p.id ? ' selected' : '') + '>' + esc(p.name) + '</option>'; }).join('') + '</select>'; };
var btnRow = function () { return '<div class="col-span-2 flex justify-end gap-2 pt-1"><button type="button" data-a="mclose" class="' + BTN_S + '">' + L('Cancel', 'বাতিল') + '</button><button type="submit" class="' + BTN_P + '">' + ic('check', 'w-3.5 h-3.5') + '<span>' + L('Save', 'সংরক্ষণ') + '</span></button></div></form>'; };
var fhead = function (coll, x, tNew, tEdit, tb) { return mHead(x.id ? tEdit : tNew) + '<form id="mf" class="grid grid-cols-2 gap-3" data-c="' + coll + '" data-id="' + esc(x.id || '') + '">'; };
var dlist = function (id, arr) { return '<datalist id="' + id + '">' + arr.map(function (v) { return '<option value="' + esc(v) + '">'; }).join('') + '</datalist>'; };
var uniq = function (coll, key) { var o = {}; D[coll].forEach(function (x) { if (x[key]) o[x[key]] = 1; }); return Object.keys(o); };
var tot = function (id, v) { return '<div class="col-span-2 flex items-center justify-between rounded-xl bg-slate-100 dark:bg-slate-800 px-3 py-2 text-xs font-bold"><span>' + id + '</span><span id="etot" class="font-mono text-rose-600 text-sm">' + money(v) + '</span></div>'; };
function laborForm(x) {
  if (x) {
    modal(fhead('labor', x, '', L('Edit Labor', 'লেবার এডিট')) + fld(L('Project *', 'প্রজেক্ট *'), pidSel(x.pid)) + fld(L('Date *', 'তারিখ *'), inp('date', x.date, 'date')) + fld(L('Labor quantity', 'লেবার সংখ্যা'), numi('count', x.count)) + fld(L('Total amount (' + cur() + ')', 'মোট টাকা (' + cur() + ')'), numi('amount', x.amount)) + fld(L('Note', 'নোট'), inp('note', x.note), 'col-span-2') + tot(L('Labor expense', 'লেবার খরচ'), n(x.amount)) + btnRow());
    return;
  }
  var t = new Date(); S.cal = { y: t.getFullYear(), m: t.getMonth(), sel: [S.day || todayStr()] }; S.lov = {}; S.lav = {}; S.lta = {}; S.lda = {};
  modal(fhead('labor', {}, L('Add Labor + TA / DA', 'লেবার + টিএ / ডিএ যোগ'), '') + fld(L('Project *', 'প্রজেক্ট *'), pidSel(S.pid), 'col-span-2') +
    '<div class="col-span-2"><label class="' + LBL + '">' + L('Days (click to select one or many)', 'দিন (একটি বা একাধিক দিনে ক্লিক করুন)') + '</label><div id="cal" class="rounded-xl border border-slate-200 dark:border-slate-700 p-2">' + calHtml() + '</div></div>' +
    '<div class="col-span-2 rounded-xl border border-sky-200 bg-sky-50/60 dark:bg-sky-950/20 dark:border-sky-900 p-2.5"><div class="text-[11px] font-bold text-sky-800 dark:text-sky-300 mb-1.5">' + ic('users', 'w-3.5 h-3.5 inline') + ' ' + L('Labor (per day)', 'লেবার (প্রতিদিন)') + '</div><div class="grid grid-cols-2 gap-2">' + fld(L('Labor quantity', 'লেবার সংখ্যা'), numi('count', '')) + fld(L('Total amount (' + cur() + ')', 'মোট টাকা (' + cur() + ')'), numi('amount', '')) + '</div></div>' +
    '<div class="col-span-2 rounded-xl border border-amber-200 bg-amber-50/60 dark:bg-amber-950/20 dark:border-amber-900 p-2.5"><div class="text-[11px] font-bold text-amber-800 dark:text-amber-300 mb-1.5">' + ic('wallet', 'w-3.5 h-3.5 inline') + ' ' + L('TA / DA (per day, optional)', 'টিএ / ডিএ (প্রতিদিন, ঐচ্ছিক)') + '</div><div class="grid grid-cols-2 gap-2">' + fld(L('TA — worker / public transport', 'টিএ — শ্রমিক / পাবলিক যাতায়াত'), numi('ta', '')) + fld(L('DA — daily allowance', 'ডিএ — দৈনিক ভাতা'), numi('da', '')) + '</div></div>' +
    '<div id="csel" class="col-span-2">' + selHtml() + '</div>' + fld(L('Note', 'নোট'), inp('note', ''), 'col-span-2') + tot(L('Total (labor + TA + DA)', 'মোট (লেবার + টিএ + ডিএ)'), 0) + btnRow(), true);
  laborTot();
}
function subForm(x) {
  x = x || { date: S.day || todayStr(), unit: 'sq ft' };
  modal(fhead('subs', x, L('Add Subcontractor Work', 'সাবকন্ট্রাক্টরের কাজ যোগ'), L('Edit Subcontractor Work', 'সাবকন্ট্রাক্টরের কাজ এডিট')) + fld(L('Project *', 'প্রজেক্ট *'), pidSel(x.pid)) + fld(L('Date *', 'তারিখ *'), inp('date', x.date, 'date')) +
    fld(L('Subcontractor name *', 'সাবকন্ট্রাক্টরের নাম *'), inp('sub', x.sub, 'text', '', 'list="dl-sub"') + dlist('dl-sub', uniq('subs', 'sub').concat(uniq('subpays', 'sub')))) + fld(L('Work description', 'কাজের বিবরণ'), inp('work', x.work)) +
    fld(L('Quantity', 'পরিমাণ'), triInp('qty', x.qty, 'q')) + fld(L('Unit (editable)', 'ইউনিট (পরিবর্তনযোগ্য)'), inp('unit', x.unit, 'text', 'sq ft', 'list="dl-unit"') + dlist('dl-unit', ['sq ft', 'sq m', 'rft', 'running m', 'pcs', 'day', 'lump sum'])) +
    fld(L('Rate per unit (' + cur() + ')', 'প্রতি ইউনিটের রেট (' + cur() + ')'), triInp('rate', x.rate, 'r')) + fld(L('Bill amount (' + cur() + ')', 'বিলের টাকা (' + cur() + ')'), triInp('amount', x.id ? subAmt(x) : '', 'a')) + triNote() + fld(L('Note', 'নোট'), inp('note', x.note), 'col-span-2') + tot(L('Bill amount', 'বিলের টাকা'), x.id ? subAmt(x) : 0) + btnRow());
}
function subPayForm(x) {
  x = x || { date: S.day || todayStr() };
  var names = uniq('subs', 'sub'); if (!names.length) return toast(L('Add subcontractor work first', 'আগে সাবকন্ট্রাক্টরের কাজ যোগ করুন'), 'error');
  modal(fhead('subpays', x, L('Pay Subcontractor', 'সাবকন্ট্রাক্টরকে পেমেন্ট'), L('Edit Payment', 'পেমেন্ট এডিট')) + fld(L('Project *', 'প্রজেক্ট *'), pidSel(x.pid)) + fld(L('Date *', 'তারিখ *'), inp('date', x.date, 'date')) +
    fld(L('Subcontractor *', 'সাবকন্ট্রাক্টর *'), '<select name="sub" class="' + INP + '">' + names.map(function (k) { return '<option value="' + esc(k) + '"' + (x.sub === k ? ' selected' : '') + '>' + esc(k) + '</option>'; }).join('') + '</select>', 'col-span-2') +
    '<div id="sinfo" class="col-span-2 grid grid-cols-3 gap-2"></div>' + fld(L('Amount to pay now *', 'এখন যত টাকা দেবেন *'), numi('amount', x.amount)) + '<div class="flex items-end"><button type="button" data-a="payfull" class="' + BTN_S + '">' + L('Pay full due', 'পুরো বাকি দিন') + '</button></div>' + fld(L('Note', 'নোট'), inp('note', x.note), 'col-span-2') + btnRow());
  subInfo();
}
function chemForm(x) {
  if (x) {
    modal(fhead('chems', x, '', L('Edit Chemical', 'কেমিক্যাল এডিট')) + fld(L('Project *', 'প্রজেক্ট *'), pidSel(x.pid)) + fld(L('Date *', 'তারিখ *'), inp('date', x.date, 'date')) + fld(L('Chemical name *', 'কেমিক্যালের নাম *'), inp('name', x.name, 'text', '', 'list="dl-chem"') + dlist('dl-chem', uniq('chems', 'name')), 'col-span-2') + fld(L('Quantity', 'পরিমাণ'), triInp('qty', x.qty, 'q')) + fld(L('Unit', 'ইউনিট'), inp('unit', x.unit)) + fld(L('Rate per unit (' + cur() + ')', 'প্রতি ইউনিটের রেট (' + cur() + ')'), triInp('rate', x.rate, 'r')) + fld(L('Total amount — direct (' + cur() + ')', 'মোট টাকা — সরাসরি (' + cur() + ')'), triInp('amount', chemAmt(x), 'a')) + fld(L('Note', 'নোট'), inp('note', x.note), 'col-span-2') + triNote() + tot(L('Chemical amount', 'কেমিক্যালের টাকা'), chemAmt(x)) + btnRow());
    return;
  }
  modal(fhead('chems', {}, L('Add Chemicals', 'কেমিক্যাল যোগ'), '') + fld(L('Project *', 'প্রজেক্ট *'), pidSel(S.pid)) + fld(L('Date *', 'তারিখ *'), inp('date', S.day || todayStr(), 'date')) +
    '<div class="col-span-2"><div class="grid grid-cols-12 gap-1.5 text-[10px] font-bold text-slate-500 mb-1"><div class="col-span-3">' + L('Chemical', 'কেমিক্যাল') + '</div><div class="col-span-2">' + L('Qty', 'পরিমাণ') + '</div><div class="col-span-2">' + L('Unit', 'ইউনিট') + '</div><div class="col-span-2">' + L('Rate', 'রেট') + '</div><div class="col-span-2">' + L('Amount ✎', 'টাকা ✎') + '</div><div class="col-span-1"></div></div><p class="text-[10px] text-slate-500 mb-1.5">' + L('Fill any two of Qty, Rate and Amount — the third fills itself. Or type only the Amount.', 'পরিমাণ, রেট ও টাকা — যেকোনো দুটি দিলে তৃতীয়টি নিজে বসবে। অথবা শুধু টাকা লিখুন।') + '</p><div id="crows" class="space-y-1.5">' + chemRow() + chemRow() + '</div>' + dlist('dl-chem', uniq('chems', 'name')) + '<button type="button" data-a="addrow" class="' + BTN_S + ' mt-2">' + ic('plus', 'w-3.5 h-3.5') + '<span>' + L('Add another chemical', 'আরেকটি কেমিক্যাল যোগ') + '</span></button></div>' + fld(L('Note', 'নোট'), inp('note', ''), 'col-span-2') + tot(L('Total chemical cost', 'মোট কেমিক্যাল খরচ'), 0) + btnRow(), true);
}
function costForm(x) {
  x = x || { date: S.day || todayStr() };
  modal(fhead('entries', x, L('Add TA / DA / Goods Transport / Other', 'টিএ / ডিএ / গুডস ট্রান্সপোর্ট / অন্যান্য যোগ'), L('Edit Daily Cost', 'দৈনিক খরচ এডিট')) + fld(L('Project *', 'প্রজেক্ট *'), pidSel(x.pid)) + fld(L('Date *', 'তারিখ *'), inp('date', x.date, 'date')) +
    fld(L('TA — worker / public transport fare', 'টিএ — শ্রমিক / পাবলিক যাতায়াত ভাড়া'), numi('ta', x.ta)) + fld(L('DA — Daily Allowance', 'ডিএ — ডেইলি অ্যালাউন্স'), numi('da', x.da)) +
    fld(L('Goods Transport — material carrying', 'গুডস ট্রান্সপোর্ট — মালামাল পরিবহন'), numi('transport', x.transport)) + fld(L('Other cost', 'অন্যান্য খরচ'), numi('other', x.other)) + fld(L('Note (purpose of other cost)', 'নোট (অন্যান্য খরচের কারণ)'), inp('note', x.note), 'col-span-2') + tot(L('Total of the day', 'দিনের মোট খরচ'), n(x.ta) + n(x.da) + n(x.transport) + n(x.other)) + btnRow());
}
function saveMany(coll, list) {
  S.logCache = null;
  var keys = list.map(function (o) { D[coll].push(o); var k = coll + '|' + o.id; outbox[k] = { c: coll, o: o }; return k; }); render();
  var clr = function () { keys.forEach(function (k) { delete outbox[k]; }); };
  return track(srv('saveRecords', coll, JSON.stringify(list), S.role)).then(function () { clr(); toast(list.length + ' ' + L('entries saved', 'টি এন্ট্রি সংরক্ষিত হয়েছে')); }).catch(function (e) { clr(); toast(e.message, 'error'); load(true); });
}
function migrate() {
  var legacy = D.entries.filter(function (e) { return 'laborAmt' in e || 'chemAmt' in e; });
  if (!legacy.length) return;
  legacy.forEach(function (e) {
    if (n(e.labors) || n(e.laborAmt)) { var l = { id: uid('l'), pid: e.pid, date: e.date, count: n(e.labors), amount: n(e.laborAmt), note: e.note || '' }; D.labor.push(l); srv('saveRecord', 'labor', JSON.stringify(l)); }
    if (n(e.chemAmt) || n(e.chemQty)) { var q = n(e.chemQty), c = { id: uid('c'), pid: e.pid, date: e.date, name: 'Chemical', unit: e.chemUnit || '', qty: q || 1, rate: q ? n(e.chemAmt) / q : n(e.chemAmt), note: e.note || '' }; D.chems.push(c); srv('saveRecord', 'chems', JSON.stringify(c)); }
    var k = { id: e.id, pid: e.pid, date: e.date, ta: n(e.ta), da: n(e.da), transport: n(e.transport), other: n(e.other), note: e.note || '' };
    D.entries[D.entries.indexOf(e)] = k; srv('saveRecord', 'entries', JSON.stringify(k));
  });
}
function perMatch() {
  if (S.per === 'day') { var d = todayStr(); return function (x) { return x === d; }; }
  if (S.per === 'date') return function (x) { return x === S.pdate; };
  if (S.per === 'month') return function (x) { return (x || '').indexOf(S.pmonth) === 0; };
  return function () { return true; };
}
function perLabel() { return S.per === 'life' ? L('Lifetime', 'লাইফটাইম') : S.per === 'day' ? L('Today', 'আজ') + ' (' + todayStr() + ')' : S.per === 'date' ? S.pdate : S.pmonth; }
function ledger(pid, m) {
  var R = [], f = function (x) { return x.pid === pid && m(x.date); };
  var bal = {}, run = 0; D.bills.filter(function (b) { return b.pid === pid; }).sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : (a.kind === 'payment' ? 1 : 0) - (b.kind === 'payment' ? 1 : 0); }).forEach(function (b) { run += b.kind === 'payment' ? -n(b.amount) : n(b.amount) - n(b.vat) - n(b.tax) - n(b.ait); bal[b.id] = run; });
  var sbal = {}, srun = {}, sl = D.subs.filter(function (x) { return x.pid === pid; }).map(function (x) { return { x: x, v: subAmt(x), o: 0 }; }).concat(D.subpays.filter(function (x) { return x.pid === pid; }).map(function (x) { return { x: x, v: -n(x.amount), o: 1 }; }));
  sl.sort(function (a, b) { return a.x.date < b.x.date ? -1 : a.x.date > b.x.date ? 1 : a.o - b.o; }).forEach(function (r) { var k = r.x.sub || ''; srun[k] = (srun[k] || 0) + r.v; sbal[r.x.id] = srun[k]; });
  D.labor.forEach(function (x) { if (f(x)) R.push({ d: x.date, o: 1, k: 'labor', c: 'labor', id: x.id, lq: n(x.count), lr: n(x.rate) || (n(x.count) ? n(x.amount) / n(x.count) : 0), la: n(x.amount), desc: L('Labor', 'লেবার') + ' × ' + fmt(x.count), amt: n(x.amount), note: x.note }); });
  D.subs.forEach(function (x) { if (f(x)) { var b = subAmt(x); R.push({ d: x.date, o: 2, k: 'subs', c: 'subs', id: x.id, sname: x.sub, sd: sbal[x.id], sdesc: x.sub + (x.work ? ' — ' + x.work : ''), sq: n(x.qty) ? fmt(x.qty) + ' ' + (x.unit || '') : '', sr: n(x.qty) ? n(x.rate) : 0, sb: b, desc: x.sub + (x.work ? ' — ' + x.work : ''), amt: b, note: x.note }); } });
  D.subpays.forEach(function (x) { if (f(x)) R.push({ d: x.date, o: 3, k: 'subpays', c: 'subpays', id: x.id, sname: x.sub, sd: sbal[x.id], sdesc: x.sub + ' (' + L('payment', 'পেমেন্ট') + ')', sp: n(x.amount), desc: x.sub, amt: n(x.amount), note: x.note }); });
  D.chems.forEach(function (x) { if (f(x)) { var a = chemAmt(x); R.push({ d: x.date, o: 4, k: 'chems', c: 'chems', id: x.id, cn: x.name, cq: n(x.qty) ? fmt(x.qty) + ' ' + (x.unit || '') : '', cr: n(x.qty) ? n(x.rate) : 0, ca: a, desc: chemDesc(x), amt: a, note: x.note }); } });
  D.entries.forEach(function (x) { if (!f(x)) return; var t = n(x.ta) + n(x.da) + n(x.transport) + n(x.other) + n(x.commission), cm = n(x.commission) && !(n(x.ta) || n(x.da) || n(x.transport) || n(x.other)); var ps = []; [['TA', 'ta'], ['DA', 'da'], [L('Goods Transport', 'গুডস ট্রান্সপোর্ট'), 'transport'], [L('Other', 'অন্যান্য'), 'other'], [L('Commission', 'কমিশন'), 'commission']].forEach(function (a) { if (n(x[a[1]])) ps.push(a[0] + ' ' + fmt(x[a[1]])); }); R.push({ d: x.date, o: cm ? 6 : 5, k: cm ? 'comm' : 'entries', c: 'entries', id: x.id, ta: n(x.ta), da: n(x.da), tr: n(x.transport), ot: n(x.other), cm: n(x.commission), desc: ps.join(' · '), amt: t, note: (x.eng ? x.eng + (x.note ? ' · ' : '') : '') + (x.note || '') }); });
  D.bills.forEach(function (b) { if (!f(b)) return; var pay = b.kind === 'payment'; R.push({ d: b.date, o: pay ? 8 : 7, k: pay ? 'pay' : 'bill', c: 'bills', id: b.id, bill: pay ? 0 : n(b.amount), coll: pay ? n(b.amount) : 0, ncoll: pay ? n(b.amount) - n(b.vat) - n(b.tax) - n(b.ait) : 0, vat: n(b.vat) + n(b.tax) + n(b.ait), bal: bal[b.id], desc: pay ? L('Received from company', 'কোম্পানি থেকে প্রাপ্ত') : L('Bill raised', 'বিল করা হয়েছে'), amt: n(b.amount), note: b.note }); });
  R.forEach(function (r) { r.te = n(r.la) + n(r.sb) + n(r.ca) + n(r.ta) + n(r.da) + n(r.tr) + n(r.ot) + n(r.cm); });
  return R.sort(function (a, b) { return a.d < b.d ? -1 : a.d > b.d ? 1 : a.o - b.o; });
}
var pending = 0, lastSig = '', lastOk = 0, loadP = null, outbox = {};
function setSync(on) { S.syncing = on; [].forEach.call(document.querySelectorAll('[data-a=sync] svg'), function (s) { s.classList.toggle('animate-spin', on); }); }
function updSync() {
  var el = $('#syncinfo'); if (!el) return;
  var ok = !S.err && lastOk && (Date.now() - lastOk) < 45000, t = lastOk ? new Date(lastOk) : null;
  el.innerHTML = '<span class="w-1.5 h-1.5 rounded-full ' + (S.err ? 'bg-rose-300' : ok ? 'bg-emerald-300 animate-pulse' : 'bg-amber-300') + '"></span><span>' + (S.err ? L('Offline', 'অফলাইন') : L('Live', 'লাইভ')) + (t ? ' · ' + pad(t.getHours()) + ':' + pad(t.getMinutes()) + ':' + pad(t.getSeconds()) : '') + '</span>';
}
function cacheSet(d) { try { sessionStorage.setItem('scs_pj_cache', JSON.stringify(d)); } catch (e) {} }
function applyData(d) {
  var sig = JSON.stringify(d); COLS.forEach(function (c) { D[c] = d[c] || []; });
  var st = d.settings || {}; Object.keys(st).forEach(function (k) { C[k] = st[k]; });
  S.bad = d.bad || [];
  var ob = Object.keys(outbox);
  ob.forEach(function (k) { var it = outbox[k], arr = D[it.c];
    if (it.del) { D[it.c] = arr.filter(function (x) { return x.id !== it.del; }); if (it.c === 'projects') COLS.forEach(function (c2) { if (c2 !== 'projects') D[c2] = D[c2].filter(function (x) { return x.pid !== it.del; }); }); }
    else { var i = arr.findIndex(function (x) { return x.id === it.o.id; }); if (i < 0) arr.push(it.o); else arr[i] = it.o; } });
  migrate(); var ch = sig !== lastSig || ob.length > 0; lastSig = sig; return ch;
}
function poll() {
  if (!S.role || document.hidden || pending > 0 || loadP) return;
  if (S.err) return load(true);
  pingNow().then(function (rev) { if (rev !== S.rev) load(true); else { lastOk = Date.now(); updSync(); } }).catch(function (e) { S.err = e.message; render(); });
}
function track(p) { pending++; return p.then(function (v) { pending--; if (!pending) setTimeout(poll, 700); return v; }, function (e) { pending--; throw e; }); }
function toLogoUrl(u) {
  u = (u || '').trim(); if (!u) return LOGO;
  var m = u.match(/\/d\/([a-zA-Z0-9_-]{10,})/) || u.match(/[?&]id=([a-zA-Z0-9_-]{10,})/);
  if (/drive\.google\.com|docs\.google\.com/.test(u) && m) return 'https://drive.google.com/thumbnail?id=' + m[1] + '&sz=w256';
  return u;
}
var logoSrc = function () { return toLogoUrl(C.logo); };
/* নোট — কোন বিষয়ের তা রঙ দেখে বোঝা যাবে */
function noteChip(k, note) { var cat = CATS[k] || ['Note', 'নোট']; return '<span class="pj-note pj-n-' + k + '"><b>' + L(cat[0], cat[1]) + ':</b> ' + esc(note) + '</span>'; }
var CATS = { labor: ['Labor', 'লেবার', 'bg-sky-100 text-sky-700 border-sky-200'], subs: ['Sub Work', 'সাব কাজ', 'bg-cyan-100 text-cyan-700 border-cyan-200'], subpays: ['Sub Payment', 'সাব পেমেন্ট', 'bg-teal-100 text-teal-700 border-teal-200'], chems: ['Chemical', 'কেমিক্যাল', 'bg-violet-100 text-violet-700 border-violet-200'], entries: ['TA/DA/Goods Tr./Other', 'টিএ/ডিএ/গুডস ট্রা./অন্যান্য', 'bg-amber-100 text-amber-700 border-amber-200'], comm: ['Eng. Commission', 'ইঞ্জিনিয়ার কমিশন', 'bg-pink-100 text-pink-700 border-pink-200'], bill: ['Bill', 'বিল', 'bg-blue-100 text-blue-700 border-blue-200'], pay: ['Collection', 'কালেকশন', 'bg-emerald-100 text-emerald-700 border-emerald-200'] };
/* পিন বক্স: সঠিক দৈর্ঘ্যে পৌঁছালেই নিজে নিজে যাচাই — এন্টার চাপতে হয় না */
var maxLen = function () { return Math.max.apply(null, S.lens.concat([4])); };
function gateWire(run) {
  var el = $('#gatepin'), ok = $('#gateok'), busy = false;
  var go = function (manual) {
    var v = el.value; if (busy || v.length < 4) return;
    var last = manual || v.length >= maxLen(); busy = true; el.classList.add('pj-busy'); if (ok) ok.disabled = true;
    run(!last).then(function () {}, function () {}).then(function () {
      busy = false; var e2 = $('#gatepin'); if (!e2) return;
      e2.classList.remove('pj-busy'); if (ok) ok.disabled = false;
      if (e2.value !== v) { if (S.lens.indexOf(e2.value.length) >= 0) go(); return; }
      if (last) { e2.value = ''; e2.classList.add('pj-shake'); setTimeout(function () { e2.classList.remove('pj-shake'); }, 450); }
    });
  };
  el.setAttribute('autocomplete', 'one-time-code');
  el.oninput = function () { el.value = el.value.replace(/\D/g, '').slice(0, 8); if (S.lens.indexOf(el.value.length) >= 0 || el.value.length >= 8) go(); };
  el.onkeydown = function (e) { if (e.key === 'Enter') go(true); };
  ok.onclick = function () { go(true); };
  el.focus();
}
function pinGate(fn, why) {
  var back = S.histOpen;
  modal(mHead(L('PIN required', 'পিন লাগবে')) + '<p class="text-xs text-slate-500 mb-3">' + (why || L('Enter your PIN to continue.', 'চালিয়ে যেতে পিন দিন।')) + '</p><input id="gatepin" type="password" inputmode="numeric" maxlength="8" autocomplete="off" class="' + INP + ' font-mono mb-3" placeholder="PIN"><div class="flex justify-end gap-2"><button type="button" data-a="' + (back ? 'hback' : 'mclose') + '" class="' + BTN_S + '">' + L('Cancel', 'বাতিল') + '</button><button type="button" id="gateok" class="' + BTN_P + '">' + L('Continue', 'এগিয়ে যান') + '</button></div>');
  var run = function (quiet) { var pv = $('#gatepin').value; return srv('loginCheck', pv).then(function (r) { if (r) { closeModal(); fn(pv); } else if (!quiet) toast(L('Incorrect PIN!', 'ভুল পিন!'), 'error'); }).catch(function (e) { toast(e.message, 'error'); }); };
  gateWire(run);
}
function entChooser() {
  var T = [['labor', 'Labor + TA / DA', 'লেবার + টিএ / ডিএ', 'users', 'bg-sky-600'], ['subs', 'Subcontractor Work', 'সাবকন্ট্রাক্টরের কাজ', 'truck', 'bg-cyan-600'], ['subpay', 'Subcontractor Payment', 'সাবকন্ট্রাক্টর পেমেন্ট', 'wallet', 'bg-teal-600'], ['chem', 'Chemicals', 'কেমিক্যাল', 'flask', 'bg-violet-600'], ['cost', 'TA / DA / Goods Transport / Other', 'টিএ / ডিএ / গুডস ট্রান্সপোর্ট / অন্যান্য', 'wallet', 'bg-amber-600'], ['comm', 'Engineer Commission', 'ইঞ্জিনিয়ার কমিশন', 'users', 'bg-pink-600'], ['bill', 'Bill (receivable)', 'বিল (প্রাপ্য)', 'bill', 'bg-blue-600'], ['coll', 'Collection (received)', 'কালেকশন (পাওয়া টাকা)', 'check', 'bg-emerald-600']];
  modal(mHead(L('Add Entry — choose purpose', 'অ্যাড এন্ট্রি — কোন কাজের এন্ট্রি?')) + '<div class="grid grid-cols-2 gap-2">' + T.map(function (t) { return '<button type="button" data-a="ent" data-v="' + t[0] + '" class="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-pink-400 hover:bg-pink-50 dark:hover:bg-slate-800 text-left cursor-pointer active:scale-95 transition-all"><span class="w-8 h-8 rounded-lg ' + t[4] + ' text-white flex items-center justify-center shrink-0">' + ic(t[3], 'w-4 h-4') + '</span><span class="text-xs font-bold">' + L(t[1], t[2]) + '</span></button>'; }).join('') + '</div>');
}
function hpMatch() { var h = S.hp; if (h.per === 'day') return function (d) { return d === h.day; }; if (h.per === 'month') return function (d) { return (d || '').indexOf(h.month) === 0; }; return function () { return true; }; }
function histModal(reset, day) {
  S.histOpen = true; S.retHist = false; var p = proj(S.pid); if (!p) return;
  if (reset) { var d0 = day || S.day || todayStr(); S.hp = { per: 'day', day: d0, month: d0.slice(0, 7) }; S.marks = {}; S.htab = 'list'; }
  var h = S.hp, tabs = [['list', 'Entries', 'এন্ট্রি', 'list'], ['log', 'Activity Log', 'অ্যাক্টিভিটি লগ', 'refresh']].map(function (t) { return '<button type="button" data-a="htab" data-v="' + t[0] + '" class="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold cursor-pointer ' + (S.htab === t[0] ? 'bg-pink-600 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800') + '">' + ic(t[3], 'w-3.5 h-3.5') + L(t[1], t[2]) + '</button>'; }).join('');
  var top = mHead(L('Entry History', 'এন্ট্রি হিস্ট্রি') + ' — ' + esc(p.name)) + '<p class="text-[10px] text-slate-500 -mt-2 mb-2">' + L('Only this project’s entries.', 'শুধু এই প্রজেক্টের এন্ট্রি।') + '</p>';
  var R = ledger(p.id, hpMatch()).filter(function (r) { return S.hf === 'all' || r.k === S.hf; }).reverse();
  var opts = '<option value="all">' + L('All types', 'সব ধরন') + '</option>' + Object.keys(CATS).map(function (k) { return '<option value="' + k + '"' + (S.hf === k ? ' selected' : '') + '>' + L(CATS[k][0], CATS[k][1]) + '</option>'; }).join('');
  var seg = [['day', 'Day', 'দিন'], ['month', 'Month', 'মাস'], ['life', 'Lifetime', 'লাইফটাইম']].map(function (x) { return '<button type="button" data-a="hper" data-v="' + x[0] + '" class="px-2 py-0.5 rounded-md text-[11px] font-bold cursor-pointer ' + (h.per === x[0] ? 'bg-pink-600 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800') + '">' + L(x[1], x[2]) + '</button>'; }).join('');
  var nav = function (inner) { return '<div class="flex items-center gap-1"><button type="button" data-a="hstep" data-v="-1" class="p-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">' + ic('cl', 'w-3.5 h-3.5') + '</button>' + inner + '<button type="button" data-a="hstep" data-v="1" class="p-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">' + ic('cr', 'w-3.5 h-3.5') + '</button></div>'; };
  var pick = h.per === 'day' ? nav('<input type="date" data-f="hday" value="' + h.day + '" class="p-1 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-xs">') + '<button type="button" data-a="htoday" class="text-[11px] font-bold text-pink-600 hover:underline cursor-pointer">' + L('Today', 'আজ') + '</button>' : h.per === 'month' ? nav('<input type="month" data-f="hmonth" value="' + h.month + '" class="p-1 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-xs">') : '';
  var mk = Object.keys(S.marks).length, allOn = R.length && R.every(function (r) { return S.marks[r.c + '|' + r.id]; }), tot = 0;
  var rows = R.map(function (r, i) {
    var key = r.c + '|' + r.id, on = !!S.marks[key]; tot += n(r.amt);
    return '<tr class="' + (on ? 'bg-rose-50 dark:bg-rose-950/30' : '') + '"><td class="' + TD + ' text-center"><input type="checkbox" data-mark="' + esc(key) + '"' + (on ? ' checked' : '') + ' class="w-4 h-4 cursor-pointer accent-rose-600"></td><td class="' + TD + ' text-center">' + (i + 1) + '</td><td class="' + TD + ' whitespace-nowrap">' + esc(r.d) + '</td><td class="' + TD + ' text-center"><span class="text-[10px] px-1.5 py-0.5 rounded-full font-bold border ' + CATS[r.k][2] + '">' + L(CATS[r.k][0], CATS[r.k][1]) + '</span></td><td class="' + TD + '">' + esc(r.desc) + (r.note ? ' ' + noteChip(r.k, r.note) : '') + '</td><td class="' + TDN + ' font-bold">' + fmt(r.amt) + '</td><td class="' + TD + ' text-center whitespace-nowrap"><button type="button" data-a="hed" data-c="' + r.c + '" data-id="' + r.id + '" title="' + L('Edit (PIN)', 'এডিট (পিন)') + '" class="p-1 rounded-lg hover:bg-amber-100 text-amber-700 cursor-pointer">' + ic('edit', 'w-3.5 h-3.5') + '</button><button type="button" data-a="hrm" data-c="' + r.c + '" data-id="' + r.id + '" title="' + L('Delete (PIN)', 'ডিলিট (পিন)') + '" class="p-1 rounded-lg hover:bg-rose-100 text-rose-600 cursor-pointer">' + ic('trash', 'w-3.5 h-3.5') + '</button></td></tr>';
  }).join('') || '<tr><td colspan="7" class="' + TD + ' text-center text-slate-400 py-6">' + L('No entries in this period', 'এই সময়ে কোনো এন্ট্রি নেই') + '</td></tr>';
  modal(top + '<div class="flex items-center flex-wrap gap-2 mb-2"><div class="flex items-center gap-0.5 p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">' + seg + '</div>' + pick + '<select data-f="hf" class="' + INP + ' max-w-[11rem] ml-auto">' + opts + '</select></div>' +
    '<div class="flex items-center justify-between gap-2 mb-2"><span class="text-[11px] text-slate-500">' + R.length + ' ' + L('entries (newest first) · total ', 'টি এন্ট্রি (নতুন আগে) · মোট ') + '<b class="font-mono">' + fmt(tot) + '</b></span><button type="button" id="hmdel" data-a="hmdel" ' + (mk ? '' : 'disabled') + ' class="' + BTN_D + '">' + ic('trash', 'w-3.5 h-3.5') + '<span>' + L('Delete marked', 'মার্ক করা ডিলিট') + ' (<span id="hmcnt">' + mk + '</span>)</span></button></div>' +
    '<div class="overflow-x-auto"><table class="w-full border-collapse text-xs print-table"><thead><tr class="bg-slate-800 text-white font-bold"><th class="' + TH + ' w-8"><input type="checkbox" id="hmall" title="' + L('Mark all', 'সব মার্ক') + '"' + (allOn ? ' checked' : '') + ' class="w-4 h-4 cursor-pointer accent-rose-600"></th><th class="' + TH + ' w-8">SL</th><th class="' + TH + ' text-left">' + L('Date', 'তারিখ') + '</th><th class="' + TH + '">' + L('Type', 'ধরন') + '</th><th class="' + TH + ' text-left">' + L('Details', 'বিবরণ') + '</th><th class="' + TH + ' text-right">' + L('Amount', 'টাকা') + '</th><th class="' + TH + '">' + L('Edit / Delete', 'এডিট / ডিলিট') + '</th></tr></thead><tbody>' + rows + '</tbody></table></div><p class="text-[10px] text-slate-400 mt-2">🔒 ' + L('Every edit and delete asks for the PIN and is recorded in Settings ⚙ → Activity Log.', 'প্রতিটি এডিট ও ডিলিটে পিন লাগবে এবং সেটিংস ⚙ → অ্যাক্টিভিটি লগে লেখা থাকবে।') + '</p>', true);
}
/* লগের রেকর্ড থেকে বিবরণ */
function recInfo(coll, o) {
  if (!o || typeof o !== 'object') return { k: '', desc: String(o || ''), amt: 0, d: '' };
  var r = { k: coll, desc: '', amt: 0, d: o.date || '' };
  if (coll === 'projects') { r.k = 'proj'; r.desc = o.name || ''; r.d = o.start || ''; }
  else if (coll === 'labor') { r.desc = L('Labor', 'লেবার') + ' × ' + fmt(o.count); r.amt = n(o.amount); }
  else if (coll === 'subs') { r.desc = (o.sub || '') + (o.work ? ' — ' + o.work : '') + (n(o.qty) ? ' ' + fmt(o.qty) + ' ' + (o.unit || '') : ''); r.amt = subAmt(o); }
  else if (coll === 'subpays') { r.desc = (o.sub || '') + ' (' + L('payment', 'পেমেন্ট') + ')'; r.amt = n(o.amount); }
  else if (coll === 'chems') { r.desc = chemDesc(o); r.amt = chemAmt(o); }
  else if (coll === 'entries') { var ps = []; [['TA', 'ta'], ['DA', 'da'], [L('Goods Transport', 'গুডস ট্রান্সপোর্ট'), 'transport'], [L('Other', 'অন্যান্য'), 'other'], [L('Commission', 'কমিশন'), 'commission']].forEach(function (a) { if (n(o[a[1]])) { ps.push(a[0] + ' ' + fmt(o[a[1]])); r.amt += n(o[a[1]]); } }); r.desc = ps.join(' · '); if (n(o.commission) && r.amt === n(o.commission)) r.k = 'comm'; }
  else if (coll === 'bills') { r.k = o.kind === 'payment' ? 'pay' : 'bill'; r.desc = o.kind === 'payment' ? L('Collection', 'কালেকশন') : L('Bill', 'বিল'); r.amt = n(o.amount); }
  if (o.note) r.desc += ' — ' + o.note;
  return r;
}
var ACTS = { add: ['Added', 'যোগ', 'bg-emerald-100 text-emerald-700 border-emerald-200'], edit: ['Edited', 'এডিট', 'bg-amber-100 text-amber-700 border-amber-200'], 'delete': ['Deleted', 'ডিলিট', 'bg-rose-100 text-rose-700 border-rose-200'], restore: ['Restore', 'রিস্টোর', 'bg-blue-100 text-blue-700 border-blue-200'], reset: ['Reset', 'রিসেট', 'bg-rose-100 text-rose-700 border-rose-200'] };
var safeParse = function (s) { try { return JSON.parse(s); } catch (e) { return s; } };
function calHtml() {
  var c = S.cal, first = new Date(c.y, c.m, 1).getDay(), dim = new Date(c.y, c.m + 1, 0).getDate(), ts = todayStr();
  var h = '<div class="flex items-center justify-between mb-1"><button type="button" data-a="cprev" class="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">' + ic('cl', 'w-3.5 h-3.5') + '</button><div class="text-xs font-bold">' + (S.lang === 'bn' ? MB : MN)[c.m] + ' ' + c.y + '</div><button type="button" data-a="cnext" class="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">' + ic('cr', 'w-3.5 h-3.5') + '</button></div><div class="grid grid-cols-7 gap-0.5 text-center text-[10px] font-bold text-slate-500 mb-0.5">' + ['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(function (d) { return '<div>' + d + '</div>'; }).join('') + '</div><div class="grid grid-cols-7 gap-0.5">';
  for (var i = 0; i < first; i++) h += '<div></div>';
  for (var d = 1; d <= dim; d++) { var ds = c.y + '-' + pad(c.m + 1) + '-' + pad(d), on = c.sel.indexOf(ds) >= 0; h += '<button type="button" data-a="cday" data-v="' + ds + '" class="h-7 rounded-md text-[11px] font-semibold cursor-pointer ' + (on ? 'bg-pink-600 text-white' : 'text-slate-700 dark:text-slate-200 hover:bg-pink-50 dark:hover:bg-slate-800 ' + (ds === ts ? 'border border-pink-400' : '')) + '">' + d + '</button>'; }
  return h + '</div><div class="flex gap-1.5 mt-1.5"><button type="button" data-a="cmonth" class="' + BTN_S + '">' + L('All days except Friday', 'শুক্রবার বাদে পুরো মাস') + '</button><button type="button" data-a="cclear" class="' + BTN_S + '">' + L('Clear', 'মুছুন') + '</button></div>';
}
function selHtml() {
  var s = S.cal.sel.slice().sort(); if (!s.length) return '<p class="text-[11px] text-slate-400">' + L('Click the days on the calendar.', 'ক্যালেন্ডারে দিনগুলোতে ক্লিক করুন।') + '</p>';
  if (s.length === 1) return '';
  var I = 'w-full p-0.5 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-[11px] text-center font-mono';
  var cell = function (attr, map, d, ph) { return '<td class="px-1 py-0.5"><input ' + attr + '="' + d + '" type="number" min="0" step="any" value="' + esc(map[d] || '') + '" placeholder="' + esc(ph || '0') + '" class="' + I + '"></td>'; };
  return '<div class="text-[11px] font-bold mb-1">' + s.length + ' ' + L('days selected', 'দিন নির্বাচিত') + ' <span class="font-normal text-slate-500">' + L('(change a box only if that day is different — empty = same as above)', '(কোনো দিন আলাদা হলে শুধু সেই ঘর বদলান — খালি = উপরের মতোই)') + '</span></div><div class="max-h-40 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700"><table class="w-full text-[11px]"><thead class="sticky top-0 bg-slate-100 dark:bg-slate-800"><tr class="text-slate-500"><th class="px-1 py-1 text-left">' + L('Date', 'তারিখ') + '</th><th class="px-1">' + L('Qty', 'সংখ্যা') + '</th><th class="px-1">' + L('Amount', 'টাকা') + '</th><th class="px-1">TA</th><th class="px-1">DA</th></tr></thead><tbody>' +
    s.map(function (d) { return '<tr class="border-t border-slate-100 dark:border-slate-800"><td class="px-1 font-semibold whitespace-nowrap">' + d.slice(5) + '</td>' + cell('data-lov', S.lov, d, mv('count')) + cell('data-lav', S.lav, d, mv('amount')) + cell('data-lta', S.lta, d, mv('ta')) + cell('data-lda', S.lda, d, mv('da')) + '</tr>'; }).join('') + '</tbody></table></div>';
}
function calRefresh() { var a = $('#cal'), b = $('#csel'); if (a) a.innerHTML = calHtml(); if (b) b.innerHTML = selHtml(); laborTot(); }
function laborTot() {
  var el = $('#etot'); if (!el || !S.cal) return; var cm = n(mv('count')), am = n(mv('amount')), ta = n(mv('ta')), da = n(mv('da')), q = 0, a = 0, tt = 0;
  S.cal.sel.forEach(function (d) { q += n(S.lov[d]) || cm; a += n(S.lav[d]) || am; tt += (S.lta[d] !== undefined && S.lta[d] !== '' ? n(S.lta[d]) : ta) + (S.lda[d] !== undefined && S.lda[d] !== '' ? n(S.lda[d]) : da); }); a += tt; el.textContent = money(a) + '  (' + S.cal.sel.length + L(' day(s) · ', ' দিন · ') + fmt(q) + L(' labor', ' লেবার') + (tt ? ' · TA/DA ' + fmt(tt) : '') + ')';
}
var chemRow = function (r) { r = r || {}; var I = 'w-full p-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-xs'; return '<div class="crow grid grid-cols-12 gap-1.5 items-center"><input data-cr="name" list="dl-chem" placeholder="' + L('Chemical name', 'কেমিক্যালের নাম') + '" class="col-span-3 ' + I + '"><input data-cr="qty" data-tri="q" type="number" min="0" step="any" placeholder="0" class="col-span-2 ' + I + '"><input data-cr="unit" placeholder="kg" class="col-span-2 ' + I + '"><input data-cr="rate" data-tri="r" type="number" min="0" step="any" placeholder="0" class="col-span-2 ' + I + '"><input data-cr="amt" data-tri="a" type="number" min="0" step="any" placeholder="0" title="' + L('Direct amount (optional)', 'সরাসরি টাকা (ঐচ্ছিক)') + '" class="col-span-2 ' + I + ' font-mono font-bold text-right"><button type="button" data-a="delrow" class="col-span-1 p-1 rounded-lg hover:bg-rose-100 text-rose-600 cursor-pointer flex justify-center">' + ic('x', 'w-3.5 h-3.5') + '</button></div>'; };
function chemTot() {
  var t = 0; [].forEach.call(document.querySelectorAll('#mf .crow'), function (r) { var q = n(r.querySelector('[data-cr=qty]').value) * n(r.querySelector('[data-cr=rate]').value), ae = r.querySelector('[data-cr=amt]'); ae.placeholder = q ? fmt(q) : '0'; t += ae.value.trim() !== '' ? n(ae.value) : q; });
  var el = $('#etot'); if (el) el.textContent = money(t);
}
function subInfo() {
  var nm = mv('sub'), el = $('#sinfo'); if (!el) return; var b = 0, pd = 0, id = $('#mf').getAttribute('data-id');
  D.subs.forEach(function (x) { if (x.pid === mv('pid') && x.sub === nm) b += subAmt(x); }); D.subpays.forEach(function (x) { if (x.pid === mv('pid') && x.sub === nm && x.id !== id) pd += n(x.amount); });
  el.innerHTML = [[L('Total bill', 'মোট বিল হয়েছে'), b, ''], [L('Already paid', 'আগে দেওয়া হয়েছে'), pd, ''], [L('Payable (due)', 'পাবে (বাকি)'), b - pd, 'text-rose-600']].map(function (r) { return '<div class="rounded-lg bg-slate-100 dark:bg-slate-800 px-2 py-1.5 text-center"><div class="text-[10px] font-bold text-slate-500">' + r[0] + '</div><div class="text-sm font-black font-mono ' + r[2] + '">' + money(r[1]) + '</div></div>'; }).join('');
  el.setAttribute('data-due', b - pd);
}
function commForm(x) {
  x = x || { date: S.day || todayStr() };
  modal(fhead('comm', x, L('Engineer Commission', 'ইঞ্জিনিয়ার কমিশন'), L('Edit Commission', 'কমিশন এডিট')) + fld(L('Project *', 'প্রজেক্ট *'), pidSel(x.pid)) + fld(L('Date *', 'তারিখ *'), inp('date', x.date, 'date')) + fld(L('Engineer name', 'ইঞ্জিনিয়ারের নাম'), inp('eng', x.eng)) + fld(L('Commission amount *', 'কমিশনের টাকা *'), numi('commission', x.commission)) + fld(L('Note', 'নোট'), inp('note', x.note), 'col-span-2') + btnRow());
}
function logoTab() {
  return '<div class="' + CARD + '"><div class="text-xs font-bold mb-1">' + L('Logo Setup', 'লোগো সেটআপ') + '</div><p class="text-[11px] text-slate-500 mb-3">' + L('Paste a Google Drive share link (set to "Anyone with the link") or any direct image URL.', 'গুগল ড্রাইভের শেয়ার লিংক ("Anyone with the link") বা যেকোনো ছবির সরাসরি লিংক দিন।') + '</p><div class="flex items-center gap-2 mb-2"><img id="logoprev" data-logo="1" src="' + esc(logoSrc()) + '" class="w-10 h-10 rounded-full border border-slate-300 bg-white p-0.5 object-contain shrink-0"><input id="logourl" value="' + esc(C.logo || '') + '" placeholder="https://drive.google.com/file/d/…/view" class="' + INP + '"></div><div class="grid grid-cols-1 sm:grid-cols-4 gap-2"><input id="lpin" type="password" inputmode="numeric" maxlength="8" placeholder="' + L('Admin PIN', 'অ্যাডমিন পিন') + '" class="' + INP + ' font-mono"><button type="button" data-a="lprev" class="' + BTN_S + ' justify-center">' + L('Preview', 'প্রিভিউ') + '</button><button type="button" data-a="lsave" class="' + BTN_P + ' justify-center">' + L('Save Logo', 'লোগো সেভ') + '</button><button type="button" data-a="lreset" class="' + BTN_S + ' justify-center">' + L('Reset to default', 'ডিফল্ট লোগো') + '</button></div></div>';
}
function rsTab() {
  var r = S.rs;
  return '<div class="' + CARD + '"><div class="text-xs font-bold mb-1">' + L('Restore from JSON backup', 'JSON ব্যাকআপ থেকে রিস্টোর') + '</div><p class="text-[11px] text-slate-500 mb-3">' + L('Choose the backup file, enter the admin PIN and click Restore. A safety snapshot of the current data is saved first (DB_History sheet).', 'ব্যাকআপ ফাইল বাছাই করুন, অ্যাডমিন পিন দিয়ে Restore চাপুন। আগে বর্তমান ডাটার সেফটি স্ন্যাপশট (DB_History শিটে) সেভ হয়।') + '</p><input id="rsfile" type="file" accept=".json,application/json" class="text-xs mb-3 block">' +
    (r ? '<div class="rounded-xl border border-slate-200 dark:border-slate-700 p-3 mb-3 text-xs"><div class="font-bold mb-1">' + esc(S.rsFile) + '</div><div class="text-slate-500">' + L('Exported: ', 'এক্সপোর্ট: ') + esc(r.exportedAt || '—') + '</div><div class="mt-1 font-semibold">' + L('Projects', 'প্রজেক্ট') + ': ' + r.p + ' · ' + L('Other records', 'অন্যান্য রেকর্ড') + ': ' + r.o + ' · ' + L('Bills & measurements', 'বিল ও মেজারমেন্ট') + ': ' + (r.b || 0) + '</div></div><div class="flex flex-col sm:flex-row gap-2 mb-3">' + [['merge', 'Merge — add new & update same IDs (keeps other data)', 'মার্জ — নতুন যোগ ও একই আইডি আপডেট (বাকি ডাটা থাকবে)'], ['replace', 'Replace ALL — delete current data first', 'সব প্রতিস্থাপন — আগে বর্তমান সব ডাটা মুছবে']].map(function (m) { return '<label class="flex-1 flex items-start gap-2 rounded-xl border p-2.5 text-xs cursor-pointer ' + (S.rsMode === m[0] ? 'border-pink-500 bg-pink-50 dark:bg-pink-950/40' : 'border-slate-200 dark:border-slate-700') + '"><input type="radio" name="rsm" data-a="rsmode" value="' + m[0] + '" ' + (S.rsMode === m[0] ? 'checked' : '') + '><span class="font-semibold">' + L(m[1], m[2]) + '</span></label>'; }).join('') + '</div>' : '') +
    (r && r.set ? '<label class="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/20 p-2.5 text-xs mb-3 cursor-pointer"><input type="checkbox" data-a="rsset"' + (S.rsSet ? ' checked' : '') + ' class="mt-0.5"><span><b>' + L('Also restore settings', 'সেটিংসও রিস্টোর করুন') + '</b> — ' + L('PINs, logo, signatures, currency… from this full backup. The PINs will become the ones saved in the file.', 'এই সম্পূর্ণ ব্যাকআপের পিন, লোগো, সিগনেচার, মুদ্রা… । পিন হয়ে যাবে ফাইলে থাকা পিন।') + '</span></label>' : '') +
    '<div class="grid grid-cols-1 sm:grid-cols-3 gap-2"><input id="rspin" type="password" inputmode="numeric" maxlength="8" autocomplete="off" placeholder="' + L('Admin PIN (password)', 'অ্যাডমিন পিন (পাসওয়ার্ড)') + '" class="' + INP + ' font-mono sm:col-span-2"><button type="button" id="rsgo" data-a="dors" ' + (r ? '' : 'disabled') + ' class="' + BTN_D + ' justify-center">' + ic('up', 'w-4 h-4') + '<span>' + L('Restore', 'রিস্টোর') + '</span></button></div></div>';
}
function recCard() {
  if (S.recInfo === undefined) { S.recInfo = null; srv('recoveryInfo').then(function (r) { S.recInfo = r; if (S.view === 'admin' && S.atab === 'sec') render(); }).catch(function () { S.recInfo = { email: '', phone: '', sms: false, any: false }; }); }
  var ri = S.recInfo || { email: '', phone: '', sms: false, smsKey: false }, pw = function (id, ph) { return '<input id="' + id + '" type="password" inputmode="numeric" maxlength="8" autocomplete="off" placeholder="' + ph + '" class="' + INP + ' font-mono">'; };
  var cur = function (v, none) { return v ? '<span class="text-emerald-700 font-semibold">' + L('Current: ', 'বর্তমান: ') + esc(v) + '</span>' : '<span class="text-slate-400">' + none + '</span>'; };
  return '<div class="' + CARD + '"><div class="text-xs font-bold mb-1">' + L('PIN Recovery (email & SMS)', 'পিন রিকভারি (ইমেইল ও এসএমএস)') + '</div><p class="text-[11px] text-slate-500 mb-2">' + L('If a PIN is forgotten, a 6-digit code is sent to the email and/or mobile below and the PIN can be reset from the login screen. Leave a box empty to keep it unchanged; type - to remove it.', 'পিন ভুলে গেলে নিচের ইমেইল ও/অথবা মোবাইলে ৬ সংখ্যার কোড যায়, লগইন স্ক্রিন থেকে পিন রিসেট করা যায়। কোনো ঘর খালি রাখলে আগেরটাই থাকবে; মুছতে - লিখুন।') + '</p>' +
    '<div class="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2"><div><label class="' + LBL + '">' + L('Recovery email', 'রিকভারি ইমেইল') + ' ' + cur(ri.email, L('not set', 'সেট করা নেই')) + '</label><input id="rc-email" type="email" placeholder="owner@example.com" class="' + INP + '"></div><div><label class="' + LBL + '">' + L('Recovery mobile number', 'রিকভারি মোবাইল নম্বর') + ' ' + cur(ri.phone, L('not set', 'সেট করা নেই')) + '</label><input id="rc-phone" type="tel" inputmode="tel" placeholder="01XXXXXXXXX" class="' + INP + ' font-mono"></div></div>' +
    '<div class="mb-2 rounded-xl border border-slate-200 dark:border-slate-700 p-2.5 bg-slate-50 dark:bg-slate-800/50"><div class="flex items-center justify-between gap-2 mb-1"><label class="' + LBL + ' mb-0">' + L('SMS API Key (sms.net.bd)', 'এসএমএস API Key (sms.net.bd)') + ' ' + cur(ri.smsKey ? L('saved', 'সেভ করা আছে') : '', L('not set — code goes by email only', 'সেট করা নেই — কোড শুধু ইমেইলে যাবে')) + '</label><span class="text-[10px] font-mono text-slate-400">api.sms.net.bd/sendsms</span></div><input id="rc-key" type="password" autocomplete="off" placeholder="' + L('Paste your sms.net.bd API key', 'আপনার sms.net.bd API key পেস্ট করুন') + '" class="' + INP + ' font-mono"><p class="text-[10px] text-slate-400 mt-1">' + L('The SMS link is already built in — only the API key and the mobile number are needed. The key is stored on the server (Script Properties) and is never shown again.', 'এসএমএস লিংক আগেই বসানো আছে — শুধু API key ও মোবাইল নম্বর দিলেই হবে। কী সার্ভারে (Script Properties) সংরক্ষিত থাকে, আর কখনো দেখানো হয় না।') + '</p></div>' +
    '<div class="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800"><input id="rc-pin" type="password" inputmode="numeric" maxlength="8" autocomplete="off" placeholder="' + L('Admin PIN', 'অ্যাডমিন পিন') + '" class="w-28 p-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-xs font-mono">' +
      '<button type="button" data-a="saverec" class="' + SBTN + ' bg-pink-600 hover:bg-pink-700 text-white border-pink-600">' + ic('check', 'w-3.5 h-3.5') + L('Save', 'সেভ') + '</button>' +
      '<button type="button" data-a="testmail" title="' + L('Send a test email', 'টেস্ট ইমেইল পাঠান') + '" class="' + SBTN + ' ' + SBTN_O + '"' + (ri.email ? '' : ' disabled') + '>✉ ' + L('Test email', 'টেস্ট ইমেইল') + '</button>' +
      '<button type="button" data-a="testsms" title="' + L('Send a test SMS', 'টেস্ট এসএমএস পাঠান') + '" class="' + SBTN + ' ' + SBTN_O + '"' + (ri.sms ? '' : ' disabled') + '>💬 ' + L('Test SMS', 'টেস্ট এসএমএস') + '</button>' +
      '<div class="ml-auto flex items-center gap-1.5"><label class="flex items-center gap-1 text-[11px] text-slate-500 cursor-pointer select-none"><input type="checkbox" id="rcrmok" class="accent-rose-600">' + L('Remove all', 'সব মুছতে চাই') + '</label><button type="button" id="rcrm" data-a="clearrec" class="pj-hide ' + SBTN + ' bg-rose-600 hover:bg-rose-700 text-white border-rose-600">' + ic('trash', 'w-3.5 h-3.5') + L('Remove all', 'সব মুছুন') + '</button></div></div></div>';
}
function forgotModal() {
  modal(mHead(L('Reset PIN', 'পিন রিসেট')) + '<div id="fpbody"><p class="text-xs text-slate-400">' + L('Checking…', 'দেখা হচ্ছে…') + '</p></div>');
  srv('recoveryInfo').then(function (r) {
    var b = $('#fpbody'); if (!b) return;
    if (!r.any) { b.innerHTML = '<p class="text-xs text-slate-600 dark:text-slate-300 mb-3">' + L('No recovery email or SMS is set up yet. Ask the admin to add it in Admin → Security & Privacy, or reset the PIN from the Apps Script editor.', 'এখনও রিকভারি ইমেইল বা এসএমএস সেট করা নেই। অ্যাডমিন যেন Admin → সিকিউরিটি ও প্রাইভেসি-তে সেট করে, অথবা অ্যাপস স্ক্রিপ্ট এডিটর থেকে পিন রিসেট করুন।') + '</p><div class="flex justify-end"><button type="button" data-a="mclose" class="' + BTN_S + '">' + L('Close', 'বন্ধ করুন') + '</button></div>'; return; }
    b.innerHTML = '<p class="text-xs text-slate-600 dark:text-slate-300 mb-3">' + L('Where should the 6-digit code be sent?', '৬ সংখ্যার কোড কোথায় পাঠাবো?') + '</p><div class="space-y-1.5 mb-3">' + [['email', r.email ? L('Email', 'ইমেইল') + ' — ' + r.email : ''], ['sms', r.sms ? L('Mobile (SMS)', 'মোবাইল (এসএমএস)') + ' — ' + r.phone : ''], ['both', r.email && r.sms ? L('Both email and SMS', 'ইমেইল ও এসএমএস দুটোতেই') : '']].filter(function (o) { return o[1]; }).map(function (o, i) { return '<label class="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs font-semibold cursor-pointer hover:border-pink-400"><input type="radio" name="fpvia" value="' + o[0] + '"' + (i === 0 ? ' checked' : '') + '><span>' + esc(o[1]) + '</span></label>'; }).join('') + '</div><div class="flex justify-end gap-2"><button type="button" data-a="mclose" class="' + BTN_S + '">' + L('Cancel', 'বাতিল') + '</button><button type="button" data-a="fpsend" class="' + BTN_P + '">' + L('Send code', 'কোড পাঠান') + '</button></div>';
  }).catch(function (e) { var b = $('#fpbody'); if (b) b.innerHTML = '<p class="text-xs text-rose-600">' + esc(e.message) + '</p>'; });
}
function forgotStep2(r) {
  var I = INP + ' font-mono';
  $('#fpbody').innerHTML = '<p class="text-xs text-emerald-700 mb-3">' + L('Code sent via ', 'কোড পাঠানো হয়েছে: ') + esc(r.sent.join(' + ')) + L('. It is valid for 10 minutes.', '। ১০ মিনিট পর্যন্ত বৈধ।') + '</p><div class="grid grid-cols-2 gap-2"><div class="col-span-2"><label class="' + LBL + '">' + L('6-digit code', '৬ সংখ্যার কোড') + '</label><input id="fpcode" inputmode="numeric" maxlength="6" autocomplete="one-time-code" class="' + I + '"></div><div class="col-span-2"><label class="' + LBL + '">' + L('Which PIN to reset', 'কোন পিন রিসেট করবেন') + '</label><select id="fpwhich" class="' + INP + '"><option value="admin">' + L('Admin PIN', 'অ্যাডমিন পিন') + '</option><option value="user">' + L('User PIN', 'ইউজার পিন') + '</option></select></div><div><label class="' + LBL + '">' + L('New PIN (4–8 digits)', 'নতুন পিন (৪–৮ সংখ্যা)') + '</label><input id="fpn1" type="password" inputmode="numeric" maxlength="8" class="' + I + '"></div><div><label class="' + LBL + '">' + L('Confirm new PIN', 'নতুন পিন নিশ্চিত করুন') + '</label><input id="fpn2" type="password" inputmode="numeric" maxlength="8" class="' + I + '"></div></div><div class="flex justify-end gap-2 mt-3"><button type="button" data-a="mclose" class="' + BTN_S + '">' + L('Cancel', 'বাতিল') + '</button><button type="button" data-a="fpgo" class="' + BTN_P + '">' + L('Reset PIN', 'পিন রিসেট করুন') + '</button></div>';
}
/* ---------- Events ---------- */
function tryLogin(manual) {
  var pin = S.pin; if (pin.length < 4 || S.verifying) return;
  var last = manual || pin.length >= maxLen();
  S.verifying = true; render();
  srv('loginLoad', pin).then(function (r) {
    S.verifying = false;
    if (r && r.role) {
      S.role = r.role; ss('role', r.role); S.pin = ''; S.tok = r.tok || ''; ss('tok', S.tok || null); S.view = 'dash'; S.err = '';
      if (r.data) { applyData(r.data); S.rev = r.data.rev || ''; lastOk = Date.now(); cacheSet(r.data); S.loading = false; } else S.loading = true;
      render(); toast(r.role === 'admin' ? L('Admin mode unlocked successfully.', 'অ্যাডমিন মোডে সফলভাবে লগইন হয়েছে।') : L('Welcome! Logged in successfully.', 'স্বাগতম! ইউজার সফলভাবে লগইন হয়েছে।'));
      if (!r.data) load(true);
      pingSoon();
    } else if (S.pin !== pin) { render(); if (S.lens.indexOf(S.pin.length) >= 0 || S.pin.length >= 8) tryLogin(); }
    else if (last) { S.pin = ''; S.pinBad = true; render(); setTimeout(function () { S.pinBad = false; }, 450); toast(L('Incorrect PIN! Please try again.', 'ভুল পিন! আবার চেষ্টা করুন।'), 'error'); }
    else render();
  }).catch(function (e) { S.verifying = false; S.pin = ''; render(); toast(e.message, 'error'); });
}
function pinKey(d) { if (S.pin.length >= 8) return; S.pin += d; render(); if (S.lens.indexOf(S.pin.length) >= 0 || S.pin.length >= 8) tryLogin(); }
function refreshLens() { srv('pinInfo').then(function (r) { if (r && r.lens && r.lens.length) { S.lens = r.lens; ls('lens', JSON.stringify(r.lens)); } }).catch(function () {}); }
function adminGate(go) {
  if (isAdmin()) return go();
  modal(mHead(L('Admin Access', 'অ্যাডমিন অ্যাক্সেস')) + '<p class="text-xs text-slate-500 mb-3">' + L('Enter the admin PIN to open this section.', 'এই অংশ খুলতে অ্যাডমিন পিন দিন।') + '</p><input id="gatepin" type="password" inputmode="numeric" maxlength="8" autocomplete="off" class="' + INP + ' font-mono mb-3" placeholder="PIN"><div class="flex justify-end gap-2"><button type="button" data-a="mclose" class="' + BTN_S + '">' + L('Cancel', 'বাতিল') + '</button><button type="button" id="gateok" class="' + BTN_P + '">' + L('Unlock', 'আনলক') + '</button></div>');
  var run = function (quiet) { var p = $('#gatepin').value; return srv('verifyAdmin', p).then(function (ok) { if (ok) { S.role = 'admin'; ss('role', 'admin'); closeModal(); render(); toast(L('Admin access granted.', 'অ্যাডমিন এক্সেস অনুমোদিত।')); go(); } else if (!quiet) toast(L('Invalid Admin PIN!', 'ভুল অ্যাডমিন পিন!'), 'error'); }).catch(function (e) { toast(e.message, 'error'); }); };
  gateWire(run);
}
function onClick(ev) {
  var t = ev.target.closest('[data-a]');
  if (S.gearOpen && (!t || t.getAttribute('data-a') !== 'gear')) { S.gearOpen = false; var gm = $('#gearmenu'); if (gm) gm.remove(); }
  if (!t) return;
  var a = t.getAttribute('data-a'), v = t.getAttribute('data-v'), id = t.getAttribute('data-id'), c = t.getAttribute('data-c');
  if (a === 'mbg') return;
  if (a === 'mbox') return;
  var forms = { labor: laborForm, subs: subForm, subpays: subPayForm, chems: chemForm, bills: billForm, entries: function (x) { if (x && n(x.commission) && !(n(x.ta) || n(x.da) || n(x.transport) || n(x.other))) commForm(x); else costForm(x); } };
  var needP = function () { if (!D.projects.length) { toast(L('Add a project first', 'আগে একটি প্রজেক্ট যোগ করুন'), 'error'); return false; } return true; };
  var rec = function () { return D[c].find(function (x) { return x.id === id; }); };
  switch (a) {
    case 'mclose': if (S.retHist) { histModal(); break; } closeModal(); S.histOpen = false; break;
    case 'hback': histModal(); break;
    case 'hper': S.hp.per = v; histModal(); break;
    case 'htoday': S.hp.day = todayStr(); histModal(); break;
    case 'hstep': { var st = n(v); if (S.hp.per === 'day') { var dd = new Date(S.hp.day + 'T00:00:00'); dd.setDate(dd.getDate() + st); S.hp.day = dd.getFullYear() + '-' + pad(dd.getMonth() + 1) + '-' + pad(dd.getDate()); } else { var mp = S.hp.month.split('-'), mm = n(mp[1]) - 1 + st, yy = n(mp[0]) + Math.floor(mm / 12); mm = ((mm % 12) + 12) % 12; S.hp.month = yy + '-' + pad(mm + 1); } histModal(); break; }
    case 'hmdel': { var ml = Object.keys(S.marks).map(function (k) { var q = k.split('|'); return { c: q[0], id: q[1] }; }); if (!ml.length) break; pinGate(function (pin) { delMany(ml, pin); }, '<b class="text-rose-600">' + ml.length + L(' marked entries will be deleted.', 'টি মার্ক করা এন্ট্রি ডিলিট হবে।') + '</b> ' + L('Enter the PIN to confirm.', 'নিশ্চিত করতে পিন দিন।')); break; }
    case 'logref': S.logCache = null; render(); break;
    case 'lgper': S.lg.per = v; render(); break;
    case 'lgact': S.lg.act = v; render(); break;
    case 'savename': ls('myname', ($('#s-myname').value || '').trim().slice(0, 30)); pingSoon(); toast(L('Name saved', 'নাম সংরক্ষিত হয়েছে')); break;
    case 'onlist': onlineModal(); break;
    case 'bill': openBill(v); break;
    case 'billall': openBill('', true); break;
    case 'billk': { showBillTab('btm'); var kw = billWin('btm'); try { if (kw && kw.SCSB_kind) kw.SCSB_kind(v); } catch (e) {} [].forEach.call(document.querySelectorAll('[data-a=billk]'), function (b) { b.classList.toggle('on', b.getAttribute('data-v') === v); }); break; }
    case 'billclose': closeBill(); break;
    case 'bsync': { var sw = billWin(BT.act); try { if (sw && sw.SCSB_sync) sw.SCSB_sync(); } catch (e) {} break; }
    case 'ball': { showBillTab('btm'); var aw = billWin('btm'); try { if (aw && aw.SCSB_all) aw.SCSB_all(); } catch (e) {} break; }
    case 'btshow': showBillTab(v); break;
    case 'btx': closeBillTab(v); break;
    case 'bcpad': bcRead(); (S.bc.pads = S.bc.pads || []).push({ name: '', src: '', size: 'a4' }); render(); break;
    case 'bcseal': bcRead(); (S.bc.seals = S.bc.seals || []).push({ name: '', url: '', w: 110, op: 0.9 }); render(); break;
    case 'bcpadx': bcRead(); S.bc.pads.splice(n(v), 1); render(); break;
    case 'bcsealx': bcRead(); S.bc.seals.splice(n(v), 1); render(); break;
    case 'bcreload': S.bc = null; render(); break;
    case 'bcsave': { bcRead(); var bc = S.bc; bc.pads = (bc.pads || []).filter(function (x) { return x.src; }); bc.seals = (bc.seals || []).filter(function (x) { return x.url; }); t.disabled = true; srv('billApi', 'saveConfig', [JSON.stringify(bc), ($('#bc-pin') || {}).value || '']).then(function (cfg) { S.bc = cfg; t.disabled = false; srv('billApi', 'peekNextNo', []).then(function (no) { S.bcNext = no; render(); }).catch(function () { render(); }); toast(L('Bill settings saved', 'বিলের সেটিংস সেভ হয়েছে')); }).catch(function (e) { t.disabled = false; toast(e.message, 'error'); }); break; }
    case 'billtab': billNewTab(); break;
    case 'qimp': { var ql = ($('#qimp-link') || {}).value || ''; t.disabled = true; srv('importQuotationSettings', ql, ($('#qimp-pin') || {}).value || '').then(function (r) { t.disabled = false; toast(L('Copied from SCS Quotation: ', 'SCS Quotation থেকে কপি হয়েছে: ') + (r.copied.join(', ') || '—')); }).catch(function (e) { t.disabled = false; toast(e.message, 'error'); }); break; }
    case 'gear': S.focus = false; S.view = 'settings'; S.setTab = 'gen'; render(); window.scrollTo(0, 0); break;
    case 'stg': S.gearOpen = false; S.focus = false; S.view = 'settings'; S.setTab = v; if (v === 'log') S.logCache = null; render(); window.scrollTo(0, 0); break;
    case 'focus': S.focus = true; S.fsFold = false; render(); break;
    case 'fsclose': S.focus = false; render(); break;
    case 'fsfold': S.fsFold = !S.fsFold; render(); break;
    case 'frow': histModal(true, v); break;
    case 'k': pinKey(v); break;
    case 'kc': S.pin = ''; render(); break;
    case 'kb': S.pin = S.pin.slice(0, -1); render(); break;
    case 'go': tryLogin(true); break;
    case 'lang': case 'setlang': S.lang = a === 'setlang' ? v : (S.lang === 'bn' ? 'en' : 'bn'); ls('lang', S.lang); render(); break;
    case 'theme': S.theme = S.theme === 'dark' ? 'light' : 'dark'; ls('theme', S.theme); render(); break;
    case 'settheme': S.theme = v; ls('theme', v); render(); break;
    case 'logout': if (window.SCS && SCS.signOut) { SCS.signOut(); break; } if (S.role) srv('ping', S.sid, JSON.stringify({ gone: true })).catch(function () {}); S.online = []; closeBill(true); S.tok = ''; ss('tok', null); S.role = ''; S.pin = ''; S.edit = false; ss('role', null); S.view = 'dash'; S.backupDone = false; ss('bk', null); COLS.forEach(function (k) { D[k] = []; }); lastSig = ''; S.rev = ''; S.err = ''; try { sessionStorage.removeItem('scs_pj_cache'); } catch (e) {} render(); break;
    case 'sync': load(false); break;
    case 'editmode': if (S.edit) { S.edit = false; render(); toast(L('Edit Mode is OFF', 'এডিট মোড বন্ধ হয়েছে'), 'info'); } else needEdit(); break;
    case 'nav': S.focus = false; if (v === 'projects') S.co = ''; if (v === 'export') { S.view = 'settings'; S.setTab = 'export'; render(); break; } if (v === 'settings') S.setTab = 'gen'; if (v === 'admin') adminGate(function () { S.view = 'admin'; render(); }); else { S.view = v; render(); } window.scrollTo(0, 0); break;
    case 'mprev': S.gper = 'month'; ls('gper', 'month'); S.month--; if (S.month < 1) { S.month = 12; S.year--; } render(); break;
    case 'mnext': S.gper = 'month'; ls('gper', 'month'); S.month++; if (S.month > 12) { S.month = 1; S.year++; } render(); break;
    case 'openp': if (S.pid !== id) S.sel = ''; S.pid = id; S.view = 'project'; if (S.gper === 'month') { S.per = 'month'; S.pmonth = S.year + '-' + pad(S.month); } else S.per = 'life'; render(); window.scrollTo(0, 0); break;
    case 'st': S.st = v; S.view = 'projects'; render(); break;
    case 'vm': S.vm = v; ls('vm2', v); S.view = 'projects'; render(); break;
    case 'opco': S.co = v || ''; S.view = 'projects'; render(); window.scrollTo(0, 0); break;
    case 'coren': { var oc = v; pinGate(function () { coRename(oc); }, L('Enter the PIN to rename this company.', 'কোম্পানির নাম এডিট করতে পিন দিন।')); break; }
    case 'pback': S.focus = false; S.view = 'projects'; render(); window.scrollTo(0, 0); break;
    case 'per': S.per = v; S.sel = ''; render(); break;
    case 'atab': if (v === 'billset') S.bc = null; S.atab = v; S.sigDraft = null; if (v === 'sec') S.logCache = null; render(); break;
    case 'manage': manageProjects(); break;
    case 'addp': needEdit(function () { projForm(); }); break;
    case 'editp': pinGate(function () { projForm(proj(id)); }); break;
    case 'delp': pinGate(function (pin) { var pp = proj(id); ask(L('Delete project "', 'প্রজেক্ট "') + esc(pp ? pp.name : '') + L('" with ALL its records? This cannot be undone.', '" এবং এর সকল রেকর্ড ডিলিট করবেন? এটি ফেরানো যাবে না।'), L('Delete', 'ডিলিট'), function () { del('projects', id, pin); }, true); }); break;
    case 'addE': if (needP()) needEdit(entChooser); break;
    case 'ent': closeModal(); ({ labor: function () { laborForm(); }, subs: function () { subForm(); }, subpay: function () { subPayForm(); }, chem: function () { chemForm(); }, cost: function () { costForm(); }, comm: function () { commForm(); }, bill: function () { billForm(null, 'bill'); }, coll: function () { billForm(null, 'payment'); } })[v](); break;
    case 'hist': if (needP()) histModal(true); break;
    case 'hed': pinGate(function () { var x = rec(); if (!x) return toast(L('Entry not found', 'এন্ট্রি পাওয়া যায়নি'), 'error'); forms[c](x); S.retHist = true; }, L('Enter the PIN to edit this entry.', 'এন্ট্রি এডিট করতে পিন দিন।')); break;
    case 'hrm': { var hx = rec(), hi = hx ? recInfo(c, hx) : null; pinGate(function (pin) { del(c, id, pin); }, '<b class="text-rose-600">' + L('Delete this entry?', 'এই এন্ট্রিটি ডিলিট হবে?') + '</b><br>' + (hi ? esc(hi.d + ' · ' + hi.desc + ' · ' + fmt(hi.amt)) + '<br>' : '') + L('Enter the PIN to confirm.', 'নিশ্চিত করতে পিন দিন।')); break; }
    case 'ed': pinGate(function () { var x = rec(); if (x) forms[c](x); }, L('Enter the PIN to edit this entry.', 'এন্ট্রি এডিট করতে পিন দিন।')); break;
    case 'rm': { var rx = rec(), ri2 = rx ? recInfo(c, rx) : null; pinGate(function (pin) { del(c, id, pin); }, '<b class="text-rose-600">' + L('Delete this record?', 'এই রেকর্ডটি ডিলিট হবে?') + '</b><br>' + (ri2 ? esc(ri2.d + ' · ' + ri2.desc + ' · ' + fmt(ri2.amt)) + '<br>' : '') + L('Enter the PIN to confirm.', 'নিশ্চিত করতে পিন দিন।')); break; }
    case 'cday': { var i = S.cal.sel.indexOf(v); if (i < 0) S.cal.sel.push(v); else S.cal.sel.splice(i, 1); calRefresh(); break; }
    case 'cprev': S.cal.m--; if (S.cal.m < 0) { S.cal.m = 11; S.cal.y--; } calRefresh(); break;
    case 'cnext': S.cal.m++; if (S.cal.m > 11) { S.cal.m = 0; S.cal.y++; } calRefresh(); break;
    case 'cclear': S.cal.sel = []; calRefresh(); break;
    case 'cmonth': { var dim = new Date(S.cal.y, S.cal.m + 1, 0).getDate(); for (var d = 1; d <= dim; d++) { if (new Date(S.cal.y, S.cal.m, d).getDay() === 5) continue; var ds = S.cal.y + '-' + pad(S.cal.m + 1) + '-' + pad(d); if (S.cal.sel.indexOf(ds) < 0) S.cal.sel.push(ds); } calRefresh(); break; }
    case 'addrow': $('#crows').insertAdjacentHTML('beforeend', chemRow()); break;
    case 'delrow': if (document.querySelectorAll('#mf .crow').length > 1) { t.closest('.crow').remove(); chemTot(); } break;
    case 'payfull': { var due = n(($('#sinfo') || {}).getAttribute ? $('#sinfo').getAttribute('data-due') : 0); if (due > 0) { $('#mf [name=amount]').value = due; } break; }
    case 'printp': window.print(); break;
    case 'csvp': csvProject(); break;
    case 'csvdue': csvDue(); break;
    case 'duem': S.dueMode = v; render(); break;
    case 'savegen': C.currency = $('#s-cur').value || '৳'; C.company = $('#s-co').value || C.company; C.tagline = $('#s-tag').value; ['currency', 'company', 'tagline'].forEach(function (k) { srv('saveSetting', k, C[k], '').catch(function (e) { toast(e.message, 'error'); }); }); render(); toast(L('Saved', 'সংরক্ষিত হয়েছে')); break;
    case 'lprev': $('#logoprev').src = toLogoUrl($('#logourl').value); break;
    case 'lsave': case 'lreset': { var url = a === 'lreset' ? '' : $('#logourl').value.trim(); srv('saveSetting', 'logo', url, $('#lpin').value).then(function () { C.logo = url; render(); toast(L('Logo saved', 'লোগো সংরক্ষিত হয়েছে')); }).catch(function (e) { toast(e.message, 'error'); }); break; }
    case 'chpin': { var p0 = $('#p0').value, p1 = $('#p1').value, p2 = $('#p2').value; if (!/^\d{4,8}$/.test(p1)) return toast(L('PIN must be 4–8 digits', 'পিন ৪–৮ সংখ্যার হতে হবে'), 'error'); if (p1 !== p2) return toast(L('PINs do not match', 'পিন মিলছে না'), 'error'); srv('changeAdminPin', p0, p1).then(function () { toast(L('Admin PIN changed', 'অ্যাডমিন পিন পরিবর্তন হয়েছে')); refreshLens(); render(); }).catch(function (e) { toast(e.message, 'error'); }); break; }
    case 'editpin': { var nv = C.editPin === 'false' ? 'true' : 'false'; modal(mHead(L('Admin PIN required', 'অ্যাডমিন পিন লাগবে')) + '<p class="text-xs text-slate-500 mb-3">' + (nv === 'false' ? L('Edit Mode will turn on WITHOUT asking for a PIN.', 'এখন থেকে পিন ছাড়াই এডিট মোড চালু হবে।') : L('Edit Mode will require a PIN.', 'এখন থেকে এডিট মোড চালু করতে পিন লাগবে।')) + '</p><input id="epin" type="password" inputmode="numeric" maxlength="8" class="' + INP + ' font-mono mb-3" placeholder="Admin PIN"><div class="flex justify-end gap-2"><button type="button" data-a="mclose" class="' + BTN_S + '">' + L('Cancel', 'বাতিল') + '</button><button type="button" id="epok" class="' + BTN_P + '">' + L('Confirm', 'নিশ্চিত') + '</button></div>'); $('#epok').onclick = function () { var pv = $('#epin').value; srv('saveSetting', 'editPin', nv, pv).then(function () { C.editPin = nv; closeModal(); render(); toast(L('Saved', 'সংরক্ষিত হয়েছে')); }).catch(function (e) { toast(e.message, 'error'); }); }; break; }
    case 'forgot': forgotModal(); break;
    case 'fpsend': t.disabled = true; srv('sendResetCode', (document.querySelector('[name=fpvia]:checked') || {}).value || 'both').then(forgotStep2).catch(function (e) { t.disabled = false; toast(e.message, 'error'); }); break;
    case 'fpgo': { var n1 = $('#fpn1').value, n2 = $('#fpn2').value; if (!/^\d{4,8}$/.test(n1)) return toast(L('PIN must be 4–8 digits', 'পিন ৪–৮ সংখ্যার হতে হবে'), 'error'); if (n1 !== n2) return toast(L('PINs do not match', 'পিন মিলছে না'), 'error'); srv('resetPinWithCode', $('#fpcode').value.trim(), $('#fpwhich').value, n1).then(function () { closeModal(); toast(L('PIN has been reset. You can log in now.', 'পিন রিসেট হয়েছে। এখন লগইন করুন।')); refreshLens(); }).catch(function (e) { toast(e.message, 'error'); }); break; }
    case 'chupin': { var u1 = $('#up1').value, u2 = $('#up2').value; if (!/^\d{4,8}$/.test(u1)) return toast(L('PIN must be 4–8 digits', 'পিন ৪–৮ সংখ্যার হতে হবে'), 'error'); if (u1 !== u2) return toast(L('PINs do not match', 'পিন মিলছে না'), 'error'); srv('changeUserPin', $('#up0').value, u1).then(function () { toast(L('User PIN changed', 'ইউজার পিন পরিবর্তন হয়েছে')); refreshLens(); render(); }).catch(function (e) { toast(e.message, 'error'); }); break; }
    case 'saverec': case 'clearrec': { var clr = a === 'clearrec'; if (clr && !($('#rcrmok') || {}).checked) break; srv('saveRecovery', $('#rc-pin').value, clr ? '-' : $('#rc-email').value, clr ? '-' : $('#rc-phone').value, clr ? '-' : $('#rc-key').value).then(function (r) { S.recInfo = r; render(); toast(L('Recovery settings saved', 'রিকভারি সেটিংস সংরক্ষিত হয়েছে')); }).catch(function (e) { toast(e.message, 'error'); }); break; }
    case 'testsms': t.disabled = true; srv('testSms', $('#rc-pin').value).then(function (r) { t.disabled = false; toast(L('Test SMS sent to ', 'টেস্ট এসএমএস পাঠানো হয়েছে: ') + r.phone); }).catch(function (e) { t.disabled = false; toast(e.message, 'error'); }); break;
    case 'dtab': S.dtab = v; if (v === 'auto') S.ab = null; render(); break;
    case 'sigsave': { sigRead(); var sd = S.sigDraft; sd.labels = sd.labels.map(function (x) { return String(x || '').trim(); }); var js = JSON.stringify(sd); srv('saveSetting', 'sig', js, $('#sigpin').value).then(function () { C.sig = js; S.sigDraft = null; render(); toast(L('Signature setup saved', 'সিগনেচার সেটআপ সংরক্ষিত হয়েছে')); }).catch(function (e) { toast(e.message, 'error'); }); break; }
    case 'sigdef': S.sigDraft = { on: { project: 1, list: 0, report: 1, dash: 0 }, labels: ['Prepared By', 'Checked By', 'Approved By'] }; render(); toast(L('Default loaded — press Save to keep it', 'ডিফল্ট লোড হয়েছে — রাখতে সেভ চাপুন'), 'info'); break;
    case 'xscope': S.xp.scope = v; render(); break;
    case 'xcoall': S.xp.coOff = {}; render(); break;
    case 'xconone': xCompanies().forEach(function (c) { S.xp.coOff[c] = 1; }); render(); break;
    case 'xpall': S.xp.off = {}; render(); break;
    case 'xpnone': D.projects.forEach(function (p) { S.xp.off[p.id] = 1; }); render(); break;
    case 'xpdf': xPdf(); break;
    case 'xcsv': xCsv(); break;
    case 'stab': S.stab = v; if (v === 'log') S.logCache = null; render(); break;
    case 'gper': S.gper = v; ls('gper', v); render(); break;
    case 'subtog': S.subOpen = !S.subOpen; ls('subOpen', S.subOpen ? '1' : '0'); render(); break;
    case 'paysub': { var spid = id, sname = v; needEdit(function () { subPayForm({ pid: spid, sub: sname, date: S.day || todayStr() }); }); break; }
    case 'dobk': doBackup(); break;
    case 'dofull': { var fp = $('#bkpin').value; if (!fp) { toast(L('Enter admin PIN', 'অ্যাডমিন পিন দিন'), 'error'); break; } t.disabled = true; srv('exportFull', fp).then(function (o) { t.disabled = false; dl('SCS_Projects_FULL_Backup_' + todayStr() + '.json', JSON.stringify(o, null, 1)); S.backupDone = true; ss('bk', '1'); render(); toast(L('Full backup downloaded', 'সম্পূর্ণ ব্যাকআপ ডাউনলোড হয়েছে')); }).catch(function (e) { t.disabled = false; toast(e.message, 'error'); }); break; }
    case 'testmail': t.disabled = true; srv('testEmail', $('#rc-pin').value).then(function (r) { t.disabled = false; toast(L('Test email sent to ', 'টেস্ট ইমেইল পাঠানো হয়েছে: ') + r.email + ' · ' + L('left today: ', 'আজ বাকি: ') + r.left); }).catch(function (e) { t.disabled = false; toast(e.message, 'error'); }); break;
    case 'absave': { var ad = S.abDraft; t.disabled = true; srv('saveAutoBackup', $('#abpin').value, JSON.stringify(ad)).then(function (r) { S.ab = r; S.abDraft = null; render(); toast(r.on ? L('Auto backup schedule saved', 'অটো ব্যাকআপ শিডিউল সেভ হয়েছে') : L('Auto backup is OFF', 'অটো ব্যাকআপ বন্ধ করা হয়েছে')); }).catch(function (e) { t.disabled = false; toast(e.message, 'error'); }); break; }
    case 'abnow': { t.disabled = true; var lbl = t.innerHTML; t.innerHTML = ic('sync', 'w-4 h-4 animate-spin') + '<span>' + L('Backing up…', 'ব্যাকআপ হচ্ছে…') + '</span>'; srv('runBackupNow', $('#abpin').value).then(function (r) { S.ab = null; render(); toast(L('Backup saved to Drive: ', 'ড্রাইভে ব্যাকআপ হয়েছে: ') + r.file + (r.pruned ? ' · ' + r.pruned + L(' old file(s) moved to Trash', 'টি পুরোনো ফাইল ট্র্যাশে') : '')); }).catch(function (e) { t.disabled = false; t.innerHTML = lbl; toast(e.message, 'error'); }); break; }
    case 'rsmode': S.rsMode = v || t.value; break;
    case 'rzchk': S.rzOk = t.checked; render(); break;
    case 'rsset': S.rsSet = t.checked; break;
    case 'dors': ask('<b class="text-rose-600">' + (S.rsMode === 'replace' ? L('ALL current data will be replaced by this file.', 'বর্তমান সব ডাটা এই ফাইল দিয়ে প্রতিস্থাপিত হবে।') : L('Data from this file will be merged into current data.', 'এই ফাইলের ডাটা বর্তমান ডাটার সাথে মার্জ হবে।')) + '</b><br>' + L('A safety snapshot is saved first. Continue?', 'আগে একটি সেফটি স্ন্যাপশট সেভ হবে। এগিয়ে যাবেন?'), L('Yes, Restore', 'হ্যাঁ, রিস্টোর করুন'), function () { track(srv('restoreData', $('#rspin').value, S.rsText, S.rsMode, !!S.rsSet)).then(function (rr) { S.rs = null; S.rsText = ''; S.rsBills = rr && rr.bills || 0; refreshLens(); try { localStorage.removeItem('scsb_boot'); } catch (e) {} [].forEach.call(document.querySelectorAll('.pj-billfr'), function (f) { f.remove(); }); return load(true); }).then(function () { toast(L('Restore completed', 'রিস্টোর সম্পন্ন হয়েছে') + (S.rsBills ? ' · ' + S.rsBills + L(' bills & measurements', ' টি বিল ও মেজারমেন্ট') : '')); }).catch(function (e) { toast(e.message, 'error'); }); }, true); break;
    case 'dorz': ask('<b class="text-rose-600">' + L('ALL projects and records will be permanently removed.', 'সকল প্রজেক্ট ও রেকর্ড স্থায়ীভাবে মুছে যাবে।') + '</b><br>' + L('This is your last chance. Continue?', 'এটি শেষ সুযোগ। এগিয়ে যাবেন?'), L('Yes, Reset Everything', 'হ্যাঁ, সব রিসেট করুন'), function () { track(srv('resetAll', $('#rzpin').value)).then(function () { S.rzOk = false; return load(true); }).then(function () { toast(L('All data has been reset', 'সব ডাটা রিসেট হয়েছে')); }).catch(function (e) { toast(e.message, 'error'); }); }, true); break;
  }
}
function onChange(ev) {
  var t = ev.target, f = t.getAttribute('data-f'), bk = t.getAttribute('data-bk');
  if (f === 'psort') { S.psort = t.value; ls('psort', t.value); render(); return; }
  if (f === 'month' || f === 'year') { S[f] = parseInt(t.value, 10); S.gper = 'month'; ls('gper', 'month'); render(); }
  else if (f === 'pmonth' || f === 'pdate') { S[f] = t.value || S[f]; render(); }
  else if (f === 'hf') { S.hf = t.value; histModal(); }
  else if (f === 'hday' || f === 'hmonth') { if (t.value) S.hp[f === 'hday' ? 'day' : 'month'] = t.value; histModal(); }
  else if (t.hasAttribute('data-mark')) { var mk = t.getAttribute('data-mark'); if (t.checked) S.marks[mk] = 1; else delete S.marks[mk]; var tr = t.closest('tr'); if (tr) tr.classList.toggle('bg-rose-50', t.checked); markUpd(); }
  else if (t.id === 'hmall') { [].forEach.call(document.querySelectorAll('[data-mark]'), function (cb) { cb.checked = t.checked; var k2 = cb.getAttribute('data-mark'); if (t.checked) S.marks[k2] = 1; else delete S.marks[k2]; var tr2 = cb.closest('tr'); if (tr2) tr2.classList.toggle('bg-rose-50', t.checked); }); markUpd(); }
  else if (f === 'day') { S.day = t.value || todayStr(); render(); }
  else if (bk) { S.bk[bk] = t.value; if (bk === 'scope') render(); }
  else if (t.hasAttribute('data-xco')) { var cv = t.getAttribute('data-xco'); if (t.checked) delete S.xp.coOff[cv]; else S.xp.coOff[cv] = 1; render(); }
  else if (t.hasAttribute('data-xp')) { if (t.checked) delete S.xp.off[t.getAttribute('data-xp')]; else S.xp.off[t.getAttribute('data-xp')] = 1; render(); }
  else if (t.id === 'rcrmok') { var rb = $('#rcrm'); if (rb) rb.classList.toggle('pj-hide', !t.checked); }
  else if (t.id === 'bc-sigc') { bcRead(); render(); }
  else if (t.hasAttribute('data-ab')) { var ak = t.getAttribute('data-ab'), dr = S.abDraft; if (dr) { dr[ak] = t.type === 'checkbox' ? t.checked : t.value; if (ak === 'every' || t.type === 'checkbox') render(); } }
  else if (t.hasAttribute('data-lg')) { var lk = t.getAttribute('data-lg'); if (t.value) S.lg[lk] = t.value; render(); }
  else if (t.hasAttribute('data-sigpg')) { sigRead(); S.sigDraft.on[t.getAttribute('data-sigpg')] = t.checked ? 1 : 0; render(); }
  else if (t.hasAttribute('data-sigcnt')) { sigRead(); var nc = n(t.value), lb = S.sigDraft.labels, defs = ['Prepared By', 'Checked By', 'Approved By', 'Received By', 'Accounts', 'Director']; while (lb.length < nc) lb.push(defs[lb.length] || ''); lb.length = nc; render(); }
  else if (t.hasAttribute('data-siglab')) { sigRead(); render(); }
  else if (t.getAttribute('data-xf')) { var xf = t.getAttribute('data-xf'); S.xp[xf] = xf === 'detail' ? t.checked : t.value; render(); }
  else if (t.id === 'rsfile') {
    var file = t.files && t.files[0]; if (!file) return;
    var fr = new FileReader();
    fr.onload = function () {
      try { var o = JSON.parse(fr.result); if (!o || o.app !== 'SCS Projects' || !o.data) throw new Error('bad'); var oth = 0; COLS.forEach(function (c) { if (c !== 'projects') oth += (o.data[c] || []).length; }); S.rs = { exportedAt: o.exportedAt, p: (o.data.projects || []).length, o: oth, b: billCount(o.billSheets), set: !!o.settings }; S.rsSet = false; S.rsText = fr.result; S.rsFile = file.name; }
      catch (e) { S.rs = null; S.rsText = ''; toast(L('This is not a valid SCS Projects backup file.', 'এটি বৈধ SCS Projects ব্যাকআপ ফাইল নয়।'), 'error'); }
      render();
    };
    fr.readAsText(file);
  } else if ((t.name === 'sub' || t.name === 'pid') && $('#sinfo')) subInfo();
}
function markUpd() { var k = Object.keys(S.marks).length, b = $('#hmdel'), c = $('#hmcnt'); if (b) b.disabled = !k; if (c) c.textContent = k; }
function onInput(ev) {
  var t = ev.target, f = t.getAttribute('data-f');
  if (f === 'dueq') { S.dueQ = t.value; var p0 = t.selectionStart; render(); var e0 = $('[data-f=dueq]'); if (e0) { e0.focus(); e0.setSelectionRange(p0, p0); } return; }
  if (f === 'duesort') { S.dueSort = t.value; render(); return; }
  if (f === 'dued' || f === 'duemo') { if (!t.value) return; if (f === 'dued') S.dueDate = t.value; else S.dueMonth = t.value; render(); return; }
  if (f === 'q') { S.q = t.value; if (S.view === 'project') S.view = 'projects'; var pos = t.selectionStart; render(); var el = $('[data-f=q]'); if (el) { el.focus(); el.setSelectionRange(pos, pos); } }
  else if (t.id === 'rspin') rsCheck();
  else if (t.id === 'rztype' || t.id === 'rzpin') rzCheck();
  else if (t.closest && t.closest('#mf') && $('#etot')) {
    if (t.hasAttribute('data-tri')) triCalc(t);
    var c = $('#mf').getAttribute('data-c'), id = $('#mf').getAttribute('data-id');
    if (t.hasAttribute('data-lov')) { S.lov[t.getAttribute('data-lov')] = t.value; laborTot(); }
    else if (t.hasAttribute('data-lav')) { S.lav[t.getAttribute('data-lav')] = t.value; laborTot(); }
    else if (t.hasAttribute('data-lta')) { S.lta[t.getAttribute('data-lta')] = t.value; laborTot(); }
    else if (t.hasAttribute('data-lda')) { S.lda[t.getAttribute('data-lda')] = t.value; laborTot(); }
    else if (c === 'labor' && id) $('#etot').textContent = money(n(mv('amount')));
    else if (t.closest('.crow')) chemTot();
    else if (c === 'labor' && !id) { laborTot(); [['data-lov', 'count'], ['data-lav', 'amount'], ['data-lta', 'ta'], ['data-lda', 'da']].forEach(function (k) { [].forEach.call(document.querySelectorAll('[' + k[0] + ']'), function (e) { e.placeholder = mv(k[1]) || '0'; }); }); }
    else if (c === 'chems') $('#etot').textContent = money(mv('amount').trim() !== '' ? n(mv('amount')) : n(mv('qty')) * n(mv('rate')));
    else if (c === 'subs') $('#etot').textContent = money(mv('amount').trim() !== '' ? n(mv('amount')) : n(mv('qty')) * n(mv('rate')));
    else if (c === 'labor') $('#etot').textContent = money(n(mv('amount')));
    else if (c === 'bills') $('#etot').textContent = money(n(mv('amount')) - n(mv('vat')) - n(mv('tax')) - n(mv('ait')));
    else $('#etot').textContent = money(n(mv('ta')) + n(mv('da')) + n(mv('transport')) + n(mv('other')));
  }
}
/* টেবিল ধরে টেনে ডানে-বামে সরানো (ম্যাক / উইন্ডোজ / মোবাইল সব জায়গায়) */
function dragScroll() {
  var box = null, sx = 0, sl = 0, moved = false;
  var SEL = '.overflow-x-auto, .pj-fs-scroll, .pj-lwrap';
  document.addEventListener('mousedown', function (e) {
    if (e.button !== 0) return;
    var b = e.target.closest(SEL); if (!b || b.scrollWidth <= b.clientWidth + 2) return;
    if (e.target.closest('input, select, textarea, button, a, label')) return;
    var r = b.getBoundingClientRect(); if (e.clientY > r.bottom - 16) return;          // নিচের স্ক্রলবার নিজের মতো কাজ করবে
    box = b; sx = e.clientX; sl = b.scrollLeft; moved = false;
  });
  document.addEventListener('mousemove', function (e) {
    if (!box) return;
    var dx = e.clientX - sx;
    if (!moved && Math.abs(dx) > 4) { moved = true; box.classList.add('pj-dragging'); }
    if (moved) { box.scrollLeft = sl - dx; e.preventDefault(); }
  });
  document.addEventListener('mouseup', function () {
    if (!box) return; box.classList.remove('pj-dragging'); box = null;
    if (moved) { var stop = function (ev) { ev.stopPropagation(); ev.preventDefault(); document.removeEventListener('click', stop, true); }; document.addEventListener('click', stop, true); setTimeout(function () { document.removeEventListener('click', stop, true); }, 50); }
  });
  /* মাউসের চাকা ঘোরালে (Shift ছাড়াও) টেবিল শুধু পাশে সরতে পারলে পাশে সরবে না — তবে Shift + চাকা বা ট্র্যাকপ্যাডে পাশাপাশি সোয়াইপ কাজ করবে */
}
/* ---------- টেবিলের হেডার স্ক্রিনের উপরে আটকে থাকে (টেবিল যতক্ষণ দেখা যায়) ---------- */
var FH = { el: null, cur: null, w: 0, raf: 0 };
function fhBuild() {
  var el = document.getElementById('pjfh');
  if (!el) { el = document.createElement('div'); el.id = 'pjfh'; el.className = 'pj-fh no-print'; document.body.appendChild(el); }
  FH.el = el; FH.cur = null; el.innerHTML = ''; el.style.display = 'none'; fhUpdate();
}
function fhTop() { var h = document.querySelector('header.sticky'); if (!h) return 0; var r = h.getBoundingClientRect(); return r.bottom > 0 ? r.bottom : 0; }
function fhClone(box) {
  var t = box.querySelector('table'), c = t.cloneNode(false), h = t.tHead.cloneNode(true), cg = document.createElement('colgroup');
  var row = null; [].some.call(t.tBodies[0] ? t.tBodies[0].rows : [], function (r) { var ok = [].every.call(r.cells, function (x) { return x.colSpan === 1; }); if (ok && r.cells.length > 1) { row = r; return true; } return false; });
  var full = 0; [].forEach.call(t.tHead.rows[0].cells, function (x) { full += x.colSpan; });
  if (row && row.cells.length === full) {
    [].forEach.call(row.cells, function (x) { var col = document.createElement('col'); col.style.width = x.getBoundingClientRect().width + 'px'; cg.appendChild(col); });
    c.appendChild(cg); c.style.tableLayout = 'fixed';
  } else {
    var src = t.tHead.querySelectorAll('th'), dst = h.querySelectorAll('th');
    [].forEach.call(src, function (x, i) { var w = x.getBoundingClientRect().width + 'px'; dst[i].style.width = dst[i].style.minWidth = dst[i].style.maxWidth = w; });
  }
  [].forEach.call(t.tHead.rows, function (r, i) { h.rows[i].style.height = r.getBoundingClientRect().height + 'px'; });
  c.style.width = t.getBoundingClientRect().width + 'px'; c.style.margin = '0'; c.removeAttribute('id'); c.appendChild(h);
  FH.el.innerHTML = ''; FH.el.appendChild(c); FH.cur = box; FH.w = t.offsetWidth;
}
function fhUpdate() {
  var el = FH.el; if (!el) return;
  if (S.billOpen || S.focus || !S.role) { el.style.display = 'none'; return; }
  var top = fhTop(), pick = null;
  [].forEach.call(document.querySelectorAll('.pj-lwrap'), function (b) {
    var t = b.querySelector('table'); if (!t || !t.tHead || !b.offsetParent) return;
    var hr = t.tHead.getBoundingClientRect(), tr = t.getBoundingClientRect();
    if (hr.top < top - 1 && tr.bottom > top + hr.height + 30) pick = b;
  });
  if (!pick) { el.style.display = 'none'; return; }
  if (FH.cur !== pick || FH.w !== pick.querySelector('table').offsetWidth || !el.firstChild) fhClone(pick);
  var br = pick.getBoundingClientRect();
  el.style.display = 'block'; el.style.top = top + 'px'; el.style.left = br.left + 'px'; el.style.width = pick.clientWidth + 'px';
  el.firstChild.style.transform = 'translateX(' + (-pick.scrollLeft) + 'px)';
}
function fhSoon() { if (FH.raf) return; FH.raf = requestAnimationFrame(function () { FH.raf = 0; fhUpdate(); }); }
document.addEventListener('scroll', fhSoon, true); window.addEventListener('resize', function () { FH.cur = null; fhSoon(); });
function markScrollers() {
  [].forEach.call(document.querySelectorAll('.overflow-x-auto, .pj-fs-scroll, .pj-lwrap'), function (b) { b.classList.toggle('pj-can-drag', b.scrollWidth > b.clientWidth + 2); });
}
function init() {
  dragScroll();
  window.addEventListener('resize', markScrollers);
  document.body.insertAdjacentHTML('beforeend', '<div id="modal"></div><div id="toast"></div><div id="xprint"></div>');
  document.addEventListener('click', onClick); document.addEventListener('change', onChange); document.addEventListener('input', onInput);
  document.addEventListener('error', function (e) { var t = e.target; if (t && t.tagName === 'IMG' && t.getAttribute('data-logo') && !t.getAttribute('data-fb')) { t.setAttribute('data-fb', '1'); t.src = LOGO; } }, true);
  document.addEventListener('submit', function (e) { if (e.target.id === 'mf') { e.preventDefault(); submitForm(e.target); } });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && S.billOpen && !$('#modal').innerHTML) { closeBill(); return; }
    if (e.key === 'Escape' && S.focus && !$('#modal').innerHTML) { S.focus = false; render(); return; }
    if (!S.role && !$('#modal').innerHTML) { if (/^\d$/.test(e.key)) pinKey(e.key); else if (e.key === 'Backspace') { S.pin = S.pin.slice(0, -1); render(); } else if (e.key === 'Enter') tryLogin(true); }
  });
  S.backupDone = ss('bk') === '1';
  if (S.role) { try { var cd = sessionStorage.getItem('scs_pj_cache'); if (cd) applyData(JSON.parse(cd)); } catch (e) {} S.loading = !D.projects.length; }
  render();
  if (S.role) { load(true); pingSoon(); }
  refreshLens();
  setInterval(poll, 10000); setInterval(updSync, 5000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) poll(); });
  window.addEventListener('focus', poll); window.addEventListener('online', function () { if (S.role) load(true); });
}
init();
})();

