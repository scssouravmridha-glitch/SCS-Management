/**
 * SCS Labor Attendance (লেবার হাজিরা) - Backend (দ্রুত সংস্করণ)
 * ডিপ্লয়: Sheet > Extensions > Apps Script > এই ফাইল + Index.html পেস্ট করুন
 * Deploy > New deployment > Web app > Execute as: Me, Who has access: Anyone
 *
 * এডমিন পিন: শুরুতে 2026। লেবার তালিকা ট্যাব > "পিন পরিবর্তন" থেকে ৪-৮ সংখ্যার নতুন পিন দিন।
 * নিরাপত্তা: পিন সার্ভারে হ্যাশ থাকে; ৫ বার ভুল দিলে ১০ মিনিট লক; লগইনের পর ৬ ঘণ্টার টোকেন।
 * মুছে ফেলা (হাজিরা/লেনদেন/লেবার) এবং লেবার যোগ-এডিটে প্রতিবার পিন লাগে - সার্ভারেই যাচাই হয়।
 * গতি: পুরো শিট নতুন করে লেখার বদলে শুধু বদলানো সারি লেখা হয়।
 * ভিজিটর লিংক: লেবার তালিকার পাশের "ভিজিটর লিংক" ট্যাব থেকে তৈরি/চালু-বন্ধ/পিন সেট হয়। মূল লিংক শুধু এডমিনের (পিন লাগে)।
 * ডেটা পড়াও সার্ভারে সুরক্ষিত: এডমিন টোকেন অথবা চালু ভিজিটর লিংক (+পিন থাকলে সেশন) ছাড়া getData কিছু দেয় না।
 *
 * নতুন (Report App-এর মতো Admin মেনু): JSON ব্যাকআপ (লাইফটাইম/বছর/মাস), রিস্টোর, পুরো রিসেট (৩ ধাপ সতর্কতা),
 * গুগল ড্রাইভ অটো ব্যাকআপ, লোগো, রবীন্দ্র সংগীত, সিগনেচার ও অ্যাক্টিভিটি লগ। এগুলো ফাইলের শেষে আছে।
 * প্রথমবার: এডিটর থেকে authorizeAll ফাংশন একবার Run করে Drive ও Trigger অনুমতি দিন।
 */
var SH = {
  workers:    { n: 'Workers',      c: ['ID', 'Name', 'Mobile', 'Designation', 'DailyWage', 'PhotoUrl', 'Active', 'SortOrder'], t: [] },
  attendance: { n: 'Attendance',   c: ['Date', 'WorkerID', 'Status', 'Wage', 'Note'], t: [1] },
  tx:         { n: 'Transactions', c: ['ID', 'WorkerID', 'Date', 'Type', 'Amount', 'Note', 'Hours', 'ForMonth'], t: [3, 8] },
  status:     { n: 'WorkerStatus', c: ['WorkerID', 'FromDate', 'Active'], t: [2] }
};
var TX_TYPES = ['ot', 'bonus', 'extra', 'adv', 'fine', 'take'];
var DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
var NOAUTH = { success: false, auth: true, error: 'এডমিন অনুমতি নেই' };

function doGet(e) {
  var v = String((e && e.parameter && e.parameter.v) || '').replace(/[^A-Za-z0-9]/g, '').slice(0, 64);
  try { ensureAutoBackup_(); } catch (err) { /* অনুমতি না থাকলে authorizeAll একবার Run করুন */ }
  var t = HtmlService.createTemplateFromFile('Index');
  t.boot = JSON.stringify({ v: v });
  return t.evaluate()
    .setTitle('SCS Worker Attendance & Wage')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/* ---------- শিট সহায়ক ---------- */
function sheet_(k) {
  var d = SH[k], ss = SpreadsheetApp.getActiveSpreadsheet(), sh = ss.getSheetByName(d.n);
  if (!sh) {
    sh = ss.insertSheet(d.n);
    sh.appendRow(d.c);
    sh.getRange(1, 1, 1, d.c.length).setFontWeight('bold').setBackground('#fce4ec');
    d.t.forEach(function (c) { sh.getRange(1, c, sh.getMaxRows(), 1).setNumberFormat('@'); });
  } else if (sh.getLastColumn() < d.c.length) {
    if (sh.getMaxColumns() < d.c.length) sh.insertColumnsAfter(sh.getMaxColumns(), d.c.length - sh.getMaxColumns());
    sh.getRange(1, 1, 1, d.c.length).setValues([d.c]).setFontWeight('bold').setBackground('#fce4ec');
  }
  return sh;
}
function rows_(k) { var sh = sheet_(k), n = sh.getLastRow(); return n > 1 ? sh.getRange(2, 1, n - 1, SH[k].c.length).getValues() : []; }
function d_(v) { return v instanceof Date ? Utilities.formatDate(v, 'Asia/Dhaka', 'yyyy-MM-dd') : String(v || '').trim(); }
function appendRows_(k, rows) {            // শেষে নতুন সারি যোগ (তারিখ টেক্সট ফরম্যাটে)
  if (!rows.length) return;
  var sh = sheet_(k), s = sh.getLastRow() + 1, w = SH[k].c.length;
  if (s + rows.length - 1 > sh.getMaxRows()) sh.insertRowsAfter(sh.getMaxRows(), s + rows.length - 1 - sh.getMaxRows());
  SH[k].t.forEach(function (c) { sh.getRange(s, c, rows.length, 1).setNumberFormat('@'); });
  sh.getRange(s, 1, rows.length, w).setValues(rows);
}
function write_(k, rows) {                 // পুরো শিট নতুন করে লেখা (শুধু বিরল কাজে)
  var sh = sheet_(k), w = SH[k].c.length, n = sh.getLastRow();
  if (n > 1) sh.getRange(2, 1, n - 1, w).clearContent();
  if (rows.length) {
    SH[k].t.forEach(function (c) { sh.getRange(2, c, rows.length, 1).setNumberFormat('@'); });
    sh.getRange(2, 1, rows.length, w).setValues(rows);
  }
}
function col_(k, c) {                      // একটি কলামের সব মান (সারি ২ থেকে)
  var sh = sheet_(k), n = sh.getLastRow();
  return n > 1 ? sh.getRange(2, c, n - 1, 1).getValues().map(function (r) { return r[0]; }) : [];
}
function lock_(fn) {
  var l = LockService.getScriptLock(); l.waitLock(20000);
  try { return fn(); } catch (e) { return { success: false, error: String(e) }; } finally { l.releaseLock(); }
}

/* ---------- সবার জন্য: শুধু দেখা ---------- */
function getData(ctx) {
  ctx = ctx || {};
  if (!(auth_(ctx.t) || visitorOk_(ctx.v, ctx.s))) {
    var st = vSettings_();
    return { success: false, auth: true, code: (ctx.v && (!st.enabled || ctx.v !== st.token)) ? 'off' : 'auth' };
  }
  var hist = {};
  rows_('status').forEach(function (r) { if (!r[0]) return; (hist[r[0]] = hist[r[0]] || []).push({ d: d_(r[1]), a: String(r[2]) === 'true' }); });
  return {
    success: true,
    workers: rows_('workers').filter(function (r) { return r[0]; }).map(function (r) {
      var h = (hist[r[0]] || []).sort(function (a, b) { return a.d < b.d ? -1 : 1; });
      return { id: String(r[0]), name: String(r[1]), mobile: String(r[2] || ''), designation: String(r[3] || ''), wage: Number(r[4]) || 0,
        photo: String(r[5] || ''), active: String(r[6]) !== 'false', sort: Number(r[7]) || 0, hist: h };
    }),
    attendance: rows_('attendance').filter(function (r) { return r[0]; }).map(function (r) {
      return { date: d_(r[0]), workerId: String(r[1]), status: String(r[2]), wage: Number(r[3]) || 0 };
    }),
    tx: rows_('tx').filter(function (r) { return r[0]; }).map(function (r) {
      return { id: String(r[0]), workerId: String(r[1]), date: d_(r[2]), type: String(r[3]), amount: Number(r[4]) || 0, note: String(r[5] || ''), hours: Number(r[6]) || 0,
        forMonth: (r[7] instanceof Date) ? Utilities.formatDate(r[7], 'Asia/Dhaka', 'yyyy-MM') : String(r[7] || '') };
    })
  };
}

/* ---------- পিন ও লগইন ---------- */
function hash_(p) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, 'scs-labor|' + p)
    .map(function (b) { return ('0' + (b & 255).toString(16)).slice(-2); }).join('');
}
function pinOk_(p) {
  var h = PropertiesService.getScriptProperties().getProperty('ADMIN_PIN_HASH');
  return h ? hash_(p) === h : String(p) === '2026';
}
// ইউজার পিন (অ্যাপে ঢোকার জন্য) — ডিফল্ট 2019
function userPinOk_(p) {
  var h = PropertiesService.getScriptProperties().getProperty('USER_PIN_HASH');
  return h ? hash_(p) === h : String(p) === '2019';
}
// এডমিন পিন সঠিক হলে null, ভুল হলে ব্যর্থতার উত্তর। ভুল পিনে কোনো ব্লক/লক নেই।
function pinGate_(pin) {
  if (pinOk_(String(pin || ''))) return null;
  return { success: false, code: 'pin', error: 'wrong pin' };
}
// লগইন: ইউজার পিন (2019) বা এডমিন পিন (2026) — দুটোতেই ঢোকা যায়
function login(pin) {
  pin = String(pin || '');
  var isAdm = pinOk_(pin), isUser = !isAdm && userPinOk_(pin);
  if (!isAdm && !isUser) return { success: false };
  var t = Utilities.getUuid(); CacheService.getScriptCache().put('tok_' + t, '1', 21600);
  log_('Login', 'App', isAdm ? 'Login with admin PIN' : 'Login with user PIN', '');
  return { success: true, token: t };
}
function auth_(t) { return !!t && CacheService.getScriptCache().get('tok_' + t) === '1'; }
function logout(t) { if (auth_(t)) log_('Logout', 'App', 'Admin logout', ''); CacheService.getScriptCache().remove('tok_' + t); return { success: true }; }

