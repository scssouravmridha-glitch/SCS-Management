/**
 * =====================================================================
 *  SCS Quotation Generator - Backend (Google Apps Script)
 *  Swarup Construction Solution
 * =====================================================================
 *  Files in this Apps Script project:
 *    1) Code.gs    - this file
 *    2) Index.html - the web app UI
 *    3) Pad.html   - your letterhead file (Pad_A4_html.html content, unchanged).
 *                    File > New > HTML file > name it exactly "Pad" and paste the
 *                    content of Pad_A4_html.html (it is just one <img src='data:image...'/> tag).
 *
 *  Database = Google Sheet (auto-created tabs):
 *    Q_Index    -> one row per quotation (searchable list)
 *    Q_Data     -> full quotation layout JSON (chunked, cell limit safe)
 *    Q_Settings -> app configuration + PIN hashes
 *    Q_Log      -> audit log (create / edit-locked / delete / upload)
 *
 *  Deploy: open the script from inside the Google Sheet (Extensions > Apps Script),
 *  paste the files, then Deploy > New deployment > Web app
 *  (Execute as: Me, Who has access: anyone with the link / your organisation).
 *  If the script is standalone (not bound to a Sheet) a database Sheet
 *  "SCS Quotation DB" is created automatically in your Drive.
 *
 *  Default PINs (change them in Admin Panel): User 2019, Admin 20192026
 *  Quotation No format: SCSQ + YYYY + MM + '-' + SL (SCSQ202610-01, -02 ... -101). SL is continuous (never resets).
 * =====================================================================
 */

