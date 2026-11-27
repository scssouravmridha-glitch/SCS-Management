/* =====================================================================
 *  SCS Apps Script Runtime — Web Worker এর ভেতরে অ্যাপের আসল Code.gs চালায়
 *  Google এর SpreadsheetApp / PropertiesService / DriveApp / CacheService / LockService /
 *  Utilities / UrlFetchApp / MailApp / ScriptApp / HtmlService এর জায়গায় Supabase।
 *
 *  - প্রতিটা google.script.run কল = একটা "লেনদেন": যা যা লেখা হয় শেষে একসাথে gas_commit() এ যায়
 *  - অন্য কেউ মাঝখানে একই শিট বদলালে নতুন ডাটা নিয়ে কাজটা আবার চলে (সর্বোচ্চ ৩ বার)
 *  - প্রতিটা পরিবর্তন Activity Log এ যায় (কোন শিটের কোন রো, আগে/পরে)
 * ===================================================================== */
/* eslint-disable no-unused-vars */
'use strict';

var CFG = null;            // { url, anon, token, app, appName, user:{id,email,name}, role, adminPin, tz, api, site, store }
var STORE = null;          // supabase বা memory
var TX = null;             // চলমান লেনদেন
var WORKER_ID = 'w' + Math.random().toString(36).slice(2) + Date.now().toString(36);

/* ------------------------------------------------------------------ helpers */
function isEmpty(v) { return v === '' || v === null || v === undefined; }
function cloneVal(v) { return v instanceof Date ? new Date(v.getTime()) : v; }
function encVal(v) { return v instanceof Date ? { $d: isNaN(v.getTime()) ? null : v.toISOString() } : (v === undefined || v === null ? '' : v); }
function decVal(v) { return v && typeof v === 'object' && '$d' in v ? (v.$d ? new Date(v.$d) : '') : (v === null || v === undefined ? '' : v); }
function decRows(data) { return (data || []).map(function (r) { return Array.isArray(r) ? r.map(decVal) : []; }); }
function encRows(rows) {
  // শেষের ফাঁকা রো/কলাম বাদ দিয়ে ছোট করে রাখা
  var out = [], last = -1;
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i] || [], end = r.length - 1;
    while (end >= 0 && isEmpty(r[end])) end--;
    var e = [];
    for (var j = 0; j <= end; j++) e.push(encVal(r[j]));
    out.push(e);
    if (end >= 0) last = i;
  }
  return out.slice(0, last + 1);
}
function gasError(msg) { var e = new Error(msg); return e; }
/** অজানা মেথড ডাকলে ভাঙবে না (ফরম্যাটিং ইত্যাদি) — নিজেকেই ফেরত দেয় */
function chainable(obj) {
  if (typeof Proxy === 'undefined') return obj;
  return new Proxy(obj, {
    get: function (t, k) {
      if (k in t) return t[k];
      if (typeof k === 'symbol' || k === 'then' || k === 'toJSON') return undefined;
      if (/^(get|is|has|can)[A-Z]/.test(k)) return function () { return null; };
      return function () { return t.__self || t; };
    }
  });
}

/* ------------------------------------------------------------------ sync HTTP (worker এ অনুমোদিত) */
function http(method, url, body, headers, binary) {
  var x = new XMLHttpRequest();
  x.open(method, url, false);
  if (binary) x.responseType = 'arraybuffer';
  Object.keys(headers || {}).forEach(function (k) { x.setRequestHeader(k, headers[k]); });
  x.send(body === undefined || body === null ? null : body);
  return { status: x.status, text: binary ? '' : x.responseText, buf: binary ? x.response : null };
}

/* ------------------------------------------------------------------ STORE: Supabase */
function SupabaseStore() {
  var A = this;
  function H(extra) {
    var h = { apikey: CFG.anon, 'Content-Type': 'application/json' };
    if (CFG.token) h.Authorization = 'Bearer ' + CFG.token;
    Object.keys(extra || {}).forEach(function (k) { h[k] = extra[k]; });
    return h;
  }
  function rest(method, path, body, prefer) {
    var r = http(method, CFG.url + path, body === undefined ? null : JSON.stringify(body), H(prefer ? { Prefer: prefer } : null));
    var j = null; try { j = r.text ? JSON.parse(r.text) : null; } catch (e) { j = r.text; }
    if (r.status < 200 || r.status >= 300) {
      var m = (j && (j.message || j.msg || j.error_description || j.error)) || ('Server error ' + r.status);
      var err = gasError(String(m)); err.status = r.status; throw err;
    }
    return j;
  }
  var app = function (a) { return encodeURIComponent(a || CFG.app); };
  A.listSheets = function (a) { return rest('GET', '/rest/v1/gas_sheets?app_key=eq.' + app(a) + '&select=name,idx,version&order=idx.asc,name.asc') || []; };
  A.loadSheet = function (a, name) {
    var rows = rest('GET', '/rest/v1/gas_sheets?app_key=eq.' + app(a) + '&name=eq.' + encodeURIComponent(name) + '&select=name,idx,version,data,meta');
    return rows && rows[0] ? rows[0] : null;
  };
  A.loadProps = function () { return rest('GET', '/rest/v1/gas_props?app_key=eq.' + app() + '&select=scope,key,value') || []; };
  A.commit = function (a, sheets, props, audit) {
    var body = { p_app: a, p_sheets: sheets, p_props: props, p_audit: audit };
    if (a !== CFG.app) body.p_via = CFG.app;   // অন্য অ্যাপে লেখা (লিংক)
    try { return rest('POST', '/rest/v1/rpc/gas_commit', body); }
    catch (e) { if (/SCS_CONFLICT/.test(e.message)) { var c = gasError('SCS_CONFLICT'); c.conflict = true; throw c; } throw e; }
  };
  A.lock = function (waitMs) { return rest('POST', '/rest/v1/rpc/gas_lock', { p_app: CFG.app, p_holder: WORKER_ID, p_wait_ms: waitMs || 10000, p_ttl_ms: 60000 }) === true; };
  A.unlock = function () { try { rest('POST', '/rest/v1/rpc/gas_unlock', { p_app: CFG.app, p_holder: WORKER_ID }); } catch (e) {} };
  A.alias = function (id) { var r = rest('GET', '/rest/v1/gas_aliases?sheet_id=eq.' + encodeURIComponent(id) + '&select=app_key'); return r && r[0] ? r[0].app_key : null; };
  /* files */
  A.fileGet = function (id) { var r = rest('GET', '/rest/v1/gas_files?app_key=eq.' + app() + '&id=eq.' + encodeURIComponent(id) + '&select=*'); return r && r[0] ? r[0] : null; };
  A.fileList = function (q) {
    var p = '/rest/v1/gas_files?app_key=eq.' + app() + '&trashed=eq.false&select=*&order=created_at.desc&limit=2000';
    if (q.parent !== undefined) p += '&parent_id=eq.' + encodeURIComponent(q.parent);
    if (q.folder !== undefined) p += '&is_folder=eq.' + (q.folder ? 'true' : 'false');
    if (q.name !== undefined) p += '&name=eq.' + encodeURIComponent(q.name);
    if (q.nameLike !== undefined) p += '&name=ilike.*' + encodeURIComponent(q.nameLike) + '*';
    return rest('GET', p) || [];
  };
  A.fileSave = function (row) { return rest('POST', '/rest/v1/gas_files?on_conflict=id', row, 'resolution=merge-duplicates,return=representation')[0]; };
  A.fileUpload = function (path, bytes, mime) {
    var r = http('POST', CFG.url + '/storage/v1/object/scs-files/' + path, bytes, { apikey: CFG.anon, Authorization: 'Bearer ' + CFG.token, 'Content-Type': mime || 'application/octet-stream', 'x-upsert': 'true' });
    if (r.status < 200 || r.status >= 300) throw gasError('File upload failed (' + r.status + '): ' + r.text.slice(0, 200));
  };
  A.fileDownload = function (path) {
    var r = http('GET', CFG.url + '/storage/v1/object/authenticated/scs-files/' + path, null, { apikey: CFG.anon, Authorization: 'Bearer ' + CFG.token }, true);
    if (r.status < 200 || r.status >= 300) throw gasError('File download failed (' + r.status + ')');
    return new Uint8Array(r.buf);
  };
  /* server functions (UrlFetch proxy, mail) */
  A.api = function (fn, body) {
    var r = http('POST', CFG.api + '?fn=' + fn, JSON.stringify(body), H());
    var j = null; try { j = JSON.parse(r.text); } catch (e) {}
    if (r.status < 200 || r.status >= 300) throw gasError((j && j.error) || ('Server error ' + r.status));
    return j;
  };
  /* SCS অ্যাকাউন্ট তথ্য (এমপ্লয়ি অটো-সিঙ্কের জন্য) */
  A.rest = rest;
}

/* ------------------------------------------------------------------ STORE: memory (লোকাল পরীক্ষার জন্য) */
function MemoryStore(seed) {
  var A = this, sheets = {}, props = {}, files = {}, blobs = {};
  // শিট: 'app|name' (অন্য অ্যাপের লিংক পরীক্ষার জন্যও)
  (seed && seed.sheets || []).forEach(function (s) { var a = s.app || CFG.app; sheets[a + '|' + s.name] = { name: s.name, idx: s.idx || 0, version: 1, data: s.data || [], meta: {} }; });
  (seed && seed.props || []).forEach(function (p) { props[p.scope + '|' + p.key] = p; });
  A.listSheets = function (a) { var pre = (a || CFG.app) + '|'; return Object.keys(sheets).filter(function (k) { return k.indexOf(pre) === 0; }).map(function (k) { return { name: sheets[k].name, idx: sheets[k].idx, version: sheets[k].version }; }).sort(function (x, y) { return x.idx - y.idx; }); };
  A.loadSheet = function (a, n) { var s = sheets[(a || CFG.app) + '|' + n]; return s ? JSON.parse(JSON.stringify(s)) : null; };
  A.loadProps = function () { return Object.keys(props).map(function (k) { return props[k]; }); };
  A.commit = function (a, ss, pp, audit) {
    ss.forEach(function (s) { var cur = sheets[a + '|' + s.name] ? sheets[a + '|' + s.name].version : 0; if (cur !== (s.base || 0)) { var c = gasError('SCS_CONFLICT'); c.conflict = true; throw c; } });
    var out = {};
    ss.forEach(function (s) {
      var k = a + '|' + s.name;
      if (s.deleted) { delete sheets[k]; return; }
      var cur = sheets[k];
      sheets[k] = { name: s.name, idx: s.idx != null ? s.idx : (cur ? cur.idx : 0), version: (cur ? cur.version : 0) + 1, data: s.data, meta: s.meta || {} };
      out[s.name] = sheets[k].version;
    });
    pp.forEach(function (p) { var k = p.scope + '|' + p.key; if (p.value === null) delete props[k]; else props[k] = { scope: p.scope, key: p.key, value: p.value }; });
    (self.__AUDIT = self.__AUDIT || []).push.apply(self.__AUDIT, audit);
    return out;
  };
  A.lock = function () { return true; };
  A.unlock = function () {};
  A.alias = function () { return null; };
  A.fileGet = function (id) { return files[id] || null; };
  A.fileList = function (q) {
    return Object.keys(files).map(function (k) { return files[k]; }).filter(function (f) {
      return !f.trashed && (q.parent === undefined || f.parent_id === q.parent) && (q.folder === undefined || f.is_folder === q.folder) &&
        (q.name === undefined || f.name === q.name) && (q.nameLike === undefined || f.name.toLowerCase().indexOf(q.nameLike.toLowerCase()) > -1);
    });
  };
  A.fileSave = function (row) { files[row.id] = Object.assign({}, files[row.id] || {}, row); return files[row.id]; };
  A.fileUpload = function (path, bytes) { blobs[path] = bytes; };
  A.fileDownload = function (path) { if (!blobs[path]) throw gasError('File not found'); return blobs[path]; };
  A.api = function (fn) { throw gasError('Server function "' + fn + '" is not available in test mode'); };
  A.dump = function () { return { sheets: sheets, props: props, files: files }; };
}

