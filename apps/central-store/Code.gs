/**
 * =====================================================================
 *  SCS CENTRAL STORE — Inventory Management System (Google Apps Script)
 *  Swarup Construction Solution
 * =====================================================================
 *  - Google Sheet = শুধুমাত্র Database। সব কাজ Web App থেকে হবে।
 *  - DB_* শিটগুলো স্বয়ংক্রিয়ভাবে তৈরি হয় (প্রথম লোডেই)।
 *  - সব Permission Backend-এ যাচাই হয় (api() → auth_())।
 *  - সব Write কাজ LockService দিয়ে সুরক্ষিত, Duplicate Request আটকানো হয়।
 *
 *  ফাইল: শুধু দুটি — Code.gs ও Index.html (CSS ও JavaScript Index.html-এর ভিতরেই)
 *  ডিপ্লয়: Deploy > New deployment > Web app (Execute as: Me)
 * =====================================================================
 */

var APP = {
  NAME: 'SCS Central Store',
  COMPANY: 'Swarup Construction Solution',
  VERSION: '2.5.0',
  SCHEMA: 1,
  BACKUP_FORMAT: 'scs-store-backup',
  BACKUP_PREFIX: 'SCS_Store_Backup_',
  SESSION_SEC: 21600,            // CacheService সর্বোচ্চ ৬ ঘণ্টা (প্রতি কাজে আবার বাড়ে)
  DEFAULT_ADMIN_PIN: '2026',
  DEFAULT_USER_PIN: '2019',
  DEFAULT_UNITS: ['KG', 'Bag', 'Litre', 'Pcs', 'Drum', 'Can', 'Box', 'Ton', 'Gallon', 'Packet'],
  MAX_ITEMS_PER_TXN: 100,
  MAX_PAGE: 20000
};

/* ---------------------------------------------------------------------
 *  DATABASE SCHEMA (প্রতিটি শিট = একটি টেবিল)
 * ------------------------------------------------------------------- */
var SCHEMA = {
  products: {
    sheet: 'DB_Products', key: 'ProductID',
    cols: ['ProductID', 'Code', 'Name', 'PackSize', 'Unit', 'Category', 'DisplayOrder', 'MinStock',
      'Status', 'Deleted', 'CreatedAt', 'CreatedBy', 'UpdatedAt', 'UpdatedBy', 'DeletedAt', 'DeletedBy', 'DeleteReason']
  },
  txns: {
    sheet: 'DB_Transactions', key: 'TxnID',
    cols: ['TxnID', 'BatchID', 'TxnDate', 'TxnTime', 'Type', 'ProductID', 'ProductCode', 'ProductName', 'PackSize', 'Unit',
      'Quantity', 'PrevStock', 'NewStock', 'UserName', 'UserID', 'Remarks', 'Status', 'CreatedAt',
      'EditCount', 'EditedAt', 'EditedBy', 'DeletedAt', 'DeletedBy', 'DeleteReason', 'RequestID', 'Source']
  },
  equip: {
    sheet: 'DB_Equipment', key: 'EquipID',
    cols: ['EquipID', 'Code', 'Name', 'Brand', 'Model', 'Unit', 'AddedDate', 'DisplayOrder', 'Status', 'Deleted',
      'CreatedAt', 'CreatedBy', 'UpdatedAt', 'UpdatedBy', 'DeletedAt', 'DeletedBy', 'DeleteReason']
  },
  etxns: {
    sheet: 'DB_EquipTxns', key: 'TxnID',
    cols: ['TxnID', 'BatchID', 'TxnDate', 'TxnTime', 'Type', 'EquipID', 'Code', 'Name', 'Brand', 'Model', 'Quantity',
      'UserName', 'UserID', 'Remarks', 'Status', 'CreatedAt', 'EditCount', 'EditedAt', 'EditedBy',
      'DeletedAt', 'DeletedBy', 'DeleteReason', 'RequestID']
  },
  inventory: {
    sheet: 'DB_Inventory', key: 'ProductID',
    cols: ['ProductID', 'Code', 'Name', 'PackSize', 'Unit', 'TotalIn', 'TotalOut', 'Adjustment', 'CurrentStock',
      'LastInQty', 'LastInDate', 'LastOutQty', 'LastOutDate', 'UpdatedAt']
  },
  logs: {
    sheet: 'DB_ActivityLog', key: 'LogID',
    cols: ['LogID', 'Timestamp', 'UserName', 'UserID', 'Role', 'Action', 'Entity', 'EntityID', 'Summary',
      'OldValue', 'NewValue', 'Status', 'DeletedAt', 'DeletedBy', 'DeleteReason']
  },
  users: {
    sheet: 'DB_Users', key: 'UserID',
    cols: ['UserID', 'Name', 'Role', 'PinHash', 'PinLength', 'Status', 'CreatedAt', 'UpdatedAt', 'LastLogin']
  },
  settings: {
    sheet: 'DB_Settings', key: 'Key',
    cols: ['Key', 'Value', 'UpdatedAt']
  },
  backups: {
    sheet: 'DB_BackupHistory', key: 'BackupID',
    cols: ['BackupID', 'Timestamp', 'Trigger', 'Scope', 'FileName', 'FileID', 'SizeKB', 'Records', 'Status', 'Error', 'UserName']
  }
};

/* ---------------------------------------------------------------------
 *  WEB APP ENTRY
 * ------------------------------------------------------------------- */
function doGet() {
  try { setupIfNeeded_(); } catch (e) { /* শিট সংযোগ না থাকলে অ্যাপ খুলবে, এরর দেখাবে */ }
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle(APP.NAME)
    // interactive-widget: মোবাইলে কিবোর্ড খুললে পেজ ছোট হবে, তাই লিস্ট/ইনপুট কিবোর্ডের নিচে ঢাকা পড়বে না
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, interactive-widget=resizes-content')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function onOpen() {
  try {
    SpreadsheetApp.getUi().createMenu('SCS Store')
      .addItem('Setup / Repair Database Sheets', 'setupDatabase')
      .addItem('Authorize (Sheet + Drive + Trigger)', 'authorizeAll')
      .addItem('Drive Backup Now', 'backupNowFromMenu')
      .addSeparator()
      .addItem('Reset Admin PIN (forgot PIN)', 'resetAdminPinFromMenu')
      .addToUi();
  } catch (e) {}
}

/**
 * পিন ভুলে গেলে: Apps Script এডিটর থেকে এই ফাংশন Run করুন (অথবা শিটের SCS Store মেনু → Reset Admin PIN)।
 * Admin ইউজারের পিন আবার ডিফল্ট (2026) হবে এবং ইউজারটি Active হবে।
 * শুধু শিট/স্ক্রিপ্টের মালিক এটি চালাতে পারেন — Web App থেকে কেউ চালাতে পারবে না।
 */
function resetAdminPin() {
  resetCache_();
  setupDatabase();
  return withLock_(function () {
    var rows = read_('users').rows, now = stamp_(), h = hashPin_(APP.DEFAULT_ADMIN_PIN);
    // ডিফল্ট পিন অন্য কোনো ইউজার ব্যবহার করলে আগে সেটি সরানো হয় (লগইনে ভুল ইউজার যেন না আসে)
    var clash = rows.filter(function (u) { return u.PinHash === h && u.Role !== 'ADMIN'; });
    clash.forEach(function (u) { u.PinHash = hashPin_('reset-' + Utilities.getUuid()); u.UpdatedAt = now; });
    if (clash.length) update_('users', clash);
    rows = read_('users').rows;
    var admin = rows.filter(function (u) { return u.UserID === 'U-ADMIN'; })[0] || rows.filter(function (u) { return u.Role === 'ADMIN'; })[0];
    if (admin) {
      admin.Role = 'ADMIN'; admin.Status = 'ACTIVE'; admin.PinHash = h; admin.PinLength = String(APP.DEFAULT_ADMIN_PIN.length); admin.UpdatedAt = now;
      // একই হ্যাশ অন্য Admin-এর থাকলে বদলে দেওয়া হয়
      var others = rows.filter(function (u) { return u !== admin && u.PinHash === h; });
      others.forEach(function (u) { u.PinHash = hashPin_('reset-' + Utilities.getUuid()); u.UpdatedAt = now; });
      update_('users', [admin].concat(others));
    } else {
      admin = { UserID: 'U-ADMIN', Name: 'Admin', Role: 'ADMIN', PinHash: h, PinLength: String(APP.DEFAULT_ADMIN_PIN.length), Status: 'ACTIVE', CreatedAt: now, UpdatedAt: now, LastLogin: '' };
      append_('users', [admin]);
    }
    CacheService.getScriptCache().remove('LOGIN_FAILS');
    log_(null, 'ADMIN_PIN_RESET', 'User', admin.UserID, 'Admin PIN reset to default from Apps Script editor / Sheet menu (' + admin.Name + ')');
    bumpRev_();
    return 'Admin PIN reset. User: ' + admin.Name + ' — PIN: ' + APP.DEFAULT_ADMIN_PIN + ' (log in and change it now)';
  });
}

function resetAdminPinFromMenu() {
  var ui = null;
  try { ui = SpreadsheetApp.getUi(); } catch (e) {}
  if (ui) {
    var ok = ui.alert('Reset Admin PIN', 'Admin PIN will be reset to ' + APP.DEFAULT_ADMIN_PIN + '. Continue?', ui.ButtonSet.YES_NO);
    if (ok !== ui.Button.YES) return 'cancelled';
  }
  var msg = resetAdminPin();
  if (ui) ui.alert(msg);
  return msg;
}

/** নতুন ভার্সন ডিপ্লয়ের আগে এডিটর থেকে একবার Run করে সব অনুমতি দিন। */
function authorizeAll() {
  var ss = db_();
  DriveApp.getRootFolder().getName();
  ScriptApp.getProjectTriggers();
  LockService.getScriptLock();
  CacheService.getScriptCache();
  setupDatabase();
  return 'Authorized: ' + ss.getName();
}

function backupNowFromMenu() {
  var r = runDriveBackup_('MANUAL', 'Sheet Menu');
  try { SpreadsheetApp.getUi().alert('Backup: ' + r.status + (r.fileName ? ' — ' + r.fileName : '') + (r.error ? '\n' + r.error : '')); } catch (e) {}
  return r;
}

/* ---------------------------------------------------------------------
 *  SINGLE API ENTRY — প্রতিটি কাজ এখান দিয়ে, Permission এখানেই যাচাই
 * ------------------------------------------------------------------- */
var ACTIONS = {
  // public
  boot:              { role: '',      fn: function (c, d) { return publicBoot_(d); } },
  login:             { role: '',      fn: function (c, d) { return login_(d); } },
  // user
  bootstrap:         { role: 'USER',  fn: function (c, d) { return bootstrapData_(c, { logoV: String(d.logoV || '') }); } },
  rev:               { role: 'USER',  fn: function (c, d) { return { rev: rev_(), user: c }; } },
  logout:            { role: 'USER',  fn: function (c, d) { return logout_(c); } },
  adminLogin:        { role: 'USER',  fn: function (c, d) { return adminLogin_(c, d); } },
  dashboard:         { role: 'USER',  fn: function (c, d) { return dashboard_(c, d); } },
  saveTransactions:  { role: 'USER',  fn: function (c, d) { return saveTransactions_(c, d); } },
  queryTransactions: { role: 'USER',  fn: function (c, d) { return queryTransactions_(c, d); } },
  txnHistory:        { role: 'USER',  fn: function (c, d) { return txnHistory_(c, d); } },
  ledger:            { role: 'USER',  fn: function (c, d) { return ledger_(c, d); } },
  monthlyReport:     { role: 'USER',  fn: function (c, d) { return monthlyReport_(c, d); } },
  stockReport:       { role: 'USER',  fn: function (c, d) { return stockReport_(c, d); } },
  queryLogs:         { role: 'USER',  fn: function (c, d) { return queryLogs_(c, d); } },
  equipStock:        { role: 'USER',  fn: function (c, d) { return equipStock_(c, d); } },
  equipSaveTxns:     { role: 'USER',  fn: function (c, d) { return equipSaveTxns_(c, d); } },
  equipQuery:        { role: 'USER',  fn: function (c, d) { return equipQuery_(c, d); } },
  equipTxnUpdate:    { role: 'USER',  fn: function (c, d) { pinCheck_(c, d); return equipTxnUpdate_(c, d); } },
  equipTxnDelete:    { role: 'USER',  fn: function (c, d) { pinCheck_(c, d); return equipTxnDelete_(c, d); } },
  // admin
  equipSave:         { role: 'ADMIN', fn: function (c, d) { if (d.id) pinCheck_(c, d); return equipSave_(c, d); } },
  equipStatus:       { role: 'ADMIN', fn: function (c, d) { pinCheck_(c, d); return equipStatus_(c, d); } },
  equipDelete:       { role: 'ADMIN', fn: function (c, d) { pinCheck_(c, d); return equipDelete_(c, d); } },
  equipSheetPreview: { role: 'ADMIN', fn: function (c, d) { return equipSheetPreview_(c, d); } },
  equipSheetImport:  { role: 'ADMIN', fn: function (c, d) { pinCheck_(c, d); return equipSheetImport_(c, d); } },
  productSave:       { role: 'ADMIN', fn: function (c, d) { if (d.id) pinCheck_(c, d); return productSave_(c, d); } },
  productStatus:     { role: 'ADMIN', fn: function (c, d) { pinCheck_(c, d); return productStatus_(c, d); } },
  productReorder:    { role: 'ADMIN', fn: function (c, d) { return productReorder_(c, d); } },
  productDelete:     { role: 'ADMIN', fn: function (c, d) { pinCheck_(c, d); return productDelete_(c, d); } },
  // সংবেদনশীল কাজ: সেশনের ইউজারের নিজের পিন (d.pin) সার্ভারে যাচাই হয়। Admin Panel-এ Admin-এর পিন, বাইরে ইউজারের পিন।
  txnUpdate:         { role: 'USER',  fn: function (c, d) { pinCheck_(c, d); return txnUpdate_(c, d); } },
  txnDelete:         { role: 'USER',  fn: function (c, d) { pinCheck_(c, d); return txnDelete_(c, d); } },
  logDelete:         { role: 'ADMIN', fn: function (c, d) { pinCheck_(c, d); return logDelete_(c, d); } },
  deletedRecords:    { role: 'ADMIN', fn: function (c, d) { return deletedRecords_(c, d); } },
  restoreRecords:    { role: 'ADMIN', fn: function (c, d) { pinCheck_(c, d); return restoreRecords_(c, d); } },
  purgeRecords:      { role: 'ADMIN', fn: function (c, d) { pinCheck_(c, d); return purgeRecords_(c, d); } },
  usersList:         { role: 'ADMIN', fn: function (c, d) { return usersList_(c, d); } },
  userSave:          { role: 'ADMIN', fn: function (c, d) { if (d.id) pinCheck_(c, d); return userSave_(c, d); } },
  userDelete:        { role: 'ADMIN', fn: function (c, d) { pinCheck_(c, d); return userDelete_(c, d); } },
  settingsSave:      { role: 'ADMIN', fn: function (c, d) { return settingsSave_(c, d); } },
  logoSave:          { role: 'ADMIN', fn: function (c, d) { return logoSave_(c, d); } },
  driveFolderSave:   { role: 'ADMIN', fn: function (c, d) { return driveFolderSave_(c, d); } },
  backupConfig:      { role: 'ADMIN', fn: function (c, d) { return backupConfigOut_(); } },
  backupConfigSave:  { role: 'ADMIN', fn: function (c, d) { return backupConfigSave_(c, d); } },
  backupNow:         { role: 'ADMIN', fn: function (c, d) { return backupNow_(c, d); } },
  exportData:        { role: 'ADMIN', fn: function (c, d) { return exportData_(c, d); } },
  importPreview:     { role: 'ADMIN', fn: function (c, d) { return importPreview_(c, d); } },
  importApply:       { role: 'ADMIN', fn: function (c, d) { pinCheck_(c, d); return importApply_(c, d); } },
  resetAll:          { role: 'ADMIN', fn: function (c, d) { pinCheck_(c, d); return resetAll_(c, d); } },
  systemInfo:        { role: 'ADMIN', fn: function (c, d) { return systemInfo_(c, d); } },
  repairDatabase:    { role: 'ADMIN', fn: function (c, d) { return repairDatabase_(c, d); } }
};

function api(req) {
  resetCache_();
  req = req || {};
  try {
    var a = ACTIONS[String(req.action || '')];
    if (!a) throw err_('Unknown action: ' + req.action, 'অজানা কাজ: ' + req.action);
    var ctx = a.role ? auth_(req.token, a.role) : null;
    var data = a.fn(ctx, req.data || {});
    return { ok: true, data: data, rev: rev_() };
  } catch (e) {
    var msg = e && e.message ? e.message : String(e);
    return { ok: false, error: msg, error_bn: (e && e.bn) || msg, code: (e && e.code) || '' };
  }
}

function err_(en, bn, code) {
  var e = new Error(en);
  e.bn = bn || en;
  e.code = code || '';
  return e;
}

/* ---------------------------------------------------------------------
 *  HELPERS
 * ------------------------------------------------------------------- */
function tz_() { return Session.getScriptTimeZone() || 'Asia/Dhaka'; }
function fmt_(d, p) { return Utilities.formatDate(d, tz_(), p); }
function stamp_() { return fmt_(new Date(), 'yyyy-MM-dd HH:mm:ss'); }
function today_() { return fmt_(new Date(), 'yyyy-MM-dd'); }
function str_(v, max) { return String(v == null ? '' : v).trim().slice(0, max || 500); }
function num_(v) {
  if (typeof v === 'number') return isFinite(v) ? v : 0;
  var n = parseFloat(String(v == null ? '' : v).replace(/,/g, ''));
  return isFinite(n) ? n : 0;
}
function round_(n) { return Math.round(Number(n) * 1000) / 1000; }
function isDate_(s) { return /^\d{4}-\d{2}-\d{2}$/.test(String(s || '')); }
function uid_(prefix, len) {
  return prefix + Utilities.getUuid().replace(/-/g, '').slice(0, len || 10).toUpperCase();
}
function sha256Hex_(s) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(s), Utilities.Charset.UTF_8);
  return bytes.map(function (x) { var v = (x < 0 ? x + 256 : x).toString(16); return v.length === 1 ? '0' + v : v; }).join('');
}
function hashPin_(pin) { return sha256Hex_('scs-store|' + String(pin)); }
function json_(v) { try { return JSON.stringify(v); } catch (e) { return ''; } }
function parse_(s, def) { try { return s ? JSON.parse(s) : def; } catch (e) { return def; } }
function bool_(v) { return v === true || String(v).toUpperCase() === 'TRUE'; }

function withLock_(fn) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw err_('Server is busy, please try again.', 'সার্ভার ব্যস্ত, একটু পরে আবার চেষ্টা করুন।', 'BUSY');
  try { resetCache_(); return fn(); } finally { lock.releaseLock(); }
}

function rev_() { return PropertiesService.getScriptProperties().getProperty('DB_REV') || '0'; }
function bumpRev_() { PropertiesService.getScriptProperties().setProperty('DB_REV', String(Date.now())); }

/* ---------------------------------------------------------------------
 *  TABLE LAYER (Google Sheet ⇄ Object)
 * ------------------------------------------------------------------- */
var _CACHE = {};
function resetCache_() { _CACHE = {}; }

function db_() {
  var props = PropertiesService.getScriptProperties();
  var active = null;
  try { active = SpreadsheetApp.getActiveSpreadsheet(); } catch (e) { active = null; }
  if (active) {
    if (props.getProperty('DB_SPREADSHEET_ID') !== active.getId()) props.setProperty('DB_SPREADSHEET_ID', active.getId());
    return active;
  }
  var id = props.getProperty('DB_SPREADSHEET_ID');
  if (id) return SpreadsheetApp.openById(id);
  throw err_('Database sheet is not connected. Open the script from the Google Sheet (Extensions > Apps Script).',
    'ডাটাবেজ গুগল শিট সংযুক্ত নেই। গুগল শিট থেকে Extensions > Apps Script দিয়ে স্ক্রিপ্ট খুলুন।');
}

function sheet_(t) {
  if (_CACHE['sh_' + t]) return _CACHE['sh_' + t];
  var def = SCHEMA[t];
  var ss = db_();
  var sh = ss.getSheetByName(def.sheet);
  if (!sh) {
    sh = ss.insertSheet(def.sheet);
    sh.getRange(1, 1, 1, def.cols.length).setValues([def.cols])
      .setFontWeight('bold').setBackground('#1e293b').setFontColor('#ffffff');
    sh.setFrozenRows(1);
    try { sh.protect().setWarningOnly(true).setDescription('SCS Store database — সরাসরি এডিট করবেন না, Web App ব্যবহার করুন'); } catch (e) {}
  } else {
    // স্কিমা আপগ্রেড: নতুন কলাম থাকলে শেষে যোগ হবে, পুরোনো ডাটা অক্ষত থাকবে
    var lc = Math.max(sh.getLastColumn(), 1);
    var head = sh.getRange(1, 1, 1, lc).getValues()[0].map(String);
    var missing = def.cols.filter(function (c) { return head.indexOf(c) < 0; });
    if (missing.length) {
      var start = head.filter(function (h) { return h !== ''; }).length + 1;
      sh.getRange(1, start, 1, missing.length).setValues([missing]).setFontWeight('bold').setBackground('#1e293b').setFontColor('#ffffff');
    }
  }
  _CACHE['sh_' + t] = sh;
  return sh;
}