var Q = {
  SH_INDEX: 'Q_Index',
  SH_DATA: 'Q_Data',
  SH_SET: 'Q_Settings',
  SH_LOG: 'Q_Log',
  CHUNK: 45000,
  DEF_USER: '2019',
  DEF_ADMIN: '20192026',
  INDEX_HEAD: ['ID', 'QuoteNo', 'Year', 'Seq', 'Date', 'Company', 'Contact', 'Project', 'Total', 'Status', 'Pages', 'CreatedAt', 'UpdatedAt', 'DriveUrl', 'CreatedBy', 'Subject', 'Attn', 'Terms', 'Body', 'Mark', 'MarkAt', 'SeenAt'],
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
    .setTitle('SCS Quotation')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function onOpen() {
  try {
    SpreadsheetApp.getUi()
      .createMenu('SCS Quotation')
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

function getHome_() {
  var props = PropertiesService.getScriptProperties();
  var active = null;
  try { active = SpreadsheetApp.getActiveSpreadsheet(); } catch (e) { active = null; }
  if (active) {
    if (props.getProperty('DB_SPREADSHEET_ID') !== active.getId()) props.setProperty('DB_SPREADSHEET_ID', active.getId());
    return active;
  }
  var id = props.getProperty('DB_SPREADSHEET_ID');
  if (id) {
    try { return SpreadsheetApp.openById(id); } catch (e) { /* fall through and create */ }
  }
  var created = SpreadsheetApp.create('SCS Quotation DB');
  props.setProperty('DB_SPREADSHEET_ID', created.getId());
  return created;
}

function ensureSheet_(ss, name, headers) {
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, headers.length).setValues([headers])
      .setFontWeight('bold').setBackground('#e5007d').setFontColor('#ffffff');
    sh.setFrozenRows(1);
    try { sh.protect().setWarningOnly(true).setDescription('SCS Quotation database - do not edit directly'); } catch (e) {}
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
    numbering: { prefix: 'SCSQ', pad: 2, useYear: true, startSeq: 1 },
    logo: '', sigGap: 36,
    margins: { top: 1.45, bottom: 0.8, side: 0.55 },
    vatRate: 5,
    numFmt: 'bd',
    dec: 2,
    currency: 'Taka',
    signatories: {
      count: 2,
      list: [
        { title: 'Prepared By', name: 'UJJAL MAJUMDER', designation: 'Senior Manager (Technical Service)', org: 'Swarup Construction Solution', img: '' },
        { title: 'Approved By', name: 'Shamiron Halder', designation: 'General Manager', org: 'Swarup Construction Solution', img: '' },
        { name: '', designation: '', img: '' },
        { name: '', designation: '', img: '' }
      ]
    },
    seals: [],
    terms: [
      'This quotation is valid for 15 (fifteen) days from the date of issue.',
      'Payment terms: 50% advance with the work order, 40% against running bill, 10% after completion of work.',
      'Rates are based on current market prices and may be revised if material costs change significantly.',
      'Work will start within 7 (seven) days after receiving the work order and advance payment.',
      'Any additional work not mentioned in this quotation will be charged separately.'
    ],
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
  if (!/^\d{4,8}$/.test(pin)) return '';
  var s = readSettings_();
  var adminHash = s.admin_pin_hash ? String(s.admin_pin_hash) : sha256Hex_('scsq|' + Q.DEF_ADMIN);
  var userHash = s.user_pin_hash ? String(s.user_pin_hash) : sha256Hex_('scsq|' + Q.DEF_USER);
  var h = sha256Hex_('scsq|' + pin);
  if (h === adminHash) return 'admin';
  if (h === userHash) return 'user';
  return '';
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
  requireAdmin_(adminPin);
  newPin = String(newPin || '');
  if (!/^\d{4,8}$/.test(newPin)) throw new Error('PIN must be 4 to 8 digits.');
  if (kind === 'admin') {
    if (newPin.length < 4) throw new Error('Admin PIN must be 4 to 8 digits.');
    if (pinRole_(newPin) === 'user') throw new Error('Admin PIN cannot be the same as the user PIN.');
    writeSetting_('admin_pin_hash', sha256Hex_('scsq|' + newPin));
    log_('pin-change', '', 'admin', 'Admin PIN changed');
  } else {
    if (pinRole_(newPin) === 'admin') throw new Error('User PIN cannot be the same as the admin PIN.');
    writeSetting_('user_pin_hash', sha256Hex_('scsq|' + newPin));
    log_('pin-change', '', 'admin', 'User PIN changed');
  }
  return true;
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
 *  QUOTATION NUMBER
 * ------------------------------------------------------------------- */
function numberParts_(cfg, year, seq, month) {
  var n = (cfg && cfg.numbering) || {};
  var prefix = String(n.prefix || 'SCSQ').replace(/[^A-Za-z0-9]/g, '') || 'SCSQ';
  if (prefix === 'SCSQT') prefix = 'SCSQ';   // legacy value produced by the old 'SCS/QT' setting
  var s = String(seq);
  while (s.length < 2) s = '0' + s;                       // 01..99, then 100, 101 ...
  var mo = month || (new Date().getMonth() + 1);
  return prefix + year + ('0' + mo).slice(-2) + '-' + s;   // SCSQ202610-01
}

var NO_RE_ = /^[A-Za-z0-9]+?(\d{4})(\d{2})-(\d+)$/;

/** Next serial = smallest unused number (deleted quotations free their number; no gaps, no duplicates). */
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

function peekNextNo() {
  var cfg = readConfig_();
  var year = new Date().getFullYear();
  return numberParts_(cfg, year, nextSeq_(cfg));
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
    mark: String(r[19] || ''), markAt: String(r[20] || ''), seenAt: String(r[21] || '')
  };
}

/**
 * payload = { id, no, doc (JSON string), meta:{company,contact,project,total,dateISO,pages}, status, role, adminPin }
 */
function saveQuotation(payload) {
  payload = payload || {};
  var id = String(payload.id || '').trim();
  if (!id) throw new Error('Missing quotation id');
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
    var seq = 0;

    if (row) {
      var cur = ix.getRange(row, 1, 1, Q.INDEX_HEAD.length).getValues()[0];
      var curStatus = String(cur[9] || 'Draft');
      var baseU = String(payload.base || '');
      if (baseU && !payload.force && String(cur[12]) !== baseU) throw new Error('CONFLICT');
      if (curStatus === 'Final') {
        // Editing a finalized quotation needs the admin PIN
        if (pinRole_(payload.adminPin) !== 'admin') throw new Error('Admin PIN required to edit a finalized quotation.');
        log_('edit-final', cur[1], 'admin', 'Finalized quotation edited');
      }
      no = String(cur[1]); year = cur[2]; seq = cur[3];
      if (!no) {
        // a number requested from the Ref No element (even on an imported file) is kept if it is still free
        var pn = String(payload.no || '').trim(), pm = pn.match(NO_RE_), taken = false;
        if (pm) {
          var lastN = ix.getLastRow();
          if (lastN >= 2) { var nos0 = ix.getRange(2, 2, lastN - 1, 1).getValues(); for (var q = 0; q < nos0.length; q++) if (String(nos0[q][0]) === pn) { taken = true; break; } }
        }
        if (pm && !taken) { no = pn; year = Number(pm[1]); seq = Number(pm[3]); }
        else if (status !== 'Import') {   // an imported file gets its number when it is filed (saved) or when Ref No is used
          year = new Date().getFullYear(); seq = nextSeq_(cfg); no = numberParts_(cfg, year, seq);
        }
      }
    } else if (status === 'Import') {
      no = ''; year = ''; seq = '';      // imported files carry no quotation number
    } else {
      // New quotation: make sure the number is unique, else assign the next one
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
    }

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
      var out = vals.concat([cur2[11], now, cur2[13], cur2[14], String(meta.subject || '').slice(0, 300), dig.attn, dig.terms, dig.body, cur2[19] || '', cur2[20] || '', cur2[21] || '']);
      ix.getRange(row, 1, 1, out.length).setNumberFormat('@').setValues([out]);
      ix.getRange(row, 9).setNumberFormat('0.00').setValue(Number(meta.total) || 0);
    } else {
      var out2 = vals.concat([now, now, '', role, String(meta.subject || '').slice(0, 300), dig.attn, dig.terms, dig.body, mark0, mark0 ? now : '', '']);
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
  var vals = ix.getRange(2, 1, last - 1, 18).getValues(), mk = ix.getRange(2, 20, last - 1, 3).getValues();
  var out = [];
  vals.forEach(function (r, i) { if (r[0] === '') return; r[18] = ''; r[19] = mk[i][0]; r[20] = mk[i][1]; r[21] = mk[i][2]; out.push(rowToObj_(r)); });
  out.sort(function (a, b) { return a.updatedAt < b.updatedAt ? 1 : -1; });
  return out;
}

function getQuotation(id) {
  id = String(id || '');
  var ss = getHome_();
  var ix = ensureSheet_(ss, Q.SH_INDEX, Q.INDEX_HEAD);
  var dt = ensureSheet_(ss, Q.SH_DATA, Q.DATA_HEAD);
  var row = findRowById_(ix, id);
  if (!row) throw new Error('Quotation not found.');
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
    if (String(cur[9]) === 'Final' && role !== 'admin') throw new Error('Admin PIN required to delete a finalized quotation.');
    if (!role) {   // a PIN is always needed, except to discard a brand-new draft   // without a PIN only a brand-new draft (created in the last 2 hours) may be discarded
      var born = new Date(String(cur[11])).getTime();
      if (String(cur[9]) !== 'Draft' || isNaN(born) || (Date.now() - born) > 2 * 3600 * 1000) throw new Error('PIN required to delete this quotation.');
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
    if (!row) throw new Error('Quotation not found.');
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
  fileName = String(fileName || 'Quotation.pdf').replace(/[\\\/:*?"<>|]/g, '-');
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
 *  COMPANY HEADER (saved per company + last quotation of that company)
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
function getRegistry() {
  try { var raw = readSettings_().registry; return raw ? JSON.parse(String(raw)) : []; } catch (e) { return []; }
}
function saveRegistry(json) {
  var arr = JSON.parse(String(json || '[]'));
  if (!Array.isArray(arr)) throw new Error('Invalid data');
  arr = arr.slice(0, 500).map(function (c) {
    return { name: String(c.name || '').trim().slice(0, 200).toUpperCase(), projects: (c.projects || []).slice(0, 100).map(function (p) { return String(p || '').trim().slice(0, 200).toUpperCase(); }).filter(String) };
  }).filter(function (c) { return c.name; });
  var str = JSON.stringify(arr);
  if (str.length > 48000) throw new Error('Registry too large.');
  writeSetting_('registry', str);
  bumpChange_('reg', '');
  return arr.length;
}

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
  fileName = String(fileName || 'Quotation.pdf').replace(/[\\\/:*?"<>|]/g, '-');
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
  if (cnt) throw new Error('This company still has ' + cnt + ' quotation(s). Delete or move them first.');
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
  if (cnt) throw new Error('This project still has ' + cnt + ' quotation(s). Delete or move them first.');
  var reg = getRegistry(); reg.forEach(function (x) { if (up_(x.name) === c) x.projects = x.projects.filter(function (q) { return up_(q) !== p; }); });
  saveRegistry(JSON.stringify(reg));
  var st = readSettings_();
  Object.keys(st).forEach(function (k) { if (k.toUpperCase() === ('CO_HDR:' + c + '|' + p) && st[k]) writeSetting_(k, ''); });
  return true;
}

/* never keep two copies of the same quotation in Drive */
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


/* move a quotation to another company / project (PIN required) */
function moveQuotation(id, company, project, pin) {
  var co = up_(company), pj = up_(project); if (!co) throw new Error('Company required.');
  return withLock_(function () {
    var ix = ensureSheet_(getHome_(), Q.SH_INDEX, Q.INDEX_HEAD), row = findRowById_(ix, String(id || ''));
    if (!row) throw new Error('Quotation not found.');
    if (String(ix.getRange(row, 10).getValue()) !== 'Import') requirePin_(pin);
    ix.getRange(row, 6).setNumberFormat('@').setValue(co);
    ix.getRange(row, 8).setNumberFormat('@').setValue(pj);
    if (String(ix.getRange(row, 10).getValue()) !== 'Import') {
      // a duplicated quotation that was not opened yet keeps its "Duplicated" badge and gets "Moved here" too
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
 *  the quotation data itself is always read from / written to the Sheet.
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
    if (bad) throw new Error(bad + ' quotation(s) need the correct PIN (finalized ones need the Admin PIN). Nothing was moved.');
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

/** Full-text search: every word must appear somewhere in the quotation. Returns matching ids. */
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

/** One-time (and repeatable) fill of Attn / Terms / Body for quotations saved before this feature existed. */
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

/** The person has looked at a duplicated / moved quotation: its highlight fades 5 minutes from now. */
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
var BK = { KEY: 'backup_cfg', MAN: 'SCSQ-BACKUP-', AUTO: 'SCSQ-AUTO-', FN: 'runAutoBackup', SKIP_SET: { admin_pin_hash: 1, user_pin_hash: 1, backup_cfg: 1 } };
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
  var out = { app: 'SCS Quotation', format: 'scsq-backup', v: 1, kind: kind, period: period, createdAt: new Date().toISOString(), count: rows.length, sheets: {} };
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
  log_('backup', '', 'admin', obj.kind + (obj.period ? ' ' + obj.period : '') + ' · ' + obj.count + ' quotation(s) · ' + dest);
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
  if (!o || o.format !== 'scsq-backup' || !o.sheets || !o.sheets[Q.SH_INDEX]) throw new Error('This file is not an SCS Quotation backup.');
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
 *               | merge   (quotations in the backup are added / overwritten, others stay)
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
    log_('restore', '', 'admin', mode + ' · ' + o.kind + (o.period ? ' ' + o.period : '') + ' · ' + n + ' quotation(s)' + (opts.settings ? ' + settings' : '') + (safety ? ' · safety copy saved' : ''));
    return { ok: true, count: n, mode: mode, safety: !!safety };
  });
}

/** reset: deletes every quotation (and optionally companies / templates / headers). Needs a fresh lifetime backup. */
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
    log_('reset', '', 'admin', n + ' quotation(s) deleted' + (opts.settings ? ' + companies/templates' : '') + (opts.log ? ' + log' : ''));
    return { ok: true, deleted: n };
  });
}


/* =====================================================================
 *  v6.3: smart search (with snippets), app link, share links
 * ===================================================================== */
/** search company, project, number, subject, attention and the whole quotation body. Returns [{id, snip}] */
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

/** the web-app address (to open another quotation in a new browser tab) */
function getAppUrl() { try { return ScriptApp.getService().getUrl(); } catch (e) { return ''; } }

/** save a PDF in "SCS Quotation - Shared" (anyone with the link can view) and return its links */
function sharePdf(fileName, base64, pin) {
  if (!pinRole_(pin)) throw new Error('PIN required.');
  var name = 'SCS Quotation - Shared', it = DriveApp.getRootFolder().getFoldersByName(name);
  var folder = it.hasNext() ? it.next() : DriveApp.getRootFolder().createFolder(name);
  var blob = Utilities.newBlob(Utilities.base64Decode(String(base64 || '')), 'application/pdf', String(fileName || 'Quotation.pdf'));
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