/* ------------------------------------------------------------------ লেনদেন (transaction) */
var SHEET_CACHE = {};   // name -> { version, idx, rows, meta }
var PROP_CACHE = null;  // { 'scope|key': value }
var MEM_CACHE = {};     // CacheService

function newTx() {
  return { apps: {}, props: null, propDirty: {}, locked: false };
}
/** লেনদেনে একটা অ্যাপের অংশ (নিজের অ্যাপ বা লিংক করা অ্যাপ) */
function txA(app) {
  app = app || CFG.app;
  return TX.apps[app] || (TX.apps[app] = { list: null, sheets: {}, deleted: {} });
}
function txList(app) {
  var A = txA(app);
  if (!A.list) {
    A.list = {};
    STORE.listSheets(app || CFG.app).forEach(function (s) { A.list[s.name] = { version: s.version, idx: s.idx }; });
  }
  return A.list;
}
/** লেনদেনের ভেতরে একটা শিটের ডাটা (প্রথমবার ডাটাবেস/ক্যাশ থেকে) */
function txSheet(app, name) {
  app = app || CFG.app;
  var A = txA(app);
  if (A.sheets[name]) return A.sheets[name];
  if (A.deleted[name]) return null;
  var info = txList(app)[name];
  if (!info) return null;
  var ck = app + '|' + name, c = SHEET_CACHE[ck];
  if (!c || c.version !== info.version) {
    var row = STORE.loadSheet(app, name);
    if (!row) return null;
    c = SHEET_CACHE[ck] = { version: row.version, idx: row.idx, rows: decRows(row.data), meta: row.meta || {} };
  }
  var s = { app: app, name: name, base: c.version, idx: c.idx, rows: c.rows, meta: c.meta, dirty: false, owned: false, orig: c.rows };
  A.sheets[name] = s;
  return s;
}
/** লেখার আগে নিজের কপি (ক্যাশ নষ্ট হয় না) */
function own(s) {
  if (!s.owned) { s.rows = s.rows.map(function (r) { return (r || []).slice(); }); s.owned = true; }
  s.dirty = true;
  return s;
}
function txCreateSheet(app, name, idx) {
  app = app || CFG.app;
  var A = txA(app), list = txList(app);
  var s = { app: app, name: name, base: list[name] ? list[name].version : 0, idx: idx != null ? idx : Object.keys(list).length, rows: [], meta: {}, dirty: true, owned: true, orig: [], isNew: true };
  if (A.deleted[name]) { s.base = A.deleted[name]; delete A.deleted[name]; }
  A.sheets[name] = s;
  list[name] = { version: s.base, idx: s.idx };
  return s;
}
function txProps() {
  if (!TX.props) {
    TX.props = {};
    STORE.loadProps().forEach(function (p) { TX.props[p.scope + '|' + p.key] = p.value; });
  }
  return TX.props;
}

/* ------------------------------------------------------------------ Activity Log: শিটের কোন রো বদলেছে */
var KEY_RX = /^(id|.*\b(id|no|code|key)\b.*|.*(?:_id|Id|ID|No)$)$/i;
function rowObj(header, r) {
  var o = {};
  header.forEach(function (h, i) { var v = r[i]; if (!isEmpty(v)) o[String(h || ('col' + (i + 1)))] = v instanceof Date ? v.toISOString() : v; });
  return o;
}
function auditFor(s) {
  var oldR = s.orig || [], newR = s.rows || [];
  var header = (newR[0] && newR[0].length ? newR[0] : oldR[0]) || [];
  var named = header.filter(function (h) { return typeof h === 'string' && h.trim() && !/^\d/.test(h); }).length;
  var out = [];
  if (s.isNew && !oldR.length) out.push({ sheet: s.name, entity: s.name, ref: s.name, action: 'Add', before: null, after: { rows: newR.length } });
  if (named < 2 || newR.length > 20000) {
    if (JSON.stringify(encRows(oldR)) !== JSON.stringify(encRows(newR))) out.push({ sheet: s.name, entity: s.name, ref: s.name, action: 'Edit', before: { rows: oldR.length }, after: { rows: newR.length } });
    return out;
  }
  var keyIdx = 0;
  for (var i = 0; i < header.length; i++) if (KEY_RX.test(String(header[i] || '').trim())) { keyIdx = i; break; }
  function mapOf(rows) {
    var m = {}, order = [];
    for (var i = 1; i < rows.length; i++) {
      var r = rows[i] || [];
      if (!r.some(function (v) { return !isEmpty(v); })) continue;
      var k = isEmpty(r[keyIdx]) ? '#' + i : String(r[keyIdx] instanceof Date ? r[keyIdx].toISOString() : r[keyIdx]);
      while (m[k]) k += '′';
      m[k] = r; order.push(k);
    }
    return { m: m, order: order };
  }
  var a = mapOf(oldR), b = mapOf(newR);
  b.order.forEach(function (k) {
    var nr = b.m[k], or = a.m[k], no = rowObj(header, nr);
    if (!or) { out.push({ sheet: s.name, entity: s.name, ref: k, action: 'Add', before: null, after: no }); return; }
    var oo = rowObj(header, or), fields = [];
    Object.keys(Object.assign({}, oo, no)).forEach(function (f) { if (JSON.stringify(oo[f]) !== JSON.stringify(no[f])) fields.push(f); });
    if (fields.length) out.push({ sheet: s.name, entity: s.name, ref: k, action: 'Edit', before: oo, after: no, fields: fields });
  });
  a.order.forEach(function (k) { if (!b.m[k]) out.push({ sheet: s.name, entity: s.name, ref: k, action: 'Delete', before: rowObj(header, a.m[k]), after: null }); });
  if (out.length > 150) {
    var n = out.length;
    out = out.slice(0, 100);
    out.push({ sheet: s.name, entity: s.name, ref: s.name, action: 'Edit', before: null, after: { note: (n - 100) + ' more row changes (bulk update)' } });
  }
  return out;
}