function cellOut_(v) {
  if (v instanceof Date) {
    var hasTime = v.getHours() || v.getMinutes() || v.getSeconds();
    return fmt_(v, hasTime ? 'yyyy-MM-dd HH:mm:ss' : 'yyyy-MM-dd');
  }
  return v === null || v === undefined ? '' : String(v);
}

/** পুরো টেবিল পড়া → {rows:[{...,_row}], header} */
var SC_CHUNK = 30000, SC_MAXCHUNKS = 60;
function scVer_(t) {
  var c = CacheService.getScriptCache(), k = 'TV_' + t, v = c.get(k);
  if (!v) { v = String(Date.now()) + String(Math.floor(Math.random() * 1e6)); c.put(k, v, 21600); }
  return v;
}
/** টেবিলে লেখার পর ভার্সন বদলে যায় → পুরোনো ক্যাশ আর ব্যবহার হয় না */
function scBump_(t) { try { CacheService.getScriptCache().put('TV_' + t, String(Date.now()) + String(Math.floor(Math.random() * 1e6)), 21600); } catch (e) {} }
function scGet_(t) {
  try {
    var c = CacheService.getScriptCache(), base = 'TC_' + t + '_' + scVer_(t);
    var n = Number(c.get(base + '_n') || 0);
    if (!n) return null;
    var txt = '';
    for (var i = 0; i < n; i++) { var part = c.get(base + '_' + i); if (part === null || part === undefined) return null; txt += part; }
    var o = JSON.parse(txt), def = SCHEMA[t], rows = o.r.map(function (a) {
      var r = { _row: a[0] };
      for (var k = 0; k < def.cols.length; k++) r[def.cols[k]] = a[k + 1];
      return r;
    });
    return { rows: rows, header: o.h };
  } catch (e) { return null; }
}
function scPut_(t, res, ver) {
  try {
    var def = SCHEMA[t];
    var txt = JSON.stringify({ h: res.header, r: res.rows.map(function (r) { var a = [r._row]; for (var k = 0; k < def.cols.length; k++) a.push(r[def.cols[k]]); return a; }) });
    var n = Math.ceil(txt.length / SC_CHUNK);
    if (n < 1 || n > SC_MAXCHUNKS) return;
    var c = CacheService.getScriptCache(), base = 'TC_' + t + '_' + ver;
    for (var i = 0; i < n; i++) c.put(base + '_' + i, txt.slice(i * SC_CHUNK, (i + 1) * SC_CHUNK), 21600);
    c.put(base + '_n', String(n), 21600);     // _n ক্যাশে সবশেষে বসে, তাই অর্ধেক লেখা ক্যাশ কখনো পড়া হয় না
  } catch (e) {}
}

function read_(t) {
  if (_CACHE['t_' + t]) return _CACHE['t_' + t];
  var ver = scVer_(t), hit = scGet_(t);
  if (hit) { _CACHE['t_' + t] = hit; return hit; }
  var def = SCHEMA[t], sh = sheet_(t);
  var last = sh.getLastRow(), lc = sh.getLastColumn();
  var header = lc ? sh.getRange(1, 1, 1, lc).getValues()[0].map(String) : def.cols.slice();
  var rows = [];
  if (last >= 2) {
    var vals = sh.getRange(2, 1, last - 1, header.length).getValues();
    var idx = def.cols.map(function (c) { return header.indexOf(c); });
    for (var i = 0; i < vals.length; i++) {
      var o = { _row: i + 2 };
      for (var k = 0; k < def.cols.length; k++) o[def.cols[k]] = idx[k] < 0 ? '' : cellOut_(vals[i][idx[k]]);
      if (o[def.key] !== '') rows.push(o);
    }
  }
  var res = { rows: rows, header: header };
  _CACHE['t_' + t] = res;
  scPut_(t, res, ver);
  return res;
}

function rowArr_(header, o) {
  return header.map(function (h) { return h === '' || o[h] === undefined || o[h] === null ? '' : String(o[h]); });
}

function append_(t, objs) {
  if (!objs.length) return;
  var sh = sheet_(t), header = read_(t).header;
  var start = sh.getLastRow() + 1;
  sh.getRange(start, 1, objs.length, header.length).setNumberFormat('@').setValues(objs.map(function (o) { return rowArr_(header, o); }));
  delete _CACHE['t_' + t]; scBump_(t);
}

/** একাধিক সারি আপডেট (প্রতিটি অবজেক্টে _row থাকতে হবে) */
function update_(t, objs) {
  if (!objs.length) return;
  var sh = sheet_(t), header = read_(t).header;
  objs.sort(function (a, b) { return a._row - b._row; });
  // পাশাপাশি সারিগুলো একসাথে লেখা হয় (কম API কল)
  var i = 0;
  while (i < objs.length) {
    var j = i;
    while (j + 1 < objs.length && objs[j + 1]._row === objs[j]._row + 1) j++;
    var block = objs.slice(i, j + 1).map(function (o) { return rowArr_(header, o); });
    sh.getRange(objs[i]._row, 1, block.length, header.length).setNumberFormat('@').setValues(block);
    i = j + 1;
  }
  delete _CACHE['t_' + t]; scBump_(t);
}

/** পুরো টেবিল নতুন করে লেখা (Reorder / Purge / Replace-এর জন্য) */
function rewrite_(t, objs) {
  var sh = sheet_(t), header = read_(t).header;
  var last = sh.getLastRow();
  if (last >= 2) sh.getRange(2, 1, last - 1, Math.max(sh.getLastColumn(), header.length)).clearContent();
  if (objs.length) sh.getRange(2, 1, objs.length, header.length).setNumberFormat('@').setValues(objs.map(function (o) { return rowArr_(header, o); }));
  delete _CACHE['t_' + t]; scBump_(t);
}

function clean_(o) { var r = {}; Object.keys(o).forEach(function (k) { if (k !== '_row') r[k] = o[k]; }); return r; }

/* ---------------------------------------------------------------------
 *  SETUP
 * ------------------------------------------------------------------- */
function setupDatabase() {
  resetCache_();
  Object.keys(SCHEMA).forEach(function (t) { sheet_(t); });
  seedUsers_();
  try { PropertiesService.getScriptProperties().setProperty('DB_READY', APP.VERSION + '|' + db_().getId()); } catch (e) {}
  return 'OK: ' + db_().getName();
}

/** প্রতিবার সব শিট চেক না করে, একবার সেটআপ হলে বাদ দেওয়া হয় (অ্যাপ দ্রুত খোলার জন্য) */
function setupIfNeeded_() {
  var mark = PropertiesService.getScriptProperties().getProperty('DB_READY');
  var id = '';
  try { id = SpreadsheetApp.getActiveSpreadsheet().getId(); } catch (e) { id = PropertiesService.getScriptProperties().getProperty('DB_SPREADSHEET_ID') || ''; }
  if (mark && mark === APP.VERSION + '|' + id) return;
  setupDatabase();
}

function seedUsers_() {
  if (read_('users').rows.length) return;
  var now = stamp_();
  append_('users', [
    { UserID: 'U-ADMIN', Name: 'Admin', Role: 'ADMIN', PinHash: hashPin_(APP.DEFAULT_ADMIN_PIN), PinLength: '4', Status: 'ACTIVE', CreatedAt: now, UpdatedAt: now, LastLogin: '' },
    { UserID: 'U-STORE', Name: 'Store User', Role: 'USER', PinHash: hashPin_(APP.DEFAULT_USER_PIN), PinLength: '4', Status: 'ACTIVE', CreatedAt: now, UpdatedAt: now, LastLogin: '' }
  ]);
}

function repairDatabase_(ctx) {
  setupDatabase();
  withLock_(function () { rebuildInventory_(); });
  log_(ctx, 'DB_REPAIR', 'System', '', 'Database sheets checked / repaired');
  bumpRev_();
  return systemInfo_(ctx);
}

/* ---------------------------------------------------------------------
 *  SETTINGS (Key/Value)
 * ------------------------------------------------------------------- */
function settings_() {
  var out = {};
  read_('settings').rows.forEach(function (r) { out[r.Key] = r.Value; });
  return out;
}

function setSettings_(obj) {
  var t = read_('settings'), map = {}, upd = [], add = [], now = stamp_();
  t.rows.forEach(function (r) { map[r.Key] = r; });
  Object.keys(obj).forEach(function (k) {
    var v = obj[k] == null ? '' : String(obj[k]);
    if (map[k]) { if (map[k].Value !== v) { map[k].Value = v; map[k].UpdatedAt = now; upd.push(map[k]); } }
    else add.push({ Key: k, Value: v, UpdatedAt: now });
  });
  update_('settings', upd);
  append_('settings', add);
}

function listSetting_(s, key, def) {
  var v = parse_(s[key], null);
  return Array.isArray(v) ? v : def.slice();
}

function publicSettings_(withLogo) {
  var s = settings_();
  var o = {
    storeName: s.store_name || APP.NAME,
    company: APP.COMPANY,
    units: listSetting_(s, 'units', APP.DEFAULT_UNITS),
    categories: listSetting_(s, 'categories', []),
    logoV: String(s.logo_v || ''),            // লোগো বদলালে এটি বদলায় — ক্লায়েন্ট শুধু তখনই নতুন লোগো নেয়
    logoLink: String(s.logo_url || ''),
    driveFolderSet: !!String(s.drive_folder_id || '').trim(),
    version: APP.VERSION
  };
  if (withLogo !== false) o.logo = logoSrc_(s);
  return o;
}