function changePin(t, oldPin, newPin) {
  if (!auth_(t)) return NOAUTH;
  var g = pinGate_(oldPin); if (g) return g;
  if (!/^\d{4,8}$/.test(String(newPin))) return { success: false, error: 'PIN must be 4-8 digits' };
  PropertiesService.getScriptProperties().setProperty('ADMIN_PIN_HASH', hash_(String(newPin)));
  log_('Settings', 'Admin', 'Admin PIN changed', 'New length: ' + String(newPin).length, '****', '**** (নতুন পিন)');
  return { success: true };
}
// ইউজার (লগইন) পিন বদল — এডমিন পিন দিয়ে
function changeUserPin(t, adminPin, newPin) {
  if (!auth_(t)) return NOAUTH;
  var g = pinGate_(adminPin); if (g) return g;
  if (!/^\d{4,8}$/.test(String(newPin))) return { success: false, error: 'PIN must be 4-8 digits' };
  PropertiesService.getScriptProperties().setProperty('USER_PIN_HASH', hash_(String(newPin)));
  log_('Settings', 'Admin', 'User (login) PIN changed', 'New length: ' + String(newPin).length, '****', '**** (নতুন ইউজার পিন)');
  return { success: true };
}

/* ---------- শুধু এডমিন ---------- */
// entries: [{date, workerId, status:'P'|'H'|'A'|'' (ফাঁকা = মুছুন, পিন লাগে)}]
function saveAttendance(t, entries, pin) {
  if (!auth_(t)) return NOAUTH;
  return lock_(function () {
    var sh = sheet_('attendance'), n = sh.getLastRow(), vals = n > 1 ? sh.getRange(2, 1, n - 1, 3).getValues() : [], idx = {};
    vals.forEach(function (r, i) { idx[d_(r[0]) + '|' + r[1]] = i; });
    var wages = {}; rows_('workers').forEach(function (r) { wages[String(r[0])] = Number(r[4]) || 0; });
    var dels = [], adds = [], addKeys = {}, changed = false, bef = [], aft = [];
    var nmA = {}; rows_('workers').forEach(function (r) { nmA[String(r[0])] = String(r[1]); });
    entries.forEach(function (e) {
      if (!DATE_RE.test(e.date)) return;
      var k = e.date + '|' + e.workerId, i = idx[k];
      var nm = (nmA[e.workerId] || e.workerId) + ' ' + e.date + ': ';
      if (!e.status) { if (i !== undefined) { dels.push(i); bef.push(nm + vals[i][2]); aft.push(nm + '(মুছে ফেলা)'); } return; }
      if (['P', 'H', 'A'].indexOf(e.status) < 0) return;
      if (i !== undefined) { if (String(vals[i][2]) !== e.status) { bef.push(nm + vals[i][2]); aft.push(nm + e.status); vals[i][2] = e.status; changed = true; } }
      else if (!addKeys[k]) { addKeys[k] = 1; adds.push([e.date, e.workerId, e.status, wages[e.workerId] || 0, '']); bef.push(nm + '—'); aft.push(nm + e.status); }
    });
    if (dels.length) { var g = pinGate_(pin); if (g) return g; }   // মুছতে হলে পিন বাধ্যতামূলক
    if (changed) sh.getRange(2, 3, vals.length, 1).setValues(vals.map(function (r) { return [r[2]]; }));
    appendRows_('attendance', adds);
    dels.sort(function (a, b) { return b - a; }).forEach(function (i) { sh.deleteRow(i + 2); });
    log_('Attendance', 'Mark Attendance', (entries[0] && entries[0].date) || '', 'added=' + adds.length + '; removed=' + dels.length + (changed ? '; changed' : ''), bef.join('\n'), aft.join('\n'));
    return { success: true };
  });
}

