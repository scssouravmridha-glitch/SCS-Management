/* =====================================================================
 *  SCS Leave Application — Supabase backend
 *  আগের Code.gs এর ফাংশনগুলো একই নামে (google.script.run -> এই ফাইল)।
 *  পার্থক্য:
 *   - লগইন পিন নেই: SCS Management অ্যাকাউন্ট দিয়ে ঢোকা যায়
 *   - কর্মী = SCS অ্যাকাউন্ট (নাম, মোবাইল, ছবি, Employee ID প্রোফাইল থেকে আসে)
 *   - ইউজার শুধু নিজের জন্য আবেদন করতে পারে; Admin যে কারো জন্য
 *   - অ্যাডমিন পিন = Admin Console এর অ্যাপ পিন; লোগো Admin Console থেকে
 *   - নোটিফিকেশন ডাটাবেস নিজেই পাঠায় (নতুন আবেদন -> Admin, অ্যাপ্রুভ/রিজেক্ট -> আবেদনকারী)
 * ===================================================================== */
(function () {
  'use strict';
  var sb = function () { return SCS.sb; };
  var q = function (p) { return SCS.q(p); };
  var T = function (en, bn) { return SCS.t(en, bn); };
  var DEF_TYPES = 'Casual Leave, Physical Leave, Family Problem Leave, Weeding Leave, Other';

  function isAdmin() { return SCS.role === 'admin'; }
  function needAdmin() {
    if (!isAdmin()) throw new Error(T('Admin access for Leave Application is required.', 'এই কাজের জন্য Leave Application-এ Admin অ্যাক্সেস লাগবে।'));
    if (!SCS.adminUnlocked) throw new Error(T('Enter the admin PIN first.', 'আগে অ্যাডমিন পিন দিন।'));
  }
  function csv(v) { return String(v || '').split(',').map(function (x) { return x.trim(); }).filter(Boolean); }

  function selectAll(table, order) {
    var out = [], size = 1000;
    function page(from) {
      return q(sb().from(table).select('*').order(order || 'id').range(from, from + size - 1)).then(function (rows) {
        out = out.concat(rows || []);
        return rows && rows.length === size ? page(from + size) : out;
      });
    }
    return page(0);
  }
  function readSettings() {
    return q(sb().from('leave_settings').select('key, value')).then(function (rows) {
      var s = {}; (rows || []).forEach(function (r) { s[r.key] = r.value; }); return s;
    });
  }
  function globalCfg(s) { var g = (s && s.global) || {}; return { leaveTypes: g.leaveTypes || DEF_TYPES, approvers: g.approvers || '' }; }

  /* ---------- mapping ---------- */
  function empFromDb(e, g) {
    return {
      slNo: Number(e.sl_no) || 0, name: e.name || '', designation: e.designation || '', mobile: e.mobile || '', employeeId: e.emp_id,
      photo: e.photo_url || '', acceptableLeaveDays: Number(e.quota) || 12, typeOfLeave: e.leave_types || g.leaveTypes,
      approvedBy: e.approvers || g.approvers, userId: e.user_id || '', linked: !!e.user_id
    };
  }
  function appFromDb(a) {
    return {
      timestamp: SCS.fmt(a.created_at, 'yyyy-MM-dd HH:mm'), applicationId: a.id, employeeId: a.emp_id, employeeName: a.employee_name || '',
      designation: a.designation || '', mobile: a.mobile || '', fromDate: a.from_date, toDate: a.to_date, totalDays: Number(a.total_days) || 0,
      leaveType: a.leave_type || '', acceptableLeaveDays: Number(a.quota) || 12, description: a.description || '', status: a.status || 'Pending',
      approvedBy: a.approved_by || '', rejectReason: a.reject_reason || '', userId: a.user_id || ''
    };
  }
  function noteFrom(h) {
    var n = h.new_data || {}, o = h.old_data || {}, who = h.actor_name || 'System', msg;
    if (h.action === 'Add') msg = (n.employee_name || h.record_ref) + ' applied: ' + (Number(n.total_days) || 0) + ' day(s)';
    else if (h.action === 'Delete') msg = 'Application deleted: ' + h.record_ref + (o.employee_name ? ' (' + o.employee_name + ')' : '');
    else if ((h.changed_fields || []).indexOf('status') > -1) msg = (n.status || 'Updated') + ' by ' + who + ': ' + (n.employee_name || h.record_ref) + ' (' + h.record_ref + ')';
    else if ((h.changed_fields || []).indexOf('approved_by') > -1) msg = 'Approvers updated by ' + who + ': ' + (n.employee_name || h.record_ref);
    else msg = 'Application modified: ' + h.record_ref;
    return { id: String(h.id), message: msg, time: SCS.fmt(h.at, 'yyyy-MM-dd HH:mm'), read: false };
  }

  function boot() {
    return Promise.all([
      selectAll('leave_employees', 'sl_no'),
      selectAll('leave_applications', 'created_at'),
      readSettings(),
      q(sb().from('audit_log').select('id, at, action, record_ref, new_data, old_data, changed_fields, actor_name')
        .eq('app_key', 'leave').eq('table_name', 'leave_applications').order('id', { ascending: false }).limit(40)).catch(function () { return []; })
    ]).then(function (r) {
      var g = globalCfg(r[2]);
      var emps = r[0].filter(function (e) { return e.active !== false; })
        .sort(function (a, b) { return (a.sl_no - b.sl_no) || String(a.name).localeCompare(String(b.name)); })
        .map(function (e) { return empFromDb(e, g); });
      return {
        ok: true, employees: emps, applications: r[1].map(appFromDb), globalConfig: g,
        notifications: (r[3] || []).map(noteFrom), serverTime: SCS.fmt(new Date(), 'yyyy-MM-dd HH:mm:ss'),
        adminPinLen: 4, logo: SCS.logo || '', notifyEmails: String((r[2] || {}).notifyEmails || ''),
        me: { id: SCS.me ? SCS.me.id : '', admin: isAdmin() }
      };
    });
  }

  /** সব ফাংশন ভুল হলে {ok:false, error} ফেরত দেয় (আগের Code.gs এর মতো) */
  function wrap(fn) {
    return function () {
      var args = arguments;
      return Promise.resolve().then(function () { return fn.apply(null, args); })
        .catch(function (e) { return { ok: false, error: SCS.err(e) }; });
    };
  }
  function getApp(id) {
    return q(sb().from('leave_applications').select('*').eq('id', id).maybeSingle()).then(function (a) {
      if (!a) throw new Error('Application not found');
      return a;
    });
  }
  function updApp(id, upd) {
    return q(sb().from('leave_applications').update(upd).eq('id', id).select('id')).then(function (rows) {
      if (!rows || !rows.length) throw new Error(T('Not saved — permission denied or the application no longer exists.', 'সেভ হয়নি — অনুমতি নেই বা আবেদনটি আর নেই।'));
    });
  }
  function rank(list) { return function (n) { var i = list.indexOf(n); return i < 0 ? 999 : i; }; }

  /* ================================================================ API */
  var B = {};

  B.getBootstrapData = wrap(boot);
  B.syncNow = wrap(boot);
  B.verifyLoginPin = function () { return { ok: true }; };
  B.verifyAdminPin = function (pin) { return { ok: SCS.checkAdminPin(pin) }; };
  B.verifyApproverPin = B.verifyAdminPin;

  B.submitLeaveApplication = wrap(function (p) {
    p = p || {};
    return q(sb().rpc('leave_submit', { p: {
      employeeId: String(p.employeeId || ''), fromDate: String(p.fromDate || ''), toDate: String(p.toDate || ''),
      totalDays: Number(p.totalDays) || 0, leaveType: String(p.leaveType || ''), description: String(p.description || '')
    } })).then(boot);
  });

  // একাধিক অ্যাপ্রুভার: কমপক্ষে একজন অ্যাপ্রুভ করলেই Approved
  B.approveApplication = wrap(function (id, name) {
    needAdmin();
    return getApp(id).then(function (a) {
      var cur = csv(a.approved_by), nm = String(name || '').trim() || 'Admin';
      if (cur.indexOf(nm) < 0) cur.push(nm);
      return updApp(id, { status: 'Approved', approved_by: cur.join(', '), reject_reason: '', decided_at: new Date().toISOString(), decided_by: SCS.me.id });
    }).then(boot);
  });
  B.unapproveApplication = wrap(function (id, name) {
    needAdmin();
    return getApp(id).then(function (a) {
      var nm = String(name || '').trim();
      var cur = nm ? csv(a.approved_by).filter(function (x) { return x !== nm; }) : [];
      return updApp(id, { status: cur.length ? 'Approved' : 'Pending', approved_by: cur.join(', '), reject_reason: '' });
    }).then(boot);
  });
  B.rejectApplication = wrap(function (id, reason) {
    needAdmin();
    return updApp(id, { status: 'Rejected', approved_by: '', reject_reason: String(reason || '').trim(), decided_at: new Date().toISOString(), decided_by: SCS.me.id }).then(boot);
  });
  B.updateApplication = wrap(function (id, f) {
    needAdmin(); f = f || {};
    return updApp(id, { from_date: String(f.fromDate || ''), to_date: String(f.toDate || ''), total_days: Number(f.totalDays) || 0,
      leave_type: String(f.leaveType || ''), description: String(f.description || '') }).then(boot);
  });
  B.deleteApplication = wrap(function (id) {
    needAdmin();
    return q(sb().from('leave_applications').delete().eq('id', id).select('id')).then(function (rows) {
      if (!rows || !rows.length) throw new Error('Application not found');
    }).then(boot);
  });

  /* ---------- employees ---------- */
  B.saveEmployee = wrap(function (emp) {
    needAdmin(); emp = emp || {};
    var id = String(emp.employeeId || '').trim();
    if (!id) throw new Error('Employee ID is required');
    return q(sb().from('leave_employees').select('*').eq('emp_id', id).maybeSingle()).then(function (cur) {
      var common = {
        designation: String(emp.designation || ''), quota: Number(emp.acceptableLeaveDays) || 12,
        leave_types: String(emp.typeOfLeave || ''), approvers: String(emp.approvedBy || ''), active: true
      };
      if (cur && cur.user_id) {
        // SCS অ্যাকাউন্টের কর্মী: নাম, মোবাইল, ছবি, ID প্রোফাইল থেকে — এখানে বদলায় না
        if ((emp.name && emp.name !== cur.name) || (emp.mobile && emp.mobile !== cur.mobile) || (emp.photo && emp.photo !== cur.photo_url)) {
          SCS.toast(T('Name, mobile and photo come from the SCS account (My profile / Admin Console).', 'নাম, মোবাইল ও ছবি SCS অ্যাকাউন্ট থেকে আসে (My profile / Admin Console)।'));
        }
        return q(sb().from('leave_employees').update(common).eq('id', cur.id).select('id'));
      }
      var row = Object.assign({ name: String(emp.name || ''), mobile: String(emp.mobile || ''), photo_url: String(emp.photo || '') }, common);
      if (cur) return q(sb().from('leave_employees').update(row).eq('id', cur.id).select('id'));
      return q(sb().from('leave_employees').select('sl_no').order('sl_no', { ascending: false }).limit(1)).then(function (mx) {
        row.id = 'lv-' + SCS.shortId(); row.emp_id = id; row.sl_no = ((mx && mx[0] && mx[0].sl_no) || 0) + 1;
        return q(sb().from('leave_employees').insert(row));
      });
    }).then(boot);
  });
  B.deleteEmployee = wrap(function (empId) {
    needAdmin();
    return q(sb().from('leave_employees').select('*').eq('emp_id', empId).maybeSingle()).then(function (cur) {
      if (!cur) throw new Error('Employee not found');
      if (cur.user_id) throw new Error(T('This employee has an SCS account and cannot be deleted here. Disable the account in Admin Console instead.', 'এই কর্মীর SCS অ্যাকাউন্ট আছে, এখান থেকে মুছা যায় না। Admin Console থেকে অ্যাকাউন্ট বন্ধ করুন।'));
      return q(sb().from('leave_applications').delete().eq('emp_id', empId)).then(function () {
        return q(sb().from('leave_employees').delete().eq('id', cur.id));
      });
    }).then(boot);
  });
  function reorder(ids) {
    return selectAll('leave_employees', 'sl_no').then(function (rows) {
      var byEmp = {}; rows.forEach(function (r) { byEmp[r.emp_id] = r; });
      var chain = Promise.resolve();
      (ids || []).forEach(function (id, n) {
        var r = byEmp[String(id)];
        if (r && r.sl_no !== n + 1) chain = chain.then(function () { return q(sb().from('leave_employees').update({ sl_no: n + 1 }).eq('id', r.id)); });
      });
      return chain;
    });
  }
  B.saveSerialOrder = wrap(function (ids) { needAdmin(); return reorder(ids).then(boot); });
  B.setEmployeeSerial = wrap(function (empId, newSl) {
    needAdmin();
    return selectAll('leave_employees', 'sl_no').then(function (rows) {
      var list = rows.filter(function (r) { return r.active !== false; }).map(function (r) { return r.emp_id; });
      var from = list.indexOf(String(empId)); if (from < 0) throw new Error('Employee not found');
      var to = Math.max(0, Math.min(list.length - 1, Number(newSl) - 1));
      list.splice(to, 0, list.splice(from, 1)[0]);
      return reorder(list);
    }).then(boot);
  });

  /* ---------- settings ---------- */
  B.saveGlobalConfig = wrap(function (leaveTypes, approvers, applyAll) {
    needAdmin();
    var g = { leaveTypes: String(leaveTypes || DEF_TYPES), approvers: String(approvers || '') };
    return q(sb().from('leave_settings').upsert({ key: 'global', value: g })).then(function () {
      if (!applyAll) return;
      return q(sb().from('leave_employees').update({ leave_types: g.leaveTypes, approvers: g.approvers }).neq('id', ''));
    }).then(boot);
  });
  B.setNotifyEmails = wrap(function (emails) {
    needAdmin();
    return q(sb().from('leave_settings').upsert({ key: 'notifyEmails', value: String(emails || '').trim() })).then(boot);
  });
  B.changeAdminPin = function () { return { ok: false, error: T('Change the admin PIN in SCS Management → Admin Console → Apps & admin PINs.', 'অ্যাডমিন পিন বদলান: SCS Management → Admin Console → Apps & admin PINs।') }; };
  B.setLogo = function () { return { ok: false, error: T('Change the logo in SCS Management → Admin Console → Logo.', 'লোগো বদলান: SCS Management → Admin Console → Logo।') }; };
  B.getPhotosData = function () { return { ok: true, photos: {} }; };   // ছবি এখন সরাসরি Supabase থেকে

  /* ---------- approvers ---------- */
  B.renameApprover = wrap(function (oldName, newName) {
    needAdmin();
    return q(sb().rpc('leave_rename_approver', { p_old: String(oldName || ''), p_new: String(newName || '') })).then(boot);
  });
  B.saveApproverOrder = wrap(function (names, removed) {
    needAdmin();
    names = (names || []).map(function (x) { return String(x).trim(); }).filter(Boolean);
    removed = (removed || []).map(function (x) { return String(x).trim(); });
    var rk = rank(names), sortBy = function (arr) { return arr.sort(function (a, b) { return rk(a) - rk(b); }); };
    return readSettings().then(function (s) {
      var g = globalCfg(s); g.approvers = names.join(', ');
      return q(sb().from('leave_settings').upsert({ key: 'global', value: g }));
    }).then(function () { return Promise.all([selectAll('leave_employees', 'id'), selectAll('leave_applications', 'id')]); }).then(function (r) {
      var chain = Promise.resolve();
      r[0].forEach(function (e) {
        var nv = sortBy(csv(e.approvers).filter(function (x) { return removed.indexOf(x) < 0; })).join(', ');
        if (nv !== (e.approvers || '')) chain = chain.then(function () { return q(sb().from('leave_employees').update({ approvers: nv }).eq('id', e.id)); });
      });
      r[1].forEach(function (a) {
        var nv = sortBy(csv(a.approved_by)).join(', ');
        if (nv !== (a.approved_by || '')) chain = chain.then(function () { return q(sb().from('leave_applications').update({ approved_by: nv }).eq('id', a.id)); });
      });
      return chain;
    }).then(boot);
  });

  /* ---------- signatures, initials, company seal ---------- */
  function sigs() {
    return q(sb().from('leave_signatures').select('key, s, i')).then(function (rows) {
      var out = {}; (rows || []).forEach(function (r) { out[r.key] = { s: r.s || '', i: r.i || '' }; });
      return { ok: true, sigs: out };
    });
  }
  B.getSignatures = wrap(sigs);
  B.setSignature = wrap(function (key, which, dataUrl) {
    needAdmin();
    dataUrl = String(dataUrl || '');
    if (dataUrl && (dataUrl.indexOf('data:image/') !== 0 || dataUrl.length > 60000)) throw new Error('Image is too large');
    var row = { key: String(key) }; row[which === 'i' ? 'i' : 's'] = dataUrl;
    return q(sb().from('leave_signatures').upsert(row)).then(sigs);
  });

  window.SCS_BACKEND = B;
})();