/** Google Drive শেয়ার লিংক → সরাসরি দেখানোর মতো ইমেজ লিংক */
function normalizeLogoUrl_(u) {
  u = String(u || '').trim();
  var m = u.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/) || u.match(/drive\.google\.com\/(?:open|uc|thumbnail)\?[^#]*\bid=([a-zA-Z0-9_-]+)/);
  if (m) return 'https://drive.google.com/thumbnail?id=' + m[1] + '&sz=w256';
  return u;
}

function logoSrc_(s) {
  if (s.logo_data) return String(s.logo_data);
  if (s.logo_url) return normalizeLogoUrl_(s.logo_url);
  return logoDataUrl_(s);       // পুরোনো ভার্সনে Drive-এ সেভ করা লোগো
}

function logoDataUrl_(s) {
  var id = String(s.logo_file_id || '');
  if (!id) return '';
  var cache = CacheService.getScriptCache(), key = 'LOGO_' + id;
  var c = cache.get(key);
  if (c) return c;
  try {
    var blob = DriveApp.getFileById(id).getBlob();
    var url = 'data:' + blob.getContentType() + ';base64,' + Utilities.base64Encode(blob.getBytes());
    if (url.length < 95000) cache.put(key, url, 21600);
    return url;
  } catch (e) { return ''; }
}

function settingsSave_(ctx, d) {
  var clean = function (arr) {
    var seen = {}, out = [];
    (Array.isArray(arr) ? arr : []).forEach(function (x) {
      var v = str_(x, 40); var k = v.toLowerCase();
      if (v && !seen[k]) { seen[k] = 1; out.push(v); }
    });
    return out;
  };
  var name = str_(d.storeName, 60) || APP.NAME;
  var units = clean(d.units);
  if (!units.length) throw err_('At least one unit is required.', 'কমপক্ষে একটি Unit লাগবে।');
  var cats = clean(d.categories);
  return withLock_(function () {
    var old = settings_();
    setSettings_({ store_name: name, units: json_(units), categories: json_(cats) });
    log_(ctx, 'SETTINGS_UPDATE', 'Settings', '', 'System settings updated',
      { storeName: old.store_name || APP.NAME, units: listSetting_(old, 'units', APP.DEFAULT_UNITS), categories: listSetting_(old, 'categories', []) },
      { storeName: name, units: units, categories: cats });
    bumpRev_();
    return publicSettings_();
  });
}

/* ---------------------------------------------------------------------
 *  AUTH & SESSION
 * ------------------------------------------------------------------- */
function publicBoot_(d) {
  setupIfNeeded_();
  var users = read_('users').rows.filter(function (u) { return u.Status === 'ACTIVE'; });
  var maxLen = 4;
  users.forEach(function (u) { maxLen = Math.max(maxLen, Number(u.PinLength) || 4); });
  var s = publicSettings_(false), out = { storeName: s.storeName, company: s.company, logoV: s.logoV, pinMax: maxLen, version: APP.VERSION };
  if (String((d && d.logoV) || '') !== s.logoV) out.logo = logoSrc_(settings_());   // লোগো বদলালে তবেই পাঠানো হয়
  return out;
}

function throttle_() {
  var cache = CacheService.getScriptCache();
  var n = Number(cache.get('LOGIN_FAILS') || 0);
  if (n >= 25) throw err_('Too many wrong PINs. Please wait 5 minutes.', 'অনেকবার ভুল পিন দেওয়া হয়েছে। ৫ মিনিট পর চেষ্টা করুন।', 'THROTTLED');
}
function loginFail_() {
  var cache = CacheService.getScriptCache();
  cache.put('LOGIN_FAILS', String(Number(cache.get('LOGIN_FAILS') || 0) + 1), 300);
}

function findUserByPin_(pin, role) {
  var h = hashPin_(pin);
  var list = read_('users').rows.filter(function (u) {
    return u.PinHash === h && u.Status === 'ACTIVE' && (!role || u.Role === role);
  });
  return list[0] || null;
}

function newSession_(u) {
  var token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  CacheService.getScriptCache().put('S_' + token, json_({ uid: u.UserID, at: Date.now() }), APP.SESSION_SEC);
  u.LastLogin = stamp_();
  update_('users', [u]);
  return token;
}

function login_(d) {
  setupIfNeeded_();
  throttle_();
  var pin = str_(d.pin, 12);
  if (!/^\d{4,8}$/.test(pin)) throw err_('PIN must be 4 to 8 digits.', 'পিন ৪ থেকে ৮ ডিজিটের হতে হবে।');
  var u = findUserByPin_(pin);
  if (!u) { loginFail_(); throw err_('Wrong PIN, please try again.', 'ভুল পিন, আবার চেষ্টা করুন।', 'BAD_PIN'); }
  var token = newSession_(u);
  var ctx = { uid: u.UserID, name: u.Name, role: u.Role };
  log_(ctx, 'LOGIN', 'User', u.UserID, u.Name + ' logged in (' + u.Role + ')');
  return { token: token, boot: bootstrapData_(ctx, { logoV: String(d.logoV || '') }) };
}

/**
 * সংবেদনশীল কাজের (এডিট / ডিলিট / রিস্টোর / রিসেট) আগে পিন যাচাই — সার্ভারেই, শুধু স্ক্রিনে নয়।
 * সেশনের ইউজারের নিজের পিন লাগে (Admin Panel-এ ঢুকলে Admin-এর পিন, বাইরে সাধারণ ইউজারের পিন)।
 */
function pinCheck_(ctx, d) {
  throttle_();
  var pin = str_(d && d.authPin, 12);
  var u = /^\d{4,8}$/.test(pin) ? read_('users').rows.filter(function (x) { return x.UserID === ctx.uid; })[0] : null;
  if (!u || u.Status !== 'ACTIVE' || u.PinHash !== hashPin_(pin)) {
    loginFail_();
    log_(ctx, 'PIN_FAILED', 'User', ctx.uid, 'Wrong PIN on a protected action by ' + ctx.name);
    throw err_('Wrong PIN.', 'পিন ভুল।', 'BAD_PIN');
  }
}

function adminLogin_(ctx, d) {
  throttle_();
  var pin = str_(d.pin, 12);
  var u = /^\d{4,8}$/.test(pin) ? findUserByPin_(pin, 'ADMIN') : null;
  if (!u) {
    loginFail_();
    log_(ctx, 'ADMIN_PIN_FAILED', 'User', ctx.uid, 'Wrong admin PIN attempt by ' + ctx.name);
    throw err_('Wrong admin PIN.', 'অ্যাডমিন পিন ভুল।', 'BAD_PIN');
  }
  var token = newSession_(u);
  var actx = { uid: u.UserID, name: u.Name, role: u.Role };
  log_(actx, 'ADMIN_LOGIN', 'User', u.UserID, u.Name + ' opened Admin panel');
  return { token: token, boot: bootstrapData_(actx, { logoV: String(d.logoV || '') }) };
}

function logout_(ctx) {
  log_(ctx, 'LOGOUT', 'User', ctx.uid, ctx.name + ' logged out');
  return true;
}

function auth_(token, role) {
  token = String(token || '');
  if (!token) throw err_('Please log in again.', 'আবার লগইন করুন।', 'AUTH');
  var cache = CacheService.getScriptCache();
  var s = parse_(cache.get('S_' + token), null);
  if (!s || !s.uid) throw err_('Session expired. Please log in again.', 'সেশন শেষ হয়েছে, আবার লগইন করুন।', 'AUTH');
  var u = read_('users').rows.filter(function (x) { return x.UserID === s.uid; })[0];
  if (!u || u.Status !== 'ACTIVE') throw err_('Your account is not active.', 'আপনার অ্যাকাউন্ট সক্রিয় নেই।', 'AUTH');
  if (role === 'ADMIN' && u.Role !== 'ADMIN') throw err_('Admin permission required.', 'এই কাজটি শুধুমাত্র অ্যাডমিন করতে পারবে।', 'FORBIDDEN');
  cache.put('S_' + token, json_(s), APP.SESSION_SEC);   // sliding session
  return { uid: u.UserID, name: u.Name, role: u.Role };
}

/* ---------------------------------------------------------------------
 *  ACTIVITY LOG
 * ------------------------------------------------------------------- */
function log_(ctx, action, entity, entityId, summary, oldV, newV) {
  try {
    append_('logs', [{
      LogID: uid_('LG-', 12), Timestamp: stamp_(),
      UserName: ctx ? ctx.name : 'System', UserID: ctx ? ctx.uid : '', Role: ctx ? ctx.role : 'SYSTEM',
      Action: action, Entity: entity || '', EntityID: entityId || '', Summary: str_(summary, 1000),
      OldValue: oldV === undefined ? '' : str_(json_(oldV), 45000),
      NewValue: newV === undefined ? '' : str_(json_(newV), 45000),
      Status: 'ACTIVE', DeletedAt: '', DeletedBy: '', DeleteReason: ''
    }]);
  } catch (e) { /* লগ লিখতে ব্যর্থ হলেও মূল কাজ বন্ধ হবে না */ }
}

function logOut_(r) {
  return {
    id: r.LogID, ts: r.Timestamp, user: r.UserName, uid: r.UserID, role: r.Role, action: r.Action,
    entity: r.Entity, eid: r.EntityID, summary: r.Summary, oldV: r.OldValue, newV: r.NewValue,
    status: r.Status || 'ACTIVE', deletedAt: r.DeletedAt, deletedBy: r.DeletedBy, reason: r.DeleteReason
  };
}

function dateMatch_(d, f) {
  d = String(d || '').slice(0, 10);
  if (f.date && d !== f.date) return false;
  if (f.from && d < f.from) return false;
  if (f.to && d > f.to) return false;
  if (f.month && d.slice(0, 7) !== f.month) return false;
  if (f.year && d.slice(0, 4) !== String(f.year)) return false;
  return true;
}

function page_(list, d) {
  var size = Number(d.size) || 50;
  if (size <= 0 || size > APP.MAX_PAGE) size = APP.MAX_PAGE;
  var pages = Math.max(1, Math.ceil(list.length / size));
  var page = Math.min(Math.max(1, Number(d.page) || 1), pages);
  return { page: page, pages: pages, size: size, total: list.length, slice: list.slice((page - 1) * size, page * size) };
}

function queryLogs_(ctx, d) {
  var status = ctx.role === 'ADMIN' ? String(d.status || 'ACTIVE') : 'ACTIVE';
  var q = str_(d.q, 100).toLowerCase();
  var all = read_('logs').rows;
  var users = {}, actions = {};
  var list = all.filter(function (r) {
    users[r.UserName] = 1; actions[r.Action] = 1;
    var st = r.Status || 'ACTIVE';
    if (status !== 'ALL' && st !== status) return false;
    if (d.action && r.Action !== d.action) return false;
    if (d.user && r.UserName !== d.user) return false;
    if (!dateMatch_(r.Timestamp, d)) return false;
    if (q && (r.Summary + ' ' + r.EntityID + ' ' + r.UserName + ' ' + r.Action + ' ' + r.LogID).toLowerCase().indexOf(q) < 0) return false;
    return true;
  });
  list.sort(function (a, b) { return a.Timestamp < b.Timestamp ? 1 : a.Timestamp > b.Timestamp ? -1 : b._row - a._row; });
  var p = page_(list, d);
  return { rows: p.slice.map(logOut_), page: p.page, pages: p.pages, total: p.total,
    users: Object.keys(users).sort(), actions: Object.keys(actions).sort() };
}

function logDelete_(ctx, d) {
  var ids = Array.isArray(d.ids) ? d.ids.map(String) : [];
  var reason = str_(d.reason, 300);
  if (!ids.length) throw err_('Select at least one log.', 'কমপক্ষে একটি লগ নির্বাচন করুন।');
  if (!reason) throw err_('Reason is required.', 'কারণ লিখতে হবে।');
  return withLock_(function () {
    var now = stamp_(), upd = [];
    read_('logs').rows.forEach(function (r) {
      if (ids.indexOf(r.LogID) >= 0 && (r.Status || 'ACTIVE') === 'ACTIVE') {
        r.Status = 'DELETED'; r.DeletedAt = now; r.DeletedBy = ctx.name; r.DeleteReason = reason; upd.push(r);
      }
    });
    update_('logs', upd);
    log_(ctx, 'LOG_DELETE', 'ActivityLog', upd.map(function (r) { return r.LogID; }).join(','),
      upd.length + ' log(s) moved to Deleted Records. Reason: ' + reason);
    bumpRev_();
    return { deleted: upd.length };
  });
}

/* ---------------------------------------------------------------------
 *  PRODUCTS
 * ------------------------------------------------------------------- */
function productOut_(p, s) {
  s = s || {};
  return {
    id: p.ProductID, code: p.Code, name: p.Name, pack: p.PackSize, unit: p.Unit, cat: p.Category,
    order: Number(p.DisplayOrder) || 0, min: num_(p.MinStock), status: p.Status || 'ACTIVE', deleted: bool_(p.Deleted),
    stock: round_(s.stock || 0), tin: round_(s.tin || 0), tout: round_(s.tout || 0), adj: round_(s.adj || 0),
    lin: s.lin === undefined ? null : s.lin, lind: s.lind || '', lout: s.lout === undefined ? null : s.lout, loutd: s.loutd || '',
    txCount: s.count || 0, allTx: s.all || 0,
    deletedAt: p.DeletedAt, deletedBy: p.DeletedBy, reason: p.DeleteReason, updatedAt: p.UpdatedAt
  };
}

function byOrder_(a, b) {
  return (Number(a.DisplayOrder) || 1e9) - (Number(b.DisplayOrder) || 1e9) || String(a.Name).localeCompare(String(b.Name));
}

function productSave_(ctx, d) {
  var id = str_(d.id, 40);
  var code = str_(d.code, 40), name = str_(d.name, 150);
  if (!code) throw err_('Product Code is required.', 'Product Code দিতে হবে।');
  if (!name) throw err_('Product Name is required.', 'Product Name দিতে হবে।');
  var min = num_(d.min);
  if (min < 0) throw err_('Minimum stock cannot be negative.', 'Minimum Stock ঋণাত্মক হতে পারবে না।');
  var status = d.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';
  return withLock_(function () {
    var rows = read_('products').rows;
    var dup = rows.filter(function (p) { return p.ProductID !== id && String(p.Code).toLowerCase() === code.toLowerCase(); })[0];
    if (dup) throw err_('Product Code "' + code + '" is already used by ' + dup.Name + (bool_(dup.Deleted) ? ' (in Deleted Records)' : '') + '.',
      'Product Code "' + code + '" আগে থেকেই ' + dup.Name + (bool_(dup.Deleted) ? ' (Deleted Records-এ আছে)' : '') + ' প্রোডাক্টে ব্যবহৃত।');
    var now = stamp_(), p, oldV = null;
    if (id) {
      p = rows.filter(function (x) { return x.ProductID === id; })[0];
      if (!p || bool_(p.Deleted)) throw err_('Product not found.', 'প্রোডাক্ট পাওয়া যায়নি।');
      oldV = clean_(p);
    } else {
      p = { ProductID: uniqueId_('PRD-', rows.map(function (x) { return x.ProductID; })), CreatedAt: now, CreatedBy: ctx.name, Deleted: 'FALSE' };
      rows.push(p);
    }
    p.Code = code; p.Name = name; p.PackSize = str_(d.pack, 40); p.Unit = str_(d.unit, 30); p.Category = str_(d.cat, 60);
    p.MinStock = String(round_(min)); p.Status = status; p.UpdatedAt = now; p.UpdatedBy = ctx.name;
    // Display Order: নির্দিষ্ট ক্রমে বসানো, বাকিগুলো স্বয়ংক্রিয়ভাবে সরে যাবে
    var live = rows.filter(function (x) { return !bool_(x.Deleted) && x !== p; }).sort(byOrder_);
    var want = Math.round(num_(d.order));
    var pos = want >= 1 ? Math.min(want, live.length + 1) : (id ? (Number(oldV.DisplayOrder) || live.length + 1) : live.length + 1);
    live.splice(pos - 1, 0, p);
    live.forEach(function (x, i) { x.DisplayOrder = String(i + 1); });
    var del = rows.filter(function (x) { return bool_(x.Deleted); });
    rewrite_('products', live.concat(del));
    // নতুন ক্যাটাগরি হলে সেটিংসের ক্যাটাগরি তালিকায় যোগ হবে (ড্রপডাউনে পরে দেখাবে)
    if (p.Category) {
      var sc = settings_(), cats = listSetting_(sc, 'categories', []);
      if (!cats.some(function (c) { return String(c).toLowerCase() === p.Category.toLowerCase(); })) {
        cats.push(p.Category);
        setSettings_({ categories: json_(cats) });
      }
    }
    log_(ctx, id ? 'PRODUCT_EDIT' : 'PRODUCT_ADD', 'Product', p.ProductID,
      (id ? 'Product updated: ' : 'Product added: ') + code + ' - ' + name, oldV || undefined, clean_(p));
    rebuildInventory_();
    bumpRev_();
    return { id: p.ProductID, boot: bootstrapData_(ctx) };
  });
}

function uniqueId_(prefix, existing) {
  var set = {};
  existing.forEach(function (x) { set[x] = 1; });
  var id;
  do { id = uid_(prefix, 8); } while (set[id]);
  return id;
}

function productStatus_(ctx, d) {
  var id = str_(d.id, 40), status = d.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';
  return withLock_(function () {
    var p = read_('products').rows.filter(function (x) { return x.ProductID === id && !bool_(x.Deleted); })[0];
    if (!p) throw err_('Product not found.', 'প্রোডাক্ট পাওয়া যায়নি।');
    var old = p.Status;
    p.Status = status; p.UpdatedAt = stamp_(); p.UpdatedBy = ctx.name;
    update_('products', [p]);
    log_(ctx, 'PRODUCT_STATUS', 'Product', id, p.Code + ' - ' + p.Name + ': ' + old + ' → ' + status, { Status: old }, { Status: status });
    bumpRev_();
    return { boot: bootstrapData_(ctx) };
  });
}

function productReorder_(ctx, d) {
  var ids = Array.isArray(d.ids) ? d.ids.map(String) : [];
  return withLock_(function () {
    var rows = read_('products').rows;
    var live = rows.filter(function (x) { return !bool_(x.Deleted); }).sort(byOrder_);
    var map = {}; live.forEach(function (x) { map[x.ProductID] = x; });
    var ordered = [];
    ids.forEach(function (id) { if (map[id]) { ordered.push(map[id]); delete map[id]; } });
    live.forEach(function (x) { if (map[x.ProductID]) ordered.push(x); });   // তালিকায় না থাকলে আগের ক্রমে শেষে
    var before = live.map(function (x) { return x.Code; });
    ordered.forEach(function (x, i) { x.DisplayOrder = String(i + 1); });
    rewrite_('products', ordered.concat(rows.filter(function (x) { return bool_(x.Deleted); })));
    log_(ctx, 'PRODUCT_REORDER', 'Product', '', 'Product display order changed', before, ordered.map(function (x) { return x.Code; }));
    bumpRev_();
    return { boot: bootstrapData_(ctx) };
  });
}

/** Product Delete: History থাকলে Soft Delete, না থাকলে (এবং চাইলে) Permanent */
function productDelete_(ctx, d) {
  var id = str_(d.id, 40), reason = str_(d.reason, 300);
  if (!reason) throw err_('Reason is required.', 'কারণ লিখতে হবে।');
  return withLock_(function () {
    var rows = read_('products').rows;
    var p = rows.filter(function (x) { return x.ProductID === id && !bool_(x.Deleted); })[0];
    if (!p) throw err_('Product not found.', 'প্রোডাক্ট পাওয়া যায়নি।');
    var hasTx = read_('txns').rows.some(function (t) { return t.ProductID === id; });
    var permanent = d.permanent === true && !hasTx;
    var old = clean_(p);
    if (permanent) {
      var keepLive = rows.filter(function (x) { return x !== p && !bool_(x.Deleted); }).sort(byOrder_);
      keepLive.forEach(function (x, i) { x.DisplayOrder = String(i + 1); });
      rewrite_('products', keepLive.concat(rows.filter(function (x) { return x !== p && bool_(x.Deleted); })));
      log_(ctx, 'PRODUCT_PURGE', 'Product', id, 'Product permanently deleted: ' + p.Code + ' - ' + p.Name + '. Reason: ' + reason, old);
    } else {
      p.Deleted = 'TRUE'; p.Status = 'INACTIVE'; p.DeletedAt = stamp_(); p.DeletedBy = ctx.name; p.DeleteReason = reason;
      var live = rows.filter(function (x) { return !bool_(x.Deleted); }).sort(byOrder_);
      live.forEach(function (x, i) { x.DisplayOrder = String(i + 1); });
      rewrite_('products', live.concat(rows.filter(function (x) { return bool_(x.Deleted); })));
      log_(ctx, 'PRODUCT_DELETE', 'Product', id, 'Product moved to Deleted Records: ' + p.Code + ' - ' + p.Name + '. Reason: ' + reason, old);
    }
    rebuildInventory_();
    bumpRev_();
    return { permanent: permanent, hadHistory: hasTx, boot: bootstrapData_(ctx) };
  });
}

/* ---------------------------------------------------------------------
 *  STOCK CALCULATION (সবসময় Transaction থেকে হিসাব — নির্ভুল)
 * ------------------------------------------------------------------- */
function txSort_(a, b) {
  return a.TxnDate < b.TxnDate ? -1 : a.TxnDate > b.TxnDate ? 1 : (a.CreatedAt < b.CreatedAt ? -1 : a.CreatedAt > b.CreatedAt ? 1 : a._row - b._row);
}

function activeTxns_() {
  return read_('txns').rows.filter(function (t) { return (t.Status || 'ACTIVE') === 'ACTIVE'; });
}

function signed_(t) {
  var q = num_(t.Quantity);
  return t.Type === 'IN' ? q : t.Type === 'OUT' ? -q : q;     // ADJ = signed quantity
}

function computeStock_(txns) {
  var map = {};
  txns.slice().sort(txSort_).forEach(function (t) {
    var s = map[t.ProductID] || (map[t.ProductID] = { stock: 0, tin: 0, tout: 0, adj: 0, count: 0 });
    var q = num_(t.Quantity);
    s.stock = round_(s.stock + signed_(t));
    s.count++;
    if (t.Type === 'IN') { s.tin += q; s.lin = q; s.lind = t.TxnDate; }
    else if (t.Type === 'OUT') { s.tout += q; s.lout = q; s.loutd = t.TxnDate; }
    else s.adj += q;
  });
  return map;
}

function stockMap_() {
  var map = computeStock_(activeTxns_());
  read_('txns').rows.forEach(function (t) { var s = map[t.ProductID] || (map[t.ProductID] = { stock: 0, tin: 0, tout: 0, adj: 0, count: 0 }); s.all = (s.all || 0) + 1; });
  return map;
}

/** DB_Inventory শিট = বর্তমান স্টকের স্ন্যাপশট (শুধু দেখার জন্য, হিসাব Transaction থেকে) */
function rebuildInventory_() {
  var st = computeStock_(activeTxns_()), now = stamp_();
  var rows = read_('products').rows.filter(function (p) { return !bool_(p.Deleted); }).sort(byOrder_).map(function (p) {
    var s = st[p.ProductID] || {};
    return {
      ProductID: p.ProductID, Code: p.Code, Name: p.Name, PackSize: p.PackSize, Unit: p.Unit,
      TotalIn: round_(s.tin || 0), TotalOut: round_(s.tout || 0), Adjustment: round_(s.adj || 0), CurrentStock: round_(s.stock || 0),
      LastInQty: s.lin === undefined ? '' : s.lin, LastInDate: s.lind || '', LastOutQty: s.lout === undefined ? '' : s.lout,
      LastOutDate: s.loutd || '', UpdatedAt: now
    };
  });
  rewrite_('inventory', rows);
}

/* ---------------------------------------------------------------------
 *  BOOTSTRAP & DASHBOARD
 * ------------------------------------------------------------------- */
function txnOut_(r) {
  return {
    id: r.TxnID, batch: r.BatchID, date: r.TxnDate, time: r.TxnTime, type: r.Type, pid: r.ProductID,
    code: r.ProductCode, name: r.ProductName, pack: r.PackSize, unit: r.Unit, qty: num_(r.Quantity),
    prev: num_(r.PrevStock), next: num_(r.NewStock), user: r.UserName, remarks: r.Remarks, status: r.Status || 'ACTIVE',
    created: r.CreatedAt, edits: Number(r.EditCount) || 0, editedAt: r.EditedAt, editedBy: r.EditedBy,
    deletedAt: r.DeletedAt, deletedBy: r.DeletedBy, reason: r.DeleteReason, source: r.Source
  };
}

function lastBatch_(txns) {
  var last = null;
  txns.forEach(function (t) { if (t.Type !== 'ADJ' && (!last || t.CreatedAt > last.CreatedAt || (t.CreatedAt === last.CreatedAt && t._row > last._row))) last = t; });
  if (!last) return null;
  return txns.filter(function (t) { return t.BatchID === last.BatchID; }).sort(function (a, b) { return a._row - b._row; }).slice(0, 40).map(txnOut_);
}

function bootstrapData_(ctx, opt) {
  // প্রোডাক্ট + স্টক + সর্বশেষ ব্যাচ: টেবিল বদলালেই শুধু আবার হিসাব হয়, নইলে ক্যাশ থেকে আসে (সব ট্রানজ্যাকশন বারবার পড়তে হয় না)
  var products, lastBatch, bdKey = 'BD_' + scVer_('products') + '_' + scVer_('txns'), cache = CacheService.getScriptCache(), hit = null;
  try { var raw = cache.get(bdKey); if (raw) hit = JSON.parse(raw); } catch (e) { hit = null; }
  if (hit) { products = hit.p; lastBatch = hit.b; }
  else {
    var st = stockMap_();
    var txns = activeTxns_();
    products = read_('products').rows.filter(function (p) { return !bool_(p.Deleted); }).sort(byOrder_)
      .map(function (p) { return productOut_(p, st[p.ProductID]); });
    lastBatch = lastBatch_(txns);
    try { var js = JSON.stringify({ p: products, b: lastBatch }); if (js.length < 90000) cache.put(bdKey, js, 21600); } catch (e) {}
  }
  var s = settings_();
  var defaults = read_('users').rows.filter(function (u) {
    return u.Status === 'ACTIVE' && ((u.UserID === 'U-ADMIN' && u.PinHash === hashPin_(APP.DEFAULT_ADMIN_PIN)) || (u.UserID === 'U-STORE' && u.PinHash === hashPin_(APP.DEFAULT_USER_PIN)));
  }).length;
  var out = {
    user: ctx, settings: bootSettings_(opt), products: products, lastBatch: lastBatch,
    rev: rev_(), today: today_(), serverTime: stamp_()
  };
  if (ctx && ctx.role === 'ADMIN') {
    out.admin = {
      // সব প্রোডাক্ট কোড (Deleted সহ) — নতুন প্রোডাক্টের কোড সাজেস্ট ও ডুপ্লিকেট আটকাতে
      codes: read_('products').rows.map(function (p) { return [p.ProductID, p.Code]; }),
      defaultPins: defaults,
      driveFolder: String(s.drive_folder_id || ''),
      lastBackup: s.backup_last_ok_at || '',
      backupStatus: s.backup_last_status || ''
    };
  }
  return out;
}

/** লোগো (বড় ডাটা) প্রতিবার না পাঠিয়ে শুধু বদলালে পাঠানো হয় */
function bootSettings_(opt) {
  var ps = publicSettings_(false);
  if (opt && opt.logoV !== undefined && String(opt.logoV) !== ps.logoV) ps.logo = logoSrc_(settings_());
  return ps;
}

function dashboard_(ctx, d) {
  var month = /^\d{4}-\d{2}$/.test(d.month || '') ? d.month : today_().slice(0, 7);
  var day = isDate_(d.date) ? d.date : today_();
  var txns = activeTxns_();
  var st = computeStock_(txns);
  var products = read_('products').rows.filter(function (p) { return !bool_(p.Deleted); });
  var t = { inQty: 0, outQty: 0, count: 0, batches: {} }, m = { inQty: 0, outQty: 0, count: 0, batches: {} };
  var outByProduct = {}, inByProduct = {};
  txns.forEach(function (x) {
    var q = num_(x.Quantity);
    if (x.TxnDate === day) {
      t.count++; t.batches[x.BatchID] = 1;
      if (x.Type === 'IN') t.inQty += q; else if (x.Type === 'OUT') t.outQty += q;
    }
    if (x.TxnDate.slice(0, 7) === month) {
      m.count++; m.batches[x.BatchID] = 1;
      if (x.Type === 'IN') { m.inQty += q; inByProduct[x.ProductID] = (inByProduct[x.ProductID] || 0) + q; }
      else if (x.Type === 'OUT') { m.outQty += q; outByProduct[x.ProductID] = (outByProduct[x.ProductID] || 0) + q; }
    }
  });
  var low = 0, out = 0, total = 0, active = 0;
  products.forEach(function (p) {
    var s = (st[p.ProductID] || {}).stock || 0;
    total += s;
    if (p.Status === 'ACTIVE') active++;
    if (s <= 0 && p.Status === 'ACTIVE') out++;
    if (num_(p.MinStock) > 0 && s < num_(p.MinStock)) low++;
  });
  var pmap = {}; products.forEach(function (p) { pmap[p.ProductID] = p; });
  var top = function (obj) {
    return Object.keys(obj).map(function (k) { var p = pmap[k] || {}; return { id: k, code: p.Code || '', name: p.Name || '', pack: p.PackSize || '', unit: p.Unit || '', qty: round_(obj[k]) }; })
      .sort(function (a, b) { return b.qty - a.qty; }).slice(0, 5);
  };
  var recent = txns.slice().sort(function (a, b) { return txSort_(b, a); }).slice(0, 10).map(txnOut_);
  var days = {}; txns.forEach(function (x) { days[x.TxnDate] = 1; });
  days[today_()] = 1;
  return {
    month: month, date: day,
    today: { inQty: round_(t.inQty), outQty: round_(t.outQty), lines: t.count, batches: Object.keys(t.batches).length },
    monthly: { inQty: round_(m.inQty), outQty: round_(m.outQty), lines: m.count, batches: Object.keys(m.batches).length },
    stock: { total: round_(total), products: products.length, active: active, low: low, out: out },
    topOut: top(outByProduct), topIn: top(inByProduct), recent: recent,
    days: Object.keys(days).sort().reverse().slice(0, 60)
  };
}

/* ---------------------------------------------------------------------
 *  TRANSACTIONS
 * ------------------------------------------------------------------- */
function saveTransactions_(ctx, d) {
  var type = String(d.type || '').toUpperCase();
  if (type !== 'IN' && type !== 'OUT') throw err_('Invalid transaction type.', 'ভুল ট্রানজ্যাকশন টাইপ।');
  var date = isDate_(d.date) ? d.date : today_();
  if (date > today_()) throw err_('Future date is not allowed.', 'ভবিষ্যতের তারিখ দেওয়া যাবে না।');
  var items = Array.isArray(d.items) ? d.items : [];
  if (!items.length) throw err_('Add at least 1 product with quantity.', 'কমপক্ষে ১টি প্রোডাক্ট ও পরিমাণ দিন।');
  if (items.length > APP.MAX_ITEMS_PER_TXN) throw err_('Too many rows in one entry (max ' + APP.MAX_ITEMS_PER_TXN + ').', 'এক এন্ট্রিতে সর্বোচ্চ ' + APP.MAX_ITEMS_PER_TXN + 'টি সারি।');
  var reqId = str_(d.requestId, 60);
  var remarks = str_(d.remarks, 300);

  return withLock_(function () {
    var all = read_('txns').rows;
    if (reqId) {
      var dupRows = all.filter(function (t) { return t.RequestID === reqId; });
      if (dupRows.length) return { duplicate: true, batch: dupRows.map(txnOut_), boot: bootstrapData_(ctx) };
    }
    var pmap = {};
    read_('products').rows.forEach(function (p) { pmap[p.ProductID] = p; });
    var stock = computeStock_(activeTxns_());
    var batchId = 'B-' + fmt_(new Date(), 'yyMMddHHmmss') + '-' + uid_('', 4);
    var now = new Date(), created = fmt_(now, 'yyyy-MM-dd HH:mm:ss'), time = fmt_(now, 'HH:mm:ss');
    var ids = {}; all.forEach(function (t) { ids[t.TxnID] = 1; });
    var rows = items.map(function (it, i) {
      var p = pmap[str_(it.productId, 40)];
      if (!p || bool_(p.Deleted)) throw err_('Row ' + (i + 1) + ': product not found.', 'সারি ' + (i + 1) + ': প্রোডাক্ট পাওয়া যায়নি।');
      if (p.Status !== 'ACTIVE') throw err_(p.Name + ' is inactive.', p.Name + ' নিষ্ক্রিয় (Inactive) প্রোডাক্ট।');
      var q = round_(num_(it.qty));
      if (!(q > 0)) throw err_('Row ' + (i + 1) + ': quantity must be greater than 0.', 'সারি ' + (i + 1) + ': পরিমাণ ০-এর বেশি হতে হবে।');
      var s = stock[p.ProductID] || (stock[p.ProductID] = { stock: 0 });
      var prev = round_(s.stock);
      if (type === 'OUT' && q > prev + 1e-9) {
        throw err_('Not enough stock for ' + p.Code + ' - ' + p.Name + ' (available ' + prev + ').',
          p.Code + ' - ' + p.Name + ' এর স্টক কম (বর্তমান ' + prev + '), OUT করা যাবে না।', 'LOW_STOCK');
      }
      s.stock = round_(type === 'IN' ? prev + q : prev - q);
      var id;
      do { id = 'TX-' + fmt_(now, 'yyMMdd') + '-' + uid_('', 8); } while (ids[id]);
      ids[id] = 1;
      return {
        TxnID: id, BatchID: batchId, TxnDate: date, TxnTime: time, Type: type, ProductID: p.ProductID,
        ProductCode: p.Code, ProductName: p.Name, PackSize: p.PackSize, Unit: p.Unit, Quantity: q,
        PrevStock: prev, NewStock: s.stock, UserName: ctx.name, UserID: ctx.uid, Remarks: str_(it.remarks, 200) || remarks,
        Status: 'ACTIVE', CreatedAt: created, EditCount: 0, EditedAt: '', EditedBy: '', DeletedAt: '', DeletedBy: '',
        DeleteReason: '', RequestID: reqId, Source: 'APP'
      };
    });
    append_('txns', rows);
    rebuildInventory_();
    log_(ctx, type === 'IN' ? 'STOCK_IN' : 'STOCK_OUT', 'Transaction', batchId,
      'Stock ' + type + ': ' + rows.length + ' item(s) — ' + rows.map(function (r) { return r.ProductCode + ' × ' + r.Quantity; }).join(', '),
      undefined, rows.map(function (r) { return { TxnID: r.TxnID, Code: r.ProductCode, Qty: r.Quantity, Prev: r.PrevStock, New: r.NewStock }; }));
    bumpRev_();
    return { batch: rows.map(function (r, i) { r._row = i; return txnOut_(r); }), boot: bootstrapData_(ctx) };
  });
}

function txnFilter_(ctx, d) {
  var status = ctx.role === 'ADMIN' ? String(d.status || 'ACTIVE') : 'ACTIVE';
  var q = str_(d.q, 100).toLowerCase();
  return function (r) {
    var st = r.Status || 'ACTIVE';
    if (status !== 'ALL' && st !== status) return false;
    if (d.type && r.Type !== d.type) return false;
    if (d.productId && r.ProductID !== d.productId) return false;
    if (d.user && r.UserName !== d.user) return false;
    if (!dateMatch_(r.TxnDate, d)) return false;
    if (q && (r.ProductCode + ' ' + r.ProductName + ' ' + r.ProductID + ' ' + r.TxnID + ' ' + r.BatchID + ' ' + r.Remarks + ' ' + r.PackSize).toLowerCase().indexOf(q) < 0) return false;
    return true;
  };
}

function queryTransactions_(ctx, d) {
  var all = read_('txns').rows;
  var users = {};
  all.forEach(function (r) { if (r.UserName) users[r.UserName] = 1; });
  var list = all.filter(txnFilter_(ctx, d)).sort(function (a, b) { return txSort_(b, a); });
  var sum = { IN: 0, OUT: 0, ADJ: 0 };
  list.forEach(function (r) { if ((r.Status || 'ACTIVE') === 'ACTIVE') sum[r.Type] = (sum[r.Type] || 0) + num_(r.Quantity); });
  var p = page_(list, d);
  return { rows: p.slice.map(txnOut_), page: p.page, pages: p.pages, total: p.total,
    sum: { IN: round_(sum.IN), OUT: round_(sum.OUT), ADJ: round_(sum.ADJ) }, users: Object.keys(users).sort() };
}

function txnHistory_(ctx, d) {
  var id = str_(d.id, 60);
  var t = read_('txns').rows.filter(function (r) { return r.TxnID === id; })[0];
  if (!t || (ctx.role !== 'ADMIN' && t.Status !== 'ACTIVE')) throw err_('Transaction not found.', 'ট্রানজ্যাকশন পাওয়া যায়নি।');
  var logs = read_('logs').rows.filter(function (r) {
    return (r.Status || 'ACTIVE') === 'ACTIVE' && (r.EntityID === id || r.EntityID === t.BatchID || String(r.EntityID).split(',').indexOf(id) >= 0);
  }).sort(function (a, b) { return a.Timestamp < b.Timestamp ? -1 : 1; }).map(logOut_);
  return { txn: txnOut_(t), logs: logs };
}

/** নতুন অবস্থায় কোনো প্রোডাক্টের স্টক ঋণাত্মক হলে আটকানো */
function assertNonNegative_(txns, pid, label) {
  var st = computeStock_(txns.filter(function (t) { return (t.Status || 'ACTIVE') === 'ACTIVE'; }))[pid];
  var v = st ? st.stock : 0;
  if (v < -1e-9) throw err_(label + ': stock would become negative (' + round_(v) + ').', label + ': স্টক ঋণাত্মক (' + round_(v) + ') হয়ে যাবে, তাই করা যাবে না।', 'LOW_STOCK');
}

function txnUpdate_(ctx, d) {
  var id = str_(d.id, 60), reason = str_(d.reason, 300);
  var q = round_(num_(d.qty));
  if (!(q > 0)) throw err_('Quantity must be greater than 0.', 'পরিমাণ ০-এর বেশি হতে হবে।');
  var date = str_(d.date, 10);
  if (!isDate_(date) || date > today_()) throw err_('Invalid date.', 'তারিখ সঠিক নয়।');
  if (!reason) throw err_('Edit reason is required.', 'এডিটের কারণ লিখতে হবে।');
  return withLock_(function () {
    var all = read_('txns').rows;
    var t = all.filter(function (r) { return r.TxnID === id; })[0];
    if (!t || t.Status !== 'ACTIVE') throw err_('Transaction not found.', 'ট্রানজ্যাকশন পাওয়া যায়নি।');
    if (t.Type === 'ADJ') throw err_('Opening adjustments cannot be edited.', 'Opening Adjustment এডিট করা যায় না।');
    var old = { Quantity: t.Quantity, TxnDate: t.TxnDate, Remarks: t.Remarks };
    var neu = { Quantity: String(q), TxnDate: date, Remarks: str_(d.remarks, 300) };
    if (num_(old.Quantity) === q && old.TxnDate === date && old.Remarks === neu.Remarks) throw err_('Nothing changed.', 'কোনো পরিবর্তন নেই।');
    t.Quantity = neu.Quantity; t.TxnDate = neu.TxnDate; t.Remarks = neu.Remarks;
    assertNonNegative_(all, t.ProductID, t.ProductCode + ' - ' + t.ProductName);
    t.NewStock = String(round_(num_(t.PrevStock) + (t.Type === 'IN' ? q : -q)));   // স্ন্যাপশট নতুন পরিমাণ অনুযায়ী
    t.EditCount = String((Number(t.EditCount) || 0) + 1); t.EditedAt = stamp_(); t.EditedBy = ctx.name;
    update_('txns', [t]);
    rebuildInventory_();
    log_(ctx, 'TXN_EDIT', 'Transaction', id, 'Transaction edited: ' + t.Type + ' ' + t.ProductCode + ' (' + old.Quantity + ' → ' + q + ', ' + old.TxnDate + ' → ' + date + '). Reason: ' + reason, old, neu);
    bumpRev_();
    return { txn: txnOut_(t), boot: bootstrapData_(ctx) };
  });
}

function txnDelete_(ctx, d) {
  var ids = Array.isArray(d.ids) ? d.ids.map(String) : [];
  var reason = str_(d.reason, 300);
  if (!ids.length) throw err_('Select at least one transaction.', 'কমপক্ষে একটি ট্রানজ্যাকশন নির্বাচন করুন।');
  if (!reason) throw err_('Reason is required.', 'কারণ লিখতে হবে।');
  return withLock_(function () {
    var all = read_('txns').rows, now = stamp_(), upd = [];
    all.forEach(function (t) {
      if (ids.indexOf(t.TxnID) >= 0 && t.Status === 'ACTIVE') {
        t.Status = 'DELETED'; t.DeletedAt = now; t.DeletedBy = ctx.name; t.DeleteReason = reason; upd.push(t);
      }
    });
    if (!upd.length) throw err_('Transaction not found.', 'ট্রানজ্যাকশন পাওয়া যায়নি।');
    upd.forEach(function (t) { assertNonNegative_(all, t.ProductID, t.ProductCode + ' - ' + t.ProductName); });
    update_('txns', upd);
    rebuildInventory_();
    log_(ctx, 'TXN_DELETE', 'Transaction', upd.map(function (t) { return t.TxnID; }).join(','),
      upd.length + ' transaction(s) moved to Deleted Records (' + upd.map(function (t) { return t.Type + ' ' + t.ProductCode + ' × ' + t.Quantity; }).join(', ') + '). Reason: ' + reason,
      upd.map(clean_));
    bumpRev_();
    return { deleted: upd.length, boot: bootstrapData_(ctx) };
  });
}

/* ---------------------------------------------------------------------
 *  LEDGER & MONTHLY REPORT
 * ------------------------------------------------------------------- */
function ledger_(ctx, d) {
  var pid = str_(d.productId, 40);
  var p = read_('products').rows.filter(function (x) { return x.ProductID === pid; })[0];
  if (!p) throw err_('Select a product.', 'একটি প্রোডাক্ট নির্বাচন করুন।');
  var from = isDate_(d.from) ? d.from : '', to = isDate_(d.to) ? d.to : '';
  var list = activeTxns_().filter(function (t) { return t.ProductID === pid; }).sort(txSort_);
  var bal = 0, opening = 0, rows = [], tin = 0, tout = 0, tadj = 0;
  list.forEach(function (t) {
    var s = signed_(t);
    if (from && t.TxnDate < from) { opening = round_(opening + s); bal = opening; return; }
    if (to && t.TxnDate > to) return;
    bal = round_(bal + s);
    var q = num_(t.Quantity);
    if (t.Type === 'IN') tin += q; else if (t.Type === 'OUT') tout += q; else tadj += q;
    var o = txnOut_(t); o.balance = bal; rows.push(o);
  });
  return { product: productOut_(p, stockMap_()[pid]), opening: opening, rows: rows, closing: bal,
    tin: round_(tin), tout: round_(tout), tadj: round_(tadj) };
}

function monthlyReport_(ctx, d) {
  var month = /^\d{4}-\d{2}$/.test(d.month || '') ? d.month : today_().slice(0, 7);
  var r = stockReport_(ctx, { from: month + '-01', to: month + '-31' });
  r.month = month;
  return r;
}

/** নির্দিষ্ট সময়ের স্টক (Current Stock পেজের মাস / বছর / তারিখ ফিল্টার): Opening → IN / OUT → Closing */
function stockReport_(ctx, d) {
  var from = isDate_(d.from) ? d.from : '', to = isDate_(d.to) ? d.to : '';
  if (from && to && from > to) throw err_('Invalid date range.', 'তারিখ সীমা সঠিক নয়।');
  var res = {};
  activeTxns_().forEach(function (t) {
    var r = res[t.ProductID] || (res[t.ProductID] = { opening: 0, tin: 0, tout: 0, adj: 0 });
    if (from && t.TxnDate < from) r.opening += signed_(t);
    else if (!to || t.TxnDate <= to) {
      var q = num_(t.Quantity);
      if (t.Type === 'IN') r.tin += q; else if (t.Type === 'OUT') r.tout += q; else r.adj += q;
    }
  });
  var rows = read_('products').rows.sort(function (a, b) {
    return (bool_(a.Deleted) ? 1 : 0) - (bool_(b.Deleted) ? 1 : 0) || byOrder_(a, b);
  }).filter(function (p) {
    var r = res[p.ProductID];
    return !bool_(p.Deleted) || (r && (r.opening || r.tin || r.tout || r.adj));
  }).map(function (p) {
    var r = res[p.ProductID] || { opening: 0, tin: 0, tout: 0, adj: 0 };
    return { id: p.ProductID, code: p.Code, name: p.Name, pack: p.PackSize, unit: p.Unit, cat: p.Category, order: Number(p.DisplayOrder) || 0,
      status: p.Status, deleted: bool_(p.Deleted), min: num_(p.MinStock),
      opening: round_(r.opening), tin: round_(r.tin), tout: round_(r.tout), adj: round_(r.adj), closing: round_(r.opening + r.tin - r.tout + r.adj) };
  });
  return { from: from, to: to, rows: rows };
}

function nextMonth_(m) {
  var y = Number(m.slice(0, 4)), mo = Number(m.slice(5, 7)) + 1;
  if (mo > 12) { mo = 1; y++; }
  return y + '-' + ('0' + mo).slice(-2);
}

/* ---------------------------------------------------------------------
 *  DELETED RECORDS (Restore / Permanent Delete — শুধু Admin)
 * ------------------------------------------------------------------- */
function deletedRecords_(ctx) {
  var txAll = read_('txns').rows;
  var txByProduct = {};
  txAll.forEach(function (t) { txByProduct[t.ProductID] = (txByProduct[t.ProductID] || 0) + 1; });
  var products = read_('products').rows.filter(function (p) { return bool_(p.Deleted); }).map(function (p) {
    var o = productOut_(p, {}); o.allTx = txByProduct[p.ProductID] || 0; return o;
  });
  var txns = txAll.filter(function (t) { return t.Status === 'DELETED'; }).sort(function (a, b) { return a.DeletedAt < b.DeletedAt ? 1 : -1; }).map(txnOut_);
  var logs = read_('logs').rows.filter(function (l) { return l.Status === 'DELETED'; }).sort(function (a, b) { return a.DeletedAt < b.DeletedAt ? 1 : -1; }).map(logOut_);
  var eqTx = read_('etxns').rows, eqCnt = {};
  eqTx.forEach(function (t) { eqCnt[t.EquipID] = (eqCnt[t.EquipID] || 0) + 1; });
  var equip = read_('equip').rows.filter(function (e) { return bool_(e.Deleted); }).map(function (e) { var o = eqOut_(e, {}); o.allTx = eqCnt[e.EquipID] || 0; return o; });
  var etxns = eqTx.filter(function (t) { return t.Status === 'DELETED'; }).sort(function (a, b) { return a.DeletedAt < b.DeletedAt ? 1 : -1; }).map(eqTxnOut_);
  return { products: products, txns: txns, logs: logs, equip: equip, etxns: etxns };
}

function restoreRecords_(ctx, d) {
  var kind = String(d.kind || ''), ids = Array.isArray(d.ids) ? d.ids.map(String) : [];
  if (!ids.length) throw err_('Nothing selected.', 'কিছু নির্বাচন করা হয়নি।');
  return withLock_(function () {
    var n = 0;
    if (kind === 'product') {
      var rows = read_('products').rows;
      var live = rows.filter(function (x) { return !bool_(x.Deleted); }).sort(byOrder_);
      rows.forEach(function (p) {
        if (ids.indexOf(p.ProductID) >= 0 && bool_(p.Deleted)) {
          var clash = live.filter(function (x) { return String(x.Code).toLowerCase() === String(p.Code).toLowerCase(); })[0];
          if (clash) throw err_('Code "' + p.Code + '" is now used by ' + clash.Name + '. Change that code first.', 'Code "' + p.Code + '" এখন ' + clash.Name + ' ব্যবহার করছে। আগে ওই Code পরিবর্তন করুন।');
          p.Deleted = 'FALSE'; p.Status = 'ACTIVE'; p.DeletedAt = ''; p.DeletedBy = ''; p.DeleteReason = ''; p.UpdatedAt = stamp_(); p.UpdatedBy = ctx.name;
          live.push(p); n++;
          log_(ctx, 'PRODUCT_RESTORE', 'Product', p.ProductID, 'Product restored: ' + p.Code + ' - ' + p.Name);
        }
      });
      live.forEach(function (x, i) { x.DisplayOrder = String(i + 1); });
      rewrite_('products', live.concat(rows.filter(function (x) { return bool_(x.Deleted); })));
    } else if (kind === 'txn') {
      var all = read_('txns').rows, upd = [];
      var pmap = {}; read_('products').rows.forEach(function (p) { pmap[p.ProductID] = p; });
      all.forEach(function (t) {
        if (ids.indexOf(t.TxnID) >= 0 && t.Status === 'DELETED') {
          var p = pmap[t.ProductID];
          if (!p || bool_(p.Deleted)) throw err_('Restore the product ' + t.ProductCode + ' first.', 'আগে ' + t.ProductCode + ' প্রোডাক্টটি Restore করুন।');
          t.Status = 'ACTIVE'; t.DeletedAt = ''; t.DeletedBy = ''; t.DeleteReason = ''; upd.push(t);
        }
      });
      upd.forEach(function (t) { assertNonNegative_(all, t.ProductID, t.ProductCode + ' - ' + t.ProductName); });
      update_('txns', upd); n = upd.length;
      if (n) log_(ctx, 'TXN_RESTORE', 'Transaction', upd.map(function (t) { return t.TxnID; }).join(','), n + ' transaction(s) restored');
    } else if (kind === 'equip') {
      var er = read_('equip').rows, elive = er.filter(function (x) { return !bool_(x.Deleted); }).sort(byOrder_);
      er.forEach(function (e) {
        if (ids.indexOf(e.EquipID) >= 0 && bool_(e.Deleted)) {
          var ec = elive.filter(function (x) { return String(x.Code).toLowerCase() === String(e.Code).toLowerCase(); })[0];
          if (ec) throw err_('ID "' + e.Code + '" is now used by ' + ec.Name + '. Change that ID first.', 'ID "' + e.Code + '" এখন ' + ec.Name + ' ব্যবহার করছে। আগে সেটি বদলান।');
          e.Deleted = 'FALSE'; e.Status = 'ACTIVE'; e.DeletedAt = ''; e.DeletedBy = ''; e.DeleteReason = ''; e.UpdatedAt = stamp_(); e.UpdatedBy = ctx.name;
          elive.push(e); n++;
          log_(ctx, 'EQUIP_RESTORE', 'Equipment', e.EquipID, 'Equipment restored: ' + e.Code + ' - ' + e.Name);
        }
      });
      elive.forEach(function (x, i) { x.DisplayOrder = String(i + 1); });
      rewrite_('equip', elive.concat(er.filter(function (x) { return bool_(x.Deleted); })));
    } else if (kind === 'etxn') {
      var ea = read_('etxns').rows, eu = [], em = {}; read_('equip').rows.forEach(function (e) { em[e.EquipID] = e; });
      ea.forEach(function (t) {
        if (ids.indexOf(t.TxnID) >= 0 && t.Status === 'DELETED') {
          var e = em[t.EquipID];
          if (!e || bool_(e.Deleted)) throw err_('Restore the equipment ' + t.Code + ' first.', 'আগে ' + t.Code + ' ইকুইপমেন্টটি Restore করুন।');
          t.Status = 'ACTIVE'; t.DeletedAt = ''; t.DeletedBy = ''; t.DeleteReason = ''; eu.push(t);
        }
      });
      eu.forEach(function (t) { eqAssertValid_(ea, t.EquipID, t.Code + ' - ' + t.Name); });
      update_('etxns', eu); n = eu.length;
      if (n) log_(ctx, 'EQTXN_RESTORE', 'EquipTxn', eu.map(function (t) { return t.TxnID; }).join(','), n + ' equipment entr(ies) restored');
    } else if (kind === 'log') {
      var lu = [];
      read_('logs').rows.forEach(function (l) {
        if (ids.indexOf(l.LogID) >= 0 && l.Status === 'DELETED') { l.Status = 'ACTIVE'; l.DeletedAt = ''; l.DeletedBy = ''; l.DeleteReason = ''; lu.push(l); }
      });
      update_('logs', lu); n = lu.length;
      if (n) log_(ctx, 'LOG_RESTORE', 'ActivityLog', lu.map(function (l) { return l.LogID; }).join(','), n + ' log(s) restored');
    } else throw err_('Unknown record type.', 'অজানা রেকর্ড টাইপ।');
    rebuildInventory_();
    bumpRev_();
    return { restored: n, deleted: deletedRecords_(ctx), boot: bootstrapData_(ctx) };
  });
}

function purgeRecords_(ctx, d) {
  var kind = String(d.kind || ''), ids = Array.isArray(d.ids) ? d.ids.map(String) : [];
  if (!ids.length) throw err_('Nothing selected.', 'কিছু নির্বাচন করা হয়নি।');
  if (String(d.confirm || '') !== 'DELETE') throw err_('Type DELETE to confirm.', 'নিশ্চিত করতে DELETE লিখুন।');
  return withLock_(function () {
    var n = 0;
    if (kind === 'product') {
      var txAll = read_('txns').rows, rows = read_('products').rows, gone = [];
      var keep = rows.filter(function (p) {
        if (ids.indexOf(p.ProductID) >= 0 && bool_(p.Deleted)) {
          if (txAll.some(function (t) { return t.ProductID === p.ProductID; })) {
            throw err_(p.Code + ' has transaction history and cannot be permanently deleted. Purge its transactions first.',
              p.Code + ' এর ট্রানজ্যাকশন হিস্টোরি আছে, তাই স্থায়ীভাবে মোছা যাবে না। আগে এর সব ট্রানজ্যাকশন স্থায়ীভাবে মুছুন।');
          }
          gone.push(clean_(p)); return false;
        }
        return true;
      });
      rewrite_('products', keep); n = gone.length;
      if (n) log_(ctx, 'PRODUCT_PURGE', 'Product', gone.map(function (p) { return p.ProductID; }).join(','), n + ' product(s) permanently deleted', gone);
    } else if (kind === 'txn') {
      var gt = [];
      var kt = read_('txns').rows.filter(function (t) {
        if (ids.indexOf(t.TxnID) >= 0 && t.Status === 'DELETED') { gt.push(clean_(t)); return false; }
        return true;
      });
      if (gt.length) rewrite_('txns', kt);
      n = gt.length;
      if (n) log_(ctx, 'TXN_PURGE', 'Transaction', gt.map(function (t) { return t.TxnID; }).join(','), n + ' transaction(s) permanently deleted', gt);
    } else if (kind === 'equip') {
      var eAll = read_('etxns').rows, eRows = read_('equip').rows, eGone = [];
      var eKeep = eRows.filter(function (e) {
        if (ids.indexOf(e.EquipID) >= 0 && bool_(e.Deleted)) {
          if (eAll.some(function (t) { return t.EquipID === e.EquipID; })) throw err_(e.Code + ' has history and cannot be permanently deleted. Purge its entries first.', e.Code + ' এর হিস্টোরি আছে, তাই স্থায়ীভাবে মোছা যাবে না। আগে এর এন্ট্রিগুলো স্থায়ীভাবে মুছুন।');
          eGone.push(clean_(e)); return false;
        }
        return true;
      });
      rewrite_('equip', eKeep); n = eGone.length;
      if (n) log_(ctx, 'EQUIP_PURGE', 'Equipment', eGone.map(function (e) { return e.EquipID; }).join(','), n + ' equipment permanently deleted', eGone);
    } else if (kind === 'etxn') {
      var egt = [];
      var ekt = read_('etxns').rows.filter(function (t) {
        if (ids.indexOf(t.TxnID) >= 0 && t.Status === 'DELETED') { egt.push(clean_(t)); return false; }
        return true;
      });
      if (egt.length) rewrite_('etxns', ekt);
      n = egt.length;
      if (n) log_(ctx, 'EQTXN_PURGE', 'EquipTxn', egt.map(function (t) { return t.TxnID; }).join(','), n + ' equipment entr(ies) permanently deleted', egt);
    } else if (kind === 'log') {
      var gl = [];
      var kl = read_('logs').rows.filter(function (l) {
        if (ids.indexOf(l.LogID) >= 0 && l.Status === 'DELETED') { gl.push(l.LogID); return false; }
        return true;
      });
      if (gl.length) rewrite_('logs', kl);
      n = gl.length;
      if (n) log_(ctx, 'LOG_PURGE', 'ActivityLog', gl.join(','), n + ' deleted log(s) permanently removed');
    } else throw err_('Unknown record type.', 'অজানা রেকর্ড টাইপ।');
    rebuildInventory_();
    bumpRev_();
    return { purged: n, deleted: deletedRecords_(ctx), boot: bootstrapData_(ctx) };
  });
}

/* ---------------------------------------------------------------------
 *  USERS (Admin / User, প্রতিটি পিন আলাদা)
 * ------------------------------------------------------------------- */
function userOut_(u) {
  return { id: u.UserID, name: u.Name, role: u.Role, status: u.Status, pinLen: Number(u.PinLength) || 4,
    created: u.CreatedAt, updated: u.UpdatedAt, lastLogin: u.LastLogin };
}

function usersList_(ctx) {
  return { users: read_('users').rows.map(userOut_), me: ctx.uid };
}

function activeAdmins_(rows) {
  return rows.filter(function (u) { return u.Role === 'ADMIN' && u.Status === 'ACTIVE'; });
}

function userSave_(ctx, d) {
  var id = str_(d.id, 40), name = str_(d.name, 60);
  var role = d.role === 'ADMIN' ? 'ADMIN' : 'USER', status = d.status === 'DISABLED' ? 'DISABLED' : 'ACTIVE';
  var pin = str_(d.pin, 12);
  if (!name) throw err_('Name is required.', 'নাম দিতে হবে।');
  if (pin && !/^\d{4,8}$/.test(pin)) throw err_('PIN must be 4 to 8 digits.', 'পিন ৪ থেকে ৮ ডিজিটের হতে হবে।');
  if (!id && !pin) throw err_('PIN is required for a new user.', 'নতুন ইউজারের জন্য পিন দিতে হবে।');
  return withLock_(function () {
    var rows = read_('users').rows, now = stamp_();
    if (rows.some(function (u) { return u.UserID !== id && u.Name.toLowerCase() === name.toLowerCase(); }))
      throw err_('Another user already has this name.', 'এই নামে আরেকজন ইউজার আছে।');
    if (pin) {
      var h = hashPin_(pin);
      if (rows.some(function (u) { return u.UserID !== id && u.PinHash === h; }))
        throw err_('This PIN is already used by another user. Choose a different PIN.', 'এই পিন অন্য ইউজার ব্যবহার করছে। ভিন্ন পিন দিন।');
    }
    var u, old = null;
    if (id) {
      u = rows.filter(function (x) { return x.UserID === id; })[0];
      if (!u) throw err_('User not found.', 'ইউজার পাওয়া যায়নি।');
      old = userOut_(u);
    } else {
      u = { UserID: uniqueId_('U-', rows.map(function (x) { return x.UserID; })), CreatedAt: now, LastLogin: '' };
      rows.push(u);
    }
    u.Name = name; u.Role = role; u.Status = status; u.UpdatedAt = now;
    if (pin) { u.PinHash = hashPin_(pin); u.PinLength = String(pin.length); }
    if (!activeAdmins_(rows).length) throw err_('At least one active Admin is required.', 'কমপক্ষে একজন সক্রিয় Admin থাকতে হবে।');
    if (id) update_('users', [u]); else append_('users', [u]);
    log_(ctx, id ? 'USER_EDIT' : 'USER_ADD', 'User', u.UserID,
      (id ? 'User updated: ' : 'User added: ') + name + ' (' + role + ', ' + status + ')' + (pin ? ' — PIN set' : ''), old || undefined, userOut_(u));
    bumpRev_();
    return usersList_(ctx);
  });
}

function userDelete_(ctx, d) {
  var id = str_(d.id, 40);
  if (id === ctx.uid) throw err_('You cannot delete your own account.', 'নিজের অ্যাকাউন্ট ডিলিট করা যাবে না।');
  return withLock_(function () {
    var rows = read_('users').rows;
    var u = rows.filter(function (x) { return x.UserID === id; })[0];
    if (!u) throw err_('User not found.', 'ইউজার পাওয়া যায়নি।');
    var rest = rows.filter(function (x) { return x !== u; });
    if (!activeAdmins_(rest).length) throw err_('At least one active Admin is required.', 'কমপক্ষে একজন সক্রিয় Admin থাকতে হবে।');
    rewrite_('users', rest);
    log_(ctx, 'USER_DELETE', 'User', id, 'User deleted: ' + u.Name + ' (' + u.Role + ')', userOut_(u));
    bumpRev_();
    return usersList_(ctx);
  });
}

/* ---------------------------------------------------------------------
 *  GOOGLE DRIVE FOLDER (Backup + Logo একই ফোল্ডারে)
 * ------------------------------------------------------------------- */
function folder_() {
  var id = String(settings_().drive_folder_id || '').trim();
  if (!id) throw err_('Google Drive folder is not set. Set it in Admin → Backup & Restore.', 'Google Drive ফোল্ডার সেট করা নেই। Admin → Backup & Restore-এ ফোল্ডার আইডি/লিংক দিন।', 'NO_FOLDER');
  try { return DriveApp.getFolderById(id); }
  catch (e) { throw err_('Cannot open the Drive folder. Check the folder ID and access.', 'Drive ফোল্ডার খোলা যাচ্ছে না। আইডি ও অ্যাক্সেস ঠিক আছে কি না দেখুন।', 'NO_FOLDER'); }
}

function driveFolderSave_(ctx, d) {
  var raw = str_(d.folder, 300);
  return withLock_(function () {
    if (!raw) {
      setSettings_({ drive_folder_id: '' });
      log_(ctx, 'DRIVE_FOLDER', 'Settings', '', 'Drive folder removed');
      return backupConfigOut_();
    }
    var m = raw.match(/\/folders\/([a-zA-Z0-9_-]+)/) || raw.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    var id = m ? m[1] : raw;
    if (!/^[a-zA-Z0-9_-]{10,}$/.test(id)) throw err_('Folder ID is not valid.', 'ফোল্ডার আইডি সঠিক নয়।');
    var f;
    try { f = DriveApp.getFolderById(id); f.getName(); }
    catch (e) { throw err_('Folder could not be opened (' + e.message + ').', 'ফোল্ডার খোলা যায়নি (' + e.message + ')। আইডি ও অ্যাক্সেস দেখুন।'); }
    setSettings_({ drive_folder_id: id });
    log_(ctx, 'DRIVE_FOLDER', 'Settings', id, 'Drive folder set: ' + f.getName());
    return backupConfigOut_();
  });
}

/**
 * লোগো তিনভাবে সেট হয় — কোনোটির জন্যই Google Drive ফোল্ডার লাগে না:
 *   dataUrl = ছোট করা ছবি (ডাটাবেজেই সেভ হয়), url = ছবির লিংক (Drive শেয়ার লিংকও চলবে), কিছু না দিলে = ডিফল্ট লোগো
 */
function logoSave_(ctx, d) {
  var dataUrl = String(d.dataUrl || ''), url = str_(d.url, 600);
  return withLock_(function () {
    var v = String(Date.now());
    if (!dataUrl && !url) {
      setSettings_({ logo_file_id: '', logo_data: '', logo_url: '', logo_v: v });
      log_(ctx, 'LOGO', 'Settings', '', 'Logo reset to default');
    } else if (url && !dataUrl) {
      if (!/^https:\/\/\S+$/i.test(url)) throw err_('Logo link must start with https://', 'লোগোর লিংক https:// দিয়ে শুরু হতে হবে।');
      setSettings_({ logo_file_id: '', logo_data: '', logo_url: url, logo_v: v });
      log_(ctx, 'LOGO', 'Settings', '', 'Logo set from link');
    } else {
      var m = dataUrl.match(/^data:(image\/(?:png|jpeg|jpg|webp|svg\+xml));base64,([A-Za-z0-9+\/=]+)$/i);
      if (!m) throw err_('Use a PNG, JPG, WEBP or SVG image.', 'PNG, JPG, WEBP বা SVG ছবি দিন।');
      if (dataUrl.length > 45000) throw err_('Logo image is too large (max ~30 KB after resize). Use a smaller picture.', 'লোগোর ছবি অনেক বড় (রিসাইজের পর প্রায় ৩০ KB-এর মধ্যে হতে হবে)। ছোট ছবি দিন।');
      setSettings_({ logo_file_id: '', logo_url: '', logo_data: dataUrl, logo_v: v });
      log_(ctx, 'LOGO', 'Settings', '', 'Logo updated (' + Math.round(dataUrl.length / 1024) + ' KB)');
    }
    bumpRev_();
    return publicSettings_();
  });
}

/* ---------------------------------------------------------------------
 *  BACKUP — JSON তৈরি
 * ------------------------------------------------------------------- */
var SCOPES = ['FULL', 'LIFETIME', 'YEARLY', 'MONTHLY', 'DAILY', 'CUSTOM'];

function backupRange_(d) {
  var scope = String(d.scope || 'FULL').toUpperCase();
  if (SCOPES.indexOf(scope) < 0) throw err_('Unknown backup type.', 'অজানা ব্যাকআপ টাইপ।');
  var r = { scope: scope, from: '', to: '', label: scope };
  if (scope === 'YEARLY') {
    if (!/^\d{4}$/.test(String(d.year || ''))) throw err_('Select a year.', 'বছর নির্বাচন করুন।');
    r.from = d.year + '-01-01'; r.to = d.year + '-12-31'; r.label = 'YEAR_' + d.year;
  } else if (scope === 'MONTHLY') {
    if (!/^\d{4}-\d{2}$/.test(String(d.month || ''))) throw err_('Select a month.', 'মাস নির্বাচন করুন।');
    r.from = d.month + '-01'; r.to = d.month + '-31'; r.label = 'MONTH_' + d.month;
  } else if (scope === 'DAILY') {
    if (!isDate_(d.date)) throw err_('Select a date.', 'তারিখ নির্বাচন করুন।');
    r.from = d.date; r.to = d.date; r.label = 'DAY_' + d.date;
  } else if (scope === 'CUSTOM') {
    if (!isDate_(d.from) || !isDate_(d.to) || d.from > d.to) throw err_('Select a valid date range.', 'সঠিক তারিখ সীমা নির্বাচন করুন।');
    r.from = d.from; r.to = d.to; r.label = 'RANGE_' + d.from + '_to_' + d.to;
  }
  return r;
}

function buildBackup_(range, by) {
  var inRange = function (dt) { dt = String(dt || '').slice(0, 10); return (!range.from || dt >= range.from) && (!range.to || dt <= range.to); };
  var data = {
    products: read_('products').rows.map(clean_),
    transactions: read_('txns').rows.filter(function (t) { return inRange(t.TxnDate); }).map(clean_),
    activityLogs: read_('logs').rows.filter(function (l) { return inRange(l.Timestamp); }).map(clean_),
    equipment: read_('equip').rows.map(clean_),
    equipTransactions: read_('etxns').rows.filter(function (t) { return inRange(t.TxnDate); }).map(clean_)
  };
  if (range.scope === 'FULL') {
    data.users = read_('users').rows.map(clean_);
    data.settings = read_('settings').rows.map(clean_);
    data.backupHistory = read_('backups').rows.map(clean_);
  }
  var counts = {};
  Object.keys(data).forEach(function (k) { counts[k] = data[k].length; });
  return {
    meta: {
      format: APP.BACKUP_FORMAT, app: APP.NAME, appVersion: APP.VERSION, schema: APP.SCHEMA,
      scope: range.scope, from: range.from, to: range.to, exportedAt: stamp_(), exportedBy: by || '',
      timeZone: tz_(), database: db_().getName(), counts: counts
    },
    data: data
  };
}

function backupFileName_(trigger, label) {
  return APP.BACKUP_PREFIX + trigger + '_' + label + '_' + fmt_(new Date(), 'yyyy-MM-dd_HH-mm-ss') + '.json';
}

function exportData_(ctx, d) {
  var range = backupRange_(d);
  var pack = withLock_(function () { return buildBackup_(range, ctx.name); });   // Lock = একটি সামঞ্জস্যপূর্ণ স্ন্যাপশট
  var json = JSON.stringify(pack);
  log_(ctx, 'EXPORT_JSON', 'Backup', range.label, 'JSON export: ' + range.label + ' (' + Math.round(json.length / 1024) + ' KB)', undefined, pack.meta.counts);
  if (range.scope === 'FULL' || range.scope === 'LIFETIME') PropertiesService.getScriptProperties().setProperty('LAST_FULL_EXPORT', String(Date.now()));
  return { fileName: backupFileName_('EXPORT', range.label), json: json, counts: pack.meta.counts };
}

/**
 * পুরো সিস্টেম রিসেট: সব ট্রানজ্যাকশন, ইনভেন্টরি, অ্যাক্টিভিটি লগ মুছে নতুন করে শুরু।
 * শর্ত (সার্ভারে যাচাই): ১) Admin পিন (pinCheck_)  ২) গত ৩০ মিনিটে সম্পূর্ণ (FULL/LIFETIME) JSON এক্সপোর্ট হয়েছে  ৩) RESET লেখা।
 * d.products = true হলে প্রোডাক্ট তালিকাও মুছবে। ইউজার, পিন, সেটিংস ও ব্যাকআপ হিস্টোরি থাকবে।
 */
function resetAll_(ctx, d) {
  if (String(d.confirm || '') !== 'RESET') throw err_('Type RESET to confirm.', 'নিশ্চিত করতে RESET লিখুন।');
  var last = Number(PropertiesService.getScriptProperties().getProperty('LAST_FULL_EXPORT') || 0);
  if (!last || Date.now() - last > 30 * 60 * 1000)
    throw err_('Download the full Lifetime JSON backup first (within the last 30 minutes), then reset.', 'আগে সম্পূর্ণ লাইফটাইম JSON ব্যাকআপ ডাউনলোড করুন (গত ৩০ মিনিটের মধ্যে), তারপর রিসেট করুন।', 'NEED_BACKUP');
  // Drive ফোল্ডার সেট থাকলে অতিরিক্ত নিরাপত্তায় সেখানেও একটি কপি (ব্যর্থ হলে রিসেট থামে না — JSON আগেই নামানো হয়েছে)
  var drive = null;
  try { if (String(settings_().drive_folder_id || '').trim()) drive = runDriveBackup_('PRE_RESET', ctx.name); } catch (e) {}
  return withLock_(function () {
    var cnt = { transactions: read_('txns').rows.length, logs: read_('logs').rows.length, products: d.products === true ? read_('products').rows.length : 0 };
    rewrite_('txns', []);
    rewrite_('etxns', []);
    rewrite_('logs', []);
    if (d.products === true) { rewrite_('products', []); rewrite_('equip', []); }
    rebuildInventory_();
    PropertiesService.getScriptProperties().deleteProperty('LAST_FULL_EXPORT');
    log_(ctx, 'RESET_ALL', 'System', '', 'SYSTEM RESET by ' + ctx.name + ': ' + cnt.transactions + ' transactions, ' + cnt.logs + ' logs' + (d.products === true ? ', ' + cnt.products + ' products' : ' (products kept)') + ' removed. Drive copy: ' + (drive ? drive.status : 'not taken'));
    bumpRev_();
    return { removed: cnt, drive: drive ? drive.status : '', boot: bootstrapData_(ctx) };
  });
}

/* ---------------------------------------------------------------------
 *  EQUIPMENT MANAGEMENT (ইকুইপমেন্ট স্টক) — Materials থেকে সম্পূর্ণ আলাদা টেবিল
 *  Type: IN (জমা/যোগ) • OUT (বের হওয়া) • DAMAGE (ড্যামেজ — কারণসহ) • REPAIRED (ঠিক হয়ে ফেরত)
 *  Quantity = IN − OUT  |  Damaged = DAMAGE − REPAIRED  |  Net = Quantity − Damaged
 * ------------------------------------------------------------------- */
var EQ_TYPES = ['IN', 'OUT', 'DAMAGE', 'REPAIRED'];

function eqActive_() { return read_('etxns').rows.filter(function (t) { return (t.Status || 'ACTIVE') === 'ACTIVE'; }); }

function eqCompute_(txns) {
  var map = {};
  txns.slice().sort(txSort_).forEach(function (t) {
    var s = map[t.EquipID] || (map[t.EquipID] = { qty: 0, dmg: 0, tin: 0, tout: 0, count: 0, reason: '', reasonDate: '' });
    var q = num_(t.Quantity);
    s.count++;
    if (t.Type === 'IN') { s.qty = round_(s.qty + q); s.tin += q; }
    else if (t.Type === 'OUT') { s.qty = round_(s.qty - q); s.tout += q; }
    else if (t.Type === 'DAMAGE') { s.dmg = round_(s.dmg + q); s.reason = t.Remarks; s.reasonDate = t.TxnDate; }
    else if (t.Type === 'REPAIRED') { s.dmg = round_(s.dmg - q); }
  });
  return map;
}

/** সময়ের ক্রমে সব এন্ট্রি চালিয়ে দেখা: পরিমাণ/ড্যামেজ/নেট কখনো ঋণাত্মক বা অসম্ভব হবে না */
function eqAssertValid_(all, eid, label) {
  var qty = 0, dmg = 0;
  all.filter(function (t) { return t.EquipID === eid && (t.Status || 'ACTIVE') === 'ACTIVE'; }).sort(txSort_).forEach(function (t) {
    var q = num_(t.Quantity);
    if (t.Type === 'IN') qty = round_(qty + q); else if (t.Type === 'OUT') qty = round_(qty - q);
    else if (t.Type === 'DAMAGE') dmg = round_(dmg + q); else if (t.Type === 'REPAIRED') dmg = round_(dmg - q);
    if (qty < -1e-9) throw err_(label + ': quantity would go below zero on ' + t.TxnDate + '.', label + ': ' + t.TxnDate + ' তারিখে পরিমাণ ঋণাত্মক হয়ে যাবে, তাই করা যাবে না।', 'LOW_STOCK');
    if (dmg < -1e-9) throw err_(label + ': repaired quantity is more than damaged on ' + t.TxnDate + '.', label + ': ' + t.TxnDate + ' তারিখে ঠিক-হওয়া পরিমাণ ড্যামেজের চেয়ে বেশি হয়ে যাবে।');
    if (dmg > qty + 1e-9) throw err_(label + ': damaged (' + dmg + ') is more than quantity (' + qty + ') on ' + t.TxnDate + '.', label + ': ' + t.TxnDate + ' তারিখে ড্যামেজ (' + dmg + ') মোট পরিমাণের (' + qty + ') চেয়ে বেশি হয়ে যাবে।', 'LOW_STOCK');
  });
}

function eqOut_(e, st) {
  st = st || {};
  var qty = round_(st.qty || 0), dmg = round_(st.dmg || 0);
  return {
    id: e.EquipID, code: e.Code, name: e.Name, brand: e.Brand, model: e.Model, unit: e.Unit, date: e.AddedDate,
    order: Number(e.DisplayOrder) || 0, status: e.Status, deleted: bool_(e.Deleted),
    qty: qty, dmg: dmg, net: round_(qty - dmg), tin: round_(st.tin || 0), tout: round_(st.tout || 0), count: st.count || 0,
    reason: st.reason || '', reasonDate: st.reasonDate || '',
    deletedAt: e.DeletedAt, deletedBy: e.DeletedBy, delReason: e.DeleteReason
  };
}

function eqTxnOut_(t) {
  return { id: t.TxnID, batch: t.BatchID, date: t.TxnDate, time: t.TxnTime, type: t.Type, eid: t.EquipID, code: t.Code, name: t.Name,
    brand: t.Brand, model: t.Model, qty: num_(t.Quantity), user: t.UserName, remarks: t.Remarks, status: t.Status || 'ACTIVE',
    edits: Number(t.EditCount) || 0, editedAt: t.EditedAt, editedBy: t.EditedBy,
    deletedAt: t.DeletedAt, deletedBy: t.DeletedBy, delReason: t.DeleteReason, createdAt: t.CreatedAt };
}

function eqLastBatch_(txns) {
  var list = txns.slice().sort(function (a, b) { return a.CreatedAt < b.CreatedAt ? 1 : a.CreatedAt > b.CreatedAt ? -1 : b._row - a._row; });
  if (!list.length) return [];
  var b = list[0].BatchID;
  return list.filter(function (t) { return t.BatchID === b; }).sort(function (a, b2) { return a._row - b2._row; }).map(eqTxnOut_);
}

/** তালিকা + হিসাব (ইকুইপমেন্ট স্টক পেজ, Stock IN/OUT ফর্ম ও Admin তালিকা — সবকিছুর উৎস) */
function equipStock_(ctx) {
  var txns = eqActive_(), st = eqCompute_(txns);
  var rows = read_('equip').rows.filter(function (e) { return !bool_(e.Deleted); }).sort(byOrder_).map(function (e) { return eqOut_(e, st[e.EquipID]); });
  var sum = { items: rows.length, qty: 0, dmg: 0, net: 0, damagedItems: 0 };
  rows.forEach(function (r) { sum.qty += r.qty; sum.dmg += r.dmg; sum.net += r.net; if (r.dmg > 0) sum.damagedItems++; });
  sum.qty = round_(sum.qty); sum.dmg = round_(sum.dmg); sum.net = round_(sum.net);
  return { rows: rows, sum: sum, lastBatch: eqLastBatch_(txns), rev: rev_() };
}

function equipSave_(ctx, d) {
  var id = str_(d.id, 40), code = str_(d.code, 60), name = str_(d.name, 150);
  if (!name) throw err_('Product Name is required.', 'ইকুইপমেন্টের নাম দিতে হবে।');
  if (!code) throw err_('SCS ID Number is required.', 'SCS ID Number দিতে হবে।');
  var date = isDate_(d.date) ? d.date : today_();
  if (date > today_()) throw err_('Future date is not allowed.', 'ভবিষ্যতের তারিখ দেওয়া যাবে না।');
  var openQty = id ? 0 : round_(num_(d.qty));
  if (openQty < 0) throw err_('Quantity cannot be negative.', 'পরিমাণ ঋণাত্মক হতে পারবে না।');
  var status = d.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';
  return withLock_(function () {
    var rows = read_('equip').rows;
    var dup = rows.filter(function (x) { return x.EquipID !== id && String(x.Code).toLowerCase() === code.toLowerCase(); })[0];
    if (dup) throw err_('SCS ID "' + code + '" is already used by ' + dup.Name + (bool_(dup.Deleted) ? ' (in Deleted Records)' : '') + '.',
      'SCS ID "' + code + '" আগে থেকেই ' + dup.Name + (bool_(dup.Deleted) ? ' (Deleted Records-এ আছে)' : '') + ' ইকুইপমেন্টে ব্যবহৃত।');
    var now = stamp_(), e, oldV = null;
    if (id) {
      e = rows.filter(function (x) { return x.EquipID === id; })[0];
      if (!e || bool_(e.Deleted)) throw err_('Equipment not found.', 'ইকুইপমেন্ট পাওয়া যায়নি।');
      oldV = clean_(e);
    } else {
      e = { EquipID: uniqueId_('EQP-', rows.map(function (x) { return x.EquipID; })), CreatedAt: now, CreatedBy: ctx.name, Deleted: 'FALSE' };
      rows.push(e);
    }
    e.Code = code; e.Name = name; e.Brand = str_(d.brand, 100); e.Model = str_(d.model, 100); e.Unit = str_(d.unit, 30) || 'Pcs';
    e.AddedDate = date; e.Status = status; e.UpdatedAt = now; e.UpdatedBy = ctx.name;
    var live = rows.filter(function (x) { return !bool_(x.Deleted) && x !== e; }).sort(byOrder_);
    var want = Math.round(num_(d.order));
    var pos = want >= 1 ? Math.min(want, live.length + 1) : (id ? (Number(oldV.DisplayOrder) || live.length + 1) : live.length + 1);
    live.splice(pos - 1, 0, e);
    live.forEach(function (x, i) { x.DisplayOrder = String(i + 1); });
    rewrite_('equip', live.concat(rows.filter(function (x) { return bool_(x.Deleted); })));
    if (openQty > 0) {
      var nowD = new Date(), batchId = 'EB-' + fmt_(nowD, 'yyMMddHHmmss') + '-' + uid_('', 4);
      append_('etxns', [{ TxnID: 'EX-' + fmt_(nowD, 'yyMMdd') + '-' + uid_('', 8), BatchID: batchId, TxnDate: date, TxnTime: fmt_(nowD, 'HH:mm:ss'), Type: 'IN',
        EquipID: e.EquipID, Code: e.Code, Name: e.Name, Brand: e.Brand, Model: e.Model, Quantity: openQty, UserName: ctx.name, UserID: ctx.uid,
        Remarks: 'Opening quantity', Status: 'ACTIVE', CreatedAt: fmt_(nowD, 'yyyy-MM-dd HH:mm:ss'), EditCount: 0, EditedAt: '', EditedBy: '',
        DeletedAt: '', DeletedBy: '', DeleteReason: '', RequestID: '' }]);
    }
    log_(ctx, id ? 'EQUIP_EDIT' : 'EQUIP_ADD', 'Equipment', e.EquipID, (id ? 'Equipment updated: ' : 'Equipment added: ') + code + ' - ' + name + (openQty ? ' (qty ' + openQty + ')' : ''), oldV || undefined, clean_(e));
    bumpRev_();
    return equipStock_(ctx);
  });
}

function equipStatus_(ctx, d) {
  var id = str_(d.id, 40), status = d.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';
  return withLock_(function () {
    var e = read_('equip').rows.filter(function (x) { return x.EquipID === id && !bool_(x.Deleted); })[0];
    if (!e) throw err_('Equipment not found.', 'ইকুইপমেন্ট পাওয়া যায়নি।');
    var old = e.Status; e.Status = status; e.UpdatedAt = stamp_(); e.UpdatedBy = ctx.name;
    update_('equip', [e]);
    log_(ctx, 'EQUIP_STATUS', 'Equipment', id, e.Code + ' - ' + e.Name + ': ' + old + ' → ' + status, { Status: old }, { Status: status });
    bumpRev_();
    return equipStock_(ctx);
  });
}

/* =====================================================================
 *  EQUIPMENT IMPORT FROM GOOGLE SHEET LINK (Admin) — preview + import
 *  ফরম্যাট: SL | DATE | PRODUCT NAME | BRAND NAME | MODEL NUMBER | SCS ID NUMBER | QUTY | Status | Net Quantity | Status Explain
 *  Quantity = QUTY; (QUTY − Net) হিসেবে DAMAGE এন্ট্রি, কারণ = Status Explain
 * ===================================================================== */
var EQ_MONTHS_ = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };

function sheetIdFromLink_(raw) {
  raw = String(raw || '').trim();
  if (!raw) throw err_('Paste the Google Sheet link.', 'গুগল শিটের লিংক দিন।');
  var m = raw.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/) || raw.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  var id = m ? m[1] : (/^[a-zA-Z0-9_-]{20,}$/.test(raw) ? raw : '');
  if (!id) throw err_('Invalid Google Sheet link.', 'গুগল শিটের লিংকটি সঠিক নয়।');
  return id;
}

function eqParseDate_(v) {
  if (v instanceof Date && !isNaN(v.getTime())) return fmt_(v, 'yyyy-MM-dd');
  var s = String(v == null ? '' : v).trim(), m;
  if (!s) return '';
  if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) return m[1] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[3]).slice(-2);
  if ((m = s.match(/^(\d{1,2})[\s\-\/\.]+([A-Za-z]{3,})[a-z]*[\s\-\/\.,]+(\d{2,4})$/))) {
    var mo = EQ_MONTHS_[m[2].slice(0, 3).toLowerCase()], y = Number(m[3]); if (y < 100) y += 2000;
    if (mo) return y + '-' + ('0' + mo).slice(-2) + '-' + ('0' + m[1]).slice(-2);
  }
  if ((m = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/))) {
    var yy = Number(m[3]); if (yy < 100) yy += 2000;
    return yy + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
  }
  return '';
}

