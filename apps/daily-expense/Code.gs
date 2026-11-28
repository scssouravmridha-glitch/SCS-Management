/**
 * =====================================================================
 *  SCS Daily Expense - Backend (Google Apps Script)
 *  Swarup Construction Solution
 * =====================================================================
 *  - Google Sheet = একমাত্র ডাটাবেজ। প্রথমবার চালালে নিচের শিটগুলো নিজে তৈরি হবে:
 *      Employees         -> এমপ্লয়ি সেটআপ (ID, নাম, পদবি, মোবাইল, পিন)
 *      Expense_Vouchers  -> প্রতিটি দিনের খরচের ভাউচার (Draft / Submitted / Returned / Approved)
 *      Expense_Items     -> ভাউচারের ভেতরের প্রতিটি খরচ
 *      App_Settings      -> পিন, ক্যাটাগরি, ভাউচার ও সিগনেচার সেটিংস
 *      Activity_Log      -> কে কখন কী করেছে তার হিস্ট্রি
 *
 *  ডিপ্লয়: গুগল শিট খুলুন > Extensions > Apps Script > Code.gs ও Index.html
 *  পেস্ট করুন > Deploy > New deployment > Web app।
 *
 *  ডিফল্ট পিন: ইউজার 2019, অ্যাডমিন 2026 (অ্যাডমিন প্যানেল থেকে বদলানো যাবে)
 * =====================================================================
 */

var APP = {
  NAME: 'SCS Daily Expense',
  SH_EMP: 'Employees',
  SH_VOU: 'Expense_Vouchers',
  SH_ITEM: 'Expense_Items',
  SH_SET: 'App_Settings',
  SH_LOG: 'Activity_Log',
  DEFAULT_USER_PIN: '2019',
  DEFAULT_ADMIN_PIN: '2026',
  TOKEN_TTL: 21600 // ৬ ঘণ্টা
};

var HEAD = {
  Employees: ['EmpID', 'Name', 'Designation', 'Department', 'Mobile', 'PIN', 'Active', 'CreatedAt', 'UpdatedAt', 'SortOrder'],
  Expense_Vouchers: ['VoucherID', 'Date', 'EmpID', 'EmpName', 'Designation', 'Status', 'Total', 'ItemCount',
    'CreatedAt', 'UpdatedAt', 'SubmittedAt', 'ApprovedAt', 'ApprovedBy', 'ReturnedAt', 'AdminNote', 'SubmitCount', 'Title', 'VoucherNo', 'Appr1At', 'Appr2At', 'UserSign'],
  Expense_Items: ['ItemID', 'VoucherID', 'Date', 'EmpID', 'Category', 'Description', 'PaymentMode', 'Amount',
    'Remarks', 'CreatedAt', 'UpdatedAt', 'EditedBy', 'Quantity', 'Rate'],
  App_Settings: ['Key', 'Value', 'UpdatedAt'],
  Activity_Log: ['Time', 'VoucherID', 'Action', 'By', 'Note', 'Before', 'After']
};

var DEFAULT_CATEGORIES = ['Conveyance / যাতায়াত', 'Food / খাবার', 'Mobile Bill / মোবাইল বিল', 'Fuel / জ্বালানি',
  'Office Supplies / অফিস সামগ্রী', 'Labour / শ্রমিক', 'Carrying / মালামাল পরিবহন', 'Entertainment / আপ্যায়ন',
  'Repair & Maintenance / মেরামত', 'Others / অন্যান্য'];

/* ---------------------------------------------------------------------
 *  WEB APP ENTRY
 * ------------------------------------------------------------------- */
function doGet() {
  try { setupDatabase(); } catch (err) {}
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle(APP.NAME)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function onOpen() {
  try {
    SpreadsheetApp.getUi().createMenu('SCS Expense')
      .addItem('Setup / Repair Database Sheets', 'setupDatabase')
      .addItem('Reset PINs to default (2019 / 2026)', 'resetPinsToDefault')
      .addToUi();
  } catch (e) {}
}

/* ---------------------------------------------------------------------
 *  DATABASE
 * ------------------------------------------------------------------- */
function setupDatabase() {
  var ss = getHome_();
  Object.keys(HEAD).forEach(function (n) { ensureSheet_(ss, n, HEAD[n]); });
  return 'OK: ' + ss.getName();
}

var _HOME = null, _SHC = {}, _TBL = {}, _HMC = {};
function memoClear_(name) { if (name) { delete _TBL[name]; delete _HMC[name]; } else { _TBL = {}; _HMC = {}; } }
function getHome_() {
  if (_HOME) return _HOME;
  _HOME = getHome0_();
  return _HOME;
}
function getHome0_() {
  var props = PropertiesService.getScriptProperties();
  var active = null;
  try { active = SpreadsheetApp.getActiveSpreadsheet(); } catch (e) { active = null; }
  if (active) {
    if (props.getProperty('DB_SPREADSHEET_ID') !== active.getId()) props.setProperty('DB_SPREADSHEET_ID', active.getId());
    return active;
  }
  var id = props.getProperty('DB_SPREADSHEET_ID');
  if (id) return SpreadsheetApp.openById(id);
  throw new Error('ডাটাবেজ গুগল শিট সংযুক্ত নেই। গুগল শিটের ভেতর থেকে Extensions > Apps Script দিয়ে স্ক্রিপ্ট খুলুন।');
}

function ensureSheet_(ss, name, headers) {
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, headers.length).setValues([headers])
      .setFontWeight('bold').setBackground('#1e293b').setFontColor('#ffffff');
    sh.setFrozenRows(1);
    sh.getRange(2, 1, Math.max(sh.getMaxRows() - 1, 1), headers.length).setNumberFormat('@');
  } else {
    var cur = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), 1)).getValues()[0];
    headers.forEach(function (h, i) {
      if (cur.indexOf(h) < 0) {
        memoClear_(name);
        var col = sh.getLastColumn() + 1;
        sh.getRange(1, col).setValue(h).setFontWeight('bold').setBackground('#1e293b').setFontColor('#ffffff');
      }
    });
  }
  return sh;
}

function sheet_(name) { if (_SHC[name]) return _SHC[name]; _SHC[name] = ensureSheet_(getHome_(), name, HEAD[name]); return _SHC[name]; }

function withLock_(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try { return fn(); } finally { lock.releaseLock(); }
}

/** শিটের সব সারি অবজেক্ট আকারে পড়ে (_row = শিটের সারি নম্বর) */
function readTable_(name) {
  if (!_TBL[name]) _TBL[name] = readTable0_(name);
  return _TBL[name].map(function (o) { return Object.assign({}, o); });
}
function readTable0_(name) {
  var sh = sheet_(name);
  var last = sh.getLastRow(), lastCol = sh.getLastColumn();
  if (last < 2) return [];
  var head = sh.getRange(1, 1, 1, lastCol).getValues()[0];
  var vals = sh.getRange(2, 1, last - 1, lastCol).getValues();
  var out = [];
  for (var i = 0; i < vals.length; i++) {
    var r = vals[i];
    if (r[0] === '' || r[0] === null) continue;
    var o = { _row: i + 2 };
    for (var c = 0; c < head.length; c++) o[head[c]] = cell_(r[c]);
    out.push(o);
  }
  return out;
}

function cell_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  return v === null || v === undefined ? '' : v;
}

function headMap_(sh) {
  var nm = sh.getName ? sh.getName() : '';
  if (nm && _HMC[nm]) return _HMC[nm];
  var r = headMap0_(sh);
  if (nm) _HMC[nm] = r;
  return r;
}
function headMap0_(sh) {
  var head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var m = {};
  head.forEach(function (h, i) { m[h] = i + 1; });
  return { map: m, len: head.length, head: head };
}

function writeObj_(name, obj, row) {
  delete _TBL[name];
  var sh = sheet_(name);
  var hm = headMap_(sh);
  var arr = [];
  for (var i = 0; i < hm.len; i++) {
    var k = hm.head[i];
    arr.push(obj[k] === undefined || obj[k] === null ? '' : String(obj[k]));
  }
  if (!row) row = sh.getLastRow() + 1;
  sh.getRange(row, 1, 1, hm.len).setNumberFormat('@').setValues([arr]);
  return row;
}

function deleteRow_(name, row) { delete _TBL[name]; sheet_(name).deleteRow(row); }

