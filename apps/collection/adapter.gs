/* =====================================================================
 *  SCS Collection — সার্ভার অ্যাডাপ্টার
 *  - লগইন পিন নেই: SCS অ্যাকাউন্ট দিয়ে ঢোকা ("scs-account")
 *  - অ্যাডমিন পিন = Admin Console এর Collection পিন + অ্যাপে Admin অ্যাক্সেস
 *  - এডিট/টাকা সরানোর সময় পিন আগের মতোই (অ্যাপের ইউজার পিন বা অ্যাডমিন পিন)
 * ===================================================================== */
var __scsColCheck = loginCheck;
loginCheck = function (pin) {
  pin = String(pin == null ? '' : pin);
  if (SCS_GAS.isAdminPin(pin)) return 'admin';
  if (pin === 'scs-account') return 'user';
  var r = __scsColCheck.apply(this, arguments);
  return r === 'admin' ? '' : r;            // অ্যাপের পুরনো অ্যাডমিন পিন আর চলে না
};
isAdmin_ = function (pin) { return SCS_GAS.isAdminPin(String(pin == null ? '' : pin)); };
changeAdminPin = function () {
  throw new Error('Change the admin PIN in SCS Management → Admin Console → Apps & admin PINs. / অ্যাডমিন পিন Admin Console থেকে বদলান।');
};
var __scsColReset = resetPinWithCode;
resetPinWithCode = function (code, which) {
  if (which === 'admin') throw new Error('The admin PIN is set in SCS Management → Admin Console. / অ্যাডমিন পিন Admin Console থেকে।');
  return __scsColReset.apply(this, arguments);
};
