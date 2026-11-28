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
// ভিজিটর লিংক: শুধু ভিজিটর মোডে (লগইন ছাড়া, ডাটাবেস যাচাই করে শুধু দেখার ডাটা দেয়) আসল নিয়ম চলে
if (!SCS_GAS.isVisitor()) visitorOk_ = function () { return false; };
// ভিজিটর লিংকের ঠিকানা = এই সাইটের অ্যাপ পেজ + ?v=টোকেন
var __scsVInfo = visitorInfo_;
visitorInfo_ = function () {
  var r = __scsVInfo.apply(this, arguments);
  try { var s = vSettings_(); if (s.token) r.url = ScriptApp.getService().getUrl() + '?v=' + s.token; } catch (e) {}
  return r;
};

var __scsWGetData = getData;
getData = function (ctx) {
  if (SCS_GAS.isAdmin()) { try { ensureAutoBackup_(); } catch (e) {} }   // Apps Script এ doGet এ হতো
  return __scsWGetData.apply(this, arguments);
};

/* জাতীয় সংগীত: অন্য গান/লিংক/ফাইল সেট করা না থাকলে এটাই বাজে (ফাইল: assets ফোল্ডারে) */
function scsAnthemUrl_() {
  var base = ScriptApp.getService().getUrl().replace(/apps\/[^/]+\/?$/, '');
  return base + 'assets/Aamr%20sonar%20bangla%20ami%20tomay%20valobasi%20bangladesh%20er%20jatiyo%20sangit.mp3';
}
var __scsGetUiConfig = getUiConfig;
getUiConfig = function () {
  var r = __scsGetUiConfig.apply(this, arguments);
  try { if (r && r.success && !r.musicUrl && !r.musicFile) r.musicUrl = scsAnthemUrl_(); } catch (e) {}
  return r;
};
