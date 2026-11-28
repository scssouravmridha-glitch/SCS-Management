/**
 * =====================================================================
 *  SCS Monthly Report - Backend (Google Apps Script)
 *  Swarup Construction Solution
 * =====================================================================
 *  - Google Sheet = একমাত্র ডাটাবেজ (কোনো localStorage / স্যাম্পল ডাটা নেই)
 *  - "SCS Order" ট্যাব  -> অর্ডার ডাটা (লাইভ পড়া হয়, শিট থেকে ডিলিট করলে অ্যাপ থেকেও চলে যায়)
 *  - "Employee Attendance" ট্যাব -> মাসভিত্তিক অ্যাটেনডেন্স টেবিল (একটার উপর আরেকটা)
 *  - ম্যানুয়াল ইনপুট, সেটিংস, লোন ইত্যাদি -> স্বয়ংক্রিয়ভাবে তৈরি DB_* শিটে সেভ হয়
 *
 *  ডিপ্লয়: Extensions > Apps Script (গুগল শিটের ভেতর থেকে খুলুন) -> Code.gs ও Index.html
 *  পেস্ট করুন -> Deploy > New deployment > Web app.
 * =====================================================================
 */

var SCS = {
  SHEET_MANUAL: 'DB_ManualData',
  SHEET_SETTINGS: 'DB_AppSettings',
  SHEET_HISTORY: 'DB_History',
  DEFAULT_ORDER_TAB: 'SCS Order',
  DEFAULT_ATT_TAB: 'Employee Attendance',
  CHUNK_SIZE: 45000,            // গুগল শিটের এক সেলে সর্বোচ্চ ৫০,০০০ অক্ষর
  HISTORY_MIN_GAP_MIN: 30,      // একই মাসের ব্যাকআপ কমপক্ষে ৩০ মিনিট পর পর
  HISTORY_MAX_ROWS: 400,        // DB_History-তে সর্বোচ্চ সারি
  FILES_FOLDER_NAME: ''
};

/* ---------------------------------------------------------------------
 *  WEB APP ENTRY
 * ------------------------------------------------------------------- */
function doGet() {
  try { setupDatabase(); } catch (err) { /* সংযোগ না থাকলে অ্যাপ খুলবে, সেটিংসে URL দিলে ঠিক হবে */ }
  try { ensureAutoBackup_(); } catch (err) { /* অনুমতি না থাকলে authorizeAll একবার Run করুন */ }
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('SCS Monthly Report')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function onOpen() {
  try {
    SpreadsheetApp.getUi()
      .createMenu('SCS Tools')
      .addItem('Setup / Repair Database Sheets', 'setupDatabase')
      .addItem('Backup Manual Data Now', 'backupNow')
      .addItem('Self Test (Save + Drive)', 'selfTest')
      .addToUi();
  } catch (e) {}
}

/* ---------------------------------------------------------------------
 *  DATABASE (স্বয়ংক্রিয় শিট তৈরি)
 * ------------------------------------------------------------------- */
function setupDatabase() {
  var ss = getHome_();
  ensureSheet_(ss, SCS.SHEET_MANUAL, ['MonthKey', 'Chunk', 'Data (JSON)', 'UpdatedAt']);
  ensureSheet_(ss, SCS.SHEET_SETTINGS, ['Key', 'Value', 'UpdatedAt']);
  ensureSheet_(ss, SCS.SHEET_HISTORY, ['SavedAt', 'MonthKey', 'Chunk', 'Data (JSON)']);
  ensureSheet_(ss, SCS_LOG.SHEET, SCS_LOG.HEADERS);
  return 'OK: ' + ss.getName();
}

function getHome_() {
  var props = PropertiesService.getScriptProperties();
  var active = null;
  try { active = SpreadsheetApp.getActiveSpreadsheet(); } catch (e) { active = null; }
  if (active) {
    if (props.getProperty('DB_SPREADSHEET_ID') !== active.getId()) {
      props.setProperty('DB_SPREADSHEET_ID', active.getId());
    }
    return active;
  }
  var id = props.getProperty('DB_SPREADSHEET_ID');
  if (id) return SpreadsheetApp.openById(id);
  throw new Error('ডাটাবেজ গুগল শিট সংযুক্ত নেই। শিটের ভেতর থেকে Extensions > Apps Script দিয়ে স্ক্রিপ্ট খুলুন, অথবা Settings-এ Google Sheet URL সেভ করুন।');
}

function ensureSheet_(ss, name, headers) {
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, headers.length).setValues([headers])
      .setFontWeight('bold').setBackground('#1e293b').setFontColor('#ffffff');
    sh.setFrozenRows(1);
    try { sh.protect().setWarningOnly(true).setDescription('SCS app database - সরাসরি এডিট করবেন না'); } catch (e) {}
  }
  return sh;
}

function withLock_(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(60000);
  try { return fn(); } finally { lock.releaseLock(); }
}

/* ---------------------------------------------------------------------
 *  SETTINGS (Key/Value শিট)
 * ------------------------------------------------------------------- */
function readSettings_() {
  var sh = ensureSheet_(getHome_(), SCS.SHEET_SETTINGS, ['Key', 'Value', 'UpdatedAt']);
  var last = sh.getLastRow();
  var out = {};
  if (last < 2) return out;
  sh.getRange(2, 1, last - 1, 2).getValues().forEach(function (r) {
    if (r[0] !== '') out[String(r[0])] = r[1];
  });
  return out;
}

function writeSetting_(key, value) {
  withLock_(function () {
    var sh = ensureSheet_(getHome_(), SCS.SHEET_SETTINGS, ['Key', 'Value', 'UpdatedAt']);
    var last = sh.getLastRow();
    var row = 0;
    if (last >= 2) {
      var keys = sh.getRange(2, 1, last - 1, 1).getValues();
      for (var i = 0; i < keys.length; i++) {
        if (String(keys[i][0]) === String(key)) { row = i + 2; break; }
      }
    }
    if (!row) row = last + 1;
    sh.getRange(row, 1, 1, 3).setNumberFormat('@')
      .setValues([[String(key), String(value), new Date().toISOString()]]);
  });
}

function getAppSettings() {
  var s = readSettings_();
  var out = {
    allowUserEditPreviousMonths: String(s.allowUserEditPreviousMonths).toLowerCase() === 'true',
    selected_song_id: s.selected_song_id ? String(s.selected_song_id) : '',
    music_custom_url: s.music_custom_url ? String(s.music_custom_url) : '',
    logo_data_url: '',
    signature_config: s.signature_config ? String(s.signature_config) : '',
    admin_pin_hash: s.admin_pin_hash ? String(s.admin_pin_hash) : '',
    admin_pin_len: s.admin_pin_len ? String(s.admin_pin_len) : ''
  };
  if (s.logo_file_id) {
    try {
      var blob = DriveApp.getFileById(String(s.logo_file_id)).getBlob();
      out.logo_data_url = 'data:' + blob.getContentType() + ';base64,' + Utilities.base64Encode(blob.getBytes());
    } catch (e) { out.logo_data_url = ''; }
  }
  return out;
}

function saveAppSetting(key, value) {
  var allowed = ['allowUserEditPreviousMonths'];
  if (allowed.indexOf(String(key)) === -1) throw new Error('Unknown setting: ' + key);
  writeSetting_(key, String(!!value));
  safeLog_([{ user: 'Admin', action: 'Settings', report: 'Admin', item: 'Previous months edit permission', details: value ? 'Allowed for users' : 'Locked for users' }]);
  return true;
}

// ---- Signatures (shown under Monthly Sales Summary & Employee Salary) ----
function saveSignatureConfig(json) {
  var list = JSON.parse(String(json || '[]'));
  if (!Array.isArray(list) || list.length > 8) throw new Error('Signature list must have 0 to 8 entries.');
  var clean = list.map(function (g) {
    var r = {
      label: String(g.label || '').slice(0, 80),
      name: String(g.name || '').slice(0, 80),
      designation: String(g.designation || '').slice(0, 80)
    };
    if (!r.name) throw new Error('Every signature needs a name.');
    if (g.sign) r.sign = String(g.sign).slice(0, 80);
    return r;
  });
  writeSetting_('signature_config', JSON.stringify(clean));
  safeLog_([{ action: 'Settings', report: 'Settings · Signature Setup', item: clean.length + ' signatures', details: clean.map(function (g) { return g.label + ': ' + g.name; }).join('; ') }]);
  return true;
}

// ---- Admin PIN (4 to 8 digits). Stored only as a SHA-256 hash; default 2026 when never changed. ----
function sha256Hex_(s) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(s), Utilities.Charset.UTF_8);
  return bytes.map(function (x) {
    var v = (x < 0 ? x + 256 : x).toString(16);
    return v.length === 1 ? '0' + v : v;
  }).join('');
}

