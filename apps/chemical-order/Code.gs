/**
 * =====================================================================
 *  SCS Chemical Order - Backend (Google Apps Script)   |   Code.gs
 *  Swarup Construction Solution
 * =====================================================================
 *  এই একটি ফাইলে আগের সব ব্যাকএন্ড ফাইল একত্র করা হয়েছে:
 *   Code.gs + SMS Service.gs + Send Order Data to Destination sheet.gs + PdfStyles.html
 *  সাথে Index.html (UI + JavaScript)। মোট ২টি ফাইল।
 *
 *  ডিপ্লয়: গুগল শিটের ভেতর থেকে Extensions > Apps Script > Code.gs ও Index.html পেস্ট করুন
 *  -> একবার setupAndAuthorize() Run করে পারমিশন দিন -> Deploy > New deployment > Web app.
 *
 *  পিন:  ইউজার পিন = 2019 | অ্যাডমিন পিন = 2026 (অ্যাডমিন প্যানেল থেকে বদলানো যায়)
 *  SMS API / ডেস্টিনেশন শিট / SMS টেক্সট -> সবকিছু অ্যাডমিন প্যানেল থেকে সেট হয় (কোডে কিছু নেই)।
 * =====================================================================
 */

const APP_CONFIG = {
  PRODUCT_SHEET: 'Product List',
  ORDER_SHEET: 'SCS Order',
  USER_PIN: '2019',
  DEFAULT_ADMIN_PIN: '2026',
  TIMEZONE: 'Asia/Dhaka',
};

const PDF_CONFIG = {
  BILL_CHALLAN_FOLDER_ID: '13yg5WrhoN6nxY0gR6vHKPLvGPkIEQUMy',
  SEAL_IMAGE_FILE_ID: '1IObOMCqQFjTKvtVwjVwYB-Lq9eDWBn9P',
  PAGE_WIDTH_MM: 215.9,
  PAGE_HEIGHT_MM: 279.4,
  SIDE_MARGIN_MM: 15,
  TOP_PAD_MARGIN_MM: 34.5,
  BOTTOM_PAD_MARGIN_MM: 19.05,
  TITLE_TOP_GAP_MM: 2,
  TITLE_WIDTH_MM: 55,
  TITLE_HEIGHT_MM: 12,
  INFO_HEIGHT_MM: 25,
  SIGN_BOTTOM_MM: 0,
  SEAL_RIGHT_MM: 4,
  SEAL_BOTTOM_MM: 7,
  SEAL_WIDTH_MM: 38,
  SEAL_HEIGHT_MM: 32,
  SEAL_OPACITY: 0.8,
  COL_SL_MM: 10,
  COL_DESC_MM: 75,
  COL_UNIT_MM: 22,
  COL_QTY_MM: 22,
  COL_UNIT_PRICE_MM: 22,
  COL_TOTAL_MM: 23,
};

// Order sheet column numbers (1-based)
const COL = {
  ORDER_NO: 2, CLIENT: 4, MOBILE: 5, ADDRESS: 6, PRODUCT: 7, QTY: 8, UNIT: 9,
  SPECIAL_PRICE: 14, TRANSPORT_FEE: 15, SMS_STATUS: 22, PDF_STATUS: 23,
};

const SMS_DEFAULT_LINES = [
  { id: 'intro', label: 'Intro', enabled: true, text: 'Thank you for purchasing products from Swarup Construction Solution.' },
  { id: 'dear', label: 'Greeting', enabled: true, text: 'Dear {client},' },
  { id: 'received', label: 'Order received', enabled: true, text: 'We have received your order now (Order No: {orderNo}).' },
  { id: 'products', label: 'Products', enabled: true, text: 'Your Product:\n{products}' },
  { id: 'price', label: 'Price', enabled: true, text: '{price}' },
  { id: 'address', label: 'Address', enabled: true, text: 'Delivery Address: {address}.' },
  { id: 'delivery', label: 'Delivery date', enabled: false, text: 'Delivery Date: {delivery}' },
  { id: 'mobile', label: 'Mobile', enabled: false, text: 'Mobile: {mobile}' },
  { id: 'orderby', label: 'Order by', enabled: false, text: 'Order By: {orderBy}' },
  { id: 'hotline', label: 'Hotline', enabled: true, text: 'Hotline: +8801711190271' },
  { id: 'website', label: 'Website', enabled: true, text: 'Website: swarupconstructionsolution.com' },
];

/* ---------------------------------------------------------------------
 *  WEB APP ENTRY
 * ------------------------------------------------------------------- */
function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('SCS Chemical Order')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function onOpen() {
  try {
    SpreadsheetApp.getUi().createMenu('SCS Tools')
      .addItem('Setup / Authorize', 'setupAndAuthorize')
      .addItem('Sync all orders to destination now', 'syncToDestination')
      .addToUi();
  } catch (e) {}
}

/** একবার এডিটর থেকে Run করুন: পারমিশন নেবে + ট্রাইগার ঠিক করবে */
function setupAndAuthorize() {
  getHome_();
  DriveApp.getRootFolder().getName();
  ensureOnFormSubmitTrigger_();
  applySyncTrigger_(getSyncConfig_().auto);
  applyBackupTrigger_(getBackupConfig_());
  return 'Authorized: ' + getHome_().getName();
}

/* ---------------------------------------------------------------------
 *  SETTINGS (Script Properties - API key শিটে দেখা যায় না)
 * ------------------------------------------------------------------- */
function props_() { return PropertiesService.getScriptProperties(); }

function getJson_(key, def) {
  try { var v = props_().getProperty(key); return v ? JSON.parse(v) : def; } catch (e) { return def; }
}

function setJson_(key, obj) { props_().setProperty(key, JSON.stringify(obj)); }

function getHome_() {
  var active = null;
  try { active = SpreadsheetApp.getActiveSpreadsheet(); } catch (e) { active = null; }
  if (active) {
    if (props_().getProperty('DB_SPREADSHEET_ID') !== active.getId()) props_().setProperty('DB_SPREADSHEET_ID', active.getId());
    return active;
  }
  var id = props_().getProperty('DB_SPREADSHEET_ID');
  if (id) return SpreadsheetApp.openById(id);
  throw new Error('Google Sheet সংযুক্ত নেই। শিটের ভেতর থেকে Extensions > Apps Script দিয়ে স্ক্রিপ্ট খুলুন।');
}

function withLock_(fn, ms) {
  var lock = LockService.getScriptLock();
  lock.waitLock(ms || 60000);
  try { return fn(); } finally { lock.releaseLock(); }
}

/* ---------------------------------------------------------------------
 *  PIN (ইউজার 2019 / অ্যাডমিন 2026)
 * ------------------------------------------------------------------- */
function sha256Hex_(s) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(s), Utilities.Charset.UTF_8);
  return bytes.map(function (x) {
    var v = (x < 0 ? x + 256 : x).toString(16);
    return v.length === 1 ? '0' + v : v;
  }).join('');
}

function adminHash_() { return props_().getProperty('ADMIN_PIN_HASH') || sha256Hex_('scs|' + APP_CONFIG.DEFAULT_ADMIN_PIN); }
function isAdminPin_(pin) { return sha256Hex_('scs|' + String(pin || '')) === adminHash_(); }
function isUserPin_(pin) { return String(pin || '') === APP_CONFIG.USER_PIN; }
function requireAdmin_(pin) { if (!isAdminPin_(pin)) throw new Error('Invalid admin PIN'); }
function requireEditPin_(pin) { if (!isUserPin_(pin) && !isAdminPin_(pin)) throw new Error('Invalid PIN'); }

function getLoginInfo() { return { adminLen: Number(props_().getProperty('ADMIN_PIN_LEN') || 4) }; }

function verifyLogin(pin) {
  if (isUserPin_(pin)) return { ok: true, role: 'user' };
  if (isAdminPin_(pin)) return { ok: true, role: 'admin' };
  return { ok: false };
}

function verifyEditPin(pin) { return { ok: isUserPin_(pin) || isAdminPin_(pin) }; }
function verifyAdminPin(pin) { return { ok: isAdminPin_(pin) }; }

function changeAdminPin(oldPin, newPin) {
  requireAdmin_(oldPin);
  newPin = String(newPin || '');
  if (!/^\d{4,8}$/.test(newPin)) throw new Error('Admin PIN must be 4 to 8 digits.');
  if (newPin === APP_CONFIG.USER_PIN) throw new Error('Admin PIN cannot be the same as the user PIN.');
  logHistory_('Settings', 'Admin PIN', 'Change', { pin: '****' }, { pin: '**** (changed)' }, 'Admin');
  props_().setProperty('ADMIN_PIN_HASH', sha256Hex_('scs|' + newPin));
  props_().setProperty('ADMIN_PIN_LEN', String(newPin.length));
  return { ok: true, len: newPin.length };
}

/* ---------------------------------------------------------------------
 *  ADMIN CONFIG: SMS / DESTINATION SYNC / PDF
 * ------------------------------------------------------------------- */
function getSmsConfig_() {
  var s = getJson_('SMS_CONFIG', {});
  return {
    enabled: !!s.enabled,
    apiUrl: String(s.apiUrl || ''),
    apiKey: String(s.apiKey || ''),
    senderId: String(s.senderId || ''),
    lines: (Array.isArray(s.lines) && s.lines.length) ? s.lines : SMS_DEFAULT_LINES,
  };
}

function getSyncConfig_() {
  var s = getJson_('SYNC_CONFIG', {});
  return {
    enabled: !!s.enabled,
    sheetUrl: String(s.sheetUrl || ''),
    tabName: String(s.tabName || APP_CONFIG.ORDER_SHEET),
    auto: !!s.auto,
    lastSync: String(s.lastSync || ''),
    lastError: String(s.lastError || ''),
  };
}

function getPdfCfg_() {
  var o = getJson_('PDF_OVERRIDE', {});
  return Object.assign({}, PDF_CONFIG, {
    BILL_CHALLAN_FOLDER_ID: o.folderId || PDF_CONFIG.BILL_CHALLAN_FOLDER_ID,
    SEAL_IMAGE_FILE_ID: (o.sealId !== undefined && o.sealId !== null) ? o.sealId : PDF_CONFIG.SEAL_IMAGE_FILE_ID,
  });
}

function maskKey_(k) {
  k = String(k || '');
  if (!k) return '';
  return k.length <= 8 ? '••••••••' : k.slice(0, 3) + '••••••••' + k.slice(-3);
}

function getAdminConfig(pin) {
  requireAdmin_(pin);
  var sms = getSmsConfig_(), sync = getSyncConfig_(), pdf = getPdfCfg_();
  return {
    sms: { enabled: sms.enabled, apiUrl: sms.apiUrl, apiKeyMasked: maskKey_(sms.apiKey), apiKeySet: !!sms.apiKey, senderId: sms.senderId, lines: sms.lines },
    sync: sync,
    pdf: { folderId: pdf.BILL_CHALLAN_FOLDER_ID, sealId: pdf.SEAL_IMAGE_FILE_ID, letterheadId: getJson_('PDF_OVERRIDE', {}).letterheadId || '', letterheadIdA4: getJson_('PDF_OVERRIDE', {}).letterheadIdA4 || '' },
    backup: (function () { var b = getBackupConfig_(); return { enabled: b.enabled, folderId: b.folderId, every: b.every, keep: b.keep, lastTime: b.lastTime, lastStatus: b.lastStatus }; })(),
    smsDefaultLines: SMS_DEFAULT_LINES,
  };
}

