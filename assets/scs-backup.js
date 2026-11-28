/* =====================================================================
 *  SCS Management — ব্যাকআপ · রিস্টোর · রিসেট (v15) — সব অ্যাপে একই ব্যবস্থা, একই চেহারা
 *
 *  scope = অ্যাপের key (যেমন 'quotation'), অথবা '*' = সব অ্যাপ + সিস্টেম (Admin Console)
 *  ব্যাকআপ ফাইল (.scsbackup.gz) = gzip করা NDJSON: প্রতি লাইনে একটা রেকর্ড
 *    {format:'scs-backup', v:3, scope, apps, created_at}            (প্রথম লাইন)
 *    {t:'sheet', app, name, idx, meta, part, parts, rows:[...]}     (বড় শিট কয়েক টুকরোয়)
 *    {t:'props', app, items:[{key,value}]}                          (সেটিং; পিন/গোপন কী থাকে না)
 *    {t:'file', app, row} + {t:'blob', app, id, part, parts, b64}   (অ্যাপের ফাইল)
 *    {t:'table', name, part, rows}                                  (শুধু '*': ইউজার, লগ, সেটিং…)
 *    {t:'end', counts}
 *  ফাইল যত বড়ই হোক: পড়া/লেখা টুকরো টুকরো (পুরো ফাইল একসাথে মেমরিতে রাখতে হয় না)।
 *  পুরনো অ্যাপের নিজের JSON ব্যাকআপও (যেমন SCS Quotation এর scsq-backup) রিস্টোর হয়।
 * ===================================================================== */