function now_() { return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss'); }
function num_(v) { var n = parseFloat(String(v).replace(/[^0-9.\-]/g, '')); return isNaN(n) ? 0 : n; }
function str_(v) { return String(v === undefined || v === null ? '' : v).trim(); }

function log_(voucherId, action, by, note, before, after) {
  try { writeObj_(APP.SH_LOG, { Time: now_(), VoucherID: voucherId, Action: action, By: by, Note: note || '', Before: before || '', After: after || '' }); } catch (e) {}
}
/** একটি খরচের সারি এক লাইনে (লগে আগে/পরে দেখাতে) */
function itemTxt_(desc, qty, rate, amount, remarks) {
  var s = str_(desc);
  if (num_(qty) > 0 || num_(rate) > 0) s += ' | ' + (num_(qty) || '') + ' x ' + (num_(rate) || '');
  s += ' = ' + num_(amount);
  if (str_(remarks)) s += ' (' + str_(remarks) + ')';
  return s;
}
function vSummary_(v) { return [str_(v.VoucherNo) || str_(v.VoucherID), str_(v.EmpName), str_(v.Date), 'Status: ' + str_(v.Status), 'Total: ' + num_(v.Total), 'Items: ' + num_(v.ItemCount)].join(' • '); }
function roleName_(role) { return role === 'admin' ? 'Admin' : 'User'; }

/* ---------------------------------------------------------------------
 *  SETTINGS
 * ------------------------------------------------------------------- */
function readSettings_() {
  var out = {};
  readTable_(APP.SH_SET).forEach(function (r) { out[String(r.Key)] = { v: r.Value, row: r._row }; });
  return out;
}

function getSetting_(key, def) {
  var s = readSettings_();
  return s[key] && s[key].v !== '' ? String(s[key].v) : def;
}

function writeSetting_(key, value) {
  var s = readSettings_();
  writeObj_(APP.SH_SET, { Key: key, Value: value, UpdatedAt: now_() }, s[key] ? s[key].row : null);
}

function sha256Hex_(text) {
  var raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(text), Utilities.Charset.UTF_8);
  return raw.map(function (b) { var v = (b < 0 ? b + 256 : b).toString(16); return v.length === 1 ? '0' + v : v; }).join('');
}

function checkPin_(kind, pin) {
  var key = kind === 'admin' ? 'admin_pin_hash' : 'user_pin_hash';
  var def = kind === 'admin' ? APP.DEFAULT_ADMIN_PIN : APP.DEFAULT_USER_PIN;
  var hash = getSetting_(key, '');
  if (!hash) return String(pin) === def;
  return sha256Hex_(String(pin)) === hash;
}

function publicSettings_() {
  var s = readSettings_();
  function g(k, d) { return s[k] && s[k].v !== '' ? String(s[k].v) : d; }
  var cats = DEFAULT_CATEGORIES;
  try { var c = JSON.parse(g('categories', '[]')); if (c && c.length) cats = c; } catch (e) {}
  var sig = null;
  try { sig = JSON.parse(g('signature_config', 'null')); } catch (e) {}
  if (!sig || !sig.length) {
    sig = [
      { label: 'Prepared By', name: '', sub: 'Employee' },
      { label: 'Checked By', name: '', sub: 'Accounts' },
      { label: 'Approved By', name: '', sub: 'Admin' },
      { label: 'Received By', name: '', sub: '' }
    ];
  }
  return {
    companyName: g('company_name', 'Swarup Construction Solution'),
    tagline: g('tagline', 'Honesty is our Business Capital'),
    companyAddress: g('company_address', ''),
    voucherTitle: g('voucher_title', 'DAILY EXPENSE VOUCHER'),
    paymentModes: (function () { try { var p = JSON.parse(g('payment_modes', '[]')); if (p && p.length) return p; } catch (e) {} return ['Cash', 'bKash', 'Nagad', 'Bank', 'Card']; })(),
    categories: cats,
    signatures: sig,
    logo: g('logo_data_url', ''),
    adminPinLen: g('admin_pin_len', '4'),
    voucherPaper: g('voucher_paper', 'a4'),
    voucherMode: g('voucher_mode', 'full'),
    approvers: [
      { name: g('appr1_name', 'Ujjal Majumder'), sign: g('appr1_sign', '') },
      { name: g('appr2_name', 'Shamiron Halder'), sign: g('appr2_sign', '') }
    ],
    allowSameDayMulti: g('allow_same_day_multi', 'true') === 'true'
  };
}

/* ---------------------------------------------------------------------
 *  AUTH (সেশন টোকেন - CacheService)
 * ------------------------------------------------------------------- */
function newToken_(role) {
  var t = Utilities.getUuid();
  CacheService.getScriptCache().put('tok_' + t, role, APP.TOKEN_TTL);
  return t;
}

function roleOf_(token) {
  if (!token) return '';
  return CacheService.getScriptCache().get('tok_' + token) || '';
}

function need_(token, role) {
  var r = roleOf_(token);
  if (!r) throw new Error('AUTH: সেশন শেষ হয়ে গেছে, আবার পিন দিয়ে লগইন করুন।');
  if (role === 'admin' && r !== 'admin') throw new Error('অ্যাডমিন পিন প্রয়োজন।');
  CacheService.getScriptCache().put('tok_' + token, r, APP.TOKEN_TTL); // মেয়াদ বাড়ানো
  return r;
}

/** লগইন: ইউজার পিন (2019) অথবা অ্যাডমিন পিন (2026) */
function login(pin) {
  pin = str_(pin);
  if (checkPin_('admin', pin)) return { ok: true, role: 'admin', token: newToken_('admin') };
  if (checkPin_('user', pin)) return { ok: true, role: 'user', token: newToken_('user') };
  return { ok: false, message: 'ভুল পিন! আবার চেষ্টা করুন।' };
}

/** ইউজার লগইন অবস্থায় অ্যাডমিন প্যানেল খোলার জন্য */
function adminUnlock(token, pin) {
  need_(token);
  if (!checkPin_('admin', str_(pin))) return { ok: false, message: 'ভুল অ্যাডমিন পিন!' };
  return { ok: true, role: 'admin', token: newToken_('admin') };
}

function logout(token) {
  try { CacheService.getScriptCache().remove('tok_' + token); } catch (e) {}
  return true;
}

/* ---------------------------------------------------------------------
 *  BOOTSTRAP
 * ------------------------------------------------------------------- */
function getBootstrap(token) {
  var role = need_(token);
  return {
    role: role,
    employees: employeesPublic_(role === 'admin'),
    settings: publicSettings_(),
    today: Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd'),
    serverTime: now_()
  };
}

function employeesPublic_(withPin) {
  return readTable_(APP.SH_EMP).map(function (e) {
    var o = {
      id: str_(e.EmpID), name: str_(e.Name), designation: str_(e.Designation), department: str_(e.Department),
      mobile: str_(e.Mobile), active: String(e.Active).toLowerCase() !== 'false', hasPin: !!str_(e.PIN)
    };
    if (withPin) o.pin = str_(e.PIN);
    o.order = str_(e.SortOrder) === '' ? 1e9 : num_(e.SortOrder);
    return o;
  }).sort(function (a, b) { return a.order - b.order || a.id.localeCompare(b.id, undefined, { numeric: true }); });
}

/* ---------------------------------------------------------------------
 *  VOUCHERS & ITEMS
 * ------------------------------------------------------------------- */
function voucherOut_(v) {
  return {
    id: str_(v.VoucherID), date: str_(v.Date), empId: str_(v.EmpID), empName: str_(v.EmpName),
    designation: str_(v.Designation), status: str_(v.Status) || 'Draft', total: num_(v.Total),
    itemCount: num_(v.ItemCount), createdAt: str_(v.CreatedAt), updatedAt: str_(v.UpdatedAt),
    submittedAt: str_(v.SubmittedAt), approvedAt: str_(v.ApprovedAt), approvedBy: str_(v.ApprovedBy),
    returnedAt: str_(v.ReturnedAt), adminNote: str_(v.AdminNote), submitCount: num_(v.SubmitCount),
    title: str_(v.Title), voucherNo: str_(v.VoucherNo), appr1At: str_(v.Appr1At), appr2At: str_(v.Appr2At),
    hasSign: !!str_(v.UserSign)
  };
}

function itemOut_(i) {
  return {
    id: str_(i.ItemID), voucherId: str_(i.VoucherID), date: str_(i.Date), empId: str_(i.EmpID),
    category: str_(i.Category), description: str_(i.Description), paymentMode: str_(i.PaymentMode),
    amount: num_(i.Amount), qty: num_(i.Quantity), rate: num_(i.Rate), remarks: str_(i.Remarks), createdAt: str_(i.CreatedAt),
    updatedAt: str_(i.UpdatedAt), editedBy: str_(i.EditedBy)
  };
}

