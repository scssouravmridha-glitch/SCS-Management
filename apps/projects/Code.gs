/**
 * SCS Projects - Backend (Google Apps Script)
 * Swarup Construction Solution
 * Google Sheet = ডাটাবেজ। DB_Records (প্রজেক্ট/খরচ/বিল), DB_Settings, DB_History (রিস্টোর/রিসেটের আগের স্বয়ংক্রিয় ব্যাকআপ)
 * ডিপ্লয়: শিটের ভেতর থেকে Extensions > Apps Script -> Code.gs ও Index.html পেস্ট -> Deploy > Web app
 */
var DB = { REC: 'DB_Records', SET: 'DB_Settings', HIS: 'DB_History', LOG: 'DB_Log' };
var COLLS = ['projects', 'entries', 'bills', 'labor', 'subs', 'subpays', 'chems'];

function doGet(e) {
  try { if (prop_('DB_READY') !== '2') { setupDatabase(); setProp_('DB_READY', '2'); } } catch (er) {}
  var p = (e && e.parameter) || {};
  if (p.page === 'bill' || p.q) {          // বিল ও মেজারমেন্ট আলাদা ট্যাবে (শেয়ার লিংকও এখানে খোলে)
    return HtmlService.createHtmlOutput(billSrc_()).setTitle('SCS Project Bill')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
  return HtmlService.createHtmlOutput(splitIndex_().main)
    .setTitle('SCS Projects')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function home_() {
  var props = PropertiesService.getScriptProperties(), a = null;
  try { a = SpreadsheetApp.getActiveSpreadsheet(); } catch (e) {}
  if (a) { props.setProperty('DB_SPREADSHEET_ID', a.getId()); return a; }
  var id = props.getProperty('DB_SPREADSHEET_ID');
  if (id) return SpreadsheetApp.openById(id);
  throw new Error('ডাটাবেজ শিট সংযুক্ত নেই। গুগল শিটের ভেতর থেকে Extensions > Apps Script দিয়ে স্ক্রিপ্ট খুলুন।');
}
function sheet_(name, head) {
  var ss = home_(), sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight('bold').setBackground('#1e293b').setFontColor('#ffffff');
    sh.setFrozenRows(1);
  }
  return sh;
}
function rec_() { return sheet_(DB.REC, ['Coll', 'Id', 'Json', 'UpdatedAt']); }
function set_() { return sheet_(DB.SET, ['Key', 'Value', 'UpdatedAt']); }
function his_() { return sheet_(DB.HIS, ['SavedAt', 'Reason', 'Json']); }
function log_() { return sheet_(DB.LOG, ['At', 'Action', 'Coll', 'Id', 'Pid', 'Json', 'By']); }
/* অ্যাক্টিভিটি লগ: কি এন্ট্রি হয়েছে, কি এডিট / ডিলিট হয়েছে — সব এখানে থাকে (সর্বোচ্চ ২০,০০০ সারি) */
function writeLog_(rows) {
  if (!rows.length) return;
  try {
    var sh = log_(), now = new Date().toISOString();
    sh.getRange(sh.getLastRow() + 1, 1, rows.length, 7).setNumberFormat('@').setValues(rows.map(function (r) { return [now, r[0], r[1], String(r[2] || ''), String(r[3] || ''), String(r[4] || '').slice(0, 45000), String(r[5] || '')]; }));
    var extra = (sh.getLastRow() - 1) - 20000; if (extra > 0) sh.deleteRows(2, extra);
  } catch (e) {}
}
function who_(w) { return /^(admin|user)$/.test(String(w)) ? String(w) : ''; }
function getLog(pid, limit) {
  var sh = log_(), n = sh.getLastRow(), out = [];
  limit = Math.min(Number(limit) || 300, 2000);
  if (n < 2) return out;
  var v = sh.getRange(2, 1, n - 1, 7).getValues();
  for (var i = v.length - 1; i >= 0 && out.length < limit; i--) {
    if (pid && String(v[i][4]) !== String(pid) && !(v[i][2] === 'projects' && String(v[i][3]) === String(pid))) continue;
    out.push({ at: String(v[i][0]), act: String(v[i][1]), coll: String(v[i][2]), id: String(v[i][3]), pid: String(v[i][4]), json: String(v[i][5]), by: String(v[i][6]) });
  }
  return out;
}
function needPin_(pin) { if (!loginCheck(pin)) throw new Error('ভুল পিন! / Wrong PIN.'); }
function setupDatabase() { rec_(); set_(); his_(); log_(); return 'OK: ' + home_().getName(); }
function bump_() { try { PropertiesService.getScriptProperties().setProperty('DB_REV', Date.now() + '-' + Math.random().toString(36).slice(2, 6)); } catch (e) {} }
function lock_(fn) { var l = LockService.getScriptLock(); l.waitLock(60000); try { var r = fn(); bump_(); return r; } finally { l.releaseLock(); } }
/* রিয়েল-টাইম সিঙ্কের জন্য হালকা "ভার্সন" — অ্যাপ নিজে লিখলে DB_REV বদলায়, শিটে সরাসরি এডিট করলে ফাইলের last-updated বদলায় */
function getRev() {
  var r = '0';
  try { r = PropertiesService.getScriptProperties().getProperty('DB_REV') || '0'; } catch (e) {}
  try { r += '|' + DriveApp.getFileById(home_().getId()).getLastUpdated().getTime(); } catch (e) {}
  return r;
}

/* ---------- অনলাইন উপস্থিতি: কে কে অনলাইনে আছে, কে কোন প্রজেক্ট এডিট করছে ---------- */
/* প্রতিটি খোলা অ্যাপ ~১০ সেকেন্ড পর পর ping পাঠায়; ৩৫ সেকেন্ড সাড়া না দিলে অফলাইন ধরা হয় */
function ping(sid, infoJson) {
  var c = CacheService.getScriptCache(), now = Date.now(), list = {}, info = {};
  try { info = JSON.parse(infoJson || '{}') || {}; } catch (e) {}
  var l = null; try { l = LockService.getDocumentLock(); } catch (e) {}
  var got = false; try { got = l ? l.tryLock(2500) : false; } catch (e) {}
  try {
    try { list = JSON.parse(c.get('PRESENCE') || '{}') || {}; } catch (e) { list = {}; }
    Object.keys(list).forEach(function (k) { if (now - list[k].t > 35000) delete list[k]; });
    sid = String(sid || '').slice(0, 40);
    if (info.tok) { var tr = tokenRole_(info.tok); if (tr) try { c.put('TOK_' + info.tok, tr, 21600); } catch (e) {} }
    if (sid && got) {
      if (info.gone) delete list[sid];
      else list[sid] = { t: now, name: String(info.name || '').slice(0, 30), role: /^(admin|user)$/.test(info.role) ? info.role : '', dev: String(info.dev || '').slice(0, 40), view: String(info.view || '').slice(0, 20), pid: String(info.pid || '').slice(0, 40), edit: String(info.edit || '').slice(0, 40) };
      c.put('PRESENCE', JSON.stringify(list), 600);
    }
  } finally { if (got) try { l.releaseLock(); } catch (e) {} }
  return { rev: getRev(), online: Object.keys(list).map(function (k) { var o = list[k]; o.sid = k; o.ago = Math.round((now - o.t) / 1000); return o; }) };
}

/* ---------- বিল ও মেজারমেন্ট মডিউল (Bill.html) প্রজেক্টের ভেতরে খোলার জন্য ---------- */
/* Index.html-এর ভেতরে বিল পেজ রাখা থাকে: gzip + base64, <script type="text/plain" id="scs-bill-page"> ব্লকে।
   মূল পেজ পাঠানোর আগে ব্লকটা কেটে বাদ দেওয়া হয়; বিল খুললে সেটা খুলে (ungzip) দেওয়া হয়। */
function splitIndex_() {
  var all = HtmlService.createHtmlOutputFromFile('Index').getContent();
  var re = /<script[^>]*id=["']?scs-bill-page["']?[^>]*>([\s\S]*?)<\/script>/i, m = all.match(re);
  if (!m) return { main: all, b64: '' };
  return { main: all.replace(re, ''), b64: m[1].replace(/[^A-Za-z0-9+\/=]/g, '') };
}
function billSrc_() {
  var s = splitIndex_();
  if (s.b64) {
    var blob = Utilities.newBlob(Utilities.base64Decode(s.b64), 'application/x-gzip', 'bill.gz');
    return Utilities.ungzip(blob).getDataAsString('UTF-8');
  }
  try { return HtmlService.createHtmlOutputFromFile('Bill').getContent(); }   // পুরনো নিয়মে আলাদা Bill ফাইল থাকলে
  catch (e) { throw new Error('বিলের পেজ পাওয়া যায়নি — Index.html পুরোটা আবার পেস্ট করে New version ডিপ্লয় করুন। (Bill page not found inside Index.html)'); }
}
function getBillHtml(knownHash) {
  var html = billSrc_();
  var h = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, html, Utilities.Charset.UTF_8).map(function (x) { var v = (x < 0 ? x + 256 : x).toString(16); return v.length === 1 ? '0' + v : v; }).join('');
  return h === knownHash ? { hash: h, same: true } : { hash: h, html: html };
}
/* বিল মডিউলের কোম্পানি / প্রজেক্ট তালিকা = SCS-এর প্রজেক্ট তালিকা (কোম্পানি ঘর ফাঁকা হলে প্রজেক্টের নামই কোম্পানি) */
function scsRegistry_() {
  var sh = rec_(), n = sh.getLastRow(), m = {};
  if (n >= 2) sh.getRange(2, 1, n - 1, 3).getValues().forEach(function (r) {
    if (r[0] !== 'projects') return; var p = {}; try { p = JSON.parse(r[2]); } catch (e) { return; }
    var c = String(p.client || '').trim().toUpperCase(), nm = String(p.name || '').trim().toUpperCase(), co = c || nm; if (!co) return;
    var g = m[co] || (m[co] = { name: co, projects: [] });
    if (c && nm && g.projects.indexOf(nm) < 0) g.projects.push(nm);
  });
  return Object.keys(m).sort().map(function (k) { m[k].projects.sort(); return m[k]; });
}
/* SCS Quotation অ্যাপ থেকে প্যাড, সিল, লোগো, মার্জিন ও টেমপ্লেট কপি */
function importQuotationSettings(link, pin) {
  needAdmin_(pin);
  var m = String(link || '').match(/\/d\/([-\w]{20,})/) || String(link || '').match(/^([-\w]{25,})$/);
  if (!m) throw new Error('Paste the link of the SCS Quotation Google Sheet (the database sheet).');
  var ss; try { ss = SpreadsheetApp.openById(m[1]); } catch (e) { throw new Error('Cannot open that sheet. It must belong to (or be shared with) this Google account.'); }
  var sh = ss.getSheetByName('Q_Settings'); if (!sh) throw new Error('No Q_Settings tab found in that sheet. Is it the SCS Quotation database?');
  var n = sh.getLastRow(), src = {}; if (n >= 2) sh.getRange(2, 1, n - 1, 2).getValues().forEach(function (r) { if (r[0] !== '') src[String(r[0])] = String(r[1]); });
  var I = SCSBILL.int, cfg = I.readConfig_(), q = {}, copied = [];
  try { q = JSON.parse(src.app_config || '{}'); } catch (e) {}
  ['pads', 'padFileId', 'defPage', 'padSize', 'seals', 'logo', 'margins', 'sigGap', 'numFmt', 'dec', 'currency', 'company', 'folders'].forEach(function (k) { if (q[k] !== undefined && q[k] !== '' && !(Array.isArray(q[k]) && !q[k].length)) { cfg[k] = q[k]; copied.push(k); } });
  I.writeSetting_('app_config', JSON.stringify(cfg));
  Object.keys(src).forEach(function (k) { if (k === 'table_templates' || k.indexOf('tpl_') === 0 || k === 'prefs') { I.writeSetting_(k, src[k]); copied.push(k); } });
  return { copied: copied };
}

/* ---------- Settings & PIN ---------- */
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
function putSetting_(k, v) { lock_(function () { putSettingRaw_(k, v); }); }
function putSettingRaw_(k, v) {
  (function () {
    var sh = set_(), n = sh.getLastRow(), row = 0;
    if (n >= 2) {
      var ks = sh.getRange(2, 1, n - 1, 1).getValues();
      for (var i = 0; i < ks.length; i++) if (String(ks[i][0]) === k) { row = i + 2; break; }
    }
    if (!row) row = n + 1;
    sh.getRange(row, 1, 1, 3).setNumberFormat('@').setValues([[k, String(v), new Date().toISOString()]]);
  })();
}
function adminHash_() { var s = settings_(); return s.admin_pin_hash || sha_('scs|2026'); }
function isAdmin_(pin) { return sha_('scs|' + String(pin || '')) === adminHash_(); }
function needAdmin_(pin) { if (!isAdmin_(pin)) throw new Error('ভুল অ্যাডমিন পিন! / Wrong admin PIN.'); }

function userHash_() { var s = settings_(); return s.user_pin_hash || sha_('scs|2019'); }
function loginCheck(pin) {
  pin = String(pin || '');
  if (!/^\d{4,8}$/.test(pin)) return '';
  var h = sha_('scs|' + pin);
  if (h === adminHash_()) return 'admin';
  return h === userHash_() ? 'user' : '';
}
/* লগইন স্ক্রিন যেন এন্টার ছাড়াই পিন যাচাই করতে পারে — শুধু পিনের দৈর্ঘ্য জানায়, পিন নয় */
function pinInfo() {
  var s = settings_(), L = {}, a = Number(s.admin_pin_len || (s.admin_pin_hash ? 0 : 4)), u = Number(s.user_pin_len || (s.user_pin_hash ? 0 : 4));
  [a, u].forEach(function (x) { if (x >= 4 && x <= 8) L[x] = 1; });
  if (!a || !u) for (var i = 4; i <= 8; i++) L[i] = 1;          // দৈর্ঘ্য জানা না থাকলে ৪–৮ সবগুলোতে যাচাই
  return { lens: Object.keys(L).map(Number).sort() };
}
/* লগইন + ডাটা একসাথে (একটি সার্ভার কলেই) — দ্রুত খোলার জন্য */
function loginLoad(pin) { var r = loginCheck(pin); return r ? { role: r, data: loadAll(), tok: mkToken_(r) } : { role: '' }; }
/* সাইন-ইন টোকেন: SCS-এ লগইন করলে বিল মডিউলে আবার পিন দিতে হয় না (৬ ঘণ্টা; অ্যাপ খোলা থাকলে নিজে নবায়ন হয়) */
function mkToken_(role) {
  var t = 'T' + Utilities.getUuid().replace(/-/g, ''), now = Date.now();
  try { CacheService.getScriptCache().put('TOK_' + t, role, 21600); } catch (e) {}
  try {                                                   // ৩০ দিন পর্যন্ত টেকে (Script Properties-এ), পুরোনোগুলো মুছে যায়
    var P = PropertiesService.getScriptProperties(), all = P.getProperties();
    Object.keys(all).forEach(function (k) { if (k.indexOf('TOK_') === 0 && Number(String(all[k]).split('|')[1] || 0) < now) P.deleteProperty(k); });
    P.setProperty('TOK_' + t, role + '|' + (now + 30 * 86400000));
  } catch (e) {}
  return t;
}
function tokenRole_(t) {
  t = String(t || ''); if (!/^T[0-9a-f]{32}$/.test(t)) return '';
  var c = null; try { c = CacheService.getScriptCache(); var r = c.get('TOK_' + t); if (r) return r; } catch (e) {}
  try {
    var v = PropertiesService.getScriptProperties().getProperty('TOK_' + t); if (!v) return '';
    var p = String(v).split('|'); if (Number(p[1] || 0) < Date.now()) return '';
    if (c) c.put('TOK_' + t, p[0], 21600); return p[0];
  } catch (e) { return ''; }
}
function newToken(pin) { var r = loginCheck(pin) || tokenRole_(pin); if (!r) throw new Error('Wrong PIN.'); return mkToken_(r); }
function verifyAdmin(pin) { return isAdmin_(pin); }
function checkNewPin_(newPin, otherHash) {
  newPin = String(newPin || '');
  if (!/^\d{4,8}$/.test(newPin)) throw new Error('PIN must be 4-8 digits.');
  if (sha_('scs|' + newPin) === otherHash) throw new Error('Admin PIN and User PIN must be different.');
  return newPin;
}
function changeAdminPin(oldPin, newPin) {
  needAdmin_(oldPin);
  newPin = checkNewPin_(newPin, userHash_());
  putSetting_('admin_pin_hash', sha_('scs|' + newPin));
  putSetting_('admin_pin_len', newPin.length);
  return true;
}
function changeUserPin(adminPin, newPin) {
  needAdmin_(adminPin);
  newPin = checkNewPin_(newPin, adminHash_());
  putSetting_('user_pin_hash', sha_('scs|' + newPin)); putSetting_('user_pin_len', newPin.length);
  return true;
}

/* ---------- পিন রিকভারি: ইমেইল ও মোবাইল নম্বরে কোড পাঠিয়ে পিন রিসেট ---------- */
function prop_(k) { return PropertiesService.getScriptProperties().getProperty(k) || ''; }
function setProp_(k, v) { PropertiesService.getScriptProperties().setProperty(k, String(v)); }
function maskEmail_(e) { var p = String(e).split('@'); return p.length < 2 ? '' : p[0].slice(0, 2) + '***@' + p[1]; }
function maskPhone_(p) { p = String(p); return p.length < 6 ? '' : p.slice(0, 4) + '****' + p.slice(-2); }
var SMS_API = 'https://api.sms.net.bd/sendsms';   // sms.net.bd — শুধু API Key ও মোবাইল নম্বর দিলেই চলবে
function normPhone_(p) {
  p = String(p || '').replace(/[^\d]/g, '');
  if (/^01\d{9}$/.test(p)) p = '88' + p;              // 01XXXXXXXXX -> 8801XXXXXXXXX
  return p;
}
function smsReady_() { return !!(prop_('REC_PHONE') && (prop_('REC_SMS_KEY') || prop_('REC_SMS_URL'))); }
function recoveryInfo() {
  var e = prop_('REC_EMAIL'), p = prop_('REC_PHONE');
  return { email: maskEmail_(e), phone: maskPhone_(p), sms: smsReady_(), smsKey: !!prop_('REC_SMS_KEY'), any: !!(e || smsReady_()) };
}
function saveRecovery(pin, email, phone, smsKey) {
  needAdmin_(pin);
  var f = function (v, key, check) {            // খালি = অপরিবর্তিত, '-' = মুছে ফেলা
    v = String(v || '').trim(); if (!v) return;
    if (v === '-') { setProp_(key, ''); if (key === 'REC_SMS_KEY') setProp_('REC_SMS_URL', ''); return; }
    v = check(v) || v; setProp_(key, v);
  };
  f(email, 'REC_EMAIL', function (v) { if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) throw new Error('Invalid email address.'); });
  f(phone, 'REC_PHONE', function (v) { v = normPhone_(v); if (!/^\d{10,15}$/.test(v)) throw new Error('Invalid mobile number. Example: 01712345678 or 8801712345678.'); return v; });
  f(smsKey, 'REC_SMS_KEY', function (v) { if (/\s/.test(v) || v.length < 8) throw new Error('Invalid SMS API key (copy it from sms.net.bd > API).'); });
  return recoveryInfo();
}
/* sms.net.bd দিয়ে এসএমএস পাঠানো। সফল হলে '' ফেরত দেয়, না হলে কারণ (error message) */
function sendSms_(phone, msg) {
  var key = prop_('REC_SMS_KEY'), url = prop_('REC_SMS_URL');
  try {
    if (key) {
      var r = UrlFetchApp.fetch(SMS_API, { method: 'post', payload: { api_key: key, msg: msg, to: normPhone_(phone) }, muteHttpExceptions: true });
      var b = {}; try { b = JSON.parse(r.getContentText()); } catch (e) {}
      if (r.getResponseCode() < 300 && Number(b.error) === 0) return '';
      return 'SMS gateway: ' + (b.msg || ('HTTP ' + r.getResponseCode())) + (b.error ? ' (code ' + b.error + ')' : '');
    }
    if (url) {                                    // পুরোনো কাস্টম URL (থাকলে)
      var r2 = UrlFetchApp.fetch(url.replace('{number}', encodeURIComponent(phone)).replace('{message}', encodeURIComponent(msg)), { muteHttpExceptions: true });
      return r2.getResponseCode() < 300 ? '' : 'SMS gateway: HTTP ' + r2.getResponseCode();
    }
    return 'SMS API key is not set.';
  } catch (e) { return 'SMS gateway: ' + (e && e.message ? e.message : e); }
}
function mailErr_(e) {
  var m = (e && e.message) || String(e);
  if (/permission|authoriz|script\.send_mail/i.test(m)) return 'Email permission is not granted yet. The sheet owner must open Extensions > Apps Script, run the function "authorizeAll" once and click Allow, then Deploy > Manage deployments > Edit > Version: New version > Deploy.';
  if (/limit|quota/i.test(m)) return 'Daily email limit reached (Google allows about 100 emails per day on a free Gmail account). Try again tomorrow or use SMS.';
  return m;
}
function testEmail(pin) {
  needAdmin_(pin);
  var email = prop_('REC_EMAIL'); if (!email) throw new Error('Save the recovery email first.');
  try { MailApp.sendEmail({ to: email, subject: 'SCS Projects — test email', body: 'PIN recovery by email is working. Emails left today: ' + MailApp.getRemainingDailyQuota() }); }
  catch (e) { throw new Error(mailErr_(e)); }
  return { email: maskEmail_(email), left: MailApp.getRemainingDailyQuota() };
}
function testSms(pin) {
  needAdmin_(pin);
  var phone = prop_('REC_PHONE');
  if (!phone) throw new Error('Save the recovery mobile number first.');
  if (Date.now() - Number(prop_('SMS_TEST_LAST') || 0) < 30000) throw new Error('Please wait 30 seconds before sending another test SMS.');
  setProp_('SMS_TEST_LAST', Date.now());
  var err = sendSms_(phone, 'SCS Projects: test SMS — PIN recovery by SMS is working.');
  if (err) throw new Error(err);
  return { phone: maskPhone_(phone) };
}
function sendResetCode(via) {
  via = /^(email|sms|both)$/.test(String(via)) ? String(via) : 'both';
  var email = prop_('REC_EMAIL'), phone = prop_('REC_PHONE'), smsOk = smsReady_();
  if (!email && !smsOk) throw new Error('No recovery email or SMS is set up. The admin must add it in Admin > Security & Privacy first.');
  if (Date.now() - Number(prop_('RST_LAST') || 0) < 60000) throw new Error('Please wait one minute before requesting another code.');
  var code = String(100000 + (parseInt(Utilities.getUuid().replace(/-/g, '').slice(0, 8), 16) % 900000));
  setProp_('RST_HASH', sha_('rst|' + code)); setProp_('RST_EXP', Date.now() + 10 * 60000); setProp_('RST_TRIES', 0); setProp_('RST_LAST', Date.now());
  var msg = 'SCS Projects PIN reset code: ' + code + ' (valid 10 min). If you did not ask for this, ignore it.', sent = [], errs = [];
  if (via === 'email' && !email) throw new Error('No recovery email is set.');
  if (via === 'sms' && !smsOk) throw new Error('SMS recovery is not set.');
  if (email && via !== 'sms') { try { MailApp.sendEmail({ to: email, subject: 'SCS Projects — PIN reset code', body: msg }); sent.push('email'); } catch (e) { errs.push('Email: ' + mailErr_(e)); } }
  if (smsOk && via !== 'email') { var se = sendSms_(phone, msg); if (se) errs.push(se); else sent.push('sms'); }
  if (!sent.length) { setProp_('RST_LAST', 0); throw new Error('The code could not be sent. ' + errs.join(' | ')); }
  return { sent: sent, email: maskEmail_(email), phone: maskPhone_(phone), errors: errs };
}
function resetPinWithCode(code, which, newPin) {
  var exp = Number(prop_('RST_EXP') || 0), tries = Number(prop_('RST_TRIES') || 0);
  if (!prop_('RST_HASH') || Date.now() > exp) throw new Error('The code has expired. Request a new one.');
  if (tries >= 5) { setProp_('RST_HASH', ''); throw new Error('Too many wrong attempts. Request a new code.'); }
  if (sha_('rst|' + String(code || '').trim()) !== prop_('RST_HASH')) { setProp_('RST_TRIES', tries + 1); throw new Error('Wrong code.'); }
  if (which === 'admin') { newPin = checkNewPin_(newPin, userHash_()); putSetting_('admin_pin_hash', sha_('scs|' + newPin)); putSetting_('admin_pin_len', newPin.length); }
  else if (which === 'user') { newPin = checkNewPin_(newPin, adminHash_()); putSetting_('user_pin_hash', sha_('scs|' + newPin)); putSetting_('user_pin_len', newPin.length); }
  else throw new Error('Choose which PIN to reset.');
  setProp_('RST_HASH', ''); setProp_('RST_EXP', 0);
  return true;
}
var PUBLIC_KEYS = ['currency', 'company', 'tagline', 'editPin', 'logo', 'sig'];
function saveSetting(key, value, pin) {
  if (PUBLIC_KEYS.indexOf(key) === -1) throw new Error('Unknown setting');
  if (key === 'editPin' || key === 'logo' || key === 'sig') needAdmin_(pin);
  if (key === 'sig') JSON.parse(value);
  putSetting_(key, String(value));
  return true;
}
function publicSettings_() {
  var s = settings_(), o = {};
  PUBLIC_KEYS.forEach(function (k) { if (s[k] !== undefined) o[k] = s[k]; });
  return o;
}