function changeAdminPin(oldPin, newPin) {
  oldPin = String(oldPin || '');
  newPin = String(newPin || '');
  if (!/^\d{4,8}$/.test(newPin)) throw new Error('Admin PIN must be 4 to 8 digits.');
  if (newPin.indexOf('2019') === 0) throw new Error('Admin PIN cannot start with 2019 (reserved for the user PIN).');
  var s = readSettings_();
  var current = s.admin_pin_hash ? String(s.admin_pin_hash) : sha256Hex_('scs|2026');
  if (sha256Hex_('scs|' + oldPin) !== current) throw new Error('Current admin PIN is wrong.');
  var h = sha256Hex_('scs|' + newPin);
  writeSetting_('admin_pin_hash', h);
  writeSetting_('admin_pin_len', String(newPin.length));
  safeLog_([{ user: 'Admin', action: 'Settings', report: 'Admin', item: 'Admin PIN changed', details: 'New length: ' + newPin.length }]);
  return { hash: h, len: newPin.length };
}


function saveSelectedSong(songId) {
  writeSetting_('selected_song_id', songId || '');
  return true;
}

function saveMusicSetting(url) {
  url = String(url || '').trim();
  writeSetting_('music_custom_url', url);
  if (url) writeSetting_('music_file_id', '');     // নতুন লিংক দিলে আপলোড করা ফাইল বাদ
  return true;
}

/** প্লেয়ার এই ফাংশন দিয়ে আপলোড করা গান data-URL হিসেবে নেয় */
function getMusicDataUrl() {
  var s = readSettings_();
  if (!s.music_file_id) return '';
  try {
    var blob = DriveApp.getFileById(String(s.music_file_id)).getBlob();
    return 'data:' + (blob.getContentType() || 'audio/mpeg') + ';base64,' + Utilities.base64Encode(blob.getBytes());
  } catch (e) { return ''; }
}

/* ---------------------------------------------------------------------
 *  INTEGRATION CONFIG (শিট URL, ট্যাবের নাম)
 * ------------------------------------------------------------------- */
function getIntegrationConfig() {
  var cfg = {
    sheetUrl: '',
    tabName: SCS.DEFAULT_ORDER_TAB,
    attendanceTab: SCS.DEFAULT_ATT_TAB,
    autoSync: false
  };
  try {
    var s = readSettings_();
    if (s.integration_config) {
      var saved = JSON.parse(String(s.integration_config));
      Object.keys(saved).forEach(function (k) { cfg[k] = saved[k]; });
    }
  } catch (e) {}
  return cfg;
}

function saveIntegrationConfig(cfg) {
  cfg = cfg || {};
  var clean = {
    sheetUrl: String(cfg.sheetUrl || '').trim(),
    tabName: String(cfg.tabName || SCS.DEFAULT_ORDER_TAB).trim(),
    attendanceTab: String(cfg.attendanceTab || SCS.DEFAULT_ATT_TAB).trim(),
    autoSync: !!cfg.autoSync
  };
  // স্ক্রিপ্ট যদি শিটের সাথে যুক্ত না থাকে (standalone), তখন এই URL-ই ডাটাবেজ শিট
  var active = null;
  try { active = SpreadsheetApp.getActiveSpreadsheet(); } catch (e) {}
  if (!active && clean.sheetUrl) {
    var m = clean.sheetUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (!m) throw new Error('সঠিক Google Sheet URL দিন।');
    PropertiesService.getScriptProperties().setProperty('DB_SPREADSHEET_ID', m[1]);
  }
  setupDatabase();
  writeSetting_('integration_config', JSON.stringify(clean));
  safeLog_([{ action: 'Settings', report: 'Admin', item: 'Google Sheet integration', details: 'tab=' + clean.tabName + '; attendance=' + clean.attendanceTab + (clean.sheetUrl ? '; url set' : '') }]);
  return clean;
}

/* ---------------------------------------------------------------------
 *  MANUAL DATA (মাসভিত্তিক JSON, বড় হলে ভাগ করে সেভ)
 * ------------------------------------------------------------------- */
/* ---------------------------------------------------------------------
 *  LIVE SYNC (অন্য ইউজারের পরিবর্তন অটো দেখানোর জন্য হালকা ফাংশন)
 * ------------------------------------------------------------------- */
/** প্রতিটি মাসের "সংস্করণ" (শেষ আপডেট সময় + চাঙ্ক সংখ্যা) — শুধু ২টি কলাম পড়ে, তাই খুব হালকা */
function getManualRevisions() {
  var sh = ensureSheet_(getHome_(), SCS.SHEET_MANUAL, ['MonthKey', 'Chunk', 'Data (JSON)', 'UpdatedAt']);
  var last = sh.getLastRow();
  var out = {};
  if (last < 2) return out;
  var keys = sh.getRange(2, 1, last - 1, 1).getValues();
  var upd = sh.getRange(2, 4, last - 1, 1).getValues();
  var tmp = {};
  for (var i = 0; i < keys.length; i++) {
    var mk = String(keys[i][0] || '').trim();
    if (!mk) continue;
    var u = String(upd[i][0] || '');
    var o = tmp[mk] || (tmp[mk] = { u: '', n: 0 });
    if (u > o.u) o.u = u;
    o.n++;
  }
  Object.keys(tmp).forEach(function (k) { out[k] = tmp[k].u + '#' + tmp[k].n; });
  return out;
}

/** একটি মাসের সেভ করা ডাটা + তার সংস্করণ */
function getManualMonthData(monthKey) {
  monthKey = String(monthKey || '').trim();
  var sh = ensureSheet_(getHome_(), SCS.SHEET_MANUAL, ['MonthKey', 'Chunk', 'Data (JSON)', 'UpdatedAt']);
  var last = sh.getLastRow();
  if (last < 2) return { rev: '', data: null };
  var vals = sh.getRange(2, 1, last - 1, 4).getValues();
  var parts = [], u = '';
  vals.forEach(function (r) {
    if (String(r[0] || '').trim() !== monthKey) return;
    parts.push({ n: Number(r[1]) || 0, d: String(r[2] || '') });
    var x = String(r[3] || '');
    if (x > u) u = x;
  });
  if (!parts.length) return { rev: '', data: null };
  parts.sort(function (a, b) { return a.n - b.n; });
  var obj = null;
  try { obj = JSON.parse(parts.map(function (p) { return p.d; }).join('')); } catch (e) { obj = null; }
  return { rev: u + '#' + parts.length, data: (obj && typeof obj === 'object') ? obj : null };
}

/** প্রথম লোডের জন্য: সব মাসের ডাটা + সংস্করণ একসাথে (সংস্করণ আগে পড়া হয়, তাই কোনো পরিবর্তন মিস হয় না) */
function getManualAppStateRev() {
  var revs = getManualRevisions();
  return { __rev: 1, state: getManualAppState(), revs: revs };
}

/** হালকা সেটিংস (লোগো ছাড়া) — সিগনেচার, অ্যাডমিন পিন, এডিট পারমিশন */
function getLiveSettings() {
  var s = readSettings_();
  return {
    allowUserEditPreviousMonths: String(s.allowUserEditPreviousMonths).toLowerCase() === 'true',
    signature_config: s.signature_config ? String(s.signature_config) : '',
    admin_pin_hash: s.admin_pin_hash ? String(s.admin_pin_hash) : '',
    admin_pin_len: s.admin_pin_len ? String(s.admin_pin_len) : ''
  };
}

function getManualAppState() {
  var sh = ensureSheet_(getHome_(), SCS.SHEET_MANUAL, ['MonthKey', 'Chunk', 'Data (JSON)', 'UpdatedAt']);
  var last = sh.getLastRow();
  var out = {};
  if (last < 2) return out;
  var vals = sh.getRange(2, 1, last - 1, 3).getValues();
  var byMonth = {};
  vals.forEach(function (r) {
    var mk = String(r[0] || '').trim();
    if (!mk) return;
    (byMonth[mk] = byMonth[mk] || []).push({ n: Number(r[1]) || 0, d: String(r[2] || '') });
  });
  Object.keys(byMonth).forEach(function (mk) {
    var parts = byMonth[mk].sort(function (a, b) { return a.n - b.n; });
    var json = parts.map(function (p) { return p.d; }).join('');
    try {
      var obj = JSON.parse(json);
      if (obj && typeof obj === 'object') out[mk] = obj;
    } catch (e) { /* নষ্ট হলে DB_History থেকে উদ্ধার করা যাবে */ }
  });
  return out;
}