function findVoucher_(id) {
  var all = readTable_(APP.SH_VOU);
  for (var i = 0; i < all.length; i++) if (str_(all[i].VoucherID) === str_(id)) return all[i];
  return null;
}

function itemsOf_(voucherId) {
  return readTable_(APP.SH_ITEM).filter(function (i) { return str_(i.VoucherID) === str_(voucherId); });
}

function fullVoucher_(id, withLog) {
  var v = findVoucher_(id);
  if (!v) return null;
  var out = voucherOut_(v);
  out.userSign = str_(v.UserSign);
  out.items = itemsOf_(id).map(itemOut_).sort(function (a, b) { return a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0; });
  if (withLog) out.log = readTable_(APP.SH_LOG).filter(function (l) { return str_(l.VoucherID) === str_(id); })
    .map(function (l) { return { time: str_(l.Time), action: str_(l.Action), by: str_(l.By), note: str_(l.Note), before: str_(l.Before), after: str_(l.After) }; });
  return out;
}

function recalc_(id) {
  var v = findVoucher_(id);
  if (!v) return;
  var items = itemsOf_(id);
  var total = 0;
  items.forEach(function (i) { total += num_(i.Amount); });
  v.Total = Math.round(total * 100) / 100;
  v.ItemCount = items.length;
  v.UpdatedAt = now_();
  writeObj_(APP.SH_VOU, v, v._row);
}

function canEdit_(role, status) {
  if (role === 'admin') return true;
  return status === 'Draft' || status === 'Returned';
}

/** একজন এমপ্লয়ির একটি তারিখের সকল ভাউচার (এডিটযোগ্য ড্রাফট সহ) */
function getDayVouchers(token, empId, date) {
  need_(token);
  var list = readTable_(APP.SH_VOU).filter(function (v) {
    return str_(v.EmpID) === str_(empId) && str_(v.Date) === str_(date);
  });
  var editable = null;
  list.forEach(function (v) { if (!editable && (v.Status === 'Draft' || v.Status === 'Returned')) editable = v; });
  return {
    editable: editable ? fullVoucher_(editable.VoucherID) : null,
    others: list.filter(function (v) { return !editable || v.VoucherID !== editable.VoucherID; }).map(voucherOut_),
    openDrafts: readTable_(APP.SH_VOU).filter(function (v) {
      return str_(v.EmpID) === str_(empId) && (v.Status === 'Draft' || v.Status === 'Returned');
    }).map(voucherOut_).sort(function (a, b) { return a.date < b.date ? 1 : -1; })
  };
}

function getVoucher(token, id) {
  need_(token);
  var v = fullVoucher_(id, true);
  if (!v) throw new Error('ভাউচার পাওয়া যায়নি: ' + id);
  return v;
}

function createVoucher_(empId, date, by, title) {
  var emp = null;
  readTable_(APP.SH_EMP).forEach(function (e) { if (str_(e.EmpID) === str_(empId)) emp = e; });
  if (!emp) throw new Error('এমপ্লয়ি পাওয়া যায়নি: ' + empId);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str_(date))) throw new Error('সঠিক তারিখ দিন।');
  var base = 'EXP-' + str_(date).replace(/-/g, '') + '-' + str_(empId).replace(/[^A-Za-z0-9]/g, '');
  var ids = readTable_(APP.SH_VOU).map(function (v) { return str_(v.VoucherID); });
  var id = base, n = 2;
  while (ids.indexOf(id) >= 0) { id = base + '-' + n; n++; }
  var v = {
    VoucherID: id, Date: date, EmpID: str_(emp.EmpID), EmpName: str_(emp.Name), Designation: str_(emp.Designation),
    Status: 'Draft', Total: 0, ItemCount: 0, CreatedAt: now_(), UpdatedAt: now_(), SubmitCount: 0, Title: str_(title)
  };
  writeObj_(APP.SH_VOU, v);
  log_(id, 'Draft Created', by, str_(emp.Name) + ' • ' + date + (str_(title) ? ' • ' + str_(title) : ''));
  return id;
}

/**
 * খরচ যোগ / এডিট।
 * payload: {voucherId?, empId, date, item:{id?, category, description, paymentMode, amount, remarks}}
 */
function saveItem(token, payload) {
  var role = need_(token);
  return withLock_(function () {
    var vid = str_(payload.voucherId);
    var by = role === 'admin' ? 'Admin' : 'User';
    if (vid) {
      var v = findVoucher_(vid);
      if (!v) throw new Error('ভাউচার পাওয়া যায়নি।');
      if (!canEdit_(role, str_(v.Status))) throw new Error('এই ভাউচার সাবমিট হয়ে গেছে। এখন শুধু অ্যাডমিন এডিট করতে পারবেন।');
    } else if (payload.newDraft) {
      vid = createVoucher_(payload.empId, payload.date, by, payload.title);
    } else {
      var day = readTable_(APP.SH_VOU).filter(function (x) {
        return str_(x.EmpID) === str_(payload.empId) && str_(x.Date) === str_(payload.date) && (x.Status === 'Draft' || x.Status === 'Returned');
      });
      vid = day.length ? str_(day[0].VoucherID) : createVoucher_(payload.empId, payload.date, by);
    }
    var it = payload.item || {};
    var qty = num_(it.qty), rate = num_(it.rate);
    var amount = num_(it.amount);
    if (!(amount > 0) && qty > 0 && rate > 0) amount = Math.round(qty * rate * 100) / 100;
    if (!(amount > 0)) throw new Error('টাকার পরিমাণ সঠিকভাবে দিন।');
    if (!str_(it.description) && !str_(it.category)) throw new Error('খরচের বিবরণ লিখুন।');
    var vrow = findVoucher_(vid);
    var obj = {
      VoucherID: vid, Date: str_(vrow.Date), EmpID: str_(vrow.EmpID), Category: str_(it.category),
      Description: str_(it.description), PaymentMode: str_(it.paymentMode), Amount: amount,
      Quantity: qty > 0 ? qty : '', Rate: rate > 0 ? rate : '',
      Remarks: str_(it.remarks), UpdatedAt: now_(), EditedBy: by
    };
    if (it.id) {
      var ex = null;
      itemsOf_(vid).forEach(function (r) { if (str_(r.ItemID) === str_(it.id)) ex = r; });
      if (!ex) throw new Error('খরচটি পাওয়া যায়নি।');
      obj.ItemID = ex.ItemID; obj.CreatedAt = ex.CreatedAt;
      writeObj_(APP.SH_ITEM, obj, ex._row);
      var bTxt = itemTxt_(ex.Description, ex.Quantity, ex.Rate, ex.Amount, ex.Remarks), aTxt = itemTxt_(obj.Description, obj.Quantity, obj.Rate, obj.Amount, obj.Remarks);
      if (bTxt !== aTxt) log_(vid, 'Item Edited', by, str_(vrow.Status), bTxt, aTxt);
    } else {
      obj.ItemID = 'IT-' + Utilities.getUuid().slice(0, 8).toUpperCase();
      obj.CreatedAt = now_();
      writeObj_(APP.SH_ITEM, obj);
      log_(vid, 'Item Added', by, str_(vrow.Status), '', itemTxt_(obj.Description, obj.Quantity, obj.Rate, obj.Amount, obj.Remarks));
    }
    recalc_(vid);
    var out = fullVoucher_(vid);
    out.savedItemId = obj.ItemID;
    return out;
  });
}

/** নতুন খালি ড্রাফট তৈরি (New Draft) */
function createDraft(token, empId, date, title) {
  var role = need_(token);
  return withLock_(function () {
    return fullVoucher_(createVoucher_(empId, date, role === 'admin' ? 'Admin' : 'User', title));
  });
}