function saveSmsConfig(cfg, pin) {
  requireAdmin_(pin);
  cfg = cfg || {};
  var old = getSmsConfig_();
  var lines = (Array.isArray(cfg.lines) ? cfg.lines : old.lines).slice(0, 30).map(function (l, i) {
    return { id: String(l.id || ('l' + i)).slice(0, 30), label: String(l.label || '').slice(0, 40), enabled: !!l.enabled, text: String(l.text || '').slice(0, 500) };
  });
  var apiUrl = String(cfg.apiUrl || '').trim();
  if (apiUrl && !/^https?:\/\//i.test(apiUrl)) throw new Error('API URL must start with http:// or https://');
  var apiKey = (cfg.apiKey === undefined || cfg.apiKey === null || cfg.apiKey === '__KEEP__') ? old.apiKey : String(cfg.apiKey).trim();
  var out = { enabled: !!cfg.enabled, apiUrl: apiUrl, apiKey: apiKey, senderId: String(cfg.senderId || '').trim(), lines: lines };
  if (out.enabled && (!out.apiUrl || !out.apiKey)) throw new Error('SMS চালু করতে API URL ও API Key দিন।');
  logHistory_('Settings', 'SMS', 'Update', smsLog_(old), smsLog_(out), 'Admin');
  setJson_('SMS_CONFIG', out);
  return { ok: true, apiKeyMasked: maskKey_(out.apiKey), apiKeySet: !!out.apiKey };
}

function saveSyncConfig(cfg, pin) {
  requireAdmin_(pin);
  cfg = cfg || {};
  var old = getSyncConfig_();
  var out = { enabled: !!cfg.enabled, sheetUrl: String(cfg.sheetUrl || '').trim(), tabName: String(cfg.tabName || APP_CONFIG.ORDER_SHEET).trim() || APP_CONFIG.ORDER_SHEET, auto: !!cfg.auto, lastSync: old.lastSync, lastError: '' };
  if (out.enabled || out.sheetUrl) {
    var id = extractSheetId_(out.sheetUrl);
    if (!id) throw new Error('সঠিক Google Sheet URL দিন।');
    try { SpreadsheetApp.openById(id).getName(); } catch (e) { throw new Error('ডেস্টিনেশন শিট খোলা যাচ্ছে না। লিংক ও এক্সেস (Editor) চেক করুন।'); }
  }
  logHistory_('Settings', 'Destination Sync', 'Update', syncLog_(old), syncLog_(out), 'Admin');
  setJson_('SYNC_CONFIG', out);
  applySyncTrigger_(out.enabled && out.auto);
  return { ok: true };
}

function savePdfConfig(cfg, pin) {
  requireAdmin_(pin);
  cfg = cfg || {};
  var folderId = String(cfg.folderId || '').trim();
  var m = folderId.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (m) folderId = m[1];
  if (folderId) { try { DriveApp.getFolderById(folderId).getName(); } catch (e) { throw new Error('PDF ফোল্ডার খোলা যাচ্ছে না।'); } }
  var oldP = getJson_('PDF_OVERRIDE', {}), newP = { folderId: folderId, sealId: String(cfg.sealId || '').trim(), letterheadId: extractDriveId_(cfg.letterhead), letterheadIdA4: extractDriveId_(cfg.letterheadA4) };
  logHistory_('Settings', 'PDF & Drive', 'Update', oldP, newP, 'Admin');
  setJson_('PDF_OVERRIDE', newP);
  return { ok: true };
}

function previewSms(cfg, pin) {
  requireAdmin_(pin);
  var c = { lines: (cfg && cfg.lines) || getSmsConfig_().lines };
  return renderSmsText_(c, {
    client: 'Rahim Traders', orderNo: '202611-07', productLines: ['Waterproof Chemical 20 Litre', 'Tile Adhesive 5 Kg'],
    total: 18500, transport: 500, address: 'Narayanganj Sadar, Dhaka', delivery: '12 Nov 2026 10:30', mobile: '8801711000000', orderBy: 'Office',
  });
}

function sendTestSms(to, pin) {
  requireAdmin_(pin);
  var mobile = normalizeBdMobile(to);
  if (!mobile) throw new Error('সঠিক মোবাইল নম্বর দিন।');
  var cfg = getSmsConfig_();
  var res = sendSms_(mobile, 'SCS test SMS: your SMS service is working.', cfg);
  if (!res.ok) throw new Error(res.error || 'SMS পাঠানো যায়নি।');
  return { ok: true };
}

function retryPendingSms(pin) {
  requireAdmin_(pin);
  var cfg = getSmsConfig_();
  if (!cfg.enabled) throw new Error('SMS Service বন্ধ আছে।');
  return processPendingOrderSms();
}

function syncAllNow(pin) {
  requireAdmin_(pin);
  var cfg = getSyncConfig_();
  if (!cfg.sheetUrl) throw new Error('আগে ডেস্টিনেশন শিটের লিংক সেভ করুন।');
  var r = syncAllToDestination_(true);
  if (!r.ok) throw new Error(r.error);
  return r;
}

/* ---------------------------------------------------------------------
 *  TRIGGERS
 * ------------------------------------------------------------------- */
function ensureOnFormSubmitTrigger_() {
  var ss = getHome_();
  var exists = ScriptApp.getProjectTriggers().some(function (t) {
    return t.getHandlerFunction() === 'onFormSubmit' && t.getEventType() === ScriptApp.EventType.ON_FORM_SUBMIT;
  });
  if (!exists) ScriptApp.newTrigger('onFormSubmit').forSpreadsheet(ss).onFormSubmit().create();
}

function onFormSubmit(e) {
  var cfg = getSmsConfig_();
  if (cfg.enabled) processPendingOrderSms();
  var s = getSyncConfig_();
  if (s.enabled && s.auto) syncToDestination();
}

/** onChange ট্রাইগার: শিটে সরাসরি এডিট/নতুন রো হলে ডেস্টিনেশনে অটো সিঙ্ক */
function applySyncTrigger_(enable) {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'syncToDestination') ScriptApp.deleteTrigger(t);
  });
  if (enable) ScriptApp.newTrigger('syncToDestination').forSpreadsheet(getHome_()).onChange().create();
}

function syncToDestination(e) {
  var cfg = getSyncConfig_();
  if (!cfg.enabled || !cfg.sheetUrl) return;
  syncAllToDestination_(false);
}

/* ---------------------------------------------------------------------
 *  DESTINATION SHEET SYNC (আগের ফরম্যাটেই ডাটা যায়)
 * ------------------------------------------------------------------- */
function extractSheetId_(url) {
  url = String(url || '').trim();
  if (!url) return '';
  var m = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (m) return m[1];
  return /^[a-zA-Z0-9_-]{25,}$/.test(url) ? url : '';
}

function openDestSheet_(cfg, headers) {
  var id = extractSheetId_(cfg.sheetUrl);
  if (!id) throw new Error('ডেস্টিনেশন শিটের লিংক সঠিক নয়।');
  var destSS = SpreadsheetApp.openById(id);
  var dest = destSS.getSheetByName(cfg.tabName) || destSS.insertSheet(cfg.tabName);
  if (dest.getLastRow() === 0) {
    dest.getRange(1, 1, 1, headers.length).setValues([headers])
      .setFontWeight('bold').setBackground('#d9ead3').setHorizontalAlignment('center');
    dest.setFrozenRows(1);
  }
  return dest;
}

function saveSyncStatus_(err) {
  var c = getJson_('SYNC_CONFIG', {});
  c.lastSync = Utilities.formatDate(new Date(), APP_CONFIG.TIMEZONE, 'yyyy-MM-dd HH:mm:ss');
  c.lastError = err ? String(err) : '';
  setJson_('SYNC_CONFIG', c);
}

/** সম্পূর্ণ সিঙ্ক: নতুন অর্ডার যোগ + বদলে যাওয়া রো আপডেট */
function syncAllToDestination_(waitLong) {
  var cfg = getSyncConfig_();
  var lock = LockService.getScriptLock();
  try { lock.waitLock(waitLong ? 60000 : 15000); } catch (err) { return { ok: false, error: 'Busy' }; }
  try {
    var src = getHome_().getSheetByName(APP_CONFIG.ORDER_SHEET);
    if (!src) return { ok: false, error: 'SCS Order sheet not found' };
    var lastRow = src.getLastRow(), lastCol = src.getLastColumn();
    if (lastRow < 2) return { ok: true, added: 0, updated: 0 };
    var srcVals = src.getRange(1, 1, lastRow, lastCol).getValues();
    var dest = openDestSheet_(cfg, srcVals[0]);

    var dLast = dest.getLastRow();
    var destVals = dLast > 1 ? dest.getRange(2, 1, dLast - 1, lastCol).getValues() : [];
    var destMap = {}, cnt = {};
    destVals.forEach(function (r, idx) {
      var o = String(r[1] || '').trim();
      if (!o) return;
      cnt[o] = (cnt[o] || 0) + 1;
      destMap[o + '_' + cnt[o]] = idx;
    });

    var seen = {}, appendRows = [], updated = 0;
    for (var i = 1; i < srcVals.length; i++) {
      var row = srcVals[i];
      var o = String(row[1] || '').trim();
      if (!o) continue;
      seen[o] = (seen[o] || 0) + 1;
      var key = o + '_' + seen[o];
      if (destMap[key] !== undefined) {
        var di = destMap[key];
        if (JSON.stringify(destVals[di]) !== JSON.stringify(row)) {
          dest.getRange(di + 2, 1, 1, row.length).setValues([row]);
          updated++;
        }
      } else {
        appendRows.push(row);
      }
    }
    if (appendRows.length) dest.getRange(dest.getLastRow() + 1, 1, appendRows.length, lastCol).setValues(appendRows);
    saveSyncStatus_('');
    return { ok: true, added: appendRows.length, updated: updated };
  } catch (err) {
    saveSyncStatus_(err.toString());
    return { ok: false, error: err.toString() };
  } finally {
    lock.releaseLock();
  }
}

/** একটি অর্ডার সাথে সাথে ডেস্টিনেশনে পাঠানো/আপডেট (নতুন, এডিট, রিসাবমিট) */
function syncOrderToDestination_(orderNo) {
  var cfg = getSyncConfig_();
  if (!cfg.enabled || !cfg.sheetUrl) return { skipped: true };
  var lock = LockService.getScriptLock();
  try { lock.waitLock(30000); } catch (err) { return { ok: false, error: 'Busy' }; }
  try {
    var src = getHome_().getSheetByName(APP_CONFIG.ORDER_SHEET);
    var lastRow = src.getLastRow(), lastCol = src.getLastColumn();
    var vals = src.getRange(1, 1, lastRow, lastCol).getValues();
    var target = String(orderNo).trim();
    var rows = vals.slice(1).filter(function (r) { return String(r[1] || '').trim() === target; });
    var dest = openDestSheet_(cfg, vals[0]);

    var dLast = dest.getLastRow();
    var destRows = [];
    if (dLast > 1) {
      var ord = dest.getRange(2, 2, dLast - 1, 1).getValues();
      ord.forEach(function (r, i) { if (String(r[0] || '').trim() === target) destRows.push(i + 2); });
    }
    var n = Math.min(rows.length, destRows.length);
    for (var i = 0; i < n; i++) dest.getRange(destRows[i], 1, 1, lastCol).setValues([rows[i]]);
    if (rows.length > n) {
      var extra = rows.slice(n);
      dest.getRange(dest.getLastRow() + 1, 1, extra.length, lastCol).setValues(extra);
    }
    for (var k = destRows.length - 1; k >= rows.length; k--) dest.deleteRow(destRows[k]);
    saveSyncStatus_('');
    return { ok: true };
  } catch (err) {
    saveSyncStatus_(err.toString());
    return { ok: false, error: err.toString() };
  } finally {
    lock.releaseLock();
  }
}

/* ---------------------------------------------------------------------
 *  SMS SERVICE (সব সেটিং অ্যাডমিন থেকে)
 * ------------------------------------------------------------------- */
function processPendingOrderSms(onlyOrderNo) {
  var cfg = getSmsConfig_();
  return withLock_(function () {
    var sh = getHome_().getSheetByName(APP_CONFIG.ORDER_SHEET);
    if (!sh) throw new Error('Sheet not found: ' + APP_CONFIG.ORDER_SHEET);
    var lastRow = sh.getLastRow();
    if (lastRow < 2) return { sent: 0 };
    var lastCol = Math.max(sh.getLastColumn(), COL.SMS_STATUS);
    var values = sh.getRange(2, 1, lastRow - 1, lastCol).getValues();

    var groups = {};
    values.forEach(function (row, idx) {
      var o = String(row[COL.ORDER_NO - 1] || '').trim();
      if (!o) return;
      (groups[o] = groups[o] || []).push({ rowNumber: idx + 2, row: row });
    });

    var statusMap = {}, sent = 0;
    Object.keys(groups).forEach(function (orderNo) {
      if (onlyOrderNo && orderNo !== String(onlyOrderNo).trim()) return;
      var items = groups[orderNo];
      var sts = items.map(function (x) { return String(x.row[COL.SMS_STATUS - 1] || '').trim(); });
      var anySent = sts.some(function (s) { return s.indexOf('Sent') > -1; });
      if (anySent) {
        items.forEach(function (x, i) { if (sts[i].indexOf('Sent') === -1) statusMap[x.rowNumber] = 'Sent ✅'; });
        return;
      }
      if (!onlyOrderNo) {
        var retry = sts.every(function (s) { return s === '' || s === 'Pending' || s === 'Not Sent'; });
        if (!retry) return;
      }
      if (!cfg.enabled) { items.forEach(function (x) { statusMap[x.rowNumber] = 'SMS Off'; }); return; }

      var first = items[0].row;
      var mobile = normalizeBdMobile(String(first[COL.MOBILE - 1] || '').trim());
      if (!mobile) { items.forEach(function (x) { statusMap[x.rowNumber] = 'Invalid Number'; }); return; }

      var total = 0, lines = [];
      items.forEach(function (x) {
        var r = x.row;
        var name = String(r[COL.PRODUCT - 1] || '').trim();
        if (name) lines.push([name, String(r[COL.QTY - 1] || '').trim(), String(r[COL.UNIT - 1] || '').trim()].filter(Boolean).join(' '));
        total += parseFloat(r[COL.SPECIAL_PRICE - 1]) || 0;
      });
      var transport = parseFloat(first[COL.TRANSPORT_FEE - 1]) || 0;
      var text = renderSmsText_(cfg, {
        client: String(first[COL.CLIENT - 1] || '').trim(), orderNo: orderNo, productLines: lines,
        total: total + transport, transport: transport, address: String(first[COL.ADDRESS - 1] || '').trim(),
        delivery: fmtDelivery_(first[2]), mobile: mobile, orderBy: String(first[16] || '').trim(),
      });
      var res = sendSms_(mobile, text, cfg);
      var st = res.ok ? 'Sent ✅' : (res.invalidNumber ? 'Invalid Number' : 'Not Sent');
      if (res.ok) sent++;
      items.forEach(function (x) { statusMap[x.rowNumber] = st; });
    });

    if (Object.keys(statusMap).length) {
      var range = sh.getRange(2, COL.SMS_STATUS, lastRow - 1, 1);
      var cur = range.getValues();
      for (var i = 0; i < cur.length; i++) if (statusMap[i + 2] !== undefined) cur[i][0] = statusMap[i + 2];
      range.setValues(cur);
    }
    var keys = Object.keys(statusMap);
    return { sent: sent, status: (onlyOrderNo && keys.length) ? statusMap[keys[0]] : '' };
  }, 60000);
}

function fmtDelivery_(v) {
  if (v instanceof Date) {
    var has = v.getHours() || v.getMinutes();
    return Utilities.formatDate(v, APP_CONFIG.TIMEZONE, has ? 'd MMM yyyy HH:mm' : 'd MMM yyyy');
  }
  return String(v || '');
}

function renderSmsText_(cfg, d) {
  var total = formatTaka_(d.total), transport = formatTaka_(d.transport);
  var price = d.transport > 0
    ? 'Total Price: ' + total + ' Taka with ' + transport + ' taka Transport Fee.'
    : 'Total Price: ' + total + ' Taka.';
  var map = {
    client: d.client || 'Customer', orderNo: d.orderNo || '', products: (d.productLines && d.productLines.length) ? d.productLines.join('\n') : '-',
    price: price, total: total, transport: transport, address: d.address || '-', delivery: d.delivery || '-',
    mobile: d.mobile || '', orderBy: d.orderBy || '-',
  };
  return (cfg.lines || []).filter(function (l) { return l.enabled; }).map(function (l) {
    return String(l.text || '').replace(/\{(\w+)\}/g, function (m, k) { return map.hasOwnProperty(k) ? map[k] : m; });
  }).filter(function (s) { return String(s).trim() !== ''; }).join('\n');
}