function txCommit() {
  // আগে লিংক করা অন্য অ্যাপ (যেমন Attendance -> Report সামারি), তারপর নিজের অ্যাপ
  Object.keys(TX.apps).forEach(function (a) { if (a !== CFG.app) commitApp(a); });
  commitApp(CFG.app);
}
function commitApp(app) {
  var A = txA(app), own_ = app === CFG.app;
  var sheets = [], audit = [];
  Object.keys(A.sheets).forEach(function (n) {
    var s = A.sheets[n];
    if (!s.dirty) return;
    sheets.push({ name: n, base: s.base, idx: s.idx, data: encRows(s.rows), meta: s.meta });
    try { audit = audit.concat(auditFor(s)); } catch (e) {}
  });
  Object.keys(A.deleted).forEach(function (n) {
    sheets.push({ name: n, base: A.deleted[n], deleted: true });
    audit.push({ sheet: n, entity: n, ref: n, action: 'Delete', before: { sheet: n }, after: null });
  });
  if (!own_) {
    if (!sheets.length) return;
    var r0 = STORE.commit(app, sheets, [], audit) || {};
    sheets.forEach(function (s) { if (s.deleted) delete SHEET_CACHE[app + '|' + s.name]; else { var t = A.sheets[s.name]; SHEET_CACHE[app + '|' + s.name] = { version: r0[s.name] || (s.base + 1), idx: t.idx, rows: t.rows, meta: t.meta }; } });
    return;
  }
  var props = Object.keys(TX.propDirty).map(function (k) {
    var i = k.indexOf('|');
    var key = k.slice(i + 1), val = TX.props[k] === undefined ? null : TX.props[k];
    var secret = /(pin|pass|secret|token|api_?key|apikey|hash|otp|code)/i.test(key);
    // JSON সেটিং (যেমন SMS_CONFIG) অবজেক্ট হিসেবে যায় — ডাটাবেস ভেতরের apiKey/pin ইত্যাদি লুকায়
    if (!secret && val && /^[{[]/.test(val) && val.length < 20000) { try { var obj = JSON.parse(val); audit.push({ sheet: 'Settings', entity: 'Settings', ref: key, action: 'Edit', before: null, after: obj }); return { scope: k.slice(0, i), key: key, value: val }; } catch (e) {} }
    if (!/^__/.test(key)) audit.push({ sheet: 'Settings', entity: 'Settings', ref: key, action: val === null ? 'Delete' : 'Edit', before: null,
      after: { value: val === null ? null : secret ? '•••• (hidden)' : val.length > 300 ? '[' + val.length + ' chars]' : val } });
    return { scope: k.slice(0, i), key: key, value: val };
  });
  if (!sheets.length && !props.length) return;
  var res = STORE.commit(app, sheets, props, audit) || {};
  // সফল: ক্যাশ আপডেট
  sheets.forEach(function (s) {
    if (s.deleted) { delete SHEET_CACHE[app + '|' + s.name]; return; }
    var t = A.sheets[s.name];
    SHEET_CACHE[app + '|' + s.name] = { version: res[s.name] || (s.base + 1), idx: t.idx, rows: t.rows, meta: t.meta };
  });
  self.postMessage({ type: 'committed', sheets: sheets.map(function (s) { return s.name; }) });
}

/* ------------------------------------------------------------------ Range */
function colToNum(c) { var n = 0; c = c.toUpperCase(); for (var i = 0; i < c.length; i++) n = n * 26 + (c.charCodeAt(i) - 64); return n; }
function numToCol(n) { var s = ''; while (n > 0) { var m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; }
function parseA1(a1, sheet) {
  a1 = String(a1).replace(/^.*!/, '').replace(/\$/g, '').trim();
  var parts = a1.split(':');
  function cell(p) { var m = p.match(/^([A-Za-z]*)(\d*)$/); return { c: m && m[1] ? colToNum(m[1]) : null, r: m && m[2] ? Number(m[2]) : null }; }
  var a = cell(parts[0]), b = parts[1] ? cell(parts[1]) : a;
  var maxR = Math.max(sheet.getMaxRows(), 1), maxC = Math.max(sheet.getMaxColumns(), 1);
  var r1 = a.r || 1, c1 = a.c || 1, r2 = b.r || (parts[1] ? maxR : r1), c2 = b.c || (parts[1] ? maxC : c1);
  if (!a.r && !b.r) { r1 = 1; r2 = maxR; }
  if (!a.c && !b.c) { c1 = 1; c2 = maxC; }
  return [Math.min(r1, r2), Math.min(c1, c2), Math.abs(r2 - r1) + 1, Math.abs(c2 - c1) + 1];
}
function Range(sheet, r, c, nr, nc) {
  if (!(r >= 1) || !(c >= 1)) throw gasError('Range out of bounds (row ' + r + ', column ' + c + ')');
  this._s = sheet; this._r = r; this._c = c; this._nr = nr || 1; this._nc = nc || 1;
}
Range.prototype = {
  _d: function () { return txSheet(this._s._ss._app, this._s._name) || { rows: [] }; },
  getValues: function () {
    var rows = this._d().rows, out = [];
    for (var i = 0; i < this._nr; i++) {
      var src = rows[this._r - 1 + i] || [], row = [];
      for (var j = 0; j < this._nc; j++) { var v = src[this._c - 1 + j]; row.push(isEmpty(v) ? '' : cloneVal(v)); }
      out.push(row);
    }
    return out;
  },
  getValue: function () { var v = (this._d().rows[this._r - 1] || [])[this._c - 1]; return isEmpty(v) ? '' : cloneVal(v); },
  getDisplayValues: function () { return this.getValues().map(function (r) { return r.map(displayOf); }); },
  getDisplayValue: function () { return displayOf(this.getValue()); },
  getFormulas: function () { return this.getValues().map(function (r) { return r.map(function (v) { return typeof v === 'string' && v.charAt(0) === '=' ? v : ''; }); }); },
  getFormula: function () { var v = this.getValue(); return typeof v === 'string' && v.charAt(0) === '=' ? v : ''; },
  setValues: function (vals) {
    if (!Array.isArray(vals)) throw gasError('setValues: values must be a 2D array');
    var s = own(this._d());
    for (var i = 0; i < vals.length; i++) {
      var ri = this._r - 1 + i; s.rows[ri] = s.rows[ri] || [];
      var row = vals[i] || [];
      for (var j = 0; j < row.length; j++) s.rows[ri][this._c - 1 + j] = normIn(row[j]);
    }
    return this;
  },
  // Google Sheets এর মতো: merge করা রেঞ্জে মান থাকে শুধু প্রথম (উপরের-বাম) সেলে, বাকিগুলো ফাঁকা
  setValue: function (v) {
    var s = own(this._d()), ri = this._r - 1, m = this._merged;
    for (var i = 0; i < this._nr; i++) {
      s.rows[ri + i] = s.rows[ri + i] || [];
      for (var j = 0; j < this._nc; j++) {
        var anchor = m === 'all' ? (i === 0 && j === 0) : m === 'across' ? j === 0 : m === 'vertical' ? i === 0 : true;
        s.rows[ri + i][this._c - 1 + j] = anchor ? normIn(v) : '';
      }
    }
    return this;
  },
  merge: function () { this._merged = 'all'; return this.setValue(this.getValue()); },
  mergeAcross: function () { var v = this.getValues(); for (var i = 0; i < this._nr; i++) { var r = this.offset(i, 0, 1, this._nc); r._merged = 'all'; r.setValue(v[i][0]); } this._merged = 'across'; return this; },
  mergeVertically: function () { var v = this.getValues()[0]; for (var j = 0; j < this._nc; j++) { var r = this.offset(0, j, this._nr, 1); r._merged = 'all'; r.setValue(v[j]); } this._merged = 'vertical'; return this; },
  breakApart: function () { this._merged = null; return this; },
  setFormula: function (f) { return this.setValue(f); },
  setFormulas: function (f) { return this.setValues(f); },
  setFormulaR1C1: function (f) { return this.setValue(f); },
  clearContent: function () { var s = own(this._d()); for (var i = 0; i < this._nr; i++) { var r = s.rows[this._r - 1 + i]; if (r) for (var j = 0; j < this._nc; j++) r[this._c - 1 + j] = ''; } return this; },
  clear: function () { return this.clearContent(); },
  clearFormat: function () { return this; },
  deleteCells: function () { return this.clearContent(); },
  getRow: function () { return this._r; }, getColumn: function () { return this._c; },
  getRowIndex: function () { return this._r; }, getColumnIndex: function () { return this._c; },
  getNumRows: function () { return this._nr; }, getNumColumns: function () { return this._nc; },
  getLastRow: function () { return this._r + this._nr - 1; }, getLastColumn: function () { return this._c + this._nc - 1; },
  getHeight: function () { return this._nr; }, getWidth: function () { return this._nc; },
  getSheet: function () { return this._s; },
  getA1Notation: function () { var a = numToCol(this._c) + this._r; return this._nr === 1 && this._nc === 1 ? a : a + ':' + numToCol(this._c + this._nc - 1) + (this._r + this._nr - 1); },
  offset: function (r, c, nr, nc) { return new Range(this._s, this._r + r, this._c + c, nr || this._nr, nc || this._nc); },
  getCell: function (r, c) { return new Range(this._s, this._r + r - 1, this._c + c - 1, 1, 1); },
  isBlank: function () { return this.getValues().every(function (r) { return r.every(isEmpty); }); },
  getMergedRanges: function () { return []; },
  getDataValidation: function () { return null; },
  getBackground: function () { return '#ffffff'; }, getBackgrounds: function () { return this.getValues().map(function (r) { return r.map(function () { return '#ffffff'; }); }); },
  getNumberFormat: function () { return 'General'; }, getNote: function () { return ''; },
  sort: function (spec) {
    var vals = this.getValues(), specs = Array.isArray(spec) ? spec : [spec], c0 = this._c;
    specs = specs.map(function (x) { return typeof x === 'number' ? { column: x, ascending: true } : { column: x.column, ascending: x.ascending !== false }; });
    vals.sort(function (a, b) {
      for (var i = 0; i < specs.length; i++) {
        var k = specs[i].column - c0, x = a[k], y = b[k];
        if (x instanceof Date) x = x.getTime(); if (y instanceof Date) y = y.getTime();
        if (x === y) continue;
        if (isEmpty(x)) return 1; if (isEmpty(y)) return -1;
        var r = (typeof x === 'number' && typeof y === 'number') ? x - y : String(x).localeCompare(String(y));
        return specs[i].ascending ? r : -r;
      }
      return 0;
    });
    this.setValues(vals); return this;
  },
  createTextFinder: function (t) { return new TextFinder(this, t); },
  activate: function () { return this; }
};
function displayOf(v) {
  if (v instanceof Date) {
    var t = v.getHours() || v.getMinutes() || v.getSeconds();
    return fmtDate(v, CFG.tz, t ? 'M/d/yyyy H:mm:ss' : 'M/d/yyyy');
  }
  if (v === true) return 'TRUE'; if (v === false) return 'FALSE';
  return isEmpty(v) ? '' : String(v);
}
function normIn(v) { return v === undefined || v === null ? '' : (v instanceof Date ? new Date(v.getTime()) : v); }

function TextFinder(range, text) { this._rg = range; this._t = String(text); this._case = false; this._whole = false; this._rx = false; this._pos = -1; }
TextFinder.prototype = {
  matchCase: function (b) { this._case = b !== false; return this; },
  matchEntireCell: function (b) { this._whole = b !== false; return this; },
  useRegularExpression: function (b) { this._rx = b !== false; return this; },
  matchFormulaText: function () { return this; },
  ignoreDiacritics: function () { return this; },
  _hits: function () {
    var vals = this._rg.getValues(), out = [], me = this, rx;
    if (this._rx) rx = new RegExp(this._whole ? '^(?:' + this._t + ')$' : this._t, this._case ? '' : 'i');
    vals.forEach(function (r, i) {
      r.forEach(function (v, j) {
        var s = displayOf(v), t = me._t, ok;
        if (rx) ok = rx.test(s);
        else { if (!me._case) { s = s.toLowerCase(); t = t.toLowerCase(); } ok = me._whole ? s === t : s.indexOf(t) > -1; }
        if (ok) out.push(new Range(me._rg._s, me._rg._r + i, me._rg._c + j, 1, 1));
      });
    });
    return out;
  },
  findAll: function () { return this._hits(); },
  findNext: function () { var h = this._hits(); this._pos++; return h[this._pos] || null; },
  findPrevious: function () { var h = this._hits(); this._pos = Math.max(-1, this._pos - 1); return h[this._pos] || null; },
  replaceAllWith: function (rep) {
    var hits = this._hits(); hits.forEach(function (c) { c.setValue(rep); }); return hits.length;
  }
};

/* ------------------------------------------------------------------ Sheet */
function Sheet(ss, name) { this._ss = ss; this._name = name; }
Sheet.prototype = {
  getName: function () { return this._name; },
  getSheetName: function () { return this._name; },
  setName: function (n) {
    n = String(n); if (n === this._name) return this;
    var s = txSheet(this._ss._app, this._name); if (!s) return this;
    var ns = txCreateSheet(this._ss._app, n, s.idx); ns.rows = s.rows.map(function (r) { return (r || []).slice(); }); ns.meta = s.meta;
    txA(this._ss._app).deleted[this._name] = s.base; delete txA(this._ss._app).sheets[this._name]; delete txList(this._ss._app)[this._name];
    this._name = n; return this;
  },
  getParent: function () { return this._ss; },
  getSheetId: function () { var h = 0; for (var i = 0; i < this._name.length; i++) h = (h * 31 + this._name.charCodeAt(i)) | 0; return Math.abs(h); },
  getIndex: function () { var s = txSheet(this._ss._app, this._name); return (s ? s.idx : 0) + 1; },
  _rows: function () { var s = txSheet(this._ss._app, this._name); return s ? s.rows : []; },
  getLastRow: function () { var rows = this._rows(); for (var i = rows.length - 1; i >= 0; i--) { var r = rows[i]; if (r && r.some(function (v) { return !isEmpty(v); })) return i + 1; } return 0; },
  getLastColumn: function () { var m = 0; this._rows().forEach(function (r) { if (!r) return; for (var j = r.length - 1; j >= 0; j--) if (!isEmpty(r[j])) { m = Math.max(m, j + 1); break; } }); return m; },
  getMaxRows: function () { var s = txSheet(this._ss._app, this._name), m = (s && s.meta && s.meta.maxRows) || 1000; return Math.max(m, this._rows().length, this.getLastRow()); },
  getMaxColumns: function () { var s = txSheet(this._ss._app, this._name), m = (s && s.meta && s.meta.maxCols) || 26; return Math.max(m, this.getLastColumn()); },
  getRange: function (a, b, c, d) {
    if (typeof a === 'string') { var p = parseA1(a, this); return new Range(this, p[0], p[1], p[2], p[3]); }
    return new Range(this, a, b, c, d);
  },
  getRangeList: function (list) { var me = this; var rs = (list || []).map(function (a) { return me.getRange(a); }); return chainable({ getRanges: function () { return rs; }, clearContent: function () { rs.forEach(function (r) { r.clearContent(); }); return this; } }); },
  getDataRange: function () { return new Range(this, 1, 1, Math.max(this.getLastRow(), 1), Math.max(this.getLastColumn(), 1)); },
  appendRow: function (arr) { var s = own(txSheet(this._ss._app, this._name)); var at = this.getLastRow(); s.rows[at] = (arr || []).map(normIn); return this; },
  deleteRow: function (i) { return this.deleteRows(i, 1); },
  deleteRows: function (i, n) { var s = own(txSheet(this._ss._app, this._name)); s.rows.splice(i - 1, n || 1); return this; },
  insertRowBefore: function (i) { return this.insertRowsBefore(i, 1); },
  insertRowAfter: function (i) { return this.insertRowsAfter(i, 1); },
  insertRowsBefore: function (i, n) { var s = own(txSheet(this._ss._app, this._name)); var add = []; for (var k = 0; k < (n || 1); k++) add.push([]); while (s.rows.length < i - 1) s.rows.push([]); Array.prototype.splice.apply(s.rows, [i - 1, 0].concat(add)); return this; },
  insertRowsAfter: function (i, n) { return this.insertRowsBefore(i + 1, n); },
  insertRows: function (i, n) { return this.insertRowsBefore(i, n); },
  insertColumnBefore: function (c) { return this.insertColumnsBefore(c, 1); },
  insertColumnAfter: function (c) { return this.insertColumnsBefore(c + 1, 1); },
  insertColumnsBefore: function (c, n) { var s = own(txSheet(this._ss._app, this._name)); s.rows.forEach(function (r) { if (r) for (var k = 0; k < (n || 1); k++) r.splice(c - 1, 0, ''); }); return this; },
  insertColumnsAfter: function (c, n) { return this.insertColumnsBefore(c + 1, n); },
  deleteColumn: function (c) { return this.deleteColumns(c, 1); },
  deleteColumns: function (c, n) { var s = own(txSheet(this._ss._app, this._name)); s.rows.forEach(function (r) { if (r) r.splice(c - 1, n || 1); }); return this; },
  clear: function () { var s = own(txSheet(this._ss._app, this._name)); s.rows.length = 0; return this; },
  clearContents: function () { return this.clear(); },
  clearFormats: function () { return this; },
  getFrozenRows: function () { var s = txSheet(this._ss._app, this._name); return (s && s.meta.frozenRows) || 0; },
  setFrozenRows: function (n) { var s = txSheet(this._ss._app, this._name); if (s && s.meta.frozenRows !== n) { own(s).meta = Object.assign({}, s.meta, { frozenRows: n }); } return this; },
  getFrozenColumns: function () { return 0; },
  sort: function (col, asc) { var lr = this.getLastRow(), fr = this.getFrozenRows() || 0; if (lr > fr + 1) this.getRange(fr + 1, 1, lr - fr, Math.max(this.getLastColumn(), 1)).sort({ column: col, ascending: asc !== false }); return this; },
  createTextFinder: function (t) { return new TextFinder(this.getDataRange(), t); },
  copyTo: function (ss) { var n = 'Copy of ' + this._name, i = 2; while (txList(this._ss._app)[n]) n = 'Copy of ' + this._name + ' ' + (i++); var t = txCreateSheet(this._ss._app, n); t.rows = this._rows().map(function (r) { return (r || []).slice(); }); return new Sheet(ss || this._ss, n); },
  activate: function () { return this; }, showSheet: function () { return this; }, hideSheet: function () { return this; },
  isSheetHidden: function () { return false; },
  getCharts: function () { return []; }, getProtections: function () { return []; }, getNamedRanges: function () { return []; },
  protect: function () { return chainable({ setDescription: function () { return this; } }); },
  getType: function () { return 'GRID'; }
};

/* ------------------------------------------------------------------ Spreadsheet */
function Spreadsheet(app) { this._app = app; }
Spreadsheet.prototype = {
  getId: function () { return 'scs-' + this._app; },
  getName: function () { return this._app === CFG.app ? (CFG.appName || CFG.app) : this._app; },
  getUrl: function () { return 'https://docs.google.com/spreadsheets/d/scs-' + this._app + '/edit'; },
  rename: function () { return this; },
  getSheetByName: function (n) { if (n === null || n === undefined) return null; n = String(n); return txList(this._app)[n] && !txA(this._app).deleted[n] ? new Sheet(this, n) : null; },
  getSheets: function () { var l = txList(this._app), me = this; return Object.keys(l).filter(function (n) { return !txA(me._app).deleted[n]; }).sort(function (a, b) { return (l[a].idx - l[b].idx) || a.localeCompare(b); }).map(function (n) { return new Sheet(me, n); }); },
  getNumSheets: function () { return this.getSheets().length; },
  getActiveSheet: function () { return this.getSheets()[0] || this.insertSheet('Sheet1'); },
  getSheetById: function (id) { return this.getSheets().filter(function (s) { return s.getSheetId() === id; })[0] || null; },
  setActiveSheet: function (s) { return s; },
  insertSheet: function (name, idx) {
    if (typeof name === 'number') { idx = name; name = null; }
    if (name && typeof name === 'object') name = null;
    if (!name) { var k = 1; while (txList(this._app)['Sheet' + k]) k++; name = 'Sheet' + k; }
    name = String(name);
    if (txList(this._app)[name] && !txA(this._app).deleted[name]) throw gasError('A sheet with the name "' + name + '" already exists. Please enter another name.');
    txCreateSheet(this._app, name, typeof idx === 'number' ? idx : undefined);
    return new Sheet(this, name);
  },
  deleteSheet: function (sh) { var n = sh.getName(), s = txSheet(this._app, n); if (s) { txA(this._app).deleted[n] = s.base; delete txA(this._app).sheets[n]; } return this; },
  getSpreadsheetTimeZone: function () { return CFG.tz; },
  getSpreadsheetLocale: function () { return 'en_US'; },
  getRange: function (a1) { var m = String(a1).match(/^'?([^'!]+)'?!(.+)$/); var sh = m ? this.getSheetByName(m[1]) : this.getActiveSheet(); return sh.getRange(m ? m[2] : a1); },
  toast: function () { return this; }, flush: function () { return this; },
  getOwner: function () { return { getEmail: function () { return CFG.user.email; } }; },
  getEditors: function () { return []; }, addEditor: function () { return this; },
  getRangeByName: function () { return null; }, getNamedRanges: function () { return []; }
};
var ACTIVE_SS = null, LINKED_SS = {};

/* ------------------------------------------------------------------ SpreadsheetApp */
var SpreadsheetApp = chainable({
  getActiveSpreadsheet: function () { return ACTIVE_SS || (ACTIVE_SS = new Spreadsheet(CFG.app)); },
  getActive: function () { return SpreadsheetApp.getActiveSpreadsheet(); },
  openById: function (id) {
    id = String(id || '');
    if (!id || id === 'scs-' + CFG.app) return SpreadsheetApp.getActiveSpreadsheet();
    var target = /^scs-/.test(id) ? id.slice(4) : STORE.alias(id);
    if (!target) throw gasError('Spreadsheet not found or no access: ' + id);
    if (target === CFG.app) return SpreadsheetApp.getActiveSpreadsheet();
    // অন্য অ্যাপের শিট (লিংক: Admin Console/SQL এর gas_links অনুযায়ী পড়া/লেখা)
    return LINKED_SS[target] || (LINKED_SS[target] = new Spreadsheet(target));
  },
  openByUrl: function (url) { var m = String(url || '').match(/\/d\/([a-zA-Z0-9_-]+)/); return SpreadsheetApp.openById(m ? m[1] : url); },
  create: function (name) { return SpreadsheetApp.getActiveSpreadsheet(); },
  flush: function () {},
  getUi: function () { throw gasError('UI is not available in the web app'); },
  newDataValidation: function () { return chainable({ build: function () { return null; } }); },
  newRichTextValue: function () { return chainable({ build: function () { return ''; } }); },
  newTextStyle: function () { return chainable({ build: function () { return null; } }); },
  BorderStyle: { SOLID: 'SOLID', SOLID_MEDIUM: 'SOLID_MEDIUM', SOLID_THICK: 'SOLID_THICK', DASHED: 'DASHED', DOTTED: 'DOTTED', DOUBLE: 'DOUBLE' },
  WrapStrategy: { WRAP: 'WRAP', OVERFLOW: 'OVERFLOW', CLIP: 'CLIP' },
  ProtectionType: { RANGE: 'RANGE', SHEET: 'SHEET' },
  DataValidationCriteria: {}
});
/* Range/Sheet/Spreadsheet এর অজানা ফরম্যাটিং মেথড (setBackground, setFontWeight...) */
['setNumberFormat', 'setNumberFormats', 'setBackground', 'setBackgrounds', 'setFontWeight', 'setFontWeights', 'setFontColor', 'setFontColors', 'setFontSize', 'setFontFamily', 'setFontStyle', 'setFontLine',
  'setHorizontalAlignment', 'setHorizontalAlignments', 'setVerticalAlignment', 'setVerticalAlignments', 'setBorder', 'merge', 'mergeAcross', 'mergeVertically', 'breakApart', 'setWrap', 'setWraps', 'setWrapStrategy',
  'setNote', 'setNotes', 'setDataValidation', 'setDataValidations', 'protect', 'setTextRotation', 'setRichTextValue', 'insertCheckboxes', 'removeCheckboxes', 'setShowHyperlink', 'setTextStyle', 'trimWhitespace',
  'setFontWeight', 'autoResizeColumns', 'autoResizeRows', 'setColumnWidth', 'setColumnWidths', 'setRowHeight', 'setRowHeights', 'setRowHeightsForced', 'setTabColor', 'hideColumns', 'showColumns', 'hideRows', 'showRows',
  'setFrozenColumns', 'setConditionalFormatRules', 'clearConditionalFormatRules', 'addDeveloperMetadata', 'setHiddenGridlines', 'setRightToLeft', 'removeDuplicates', 'copyTo', 'moveTo', 'check', 'uncheck', 'applyRowBanding', 'createFilter', 'shiftRowGroupDepth']
  .forEach(function (m) {
    if (!Range.prototype[m]) Range.prototype[m] = function () { return this; };
    if (!Sheet.prototype[m]) Sheet.prototype[m] = function () { return this; };
  });

/* ------------------------------------------------------------------ PropertiesService */
function Props(scope) { this._sc = scope; }
Props.prototype = {
  _k: function (k) { return this._sc + '|' + k; },
  getProperty: function (k) { var v = txProps()[this._k(k)]; return v === undefined ? null : v; },
  setProperty: function (k, v) { txProps()[this._k(k)] = String(v); TX.propDirty[this._k(k)] = 1; return this; },
  deleteProperty: function (k) { var p = txProps(); if (p[this._k(k)] !== undefined) { delete p[this._k(k)]; TX.propDirty[this._k(k)] = 1; } return this; },
  getProperties: function () { var p = txProps(), pre = this._sc + '|', o = {}; Object.keys(p).forEach(function (k) { if (k.indexOf(pre) === 0) o[k.slice(pre.length)] = p[k]; }); return o; },
  getKeys: function () { return Object.keys(this.getProperties()); },
  setProperties: function (obj, del) { var me = this; if (del) this.deleteAllProperties(); Object.keys(obj || {}).forEach(function (k) { me.setProperty(k, obj[k]); }); return this; },
  deleteAllProperties: function () { var me = this; Object.keys(this.getProperties()).forEach(function (k) { if (!/^__/.test(k)) me.deleteProperty(k); }); return this; }
};
var PropertiesService = {
  getScriptProperties: function () { return new Props('script'); },
  getDocumentProperties: function () { return new Props('script'); },
  getUserProperties: function () { return new Props('user:' + CFG.user.id); }
};

/* ------------------------------------------------------------------ CacheService (মেমরি) */
function MemCache(ns) { this._ns = ns; }
MemCache.prototype = {
  get: function (k) { var e = MEM_CACHE[this._ns + k]; if (!e) return null; if (e.t < Date.now()) { delete MEM_CACHE[this._ns + k]; return null; } return e.v; },
  put: function (k, v, ttl) { MEM_CACHE[this._ns + k] = { v: String(v), t: Date.now() + Math.min(ttl || 600, 21600) * 1000 }; },
  getAll: function (keys) { var me = this, o = {}; (keys || []).forEach(function (k) { var v = me.get(k); if (v !== null) o[k] = v; }); return o; },
  putAll: function (obj, ttl) { var me = this; Object.keys(obj || {}).forEach(function (k) { me.put(k, obj[k], ttl); }); },
  remove: function (k) { delete MEM_CACHE[this._ns + k]; },
  removeAll: function (keys) { var me = this; (keys || []).forEach(function (k) { me.remove(k); }); }
};
var CacheService = {
  getScriptCache: function () { return new MemCache('s:'); },
  getDocumentCache: function () { return new MemCache('s:'); },
  getUserCache: function () { return new MemCache('u:'); }
};

/* ------------------------------------------------------------------ LockService (সার্ভারে লক) */
function Lock() {}
Lock.prototype = {
  tryLock: function (ms) { if (TX.locked) return true; var ok = STORE.lock(Math.min(ms || 0, 25000)); if (ok) TX.locked = true; return ok; },
  waitLock: function (ms) { if (!this.tryLock(ms || 10000)) throw gasError('Lock timeout: another process was holding the lock for too long.'); },
  releaseLock: function () { /* লেনদেন শেষে commit এর পর ছাড়া হয় — যাতে কেউ মাঝখানে পুরনো ডাটা না পড়ে */ },
  hasLock: function () { return !!TX.locked; }
};
var LockService = { getScriptLock: function () { return new Lock(); }, getDocumentLock: function () { return new Lock(); }, getUserLock: function () { return new Lock(); } };

/* ------------------------------------------------------------------ Utilities */
var TE = new TextEncoder(), TD = new TextDecoder();
function toU8(data, charset) {
  if (data instanceof Uint8Array) return data;
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  if (Array.isArray(data)) return Uint8Array.from(data.map(function (b) { return b & 255; }));
  if (data && data.getBytes) return toU8(data.getBytes());
  return TE.encode(String(data === undefined || data === null ? '' : data));
}
function signed(u8) { var a = new Array(u8.length); for (var i = 0; i < u8.length; i++) a[i] = u8[i] > 127 ? u8[i] - 256 : u8[i]; return a; }
function b64enc(u8) { var s = ''; for (var i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); }
function b64dec(s) { s = String(s || '').replace(/-/g, '+').replace(/_/g, '/').replace(/\s+/g, ''); while (s.length % 4) s += '='; var b = atob(s), o = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) o[i] = b.charCodeAt(i); return o; }

/* --- digests (sync, pure JS) --- */
function sha256(u8) {
  var K = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
  var H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  var l = u8.length, nb = ((l + 9 + 63) >> 6) << 6, m = new Uint8Array(nb); m.set(u8); m[l] = 0x80;
  var bits = l * 8; m[nb - 4] = (bits >>> 24) & 255; m[nb - 3] = (bits >>> 16) & 255; m[nb - 2] = (bits >>> 8) & 255; m[nb - 1] = bits & 255;
  m[nb - 5] = Math.floor(l / 0x20000000) & 255;
  var w = new Int32Array(64);
  for (var o = 0; o < nb; o += 64) {
    for (var i = 0; i < 16; i++) w[i] = (m[o + i * 4] << 24) | (m[o + i * 4 + 1] << 16) | (m[o + i * 4 + 2] << 8) | m[o + i * 4 + 3];
    for (i = 16; i < 64; i++) {
      var x = w[i - 15], y = w[i - 2];
      var s0 = ((x >>> 7) | (x << 25)) ^ ((x >>> 18) | (x << 14)) ^ (x >>> 3), s1 = ((y >>> 17) | (y << 15)) ^ ((y >>> 19) | (y << 13)) ^ (y >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
    }
    var a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
    for (i = 0; i < 64; i++) {
      var S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7)), ch = (e & f) ^ (~e & g);
      var t1 = (h + S1 + ch + K[i] + w[i]) | 0;
      var S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10)), mj = (a & b) ^ (a & c) ^ (b & c);
      var t2 = (S0 + mj) | 0;
      h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
    }
    H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0; H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
  }
  var out = new Uint8Array(32);
  for (i = 0; i < 8; i++) { out[i * 4] = (H[i] >>> 24) & 255; out[i * 4 + 1] = (H[i] >>> 16) & 255; out[i * 4 + 2] = (H[i] >>> 8) & 255; out[i * 4 + 3] = H[i] & 255; }
  return out;
}
function md5(u8) {
  var S = [7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21];
  var K = []; for (var i = 0; i < 64; i++) K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296) | 0;
  var l = u8.length, nb = ((l + 9 + 63) >> 6) << 6, m = new Uint8Array(nb); m.set(u8); m[l] = 0x80;
  var bits = l * 8; m[nb - 8] = bits & 255; m[nb - 7] = (bits >>> 8) & 255; m[nb - 6] = (bits >>> 16) & 255; m[nb - 5] = (bits >>> 24) & 255; m[nb - 4] = Math.floor(l / 0x20000000) & 255;
  var a0 = 0x67452301, b0 = 0xefcdab89 | 0, c0 = 0x98badcfe | 0, d0 = 0x10325476;
  for (var o = 0; o < nb; o += 64) {
    var M = []; for (i = 0; i < 16; i++) M[i] = m[o + i * 4] | (m[o + i * 4 + 1] << 8) | (m[o + i * 4 + 2] << 16) | (m[o + i * 4 + 3] << 24);
    var A = a0, B = b0, C = c0, D = d0;
    for (i = 0; i < 64; i++) {
      var F, g;
      if (i < 16) { F = (B & C) | (~B & D); g = i; } else if (i < 32) { F = (D & B) | (~D & C); g = (5 * i + 1) % 16; } else if (i < 48) { F = B ^ C ^ D; g = (3 * i + 5) % 16; } else { F = C ^ (B | ~D); g = (7 * i) % 16; }
      F = (F + A + K[i] + M[g]) | 0; A = D; D = C; C = B; B = (B + ((F << S[i]) | (F >>> (32 - S[i])))) | 0;
    }
    a0 = (a0 + A) | 0; b0 = (b0 + B) | 0; c0 = (c0 + C) | 0; d0 = (d0 + D) | 0;
  }
  var out = new Uint8Array(16);
  [a0, b0, c0, d0].forEach(function (v, k) { out[k * 4] = v & 255; out[k * 4 + 1] = (v >>> 8) & 255; out[k * 4 + 2] = (v >>> 16) & 255; out[k * 4 + 3] = (v >>> 24) & 255; });
  return out;
}
function sha1(u8) {
  var l = u8.length, nb = ((l + 9 + 63) >> 6) << 6, m = new Uint8Array(nb); m.set(u8); m[l] = 0x80;
  var bits = l * 8; m[nb - 4] = (bits >>> 24) & 255; m[nb - 3] = (bits >>> 16) & 255; m[nb - 2] = (bits >>> 8) & 255; m[nb - 1] = bits & 255; m[nb - 5] = Math.floor(l / 0x20000000) & 255;
  var H = [0x67452301, 0xefcdab89 | 0, 0x98badcfe | 0, 0x10325476, 0xc3d2e1f0 | 0], w = new Int32Array(80);
  for (var o = 0; o < nb; o += 64) {
    for (var i = 0; i < 16; i++) w[i] = (m[o + i * 4] << 24) | (m[o + i * 4 + 1] << 16) | (m[o + i * 4 + 2] << 8) | m[o + i * 4 + 3];
    for (i = 16; i < 80; i++) { var x = w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16]; w[i] = (x << 1) | (x >>> 31); }
    var a = H[0], b = H[1], c = H[2], d = H[3], e = H[4];
    for (i = 0; i < 80; i++) {
      var f, k;
      if (i < 20) { f = (b & c) | (~b & d); k = 0x5a827999; } else if (i < 40) { f = b ^ c ^ d; k = 0x6ed9eba1; } else if (i < 60) { f = (b & c) | (b & d) | (c & d); k = 0x8f1bbcdc | 0; } else { f = b ^ c ^ d; k = 0xca62c1d6 | 0; }
      var t = (((a << 5) | (a >>> 27)) + f + e + k + w[i]) | 0; e = d; d = c; c = (b << 30) | (b >>> 2); b = a; a = t;
    }
    H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0; H[4] = (H[4] + e) | 0;
  }
  var out = new Uint8Array(20);
  for (i = 0; i < 5; i++) { out[i * 4] = (H[i] >>> 24) & 255; out[i * 4 + 1] = (H[i] >>> 16) & 255; out[i * 4 + 2] = (H[i] >>> 8) & 255; out[i * 4 + 3] = H[i] & 255; }
  return out;
}
function hmacSha256(key, msg) {
  key = toU8(key); msg = toU8(msg);
  if (key.length > 64) key = sha256(key);
  var k = new Uint8Array(64); k.set(key);
  var ip = new Uint8Array(64 + msg.length), op = new Uint8Array(64 + 32);
  for (var i = 0; i < 64; i++) { ip[i] = k[i] ^ 0x36; op[i] = k[i] ^ 0x5c; }
  ip.set(msg, 64); op.set(sha256(ip), 64);
  return sha256(op);
}