/** ড্রাফটের এমপ্লয়ি / তারিখ / টাইটেল পরিবর্তন */
function updateDraftHeader(token, id, hd) {
  var role = need_(token);
  hd = hd || {};
  return withLock_(function () {
    var v = findVoucher_(id);
    if (!v) throw new Error('ভাউচার পাওয়া যায়নি।');
    if (!canEdit_(role, str_(v.Status))) throw new Error('এই ভাউচার সাবমিট হয়ে গেছে। এখন আর এডিট করা যাবে না।');
    var hb = { Employee: str_(v.EmpName) + ' (' + str_(v.EmpID) + ')', Date: str_(v.Date), Title: str_(v.Title) };
    if (hd.empId && str_(hd.empId) !== str_(v.EmpID)) {
      var emp = null;
      readTable_(APP.SH_EMP).forEach(function (e) { if (str_(e.EmpID) === str_(hd.empId)) emp = e; });
      if (!emp) throw new Error('এমপ্লয়ি পাওয়া যায়নি: ' + hd.empId);
      v.EmpID = str_(emp.EmpID); v.EmpName = str_(emp.Name); v.Designation = str_(emp.Designation);
    }
    if (hd.date) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(str_(hd.date))) throw new Error('সঠিক তারিখ দিন।');
      v.Date = str_(hd.date);
    }
    if (hd.title !== undefined) v.Title = str_(hd.title);
    v.UpdatedAt = now_();
    writeObj_(APP.SH_VOU, v, v._row);
    var ha = { Employee: str_(v.EmpName) + ' (' + str_(v.EmpID) + ')', Date: str_(v.Date), Title: str_(v.Title) }, bs = [], as = [];
    Object.keys(hb).forEach(function (k) { if (hb[k] !== ha[k]) { bs.push(k + ': ' + hb[k]); as.push(k + ': ' + ha[k]); } });
    if (bs.length) log_(id, 'Draft Header Changed', roleName_(role), '', bs.join(' • '), as.join(' • '));
    itemsOf_(id).forEach(function (it) {
      if (str_(it.EmpID) !== str_(v.EmpID) || str_(it.Date) !== str_(v.Date)) { it.EmpID = v.EmpID; it.Date = v.Date; writeObj_(APP.SH_ITEM, it, it._row); }
    });
    return fullVoucher_(id);
  });
}

/** সব খোলা ড্রাফট ও ইউজারের কাছে ফেরত আসা ভাউচার */
function listOpenDrafts(token) {
  need_(token);
  return readTable_(APP.SH_VOU).filter(function (v) { return v.Status === 'Draft' || v.Status === 'Returned'; })
    .map(voucherOut_).sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; });
}

/** ড্রাফট খোলা / ডিলিটের জন্য পিন যাচাই: এমপ্লয়ির নিজের পিন, না থাকলে কমন ইউজার পিন, অথবা অ্যাডমিন পিন */
function draftPinOk_(v, pin) {
  pin = str_(pin);
  if (checkPin_('admin', pin)) return true;
  var emp = null;
  readTable_(APP.SH_EMP).forEach(function (e) { if (v && str_(e.EmpID) === str_(v.EmpID)) emp = e; });
  if (emp && str_(emp.PIN)) return pin === str_(emp.PIN);
  return checkPin_('user', pin);
}
function verifyDraftPin(token, voucherId, pin) {
  need_(token);
  var v = findVoucher_(voucherId);
  if (!v) throw new Error('ভাউচার পাওয়া যায়নি।');
  return draftPinOk_(v, pin);
}
function deleteDraft(token, voucherId, pin) {
  need_(token);
  return withLock_(function () {
    var v = findVoucher_(voucherId);
    if (!v) throw new Error('ড্রাফট পাওয়া যায়নি।');
    if (v.Status !== 'Draft') throw new Error('শুধু ড্রাফট এখান থেকে ডিলিট করা যায়।');
    if (!draftPinOk_(v, pin)) throw new Error('ভুল পিন! ডিলিট হয়নি।');
    var before = vSummary_(v) + ' || ' + itemsOf_(voucherId).map(function (r) { return itemTxt_(r.Description, r.Quantity, r.Rate, r.Amount, r.Remarks); }).join(' ; ');
    itemsOf_(voucherId).map(function (r) { return r._row; }).sort(function (a, b) { return b - a; }).forEach(function (r) { deleteRow_(APP.SH_ITEM, r); });
    deleteRow_(APP.SH_VOU, findVoucher_(voucherId)._row);
    log_(voucherId, 'Draft Deleted', 'User', str_(v.Title), before, '');
    return true;
  });
}

/** অ্যাডমিন এডিট/ডিলিটের আগে আবার পিন যাচাই */
function verifyAdminPin(token, pin) {
  need_(token, 'admin');
  return checkPin_('admin', str_(pin));
}

function deleteItem(token, voucherId, itemId) {
  var role = need_(token);
  return withLock_(function () {
    var v = findVoucher_(voucherId);
    if (!v) throw new Error('ভাউচার পাওয়া যায়নি।');
    if (!canEdit_(role, str_(v.Status))) throw new Error('সাবমিট করা ভাউচার থেকে ডিলিট করা যাবে না।');
    var ex = null;
    itemsOf_(voucherId).forEach(function (r) { if (str_(r.ItemID) === str_(itemId)) ex = r; });
    if (!ex) throw new Error('খরচটি পাওয়া যায়নি।');
    deleteRow_(APP.SH_ITEM, ex._row);
    log_(voucherId, 'Item Deleted', roleName_(role), str_(v.Status), itemTxt_(ex.Description, ex.Quantity, ex.Rate, ex.Amount, ex.Remarks), '');
    recalc_(voucherId);
    return fullVoucher_(voucherId);
  });
}

/** ড্রাফট (খালি বা পুরো) ডিলিট - শুধু ড্রাফট অবস্থায় ইউজার, যেকোনো অবস্থায় অ্যাডমিন */
function deleteVoucher(token, voucherId, adminPin) {
  var role = need_(token);
  if (adminPin !== undefined && adminPin !== null && adminPin !== '') {
    if (!checkPin_('admin', str_(adminPin))) throw new Error('ভুল অ্যাডমিন পিন! ডিলিট হয়নি।');
    role = 'admin';
  }
  return withLock_(function () {
    var v = findVoucher_(voucherId);
    if (!v) throw new Error('ভাউচার পাওয়া যায়নি।');
    if (role !== 'admin' && v.Status !== 'Draft') throw new Error('শুধু ড্রাফট ভাউচার ডিলিট করা যায়। অন্য ভাউচার ডিলিট করতে অ্যাডমিন পিন লাগবে।');
    var before = vSummary_(v) + ' || ' + itemsOf_(voucherId).map(function (r) { return itemTxt_(r.Description, r.Quantity, r.Rate, r.Amount, r.Remarks); }).join(' ; ');
    var rows = itemsOf_(voucherId).map(function (r) { return r._row; }).sort(function (a, b) { return b - a; });
    rows.forEach(function (r) { deleteRow_(APP.SH_ITEM, r); });
    deleteRow_(APP.SH_VOU, findVoucher_(voucherId)._row);
    log_(voucherId, 'Voucher Deleted', roleName_(role), str_(v.VoucherNo), before, '');
    return true;
  });
}

/** পিন দিয়ে ফাইনাল সাবমিট */
function submitVoucher(token, voucherId, pin, sign) {
  var role = need_(token);
  return withLock_(function () {
    var v = findVoucher_(voucherId);
    if (!v) throw new Error('ভাউচার পাওয়া যায়নি।');
    if (v.Status !== 'Draft' && v.Status !== 'Returned') throw new Error('এই ভাউচার আগেই সাবমিট হয়েছে।');
    if (num_(v.ItemCount) < 1) throw new Error('কমপক্ষে একটি খরচ যোগ করুন।');
    var emp = null;
    readTable_(APP.SH_EMP).forEach(function (e) { if (str_(e.EmpID) === str_(v.EmpID)) emp = e; });
    var ok = false;
    if (emp && str_(emp.PIN)) ok = str_(pin) === str_(emp.PIN);
    else ok = checkPin_('user', str_(pin));
    if (!ok && role === 'admin') ok = checkPin_('admin', str_(pin));
    if (!ok) throw new Error('ভুল পিন! সাবমিট হয়নি।');
    sign = str_(sign);
    if (sign && !/^data:image\/(png|jpeg);base64,/.test(sign)) sign = '';   // signature is optional
    if (sign.length > 48000) throw new Error('সিগনেচার অনেক বড়, আবার ছোট করে দিন।');
    v.UserSign = sign;
    var wasReturned = v.Status === 'Returned';
    v.Status = 'Submitted';
    v.SubmittedAt = now_();
    v.UpdatedAt = now_();
    v.SubmitCount = num_(v.SubmitCount) + 1;
    if (!str_(v.VoucherNo)) {
      var seq = num_(getSetting_('voucher_seq', '0')) + 1;
      writeSetting_('voucher_seq', String(seq));
      v.VoucherNo = 'SCSV' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMM') + '-' + (seq < 10 ? '0' + seq : String(seq));
    }
    writeObj_(APP.SH_VOU, v, v._row);
    log_(voucherId, wasReturned ? 'Re-Submitted' : 'Submitted', str_(v.EmpName), str_(v.VoucherNo) + (sign ? '' : ' (no signature)'), wasReturned ? 'Status: Sent Back' : 'Status: Draft', 'Status: Pending • ' + str_(v.VoucherNo) + ' • Total: ' + num_(v.Total));
    return fullVoucher_(voucherId);
  });
}