/** শিট পড়ে সারিগুলো বিশ্লেষণ করে — কিছু লেখে না */
function eqSheetParse_(d) {
  var id = sheetIdFromLink_(d.link), ss;
  try { ss = SpreadsheetApp.openById(id); } catch (e) {
    throw err_('Cannot open the sheet. Share it with this account (Viewer is enough).', 'শিটটি খোলা যায়নি। এই অ্যাকাউন্টে শিটটি শেয়ার করুন (Viewer হলেই চলবে)।');
  }
  var tabs = ss.getSheets().map(function (s) { return s.getName(); });
  var tab = str_(d.tab, 100) || '1';
  var sh = ss.getSheetByName(tab);
  if (!sh) throw err_('Tab "' + tab + '" not found. Tabs: ' + tabs.join(', '), '"' + tab + '" নামের ট্যাব নেই। ট্যাব আছে: ' + tabs.join(', '));
  var vals = sh.getDataRange().getValues();
  var hr = -1, col = {};
  for (var i = 0; i < Math.min(vals.length, 10) && hr < 0; i++) {
    if (vals[i].some(function (c) { return /product/i.test(String(c)); })) hr = i;
  }
  if (hr < 0) throw err_('Header row not found (PRODUCT NAME column).', 'হেডার সারি পাওয়া যায়নি (PRODUCT NAME কলাম লাগবে)।');
  vals[hr].forEach(function (h, c) {
    var t = String(h).toLowerCase().replace(/\s+/g, ' ').trim();
    if (!t) return;
    if (/net/.test(t)) col.net = c; else if (/explain/.test(t)) col.explain = c; else if (t === 'status') col.status = c;
    else if (/product/.test(t)) col.name = c; else if (/brand/.test(t)) col.brand = c; else if (/model/.test(t)) col.model = c;
    else if (/scs|id/.test(t)) col.code = c; else if (/qu?ty|quantity|qty/.test(t)) col.qty = c; else if (/date/.test(t)) col.date = c;
  });
  if (col.name == null || col.qty == null) throw err_('PRODUCT NAME and QUTY columns are required.', 'PRODUCT NAME ও QUTY কলাম থাকতে হবে।');
  var existing = {};
  read_('equip').rows.forEach(function (e) { existing[String(e.Code).toLowerCase()] = e; });
  var seen = {}, items = [], today = today_();
  for (var r = hr + 1; r < vals.length; r++) {
    var row = vals[r], line = r + 1;
    var g = function (k) { return col[k] == null ? '' : row[col[k]]; };
    var name = str_(g('name'), 150);
    if (!name && !str_(g('code')) && !String(g('qty')).trim()) continue;   // ফাঁকা সারি
    var it = { line: line, name: name, brand: str_(g('brand'), 100), model: str_(g('model'), 100), notes: [], action: 'IMPORT' };
    var qty = round_(num_(g('qty')));
    var netRaw = String(g('net')).trim();
    var net = netRaw === '' ? qty : round_(num_(netRaw));
    if (net > qty) { net = qty; it.notes.push('Net > Qty → Qty ধরা হয়েছে'); }
    if (net < 0) net = 0;
    it.qty = qty; it.net = net; it.dmg = round_(qty - net);
    it.reason = str_(g('explain'), 300) || (it.dmg > 0 ? 'Imported from sheet (damaged)' : '');
    var dt = eqParseDate_(g('date'));
    if (!dt) { dt = today; it.notes.push('তারিখ নেই/বোঝা যায়নি → আজকের তারিখ'); }
    else if (dt > today) { it.notes.push('ভবিষ্যতের তারিখ (' + dt + ') → আজকের তারিখ'); dt = today; }
    it.date = dt;
    var code = str_(g('code'), 60);
    it.origCode = code;
    if (!name) { it.action = 'SKIP'; it.notes.push('প্রোডাক্ট নাম নেই'); }
    else if (!(qty > 0)) { it.action = 'SKIP'; it.notes.push('পরিমাণ ০ বা নেই'); }
    else {
      if (!code) { code = 'SCS-IMP-' + ('000' + line).slice(-4); it.notes.push('SCS ID ছিল না → স্বয়ংক্রিয় ' + code); }
      var key = code.toLowerCase();
      if (existing[key]) { it.action = 'EXISTS'; it.notes.push('এই SCS ID আগে থেকেই ডাটাবেজে আছে'); }
      else {
        if (seen[key]) {
          var n = 2; while (seen[(code + '-D' + n).toLowerCase()] || existing[(code + '-D' + n).toLowerCase()]) n++;
          it.notes.push('শিটে SCS ID ডুপ্লিকেট (' + code + ') → ' + code + '-D' + n); code = code + '-D' + n; key = code.toLowerCase();
        }
        seen[key] = 1;
      }
    }
    it.code = code;
    items.push(it);
  }
  var sum = { total: items.length, import: 0, exists: 0, skip: 0, damaged: 0, qty: 0, net: 0 };
  items.forEach(function (x) {
    if (x.action === 'IMPORT') { sum.import++; sum.qty = round_(sum.qty + x.qty); sum.net = round_(sum.net + x.net); if (x.dmg > 0) sum.damaged++; }
    else if (x.action === 'EXISTS') sum.exists++; else sum.skip++;
  });
  return { title: ss.getName ? ss.getName() : '', tab: tab, tabs: tabs, items: items, sum: sum };
}

