/* ================================================================
 *  ActivityDiff — আগে কী ছিল / পরে কী হলো তুলনা (যেকোনো JSON)
 *  ব্যবহার: ActivityDiff.html(oldData, newData, 'Add'|'Edit'|'Delete', {users:{uuid:name}})
 * ================================================================ */
(function () {
  'use strict';
  var IGNORE = { created_at: 1, created_by: 1, updated_at: 1, updated_by: 1, granted_at: 1 };
  var SHOW_FIRST = 25;

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function maybeJson(v) {
    if (typeof v !== 'string') return v;
    var t = v.trim();
    if (t.length > 1 && t.length < 400000 && ((t[0] === '{' && t[t.length - 1] === '}') || (t[0] === '[' && t[t.length - 1] === ']'))) {
      try { return JSON.parse(t); } catch (e) { return v; }
    }
    return v;
  }

  function prim(v, users) {
    if (v === null || v === undefined) return '';
    if (typeof v === 'string') {
      if (/^data:[^;]+;base64,/.test(v)) return '[' + v.slice(5, v.indexOf(';')) + ' file, ' + Math.round(v.length * 0.75 / 1024) + ' KB]';
      if (users && users[v]) return users[v];
      return v;
    }
    return String(v);
  }

  function flatten(v, path, out, users, depth) {
    v = maybeJson(v);
    if (v === null || v === undefined) { if (path) out[path] = ''; return; }
    if (typeof v !== 'object') { out[path] = prim(v, users); return; }
    if (depth > 12) { out[path] = JSON.stringify(v); return; }
    if (Array.isArray(v)) {
      if (!v.length) { if (path) out[path] = '(empty)'; return; }
      var allPrim = v.every(function (x) { return x === null || typeof x !== 'object'; });
      if (allPrim) { out[path] = v.map(function (x) { return prim(x, users); }).join(', '); return; }
      var byId = v.every(function (x) { return x && typeof x === 'object' && !Array.isArray(x) && (x.id !== undefined && x.id !== null && x.id !== ''); });
      v.forEach(function (x, i) {
        flatten(x, path + '[' + (byId ? '#' + x.id : i + 1) + ']', out, users, depth + 1);
      });
      return;
    }
    var keys = Object.keys(v);
    if (!keys.length) { if (path) out[path] = '(empty)'; return; }
    keys.forEach(function (k) {
      if (!path && IGNORE[k]) return;
      flatten(v[k], path ? path + '.' + k : k, out, users, depth + 1);
    });
  }

  function html(oldData, newData, action, opts) {
    opts = opts || {};
    var o = {}, n = {};
    flatten(oldData, '', o, opts.users, 0);
    flatten(newData, '', n, opts.users, 0);
    var keys = [], seen = {};
    Object.keys(o).concat(Object.keys(n)).forEach(function (k) { if (!seen[k]) { seen[k] = 1; keys.push(k); } });
    var rows = keys.filter(function (k) {
      if (action === 'Edit') return (o[k] === undefined ? '' : o[k]) !== (n[k] === undefined ? '' : n[k]);
      return action === 'Delete' ? (o[k] !== undefined && o[k] !== '') : (n[k] !== undefined && n[k] !== '');
    });
    if (!rows.length) return '';
    var head = action === 'Add' ? '<tr><th>Field</th><th>নতুন মান (Added)</th></tr>'
      : action === 'Delete' ? '<tr><th>Field</th><th>মুছে ফেলা মান (Deleted)</th></tr>'
      : '<tr><th>Field</th><th>আগে (Before)</th><th>পরে (After)</th></tr>';
    var body = rows.map(function (k, i) {
      var cls = i >= SHOW_FIRST ? ' class="x hidden"' : '';
      var ov = o[k] === undefined ? '' : o[k], nv = n[k] === undefined ? '' : n[k];
      if (action === 'Add') return '<tr' + cls + '><td class="k">' + esc(k) + '</td><td class="n">' + esc(nv) + '</td></tr>';
      if (action === 'Delete') return '<tr' + cls + '><td class="k">' + esc(k) + '</td><td class="o">' + esc(ov) + '</td></tr>';
      return '<tr' + cls + '><td class="k">' + esc(k) + '</td><td class="o' + (ov === '' ? ' e' : '') + '">' + (ov === '' ? '—' : esc(ov)) + '</td><td class="n' + (nv === '' ? ' e' : '') + '">' + (nv === '' ? '—' : esc(nv)) + '</td></tr>';
    }).join('');
    var btn = rows.length > SHOW_FIRST ? '<button type="button" class="btn g s" data-diff-all style="margin-top:8px">সব দেখুন (' + rows.length + ' টি ফিল্ড)</button>' : '';
    return '<div><table class="diff">' + head + body + '</table>' + btn + '</div>';
  }

  window.ActivityDiff = { html: html, flatten: flatten };
})();