/* ---------- Data ---------- */
function loadAll() {
  var sh = rec_(), n = sh.getLastRow(), out = { settings: publicSettings_(), bad: [], rev: getRev() };
  COLLS.forEach(function (c) { out[c] = []; });
  if (n >= 2) {
    sh.getRange(2, 1, n - 1, 3).getValues().forEach(function (r, i) {
      var c = String(r[0] || '').trim();
      if (!c && !r[1] && !r[2]) return;                      // ফাঁকা সারি
      if (COLLS.indexOf(c) < 0) { out.bad.push({ row: i + 2, coll: c, why: 'unknown collection' }); return; }
      try { var o = JSON.parse(r[2]); if (!o || typeof o !== 'object') throw new Error('x'); out[c].push(o); }
      catch (e) { out.bad.push({ row: i + 2, coll: c, id: String(r[1] || ''), why: 'unreadable JSON' }); }
    });
  }
  return out;
}
function findRow_(sh, coll, id) {
  var n = sh.getLastRow();
  if (n < 2) return 0;
  var v = sh.getRange(2, 1, n - 1, 2).getValues();
  for (var i = 0; i < v.length; i++) if (v[i][0] === coll && String(v[i][1]) === String(id)) return i + 2;
  return 0;
}
function saveRecord(coll, json, who) {
  if (COLLS.indexOf(coll) === -1) throw new Error('Bad collection');
  var o = JSON.parse(json);
  if (!o.id) throw new Error('Missing id');
  return lock_(function () {
    var sh = rec_(), old = findRow_(sh, coll, o.id), row = old || sh.getLastRow() + 1;
    var js = JSON.stringify(o), prev = old ? String(sh.getRange(old, 3).getValue()) : '';
    sh.getRange(row, 1, 1, 4).setNumberFormat('@').setValues([[coll, String(o.id), js, new Date().toISOString()]]);
    var back = sh.getRange(row, 1, 1, 3).getValues()[0];
    if (back[0] !== coll || String(back[1]) !== String(o.id) || back[2] !== js) throw new Error('Database write could not be verified. Please try again.');
    if (prev !== js) writeLog_([[old ? 'edit' : 'add', coll, o.id, coll === 'projects' ? o.id : o.pid, old ? JSON.stringify({ before: safeJ_(prev), after: o }) : js, who_(who)]]);
    return true;
  });
}
function safeJ_(s) { try { return JSON.parse(s); } catch (e) { return s; } }
function saveRecords(coll, jsonList, who) {
  if (COLLS.indexOf(coll) === -1) throw new Error('Bad collection');
  var list = JSON.parse(jsonList);
  return lock_(function () {
    var sh = rec_(), n = sh.getLastRow(), idx = {}, add = [], now = new Date().toISOString(), lg = [];
    if (n >= 2) sh.getRange(2, 1, n - 1, 2).getValues().forEach(function (r, i) { if (r[0] === coll) idx[String(r[1])] = i + 2; });
    list.forEach(function (o) {
      if (!o.id) return;
      lg.push([idx[o.id] ? 'edit' : 'add', coll, o.id, o.pid, JSON.stringify(o), who_(who)]);
      if (idx[o.id]) sh.getRange(idx[o.id], 1, 1, 4).setNumberFormat('@').setValues([[coll, String(o.id), JSON.stringify(o), now]]);
      else add.push([coll, String(o.id), JSON.stringify(o), now]);
    });
    if (add.length) {
      var start = sh.getLastRow() + 1;
      sh.getRange(start, 1, add.length, 4).setNumberFormat('@').setValues(add);
      var back = sh.getRange(start, 1, add.length, 3).getValues();
      for (var k = 0; k < add.length; k++) if (back[k][0] !== add[k][0] || back[k][2] !== add[k][2]) throw new Error('Database write could not be verified. Please try again.');
    }
    writeLog_(lg);
    return true;
  });
}
/* ডিলিট — সবসময় পিন লাগবে; ডিলিট হওয়া ডাটা লগে থেকে যায় */
function deleteRecord(coll, id, pin, who) { return deleteRecords(JSON.stringify([{ c: coll, id: id }]), pin, who); }
function deleteRecords(listJson, pin, who) {
  needPin_(pin);
  var list = JSON.parse(listJson), want = {}, projs = {};
  list.forEach(function (x) { if (x && x.c && x.id) { want[x.c + '|' + x.id] = 1; if (x.c === 'projects') projs[String(x.id)] = 1; } });
  return lock_(function () {
    var sh = rec_(), n = sh.getLastRow(), lg = [], cnt = 0;
    if (n < 2) return 0;
    var v = sh.getRange(2, 1, n - 1, 3).getValues();
    for (var i = v.length - 1; i >= 0; i--) {
      var c = v[i][0], id = String(v[i][1]), o = safeJ_(v[i][2]), del = !!want[c + '|' + id], viaProj = false;
      if (!del && c !== 'projects' && o && projs[String(o.pid)]) { del = true; viaProj = true; }   // প্রজেক্ট ডিলিট করলে তার সব খরচ/বিলও যাবে
      if (del) { sh.deleteRow(i + 2); cnt++; lg.push(['delete', c, id, c === 'projects' ? id : (o && o.pid), String(v[i][2]), viaProj ? who_(who) + ' (with project)' : who_(who)]); }
    }
    writeLog_(lg.reverse());
    return cnt;
  });
}

/* ---------- Backup / Restore / Reset (সব কাজে অ্যাডমিন পাসওয়ার্ড লাগে) ---------- */
function exportAll(pin) {
  needAdmin_(pin);
  var d = loadAll(), data = {};
  COLLS.forEach(function (c) { data[c] = d[c]; });
  return { app: 'SCS Projects', version: 2, exportedAt: new Date().toISOString(), data: data };
}
/* ---------- সম্পূর্ণ ব্যাকআপ: সব ডাটা + সব সেটিংস + অ্যাক্টিভিটি লগ ---------- */
function fullBackup_() {
  var d = loadAll(), data = {}, lg = [];
  COLLS.forEach(function (c) { data[c] = d[c]; });
  try { var sh = log_(), n = sh.getLastRow(); if (n >= 2) lg = sh.getRange(2, 1, n - 1, 7).getValues().map(function (r) { return { at: String(r[0]), act: String(r[1]), coll: String(r[2]), id: String(r[3]), pid: String(r[4]), json: String(r[5]), by: String(r[6]) }; }); } catch (e) {}
  return { app: 'SCS Projects', version: 3, kind: 'full', exportedAt: new Date().toISOString(), source: home_().getName(), data: data, settings: settings_(), recovery: { email: prop_('REC_EMAIL'), phone: prop_('REC_PHONE') }, log: lg, billSheets: billDump_() };
}
/* বিল ও মেজারমেন্টের শিটগুলোও সম্পূর্ণ ব্যাকআপে থাকে */
var BILL_SHEETS = ['BL_Index', 'BL_Data', 'BL_Settings'];
function billDump_() {
  var out = {}, ss = home_();
  BILL_SHEETS.forEach(function (nm) { var sh = ss.getSheetByName(nm); if (!sh || sh.getLastRow() < 1) return; out[nm] = sh.getRange(1, 1, sh.getLastRow(), sh.getLastColumn()).getValues().map(function (r) { return r.map(function (v) { return v instanceof Date ? v.toISOString() : v; }); }); });
  return out;
}
function billRestore_(dump, replace) {
  if (!dump) return 0;
  var ss = home_(), n = 0;
  BILL_SHEETS.forEach(function (nm) {
    var rows = dump[nm]; if (!rows || !rows.length) return;
    var sh = ss.getSheetByName(nm) || ss.insertSheet(nm), w = rows[0].length;
    if (replace || sh.getLastRow() < 1) { sh.clearContents(); sh.getRange(1, 1, rows.length, w).setNumberFormat('@').setValues(rows); n += rows.length - 1; return; }
    var have = {}, last = sh.getLastRow(), key = function (r) { return nm === 'BL_Data' ? r[0] + '|' + r[1] : String(r[0]); };
    if (last >= 2) sh.getRange(2, 1, last - 1, Math.max(2, Math.min(w, sh.getLastColumn()))).getValues().forEach(function (r) { have[key(r)] = 1; });
    var add = rows.slice(1).filter(function (r) { return r[0] !== '' && !have[key(r)] && !(nm === 'BL_Settings' && /pin_hash/.test(r[0])); });
    if (add.length) { sh.getRange(last + 1, 1, add.length, w).setNumberFormat('@').setValues(add); n += add.length; }
  });
  try { CacheService.getScriptCache().removeAll(['BL_settings_v2#n', 'BL_dbok']); } catch (e) {}
  return n;
}
function exportFull(pin) { needAdmin_(pin); return fullBackup_(); }