function saveManualMonthData(monthKey, jsonString, meta) {
  monthKey = String(monthKey || '').trim();
  if (!/^\d{4}-\d{2}$/.test(monthKey)) throw new Error('Invalid month key: ' + monthKey);
  jsonString = String(jsonString || '');
  var parsed = JSON.parse(jsonString);           // অবৈধ JSON হলে সেভ হবে না
  if (!parsed || typeof parsed !== 'object') throw new Error('Invalid data');
  parsed.monthKey = monthKey;
  jsonString = JSON.stringify(parsed);

  var chunks = [];
  for (var i = 0; i < jsonString.length; i += SCS.CHUNK_SIZE) {
    chunks.push(jsonString.substr(i, SCS.CHUNK_SIZE));
  }
  if (!chunks.length) chunks.push('{}');

  return withLock_(function () {
    var ss = getHome_();
    var sh = ensureSheet_(ss, SCS.SHEET_MANUAL, ['MonthKey', 'Chunk', 'Data (JSON)', 'UpdatedAt']);
    var last = sh.getLastRow();
    var rows = [];
    if (last >= 2) {
      var keys = sh.getRange(2, 1, last - 1, 1).getValues();
      for (var i2 = 0; i2 < keys.length; i2++) {
        if (String(keys[i2][0]).trim() === monthKey) rows.push(i2 + 2);
      }
    }
    // কিছু বদলায়নি হলে আবার লেখার দরকার নেই
    var old = rows.map(function (r) { return String(sh.getRange(r, 3).getValue()); });
    if (rows.length === chunks.length && chunks.every(function (c2, i) { return c2 === old[i]; })) {
      return { ok: true, monthKey: monthKey, chunks: chunks.length, unchanged: true, savedAt: new Date().toISOString() };
    }
    // অ্যাক্টিভিটি লগ: আগের ও নতুন ডাটার পার্থক্য
    var logRows = [];
    try {
      var oldObj = null;
      try { oldObj = old.length ? JSON.parse(old.join('')) : null; } catch (e0) { oldObj = null; }
      var m = (meta && typeof meta === 'object') ? meta : {};
      logRows = diffMonth_(monthKey, oldObj || {}, parsed, { user: String(m.user || ''), device: String(m.device || ''), notes: m.notes });
    } catch (e1) { logRows = []; }
    // পুরনো ভার্সনের ব্যাকআপ (থ্রটল করা)
    try { snapshotMonth_(ss, sh, monthKey, rows); } catch (e) {}

    var now = new Date().toISOString();
    var appendRows = [];
    chunks.forEach(function (c2, idx) {
      if (idx < rows.length) {
        if (c2 !== old[idx] || true) {
          sh.getRange(rows[idx], 1, 1, 4).setNumberFormat('@').setValues([[monthKey, String(idx), c2, now]]);
        }
      } else {
        appendRows.push([monthKey, String(idx), c2, now]);
      }
    });
    if (appendRows.length) {
      var start = sh.getLastRow() + 1;
      sh.getRange(start, 1, appendRows.length, 4).setNumberFormat('@').setValues(appendRows);
    }
    for (var k = chunks.length; k < rows.length; k++) {
      sh.getRange(rows[k], 1, 1, 4).clearContent();   // অতিরিক্ত পুরনো চাঙ্ক খালি
    }
    safeLog_(logRows);
    SpreadsheetApp.flush();
    return { ok: true, monthKey: monthKey, chunks: chunks.length, savedAt: now, rev: now + '#' + chunks.length };
  });
}

/** সব ম্যানুয়াল ডাটা মুছে না ফেলে DB_History-তে সরিয়ে রাখে (ডাটা হারাবে না) */
function clearManualAppState() {
  return withLock_(function () {
    var ss = getHome_();
    var sh = ensureSheet_(ss, SCS.SHEET_MANUAL, ['MonthKey', 'Chunk', 'Data (JSON)', 'UpdatedAt']);
    var hist = ensureSheet_(ss, SCS.SHEET_HISTORY, ['SavedAt', 'MonthKey', 'Chunk', 'Data (JSON)']);
    var last = sh.getLastRow();
    if (last >= 2) {
      var vals = sh.getRange(2, 1, last - 1, 3).getValues().filter(function (r) { return r[0] !== ''; });
      var stamp = new Date().toISOString() + ' (before reset)';
      if (vals.length) {
        var out = vals.map(function (r) { return [stamp, r[0], r[1], r[2]]; });
        var start = hist.getLastRow() + 1;
        hist.getRange(start, 1, out.length, 4).setNumberFormat('@').setValues(out);
      }
      sh.getRange(2, 1, last - 1, 4).clearContent();
    }
    trimHistory_(hist);
    safeLog_([{ user: 'Admin', action: 'Reset', report: 'Admin', item: 'All manual data reset', details: 'Old data moved to DB_History' }]);
    return true;
  });
}

function backupNow() {
  var ss = getHome_();
  var sh = ensureSheet_(ss, SCS.SHEET_MANUAL, ['MonthKey', 'Chunk', 'Data (JSON)', 'UpdatedAt']);
  var hist = ensureSheet_(ss, SCS.SHEET_HISTORY, ['SavedAt', 'MonthKey', 'Chunk', 'Data (JSON)']);
  var last = sh.getLastRow();
  if (last < 2) return 0;
  var vals = sh.getRange(2, 1, last - 1, 3).getValues().filter(function (r) { return r[0] !== ''; });
  var stamp = new Date().toISOString() + ' (manual backup)';
  if (vals.length) {
    var out = vals.map(function (r) { return [stamp, r[0], r[1], r[2]]; });
    hist.getRange(hist.getLastRow() + 1, 1, out.length, 4).setNumberFormat('@').setValues(out);
  }
  trimHistory_(hist);
  return vals.length;
}

function snapshotMonth_(ss, sh, monthKey, rows) {
  if (!rows.length) return;
  var hist = ensureSheet_(ss, SCS.SHEET_HISTORY, ['SavedAt', 'MonthKey', 'Chunk', 'Data (JSON)']);
  var hl = hist.getLastRow();
  if (hl >= 2) {
    // এই মাসের শেষ ব্যাকআপ কখন?
    var hv = hist.getRange(2, 1, hl - 1, 2).getValues();
    for (var i = hv.length - 1; i >= 0; i--) {
      if (String(hv[i][1]) === monthKey) {
        var t = new Date(String(hv[i][0]).substr(0, 24));
        if (!isNaN(t.getTime()) && (Date.now() - t.getTime()) < SCS.HISTORY_MIN_GAP_MIN * 60000) return;
        break;
      }
    }
  }
  var stamp = new Date().toISOString();
  var out = rows.map(function (r) {
    var v = sh.getRange(r, 1, 1, 3).getValues()[0];
    return [stamp, v[0], v[1], v[2]];
  });
  hist.getRange(hist.getLastRow() + 1, 1, out.length, 4).setNumberFormat('@').setValues(out);
  trimHistory_(hist);
}

function trimHistory_(hist) {
  var last = hist.getLastRow();
  var extra = (last - 1) - SCS.HISTORY_MAX_ROWS;
  if (extra > 0) hist.deleteRows(2, extra);
}

/* ---------------------------------------------------------------------
 *  সম্পূর্ণ ব্যাকআপ / রিস্টোর (JSON) — সেটিংসের অংশ
 *  মাসভিত্তিক ডাটা অ্যাপ নিজেই এক্সপোর্ট/রিস্টোর করে; এই দুটি ফাংশন সেটিংস ও লোগো আনে/ফেরায়।
 * ------------------------------------------------------------------- */
/** ব্যাকআপের জন্য সব সেটিংস + লোগো (ডাটা-URL) */
function getBackupSettings() {
  var s = readSettings_(), out = {};
  Object.keys(s).forEach(function (k) {
    if (k !== 'selftest_ping') out[k] = String(s[k] == null ? '' : s[k]);
  });
  var logo = '';
  if (s.logo_file_id) {
    try {
      var blob = DriveApp.getFileById(String(s.logo_file_id)).getBlob();
      logo = 'data:' + blob.getContentType() + ';base64,' + Utilities.base64Encode(blob.getBytes());
    } catch (e) { logo = ''; }
  }
  return { settings: out, logo_data_url: logo, exportedAt: new Date().toISOString() };
}

/**
 * ব্যাকআপ ফাইল থেকে সেটিংস ফেরানো।
 * json = {"settings":{...},"logo":"data:image/..."}; applyPin=true হলে ফাইলের অ্যাডমিন PIN-ও ফেরে।
 * Drive-এর ফাইল আইডি (লোগো/গান) শুধু তখনই ফেরে যখন ফাইলটি Drive-এ এখনো আছে।
 */