/* --- formatDate: Java SimpleDateFormat --- */
var MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
var DAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
function tzParts(d, tz) {
  var f = new Intl.DateTimeFormat('en-US', { timeZone: tz || 'Asia/Dhaka', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false, weekday: 'short' });
  var o = {}; f.formatToParts(d).forEach(function (p) { o[p.type] = p.value; });
  var h = Number(o.hour) % 24;
  var wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(o.weekday);
  // UTC অফসেট (মিনিট)
  var asUtc = Date.UTC(Number(o.year), Number(o.month) - 1, Number(o.day), h, Number(o.minute), Number(o.second));
  var off = Math.round((asUtc - Math.floor(d.getTime() / 1000) * 1000) / 60000);
  return { y: Number(o.year), M: Number(o.month), d: Number(o.day), H: h, m: Number(o.minute), s: Number(o.second), S: d.getMilliseconds(), wd: wd, off: off };
}
function pad(n, w) { n = String(n); while (n.length < w) n = '0' + n; return n; }
function fmtDate(date, tz, pattern) {
  if (!(date instanceof Date)) date = new Date(date);
  if (isNaN(date.getTime())) throw gasError('Invalid date');
  var p = tzParts(date, tz || CFG.tz);
  return String(pattern).replace(/'([^']*)'|y+|M+|d+|H+|h+|m+|s+|S+|E+|a+|Z+|X+|u+|k+|K+/g, function (t, lit) {
    if (lit !== undefined) return lit === '' ? "'" : lit;
    var c = t.charAt(0), n = t.length;
    switch (c) {
      case 'y': return n === 2 ? pad(p.y % 100, 2) : pad(p.y, n);
      case 'M': return n >= 4 ? MON[p.M - 1] : n === 3 ? MON[p.M - 1].slice(0, 3) : pad(p.M, n);
      case 'd': return pad(p.d, n);
      case 'H': return pad(p.H, n);
      case 'k': return pad(p.H || 24, n);
      case 'h': return pad(p.H % 12 || 12, n);
      case 'K': return pad(p.H % 12, n);
      case 'm': return pad(p.m, n);
      case 's': return pad(p.s, n);
      case 'S': return pad(p.S, 3).slice(0, n);
      case 'E': return n >= 4 ? DAY[p.wd] : DAY[p.wd].slice(0, 3);
      case 'u': return String(p.wd || 7);
      case 'a': return p.H < 12 ? 'AM' : 'PM';
      case 'Z': case 'X': {
        var s = p.off < 0 ? '-' : '+', a = Math.abs(p.off);
        if (c === 'X' && p.off === 0) return 'Z';
        return s + pad(Math.floor(a / 60), 2) + (n >= 3 && c === 'X' ? ':' : '') + pad(a % 60, 2);
      }
    }
    return t;
  });
}
function parseDateStr(str, tz, pattern) {
  var s = String(str), p = String(pattern), map = {}, rx = '', keys = [];
  p.replace(/y+|M+|d+|H+|h+|m+|s+|a+|[^yMdHhmsa]+/g, function (t) {
    var c = t.charAt(0);
    if (/[yMdHhms]/.test(c)) { rx += t.length >= 3 && c === 'M' ? '([A-Za-z]+)' : '(\\d{1,' + Math.max(t.length, c === 'y' ? 4 : 2) + '})'; keys.push(c + (t.length >= 3 && c === 'M' ? 'M' : '')); }
    else if (c === 'a') { rx += '(AM|PM|am|pm)'; keys.push('a'); }
    else rx += t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return t;
  });
  var m = s.match(new RegExp('^' + rx));
  if (!m) throw gasError('Unparseable date: "' + str + '"');
  keys.forEach(function (k, i) { map[k] = m[i + 1]; });
  var Y = Number(map.y || 1970), Mo = map.MM ? MON.map(function (x) { return x.slice(0, 3).toLowerCase(); }).indexOf(map.MM.slice(0, 3).toLowerCase()) + 1 : Number(map.M || 1);
  var D = Number(map.d || 1), Hh = Number(map.H || map.h || 0), Mi = Number(map.m || 0), Se = Number(map.s || 0);
  if (map.a) { if (/pm/i.test(map.a) && Hh < 12) Hh += 12; if (/am/i.test(map.a) && Hh === 12) Hh = 0; }
  var guess = new Date(Date.UTC(Y, Mo - 1, D, Hh, Mi, Se));
  var off = tzParts(guess, tz || CFG.tz).off;
  return new Date(guess.getTime() - off * 60000);
}

