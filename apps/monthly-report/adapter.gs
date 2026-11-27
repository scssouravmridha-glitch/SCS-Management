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