function sendSms_(to, msg, cfg) {
  cfg = cfg || getSmsConfig_();
  if (!cfg.apiUrl || !cfg.apiKey) return { ok: false, invalidNumber: false, error: 'SMS API সেট করা নেই (Admin > SMS Service)।' };
  try {
    var response = UrlFetchApp.fetch(cfg.apiUrl, {
      method: 'post',
      payload: { api_key: cfg.apiKey, msg: msg, to: to, sender_id: cfg.senderId },
      muteHttpExceptions: true,
    });
    var code = response.getResponseCode(), text = response.getContentText(), json = null;
    try { json = JSON.parse(text); } catch (e) {}
    var ok = (json && Number(json.error) === 0) || (code >= 200 && code < 300 && !(json && json.error && Number(json.error) !== 0));
    if (ok) return { ok: true, invalidNumber: false };
    var raw = ((json && json.msg) ? String(json.msg) : text);
    return { ok: false, invalidNumber: /invalid|number|mobile|recipient|msisdn/i.test(raw), error: raw.slice(0, 200) };
  } catch (err) {
    return { ok: false, invalidNumber: false, error: String(err).slice(0, 200) };
  }
}

function normalizeBdMobile(input) {
  if (!input) return null;
  var d = String(input).replace(/\D/g, '');
  if (!d) return null;
  if (d.indexOf('00') === 0) d = d.slice(2);
  if (/^8801[3-9]\d{8}$/.test(d)) return d;
  if (/^01[3-9]\d{8}$/.test(d)) return '88' + d;
  if (/^1[3-9]\d{8}$/.test(d)) return '880' + d;
  return null;
}

function formatTaka_(n) {
  return Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 2 }).replace(/\.00$/, '');
}

/* ---------------------------------------------------------------------
 *  ORDER APP: ডাটা, সাবমিট, এডিট
 * ------------------------------------------------------------------- */
function normalizeMobile_(mobile) {
  var digits = String(mobile || '').trim().replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 10) return '880' + digits;
  if (digits.length === 11 && digits.indexOf('0') === 0) return '880' + digits.slice(1);
  if (digits.length === 13 && digits.indexOf('880') === 0) return '880' + digits.slice(3);
  return '';
}

function getOrderHeaders_() {
  return [
    'Timestamp', 'Order No', 'Delivery Time & Date', 'Client or Project name', 'Mobile number', 'Address',
    'Product Name', 'Quantity', 'Unit', 'Pack Size', 'Unit Price', 'Discount Unit Price', 'Total Price',
    'Special Price', 'Transport Fee', 'SCS Transport Cost', 'Order By', 'Engineer Commission Per Unit',
    'Contractor Commission Per Unit', 'Commission Holder Name', 'Total Commission', 'SMS Status', 'PDF Status'
  ];
}

function getOrCreateOrderSheet_(sheetName) {
  var ss = getHome_();
  var name = sheetName || APP_CONFIG.ORDER_SHEET;
  var sh = ss.getSheetByName(name);
  if (!sh && !sheetName) {
    sh = ss.insertSheet(APP_CONFIG.ORDER_SHEET);
    ensureOrderHeader_(sh);
  }
  return sh;
}

function ensureOrderHeader_(sh) {
  var headers = getOrderHeaders_();
  if (sh.getLastRow() === 0) sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  sh.setFrozenRows(1);
}

function formatOrderSheet_(sh) {
  if (sh.getLastRow() < 1) return;
  sh.autoResizeColumns(1, getOrderHeaders_().length);
}

function getBootstrapData() {
  var lists = loadLists_();
  var ss = getHome_(), sheets = [];
  ss.getSheets().forEach(function (s) { var nm = s.getName().trim(); if (!isDbSheet_(nm)) sheets.push(nm); });
  return {
    nextOrderNo: generateOrderNo_(),
    products: lists.products,
    sellers: lists.sellers,
    orderByList: lists.sellers.map(function (x) { return x.name; }),
    lastPrices: lastPrices_(),
    availableSheets: sheets,
    ver: dataVersion_(),
  };
}

function getNextOrderNo() { return generateOrderNo_(); }

/** প্রতিটি প্রোডাক্টের সর্বশেষ দাম/কমিশন (অর্ডার ফর্মে অটো সাজেশনের জন্য) */
function lastPrices_() {
  var out = {};
  try {
    var sh = getHome_().getSheetByName(APP_CONFIG.ORDER_SHEET);
    if (!sh || sh.getLastRow() < 2) return out;
    var n = Math.min(400, sh.getLastRow() - 1), start = sh.getLastRow() - n + 1;
    var rows = sh.getRange(start, 1, n, 19).getValues();
    rows.forEach(function (r) {
      var name = String(r[6] || '').trim();
      if (name) out[name] = { up: r[10] || '', dup: r[11] || '', eng: r[17] || '', con: r[18] || '' };
    });
  } catch (e) {}
  return out;
}

function generateOrderNo_() {
  var sh = getOrCreateOrderSheet_();
  var prefix = Utilities.formatDate(new Date(), APP_CONFIG.TIMEZONE, 'yyyyMM');
  var data = sh.getDataRange().getValues();
  var maxSerial = 0;
  for (var i = 1; i < data.length; i++) {
    var no = String(data[i][1] || '');
    if (no.indexOf(prefix + '-') === 0) {
      var s = Number(no.split('-')[1] || 0);
      if (s > maxSerial) maxSerial = s;
    }
  }
  return prefix + '-' + String(maxSerial + 1).padStart(2, '0');
}

/** একটি অর্ডারের সব রো-এর অ্যারে (শিটের কলাম ক্রমে) */
function buildOrderRows_(orderNo, ts, payload, smsStatus, pdfStatus) {
  var mobile = normalizeMobile_(payload.mobile);
  var transportFee = Number(payload.transportFee || 0);
  var scsTransportCost = Number(payload.scsTransportCost || 0);
  return (payload.items || []).map(function (r, idx) {
    var qty = Number(r.quantity || 0), up = Number(r.unitPrice || 0), dup = Number(r.discountUnitPrice || 0);
    var specialPrice = qty * dup;
    return [
      ts, orderNo, payload.deliveryAt || '', payload.clientName || '', mobile, payload.address || '',
      r.productName || '', qty, r.unit || '', r.packSize || '', up, dup,
      specialPrice + (idx === 0 ? transportFee : 0),
      specialPrice,
      idx === 0 ? transportFee : 0,
      idx === 0 ? scsTransportCost : 0,
      payload.orderBy || '',
      Number(r.engCom || 0), Number(r.conCom || 0),
      payload.commissionHolderName || '',
      Number(r.rowCommission || 0),
      smsStatus, pdfStatus,
    ];
  });
}

function validateOrderPayload_(p) {
  if (!(p.items || []).length) return 'At least one product required';
  if (!normalizeMobile_(p.mobile)) return 'Valid Mobile Number is required';
  return '';
}

function submitOrder(payload) {
  if (payload.mode === 'resubmit') return resubmitScsTransport_(payload);
  var err = validateOrderPayload_(payload);
  if (err) return { ok: false, error: err };

  var orderNo = '';
  withLock_(function () {
    var sh = getOrCreateOrderSheet_();
    orderNo = generateOrderNo_();
    var rows = buildOrderRows_(orderNo, new Date(), payload, 'Pending', 'Not Uploaded');
    var start = sh.getLastRow() + 1;
    sh.getRange(start, 5, rows.length, 1).setNumberFormat('@');
    sh.getRange(start, 1, rows.length, rows[0].length).setValues(rows);
    SpreadsheetApp.flush();
  });
  bumpVer_();
  return { ok: true, orderNo: orderNo, bg: true };
}

function resubmitScsTransport_(payload) {
  var orderNo = String(payload.orderNo || '').trim();
  if (!orderNo) return { ok: false, error: 'Order No required' };
  var sh = getOrCreateOrderSheet_();
  var data = sh.getDataRange().getValues(), found = false, before = null, after = Number(payload.scsTransportCost || 0);
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][1]) === orderNo) {
      if (before === null) before = data[i][15];
      if (payload.scsTransportCost !== undefined) sh.getRange(i + 1, 16).setValue(after);
      found = true;
    }
  }
  if (!found) return { ok: false, error: 'Order not found' };
  if (Number(before || 0) !== after) logHistory_('Order', orderNo, 'Resubmit', { scsTransportCost: Number(before || 0) }, { scsTransportCost: after }, 'User');
  bumpVer_();
  return { ok: true, orderNo: orderNo, bg: 'sync' };
}

/** সাবমিট/এডিটের পরের কাজ: SMS, ডেস্টিনেশন সিঙ্ক, PDF */
function finishOrder_(orderNo, sendSms, skipPdf) {
  var smsStatus = '', smsError = '';
  try {
    if (sendSms) {
      var r = processPendingOrderSms(orderNo);
      smsStatus = r && r.status ? r.status : '';
    }
  } catch (e) { smsError = e.toString(); Logger.log('SMS Error: ' + smsError); }

  var syncRes = { skipped: true };
  try { syncRes = syncOrderToDestination_(orderNo); } catch (e) { syncRes = { ok: false, error: e.toString() }; }

  try { formatOrderSheet_(getOrCreateOrderSheet_()); } catch (e) {}

  var pdfUploaded = false, pdfError = '';
  if (!skipPdf) {
    try {
      var pdfRes = generateAndUploadBillChallanByOrderNo(orderNo);
      if (pdfRes && pdfRes.ok) pdfUploaded = true; else pdfError = (pdfRes && pdfRes.error) ? pdfRes.error : 'PDF upload failed';
    } catch (e) { pdfError = e.toString(); }
  }

  // PDF স্ট্যাটাস বদলালে ডেস্টিনেশনেও আপডেট
  if (pdfUploaded) { try { syncRes = syncOrderToDestination_(orderNo); } catch (e) {} }

  bumpVer_();
  return {
    ok: true, orderNo: orderNo, pdfUploaded: pdfUploaded, pdfError: pdfError, pdfSkipped: !!skipPdf,
    smsStatus: smsStatus, smsError: smsError, syncStatus: syncLabel_(syncRes),
  };
}

/** ফ্রন্টএন্ড থেকে ব্যাকগ্রাউন্ডে কল: SMS + PDF + ডেস্টিনেশন সিঙ্ক */
function finishOrderBackground(orderNo, sendSms, skipPdf) { return finishOrder_(String(orderNo), !!sendSms, !!skipPdf); }
function syncOrderBackground(orderNo) { return { ok: true, syncStatus: syncLabel_(syncOrderToDestination_(String(orderNo))) }; }

function syncLabel_(r) {
  if (!r || r.skipped) return 'off';
  return r.ok ? 'ok' : 'failed';
}

/** পিন দিয়ে অর্ডার এডিট (ইউজার 2019 / অ্যাডমিন 2026) -> সাথে সাথে ডেস্টিনেশনে আপডেট */
function updateOrder(payload, pin) {
  requireEditPin_(pin);
  var orderNo = String(payload.orderNo || '').trim();
  if (!orderNo) return { ok: false, error: 'Order No required' };
  var err = validateOrderPayload_(payload);
  if (err) return { ok: false, error: err };
  var sheetName = payload.sheetName || APP_CONFIG.ORDER_SHEET;
  var isMain = sheetName === APP_CONFIG.ORDER_SHEET;
  var beforeObj = null;
  try { beforeObj = getOrderByNo(orderNo, sheetName); } catch (e) {}
  var oldSms = 'Pending';

  withLock_(function () {
    var sh = getHome_().getSheetByName(sheetName);
    if (!sh) throw new Error('Sheet not found: ' + sheetName);
    var vals = sh.getDataRange().getValues();
    var oldRows = [];
    for (var i = 1; i < vals.length; i++) if (String(vals[i][1] || '').trim() === orderNo) oldRows.push(i + 1);
    if (!oldRows.length) throw new Error('Order not found');

    var firstOld = vals[oldRows[0] - 1];
    var ts = firstOld[0] || new Date();
    oldSms = String(firstOld[COL.SMS_STATUS - 1] || 'Pending');
    var newRows = buildOrderRows_(orderNo, ts, payload, oldSms, 'Not Uploaded');
    var width = newRows[0].length;

    var n = Math.min(newRows.length, oldRows.length);
    for (var k = 0; k < n; k++) {
      sh.getRange(oldRows[k], 5).setNumberFormat('@');
      sh.getRange(oldRows[k], 1, 1, width).setValues([newRows[k]]);
    }
    if (newRows.length > n) {
      var extra = newRows.slice(n), after = oldRows[oldRows.length - 1];
      sh.insertRowsAfter(after, extra.length);
      sh.getRange(after + 1, 5, extra.length, 1).setNumberFormat('@');
      sh.getRange(after + 1, 1, extra.length, width).setValues(extra);
    }
    for (var d = oldRows.length - 1; d >= newRows.length; d--) sh.deleteRow(oldRows[d]);
    SpreadsheetApp.flush();
  });

  // হিস্ট্রি: আগে কী ছিল / এখন কী হলো
  try {
    var b = snapOrderObj_(beforeObj), a = snapOrderPayload_(payload);
    if (JSON.stringify(b) !== JSON.stringify(a)) logHistory_('Order', orderNo, 'Edit', b, a, isAdminPin_(pin) ? 'Admin' : 'User');
  } catch (e) {}
  bumpVer_();
  if (!isMain) return { ok: true, orderNo: orderNo, bg: false, archived: true };
  return { ok: true, orderNo: orderNo, bg: true, needSms: oldSms.indexOf('Sent') === -1 };
}

