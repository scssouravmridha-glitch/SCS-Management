/* =====================================================================
 *  SCS Employee Attendance — সার্ভার অ্যাডাপ্টার (আসল Code.gs এর পরে চলে)
 *  - এমপ্লয়ি অটো-সিঙ্ক: SCS অ্যাকাউন্ট (অনুমোদিত এমপ্লয়ি) -> Employees শিট
 *    (নাম, মোবাইল, ছবি, Employee ID প্রোফাইল থেকে; Employee ID বদলালে পুরনো হাজিরাও নতুন ID তে যায়)
 *  - সাধারণ ইউজার শুধু নিজের হাজিরা দিতে পারে; লিস্ট/সেটিং বদলানো শুধু Admin
 * ===================================================================== */
var SCS_EMP_HEADER = ['ID', 'EmpID', 'Name', 'Designation', 'Department', 'Mobile', 'PhotoUrl', 'SortOrder'];
function scsEmpSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName('Employees') || ss.getSheetByName('employees') || ss.getSheetByName('কর্মকর্তাবৃন্দ') || ss.getSheetByName('কর্মকর্তা') || ss.getSheetByName('Staff');
  if (!sh) { sh = ss.insertSheet('Employees'); sh.appendRow(SCS_EMP_HEADER); }
  return sh;
}
function scsSyncEmployees_() {
  var emps = SCS_GAS.employees();
  if (!emps || !emps.length) return;
  var sh = scsEmpSheet_();
  var data = sh.getDataRange().getValues();
  if (!data.length || !data[0][0]) { data = [SCS_EMP_HEADER]; }
  var rows = data.slice(1);
  // নমুনা কর্মী (emp-001 … unsplash ছবি) একবার মুছে ফেলা
  var cleaned = rows.filter(function (r) { return !(/^emp-00[1-5]$/.test(String(r[0])) && /unsplash\.com/.test(String(r[6]))); });
  var changed = cleaned.length !== rows.length;
  rows = cleaned;
  var renames = {};
  var maxSort = rows.reduce(function (m, r) { return Math.max(m, Number(r[7]) || 0); }, 0);
  emps.forEach(function (e) {
    var uid = 'u-' + String(e.user_id).replace(/-/g, '');
    var i = rows.findIndex(function (r) { return String(r[0]) === uid; });
    if (i < 0) i = rows.findIndex(function (r) { return String(r[1]).trim().toLowerCase() === String(e.employee_id).trim().toLowerCase(); });
    var want = [uid, e.employee_id, e.full_name, e.designation || '', e.department || '', e.phone || '', e.photo_url || ''];
    if (i < 0) { rows.push(want.concat([++maxSort])); changed = true; return; }
    var r = rows[i];
    if (String(r[1]) !== String(e.employee_id) && String(r[0]) === uid && r[1]) renames[String(r[1])] = e.employee_id;
    var nr = [uid, e.employee_id, e.full_name, e.designation || r[3] || '', e.department || r[4] || '', e.phone || r[5] || '', e.photo_url || r[6] || '', r[7] || ++maxSort];
    for (var k = 0; k < 8; k++) if (String(nr[k]) !== String(r[k] === undefined ? '' : r[k])) { rows[i] = nr; changed = true; break; }
  });
  if (!changed) return;
  sh.clear();
  sh.getRange(1, 1, 1, 8).setValues([SCS_EMP_HEADER]);
  if (rows.length) sh.getRange(2, 1, rows.length, 8).setValues(rows.map(function (r) { var x = r.slice(0, 8); while (x.length < 8) x.push(''); return x; }));
  // Employee ID বদলালে পুরনো হাজিরা নতুন ID তে
  var olds = Object.keys(renames);
  if (olds.length) {
    var att = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Attendance');
    if (att && att.getLastRow() > 1) {
      var rg = att.getRange(2, 2, att.getLastRow() - 1, 1), v = rg.getValues(), hit = false;
      v.forEach(function (row) { if (renames[String(row[0])]) { row[0] = renames[String(row[0])]; hit = true; } });
      if (hit) rg.setValues(v);
    }
  }
}
function scsNeedAdmin_() {
  if (!SCS_GAS.isAdmin()) throw new Error('Admin access for Attendance is required. / এই কাজের জন্য Attendance-এ Admin অ্যাক্সেস লাগবে।');
}

var __scsGetInitialData = getInitialData;
getInitialData = function () {
  try { scsSyncEmployees_(); } catch (e) { Logger.log('employee sync: ' + e); }
  return __scsGetInitialData.apply(this, arguments);
};
var __scsSaveAttendance = saveAttendanceRecord;
saveAttendanceRecord = function (record) {
  var me = SCS_GAS.user();
  if (!SCS_GAS.isAdmin() && record && me.employeeId && String(record.empId) !== String(me.employeeId)) {
    return { status: 'error', message: 'You can give attendance only for yourself. / শুধু নিজের হাজিরা দেওয়া যায়।' };
  }
  var res = __scsSaveAttendance.apply(this, arguments);
  if (res && res.status === 'success' && !res.duplicate && record) {
    SCS_GAS.notify('clock_in', (record.type === 'Clock Out' ? 'Clock OUT' : 'Clock IN') + ' · ' + (me.name || record.empId), record.date + ' ' + record.time + (record.locationText ? ' · ' + record.locationText : ''));
  }
  return res;
};
['updateEmployeeList', 'updateAttendanceList', 'deleteAttendanceRecords', 'updateOfficeSettings', 'updateDriveSettings', 'updateLiveExportSetup', 'rebuildAllMonths'].forEach(function (fn) {
  if (typeof self[fn] !== 'function') return;
  var orig = self[fn];
  self[fn] = function () { scsNeedAdmin_(); return orig.apply(this, arguments); };
});