// type: ot | bonus | extra => যোগ;  adv | fine | take => বাদ।  id ক্লায়েন্ট থেকে আসে (একই এন্ট্রি দুবার সেভ হয় না)
function saveTx(t, p, pin) {
  if (!auth_(t)) return NOAUTH;
  return lock_(function () {
    var g = pinGate_(pin); if (g) return g;   // টাকার প্রতিটি এন্ট্রিতে এডমিন পিন বাধ্যতামূলক
    var amt = Number(p.amount), hrs = Number(p.hours) || 0;
    if (!(amt > 0) || !DATE_RE.test(p.date) || !p.workerId || TX_TYPES.indexOf(p.type) < 0) return { success: false, error: 'Invalid data' };
    if (p.type === 'ot' && !(hrs > 0)) return { success: false, error: 'Enter overtime hours' };
    var id = /^tx-[a-z0-9]{6,12}$/.test(String(p.id || '')) ? p.id : 'tx-' + Utilities.getUuid().slice(0, 8);
    if (col_('tx', 1).indexOf(id) >= 0) return { success: true, id: id, dup: true };
    var fm = /^\d{4}-\d{2}$/.test(String(p.forMonth || '')) ? String(p.forMonth) : '';
    appendRows_('tx', [[id, p.workerId, p.date, p.type, amt, p.note || '', p.type === 'ot' ? hrs : '', fm]]);
    log_('Add', 'Wages & Money', p.type + ' ' + amt, 'PIN verified; id=' + id, '—', txText_([id, p.workerId, p.date, p.type, amt, p.note || '', p.type === 'ot' ? hrs : '', fm]));
    return { success: true, id: id };
  });
}
// একসাথে অনেকগুলো এন্ট্রি (সবাইকে মজুরি দেওয়া): একবারেই শিটে লেখা হয়
// এন্ট্রি এডিট (এন্ট্রি হিস্ট্রি থেকে) — এডমিন পিন বাধ্যতামূলক
function updateTx(t, p, pin) {
  if (!auth_(t)) return NOAUTH;
  return lock_(function () {
    var g = pinGate_(pin); if (g) return g;
    var amt = Number(p.amount), hrs = Number(p.hours) || 0;
    if (!(amt > 0) || !DATE_RE.test(p.date) || !p.workerId || TX_TYPES.indexOf(p.type) < 0) return { success: false, error: 'Invalid data' };
    if (p.type === 'ot' && !(hrs > 0)) return { success: false, error: 'Enter overtime hours' };
    var i = col_('tx', 1).map(String).indexOf(String(p.id));
    if (i < 0) return { success: false, error: 'এন্ট্রি পাওয়া যায়নি' };
    var old = rows_('tx')[i];
    var fm = /^\d{4}-\d{2}$/.test(String(p.forMonth || '')) ? String(p.forMonth) : '';
    var row = [String(p.id), p.workerId, p.date, p.type, amt, p.note || '', p.type === 'ot' ? hrs : '', fm];
    var sh = sheet_('tx');
    SH.tx.t.forEach(function (c) { sh.getRange(i + 2, c).setNumberFormat('@'); });
    sh.getRange(i + 2, 1, 1, row.length).setValues([row]);
    log_('Edit', 'Entry History', wname_(p.workerId) + ' · ' + p.type + ' ' + amt, 'PIN verified; id=' + p.id, txText_(old), txText_(row));
    return { success: true };
  });
}
function wname_(id) {
  var r = rows_('workers').filter(function (x) { return String(x[0]) === String(id); })[0];
  return r ? String(r[1]) : String(id);
}
function txText_(r) {
  return wname_(r[1]) + ', ' + d_(r[2]) + ', ' + r[3] + ' ' + r[4] + (r[6] ? ' (' + r[6] + 'h)' : '') + (r[7] ? ', month ' + (r[7] instanceof Date ? Utilities.formatDate(r[7], 'Asia/Dhaka', 'yyyy-MM') : r[7]) : '') + (r[5] ? ', ' + r[5] : '');
}
function saveTxBatch(t, list, pin) {
  if (!auth_(t)) return NOAUTH;
  return lock_(function () {
    var g = pinGate_(pin); if (g) return g;
    if (!list || !list.length || list.length > 300) return { success: false, error: 'Invalid batch' };
    var have = {}; col_('tx', 1).forEach(function (x) { have[String(x)] = 1; });
    var rows = [], done = 0;
    for (var i = 0; i < list.length; i++) {
      var p = list[i], amt = Number(p.amount), hrs = Number(p.hours) || 0;
      if (!(amt > 0) || !DATE_RE.test(p.date) || !p.workerId || TX_TYPES.indexOf(p.type) < 0 || (p.type === 'ot' && !(hrs > 0))) return { success: false, error: 'Invalid data in batch' };
      var id = /^tx-[a-z0-9]{6,12}$/.test(String(p.id || '')) ? p.id : 'tx-' + Utilities.getUuid().slice(0, 8);
      if (have[id]) continue;
      have[id] = 1;
      var fm = /^\d{4}-\d{2}$/.test(String(p.forMonth || '')) ? String(p.forMonth) : '';
      rows.push([id, p.workerId, p.date, p.type, amt, p.note || '', p.type === 'ot' ? hrs : '', fm]);
      done++;
    }
    appendRows_('tx', rows);
    log_('Add', 'Wages & Money', 'Pay all (' + done + ' workers)', 'PIN verified', '—', rows.map(function (r) { return txText_(r); }).join('\n'));
    return { success: true, n: done };
  });
}
function deleteTx(t, id, pin) {
  if (!auth_(t)) return NOAUTH;
  return lock_(function () {
    var g = pinGate_(pin); if (g) return g;
    var i = col_('tx', 1).map(String).indexOf(String(id)), old = i >= 0 ? rows_('tx')[i] : null;
    if (i >= 0) sheet_('tx').deleteRow(i + 2);
    log_('Delete', 'Entry History', old ? wname_(old[1]) + ' · ' + old[3] + ' ' + old[4] : String(id), 'PIN verified; id=' + id, old ? txText_(old) : 'not found', '(মুছে ফেলা হয়েছে / deleted)');
    return { success: true };
  });
}

function saveWorker(t, w, pin) {
  if (!auth_(t)) return NOAUTH;
  return lock_(function () {
    var g = pinGate_(pin); if (g) return g;
    if (!String(w.name || '').trim()) return { success: false, error: 'Enter name' };
    var sh = sheet_('workers'), rows = rows_('workers'), found = -1, max = 0;
    rows.forEach(function (r, i) { if (String(r[0]) === String(w.id)) found = i; max = Math.max(max, Number(r[7]) || 0); });
    var id = found >= 0 ? w.id : 'w-' + Utilities.getUuid().slice(0, 8);
    var sort = found >= 0 ? rows[found][7] : max + 1, act = found >= 0 ? rows[found][6] : 'true';
    var row = [id, String(w.name).trim(), w.mobile || '', w.designation || '', Number(w.wage) || 0, w.photo || '', act, sort];
    if (found >= 0) sh.getRange(found + 2, 1, 1, 8).setValues([row]); else appendRows_('workers', [row]);
    var wt = function (r) { return r ? 'নাম: ' + r[1] + '\nমোবাইল: ' + (r[2] || '-') + '\nকাজ: ' + (r[3] || '-') + '\nদৈনিক মজুরি: ' + r[4] + (r[5] ? '\nছবি: ' + r[5] : '') : '—'; };
    log_(found >= 0 ? 'Edit' : 'Add', 'Workers', row[1], 'PIN verified', found >= 0 ? wt(rows[found]) : '—', wt(row));
    return { success: true, id: id, sort: sort };
  });
}

function deleteWorker(t, id, pin) {
  if (!auth_(t)) return NOAUTH;
  return lock_(function () {
    var g = pinGate_(pin); if (g) return g;
    var wn = wname_(id), wr = rows_('workers').filter(function (r) { return String(r[0]) === String(id); })[0];
    var cnt = { a: rows_('attendance').filter(function (r) { return String(r[1]) === String(id); }).length, t: rows_('tx').filter(function (r) { return String(r[1]) === String(id); }).length };
    var keep = function (k, col, fix) {
      var all = rows_(k), rows = all.filter(function (r) { return String(r[col]) !== String(id); });
      if (rows.length === all.length) return;
      if (fix) rows.forEach(function (r) { r[fix] = d_(r[fix]); });
      write_(k, rows);
    };
    keep('workers', 0); keep('attendance', 1, 0); keep('tx', 1, 2); keep('status', 0, 1);
    log_('Delete', 'Workers', wn, 'PIN verified; id ' + id, wr ? 'নাম: ' + wr[1] + '\nমোবাইল: ' + (wr[2] || '-') + '\nকাজ: ' + (wr[3] || '-') + '\nদৈনিক মজুরি: ' + wr[4] + '\nহাজিরা: ' + cnt.a + ' সারি\nলেনদেন: ' + cnt.t + ' টি' : '—', '(লেবার ও তার সব রেকর্ড মুছে ফেলা হয়েছে)');
    return { success: true };
  });
}