function equipSheetPreview_(ctx, d) { return eqSheetParse_(d); }

function equipSheetImport_(ctx, d) {
  return withLock_(function () {
    var p = eqSheetParse_(d), list = p.items.filter(function (x) { return x.action === 'IMPORT'; });
    if (!list.length) throw err_('Nothing to import (all rows skipped or already exist).', 'ইম্পোর্ট করার মতো কিছু নেই (সব সারি বাদ বা আগে থেকেই আছে)।');
    var rows = read_('equip').rows, now = stamp_(), nowD = new Date(), created = fmt_(nowD, 'yyyy-MM-dd HH:mm:ss'), time = fmt_(nowD, 'HH:mm:ss');
    var ids = rows.map(function (x) { return x.EquipID; }), txs = [], tids = {}, batch = 'EB-' + fmt_(nowD, 'yyMMddHHmmss') + '-' + uid_('', 4);
    var live = rows.filter(function (x) { return !bool_(x.Deleted); }).sort(byOrder_), dead = rows.filter(function (x) { return bool_(x.Deleted); });
    var mk = function (e, it, type, qty, why) {
      var id; do { id = 'EX-' + fmt_(nowD, 'yyMMdd') + '-' + uid_('', 8); } while (tids[id]); tids[id] = 1;
      txs.push({ TxnID: id, BatchID: batch, TxnDate: it.date, TxnTime: time, Type: type, EquipID: e.EquipID, Code: e.Code, Name: e.Name, Brand: e.Brand, Model: e.Model,
        Quantity: qty, UserName: ctx.name, UserID: ctx.uid, Remarks: why, Status: 'ACTIVE', CreatedAt: created, EditCount: 0, EditedAt: '', EditedBy: '',
        DeletedAt: '', DeletedBy: '', DeleteReason: '', RequestID: '' });
    };
    list.forEach(function (it) {
      var e = { EquipID: uniqueId_('EQP-', ids), CreatedAt: now, CreatedBy: ctx.name, Deleted: 'FALSE', Code: it.code, Name: it.name, Brand: it.brand, Model: it.model,
        Unit: 'Pcs', AddedDate: it.date, Status: 'ACTIVE', UpdatedAt: now, UpdatedBy: ctx.name };
      ids.push(e.EquipID); live.push(e);
      mk(e, it, 'IN', it.qty, 'Imported from Google Sheet (row ' + it.line + ')');
      if (it.dmg > 0) mk(e, it, 'DAMAGE', it.dmg, it.reason);
    });
    live.forEach(function (x, i) { x.DisplayOrder = String(i + 1); });
    rewrite_('equip', live.concat(dead));
    append_('etxns', txs);
    var dm = list.filter(function (x) { return x.dmg > 0; }).length;
    log_(ctx, 'EQUIP_ADD', 'Equipment', batch, 'Equipment imported from Google Sheet "' + p.title + '" tab "' + p.tab + '": ' + list.length + ' item(s), ' + dm + ' with damage', undefined,
      { imported: list.length, skipped: p.items.length - list.length });
    bumpRev_();
    return { imported: list.length, damaged: dm, skipped: p.sum.skip, exists: p.sum.exists, stock: equipStock_(ctx) };
  });
}

function equipDelete_(ctx, d) {
  var id = str_(d.id, 40), reason = str_(d.reason, 300);
  if (!reason) throw err_('Reason is required.', 'কারণ লিখতে হবে।');
  return withLock_(function () {
    var rows = read_('equip').rows;
    var e = rows.filter(function (x) { return x.EquipID === id && !bool_(x.Deleted); })[0];
    if (!e) throw err_('Equipment not found.', 'ইকুইপমেন্ট পাওয়া যায়নি।');
    var hasTx = read_('etxns').rows.some(function (t) { return t.EquipID === id; });
    var permanent = d.permanent === true && !hasTx, old = clean_(e);
    if (permanent) {
      var keep = rows.filter(function (x) { return x !== e && !bool_(x.Deleted); }).sort(byOrder_);
      keep.forEach(function (x, i) { x.DisplayOrder = String(i + 1); });
      rewrite_('equip', keep.concat(rows.filter(function (x) { return x !== e && bool_(x.Deleted); })));
      log_(ctx, 'EQUIP_PURGE', 'Equipment', id, 'Equipment permanently deleted: ' + e.Code + ' - ' + e.Name + '. Reason: ' + reason, old);
    } else {
      e.Deleted = 'TRUE'; e.Status = 'INACTIVE'; e.DeletedAt = stamp_(); e.DeletedBy = ctx.name; e.DeleteReason = reason;
      var live = rows.filter(function (x) { return !bool_(x.Deleted); }).sort(byOrder_);
      live.forEach(function (x, i) { x.DisplayOrder = String(i + 1); });
      rewrite_('equip', live.concat(rows.filter(function (x) { return bool_(x.Deleted); })));
      log_(ctx, 'EQUIP_DELETE', 'Equipment', id, 'Equipment moved to Deleted Records: ' + e.Code + ' - ' + e.Name + '. Reason: ' + reason, old);
    }
    bumpRev_();
    var r = equipStock_(ctx); r.permanent = permanent; r.hadHistory = hasTx;
    return r;
  });
}

