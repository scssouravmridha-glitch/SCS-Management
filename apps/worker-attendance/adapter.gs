/* =====================================================================
 *  SCS Worker Attendance & Wage — সার্ভার অ্যাডাপ্টার
 *  - লগইন পিন নেই: SCS অ্যাকাউন্ট (অ্যাপের অ্যাক্সেস) দিয়েই ঢোকা
 *  - অ্যাডমিন পিন = Admin Console এর পিন + অ্যাপে Admin অ্যাক্সেস
 *  - ভিজিটর লিংক (লগইন ছাড়া দেখা) এখানে বন্ধ — সবাইকে অ্যাকাউন্ট দিয়ে ঢুকতে হয়
 * ===================================================================== */
pinOk_ = function (p) { return SCS_GAS.isAdminPin(String(p == null ? '' : p)); };
auth_ = function (t) { return !!t; };
login = function () { return { success: true, token: 'scs-session' }; };
logout = function () { return { success: true }; };
changePin = function () {
  return { success: false, error: 'Change the admin PIN in SCS Management → Admin Console → Apps & admin PINs. / অ্যাডমিন পিন Admin Console থেকে বদলান।' };
};
visitorOk_ = function () { return false; };

var __scsWGetData = getData;
getData = function (ctx) {
  if (SCS_GAS.isAdmin()) { try { ensureAutoBackup_(); } catch (e) {} }   // Apps Script এ doGet এ হতো
  return __scsWGetData.apply(this, arguments);
};
