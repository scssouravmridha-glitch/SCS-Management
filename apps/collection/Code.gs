/**
 * SCS Collection - Backend (Google Apps Script)
 * দুইটি মডিউল: Project Work Bill Collection ও Chemical Sales Collection
 * Google Sheet = ডাটাবেজ।
 *   Project_Bill_Collection, Chemical_Sales_Collection → এন্ট্রি (প্রতিটি কলাম আলাদা, শিটে পড়া যায়)
 *   Settings        → পিন (হ্যাশ), কোম্পানির নাম, লোগো, প্রিন্ট সিগনেচার ইত্যাদি
 *   Activity_Log    → কি যোগ / এডিট / ডিলিট / ইম্পোর্ট / রিস্টোর / রিসেট হয়েছে
 *   Backup_History  → রিস্টোর ও রিসেটের আগের স্বয়ংক্রিয় স্ন্যাপশট
 * ডিপ্লয়: গুগল শিট → Extensions > Apps Script → Code.gs ও Index.html পেস্ট → authorizeAll একবার Run → Deploy > Web app
 * ডিফল্ট পিন: ইউজার 2019, অ্যাডমিন 2026 (Admin > সিকিউরিটি থেকে বদলানো যায়)
 */
var APP_NAME = 'SCS Collection';
var SH = { bills: 'Project_Bill_Collection', chems: 'Chemical_Sales_Collection', moves: 'Cash_Bank_Transfers', SET: 'Settings', LOG: 'Activity_Log', HIS: 'Backup_History' };
var COLLS = ['bills', 'chems', 'moves'];
var DEF_USER_PIN = '2019', DEF_ADMIN_PIN = '2026';

/* প্রতিটি মডিউলের কলাম: [ফিল্ড, শিটের হেডার, ধরন] — ধরন: t = টেক্সট, n = সংখ্যা */
var F = {
  bills: [
    ['id', 'ID', 't'], ['sl', 'Serial No', 'n'], ['billNo', 'Bill No', 't'], ['date', 'Date', 't'],
    ['company', 'Company Name', 't'], ['contact', 'Contact No', 't'], ['amount', 'Amount', 'n'],
    ['method', 'Payment Method', 't'], ['bank', 'Bank Name', 't'], ['chequeNo', 'Cheque No', 't'],
    ['chequeDate', 'Cheque Date', 't'], ['receiver', 'Receiver Name', 't'], ['sig', 'Signature', 't'],
    ['remark', 'Remark', 't'], ['createdAt', 'Created At', 't'], ['updatedAt', 'Updated At', 't'],
    ['acct', 'Deposited To (Account)', 't']   // নতুন কলাম সবসময় শেষে — পুরনো সারি ঠিক থাকে
  ],
  chems: [
    ['id', 'ID', 't'], ['sl', 'Serial No', 'n'], ['orderNo', 'Order No', 't'], ['date', 'Collection Date', 't'],
    ['client', 'Client / Project Name', 't'], ['mobile', 'Mobile No', 't'], ['amount', 'Collection Amount', 'n'],
    ['createdAt', 'Created At', 't'], ['updatedAt', 'Updated At', 't'],
    ['acct', 'Deposited To (Account)', 't']
  ],
  /* ক্যাশ ও ব্যাংক: ব্যাংকে জমা / উত্তোলন / ব্যাংক থেকে ব্যাংক ট্রান্সফার */
  moves: [
    ['id', 'ID', 't'], ['sl', 'Serial No', 'n'], ['date', 'Date', 't'], ['kind', 'Type', 't'], ['from', 'From Account', 't'], ['to', 'To Account', 't'],
    ['amount', 'Amount', 'n'], ['note', 'Note', 't'], ['createdAt', 'Created At', 't'], ['updatedAt', 'Updated At', 't']
  ]
};
var METHODS = ['cash', 'cheque', 'transfer'];