function equipSaveTxns_(ctx, d) {
  var type = String(d.type || '').toUpperCase();
  if (EQ_TYPES.indexOf(type) < 0) throw err_('Invalid entry type.', 'ভুল এন্ট্রি টাইপ।');
  var date = isDate_(d.date) ? d.date : today_();
  if (date > today_()) throw err_('Future date is not allowed.', 'ভবিষ্যতের তারিখ দেওয়া যাবে না।');
  var items = Array.isArray(d.items) ? d.items : [];
  if (!items.length) throw err_('Add at least 1 equipment with quantity.', 'কমপক্ষে ১টি ইকুইপমেন্ট ও পরিমাণ দিন।');
  if (items.length > APP.MAX_ITEMS_PER_TXN) throw err_('Too many rows in one entry.', 'এক এন্ট্রিতে অনেক বেশি সারি।');
  var reqId = str_(d.requestId, 60), remarks = str_(d.remarks, 300);
  return withLock_(function () {
    var all = read_('etxns').rows;
    if (reqId) {
      var dup = all.filter(function (t) { return t.RequestID === reqId; });
      if (dup.length) return { duplicate: true, batch: dup.map(eqTxnOut_), stock: equipStock_(ctx) };
    }
    var emap = {}; read_('equip').rows.forEach(function (e) { emap[e.EquipID] = e; });
    var batchId = 'EB-' + fmt_(new Date(), 'yyMMddHHmmss') + '-' + uid_('', 4);
    var now = new Date(), created = fmt_(now, 'yyyy-MM-dd HH:mm:ss'), time = fmt_(now, 'HH:mm:ss');
    var ids = {}; all.forEach(function (t) { ids[t.TxnID] = 1; });
    var rows = items.map(function (it, i) {
      var e = emap[str_(it.equipId, 40)];
      if (!e || bool_(e.Deleted)) throw err_('Row ' + (i + 1) + ': equipment not found.', 'সারি ' + (i + 1) + ': ইকুইপমেন্ট পাওয়া যায়নি।');
      if (e.Status !== 'ACTIVE') throw err_(e.Name + ' is inactive.', e.Name + ' নিষ্ক্রিয় (Inactive)।');
      var q = round_(num_(it.qty));
      if (!(q > 0)) throw err_('Row ' + (i + 1) + ': quantity must be greater than 0.', 'সারি ' + (i + 1) + ': পরিমাণ ০-এর বেশি হতে হবে।');
      var why = str_(it.reason, 300) || remarks;
      if (type === 'DAMAGE' && why.length < 3) throw err_('Row ' + (i + 1) + ': write the reason for the damage.', 'সারি ' + (i + 1) + ': ড্যামেজের কারণ লিখুন।');
      var id; do { id = 'EX-' + fmt_(now, 'yyMMdd') + '-' + uid_('', 8); } while (ids[id]); ids[id] = 1;
      return { TxnID: id, BatchID: batchId, TxnDate: date, TxnTime: time, Type: type, EquipID: e.EquipID, Code: e.Code, Name: e.Name, Brand: e.Brand, Model: e.Model,
        Quantity: q, UserName: ctx.name, UserID: ctx.uid, Remarks: why, Status: 'ACTIVE', CreatedAt: created, EditCount: 0, EditedAt: '', EditedBy: '',
        DeletedAt: '', DeletedBy: '', DeleteReason: '', RequestID: reqId };
    });
    var combined = all.concat(rows.map(function (r, i) { var c = {}; Object.keys(r).forEach(function (k) { c[k] = r[k]; }); c._row = 1e6 + i; return c; }));
    var seen = {};
    rows.forEach(function (r) { if (!seen[r.EquipID]) { seen[r.EquipID] = 1; eqAssertValid_(combined, r.EquipID, r.Code + ' - ' + r.Name); } });
    append_('etxns', rows);
    log_(ctx, 'EQUIP_' + type, 'EquipTxn', batchId, 'Equipment ' + type + ': ' + rows.length + ' item(s) — ' + rows.map(function (r) { return r.Code + ' × ' + r.Quantity + (type === 'DAMAGE' ? ' (' + r.Remarks + ')' : ''); }).join(', '),
      undefined, rows.map(function (r) { return { TxnID: r.TxnID, Code: r.Code, Qty: r.Quantity }; }));
    bumpRev_();
    return { batch: rows.map(function (r, i) { r._row = i; return eqTxnOut_(r); }), stock: equipStock_(ctx) };
  });
}

function equipQuery_(ctx, d) {
  var all = read_('etxns').rows, users = {};
  all.forEach(function (r) { if (r.UserName) users[r.UserName] = 1; });
  var status = ctx.role === 'ADMIN' ? String(d.status || 'ACTIVE') : 'ACTIVE';
  var q = str_(d.q, 100).toLowerCase();
  var list = all.filter(function (r) {
    var st = r.Status || 'ACTIVE';
    if (status !== 'ALL' && st !== status) return false;
    if (d.type && r.Type !== d.type) return false;
    if (d.equipId && r.EquipID !== d.equipId) return false;
    if (d.user && r.UserName !== d.user) return false;
    if (!dateMatch_(r.TxnDate, d)) return false;
    if (q && (r.Code + ' ' + r.Name + ' ' + r.Brand + ' ' + r.Model + ' ' + r.TxnID + ' ' + r.Remarks).toLowerCase().indexOf(q) < 0) return false;
    return true;
  }).sort(function (a, b) { return txSort_(b, a); });
  var sum = { IN: 0, OUT: 0, DAMAGE: 0, REPAIRED: 0 };
  list.forEach(function (r) { if ((r.Status || 'ACTIVE') === 'ACTIVE') sum[r.Type] = (sum[r.Type] || 0) + num_(r.Quantity); });
  var p = page_(list, d);
  return { rows: p.slice.map(eqTxnOut_), page: p.page, pages: p.pages, total: p.total, users: Object.keys(users).sort(),
    sum: { IN: round_(sum.IN), OUT: round_(sum.OUT), DAMAGE: round_(sum.DAMAGE), REPAIRED: round_(sum.REPAIRED) } };
}

function equipTxnUpdate_(ctx, d) {
  var id = str_(d.id, 60), reason = str_(d.reason, 300), q = round_(num_(d.qty)), date = str_(d.date, 10);
  if (!(q > 0)) throw err_('Quantity must be greater than 0.', 'পরিমাণ ০-এর বেশি হতে হবে।');
  if (!isDate_(date) || date > today_()) throw err_('Invalid date.', 'তারিখ সঠিক নয়।');
  if (!reason) throw err_('Edit reason is required.', 'এডিটের কারণ লিখতে হবে।');
  return withLock_(function () {
    var all = read_('etxns').rows, t = all.filter(function (r) { return r.TxnID === id; })[0];
    if (!t || t.Status !== 'ACTIVE') throw err_('Entry not found.', 'এন্ট্রি পাওয়া যায়নি।');
    var note = str_(d.remarks, 300);
    if (t.Type === 'DAMAGE' && note.length < 3) throw err_('Write the reason for the damage.', 'ড্যামেজের কারণ লিখুন।');
    var old = { Quantity: t.Quantity, TxnDate: t.TxnDate, Remarks: t.Remarks };
    if (num_(old.Quantity) === q && old.TxnDate === date && old.Remarks === note) throw err_('Nothing changed.', 'কোনো পরিবর্তন নেই।');
    t.Quantity = String(q); t.TxnDate = date; t.Remarks = note;
    eqAssertValid_(all, t.EquipID, t.Code + ' - ' + t.Name);
    t.EditCount = String((Number(t.EditCount) || 0) + 1); t.EditedAt = stamp_(); t.EditedBy = ctx.name;
    update_('etxns', [t]);
    log_(ctx, 'EQTXN_EDIT', 'EquipTxn', id, 'Equipment entry edited: ' + t.Type + ' ' + t.Code + ' (' + old.Quantity + ' → ' + q + ', ' + old.TxnDate + ' → ' + date + '). Reason: ' + reason, old, { Quantity: t.Quantity, TxnDate: t.TxnDate, Remarks: t.Remarks });
    bumpRev_();
    return { txn: eqTxnOut_(t), stock: equipStock_(ctx) };
  });
}

function equipTxnDelete_(ctx, d) {
  var ids = Array.isArray(d.ids) ? d.ids.map(String) : [], reason = str_(d.reason, 300);
  if (!ids.length) throw err_('Select at least one entry.', 'কমপক্ষে একটি এন্ট্রি নির্বাচন করুন।');
  if (!reason) throw err_('Reason is required.', 'কারণ লিখতে হবে।');
  return withLock_(function () {
    var all = read_('etxns').rows, now = stamp_(), upd = [];
    all.forEach(function (t) { if (ids.indexOf(t.TxnID) >= 0 && t.Status === 'ACTIVE') { t.Status = 'DELETED'; t.DeletedAt = now; t.DeletedBy = ctx.name; t.DeleteReason = reason; upd.push(t); } });
    if (!upd.length) throw err_('Entry not found.', 'এন্ট্রি পাওয়া যায়নি।');
    upd.forEach(function (t) { eqAssertValid_(all, t.EquipID, t.Code + ' - ' + t.Name); });
    update_('etxns', upd);
    log_(ctx, 'EQTXN_DELETE', 'EquipTxn', upd.map(function (t) { return t.TxnID; }).join(','),
      upd.length + ' equipment entr(ies) moved to Deleted Records (' + upd.map(function (t) { return t.Type + ' ' + t.Code + ' × ' + t.Quantity; }).join(', ') + '). Reason: ' + reason, upd.map(clean_));
    bumpRev_();
    return { deleted: upd.length, stock: equipStock_(ctx) };
  });
}

/* ---------------------------------------------------------------------
 *  GOOGLE DRIVE AUTOMATIC BACKUP
 * ------------------------------------------------------------------- */
var FREQS = {
  '1m': { min: 1, label: 'Every 1 Minute' }, '5m': { min: 5, label: 'Every 5 Minutes' }, '10m': { min: 10, label: 'Every 10 Minutes' },
  '15m': { min: 15, label: 'Every 15 Minutes' }, '30m': { min: 30, label: 'Every 30 Minutes' }, '1h': { min: 60, label: 'Every 1 Hour' },
  '6h': { min: 360, label: 'Every 6 Hours' }, '12h': { min: 720, label: 'Every 12 Hours' }, '24h': { min: 1440, label: 'Every 24 Hours' },
  '7d': { min: 10080, label: 'Every 7 Days' }, 'custom': { min: 0, label: 'Custom Interval' }
};

function backupCfg_(s) {
  s = s || settings_();
  var freq = FREQS[s.backup_freq] ? s.backup_freq : '24h';
  var custom = Math.max(1, Math.round(num_(s.backup_custom_min) || 1440));
  return {
    folderId: s.drive_folder_id || '', enabled: bool_(s.backup_enabled), freq: freq, customMin: custom,
    intervalMin: freq === 'custom' ? custom : FREQS[freq].min,
    retention: s.backup_retention === undefined || s.backup_retention === '' ? 30 : Math.max(0, Math.round(num_(s.backup_retention))),
    skipUnchanged: s.backup_skip_unchanged === undefined || s.backup_skip_unchanged === '' ? true : bool_(s.backup_skip_unchanged),
    lastOkAt: s.backup_last_ok_at || '', lastOkFile: s.backup_last_ok_file || '', lastRunAt: s.backup_last_run_at || '',
    lastStatus: s.backup_last_status || '', lastError: s.backup_last_error || '', nextAt: s.backup_next_at || '', lastRev: s.backup_last_rev || ''
  };
}

function backupConfigOut_() {
  var s = settings_(), c = backupCfg_(s);
  var folderName = '', files = 0, folderErr = '';
  if (c.folderId) {
    try {
      var f = DriveApp.getFolderById(c.folderId); folderName = f.getName();
      var it = f.getFiles();
      while (it.hasNext()) { if (it.next().getName().indexOf(APP.BACKUP_PREFIX) === 0) files++; }
    } catch (e) { folderErr = String(e.message || e); }
  }
  var triggers = 0;
  try { ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'autoBackupTick') triggers++; }); } catch (e) {}
  c.folderName = folderName; c.folderError = folderErr; c.totalFiles = files; c.triggerInstalled = triggers > 0;
  c.history = read_('backups').rows.sort(function (a, b) { return a.Timestamp < b.Timestamp ? 1 : -1; }).slice(0, 60).map(clean_);
  c.freqs = Object.keys(FREQS).map(function (k) { return { id: k, label: FREQS[k].label }; });
  return c;
}

function backupConfigSave_(ctx, d) {
  var freq = FREQS[d.freq] ? d.freq : '24h';
  var custom = Math.round(num_(d.customMin));
  if (freq === 'custom' && !(custom >= 1 && custom <= 60 * 24 * 30)) throw err_('Custom interval must be between 1 minute and 30 days.', 'Custom Interval ১ মিনিট থেকে ৩০ দিনের মধ্যে হতে হবে।');
  var ret = Math.round(num_(d.retention));
  if (!(ret >= 0 && ret <= 3650)) throw err_('Retention must be 0 (keep all) to 3650 days.', 'Retention ০ (সব রাখুন) থেকে ৩৬৫০ দিনের মধ্যে হতে হবে।');
  var enabled = d.enabled === true;
  return withLock_(function () {
    var s = settings_();
    if (enabled && !s.drive_folder_id) throw err_('Set the Google Drive folder first.', 'আগে Google Drive ফোল্ডার সেট করুন।', 'NO_FOLDER');
    var old = backupCfg_(s);
    setSettings_({
      backup_enabled: enabled ? 'TRUE' : 'FALSE', backup_freq: freq, backup_custom_min: String(custom || old.customMin),
      backup_retention: String(ret), backup_skip_unchanged: d.skipUnchanged === false ? 'FALSE' : 'TRUE'
    });
    applyBackupSchedule_();
    var nu = backupCfg_();
    log_(ctx, 'BACKUP_CONFIG', 'Settings', '', 'Auto backup ' + (enabled ? 'ENABLED (' + FREQS[freq].label + (freq === 'custom' ? ' ' + nu.customMin + ' min' : '') + ')' : 'DISABLED') + ', retention ' + (ret ? ret + ' days' : 'keep all'),
      { enabled: old.enabled, freq: old.freq, customMin: old.customMin, retention: old.retention, skipUnchanged: old.skipUnchanged },
      { enabled: nu.enabled, freq: nu.freq, customMin: nu.customMin, retention: nu.retention, skipUnchanged: nu.skipUnchanged });
    return backupConfigOut_();
  });
}

/** Trigger পুনরায় সেট করা (Apps Script-এর সমর্থিত ব্যবধান অনুযায়ী) */
function applyBackupSchedule_() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'autoBackupTick') ScriptApp.deleteTrigger(t); });
  var c = backupCfg_();
  if (!c.enabled) { setSettings_({ backup_next_at: '' }); return; }
  var m = c.intervalMin, b = ScriptApp.newTrigger('autoBackupTick').timeBased();
  // Apps Script শুধু 1/5/10/15/30 মিনিট বা 1/2/4/6/8/12 ঘণ্টা বা প্রতিদিন/সপ্তাহ সাপোর্ট করে।
  // Custom ব্যবধানের জন্য ছোট Trigger চলে এবং autoBackupTick নিজে সময় মিলিয়ে ব্যাকআপ নেয়।
  var periods = [[10080, 'w', 1], [1440, 'd', 1], [720, 'h', 12], [480, 'h', 8], [360, 'h', 6], [240, 'h', 4], [120, 'h', 2], [60, 'h', 1],
    [30, 'm', 30], [15, 'm', 15], [10, 'm', 10], [5, 'm', 5], [1, 'm', 1]];
  var pick = periods.filter(function (p) { return p[0] <= m && m % p[0] === 0; })[0] || [1, 'm', 1];
  if (pick[1] === 'w') b.everyWeeks(1);
  else if (pick[1] === 'd') b.everyDays(1);
  else if (pick[1] === 'h') b.everyHours(pick[2]);
  else b.everyMinutes(pick[2]);
  b.create();
  setSettings_({ backup_next_at: fmt_(new Date(Date.now() + m * 60000), 'yyyy-MM-dd HH:mm:ss') });
}

/** Time-driven Trigger এটি চালায় */
function autoBackupTick() {
  resetCache_();
  var c = backupCfg_();
  if (!c.enabled) return 'disabled';
  var now = Date.now();
  if (c.nextAt) {
    var due = new Date(c.nextAt.replace(' ', 'T')).getTime();
    if (isFinite(due) && now < due - 45000) return 'not due';
  }
  var next = fmt_(new Date(now + c.intervalMin * 60000), 'yyyy-MM-dd HH:mm:ss');
  if (c.skipUnchanged && c.lastOkAt && c.lastRev && c.lastRev === rev_()) {
    setSettings_({ backup_next_at: next, backup_last_run_at: stamp_(), backup_last_status: 'SKIPPED (no changes)' });
    return 'skipped';
  }
  var r = runDriveBackup_('AUTO', 'System (Auto)');
  setSettings_({ backup_next_at: next });
  return r.status;
}

function backupNow_(ctx) {
  var r = runDriveBackup_('MANUAL', ctx.name);
  if (r.status !== 'OK') throw err_('Backup failed: ' + r.error, 'ব্যাকআপ ব্যর্থ: ' + r.error);
  return backupConfigOut_();
}

function runDriveBackup_(trigger, by) {
  var res = { status: 'FAILED', fileName: '', fileId: '', error: '' };
  var rev = rev_(), pack = null, json = '';
  try {
    var folder = folder_();
    pack = withLock_(function () { return buildBackup_({ scope: 'FULL', from: '', to: '', label: 'FULL' }, by); });
    json = JSON.stringify(pack);
    res.fileName = backupFileName_(trigger, 'FULL');
    var file = folder.createFile(Utilities.newBlob(json, 'application/json', res.fileName));
    res.fileId = file.getId();
    res.status = 'OK';
    var trashed = 0;
    try { trashed = retentionCleanup_(folder, res.fileId); } catch (e) {}
    setSettings_({ backup_last_ok_at: stamp_(), backup_last_ok_file: res.fileName, backup_last_rev: rev, backup_last_run_at: stamp_(),
      backup_last_status: 'OK' + (trashed ? ' (' + trashed + ' old file(s) removed)' : ''), backup_last_error: '' });
  } catch (e) {
    res.error = String(e && e.message ? e.message : e);
    try { setSettings_({ backup_last_run_at: stamp_(), backup_last_status: 'FAILED', backup_last_error: res.error }); } catch (x) {}
  }
  try {
    append_('backups', [{
      BackupID: uid_('BK-', 10), Timestamp: stamp_(), Trigger: trigger, Scope: 'FULL', FileName: res.fileName, FileID: res.fileId,
      SizeKB: json ? String(Math.round(json.length / 1024)) : '', Records: pack ? json_(pack.meta.counts) : '', Status: res.status, Error: res.error, UserName: by || ''
    }]);
    var rows = read_('backups').rows;
    if (rows.length > 1000) rewrite_('backups', rows.sort(function (a, b) { return a.Timestamp < b.Timestamp ? 1 : -1; }).slice(0, 800).reverse());
  } catch (e) {}
  return res;
}

/** পুরোনো ব্যাকআপ ফাইল মোছা — সর্বশেষ সফল ব্যাকআপ ও সর্বশেষ Restore Point সবসময় থাকবে */
function retentionCleanup_(folder, keepId) {
  var days = backupCfg_().retention;
  if (!days) return 0;
  var cutoff = Date.now() - days * 86400000;
  var files = [], it = folder.getFiles();
  while (it.hasNext()) { var f = it.next(); if (f.getName().indexOf(APP.BACKUP_PREFIX) === 0) files.push(f); }
  files.sort(function (a, b) { return b.getDateCreated().getTime() - a.getDateCreated().getTime(); });
  var keepRestorePoint = files.filter(function (f) { return f.getName().indexOf(APP.BACKUP_PREFIX + 'PRE-RESTORE') === 0; })[0];
  var n = 0;
  files.forEach(function (f, i) {
    if (i === 0 || f.getId() === keepId || (keepRestorePoint && f.getId() === keepRestorePoint.getId())) return;
    if (f.getDateCreated().getTime() < cutoff) { f.setTrashed(true); n++; }
  });
  return n;
}

/* ---------------------------------------------------------------------
 *  JSON IMPORT (Validation → Preview → Restore)
 * ------------------------------------------------------------------- */
var SECTION_TABLE = { products: 'products', transactions: 'txns', activityLogs: 'logs', equipment: 'equip', equipTransactions: 'etxns', users: 'users', settings: 'settings' };

function parseBackup_(json) {
  var pack;
  try { pack = JSON.parse(String(json || '')); } catch (e) { throw err_('The file is not valid JSON.', 'ফাইলটি সঠিক JSON নয়।'); }
  if (!pack || !pack.meta || pack.meta.format !== APP.BACKUP_FORMAT || !pack.data || typeof pack.data !== 'object')
    throw err_('This is not an SCS Store backup file.', 'এটি SCS Store-এর ব্যাকআপ ফাইল নয়।');
  if (!(Number(pack.meta.schema) >= 1) || Number(pack.meta.schema) > APP.SCHEMA)
    throw err_('Backup version ' + pack.meta.schema + ' is not supported by this app (supports up to ' + APP.SCHEMA + ').',
      'ব্যাকআপ ভার্সন ' + pack.meta.schema + ' এই অ্যাপে সাপোর্টেড নয় (সর্বোচ্চ ' + APP.SCHEMA + ')।');
  return pack;
}