function getOrderByNo(orderNo, sheetName) {
  var ss = getHome_();
  var target = String(orderNo || '').trim();
  if (!target) return { ok: false };
  var sheets = sheetName ? [ss.getSheetByName(sheetName)].filter(Boolean) : ss.getSheets().filter(function (x) { return !isDbSheet_(x.getName()); });
  var matched = [], foundSheet = '';
  for (var s = 0; s < sheets.length; s++) {
    var data = sheets[s].getDataRange().getValues();
    if (data.length > 1) {
      var rows = data.slice(1).filter(function (r) { return String(r[1]) === target; });
      if (rows.length) { matched = rows; foundSheet = sheets[s].getName(); break; }
    }
  }
  if (!matched.length) return { ok: false };

  var first = matched[0];
  var deliveryDate = '', deliveryTime = '';
  var dv = first[2];
  var d = dv instanceof Date ? dv : (dv ? new Date(String(dv)) : null);
  if (d && !isNaN(d.getTime())) {
    deliveryDate = Utilities.formatDate(d, APP_CONFIG.TIMEZONE, 'yyyy-MM-dd');
    deliveryTime = Utilities.formatDate(d, APP_CONFIG.TIMEZONE, 'HH:mm');
    if (!(dv instanceof Date) && String(dv).trim().length <= 10) deliveryTime = '';
    if (dv instanceof Date && !dv.getHours() && !dv.getMinutes()) deliveryTime = '';
  }
  var items = matched.map(function (r) {
    return {
      productName: r[6] || '', quantity: r[7] || '', unit: r[8] || '', packSize: r[9] || '',
      unitPrice: r[10] || '', discountUnitPrice: r[11] || '', totalPrice: r[12] || '', specialPrice: r[13] || '',
      engCom: r[17] || '', conCom: r[18] || '', rowCommission: r[20] || '',
    };
  });
  return {
    ok: true, orderNo: target, sheetName: foundSheet, deliveryDate: deliveryDate, deliveryTime: deliveryTime,
    clientName: first[3] || '', mobile: String(first[4] || '').replace(/^'/, ''), address: first[5] || '',
    transportFee: first[14] || '', scsTransportCost: first[15] || '', orderBy: first[16] || '',
    engineerCommissionPerUnit: first[17] || '', contractorCommissionPerUnit: first[18] || '',
    commissionHolderName: first[19] || '', totalCommission: first[20] || '',
    smsStatus: first[21] || 'Pending', pdfStatus: first[22] || 'Not Uploaded', items: items,
  };
}

function searchClientByMobile(mobile) {
  var d = String(mobile || '').replace(/\D/g, '');
  d = d.replace(/^880/, '').replace(/^0/, '');
  if (d.length < 4) return { ok: false, results: [] };
  var sheets = getHome_().getSheets(), map = {}, order = [];
  for (var s = 0; s < sheets.length; s++) {
    if (isDbSheet_(sheets[s].getName()) || sheets[s].getLastRow() < 2) continue;
    var data = sheets[s].getRange(2, 1, sheets[s].getLastRow() - 1, 6).getValues();
    for (var i = data.length - 1; i >= 0; i--) {
      var m = normalizeMobile_(data[i][4]);
      if (!m || m.indexOf(d) === -1) continue;
      var client = String(data[i][3] || '').trim(), address = String(data[i][5] || '').trim(), key = m + '||' + client + '||' + address;
      if (!map[key]) {
        var ts = data[i][0];
        map[key] = { mobile: m, clientName: client, address: address, orders: 0, last: ts instanceof Date ? Utilities.formatDate(ts, APP_CONFIG.TIMEZONE, 'd MMM yyyy') : String(ts).slice(0, 10) };
        order.push(key);
      }
      map[key].orders++;
    }
  }
  return { ok: true, results: order.slice(0, 8).map(function (k) { return map[k]; }) };
}

function getSummary(filters) {
  var ss = getHome_();
  var targetSheetName = (filters && filters.sheetName) ? filters.sheetName : APP_CONFIG.ORDER_SHEET;
  var targetYm = (filters && filters.yearMonth) ? String(filters.yearMonth) : '';
  var sh = ss.getSheetByName(targetSheetName) || ss.getSheetByName(APP_CONFIG.ORDER_SHEET);
  if (!sh) return { headers: getOrderHeaders_(), rows: [], lastUpdated: 0 };

  var values = sh.getDataRange().getValues();
  var headers = values.length ? values[0] : getOrderHeaders_();
  var rows = values.length > 1 ? values.slice(1) : [];
  var safeRows = rows.map(function (r) {
    return r.map(function (c) {
      if (c instanceof Date) return Utilities.formatDate(c, APP_CONFIG.TIMEZONE, 'yyyy-MM-dd HH:mm:ss');
      if (typeof c === 'string') return c.replace(/^'/, '');
      return c === null || c === undefined ? '' : c;
    });
  });
  if (targetYm) {
    var idx = headers.indexOf('Order No');
    if (idx > -1) safeRows = safeRows.filter(function (r) { return String(r[idx] || '').trim().indexOf(targetYm + '-') === 0; });
  }
  return { headers: headers, rows: safeRows, sheetName: targetSheetName, lastUpdated: dataVersion_() + '_' + sh.getName(), edited: editedMap_() };
}

/** শিটে কোনো সেল এডিট হলেও যেন সামারি রিফ্রেশ ধরতে পারে */
function hashRows_(rows) {
  var h = 0, s = JSON.stringify(rows);
  for (var i = 0; i < s.length; i += 7) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}


/* ---------------------------------------------------------------------
 *  DATABASE SHEETS (DB_Products / DB_Sellers / DB_History)
 *  ওয়েব অ্যাপ নিজেই এই শিটগুলো তৈরি করে নেয়। অর্ডার শিট (SCS Order) ও
 *  ডেস্টিনেশন শিটের ফরম্যাট আগের মতোই থাকে।
 * ------------------------------------------------------------------- */
const DB = { PRODUCTS: 'DB_Products', SELLERS: 'DB_Sellers', HISTORY: 'DB_History' };
const DB_HEADERS = {
  DB_Products: ['ID', 'Product Name', 'Unit', 'Pack Size', 'Created', 'Updated'],
  DB_Sellers: ['ID', 'Seller Name', 'Created', 'Updated'],
  DB_History: ['ID', 'Time', 'Entity', 'Ref', 'Action', 'Before', 'After', 'By'],
};
const ENTITY = {
  product: { sheet: 'DB_Products', fields: ['productName', 'unit', 'packs'], label: 'Product' },
  seller: { sheet: 'DB_Sellers', fields: ['name'], label: 'Seller' },
};

function isDbSheet_(n) { return n === APP_CONFIG.PRODUCT_SHEET || String(n).indexOf('DB_') === 0; }
function newId_() { return Utilities.getUuid().replace(/-/g, '').slice(0, 8); }
function nowStr_() { return Utilities.formatDate(new Date(), APP_CONFIG.TIMEZONE, 'yyyy-MM-dd HH:mm:ss'); }

function dbSheet_(name) {
  var ss = getHome_(), sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    var h = DB_HEADERS[name];
    sh.getRange(1, 1, 1, h.length).setValues([h]).setFontWeight('bold').setBackground('#fce7f3');
    sh.setFrozenRows(1);
  }
  return sh;
}

function bumpVer_() { props_().setProperty('DATA_VER', String(Date.now())); }
function dataVersion_() {
  var sh = null;
  try { sh = getHome_().getSheetByName(APP_CONFIG.ORDER_SHEET); } catch (e) {}
  return (props_().getProperty('DATA_VER') || '0') + '-' + (sh ? sh.getLastRow() : 0);
}
function getDataVersion() { return dataVersion_(); }

function loadLists_() {
  var cache = CacheService.getScriptCache(), c = cache.get('BOOT_LISTS');
  if (c) { try { return JSON.parse(c); } catch (e) {} }
  var ps = dbSheet_(DB.PRODUCTS), ss = dbSheet_(DB.SELLERS);
  if (!props_().getProperty('DB_MIGRATED') && ps.getLastRow() < 2 && ss.getLastRow() < 2) migrateLegacyProducts_(ps, ss);
  props_().setProperty('DB_MIGRATED', '1');
  if (!props_().getProperty('DB_V2')) { normalizeProducts_(ps); props_().setProperty('DB_V2', '1'); }
  var products = [], sellers = [];
  if (ps.getLastRow() > 1) ps.getRange(2, 1, ps.getLastRow() - 1, 4).getValues().forEach(function (r) {
    if (r[1]) products.push({ id: String(r[0]), productName: String(r[1]), unit: String(r[2] || ''), packSizes: String(r[3] || '').split('|').map(function (x) { return x.trim(); }).filter(Boolean) });
  });
  if (ss.getLastRow() > 1) ss.getRange(2, 1, ss.getLastRow() - 1, 2).getValues().forEach(function (r) {
    if (r[1]) sellers.push({ id: String(r[0]), name: String(r[1]) });
  });
  var out = { products: products, sellers: sellers };
  try { cache.put('BOOT_LISTS', JSON.stringify(out), 600); } catch (e) {}
  return out;
}

/** একই নাম+ইউনিটের একাধিক রো এক রো-তে (প্যাক সাইজ '|' দিয়ে) */
function normalizeProducts_(ps) {
  if (ps.getLastRow() < 2) return;
  var rows = ps.getRange(2, 1, ps.getLastRow() - 1, 6).getValues(), map = {}, order = [];
  rows.forEach(function (r) {
    var n = String(r[1] || '').trim(); if (!n) return;
    var k = n.toLowerCase() + '|' + String(r[2] || '').trim().toLowerCase();
    if (!map[k]) { map[k] = [r[0] || newId_(), n, String(r[2] || '').trim(), [], r[4], r[5]]; order.push(k); }
    String(r[3] || '').split('|').forEach(function (p) { p = p.trim(); if (p && map[k][3].indexOf(p) === -1) map[k][3].push(p); });
  });
  var out = order.map(function (k) { var m = map[k]; return [m[0], m[1], m[2], m[3].join('|'), m[4], m[5]]; });
  ps.getRange(2, 1, ps.getLastRow() - 1, 6).clearContent();
  if (out.length) ps.getRange(2, 1, out.length, 6).setValues(out);
}

/** আগের 'Product List' শিট (C=নাম, D=ইউনিট, E=প্যাক, F=সেলার) থেকে একবার ডাটা নেয় */
function migrateLegacyProducts_(ps, ss) {
  var old = getHome_().getSheetByName(APP_CONFIG.PRODUCT_SHEET);
  if (!old || old.getLastRow() < 2) return;
  var rows = old.getDataRange().getValues().slice(1), seenP = {}, seenS = {}, pr = [], sl = [], now = nowStr_();
  rows.forEach(function (r) {
    var n = String(r[2] || '').trim(), u = String(r[3] || '').trim(), p = String(r[4] || '').trim(), sName = String(r[5] || '').trim();
    if (n && !seenP[n + '|' + u + '|' + p]) { seenP[n + '|' + u + '|' + p] = 1; pr.push([newId_(), n, u, p, now, now]); }
    if (sName && !seenS[sName]) { seenS[sName] = 1; sl.push([newId_(), sName, now, now]); }
  });
  if (pr.length) ps.getRange(2, 1, pr.length, 6).setValues(pr);
  if (sl.length) ss.getRange(2, 1, sl.length, 4).setValues(sl);
}

function listsResult_() { CacheService.getScriptCache().remove('BOOT_LISTS'); var l = loadLists_(); bumpVer_(); return { ok: true, products: l.products, sellers: l.sellers, orderByList: l.sellers.map(function (x) { return x.name; }) }; }

function saveEntity(kind, rec, pin) {
  requireAdmin_(pin);
  var E = ENTITY[kind]; if (!E) throw new Error('Invalid type');
  rec = rec || {};
  if (kind === 'product') rec.packs = (Array.isArray(rec.packSizes) ? rec.packSizes : []).map(function (x) { return String(x).trim(); }).filter(function (x, i, a) { return x && a.indexOf(x) === i; }).join('|');
  var vals = E.fields.map(function (f) { return String(rec[f] || '').trim(); });
  if (!vals[0]) throw new Error(kind === 'product' ? 'Product name required' : 'Seller name required');
  var kf = kind === 'product' ? 2 : 1;
  return withLock_(function () {
    var sh = dbSheet_(E.sheet), width = DB_HEADERS[E.sheet].length;
    var data = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, width).getValues() : [];
    var key = vals.slice(0, kf).join('|').toLowerCase(), rowIdx = -1;
    data.forEach(function (r, i) { if (rec.id && String(r[0]) === String(rec.id)) rowIdx = i; });
    var dup = data.some(function (r, i) { return i !== rowIdx && E.fields.slice(0, kf).map(function (f, k) { return String(r[k + 1] || '').trim(); }).join('|').toLowerCase() === key; });
    if (dup) throw new Error('Already exists');
    var now = nowStr_();
    if (rowIdx > -1) {
      var oldRow = data[rowIdx], before = {}, after = {};
      E.fields.forEach(function (f, k) { before[f] = String(oldRow[k + 1] || ''); after[f] = vals[k]; });
      var nr = [oldRow[0]].concat(vals).concat([oldRow[width - 2], now]);
      sh.getRange(rowIdx + 2, 1, 1, width).setValues([nr]);
      if (JSON.stringify(before) !== JSON.stringify(after)) logHistory_(E.label, vals[0], 'Edit', before, after, 'Admin');
    } else {
      var after2 = {}; E.fields.forEach(function (f, k) { after2[f] = vals[k]; });
      sh.getRange(sh.getLastRow() + 1, 1, 1, width).setValues([[newId_()].concat(vals).concat([now, now])]);
      logHistory_(E.label, vals[0], 'Add', null, after2, 'Admin');
    }
    return listsResult_();
  });
}

/** তালিকার ক্রম বদল (ids = নতুন ক্রমে আইডি) */
function reorderEntities(kind, ids, pin) {
  requireAdmin_(pin);
  var E = ENTITY[kind]; if (!E) throw new Error('Invalid type');
  return withLock_(function () {
    var sh = dbSheet_(E.sheet), width = DB_HEADERS[E.sheet].length;
    if (sh.getLastRow() < 2) return listsResult_();
    var data = sh.getRange(2, 1, sh.getLastRow() - 1, width).getValues(), map = {};
    data.forEach(function (r) { map[String(r[0])] = r; });
    var out = [];
    (ids || []).forEach(function (id) { if (map[id]) { out.push(map[id]); delete map[id]; } });
    Object.keys(map).forEach(function (k) { out.push(map[k]); });
    sh.getRange(2, 1, out.length, width).setValues(out);
    logHistory_(E.label, 'Order', 'Reorder', null, { order: out.map(function (r) { return String(r[1]); }).slice(0, 60) }, 'Admin');
    return listsResult_();
  });
}

function deleteEntity(kind, id, pin) {
  requireAdmin_(pin);
  var E = ENTITY[kind]; if (!E) throw new Error('Invalid type');
  return withLock_(function () {
    var sh = dbSheet_(E.sheet), width = DB_HEADERS[E.sheet].length;
    if (sh.getLastRow() < 2) throw new Error('Not found');
    var data = sh.getRange(2, 1, sh.getLastRow() - 1, width).getValues();
    for (var i = 0; i < data.length; i++) {
      if (String(data[i][0]) === String(id)) {
        var before = {}; E.fields.forEach(function (f, k) { before[f] = String(data[i][k + 1] || ''); });
        sh.deleteRow(i + 2);
        logHistory_(E.label, String(data[i][1]), 'Delete', before, null, 'Admin');
        return listsResult_();
      }
    }
    throw new Error('Not found');
  });
}

