/* =====================================================================
 *  SCS Monthly Report — Supabase backend
 *  - মাসভিত্তিক রিপোর্ট ডাটা: mr_month_data (প্রতি মাসে একটি JSON রো)
 *  - সেটিংস: mr_settings ; লোগো/গান: Storage (scs-files/monthly-report/...)
 *  - অর্ডার: chem_orders (Chemical Order অ্যাপের টেবিল, এখানে শুধু পড়া হয়)
 *  - অ্যাটেনডেন্স: att_monthly_summary (Attendance অ্যাপের শেয়ার্ড টেবিল, শুধু পড়া)
 *  প্রতিটি সেভ audit_log এ আগে/পরে সহ জমা থাকে — তাই আলাদা DB_History লাগে না।
 * ===================================================================== */
(function () {
  'use strict';
  var APP = 'monthly-report';
  var sb = function () { return SCS.sb; };
  var q = function (p) { return SCS.q(p); };

  function n(x) { var v = Number(x); return isFinite(v) ? v : 0; }

  /* ---------- settings ---------- */
  function readSettings() {
    return q(sb().from('mr_settings').select('key, value')).then(function (rows) {
      var s = {}; rows.forEach(function (r) { s[r.key] = r.value == null ? '' : r.value; }); return s;
    });
  }
  function writeSetting(key, value) { return q(sb().from('mr_settings').upsert({ key: String(key), value: String(value == null ? '' : value) })); }
  function fileToDataUrl(path) {
    if (!path) return Promise.resolve('');
    return SCS.download(path).then(SCS.blobToDataUrl).catch(function () { return ''; });
  }

  /* ---------- month data ---------- */
  function revOf(r) { return String(r.updated_at || '') + '#1'; }
  function selectAllMonths(cols) {
    return q(sb().from('mr_month_data').select(cols).order('month_key'));
  }

  /* ---------- live orders from Chemical Order ---------- */
  function deliveryText(s) {
    var m = String(s || '').match(/(\d{4}-\d{2}-\d{2})(?:[ T](\d{1,2}:\d{2}))?/);
    if (!m) return String(s || '');
    var t = m[2] && m[2] !== '00:00' ? (m[2].length === 4 ? '0' + m[2] : m[2]) : '';
    return m[1] + (t ? ' ' + t : '');
  }
  function liveOrders() {
    var out = [], size = 1000;
    function page(from) {
      return q(sb().from('chem_orders').select('*').order('order_no').range(from, from + size - 1)).then(function (rows) {
        out = out.concat(rows);
        return rows.length === size ? page(from + size) : out;
      });
    }
    return page(0).then(function (orders) {
      var list = [], rowNo = 1;
      orders.forEach(function (o) {
        var items = (o.items && o.items.length) ? o.items : [{}];
        items.forEach(function (it, idx) {
          rowNo++;
          var qty = n(it.quantity), dup = n(it.discountUnitPrice), sp = qty * dup, tf = idx === 0 ? n(o.transport_fee) : 0;
          list.push({
            id: 'ord_' + o.order_no + '_' + (idx + 1), sheetRow: rowNo,
            timestamp: SCS.fmt(o.created_at, 'yyyy-MM-dd HH:mm:ss'), orderNo: o.order_no,
            deliveryDateTime: deliveryText(o.delivery_at), clientOrProjectName: o.client_name || '', mobileNumber: o.mobile || '',
            address: o.address || '', productName: it.productName || '', quantity: qty, unit: it.unit || '', packSize: it.packSize || '',
            unitPrice: n(it.unitPrice), discountUnitPrice: dup, totalPrice: sp + tf, specialPrice: sp, transportFee: tf,
            scsTransportCost: idx === 0 ? n(o.scs_transport_cost) : 0, orderBy: o.order_by || '',
            engineerCommissionPerUnit: n(it.engCom), contractorCommissionPerUnit: n(it.conCom), commissionHolderName: o.commission_holder_name || '',
            totalCommission: n(it.rowCommission), smsStatus: o.sms_status || '', pdfStatus: o.pdf_status || ''
          });
        });
      });
      return list;
    });
  }
  function attendanceFor(monthKey) {
    return q(sb().from('att_monthly_summary').select('*').eq('month_key', String(monthKey || '').trim()).order('sl_no')).then(function (rows) {
      return rows.map(function (r) {
        return {
          slNo: r.sl_no, empId: r.emp_id, name: r.name, designation: r.designation || '',
          totalPresent: n(r.present), totalAbsent: n(r.absent), lateDays: n(r.late_days), attendanceRate: r.attendance_rate || '', lastLeaveDate: ''
        };
      });
    });
  }

  /* ================================================================ API */
  var B = {};

  B.getAppSettings = function () {
    return readSettings().then(function (s) {
      return fileToDataUrl(s.logo_path).then(function (logo) {
        return {
          allowUserEditPreviousMonths: String(s.allowUserEditPreviousMonths).toLowerCase() === 'true',
          selected_song_id: s.selected_song_id || '', music_custom_url: s.music_custom_url || '',
          logo_data_url: logo, signature_config: s.signature_config || '',
          admin_pin_hash: '', admin_pin_len: ''          // PIN নেই — অ্যাকাউন্টের রোল দিয়ে কাজ
        };
      });
    });
  };
  B.getLiveSettings = function () {
    return readSettings().then(function (s) {
      return { allowUserEditPreviousMonths: String(s.allowUserEditPreviousMonths).toLowerCase() === 'true', signature_config: s.signature_config || '', admin_pin_hash: '', admin_pin_len: '' };
    });
  };
  B.saveAppSetting = function (key, value) {
    if (['allowUserEditPreviousMonths'].indexOf(String(key)) === -1) throw new Error('Unknown setting: ' + key);
    if (SCS.role !== 'admin') throw new Error('এই সেটিং বদলাতে Monthly Report-এ Admin অ্যাক্সেস লাগবে।');
    return writeSetting(key, String(!!value)).then(function () { return true; });
  };
  B.saveSignatureConfig = function (json) {
    var list = JSON.parse(String(json || '[]'));
    if (!Array.isArray(list) || list.length > 8) throw new Error('Signature list must have 0 to 8 entries.');
    var clean = list.map(function (g) {
      var r = { label: String(g.label || '').slice(0, 80), name: String(g.name || '').slice(0, 80), designation: String(g.designation || '').slice(0, 80) };
      if (!r.name) throw new Error('Every signature needs a name.');
      if (g.sign) r.sign = String(g.sign).slice(0, 80);
      return r;
    });
    return writeSetting('signature_config', JSON.stringify(clean)).then(function () { return true; });
  };
  B.changeAdminPin = function () { throw new Error('PIN আর নেই — অ্যাক্সেস এখন SCS Management অ্যাকাউন্ট দিয়ে নিয়ন্ত্রিত হয়।'); };

  B.saveSelectedSong = function (id) { return writeSetting('selected_song_id', id || '').then(function () { return true; }); };
  B.saveMusicSetting = function (url) {
    url = String(url || '').trim();
    return writeSetting('music_custom_url', url).then(function () { return url ? writeSetting('music_file_path', '') : null; }).then(function () { return true; });
  };
  B.getMusicDataUrl = function () { return readSettings().then(function (s) { return fileToDataUrl(s.music_file_path); }); };
  B.saveMusicFile = function (fileName, base64, mimeType) {
    if (!base64) throw new Error('Empty audio');
    var mime = mimeType || 'audio/mpeg', path = APP + '/music/' + Date.now() + '-' + String(fileName || 'audio').replace(/[^\w.-]+/g, '_');
    return readSettings().then(function (s) {
      return SCS.upload(path, SCS.dataUrlToBlob('data:' + mime + ';base64,' + base64), mime).then(function () {
        return writeSetting('music_file_path', path);
      }).then(function () { return writeSetting('music_custom_url', ''); }).then(function () {
        if (s.music_file_path) SCS.removeFile(s.music_file_path).catch(function () {});
        return { url: 'drive:' + path, fileId: path };
      });
    });
  };
  B.saveLogoDataUrl = function (dataUrl, fileName, mimeType) {
    var m = String(dataUrl || '').match(/^data:([^;]+);base64,/);
    if (!m) throw new Error('Invalid image data');
    var mime = mimeType || m[1];
    if (!/^image\/(png|jpeg|jpg|webp|svg\+xml)$/i.test(mime)) throw new Error('Unsupported image type');
    var ext = mime.split('/')[1].replace('svg+xml', 'svg').replace('jpeg', 'jpg');
    var path = APP + '/logo/logo-' + Date.now() + '.' + ext;
    return readSettings().then(function (s) {
      return SCS.upload(path, SCS.dataUrlToBlob(dataUrl), mime).then(function () { return writeSetting('logo_path', path); }).then(function () {
        if (s.logo_path) SCS.removeFile(s.logo_path).catch(function () {});
        return { dataUrl: dataUrl, fileId: path };
      });
    });
  };
  B.getDriveFolderConfig = function () { return { folderId: 'supabase-storage', folderName: 'Supabase Storage (scs-files)' }; };
  B.saveDriveFolderId = function () { return { folderId: 'supabase-storage', folderName: 'Supabase Storage (scs-files)' }; };

  B.getIntegrationConfig = function () {
    return readSettings().then(function (s) {
      var cfg = { sheetUrl: '', tabName: 'SCS Order', attendanceTab: 'Employee Attendance', autoSync: false };
      try { if (s.integration_config) Object.assign(cfg, JSON.parse(s.integration_config)); } catch (e) {}
      cfg.sheetUrl = '';   // এখন সরাসরি ডাটাবেস থেকে
      return cfg;
    });
  };
  B.saveIntegrationConfig = function (cfg) {
    cfg = cfg || {};
    var clean = { sheetUrl: '', tabName: 'SCS Order', attendanceTab: 'Employee Attendance', autoSync: !!cfg.autoSync };
    return writeSetting('integration_config', JSON.stringify(clean)).then(function () { return clean; });
  };

  B.getManualRevisions = function () {
    return selectAllMonths('month_key, updated_at').then(function (rows) {
      var out = {}; rows.forEach(function (r) { out[r.month_key] = revOf(r); }); return out;
    });
  };
  B.getManualMonthData = function (monthKey) {
    return q(sb().from('mr_month_data').select('*').eq('month_key', String(monthKey || '').trim()).maybeSingle()).then(function (r) {
      return r ? { rev: revOf(r), data: r.data } : { rev: '', data: null };
    });
  };
  B.getManualAppState = function () {
    return selectAllMonths('month_key, data').then(function (rows) {
      var out = {}; rows.forEach(function (r) { if (r.data && typeof r.data === 'object') out[r.month_key] = r.data; }); return out;
    });
  };
  B.getManualAppStateRev = function () {
    return selectAllMonths('month_key, data, updated_at').then(function (rows) {
      var state = {}, revs = {};
      rows.forEach(function (r) { revs[r.month_key] = revOf(r); if (r.data && typeof r.data === 'object') state[r.month_key] = r.data; });
      return { __rev: 1, state: state, revs: revs };
    });
  };
  B.saveManualMonthData = function (monthKey, jsonString) {
    monthKey = String(monthKey || '').trim();
    if (!/^\d{4}-\d{2}$/.test(monthKey)) throw new Error('Invalid month key: ' + monthKey);
    var parsed = JSON.parse(String(jsonString || ''));
    if (!parsed || typeof parsed !== 'object') throw new Error('Invalid data');
    parsed.monthKey = monthKey;
    return q(sb().from('mr_month_data').select('data, updated_at').eq('month_key', monthKey).maybeSingle()).then(function (cur) {
      if (cur && JSON.stringify(cur.data) === JSON.stringify(parsed)) {
        return { ok: true, monthKey: monthKey, chunks: 1, unchanged: true, savedAt: new Date().toISOString(), rev: revOf(cur) };
      }
      return q(sb().from('mr_month_data').upsert({ month_key: monthKey, data: parsed }).select('updated_at').single()).then(function (r) {
        return { ok: true, monthKey: monthKey, chunks: 1, savedAt: r.updated_at, rev: revOf(r) };
      });
    });
  };
  B.clearManualAppState = function () {
    if (SCS.role !== 'admin') throw new Error('সব ডাটা রিসেট করতে Monthly Report-এ Admin অ্যাক্সেস লাগবে।');
    // মুছে ফেলা প্রতিটি মাসের সম্পূর্ণ ডাটা Activity Log-এ থেকে যায়
    return q(sb().from('mr_month_data').delete().neq('month_key', '')).then(function () { return true; });
  };
  B.backupNow = function () { return selectAllMonths('month_key').then(function (r) { return r.length; }); };

  B.getBackupSettings = function () {
    return readSettings().then(function (s) {
      return fileToDataUrl(s.logo_path).then(function (logo) {
        var out = {}; Object.keys(s).forEach(function (k) { out[k] = String(s[k]); });
        return { settings: out, logo_data_url: logo, exportedAt: new Date().toISOString() };
      });
    });
  };
  B.restoreAppSettings = function (json) {
    var pack = JSON.parse(String(json || '{}'));
    var src = (pack && pack.settings && typeof pack.settings === 'object') ? pack.settings : {};
    var skip = { selftest_ping: 1, logo_file_id: 1, music_file_id: 1, admin_pin_hash: 1, admin_pin_len: 1, logo_path: 1, music_file_path: 1, drive_folder_id: 1 };
    var keys = Object.keys(src).filter(function (k) { return k && !skip[k]; }), skipped = Object.keys(src).filter(function (k) { return skip[k]; });
    var chain = Promise.resolve();
    keys.forEach(function (k) { chain = chain.then(function () { return writeSetting(k, src[k]); }); });
    return chain.then(function () {
      var dataUrl = String(pack.logo || pack.logo_data_url || '');
      if (/^data:image\//.test(dataUrl)) return B.saveLogoDataUrl(dataUrl, 'scs-logo').then(function () { return 'restored'; }, function (e) { return 'skipped: ' + e.message; });
      return 'none';
    }).then(function (logo) { return { ok: true, written: keys.length, skipped: skipped, logo: logo }; });
  };

  B.getLiveReportData = function (sheetUrl, tabName, monthKey) {
    var att = attendanceFor(monthKey).then(function (a) { return { a: a, e: '' }; }, function (e) { return { a: [], e: SCS.err(e) }; });
    return Promise.all([liveOrders(), att]).then(function (r) {
      return { orders: r[0], attendance: r[1].a, attendanceError: r[1].e, fetchedAt: new Date().toISOString() };
    });
  };
  B.getEmployeeAttendanceData = function (monthKey) { return attendanceFor(monthKey); };

  window.SCS_BACKEND = B;
})();