function analyzeImport_(pack) {
  var errors = [], warnings = [], out = {};
  var req = { products: ['ProductID', 'Code', 'Name'], transactions: ['TxnID', 'ProductID', 'Type', 'Quantity', 'TxnDate'],
    activityLogs: ['LogID', 'Timestamp', 'Action'], equipment: ['EquipID', 'Code', 'Name'], equipTransactions: ['TxnID', 'EquipID', 'Type', 'Quantity', 'TxnDate'], users: ['UserID', 'Name', 'Role', 'PinHash'], settings: ['Key'] };
  var fileProducts = {};
  Object.keys(SECTION_TABLE).forEach(function (sec) {
    var arr = pack.data[sec];
    if (arr === undefined) return;
    if (!Array.isArray(arr)) { errors.push(sec + ': must be a list'); return; }
    var t = SECTION_TABLE[sec], key = SCHEMA[t].key;
    var existing = {}; read_(t).rows.forEach(function (r) { existing[r[key]] = r; });
    var seen = {}, st = { total: arr.length, newCount: 0, duplicate: 0, conflict: 0, invalid: 0 };
    arr.forEach(function (r, i) {
      if (!r || typeof r !== 'object') { st.invalid++; return; }
      var miss = req[sec].filter(function (k) { return r[k] === undefined || r[k] === null || String(r[k]) === ''; });
      if (miss.length) { st.invalid++; if (st.invalid <= 5) errors.push(sec + ' #' + (i + 1) + ': missing ' + miss.join(', ')); return; }
      var id = String(r[key]);
      if (seen[id]) { st.invalid++; if (st.invalid <= 5) errors.push(sec + ': ID ' + id + ' appears twice in the file'); return; }
      seen[id] = 1;
      if (sec === 'transactions') {
        if (['IN', 'OUT', 'ADJ'].indexOf(String(r.Type)) < 0 || !isFinite(Number(r.Quantity)) || !isDate_(r.TxnDate)) { st.invalid++; if (st.invalid <= 5) errors.push('transactions: ' + id + ' has invalid type/quantity/date'); return; }
      }
      if (sec === 'products') fileProducts[id] = 1;
      if (existing[id]) {
        var same = SCHEMA[t].cols.every(function (c) { return String(r[c] == null ? '' : r[c]) === String(existing[id][c] == null ? '' : existing[id][c]); });
        if (same) st.duplicate++; else st.conflict++;
      } else st.newCount++;
    });
    out[sec] = st;
  });
  if (Array.isArray(pack.data.transactions)) {
    var dbProducts = {}; read_('products').rows.forEach(function (p) { dbProducts[p.ProductID] = 1; });
    var orphan = pack.data.transactions.filter(function (t) { return t && !fileProducts[t.ProductID] && !dbProducts[t.ProductID]; }).length;
    if (orphan) errors.push(orphan + ' transaction(s) refer to products that are not in the file or the database');
    if (out.transactions) out.transactions.orphan = orphan;
  }
  if (Array.isArray(pack.data.users) && !pack.data.users.some(function (u) { return u && u.Role === 'ADMIN' && u.Status === 'ACTIVE'; }))
    warnings.push('The file has no active Admin user — users will not be replaced from this file.');
  if (out.transactions && out.transactions.conflict) warnings.push(out.transactions.conflict + ' transaction(s) have the same ID as existing ones but different content. Merge keeps the current version.');
  return { meta: pack.meta, sections: out, errors: errors, warnings: warnings };
}

function importPreview_(ctx, d) {
  var pack = parseBackup_(d.json);
  var a = analyzeImport_(pack);
  var s = settings_();
  a.driveReady = !!s.drive_folder_id;
  return a;
}

function importApply_(ctx, d) {
  var pack = parseBackup_(d.json);
  var mode = d.mode === 'REPLACE' ? 'REPLACE' : 'MERGE';
  var want = d.sections || {};
  var a = analyzeImport_(pack);
  if (a.errors.length) throw err_('The file has errors and cannot be restored: ' + a.errors.slice(0, 3).join('; '),
    'ফাইলে সমস্যা আছে, Restore করা যাবে না: ' + a.errors.slice(0, 3).join('; '));
  var secs = Object.keys(SECTION_TABLE).filter(function (k) { return want[k] && Array.isArray(pack.data[k]); });
  if (!secs.length) throw err_('Select at least one section to restore.', 'Restore করার জন্য কমপক্ষে একটি অংশ নির্বাচন করুন।');
  if (secs.indexOf('users') >= 0 && !pack.data.users.some(function (u) { return u.Role === 'ADMIN' && u.Status === 'ACTIVE'; }))
    throw err_('Users cannot be restored: the file has no active Admin.', 'ইউজার Restore করা যাবে না: ফাইলে কোনো সক্রিয় Admin নেই।');

  // Restore-এর আগে বর্তমান ডাটাবেজের ব্যাকআপ
  var pre = { method: d.preBackup || '' };
  if (d.preBackup === 'DRIVE') {
    var r = runDriveBackup_('PRE-RESTORE', ctx.name);
    if (r.status !== 'OK') throw err_('Could not save the safety backup to Drive: ' + r.error, 'Restore-এর আগের নিরাপত্তা ব্যাকআপ Drive-এ সেভ করা যায়নি: ' + r.error);
    pre.fileName = r.fileName;
  } else if (d.preBackup !== 'DOWNLOADED') {
    throw err_('Take a backup of the current database first.', 'আগে বর্তমান ডাটাবেজের ব্যাকআপ নিন।');
  }

  return withLock_(function () {
    var result = {};
    var finalProducts = {};
    var curProducts = read_('products').rows;
    if (mode === 'REPLACE' && secs.indexOf('products') >= 0) pack.data.products.forEach(function (p) { finalProducts[p.ProductID] = 1; });
    else { curProducts.forEach(function (p) { finalProducts[p.ProductID] = 1; }); if (secs.indexOf('products') >= 0) pack.data.products.forEach(function (p) { finalProducts[p.ProductID] = 1; }); }
    var finalTx = (mode === 'REPLACE' && secs.indexOf('transactions') >= 0) ? pack.data.transactions : read_('txns').rows.concat(secs.indexOf('transactions') >= 0 ? pack.data.transactions : []);
    var orphan = finalTx.filter(function (t) { return !finalProducts[t.ProductID]; }).length;
    if (orphan) throw err_(orphan + ' transaction(s) would lose their product. Restore products together with transactions.',
      orphan + 'টি ট্রানজ্যাকশনের প্রোডাক্ট থাকবে না। Products ও Transactions একসাথে Restore করুন।');

    secs.forEach(function (sec) {
      var t = SECTION_TABLE[sec], key = SCHEMA[t].key, cols = SCHEMA[t].cols;
      var incoming = pack.data[sec].map(function (r) {
        var o = {}; cols.forEach(function (c) { o[c] = r[c] == null ? '' : String(r[c]); });
        if ((t === 'txns' || t === 'etxns') && !o.Status) o.Status = 'ACTIVE';
        if (t === 'logs' && !o.Status) o.Status = 'ACTIVE';
        return o;
      });
      if (mode === 'REPLACE') {
        rewrite_(t, incoming);
        result[sec] = { written: incoming.length, skipped: 0 };
      } else {
        var cur = read_(t).rows, ids = {}, codes = {}, reqs = {};
        cur.forEach(function (r) { ids[r[key]] = 1; if (t === 'products') codes[String(r.Code).toLowerCase()] = 1; if (t === 'txns' && r.RequestID) reqs[r.RequestID] = 1; });
        var add = [], skipped = 0;
        incoming.forEach(function (o) {
          if (ids[o[key]]) { skipped++; return; }
          if (t === 'products' && codes[String(o.Code).toLowerCase()]) { skipped++; return; }
          if (t === 'txns' && o.RequestID && reqs[o.RequestID] && o.Source === 'APP') { skipped++; return; }
          ids[o[key]] = 1; if (t === 'products') codes[String(o.Code).toLowerCase()] = 1;
          add.push(o);
        });
        append_(t, add);
        result[sec] = { written: add.length, skipped: skipped };
      }
    });
    if (secs.indexOf('products') >= 0) {
      var rows = read_('products').rows, live = rows.filter(function (x) { return !bool_(x.Deleted); }).sort(byOrder_);
      live.forEach(function (x, i) { x.DisplayOrder = String(i + 1); });
      rewrite_('products', live.concat(rows.filter(function (x) { return bool_(x.Deleted); })));
    }
    if (secs.indexOf('settings') >= 0) { try { applyBackupSchedule_(); } catch (e) {} }
    rebuildInventory_();
    log_(ctx, 'IMPORT_JSON', 'Backup', pack.meta.scope || '', 'JSON restore (' + mode + ') from backup of ' + (pack.meta.exportedAt || '?') +
      ' — ' + secs.map(function (s) { return s + ': +' + result[s].written + (result[s].skipped ? ' (skipped ' + result[s].skipped + ')' : ''); }).join(', ') +
      (pre.fileName ? '. Safety backup: ' + pre.fileName : '. Safety backup downloaded by admin'), undefined, result);
    bumpRev_();
    return { result: result, preBackup: pre, boot: bootstrapData_(ctx) };
  });
}

/* ---------------------------------------------------------------------
 *  পুরোনো SCS STORE ডাটা মাইগ্রেশন (Product list / TXN_LOG / Total summary / Settings)
 * ------------------------------------------------------------------- */
var LEGACY = { PRODUCT: 'Product list', SUMMARY: 'Total summary', TXN: 'TXN_LOG', MIN: 'Settings', START: 3 };

function legacyPending_(s) {
  if (bool_(s.legacy_imported)) return false;
  try { return !!db_().getSheetByName(LEGACY.PRODUCT) && read_('products').rows.length === 0; } catch (e) { return false; }
}

function legacyRead_() {
  var ss = db_();
  var ps = ss.getSheetByName(LEGACY.PRODUCT);
  if (!ps) throw err_('Old "Product list" sheet was not found.', 'পুরোনো "Product list" শিট পাওয়া যায়নি।');
  var tz = tz_(), products = [], txns = [], summary = {}, mins = {};
  var lr = ps.getLastRow();
  if (lr >= LEGACY.START) {
    ps.getRange(LEGACY.START, 1, lr - LEGACY.START + 1, 6).getValues().forEach(function (r) {
      var pid = str_(r[1], 40), name = str_(r[2], 150);
      if (pid && name) products.push({ sl: num_(r[0]), code: pid, name: name, pack: str_(r[3], 40), unit: str_(r[4], 30), cat: str_(r[5], 60) });
    });
  }
  var ms = ss.getSheetByName(LEGACY.MIN);
  if (ms && ms.getLastRow() >= 2 && String(ms.getRange(1, 1).getValue()).trim() === 'PID') {
    ms.getRange(2, 1, ms.getLastRow() - 1, 2).getValues().forEach(function (r) { var k = str_(r[0], 40); if (k) mins[k] = num_(r[1]); });
  }
  var ts = ss.getSheetByName(LEGACY.TXN);
  if (ts && ts.getLastRow() >= 2) {
    var occ = {};
    ts.getRange(2, 1, ts.getLastRow() - 1, 8).getValues().forEach(function (r, i) {
      var pid = str_(r[1], 40), type = str_(r[4], 5).toUpperCase(), q = num_(r[5]);
      if (!pid || (type !== 'IN' && type !== 'OUT') || !(q > 0)) return;
      var dt = r[0] instanceof Date ? r[0] : new Date(r[0]);
      if (isNaN(dt.getTime())) return;
      var sig = [fmt_(dt, 'yyyy-MM-dd HH:mm:ss'), pid, type, q, num_(r[6]), num_(r[7])].join('|');
      occ[sig] = (occ[sig] || 0) + 1;
      txns.push({ id: 'LEG-' + sha256Hex_(sig + '|' + occ[sig]).slice(0, 14).toUpperCase(), date: fmt_(dt, 'yyyy-MM-dd'), time: fmt_(dt, 'HH:mm:ss'),
        created: fmt_(dt, 'yyyy-MM-dd HH:mm:ss'), code: pid, name: str_(r[2], 150), pack: str_(r[3], 40), type: type, qty: round_(q),
        prev: num_(r[6]), next: num_(r[7]), row: i + 2 });
    });
  }
  var ss2 = ss.getSheetByName(LEGACY.SUMMARY);
  if (ss2 && ss2.getLastRow() >= LEGACY.START) {
    ss2.getRange(LEGACY.START, 2, ss2.getLastRow() - LEGACY.START + 1, 8).getValues().forEach(function (r) {
      var pid = str_(r[0], 40);
      if (pid && r[7] !== '' && r[7] !== null) summary[pid] = round_(num_(r[7]));
    });
  }
  return { products: products, txns: txns, summary: summary, mins: mins, tz: tz };
}

function legacyPlan_() {
  var L = legacyRead_();
  var existingCodes = {}, existingTx = {};
  read_('products').rows.forEach(function (p) { existingCodes[String(p.Code).toLowerCase()] = p; });
  read_('txns').rows.forEach(function (t) { existingTx[t.TxnID] = 1; });
  var calc = {};
  L.txns.forEach(function (t) { calc[t.code] = round_((calc[t.code] || 0) + (t.type === 'IN' ? t.qty : -t.qty)); });
  var diffs = [];
  L.products.forEach(function (p) {
    if (L.summary[p.code] === undefined) return;
    var d = round_(L.summary[p.code] - (calc[p.code] || 0));
    if (Math.abs(d) > 1e-9) diffs.push({ code: p.code, name: p.name, fromTxn: calc[p.code] || 0, sheetStock: L.summary[p.code], adj: d });
  });
  return {
    L: L, productsNew: L.products.filter(function (p) { return !existingCodes[p.code.toLowerCase()]; }).length,
    productsExisting: L.products.filter(function (p) { return existingCodes[p.code.toLowerCase()]; }).length,
    txnsNew: L.txns.filter(function (t) { return !existingTx[t.id]; }).length,
    txnsExisting: L.txns.filter(function (t) { return existingTx[t.id]; }).length,
    unknownProducts: L.txns.filter(function (t) { return !L.products.some(function (p) { return p.code === t.code; }) && !existingCodes[t.code.toLowerCase()]; }).length,
    diffs: diffs
  };
}

function legacyScan_(ctx) {
  var ss = db_();
  var found = [LEGACY.PRODUCT, LEGACY.SUMMARY, LEGACY.TXN, LEGACY.MIN].filter(function (n) { return !!ss.getSheetByName(n); });
  if (found.indexOf(LEGACY.PRODUCT) < 0) return { found: found, available: false, imported: settings_().legacy_imported_at || '' };
  var p = legacyPlan_();
  return { found: found, available: true, imported: settings_().legacy_imported_at || '',
    products: p.L.products.length, productsNew: p.productsNew, productsExisting: p.productsExisting,
    txns: p.L.txns.length, txnsNew: p.txnsNew, txnsExisting: p.txnsExisting, unknownProducts: p.unknownProducts,
    minStocks: Object.keys(p.L.mins).length, diffs: p.diffs };
}

function legacyImport_(ctx) {
  return withLock_(function () {
    var plan = legacyPlan_(), L = plan.L, now = stamp_();
    var rows = read_('products').rows;
    var byCode = {}; rows.forEach(function (p) { byCode[String(p.Code).toLowerCase()] = p; });
    var live = rows.filter(function (x) { return !bool_(x.Deleted); }).sort(byOrder_);
    var addP = 0;
    L.products.sort(function (a, b) { return (a.sl || 1e9) - (b.sl || 1e9); }).forEach(function (lp) {
      if (byCode[lp.code.toLowerCase()]) return;
      var p = { ProductID: uniqueId_('PRD-', rows.map(function (x) { return x.ProductID; })), Code: lp.code, Name: lp.name, PackSize: lp.pack,
        Unit: lp.unit, Category: lp.cat, MinStock: String(L.mins[lp.code] || 0), Status: 'ACTIVE', Deleted: 'FALSE',
        CreatedAt: now, CreatedBy: ctx.name + ' (migration)', UpdatedAt: now, UpdatedBy: ctx.name };
      rows.push(p); live.push(p); byCode[lp.code.toLowerCase()] = p; addP++;
    });
    // ট্রানজ্যাকশন লগে থাকা কিন্তু Product list-এ নেই এমন PID → Inactive প্রোডাক্ট হিসেবে সংরক্ষণ (হিস্টোরি হারাবে না)
    L.txns.forEach(function (t) {
      if (byCode[t.code.toLowerCase()]) return;
      var p = { ProductID: uniqueId_('PRD-', rows.map(function (x) { return x.ProductID; })), Code: t.code, Name: t.name || t.code, PackSize: t.pack,
        Unit: '', Category: '', MinStock: '0', Status: 'INACTIVE', Deleted: 'FALSE', CreatedAt: now, CreatedBy: ctx.name + ' (migration)', UpdatedAt: now, UpdatedBy: ctx.name };
      rows.push(p); live.push(p); byCode[t.code.toLowerCase()] = p; addP++;
    });
    live.forEach(function (x, i) { x.DisplayOrder = String(i + 1); });
    rewrite_('products', live.concat(rows.filter(function (x) { return bool_(x.Deleted); })));

    var existingTx = {}; read_('txns').rows.forEach(function (t) { existingTx[t.TxnID] = 1; });
    var addT = [];
    L.txns.forEach(function (t) {
      if (existingTx[t.id]) return;
      var p = byCode[t.code.toLowerCase()];
      addT.push({ TxnID: t.id, BatchID: 'LEG-' + t.created.replace(/\D/g, ''), TxnDate: t.date, TxnTime: t.time, Type: t.type, ProductID: p.ProductID,
        ProductCode: t.code, ProductName: t.name || p.Name, PackSize: t.pack, Unit: p.Unit, Quantity: t.qty, PrevStock: t.prev, NewStock: t.next,
        UserName: 'Legacy (old app)', UserID: '', Remarks: 'Imported from old TXN_LOG row ' + t.row, Status: 'ACTIVE', CreatedAt: t.created,
        EditCount: 0, EditedAt: '', EditedBy: '', DeletedAt: '', DeletedBy: '', DeleteReason: '', RequestID: '', Source: 'LEGACY' });
      existingTx[t.id] = 1;
    });
    // Opening balance adjustment — নতুন হিসাব যেন পুরোনো "Total summary"-র Current Stock-এর সাথে মেলে
    var firstDate = L.txns.reduce(function (m, t) { return !m || t.date < m ? t.date : m; }, '') || today_();
    var addA = [];
    plan.diffs.forEach(function (df) {
      var id = 'LEG-ADJ-' + sha256Hex_(df.code).slice(0, 10).toUpperCase();
      if (existingTx[id]) return;
      var p = byCode[df.code.toLowerCase()];
      addA.push({ TxnID: id, BatchID: 'LEG-OPENING', TxnDate: firstDate, TxnTime: '00:00:00', Type: 'ADJ', ProductID: p.ProductID,
        ProductCode: p.Code, ProductName: p.Name, PackSize: p.PackSize, Unit: p.Unit, Quantity: df.adj, PrevStock: 0, NewStock: df.adj,
        UserName: 'Legacy (old app)', UserID: '', Remarks: 'Opening balance adjustment (old Total summary stock ' + df.sheetStock + ')',
        Status: 'ACTIVE', CreatedAt: firstDate + ' 00:00:00', EditCount: 0, EditedAt: '', EditedBy: '', DeletedAt: '', DeletedBy: '', DeleteReason: '', RequestID: '', Source: 'LEGACY' });
      existingTx[id] = 1;
    });
    append_('txns', addA.concat(addT));
    setSettings_({ legacy_imported: 'TRUE', legacy_imported_at: now });
    rebuildInventory_();
    log_(ctx, 'LEGACY_IMPORT', 'System', '', 'Old SCS Store data imported: ' + addP + ' product(s), ' + addT.length + ' transaction(s), ' + addA.length + ' opening adjustment(s)',
      undefined, { products: addP, transactions: addT.length, adjustments: addA.length });
    bumpRev_();
    return { products: addP, transactions: addT.length, adjustments: addA.length, scan: legacyScan_(ctx), boot: bootstrapData_(ctx) };
  });
}

/* ---------------------------------------------------------------------
 *  SYSTEM INFO
 * ------------------------------------------------------------------- */
function systemInfo_(ctx) {
  var ss = db_();
  var sheets = Object.keys(SCHEMA).map(function (t) { return { table: t, sheet: SCHEMA[t].sheet, rows: read_(t).rows.length }; });
  return { spreadsheet: ss.getName(), spreadsheetUrl: ss.getUrl(), timeZone: tz_(), version: APP.VERSION, schema: APP.SCHEMA, sheets: sheets, rev: rev_(), serverTime: stamp_() };
}
