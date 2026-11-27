/* =====================================================================
 *  SCS Daily Expense — সার্ভার অ্যাডাপ্টার (আসল Code.gs এর পরে চলে)
 *  - লগইন পিন নেই: SCS অ্যাকাউন্ট দিয়েই ঢোকা (টোকেন = অ্যাকাউন্টের ভূমিকা)
 *  - অ্যাডমিন পিন = Admin Console এর Daily Expense পিন + অ্যাপে Admin অ্যাক্সেস
 *  - ভাউচার সাবমিটের পিন আগের মতোই (কর্মীর নিজের পিন, না থাকলে অ্যাপের ইউজার পিন)
 *  - কর্মী অটো-সিঙ্ক: SCS অ্যাকাউন্ট (Employee ID সহ) -> "Employees" শিট (পিন/ক্রম যেমন আছে থাকে)
 *  - সাধারণ ইউজার শুধু নিজের নামে ভাউচার বানাতে পারে
 *  - নোটিফিকেশন: সাবমিট -> অ্যাপের Admin; অ্যাপ্রুভ / ফেরত -> সেই কর্মী
 * ===================================================================== */
var __scsCheckPin = checkPin_;
checkPin_ = function (kind, pin) {
  if (kind === 'admin') return SCS_GAS.isAdminPin(String(pin == null ? '' : pin).trim());
  return __scsCheckPin.apply(this, arguments);
};
newToken_ = function (role) { return role === 'admin' ? 'scs-admin' : 'scs-user'; };
roleOf_ = function (token) {
  if (token === 'scs-admin' && SCS_GAS.isAdmin()) return 'admin';
  return /^scs-/.test(String(token || '')) ? 'user' : '';
};
login = function () { return { ok: true, role: 'user', token: 'scs-user' }; };
logout = function () { return true; };

var __scsChangePin = changePin;
changePin = function (token, kind) {
  if (kind === 'admin') throw new Error('Change the admin PIN in SCS Management → Admin Console → Apps & admin PINs. / অ্যাডমিন পিন Admin Console থেকে বদলান।');
  return __scsChangePin.apply(this, arguments);
};

function scsExpSyncEmployees_() {
  var emps = SCS_GAS.employees();
  if (!emps || !emps.length) return;
  var rows = readTable_(APP.SH_EMP), have = {}, maxSort = 0;
  rows.forEach(function (r) { have[str_(r.EmpID).toLowerCase()] = r; maxSort = Math.max(maxSort, num_(r.SortOrder)); });
  emps.forEach(function (e) {
    var id = str_(e.employee_id);
    if (!id) return;
    var r = have[id.toLowerCase()];
    if (!r) {
      writeObj_(APP.SH_EMP, { EmpID: id, Name: str_(e.full_name), Designation: str_(e.designation), Department: str_(e.department), Mobile: str_(e.phone),
        PIN: '', Active: 'true', CreatedAt: now_(), UpdatedAt: now_(), SortOrder: ++maxSort });
      return;
    }
    var ch = false;
    if (e.full_name && str_(r.Name) !== str_(e.full_name)) { r.Name = str_(e.full_name); ch = true; }
    if (e.designation && str_(r.Designation) !== str_(e.designation)) { r.Designation = str_(e.designation); ch = true; }
    if (e.department && str_(r.Department) !== str_(e.department)) { r.Department = str_(e.department); ch = true; }
    if (e.phone && str_(r.Mobile) !== str_(e.phone)) { r.Mobile = str_(e.phone); ch = true; }
    if (ch) { r.UpdatedAt = now_(); writeObj_(APP.SH_EMP, r, r._row); }
  });
}

var __scsBoot = getBootstrap;
getBootstrap = function (token) {
  try { setupDatabase(); scsExpSyncEmployees_(); } catch (e) { Logger.log('expense employee sync: ' + e); }
  var res = __scsBoot.apply(this, arguments);
  var me = SCS_GAS.user();
  res.scsMe = { employeeId: me.employeeId || '', isAdmin: SCS_GAS.isAdmin() };
  return res;
};

// সাধারণ ইউজার শুধু নিজের নামে
var __scsCreateVoucher = createVoucher_;
createVoucher_ = function (empId) {
  var me = SCS_GAS.user();
  if (!SCS_GAS.isAdmin() && me.employeeId && str_(empId) !== str_(me.employeeId)) {
    throw new Error('You can create vouchers only for yourself. / শুধু নিজের নামে ভাউচার বানানো যায়।');
  }
  return __scsCreateVoucher.apply(this, arguments);
};

function scsExpUserId_(empId) {
  var e = (SCS_GAS.employees() || []).filter(function (x) { return str_(x.employee_id).toLowerCase() === str_(empId).toLowerCase(); })[0];
  return e ? e.user_id : null;
}
var __scsSubmit = submitVoucher;
submitVoucher = function () {
  var v = __scsSubmit.apply(this, arguments);
  if (v) SCS_GAS.notify('submitted', 'Expense voucher · ' + (v.voucherNo || '') + ' · ' + (v.empName || ''), 'Total ৳' + (v.total || 0) + ' · ' + (v.date || ''));
  return v;
};
['approveVoucher', 'returnVoucher'].forEach(function (fn) {
  var orig = self[fn];
  self[fn] = function () {
    var v = orig.apply(this, arguments);
    var uid = v ? scsExpUserId_(v.empId) : null;
    if (uid) SCS_GAS.notify('decision', 'Expense voucher ' + (fn === 'approveVoucher' ? 'approved' : 'sent back') + ' · ' + (v.voucherNo || ''),
      'Total ৳' + (v.total || 0) + ' · ' + (v.date || '') + (v.adminNote ? ' · ' + v.adminNote : ''), '', uid);
    return v;
  };
});