function doGet() {
  try { setupDatabase(); } catch (e) {}
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle(APP_NAME)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/* গুগল ড্রাইভের লোগো ফাইলটি আসল রূপে (স্বচ্ছ ব্যাকগ্রাউন্ডসহ) আনে — অ্যাডমিন পিন */
function fetchLogo(pin, url) {
  needAdmin_(pin);
  url = String(url || '').trim();
  var m = url.match(/\/d\/([a-zA-Z0-9_-]{10,})/) || url.match(/[?&]id=([a-zA-Z0-9_-]{10,})/), blob;
  if (m) blob = DriveApp.getFileById(m[1]).getBlob();
  else if (/^https:\/\//.test(url)) blob = UrlFetchApp.fetch(url, { followRedirects: true }).getBlob();
  else throw new Error('Paste a Google Drive or image link');
  var type = blob.getContentType() || 'image/png', bytes = blob.getBytes();
  if (!/^image\//.test(type)) throw new Error('This link is not an image');
  if (bytes.length > 8 * 1024 * 1024) throw new Error('Image is larger than 8 MB');
  return 'data:' + type + ';base64,' + Utilities.base64Encode(bytes);
}

/* ---------- ডাটাবেজ শিট ---------- */
function prop_(k) { return PropertiesService.getScriptProperties().getProperty(k) || ''; }
function setProp_(k, v) { PropertiesService.getScriptProperties().setProperty(k, String(v)); }
function home_() {
  var a = null;
  try { a = SpreadsheetApp.getActiveSpreadsheet(); } catch (e) {}
  if (a) { if (prop_('DB_SPREADSHEET_ID') !== a.getId()) setProp_('DB_SPREADSHEET_ID', a.getId()); return a; }
  var id = prop_('DB_SPREADSHEET_ID');
  if (id) return SpreadsheetApp.openById(id);
  var ss = SpreadsheetApp.create('SCS Collection Database');      // শিট ছাড়া স্ক্রিপ্ট হলে নিজে শিট বানায়
  setProp_('DB_SPREADSHEET_ID', ss.getId());
  return ss;
}
function sheet_(name, head) {
  var ss = home_(), sh = ss.getSheetByName(name);
  var paint = function () { sh.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight('bold').setBackground('#be185d').setFontColor('#ffffff'); sh.setFrozenRows(1); };
  if (!sh) { sh = ss.insertSheet(name); paint(); return sh; }
  var cur = sh.getRange(1, 1, 1, head.length).getValues()[0];
  if (cur.join('|') !== head.join('|')) paint();                   // হেডার বদলালে (যেমন Work Order No → Bill No) আপডেট
  return sh;
}
function dataSheet_(coll) {
  if (!F[coll]) throw new Error('Unknown module');
  return sheet_(SH[coll], F[coll].map(function (f) { return f[1]; }));
}
function set_() { return sheet_(SH.SET, ['Key', 'Value', 'UpdatedAt']); }
function log_() { return sheet_(SH.LOG, ['At', 'Action', 'Module', 'ID', 'Details', 'By']); }
function his_() { return sheet_(SH.HIS, ['SavedAt', 'Reason', 'Json']); }
function setupDatabase() {
  if (prop_('SCSC_READY') === '4') return 'OK';
  dataSheet_('bills'); dataSheet_('chems'); dataSheet_('moves'); set_(); log_(); his_();
  try { var ss = home_(), d = ss.getSheetByName('Sheet1'); if (d && d.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(d); } catch (e) {}
  setProp_('SCSC_READY', '4');
  return 'OK: ' + home_().getName();
}
function bump_() { try { setProp_('DB_REV', Date.now() + '-' + Math.random().toString(36).slice(2, 6)); } catch (e) {} }
function lock_(fn) { var l = LockService.getScriptLock(); l.waitLock(30000); try { var r = fn(); bump_(); return r; } finally { l.releaseLock(); } }
function getRev() { return prop_('DB_REV') || '0'; }

/* ---------- সেটিংস ও পিন (ইউজার + অ্যাডমিন) ---------- */
function sha_(s) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(s), Utilities.Charset.UTF_8)
    .map(function (x) { var v = (x < 0 ? x + 256 : x).toString(16); return v.length === 1 ? '0' + v : v; }).join('');
}
function settings_() {
  var sh = set_(), n = sh.getLastRow(), o = {};
  if (n < 2) return o;
  sh.getRange(2, 1, n - 1, 2).getValues().forEach(function (r) { if (r[0] !== '') o[String(r[0])] = String(r[1]); });
  return o;
}
function putSetting_(k, v) {
  var sh = set_(), n = sh.getLastRow(), row = 0;
  if (n >= 2) {
    var ks = sh.getRange(2, 1, n - 1, 1).getValues();
    for (var i = 0; i < ks.length; i++) if (String(ks[i][0]) === k) { row = i + 2; break; }
  }
  if (!row) row = n + 1;
  sh.getRange(row, 1, 1, 3).setNumberFormat('@').setValues([[k, String(v), new Date().toISOString()]]);
}
function hashOf_(p) { return sha_('scsc|' + String(p || '')); }
function adminHash_() { return settings_().admin_pin_hash || hashOf_(DEF_ADMIN_PIN); }
function userHash_() { return settings_().user_pin_hash || hashOf_(DEF_USER_PIN); }
function loginCheck(pin) {
  pin = String(pin || '');
  if (!/^\d{4,8}$/.test(pin)) return '';
  var h = hashOf_(pin);
  if (h === adminHash_()) return 'admin';
  return h === userHash_() ? 'user' : '';
}
function isAdmin_(pin) { return /^\d{4,8}$/.test(String(pin || '')) && hashOf_(pin) === adminHash_(); }
function verifyAdmin(pin) { return isAdmin_(pin); }
function needPin_(pin) { if (!loginCheck(pin)) throw new Error('ভুল পিন! / Wrong PIN.'); }
function needAdmin_(pin) { if (!isAdmin_(pin)) throw new Error('ভুল অ্যাডমিন পিন! / Wrong admin PIN.'); }
/* লগইন স্ক্রিন যেন এন্টার ছাড়াই যাচাই করতে পারে — শুধু পিনের দৈর্ঘ্য জানায় */
function pinInfo() {
  var s = settings_(), L = {};
  [Number(s.admin_pin_len || DEF_ADMIN_PIN.length), Number(s.user_pin_len || DEF_USER_PIN.length)].forEach(function (x) { if (x >= 4 && x <= 8) L[x] = 1; });
  return { lens: Object.keys(L).map(Number).sort() };
}
function loginLoad(pin) { var r = loginCheck(pin); return r ? { role: r, data: loadAll() } : { role: '' }; }
function checkNewPin_(p, otherHash) {
  p = String(p || '');
  if (!/^\d{4,8}$/.test(p)) throw new Error('পিন ৪–৮ সংখ্যার হতে হবে। / PIN must be 4–8 digits.');
  if (hashOf_(p) === otherHash) throw new Error('অ্যাডমিন ও ইউজার পিন আলাদা হতে হবে। / Admin and user PIN must be different.');
  return p;
}
function changeAdminPin(oldPin, newPin) {
  needAdmin_(oldPin); newPin = checkNewPin_(newPin, userHash_());
  return lock_(function () { putSetting_('admin_pin_hash', hashOf_(newPin)); putSetting_('admin_pin_len', newPin.length); writeLog_('settings', '', '', 'Admin PIN changed', 'admin'); return true; });
}
function changeUserPin(adminPin, newPin) {
  needAdmin_(adminPin); newPin = checkNewPin_(newPin, adminHash_());
  return lock_(function () { putSetting_('user_pin_hash', hashOf_(newPin)); putSetting_('user_pin_len', newPin.length); writeLog_('settings', '', '', 'User PIN changed', 'admin'); return true; });
}
var PUBLIC_KEYS = ['company', 'tagline', 'currency', 'logo', 'sig', 'editPin', 'accounts', 'openings', 'logoBg', 'logoData', 'sigImg1', 'sigImg2', 'sigImg3', 'sigImg4'];
var OWN_KEYS = { accounts: 1, openings: 1 };   // এগুলো আলাদা ফাংশনে সেভ হয়
function publicSettings_() {
  var s = settings_(), o = {};
  PUBLIC_KEYS.forEach(function (k) { if (s[k] !== undefined) o[k] = s[k]; });
  try { o.sheetUrl = home_().getUrl(); } catch (e) {}
  return o;
}
/* সব সংবেদনশীল সেটিং — অ্যাডমিন পিন লাগবে */
function saveSettings(json, adminPin) {
  needAdmin_(adminPin);
  var o = JSON.parse(json || '{}');
  return lock_(function () {
    PUBLIC_KEYS.forEach(function (k) {
      if (o[k] === undefined || OWN_KEYS[k]) return;
      var v = String(o[k]);
      if (k === 'sig') JSON.parse(v);
      var big = k === 'logoData' || /^sigImg/.test(k);
      if (big && v && !/^data:image\/(png|webp|jpeg|svg\+xml);base64,/.test(v)) throw new Error('Invalid image');
      if (big && v.length > 48000) throw new Error('Image is too large');
      putSetting_(k, v.slice(0, big ? 48000 : k === 'logo' ? 2000 : k === 'sig' ? 4000 : 1000));
    });
    writeLog_('settings', '', '', 'Settings updated: ' + Object.keys(o).join(', '), 'admin');
    return publicSettings_();
  });
}

/* ---------- ক্যাশ ও ব্যাংক: ব্যাংকের তালিকা ও প্রতি মাসের শুরুর ব্যালেন্স ---------- */
function saveAccounts(pin, json) {
  needAdmin_(pin);
  var list = JSON.parse(json || '[]').filter(function (a) { return a && a.id && a.name; }).map(function (a) { return { id: String(a.id).slice(0, 40), name: String(a.name).slice(0, 60), off: !!a.off }; });
  return lock_(function () { putSetting_('accounts', JSON.stringify(list)); writeLog_('settings', 'moves', '', 'Bank accounts: ' + list.map(function (a) { return a.name + (a.off ? ' (hidden)' : ''); }).join(', '), 'admin'); return publicSettings_(); });
}
/* month = yyyy-mm; json = { cash: 1000, brac: 5000, … } — খালি json দিলে সেই মাসের শুরুর ব্যালেন্স মুছে যায় (আগের মাস থেকে নিজে হিসাব হবে) */
function saveOpening(pin, month, json, who) {
  needPin_(pin);
  if (!/^\d{4}-\d{2}$/.test(String(month))) throw new Error('মাস দিন। / Month is required.');
  var v = JSON.parse(json || '{}'), clean = {};
  Object.keys(v).forEach(function (k) { var x = parseFloat(String(v[k]).replace(/,/g, '')); if (isFinite(x)) clean[String(k).slice(0, 40)] = x; });
  return lock_(function () {
    var all = {}; try { all = JSON.parse(settings_().openings || '{}') || {}; } catch (e) {}
    if (Object.keys(clean).length) all[month] = clean; else delete all[month];
    putSetting_('openings', JSON.stringify(all));
    writeLog_('settings', 'moves', '', 'Opening balance ' + month + ': ' + (Object.keys(clean).length ? Object.keys(clean).map(function (k) { return k + ' ' + clean[k]; }).join(', ') : 'removed'), who_(who));
    return publicSettings_();
  });
}

/* ---------- ডাটা পড়া ---------- */
function cellStr_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  return v === null || v === undefined ? '' : String(v);
}
function rowToObj_(coll, r, withSig) {
  var o = {};
  F[coll].forEach(function (f, i) {
    var v = r[i];
    if (f[0] === 'sig') { o.hasSig = !!String(v || ''); if (withSig) o.sig = String(v || ''); return; }
    if (f[2] === 'n') { var x = parseFloat(String(v).replace(/,/g, '')); o[f[0]] = isFinite(x) ? x : 0; }
    else o[f[0]] = cellStr_(v);
  });
  return o;
}
function readColl_(coll, withSig) {
  var sh = dataSheet_(coll), n = sh.getLastRow(), w = F[coll].length, out = [];
  if (n < 2) return out;
  sh.getRange(2, 1, n - 1, w).getValues().forEach(function (r) {
    if (!String(r[0] || '').trim()) return;
    out.push(rowToObj_(coll, r, withSig));
  });
  return out;
}
function loadAll() {
  return { bills: readColl_('bills'), chems: readColl_('chems'), moves: readColl_('moves'), settings: publicSettings_(), rev: getRev() };
}
function findRow_(sh, id) {
  var n = sh.getLastRow();
  if (n < 2) return 0;
  var v = sh.getRange(2, 1, n - 1, 1).getValues();
  for (var i = 0; i < v.length; i++) if (String(v[i][0]) === String(id)) return i + 2;
  return 0;
}
function getSig(coll, id) {
  if (coll !== 'bills') return '';
  var sh = dataSheet_('bills'), row = findRow_(sh, id);
  if (!row) return '';
  return String(sh.getRange(row, 1 + F.bills.map(function (f) { return f[0]; }).indexOf('sig')).getValue() || '');
}

/* ---------- সেভ (নতুন এন্ট্রিতে পিন লাগে না, এডিটে পিন লাগে) ---------- */
function clean_(coll, o) {
  var s = function (k, max) { return String(o[k] == null ? '' : o[k]).trim().slice(0, max || 200); };
  var num = function (k) { var x = parseFloat(String(o[k] == null ? '' : o[k]).replace(/,/g, '')); return isFinite(x) ? x : 0; };
  var d = /^\d{4}-\d{2}-\d{2}$/;
  var r = { id: s('id', 60), sl: num('sl') };
  if (!d.test(s('date'))) throw new Error('তারিখ দিন। / Date is required.');
  r.date = s('date');
  if (!(num('amount') > 0)) throw new Error('টাকার পরিমাণ দিন। / Amount is required.');
  r.amount = num('amount');
  if (coll === 'moves') {
    r.kind = /^(deposit|withdraw|transfer)$/.test(s('kind')) ? s('kind') : 'transfer';
    r.from = s('from', 40); r.to = s('to', 40); r.note = s('note', 300);
    if (!r.from || !r.to) throw new Error('কোন অ্যাকাউন্ট থেকে কোথায় — দুটোই দিন। / Choose both accounts.');
    if (r.from === r.to) throw new Error('একই অ্যাকাউন্টে ট্রান্সফার হয় না। / From and To must differ.');
    if (o.createdAt) r.createdAt = s('createdAt', 40);
    if (o.updatedAt) r.updatedAt = s('updatedAt', 40);
    return r;
  }
  r.acct = s('acct', 40);
  if (coll === 'bills') {
    r.billNo = s('billNo') || s('wo'); r.company = s('company'); r.contact = s('contact', 40);
    if (!r.company) throw new Error('প্রতিষ্ঠানের নাম দিন। / Company name is required.');
    r.method = METHODS.indexOf(s('method')) >= 0 ? s('method') : 'cash';
    r.bank = r.method === 'cash' ? '' : s('bank');
    r.chequeNo = r.method === 'cheque' ? s('chequeNo', 40) : '';
    r.chequeDate = r.method === 'cheque' && d.test(s('chequeDate')) ? s('chequeDate') : '';
    r.receiver = s('receiver'); r.remark = s('remark', 500);
    if (o.sig !== undefined) {
      r.sig = String(o.sig || '');
      if (r.sig && !/^data:image\/(png|jpeg);base64,/.test(r.sig)) throw new Error('Bad signature image');
      if (r.sig.length > 49000) throw new Error('সিগনেচার অনেক বড়। / Signature too large.');
    }
  } else {
    r.orderNo = s('orderNo'); r.client = s('client'); r.mobile = s('mobile', 40);
    if (!r.client) throw new Error('ক্লায়েন্ট / প্রজেক্টের নাম দিন। / Client or project name is required.');
  }
  if (o.createdAt) r.createdAt = s('createdAt', 40);
  if (o.updatedAt) r.updatedAt = s('updatedAt', 40);
  return r;
}
function summary_(coll, o) {
  if (coll === 'moves') return o.kind + ' · ' + o.from + ' → ' + o.to + ' · ' + o.amount + ' · ' + o.date + (o.note ? ' · ' + o.note : '');
  return coll === 'bills'
    ? '#' + o.sl + ' · Bill ' + (o.billNo || '-') + ' · ' + o.company + ' · ' + o.amount + ' · ' + o.method + ' · ' + o.date
    : '#' + o.sl + ' · Order ' + (o.orderNo || '-') + ' · ' + o.client + ' · ' + o.amount + ' · ' + o.date;
}
function rowVals_(coll, o) { return F[coll].map(function (f) { var v = o[f[0]]; return f[2] === 'n' ? Number(v) || 0 : String(v == null ? '' : v); }); }
function rowFmts_(coll) { return F[coll].map(function (f) { return f[0] === 'amount' ? '#,##0.00' : f[2] === 'n' ? '0' : '@'; }); }
function newId_() { return 'E' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function nextSl_(sh) {
  var n = sh.getLastRow(), mx = 0;
  if (n < 2) return 1;
  sh.getRange(2, 2, n - 1, 1).getValues().forEach(function (r) { var x = Number(r[0]) || 0; if (x > mx) mx = x; });
  return mx + 1;
}
function saveRecord(coll, json, pin, who) {
  if (!F[coll]) throw new Error('Unknown module');
  var o = clean_(coll, JSON.parse(json));
  return lock_(function () {
    var sh = dataSheet_(coll), old = o.id ? findRow_(sh, o.id) : 0, now = new Date().toISOString(), prev = null;
    if (coll === 'moves') needPin_(pin);                         // টাকা সরানো — সবসময় পিন
    if (old) {
      needPin_(pin);                                             // এডিট — পিন বাধ্যতামূলক
      prev = rowToObj_(coll, sh.getRange(old, 1, 1, F[coll].length).getValues()[0], true);
      if (o.sig === undefined && coll === 'bills') o.sig = prev.sig;
      o.createdAt = prev.createdAt || now;
      if (!o.sl) o.sl = prev.sl;
    } else {
      o.id = o.id || newId_();
      o.createdAt = now;
      if (!o.sl) o.sl = nextSl_(sh);
    }
    o.updatedAt = now;
    var row = old || sh.getLastRow() + 1, vals = rowVals_(coll, o);
    sh.getRange(row, 1, 1, vals.length).setNumberFormats([rowFmts_(coll)]).setValues([vals]);
    if (old) {
      var ch = [];
      F[coll].forEach(function (f) { var k = f[0]; if (k === 'updatedAt' || k === 'createdAt') return; var a = k === 'sig' ? (prev.sig ? 'signed' : '') : String(prev[k]), b = k === 'sig' ? (o.sig ? 'signed' : '') : String(o[k]); if (a !== b) ch.push(f[1] + ': ' + a + ' → ' + b); });
      writeLog_('edit', coll, o.id, summary_(coll, o) + (ch.length ? ' | ' + ch.join('; ') : ''), who);
    } else writeLog_('add', coll, o.id, summary_(coll, o), who);
    return rowToObj_(coll, vals, false);
  });
}
/* CSV ইম্পোর্ট — আগের সব ডাটা থাকবে, নতুনগুলো নিচে যোগ হবে (সিরিয়াল নম্বর আগের শেষ নম্বরের পর থেকে) */
function importRecords(coll, listJson, pin, who) {
  needPin_(pin);
  if (!F[coll]) throw new Error('Unknown module');
  var list = JSON.parse(listJson || '[]');
  if (!list.length) throw new Error('ইম্পোর্ট করার মত কোনো সারি নেই। / Nothing to import.');
  if (list.length > 10000) throw new Error('একবারে সর্বোচ্চ ১০০০০ সারি। / Max 10000 rows at a time.');
  var bad = [], clean = [];
  list.forEach(function (o, i) { try { o.id = ''; o.sl = 0; clean.push(clean_(coll, o)); } catch (e) { bad.push(i + 1); } });
  if (!clean.length) throw new Error('কোনো সারি ঠিক নেই। / No valid rows.');
  return lock_(function () {
    var sh = dataSheet_(coll), sl = nextSl_(sh), now = new Date().toISOString();
    clean.forEach(function (o) { o.id = newId_() + Math.random().toString(36).slice(2, 4); o.sl = sl++; o.createdAt = now; o.updatedAt = now; });
    var start = sh.getLastRow() + 1, vals = clean.map(function (o) { return rowVals_(coll, o); });
    var fm = rowFmts_(coll), fmts = vals.map(function () { return fm; });
    sh.getRange(start, 1, vals.length, F[coll].length).setNumberFormats(fmts).setValues(vals);
    writeLog_('import', coll, '', 'Import: ' + clean.length + ' rows (SL ' + clean[0].sl + '–' + clean[clean.length - 1].sl + ')' + (bad.length ? ', skipped ' + bad.length : ''), who);
    return vals.map(function (v) { return rowToObj_(coll, v, false); });
  });
}

/* ---------- ডিলিট — সবসময় পিন লাগবে; ডিলিট হওয়া ডাটা লগে থেকে যায় ---------- */
function deleteRecords(listJson, pin, who) {
  needPin_(pin);
  var list = JSON.parse(listJson || '[]');
  return lock_(function () {
    var cnt = 0;
    COLLS.forEach(function (coll) {
      var want = {};
      list.forEach(function (x) { if (x && x.c === coll && x.id) want[String(x.id)] = 1; });
      if (!Object.keys(want).length) return;
      var sh = dataSheet_(coll), n = sh.getLastRow();
      if (n < 2) return;
      var v = sh.getRange(2, 1, n - 1, F[coll].length).getValues();
      for (var i = v.length - 1; i >= 0; i--) {
        if (want[String(v[i][0])]) {
          var o = rowToObj_(coll, v[i], false);
          sh.deleteRow(i + 2); cnt++;
          writeLog_('delete', coll, o.id, summary_(coll, o), who);
        }
      }
    });
    return cnt;
  });
}

/* ---------- অ্যাক্টিভিটি লগ ---------- */
function who_(w) { return /^(admin|user)$/.test(String(w)) ? String(w) : ''; }
function writeLog_(act, coll, id, details, who) {
  try {
    var sh = log_();
    sh.getRange(sh.getLastRow() + 1, 1, 1, 6).setNumberFormat('@').setValues([[new Date().toISOString(), act, coll || '', String(id || ''), String(details || '').slice(0, 45000), who_(who)]]);
    var extra = (sh.getLastRow() - 1) - 20000; if (extra > 0) sh.deleteRows(2, extra);
  } catch (e) {}
}
function readLog_(limit) {
  var sh = log_(), n = sh.getLastRow(), out = [];
  if (n < 2) return out;
  var v = sh.getRange(2, 1, n - 1, 6).getValues();
  for (var i = v.length - 1; i >= 0 && out.length < limit; i--) out.push({ at: cellStr_(v[i][0]), act: String(v[i][1]), coll: String(v[i][2]), id: String(v[i][3]), det: String(v[i][4]), by: String(v[i][5]) });
  return out;
}
function getLog(limit) { return readLog_(Math.min(Number(limit) || 300, 2000)); }

/* ---------- পুরনো গুগল শিট থেকে ডাটা পড়া (অ্যাডমিন) — শুধু পড়ে, কিছু বদলায় না ---------- */
function readSheetForImport(pin, url) {
  needAdmin_(pin);
  url = String(url || '').trim();
  var m = url.match(/\/d\/([a-zA-Z0-9_-]{20,})/), id = m ? m[1] : (/^[a-zA-Z0-9_-]{20,}$/.test(url) ? url : '');
  if (!id) throw new Error('গুগল শিটের লিংক দিন (…/spreadsheets/d/XXXX/…)। / Paste the Google Sheet link.');
  var ss;
  try { ss = SpreadsheetApp.openById(id); } catch (e) { throw new Error('শিটটি খোলা যায়নি। যে গুগল অ্যাকাউন্টে অ্যাপ ডিপ্লয় করা, সেই অ্যাকাউন্টের শিটটি দেখার (View) অনুমতি থাকতে হবে। / Cannot open the sheet: the account that deployed the app needs at least view access.'); }
  var own = {}; Object.keys(SH).forEach(function (k) { own[SH[k]] = 1; });
  var tz = ss.getSpreadsheetTimeZone(), tabs = [];
  ss.getSheets().forEach(function (sh) {
    if (id === home_().getId() && own[sh.getName()]) return;
    var r = Math.min(sh.getLastRow(), 10000), c = Math.min(sh.getLastColumn(), 26);
    if (r < 1 || c < 1) return;
    var rg = sh.getRange(1, 1, r, c), v = rg.getValues(), d = rg.getDisplayValues();
    tabs.push({ name: sh.getName(), rows: v.map(function (row, i) { return row.map(function (x, j) {
      if (x instanceof Date) return Utilities.formatDate(x, tz, 'yyyy-MM-dd');
      if (typeof x === 'number') return String(x);
      return d[i][j];
    }); }) });
  });
  return { title: ss.getName(), tabs: tabs };
}

/* ---------- ব্যাকআপ / রিস্টোর / রিসেট (সব কাজে অ্যাডমিন পিন) ---------- */
function exportAll(pin) {
  needAdmin_(pin);
  return { app: APP_NAME, version: 1, kind: 'data', exportedAt: new Date().toISOString(), data: { bills: readColl_('bills', true), chems: readColl_('chems', true), moves: readColl_('moves') } };
}
function fullBackup_() {
  var s = settings_();
  return { app: APP_NAME, version: 1, kind: 'full', exportedAt: new Date().toISOString(), source: home_().getName(), data: { bills: readColl_('bills', true), chems: readColl_('chems', true), moves: readColl_('moves') }, settings: s, recovery: { email: prop_('REC_EMAIL'), phone: prop_('REC_PHONE') }, log: readLog_(20000) };
}
function exportFull(pin) { needAdmin_(pin); return fullBackup_(); }
function snapshot_(reason) {
  var json = JSON.stringify({ bills: readColl_('bills', true), chems: readColl_('chems', true), moves: readColl_('moves') }), h = his_(), parts = [], stamp = new Date().toISOString();
  for (var i = 0; i < json.length; i += 45000) parts.push(json.substr(i, 45000));
  h.getRange(h.getLastRow() + 1, 1, parts.length, 3).setNumberFormat('@').setValues(parts.map(function (p, k) { return [stamp, reason + ' #' + k, p]; }));
  var extra = (h.getLastRow() - 1) - 600; if (extra > 0) h.deleteRows(2, extra);
}
function clearColl_(coll) { var sh = dataSheet_(coll), n = sh.getLastRow(); if (n >= 2) sh.deleteRows(2, n - 1); }
function writeRows_(coll, list) {
  if (!list.length) return 0;
  var sh = dataSheet_(coll), start = sh.getLastRow() + 1, fm = rowFmts_(coll);
  var vals = list.map(function (o) { return rowVals_(coll, o); });
  sh.getRange(start, 1, vals.length, F[coll].length).setNumberFormats(vals.map(function () { return fm; })).setValues(vals);
  return vals.length;
}
function restoreData(pin, jsonText, mode, withSettings) {
  needAdmin_(pin);
  var obj = JSON.parse(jsonText), data = obj && obj.data;
  if (!obj || obj.app !== APP_NAME || !data) throw new Error('এটি SCS Collection এর ব্যাকআপ ফাইল নয়। / Not an SCS Collection backup.');
  return lock_(function () {
    snapshot_('before restore');
    var rows = 0;
    if (withSettings && obj.settings) Object.keys(obj.settings).forEach(function (k) { putSetting_(k, obj.settings[k]); });
    COLLS.forEach(function (c) {
      var list = (data[c] || []).map(function (o) { o.id = o.id || newId_(); if (o.wo && !o.billNo) o.billNo = o.wo; try { return clean_(c, o); } catch (e) { return null; } }).filter(function (o) { return o; });
      if (!data[c]) return;                                       // পুরনো ব্যাকআপে এই অংশ না থাকলে যেমন আছে তেমন থাকবে
      if (mode === 'replace') { clearColl_(c); rows += writeRows_(c, list); return; }
      var sh = dataSheet_(c), n = sh.getLastRow(), idx = {};
      if (n >= 2) sh.getRange(2, 1, n - 1, 1).getValues().forEach(function (r, i) { idx[String(r[0])] = i + 2; });
      var add = [], fm = rowFmts_(c);
      list.forEach(function (o) {
        if (idx[o.id]) { sh.getRange(idx[o.id], 1, 1, F[c].length).setNumberFormats([fm]).setValues([rowVals_(c, o)]); rows++; }
        else add.push(o);
      });
      rows += writeRows_(c, add);
    });
    writeLog_('restore', '', '', (mode === 'replace' ? 'Replace all from backup' : 'Merge from backup') + ' — ' + rows + ' rows' + (withSettings && obj.settings ? ' + settings' : ''), 'admin');
    return { mode: mode, rows: rows };
  });
}
function resetAll(pin) {
  needAdmin_(pin);
  return lock_(function () { snapshot_('before reset'); COLLS.forEach(clearColl_); writeLog_('reset', '', '', 'All data reset (snapshot saved in Backup_History)', 'admin'); return true; });
}

/* ---------- অটো ব্যাকআপ — গুগল ড্রাইভ ফোল্ডারে JSON ---------- */
var AB_EVERY = { m5: ['m', 5], m10: ['m', 10], m15: ['m', 15], m30: ['m', 30], h1: ['h', 1], h2: ['h', 2], h4: ['h', 4], h6: ['h', 6], h12: ['h', 12], d1: ['d', 1] };
function folderId_(s) { s = String(s || '').trim(); var m = s.match(/\/folders\/([a-zA-Z0-9_-]{10,})/) || s.match(/[?&]id=([a-zA-Z0-9_-]{10,})/) || s.match(/^([a-zA-Z0-9_-]{20,})$/); return m ? m[1] : ''; }
function getAutoBackup() {
  var t = 0; try { t = ScriptApp.getProjectTriggers().filter(function (x) { return x.getHandlerFunction() === 'autoBackup'; }).length; } catch (e) { t = -1; }
  return { on: prop_('AB_ON') === '1', triggers: t, folder: prop_('AB_FOLDER'), folderName: prop_('AB_FOLDER_NAME'), every: prop_('AB_EVERY') || 'h1', hour: Number(prop_('AB_HOUR') || 2), keep: Number(prop_('AB_KEEP') || 7), prune: prop_('AB_PRUNE') !== '0', skip: prop_('AB_SKIP') !== '0', last: prop_('AB_LAST'), lastFile: prop_('AB_LAST_FILE'), lastUrl: prop_('AB_LAST_URL'), lastErr: prop_('AB_LAST_ERR'), lastRun: prop_('AB_LAST_RUN') };
}
function saveAutoBackup(pin, cfgJson) {
  needAdmin_(pin);
  var c = JSON.parse(cfgJson), id = folderId_(c.folder);
  if (c.folder && !id) throw new Error('This is not a Google Drive folder link. Open the folder in Drive and copy the link (…/folders/XXXX).');
  if (c.on && !id && !prop_('AB_FOLDER')) throw new Error('Paste the Google Drive folder link first.');
  if (id) {
    var f; try { f = DriveApp.getFolderById(id); f.getName(); }
    catch (e) { throw new Error(/permission|authoriz/i.test(e.message) ? 'Drive permission is not granted yet. Run "authorizeAll" once in the Apps Script editor and click Allow, then deploy a new version.' : 'Cannot open this folder. The Google account that owns the sheet must own the folder or have Editor access.'); }
    setProp_('AB_FOLDER', id); setProp_('AB_FOLDER_NAME', f.getName());
  }
  if (!AB_EVERY[c.every]) throw new Error('Choose how often to back up.');
  setProp_('AB_EVERY', c.every); setProp_('AB_HOUR', Math.max(0, Math.min(23, Number(c.hour) || 0)));
  setProp_('AB_KEEP', Math.max(1, Math.min(365, Number(c.keep) || 7))); setProp_('AB_PRUNE', c.prune ? '1' : '0'); setProp_('AB_SKIP', c.skip ? '1' : '0'); setProp_('AB_ON', c.on ? '1' : '0');
  try { setTriggers_(!!c.on); } catch (e) { throw new Error(/permission|authoriz/i.test(e.message) ? 'Permission to create the schedule is not granted yet. Run "authorizeAll" once in the Apps Script editor and click Allow, then deploy a new version.' : e.message); }
  return getAutoBackup();
}
function setTriggers_(on) {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'autoBackup') ScriptApp.deleteTrigger(t); });
  if (!on) return;
  var e = AB_EVERY[prop_('AB_EVERY') || 'h1'], b = ScriptApp.newTrigger('autoBackup').timeBased();
  if (e[0] === 'm') b.everyMinutes(e[1]); else if (e[0] === 'h') b.everyHours(e[1]); else b.everyDays(1).atHour(Number(prop_('AB_HOUR') || 2));
  b.create();
}
function autoBackup() { return runAutoBackup_(false); }
function runBackupNow(pin) { needAdmin_(pin); return runAutoBackup_(true); }
function runAutoBackup_(force) {
  try {
    setProp_('AB_LAST_RUN', new Date().toISOString());
    var id = prop_('AB_FOLDER'); if (!id) throw new Error('No backup folder is set.');
    var rev = getRev();
    if (!force && prop_('AB_SKIP') !== '0' && rev === prop_('AB_LAST_REV')) { prune_(); return { skipped: true }; }
    var tz = Session.getScriptTimeZone() || 'Asia/Dhaka', name = 'SCSC_AutoBackup_' + Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd_HH-mm-ss') + '.json';
    var f = DriveApp.getFolderById(id).createFile(name, JSON.stringify(fullBackup_()), 'application/json');
    setProp_('AB_LAST', new Date().toISOString()); setProp_('AB_LAST_FILE', name); setProp_('AB_LAST_URL', f.getUrl()); setProp_('AB_LAST_ERR', ''); setProp_('AB_LAST_REV', rev);
    return { file: name, url: f.getUrl(), pruned: prune_() };
  } catch (e) { setProp_('AB_LAST_ERR', new Date().toISOString() + ' — ' + e.message); if (force) throw e; return { error: e.message }; }
}
function prune_() {
  if (prop_('AB_PRUNE') === '0' || !prop_('AB_FOLDER')) return 0;
  var cut = new Date(Date.now() - Number(prop_('AB_KEEP') || 7) * 86400000).toISOString().replace(/\.\d+Z$/, ''), n = 0;
  var it = DriveApp.getFolderById(prop_('AB_FOLDER')).searchFiles("title contains 'SCSC_AutoBackup_' and modifiedDate < '" + cut + "' and trashed = false");
  while (it.hasNext()) { var f = it.next(); if (f.getName().indexOf('SCSC_AutoBackup_') === 0) { try { f.setTrashed(true); n++; } catch (e) {} } }
  return n;
}