function restoreAppSettings(json, applyPin) {
  var pack = JSON.parse(String(json || '{}'));
  var src = (pack && pack.settings && typeof pack.settings === 'object') ? pack.settings : {};
  var skip = { selftest_ping: 1, logo_file_id: 1, music_file_id: 1 };
  if (!applyPin) { skip.admin_pin_hash = 1; skip.admin_pin_len = 1; }
  var written = 0, skipped = [];
  Object.keys(src).forEach(function (k) {
    if (!k || skip[k]) { skipped.push(k); return; }
    var v = String(src[k] == null ? '' : src[k]);
    if (k === 'admin_pin_hash' && !/^[0-9a-f]{64}$/.test(v)) { skipped.push(k); return; }
    if (k === 'admin_pin_len' && !/^[4-8]$/.test(v)) { skipped.push(k); return; }
    writeSetting_(k, v);
    written++;
  });
  var logoOk = false;
  ['logo_file_id', 'music_file_id'].forEach(function (k) {
    var id = String(src[k] || '').trim();
    if (!id) return;
    try {
      var f = DriveApp.getFileById(id);
      if (!f.isTrashed()) { writeSetting_(k, id); written++; if (k === 'logo_file_id') logoOk = true; }
    } catch (e) { skipped.push(k); }
  });
  var logo = logoOk ? 'restored' : 'none';
  var dataUrl = String(pack.logo || '');
  if (!logoOk && /^data:image\//.test(dataUrl)) {
    try { saveLogoDataUrl(dataUrl, 'scs-logo'); logo = 'restored'; written++; }
    catch (e) { logo = 'skipped: ' + (e && e.message ? e.message : e); }
  }
  safeLog_([{ user: 'Admin', action: 'Restore', report: 'Admin', item: 'Settings restored from backup', details: 'written=' + written }]);
  return { ok: true, written: written, skipped: skipped, logo: logo };
}

/* ---------------------------------------------------------------------
 *  লোগো ও গান (Drive-এ ফাইল, আইডি শিটে)
 * ------------------------------------------------------------------- */
/**
 * Drive-এ ফাইল (লোগো, গান ইত্যাদি) শুধু Admin-এ দেওয়া ফোল্ডার আইডির ভেতরেই সেভ হয়।
 * কোড নিজে থেকে Drive-এর অন্য কোথাও কোনো ফোল্ডার বানায় না।
 */
function getFilesFolder_() {
  var id = String(readSettings_().drive_folder_id || '').trim();
  if (!id) {
    throw new Error('Drive ফোল্ডার সেট করা নেই। Admin → Backup & Reset পেজের "Drive Folder Setup"-এ ফোল্ডার আইডি দিয়ে সেভ করুন।');
  }
  try {
    return DriveApp.getFolderById(id);
  } catch (e) {
    throw new Error('Drive ফোল্ডারটি খোলা যাচ্ছে না। আইডি ঠিক আছে কি না এবং এই অ্যাকাউন্টের অ্যাক্সেস আছে কি না দেখুন।');
  }
}

function getDriveFolderConfig() {
  var id = String(readSettings_().drive_folder_id || '').trim();
  var out = { folderId: id, folderName: '' };
  if (id) { try { out.folderName = DriveApp.getFolderById(id).getName(); } catch (e) { out.folderName = ''; } }
  return out;
}

/** ফোল্ডার আইডি বা ফোল্ডারের পুরো লিংক - দুটোই চলবে। ফাঁকা দিলে সেটিং মুছে যায়। */
function saveDriveFolderId(input) {
  var raw = String(input || '').trim();
  if (!raw) { writeSetting_('drive_folder_id', ''); return { folderId: '', folderName: '' }; }
  var m = raw.match(/\/folders\/([a-zA-Z0-9_-]+)/) || raw.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  var id = m ? m[1] : raw;
  if (!/^[a-zA-Z0-9_-]{10,}$/.test(id)) throw new Error('ফোল্ডার আইডি সঠিক নয়।');
  var folder;
  try { folder = DriveApp.getFolderById(id); }
  catch (e) { throw new Error('ফোল্ডার খোলা যায়নি (' + e.message + ')। আইডি ঠিক আছে কি না এবং এই অ্যাকাউন্টের অ্যাক্সেস/Drive অনুমতি আছে কি না দেখুন।'); }
  writeSetting_('drive_folder_id', id);
  safeLog_([{ user: 'Admin', action: 'Settings', report: 'Admin', item: 'Drive folder', details: folder.getName() }]);
  return { folderId: id, folderName: folder.getName() };
}

function saveLogoDataUrl(dataUrl, fileName, mimeType) {
  var m = String(dataUrl || '').match(/^data:([^;]+);base64,(.+)$/);
  if (!m) throw new Error('Invalid image data');
  var mime = mimeType || m[1];
  if (!/^image\/(png|jpeg|jpg|webp|svg\+xml)$/i.test(mime)) throw new Error('Unsupported image type');
  var blob = Utilities.newBlob(Utilities.base64Decode(m[2]), mime, fileName || 'scs-logo');
  var folder = getFilesFolder_();
  var s = readSettings_();
  var file = folder.createFile(blob);
  writeSetting_('logo_file_id', file.getId());
  safeLog_([{ user: 'Admin', action: 'Settings', report: 'Admin', item: 'Logo changed', details: String(fileName || '') }]);
  if (s.logo_file_id) { try { DriveApp.getFileById(String(s.logo_file_id)).setTrashed(true); } catch (e) {} }
  return { dataUrl: dataUrl, fileId: file.getId() };
}

function saveMusicFile(fileName, base64, mimeType) {
  if (!base64) throw new Error('Empty audio');
  var blob = Utilities.newBlob(Utilities.base64Decode(base64), mimeType || 'audio/mpeg', fileName || 'scs-audio');
  var file = getFilesFolder_().createFile(blob);
  var s = readSettings_();
  writeSetting_('music_file_id', file.getId());
  safeLog_([{ user: 'Admin', action: 'Settings', report: 'Admin', item: 'Music file uploaded', details: String(fileName || '') }]);
  writeSetting_('music_custom_url', '');           // আপলোড করা ফাইলই এখন সক্রিয়
  if (s.music_file_id) { try { DriveApp.getFileById(String(s.music_file_id)).setTrashed(true); } catch (e) {} }
  return { url: 'drive:' + file.getId(), fileId: file.getId() };
}

/* ---------------------------------------------------------------------
 *  লাইভ ডাটা: SCS Order + Employee Attendance
 * ------------------------------------------------------------------- */
function getLiveReportData(sheetUrl, tabName, monthKey) {
  var cfg = getIntegrationConfig();
  // অর্ডার: URL দেওয়া থাকলে সোর্স শিট থেকে, ফাঁকা থাকলে যে শিটে ডিপ্লয় করা সেই শিটের "SCS Order" ট্যাব থেকে
  var url = (sheetUrl === undefined || sheetUrl === null) ? cfg.sheetUrl : String(sheetUrl);
  var orderSs = openSource_(url);
  var orderTab = String(tabName || cfg.tabName || SCS.DEFAULT_ORDER_TAB);
  var attTab = String(cfg.attendanceTab || SCS.DEFAULT_ATT_TAB);

  var attendance = [], attendanceError = '';
  try {
    // অ্যাটেনডেন্স সবসময় ডিপ্লয় করা শিট থেকে (সোর্স শিট থেকে নয়)
    attendance = readAttendance_(getHome_(), attTab, monthKey);
  } catch (e) { attendanceError = String(e && e.message ? e.message : e); }

  return {
    orders: readOrders_(orderSs, orderTab),
    attendance: attendance,
    attendanceError: attendanceError,
    fetchedAt: new Date().toISOString()
  };
}

function getEmployeeAttendanceData(monthKey) {
  var cfg = getIntegrationConfig();
  return readAttendance_(getHome_(), String(cfg.attendanceTab || SCS.DEFAULT_ATT_TAB), monthKey);
}

function openSource_(url) {
  url = String(url || '').trim();
  if (url) {
    var m = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (m) return SpreadsheetApp.openById(m[1]);
    return SpreadsheetApp.openByUrl(url);
  }
  return getHome_();
}

function norm_(s) { return String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9]/g, ''); }

function num_(v) {
  if (typeof v === 'number') return isFinite(v) ? v : 0;
  var n = parseFloat(String(v == null ? '' : v).replace(/[^0-9.\-]/g, ''));
  return isFinite(n) ? n : 0;
}