/* ---------- অটো ব্যাকআপ — গুগল ড্রাইভ ফোল্ডারে JSON ---------- */
var AB_EVERY = { m5: ['m', 5], m10: ['m', 10], m15: ['m', 15], m30: ['m', 30], h1: ['h', 1], h2: ['h', 2], h4: ['h', 4], h6: ['h', 6], h12: ['h', 12], d1: ['d', 1] };
function folderId_(s) { s = String(s || '').trim(); var m = s.match(/\/folders\/([a-zA-Z0-9_-]{10,})/) || s.match(/[?&]id=([a-zA-Z0-9_-]{10,})/) || s.match(/^([a-zA-Z0-9_-]{20,})$/); return m ? m[1] : ''; }
function getAutoBackup() {
  var t = 0; try { t = ScriptApp.getProjectTriggers().filter(function (x) { return x.getHandlerFunction() === 'autoBackup'; }).length; } catch (e) { t = -1; }
  return { on: prop_('AB_ON') === '1', triggers: t, folder: prop_('AB_FOLDER'), folderName: prop_('AB_FOLDER_NAME'), every: prop_('AB_EVERY') || 'h1', hour: Number(prop_('AB_HOUR') || 2), keep: Number(prop_('AB_KEEP') || 7), prune: prop_('AB_PRUNE') !== '0', skip: prop_('AB_SKIP') !== '0', last: prop_('AB_LAST'), lastFile: prop_('AB_LAST_FILE'), lastUrl: prop_('AB_LAST_URL'), lastErr: prop_('AB_LAST_ERR'), lastRun: prop_('AB_LAST_RUN'), lastPruned: Number(prop_('AB_LAST_PRUNED') || 0) };
}
function saveAutoBackup(pin, cfgJson) {
  needAdmin_(pin);
  var c = JSON.parse(cfgJson), id = folderId_(c.folder);
  if (c.folder && !id) throw new Error('This is not a Google Drive folder link. Open the folder in Drive and copy the link from the address bar (…/folders/XXXX).');
  if (c.on && !id && !prop_('AB_FOLDER')) throw new Error('Paste the Google Drive folder link first.');
  if (id) {
    var f; try { f = DriveApp.getFolderById(id); f.getName(); }
    catch (e) { throw new Error(/permission|authoriz/i.test(e.message) ? 'Drive permission is not granted yet. Run "authorizeAll" once in the Apps Script editor and click Allow, then deploy a new version.' : 'Cannot open this folder. The Google account that owns the sheet must own the folder or have Editor access to it.'); }
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
function autoBackup() { return runAutoBackup_(false); }                 // টাইমার (trigger) এটি চালায়
function runBackupNow(pin) { needAdmin_(pin); return runAutoBackup_(true); }
function runAutoBackup_(force) {
  try {
    setProp_('AB_LAST_RUN', new Date().toISOString());
    var id = prop_('AB_FOLDER'); if (!id) throw new Error('No backup folder is set.');
    var rev = getRev();
    if (!force && prop_('AB_SKIP') !== '0' && rev === prop_('AB_LAST_REV')) { prune_(); return { skipped: true }; }   // কিছু বদলায়নি — নতুন ফাইল লাগবে না
    var tz = Session.getScriptTimeZone() || 'Asia/Dhaka', name = 'SCS_AutoBackup_' + Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd_HH-mm-ss') + '.json';
    var f = DriveApp.getFolderById(id).createFile(name, JSON.stringify(fullBackup_()), 'application/json');
    setProp_('AB_LAST', new Date().toISOString()); setProp_('AB_LAST_FILE', name); setProp_('AB_LAST_URL', f.getUrl()); setProp_('AB_LAST_ERR', ''); setProp_('AB_LAST_REV', rev);
    return { file: name, url: f.getUrl(), pruned: prune_() };
  } catch (e) { setProp_('AB_LAST_ERR', new Date().toISOString() + ' — ' + e.message); if (force) throw e; return { error: e.message }; }
}
/* পুরোনো অটো-ব্যাকআপ (নির্দিষ্ট দিনের বেশি পুরোনো) ড্রাইভের ট্র্যাশে পাঠায়; শুধু SCS_AutoBackup_ নামের ফাইল */
function prune_() {
  if (prop_('AB_PRUNE') === '0' || !prop_('AB_FOLDER')) return 0;
  var cut = new Date(Date.now() - Number(prop_('AB_KEEP') || 7) * 86400000).toISOString().replace(/\.\d+Z$/, ''), n = 0;
  var it = DriveApp.getFolderById(prop_('AB_FOLDER')).searchFiles("title contains 'SCS_AutoBackup_' and modifiedDate < '" + cut + "' and trashed = false");
  while (it.hasNext()) { var f = it.next(); if (f.getName().indexOf('SCS_AutoBackup_') === 0) { try { f.setTrashed(true); n++; } catch (e) {} } }
  if (n) setProp_('AB_LAST_PRUNED', n);
  return n;
}
function snapshot_(reason) {
  var d = loadAll(), snap = {};
  COLLS.forEach(function (c) { snap[c] = d[c]; });
  var json = JSON.stringify(snap);
  var h = his_(), parts = [], i;
  for (i = 0; i < json.length; i += 45000) parts.push(json.substr(i, 45000));
  var stamp = new Date().toISOString();
  h.getRange(h.getLastRow() + 1, 1, parts.length, 3).setNumberFormat('@')
    .setValues(parts.map(function (p, k) { return [stamp, reason + ' #' + k, p]; }));
  var extra = (h.getLastRow() - 1) - 300;
  if (extra > 0) h.deleteRows(2, extra);
}
function writeAll_(data) {
  var sh = rec_(), rows = [];
  COLLS.forEach(function (c) {
    (data[c] || []).forEach(function (o) { if (o && o.id) rows.push([c, String(o.id), JSON.stringify(o), new Date().toISOString()]); });
  });
  if (rows.length) sh.getRange(sh.getLastRow() + 1, 1, rows.length, 4).setNumberFormat('@').setValues(rows);
  return rows.length;
}
function clearRecords_() { var sh = rec_(), n = sh.getLastRow(); if (n >= 2) sh.getRange(2, 1, n - 1, 4).clearContent(); }
function restoreData(pin, jsonText, mode, withSettings) {
  needAdmin_(pin);
  var obj = JSON.parse(jsonText), data = obj && obj.data;
  if (!obj || obj.app !== 'SCS Projects' || !data) throw new Error('এটি SCS Projects এর ব্যাকআপ ফাইল নয়। / Not an SCS Projects backup.');
  return lock_(function () {
    snapshot_('before restore');
    writeLog_([['restore', '', '', '', (mode === 'replace' ? 'Replace all from backup' : 'Merge from backup') + (withSettings && obj.settings ? ' + settings' : ''), 'admin']]);
    if (withSettings && obj.settings) Object.keys(obj.settings).forEach(function (k) { putSettingRaw_(k, obj.settings[k]); });
    var bills = obj.billSheets ? billRestore_(obj.billSheets, mode === 'replace') : 0;
    if (mode === 'replace') {
      clearRecords_();
      return { mode: 'replace', rows: writeAll_(data), bills: bills };
    }
    var cur = loadAll(), ids = {};
    COLLS.forEach(function (c) { cur[c].forEach(function (o) { ids[c + '|' + o.id] = 1; }); });
    var add = {};
    COLLS.forEach(function (c) { add[c] = (data[c] || []).filter(function (o) { return o && o.id && !ids[c + '|' + o.id]; }); });
    // একই আইডি থাকলে ব্যাকআপের ডাটা দিয়ে আপডেট
    var sh = rec_();
    COLLS.forEach(function (c) {
      (data[c] || []).forEach(function (o) {
        if (!o || !o.id || !ids[c + '|' + o.id]) return;
        var row = findRow_(sh, c, o.id);
        if (row) sh.getRange(row, 1, 1, 4).setNumberFormat('@').setValues([[c, String(o.id), JSON.stringify(o), new Date().toISOString()]]);
      });
    });
    return { mode: 'merge', rows: writeAll_(add) };
  });
}
function resetAll(pin) {
  needAdmin_(pin);
  return lock_(function () { snapshot_('before reset'); clearRecords_(); writeLog_([['reset', '', '', '', 'All data reset (snapshot in DB_History)', 'admin']]); return true; });
}

/* প্রথমবার / নতুন ফিচার যোগ হলে Apps Script এডিটর থেকে একবার এটি চালিয়ে "Allow" দিন (ইমেইল, ড্রাইভ, এসএমএস, শিডিউল — সব অনুমতি) */
function authorizeAll() {
  var out = ['Sheet: ' + home_().getName()];
  try { DriveApp.getFileById(home_().getId()).getLastUpdated(); DriveApp.getRootFolder().getName(); out.push('Drive: OK'); } catch (e) { out.push('Drive: ' + e.message); }
  try { out.push('Email: OK (' + MailApp.getRemainingDailyQuota() + ' emails left today)'); } catch (e) { out.push('Email: ' + e.message); }
  try { UrlFetchApp.getRequest(SMS_API); out.push('SMS: OK'); } catch (e) { out.push('SMS: ' + e.message); }
  try { ScriptApp.getProjectTriggers(); out.push('Schedule: OK'); } catch (e) { out.push('Schedule: ' + e.message); }
  setProp_('DB_READY', '');
  Logger.log(out.join('\n'));
  return out.join(' | ');
}


/* =====================================================================
 *  বিল ও মেজারমেন্ট মডিউল (আগে আলাদা BillCode.gs ছিল — এখন এখানেই)
 * ===================================================================== */
/**
 * =====================================================================
 *  SCS Projects - PROJECT BILL & MEASUREMENT module  (Bill.gs)
 *  Swarup Construction Solution
 * =====================================================================
 *  Built from the SCS Quotation engine. Add this file next to Code.gs,
 *  Index.html and Bill.html in the same Apps Script project.
 *
 *  Database = the same Google Sheet as SCS Projects (auto-created tabs):
 *    BL_Index    -> one row per bill / measurement (list + search)
 *    BL_Data     -> full document layout JSON (chunked)
 *    BL_Settings -> pads, seals, signatures, numbering, templates
 *    BL_Log      -> audit log
 *  Number format: SCSB + YYYY + MM + '-' + SL  (SL never resets: 01, 02 … 101 …)
 *  PINs: the same admin / user PINs as SCS Projects.
 * =====================================================================
 */
var SCSBILL = (function (GlobalCache) {
  /* own cache keys, so nothing clashes with SCS Projects */
  var CacheService = (function (G) {
    var P = 'BL_';
    var wrap = function (c) {
      var pk = function (k) { return P + k; };
      return {
        get: function (k) { return c.get(pk(k)); },
        put: function (k, v, t) { return t == null ? c.put(pk(k), v) : c.put(pk(k), v, t); },
        remove: function (k) { return c.remove(pk(k)); },
        getAll: function (ks) { var o = c.getAll(ks.map(pk)), r = {}; Object.keys(o).forEach(function (k) { r[k.slice(P.length)] = o[k]; }); return r; },
        putAll: function (o, t) { var r = {}; Object.keys(o).forEach(function (k) { r[pk(k)] = o[k]; }); return t == null ? c.putAll(r) : c.putAll(r, t); },
        removeAll: function (ks) { return c.removeAll(ks.map(pk)); }
      };
    };
    return { getScriptCache: function () { return wrap(G.getScriptCache()); }, getUserCache: function () { return wrap(G.getUserCache()); } };
  })(GlobalCache);

var Q = {
  SH_INDEX: 'BL_Index',
  SH_DATA: 'BL_Data',
  SH_SET: 'BL_Settings',
  SH_LOG: 'BL_Log',
  CHUNK: 45000,
  DEF_USER: '2019',
  DEF_ADMIN: '20192026',
  INDEX_HEAD: ['ID', 'QuoteNo', 'Year', 'Seq', 'Date', 'Company', 'Contact', 'Project', 'Total', 'Status', 'Pages', 'CreatedAt', 'UpdatedAt', 'DriveUrl', 'CreatedBy', 'Subject', 'Attn', 'Terms', 'Body', 'Mark', 'MarkAt', 'SeenAt', 'Kind'],
  DATA_HEAD: ['ID', 'Chunk', 'Data (JSON)', 'UpdatedAt'],
  SET_HEAD: ['Key', 'Value', 'UpdatedAt'],
  LOG_HEAD: ['Time', 'Action', 'QuoteNo', 'Role', 'Note']
};

/* ---------------------------------------------------------------------
 *  WEB APP ENTRY
 * ------------------------------------------------------------------- */
function doGet() {
  try { ensureDb_(); } catch (err) { /* UI will show the error on first call */ }
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('SCS Bill')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function onOpen() {
  try {
    SpreadsheetApp.getUi()
      .createMenu('SCS Bill')
      .addItem('Setup / Repair Database Sheets', 'setupDatabase')
      .addItem('Self Test (Save + Drive)', 'selfTest')
      .addToUi();
  } catch (e) {}
}

/* ---------------------------------------------------------------------
 *  DATABASE
 * ------------------------------------------------------------------- */
function setupDatabase() {
  var ss = getHome_();
  ensureSheet_(ss, Q.SH_INDEX, Q.INDEX_HEAD);
  ensureSheet_(ss, Q.SH_DATA, Q.DATA_HEAD);
  ensureSheet_(ss, Q.SH_SET, Q.SET_HEAD);
  ensureSheet_(ss, Q.SH_LOG, Q.LOG_HEAD);
  return 'OK: ' + ss.getName();
}

function getHome_() { return home_(); }   // SCS Projects' own spreadsheet

function ensureSheet_(ss, name, headers) {
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, headers.length).setValues([headers])
      .setFontWeight('bold').setBackground('#e5007d').setFontColor('#ffffff');
    sh.setFrozenRows(1);
    try { sh.protect().setWarningOnly(true).setDescription('SCS Project Bill database - do not edit directly'); } catch (e) {}
  } else if (sh.getLastColumn() < headers.length) {
    sh.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold').setBackground('#e5007d').setFontColor('#ffffff');
  }
  return sh;
}

function withLock_(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(60000);
  try { return fn(); } finally { lock.releaseLock(); }
}

function log_(action, no, role, note) {
  try {
    var sh = ensureSheet_(getHome_(), Q.SH_LOG, Q.LOG_HEAD);
    sh.appendRow([new Date().toISOString(), String(action), String(no || ''), String(role || ''), String(note || '').slice(0, 300)]);
  } catch (e) {}
}

/* ---------------------------------------------------------------------
 *  SETTINGS + CONFIG
 * ------------------------------------------------------------------- */
/* ---- small cache layer (settings, pad image): fewer sheet reads = faster login / save ---- */
function cacheGetBig_(key) {
  try {
    var c = CacheService.getScriptCache(), n = Number(c.get(key + '#n') || 0); if (!n) return null;
    var keys = []; for (var i = 0; i < n; i++) keys.push(key + '#' + i);
    var o = c.getAll(keys), s = ''; for (i = 0; i < n; i++) { var p = o[key + '#' + i]; if (p == null) return null; s += p; }
    return s;
  } catch (e) { return null; }
}
function cachePutBig_(key, str, sec) {
  try {
    var c = CacheService.getScriptCache(), CH = 30000, n = Math.ceil(str.length / CH), o = {};
    if (n > 90) return;
    for (var i = 0; i < n; i++) o[key + '#' + i] = str.substr(i * CH, CH);
    o[key + '#n'] = String(n); c.putAll(o, sec || 600);
  } catch (e) {}
}
function cacheDelBig_(key) {
  try { var c = CacheService.getScriptCache(), n = Number(c.get(key + '#n') || 0), keys = [key + '#n']; for (var i = 0; i < n; i++) keys.push(key + '#' + i); c.removeAll(keys); } catch (e) {}
}
function ensureDb_() {
  var c = CacheService.getScriptCache();
  if (c.get('dbok')) return;
  setupDatabase(); try { c.put('dbok', '1', 1800); } catch (e) {}
}

function readSettings_() {
  var cached = cacheGetBig_('settings_v2');
  if (cached) { try { return JSON.parse(cached); } catch (e) {} }
  var sh = ensureSheet_(getHome_(), Q.SH_SET, Q.SET_HEAD);
  var last = sh.getLastRow();
  var out = {};
  if (last < 2) return out;
  sh.getRange(2, 1, last - 1, 2).getValues().forEach(function (r) {
    if (r[0] !== '') out[String(r[0])] = r[1];
  });
  cachePutBig_('settings_v2', JSON.stringify(out), 60);
  return out;
}

function writeSetting_(key, value) {
  withLock_(function () {
    var sh = ensureSheet_(getHome_(), Q.SH_SET, Q.SET_HEAD);
    var last = sh.getLastRow();
    var row = 0;
    if (last >= 2) {
      var keys = sh.getRange(2, 1, last - 1, 1).getValues();
      for (var i = 0; i < keys.length; i++) {
        if (String(keys[i][0]) === String(key)) { row = i + 2; break; }
      }
    }
    if (!row) row = last + 1;
    sh.getRange(row, 1, 1, 3).setNumberFormat('@').setValues([[String(key), String(value), new Date().toISOString()]]);
    cacheDelBig_('settings_v2');
  });
}

function defaultConfig_() {
  return {
    company: 'Swarup Construction Solution',
    numbering: { prefix: 'SCSB', pad: 2, useYear: true, startSeq: 1 },
    logo: '', sigGap: 36,
    margins: { top: 1.45, bottom: 0.8, side: 0.55 },
    vatRate: 5,
    numFmt: 'bd',
    dec: 2,
    currency: 'Taka',
    signatories: {
      count: 2,
      list: [
        { title: 'RECEIVED BY', name: '', designation: '', org: '', img: '' },
        { title: 'FOR: SWARUP CONSTRUCTION SOLUTION', name: '', designation: '', org: '', img: '' },
        { title: '', name: '', designation: '', org: '', img: '' },
        { title: '', name: '', designation: '', org: '', img: '' }
      ]
    },
    seals: [],
    terms: [],
    folders: { defaultId: '', favorites: [] },
    padFileId: '',
    pads: []
  };
}

function readConfig_() {
  var def = defaultConfig_();
  try {
    var s = readSettings_();
    if (s.app_config) {
      var saved = JSON.parse(String(s.app_config));
      Object.keys(saved).forEach(function (k) {
        if (saved[k] && typeof saved[k] === 'object' && !Array.isArray(saved[k]) && def[k] && typeof def[k] === 'object') {
          Object.keys(saved[k]).forEach(function (k2) { def[k][k2] = saved[k][k2]; });
        } else {
          def[k] = saved[k];
        }
      });
    }
  } catch (e) {}
  return def;
}

function getBootstrap() {
  ensureDb_();
  return { config: readConfig_(), nextNo: peekNextNo() };
}

function saveConfig(cfgJson, adminPin) {
  requireAdmin_(adminPin);
  var cfg = JSON.parse(String(cfgJson || '{}'));
  var def = defaultConfig_();
  var out = {};
  out.company = String(cfg.company || def.company).slice(0, 120);
  var n = cfg.numbering || {};
  out.numbering = {
    prefix: String(n.prefix || def.numbering.prefix).replace(/[^A-Za-z0-9]/g, '').slice(0, 12) || def.numbering.prefix,
    pad: 2,
    mprefix: String(n.mprefix || 'SCSM').replace(/[^A-Za-z0-9]/g, '').slice(0, 12) || 'SCSM',
    useYear: n.useYear !== false,
    startSeq: Math.max(1, Math.floor(Number(n.startSeq) || 1))
  };
  var m = cfg.margins || {};
  out.margins = {
    top: clamp_(Number(m.top), 0.3, 4, def.margins.top),
    bottom: clamp_(Number(m.bottom), 0.2, 3, def.margins.bottom),
    side: clamp_(Number(m.side), 0.2, 2, def.margins.side)
  };
  out.vatRate = clamp_(Number(cfg.vatRate), 0, 100, 5);
  out.numFmt = cfg.numFmt === 'intl' ? 'intl' : 'bd';
  out.dec = Number(cfg.dec) === 0 ? 0 : 2;
  out.currency = String(cfg.currency || 'Taka').slice(0, 20);
  var sg = cfg.signatories || {};
  var list = (sg.list || []).slice(0, 4).map(function (g) {
    return { title: String(g.title || '').slice(0, 60), name: String(g.name || '').slice(0, 80), designation: String(g.designation || '').slice(0, 80), org: String(g.org || '').slice(0, 100), img: String(g.img || '').slice(0, 400) };
  });
  while (list.length < 4) list.push({ title: '', name: '', designation: '', org: '', img: '' });
  out.signatories = { count: Math.min(4, Math.max(1, Number(sg.count) || 2)), list: list };
  out.seals = (cfg.seals || []).slice(0, 12).map(function (s) {
    return {
      name: String(s.name || 'Seal').slice(0, 60),
      url: String(s.url || '').slice(0, 400),
      w: clamp_(Number(s.w), 30, 400, 110),
      x: clamp_(Number(s.x), 0, 794, 560),
      y: clamp_(Number(s.y), -400, 400, -20),
      op: clamp_(Number(s.op), 0.1, 1, 0.9)
    };
  });
  out.terms = (cfg.terms || []).slice(0, 30).map(function (t) { return String(t).slice(0, 500); }).filter(function (t) { return t.trim(); });
  var f = cfg.folders || {};
  out.folders = {
    defaultId: String(f.defaultId || '').slice(0, 300),
    favorites: (f.favorites || []).slice(0, 30).map(function (x) { return { name: String(x.name || '').slice(0, 80), id: String(x.id || '').slice(0, 120) }; })
      .filter(function (x) { return x.id; })
  };
  out.padFileId = String(cfg.padFileId || '').slice(0, 200);
  out.pads = (cfg.pads || []).slice(0, 6).map(function (p) { return { name: String(p.name || 'Pad').slice(0, 60), src: String(p.src || '').slice(0, 400), size: /^(a4|letter|legal)$/.test(p.size) ? p.size : 'auto' }; }).filter(function (p) { return p.src; });
  out.defPage = /^(a4|letter|legal)$/.test(cfg.defPage) ? cfg.defPage : 'a4';
  out.padSize = /^(a4|letter|legal)$/.test(cfg.padSize) ? cfg.padSize : 'auto';
  out.logo = String(cfg.logo || '').slice(0, 400);
  var sgp = Number(cfg.sigGap); out.sigGap = isNaN(sgp) ? 36 : Math.max(0, Math.min(200, Math.round(sgp)));
  writeSetting_('app_config', JSON.stringify(out));
  bumpChange_('cfg', '');
  log_('config-save', '', 'admin', 'Admin settings updated');
  return readConfig_();
}

function clamp_(v, lo, hi, dflt) {
  if (isNaN(v)) return dflt;
  return Math.min(hi, Math.max(lo, v));
}

/* ---------------------------------------------------------------------
 *  PIN / LOGIN
 * ------------------------------------------------------------------- */
function sha256Hex_(s) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(s), Utilities.Charset.UTF_8);
  return bytes.map(function (x) {
    var v = (x < 0 ? x + 256 : x).toString(16);
    return v.length === 1 ? '0' + v : v;
  }).join('');
}

function pinRole_(pin) {
  pin = String(pin == null ? '' : pin);
  var t = tokenRole_(pin); if (t) return t;          // signed in from SCS Projects
  if (!/^\d{4,8}$/.test(pin)) return '';
  return loginCheck(pin) || '';                      // SCS Projects admin / user PIN
}

function throttle_(ok) {
  var cache = CacheService.getScriptCache();
  var key = 'fail_' + Session.getTemporaryActiveUserKey();
  var n = Number(cache.get(key) || 0);
  if (!ok && n >= 6) throw new Error('Too many wrong attempts. Please wait 5 minutes.');
  if (ok) { cache.remove(key); return; }
  cache.put(key, String(n + 1), 300);
}

function login(pin) {
  var n = Number(CacheService.getScriptCache().get('fail_' + Session.getTemporaryActiveUserKey()) || 0);
  if (n >= 6) throw new Error('Too many wrong attempts. Please wait 5 minutes.');
  var role = pinRole_(pin);
  if (!role) { throttle_(false); throw new Error('Invalid PIN'); }
  throttle_(true);
  return { ok: true, role: role };
}

function requireAdmin_(pin) {
  var n = Number(CacheService.getScriptCache().get('fail_' + Session.getTemporaryActiveUserKey()) || 0);
  if (n >= 6) throw new Error('Too many wrong attempts. Please wait 5 minutes.');
  if (pinRole_(pin) !== 'admin') { throttle_(false); throw new Error('Admin PIN required or wrong.'); }
  throttle_(true);
}

function verifyAdmin(pin) {
  requireAdmin_(pin);
  return true;
}

function changePin(kind, newPin, adminPin) {
  throw new Error('PINs are shared with SCS Projects. Change them in SCS Projects → Admin → Security & Privacy.');
}

/* ---------------------------------------------------------------------
 *  LETTERHEAD + IMAGES
 * ------------------------------------------------------------------- */
function getPadDataUrl() {
  var cfg = readConfig_(), padKey = 'pad_' + String(cfg.padFileId || 'html').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 60);
  if (cfg.pads && cfg.pads.length) return getPadFromList_(cfg, 0);
  var hit = cacheGetBig_(padKey); if (hit) return hit;
  var res = getPadDataUrlRaw_(cfg);
  if (res) cachePutBig_(padKey, res, 1800);
  return res;
}
function getPadDataUrlRaw_(cfg) {
  if (cfg.padFileId) {
    try {
      var b = DriveApp.getFileById(extractDriveId_(cfg.padFileId) || cfg.padFileId).getBlob();
      return 'data:' + b.getContentType() + ';base64,' + Utilities.base64Encode(b.getBytes());
    } catch (e) { /* use Pad.html */ }
  }
  try {
    var html = HtmlService.createHtmlOutputFromFile('Pad').getContent();
    var m = html.match(/src\s*=\s*['"](data:image\/[a-zA-Z+]+;base64,[A-Za-z0-9+\/=]+)['"]/);
    if (m) return m[1];
  } catch (e2) {}
  return '';
}

function extractDriveId_(src) {
  src = String(src || '').trim();
  var m = src.match(/\/d\/([-\w]{20,})/) || src.match(/[?&]id=([-\w]{20,})/);
  if (m) return m[1];
  if (/^[-\w]{25,}$/.test(src)) return src;
  return '';
}

function getImageDataUrl(src) {
  src = String(src || '').trim();
  if (!src) return '';
  if (src.indexOf('data:image/') === 0) return src;
  var blob = null;
  var id = extractDriveId_(src);
  if (id) {
    blob = DriveApp.getFileById(id).getBlob();
  } else if (/^https?:\/\//i.test(src)) {
    var resp = UrlFetchApp.fetch(src, { muteHttpExceptions: true, followRedirects: true });
    if (resp.getResponseCode() !== 200) throw new Error('Image link not reachable (HTTP ' + resp.getResponseCode() + ')');
    blob = resp.getBlob();
  } else {
    throw new Error('Use a Google Drive link/ID or a direct image URL.');
  }
  var ct = String(blob.getContentType() || '');
  if (ct.indexOf('image/') !== 0) throw new Error('That link is not an image file.');
  var bytes = blob.getBytes();
  if (bytes.length > 3500000) throw new Error('Image is too large (max about 3 MB).');
  return 'data:' + ct + ';base64,' + Utilities.base64Encode(bytes);
}

/* ---------------------------------------------------------------------
 *  BILL NUMBER
 * ------------------------------------------------------------------- */
function numberParts_(cfg, year, seq, month, kind) {
  var n = (cfg && cfg.numbering) || {};
  var prefix = kind === 'meas' ? (String(n.mprefix || 'SCSM').replace(/[^A-Za-z0-9]/g, '') || 'SCSM') : (String(n.prefix || 'SCSB').replace(/[^A-Za-z0-9]/g, '') || 'SCSB');
  var s = String(seq);
  while (s.length < 2) s = '0' + s;                       // 01..99, then 100, 101 ...
  var mo = month || (new Date().getMonth() + 1);
  return prefix + year + ('0' + mo).slice(-2) + '-' + s;   // SCSQ202610-01
}

var NO_RE_ = /^[A-Za-z0-9]+?(\d{4})(\d{2})-(\d+)$/;

/** Next serial = smallest unused number (deleted bills free their number; no gaps, no duplicates). */
function nextSeq_(cfg) {
  var sh = ensureSheet_(getHome_(), Q.SH_INDEX, Q.INDEX_HEAD);
  var last = sh.getLastRow(), used = {};
  if (last >= 2) {
    sh.getRange(2, 2, last - 1, 1).getValues().forEach(function (r) {
      var m = String(r[0]).match(NO_RE_);
      if (m) used[Number(m[3]) || 0] = true;
    });
  }
  var k = Math.max(1, Number((cfg.numbering || {}).startSeq || 1));
  while (used[k]) k++;
  return k;
}

function peekNextNo(kind) {
  var cfg = readConfig_();
  var year = new Date().getFullYear();
  return numberParts_(cfg, year, nextSeq_(cfg), null, kind === 'meas' ? 'meas' : 'bill');
}

/* ---------------------------------------------------------------------
 *  QUOTATIONS (save / list / get / delete)
 * ------------------------------------------------------------------- */
function findRowById_(sh, id) {
  var last = sh.getLastRow();
  if (last < 2) return 0;
  var f = sh.getRange(2, 1, last - 1, 1).createTextFinder(String(id)).matchEntireCell(true).matchCase(true).findNext();
  return f ? f.getRow() : 0;
}

function rowToObj_(r) {
  return {
    id: String(r[0]), no: String(r[1]), year: r[2], seq: r[3], date: String(r[4] || ''),
    company: String(r[5] || ''), contact: String(r[6] || ''), project: String(r[7] || ''),
    total: Number(r[8]) || 0, status: String(r[9] || 'Draft'), pages: Number(r[10]) || 1,
    createdAt: String(r[11] || ''), updatedAt: String(r[12] || ''), driveUrl: String(r[13] || ''), createdBy: String(r[14] || ''), subject: String(r[15] || ''),
    attn: String(r[16] || ''), terms: String(r[17] || ''), indexed: r[17] !== '' && r[17] != null,
    mark: String(r[19] || ''), markAt: String(r[20] || ''), seenAt: String(r[21] || ''), kind: String(r[22] || 'bill')
  };
}

/**
 * payload = { id, no, doc (JSON string), meta:{company,contact,project,total,dateISO,pages}, status, role, adminPin }
 */
function saveQuotation(payload) {
  payload = payload || {};
  var id = String(payload.id || '').trim();
  if (!id) throw new Error('Missing bill id');
  var docStr = String(payload.doc || '');
  var parsed = JSON.parse(docStr);                       // invalid JSON -> not saved
  if (!parsed || typeof parsed !== 'object') throw new Error('Invalid data');
  var meta = payload.meta || {};
  var dig = docDigest_(parsed);
  var mark0 = payload.mark === 'dup' ? 'dup' : '';
  var status = payload.status === 'Final' ? 'Final' : (payload.status === 'Saved' ? 'Saved' : (payload.status === 'Import' ? 'Import' : 'Draft'));   // Draft = unfinished, Saved = completed, Final = locked
  var role = String(payload.role || 'user');

  return withLock_(function () {
    var ss = getHome_();
    var cfg = readConfig_();
    var ix = ensureSheet_(ss, Q.SH_INDEX, Q.INDEX_HEAD);
    var dt = ensureSheet_(ss, Q.SH_DATA, Q.DATA_HEAD);
    var row = findRowById_(ix, id);
    var now = new Date().toISOString();
    var no = String(payload.no || '').trim();
    var year = new Date().getFullYear();
    var seq = 0, assigned = false;

    if (row) {
      var cur = ix.getRange(row, 1, 1, Q.INDEX_HEAD.length).getValues()[0];
      var curStatus = String(cur[9] || 'Draft');
      var baseU = String(payload.base || '');
      if (baseU && !payload.force && String(cur[12]) !== baseU) throw new Error('CONFLICT');
      if (curStatus === 'Final') {
        // Editing a finalized bill needs the admin PIN
        if (pinRole_(payload.adminPin) !== 'admin') throw new Error('Admin PIN required to edit a finalized bill.');
        log_('edit-final', cur[1], 'admin', 'Finalized bill edited');
      }
      no = String(cur[1]); year = cur[2]; seq = cur[3];
      if (!no) {
        // a number requested from the Ref No element (even on an imported file) is kept if it is still free
        var pn = String(payload.no || '').trim(), pm = pn.match(NO_RE_), taken = false;
        if (pm) {
          var lastN = ix.getLastRow();
          if (lastN >= 2) { var nos0 = ix.getRange(2, 2, lastN - 1, 1).getValues(); for (var q = 0; q < nos0.length; q++) if (String(nos0[q][0]) === pn) { taken = true; break; } }
        }
        if (pm && !taken) { no = pn; year = Number(pm[1]); seq = Number(pm[3]); assigned = true; }
        else if (status !== 'Import') {   // an imported file gets its number when it is filed (saved) or when Ref No is used
          year = new Date().getFullYear(); seq = nextSeq_(cfg); no = numberParts_(cfg, year, seq); assigned = true;
        }
      }
    } else if (status === 'Import') {
      no = ''; year = ''; seq = '';      // imported files carry no bill number
    } else {
      // New bill: make sure the number is unique, else assign the next one
      var dup = false;
      var last = ix.getLastRow();
      if (no && last >= 2) {
        var nos = ix.getRange(2, 2, last - 1, 1).getValues();
        for (var i = 0; i < nos.length; i++) if (String(nos[i][0]) === no) { dup = true; break; }
      }
      var m = no.match(NO_RE_);
      if (!no || dup || !m) {
        seq = nextSeq_(cfg);
        no = numberParts_(cfg, year, seq);
      } else {
        seq = Number(m[3]); year = Number(m[1]);
      }
      assigned = true;
    }

    if (assigned && no) { var fxn = String(no).match(NO_RE_); if (fxn) no = numberParts_(cfg, Number(fxn[1]), Number(fxn[3]), Number(fxn[2]), String(meta.kind || 'bill')); }
    var vals = [
      id, no, year, seq,
      String(meta.dateISO || '').slice(0, 10),
      String(meta.company || '').slice(0, 200),
      String(meta.contact || '').slice(0, 200),
      String(meta.project || '').slice(0, 300),
      Number(meta.total) || 0,
      status,
      Number(meta.pages) || 1
    ];
    if (row) {
      var cur2 = ix.getRange(row, 1, 1, Q.INDEX_HEAD.length).getValues()[0];
      var out = vals.concat([cur2[11], now, cur2[13], cur2[14], String(meta.subject || '').slice(0, 300), dig.attn, dig.terms, dig.body, cur2[19] || '', cur2[20] || '', cur2[21] || '', String(meta.kind || cur2[22] || 'bill').slice(0, 10)]);
      ix.getRange(row, 1, 1, out.length).setNumberFormat('@').setValues([out]);
      ix.getRange(row, 9).setNumberFormat('0.00').setValue(Number(meta.total) || 0);
    } else {
      var out2 = vals.concat([now, now, '', role, String(meta.subject || '').slice(0, 300), dig.attn, dig.terms, dig.body, mark0, mark0 ? now : '', '', String(meta.kind || 'bill').slice(0, 10)]);
      var r2 = ix.getLastRow() + 1;
      ix.getRange(r2, 1, 1, out2.length).setNumberFormat('@').setValues([out2]);
      ix.getRange(r2, 9).setNumberFormat('0.00').setValue(Number(meta.total) || 0);
      log_('create', no, role, String(meta.company || ''));
    }

    // Replace data chunks
    var chunks = [];
    for (var p = 0; p < docStr.length; p += Q.CHUNK) chunks.push(docStr.substr(p, Q.CHUNK));
    if (!chunks.length) chunks.push('{}');
    var lastD = dt.getLastRow();
    var rows = [];
    if (lastD >= 2) {
      dt.getRange(2, 1, lastD - 1, 1).createTextFinder(id).matchEntireCell(true).matchCase(true).findAll().forEach(function (rg) { rows.push(rg.getRow()); });
      rows.sort(function (a, b) { return a - b; });
    }
    var appendRows = [];
    chunks.forEach(function (c, idx) {
      if (idx < rows.length) {
        dt.getRange(rows[idx], 1, 1, 4).setNumberFormat('@').setValues([[id, String(idx), c, now]]);
      } else {
        appendRows.push([id, String(idx), c, now]);
      }
    });
    if (appendRows.length) dt.getRange(dt.getLastRow() + 1, 1, appendRows.length, 4).setNumberFormat('@').setValues(appendRows);
    for (var z = chunks.length; z < rows.length; z++) dt.getRange(rows[z], 1, 1, 4).clearContent();
    SpreadsheetApp.flush();
    bumpChange_(id, String(payload.cid || ''));
    return { ok: true, id: id, no: no, status: status, updatedAt: now };
  });
}

function listQuotations() {
  var ix = ensureSheet_(getHome_(), Q.SH_INDEX, Q.INDEX_HEAD);
  var last = ix.getLastRow();
  if (last < 2) return [];
  // read everything except the long "Body" column (search text) — much faster for big lists
  var vals = ix.getRange(2, 1, last - 1, 18).getValues(), mk = ix.getRange(2, 20, last - 1, 4).getValues();
  var out = [];
  vals.forEach(function (r, i) { if (r[0] === '') return; r[18] = ''; r[19] = mk[i][0]; r[20] = mk[i][1]; r[21] = mk[i][2]; r[22] = mk[i][3]; out.push(rowToObj_(r)); });
  out.sort(function (a, b) { return a.updatedAt < b.updatedAt ? 1 : -1; });
  return out;
}

function getQuotation(id) {
  id = String(id || '');
  var ss = getHome_();
  var ix = ensureSheet_(ss, Q.SH_INDEX, Q.INDEX_HEAD);
  var dt = ensureSheet_(ss, Q.SH_DATA, Q.DATA_HEAD);
  var row = findRowById_(ix, id);
  if (!row) throw new Error('Bill not found.');
  var info = rowToObj_(ix.getRange(row, 1, 1, Q.INDEX_HEAD.length).getValues()[0]);
  var last = dt.getLastRow();
  var parts = [];
  if (last >= 2) {
    dt.getRange(2, 1, last - 1, 1).createTextFinder(id).matchEntireCell(true).matchCase(true).findAll().forEach(function (rg) {
      var v = dt.getRange(rg.getRow(), 2, 1, 2).getValues()[0]; parts.push({ n: Number(v[0]) || 0, d: String(v[1] || '') });
    });
  }
  parts.sort(function (a, b) { return a.n - b.n; });
  var json = parts.map(function (p) { return p.d; }).join('');
  return { info: info, doc: json };
}

function deleteQuotation(id, adminPin) {
  id = String(id || '');
  return withLock_(function () {
    var ss = getHome_();
    var ix = ensureSheet_(ss, Q.SH_INDEX, Q.INDEX_HEAD);
    var dt = ensureSheet_(ss, Q.SH_DATA, Q.DATA_HEAD);
    var row = findRowById_(ix, id);
    if (!row) return true;
    var cur = ix.getRange(row, 1, 1, Q.INDEX_HEAD.length).getValues()[0];
    var role = pinRole_(adminPin);
    if (String(cur[9]) === 'Final' && role !== 'admin') throw new Error('Admin PIN required to delete a finalized bill.');
    if (!role) {   // a PIN is always needed, except to discard a brand-new draft   // without a PIN only a brand-new draft (created in the last 2 hours) may be discarded
      var born = new Date(String(cur[11])).getTime();
      if (String(cur[9]) !== 'Draft' || isNaN(born) || (Date.now() - born) > 2 * 3600 * 1000) throw new Error('PIN required to delete this bill.');
    }
    ix.deleteRow(row);
    bumpChange_(id, '');
    var last = dt.getLastRow();
    if (last >= 2) {
      var ids = dt.getRange(2, 1, last - 1, 1).getValues();
      for (var i = ids.length - 1; i >= 0; i--) if (String(ids[i][0]) === id) dt.deleteRow(i + 2);
    }
    log_('delete', cur[1], role || 'user', String(cur[5] || ''));
    return true;
  });
}

function setStatus(id, status, adminPin) {
  id = String(id || '');
  status = status === 'Final' ? 'Final' : 'Draft';
  return withLock_(function () {
    var ix = ensureSheet_(getHome_(), Q.SH_INDEX, Q.INDEX_HEAD);
    var row = findRowById_(ix, id);
    if (!row) throw new Error('Bill not found.');
    var cur = String(ix.getRange(row, 10).getValue() || 'Draft');
    if (cur === 'Final' && status === 'Draft') requireAdmin_(adminPin);
    ix.getRange(row, 10).setNumberFormat('@').setValue(status);
    var nowS = new Date().toISOString();
    ix.getRange(row, 13).setNumberFormat('@').setValue(nowS);
    bumpChange_(id, '');
    log_(status === 'Final' ? 'finalize' : 'unlock', ix.getRange(row, 2).getValue(), pinRole_(adminPin) || 'user', '');
    return { ok: true, status: status, updatedAt: nowS };
  });
}

/* ---------------------------------------------------------------------
 *  GOOGLE DRIVE (folders + PDF upload)
 * ------------------------------------------------------------------- */
function folderInfo_(f) { return { id: f.getId(), name: f.getName() }; }

function listFolders(parentId) {
  var parent;
  parentId = String(parentId || '');
  if (!parentId || parentId === 'root') parent = DriveApp.getRootFolder();
  else parent = DriveApp.getFolderById(parentId);
  var it = parent.getFolders();
  var list = [];
  while (it.hasNext() && list.length < 300) list.push(folderInfo_(it.next()));
  list.sort(function (a, b) { return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1; });
  // breadcrumb
  var path = [];
  var cur = parent;
  var guard = 0;
  while (cur && guard < 8) {
    path.unshift({ id: cur.getId(), name: cur.getName() });
    var ps = cur.getParents();
    cur = ps.hasNext() ? ps.next() : null;
    guard++;
  }
  return { current: folderInfo_(parent), path: path, folders: list };
}

function searchFolders(q) {
  q = String(q || '').replace(/['\\]/g, '').trim();
  if (!q) return [];
  var it = DriveApp.searchFolders("title contains '" + q + "' and trashed = false");
  var out = [];
  while (it.hasNext() && out.length < 30) out.push(folderInfo_(it.next()));
  return out;
}

function createFolder(parentId, name) {
  name = String(name || '').trim().slice(0, 100);
  if (!name) throw new Error('Folder name required.');
  var parent = (!parentId || parentId === 'root') ? DriveApp.getRootFolder() : DriveApp.getFolderById(String(parentId));
  return folderInfo_(parent.createFolder(name));
}

function getFolderName(id) {
  try { return DriveApp.getFolderById(String(id)).getName(); } catch (e) { return ''; }
}

function uploadPdfToDrive(folderId, fileName, base64, quoteId) {
  fileName = String(fileName || 'Bill.pdf').replace(/[\\\/:*?"<>|]/g, '-');
  if (!/\.pdf$/i.test(fileName)) fileName += '.pdf';
  var folder = (!folderId || folderId === 'root') ? DriveApp.getRootFolder() : DriveApp.getFolderById(String(folderId));
  trashPrev_(quoteId, folder, fileName);
  var blob = Utilities.newBlob(Utilities.base64Decode(String(base64)), 'application/pdf', fileName);
  var file = folder.createFile(blob);
  var url = file.getUrl();
  if (quoteId) {
    try {
      withLock_(function () {
        var ix = ensureSheet_(getHome_(), Q.SH_INDEX, Q.INDEX_HEAD);
        var row = findRowById_(ix, quoteId);
        if (row) ix.getRange(row, 14).setNumberFormat('@').setValue(url);
      });
    } catch (e) {}
  }
  log_('drive-upload', fileName, '', folder.getName());
  return { id: file.getId(), url: url, name: fileName, folder: folder.getName() };
}

/* ---------------------------------------------------------------------
 *  SELF TEST (run from the editor)
 * ------------------------------------------------------------------- */
function selfTest() {
  var msg = [];
  msg.push(setupDatabase());
  msg.push('Next no: ' + peekNextNo());
  msg.push('Pad loaded: ' + (getPadDataUrl() ? 'yes' : 'NO - create Pad.html file'));
  msg.push('Drive root: ' + DriveApp.getRootFolder().getName());
  Logger.log(msg.join('\n'));
  try { SpreadsheetApp.getUi().alert(msg.join('\n')); } catch (e) {}
  return msg.join('\n');
}


/* ---------------------------------------------------------------------
 *  COMPANY HEADER (saved per company + last bill of that company)
 * ------------------------------------------------------------------- */
function headerFieldsOf_(docStr) {
  try {
    var d = JSON.parse(docStr), out = null;
    (d.els || []).forEach(function (e) { if (!out && e.type === 'header') out = (e.fields || []).map(function (f) { return { k: f.k, l: f.l, v: f.v, s: f.s, b: f.b }; }); });
    return out;
  } catch (e) { return null; }
}

function getCompanyHeader(company, project) {
  var orig = String(company || '').trim(), origP = String(project || '').trim();
  company = orig.toUpperCase(); project = origP.toUpperCase();
  var st = readSettings_(), saved = null;
  try {
    var raw = (project && hdrSet_(st, company, project)) || hdrSet_(st, company, '');
    if (raw) saved = JSON.parse(String(raw));
  } catch (e) {}
  var last = null;
  var ix = ensureSheet_(getHome_(), Q.SH_INDEX, Q.INDEX_HEAD);
  var n = ix.getLastRow();
  if (n >= 2) {
    var best = null;
    ix.getRange(2, 1, n - 1, Q.INDEX_HEAD.length).getValues().forEach(function (r) {
      if (String(r[5]).toUpperCase() === company && (!project || String(r[7]).toUpperCase() === project) && (!best || String(r[12]) > String(best[12]))) best = r;
    });
    if (best) { try { last = headerFieldsOf_(getQuotation(String(best[0])).doc); } catch (e2) {} }
  }
  return { saved: saved, last: last };
}

/** hdrJson = {attn, client, address, project, subject, ...}; project optional (header of a specific project) */
function saveCompanyHeader(company, hdrJson, project) {
  company = String(company || '').trim().toUpperCase(); project = String(project || '').trim().toUpperCase();
  if (!company) throw new Error('Company name required.');
  var o = JSON.parse(String(hdrJson || '{}')), out = {};
  Object.keys(o).slice(0, 20).forEach(function (k) { out[String(k).slice(0, 20)] = String(o[k]).slice(0, k === '_lines' ? 6000 : 400); });
  writeSetting_('co_hdr:' + company + (project ? '|' + project : ''), JSON.stringify(out));
  log_('company-header', '', '', company + (project ? ' / ' + project : ''));
  return true;
}

/* Company registry: [{name, projects:[name,...]}]  (Group/Company -> several projects) */
function getRegistry() { return scsRegistry_(); }   // from SCS Projects: company = Company field, project = project name

function saveRegistry(json) { return scsRegistry_().length; }   // nothing to save: the list follows SCS Projects

/* ---------------------------------------------------------------------
 *  TABLE TEMPLATES (saved table formats with formulas)
 * ------------------------------------------------------------------- */
function getTableTemplates() {
  try { var raw = readSettings_().table_templates; return raw ? JSON.parse(String(raw)) : []; } catch (e) { return []; }
}
function saveTableTemplates(json) {
  var arr = JSON.parse(String(json || '[]'));
  if (!Array.isArray(arr)) throw new Error('Invalid data');
  var str = JSON.stringify(arr.slice(0, 40));
  if (str.length > 48000) throw new Error('Too many/large templates. Delete some first.');
  writeSetting_('table_templates', str);
  return arr.length;
}

/* ---------------------------------------------------------------------
 *  SYNC (refresh everything: config + list + next number)
 * ------------------------------------------------------------------- */
function syncAll() {
  ensureDb_();
  return { config: readConfig_(), nextNo: peekNextNo(), list: listQuotations(), templates: getTableTemplates(), registry: getRegistry(), at: new Date().toISOString() };
}

/* ---------------------------------------------------------------------
 *  DRIVE TREE UPLOAD:  <root folder> / <Company> / <QuoteNo>.pdf
 * ------------------------------------------------------------------- */
function extractFolderId_(src) {
  src = String(src || '').trim();
  var m = src.match(/\/folders\/([-\w]{15,})/) || src.match(/[?&]id=([-\w]{15,})/) || src.match(/\/d\/([-\w]{15,})/);
  if (m) return m[1];
  return /^[-\w]{15,}$/.test(src) ? src : '';
}

function uploadToTree(rootIdOrLink, company, fileName, base64, quoteId) {
  var rid = extractFolderId_(rootIdOrLink) || extractFolderId_(readConfig_().folders.defaultId);
  var root = rid ? DriveApp.getFolderById(rid) : DriveApp.getRootFolder();
  var coName = String(company || 'No Company').replace(/[\\\/:*?"<>|]/g, '-').trim().slice(0, 100) || 'No Company';
  coName = coName.toUpperCase();
  var it = root.getFoldersByName(coName);
  var folder = it.hasNext() ? it.next() : root.createFolder(coName);
  fileName = String(fileName || 'Bill.pdf').replace(/[\\\/:*?"<>|]/g, '-');
  fileName = fileName.replace(/\.pdf$/i, '').toUpperCase() + '.pdf';
  trashPrev_(quoteId, folder, fileName);
  var old = folder.getFilesByName(fileName);
  while (old.hasNext()) old.next().setTrashed(true);       // replace same-named file, no duplicates
  var file = folder.createFile(Utilities.newBlob(Utilities.base64Decode(String(base64)), 'application/pdf', fileName));
  var url = file.getUrl();
  if (quoteId) {
    try {
      withLock_(function () {
        var ix = ensureSheet_(getHome_(), Q.SH_INDEX, Q.INDEX_HEAD);
        var row = findRowById_(ix, quoteId);
        if (row) ix.getRange(row, 14).setNumberFormat('@').setValue(url);
      });
    } catch (e) {}
  }
  log_('drive-tree', fileName, '', coName);
  return { id: file.getId(), url: url, name: fileName, folder: root.getName() + ' / ' + coName };
}


/* Generic saved templates (header, ...) */
function getTemplates(kind) {
  kind = String(kind || '').replace(/[^a-z]/g, '');
  try { var raw = readSettings_()['tpl_' + kind]; return raw ? JSON.parse(String(raw)) : []; } catch (e) { return []; }
}
function saveTemplates(kind, json) {
  kind = String(kind || '').replace(/[^a-z]/g, '');
  if (!kind) throw new Error('Invalid kind');
  var arr = JSON.parse(String(json || '[]'));
  if (!Array.isArray(arr)) throw new Error('Invalid data');
  var str = JSON.stringify(arr.slice(0, 40));
  if (str.length > 48000) throw new Error('Too many/large templates. Delete some first.');
  writeSetting_('tpl_' + kind, str);
  return arr.length;
}


/* case-insensitive lookup of a saved company/project header */
function hdrSet_(st, company, project) {
  var want = ('CO_HDR:' + company + (project ? '|' + project : '')).toUpperCase(), found = '';
  Object.keys(st).forEach(function (k) { if (k.toUpperCase() === want && st[k]) found = st[k]; });
  return found;
}

/* ---------------------------------------------------------------------
 *  RENAME / DELETE company & project (PIN required)
 * ------------------------------------------------------------------- */
function requirePin_(pin) { if (!pinRole_(pin)) throw new Error('Wrong PIN.'); }
function up_(x) { return String(x == null ? '' : x).trim().toUpperCase(); }

function renameCompany(oldName, newName, pin) {
  requirePin_(pin);
  var o = up_(oldName), n = up_(newName); if (!o || !n) throw new Error('Name required.');
  var count = 0;
  withLock_(function () {
    var ix = ensureSheet_(getHome_(), Q.SH_INDEX, Q.INDEX_HEAD), last = ix.getLastRow();
    if (last >= 2) {
      var rng = ix.getRange(2, 6, last - 1, 1), vals = rng.getValues();
      vals.forEach(function (r) { if (up_(r[0]) === o) { r[0] = n; count++; } });
      if (count) rng.setNumberFormat('@').setValues(vals);
    }
  });
  var reg = getRegistry(), a = null, b = null;
  reg.forEach(function (c) { if (up_(c.name) === o) a = c; else if (up_(c.name) === n) b = c; });
  if (a) {
    if (b) { a.projects.forEach(function (p) { if (b.projects.indexOf(p) < 0) b.projects.push(p); }); reg = reg.filter(function (c) { return c !== a; }); }
    else a.name = n;
    saveRegistry(JSON.stringify(reg));
  }
  var st = readSettings_();
  Object.keys(st).forEach(function (k) {
    var m = k.match(/^co_hdr:([^|]*)(\|.*)?$/i);
    if (m && up_(m[1]) === o && st[k]) { writeSetting_('co_hdr:' + n + (m[2] ? m[2].toUpperCase() : ''), st[k]); writeSetting_(k, ''); }
  });
  log_('rename-company', '', '', o + ' -> ' + n);
  return { count: count };
}

function renameProject(company, oldP, newP, pin) {
  requirePin_(pin);
  var c = up_(company), o = up_(oldP), n = up_(newP); if (!c || !o || !n) throw new Error('Name required.');
  var count = 0;
  withLock_(function () {
    var ix = ensureSheet_(getHome_(), Q.SH_INDEX, Q.INDEX_HEAD), last = ix.getLastRow();
    if (last >= 2) {
      var cs = ix.getRange(2, 6, last - 1, 1).getValues(), rng = ix.getRange(2, 8, last - 1, 1), vals = rng.getValues();
      vals.forEach(function (r, i) { if (up_(cs[i][0]) === c && up_(r[0]) === o) { r[0] = n; count++; } });
      if (count) rng.setNumberFormat('@').setValues(vals);
    }
  });
  var reg = getRegistry();
  reg.forEach(function (x) { if (up_(x.name) === c) x.projects = x.projects.map(function (p) { return up_(p) === o ? n : p; }); });
  saveRegistry(JSON.stringify(reg));
  var st = readSettings_();
  Object.keys(st).forEach(function (k) { if (k.toUpperCase() === ('CO_HDR:' + c + '|' + o) && st[k]) { writeSetting_('co_hdr:' + c + '|' + n, st[k]); writeSetting_(k, ''); } });
  log_('rename-project', '', '', c + ': ' + o + ' -> ' + n);
  return { count: count };
}

function deleteCompanyEntry(name, pin) {
  requirePin_(pin);
  var o = up_(name), ix = ensureSheet_(getHome_(), Q.SH_INDEX, Q.INDEX_HEAD), last = ix.getLastRow(), cnt = 0;
  if (last >= 2) ix.getRange(2, 6, last - 1, 1).getValues().forEach(function (r) { if (up_(r[0]) === o) cnt++; });
  if (cnt) throw new Error('This company still has ' + cnt + ' bill(s). Delete or move them first.');
  saveRegistry(JSON.stringify(getRegistry().filter(function (c) { return up_(c.name) !== o; })));
  var st = readSettings_();
  Object.keys(st).forEach(function (k) { var m = k.match(/^co_hdr:([^|]*)/i); if (m && up_(m[1]) === o && st[k]) writeSetting_(k, ''); });
  log_('delete-company', '', '', o);
  return true;
}

function deleteProjectEntry(company, project, pin) {
  requirePin_(pin);
  var c = up_(company), p = up_(project), ix = ensureSheet_(getHome_(), Q.SH_INDEX, Q.INDEX_HEAD), last = ix.getLastRow(), cnt = 0;
  if (last >= 2) { var cs = ix.getRange(2, 6, last - 1, 1).getValues(), ps = ix.getRange(2, 8, last - 1, 1).getValues(); for (var i = 0; i < cs.length; i++) if (up_(cs[i][0]) === c && up_(ps[i][0]) === p) cnt++; }
  if (cnt) throw new Error('This project still has ' + cnt + ' bill(s). Delete or move them first.');
  var reg = getRegistry(); reg.forEach(function (x) { if (up_(x.name) === c) x.projects = x.projects.filter(function (q) { return up_(q) !== p; }); });
  saveRegistry(JSON.stringify(reg));
  var st = readSettings_();
  Object.keys(st).forEach(function (k) { if (k.toUpperCase() === ('CO_HDR:' + c + '|' + p) && st[k]) writeSetting_(k, ''); });
  return true;
}

/* never keep two copies of the same bill in Drive */
function trashPrev_(quoteId, folder, fileName) {
  var no = '';
  try {
    var ix = ensureSheet_(getHome_(), Q.SH_INDEX, Q.INDEX_HEAD), row = findRowById_(ix, quoteId);
    if (row) {
      no = String(ix.getRange(row, 2).getValue() || '').toUpperCase();
      var u = String(ix.getRange(row, 14).getValue() || ''), m = u.match(/[-\w]{25,}/);
      if (m) { try { DriveApp.getFileById(m[0]).setTrashed(true); } catch (e) {} }
    }
  } catch (e) {}
  if (!no) { var mm = String(fileName || '').toUpperCase().match(/[A-Z0-9]+\d{6}-\d+/); if (mm) no = mm[0]; }
  if (folder && no) {
    var it = folder.getFiles();
    while (it.hasNext()) { var f = it.next(); if (f.getName().toUpperCase().indexOf(no) === 0) { try { f.setTrashed(true); } catch (e2) {} } }
  }
}


/* move a bill to another company / project (PIN required) */
function moveQuotation(id, company, project, pin) {
  var co = up_(company), pj = up_(project); if (!co) throw new Error('Company required.');
  return withLock_(function () {
    var ix = ensureSheet_(getHome_(), Q.SH_INDEX, Q.INDEX_HEAD), row = findRowById_(ix, String(id || ''));
    if (!row) throw new Error('Bill not found.');
    if (String(ix.getRange(row, 10).getValue()) !== 'Import') requirePin_(pin);
    ix.getRange(row, 6).setNumberFormat('@').setValue(co);
    ix.getRange(row, 8).setNumberFormat('@').setValue(pj);
    if (String(ix.getRange(row, 10).getValue()) !== 'Import') {
      // a duplicated bill that was not opened yet keeps its "Duplicated" badge and gets "Moved here" too
      var mk0 = ix.getRange(row, 20, 1, 3).getValues()[0];
      var nm = (String(mk0[0] || '').indexOf('dup') >= 0 && !mk0[2]) ? 'dup,moved' : 'moved';
      ix.getRange(row, 20, 1, 3).setNumberFormat('@').setValues([[nm, new Date().toISOString(), '']]);
    }
    bumpChange_(String(id || ''), '');
    return true;
  });
}


/* ---------------------------------------------------------------------
 *  FILE MANY IMPORTED FILES AT ONCE under a company / project
 *  (each gets the next free serial number, status becomes 'Saved')
 * ------------------------------------------------------------------- */
function fileImports(idsJson, company, project) {
  var ids = JSON.parse(String(idsJson || '[]')), co = up_(company), pj = up_(project);
  if (!co) throw new Error('Company required.');
  if (!Array.isArray(ids) || !ids.length) return [];
  return withLock_(function () {
    var cfg = readConfig_(), ix = ensureSheet_(getHome_(), Q.SH_INDEX, Q.INDEX_HEAD), last = ix.getLastRow(), out = [];
    if (last < 2) return out;
    var rows = ix.getRange(2, 1, last - 1, Q.INDEX_HEAD.length).getValues(), pos = {}, used = {};
    rows.forEach(function (r, i) { pos[String(r[0])] = i; var m = String(r[1]).match(NO_RE_); if (m) used[Number(m[3]) || 0] = true; });
    var k = Math.max(1, Number((cfg.numbering || {}).startSeq || 1)), year = new Date().getFullYear(), now = new Date().toISOString(), touched = 0;
    ids.forEach(function (id) {
      var i = pos[String(id)]; if (i == null) return;
      var r = rows[i]; if (String(r[9]) !== 'Import') return;
      if (!String(r[1])) { while (used[k]) k++; used[k] = true; r[1] = numberParts_(cfg, year, k); r[2] = year; r[3] = k; }
      r[5] = co; r[7] = pj; r[9] = 'Saved'; r[12] = now; touched++; out.push({ id: String(id), no: String(r[1]) });
      log_('file-import', r[1], 'user', co + (pj ? ' / ' + pj : ''));
    });
    if (!touched) return out;
    bumpChange_('all', '');
    var col = function (c) { return rows.map(function (r) { return [r[c]]; }); };
    ix.getRange(2, 2, rows.length, 3).setNumberFormat('@').setValues(rows.map(function (r) { return [r[1], r[2], r[3]]; }));
    ix.getRange(2, 6, rows.length, 1).setNumberFormat('@').setValues(col(5));
    ix.getRange(2, 8, rows.length, 1).setNumberFormat('@').setValues(col(7));
    ix.getRange(2, 10, rows.length, 1).setNumberFormat('@').setValues(col(9));
    ix.getRange(2, 13, rows.length, 1).setNumberFormat('@').setValues(col(12));
    return out;
  });
}


/* ---------------------------------------------------------------------
 *  ONLINE USERS + LIVE CHANGE FEED
 *  Best-effort (CacheService). It only carries "something changed" signals;
 *  the bill data itself is always read from / written to the Sheet.
 * ------------------------------------------------------------------- */
function bumpChange_(id, by) {
  try {
    var c = CacheService.getScriptCache(), arr = [];
    try { arr = JSON.parse(c.get('chg') || '[]'); } catch (e) {}
    arr.push({ t: Date.now(), id: String(id), by: String(by || '') });
    if (arr.length > 150) arr = arr.slice(-150);
    c.put('chg', JSON.stringify(arr), 21600);
  } catch (e) {}
}

function presencePing(cid, label, qid, since) {
  var c = CacheService.getScriptCache(), now = Date.now(), map = {}, me = String(cid || '').slice(0, 40);
  try { map = JSON.parse(c.get('pres') || '{}'); } catch (e) {}
  map[me] = { t: now, l: String(label || '').slice(0, 20), q: String(qid || '').slice(0, 60) };
  var out = { online: 0, editing: [], changes: [], now: now };
  Object.keys(map).forEach(function (k) {
    if (now - map[k].t > 45000) { delete map[k]; return; }
    out.online++;
    if (k !== me && map[k].q) out.editing.push({ q: map[k].q, l: map[k].l });
  });
  try { c.put('pres', JSON.stringify(map), 120); } catch (e) {}
  var arr = []; try { arr = JSON.parse(c.get('chg') || '[]'); } catch (e) {}
  var s = Number(since) || 0;
  if (s) out.changes = arr.filter(function (x) { return x.t > s && x.by !== me; });
  return out;
}


/* ---------------------------------------------------------------------
 *  LETTERHEAD PADS (several; the first is the default)
 * ------------------------------------------------------------------- */
function getPadFromList_(cfg, i) {
  var p = (cfg.pads || [])[i]; if (!p) return '';
  var key = 'padl_' + sha256Hex_(p.src).slice(0, 16), hit = cacheGetBig_(key); if (hit) return hit;
  var d = getImageDataUrl(p.src); if (d) cachePutBig_(key, d, 1800);
  return d;
}
function getPadData(i) {
  var cfg = readConfig_(); i = Number(i) || 0;
  if (cfg.pads && cfg.pads.length) return getPadFromList_(cfg, i);
  return i === 0 ? getPadDataUrl() : '';
}

/* ---------------------------------------------------------------------
 *  MOVE MANY QUOTATIONS TO ANOTHER COMPANY / PROJECT (one pass)
 * ------------------------------------------------------------------- */
function moveQuotations(idsJson, company, project, pin) {
  var ids = JSON.parse(String(idsJson || '[]')), co = up_(company), pj = up_(project);
  if (!co) throw new Error('Company required.');
  if (!Array.isArray(ids) || !ids.length) return 0;
  var role = pinRole_(pin);
  return withLock_(function () {
    var ix = ensureSheet_(getHome_(), Q.SH_INDEX, Q.INDEX_HEAD), last = ix.getLastRow();
    if (last < 2) return 0;
    var rows = ix.getRange(2, 1, last - 1, Q.INDEX_HEAD.length).getValues(), want = {}, n = 0, bad = 0;
    ids.forEach(function (id) { want[String(id)] = 1; });
    rows.forEach(function (r) {
      if (!want[String(r[0])]) return;
      var st = String(r[9]);
      if (st !== 'Import' && !role) { bad++; return; }
      if (st === 'Final' && role !== 'admin') { bad++; return; }
      r[5] = co; r[7] = pj; n++;
      if (st !== 'Import') { r[19] = (String(r[19] || '').indexOf('dup') >= 0 && !r[21]) ? 'dup,moved' : 'moved'; r[20] = new Date().toISOString(); r[21] = ''; }
    });
    if (bad) throw new Error(bad + ' bill(s) need the correct PIN (finalized ones need the Admin PIN). Nothing was moved.');
    if (!n) return 0;
    ix.getRange(2, 6, rows.length, 1).setNumberFormat('@').setValues(rows.map(function (r) { return [r[5]]; }));
    ix.getRange(2, 8, rows.length, 1).setNumberFormat('@').setValues(rows.map(function (r) { return [r[7]]; }));
    ix.getRange(2, 20, rows.length, 3).setNumberFormat('@').setValues(rows.map(function (r) { return [r[19] || '', r[20] || '', r[21] || '']; }));
    bumpChange_('all', '');
    log_('move-many', '', role || 'user', n + ' -> ' + co + (pj ? ' / ' + pj : ''));
    return n;
  });
}


/* ---------------------------------------------------------------------
 *  USER PREFERENCES (language, theme, letterhead switch, views ...)
 *  Saved in the database (Q_Settings) so nothing depends on the browser.
 * ------------------------------------------------------------------- */
function getPrefs() {
  return String(readSettings_().prefs_v1 || '');
}
function savePrefs(json) {
  var o;
  try { o = JSON.parse(String(json || '{}')); } catch (e) { throw new Error('Bad preferences data'); }
  var s = JSON.stringify(o);
  if (s.length > 30000) throw new Error('Preferences too large');
  writeSetting_('prefs_v1', s);
  return true;
}


/* ---------------------------------------------------------------------
 *  SEARCH INDEX (attention name, terms flag, full body text) + MARKS
 * ------------------------------------------------------------------- */
function stripTags_(h, keepLines) {
  var t = String(h == null ? '' : h).replace(/<\s*(br|\/p|\/div|\/li|\/tr)\s*\/?>/gi, keepLines ? '\n' : ' ').replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  return keepLines ? t.replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim() : t.replace(/\s+/g, ' ').trim();
}
function collectStrings_(o, out, depth) {
  if (o == null || depth > 6) return;
  if (typeof o === 'string') {
    if (o.length > 2 && o.length < 2000 && o.indexOf('data:') !== 0 && !/^[a-z]{1,2}_[a-z0-9]{4,}$/i.test(o)) out.push(stripTags_(o));
  } else if (Array.isArray(o)) o.forEach(function (x) { collectStrings_(x, out, depth + 1); });
  else if (typeof o === 'object') Object.keys(o).forEach(function (k) { if (k !== 'id' && k !== 'src' && k !== 'url' && k !== 'type' && k !== 'style' && k !== 'lang' && k !== 'sys') collectStrings_(o[k], out, depth + 1); });
}
function docDigest_(doc) {
  var parts = [], lines = [], att = '', attn = '', terms = 0;
  (doc.els || []).forEach(function (e) {
    if (!e) return;
    if (e.type === 'header') {
      (e.fields || []).forEach(function (f) {
        var v = String(f.v == null ? '' : f.v).trim();
        if (f.k === 'att' && v && !/^(mr|mrs|ms)\.?\s*\.{0,3}$/i.test(v)) att = att || v;
        if (f.k === 'attn' && v) attn = attn || v;
        parts.push(((f.l || '') + ' ' + v).trim());
      });
    } else if (e.type === 'text') {
      parts.push(stripTags_(e.html)); stripTags_(e.html, true).split('\n').forEach(function (l) { lines.push(l); });
    } else if (e.type === 'table' && e.t && e.t.rows) {
      e.t.rows.forEach(function (r) { (r.cells || []).forEach(function (c) { if (c && c.t != null && String(c.t).charAt(0) !== '=') parts.push(stripTags_(c.t)); }); });
    } else {
      if (e.type === 'terms' && (e.items || []).length) terms = 1;
      collectStrings_(e, parts, 0);
    }
  });
  // text the user tagged (select text → 🏷 Tag → Attention / Subject / …)
  var tagRe = /<span[^>]*data-tag="(\w+)"[^>]*>([\s\S]*?)<\/span>/g, tm, tagHtml = '';
  (doc.els || []).forEach(function (e) { if (!e) return; if (e.type === 'text') tagHtml += ' ' + (e.html || ''); if (e.type === 'header') (e.fields || []).forEach(function (f) { if (f.h) tagHtml += ' ' + f.h; }); });
  while ((tm = tagRe.exec(tagHtml))) { if (tm[1] === 'attn') { var tv = stripTags_(tm[2]); if (tv) { att = tv; break; } } }
  if (!att) {
    for (var i = 0; i < lines.length; i++) {
      var m = lines[i].match(/\b(?:attention|attn)\s*[:：.\-–]*\s*(.+)/i);
      if (m && m[1].trim()) { att = m[1].trim(); break; }
    }
  }
  var body = parts.filter(function (x) { return x; }).join(' ').replace(/\s+/g, ' ');
  if (!terms && /terms\s*(&|and)\s*conditions|terms\s*&\s*acceptance|শর্ত/i.test(body)) terms = 1;
  return { attn: (att || attn).slice(0, 120), terms: terms ? '1' : '0', body: body.slice(0, 30000) };
}

/** Full-text search: every word must appear somewhere in the bill. Returns matching ids. */
function searchQuotations(q) {
  var toks = String(q || '').toLowerCase().split(/\s+/).filter(function (x) { return x; });
  if (!toks.length) return [];
  var ix = ensureSheet_(getHome_(), Q.SH_INDEX, Q.INDEX_HEAD), last = ix.getLastRow();
  if (last < 2) return [];
  var vals = ix.getRange(2, 1, last - 1, Q.INDEX_HEAD.length).getValues(), out = [];
  vals.forEach(function (r) {
    if (r[0] === '') return;
    var hay = [r[1], r[5], r[7], r[15], r[16], r[18]].join(' ').toLowerCase();
    for (var i = 0; i < toks.length; i++) if (hay.indexOf(toks[i]) < 0) return;
    out.push(String(r[0]));
  });
  return out.slice(0, 1000);
}

/** One-time (and repeatable) fill of Attn / Terms / Body for bills saved before this feature existed. */
function rebuildSearchIndex() {
  return withLock_(function () {
    var ss = getHome_(), ix = ensureSheet_(ss, Q.SH_INDEX, Q.INDEX_HEAD), dt = ensureSheet_(ss, Q.SH_DATA, Q.DATA_HEAD);
    var last = ix.getLastRow(); if (last < 2) return 0;
    var rows = ix.getRange(2, 1, last - 1, Q.INDEX_HEAD.length).getValues(), need = {}, cnt = 0;
    rows.forEach(function (r) { if (r[0] !== '' && (r[17] === '' || r[17] == null)) { need[String(r[0])] = 1; cnt++; } });
    if (!cnt) return 0;
    var dl = dt.getLastRow(), parts = {};
    if (dl >= 2) dt.getRange(2, 1, dl - 1, 3).getValues().forEach(function (d) { var k = String(d[0]); if (need[k]) (parts[k] = parts[k] || []).push({ n: Number(d[1]) || 0, d: String(d[2] || '') }); });
    var done = 0, vals = rows.map(function (r) {
      var k = String(r[0]);
      if (need[k] && parts[k]) {
        try {
          var json = parts[k].sort(function (a, b) { return a.n - b.n; }).map(function (p) { return p.d; }).join('');
          var dg = docDigest_(JSON.parse(json)); done++;
          return [dg.attn, dg.terms, dg.body];
        } catch (e) {}
      }
      return [r[16] || '', r[17] == null ? '' : r[17], r[18] || ''];
    });
    ix.getRange(2, 17, rows.length, 3).setNumberFormat('@').setValues(vals);
    SpreadsheetApp.flush();
    return done;
  });
}

/** The person has looked at a duplicated / moved bill: its highlight fades 5 minutes from now. */
function markSeen(id) {
  var ix = ensureSheet_(getHome_(), Q.SH_INDEX, Q.INDEX_HEAD), row = findRowById_(ix, String(id || ''));
  if (!row) return false;
  var v = ix.getRange(row, 20, 1, 3).getValues()[0];
  if (v[0] && !v[2]) ix.getRange(row, 22).setNumberFormat('@').setValue(new Date().toISOString());
  return true;
}


/* =====================================================================
 *  BACKUP / RESTORE / RESET  (JSON files in a Google Drive folder)
 *   - Manual backup: lifetime (everything) / year / month / day
 *   - Auto backup (time trigger): always lifetime, keeps only the last N days
 *   - Restore: from a Drive backup file or an uploaded JSON file
 *   - Reset: allowed only after a lifetime backup newer than the last change
 *  NOTE: after pasting this file, run any function once from the editor
 *        (e.g. setupDatabase) and allow the new permissions (triggers).
 * ===================================================================== */
var BK = { KEY: 'backup_cfg', MAN: 'SCSB-BACKUP-', AUTO: 'SCSB-AUTO-', FN: 'runBillAutoBackup', SKIP_SET: { admin_pin_hash: 1, user_pin_hash: 1, backup_cfg: 1 } };
var BK_EVERY = { '1m': 1 / 60, '5m': 5 / 60, '10m': 10 / 60, '15m': 15 / 60, '30m': 0.5, '1h': 1, '2h': 2, '4h': 4, '6h': 6, '8h': 8, '12h': 12, '24h': 24, '7d': 168 };

function bkCfg_() {
  var c = {}; try { c = JSON.parse(String(readSettings_()[BK.KEY] || '{}')) || {}; } catch (e) { c = {}; }
  return {
    folderId: String(c.folderId || ''), folderName: String(c.folderName || ''), auto: !!c.auto, every: BK_EVERY[c.every] ? c.every : '24h',
    keepOn: c.keepOn !== false, keepDays: Math.max(1, Number(c.keepDays) || 7),
    lastAuto: String(c.lastAuto || ''), lastAutoFile: String(c.lastAutoFile || ''), lastLifetime: String(c.lastLifetime || ''), lastErr: String(c.lastErr || ''), lastDeleted: Number(c.lastDeleted) || 0
  };
}
function bkSaveCfg_(c) { writeSetting_(BK.KEY, JSON.stringify(c)); }
function bkStamp_() { return Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Dhaka', 'yyyy-MM-dd_HH-mm-ss'); }
function bkFolder_(id) {
  if (!id) throw new Error('Set the Google Drive backup folder link first.');
  try { return DriveApp.getFolderById(id); } catch (e) { throw new Error('Cannot open the backup folder. Check the link and that this account can access it.'); }
}
function bkRows_(sh, cols) { var last = sh.getLastRow(); if (last < 2) return []; return sh.getRange(2, 1, last - 1, cols).getValues().filter(function (r) { return r[0] !== ''; }); }
function bkLastChange_() {
  var ss = getHome_(), ix = ensureSheet_(ss, Q.SH_INDEX, Q.INDEX_HEAD), best = '';
  bkRows_(ix, Q.INDEX_HEAD.length).forEach(function (r) { [r[11], r[12], r[20]].forEach(function (v) { v = v instanceof Date ? v.toISOString() : String(v || ''); if (v > best) best = v; }); });
  var st = ensureSheet_(ss, Q.SH_SET, Q.SET_HEAD);
  bkRows_(st, 3).forEach(function (r) { if (r[0] === BK.KEY || r[0] === 'prefs_v1') return; var v = r[2] instanceof Date ? r[2].toISOString() : String(r[2] || ''); if (v > best) best = v; });
  return best;
}
function bkResetReady_(c, lastChange) { return !!c.lastLifetime && (!lastChange || c.lastLifetime >= lastChange); }
function bkHasTrigger_() { try { return ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === BK.FN; }); } catch (e) { return false; } }
function bkSetTrigger_(c) {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === BK.FN) ScriptApp.deleteTrigger(t); });
  if (!c.auto) return;
  var h = BK_EVERY[c.every] || 24, b = ScriptApp.newTrigger(BK.FN).timeBased();
  if (/m$/.test(c.every)) { b.everyMinutes(parseInt(c.every, 10)).create(); return; }
  if (h >= 168) b.everyWeeks(1).onWeekDay(ScriptApp.WeekDay.FRIDAY).atHour(2).create();
  else if (h >= 24) b.everyDays(1).atHour(2).create();
  else b.everyHours(h).create();
}
function bkList_(folderId) {
  if (!folderId) return [];
  var out = [], it;
  try { it = DriveApp.getFolderById(folderId).getFiles(); } catch (e) { return []; }
  while (it.hasNext() && out.length < 400) {
    var f = it.next(), n = f.getName();
    if (n.indexOf(BK.MAN) !== 0 && n.indexOf(BK.AUTO) !== 0) continue;
    out.push({ id: f.getId(), name: n, size: f.getSize(), date: f.getDateCreated().toISOString(), url: f.getUrl(), auto: n.indexOf(BK.AUTO) === 0 });
  }
  out.sort(function (a, b) { return a.date < b.date ? 1 : -1; });
  return out.slice(0, 120);
}
function bkPeriods_() {
  var ix = ensureSheet_(getHome_(), Q.SH_INDEX, Q.INDEX_HEAD), ys = {}, ms = {};
  bkRows_(ix, 12).forEach(function (r) { var d = bkDateOf_(r); if (d.length >= 7) { ys[d.slice(0, 4)] = (ys[d.slice(0, 4)] || 0) + 1; ms[d.slice(0, 7)] = (ms[d.slice(0, 7)] || 0) + 1; } });
  return { years: ys, months: ms };
}
function bkDateOf_(r) {
  var d = r[4] instanceof Date ? Utilities.formatDate(r[4], Session.getScriptTimeZone() || 'Asia/Dhaka', 'yyyy-MM-dd') : String(r[4] || '').slice(0, 10);
  if (!/^\d{4}-\d{2}/.test(d)) d = (r[11] instanceof Date ? r[11].toISOString() : String(r[11] || '')).slice(0, 10);
  return d;
}

/** what the Admin > Backup card shows */
function getBackupInfo(pin) {
  requireAdmin_(pin);
  var c = bkCfg_(), lc = bkLastChange_(), ix = ensureSheet_(getHome_(), Q.SH_INDEX, Q.INDEX_HEAD);
  c.files = bkList_(c.folderId); c.lastChange = lc; c.resetReady = bkResetReady_(c, lc); c.trigger = bkHasTrigger_();
  c.periods = bkPeriods_(); c.total = Math.max(0, ix.getLastRow() - 1); c.tz = Session.getScriptTimeZone();
  return c;
}

/** save folder / auto-backup / keep-days settings (and the time trigger) */
function saveBackupSettings(pin, json) {
  requireAdmin_(pin);
  var o = JSON.parse(String(json || '{}')), c = bkCfg_();
  if (o.folder != null) {
    var id = extractFolderId_(o.folder);
    if (String(o.folder).trim() && !id) throw new Error('This is not a Google Drive folder link.');
    c.folderId = id; c.folderName = id ? bkFolder_(id).getName() : '';
  }
  if (o.auto != null) c.auto = !!o.auto;
  if (o.every && BK_EVERY[o.every]) c.every = o.every;
  if (o.keepOn != null) c.keepOn = !!o.keepOn;
  if (o.keepDays != null) c.keepDays = Math.max(1, Math.min(3650, Number(o.keepDays) || 7));
  if (c.auto && !c.folderId) throw new Error('Set the Google Drive backup folder first.');
  bkSaveCfg_(c);
  bkSetTrigger_(c);
  log_('backup-settings', '', 'admin', (c.auto ? 'auto ' + c.every : 'auto off') + (c.keepOn ? ', keep ' + c.keepDays + 'd' : ', keep all'));
  return getBackupInfo(pin);
}

/** collect the data: kind = lifetime | year | month | day, period = 'YYYY' | 'YYYY-MM' | 'YYYY-MM-DD' */
function bkCollect_(kind, period) {
  var ss = getHome_(), ix = ensureSheet_(ss, Q.SH_INDEX, Q.INDEX_HEAD), dt = ensureSheet_(ss, Q.SH_DATA, Q.DATA_HEAD);
  kind = /^(year|month|day)$/.test(kind) ? kind : 'lifetime'; period = String(period || '');
  if (kind !== 'lifetime') {
    var re = { year: /^\d{4}$/, month: /^\d{4}-\d{2}$/, day: /^\d{4}-\d{2}-\d{2}$/ }[kind];
    if (!re.test(period)) throw new Error('Choose the ' + kind + ' to back up.');
  }
  var rows = bkRows_(ix, Q.INDEX_HEAD.length);
  if (kind !== 'lifetime') rows = rows.filter(function (r) { return bkDateOf_(r).indexOf(period) === 0; });
  var keep = {}; rows.forEach(function (r) { keep[String(r[0])] = 1; });
  var drows = bkRows_(dt, Q.DATA_HEAD.length).filter(function (r) { return keep[String(r[0])]; });
  var out = { app: 'SCS Project Bill', format: 'scsb-backup', v: 1, kind: kind, period: period, createdAt: new Date().toISOString(), count: rows.length, sheets: {} };
  out.sheets[Q.SH_INDEX] = { head: Q.INDEX_HEAD, rows: rows };
  out.sheets[Q.SH_DATA] = { head: Q.DATA_HEAD, rows: drows };
  if (kind === 'lifetime') {
    out.sheets[Q.SH_SET] = { head: Q.SET_HEAD, rows: bkRows_(ensureSheet_(ss, Q.SH_SET, Q.SET_HEAD), 3).filter(function (r) { return !BK.SKIP_SET[String(r[0])]; }) };
    out.sheets[Q.SH_LOG] = { head: Q.LOG_HEAD, rows: bkRows_(ensureSheet_(ss, Q.SH_LOG, Q.LOG_HEAD), Q.LOG_HEAD.length) };
  }
  return out;
}

/** manual backup. dest = drive | download | both. Returns the file info and/or the JSON text */
function manualBackup(pin, kind, period, dest) {
  requireAdmin_(pin);
  var c = bkCfg_(), obj = bkCollect_(kind, period), txt = JSON.stringify(obj), res = { count: obj.count, kind: obj.kind, period: obj.period };
  var name = BK.MAN + obj.kind + (obj.period ? '-' + obj.period : '') + '-' + bkStamp_() + '.json';
  res.name = name;
  if (dest === 'drive' || dest === 'both') {
    var f = bkFolder_(c.folderId).createFile(name, txt, 'application/json');
    res.file = { id: f.getId(), name: name, url: f.getUrl(), size: f.getSize() };
  }
  if (dest === 'download' || dest === 'both') res.json = txt;
  if (obj.kind === 'lifetime') { c = bkCfg_(); c.lastLifetime = obj.createdAt; bkSaveCfg_(c); }
  log_('backup', '', 'admin', obj.kind + (obj.period ? ' ' + obj.period : '') + ' · ' + obj.count + ' bill(s) · ' + dest);
  return res;
}

/** time trigger handler: lifetime backup + delete auto backups older than keepDays */
function runAutoBackup() {
  var c = bkCfg_();
  if (!c.auto || !c.folderId) return 'auto backup is off';
  try {
    var folder = bkFolder_(c.folderId), obj = bkCollect_('lifetime', ''), name = BK.AUTO + 'lifetime-' + bkStamp_() + '.json';
    folder.createFile(name, JSON.stringify(obj), 'application/json');
    var del = 0;
    if (c.keepOn) {
      var limit = Date.now() - c.keepDays * 86400000, it = folder.getFiles();
      while (it.hasNext()) { var f = it.next(); if (f.getName().indexOf(BK.AUTO) === 0 && f.getDateCreated().getTime() < limit) { f.setTrashed(true); del++; } }
    }
    c = bkCfg_(); c.lastAuto = obj.createdAt; c.lastAutoFile = name; c.lastLifetime = obj.createdAt; c.lastErr = ''; c.lastDeleted = del; bkSaveCfg_(c);
    return name;
  } catch (e) {
    c = bkCfg_(); c.lastErr = new Date().toISOString() + ' ' + (e.message || e); bkSaveCfg_(c);
    throw e;
  }
}
function runAutoBackupNow(pin) {
  requireAdmin_(pin);
  var c = bkCfg_(); if (!c.folderId) throw new Error('Set the Google Drive backup folder first.');
  var was = c.auto; if (!was) { c.auto = true; bkSaveCfg_(c); }
  try { runAutoBackup(); } finally { if (!was) { var c2 = bkCfg_(); c2.auto = false; bkSaveCfg_(c2); } }
  return getBackupInfo(pin);
}

/** read a backup: src = { fileId } or { json } */
function bkRead_(src) {
  src = src || {};
  var txt = src.fileId ? DriveApp.getFileById(String(src.fileId)).getBlob().getDataAsString('UTF-8') : String(src.json || '');
  var o; try { o = JSON.parse(txt); } catch (e) { throw new Error('This is not a valid backup file (JSON).'); }
  if (!o || o.format !== 'scsb-backup' || !o.sheets || !o.sheets[Q.SH_INDEX]) throw new Error('This file is not an SCS Bill backup.');
  return o;
}
function bkWriteAll_(sh, head, rows, textCols) {
  var last = sh.getLastRow();
  if (last >= 2) { sh.getRange(2, 1, last - 1, Math.max(head.length, sh.getLastColumn())).clearContent(); if (last > 2) sh.deleteRows(3, last - 2); }
  if (!rows.length) return;
  var w = head.length, data = rows.map(function (r) { var o = []; for (var i = 0; i < w; i++) o.push(r[i] == null ? '' : r[i]); return o; });
  var CH = 2000;
  for (var p = 0; p < data.length; p += CH) {
    var part = data.slice(p, p + CH), rg = sh.getRange(2 + p, 1, part.length, w);
    if (textCols) rg.setNumberFormat('@');
    rg.setValues(part);
  }
}

/**
 * restore. mode = replace (only for lifetime backups: everything becomes exactly the backup)
 *               | merge   (bills in the backup are added / overwritten, others stay)
 * opts = { settings: true }  also restore companies list, templates, headers, app settings (never PINs)
 */
function restoreBackup(pin, src, mode, optsJson) {
  requireAdmin_(pin);
  var o = bkRead_(src), opts = {}; try { opts = JSON.parse(String(optsJson || '{}')) || {}; } catch (e) {}
  if (mode === 'replace' && o.kind !== 'lifetime') throw new Error('Only a lifetime backup can replace everything. Use “Merge” for a year / month / day backup.');
  var c = bkCfg_(), safety = '';
  if (c.folderId) {   // safety copy of the current data before overwriting
    try { var cur = bkCollect_('lifetime', ''); bkFolder_(c.folderId).createFile(BK.MAN + 'before-restore-' + bkStamp_() + '.json', JSON.stringify(cur), 'application/json'); safety = 'yes'; } catch (e) {}
  }
  return withLock_(function () {
    var ss = getHome_(), ix = ensureSheet_(ss, Q.SH_INDEX, Q.INDEX_HEAD), dt = ensureSheet_(ss, Q.SH_DATA, Q.DATA_HEAD);
    var bIx = (o.sheets[Q.SH_INDEX].rows || []), bDt = ((o.sheets[Q.SH_DATA] || {}).rows || []), n = bIx.length;
    if (mode === 'replace') {
      bkWriteAll_(ix, Q.INDEX_HEAD, bIx, true);
      bkWriteAll_(dt, Q.DATA_HEAD, bDt, true);
    } else {
      var ids = {}; bIx.forEach(function (r) { ids[String(r[0])] = 1; });
      var curIx = bkRows_(ix, Q.INDEX_HEAD.length).filter(function (r) { return !ids[String(r[0])]; });
      var curDt = bkRows_(dt, Q.DATA_HEAD.length).filter(function (r) { return !ids[String(r[0])]; });
      bkWriteAll_(ix, Q.INDEX_HEAD, curIx.concat(bIx), true);
      bkWriteAll_(dt, Q.DATA_HEAD, curDt.concat(bDt), true);
    }
    if (ix.getLastRow() >= 2) ix.getRange(2, 9, ix.getLastRow() - 1, 1).setNumberFormat('0.00');
    if (opts.settings && o.sheets[Q.SH_SET]) {
      var st = ensureSheet_(ss, Q.SH_SET, Q.SET_HEAD), map = {}, order = [];
      bkRows_(st, 3).forEach(function (r) { var k = String(r[0]); if (!map[k]) order.push(k); map[k] = r; });
      (o.sheets[Q.SH_SET].rows || []).forEach(function (r) { var k = String(r[0]); if (BK.SKIP_SET[k]) return; if (!map[k]) order.push(k); map[k] = [k, r[1], r[2] || new Date().toISOString()]; });
      bkWriteAll_(st, Q.SET_HEAD, order.map(function (k) { return map[k]; }), true);
    }
    cacheDelBig_('settings_v2');
    try { CacheService.getScriptCache().remove('dbok'); } catch (e) {}
    SpreadsheetApp.flush();
    bumpChange_('all', '');
    log_('restore', '', 'admin', mode + ' · ' + o.kind + (o.period ? ' ' + o.period : '') + ' · ' + n + ' bill(s)' + (opts.settings ? ' + settings' : '') + (safety ? ' · safety copy saved' : ''));
    return { ok: true, count: n, mode: mode, safety: !!safety };
  });
}

/** reset: deletes every bill (and optionally companies / templates / headers). Needs a fresh lifetime backup. */
function resetAllData(pin, confirmText, optsJson) {
  requireAdmin_(pin);
  if (String(confirmText || '').trim().toUpperCase() !== 'RESET') throw new Error('Type RESET to confirm.');
  var c = bkCfg_(), lc = bkLastChange_();
  if (!bkResetReady_(c, lc)) throw new Error('Take a LIFETIME backup first (the data changed after the last lifetime backup).');
  var opts = {}; try { opts = JSON.parse(String(optsJson || '{}')) || {}; } catch (e) {}
  return withLock_(function () {
    var ss = getHome_(), ix = ensureSheet_(ss, Q.SH_INDEX, Q.INDEX_HEAD), dt = ensureSheet_(ss, Q.SH_DATA, Q.DATA_HEAD), n = Math.max(0, ix.getLastRow() - 1);
    bkWriteAll_(ix, Q.INDEX_HEAD, [], true);
    bkWriteAll_(dt, Q.DATA_HEAD, [], true);
    if (opts.settings) {
      var st = ensureSheet_(ss, Q.SH_SET, Q.SET_HEAD), keepK = { app_config: 1, admin_pin_hash: 1, user_pin_hash: 1, backup_cfg: 1, prefs_v1: 1 };
      bkWriteAll_(st, Q.SET_HEAD, bkRows_(st, 3).filter(function (r) { return keepK[String(r[0])]; }), true);
    }
    if (opts.log) bkWriteAll_(ensureSheet_(ss, Q.SH_LOG, Q.LOG_HEAD), Q.LOG_HEAD, [], false);
    cacheDelBig_('settings_v2');
    SpreadsheetApp.flush();
    bumpChange_('all', '');
    log_('reset', '', 'admin', n + ' bill(s) deleted' + (opts.settings ? ' + companies/templates' : '') + (opts.log ? ' + log' : ''));
    return { ok: true, deleted: n };
  });
}


/* =====================================================================
 *  v6.3: smart search (with snippets), app link, share links
 * ===================================================================== */
/** search company, project, number, subject, attention and the whole bill body. Returns [{id, snip}] */
function searchAll(q) {
  var toks = String(q || '').toLowerCase().split(/\s+/).filter(function (x) { return x; });
  if (!toks.length) return [];
  var ix = ensureSheet_(getHome_(), Q.SH_INDEX, Q.INDEX_HEAD), last = ix.getLastRow();
  if (last < 2) return [];
  var out = [];
  ix.getRange(2, 1, last - 1, Q.INDEX_HEAD.length).getValues().forEach(function (r) {
    if (r[0] === '') return;
    var body = String(r[18] || ''), hay = [r[1], r[5], r[7], r[15], r[16], body].join(' ').toLowerCase();
    for (var i = 0; i < toks.length; i++) if (hay.indexOf(toks[i]) < 0) return;
    var low = body.toLowerCase(), p = low.indexOf(toks[0]), snip = '';
    if (p >= 0) snip = (p > 50 ? '…' : '') + body.slice(Math.max(0, p - 50), p + toks[0].length + 70) + (p + 70 < body.length ? '…' : '');
    out.push({ id: String(r[0]), snip: snip });
  });
  return out.slice(0, 500);
}

/** the web-app address (to open another bill in a new browser tab) */
function getAppUrl() { try { return ScriptApp.getService().getUrl(); } catch (e) { return ''; } }

/** save a PDF in "SCS Bill - Shared" (anyone with the link can view) and return its links */
function sharePdf(fileName, base64, pin) {
  if (!pinRole_(pin)) throw new Error('PIN required.');
  var name = 'SCS Bill - Shared', it = DriveApp.getRootFolder().getFoldersByName(name);
  var folder = it.hasNext() ? it.next() : DriveApp.getRootFolder().createFolder(name);
  var blob = Utilities.newBlob(Utilities.base64Decode(String(base64 || '')), 'application/pdf', String(fileName || 'Bill.pdf'));
  var old = folder.getFilesByName(blob.getName()); while (old.hasNext()) { try { old.next().setTrashed(true); } catch (e) {} }
  var f = folder.createFile(blob);
  try { f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) {}
  log_('share', '', 'user', f.getName());
  return { id: f.getId(), url: f.getUrl(), dl: 'https://drive.google.com/uc?export=download&id=' + f.getId(), name: f.getName() };
}

/**
 * RUN THIS ONCE FROM THE APPS SCRIPT EDITOR (select "authorizeBackup" → Run → Allow).
 * It asks Google for the permissions the auto-backup timer and sharing need
 * (time triggers + Google Drive). After that, deploy a New version.
 */
function authorizeBackup() {
  var n = ScriptApp.getProjectTriggers().length;
  DriveApp.getRootFolder().getName();
  return 'OK — permissions granted. Triggers now: ' + n + '. Now Deploy → Manage deployments → Edit → New version.';
}


/* SCS Projects → open Bills & Measurements in ONE server call (no PIN screen: the SCS sign-in covers it) */
function billBoot(tok) {
  ensureDb_();
  var role = tokenRole_(tok) || 'user', pad = '', prefs = '';
  try { pad = getPadDataUrl(); } catch (e) {}
  try { prefs = getPrefs(); } catch (e) {}
  return { role: role, config: readConfig_(), nextNo: peekNextNo(), list: listQuotations(), registry: getRegistry(), pad: pad, prefs: prefs };
}


  return {
    api: {
      authorizeBackup: authorizeBackup,
      billBoot: billBoot,
      changePin: changePin,
      createFolder: createFolder,
      deleteCompanyEntry: deleteCompanyEntry,
      deleteProjectEntry: deleteProjectEntry,
      deleteQuotation: deleteQuotation,
      fileImports: fileImports,
      getAppUrl: getAppUrl,
      getBackupInfo: getBackupInfo,
      getBootstrap: getBootstrap,
      getCompanyHeader: getCompanyHeader,
      getFolderName: getFolderName,
      getImageDataUrl: getImageDataUrl,
      getPadData: getPadData,
      getPadDataUrl: getPadDataUrl,
      getPrefs: getPrefs,
      getQuotation: getQuotation,
      getRegistry: getRegistry,
      getTableTemplates: getTableTemplates,
      getTemplates: getTemplates,
      listFolders: listFolders,
      listQuotations: listQuotations,
      login: login,
      manualBackup: manualBackup,
      markSeen: markSeen,
      moveQuotation: moveQuotation,
      moveQuotations: moveQuotations,
      peekNextNo: peekNextNo,
      presencePing: presencePing,
      rebuildSearchIndex: rebuildSearchIndex,
      renameCompany: renameCompany,
      renameProject: renameProject,
      resetAllData: resetAllData,
      restoreBackup: restoreBackup,
      runAutoBackup: runAutoBackup,
      runAutoBackupNow: runAutoBackupNow,
      saveBackupSettings: saveBackupSettings,
      saveCompanyHeader: saveCompanyHeader,
      saveConfig: saveConfig,
      savePrefs: savePrefs,
      saveQuotation: saveQuotation,
      saveRegistry: saveRegistry,
      saveTableTemplates: saveTableTemplates,
      saveTemplates: saveTemplates,
      searchAll: searchAll,
      searchFolders: searchFolders,
      searchQuotations: searchQuotations,
      selfTest: selfTest,
      setStatus: setStatus,
      setupDatabase: setupDatabase,
      sharePdf: sharePdf,
      syncAll: syncAll,
      uploadPdfToDrive: uploadPdfToDrive,
      uploadToTree: uploadToTree,
      verifyAdmin: verifyAdmin
    },
    int: {
      readSettings_: readSettings_,
      writeSetting_: writeSetting_,
      readConfig_: readConfig_,
      ensureDb_: ensureDb_,
      getHome_: getHome_,
      cacheDelBig_: cacheDelBig_
    }
  };
})(CacheService);

/* Browser -> server: every Bill / Measurement call comes through here */
function billApi(name, args) {
  var f = SCSBILL.api[String(name)];
  if (typeof f !== 'function') throw new Error('Unknown function: ' + name + ' — update Bill.gs and deploy a New version');
  return f.apply(null, args || []);
}
/* timer for the Bill module's own auto backup (Admin → Backup inside Bill) */
function runBillAutoBackup() { return SCSBILL.api.runAutoBackup(); }