(function () {
  'use strict';
  var SCS = window.SCS, T = function (en, bn) { return SCS.t(en, bn); }, esc = SCS.esc;
  var CFG = window.SCS_CONFIG || {};
  var SECRET = /(pin|pass|secret|token|api_?key|apikey|hash|otp)/i;
  var CHUNK_FROM = 1500000, CHUNK_MAX = 4000000, CHUNK_MINSZ = 400000;   // assets/gas/runtime.js এর মতোই
  var RESET_MIN = 10;

  /* ------------------------------------------------------------ টুকরো (runtime.js এর মতোই) */
  function strHash(s) {
    var h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (var i = 0, ch; i < s.length; i++) { ch = s.charCodeAt(i); h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677); }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return ('0000000' + (h2 >>> 0).toString(16)).slice(-8) + ('0000000' + (h1 >>> 0).toString(16)).slice(-8);
  }
  function splitChunks(rowStrs) {
    var out = [], a = 0, size = 0;
    for (var i = 0; i < rowStrs.length; i++) {
      var s = rowStrs[i]; size += s.length + 1;
      var cut = size >= CHUNK_MAX || (size >= CHUNK_MINSZ && parseInt(strHash(s.length + '|' + s.slice(-160)).slice(-2), 16) % 8 === 0);
      if (cut || i === rowStrs.length - 1) {
        var body = '[' + rowStrs.slice(a, i + 1).join(',') + ']';
        out.push({ h: strHash(body) + (i + 1 - a).toString(36), body: body });
        a = i + 1; size = 0;
      }
    }
    return out;
  }

  /* ------------------------------------------------------------ সার্ভার */
  var sb = function () { return SCS.sb; };
  function rpc(fn, args) { return SCS.q(sb().rpc(fn, args || {})); }
  function token() {
    return sb().auth.getSession().then(function (r) { var s = r && r.data && r.data.session; if (!s) throw new Error(T('Please log in again.', 'আবার লগইন করুন।')); return s.access_token; });
  }
  /** বড় JSON সরাসরি পাঠানো (supabase-js আবার stringify না করে) */
  function rawRpc(fn, rawBody) {
    return token().then(function (tk) {
      return fetch(String(CFG.SUPABASE_URL).replace(/\/+$/, '') + '/rest/v1/rpc/' + fn, {
        method: 'POST', headers: { apikey: CFG.SUPABASE_ANON_KEY, Authorization: 'Bearer ' + tk, 'Content-Type': 'application/json' }, body: rawBody
      }).then(function (r) {
        if (r.ok) return r.text().then(function (t) { try { return t ? JSON.parse(t) : null; } catch (e) { return t; } });
        return r.text().then(function (t) { var j = null; try { j = JSON.parse(t); } catch (e) {} throw new Error((j && (j.message || j.error)) || ('Server error ' + r.status)); });
      });
    });
  }
  function retry(fn, n) {
    return fn().catch(function (e) {
      if ((n || 0) >= 3 || /access|permission|not allowed|required|wrong|ভুল/i.test(String(e && e.message))) throw e;
      return new Promise(function (r) { setTimeout(r, 1200 * ((n || 0) + 1)); }).then(function () { return retry(fn, (n || 0) + 1); });
    });
  }
  function appsList() { return ((SCS.me && SCS.me.apps) || []).map(function (a) { return a.key; }); }
  function appName(k) { var a = ((SCS.me && SCS.me.apps) || []).filter(function (x) { return x.key === k; })[0]; return a ? a.name : k; }

  /* ------------------------------------------------------------ ব্যাকআপ তৈরি (ব্রাউজারে) */
  function makeWriter() {
    var gz = new CompressionStream('gzip'), w = gz.writable.getWriter(), rd = gz.readable.getReader(), parts = [], size = 0, te = new TextEncoder();
    var pump = (function loop() { return rd.read().then(function (x) { if (x.done) return; parts.push(x.value); size += x.value.length; return loop(); }); })();
    return {
      line: function (o) { return w.write(te.encode(JSON.stringify(o) + '\n')); },
      close: function () { return w.close().then(function () { return pump; }).then(function () { return { blob: new Blob(parts, { type: 'application/gzip' }), size: size }; }); }
    };
  }
  function emitApp(app, W, prog, counts) {
    return SCS.q(sb().from('gas_sheets').select('name,idx').eq('app_key', app).order('idx').order('name')).then(function (list) {
      var chain = Promise.resolve();
      list.forEach(function (s) {
        chain = chain.then(function () {
          prog(T('Sheet: ', 'শিট: ') + s.name);
          return SCS.q(sb().from('gas_sheets').select('name,idx,meta,chunks,data').eq('app_key', app).eq('name', s.name).maybeSingle()).then(function (row) {
            if (!row) return;
            counts.sheets++;
            var hs = row.chunks && row.chunks.length ? row.chunks : null;
            if (!hs) return W.line({ t: 'sheet', app: app, name: row.name, idx: row.idx, meta: row.meta || {}, part: 0, parts: 1, rows: row.data || [] });
            var c2 = Promise.resolve();
            hs.forEach(function (h, i) {
              c2 = c2.then(function () {
                return SCS.q(sb().from('gas_chunks').select('data').eq('app_key', app).eq('name', row.name).eq('h', h).maybeSingle()).then(function (c) {
                  return W.line({ t: 'sheet', app: app, name: row.name, idx: row.idx, meta: row.meta || {}, part: i, parts: hs.length, rows: (c && c.data) || [] });
                });
              });
            });
            return c2;
          });
        });
      });
      return chain;
    }).then(function () {
      return SCS.q(sb().from('gas_props').select('key,value').eq('app_key', app).eq('scope', 'script'));
    }).then(function (props) {
      props = (props || []).filter(function (p) { return !SECRET.test(p.key); });
      counts.props += props.length;
      return W.line({ t: 'props', app: app, items: props });
    }).then(function () {
      return SCS.q(sb().from('gas_files').select('*').eq('app_key', app).order('created_at'));
    }).then(function (files) {
      var chain = Promise.resolve();
      (files || []).forEach(function (f) {
        chain = chain.then(function () {
          counts.files++;
          return W.line({ t: 'file', app: app, row: f }).then(function () {
            if (f.is_folder || !f.path) return;
            prog(T('File: ', 'ফাইল: ') + f.name);
            return sb().storage.from('scs-files').download(f.path).then(function (r) {
              if (r.error || !r.data) return W.line({ t: 'blob', app: app, id: f.id, part: 0, parts: 1, missing: true });
              return r.data.arrayBuffer().then(function (buf) {
                var u8 = new Uint8Array(buf), P = 3 * 1024 * 1024, n = Math.max(1, Math.ceil(u8.length / P)), c3 = Promise.resolve();
                for (var i = 0; i < n; i++) (function (i) { c3 = c3.then(function () { return W.line({ t: 'blob', app: app, id: f.id, part: i, parts: n, b64: b64(u8.subarray(i * P, (i + 1) * P)) }); }); })(i);
                return c3;
              });
            });
          });
        });
      });
      return chain;
    });
  }
  function b64(u8) { var s = ''; for (var i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); }
  function unb64(s) { var bin = atob(s), u = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; }

  /** লাইফটাইম ব্যাকআপ (সব, সেটিংসসহ) ডিভাইসে ডাউনলোড */
  function backupDownload(scope, prog) {
    if (typeof CompressionStream === 'undefined') return Promise.reject(new Error(T('This browser is too old for backups. Use the latest Chrome / Edge.', 'এই ব্রাউজারে ব্যাকআপ হয় না। নতুন Chrome / Edge ব্যবহার করুন।')));
    var W = makeWriter(), counts = { sheets: 0, props: 0, files: 0, tables: 0 };
    var apps = scope === '*' ? appsList() : [scope];
    var p = W.line({ format: 'scs-backup', v: 3, scope: scope, apps: apps, created_at: new Date().toISOString(), by: (SCS.me && SCS.me.email) || '', note: 'Restore: open the app > Settings ⚙ > Backup · Restore · Reset > Restore.' });
    apps.forEach(function (a) { p = p.then(function () { prog(T('App: ', 'অ্যাপ: ') + appName(a)); return emitApp(a, W, prog, counts); }); });
    if (scope === '*') {
      p = p.then(function () { return rpc('scs_backup_tables'); }).then(function (tables) {
        var c = Promise.resolve();
        (tables || []).forEach(function (t) {
          c = c.then(function () {
            prog(T('Table: ', 'টেবিল: ') + t.t);
            var off = 0, part = 0;
            function page() {
              return rpc('scs_backup_table_page', { p_table: t.t, p_offset: off, p_limit: 2000 }).then(function (rows) {
                rows = rows || [];
                return W.line({ t: 'table', name: t.t, part: part, rows: rows }).then(function () { off += 2000; part++; if (rows.length === 2000) return page(); });
              });
            }
            counts.tables++;
            return page();
          });
        });
        return c;
      });
    }
    var fname = 'SCS-' + (scope === '*' ? 'ALL' : scope) + '-' + SCS.fmt(new Date(), 'yyyy-MM-dd_HH-mm-ss') + '.scsbackup.gz';
    return p.then(function () { return W.line({ t: 'end', counts: counts }); }).then(function () { return W.close(); }).then(function (res) {
      var a = document.createElement('a'); a.href = URL.createObjectURL(res.blob); a.download = fname;
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 60000);
      return rpc('scs_backup_mark', { p_scope: scope, p_kind: 'download', p_file: fname, p_size: res.size }).then(function (m) { return { file: fname, size: res.size, counts: counts, mark: m }; });
    });
  }

  /* ------------------------------------------------------------ ব্যাকআপ ফাইল পড়া */
  function isGz(file) { return file.slice(0, 2).arrayBuffer().then(function (b) { var u = new Uint8Array(b); return u[0] === 0x1f && u[1] === 0x8b; }); }
  function textStream(file) {
    return isGz(file).then(function (gz) {
      var s = file.stream();
      if (gz) { if (typeof DecompressionStream === 'undefined') throw new Error(T('This browser cannot open .gz backups. Use the latest Chrome / Edge.', 'এই ব্রাউজারে .gz ব্যাকআপ খোলে না। নতুন Chrome / Edge ব্যবহার করুন।')); s = s.pipeThrough(new DecompressionStream('gzip')); }
      return s.pipeThrough(new TextDecoderStream());
    });
  }
  /** প্রথম কয়েকটা অক্ষর: NDJSON (নতুন) নাকি পুরো JSON (পুরনো) */
  function sniff(file) {
    return textStream(file).then(function (st) {
      var rd = st.getReader(), txt = '';
      function more() { return rd.read().then(function (x) { if (!x.done) txt += x.value; if (x.done || txt.length > 4000 || txt.indexOf('\n') > 0) { rd.cancel().catch(function () {}); return txt; } return more(); }); }
      return more();
    }).then(function (head) {
      var first = head.split('\n')[0].trim();
      try { var o = JSON.parse(first); if (o && o.format === 'scs-backup') return { kind: 'ndjson', head: o }; } catch (e) {}
      return { kind: 'json' };
    });
  }
  /** প্রতিটা লাইন ক্রমে cb(obj) — আগেরটা শেষ হলে পরেরটা */
  function eachLine(file, cb, onBytes) {
    return textStream(file).then(function (st) {
      var rd = st.getReader(), buf = '', n = 0;
      function handle(line) { line = line.trim(); if (!line) return Promise.resolve(); n++; return Promise.resolve(cb(JSON.parse(line), n)); }
      function loop() {
        return rd.read().then(function (x) {
          if (x.done) return handle(buf);
          buf += x.value; if (onBytes) onBytes(x.value.length);
          var parts = buf.split('\n'); buf = parts.pop();
          var c = Promise.resolve();
          parts.forEach(function (l) { c = c.then(function () { return handle(l); }); });
          return c.then(loop);
        });
      }
      return loop();
    });
  }
  function readAllText(file) {
    return textStream(file).then(function (st) {
      var rd = st.getReader(), parts = [];
      function loop() { return rd.read().then(function (x) { if (x.done) return parts.join(''); parts.push(x.value); return loop(); }); }
      return loop();
    });
  }

  /** ফাইলের সূচি: কোন অ্যাপের কোন শিট, কত রো, সেটিং, ফাইল, টেবিল */
  function indexBackup(file, prog) {
    return sniff(file).then(function (sn) {
      if (sn.kind === 'ndjson') {
        var ix = { kind: 'ndjson', head: sn.head, apps: {}, tables: {} }, read = 0;
        var A = function (a) { return ix.apps[a] || (ix.apps[a] = { sheets: {}, order: [], props: 0, hasProps: false, files: 0 }); };
        return eachLine(file, function (o) {
          if (o.t === 'sheet') { var ap = A(o.app); if (!ap.sheets[o.name]) { ap.sheets[o.name] = { rows: 0, parts: o.parts, idx: o.idx }; ap.order.push(o.name); } ap.sheets[o.name].rows += (o.rows || []).length; }
          else if (o.t === 'props') { A(o.app).props += (o.items || []).length; A(o.app).hasProps = true; }
          else if (o.t === 'file') { A(o.app).files++; }
          else if (o.t === 'table') { ix.tables[o.name] = (ix.tables[o.name] || 0) + (o.rows || []).length; }
          else if (o.t === 'end') ix.complete = true;
        }, function (b) { read += b; prog && prog(T('Reading the file… ', 'ফাইল পড়া হচ্ছে… ') + mb(read)); }).then(function () { return ix; });
      }
      prog && prog(T('Reading the file…', 'ফাইল পড়া হচ্ছে…'));
      return readAllText(file).then(function (txt) {
        var o; try { o = JSON.parse(txt); } catch (e) { throw new Error(T('This is not a backup file (not JSON).', 'এটা ব্যাকআপ ফাইল নয় (JSON না)।')); }
        txt = null;
        return legacyIndex(o);
      });
    });
  }
  function mb(n) { return (n / 1048576).toFixed(n > 10485760 ? 0 : 1) + ' MB'; }

  /* পুরনো ধরন: অ্যাপের নিজের ব্যাকআপ {sheets:{নাম:{head,rows}}} (Quotation, Workspace, Projects…) বা SCS Management এর পুরনো টোটাল ব্যাকআপ */
  function legacyIndex(o) {
    if (o && o.format === 'scs-management-backup' && o.tables) {
      var ix = { kind: 'legacy-all', data: o, apps: {}, tables: {} };
      Object.keys(o.tables).forEach(function (t) { ix.tables[t] = (o.tables[t] || []).length; });
      return ix;
    }
    var sh = o && o.sheets;
    if (sh && typeof sh === 'object' && !Array.isArray(sh)) {
      var ap = { sheets: {}, order: [], props: 0, files: 0, legacy: true };
      Object.keys(sh).forEach(function (n) {
        var v = sh[n], rows = Array.isArray(v) ? v : (v && Array.isArray(v.rows) ? (v.head ? [v.head] : []).concat(v.rows) : null);
        if (!rows) return;
        ap.sheets[n] = { rows: rows.length, parts: 1, data: rows }; ap.order.push(n);
      });
      if (ap.order.length) return { kind: 'legacy-app', head: { app: o.app, kind: o.kind, created_at: o.createdAt || o.created_at }, apps: { '?': ap }, tables: {} };
    }
    throw new Error(T('This file is from an older version of the app and its format is not known. Please send it to the developer.', 'এই ফাইলটা অ্যাপের পুরনো ভার্সনের, ফরম্যাট চেনা যাচ্ছে না। ডেভেলপারকে পাঠান।'));
  }

  /* ------------------------------------------------------------ রিস্টোর */
  function putSheetRows(app, name, rows, chunks) {
    var strs = rows.map(function (r) { return JSON.stringify(r); });
    var list = splitChunks(strs), c = Promise.resolve();
    list.forEach(function (ch) {
      c = c.then(function () {
        var body = '{"p_app":' + JSON.stringify(app) + ',"p_name":' + JSON.stringify(name) + ',"p_h":"' + ch.h + '","p_data":' + ch.body + '}';
        return retry(function () { return rawRpc('gas_put_chunk', body); }).then(function () { chunks.push(ch.h); });
      });
    });
    return c;
  }
  function sheetSize(rows) { var n = 0; for (var i = 0; i < rows.length; i++) { n += JSON.stringify(rows[i]).length + 1; if (n > CHUNK_FROM) return n; } return n; }
  function finishSheet(app, name, idx, meta, rows, chunks) {
    var sheet = { name: name, idx: idx || 0, meta: meta || {} };
    if (chunks) sheet.chunks = chunks; else sheet.data = rows;
    if (chunks) return retry(function () { return rpc('gas_restore_sheet', { p_app: app, p_sheet: sheet }); });
    return retry(function () { return rawRpc('gas_restore_sheet', JSON.stringify({ p_app: app, p_sheet: sheet })); });
  }
  /** পুরনো ধরনের Settings শিট: বর্তমান পিন/গোপন সারিগুলো রেখে বাকিটা ব্যাকআপ থেকে */
  function keepSecretsRows(app, name, rows) {
    return SCS.q(sb().from('gas_sheets').select('data,chunks').eq('app_key', app).eq('name', name).maybeSingle()).then(function (cur) {
      var curRows = (cur && cur.data) || [], keep = curRows.slice(1).filter(function (r) { return r && SECRET.test(String(r[0] || '')); });
      var out = rows.filter(function (r, i) { return i === 0 || !SECRET.test(String((r || [])[0] || '')) && !/^backup_cfg$/i.test(String((r || [])[0] || '')); });
      return out.concat(keep);
    }).catch(function () { return rows; });
  }

  /**
   * sel = { full: true }  অথবা  { full: false, apps: { app: { sheets: {name:true}, props: bool, files: bool } }, tables: {t:true} }
   * target = রিস্টোর কোন অ্যাপে (app scope এ সবসময় সেই অ্যাপ)
   */
  function restore(file, ix, scope, sel, prog) {
    var note = (file.name || 'file') + ' · ' + (ix.head && ix.head.created_at ? ix.head.created_at : '');
    var want = function (app, kind, name) {
      if (sel.full) return true;
      var a = sel.apps && sel.apps[app]; if (!a) return false;
      if (kind === 'sheet') return !!(a.sheets && a.sheets[name]);
      return !!a[kind];
    };
    var target = function (app) { return scope === '*' ? app : scope; };
    if (ix.kind === 'legacy-app') {
      var ap = ix.apps['?'], names = ap.order.filter(function (n) { return want('?', 'sheet', n); }), c = Promise.resolve();
      names.forEach(function (n, i) {
        c = c.then(function () {
          prog(T('Restoring ', 'রিস্টোর হচ্ছে ') + n + ' (' + (i + 1) + '/' + names.length + ')');
          var rows = ap.sheets[n].data;
          return (/setting/i.test(n) ? keepSecretsRows(scope, n, rows) : Promise.resolve(rows)).then(function (rows2) {
            if (sheetSize(rows2) <= CHUNK_FROM) return finishSheet(scope, n, ap.sheets[n].idx, {}, rows2, null);
            var chunks = []; return putSheetRows(scope, n, rows2, chunks).then(function () { return finishSheet(scope, n, ap.sheets[n].idx, {}, null, chunks); });
          });
        });
      });
      return c.then(function () { return rpc('gas_restore_finish', { p_app: scope, p_names: names, p_full: false, p_props: null, p_note: 'old-format file · ' + note }); });
    }
    if (ix.kind === 'legacy-all') {
      var tbls = Object.keys(ix.data.tables).filter(function (t) { return sel.full || (sel.tables && sel.tables[t]); }), c4 = Promise.resolve(), res = {};
      tbls.forEach(function (t) {
        var rows = ix.data.tables[t] || [];
        for (var i = 0; i < Math.max(1, rows.length); i += 1000) (function (part) {
          c4 = c4.then(function () {
            prog(T('Table: ', 'টেবিল: ') + t);
            var o = { format: 'scs-management-backup', tables: {} }; o.tables[t] = part;
            return rpc('scs_backup_restore', { p: o }).then(function (r) { res[t] = (res[t] || 0) + (Number(r && r[t]) || 0); });
          });
        })(rows.slice(i, i + 1000));
      });
      return c4.then(function () { return res; });
    }
    // নতুন ধরন: লাইন ধরে ধরে (মেমরিতে একবারে একটা শিট/ফাইল)
    var cur = null, blobs = {}, fileRows = {}, done = {}, propsBy = {}, tablesOut = {};
    function flushSheet() {
      if (!cur) return Promise.resolve();
      var s = cur; cur = null;
      var app = target(s.app);
      (done[app] = done[app] || []).push(s.name);
      if (!s.chunks && sheetSize(s.rows) <= CHUNK_FROM) return finishSheet(app, s.name, s.idx, s.meta, s.rows, null);
      var chain = s.rows.length ? putSheetRows(app, s.name, s.rows, s.chunks = s.chunks || []) : Promise.resolve();
      s.rows = [];
      return chain.then(function () { return finishSheet(app, s.name, s.idx, s.meta, null, s.chunks); });
    }
    return eachLine(file, function (o) {
      if (o.format === 'scs-backup' || o.t === 'end') return flushSheet();
      if (o.t === 'sheet') {
        if (!want(o.app, 'sheet', o.name)) return;
        var same = cur && cur.app === o.app && cur.name === o.name;
        return (same ? Promise.resolve() : flushSheet()).then(function () {
          if (!cur) { cur = { app: o.app, name: o.name, idx: o.idx, meta: o.meta, rows: [], chunks: null }; prog(T('Restoring ', 'রিস্টোর হচ্ছে ') + o.name); }
          if (o.parts > 1 || cur.chunks) {     // বড় শিট: প্রতিটা অংশ আসার সাথে সাথে আপলোড
            cur.chunks = cur.chunks || [];
            return putSheetRows(target(o.app), o.name, o.rows || [], cur.chunks);
          }
          cur.rows = cur.rows.concat(o.rows || []);
        });
      }
      return flushSheet().then(function () {
        var app = target(o.app);
        if (o.t === 'props' && want(o.app, 'props')) propsBy[app] = (o.items || []).filter(function (p) { return !SECRET.test(p.key); });
        if (o.t === 'file' && want(o.app, 'files')) {
          var row = Object.assign({}, o.row, { app_key: app });
          if (row.path && o.app !== app) row.path = row.path.replace(/^gas\/[^/]+\//, 'gas/' + app + '/');
          fileRows[o.row.id] = row; prog(T('File: ', 'ফাইল: ') + (row.name || row.id));
          return retry(function () { return SCS.q(sb().from('gas_files').upsert(row, { onConflict: 'id' })); });
        }
        if (o.t === 'blob' && fileRows[o.id] && !o.missing) {
          (blobs[o.id] = blobs[o.id] || [])[o.part] = unb64(o.b64 || '');
          if (blobs[o.id].filter(Boolean).length === o.parts) {
            var fr = fileRows[o.id], blob = new Blob(blobs[o.id], { type: fr.mime || 'application/octet-stream' }); delete blobs[o.id];
            return retry(function () { return sb().storage.from('scs-files').upload(fr.path, blob, { upsert: true, contentType: fr.mime || 'application/octet-stream' }).then(function (r) { if (r.error) throw r.error; }); });
          }
        }
        if (o.t === 'table' && (sel.full || (sel.tables && sel.tables[o.name])) && scope === '*') {
          prog(T('Table: ', 'টেবিল: ') + o.name);
          var oo = { format: 'scs-management-backup', tables: {} }; oo.tables[o.name] = o.rows || [];
          return rpc('scs_backup_restore', { p: oo }).then(function (r) { tablesOut[o.name] = (tablesOut[o.name] || 0) + (Number(r && r[o.name]) || 0); });
        }
      });
    }).then(flushSheet).then(function () {
      var apps = scope === '*' ? Object.keys(ix.apps).filter(function (a) { return sel.full || sel.apps && sel.apps[a]; }) : [scope], c = Promise.resolve();
      apps.forEach(function (a) {
        c = c.then(function () {
          var src = scope === '*' ? a : Object.keys(ix.apps)[0];
          var full = !!sel.full;
          prog(T('Finishing ', 'শেষ করা হচ্ছে ') + appName(a));
          return rpc('gas_restore_finish', { p_app: a, p_names: done[a] || [], p_full: full, p_props: propsBy[a] || (want(src, 'props') ? [] : null), p_note: note });
        });
      });
      return c.then(function () { return { sheets: done, tables: tablesOut }; });
    });
  }

  /* ------------------------------------------------------------ প্যানেল (UI) */
  var CSS = '.scs-bk{font-family:"Hind Siliguri","Inter",system-ui,-apple-system,sans-serif;color:#0f172a;font-size:14px;line-height:1.5;box-sizing:border-box}' +
    '.scs-bk *{box-sizing:border-box}.scs-bk .wrap{max-width:820px;margin:0 auto;padding:16px 14px 40px}' +
    '.scs-bk .hero{display:flex;gap:12px;align-items:center;margin-bottom:14px}.scs-bk .hero .ic{width:46px;height:46px;border-radius:14px;background:linear-gradient(135deg,#e91e63,#f472b6);color:#fff;display:flex;align-items:center;justify-content:center;font-size:22px;box-shadow:0 10px 24px rgba(233,30,99,.25);flex:none}' +
    '.scs-bk .hero b{font-size:17px;display:block}.scs-bk .hero small{color:#64748b;font-size:12.5px}' +
    '.scs-bk .tabs{display:flex;gap:6px;background:#eef0f4;padding:4px;border-radius:14px;margin-bottom:14px}' +
    '.scs-bk .tabs button{flex:1;border:0;background:none;padding:10px 6px;border-radius:11px;font:inherit;font-weight:700;color:#475569;cursor:pointer}' +
    '.scs-bk .tabs button.on{background:#fff;color:#e91e63;box-shadow:0 2px 8px rgba(15,23,42,.08)}' +
    '.scs-bk .card{background:#fff;border:1px solid #e7e9ee;border-radius:18px;padding:16px;margin-bottom:12px;box-shadow:0 1px 2px rgba(15,23,42,.04)}' +
    '.scs-bk h3{margin:0 0 4px;font-size:15.5px}.scs-bk p.mut,.scs-bk .mut{color:#64748b;font-size:12.5px;margin:0}' +
    '.scs-bk .row{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:10px}' +
    '.scs-bk .btn{border:0;border-radius:12px;padding:10px 15px;font:inherit;font-weight:700;cursor:pointer;background:#f1f5f9;color:#0f172a;display:inline-flex;align-items:center;gap:6px}' +
    '.scs-bk .btn:hover{filter:brightness(.97)}.scs-bk .btn:disabled{opacity:.45;cursor:not-allowed}' +
    '.scs-bk .btn.p{background:#e91e63;color:#fff;box-shadow:0 6px 16px rgba(233,30,99,.25)}.scs-bk .btn.d{background:#dc2626;color:#fff}' +
    '.scs-bk .in{border:1px solid #d9dde5;border-radius:11px;padding:9px 11px;font:inherit;background:#fff;color:#0f172a;outline:none}' +
    '.scs-bk .in:focus{border-color:#e91e63;box-shadow:0 0 0 3px rgba(233,30,99,.12)}' +
    '.scs-bk .sw{display:flex;gap:10px;align-items:flex-start;padding:10px 0;border-top:1px solid #f1f3f6;cursor:pointer}.scs-bk .sw:first-of-type{border-top:0}' +
    '.scs-bk .sw input{width:18px;height:18px;accent-color:#e91e63;margin-top:2px;flex:none}' +
    '.scs-bk .pill{display:inline-block;font-size:11px;font-weight:800;padding:2px 8px;border-radius:99px;background:#f1f5f9;color:#475569}' +
    '.scs-bk .pill.ok{background:#dcfce7;color:#166534}.scs-bk .pill.bad{background:#fee2e2;color:#991b1b}.scs-bk .pill.wait{background:#fef9c3;color:#854d0e}' +
    '.scs-bk .msg{margin-top:10px;padding:10px 12px;border-radius:12px;font-size:13px}.scs-bk .msg.ok{background:#ecfdf5;color:#065f46}.scs-bk .msg.bad{background:#fef2f2;color:#991b1b}.scs-bk .msg.info{background:#eff6ff;color:#1e40af}' +
    '.scs-bk .bar{height:8px;border-radius:99px;background:#eef0f4;overflow:hidden;margin-top:10px}.scs-bk .bar i{display:block;height:100%;width:35%;background:linear-gradient(90deg,#e91e63,#f472b6);border-radius:99px;animation:scsBk 1.2s ease-in-out infinite}' +
    '@keyframes scsBk{0%{margin-left:-35%}100%{margin-left:100%}}' +
    '.scs-bk table{width:100%;border-collapse:collapse;font-size:12.5px;margin-top:8px}.scs-bk td,.scs-bk th{padding:7px 6px;border-top:1px solid #f1f3f6;text-align:left;vertical-align:top}.scs-bk th{color:#64748b;font-weight:700}' +
    '.scs-bk .seg{display:flex;gap:8px;flex-wrap:wrap}.scs-bk .seg label{flex:1;min-width:200px;border:2px solid #e7e9ee;border-radius:14px;padding:12px;cursor:pointer}.scs-bk .seg label.on{border-color:#e91e63;background:#fff5f9}' +
    '.scs-bk .seg b{display:block}.scs-bk .list{max-height:320px;overflow:auto;border:1px solid #eef0f4;border-radius:12px;padding:2px 10px;margin-top:8px}' +
    '.scs-bk .danger{border:2px solid #fecaca;background:#fffafa}.scs-bk .steps{display:flex;gap:6px;margin:10px 0}.scs-bk .steps span{flex:1;height:6px;border-radius:99px;background:#eef0f4}.scs-bk .steps span.on{background:#dc2626}' +
    '.scs-bk .cd{font-variant-numeric:tabular-nums;font-weight:800;color:#dc2626}' +
    '@media (max-width:520px){.scs-bk .wrap{padding:12px 10px 30px}.scs-bk .tabs button{font-size:12.5px;padding:9px 4px}}';
  function css() { if (document.getElementById('scs-bk-css')) return; var s = document.createElement('style'); s.id = 'scs-bk-css'; s.textContent = CSS; document.head.appendChild(s); }

  function Panel(root, scope) {
    css();
    var P = { tab: 'backup', info: null, busy: '', msg: null, file: null, ix: null, sel: null, mode: 'full', rs: { step: 1 }, timer: null };
    var isAll = scope === '*';
    var title = isAll ? T('All apps & system', 'সব অ্যাপ ও সিস্টেম') : appName(scope);
    root.classList.add('scs-bk');

    function load() {
      return rpc('scs_backup_info', { p_scope: scope }).then(function (i) { P.info = i; P.loadedAt = Date.now(); render(); })
        .catch(function (e) { P.info = { error: SCS.err(e) }; render(); });
    }
    function setBusy(t) { P.busy = t || ''; var b = root.querySelector('[data-busy]'); if (b) b.textContent = P.busy; else render(); }
    function done(msg, type) { P.busy = ''; P.msg = msg ? { t: msg, type: type || 'ok' } : null; render(); }
    function when(t) { return t ? SCS.fmt(t, 'd MMM yyyy, HH:mm') : '—'; }

    function render() {
      var i = P.info, h = '<div class="wrap">';
      h += '<div class="hero"><div class="ic">💾</div><div><b>' + T('Backup · Restore · Reset', 'ব্যাকআপ · রিস্টোর · রিসেট') + '</b><small>' + esc(title) + '</small></div></div>';
      h += '<div class="tabs">' + [['backup', '☁️ ' + T('Backup', 'ব্যাকআপ')], ['restore', '♻️ ' + T('Restore', 'রিস্টোর')], ['reset', '🧹 ' + T('Reset', 'রিসেট')]].map(function (t) {
        return '<button type="button" data-tab="' + t[0] + '" class="' + (P.tab === t[0] ? 'on' : '') + '">' + t[1] + '</button>';
      }).join('') + '</div>';
      if (!i) h += '<div class="card"><div class="bar"><i></i></div></div>';
      else if (i.error) h += '<div class="card"><div class="msg bad">' + esc(i.error) + '</div><p class="mut" style="margin-top:8px">' + T('If this says a function is missing, run the latest supabase/schema.sql (v15) in Supabase.', 'ফাংশন নেই বললে Supabase এ নতুন supabase/schema.sql (v15) চালান।') + '</p></div>';
      else if (P.tab === 'backup') h += backupTab(i);
      else if (P.tab === 'restore') h += restoreTab(i);
      else h += resetTab(i);
      if (P.busy) h += '<div class="card"><b data-busy>' + esc(P.busy) + '</b><div class="bar"><i></i></div><p class="mut" style="margin-top:8px">' + T('Keep this page open until it finishes.', 'শেষ না হওয়া পর্যন্ত পাতাটা খোলা রাখুন।') + '</p></div>';
      if (P.msg) h += '<div class="msg ' + P.msg.type + '">' + P.msg.t + '</div>';
      root.innerHTML = h + '</div>';
      wire();
    }

    /* ---------- ব্যাকআপ ---------- */
    function backupTab(i) {
      var c = i.cfg || {}, on = !!c.on;
      var h = '<div class="card"><h3>⬇️ ' + T('Back up now', 'এখনই ব্যাকআপ') + '</h3><p class="mut">' +
        T('Everything A to Z — all data, settings and files (PINs are never inside). The file downloads to this device.', 'A থেকে Z সব — সব ডাটা, সেটিং আর ফাইল (পিন থাকে না)। ফাইলটা এই ডিভাইসে ডাউনলোড হবে।') + '</p>' +
        '<div class="row"><button class="btn p" type="button" data-do="dl"' + (P.busy ? ' disabled' : '') + '>⬇ ' + T('Download backup', 'ব্যাকআপ ডাউনলোড') + '</button>' +
        '<button class="btn" type="button" data-do="drive"' + (P.busy || !i.drive ? ' disabled' : '') + '>☁️ ' + T('Send to Google Drive now', 'এখনই Google Drive এ পাঠান') + '</button></div>' +
        (i.mark ? '<p class="mut" style="margin-top:8px">' + T('Last device backup: ', 'শেষ ডিভাইস ব্যাকআপ: ') + '<b>' + esc(when(i.mark.at)) + '</b></p>' : '') + '</div>';
      h += '<div class="card"><h3>⏱ ' + T('Automatic backup to Google Drive', 'Google Drive এ অটো ব্যাকআপ') + '</h3>';
      if (!i.drive) h += '<div class="msg info">' + (i.super ? T('Connect Google Drive first: Admin Console > Backup > Google Drive connection.', 'আগে Google Drive যুক্ত করুন: Admin Console > Backup > Google Drive সংযোগ।') : T('Google Drive is not connected yet. Ask the Super Admin to connect it (Admin Console > Backup).', 'Google Drive এখনো যুক্ত হয়নি। Super Admin কে বলুন (Admin Console > Backup)।')) + '</div>';
      h += '<label class="sw"><input type="checkbox" id="bkOn"' + (on ? ' checked' : '') + '><span><b>' + T('Auto backup ON', 'অটো ব্যাকআপ চালু') + '</b><br><span class="mut">' + T('A full (lifetime) backup goes to your Drive folder automatically.', 'নির্দিষ্ট সময় পরপর পুরো (লাইফটাইম) ব্যাকআপ নিজে থেকে Drive ফোল্ডারে যাবে।') + '</span></span></label>' +
        '<div class="row"><span>' + T('Every', 'প্রতি') + '</span><input class="in" id="bkN" type="number" min="1" style="width:84px" value="' + esc(c.n || 1) + '">' +
        '<select class="in" id="bkU">' + [['m', T('minutes', 'মিনিট')], ['h', T('hours', 'ঘণ্টা')], ['d', T('days', 'দিন')]].map(function (u) { return '<option value="' + u[0] + '"' + ((c.unit || 'd') === u[0] ? ' selected' : '') + '>' + u[1] + '</option>'; }).join('') + '</select>' +
        '<span class="mut">(' + T('minimum 5 minutes', 'কমপক্ষে ৫ মিনিট') + ')</span></div>' +
        '<label class="sw" style="margin-top:6px"><input type="checkbox" id="bkSkip"' + (c.skip !== false ? ' checked' : '') + '><span><b>' + T('Skip when nothing changed', 'কোনো পরিবর্তন না থাকলে ব্যাকআপ নেবে না') + '</b><br><span class="mut">' + T('Untick to back up every time, even without changes.', 'টিক তুলে দিলে পরিবর্তন না থাকলেও প্রতিবার ব্যাকআপ হবে।') + '</span></span></label>' +
        '<div class="row"><span>' + T('Keep the last', 'শেষের') + '</span><input class="in" id="bkKeep" type="number" min="0" style="width:84px" value="' + esc(c.keep != null ? c.keep : 30) + '"><span>' + T('backups in Drive (0 = keep all)', 'টা ব্যাকআপ Drive এ রাখবে (0 = সব রাখবে)') + '</span></div>' +
        '<div class="row"><button class="btn p" type="button" data-do="save">💾 ' + T('Save', 'সেভ করুন') + '</button></div>';
      var st = [];
      if (c.last_ok) st.push('<span class="pill ok">✓ ' + T('Last: ', 'শেষ: ') + esc(when(c.last_ok)) + '</span>');
      if (c.last_skip) st.push('<span class="pill">' + T('Last check without changes: ', 'পরিবর্তন ছাড়া শেষ চেক: ') + esc(when(c.last_skip)) + '</span>');
      if (c.last_err) st.push('<span class="pill bad">⚠ ' + esc(c.last_err) + '</span>');
      if (st.length) h += '<div class="row">' + st.join(' ') + '</div>';
      h += '</div>';
      var runs = i.runs || [];
      if (runs.length) {
        h += '<div class="card"><h3>🧾 ' + T('History', 'ইতিহাস') + '</h3><table><tr><th>' + T('Time', 'সময়') + '</th><th>' + T('What', 'কী') + '</th><th>' + T('Result', 'ফলাফল') + '</th></tr>' + runs.map(function (r) {
          var k = { auto: T('Auto → Drive', 'অটো → Drive'), manual: T('Manual → Drive', 'হাতে → Drive'), download: T('Downloaded', 'ডাউনলোড'), restore: T('Restore', 'রিস্টোর'), reset: T('Reset', 'রিসেট') }[r.kind] || r.kind;
          return '<tr><td>' + esc(when(r.at)) + '</td><td>' + esc(k) + '<br><span class="mut">' + esc(r.file || '') + (r.size ? ' · ' + mb(r.size) : '') + '</span></td><td>' + (r.ok ? '<span class="pill ok">OK</span>' : r.ok === false ? '<span class="pill bad">' + esc(r.error || 'Failed') + '</span>' : '<span class="pill wait">…</span>') + '</td></tr>';
        }).join('') + '</table></div>';
      }
      return h;
    }

    /* ---------- রিস্টোর ---------- */
    function restoreTab() {
      var h = '<div class="card"><h3>📂 ' + T('Choose a backup file', 'ব্যাকআপ ফাইল বাছুন') + '</h3><p class="mut">' +
        T('A file downloaded from here or from Google Drive (.scsbackup.gz). Old backup files of the app (.json) also work. Any size.', 'এখান থেকে বা Google Drive থেকে নামানো ফাইল (.scsbackup.gz)। অ্যাপের পুরনো ব্যাকআপ (.json) ও চলবে। ফাইল যত বড়ই হোক।') + '</p>' +
        '<div class="row"><button class="btn p" type="button" data-do="pick">📂 ' + T('Choose file…', 'ফাইল বাছুন…') + '</button><input type="file" id="bkFile" accept=".gz,.json,.jsonl,.scsbackup,application/json,application/gzip" hidden>' +
        (P.file ? '<span class="mut">' + esc(P.file.name) + ' · ' + mb(P.file.size) + '</span>' : '') + '</div></div>';
      if (!P.ix) return h;
      var ix = P.ix, apps = Object.keys(ix.apps);
      h += '<div class="card"><h3>🔎 ' + T('What is inside', 'ফাইলে কী আছে') + '</h3><p class="mut">' +
        (ix.head && ix.head.created_at ? T('Backup time: ', 'ব্যাকআপের সময়: ') + '<b>' + esc(when(ix.head.created_at)) + '</b> · ' : '') +
        (ix.kind === 'legacy-app' ? T('older app backup format', 'অ্যাপের পুরনো ব্যাকআপ ফরম্যাট') : ix.kind === 'legacy-all' ? T('older full backup format', 'পুরনো টোটাল ব্যাকআপ ফরম্যাট') : '') +
        (ix.kind === 'ndjson' && !ix.complete ? ' <span class="pill bad">' + T('file is incomplete', 'ফাইল অসম্পূর্ণ') + '</span>' : '') + '</p>';
      h += '<div class="seg" style="margin-top:10px"><label class="' + (P.mode === 'full' ? 'on' : '') + '"><input type="radio" name="bkMode" value="full"' + (P.mode === 'full' ? ' checked' : '') + ' hidden><b>✅ ' + T('All (A to Z)', 'সব (A থেকে Z)') + '</b><span class="mut">' +
        (ix.kind === 'legacy-app' ? T('Every sheet in the file, settings included (PINs stay as they are).', 'ফাইলের সব শিট, সেটিংসসহ (পিন যেমন আছে থাকবে)।') : T('Everything becomes exactly like the backup, settings included (PINs stay as they are).', 'সবকিছু হুবহু ব্যাকআপের মতো হবে, সেটিংসসহ (পিন যেমন আছে থাকবে)।')) + '</span></label>' +
        '<label class="' + (P.mode === 'custom' ? 'on' : '') + '"><input type="radio" name="bkMode" value="custom"' + (P.mode === 'custom' ? ' checked' : '') + ' hidden><b>🎛 ' + T('Custom', 'কাস্টম') + '</b><span class="mut">' + T('Pick exactly which parts to bring back.', 'ঠিক কোন কোন অংশ ফেরত আনবেন বেছে নিন।') + '</span></label></div>';
      if (P.mode === 'custom') {
        h += '<div class="list">';
        apps.forEach(function (a) {
          var ap = ix.apps[a], lab = a === '?' ? title : appName(a);
          if (isAll) h += '<div style="padding:8px 0 2px;font-weight:800">🧩 ' + esc(lab) + '</div>';
          ap.order.forEach(function (n) { h += '<label class="sw"><input type="checkbox" data-sel="sheet" data-app="' + esc(a) + '" data-name="' + esc(n) + '" checked><span>📄 <b>' + esc(n) + '</b> <span class="mut">· ' + ap.sheets[n].rows + T(' rows', ' রো') + '</span></span></label>'; });
          if (ap.hasProps) h += '<label class="sw"><input type="checkbox" data-sel="props" data-app="' + esc(a) + '" checked><span>⚙️ <b>' + T('App settings', 'অ্যাপের সেটিং') + '</b> <span class="mut">· ' + ap.props + '</span></span></label>';
          if (ap.files) h += '<label class="sw"><input type="checkbox" data-sel="files" data-app="' + esc(a) + '" checked><span>📎 <b>' + T('Files', 'ফাইল') + '</b> <span class="mut">· ' + ap.files + '</span></span></label>';
        });
        var tb = Object.keys(ix.tables || {});
        if (tb.length && isAll) { h += '<div style="padding:8px 0 2px;font-weight:800">🛡 ' + T('System (accounts, access, logs, settings)', 'সিস্টেম (অ্যাকাউন্ট, অ্যাক্সেস, লগ, সেটিং)') + '</div>'; tb.forEach(function (t) { h += '<label class="sw"><input type="checkbox" data-sel="table" data-name="' + esc(t) + '" checked><span><b>' + esc(t) + '</b> <span class="mut">· ' + ix.tables[t] + '</span></span></label>'; }); }
        h += '</div>';
      }
      if (ix.kind === 'legacy-app') h += '<p class="mut" style="margin-top:8px">' + T('Sheets in the file replace the same sheets of the app; other sheets stay.', 'ফাইলের শিটগুলো অ্যাপের একই নামের শিটের জায়গায় বসবে; বাকি শিট থাকবে।') + '</p>';
      if (ix.kind === 'legacy-all') h += '<p class="mut" style="margin-top:8px">' + T('Old full backups only add missing rows.', 'পুরনো টোটাল ব্যাকআপ থেকে শুধু যেগুলো নেই সেগুলো যোগ হয়।') + '</p>';
      h += '<div class="row"><button class="btn p" type="button" data-do="restore"' + (P.busy ? ' disabled' : '') + '>♻️ ' + T('Restore now', 'এখনই রিস্টোর করুন') + '</button></div></div>';
      return h;
    }

    /* ---------- রিসেট ---------- */
    function markLeft(i) {
      if (!i.mark || !i.mark.at) return 0;
      var left = new Date(i.mark.at).getTime() + RESET_MIN * 60000 - Date.now() - (new Date(i.now).getTime() - P.loadedAt);
      return Math.max(0, Math.floor(left / 1000));
    }
    function resetTab(i) {
      var s = P.rs.step, left = markLeft(i), fresh = left > 0 && (isAll || dataSig(i.mark.sig) === dataSig(i.sig));
      var h = '<div class="card danger"><h3 style="color:#b91c1c">⚠️ ' + (isAll ? T('Reset — erase the data of ALL apps', 'রিসেট — সব অ্যাপের সব ডাটা মুছে ফেলা') : T('Reset — erase all data of this app', 'রিসেট — এই অ্যাপের সব ডাটা মুছে ফেলা')) + '</h3>' +
        '<p class="mut">' + (isAll ? T('Every app\'s data and settings are erased. Accounts, app access and PINs stay.', 'সব অ্যাপের সব ডাটা আর সেটিং মুছে যাবে। অ্যাকাউন্ট, অ্যাক্সেস আর পিন থাকবে।') : T('All data, settings and files of this app are erased (PINs stay). The app starts fresh.', 'এই অ্যাপের সব ডাটা, সেটিং আর ফাইল মুছে যাবে (পিন থাকবে)। অ্যাপ নতুনের মতো শুরু হবে।')) + '</p>' +
        '<div class="steps">' + [1, 2, 3].map(function (n) { return '<span class="' + (n <= s ? 'on' : '') + '"></span>'; }).join('') + '</div>';
      if (s === 1) {
        h += '<p style="margin:6px 0 4px;font-weight:700">' + T('Do you really want to erase everything?', 'আপনি কি সত্যিই সবকিছু মুছে ফেলতে চান?') + '</p>' +
          '<label class="sw"><input type="radio" name="rsQ" value="yes"><span>' + T('Yes, I want to erase everything and start fresh.', 'হ্যাঁ, আমি সব মুছে নতুন করে শুরু করতে চাই।') + '</span></label>' +
          '<label class="sw"><input type="radio" name="rsQ" value="no"><span>' + T('No, I was only looking.', 'না, শুধু দেখছিলাম।') + '</span></label>' +
          '<label class="sw"><input type="checkbox" id="rsC1"><span><b>' + T('I understand: without a backup file, erased data can never come back.', 'আমি বুঝেছি: ব্যাকআপ ফাইল ছাড়া মুছে যাওয়া ডাটা আর কখনো ফেরত আসবে না।') + '</b></span></label>' +
          '<div class="row"><button class="btn d" type="button" data-do="rs1">' + T('Continue', 'এগিয়ে যান') + ' →</button></div>';
      } else if (s === 2) {
        h += '<p style="margin:6px 0">' + T('Step 2: take a LIFETIME backup of everything (settings included). Reset opens for ', 'ধাপ ২: সবকিছুর লাইফটাইম ব্যাকআপ নিন (সেটিংসসহ)। ব্যাকআপের পর ') + RESET_MIN + T(' minutes after it.', ' মিনিট রিসেট করা যাবে।') + '</p>' +
          '<div class="row"><button class="btn p" type="button" data-do="rsbk"' + (P.busy ? ' disabled' : '') + '>⬇ ' + T('Take lifetime backup', 'লাইফটাইম ব্যাকআপ নিন') + '</button>' +
          (fresh ? '<span class="pill ok">✓ ' + T('Backup confirmed', 'ব্যাকআপ নিশ্চিত') + '</span> <span class="cd" data-cd>' + clock(left) + '</span>' : '') + '</div>' +
          (fresh ? '<div class="row"><button class="btn d" type="button" data-do="rs2">' + T('Continue', 'এগিয়ে যান') + ' →</button></div>' : '');
      } else {
        if (!fresh) { P.rs.step = 2; return resetTab(i); }
        h += '<p style="margin:6px 0">' + T('Time left to reset: ', 'রিসেটের বাকি সময়: ') + '<span class="cd" data-cd>' + clock(left) + '</span></p>' +
          '<div class="row"><span>' + T('Type', 'লিখুন') + ' <code style="font-weight:900">' + (isAll ? 'ERASE ALL DATA' : 'RESET') + '</code></span><input class="in" id="rsPhrase" autocomplete="off" style="width:170px"></div>';
        if (isAll) h += '<div class="row"><button class="btn" type="button" data-do="rscode">✉️ ' + (P.rs.sent ? T('Send the code again', 'আবার কোড পাঠান') : T('Email me the code', 'ইমেইলে কোড পাঠান')) + '</button>' + (P.rs.sent ? '<span class="mut">' + T('Sent to ', 'পাঠানো হয়েছে: ') + esc(P.rs.sent) + '</span>' : '') + '</div>' +
          '<div class="row"><span>' + T('Code from the email', 'ইমেইলের কোড') + '</span><input class="in" id="rsPin" inputmode="numeric" maxlength="6" style="width:130px;letter-spacing:4px" autocomplete="one-time-code"></div>';
        else h += '<div class="row"><span>' + T('Admin PIN of this app', 'এই অ্যাপের অ্যাডমিন পিন') + '</span><input class="in" id="rsPin" type="password" inputmode="numeric" maxlength="12" style="width:130px;letter-spacing:4px" autocomplete="off"></div>';
        h += '<div class="row"><button class="btn d" type="button" data-do="rsgo"' + (P.busy ? ' disabled' : '') + '>🧹 ' + T('Erase everything now', 'এখনই সব মুছে ফেলুন') + '</button></div>';
      }
      if (P.rs.err) h += '<div class="msg bad">' + esc(P.rs.err) + '</div>';
      return h + '<div class="row"><button class="btn" type="button" data-do="rsx">' + T('Cancel', 'বাতিল') + '</button></div></div>';
    }
    /** শিট আর ফাইল (সেটিং বাদ) — রিসেটের সময় এটুকু না বদলালেই হয় */
    function dataSig(s) { return String(s || '').split('|').slice(0, 2).join('|'); }
    function clock(sec) { return Math.floor(sec / 60) + ':' + ('0' + (sec % 60)).slice(-2); }
    function tick() {
      clearInterval(P.timer);
      P.timer = setInterval(function () {
        if (!document.body.contains(root)) { clearInterval(P.timer); return; }
        var el = root.querySelector('[data-cd]'); if (!el || !P.info) return;
        var left = markLeft(P.info);
        if (left <= 0) { P.rs = { step: 2, err: T('Time is up — reset expired. Take the backup again.', 'সময় শেষ — রিসেট বাতিল হয়েছে। আবার ব্যাকআপ নিন।') }; render(); return; }
        el.textContent = clock(left);
      }, 1000);
    }

    function wire() {
      root.querySelectorAll('[data-tab]').forEach(function (b) { b.onclick = function () { P.tab = b.getAttribute('data-tab'); P.msg = null; render(); }; });
      root.querySelectorAll('input[name=bkMode]').forEach(function (r) { r.parentNode.onclick = function () { P.mode = r.value; render(); }; });
      var f = root.querySelector('#bkFile');
      if (f) f.onchange = function () {
        var file = f.files[0]; if (!file) return;
        P.file = file; P.ix = null; P.msg = null; P.mode = 'full'; setBusy(T('Reading the file…', 'ফাইল পড়া হচ্ছে…'));
        indexBackup(file, setBusy).then(function (ix) {
          if (ix.kind === 'ndjson' && !isAll && ix.head.scope === '*' ) throw new Error(T('This is a backup of ALL apps. Restore it from Admin Console > Backup, or pick this app\'s part with Custom there.', 'এটা সব অ্যাপের ব্যাকআপ। Admin Console > Backup থেকে রিস্টোর করুন।'));
          if (ix.kind === 'ndjson' && !isAll && ix.head.scope !== scope) {
            var ok = confirm(T('This backup belongs to another app (', 'এই ব্যাকআপ অন্য অ্যাপের (') + ix.head.scope + T('). Restore it into THIS app anyway?', ')। তবুও এই অ্যাপে রিস্টোর করবেন?'));
            if (!ok) throw new Error(T('Cancelled.', 'বাতিল।'));
          }
          if (ix.kind === 'legacy-all' && !isAll) throw new Error(T('This is an old full backup of all apps — restore it from Admin Console > Backup.', 'এটা সব অ্যাপের পুরনো টোটাল ব্যাকআপ — Admin Console > Backup থেকে রিস্টোর করুন।'));
          if (ix.kind === 'legacy-app' && isAll) throw new Error(T('This is one app\'s backup — open that app > Settings > Backup · Restore · Reset to restore it.', 'এটা একটা অ্যাপের ব্যাকআপ — সেই অ্যাপের সেটিং > ব্যাকআপ থেকে রিস্টোর করুন।'));
          P.ix = ix; done();
        }).catch(function (e) { P.file = null; done(esc(SCS.err(e)), 'bad'); });
      };
      root.querySelectorAll('[data-do]').forEach(function (b) { b.onclick = function () { act(b.getAttribute('data-do')); }; });
      if (P.tab === 'reset') tick();
    }

    function selection() {
      if (P.mode === 'full') return { full: true };
      var sel = { full: false, apps: {}, tables: {} };
      root.querySelectorAll('[data-sel]:checked').forEach(function (c) {
        var k = c.getAttribute('data-sel'), a = c.getAttribute('data-app'), n = c.getAttribute('data-name');
        if (k === 'table') { sel.tables[n] = true; return; }
        var x = sel.apps[a] = sel.apps[a] || { sheets: {} };
        if (k === 'sheet') x.sheets[n] = true; else x[k] = true;
      });
      return sel;
    }

    function act(k) {
      if (k === 'pick') { root.querySelector('#bkFile').click(); return; }
      if (k === 'dl') {
        setBusy(T('Preparing the backup…', 'ব্যাকআপ তৈরি হচ্ছে…'));
        backupDownload(scope, setBusy).then(function (r) {
          P.info.mark = r.mark; done('✅ ' + T('Backup downloaded: ', 'ব্যাকআপ ডাউনলোড হয়েছে: ') + esc(r.file) + ' (' + mb(r.size) + ')');
          load();
        }).catch(function (e) { done(esc(SCS.err(e)), 'bad'); });
      }
      if (k === 'drive') {
        setBusy(T('Sending…', 'পাঠানো হচ্ছে…'));
        rpc('scs_backup_drive_now', { p_scope: scope }).then(function () {
          done('☁️ ' + T('Started. Large backups take a few minutes — the result appears in History.', 'শুরু হয়েছে। বড় ব্যাকআপে কয়েক মিনিট লাগে — ফলাফল "ইতিহাস"-এ দেখাবে।'), 'info');
          setTimeout(load, 15000);
        }).catch(function (e) { done(esc(SCS.err(e)), 'bad'); });
      }
      if (k === 'save') {
        var cfg = { on: root.querySelector('#bkOn').checked, n: Number(root.querySelector('#bkN').value) || 1, unit: root.querySelector('#bkU').value, skip: root.querySelector('#bkSkip').checked, keep: Number(root.querySelector('#bkKeep').value) || 0 };
        if (cfg.unit === 'm' && cfg.n < 5) cfg.n = 5;
        rpc('scs_backup_cfg_save', { p_scope: scope, p_cfg: cfg }).then(function (c) { P.info.cfg = c; done('✅ ' + T('Saved.', 'সেভ হয়েছে।') + (c.on ? ' ' + T('Auto backup every ', 'অটো ব্যাকআপ প্রতি ') + c.n + ' ' + ({ m: T('minutes', 'মিনিট'), h: T('hours', 'ঘণ্টা'), d: T('days', 'দিন') })[c.unit] : '')); })
          .catch(function (e) { done(esc(SCS.err(e)), 'bad'); });
      }
      if (k === 'restore') {
        var sel = selection();
        if (!sel.full && !Object.keys(sel.apps).length && !Object.keys(sel.tables).length) { done(T('Pick at least one part.', 'অন্তত একটা অংশ বাছুন।'), 'bad'); return; }
        var q = sel.full ? T('Restore EVERYTHING from this backup? Current data of ', 'এই ব্যাকআপ থেকে সব রিস্টোর করবেন? ') + esc(title) + T(' will be replaced.', ' এর বর্তমান ডাটা বদলে যাবে।') : T('Restore the selected parts? They will be replaced by the backup.', 'বাছাই করা অংশগুলো রিস্টোর করবেন? সেগুলো ব্যাকআপের মতো হয়ে যাবে।');
        SCS.confirmBox(T('Restore', 'রিস্টোর'), q, T('Restore', 'রিস্টোর'), true).then(function (ok) {
          if (!ok) return;
          setBusy(T('Restoring…', 'রিস্টোর হচ্ছে…'));
          restore(P.file, P.ix, scope, sel, setBusy).then(function () {
            done('✅ ' + T('Restore finished. Open apps refresh by themselves.', 'রিস্টোর শেষ। খোলা অ্যাপগুলো নিজে থেকে নতুন ডাটা নেবে।'));
            load();
          }).catch(function (e) { done(esc(SCS.err(e)) + '<br>' + T('Nothing is lost: run the restore again.', 'কিছু হারায়নি: আবার রিস্টোর চালান।'), 'bad'); });
        });
      }
      if (k === 'rsx') { P.rs = { step: 1 }; P.tab = 'backup'; render(); }
      if (k === 'rs1') {
        var q1 = root.querySelector('input[name=rsQ]:checked');
        if (!q1 || q1.value !== 'yes') { P.rs.err = q1 ? T('OK — nothing was erased.', 'ঠিক আছে — কিছুই মোছা হয়নি।') : T('Answer the question first.', 'আগে প্রশ্নের উত্তর দিন।'); render(); return; }
        if (!root.querySelector('#rsC1').checked) { P.rs.err = T('Tick the box to confirm you understand.', 'বুঝেছেন নিশ্চিত করতে বক্সে টিক দিন।'); render(); return; }
        P.rs = { step: 2 }; render();
      }
      if (k === 'rsbk') { P.rs.err = ''; act('dl'); }
      if (k === 'rs2') { P.rs = { step: 3 }; render(); }
      if (k === 'rscode') {
        SCS.callFn('password-reset', { action: 'resetCode' }).then(function (r) { P.rs.sent = r.to; P.rs.err = ''; render(); }, function (e) { P.rs.err = SCS.err(e); render(); });
      }
      if (k === 'rsgo') {
        var ph = (root.querySelector('#rsPhrase').value || '').trim(), pin = (root.querySelector('#rsPin').value || '').trim();
        if (ph !== (isAll ? 'ERASE ALL DATA' : 'RESET')) { P.rs.err = T('The text does not match.', 'লেখা মেলেনি।'); render(); return; }
        if (!pin) { P.rs.err = isAll ? T('Enter the code from the email.', 'ইমেইলের কোড দিন।') : T('Enter the admin PIN.', 'অ্যাডমিন পিন দিন।'); render(); return; }
        SCS.confirmBox(T('Erase everything now?', 'এখনই সব মুছবেন?'), T('This is the final confirmation. It cannot be undone without the backup file.', 'এটাই শেষ নিশ্চিতকরণ। ব্যাকআপ ফাইল ছাড়া ফেরানো যাবে না।'), T('Erase', 'মুছে ফেলুন'), true).then(function (ok) {
          if (!ok) return;
          setBusy(T('Erasing…', 'মোছা হচ্ছে…'));
          var p = isAll ? rpc('scs_reset_all', { p_code: pin, p_phrase: ph }) : rpc('scs_app_reset', { p_app: scope, p_pin: pin, p_phrase: ph });
          p.then(function (r) {
            if (r && r.ok === false) throw new Error(r.error || 'Failed');
            var paths = (r && r.paths) || [];
            var rm = paths.length ? sb().storage.from('scs-files').remove(paths).catch(function () {}) : Promise.resolve();
            return rm.then(function () {
              P.rs = { step: 1 }; P.tab = 'backup';
              done('✅ ' + T('Reset finished. Everything was erased.', 'রিসেট শেষ। সব মুছে গেছে।') + (isAll ? '' : ' ' + T('Reload the app to start fresh.', 'নতুন করে শুরু করতে অ্যাপটা রিলোড করুন।')));
              load();
            });
          }).catch(function (e) { P.busy = ''; P.rs.err = SCS.err(e); render(); });
        });
      }
    }
    P.loadedAt = Date.now();
    render();
    load();
    return { reload: load };
  }

  /** অ্যাপ থেকে: পুরো পর্দার প্যানেল (SCS গিয়ার মেনু > ব্যাকআপ · রিস্টোর · রিসেট) */
  function open(scope) {
    var sh = document.createElement('div');
    sh.className = 'scs-ui scs-sheet';
    sh.innerHTML = '<div class="pn"><div class="hd"><b>💾 ' + esc(T('Backup · Restore · Reset', 'ব্যাকআপ · রিস্টোর · রিসেট')) + '</b><button type="button" data-x>✕ ' + esc(T('Close', 'বন্ধ')) + '</button></div><div class="bd"></div></div>';
    document.body.appendChild(sh);
    var close = function () { sh.remove(); };
    sh.querySelector('[data-x]').onclick = close;
    sh.addEventListener('click', function (e) { if (e.target === sh) close(); });
    Panel(sh.querySelector('.bd'), scope || '*');
  }

  window.SCSBackup = { open: open, mount: function (el, scope) { return Panel(el, scope || '*'); }, _: { splitChunks: splitChunks, strHash: strHash, indexBackup: indexBackup, legacyIndex: legacyIndex, eachLine: eachLine } };
})();
