/* =====================================================================
 *  SCS Leave Application — সার্ভার অ্যাডাপ্টার (আসল Code.gs এর পরে চলে)
 *  - লগইন পিন নেই: SCS অ্যাকাউন্ট দিয়েই ঢোকা যায়
 *  - অ্যাডমিন পিন = Admin Console এর Leave পিন + অ্যাপে Admin অ্যাক্সেস
 *  - কর্মী অটো-সিঙ্ক: SCS অ্যাকাউন্ট (Employee ID সহ) -> "Employee List" (যাদের Employee ID নেই, শুধু তারা যোগ হয়;
 *    আগের কোটা, ছুটির ধরন, অ্যাপ্রুভার, ছবি যেমন আছে থাকে)
 *  - সাধারণ ইউজার শুধু নিজের নামে আবেদন দিতে পারে
 *  - নোটিফিকেশন: নতুন আবেদন -> অ্যাপের Admin রা, অ্যাপ্রুভ/আনঅ্যাপ্রুভ -> আবেদনকারী
 * ===================================================================== */
verifyLoginPin = function () { return { ok: true }; };
verifyAdminPin_ = function (pin) { return SCS_GAS.isAdminPin(String(pin || '').trim()); };
getAdminPinLen_ = function () { return SCS_GAS.adminPinLen(); };
changeAdminPin = function () {
  return { ok: false, error: 'Change the admin PIN in SCS Management → Admin Console → Apps & admin PINs. / অ্যাডমিন পিন Admin Console থেকে বদলান।' };
};

function scsLeaveSyncEmployees_() {
  var emps = SCS_GAS.employees();
  if (!emps || !emps.length) return;
  var sh = getSheet_(APP_CONFIG.EMPLOYEE_SHEET);
  var data = sh.getDataRange().getValues();
  if (!data.length || !data[0][0]) return;           // initializeSystem_ এখনো হেডার বসায়নি
  var have = {}, maxSl = 0;
  for (var i = 1; i < data.length; i++) {
    have[String(data[i][4]).trim().toLowerCase()] = i;
    maxSl = Math.max(maxSl, Number(data[i][0]) || 0);
  }
  emps.forEach(function (e) {
    var id = String(e.employee_id || '').trim();
    if (!id) return;
    var i = have[id.toLowerCase()];
    if (i === undefined) {
      sh.appendRow([++maxSl, e.full_name || '', e.designation || '', e.phone || '', id, e.photo_url || '', 12, defaultLeaveTypes_(), defaultApprovers_()]);
      have[id.toLowerCase()] = -1;
      return;
    }
    // নাম/পদবি/মোবাইল/ছবি প্রোফাইল থেকে (ফাঁকা থাকলে আগেরটাই থাকে)
    var r = data[i], row = i + 1;
    if (e.full_name && String(r[1]) !== e.full_name) sh.getRange(row, 2).setValue(e.full_name);
    if (e.designation && String(r[2]) !== e.designation) sh.getRange(row, 3).setValue(e.designation);
    if (e.phone && String(r[3]) !== e.phone) sh.getRange(row, 4).setValue(e.phone);
    if (e.photo_url && !String(r[5] || '').trim()) sh.getRange(row, 6).setValue(e.photo_url);
  });
}

var scsLeaveInBoot_ = false;
var __scsLeaveBoot = getBootstrapData;
getBootstrapData = function () {
  if (!scsLeaveInBoot_) {
    scsLeaveInBoot_ = true;
    try { initializeSystem_(); scsLeaveSyncEmployees_(); } catch (e) { Logger.log('leave employee sync: ' + e); }
    if (SCS_GAS.isAdmin()) { try { ensureAutoBackup_(); } catch (e) {} }   // Apps Script এ doGet এ হতো
    finally { scsLeaveInBoot_ = false; }
  }
  var res = __scsLeaveBoot.apply(this, arguments);
  if (res && res.ok) {
    var me = SCS_GAS.user();
    res.scsMe = { employeeId: me.employeeId || '', isAdmin: SCS_GAS.isAdmin() };
  }
  return res;
};

function scsLeaveUserId_(empId) {
  var e = (SCS_GAS.employees() || []).filter(function (x) { return String(x.employee_id).toLowerCase() === String(empId).toLowerCase(); })[0];
  return e ? e.user_id : null;
}
function scsLeaveApp_(id) {
  return getApplications_().filter(function (a) { return a.applicationId === String(id); })[0] || null;
}

var __scsLeaveSubmit = submitLeaveApplication;
submitLeaveApplication = function (payload) {
  var me = SCS_GAS.user();
  if (!SCS_GAS.isAdmin() && payload && me.employeeId && String(payload.employeeId) !== String(me.employeeId)) {
    return { ok: false, error: 'You can apply only for yourself. / শুধু নিজের নামে আবেদন করা যায়।' };
  }
  var res = __scsLeaveSubmit.apply(this, arguments);
  if (res && res.ok) {
    var emp = findEmployeeById_(payload.employeeId) || { name: payload.employeeId };
    SCS_GAS.notify('new_application', 'New leave application · ' + emp.name,
      (Number(payload.totalDays) || 0) + ' day(s): ' + payload.fromDate + ' → ' + payload.toDate + (payload.leaveType ? ' · ' + payload.leaveType : ''));
  }
  return res;
};

['approveApplication', 'unapproveApplication'].forEach(function (fn) {
  var orig = self[fn];
  if (typeof orig !== 'function') return;
  self[fn] = function (applicationId) {
    var res = orig.apply(this, arguments);
    if (res && res.ok !== false) {
      var a = scsLeaveApp_(applicationId);
      if (a) {
        var uid = scsLeaveUserId_(a.employeeId);
        if (uid) SCS_GAS.notify('decision', 'Leave ' + a.status + ' · ' + a.fromDate + ' → ' + a.toDate,
          a.totalDays + ' day(s)' + (a.approvedBy ? ' · ' + a.approvedBy : ''), '', uid);
      }
    }
    return res;
  };
});