/** অ্যাপ্রুভ: which = 1 (প্রথম অ্যাপ্রুভার) বা 2 (দ্বিতীয় অ্যাপ্রুভার)। একজন করলেই Approved। */
function approveVoucher(token, voucherId, which, note) {
  need_(token, 'admin');
  return withLock_(function () {
    var v = findVoucher_(voucherId);
    if (!v) throw new Error('ভাউচার পাওয়া যায়নি।');
    if (num_(v.ItemCount) < 1) throw new Error('খালি ভাউচার অ্যাপ্রুভ করা যায় না।');
    if (v.Status === 'Draft' || v.Status === 'Returned') throw new Error('সাবমিট হওয়া ভাউচারই অ্যাপ্রুভ করা যায়।');
    var n = String(which) === '2' ? 2 : 1;
    var ap = approvers_()[n - 1];
    if (str_(v['Appr' + n + 'At'])) throw new Error(ap.name + ' আগেই অ্যাপ্রুভ করেছেন।');
    var stBefore = str_(v.Status);
    v['Appr' + n + 'At'] = now_();
    v.Status = 'Approved';
    if (!str_(v.ApprovedAt)) v.ApprovedAt = now_();
    v.ApprovedBy = [str_(v.Appr1At) ? approvers_()[0].name : '', str_(v.Appr2At) ? approvers_()[1].name : ''].filter(String).join(', ');
    if (str_(note)) v.AdminNote = str_(note);
    v.UpdatedAt = now_();
    writeObj_(APP.SH_VOU, v, v._row);
    log_(voucherId, 'Approved', ap.name, str_(note), 'Status: ' + stBefore, 'Status: Approved • ' + v.ApprovedBy);
    return fullVoucher_(voucherId, true);
  });
}

function approvers_() {
  var s = publicSettings_();
  return s.approvers;
}

/** পুরনো (এই আপডেটের আগে সাবমিট হওয়া) ভাউচারের জন্য নম্বর। নতুনগুলো সাবমিটের সময়ই নম্বর পায়। */
function assignVoucherNos(token, ids) {
  need_(token);
  return withLock_(function () {
    var all = readTable_(APP.SH_VOU), out = {};
    var seq = num_(getSetting_('voucher_seq', '0'));
    var ym = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMM');
    (ids || []).forEach(function (id) {
      var v = null;
      for (var i = 0; i < all.length; i++) if (str_(all[i].VoucherID) === str_(id)) { v = all[i]; break; }
      if (!v) return;
      if (!str_(v.VoucherNo) && v.Status !== 'Draft') {
        seq++;
        v.VoucherNo = 'SCSV' + ym + '-' + (seq < 10 ? '0' + seq : String(seq));
        writeObj_(APP.SH_VOU, v, v._row);
        log_(str_(v.VoucherID), 'Voucher Generated', 'System', v.VoucherNo);
      }
      out[str_(v.VoucherID)] = str_(v.VoucherNo);
    });
    writeSetting_('voucher_seq', String(seq));
    return out;
  });
}

function returnVoucher(token, voucherId, note) {
  need_(token, 'admin');
  return withLock_(function () {
    var v = findVoucher_(voucherId);
    if (!v) throw new Error('ভাউচার পাওয়া যায়নি।');
    var stBefore = str_(v.Status);
    v.Status = 'Returned';
    v.ReturnedAt = now_();
    v.ApprovedAt = '';
    v.ApprovedBy = '';
    v.Appr1At = '';
    v.Appr2At = '';
    v.AdminNote = str_(note);
    v.UpdatedAt = now_();
    writeObj_(APP.SH_VOU, v, v._row);
    log_(voucherId, 'Sent to User', 'Admin', str_(note), 'Status: ' + stBefore, 'Status: Sent Back');
    return fullVoucher_(voucherId, true);
  });
}

/**
 * ফিল্টার করা ভাউচার তালিকা।
 * f: {mode:'date'|'month'|'year'|'lifetime'|'range', date, month(1-12), year, from, to, empId, status, withItems}
 */
function listVouchers(token, f) {
  var role = need_(token);
  f = f || {};
  var list = readTable_(APP.SH_VOU).map(voucherOut_).filter(function (v) {
    if (f.empId && v.empId !== str_(f.empId)) return false;
    if (f.status && f.status !== 'All') {
      if (f.status === 'Pending') { if (v.status !== 'Submitted') return false; }
      else if (v.status !== f.status) return false;
    } else if (!f.includeDrafts && v.status === 'Draft') return false;
    var d = v.date;
    if (f.mode === 'date' && f.date && d !== f.date) return false;
    if (f.mode === 'range') { if (f.from && d < f.from) return false; if (f.to && d > f.to) return false; }
    if (f.mode === 'month' && f.year && f.month) {
      var mk = f.year + '-' + ('0' + f.month).slice(-2);
      if (d.slice(0, 7) !== mk) return false;
    }
    if (f.mode === 'year' && f.year && d.slice(0, 4) !== String(f.year)) return false;
    return true;
  });
  list.sort(function (a, b) { return a.date === b.date ? (a.empId < b.empId ? -1 : 1) : (a.date < b.date ? 1 : -1); });
  if (f.withItems) {
    var ids = {};
    list.forEach(function (v) { ids[v.id] = v; v.items = []; });
    if (f.withSign) readTable_(APP.SH_VOU).forEach(function (r) { if (ids[str_(r.VoucherID)]) ids[str_(r.VoucherID)].userSign = str_(r.UserSign); });
    readTable_(APP.SH_ITEM).forEach(function (i) { if (ids[str_(i.VoucherID)]) ids[str_(i.VoucherID)].items.push(itemOut_(i)); });
  }
  return { role: role, vouchers: list };
}

/** ড্যাশবোর্ডের সব হিসাব */
function getDashboard(token, year, month, today, pmode) {
  need_(token);
  pmode = pmode === 'year' || pmode === 'lifetime' ? pmode : 'month';
  var tz = Session.getScriptTimeZone();
  today = str_(today) || Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
  var mk = year + '-' + ('0' + month).slice(-2);
  var vs = readTable_(APP.SH_VOU).map(voucherOut_);
  var res = {
    today: { date: today, total: 0, vouchers: 0, draft: 0, draftAmt: 0, submitted: 0, submittedAmt: 0, approved: 0, approvedAmt: 0, returned: 0, returnedAmt: 0, entries: 0 },
    month: { total: 0, approved: 0, approvedCnt: 0, pending: 0, pendingCnt: 0, returned: 0, returnedCnt: 0, draft: 0, draftCnt: 0, vouchers: 0, entries: 0, employees: 0 },
    yearTotal: 0, lifetimeTotal: 0, pendingAll: 0, pendingAllAmt: 0,
    byEmployee: [], byCategory: [], byDay: [], recent: []
  };
  var empMap = {}, dayMap = {}, monthIds = {};
  vs.forEach(function (v) {
    var counted = v.status !== 'Draft';
    if (counted) res.lifetimeTotal += v.total;
    if (v.date.slice(0, 4) === String(year) && counted) res.yearTotal += v.total;
    if (v.status === 'Submitted') { res.pendingAll++; res.pendingAllAmt += v.total; }
    if (v.date === today) {
      var t = res.today;
      t.vouchers++; t.entries += v.itemCount;
      if (v.status === 'Draft') { t.draft++; t.draftAmt += v.total; }
      if (v.status === 'Submitted') { t.submitted++; t.submittedAmt += v.total; }
      if (v.status === 'Approved') { t.approved++; t.approvedAmt += v.total; }
      if (v.status === 'Returned') { t.returned++; t.returnedAmt += v.total; }
      if (counted) t.total += v.total;
    }
    var inP = pmode === 'lifetime' ? true : pmode === 'year' ? v.date.slice(0, 4) === String(year) : v.date.slice(0, 7) === mk;
    if (inP) {
      var m = res.month;
      if (v.status === 'Draft') { m.draft += v.total; m.draftCnt++; }
      else {
        m.total += v.total; m.vouchers++; m.entries += v.itemCount;
        monthIds[v.id] = 1;
        if (!empMap[v.empId]) empMap[v.empId] = { empId: v.empId, name: v.empName, total: 0, approved: 0, vouchers: 0 };
        empMap[v.empId].total += v.total; empMap[v.empId].vouchers++;
        if (v.status === 'Approved') empMap[v.empId].approved += v.total;
        dayMap[v.date] = (dayMap[v.date] || 0) + v.total;
      }
      if (v.status === 'Approved') { m.approved += v.total; m.approvedCnt++; }
      if (v.status === 'Submitted') { m.pending += v.total; m.pendingCnt++; }
      if (v.status === 'Returned') { m.returned += v.total; m.returnedCnt++; }
    }
  });
  res.byEmployee = Object.keys(empMap).map(function (k) { return empMap[k]; }).sort(function (a, b) { return b.total - a.total; });
  res.month.employees = res.byEmployee.length;
  res.byDay = Object.keys(dayMap).sort().map(function (d) { return { date: d, total: dayMap[d] }; });
  res.pmode = pmode;
  res.recent = vs.filter(function (v) { return v.status !== 'Draft'; })
    .sort(function (a, b) { var x = a.submittedAt || a.updatedAt, y = b.submittedAt || b.updatedAt; return x < y ? 1 : -1; }).slice(0, 10);
  return res;
}