/* ---- অর্ডার পড়া (হেডার নাম দিয়ে ম্যাপ, না পেলে কলাম ক্রম দিয়ে) ---- */
function readOrders_(ss, tabName) {
  var sh = ss.getSheetByName(tabName);
  if (!sh) throw new Error('"' + tabName + '" নামে ট্যাব পাওয়া যায়নি।');
  var lastRow = sh.getLastRow(), lastCol = sh.getLastColumn();
  if (lastRow < 2 || lastCol < 1) return [];
  var range = sh.getRange(1, 1, lastRow, lastCol);
  var raw = range.getValues();
  var disp = range.getDisplayValues();
  var tz = Session.getScriptTimeZone() || 'Asia/Dhaka';

  var headerRow = -1;
  for (var r = 0; r < Math.min(raw.length, 15); r++) {
    var hasOrderNo = false;
    for (var c = 0; c < raw[r].length; c++) { if (norm_(raw[r][c]) === 'orderno') { hasOrderNo = true; break; } }
    if (hasOrderNo) { headerRow = r; break; }
  }
  if (headerRow < 0) throw new Error('"' + tabName + '" ট্যাবে "Order No" হেডার পাওয়া যায়নি।');

  // মানসম্মত কলাম ক্রম (আপনার শিটের স্যাম্পল অনুযায়ী) - হেডার না মিললে এটি ব্যবহৃত হবে
  var spec = [
    ['timestamp', ['timestamp'], 0],
    ['orderNo', ['orderno'], 1],
    ['deliveryDateTime', ['deliverytimedate', 'deliverytime', 'deliverydate', 'delivery'], 2],
    ['clientOrProjectName', ['clientorprojectname', 'clientname', 'client'], 3],
    ['mobileNumber', ['mobilenumber', 'mobile', 'phone'], 4],
    ['address', ['address'], 5],
    ['productName', ['productname', 'product'], 6],
    ['quantity', ['quantity', 'qty'], 7],
    ['unit', ['unit'], 8],
    ['packSize', ['packsize'], 9],
    ['unitPrice', ['unitprice'], 10],
    ['discountUnitPrice', ['discountunitprice'], 11],
    ['totalPrice', ['totalprice'], 12],
    ['specialPrice', ['specialprice'], 13],
    ['transportFee', ['transportfee'], 14],
    ['scsTransportCost', ['scstransportcost'], 15],
    ['orderBy', ['orderby'], 16],
    ['engineerCommissionPerUnit', ['engineercommissionperunit'], 17],
    ['contractorCommissionPerUnit', ['contractorcommissionperunit'], 18],
    ['commissionHolderName', ['commissionholdername'], 19],
    ['totalCommission', ['totalcommission'], 20],
    ['smsStatus', ['smsstatus'], 21],
    ['pdfStatus', ['pdfstatus'], 22]
  ];
  var hdr = raw[headerRow].map(norm_);
  var col = {};
  spec.forEach(function (s) {
    var idx = -1;
    for (var i = 0; i < s[1].length && idx < 0; i++) idx = hdr.indexOf(s[1][i]);
    col[s[0]] = idx >= 0 ? idx : (s[2] < lastCol ? s[2] : -1);
  });

  function text(rowIdx, key) { var c = col[key]; return c < 0 ? '' : String(disp[rowIdx][c] || '').trim(); }
  function numeric(rowIdx, key) { var c = col[key]; return c < 0 ? 0 : num_(raw[rowIdx][c] !== '' ? raw[rowIdx][c] : disp[rowIdx][c]); }
  function dateText(rowIdx, key, withSeconds) {
    var c = col[key]; if (c < 0) return '';
    var v = raw[rowIdx][c];
    if (v instanceof Date) {
      var hasTime = v.getHours() || v.getMinutes() || v.getSeconds();
      return Utilities.formatDate(v, tz, withSeconds ? 'yyyy-MM-dd HH:mm:ss' : (hasTime ? 'yyyy-MM-dd HH:mm' : 'yyyy-MM-dd'));
    }
    return String(disp[rowIdx][c] || '').trim();
  }

  var orders = [], seen = {};
  for (var i2 = headerRow + 1; i2 < raw.length; i2++) {
    var orderNo = text(i2, 'orderNo');
    var product = text(i2, 'productName');
    if (!orderNo && !product) continue;                       // ফাঁকা সারি বাদ
    var key = orderNo ? orderNo.toLowerCase() : ('row' + (i2 + 1));
    seen[key] = (seen[key] || 0) + 1;                          // একই অর্ডারে একাধিক প্রোডাক্ট
    orders.push({
      id: 'ord_' + (orderNo || ('row' + (i2 + 1))) + '_' + seen[key],
      sheetRow: i2 + 1,
      timestamp: dateText(i2, 'timestamp', true),
      orderNo: orderNo,
      deliveryDateTime: dateText(i2, 'deliveryDateTime', false),
      clientOrProjectName: text(i2, 'clientOrProjectName'),
      mobileNumber: text(i2, 'mobileNumber'),
      address: text(i2, 'address'),
      productName: product,
      quantity: numeric(i2, 'quantity'),
      unit: text(i2, 'unit'),
      packSize: text(i2, 'packSize'),
      unitPrice: numeric(i2, 'unitPrice'),
      discountUnitPrice: numeric(i2, 'discountUnitPrice'),
      totalPrice: numeric(i2, 'totalPrice'),
      specialPrice: numeric(i2, 'specialPrice'),
      transportFee: numeric(i2, 'transportFee'),
      scsTransportCost: numeric(i2, 'scsTransportCost'),
      orderBy: text(i2, 'orderBy'),
      engineerCommissionPerUnit: numeric(i2, 'engineerCommissionPerUnit'),
      contractorCommissionPerUnit: numeric(i2, 'contractorCommissionPerUnit'),
      commissionHolderName: text(i2, 'commissionHolderName'),
      totalCommission: numeric(i2, 'totalCommission'),
      smsStatus: text(i2, 'smsStatus'),
      pdfStatus: text(i2, 'pdfStatus')
    });
  }
  return orders;
}

/* ---- অ্যাটেনডেন্স পড়া (একই ট্যাবে মাসভিত্তিক স্তূপ করা টেবিল) ---- */
var MONTH_MAP_ = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12
};
var MONTH_RE_ = /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b[\s,\-\/]*(20\d{2})\b/i;

function readAttendance_(ss, tabName, monthKey) {
  var sh = ss.getSheetByName(tabName);
  if (!sh) throw new Error('ডিপ্লয় করা শিটে "' + tabName + '" নামে অ্যাটেনডেন্স ট্যাব পাওয়া যায়নি।');
  var lastRow = sh.getLastRow(), lastCol = sh.getLastColumn();
  if (lastRow < 1 || lastCol < 1) return [];
  var vals = sh.getRange(1, 1, lastRow, lastCol).getDisplayValues();

  var byMonth = {};
  var curMonth = '';
  var cols = null;
  var inTable = false;

  for (var r = 0; r < vals.length; r++) {
    var row = vals[r];
    var nonEmpty = row.filter(function (x) { return String(x).trim() !== ''; });
    if (!nonEmpty.length) { inTable = false; continue; }
    var joined = nonEmpty.join(' ');

    // টাইটেল সারি: যেমন "EMPLOYEE ATTENDANCE SUMMARY - OCTOBER 2026"
    if (nonEmpty.length <= 2) {
      var tm = joined.match(MONTH_RE_);
      if (tm) {
        var mm = MONTH_MAP_[tm[1].toLowerCase().substr(0, 3)];
        curMonth = tm[2] + '-' + ('0' + mm).slice(-2);
        cols = null; inTable = false;
        continue;
      }
    }

    // হেডার সারি
    var h = row.map(norm_);
    var iEmp = h.indexOf('empid'), iName = h.indexOf('employeename');
    if (iEmp >= 0 && iName >= 0) {
      cols = {
        sl: h.indexOf('sl') >= 0 ? h.indexOf('sl') : h.indexOf('slno'),
        name: iName, empId: iEmp,
        designation: h.indexOf('designation'),
        present: h.indexOf('present'),
        absent: h.indexOf('absent'),
        late: h.indexOf('latedays') >= 0 ? h.indexOf('latedays') : h.indexOf('late'),
        rate: h.indexOf('attendancerate')
      };
      inTable = !!curMonth;
      continue;
    }

    if (inTable && cols && curMonth) {
      var sl = cols.sl >= 0 ? String(row[cols.sl]).trim() : '1';
      var name = String(row[cols.name] || '').trim();
      var empId = String(row[cols.empId] || '').trim();
      if (/^\d+$/.test(sl) && (name || empId)) {
        (byMonth[curMonth] = byMonth[curMonth] || []).push({
          slNo: Number(sl),
          empId: empId,
          name: name,
          designation: cols.designation >= 0 ? String(row[cols.designation] || '').trim() : '',
          totalPresent: cols.present >= 0 ? num_(row[cols.present]) : 0,
          totalAbsent: cols.absent >= 0 ? num_(row[cols.absent]) : 0,
          lateDays: cols.late >= 0 ? num_(row[cols.late]) : 0,
          attendanceRate: cols.rate >= 0 ? String(row[cols.rate] || '').trim() : '',
          lastLeaveDate: ''
        });
      } else {
        inTable = false;      // "Total & Average" সারিতে টেবিল শেষ
      }
    }
  }

  var key = String(monthKey || '').trim();
  return byMonth[key] || [];
}

/**
 * ১) নতুন ভার্সন ডিপ্লয়ের আগে এডিটর থেকে একবার এই ফাংশন Run করে সব অনুমতি (Sheet + Drive) দিন।
 */
function authorizeAll() {
  var ss = getHome_();
  DriveApp.getRootFolder().getName();
  LockService.getScriptLock();
  PropertiesService.getScriptProperties();
  ScriptApp.getProjectTriggers();
  setupDatabase();
  ensureAutoBackup_();
  return 'Authorized: ' + ss.getName() + ' | Auto backup trigger: ' + (abTriggerExists_() ? 'ON' : 'OFF');
}