/* ---------- পিন রিকভারি (ইমেইল ও এসএমএস) ---------- */
function maskEmail_(e) { var p = String(e).split('@'); return p.length < 2 ? '' : p[0].slice(0, 2) + '***@' + p[1]; }
function maskPhone_(p) { p = String(p); return p.length < 6 ? '' : p.slice(0, 4) + '****' + p.slice(-2); }
var SMS_API = 'https://api.sms.net.bd/sendsms';   // sms.net.bd — শুধু API Key ও মোবাইল নম্বর দিলেই চলবে
function normPhone_(p) { p = String(p || '').replace(/[^\d]/g, ''); if (/^01\d{9}$/.test(p)) p = '88' + p; return p; }
function smsReady_() { return !!(prop_('REC_PHONE') && prop_('REC_SMS_KEY')); }
function recoveryInfo() {
  var e = prop_('REC_EMAIL'), p = prop_('REC_PHONE');
  return { email: maskEmail_(e), phone: maskPhone_(p), sms: smsReady_(), smsKey: !!prop_('REC_SMS_KEY'), any: !!(e || smsReady_()) };
}
function saveRecovery(pin, email, phone, smsKey) {
  needAdmin_(pin);
  var f = function (v, key, check) { v = String(v || '').trim(); if (!v) return; if (v === '-') { setProp_(key, ''); return; } v = check(v) || v; setProp_(key, v); };
  f(email, 'REC_EMAIL', function (v) { if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) throw new Error('Invalid email address.'); });
  f(phone, 'REC_PHONE', function (v) { v = normPhone_(v); if (!/^\d{10,15}$/.test(v)) throw new Error('Invalid mobile number. Example: 01712345678.'); return v; });
  f(smsKey, 'REC_SMS_KEY', function (v) { if (/\s/.test(v) || v.length < 8) throw new Error('Invalid SMS API key (copy it from sms.net.bd > API).'); });
  return recoveryInfo();
}
function sendSms_(phone, msg) {
  var key = prop_('REC_SMS_KEY');
  if (!key) return 'SMS API key is not set.';
  try {
    var r = UrlFetchApp.fetch(SMS_API, { method: 'post', payload: { api_key: key, msg: msg, to: normPhone_(phone) }, muteHttpExceptions: true });
    var b = {}; try { b = JSON.parse(r.getContentText()); } catch (e) {}
    if (r.getResponseCode() < 300 && Number(b.error) === 0) return '';
    return 'SMS gateway: ' + (b.msg || ('HTTP ' + r.getResponseCode()));
  } catch (e) { return 'SMS gateway: ' + (e && e.message ? e.message : e); }
}
function mailErr_(e) {
  var m = (e && e.message) || String(e);
  if (/permission|authoriz|script\.send_mail/i.test(m)) return 'Email permission is not granted yet. Run "authorizeAll" once in the Apps Script editor, click Allow, then deploy a new version.';
  if (/limit|quota/i.test(m)) return 'Daily email limit reached. Try again tomorrow or use SMS.';
  return m;
}
function testEmail(pin) {
  needAdmin_(pin);
  var email = prop_('REC_EMAIL'); if (!email) throw new Error('Save the recovery email first.');
  try { MailApp.sendEmail({ to: email, subject: 'SCS Collection — test email', body: 'PIN recovery by email is working.' }); } catch (e) { throw new Error(mailErr_(e)); }
  return { email: maskEmail_(email) };
}
function testSms(pin) {
  needAdmin_(pin);
  var phone = prop_('REC_PHONE'); if (!phone) throw new Error('Save the recovery mobile number first.');
  if (Date.now() - Number(prop_('SMS_TEST_LAST') || 0) < 30000) throw new Error('Please wait 30 seconds before another test SMS.');
  setProp_('SMS_TEST_LAST', Date.now());
  var err = sendSms_(phone, 'SCS Collection: test SMS — PIN recovery by SMS is working.'); if (err) throw new Error(err);
  return { phone: maskPhone_(phone) };
}
function sendResetCode(via) {
  via = /^(email|sms|both)$/.test(String(via)) ? String(via) : 'both';
  var email = prop_('REC_EMAIL'), phone = prop_('REC_PHONE'), smsOk = smsReady_();
  if (!email && !smsOk) throw new Error('No recovery email or SMS is set up. The admin must add it in Admin > Security first.');
  if (Date.now() - Number(prop_('RST_LAST') || 0) < 60000) throw new Error('Please wait one minute before requesting another code.');
  var code = String(100000 + (parseInt(Utilities.getUuid().replace(/-/g, '').slice(0, 8), 16) % 900000));
  setProp_('RST_HASH', sha_('rst|' + code)); setProp_('RST_EXP', Date.now() + 10 * 60000); setProp_('RST_TRIES', 0); setProp_('RST_LAST', Date.now());
  var msg = 'SCS Collection PIN reset code: ' + code + ' (valid 10 min).', sent = [], errs = [];
  if (email && via !== 'sms') { try { MailApp.sendEmail({ to: email, subject: 'SCS Collection — PIN reset code', body: msg }); sent.push('email'); } catch (e) { errs.push('Email: ' + mailErr_(e)); } }
  if (smsOk && via !== 'email') { var se = sendSms_(phone, msg); if (se) errs.push(se); else sent.push('sms'); }
  if (!sent.length) { setProp_('RST_LAST', 0); throw new Error('The code could not be sent. ' + errs.join(' | ')); }
  return { sent: sent, email: maskEmail_(email), phone: maskPhone_(phone) };
}
function resetPinWithCode(code, which, newPin) {
  var exp = Number(prop_('RST_EXP') || 0), tries = Number(prop_('RST_TRIES') || 0);
  if (!prop_('RST_HASH') || Date.now() > exp) throw new Error('The code has expired. Request a new one.');
  if (tries >= 5) { setProp_('RST_HASH', ''); throw new Error('Too many wrong attempts. Request a new code.'); }
  if (sha_('rst|' + String(code || '').trim()) !== prop_('RST_HASH')) { setProp_('RST_TRIES', tries + 1); throw new Error('Wrong code.'); }
  if (which === 'admin') { newPin = checkNewPin_(newPin, userHash_()); putSetting_('admin_pin_hash', hashOf_(newPin)); putSetting_('admin_pin_len', newPin.length); }
  else if (which === 'user') { newPin = checkNewPin_(newPin, adminHash_()); putSetting_('user_pin_hash', hashOf_(newPin)); putSetting_('user_pin_len', newPin.length); }
  else throw new Error('Choose which PIN to reset.');
  setProp_('RST_HASH', ''); setProp_('RST_EXP', 0);
  writeLog_('settings', '', '', which + ' PIN reset with recovery code', '');
  return true;
}

/* Apps Script এডিটর থেকে একবার চালিয়ে "Allow" দিন (শিট, ড্রাইভ, ইমেইল, এসএমএস, শিডিউল — সব অনুমতি) */
function authorizeAll() {
  setProp_('SCSC_READY', ''); setupDatabase();
  var out = ['Sheet: ' + home_().getName()];
  try { DriveApp.getRootFolder().getName(); out.push('Drive: OK'); } catch (e) { out.push('Drive: ' + e.message); }
  try { out.push('Email: OK (' + MailApp.getRemainingDailyQuota() + ' left today)'); } catch (e) { out.push('Email: ' + e.message); }
  try { UrlFetchApp.getRequest(SMS_API); out.push('SMS: OK'); } catch (e) { out.push('SMS: ' + e.message); }
  try { ScriptApp.getProjectTriggers(); out.push('Schedule: OK'); } catch (e) { out.push('Schedule: ' + e.message); }
  Logger.log(out.join('\n'));
  return out.join(' | ');
}