/* ---------------------------------------------------------------------
 *  HISTORY (কে কখন কী বদলালো: আগে কী ছিল -> পরে কী হলো)
 * ------------------------------------------------------------------- */
function logHistory_(entity, ref, action, before, after, by) {
  try {
    var sh = dbSheet_(DB.HISTORY);
    sh.getRange(sh.getLastRow() + 1, 1, 1, 8).setValues([[newId_(), nowStr_(), entity, "'" + String(ref || ''), action, JSON.stringify(before === undefined ? null : before), JSON.stringify(after === undefined ? null : after), by || '']]);
  } catch (e) { Logger.log('History error: ' + e); }
}

function getHistory(limit) {
  var sh = dbSheet_(DB.HISTORY), last = sh.getLastRow();
  if (last < 2) return { ok: true, items: [] };
  var n = Math.min(Number(limit) || 300, last - 1), start = last - n + 1;
  var rows = sh.getRange(start, 1, n, 8).getValues().reverse();
  return {
    ok: true,
    items: rows.map(function (r) {
      var b = null, a = null;
      try { b = JSON.parse(r[5]); } catch (e) {}
      try { a = JSON.parse(r[6]); } catch (e) {}
      return { id: String(r[0]), time: r[1] instanceof Date ? Utilities.formatDate(r[1], APP_CONFIG.TIMEZONE, 'yyyy-MM-dd HH:mm:ss') : String(r[1]), entity: String(r[2]), ref: String(r[3]).replace(/^'/, ''), action: String(r[4]), before: b, after: a, by: String(r[7]) };
    }),
  };
}

/** শুধু অ্যাডমিন হিস্ট্রি মুছতে পারবে (ids = [..] অথবা 'ALL') */
function deleteHistory(ids, pin) {
  requireAdmin_(pin);
  var sh = dbSheet_(DB.HISTORY), last = sh.getLastRow();
  if (last < 2) return { ok: true, deleted: 0 };
  if (ids === 'ALL') { sh.deleteRows(2, last - 1); return { ok: true, deleted: last - 1 }; }
  var set = {}; (ids || []).forEach(function (i) { set[String(i)] = 1; });
  var col = sh.getRange(2, 1, last - 1, 1).getValues(), del = 0;
  for (var i = col.length - 1; i >= 0; i--) if (set[String(col[i][0])]) { sh.deleteRow(i + 2); del++; }
  return { ok: true, deleted: del };
}

function n_(x) { return String(Number(x || 0)); }

function snapOrderObj_(o) {
  if (!o || !o.ok) return null;
  return {
    delivery: (String(o.deliveryDate || '') + ' ' + String(o.deliveryTime || '')).trim(),
    client: String(o.clientName || ''), mobile: String(o.mobile || ''), address: String(o.address || ''),
    transportFee: n_(o.transportFee), scsTransportCost: n_(o.scsTransportCost), orderBy: String(o.orderBy || ''), commissionHolder: String(o.commissionHolderName || ''),
    items: (o.items || []).map(function (i) { return [i.productName, n_(i.quantity) + ' ' + (i.unit || ''), i.packSize, 'Price ' + n_(i.unitPrice), 'Disc ' + n_(i.discountUnitPrice), 'Eng ' + n_(i.engCom), 'Con ' + n_(i.conCom)].join(' | '); }),
  };
}

function snapOrderPayload_(p) {
  return {
    delivery: String(p.deliveryAt || '').trim(),
    client: String(p.clientName || ''), mobile: normalizeMobile_(p.mobile), address: String(p.address || ''),
    transportFee: n_(p.transportFee), scsTransportCost: n_(p.scsTransportCost), orderBy: String(p.orderBy || ''), commissionHolder: String(p.commissionHolderName || ''),
    items: (p.items || []).map(function (i) { return [i.productName, n_(i.quantity) + ' ' + (i.unit || ''), i.packSize, 'Price ' + n_(i.unitPrice), 'Disc ' + n_(i.discountUnitPrice), 'Eng ' + n_(i.engCom), 'Con ' + n_(i.conCom)].join(' | '); }),
  };
}

function smsLog_(c) { return { enabled: c.enabled, apiUrl: c.apiUrl, apiKey: maskKey_(c.apiKey), senderId: c.senderId, message: (c.lines || []).filter(function (l) { return l.enabled; }).map(function (l) { return l.text; }) }; }
function syncLog_(c) { return { enabled: c.enabled, sheetUrl: c.sheetUrl, tabName: c.tabName, auto: c.auto }; }

/** শিটে সরাসরি (ম্যানুয়াল) সেল এডিট হলেও হিস্ট্রিতে সেভ হবে */
function onEdit(e) {
  try {
    if (!e || !e.range) return;
    var sh = e.range.getSheet(), n = sh.getName();
    if (n === DB.HISTORY) return;
    if (n !== APP_CONFIG.ORDER_SHEET && n !== DB.PRODUCTS && n !== DB.SELLERS && !/^[A-Za-z]+ \d{4}$/.test(n)) return;
    var r = e.range.getRow(), c = e.range.getColumn();
    if (r < 2) return;
    var hdr = String(sh.getRange(1, c).getValue() || ('Col ' + c));
    var ref = n === APP_CONFIG.ORDER_SHEET || /^[A-Za-z]+ \d{4}$/.test(n) ? String(sh.getRange(r, 2).getValue() || ('Row ' + r)) : String(sh.getRange(r, 2).getValue() || ('Row ' + r));
    var single = e.range.getNumRows() === 1 && e.range.getNumColumns() === 1;
    var b = {}, a = {};
    b[single ? hdr : 'range ' + e.range.getA1Notation()] = single ? (e.oldValue === undefined ? '' : e.oldValue) : '(multiple cells)';
    a[single ? hdr : 'range ' + e.range.getA1Notation()] = single ? (e.value === undefined ? '' : e.value) : '(edited)';
    logHistory_('Sheet: ' + n, ref, 'Manual edit', b, a, 'Sheet');
    try { bumpVer_(); } catch (e2) {}
  } catch (err) {}
}


/* ---------------------------------------------------------------------
 *  LETTERHEAD PAD (লেটার সাইজ; বিল/চালানের ব্যাকগ্রাউন্ড, ঐচ্ছিক)
 * ------------------------------------------------------------------- */
function extractDriveId_(v) {
  v = String(v || '').trim();
  if (!v) return '';
  var m = v.match(/\/d\/([a-zA-Z0-9_-]+)/) || v.match(/[?&]id=([a-zA-Z0-9_-]+)/) || v.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  return m ? m[1] : v;
}

/** সিল ইমেজ data-URI (ক্লায়েন্ট-সাইড PDF ও প্রিন্টে বাইরের লিংক ছাড়াই) */
function getSealDataUri_() {
  try {
    var id = getPdfCfg_().SEAL_IMAGE_FILE_ID; if (!id) return '';
    var cache = CacheService.getScriptCache(), c = cache.get('SEAL_URI_' + id);
    if (c) return c;
    var b = DriveApp.getFileById(id).getBlob(), uri = 'data:' + b.getContentType() + ';base64,' + Utilities.base64Encode(b.getBytes());
    if (uri.length < 95000) { try { cache.put('SEAL_URI_' + id, uri, 3600); } catch (e) {} }
    return uri;
  } catch (e) { return ''; }
}

function getLetterheadDataUri_(kind) {
  var o = getJson_('PDF_OVERRIDE', {});
  var id = kind === 'a4' ? (o.letterheadIdA4 || '') : (o.letterheadId || '');
  if (!id) throw new Error((kind === 'a4' ? 'A4' : 'Letter') + ' letterhead pad is not set (Admin > PDF & Letterhead).');
  var b = DriveApp.getFileById(id).getBlob();
  return 'data:' + b.getContentType() + ';base64,' + Utilities.base64Encode(b.getBytes());
}

function uploadLetterhead(b64, mime, name, kind, pin) {
  requireAdmin_(pin);
  kind = kind === 'a4' ? 'a4' : 'letter';
  var blob = Utilities.newBlob(Utilities.base64Decode(b64), mime || 'image/png', name || ('letterhead-' + kind + '.png'));
  var f = DriveApp.getFolderById(getPdfCfg_().BILL_CHALLAN_FOLDER_ID).createFile(blob);
  var o = getJson_('PDF_OVERRIDE', {}), key = kind === 'a4' ? 'letterheadIdA4' : 'letterheadId', oldId = o[key] || '';
  o[key] = f.getId();
  setJson_('PDF_OVERRIDE', o);
  logHistory_('Settings', 'Letterhead ' + kind.toUpperCase(), 'Upload', { file: oldId }, { file: name || '' }, 'Admin');
  return { ok: true, id: f.getId(), kind: kind };
}

/** ক্লায়েন্টে (ব্রাউজারে) বানানো পূর্ণ-পেজ PDF ড্রাইভে সেভ */
function savePdfToDrive(orderNo, b64) {
  orderNo = String(orderNo || '').trim();
  if (!orderNo || !b64) throw new Error('Invalid PDF data');
  var name = 'Bill & challan ' + orderNo + '.pdf';
  var blob = Utilities.newBlob(Utilities.base64Decode(b64), 'application/pdf', name);
  var file = upsertPdfFile_(DriveApp.getFolderById(getPdfCfg_().BILL_CHALLAN_FOLDER_ID), name, blob);
  updatePdfStatusForOrder_(orderNo, true);
  bumpVer_();
  try { syncOrderToDestination_(orderNo); } catch (e) {}
  return { ok: true, url: file.getUrl() };
}

function downloadOrderPdf(orderNo, letterhead, paper) {
  var res = getOrderByNo(orderNo);
  if (!res || !res.ok) return { ok: false, error: 'Order not found' };
  var od = buildOrderDataFromOrderObj_(res, true);
  var html = buildBillChallanBundleHtml_(od.orderData, { letterhead: letterhead || '', paper: paper });
  var blob = Utilities.newBlob(html, 'text/html', 'bill-challan.html').getAs('application/pdf');
  return { ok: true, name: 'Bill & challan ' + orderNo + '.pdf', data: Utilities.base64Encode(blob.getBytes()) };
}

/* ---------------------------------------------------------------------
 *  EDITED MARK + ALL-TIME STATS (ড্যাশবোর্ড)
 * ------------------------------------------------------------------- */
function editedMap_() {
  var out = {};
  try {
    var sh = dbSheet_(DB.HISTORY), last = sh.getLastRow();
    if (last < 2) return out;
    var n = Math.min(5000, last - 1), rows = sh.getRange(last - n + 1, 2, n, 4).getValues(), cutE = Date.now() - 72 * 3600 * 1000, cutT = Date.now() - 24 * 3600 * 1000;
    rows.forEach(function (r) {
      if (String(r[1]) !== 'Order') return;
      var act = String(r[3]);
      if (act !== 'Edit' && act !== 'Transport' && act !== 'Resubmit') return;
      var ref = String(r[2]).replace(/^'/, ''), t = r[0] instanceof Date ? r[0].getTime() : new Date(String(r[0]).replace(' ', 'T')).getTime();
      var lbl = r[0] instanceof Date ? Utilities.formatDate(r[0], APP_CONFIG.TIMEZONE, 'd MMM HH:mm') : String(r[0]).slice(5, 16);
      var m = out[ref] = out[ref] || { e: 0, et: '', t: 0, tt: '' };
      if (act === 'Edit') { m.e++; if (t >= cutE) m.et = lbl; } else { m.t++; if (t >= cutT) m.tt = lbl; }
    });
  } catch (e) {}
  return out;
}

function getAllStats() {
  var months = {}, days = {}, sellers = {}, products = {}, total = { orders: 0, qty: 0, sales: 0, comm: 0, transport: 0 };
  getHome_().getSheets().forEach(function (sh) {
    if (isDbSheet_(sh.getName()) || sh.getLastRow() < 2) return;
    var vals = sh.getRange(2, 1, sh.getLastRow() - 1, 21).getValues(), seen = {};
    vals.forEach(function (r) {
      var no = String(r[1] || '').trim();
      if (!/^\d{6}-/.test(no)) return;
      var ym = no.slice(0, 6), qty = Number(r[7] || 0), sp = Number(r[13] || 0), tr = Number(r[14] || 0), cm = Number(r[20] || 0);
      var m = months[ym] = months[ym] || { ym: ym, orders: 0, qty: 0, sales: 0, comm: 0, transport: 0 };
      var ts = r[0], day = ts instanceof Date ? Utilities.formatDate(ts, APP_CONFIG.TIMEZONE, 'yyyy-MM-dd') : String(ts).slice(0, 10);
      var d = days[day] = days[day] || { o: 0, s: 0, q: 0 };
      var sn = String(r[16] || 'Unknown').trim() || 'Unknown', se = sellers[sn] = sellers[sn] || { name: sn, orders: 0, qty: 0, sales: 0, comm: 0 };
      var pn = String(r[6] || '').trim(), pr = pn ? (products[pn] = products[pn] || { name: pn, unit: String(r[8] || ''), qty: 0, sales: 0, orders: 0 }) : null;
      m.qty += qty; m.sales += sp + tr; m.comm += cm; m.transport += tr;
      d.s += sp + tr; d.q += qty;
      se.qty += qty; se.sales += sp + tr; se.comm += cm;
      if (pr) { pr.qty += qty; pr.sales += sp; pr.orders++; }
      total.qty += qty; total.sales += sp + tr; total.comm += cm; total.transport += tr;
      if (!seen[no]) { seen[no] = 1; m.orders++; d.o++; se.orders++; total.orders++; }
    });
  });
  var byS = function (a, b) { return b.sales - a.sales; };
  return { ok: true, total: total, days: days, months: Object.keys(months).sort().reverse().map(function (k) { return months[k]; }),
    sellers: Object.keys(sellers).map(function (k) { return sellers[k]; }).sort(byS), products: Object.keys(products).map(function (k) { return products[k]; }).sort(byS) };
}


/* ---------------------------------------------------------------------
 *  TRANSPORT COST (পিন লাগে) / DELETE ORDER (অ্যাডমিন) / LISTS
 * ------------------------------------------------------------------- */
function setTransportCost(orderNo, cost, pin) {
  requireEditPin_(pin);
  orderNo = String(orderNo || '').trim();
  var val = Number(cost || 0);
  return withLock_(function () {
    var sheets = orderSheets_(), found = false, before = 0;
    for (var s = 0; s < sheets.length && !found; s++) {
      var sh = sheets[s];
      if (sh.getLastRow() < 2) continue;
      var data = sh.getRange(2, 1, sh.getLastRow() - 1, 16).getValues();
      for (var i = 0; i < data.length; i++) {
        if (String(data[i][1] || '').trim() === orderNo) {
          before = Number(data[i][15] || 0);
          sh.getRange(i + 2, 16).setValue(val);
          found = true; break;
        }
      }
    }
    if (!found) throw new Error('Order not found');
    logHistory_('Order', orderNo, 'Transport', { scsTransportCost: String(before) }, { scsTransportCost: String(val) }, isAdminPin_(pin) ? 'Admin' : 'User');
    bumpVer_();
    return { ok: true, orderNo: orderNo, bg: 'sync' };
  });
}

function deleteOrder(orderNo, pin) {
  requireAdmin_(pin);
  orderNo = String(orderNo || '').trim();
  if (!orderNo) throw new Error('Order No required');
  var snap = null;
  try { snap = snapOrderObj_(getOrderByNo(orderNo)); } catch (e) {}
  var removed = 0;
  withLock_(function () {
    orderSheets_().forEach(function (sh) {
      if (sh.getLastRow() < 2) return;
      var col = sh.getRange(2, 2, sh.getLastRow() - 1, 1).getValues();
      for (var i = col.length - 1; i >= 0; i--) if (String(col[i][0] || '').trim() === orderNo) { sh.deleteRow(i + 2); removed++; }
    });
  });
  if (!removed) throw new Error('Order not found');
  logHistory_('Order', orderNo, 'Delete', snap, null, 'Admin');
  bumpVer_();
  return { ok: true, orderNo: orderNo, rows: removed, bg: 'sync' };
}

/** হালকা লিস্ট (প্রোডাক্ট/সেলার) - অন্য ডিভাইসের পরিবর্তন ধরার জন্য */
function getLists() {
  var l = loadLists_();
  return { products: l.products, sellers: l.sellers, orderByList: l.sellers.map(function (x) { return x.name; }), ver: dataVersion_() };
}

/* ---------------------------------------------------------------------
 *  AUTO BACKUP -> Google Drive (সময়ভিত্তিক ট্রাইগার)
 * ------------------------------------------------------------------- */
function getBackupConfig_() {
  var c = getJson_('BACKUP_CONFIG', {});
  return { enabled: !!c.enabled, folderId: String(c.folderId || ''), every: String(c.every || '60'), keep: Number(c.keep || 48), lastTime: String(c.lastTime || ''), lastStatus: String(c.lastStatus || ''), lastVer: String(c.lastVer || '') };
}

function saveBackupConfig(cfg, pin) {
  requireAdmin_(pin);
  cfg = cfg || {};
  var old = getBackupConfig_();
  var folderId = extractDriveId_(cfg.folderId);
  var every = String(cfg.every || '60');
  if (['1', '5', '10', '15', '30', '60', '360', '1440'].indexOf(every) === -1) every = '60';
  var keep = Math.max(1, Math.min(500, Number(cfg.keep || 48)));
  if (cfg.enabled) {
    if (!folderId) throw new Error('Drive folder link দিন।');
    try { DriveApp.getFolderById(folderId).getName(); } catch (e) { throw new Error('ফোল্ডার খোলা যাচ্ছে না। লিংক ও এক্সেস চেক করুন।'); }
  }
  var out = { enabled: !!cfg.enabled, folderId: folderId, every: every, keep: keep, lastTime: old.lastTime, lastStatus: old.lastStatus, lastVer: '' };
  setJson_('BACKUP_CONFIG', out);
  logHistory_('Settings', 'Auto Backup', 'Update', { enabled: old.enabled, every: old.every, folder: old.folderId, keep: old.keep }, { enabled: out.enabled, every: out.every, folder: out.folderId, keep: out.keep }, 'Admin');
  applyBackupTrigger_(out);
  return { ok: true };
}

function applyBackupTrigger_(c) {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'autoBackupRun') ScriptApp.deleteTrigger(t); });
  if (!c.enabled) return;
  var n = Number(c.every), b = ScriptApp.newTrigger('autoBackupRun').timeBased();
  if (n <= 30) b.everyMinutes(n === 1 ? 1 : n === 5 ? 5 : n === 10 ? 10 : n === 15 ? 15 : 30);
  else if (n < 1440) b.everyHours(n / 60);
  else b.everyDays(1);
  b.create();
}