// চালু/বন্ধ: বন্ধ থাকা সময়ে হাজিরা এন্ট্রি হয় না; আবার চালু করলে সেদিন থেকে শুরু
function setActive(t, id, active, date) {
  if (!auth_(t)) return NOAUTH;
  return lock_(function () {
    if (!DATE_RE.test(date)) return { success: false, error: 'Invalid date' };
    var st = rows_('status'), at = -1;
    st.forEach(function (r, i) { if (String(r[0]) === String(id) && d_(r[1]) === date) at = i; });
    var val = active ? 'true' : 'false';
    if (at >= 0) sheet_('status').getRange(at + 2, 3).setValue(val); else appendRows_('status', [[id, date, val]]);
    var ids = col_('workers', 1).map(String), i = ids.indexOf(String(id));
    if (i >= 0) sheet_('workers').getRange(i + 2, 7).setValue(val);
    log_('Edit', 'Workers', wname_(id), 'from ' + date, active ? 'বন্ধ (Inactive)' : 'চালু (Active)', active ? 'চালু (Active)' : 'বন্ধ (Inactive)');
    return { success: true };
  });
}

function saveOrder(t, ids) {
  if (!auth_(t)) return NOAUTH;
  return lock_(function () {
    var pos = {}; ids.forEach(function (id, i) { pos[id] = i + 1; });
    var cur = col_('workers', 1), old = col_('workers', 8);
    var befO = cur.map(function (id, i) { return { id: id, o: Number(old[i]) || 0 }; }).sort(function (a, b) { return a.o - b.o; }).map(function (x) { return wname_(x.id); }).join(' > ');
    if (!cur.length) return { success: true };
    sheet_('workers').getRange(2, 8, cur.length, 1).setValues(cur.map(function (id, i) { return [pos[String(id)] || old[i]]; }));
    log_('Edit', 'Workers', 'Order changed', '', befO, ids.map(function (id) { return wname_(id); }).join(' > '));
    return { success: true };
  });
}

/* ---------- ভিজিটর লিংক ---------- */
function vSettings_() {
  var p = PropertiesService.getScriptProperties();
  return { token: p.getProperty('VISITOR_TOKEN') || '', enabled: p.getProperty('VISITOR_ENABLED') === 'true', pinHash: p.getProperty('VISITOR_PIN_HASH') || '' };
}
function vHash_(p) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, 'scs-visitor|' + p)
    .map(function (b) { return ('0' + (b & 255).toString(16)).slice(-2); }).join('');
}
function vLinkOk_(v) { var s = vSettings_(); return !!(s.enabled && s.token && v && String(v) === s.token); }
function visitorOk_(v, sess) {
  if (!vLinkOk_(v)) return false;
  var s = vSettings_();
  if (!s.pinHash) return true;
  return !!sess && CacheService.getScriptCache().get('vs_' + sess) === s.token;
}
// ভিজিটর পেজ খোলার সময়: লিংক চালু ও সঠিক কিনা, পিন লাগবে কিনা
function visitorStatus(v) {
  if (!vLinkOk_(v)) return { ok: false };
  return { ok: true, pin: !!vSettings_().pinHash };
}
function visitorLogin(v, pin) {
  if (!vLinkOk_(v)) return { success: false, code: 'off' };
  var c = CacheService.getScriptCache();
  var s = vSettings_();
  if (s.pinHash && vHash_(String(pin || '')) !== s.pinHash) return { success: false };
  var sess = Utilities.getUuid();
  c.put('vs_' + sess, s.token, 21600);
  log_('Login', 'Visitor', 'Visitor link login', '');
  return { success: true, sess: sess };
}
function visitorInfo_() {
  var s = vSettings_(), base = '';
  try { base = ScriptApp.getService().getUrl() || ''; } catch (e) {}
  return { success: true, exists: !!s.token, enabled: s.enabled, pinSet: !!s.pinHash,
    url: (s.token && base) ? base + (base.indexOf('?') >= 0 ? '&' : '?') + 'v=' + s.token : '' };
}
function getVisitorSettings(t) {
  if (!auth_(t)) return NOAUTH;
  return visitorInfo_();
}
// action: create | toggle(val=true/false) | regen | setPin(val='' বা ৪-৮ সংখ্যা)
function setVisitor(t, action, val) {
  if (!auth_(t)) return NOAUTH;
  return lock_(function () {
    var p = PropertiesService.getScriptProperties(), s = vSettings_();
    var vtxt = function (x) { return 'লিংক: ' + (x.token ? (x.enabled ? 'চালু' : 'বন্ধ') : 'তৈরি হয়নি') + '\nপিন: ' + (x.pinHash ? 'আছে' : 'নেই'); };
    var newToken = function () { return Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '').slice(0, 8); };
    if (action === 'create') {
      if (!s.token) p.setProperty('VISITOR_TOKEN', newToken());
      p.setProperty('VISITOR_ENABLED', 'true');
    } else if (!s.token) {
      return { success: false, error: 'Create the visitor link first' };
    } else if (action === 'toggle') {
      p.setProperty('VISITOR_ENABLED', val ? 'true' : 'false');
    } else if (action === 'regen') {
      p.setProperty('VISITOR_TOKEN', newToken());   // আগের লিংক ও সব ভিজিটর সেশন অকেজো
    } else if (action === 'setPin') {
      if (val === '' || val === null) p.deleteProperty('VISITOR_PIN_HASH');
      else if (/^\d{4,8}$/.test(String(val))) p.setProperty('VISITOR_PIN_HASH', vHash_(String(val)));
      else return { success: false, error: 'PIN must be 4-8 digits' };
      CacheService.getScriptCache().remove('vfails');
    } else {
      return { success: false, error: 'Unknown action' };
    }
    log_('Settings', 'Admin · Visitor Link', action, action === 'regen' ? 'নতুন লিংক তৈরি, আগের লিংক অকেজো' : '', vtxt(s), vtxt(vSettings_()));
    return visitorInfo_();
  });
}

/* =====================================================================
 *  নতুন অংশ (Report App-এর মতো Admin মেনু): লগ, সেটিংস, লোগো, গান, সিগনেচার,
 *  JSON ব্যাকআপ / রিস্টোর / রিসেট, গুগল ড্রাইভ অটো ব্যাকআপ।
 *  ওপরের লেবার হাজিরা ও মজুরির লজিক একদম আগের মতোই আছে।
 * ===================================================================== */
var LOG = { n: 'ActivityLog', c: ['Time', 'Action', 'Section', 'Item', 'Details', 'Account', 'Before', 'After'] };
var APP_NAME = 'SCS Worker Attendance & Wage';

function onOpen() {
  try {
    SpreadsheetApp.getUi().createMenu('SCS Worker')
      .addItem('Setup / Repair Sheets', 'setupSheets')
      .addItem('Authorize (Drive + Trigger)', 'authorizeAll')
      .addItem('Google Drive Backup Now', 'driveBackupNowFromMenu')
      .addToUi();
  } catch (e) {}
}
function setupSheets() { ['workers', 'attendance', 'tx', 'status'].forEach(function (k) { sheet_(k); }); logSheet_(); return 'OK'; }

