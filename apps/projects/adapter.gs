/* =====================================================================
 *  SCS Projects (+ Bill & Measurement) — সার্ভার অ্যাডাপ্টার
 *  - লগইন পিন নেই: SCS অ্যাকাউন্ট দিয়ে ঢোকা ("scs-account" -> user)
 *  - অ্যাডমিন পিন = Admin Console এর Projects পিন + অ্যাপে Admin অ্যাক্সেস (মূল অ্যাপ ও বিল দুটোতেই)
 *  - এডিটের পিন আগের মতোই (অ্যাপের ইউজার পিন বা অ্যাডমিন পিন)
 *  - বিল পাতা: বিল্ডের সময় বানানো bill.html (Apps Script এ সার্ভার Index.html থেকে কেটে দিত)
 * ===================================================================== */
var __scsPjCheck = loginCheck;
loginCheck = function (pin) {
  pin = String(pin == null ? '' : pin);
  if (SCS_GAS.isAdminPin(pin)) return 'admin';
  if (pin === 'scs-account') return 'user';
  var r = __scsPjCheck.apply(this, arguments);
  return r === 'admin' ? '' : r;                 // অ্যাপের পুরনো অ্যাডমিন পিন আর চলে না
};
isAdmin_ = function (pin) { return SCS_GAS.isAdminPin(String(pin == null ? '' : pin)); };
mkToken_ = function (role) { return role === 'admin' && SCS_GAS.isAdmin() ? 'scs-admin' : 'scs-user'; };
tokenRole_ = function (t) {
  t = String(t || '');
  if (t === 'scs-admin') return SCS_GAS.isAdmin() ? 'admin' : 'user';
  return t === 'scs-user' ? 'user' : '';
};
changeAdminPin = function () {
  throw new Error('Change the admin PIN in SCS Management → Admin Console → Apps & admin PINs. / অ্যাডমিন পিন Admin Console থেকে বদলান।');
};
var __scsPjReset = resetPinWithCode;
resetPinWithCode = function (code, which) {
  if (which === 'admin') throw new Error('The admin PIN is set in SCS Management → Admin Console. / অ্যাডমিন পিন Admin Console থেকে।');
  return __scsPjReset.apply(this, arguments);
};
getAppUrl = function () { return ScriptApp.getService().getUrl(); };
getBillHtml = function (knownHash) {
  var u = ScriptApp.getService().getUrl().replace(/\/?$/, '/') + 'bill-raw.html';   // ফ্রেমের জন্য ইঞ্জিন ছাড়া পাতা
  var x = new XMLHttpRequest();
  x.open('GET', u + '?nc=' + Date.now(), false); x.send();
  if (x.status !== 200) throw new Error('Bill page not found (' + x.status + '). Upload apps/projects/bill.html.');
  var html = x.responseText;
  var h = 'v' + ((html.match(/v=(\d{12})/) || [])[1] || html.length);
  return h === knownHash ? { hash: h, same: true } : { hash: h, html: html };
};