function buildBackupJson_(scope, value) {
  var headers = getOrderHeaders_(), orders = [];
  orderSheets_().forEach(function (sh) {
    if (sh.getLastRow() < 2) return;
    sh.getRange(2, 1, sh.getLastRow() - 1, headers.length).getValues().forEach(function (r) {
      var no = String(r[1] || '').trim();
      if (!no) return;
      if (scope === 'month' && no.indexOf(String(value) + '-') !== 0) return;
      if (scope === 'year' && no.slice(0, 4) !== String(value)) return;
      orders.push(r.map(cellOut_));
    });
  });
  var out = { app: 'SCS Chemical Order', version: 2, created: nowStr_(), scope: scope, value: String(value || ''), headers: headers, orders: orders };
  if (scope === 'all') {
    var l = loadLists_();
    out.products = l.products; out.sellers = l.sellers; out.history = getHistory(100000).items;
    var sms = getSmsConfig_(); sms.apiKey = '';
    out.settings = { sms: sms, sync: getSyncConfig_(), pdf: getJson_('PDF_OVERRIDE', {}) };
  }
  return JSON.stringify(out);
}

function doBackupToDrive_(force) {
  var c = getBackupConfig_();
  if (!c.enabled && !force) return { ok: false, error: 'off' };
  if (!c.folderId) return { ok: false, error: 'No folder' };
  var ver = dataVersion_();
  if (!force && c.lastVer === ver) return { ok: true, skipped: true };
  var folder = DriveApp.getFolderById(c.folderId);
  var name = 'SCS-Backup-' + Utilities.formatDate(new Date(), APP_CONFIG.TIMEZONE, 'yyyyMMdd-HHmmss') + '.json';
  folder.createFile(name, buildBackupJson_('all', ''), 'application/json');
  // পুরোনো ব্যাকআপ মুছে শুধু শেষ N টি রাখা
  var files = [], it = folder.getFiles();
  while (it.hasNext()) { var f = it.next(); if (f.getName().indexOf('SCS-Backup-') === 0) files.push(f); }
  if (files.length > c.keep) {
    files.sort(function (a, b) { return a.getDateCreated() - b.getDateCreated(); });
    for (var i = 0; i < files.length - c.keep; i++) files[i].setTrashed(true);
  }
  var cur = getJson_('BACKUP_CONFIG', {});
  cur.lastTime = nowStr_(); cur.lastStatus = 'OK ' + name; cur.lastVer = ver;
  setJson_('BACKUP_CONFIG', cur);
  return { ok: true, name: name };
}

/** টাইম-ট্রিগার থেকে চলে */
function autoBackupRun() {
  var lock = LockService.getScriptLock();
  try { lock.waitLock(20000); } catch (e) { return; }
  try { doBackupToDrive_(false); }
  catch (err) { var cur = getJson_('BACKUP_CONFIG', {}); cur.lastTime = nowStr_(); cur.lastStatus = 'ERROR ' + String(err).slice(0, 150); setJson_('BACKUP_CONFIG', cur); }
  finally { lock.releaseLock(); }
}

function runBackupNow(pin) {
  requireAdmin_(pin);
  var r = doBackupToDrive_(true);
  if (!r.ok) throw new Error(r.error || 'Backup failed');
  return r;
}


