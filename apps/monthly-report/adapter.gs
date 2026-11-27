/* =====================================================================
 *  SCS Report — সার্ভার অ্যাডাপ্টার (আসল Code.gs এর পরে চলে)
 *  - অর্ডার সরাসরি Chemical Order অ্যাপের "SCS Order" শিট থেকে (আগের মতো কপি/সিঙ্ক লাগে না)
 *  - হাজিরার মাসিক সামারি: Attendance অ্যাপ নিজেই এই অ্যাপের "Employee Attendance" ট্যাবে লেখে
 *  - অ্যাডমিন পিন Admin Console থেকে (অ্যাপের ভেতর থেকে বদলানো যায় না)
 * ===================================================================== */
openSource_ = function (url) {
  try { return SpreadsheetApp.openById('scs-chemical-order'); }
  catch (e) { return getHome_(); }
};
// Chemical Order এ এখনো কোনো অর্ডার না থাকলে (শিট তৈরি হয়নি) এরর নয়, খালি লিস্ট
var __scsReadOrders = readOrders_;
readOrders_ = function (ss, tabName) {
  if (ss && !ss.getSheetByName(tabName)) return [];
  return __scsReadOrders.apply(this, arguments);
};
// আগের ইঞ্জিন মাসের টাইটেল (merge করা ঘর) সব ঘরে লিখত -> Google Sheets এর মতো শুধু প্রথম ঘরে রাখা
function scsFixTitles_() {
  var sh = getHome_().getSheetByName('Employee Attendance');
  if (!sh) return;
  var lr = sh.getLastRow(), lc = Math.min(sh.getLastColumn(), 12);
  if (lr < 1 || lc < 2) return;
  var v = sh.getRange(1, 1, lr, lc).getValues();
  for (var r = 0; r < v.length; r++) {
    var ne = v[r].filter(function (x) { return String(x).trim() !== ''; });
    if (ne.length > 1 && /SUMMARY/i.test(String(ne[0])) && ne.every(function (x) { return String(x) === String(ne[0]); })) {
      var row = [ne[0]]; for (var c = 1; c < lc; c++) row.push('');
      sh.getRange(r + 1, 1, 1, lc).setValues([row]);
    }
  }
}
['getLiveReportData', 'getEmployeeAttendanceData'].forEach(function (fn) {
  var orig = self[fn];
  if (typeof orig !== 'function') return;
  self[fn] = function () { try { scsFixTitles_(); } catch (e) { Logger.log('title fix: ' + e); } return orig.apply(this, arguments); };
});
changeAdminPin = function () {
  throw new Error('Change the admin PIN in SCS Management → Admin Console → Apps & admin PINs. / অ্যাডমিন পিন Admin Console থেকে বদলান।');
};
// সেটিংসে Google Sheet লিংক দিলেও অর্ডার সবসময় Chemical Order অ্যাপ থেকে আসে
var __scsGetIntegrationConfig = getIntegrationConfig;
getIntegrationConfig = function () {
  var c = __scsGetIntegrationConfig.apply(this, arguments);
  c.sheetUrl = '';
  c.tabName = 'SCS Order';   // Chemical Order অ্যাপের অর্ডার শিটের নাম
  return c;
};