/**
 * ২) সেভ / Drive ঠিক আছে কি না যাচাই করতে এডিটর থেকে Run করুন, তারপর View > Logs দেখুন।
 */
function selfTest() {
  var out = [];
  try { out.push('DB sheet OK: ' + getHome_().getName()); } catch (e) { out.push('DB sheet FAIL: ' + e.message); }
  try { setupDatabase(); writeSetting_('selftest_ping', new Date().toISOString()); out.push('Write to DB sheet OK'); } catch (e) { out.push('Write FAIL: ' + e.message); }
  try { DriveApp.getRootFolder().getName(); out.push('Drive permission OK'); } catch (e) { out.push('Drive permission FAIL: ' + e.message); }
  try { var f = getDriveFolderConfig(); out.push('Drive folder: ' + (f.folderName || 'NOT SET')); } catch (e) { out.push('Drive folder FAIL: ' + e.message); }
  Logger.log(out.join('\n'));
  return out.join('\n');
}

/* =====================================================================
 *  ACTIVITY LOG (শুধু দেখা যাবে — অ্যাপ থেকে মুছে ফেলার কোনো উপায় নেই)
 *  DB_ActivityLog শিটে প্রতিটি যোগ / এডিট / ডিলিট / সেটিংস পরিবর্তন জমা থাকে।
 * ===================================================================== */
var SCS_LOG = {
  SHEET: 'DB_ActivityLog',
  HEADERS: ['Time', 'User', 'Action', 'Report', 'Month', 'Item', 'Details', 'Device', 'Account'],
  MAX_RETURN: 5000,
  LIST_REPORT: {
    storeProducts: '7. Store Report', deletedProducts: '7. Store Report',
    collections: '4. Monthly Collection', previousDues: '5. Due Summary',
    commissions: '6. Monthly Commission', transportCosts: '8. Transport Cost',
    salaries: '9. Monthly Salary', loans: '9. Monthly Salary (Loan)',
    officeExpenses: '1. Monthly Sales Summary', cashInHand: '1. Monthly Sales Summary',
    scsEntries: 'Entry'
  },
  ENTRY_REPORT: { 1: '1. Monthly Sales Summary', 6: '6. Monthly Commission', 4: '4. Monthly Collection', 5: '5. Due Summary', 7: '7. Store Report', 8: '8. Transport Cost', 9: '9. Monthly Salary' },
  // অ্যাপ নিজে হিসাব করে এমন ঘর — এগুলোর পরিবর্তন লগে আসবে না
  COMPUTED: { slNo: 1, totalStock: 1, currentStock: 1, countPackSize: 1, totalSales: 1, totalAmount: 1, netPay: 1,
    monthlyDailyAllowanceAmount: 1, totalKm: 1, fuelQuantity: 1, perKmLtr: 1, perKmCost: 1, transportCost: 1,
    totalWorkingDays: 1, attendanceRate: 1, lastLeaveDate: 1, date: 1, remainingLoan: 1, totalDeductedSoFar: 1,
    previousStock: 1, isPreviousDue: 1, loanDeduction: 1, id: 1, monthKey: 1, designation: 1 },
  SKIP_LISTS: { orders: 1, attendances: 1, dues: 1, monthKey: 1, scsEntries: 1 },
  // সারির পরিচয় (নাম, আইডি) — নতুন অটো সারিতে এগুলো "পরিবর্তন" নয়
  IDENT: { productName: 1, packSize: 1, employeeId: 1, employeeName: 1, nameOfEmployee: 1, mobileNumber: 1, bankAccountNo: 1,
    registrationNo: 1, hasNoPackSize: 1, isRepackable: 1, rePack: 1, remark: 1, signature: 1 },
  AUTO_LISTS: { storeProducts: 1, salaries: 1, transportCosts: 1 }
};

function logSheet_() {
  return ensureSheet_(getHome_(), SCS_LOG.SHEET, SCS_LOG.HEADERS);
}

function actorEmail_() {
  try { return String(Session.getActiveUser().getEmail() || ''); } catch (e) { return ''; }
}

/** লগের সারি লেখা (ভেতরের ব্যবহার) */
function writeLogRows_(rows) {
  if (!rows || !rows.length) return;
  var sh = logSheet_();
  var email = actorEmail_();
  var now = new Date().toISOString();
  var out = rows.map(function (r) {
    return [r.time || now, String(r.user || ''), String(r.action || ''), String(r.report || ''), String(r.month || ''),
      String(r.item || '').slice(0, 300), String(r.details || '').slice(0, 2000), String(r.device || ''), String(r.account || email)];
  });
  sh.getRange(sh.getLastRow() + 1, 1, out.length, SCS_LOG.HEADERS.length).setNumberFormat('@').setValues(out);
}

function safeLog_(rows) { try { writeLogRows_(rows); } catch (e) { /* লগ লেখা ব্যর্থ হলে মূল কাজ থামবে না */ } }

/** অ্যাপ থেকে সরাসরি লগ (লগইন, লগআউট, এক্সপোর্ট, প্রিন্ট ইত্যাদি) */
function logActivity(entries) {
  var list = Array.isArray(entries) ? entries : [entries];
  var clean = [];
  list.slice(0, 50).forEach(function (e) {
    if (!e || typeof e !== 'object') return;
    clean.push({ user: e.user, action: e.action, report: e.report, month: e.month, item: e.item, details: e.details, device: e.device });
  });
  writeLogRows_(clean);
  return clean.length;
}

/** fromDate / toDate = 'YYYY-MM-DD' (ফাঁকা = সীমা নেই)। নতুনটি আগে। */
function getActivityLog(fromDate, toDate) {
  var sh = logSheet_();
  var last = sh.getLastRow();
  if (last < 2) return { rows: [], total: 0, truncated: false };
  var vals = sh.getRange(2, 1, last - 1, SCS_LOG.HEADERS.length).getValues();
  var tz = Session.getScriptTimeZone() || 'Asia/Dhaka';
  var from = String(fromDate || ''), to = String(toDate || '');
  var rows = [], total = 0;
  for (var i = vals.length - 1; i >= 0; i--) {
    var v = vals[i];
    if (v[0] === '' && v[2] === '') continue;
    var t = v[0] instanceof Date ? v[0] : new Date(String(v[0]));
    var day = isNaN(t.getTime()) ? String(v[0]).slice(0, 10) : Utilities.formatDate(t, tz, 'yyyy-MM-dd');
    if (from && day < from) continue;
    if (to && day > to) continue;
    total++;
    if (rows.length >= SCS_LOG.MAX_RETURN) continue;
    rows.push({
      time: isNaN(t.getTime()) ? String(v[0]) : t.toISOString(),
      local: isNaN(t.getTime()) ? String(v[0]) : Utilities.formatDate(t, tz, 'yyyy-MM-dd HH:mm:ss'),
      user: String(v[1]), action: String(v[2]), report: String(v[3]), month: String(v[4]),
      item: String(v[5]), details: String(v[6]), device: String(v[7]), account: String(v[8])
    });
  }
  return { rows: rows, total: total, truncated: total > rows.length };
}

/* ---- মাসের ডাটার আগের ও নতুন ভার্সন তুলনা করে লগ তৈরি ---- */
function isBlankish_(v) {
  return v === undefined || v === null || v === '' || v === 0 || v === '0' || v === false;
}
function sameVal_(a, b) {
  if (isBlankish_(a) && isBlankish_(b)) return true;
  if (typeof a === 'object' || typeof b === 'object') return JSON.stringify(a) === JSON.stringify(b);
  var na = Number(a), nb = Number(b);
  if (String(a).trim() !== '' && String(b).trim() !== '' && isFinite(na) && isFinite(nb)) return na === nb;
  return String(a) === String(b);
}
function showVal_(v) {
  if (v === undefined || v === null || v === '') return '—';
  if (typeof v === 'object') return JSON.stringify(v).slice(0, 120);
  return String(v);
}
function rowKey_(list, r) {
  if (!r || typeof r !== 'object') return '';
  if (list === 'storeProducts') return (String(r.productName || '').trim() + '|' + String(r.packSize || '').trim()).toLowerCase();
  if (list === 'salaries') return 'emp:' + norm_(r.employeeId || r.nameOfEmployee);
  if (list === 'transportCosts') return 'emp:' + norm_(r.employeeId || r.employeeName);
  if (list === 'commissions') return String(r.commKey || r.id || '');
  return String(r.id || r.orderNo || JSON.stringify(r).slice(0, 60));
}
function rowLabel_(list, r) {
  if (!r) return '';
  if (list === 'storeProducts') return String(r.productName || '') + (r.packSize ? ' (' + r.packSize + ')' : '');
  if (list === 'salaries') return String(r.nameOfEmployee || r.employeeId || '');
  if (list === 'transportCosts') return String(r.employeeName || r.employeeId || '');
  if (list === 'collections') return 'Order ' + String(r.orderNo || '') + ' · ' + String(r.collectionDate || '') + ' · ৳' + String(r.collectedAmount || 0);
  if (list === 'previousDues') return String(r.clientOrProjectName || '') + ' · ' + String(r.orderNo || '') + ' · ৳' + String(r.amount || 0);
  if (list === 'commissions') return String(r.commKey || '');
  if (list === 'scsEntries') return String(r.label || '') + ' · ' + String(r.fieldLabel || r.field || '') + ' · ' + String(r.value);
  return String(r.name || r.orderNo || r.id || '');
}
function fieldDiff_(a, b) {
  var keys = {}, out = [];
  Object.keys(a || {}).forEach(function (k) { keys[k] = 1; });
  Object.keys(b || {}).forEach(function (k) { keys[k] = 1; });
  Object.keys(keys).forEach(function (k) {
    if (SCS_LOG.COMPUTED[k]) return;
    if (!sameVal_((a || {})[k], (b || {})[k])) out.push(k + ': ' + showVal_((a || {})[k]) + ' → ' + showVal_((b || {})[k]));
  });
  return out;
}