/** সব মাসের (লাইফটাইম) অর্ডারে সার্চ: অর্ডার নম্বর, নাম, মোবাইল, ঠিকানা, প্রোডাক্ট, সেলার */
function searchOrdersAll(q) {
  q = String(q || '').toLowerCase().trim();
  var headers = getOrderHeaders_(), rows = [], sheets = {}, count = 0;
  if (q.length < 2) return { ok: true, headers: headers, rows: rows, sheets: sheets, sheetName: '', edited: {} };
  orderSheets_().forEach(function (sh) {
    if (sh.getLastRow() < 2) return;
    var vals = sh.getRange(2, 1, sh.getLastRow() - 1, headers.length).getValues(), groups = {}, order = [];
    vals.forEach(function (r) {
      var no = String(r[1] || '').trim(); if (!no) return;
      if (!groups[no]) { groups[no] = []; order.push(no); }
      groups[no].push(r);
    });
    order.forEach(function (no) {
      if (count >= 150) return;
      var g = groups[no], f = g[0];
      var hay = (no + ' ' + f[3] + ' ' + f[4] + ' ' + f[5] + ' ' + f[16] + ' ' + f[19] + ' ' + g.map(function (r) { return r[6]; }).join(' ')).toLowerCase();
      if (hay.indexOf(q) === -1) return;
      count++; sheets[no] = sh.getName();
      g.forEach(function (r) {
        rows.push(r.map(function (c) {
          if (c instanceof Date) return Utilities.formatDate(c, APP_CONFIG.TIMEZONE, 'yyyy-MM-dd HH:mm:ss');
          if (typeof c === 'string') return c.replace(/^'/, '');
          return c === null || c === undefined ? '' : c;
        }));
      });
    });
  });
  return { ok: true, headers: headers, rows: rows, sheets: sheets, sheetName: '', edited: editedMap_(), count: count };
}

/* ---------------------------------------------------------------------
 *  BACKUP / RESTORE / RESET (JSON)
 * ------------------------------------------------------------------- */
function cellOut_(c) {
  if (c instanceof Date) return Utilities.formatDate(c, APP_CONFIG.TIMEZONE, 'yyyy-MM-dd HH:mm:ss');
  return (c === null || c === undefined) ? '' : c;
}

function orderSheets_() { return getHome_().getSheets().filter(function (s) { return !isDbSheet_(s.getName()); }); }

/** scope: 'all' | 'year' (value=2026) | 'month' (value=202611) */
function getBackup(scope, value, pin) {
  requireAdmin_(pin);
  return buildBackupJson_(scope, value);
}

function wipeData_() {
  var ss = getHome_();
  ss.getSheets().forEach(function (sh) {
    var n = sh.getName();
    if (n === APP_CONFIG.PRODUCT_SHEET) return;
    if (n === APP_CONFIG.ORDER_SHEET || n === DB.PRODUCTS || n === DB.SELLERS || n === DB.HISTORY) {
      if (sh.getLastRow() > 1) sh.deleteRows(2, sh.getLastRow() - 1);
    } else if (!isDbSheet_(n)) {
      ss.deleteSheet(sh);
    }
  });
  CacheService.getScriptCache().remove('BOOT_LISTS');
  bumpVer_();
}

function resetApp(pin) {
  requireAdmin_(pin);
  withLock_(function () { wipeData_(); }, 60000);
  logHistory_('System', 'App', 'Reset', null, { note: 'All data erased' }, 'Admin');
  return { ok: true };
}

function restoreBackup(jsonText, replace, pin) {
  requireAdmin_(pin);
  var d;
  try { d = JSON.parse(jsonText); } catch (e) { throw new Error('Invalid JSON file'); }
  if (!d || d.app !== 'SCS Chemical Order' || !Array.isArray(d.orders)) throw new Error('This is not an SCS backup file');
  return withLock_(function () {
    if (replace) wipeData_();
    var sh = getOrCreateOrderSheet_(), headers = getOrderHeaders_(), width = headers.length;
    ensureOrderHeader_(sh);
    var existing = {}, ex = 0;
    orderSheets_().forEach(function (s) { if (s.getLastRow() > 1) s.getRange(2, 2, s.getLastRow() - 1, 1).getValues().forEach(function (r) { existing[String(r[0]).trim()] = 1; }); });
    var rows = [];
    d.orders.forEach(function (r) {
      var no = String(r[1] || '').trim();
      if (!no || existing[no]) { if (no) ex++; return; }
      var row = r.slice(0, width); while (row.length < width) row.push('');
      rows.push(row);
    });
    if (rows.length) {
      var start = sh.getLastRow() + 1;
      sh.getRange(start, 5, rows.length, 1).setNumberFormat('@');
      sh.getRange(start, 1, rows.length, width).setValues(rows);
    }
    var addedP = 0, addedS = 0, now = nowStr_();
    if (Array.isArray(d.products)) {
      var ps = dbSheet_(DB.PRODUCTS), have = {};
      if (ps.getLastRow() > 1) ps.getRange(2, 2, ps.getLastRow() - 1, 2).getValues().forEach(function (r) { have[(String(r[0]) + '|' + String(r[1])).toLowerCase()] = 1; });
      var np = [];
      d.products.forEach(function (p) {
        var k = (String(p.productName) + '|' + String(p.unit || '')).toLowerCase();
        if (!p.productName || have[k]) return; have[k] = 1;
        np.push([p.id || newId_(), p.productName, p.unit || '', (p.packSizes || []).join('|'), now, now]);
      });
      if (np.length) ps.getRange(ps.getLastRow() + 1, 1, np.length, 6).setValues(np);
      addedP = np.length;
    }
    if (Array.isArray(d.sellers)) {
      var ss2 = dbSheet_(DB.SELLERS), haveS = {};
      if (ss2.getLastRow() > 1) ss2.getRange(2, 2, ss2.getLastRow() - 1, 1).getValues().forEach(function (r) { haveS[String(r[0]).toLowerCase()] = 1; });
      var ns = [];
      d.sellers.forEach(function (x) { if (!x.name || haveS[String(x.name).toLowerCase()]) return; haveS[String(x.name).toLowerCase()] = 1; ns.push([x.id || newId_(), x.name, now, now]); });
      if (ns.length) ss2.getRange(ss2.getLastRow() + 1, 1, ns.length, 4).setValues(ns);
      addedS = ns.length;
    }
    if (replace && Array.isArray(d.history) && d.history.length) {
      var hs = dbSheet_(DB.HISTORY);
      var hr = d.history.slice().reverse().map(function (h) { return [h.id || newId_(), h.time, h.entity, "'" + h.ref, h.action, JSON.stringify(h.before), JSON.stringify(h.after), h.by]; });
      hs.getRange(hs.getLastRow() + 1, 1, hr.length, 8).setValues(hr);
    }
    if (replace && d.settings) {
      var oldSms = getSmsConfig_();
      if (d.settings.sms) setJson_('SMS_CONFIG', Object.assign({}, d.settings.sms, { apiKey: oldSms.apiKey }));
      if (d.settings.sync) setJson_('SYNC_CONFIG', d.settings.sync);
      if (d.settings.pdf) setJson_('PDF_OVERRIDE', d.settings.pdf);
    }
    CacheService.getScriptCache().remove('BOOT_LISTS');
    bumpVer_();
    logHistory_('System', 'App', 'Restore', null, { orders: rows.length, skipped: ex, products: addedP, sellers: addedS, replace: !!replace }, 'Admin');
    return { ok: true, orders: rows.length, skipped: ex, products: addedP, sellers: addedS };
  }, 120000);
}

/* ---------------------------------------------------------------------
 *  PDF: BILL & CHALLAN
 * ------------------------------------------------------------------- */
function generateInstantHtmlContent(orderNo, letterhead, paper) {
  try {
    var res = getOrderByNo(orderNo);
    if (!res || !res.ok) throw new Error('Order not found in spreadsheet.');
    var od = buildOrderDataFromOrderObj_(res, true);
    if (!od.ok) throw new Error(od.error || 'Could not build order data.');
    var gopts = { print: true, letterhead: letterhead || '', paper: paper };
    var gHtml = buildBillChallanBundleHtml_(od.orderData, gopts);
    var PGs = pageCfg_(gopts.paper);
    return { ok: true, html: gHtml, orderNo: od.orderData.orderNo, w: PGs.PAGE_WIDTH_MM, h: PGs.PAGE_HEIGHT_MM };
  } catch (error) {
    return { ok: false, error: error.toString() };
  }
}

function generateAndUploadAllOrderPdfs() {
  var all = getAllOrderNos_();
  if (!all.length) return { ok: false, error: 'No orders found' };
  var created = 0, failed = [];
  all.forEach(function (orderNo) {
    var res = generateAndUploadBillChallanByOrderNo(orderNo);
    if (res && res.ok) created++; else failed.push({ orderNo: orderNo, error: res && res.error ? res.error : 'Unknown error' });
  });
  var syncRes = syncOrderStatusAll_();
  return { ok: true, total: all.length, created: created, failed: failed.length ? failed : undefined, message: 'Uploaded ' + created + ' of ' + all.length + ' PDF(s)' + (failed.length ? ' (' + failed.length + ' failed)' : '') };
}

function syncOrderStatusAll_() {
  try { var c = getSyncConfig_(); if (c.enabled && c.sheetUrl) return syncAllToDestination_(true); } catch (e) {}
  return null;
}

function generateAndUploadBillChallanByOrderNo(orderNo) {
  var prepared = buildOrderDataFromSheet_(orderNo, true);
  if (!prepared.ok) return prepared;
  return generateAndUploadFromOrderData_(prepared.orderData);
}

function generateAndUploadFromOrderData_(orderData) {
  if (!orderData || !orderData.orderNo) return { ok: false, error: 'Invalid order data' };
  var html = buildBillChallanBundleHtml_(orderData);
  var fileName = 'Bill & challan ' + orderData.orderNo + '.pdf';
  var blob = Utilities.newBlob(html, 'text/html', 'bill-challan.html').getAs('application/pdf').setName(fileName);
  var folder = DriveApp.getFolderById(getPdfCfg_().BILL_CHALLAN_FOLDER_ID);
  var file = upsertPdfFile_(folder, fileName, blob);
  updatePdfStatusForOrder_(orderData.orderNo, true);
  return { ok: true, fileId: file.getId(), url: file.getUrl(), name: file.getName() };
}

function upsertPdfFile_(folder, fileName, blob) {
  var files = folder.getFilesByName(fileName);
  while (files.hasNext()) files.next().setTrashed(true);
  return folder.createFile(blob);
}

function updatePdfStatusForOrder_(orderNo, uploaded) {
  var sh = getHome_().getSheetByName(APP_CONFIG.ORDER_SHEET);
  if (!sh) return;
  var vals = sh.getDataRange().getValues();
  if (vals.length <= 1) return;
  var status = uploaded ? 'Pdf Uploaded' : 'Not Uploaded';
  for (var i = 1; i < vals.length; i++) {
    if (String(vals[i][1] || '').trim() === String(orderNo || '').trim()) sh.getRange(i + 1, COL.PDF_STATUS).setValue(status);
  }
}

function getAllOrderNos_() {
  var sh = getHome_().getSheetByName(APP_CONFIG.ORDER_SHEET);
  if (!sh) return [];
  var set = new Set();
  sh.getDataRange().getValues().slice(1).forEach(function (r) {
    var o = String(r[1] || '').trim();
    if (o) set.add(o);
  });
  return Array.from(set);
}

function buildOrderDataFromSheet_(orderNo, includeTransport) {
  var sh = getHome_().getSheetByName(APP_CONFIG.ORDER_SHEET);
  if (!sh) return { ok: false, error: 'SCS Order sheet not found' };
  var vals = sh.getDataRange().getValues();
  if (vals.length <= 1) return { ok: false, error: 'No order rows' };
  var target = String(orderNo || '').trim();
  var rows = vals.slice(1).filter(function (r) { return String(r[1] || '').trim() === target; });
  if (!rows.length) return { ok: false, error: 'Order not found' };

  var first = rows[0];
  var items = rows.map(function (r, idx) {
    var qty = Number(r[7] || 0), up = Number(r[10] || 0), dup = Number(r[11] || 0);
    return { sl: idx + 1, productName: r[6] || '', quantity: qty, unit: r[8] || '', packSize: String(r[9] || ''), unitPrice: up, discountUnitPrice: dup, total: qty * up, special: qty * dup };
  });
  var transport = Number(first[14] || 0);
  var grossTotal = items.reduce(function (s, it) { return s + it.total; }, 0);
  var specialGross = items.reduce(function (s, it) { return s + it.special; }, 0);
  var netPay = specialGross + transport;

  var deliveryRaw = String(first[2] || '');
  var deliveryDate = first[2] instanceof Date ? first[2] : (deliveryRaw ? new Date(deliveryRaw) : null);
  var dateText = deliveryDate && !isNaN(deliveryDate.getTime()) ? Utilities.formatDate(deliveryDate, APP_CONFIG.TIMEZONE, 'd MMM yyyy') : '';

  return {
    ok: true,
    orderData: {
      orderNo: first[1] || '', orderBy: String(first[16] || ''), dateText: dateText, clientName: first[3] || '',
      mobile: String(first[4] || '').replace(/^'/, ''), address: first[5] || '', items: items,
      grossTotal: grossTotal, specialGross: specialGross, discountAmount: Math.max(0, grossTotal - specialGross),
      transport: transport, netPay: netPay, inWords: numberToTakaWords_(netPay),
    },
  };
}

function buildOrderDataFromOrderObj_(res, includeTransport) {
  var items = (res.items || []).map(function (it, idx) {
    var qty = Number(it.quantity || 0), up = Number(it.unitPrice || 0), dup = Number(it.discountUnitPrice || 0);
    return { sl: idx + 1, productName: it.productName || '', quantity: qty, unit: it.unit || '', packSize: String(it.packSize || ''), unitPrice: up, discountUnitPrice: dup, total: qty * up, special: qty * dup };
  });
  var transport = Number(res.transportFee || 0);
  var grossTotal = items.reduce(function (s, it) { return s + it.total; }, 0);
  var specialGross = items.reduce(function (s, it) { return s + it.special; }, 0);
  var netPay = specialGross + transport;
  var dateText = '';
  if (res.deliveryDate) {
    var dd = new Date(res.deliveryTime ? res.deliveryDate + ' ' + res.deliveryTime : res.deliveryDate);
    if (!isNaN(dd.getTime())) dateText = Utilities.formatDate(dd, APP_CONFIG.TIMEZONE, 'd MMM yyyy');
  }
  return {
    ok: true,
    orderData: {
      orderNo: res.orderNo || '', orderBy: String(res.orderBy || ''), dateText: dateText, clientName: res.clientName || '',
      mobile: String(res.mobile || '').replace(/^'/, ''), sideName: res.address || '', items: items,
      grossTotal: grossTotal, specialGross: specialGross, discountAmount: Math.max(0, grossTotal - specialGross),
      transport: transport, netPay: netPay, inWords: numberToTakaWords_(netPay),
    },
  };
}

function buildBillChallanBundleHtml_(o, opts) {
  opts = opts || {};
  var kind = opts.letterhead === true ? 'letter' : (opts.letterhead === 'a4' || opts.letterhead === 'letter' ? opts.letterhead : '');
  opts.paper = kind || (opts.paper === 'a4' ? 'a4' : 'letter');
  if (kind && !opts.lhUri) opts.lhUri = getLetterheadDataUri_(kind);
  if (opts.print && opts.sealUri === undefined) opts.sealUri = getSealDataUri_();
  var PG = pageCfg_(opts.paper);
  var bill = buildCopyHtml_(o, 'BILL', opts);
  var challan = buildCopyHtml_(o, 'CHALLAN', opts);
  var title = 'Bill & challan ' + esc_(o.orderNo || '');
  if (opts.print) {
    // সব ডিভাইসে একই লেআউট: নির্বাচিত কাগজের সাইজ, মার্জিন ০ (মার্জিন ভেতরের কনটেন্টে দেওয়া আছে)
    var w = PG.PAGE_WIDTH_MM + 'mm', h = PG.PAGE_HEIGHT_MM + 'mm';
    var css = '<style>@page{size:' + w + ' ' + h + ';margin:0}html,body{margin:0;padding:0;background:#fff}.pg{width:' + w + ';height:' + h + ';overflow:hidden;break-after:page;page-break-after:always}.pg:last-child{break-after:auto;page-break-after:auto}</style>';
    return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=' + w + '"><title>' + title + '</title>' + css + '</head><body><div class="pg">' + bill + '</div><div class="pg">' + challan + '</div></body></html>';
  }
  return '<!doctype html><html><head><meta charset="utf-8"><title>' + title + '</title></head><body style="margin:0;padding:0;">' +
    bill + '<div style="page-break-after:always;"></div>' + challan + '</body></html>';
}

function buildCopyHtml_(o, copyTitle, opts) {
  opts = opts || {};
  var P = pageCfg_(opts.paper);
  var safe = o || {};
  var items = Array.isArray(safe.items) ? safe.items : [];
  var isBill = copyTitle === 'BILL';
  var sealUrl = opts.sealUri || (P.SEAL_IMAGE_FILE_ID ? ('https://drive.google.com/thumbnail?id=' + P.SEAL_IMAGE_FILE_ID + '&sz=w400') : '');

  var challanRemark = function (it) {
    var pack = extractPackSizeNumber_(it.packSize), qty = Number(it.quantity || 0);
    if (!pack || !qty) return '';
    var count = qty / pack;
    return pack + '×' + (Number.isInteger(count) ? String(count) : String(Math.round(count * 100) / 100));
  };

  var rowCount = Math.max(1, items.length);
  // প্রোডাক্টের নাম বড় হলে লাইন ভেঙে নিচে নামবে; সব কলামে একই উচ্চতা বসে (সারি মিলে থাকে)
  var hts = items.map(function (it) { return itemHeightMm_(it.productName, P.COL_DESC_MM); });
  var cellLine = function (cls, i, inner, extra) { return '<div class="item-line ' + cls + '" style="height:' + hts[i] + 'mm;line-height:' + hts[i] + 'mm;' + (extra || '') + '">' + inner + '</div>'; };
  var slLines = items.map(function (_, i) { return cellLine('c', i, String(i + 1)); }).join('');
  var descLines = items.map(function (it, i) {
    var n = Math.round((hts[i] - 2.4) / 4.9), multi = hts[i] > 7.5, pad = multi ? Math.max(0, (hts[i] - n * 4.9) / 2) : 0;
    return '<div class="item-line l" style="height:' + hts[i] + 'mm;min-height:' + hts[i] + 'mm;line-height:' + (multi ? '4.9mm' : hts[i] + 'mm') + ';padding-top:' + pad + 'mm;white-space:normal;word-wrap:break-word;word-break:break-word;overflow:hidden;">' + esc_(it.productName || '') + '</div>';
  }).join('');
  var unitLines = items.map(function (it, i) { return cellLine('c', i, esc_(it.unit || '')); }).join('');
  var qtyLines = items.map(function (it, i) { return cellLine('c', i, num_(it.quantity || 0)); }).join('');
  var upLines = items.map(function (it, i) { return cellLine('c', i, num_(it.unitPrice || 0)); }).join('');
  var totalLines = items.map(function (it, i) { return cellLine('c', i, num_(it.total || 0)); }).join('');
  var remarkLines = items.map(function (it, i) { return cellLine('c', i, esc_(challanRemark(it))); }).join('');

  var transportAmount = Number(safe.transport || 0), discountAmount = Number(safe.discountAmount || 0);
  var eD = [], eU = [], eQ = [], eP = [], eT = [];
  var addExtra = function (label, amt) {
    eD.push('<div class="item-line l" style="font-weight:700;">' + label + '</div>');
    eU.push('<div class="item-line c">-</div>'); eQ.push('<div class="item-line c">-</div>'); eP.push('<div class="item-line c">-</div>');
    eT.push('<div class="item-line c" style="font-weight:700;">' + num_(amt) + '</div>');
  };
  if (isBill && discountAmount > 0) addExtra('Special Discount', discountAmount);
  if (isBill && transportAmount > 0) addExtra('Transport Fee', transportAmount);

  var fD = descLines + eD.join(''), fU = unitLines + eU.join(''), fQ = qtyLines + eQ.join(''), fP = upLines + eP.join(''), fT = totalLines + eT.join('');
  var bodyH = Math.round((106 + (P.PAGE_HEIGHT_MM - P.TOP_PAD_MARGIN_MM - P.BOTTOM_PAD_MARGIN_MM - 225.85)) * 10) / 10, billH = bodyH;
  var chH = bodyH;
  var styles = getPdfStylesCss_(P);
  var th = function (w, t) { return '<th style="width:' + w + 'mm">' + t + '</th>'; };
  var td = function (h, c) { return '<td style="height:' + h + 'mm"><div class="item-lines">' + c + '</div></td>'; };

  var lhImg = opts.lhUri ? '<img src="' + opts.lhUri + '" style="position:absolute;left:0;top:0;width:100%;height:100%;z-index:0">' : '';
  var orderByHtml = safe.orderBy ? '<div style="margin-top:2.5mm;font-size:3.8mm;text-align:left;font-weight:700">Order by : <span style="font-weight:400">' + esc_(safe.orderBy) + '</span></div>' : '';
  return '<div class="page">' + lhImg +
    '<style>' + styles + '</style>' +
    '<div class="content">' +
      '<div class="title-row"><div class="title-box">' + copyTitle + '</div><div class="sl-no">SL No : ' + esc_(safe.orderNo || '') + '</div></div>' +
      '<div class="info">' +
        '<div class="info-left">' +
          '<div><span class="label">Delivered To :</span> ' + esc_(safe.clientName || '') + '</div>' +
          '<div><span class="label">Mobile Number :</span> ' + esc_(safe.mobile || '') + '</div>' +
          '<div><span class="label">Name of the Side:</span> ' + esc_(safe.sideName || safe.address || '') + '</div>' +
        '</div>' +
        '<div class="info-right"><table class="info-right-table">' +
          '<tr><td class="k">Bill No</td><td class="colon">:</td><td class="v">01</td><td class="k k-date">Date</td><td class="colon">:</td><td class="v date">' + esc_(safe.dateText || '') + '</td></tr>' +
          '<tr><td class="k">Challan No</td><td class="colon">:</td><td class="v">01</td><td class="k k-date">Date</td><td class="colon">:</td><td class="v"></td></tr>' +
          '<tr><td class="k">P.O. No</td><td class="colon">:</td><td class="v"></td><td class="k k-date">Date</td><td class="colon">:</td><td class="v"></td></tr>' +
        '</table></div>' +
      '</div>' +
      (isBill
        ? '<table class="main-table"><thead><tr>' + th(P.COL_SL_MM, 'SL No') + th(P.COL_DESC_MM, 'DESCRIPTION OF ITEAM') + th(P.COL_UNIT_MM, 'UNIT') + th(P.COL_QTY_MM, 'QUANTITY') + th(P.COL_UNIT_PRICE_MM, 'UNIT PRICE') + th(P.COL_TOTAL_MM, 'TOTAL AMOUNT') + '</tr></thead><tbody>' +
          '<tr class="body-block-row">' + td(billH, slLines) + td(billH, fD) + td(billH, fU) + td(billH, fQ) + td(billH, fP) + td(billH, fT) + '</tr>' +
          '<tr><td colspan="5" style="font-weight:700;"><b>Taka (In Word) :</b> ' + esc_(safe.inWords || '') + '</td><td style="text-align:center;font-weight:700;"><b>' + num_(safe.netPay || 0) + '</b></td></tr>' +
          '</tbody></table>'
        : '<table class="main-table"><thead><tr>' + th(P.COL_SL_MM, 'SL No') + th(P.COL_DESC_MM, 'DESCRIPTION OF ITEAM') + th(P.COL_UNIT_MM, 'UNIT') + th(P.COL_QTY_MM, 'QUANTITY') + th(P.COL_UNIT_PRICE_MM + P.COL_TOTAL_MM, 'REMARK') + '</tr></thead><tbody>' +
          '<tr class="body-block-row">' + td(chH, slLines) + td(chH, descLines) + td(chH, unitLines) + td(chH, qtyLines) + td(chH, remarkLines) + '</tr></tbody></table>') +
      orderByHtml + '<div class="sign-row"><div class="sign-line">Received by :</div><div class="sign-line">For: SWARUP CONSTRUCTION SOLUTION</div></div>' +
    '</div>' +
    (sealUrl ? '<div style="position:absolute;right:' + (P.SEAL_RIGHT_MM + P.SIDE_MARGIN_MM) + 'mm;bottom:' + (P.BOTTOM_PAD_MARGIN_MM + P.SEAL_BOTTOM_MM) + 'mm;width:' + P.SEAL_WIDTH_MM + 'mm;height:' + P.SEAL_HEIGHT_MM + 'mm;text-align:center;line-height:' + P.SEAL_HEIGHT_MM + 'mm;z-index:1;overflow:hidden"><img src="' + sealUrl + '" style="max-width:' + P.SEAL_WIDTH_MM + 'mm;max-height:' + P.SEAL_HEIGHT_MM + 'mm;vertical-align:middle;opacity:' + P.SEAL_OPACITY + '"></div>' : '') +
  '</div>';
}

/** PdfStyles.html এর হুবহু কনটেন্ট (আলাদা ফাইল এখন লাগে না) */
function getPdfStylesCss_(P) {
  P = P || getPdfCfg_();
  var template = PDF_STYLES_TEMPLATE_;
  return template
    .replace(/__PAGE_WIDTH_MM__/g, String(P.PAGE_WIDTH_MM))
    .replace(/__PAGE_HEIGHT_MM__/g, String(P.PAGE_HEIGHT_MM))
    .replace(/__SIDE_MARGIN_MM__/g, String(P.SIDE_MARGIN_MM))
    .replace(/__TOP_PAD_MARGIN_MM__/g, String(P.TOP_PAD_MARGIN_MM))
    .replace(/__BOTTOM_PAD_MARGIN_MM__/g, String(P.BOTTOM_PAD_MARGIN_MM))
    .replace(/__TITLE_TOP_GAP_MM__/g, String(P.TITLE_TOP_GAP_MM))
    .replace(/__TITLE_WIDTH_MM__/g, String(P.TITLE_WIDTH_MM))
    .replace(/__TITLE_HEIGHT_MM__/g, String(P.TITLE_HEIGHT_MM))
    .replace(/__INFO_HEIGHT_MM__/g, String(P.INFO_HEIGHT_MM))
    .replace(/__SEAL_RIGHT_MM__/g, String(P.SEAL_RIGHT_MM))
    .replace(/__SEAL_BOTTOM_MM__/g, String(P.SEAL_BOTTOM_MM))
    .replace(/__SEAL_WIDTH_MM__/g, String(P.SEAL_WIDTH_MM))
    .replace(/__SEAL_OPACITY__/g, String(P.SEAL_OPACITY))
    .replace(/__SIGN_BOTTOM_MM__/g, String(P.SIGN_BOTTOM_MM));
}

const PDF_STYLES_TEMPLATE_ = `<style>
@page {
  size: __PAGE_WIDTH_MM__mm __PAGE_HEIGHT_MM__mm;
  margin: 0;
}
* {
  box-sizing: border-box;
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
}
.page {
  position: relative;
  width: __PAGE_WIDTH_MM__mm;
  height: __PAGE_HEIGHT_MM__mm;
  background: transparent;
  font-family: "Times New Roman", serif;
}
.content {
  position: absolute;
  left: __SIDE_MARGIN_MM__mm;
  right: __SIDE_MARGIN_MM__mm;
  top: __TOP_PAD_MARGIN_MM__mm;
  bottom: __BOTTOM_PAD_MARGIN_MM__mm;
}
.title-row {
  position: relative;
  display: block;
  margin-top: __TITLE_TOP_GAP_MM__mm;
  margin-bottom: 2.2mm;
  height: __TITLE_HEIGHT_MM__mm;
}
.title-box {
  width: __TITLE_WIDTH_MM__mm;
  height: __TITLE_HEIGHT_MM__mm;
  border: 1px solid #333;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 5.8mm;
  letter-spacing: 0.1mm;
  margin: 0 auto;
}
.sl-no {
  color: #2f64c7;
  font-size: 3.9mm;
  font-weight: 700;
  white-space: nowrap;
  position: absolute;
  right: 0;
  top: 1.2mm;
}
.info {
  border: 1px solid #333;
  display: grid;
  grid-template-columns: 1fr 1.08fr;
  margin-bottom: 2mm;
}
.info-left,.info-right {
  padding: 1mm 1.6mm;
  font-size: 3.95mm;
  line-height: 1.22;
  min-height: __INFO_HEIGHT_MM__mm;
}
.info-right {
  border-left: 1px solid #333;
  background-color: #acd0e8 !important;
}
.info-right-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  font-size: 3.95mm;
}
.info-right-table td {
  border: 0;
  padding: 0.2mm 0;
  vertical-align: top;
  white-space: nowrap;
}
.info-right-table .k {
  font-weight: 700;
  width: 28%;
}
.info-right-table .k-date {
  width: 18%;
  padding-left: 2.5mm;
}
.info-right-table .colon {
  width: 4%;
  text-align: center;
  font-weight: 700;
}
.info-right-table .v {
  width: 14%;
}
.info-right-table .date {
  width: 32%;
  font-weight: 700;
}
.label {
  font-weight: 700;
  display: inline-block;
  min-width: 29mm;
}
.main-table {
  width: 100%;
  table-layout: fixed;
  border-collapse: collapse;
  font-size: 3.9mm;
}
.main-table th,.main-table td {
  border: 1px solid #333;
  padding: 0.7mm 1mm;
  vertical-align: top;
  overflow: hidden;
  word-wrap: break-word;
}
.main-table thead th {
  text-align: center;
  font-weight: 700;
  font-size: 3.55mm;
  line-height: 1.02;
}
.body-block-row td {
  vertical-align: top;
}
.item-lines {
  position: relative;
  height: 100%;
}
.item-line {
  min-height: 7mm;
  line-height: 7mm;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.item-line.c { text-align: center; }
.item-line.l { text-align: left; }
.item-line.r { text-align: right; }
.special-bottom {
  position: absolute;
  left: 0;
  right: 1.8;
  bottom: 1.8mm;
}
.c { text-align: center; }
.r { text-align: right; }
.l { text-align: left; }
.totals {
  width: 100%;
  border-collapse: collapse;
  font-size: 3.9mm;
}
.totals td {
  border: 1px solid #333;
  padding: 0.8mm 1.2mm;
}
.sign-row {
  position: absolute;
  left: 0;
  right: 0;
  bottom: __SIGN_BOTTOM_MM__mm;
  display: flex;
  justify-content: space-between;
  font-size: 3.4mm;
  z-index: 3;
}
.sign-line {
  border-top: 1px solid #333;
  padding-top: 0.6mm;
  min-width: 34mm;
  text-align: center;
  font-weight: 700;
}
.sign-row .sign-line:last-child {
  min-width: 74mm;
  text-align: center;
}
.seal {
  position: absolute;
  right: __SEAL_RIGHT_MM__mm;
  bottom: __SEAL_BOTTOM_MM__mm;
  width: __SEAL_WIDTH_MM__mm;
  opacity: __SEAL_OPACITY__;
  z-index: 1;
}
</style>`;

/** কাগজের সাইজ অনুযায়ী পেজ ও মার্জিন (A4 প্যাড মেপে: হেডার ~35mm, ফুটার ~19mm) */
const PAPERS = {
  letter: { PAGE_WIDTH_MM: 215.9, PAGE_HEIGHT_MM: 279.4, TOP_PAD_MARGIN_MM: 34.5, BOTTOM_PAD_MARGIN_MM: 19.05 },
  a4: { PAGE_WIDTH_MM: 210, PAGE_HEIGHT_MM: 297, TOP_PAD_MARGIN_MM: 39, BOTTOM_PAD_MARGIN_MM: 19.5 },
};
function pageCfg_(paper) {
  var p = PAPERS[paper === 'a4' ? 'a4' : 'letter'];
  return Object.assign({}, getPdfCfg_(), p);
}

/** নামটা কলামের চওড়ায় কত লাইনে ভাঙবে তার সতর্ক (একটু বেশি) আন্দাজ */
function estimateLines_(text, widthMm) {
  var avail = widthMm - 2.4;
  var cw = function (ch) {
    if (ch === ' ') return 1.0;
    if (/[A-Z0-9%&@#]/.test(ch)) return 2.1;
    if (/[iljtf.,'\-:;()|!\/]/.test(ch)) return 0.95;
    return 1.65;
  };
  var ww = function (w) { var x = 0; for (var i = 0; i < w.length; i++) x += cw(w.charAt(i)); return x * 1.05; };
  var words = String(text || '').split(/\s+/).filter(Boolean);
  if (!words.length) return 1;
  var lines = 1, cur = 0, sp = 1.0 * 1.05;
  words.forEach(function (w) {
    var wl = ww(w);
    if (wl > avail) {
      if (cur) lines++;
      var parts = Math.ceil(wl / avail);
      lines += parts - 1; cur = wl - (parts - 1) * avail;
    } else if (!cur) { cur = wl; }
    else if (cur + sp + wl <= avail) { cur += sp + wl; }
    else { lines++; cur = wl; }
  });
  return lines;
}

function itemHeightMm_(text, widthMm) {
  var n = estimateLines_(text, widthMm);
  return n <= 1 ? 7 : Math.round((n * 4.9 + 2.4) * 10) / 10;
}

function extractPackSizeNumber_(packText) {
  var raw = String(packText || '').trim();
  if (!raw) return 0;
  var m = raw.match(/\d+(\.\d+)?/);
  return m ? Number(m[0]) : 0;
}

function num_(n) {
  var v = Number(n || 0);
  if (isNaN(v)) return '0';
  return String(Math.round(v * 100) / 100).replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1');
}

function esc_(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function numberToTakaWords_(amount) {
  var n = Math.round(Number(amount || 0));
  if (!n || n < 0) return '';
  var ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
  var teens = ['ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  var tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
  function two(x) {
    if (x < 10) return ones[x];
    if (x < 20) return teens[x - 10];
    var t = Math.floor(x / 10), o = x % 10;
    return tens[t] + (o ? ' ' + ones[o] : '');
  }
  function three(x) {
    var h = Math.floor(x / 100), r = x % 100;
    var left = h ? ones[h] + ' hundred' : '', right = r ? two(r) : '';
    return (left && right) ? left + ' ' + right : (left || right);
  }
  var num = n;
  var crore = Math.floor(num / 10000000); num %= 10000000;
  var lakh = Math.floor(num / 100000); num %= 100000;
  var thousand = Math.floor(num / 1000); num %= 1000;
  var parts = [];
  if (crore) parts.push(three(crore) + ' crore');
  if (lakh) parts.push(three(lakh) + ' lakh');
  if (thousand) parts.push(three(thousand) + ' thousand');
  if (num) parts.push(three(num));
  var text = parts.join(' ').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1) + ' taka only';
}