/* ---------------------------------------------------------------------
 *  ADMIN: EMPLOYEES / SETTINGS / SECURITY
 * ------------------------------------------------------------------- */
function saveEmployee(token, e, originalId) {
  need_(token, 'admin');
  return withLock_(function () {
    var id = str_(e.id), name = str_(e.name);
    if (!id || !name) throw new Error('এমপ্লয়ি আইডি ও নাম দুটোই দিন।');
    if (str_(e.pin) && !/^\d{4}$/.test(str_(e.pin))) throw new Error('পিন ৪ ডিজিটের সংখ্যা হতে হবে।');
    var all = readTable_(APP.SH_EMP);
    var orig = str_(originalId);
    var ex = null, dup = false;
    all.forEach(function (r) {
      if (orig && str_(r.EmpID) === orig) ex = r;
      if (str_(r.EmpID).toLowerCase() === id.toLowerCase() && str_(r.EmpID) !== orig) dup = true;
    });
    if (dup) throw new Error('এই আইডি আগে থেকেই আছে: ' + id);
    var obj = {
      EmpID: id, Name: name, Designation: str_(e.designation), Department: str_(e.department), Mobile: str_(e.mobile),
      PIN: str_(e.pin), Active: e.active === false ? 'false' : 'true', UpdatedAt: now_(),
      CreatedAt: ex ? ex.CreatedAt : now_(),
      SortOrder: ex ? ex.SortOrder : all.length + 1
    };
    writeObj_(APP.SH_EMP, obj, ex ? ex._row : null);
    var et = function (r) { return r ? ['ID: ' + str_(r.EmpID), 'Name: ' + str_(r.Name), 'Designation: ' + str_(r.Designation), 'Mobile: ' + str_(r.Mobile), 'PIN: ' + (str_(r.PIN) ? 'set' : 'common'), 'Active: ' + str_(r.Active)] : []; };
    var eb = et(ex), ea = et(obj), bs = [], as = [];
    ea.forEach(function (x, i) { if (eb[i] !== x) { if (eb[i]) bs.push(eb[i]); as.push(x); } });
    if (as.length) log_('', ex ? 'Employee Edited' : 'Employee Added', 'Admin', name, bs.join(' • '), as.join(' • '));
    return employeesPublic_(true);
  });
}

/** এমপ্লয়িদের ক্রম সেট করা (ids = নতুন ক্রমে আইডির তালিকা) */
function saveEmployeeOrder(token, ids) {
  need_(token, 'admin');
  return withLock_(function () {
    var pos = {};
    (ids || []).forEach(function (id, i) { pos[str_(id)] = i + 1; });
    var oldOrder = employeesPublic_(false).map(function (e) { return e.name; }).join(', ');
    readTable_(APP.SH_EMP).forEach(function (r) {
      var n = pos[str_(r.EmpID)];
      if (n && num_(r.SortOrder) !== n) { r.SortOrder = n; writeObj_(APP.SH_EMP, r, r._row); }
    });
    var out = employeesPublic_(true);
    log_('', 'Employee Order Changed', 'Admin', '', oldOrder, out.map(function (e) { return e.name; }).join(', '));
    return out;
  });
}

function deleteEmployee(token, id) {
  need_(token, 'admin');
  return withLock_(function () {
    var ex = null;
    readTable_(APP.SH_EMP).forEach(function (r) { if (str_(r.EmpID) === str_(id)) ex = r; });
    if (ex) { deleteRow_(APP.SH_EMP, ex._row); log_('', 'Employee Deleted', 'Admin', str_(ex.Name), 'ID: ' + str_(ex.EmpID) + ' • Name: ' + str_(ex.Name) + ' • Designation: ' + str_(ex.Designation), ''); }
    return employeesPublic_(true);
  });
}

function saveSettings(token, s) {
  need_(token, 'admin');
  return withLock_(function () {
    var before = readSettings_();
    if (s.companyName !== undefined) writeSetting_('company_name', str_(s.companyName));
    if (s.tagline !== undefined) writeSetting_('tagline', str_(s.tagline));
    if (s.companyAddress !== undefined) writeSetting_('company_address', str_(s.companyAddress));
    if (s.voucherTitle !== undefined) writeSetting_('voucher_title', str_(s.voucherTitle));
    if (s.categories) writeSetting_('categories', JSON.stringify(s.categories.map(str_).filter(String)));
    if (s.paymentModes) writeSetting_('payment_modes', JSON.stringify(s.paymentModes.map(str_).filter(String)));
    if (s.voucherPaper) writeSetting_('voucher_paper', s.voucherPaper === 'exact' ? 'exact' : 'a4');
    if (s.voucherMode) writeSetting_('voucher_mode', s.voucherMode === 'data' ? 'data' : 'full');
    if (s.signatures) writeSetting_('signature_config', JSON.stringify(s.signatures));
    if (s.approvers) s.approvers.forEach(function (a, i) {
      if (i > 1 || !a) return;
      if (a.name !== undefined) writeSetting_('appr' + (i + 1) + '_name', str_(a.name));
      if (a.sign !== undefined) {
        if (String(a.sign).length > 48000) throw new Error('সিগনেচার ছবি অনেক বড়। ৩০KB এর ছোট PNG দিন বা লিংক দিন।');
        writeSetting_('appr' + (i + 1) + '_sign', str_(a.sign));
      }
    });
    if (s.logo !== undefined) {
      if (String(s.logo).length > 45000) throw new Error('লোগো ফাইল অনেক বড়। ৩০KB এর ছোট ছবি দিন।');
      writeSetting_('logo_data_url', String(s.logo));
    }
    var after = readSettings_(), bs = [], as = [];
    var show = function (v) { v = str_(v); return /^data:/.test(v) ? '[image]' : (v.length > 80 ? v.slice(0, 80) + '…' : v); };
    Object.keys(after).forEach(function (k) {
      if (/pin_hash|voucher_seq|last_backup/.test(k)) return;
      var b = before[k] ? str_(before[k].v) : '', a = str_(after[k].v);
      if (b !== a) { bs.push(k + ': ' + (show(b) || '-')); as.push(k + ': ' + (show(a) || '-')); }
    });
    if (as.length) log_('', 'Settings Changed', 'Admin', '', bs.join(' • '), as.join(' • '));
    return publicSettings_();
  });
}

function changePin(token, kind, currentAdminPin, newPin) {
  need_(token, 'admin');
  if (!checkPin_('admin', str_(currentAdminPin))) throw new Error('বর্তমান অ্যাডমিন পিন সঠিক নয়।');
  newPin = str_(newPin);
  if (kind === 'user' && !/^\d{4}$/.test(newPin)) throw new Error('ইউজার পিন ৪ ডিজিটের হতে হবে।');
  if (kind === 'admin' && !/^\d{4,8}$/.test(newPin)) throw new Error('অ্যাডমিন পিন ৪-৮ ডিজিটের হতে হবে।');
  if (kind === 'user' && checkPin_('admin', newPin)) throw new Error('ইউজার পিন ও অ্যাডমিন পিন একই হতে পারবে না।');
  if (kind === 'admin' && checkPin_('user', newPin)) throw new Error('ইউজার পিন ও অ্যাডমিন পিন একই হতে পারবে না।');
  withLock_(function () {
    writeSetting_(kind === 'admin' ? 'admin_pin_hash' : 'user_pin_hash', sha256Hex_(newPin));
    if (kind === 'admin') writeSetting_('admin_pin_len', String(newPin.length));
  });
  log_('', 'PIN Changed', 'Admin', kind);
  return true;
}

function resetPinsToDefault() {
  writeSetting_('admin_pin_hash', '');
  writeSetting_('user_pin_hash', '');
  writeSetting_('admin_pin_len', '4');
  return 'PIN reset: user 2019, admin 2026';
}