function valList_(r) {
  var out = [];
  Object.keys(r || {}).forEach(function (k) {
    if (SCS_LOG.COMPUTED[k] || isBlankish_(r[k])) return;
    out.push(k + ': ' + showVal_(r[k]));
  });
  return out;
}

function diffMonth_(monthKey, oldObj, newObj, meta) {
  meta = meta || {};
  var rows = [];
  var base = { user: meta.user || '', month: monthKey, device: meta.device || '' };
  var add = function (action, report, item, details) {
    rows.push({ user: base.user, month: base.month, device: base.device, action: action, report: report, item: item, details: details });
  };
  oldObj = oldObj || {};
  newObj = newObj || {};
  var names = {};
  Object.keys(oldObj).forEach(function (k) { names[k] = 1; });
  Object.keys(newObj).forEach(function (k) { names[k] = 1; });
  Object.keys(names).forEach(function (name) {
    if (SCS_LOG.SKIP_LISTS[name]) return;
    var a = oldObj[name], b = newObj[name];
    var report = SCS_LOG.LIST_REPORT[name] || name;
    if (Array.isArray(a) || Array.isArray(b)) {
      a = Array.isArray(a) ? a : []; b = Array.isArray(b) ? b : [];
      if (name === 'deletedProducts') {
        b.forEach(function (k) { if (a.indexOf(k) < 0) add('Delete', report, String(k), 'Product removed from list'); });
        a.forEach(function (k) { if (b.indexOf(k) < 0) add('Restore', report, String(k), 'Product brought back'); });
        return;
      }
      var am = {}, bm = {};
      a.forEach(function (r) { var k = rowKey_(name, r); if (k) am[k] = r; });
      b.forEach(function (r) { var k = rowKey_(name, r); if (k) bm[k] = r; });
      var auto = !!SCS_LOG.AUTO_LISTS[name];
      Object.keys(bm).forEach(function (k) {
        var nr = bm[k], or = am[k];
        var rep = name === 'scsEntries' ? (SCS_LOG.ENTRY_REPORT[nr.rep] || 'Entry') : report;
        if (!or) {
          var meaningful = fieldDiff_({}, nr);
          if (auto) {
            if (!a.length) return;                   // মাসের প্রথম সেভ: অটো তৈরি সারি লগে নয়
            meaningful = meaningful.filter(function (x) { return !SCS_LOG.IDENT[x.split(':')[0]]; });
            if (!meaningful.length) return;          // অটো তৈরি খালি সারি
            add(name === 'storeProducts' ? 'Add' : 'Edit', rep, rowLabel_(name, nr), meaningful.join('; '));
            return;
          }
          add('Add', rep, rowLabel_(name, nr), valList_(nr).join('; '));
          return;
        }
        var d = fieldDiff_(or, nr);
        if (d.length) {
          var act = (name === 'collections' && nr.returned && !or.returned) ? 'Return' : 'Edit';
          add(act, rep, rowLabel_(name, nr), d.join('; '));
        }
      });
      Object.keys(am).forEach(function (k) {
        if (bm[k]) return;
        var or2 = am[k];
        if (auto && !fieldDiff_({}, or2).filter(function (x) { return !SCS_LOG.IDENT[x.split(':')[0]]; }).length) return;
        var rep2 = name === 'scsEntries' ? (SCS_LOG.ENTRY_REPORT[or2.rep] || 'Entry') : report;
        add('Delete', rep2, rowLabel_(name, or2), valList_(or2).join('; '));
      });
      return;
    }
    if (a && typeof a === 'object' || b && typeof b === 'object') {
      var ao = a || {}, bo = b || {}, ks = {};
      Object.keys(ao).forEach(function (k) { ks[k] = 1; });
      Object.keys(bo).forEach(function (k) { ks[k] = 1; });
      Object.keys(ks).forEach(function (k) {
        if (!ao[k]) { add('Add', report, String((bo[k] && (bo[k].employeeName || bo[k].name)) || k), valList_(bo[k]).join('; ')); return; }
        if (!bo[k]) { add('Delete', report, String((ao[k] && (ao[k].employeeName || ao[k].name)) || k), ''); return; }
        var d2 = fieldDiff_(ao[k], bo[k]);
        if (d2.length) add('Edit', report, String(bo[k].employeeName || bo[k].name || k), d2.join('; '));
      });
      return;
    }
    if (!sameVal_(a, b)) add('Edit', report, name, showVal_(a) + ' → ' + showVal_(b));
  });
  // ব্যবহারকারীর দেওয়া নোট (যেমন "Add Entry: ...") সবার আগে
  var notes = Array.isArray(meta.notes) ? meta.notes : [];
  if (notes.length) {
    notes.forEach(function (n) {
      if (!n || !n.action) return;
      rows.unshift({ user: base.user, month: base.month, device: base.device, action: String(n.action), report: String(n.report || ''), item: String(n.item || ''), details: String(n.details || '') });
    });
  }
  return rows;
}

/* =====================================================================
 *  GOOGLE DRIVE AUTO BACKUP (JSON) — Admin থেকে চালু/বন্ধ ও সময় নির্ধারণ
 * ===================================================================== */
var SCS_AB = {
  KEY: 'auto_backup_config',
  STATE: 'auto_backup_state',
  HANDLER: 'scsAutoBackupTick',
  FOLDER: 'SCS Auto Backup',
  PREFIX: 'SCS_Backup_',
  INTERVALS: { '1m': 1, '2m': 2, '5m': 5, '15m': 15, '30m': 30, '1h': 60, '6h': 360, '12h': 720, '1d': 1440 },
  DEFAULT: { enabled: true, interval: '1h', keepMode: 'days', keepValue: 30, onlyChanged: true }
};

function abConfig_() {
  var s = readSettings_(), cfg = {};
  Object.keys(SCS_AB.DEFAULT).forEach(function (k) { cfg[k] = SCS_AB.DEFAULT[k]; });
  try { var saved = JSON.parse(String(s[SCS_AB.KEY] || '{}')); Object.keys(saved).forEach(function (k) { cfg[k] = saved[k]; }); } catch (e) {}
  if (!SCS_AB.INTERVALS[cfg.interval]) cfg.interval = SCS_AB.DEFAULT.interval;
  cfg.keepMode = cfg.keepMode === 'count' ? 'count' : 'days';
  cfg.keepValue = Math.max(1, Math.min(5000, Math.round(Number(cfg.keepValue) || SCS_AB.DEFAULT.keepValue)));
  cfg.enabled = cfg.enabled === true || String(cfg.enabled) === 'true';
  cfg.onlyChanged = !(cfg.onlyChanged === false || String(cfg.onlyChanged) === 'false');
  return cfg;
}
function abState_() {
  try { return JSON.parse(String(readSettings_()[SCS_AB.STATE] || '{}')) || {}; } catch (e) { return {}; }
}
function abSaveState_(st) { writeSetting_(SCS_AB.STATE, JSON.stringify(st || {})); }

/** ব্যাকআপ ফোল্ডার: Admin-এ দেওয়া ফোল্ডারের ভেতরে "SCS Auto Backup"; ফোল্ডার না থাকলে ডাটাবেজ শিট যে ফোল্ডারে আছে সেখানে */
function abFolder_() {
  var parent = null;
  var id = String(readSettings_().drive_folder_id || '').trim();
  if (id) { try { parent = DriveApp.getFolderById(id); } catch (e) { parent = null; } }
  if (!parent) {
    var it = DriveApp.getFileById(getHome_().getId()).getParents();
    parent = it.hasNext() ? it.next() : DriveApp.getRootFolder();
  }
  var sub = parent.getFoldersByName(SCS_AB.FOLDER);
  return sub.hasNext() ? sub.next() : parent.createFolder(SCS_AB.FOLDER);
}