var Utilities = {
  DigestAlgorithm: { MD5: 'MD5', SHA_1: 'SHA_1', SHA_256: 'SHA_256', SHA_384: 'SHA_384', SHA_512: 'SHA_512', MD2: 'MD2' },
  MacAlgorithm: { HMAC_SHA_256: 'HMAC_SHA_256', HMAC_SHA_1: 'HMAC_SHA_1', HMAC_MD5: 'HMAC_MD5' },
  Charset: { UTF_8: 'UTF-8', US_ASCII: 'US-ASCII' },
  formatDate: function (d, tz, p) { return fmtDate(d, tz, p); },
  parseDate: function (s, tz, p) { return parseDateStr(s, tz, p); },
  formatString: function (f) { var a = Array.prototype.slice.call(arguments, 1), i = 0; return String(f).replace(/%(\.\d+)?[sdfi%]/g, function (t, prec) { if (t === '%%') return '%'; var v = a[i++]; if (/f$/.test(t)) return Number(v).toFixed(prec ? Number(prec.slice(1)) : 6); if (/[di]$/.test(t)) return String(Math.trunc(Number(v))); return String(v); }); },
  getUuid: function () { return crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) { var r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); }); },
  computeDigest: function (alg, value) {
    var u = toU8(value);
    var out = alg === 'MD5' ? md5(u) : alg === 'SHA_1' ? sha1(u) : alg === 'SHA_256' ? sha256(u) : null;
    if (!out) throw gasError('Digest algorithm not supported: ' + alg);
    return signed(out);
  },
  computeHmacSha256Signature: function (value, key) { return signed(hmacSha256(key, value)); },
  computeHmacSignature: function (alg, value, key) { if (alg !== 'HMAC_SHA_256') throw gasError('HMAC algorithm not supported: ' + alg); return signed(hmacSha256(key, value)); },
  base64Encode: function (d) { return b64enc(toU8(d)); },
  base64EncodeWebSafe: function (d) { return b64enc(toU8(d)).replace(/\+/g, '-').replace(/\//g, '_'); },
  base64Decode: function (s) { return signed(b64dec(s)); },
  base64DecodeWebSafe: function (s) { return signed(b64dec(s)); },
  newBlob: function (data, type, name) { return new Blob_(toU8(data === undefined ? '' : data), type || (typeof data === 'string' ? 'text/plain' : 'application/octet-stream'), name || null); },
  sleep: function (ms) { var t = Date.now() + Math.min(ms || 0, 3000); while (Date.now() < t) { /* wait */ } },
  parseCsv: function (csv, delim) {
    delim = delim || ','; var rows = [], row = [], f = '', q = false, s = String(csv);
    for (var i = 0; i < s.length; i++) {
      var c = s[i];
      if (q) { if (c === '"') { if (s[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
      else if (c === '"') q = true; else if (c === delim) { row.push(f); f = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && s[i + 1] === '\n') i++; row.push(f); rows.push(row); row = []; f = ''; } else f += c;
    }
    if (f !== '' || row.length) { row.push(f); rows.push(row); }
    return rows;
  },
  jsonStringify: function (o) { return JSON.stringify(o); },
  jsonParse: function (s) { return JSON.parse(s); },
  zip: function () { throw gasError('Utilities.zip is not supported'); },
  unzip: function () { throw gasError('Utilities.unzip is not supported'); },
  gzip: function (b) { return b; },
  ungzip: function (b) { return b; }
};

/* ------------------------------------------------------------------ Blob */
function Blob_(bytes, type, name) { this._b = bytes; this._t = type || 'application/octet-stream'; this._n = name; this._html = null; }
Blob_.prototype = {
  getBytes: function () { return signed(this._b); },
  getDataAsString: function () { return TD.decode(this._b); },
  setDataFromString: function (s) { this._b = TE.encode(String(s)); return this; },
  setBytes: function (b) { this._b = toU8(b); return this; },
  getContentType: function () { return this._t; },
  setContentType: function (t) { this._t = t; return this; },
  getName: function () { return this._n; },
  setName: function (n) { this._n = n; return this; },
  getBlob: function () { return this; },
  copyBlob: function () { var b = new Blob_(this._b.slice(), this._t, this._n); b._html = this._html; return b; },
  isGoogleType: function () { return false; },
  /** PDF: ব্রাউজারে HTML থেকে PDF বানানো হয় (ফাইল খুললে/নামালে) — এখানে HTML রেখে PDF হিসেবে চিহ্নিত */
  getAs: function (type) {
    var b = this.copyBlob();
    if (/pdf/i.test(type)) { b._html = this._html || (/html/i.test(this._t) ? TD.decode(this._b) : null); b._t = 'application/pdf'; if (b._n) b._n = b._n.replace(/\.[^.]+$/, '') + '.pdf'; }
    else b._t = type;
    return b;
  }
};

/* ------------------------------------------------------------------ DriveApp (Supabase Storage) */
var ROOT_ID = 'root';
function newId() { return 'f' + Utilities.getUuid().replace(/-/g, '').slice(0, 24); }
function fileRow(id) { return id === ROOT_ID ? { id: ROOT_ID, name: 'My Drive', is_folder: true, parent_id: null } : STORE.fileGet(id); }
function Iter(list, mk) { var i = 0; return { hasNext: function () { return i < list.length; }, next: function () { if (i >= list.length) throw gasError('No more items'); return mk(list[i++]); }, getContinuationToken: function () { return null; } }; }
function fileUrl(row) { return CFG.site + 'file.html?app=' + encodeURIComponent(CFG.app) + '&id=' + encodeURIComponent(row.id); }
function GFolder(row) { this._r = row; }
GFolder.prototype = chainable.call ? {
  getId: function () { return this._r.id; },
  getName: function () { return this._r.name; },
  setName: function (n) { this._r = STORE.fileSave({ id: this._r.id, app_key: CFG.app, name: String(n), is_folder: true }); return this; },
  getUrl: function () { return fileUrl(this._r); },
  getDescription: function () { return this._r.description || ''; },
  setDescription: function (d) { if (this._r.id !== ROOT_ID) STORE.fileSave({ id: this._r.id, app_key: CFG.app, description: String(d || '') }); return this; },
  getDateCreated: function () { return new Date(this._r.created_at || Date.now()); },
  getLastUpdated: function () { return new Date(this._r.updated_at || Date.now()); },
  getParents: function () { var p = this._r.parent_id; return Iter(p ? [p] : [], function (id) { return new GFolder(fileRow(id) || { id: id, name: id, is_folder: true }); }); },
  getFiles: function () { return Iter(STORE.fileList({ parent: this._r.id, folder: false }), function (r) { return new GFile(r); }); },
  getFolders: function () { return Iter(STORE.fileList({ parent: this._r.id, folder: true }), function (r) { return new GFolder(r); }); },
  getFilesByName: function (n) { return Iter(STORE.fileList({ parent: this._r.id, folder: false, name: String(n) }), function (r) { return new GFile(r); }); },
  getFoldersByName: function (n) { return Iter(STORE.fileList({ parent: this._r.id, folder: true, name: String(n) }), function (r) { return new GFolder(r); }); },
  getFilesByType: function (t) { return Iter(STORE.fileList({ parent: this._r.id, folder: false }).filter(function (r) { return r.mime === t; }), function (r) { return new GFile(r); }); },
  searchFiles: function (q) { return DriveApp.searchFiles(q, this._r.id); },
  searchFolders: function (q) { return DriveApp.searchFolders(q, this._r.id); },
  createFolder: function (n) { return new GFolder(STORE.fileSave({ id: newId(), app_key: CFG.app, name: String(n), is_folder: true, parent_id: this._r.id, mime: 'application/vnd.google-apps.folder', created_by: CFG.user.id })); },
  createFile: function (a, content, mime) {
    var blob = (a && a.getBytes) ? a : Utilities.newBlob(content === undefined ? '' : content, mime || 'text/plain', String(a));
    return createFileIn(this._r.id, blob);
  },
  addFile: function (f) { STORE.fileSave({ id: f.getId(), app_key: CFG.app, parent_id: this._r.id }); return this; },
  removeFile: function () { return this; },
  addFolder: function () { return this; }, removeFolder: function () { return this; },
  moveTo: function (dest) { STORE.fileSave({ id: this._r.id, app_key: CFG.app, parent_id: dest.getId() }); return this; },
  setTrashed: function (t) { if (this._r.id !== ROOT_ID) STORE.fileSave({ id: this._r.id, app_key: CFG.app, trashed: !!t }); return this; },
  isTrashed: function () { return !!this._r.trashed; },
  setSharing: function () { return this; }, getSharingAccess: function () { return 'PRIVATE'; }, getSharingPermission: function () { return 'VIEW'; },
  addEditor: function () { return this; }, addViewer: function () { return this; }, getOwner: function () { return { getEmail: function () { return CFG.user.email; } }; },
  getSize: function () { return 0; }
} : {};
function createFileIn(parentId, blob) {
  var id = newId(), name = blob.getName() || 'Untitled', mime = blob.getContentType();
  var path = 'gas/' + CFG.app + '/' + id;
  var bytes = blob._b, upMime = mime;
  if (blob._html !== null && blob._html !== undefined) { bytes = TE.encode(blob._html); upMime = 'text/html'; }   // PDF -> HTML রাখা (খুললে PDF/প্রিন্ট)
  STORE.fileUpload(path, bytes, upMime);
  return new GFile(STORE.fileSave({ id: id, app_key: CFG.app, name: name, mime: mime, is_folder: false, parent_id: parentId, path: path, size: bytes.length, created_by: CFG.user.id, description: blob._html ? 'html-pdf' : '' }));
}
function GFile(row) { this._r = row; }
GFile.prototype = {
  getId: function () { return this._r.id; },
  getName: function () { return this._r.name; },
  setName: function (n) { this._r = STORE.fileSave({ id: this._r.id, app_key: CFG.app, name: String(n) }); return this; },
  getMimeType: function () { return this._r.mime; },
  getSize: function () { return Number(this._r.size) || 0; },
  getUrl: function () { return fileUrl(this._r); },
  getDownloadUrl: function () { return fileUrl(this._r) + '&download=1'; },
  getThumbnail: function () { return this.getBlob(); },
  getDescription: function () { return this._r.description || ''; },
  setDescription: function (d) { STORE.fileSave({ id: this._r.id, app_key: CFG.app, description: String(d || '') }); return this; },
  getDateCreated: function () { return new Date(this._r.created_at || Date.now()); },
  getLastUpdated: function () { return new Date(this._r.updated_at || Date.now()); },
  getParents: function () { var p = this._r.parent_id || ROOT_ID; return Iter([p], function (id) { return new GFolder(fileRow(id) || { id: id, name: id, is_folder: true }); }); },
  getBlob: function () {
    var bytes = this._r.path ? STORE.fileDownload(this._r.path) : new Uint8Array(0);
    var b = new Blob_(bytes, this._r.mime, this._r.name);
    if (this._r.description === 'html-pdf') { b._html = TD.decode(bytes); }
    return b;
  },
  getAs: function (t) { return this.getBlob().getAs(t); },
  setContent: function (s) { var bytes = TE.encode(String(s)); STORE.fileUpload(this._r.path, bytes, this._r.mime); this._r = STORE.fileSave({ id: this._r.id, app_key: CFG.app, size: bytes.length, updated_at: new Date().toISOString() }); return this; },
  makeCopy: function (name, folder) { var b = this.getBlob(); b.setName(name || ('Copy of ' + this._r.name)); return createFileIn(folder ? folder.getId() : this._r.parent_id, b); },
  moveTo: function (dest) { STORE.fileSave({ id: this._r.id, app_key: CFG.app, parent_id: dest.getId() }); return this; },
  setTrashed: function (t) { STORE.fileSave({ id: this._r.id, app_key: CFG.app, trashed: !!t }); return this; },
  isTrashed: function () { return !!this._r.trashed; },
  setSharing: function () { return this; }, getSharingAccess: function () { return 'ANYONE_WITH_LINK'; }, getSharingPermission: function () { return 'VIEW'; },
  addEditor: function () { return this; }, addViewer: function () { return this; }, getOwner: function () { return { getEmail: function () { return CFG.user.email; } }; }
};
function searchRows(q, parent, folder) {
  var m = String(q || '').match(/title\s+(contains|=)\s+['"]([^'"]*)['"]/i);
  var opt = { folder: folder }; if (parent) opt.parent = parent;
  if (m) { if (m[1].toLowerCase() === 'contains') opt.nameLike = m[2]; else opt.name = m[2]; }
  return STORE.fileList(opt);
}
var DriveApp = {
  Access: { ANYONE: 'ANYONE', ANYONE_WITH_LINK: 'ANYONE_WITH_LINK', DOMAIN: 'DOMAIN', PRIVATE: 'PRIVATE' },
  Permission: { VIEW: 'VIEW', EDIT: 'EDIT', COMMENT: 'COMMENT', NONE: 'NONE', OWNER: 'OWNER' },
  getRootFolder: function () { return new GFolder(fileRow(ROOT_ID)); },
  getFolderById: function (id) {
    id = String(id || '');
    if (!id) throw gasError('No item with the given ID could be found.');
    if (id === ROOT_ID) return DriveApp.getRootFolder();
    var r = STORE.fileGet(id);
    // পুরনো Google Drive ফোল্ডার ID: নতুন সিস্টেমে একই ID দিয়ে ফোল্ডার তৈরি হয়ে যায়
    if (!r) r = STORE.fileSave({ id: id, app_key: CFG.app, name: 'Folder ' + id.slice(0, 8), is_folder: true, parent_id: ROOT_ID, mime: 'application/vnd.google-apps.folder', created_by: CFG.user.id });
    if (!r.is_folder) throw gasError('Not a folder: ' + id);
    return new GFolder(r);
  },
  getFileById: function (id) { var r = STORE.fileGet(String(id || '')); if (!r || r.is_folder) throw gasError('No item with the given ID could be found, or you do not have permission to access it.'); return new GFile(r); },
  getFoldersByName: function (n) { return Iter(STORE.fileList({ folder: true, name: String(n) }), function (r) { return new GFolder(r); }); },
  getFilesByName: function (n) { return Iter(STORE.fileList({ folder: false, name: String(n) }), function (r) { return new GFile(r); }); },
  getFiles: function () { return Iter(STORE.fileList({ folder: false }), function (r) { return new GFile(r); }); },
  getFolders: function () { return Iter(STORE.fileList({ folder: true }), function (r) { return new GFolder(r); }); },
  searchFiles: function (q, parent) { return Iter(searchRows(q, parent, false), function (r) { return new GFile(r); }); },
  searchFolders: function (q, parent) { return Iter(searchRows(q, parent, true), function (r) { return new GFolder(r); }); },
  createFolder: function (n) { return DriveApp.getRootFolder().createFolder(n); },
  createFile: function (a, c, m) { return DriveApp.getRootFolder().createFile(a, c, m); },
  getStorageUsed: function () { return 0; }, getStorageLimit: function () { return 1e10; }
};

/* ------------------------------------------------------------------ UrlFetchApp / MailApp (সার্ভার ফাংশন scs-api দিয়ে) */
function HTTPResponse(r) { this._r = r; }
HTTPResponse.prototype = {
  getResponseCode: function () { return this._r.code; },
  getContentText: function () { return TD.decode(b64dec(this._r.body || '')); },
  getContent: function () { return signed(b64dec(this._r.body || '')); },
  getBlob: function () { return new Blob_(b64dec(this._r.body || ''), (this._r.headers || {})['content-type'] || 'application/octet-stream'); },
  getHeaders: function () { return this._r.headers || {}; },
  getAllHeaders: function () { return this._r.headers || {}; },
  getAs: function (t) { return this.getBlob().getAs(t); }
};
function fetchReq(url, o) {
  o = o || {};
  var payload = o.payload, ct = o.contentType, body64 = null;
  if (payload !== undefined && payload !== null) {
    if (typeof payload === 'object' && !(payload.getBytes) && !Array.isArray(payload)) {
      var sp = new URLSearchParams(); Object.keys(payload).forEach(function (k) { sp.set(k, payload[k]); });
      body64 = b64enc(TE.encode(sp.toString())); ct = ct || 'application/x-www-form-urlencoded';
    } else body64 = b64enc(toU8(payload));
  }
  return { url: String(url), method: String(o.method || (payload ? 'post' : 'get')).toUpperCase(), headers: Object.assign({}, o.headers || {}, ct ? { 'Content-Type': ct } : {}), body: body64 };
}
var UrlFetchApp = {
  fetch: function (url, o) {
    var r = STORE.api('fetch', fetchReq(url, o));
    var res = new HTTPResponse(r);
    if (!(o && o.muteHttpExceptions) && r.code >= 400) throw gasError('Request failed for ' + url + ' returned code ' + r.code + '. Truncated server response: ' + res.getContentText().slice(0, 200));
    return res;
  },
  fetchAll: function (reqs) { return (reqs || []).map(function (q) { return UrlFetchApp.fetch(typeof q === 'string' ? q : q.url, typeof q === 'string' ? {} : Object.assign({ muteHttpExceptions: true }, q)); }); },
  getRequest: function (url, o) { return fetchReq(url, o); }
};
var MailApp = {
  sendEmail: function (a, subject, body, opts) {
    var m = typeof a === 'object' ? a : Object.assign({ to: a, subject: subject, body: body }, opts || {});
    STORE.api('mail', { to: m.to, subject: m.subject, body: m.body || '', html: m.htmlBody || '', name: m.name || '' });
  },
  getRemainingDailyQuota: function () { return 100; }
};
var GmailApp = { sendEmail: MailApp.sendEmail, getRemainingDailyQuota: MailApp.getRemainingDailyQuota };

/* ------------------------------------------------------------------ ScriptApp (ট্রিগার: অ্যাপ খুললে বাকি থাকা কাজ চলে) */
function trigList() { try { return JSON.parse(new Props('script').getProperty('__triggers') || '[]'); } catch (e) { return []; } }
function trigSave(l) { new Props('script').setProperty('__triggers', JSON.stringify(l)); }
function Trigger(t) { this._t = t; }
Trigger.prototype = {
  getHandlerFunction: function () { return this._t.fn; }, getUniqueId: function () { return this._t.id; },
  getEventType: function () { return this._t.event || 'CLOCK'; }, getTriggerSource: function () { return this._t.source || 'CLOCK'; },
  getTriggerSourceId: function () { return 'scs-' + CFG.app; }
};
function TriggerBuilder(fn) { this._t = { id: 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), fn: fn }; }
TriggerBuilder.prototype = {
  timeBased: function () { this._t.event = 'CLOCK'; return this; },
  everyMinutes: function (n) { this._t.ms = n * 60000; return this; },
  everyHours: function (n) { this._t.ms = n * 3600000; return this; },
  everyDays: function (n) { this._t.ms = n * 86400000; return this; },
  everyWeeks: function (n) { this._t.ms = n * 7 * 86400000; return this; },
  atHour: function (h) { this._t.hour = h; return this; }, nearMinute: function () { return this; }, onWeekDay: function () { return this; },
  inTimezone: function () { return this; }, onMonthDay: function () { return this; },
  after: function (ms) { this._t.once = Date.now() + ms; return this; },
  at: function (d) { this._t.once = new Date(d).getTime(); return this; },
  forSpreadsheet: function () { this._t.source = 'SPREADSHEETS'; return this; },
  onEdit: function () { this._t.event = 'ON_EDIT'; return this; }, onOpen: function () { this._t.event = 'ON_OPEN'; return this; },
  onChange: function () { this._t.event = 'ON_CHANGE'; return this; }, onFormSubmit: function () { this._t.event = 'ON_FORM_SUBMIT'; return this; },
  forForm: function () { return this; }, forDocument: function () { return this; }, forUserCalendar: function () { return this; },
  create: function () { var l = trigList(); l.push(this._t); trigSave(l); return new Trigger(this._t); }
};
var ScriptApp = {
  EventType: { CLOCK: 'CLOCK', ON_EDIT: 'ON_EDIT', ON_OPEN: 'ON_OPEN', ON_CHANGE: 'ON_CHANGE', ON_FORM_SUBMIT: 'ON_FORM_SUBMIT' },
  TriggerSource: { CLOCK: 'CLOCK', SPREADSHEETS: 'SPREADSHEETS' },
  WeekDay: { MONDAY: 'MONDAY', TUESDAY: 'TUESDAY', WEDNESDAY: 'WEDNESDAY', THURSDAY: 'THURSDAY', FRIDAY: 'FRIDAY', SATURDAY: 'SATURDAY', SUNDAY: 'SUNDAY' },
  AuthMode: { FULL: 'FULL', LIMITED: 'LIMITED', NONE: 'NONE' },
  getProjectTriggers: function () { return trigList().map(function (t) { return new Trigger(t); }); },
  getUserTriggers: function () { return ScriptApp.getProjectTriggers(); },
  newTrigger: function (fn) { return new TriggerBuilder(fn); },
  deleteTrigger: function (tr) { var id = tr && tr.getUniqueId ? tr.getUniqueId() : tr; trigSave(trigList().filter(function (t) { return t.id !== id; })); },
  getService: function () { return { getUrl: function () { return CFG.site + 'apps/' + CFG.app + '/'; }, isEnabled: function () { return true; } }; },
  getScriptId: function () { return 'scs-' + CFG.app; },
  getOAuthToken: function () { return ''; },
  invalidateAuth: function () {},
  requireScopes: function () {}, requireAllScopes: function () {},
  getAuthorizationInfo: function () { return { getAuthorizationStatus: function () { return 'NOT_REQUIRED'; }, getAuthorizationUrl: function () { return null; } }; },
  AuthorizationStatus: { REQUIRED: 'REQUIRED', NOT_REQUIRED: 'NOT_REQUIRED' }
};

/* ------------------------------------------------------------------ HtmlService / ContentService */
function HtmlOutput(html) { this._h = String(html || ''); this._title = ''; }
HtmlOutput.prototype = chainable.call ? {
  getContent: function () { return this._h; },
  setContent: function (h) { this._h = String(h); return this; },
  append: function (h) { this._h += String(h); return this; },
  appendUntrusted: function (h) { this._h += String(h).replace(/</g, '&lt;'); return this; },
  setTitle: function (t) { this._title = t; return this; }, getTitle: function () { return this._title; },
  addMetaTag: function () { return this; }, setXFrameOptionsMode: function () { return this; }, setSandboxMode: function () { return this; },
  setWidth: function () { return this; }, setHeight: function () { return this; }, setFaviconUrl: function () { return this; },
  getBlob: function () { return new Blob_(TE.encode(this._h), 'text/html', (this._title || 'page') + '.html'); },
  getAs: function (t) { return this.getBlob().getAs(t); }
} : {};
var HTML_FILES = {};   // অ্যাডাপ্টার দেয় (include() এর জন্য)
function HtmlTemplate(src) { this._src = String(src || ''); }
HtmlTemplate.prototype = {
  evaluate: function () {
    var me = this, code = 'var __o="";', re = /<\?(!?=)?([\s\S]*?)\?>/g, last = 0, m;
    while ((m = re.exec(this._src))) {
      code += '__o+=' + JSON.stringify(this._src.slice(last, m.index)) + ';';
      if (m[1] === '=') code += '__o+=String((' + m[2] + ')).replace(/&/g,"&amp;").replace(/</g,"&lt;");';
      else if (m[1] === '!=') code += '__o+=String((' + m[2] + '));';
      else code += m[2] + '\n';
      last = re.lastIndex;
    }
    code += '__o+=' + JSON.stringify(this._src.slice(last)) + ';return __o;';
    var keys = Object.keys(this).filter(function (k) { return k.charAt(0) !== '_'; });
    var html = Function.apply(null, keys.concat(code)).apply(null, keys.map(function (k) { return me[k]; }));
    return new HtmlOutput(html);
  },
  getRawContent: function () { return this._src; },
  getCode: function () { return ''; }
};
var HtmlService = {
  XFrameOptionsMode: { ALLOWALL: 'ALLOWALL', DEFAULT: 'DEFAULT' },
  SandboxMode: { IFRAME: 'IFRAME', NATIVE: 'NATIVE', EMULATED: 'EMULATED' },
  createHtmlOutput: function (h) { return new HtmlOutput(h && h.getDataAsString ? h.getDataAsString() : h); },
  createHtmlOutputFromFile: function (f) { return new HtmlOutput(HTML_FILES[f] || ''); },
  createTemplate: function (src) { return new HtmlTemplate(src && src.getDataAsString ? src.getDataAsString() : src); },
  createTemplateFromFile: function (f) { return new HtmlTemplate(HTML_FILES[f] || ''); }
};
var ContentService = {
  MimeType: { JSON: 'JSON', TEXT: 'TEXT', CSV: 'CSV', JAVASCRIPT: 'JAVASCRIPT', XML: 'XML' },
  createTextOutput: function (t) { var o = { _t: String(t || '') }; o.setMimeType = function () { return o; }; o.getContent = function () { return o._t; }; o.append = function (x) { o._t += x; return o; }; o.downloadAsFile = function () { return o; }; return o; }
};

/* ------------------------------------------------------------------ Session / Logger */
var Session = {
  getScriptTimeZone: function () { return CFG.tz; },
  getActiveUser: function () { return { getEmail: function () { return CFG.user.email || ''; }, getUsername: function () { return CFG.user.name || ''; } }; },
  getEffectiveUser: function () { return Session.getActiveUser(); },
  getTemporaryActiveUserKey: function () { return CFG.user.id; },
  getActiveUserLocale: function () { return CFG.lang === 'bn' ? 'bn' : 'en'; },
  getTimeZone: function () { return CFG.tz; }
};
var Logger = { log: function () { try { console.log.apply(console, ['[' + CFG.app + ']'].concat([].slice.call(arguments))); } catch (e) {} return Logger; }, getLog: function () { return ''; }, clear: function () {} };
var Browser = { msgBox: function () { return 'ok'; }, inputBox: function () { return ''; }, Buttons: {} };

/* ------------------------------------------------------------------ SCS: অ্যাডাপ্টারের জন্য সাহায্য */
var SCS_GAS = {
  role: function () { return CFG.role; },
  isAdmin: function () { return CFG.role === 'admin'; },
  user: function () { return CFG.user; },
  /** SCS Admin Console এর অ্যাপ পিন মিলছে কি না (শুধু Admin রোল) */
  isAdminPin: function (pin) { return CFG.role === 'admin' && CFG.adminPin != null && String(pin == null ? '' : pin).trim() === String(CFG.adminPin); },
  adminPinLen: function () { return String(CFG.adminPin || '0000').length; },
  /** SCS অ্যাকাউন্টের এমপ্লয়ি তালিকা (প্রোফাইল থেকে) — host পাঠায় */
  employees: function () { return CFG.employees || []; },
  rest: function (method, path, body, prefer) { return STORE.rest ? STORE.rest(method, path, body, prefer) : null; },
  notify: function (event, title, body, url, target) { self.postMessage({ type: 'notify', event: event, title: title, body: body, url: url, target: target || null }); },
  tx: function () { return TX; }
};

/* ------------------------------------------------------------------ কল চালানো */
function runCall(fnName, args) {
  var fn = self[fnName];
  if (typeof fn !== 'function') throw gasError('Script function not found: ' + fnName);
  for (var attempt = 1; attempt <= 3; attempt++) {
    TX = newTx();
    var result, err = null;
    try { result = fn.apply(self, args || []); }
    catch (e) { err = e; }
    try {
      txCommit();   // Apps Script এর মতো: ভুল হলেও তার আগের লেখা থাকে
    } catch (ce) {
      if (ce.conflict && attempt < 3) { SHEET_CACHE = {}; PROP_CACHE = null; continue; }
      if (TX.locked) STORE.unlock();
      TX = null;
      throw ce;
    }
    if (TX.locked) STORE.unlock();
    TX = null;
    if (err) throw err;
    return result;
  }
}
function plain(v) {
  // google.script.run এর মতো: Date -> ISO স্ট্রিং নয়, বরং বাদ (Apps Script null দেয়) — আমরা ISO দিই যাতে কিছু ভাঙে না
  return v === undefined ? null : JSON.parse(JSON.stringify(v, function (k, x) { return x instanceof Date ? x.toISOString() : x; }) || 'null');
}
/** বাকি থাকা টাইম-ট্রিগার (অটো ব্যাকআপ ইত্যাদি) — অ্যাপ খুললে চলে */
function runDueTriggers() {
  TX = newTx();
  var list = trigList(); TX = null;
  var now = Date.now(), ran = [];
  list.forEach(function (t) {
    if (t.event && t.event !== 'CLOCK') return;
    var key = '__trig_last_' + t.fn;
    TX = newTx(); var last = Number(new Props('script').getProperty(key) || 0); TX = null;
    var due = t.once ? now >= t.once : t.ms && now - last >= t.ms;
    if (!due || typeof self[t.fn] !== 'function') return;
    try { runCall('__scsTriggerWrap', [t.fn, key, !!t.once, t.id]); ran.push(t.fn); } catch (e) { console.warn('trigger', t.fn, e); }
  });
  return ran;
}
self.__scsTriggerWrap = function (fn, key, once, id) {
  new Props('script').setProperty(key, String(Date.now()));
  if (once) trigSave(trigList().filter(function (t) { return t.id !== id; }));
  return self[fn]({ triggerUid: id, authMode: 'FULL' });
};

self.onmessage = function (ev) {
  var m = ev.data || {};
  if (m.type === 'init') {
    CFG = m.cfg;
    CFG.tz = CFG.tz || 'Asia/Dhaka';
    STORE = CFG.store === 'memory' ? new MemoryStore(m.seed) : new SupabaseStore();
    HTML_FILES = m.files || {};
    try {
      (0, eval)(m.code + '\n;\n' + (m.adapter || '') + '\n//# sourceURL=' + CFG.app + '-Code.gs');
      self.postMessage({ type: 'ready' });
    } catch (e) {
      self.postMessage({ type: 'fatal', error: 'Code.gs error: ' + (e && e.message || e) });
    }
    return;
  }
  if (m.type === 'token') { CFG.token = m.token; return; }
  if (m.type === 'cfg') { Object.assign(CFG, m.cfg || {}); return; }
  if (m.type === 'dump') { self.postMessage({ type: 'dump', id: m.id, data: STORE.dump ? STORE.dump() : null, audit: self.__AUDIT || [] }); return; }
  if (m.type === 'call' || m.type === 'triggers') {
    var t0 = Date.now();
    try {
      var r = m.type === 'triggers' ? runDueTriggers() : runCall(m.fn, m.args);
      self.postMessage({ type: 'result', id: m.id, ok: true, value: plain(r), ms: Date.now() - t0 });
    } catch (e) {
      self.postMessage({ type: 'result', id: m.id, ok: false, error: String((e && e.message) || e), ms: Date.now() - t0 });
    }
  }
};