/* ---------- অ্যাক্টিভিটি লগ (শুধু দেখা যায়, মোছা যায় না) ---------- */
function logSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet(), sh = ss.getSheetByName(LOG.n);
  if (!sh) {
    sh = ss.insertSheet(LOG.n);
    sh.getRange(1, 1, 1, LOG.c.length).setValues([LOG.c]).setFontWeight('bold').setBackground('#fce4ec');
    sh.setFrozenRows(1);
  } else if (String(sh.getRange(1, 7).getValue()) !== 'Before') {   // পুরনো লগ শিটে আগে/পরে কলাম যোগ
    sh.getRange(1, 1, 1, LOG.c.length).setValues([LOG.c]).setFontWeight('bold').setBackground('#fce4ec');
  }
  return sh;
}
// লগ শুধু যোগ হয়, অ্যাপ থেকে কখনো মোছে না। before/after = আগে কী ছিল / পরে কী হলো
function log_(action, section, item, details, before, after) {
  try {
    var who = ''; try { who = Session.getActiveUser().getEmail() || ''; } catch (e) {}
    var sh = logSheet_();
    sh.getRange(sh.getLastRow() + 1, 1, 1, LOG.c.length).setNumberFormat('@')
      .setValues([[new Date().toISOString(), String(action || ''), String(section || ''), String(item || '').slice(0, 300), String(details || '').slice(0, 2000), who,
        String(before == null ? '' : before).slice(0, 4000), String(after == null ? '' : after).slice(0, 4000)]]);
  } catch (e) { /* লগ ব্যর্থ হলে মূল কাজ থামবে না */ }
}
function getActivityLog(t, from, to) {
  if (!auth_(t)) return NOAUTH;
  var sh = logSheet_(), n = sh.getLastRow(), rows = [];
  if (n < 2) return { success: true, rows: [] };
  var v = sh.getRange(2, 1, n - 1, LOG.c.length).getValues();
  for (var i = v.length - 1; i >= 0 && rows.length < 20000; i--) {
    var tm = v[i][0] instanceof Date ? v[i][0] : new Date(String(v[i][0]));
    var day = isNaN(tm.getTime()) ? String(v[i][0]).slice(0, 10) : Utilities.formatDate(tm, 'Asia/Dhaka', 'yyyy-MM-dd');
    if (from && day < from) continue;
    if (to && day > to) continue;
    rows.push({ time: isNaN(tm.getTime()) ? String(v[i][0]) : Utilities.formatDate(tm, 'Asia/Dhaka', 'yyyy-MM-dd HH:mm:ss'),
      action: String(v[i][1]), section: String(v[i][2]), item: String(v[i][3]), details: String(v[i][4]), account: String(v[i][5]),
      before: String(v[i][6] == null ? '' : v[i][6]), after: String(v[i][7] == null ? '' : v[i][7]) });
  }
  return { success: true, rows: rows };
}
function logActivity(t, action, section, item, details) {
  if (!auth_(t)) return NOAUTH;
  log_(action, section, item, details);
  return { success: true };
}

/* ---------- সেটিংস (Script Properties) ---------- */
function prop_(k) { return PropertiesService.getScriptProperties().getProperty('SET_' + k) || ''; }
function setProp_(k, v) { var p = PropertiesService.getScriptProperties(); if (v === '' || v === null || v === undefined) p.deleteProperty('SET_' + k); else p.setProperty('SET_' + k, String(v)); }
function canView_(ctx) { ctx = ctx || {}; return auth_(ctx.t) || visitorOk_(ctx.v, ctx.s); }

function logoDataUrl_() {
  var id = prop_('logo_file_id'); if (!id) return '';
  var c = CacheService.getScriptCache(), k = 'logo_' + id, hit = c.get(k);
  if (hit) return hit;
  try {
    var b = DriveApp.getFileById(id).getBlob();
    var u = 'data:' + b.getContentType() + ';base64,' + Utilities.base64Encode(b.getBytes());
    if (u.length < 95000) c.put(k, u, 21600);
    return u;
  } catch (e) { return ''; }
}
/** সবার জন্য (এডমিন ও ভিজিটর): লোগো, সিগনেচার, গান আছে কিনা */
function getUiConfig(ctx) {
  if (!canView_(ctx)) return { success: false, auth: true };
  var sig = []; try { sig = JSON.parse(prop_('signatures') || '[]'); } catch (e) { sig = []; }
  return { success: true, logo: logoDataUrl_(), signatures: sig, musicUrl: prop_('music_url'), musicFile: !!prop_('music_file_id') };
}
function getMusicDataUrl(ctx) {
  if (!canView_(ctx)) return { success: false, auth: true };
  var id = prop_('music_file_id'); if (!id) return { success: true, url: '' };
  try { var b = DriveApp.getFileById(id).getBlob(); return { success: true, url: 'data:' + (b.getContentType() || 'audio/mpeg') + ';base64,' + Utilities.base64Encode(b.getBytes()) }; }
  catch (e) { return { success: true, url: '' }; }
}