function abTriggerExists_() {
  return ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === SCS_AB.HANDLER; });
}
function abRemoveTriggers_() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === SCS_AB.HANDLER) ScriptApp.deleteTrigger(t); });
}
/** সময় অনুযায়ী ট্রিগার: ১/২ মিনিট → প্রতি ১ মিনিটে চেক, ৫ → ৫, ১৫ → ১৫, ৩০ → ৩০, ঘন্টা → ১ ঘন্টা, দৈনিক → ১ ঘন্টায় চেক (নির্দিষ্ট সময় পার হলে ব্যাকআপ) */
function abInstallTrigger_(cfg) {
  abRemoveTriggers_();
  if (!cfg.enabled) return;
  var b = ScriptApp.newTrigger(SCS_AB.HANDLER).timeBased();
  var m = SCS_AB.INTERVALS[cfg.interval];
  if (m <= 2) b.everyMinutes(1);
  else if (m === 5) b.everyMinutes(5);
  else if (m === 15) b.everyMinutes(15);
  else if (m === 30) b.everyMinutes(30);
  else b.everyHours(1);
  b.create();
}
/** ওয়েব অ্যাপ খুললেই (doGet) ট্রিগার আছে কি না দেখে নেয় — তাই ডিফল্টভাবে ব্যাকআপ চালু থাকে */
function ensureAutoBackup_() {
  var cfg = abConfig_();
  var has = abTriggerExists_();
  if (cfg.enabled && !has) abInstallTrigger_(cfg);
  if (!cfg.enabled && has) abRemoveTriggers_();
}

function getAutoBackupConfig() {
  var cfg = abConfig_(), st = abState_();
  var out = { enabled: cfg.enabled, interval: cfg.interval, keepMode: cfg.keepMode, keepValue: cfg.keepValue, onlyChanged: cfg.onlyChanged,
    lastRun: st.lastRun || '', lastFile: st.lastFile || '', lastFileUrl: st.lastFileUrl || '', lastError: st.lastError || '',
    lastCheck: st.lastCheck || '', triggerOn: false, folderName: '', folderUrl: '', files: [] };
  try { out.triggerOn = abTriggerExists_(); } catch (e) { out.lastError = out.lastError || ('Trigger: ' + e.message); }
  try {
    var f = abFolder_();
    out.folderName = f.getName();
    out.folderUrl = f.getUrl();
    out.files = abListFiles_(f).slice(0, 15).map(function (x) {
      return { name: x.name, url: x.url, size: x.size, created: x.created.toISOString() };
    });
  } catch (e) { out.lastError = out.lastError || ('Drive: ' + e.message); }
  return out;
}

function saveAutoBackupConfig(cfg, user) {
  cfg = cfg || {};
  var old = abConfig_();
  var clean = {
    enabled: !!cfg.enabled,
    interval: SCS_AB.INTERVALS[cfg.interval] ? String(cfg.interval) : old.interval,
    keepMode: cfg.keepMode === 'count' ? 'count' : 'days',
    keepValue: Math.max(1, Math.min(5000, Math.round(Number(cfg.keepValue) || old.keepValue))),
    onlyChanged: cfg.onlyChanged !== false
  };
  writeSetting_(SCS_AB.KEY, JSON.stringify(clean));
  abInstallTrigger_(clean);
  safeLog_([{ user: user || '', action: 'Settings', report: 'Admin · Auto Backup', item: clean.enabled ? 'Auto backup ON' : 'Auto backup OFF',
    details: 'interval=' + clean.interval + '; keep=' + clean.keepValue + ' ' + clean.keepMode + '; onlyChanged=' + clean.onlyChanged }]);
  return getAutoBackupConfig();
}

function abListFiles_(folder) {
  var it = folder.getFiles(), list = [];
  while (it.hasNext()) {
    var f = it.next();
    var n = f.getName();
    if (n.indexOf(SCS_AB.PREFIX) !== 0 || !/\.json$/i.test(n)) continue;
    list.push({ file: f, name: n, url: f.getUrl(), size: f.getSize(), created: f.getDateCreated() });
  }
  list.sort(function (a, b) { return b.created.getTime() - a.created.getTime(); });
  return list;
}

/** A to Z সব ডাটা: মাসভিত্তিক সব ম্যানুয়াল ডাটা + সব সেটিংস + অ্যাক্টিভিটি লগ */
function abBuildPayload_() {
  var settings = {};
  var s = readSettings_();
  Object.keys(s).forEach(function (k) {
    if (k === 'selftest_ping' || k === SCS_AB.STATE) return;
    settings[k] = String(s[k] == null ? '' : s[k]);
  });
  var data = getManualAppState();
  var logRows = [];
  try {
    var sh = logSheet_(), last = sh.getLastRow();
    if (last >= 2) logRows = sh.getRange(2, 1, last - 1, SCS_LOG.HEADERS.length).getDisplayValues();
  } catch (e) {}
  return {
    app: 'SCS Monthly Report', kind: 'full-backup', version: 2,
    exportedAt: new Date().toISOString(),
    spreadsheetId: getHome_().getId(),
    months: data,
    settings: settings,
    activityLog: { headers: SCS_LOG.HEADERS, rows: logRows }
  };
}

function abRun_(force, user) {
  var cfg = abConfig_(), st = abState_();
  var fingerprint = abQuickPrint_();
  var nowIso = new Date().toISOString();
  if (!force && cfg.onlyChanged && st.hash === fingerprint) {
    st.lastCheck = nowIso; st.lastError = '';
    abSaveState_(st);
    return { ok: true, skipped: true, reason: 'unchanged' };
  }
  var payload = abBuildPayload_();
  var folder = abFolder_();
  var tz = Session.getScriptTimeZone() || 'Asia/Dhaka';
  var name = SCS_AB.PREFIX + Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd_HH-mm-ss') + '.json';
  var file = folder.createFile(Utilities.newBlob(JSON.stringify(payload), 'application/json', name));
  var removed = abCleanup_(folder, cfg, file.getId());
  st.hash = fingerprint; st.lastRun = nowIso; st.lastCheck = nowIso; st.lastFile = name; st.lastFileUrl = file.getUrl(); st.lastError = '';
  abSaveState_(st);
  if (force) safeLog_([{ user: user || '', action: 'Backup', report: 'Admin · Auto Backup', item: name, details: 'Manual backup to Google Drive' + (removed ? '; old files removed: ' + removed : '') }]);
  return { ok: true, skipped: false, file: { name: name, url: file.getUrl(), size: file.getSize(), created: nowIso }, removed: removed };
}

/** পুরনো ফাইল ডিলিট (ট্র্যাশে): দিন হিসেবে বা ফাইল সংখ্যা হিসেবে */
function abCleanup_(folder, cfg, keepId) {
  var list = abListFiles_(folder), removed = 0;
  var cutoff = Date.now() - cfg.keepValue * 86400000;
  list.forEach(function (x, i) {
    if (x.file.getId() === keepId) return;
    var drop = cfg.keepMode === 'count' ? i >= cfg.keepValue : x.created.getTime() < cutoff;
    if (drop) { try { x.file.setTrashed(true); removed++; } catch (e) {} }
  });
  return removed;
}

/** দ্রুত যাচাই: মাসের সংস্করণ + সেটিংস + লগের সারি সংখ্যা — কিছু বদলেছে কি না (পুরো ডাটা না পড়েই) */
function abQuickPrint_() {
  var s = readSettings_(), keep = {};
  Object.keys(s).forEach(function (k) { if (k !== SCS_AB.STATE && k !== 'selftest_ping') keep[k] = String(s[k]); });
  var n = 0;
  try { n = logSheet_().getLastRow(); } catch (e) {}
  return sha256Hex_(JSON.stringify(getManualRevisions()) + '|' + JSON.stringify(keep) + '|' + n);
}

/** ট্রিগার এই ফাংশন চালায় */
function scsAutoBackupTick() {
  var cfg = abConfig_();
  if (!cfg.enabled) { try { abRemoveTriggers_(); } catch (e) {} return 'disabled'; }
  var st = abState_();
  var every = SCS_AB.INTERVALS[cfg.interval] * 60000;
  var lastT = st.lastCheck ? new Date(st.lastCheck).getTime() : 0;
  if (lastT && Date.now() - lastT < every - 20000) return 'not-due';
  try {
    var r = abRun_(false);
    return r.skipped ? 'unchanged' : 'saved';
  } catch (e) {
    st.lastError = new Date().toISOString() + ' — ' + (e && e.message ? e.message : e);
    st.lastCheck = new Date().toISOString();
    try { abSaveState_(st); } catch (x) {}
    throw e;
  }
}

/** Admin → "Backup Now" বাটন */
function runAutoBackupNow(user) {
  return abRun_(true, user);
}