function getActivityLog(token, limit) {
  need_(token);
  var all = readTable_(APP.SH_LOG);
  var nos = {};
  readTable_(APP.SH_VOU).forEach(function (v) { if (str_(v.VoucherNo)) nos[str_(v.VoucherID)] = str_(v.VoucherNo); });
  return all.slice(-1 * (limit || 500)).reverse().map(function (l) {
    return { time: str_(l.Time), voucherId: str_(l.VoucherID), voucherNo: nos[str_(l.VoucherID)] || '', action: str_(l.Action), by: str_(l.By), note: str_(l.Note), before: str_(l.Before), after: str_(l.After) };
  });
}

/* ---------------------------------------------------------------------
 *  BACKUP / RESTORE / RESET  (Google Drive folder: "SCS Daily Expense Backups")
 * ------------------------------------------------------------------- */
var BK_FOLDER = 'SCS Daily Expense Backups';

function backupFolder_() {
  var id = getSetting_('backup_folder_id', '');
  if (id) { try { var f = DriveApp.getFolderById(id); if (!f.isTrashed()) return f; } catch (e) {} }
  var it = DriveApp.getFoldersByName(BK_FOLDER);
  var folder = it.hasNext() ? it.next() : DriveApp.createFolder(BK_FOLDER);
  writeSetting_('backup_folder_id', folder.getId());
  return folder;
}

/** সব শিটের পুরো ডাটা (A to Z) */
function snapshot_() {
  var ss = getHome_();
  var out = { app: APP.NAME, version: 1, createdAt: now_(), spreadsheet: ss.getName(), sheets: {} };
  Object.keys(HEAD).forEach(function (n) {
    var sh = sheet_(n), lr = sh.getLastRow(), lc = sh.getLastColumn();
    out.sheets[n] = (lr && lc) ? sh.getRange(1, 1, lr, lc).getDisplayValues() : [HEAD[n]];
  });
  return out;
}

function snapCounts_(snap) {
  var c = {};
  Object.keys(snap.sheets).forEach(function (n) { c[n] = Math.max(0, snap.sheets[n].length - 1); });
  return c;
}

function makeBackup_(kind) {
  var snap = snapshot_();
  var stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd_HH-mm-ss');
  var name = 'SCS_Expense_Backup_' + stamp + '_' + kind + '.json';
  var file = backupFolder_().createFile(Utilities.newBlob(JSON.stringify(snap), 'application/json', name));
  writeSetting_('last_backup', now_());
  pruneBackups_();
  var c = snapCounts_(snap);
  log_('', 'Backup Created', kind === 'auto' ? 'System' : 'Admin', name, '',
    'Vouchers: ' + c.Expense_Vouchers + ' • Items: ' + c.Expense_Items + ' • Employees: ' + c.Employees + ' • Settings: ' + c.App_Settings + ' • Log: ' + c.Activity_Log);
  return { id: file.getId(), name: name };
}

function listBackups_() {
  var it = backupFolder_().getFiles(), out = [];
  while (it.hasNext()) {
    var f = it.next();
    if (!/\.json$/i.test(f.getName())) continue;
    out.push({ id: f.getId(), name: f.getName(), size: f.getSize(), url: f.getUrl(),
      time: Utilities.formatDate(f.getDateCreated(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss') });
  }
  return out.sort(function (a, b) { return a.time < b.time ? 1 : a.time > b.time ? -1 : 0; });
}

function pruneBackups_() {
  var keep = num_(getSetting_('backup_keep', '30')) || 30;
  listBackups_().slice(keep).forEach(function (b) { try { DriveApp.getFileById(b.id).setTrashed(true); } catch (e) {} });
}

function minutesSince_(t) {
  t = str_(t); if (!t) return 1e9;
  var m = t.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})/); if (!m) return 1e9;
  var d = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
  return (Date.now() - d.getTime()) / 60000;
}
var RESET_WINDOW_MIN = 60;
function resetReady_() {
  return Math.min(minutesSince_(getSetting_('last_backup', '')), minutesSince_(getSetting_('last_download', ''))) <= RESET_WINDOW_MIN;
}
function setBackupFolder(token, link) {
  need_(token, 'admin');
  link = str_(link);
  var m = link.match(/folders\/([\w-]{10,})/) || link.match(/[?&]id=([\w-]{10,})/) || link.match(/^([\w-]{20,})$/);
  if (!m) throw new Error('সঠিক Google Drive ফোল্ডারের লিংক দিন।');
  var f;
  try { f = DriveApp.getFolderById(m[1]); f.getName(); } catch (e) { throw new Error('এই ফোল্ডার খোলা যাচ্ছে না। লিংক ঠিক আছে কিনা ও আপনার এক্সেস আছে কিনা দেখুন।'); }
  var old = getSetting_('backup_folder_id', '');
  writeSetting_('backup_folder_id', m[1]);
  log_('', 'Backup Folder Changed', 'Admin', f.getName(), old, m[1]);
  return getBackupInfo(token);
}
function getBackupInfo(token) {
  need_(token, 'admin');
  var folder = backupFolder_();
  return { folderName: folder.getName ? folder.getName() : BK_FOLDER, lastDownload: getSetting_('last_download', ''), resetReady: resetReady_(), resetWindow: RESET_WINDOW_MIN, files: listBackups_(), freq: getSetting_('backup_freq', 'off'), hour: num_(getSetting_('backup_hour', '23')),
    keep: num_(getSetting_('backup_keep', '30')) || 30, last: getSetting_('last_backup', ''), folderUrl: folder.getUrl() };
}

function backupNow(token) {
  need_(token, 'admin');
  withLock_(function () { makeBackup_('manual'); });
  return getBackupInfo(token);
}

/** কম্পিউটারে ডাউনলোডের জন্য পুরো ব্যাকআপ JSON */
function downloadBackupData(token) {
  need_(token, 'admin');
  var txt = JSON.stringify(snapshot_());
  writeSetting_('last_download', now_());
  log_('', 'Backup Downloaded (JSON)', 'Admin', '', '', Math.round(txt.length / 1024) + ' KB');
  return txt;
}

function writeSheetRows_(name, rows) {
  var sh = sheet_(name);
  var w = 0;
  rows.forEach(function (r) { w = Math.max(w, r.length); });
  memoClear_(name);
  sh.clearContents();
  if (rows.length && w) {
    var data = rows.map(function (r) { var a = r.map(function (c) { return c === null || c === undefined ? '' : String(c); }); while (a.length < w) a.push(''); return a; });
    sh.getRange(1, 1, data.length, w).setNumberFormat('@').setValues(data);
    sh.getRange(1, 1, 1, w).setFontWeight('bold').setBackground('#1e293b').setFontColor('#ffffff');
  }
  ensureSheet_(getHome_(), name, HEAD[name]);
}

/** ব্যাকআপ থেকে রিস্টোর। src = {fileId} (Drive) অথবা {json} (কম্পিউটার থেকে আপলোড) */
function restoreBackup(token, pin, src) {
  need_(token, 'admin');
  if (!checkPin_('admin', str_(pin))) throw new Error('ভুল অ্যাডমিন পিন! রিস্টোর হয়নি।');
  src = src || {};
  var text = src.fileId ? DriveApp.getFileById(str_(src.fileId)).getBlob().getDataAsString() : String(src.json || '');
  var data;
  try { data = JSON.parse(text); } catch (e) { throw new Error('ব্যাকআপ ফাইলটি সঠিক নয় (JSON পড়া যায়নি)।'); }
  if (!data || !data.sheets || !data.sheets.Expense_Vouchers) throw new Error('এটি SCS Daily Expense-এর ব্যাকআপ ফাইল নয়।');
  return withLock_(function () {
    var safety = makeBackup_('before-restore');
    Object.keys(HEAD).forEach(function (n) { if (data.sheets[n]) writeSheetRows_(n, data.sheets[n]); });
    var c = snapCounts_(data);
    log_('', 'Backup Restored', 'Admin', (src.fileId ? 'Drive file' : 'Uploaded file') + ' • created ' + str_(data.createdAt), 'Safety backup: ' + safety.name,
      'Vouchers: ' + c.Expense_Vouchers + ' • Items: ' + c.Expense_Items + ' • Employees: ' + c.Employees);
    return c;
  });
}

/** রিসেট। scope = 'expenses' (সব খরচ ও ভাউচার) অথবা 'all' (সবকিছু, পিনসহ ডিফল্টে) */
function resetData(token, pin, scope) {
  need_(token, 'admin');
  if (!checkPin_('admin', str_(pin))) throw new Error('ভুল অ্যাডমিন পিন! রিসেট হয়নি।');
  if (!resetReady_()) throw new Error('রিসেটের আগে পুরো ডাটার ব্যাকআপ নিন (Google Drive-এ বা JSON ডাউনলোড)। ব্যাকআপের ' + RESET_WINDOW_MIN + ' মিনিটের মধ্যে রিসেট করা যায়।');
  return withLock_(function () {
    var safety = makeBackup_('before-reset');
    var keepSet = {};
    if (scope === 'all') {
      ['backup_folder_id', 'backup_freq', 'backup_hour', 'backup_keep', 'last_backup', 'last_download'].forEach(function (k) { var v = getSetting_(k, ''); if (v) keepSet[k] = v; });
      [APP.SH_VOU, APP.SH_ITEM, APP.SH_EMP, APP.SH_SET, APP.SH_LOG].forEach(function (n) { writeSheetRows_(n, [HEAD[n]]); });
      Object.keys(keepSet).forEach(function (k) { writeSetting_(k, keepSet[k]); });
    } else {
      [APP.SH_VOU, APP.SH_ITEM].forEach(function (n) { writeSheetRows_(n, [HEAD[n]]); });
      writeSetting_('voucher_seq', '0');
    }
    log_('', scope === 'all' ? 'Full Reset' : 'Expenses Reset', 'Admin', 'Safety backup: ' + safety.name, '', '');
    return true;
  });
}

/** নির্দিষ্ট সময় পর পর Google Drive-এ অটো ব্যাকআপ। freq = off | 6h | daily | weekly */
function setAutoBackup(token, freq, hour, keep) {
  need_(token, 'admin');
  freq = ['off', '6h', 'daily', 'weekly'].indexOf(freq) >= 0 ? freq : 'off';
  hour = Math.max(0, Math.min(23, parseInt(hour, 10) || 0));
  keep = Math.max(3, Math.min(365, parseInt(keep, 10) || 30));
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'runAutoBackup') ScriptApp.deleteTrigger(t); });
  if (freq === '6h') ScriptApp.newTrigger('runAutoBackup').timeBased().everyHours(6).create();
  if (freq === 'daily') ScriptApp.newTrigger('runAutoBackup').timeBased().everyDays(1).atHour(hour).create();
  if (freq === 'weekly') ScriptApp.newTrigger('runAutoBackup').timeBased().everyDays(7).atHour(hour).create();
  var old = getSetting_('backup_freq', 'off') + ' @' + getSetting_('backup_hour', '23') + 'h keep ' + getSetting_('backup_keep', '30');
  writeSetting_('backup_freq', freq); writeSetting_('backup_hour', String(hour)); writeSetting_('backup_keep', String(keep));
  log_('', 'Auto Backup Changed', 'Admin', '', old, freq + ' @' + hour + 'h keep ' + keep);
  pruneBackups_();
  return getBackupInfo(token);
}