function folder_() {
  var id = prop_('drive_folder_id');
  if (!id) throw new Error('Drive ফোল্ডার সেট করা নেই। Admin → লোগো, কন্ট্রোল ও ব্যাকআপ → "Drive Folder Setup"-এ ফোল্ডার আইডি দিন।');
  try { return DriveApp.getFolderById(id); } catch (e) { throw new Error('Drive ফোল্ডারটি খোলা যাচ্ছে না। আইডি ও অ্যাক্সেস দেখুন।'); }
}
function getAdminSettings(t) {
  if (!auth_(t)) return NOAUTH;
  var id = prop_('drive_folder_id'), name = '';
  if (id) { try { name = DriveApp.getFolderById(id).getName(); } catch (e) { name = ''; } }
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var tabs = ['workers', 'attendance', 'tx', 'status'].map(function (k) { var sh = sheet_(k); return { key: k, name: SH[k].n, rows: Math.max(0, sh.getLastRow() - 1), cols: SH[k].c.join(', ') }; });
  tabs.push({ key: 'log', name: LOG.n, rows: Math.max(0, logSheet_().getLastRow() - 1), cols: LOG.c.join(', ') });
  return { success: true, folderId: id, folderName: name, musicUrl: prop_('music_url'), musicFile: !!prop_('music_file_id'), hasLogo: !!prop_('logo_file_id'),
    sheetName: ss.getName(), sheetUrl: ss.getUrl(), tabs: tabs };
}
function saveDriveFolder(t, input) {
  if (!auth_(t)) return NOAUTH;
  var raw = String(input || '').trim();
  var oldF = prop_('drive_folder_id');
  if (!raw) { setProp_('drive_folder_id', ''); log_('Settings', 'Admin', 'Drive folder removed', '', oldF || '—', '—'); return getAdminSettings(t); }
  var m = raw.match(/\/folders\/([a-zA-Z0-9_-]+)/) || raw.match(/[?&]id=([a-zA-Z0-9_-]+)/), id = m ? m[1] : raw;
  if (!/^[a-zA-Z0-9_-]{10,}$/.test(id)) return { success: false, error: 'ফোল্ডার আইডি সঠিক নয়' };
  var f; try { f = DriveApp.getFolderById(id); } catch (e) { return { success: false, error: 'ফোল্ডার খোলা যায়নি: ' + e.message }; }
  setProp_('drive_folder_id', id); log_('Settings', 'Admin', 'Drive folder', f.getName(), oldF || '—', id + ' (' + f.getName() + ')');
  return getAdminSettings(t);
}
function saveLogo(t, dataUrl, name) {
  if (!auth_(t)) return NOAUTH;
  try {
    var m = String(dataUrl || '').match(/^data:(image\/(?:png|jpeg|jpg|webp|svg\+xml));base64,(.+)$/i);
    if (!m) return { success: false, error: 'শুধু PNG / JPG / WEBP / SVG ছবি দিন' };
    var file = folder_().createFile(Utilities.newBlob(Utilities.base64Decode(m[2]), m[1], name || 'scs-logo'));
    var old = prop_('logo_file_id'); setProp_('logo_file_id', file.getId());
    if (old) { try { DriveApp.getFileById(old).setTrashed(true); } catch (e) {} }
    log_('Settings', 'Admin', 'Logo changed', name || '', old ? 'আগের লোগো ফাইল: ' + old : 'ডিফল্ট লোগো', 'নতুন লোগো ফাইল: ' + file.getId());
    return { success: true, logo: dataUrl };
  } catch (e) { return { success: false, error: e.message }; }
}
function removeLogo(t) { if (!auth_(t)) return NOAUTH; var o = prop_('logo_file_id'); setProp_('logo_file_id', ''); log_('Settings', 'Admin', 'Logo removed', '', o ? 'কাস্টম লোগো: ' + o : '—', 'ডিফল্ট লোগো'); return { success: true }; }
function saveMusicUrl(t, url) {
  if (!auth_(t)) return NOAUTH;
  url = String(url || '').trim();
  if (url && !/^https?:\/\//i.test(url)) return { success: false, error: 'সঠিক লিংক দিন (https://...)' };
  var oldU = prop_('music_url') || (prop_('music_file_id') ? 'ফাইল: ' + prop_('music_file_id') : '—');
  setProp_('music_url', url); if (url) setProp_('music_file_id', '');
  log_('Settings', 'Admin · Rabindra Sangeet', 'Music link', '', oldU, url || 'removed');
  return { success: true };
}
function saveMusicFile(t, name, b64, mime) {
  if (!auth_(t)) return NOAUTH;
  try {
    if (!b64) return { success: false, error: 'ফাইল খালি' };
    var f = folder_().createFile(Utilities.newBlob(Utilities.base64Decode(b64), mime || 'audio/mpeg', name || 'scs-audio'));
    var old = prop_('music_file_id'); setProp_('music_file_id', f.getId()); setProp_('music_url', '');
    if (old) { try { DriveApp.getFileById(old).setTrashed(true); } catch (e) {} }
    log_('Settings', 'Admin · Rabindra Sangeet', 'Music file uploaded', name || '', old ? 'ফাইল: ' + old : '—', 'ফাইল: ' + f.getId() + ' (' + (name || '') + ')');
    return { success: true };
  } catch (e) { return { success: false, error: e.message }; }
}
function saveSignatures(t, json) {
  if (!auth_(t)) return NOAUTH;
  var list; try { list = JSON.parse(String(json || '[]')); } catch (e) { return { success: false, error: 'Invalid data' }; }
  if (!Array.isArray(list) || list.length > 8) return { success: false, error: '০ থেকে ৮টি সিগনেচার দেওয়া যাবে' };
  var clean = list.map(function (g) { return { label: String(g.label || '').slice(0, 80), name: String(g.name || '').slice(0, 80), designation: String(g.designation || '').slice(0, 80) }; })
    .filter(function (g) { return g.label || g.name; });
  var sg = function (l) { return l.length ? l.map(function (g) { return g.label + ': ' + g.name + (g.designation ? ' (' + g.designation + ')' : ''); }).join('\n') : '—'; };
  var oldS = []; try { oldS = JSON.parse(prop_('signatures') || '[]'); } catch (e) {}
  setProp_('signatures', JSON.stringify(clean));
  log_('Settings', 'Admin · Signature Setup', clean.length + ' signatures', '', sg(oldS), sg(clean));
  return { success: true, signatures: clean };
}
/** কোনো কাজের আগে শুধু পিন যাচাই (ব্যাকআপ/রিসেটের ধাপে) */
function checkPin(t, pin) {
  if (!auth_(t)) return NOAUTH;
  var g = pinGate_(pin); if (g) return g;
  return { success: true };
}
// এডমিন মেনু আনলক / লক (লগে থাকে)
function adminUnlock(t, pin) {
  if (!auth_(t)) return NOAUTH;
  var g = pinGate_(pin); if (g) return g;
  log_('Unlock', 'Admin', 'Admin menu unlocked', '');
  return { success: true };
}
function adminLock(t) { if (!auth_(t)) return NOAUTH; log_('Lock', 'Admin', 'Admin menu locked', ''); return { success: true }; }
function repairSheets(t) { if (!auth_(t)) return NOAUTH; setupSheets(); log_('Settings', 'Admin · Sheet', 'Sheets repaired', ''); return getAdminSettings(t); }

/* ---------- JSON ব্যাকআপ (এক্সপোর্ট) ---------- */
// সারি -> হেডার নামসহ অবজেক্ট (তারিখ সবসময় yyyy-MM-dd টেক্সট)
function rowsObj_(k) {
  var cols = SH[k].c;
  return rows_(k).filter(function (r) { return String(r[0]) !== ''; }).map(function (r) {
    var o = {};
    cols.forEach(function (c, i) {
      var v = r[i];
      if (v instanceof Date) v = (c === 'ForMonth') ? Utilities.formatDate(v, 'Asia/Dhaka', 'yyyy-MM') : d_(v);
      o[c] = (typeof v === 'number' || typeof v === 'boolean') ? v : String(v == null ? '' : v);
    });
    return o;
  });
}
function inPeriod_(d, scope, period) { d = String(d || ''); return scope === 'year' ? d.slice(0, 4) === period : scope === 'month' ? d.slice(0, 7) === period : true; }
function settingsPack_() {
  var p = PropertiesService.getScriptProperties().getProperties(), out = {};
  Object.keys(p).forEach(function (k) { if (k.indexOf('SET_') === 0 || k === 'ADMIN_PIN_HASH' || k === 'USER_PIN_HASH' || k === 'AB_CFG') out[k] = p[k]; });
  return out;
}
function buildBackup_(scope, period) {
  scope = scope === 'year' || scope === 'month' ? scope : 'lifetime';
  period = String(period || '');
  if (scope === 'year' && !/^\d{4}$/.test(period)) throw new Error('Invalid year');
  if (scope === 'month' && !/^\d{4}-\d{2}$/.test(period)) throw new Error('Invalid month');
  var att = rowsObj_('attendance').filter(function (r) { return inPeriod_(r.Date, scope, period); });
  var tx = rowsObj_('tx').filter(function (r) { return inPeriod_(r.ForMonth || r.Date, scope, period) || inPeriod_(r.Date, scope, period); });
  var pack = {
    app: APP_NAME, kind: 'worker-backup', version: 1, scope: scope, period: scope === 'lifetime' ? '' : period,
    exportedAt: new Date().toISOString(), spreadsheetId: SpreadsheetApp.getActiveSpreadsheet().getId(),
    columns: { workers: SH.workers.c, attendance: SH.attendance.c, tx: SH.tx.c, status: SH.status.c },
    data: { workers: rowsObj_('workers'), attendance: att, tx: tx, status: rowsObj_('status') },
    settings: settingsPack_()
  };
  pack.counts = { workers: pack.data.workers.length, attendance: att.length, tx: tx.length, status: pack.data.status.length };
  if (scope === 'lifetime') {
    pack.logo = logoDataUrl_();
    try { var sh = logSheet_(), n = sh.getLastRow(); pack.activityLog = { headers: LOG.c, rows: n > 1 ? sh.getRange(2, 1, n - 1, LOG.c.length).getDisplayValues() : [] }; } catch (e) {}
  }
  return pack;
}
function exportBackup(t, pin, scope, period) {
  if (!auth_(t)) return NOAUTH;
  var g = pinGate_(pin); if (g) return g;
  try {
    var pack = buildBackup_(scope, period);
    log_('Backup', 'Admin · Backup', 'JSON export (' + pack.scope + (pack.period ? ' ' + pack.period : '') + ')',
      'workers=' + pack.counts.workers + '; attendance=' + pack.counts.attendance + '; tx=' + pack.counts.tx);
    return { success: true, json: JSON.stringify(pack, null, 1), counts: pack.counts };
  } catch (e) { return { success: false, error: e.message }; }
}

/* ---------- রিস্টোর ---------- */
function clean_(k, o) {
  var c = SH[k].c, r = c.map(function (h) { var v = o[h]; return v == null ? '' : v; });
  if (k === 'workers') {
    if (!String(r[0]).trim() || !String(r[1]).trim()) return null;
    r[4] = Number(r[4]) || 0; r[6] = String(r[6]) === 'false' ? 'false' : 'true'; r[7] = Number(r[7]) || 0;
  } else if (k === 'attendance') {
    if (!DATE_RE.test(String(r[0])) || !String(r[1]) || ['P', 'H', 'A'].indexOf(String(r[2])) < 0) return null;
    r[3] = Number(r[3]) || 0;
  } else if (k === 'tx') {
    if (!String(r[0]) || !String(r[1]) || !DATE_RE.test(String(r[2])) || TX_TYPES.indexOf(String(r[3])) < 0 || !(Number(r[4]) > 0)) return null;
    r[4] = Number(r[4]); r[6] = r[6] === '' ? '' : (Number(r[6]) || ''); r[7] = /^\d{4}-\d{2}$/.test(String(r[7])) ? String(r[7]) : '';
  } else if (k === 'status') {
    if (!String(r[0]) || !DATE_RE.test(String(r[1]))) return null;
    r[2] = String(r[2]) === 'true' ? 'true' : 'false';
  }
  return r.map(function (v) { return typeof v === 'number' ? v : String(v); });
}
var KEYF = {
  workers: function (r) { return String(r[0]); },
  attendance: function (r) { return d_(r[0]) + '|' + r[1]; },
  tx: function (r) { return String(r[0]); },
  status: function (r) { return r[0] + '|' + d_(r[1]); }
};
/**
 * mode = 'merge'  : ফাইলের সারি যোগ/আপডেট হয়, বাকি ডাটা থাকে (নিরাপদ)
 * mode = 'replace': লাইফটাইম ফাইল হলে পুরো ডাটা ফাইলের মতো হয়; মাস/বছরের ফাইল হলে শুধু সেই সময়ের হাজিরা ও লেনদেন বদলায়
 * applyPin = true হলে ফাইলের এডমিন পিন ও সেটিংসও ফেরে
 */
function restoreBackup(t, pin, json, mode, applyPin) {
  if (!auth_(t)) return NOAUTH;
  var g = pinGate_(pin); if (g) return g;
  var pack; try { pack = JSON.parse(String(json || '')); } catch (e) { return { success: false, error: 'JSON ফাইল পড়া যায়নি' }; }
  if (!pack || pack.kind !== 'worker-backup' || !pack.data) return { success: false, error: 'এটি SCS Worker ব্যাকআপ ফাইল নয়' };
  mode = mode === 'replace' ? 'replace' : 'merge';
  var safety = '';
  try { safety = abRun_(true, 'Before restore').file.name; } catch (e) { safety = ''; }
  var res = lock_(function () {
    var report = {};
    ['workers', 'attendance', 'tx', 'status'].forEach(function (k) {
      var inc = (pack.data[k] || []).map(function (o) { return clean_(k, o || {}); }), bad = inc.filter(function (r) { return !r; }).length;
      inc = inc.filter(Boolean);
      var cur = rows_(k).filter(function (r) { return String(r[0]) !== ''; }).map(function (r) {
        return r.map(function (v, i) { return v instanceof Date ? (SH[k].c[i] === 'ForMonth' ? Utilities.formatDate(v, 'Asia/Dhaka', 'yyyy-MM') : d_(v)) : v; });
      });
      var out;
      if (mode === 'replace' && pack.scope === 'lifetime') out = [];
      else if (mode === 'replace' && (k === 'attendance' || k === 'tx')) {
        out = cur.filter(function (r) { return k === 'attendance' ? !inPeriod_(r[0], pack.scope, pack.period) : !(inPeriod_(r[7] || r[2], pack.scope, pack.period) || inPeriod_(r[2], pack.scope, pack.period)); });
      } else out = cur;
      var idx = {}; out.forEach(function (r, i) { idx[KEYF[k](r)] = i; });
      var added = 0, updated = 0;
      inc.forEach(function (r) { var key = KEYF[k](r); if (idx[key] !== undefined) { out[idx[key]] = r; updated++; } else { idx[key] = out.length; out.push(r); added++; } });
      write_(k, out);
      report[k] = { added: added, updated: updated, skipped: bad, total: out.length };
    });
    return { success: true, report: report };
  });
  if (!res.success) return res;
  var setN = 0;
  if (applyPin && pack.settings) {
    var p = PropertiesService.getScriptProperties();
    Object.keys(pack.settings).forEach(function (k) {
      var v = String(pack.settings[k] || '');
      if ((k === 'ADMIN_PIN_HASH' || k === 'USER_PIN_HASH') && !/^[0-9a-f]{64}$/.test(v)) return;
      if (k === 'ADMIN_PIN_HASH' || k === 'USER_PIN_HASH' || k === 'AB_CFG' || k.indexOf('SET_') === 0) { if (v) p.setProperty(k, v); setN++; }
    });
  }
  log_('Restore', 'Admin · Backup', 'JSON restore (' + mode + ', ' + pack.scope + (pack.period ? ' ' + pack.period : '') + ')',
    JSON.stringify(res.report) + (safety ? '; safety backup: ' + safety : ''));
  res.safety = safety; res.settings = setN;
  return res;
}

/* ---------- পুরো ডাটাবেজ রিসেট ---------- */
function resetAll(t, pin, confirmText) {
  if (!auth_(t)) return NOAUTH;
  var g = pinGate_(pin); if (g) return g;
  if (String(confirmText || '').trim().toUpperCase() !== 'RESET') return { success: false, error: 'নিশ্চিত করতে RESET লিখুন' };
  var safety = '';
  try { safety = abRun_(true, 'Before reset').file.name; } catch (e) { safety = ''; }
  var r = lock_(function () {
    var c = {};
    ['workers', 'attendance', 'tx', 'status'].forEach(function (k) { c[k] = rows_(k).length; write_(k, []); });
    return { success: true, cleared: c };
  });
  log_('Reset', 'Admin · Backup', 'Full database reset', JSON.stringify(r.cleared || {}) + (safety ? '; safety backup: ' + safety : '; no Drive safety backup'));
  r.safety = safety;
  return r;
}

/* =====================================================================
 *  GOOGLE DRIVE AUTO BACKUP (JSON)
 * ===================================================================== */
var AB = {
  HANDLER: 'scsWorkerAutoBackupTick', FOLDER: 'SCS Worker Auto Backup', PREFIX: 'SCS_Worker_Backup_',
  INTERVALS: { '1m': 1, '2m': 2, '5m': 5, '15m': 15, '30m': 30, '1h': 60, '6h': 360, '12h': 720, '1d': 1440 },
  DEFAULT: { enabled: true, interval: '1h', keepMode: 'days', keepValue: 30, onlyChanged: true }
};
function abConfig_() {
  var cfg = {}, saved = {};
  Object.keys(AB.DEFAULT).forEach(function (k) { cfg[k] = AB.DEFAULT[k]; });
  try { saved = JSON.parse(PropertiesService.getScriptProperties().getProperty('AB_CFG') || '{}'); } catch (e) {}
  Object.keys(saved).forEach(function (k) { cfg[k] = saved[k]; });
  if (!AB.INTERVALS[cfg.interval]) cfg.interval = AB.DEFAULT.interval;
  cfg.keepMode = cfg.keepMode === 'count' ? 'count' : 'days';
  cfg.keepValue = Math.max(1, Math.min(5000, Math.round(Number(cfg.keepValue) || 30)));
  cfg.enabled = cfg.enabled === true || String(cfg.enabled) === 'true';
  cfg.onlyChanged = !(cfg.onlyChanged === false || String(cfg.onlyChanged) === 'false');
  return cfg;
}
function abState_() { try { return JSON.parse(PropertiesService.getScriptProperties().getProperty('AB_STATE') || '{}') || {}; } catch (e) { return {}; } }
function abSaveState_(s) { PropertiesService.getScriptProperties().setProperty('AB_STATE', JSON.stringify(s || {})); }
function abFolder_() {
  var parent = null, id = prop_('drive_folder_id');
  if (id) { try { parent = DriveApp.getFolderById(id); } catch (e) { parent = null; } }
  if (!parent) { var it = DriveApp.getFileById(SpreadsheetApp.getActiveSpreadsheet().getId()).getParents(); parent = it.hasNext() ? it.next() : DriveApp.getRootFolder(); }
  var sub = parent.getFoldersByName(AB.FOLDER);
  return sub.hasNext() ? sub.next() : parent.createFolder(AB.FOLDER);
}
function abTriggerExists_() { return ScriptApp.getProjectTriggers().some(function (x) { return x.getHandlerFunction() === AB.HANDLER; }); }
function abRemoveTriggers_() { ScriptApp.getProjectTriggers().forEach(function (x) { if (x.getHandlerFunction() === AB.HANDLER) ScriptApp.deleteTrigger(x); }); }
function abInstallTrigger_(cfg) {
  abRemoveTriggers_();
  if (!cfg.enabled) return;
  var b = ScriptApp.newTrigger(AB.HANDLER).timeBased(), m = AB.INTERVALS[cfg.interval];
  if (m <= 2) b.everyMinutes(1); else if (m === 5) b.everyMinutes(5); else if (m === 15) b.everyMinutes(15); else if (m === 30) b.everyMinutes(30); else b.everyHours(1);
  b.create();
}
function ensureAutoBackup_() {
  var cfg = abConfig_(), has = abTriggerExists_();
  if (cfg.enabled && !has) abInstallTrigger_(cfg);
  if (!cfg.enabled && has) abRemoveTriggers_();
}
function abList_(folder) {
  var it = folder.getFiles(), list = [];
  while (it.hasNext()) { var f = it.next(), n = f.getName(); if (n.indexOf(AB.PREFIX) === 0 && /\.json$/i.test(n)) list.push({ file: f, name: n, url: f.getUrl(), size: f.getSize(), created: f.getDateCreated() }); }
  list.sort(function (a, b) { return b.created.getTime() - a.created.getTime(); });
  return list;
}
function abPrint_() {
  var p = settingsPack_(), parts = ['workers', 'attendance', 'tx', 'status'].map(function (k) { return JSON.stringify(rows_(k)); });
  return hash_(parts.join('|') + '|' + JSON.stringify(p) + '|' + logSheet_().getLastRow());
}
function abRun_(force, who) {
  var cfg = abConfig_(), st = abState_(), fp = abPrint_(), now = new Date().toISOString();
  if (!force && cfg.onlyChanged && st.hash === fp) { st.lastCheck = now; st.lastError = ''; abSaveState_(st); return { ok: true, skipped: true }; }
  var pack = buildBackup_('lifetime', ''), folder = abFolder_();
  var name = AB.PREFIX + Utilities.formatDate(new Date(), 'Asia/Dhaka', 'yyyy-MM-dd_HH-mm-ss') + '.json';
  var file = folder.createFile(Utilities.newBlob(JSON.stringify(pack), 'application/json', name));
  var removed = 0, cut = Date.now() - cfg.keepValue * 86400000;
  abList_(folder).forEach(function (x, i) {
    if (x.file.getId() === file.getId()) return;
    if (cfg.keepMode === 'count' ? i >= cfg.keepValue : x.created.getTime() < cut) { try { x.file.setTrashed(true); removed++; } catch (e) {} }
  });
  st.hash = fp; st.lastRun = now; st.lastCheck = now; st.lastFile = name; st.lastFileUrl = file.getUrl(); st.lastError = '';
  abSaveState_(st);
  if (force) log_('Backup', 'Admin · Auto Backup', name, 'Google Drive backup' + (who ? ' (' + who + ')' : '') + (removed ? '; old removed: ' + removed : ''));
  return { ok: true, skipped: false, file: { name: name, url: file.getUrl(), size: file.getSize(), created: now }, removed: removed };
}
function scsWorkerAutoBackupTick() {
  var cfg = abConfig_();
  if (!cfg.enabled) { try { abRemoveTriggers_(); } catch (e) {} return 'disabled'; }
  var st = abState_(), every = AB.INTERVALS[cfg.interval] * 60000, last = st.lastCheck ? new Date(st.lastCheck).getTime() : 0;
  if (last && Date.now() - last < every - 20000) return 'not-due';
  try { return abRun_(false).skipped ? 'unchanged' : 'saved'; }
  catch (e) { st.lastError = new Date().toISOString() + ' — ' + (e && e.message ? e.message : e); st.lastCheck = new Date().toISOString(); try { abSaveState_(st); } catch (x) {} throw e; }
}
function getAutoBackupConfig(t) {
  if (!auth_(t)) return NOAUTH;
  var cfg = abConfig_(), st = abState_();
  var out = { success: true, enabled: cfg.enabled, interval: cfg.interval, keepMode: cfg.keepMode, keepValue: cfg.keepValue, onlyChanged: cfg.onlyChanged,
    lastRun: st.lastRun || '', lastFile: st.lastFile || '', lastFileUrl: st.lastFileUrl || '', lastError: st.lastError || '', lastCheck: st.lastCheck || '',
    triggerOn: false, folderName: '', folderUrl: '', files: [] };
  try { out.triggerOn = abTriggerExists_(); } catch (e) { out.lastError = out.lastError || ('Trigger: ' + e.message); }
  try { var f = abFolder_(); out.folderName = f.getName(); out.folderUrl = f.getUrl();
    out.files = abList_(f).slice(0, 15).map(function (x) { return { name: x.name, url: x.url, size: x.size, created: x.created.toISOString() }; });
  } catch (e) { out.lastError = out.lastError || ('Drive: ' + e.message); }
  return out;
}
function saveAutoBackupConfig(t, cfg) {
  if (!auth_(t)) return NOAUTH;
  cfg = cfg || {};
  var old = abConfig_(), c = { enabled: !!cfg.enabled, interval: AB.INTERVALS[cfg.interval] ? String(cfg.interval) : old.interval,
    keepMode: cfg.keepMode === 'count' ? 'count' : 'days', keepValue: Math.max(1, Math.min(5000, Math.round(Number(cfg.keepValue) || old.keepValue))), onlyChanged: cfg.onlyChanged !== false };
  PropertiesService.getScriptProperties().setProperty('AB_CFG', JSON.stringify(c));
  try { abInstallTrigger_(c); } catch (e) { return { success: false, error: 'ট্রিগার তৈরি করা যায়নি: ' + e.message + ' (এডিটর থেকে authorizeAll একবার Run করুন)' }; }
  var abt = function (x) { return (x.enabled ? 'চালু' : 'বন্ধ') + '\nকত পর পর: ' + x.interval + '\nরাখা হবে: ' + x.keepValue + ' ' + x.keepMode + '\nনা বদলালে বাদ: ' + x.onlyChanged; };
  log_('Settings', 'Admin · Auto Backup', c.enabled ? 'Auto backup ON' : 'Auto backup OFF', '', abt(old), abt(c));
  return getAutoBackupConfig(t);
}
function runDriveBackupNow(t) {
  if (!auth_(t)) return NOAUTH;
  try { var r = abRun_(true, 'Admin'); return { success: true, file: r.file, removed: r.removed }; }
  catch (e) { return { success: false, error: e.message }; }
}
function driveBackupNowFromMenu() { return abRun_(true, 'Sheet menu').file.name; }

/** নতুন ভার্সন ডিপ্লয়ের আগে এডিটর থেকে একবার Run করে সব অনুমতি (Sheet + Drive + Trigger) দিন */
function authorizeAll() {
  DriveApp.getRootFolder().getName();
  ScriptApp.getProjectTriggers();
  setupSheets();
  ensureAutoBackup_();
  return 'Authorized | Auto backup trigger: ' + (abTriggerExists_() ? 'ON' : 'OFF');
}