/* ---------------------------------------------------------------------
 *  IMPORT OLD DATA (পুরনো শিটের ডাটা)
 *  opt = { empId, status: 'Approved'|'Submitted', group: 'row'|'date', rows: [{sl, date:'yyyy-MM-dd', desc, amount}] }
 * ------------------------------------------------------------------- */
function appendObjs_(name, objs) {
  if (!objs.length) return;
  delete _TBL[name];
  var sh = sheet_(name), hm = headMap_(sh);
  var data = objs.map(function (o) { return hm.head.map(function (k) { return o[k] === undefined || o[k] === null ? '' : String(o[k]); }); });
  sh.getRange(sh.getLastRow() + 1, 1, data.length, hm.len).setNumberFormat('@').setValues(data);
}

function importLegacy(token, pin, opt) {
  need_(token, 'admin');
  if (!checkPin_('admin', str_(pin))) throw new Error('ভুল অ্যাডমিন পিন! ইমপোর্ট হয়নি।');
  opt = opt || {};
  var rows = opt.rows || [];
  if (!rows.length) throw new Error('ইমপোর্ট করার মতো কোনো সারি নেই।');
  if (rows.length > 5000) throw new Error('একবারে সর্বোচ্চ ৫০০০ সারি ইমপোর্ট করা যায়।');
  var emp = null;
  readTable_(APP.SH_EMP).forEach(function (e) { if (str_(e.EmpID) === str_(opt.empId)) emp = e; });
  if (!emp) throw new Error('কোন এমপ্লয়ির নামে ইমপোর্ট হবে সেটা বাছুন।');
  var approved = opt.status !== 'Submitted';
  var byDate = opt.group === 'date';
  rows.forEach(function (r, i) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(str_(r.date))) throw new Error('সারি ' + (i + 1) + ': তারিখ ঠিক নেই।');
    if (!(num_(r.amount) > 0)) throw new Error('সারি ' + (i + 1) + ': টাকার পরিমাণ ঠিক নেই।');
  });
  return withLock_(function () {
    var existing = readTable_(APP.SH_VOU), ids = {}, nos = {};
    existing.forEach(function (v) { ids[str_(v.VoucherID)] = 1; if (str_(v.VoucherNo)) nos[str_(v.VoucherNo)] = num_(v.Total); });
    var groups = {}, order = [];
    rows.forEach(function (r, i) {
      var sl = str_(r.sl) || String(i + 1);
      var key = byDate ? r.date : r.date + '#' + sl + '#' + i;
      if (!groups[key]) { groups[key] = { date: r.date, sl: sl, items: [] }; order.push(key); }
      groups[key].items.push(r);
    });
    var stamp = now_(), vouchers = [], items = [], skipped = 0, total = 0, seq = 0;
    order.forEach(function (key) {
      var g = groups[key], d8 = g.date.replace(/-/g, '');
      var gTotal = 0; g.items.forEach(function (r) { gTotal += num_(r.amount); });
      gTotal = Math.round(gTotal * 100) / 100;
      var no = 'OLD-' + d8 + '-' + (byDate ? str_(emp.EmpID) : (g.sl.length < 2 ? '0' + g.sl : g.sl));
      if (nos[no] !== undefined && Math.abs(nos[no] - gTotal) < 0.01) { skipped++; return; }   // আগেই ইমপোর্ট হয়েছে
      var n2 = 2, base = no; while (nos[no] !== undefined) { no = base + '-' + n2; n2++; }
      nos[no] = gTotal;
      var id = 'OLD-' + d8 + '-' + str_(emp.EmpID).replace(/[^A-Za-z0-9]/g, '') + '-' + (no.split('-').slice(2).join('-'));
      while (ids[id]) { id = id + 'x'; }
      ids[id] = 1;
      vouchers.push({
        VoucherID: id, Date: g.date, EmpID: str_(emp.EmpID), EmpName: str_(emp.Name), Designation: str_(emp.Designation),
        Status: approved ? 'Approved' : 'Submitted', Total: gTotal, ItemCount: g.items.length,
        CreatedAt: stamp, UpdatedAt: stamp, SubmittedAt: g.date + ' 00:00:00', SubmitCount: 1, Title: 'Old data', VoucherNo: no,
        ApprovedAt: approved ? stamp : '', ApprovedBy: approved ? 'Imported (old data)' : '',
        Appr1At: approved ? stamp : '', Appr2At: approved ? stamp : '', AdminNote: 'Imported from old sheet'
      });
      g.items.forEach(function (r) {
        seq++;
        items.push({ ItemID: 'IT-' + Utilities.getUuid().slice(0, 8).toUpperCase(), VoucherID: id, Date: g.date, EmpID: str_(emp.EmpID),
          Description: str_(r.desc) || 'Total Cost', Amount: num_(r.amount), CreatedAt: stamp + '.' + ('0000' + seq).slice(-5), UpdatedAt: stamp, EditedBy: 'Import' });
      });
      total += gTotal;
    });
    appendObjs_(APP.SH_VOU, vouchers);
    appendObjs_(APP.SH_ITEM, items);
    log_('', 'Old Data Imported', 'Admin', str_(emp.Name) + ' • ' + (approved ? 'Approved' : 'Pending') + ' • ' + (byDate ? 'one voucher per date' : 'one voucher per row'), '',
      'Vouchers: ' + vouchers.length + ' • Rows: ' + items.length + ' • Total: ' + Math.round(total * 100) / 100 + ' • Skipped (already imported): ' + skipped);
    return { vouchers: vouchers.length, items: items.length, skipped: skipped, total: Math.round(total * 100) / 100 };
  });
}

/** টাইম-ট্রিগার থেকে চলে (অটো ব্যাকআপ) */
function runAutoBackup() {
  withLock_(function () { makeBackup_('auto'); });
}

/** অনুমতি দেওয়ার জন্য একবার এডিটর থেকে চালান */
function authorizeAll() {
  setupDatabase();
  backupFolder_();
  ScriptApp.getProjectTriggers();
  return 'Authorized: ' + getHome_().getName();
}
