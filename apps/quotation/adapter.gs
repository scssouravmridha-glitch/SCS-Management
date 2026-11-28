/* =====================================================================
 *  SCS Quotation — সার্ভার অ্যাডাপ্টার
 *  - লগইন পিন নেই: SCS অ্যাকাউন্ট দিয়ে ঢোকা ("scs-account" -> user)
 *  - অ্যাডমিন পিন = Admin Console এর পিন + অ্যাপে Admin অ্যাক্সেস
 *  - ইউজার পিন (অ্যাপের ভেতরের) আগের মতোই কাজ করে
 * ===================================================================== */
var __scsPinRole = pinRole_;
pinRole_ = function (pin) {
  pin = String(pin == null ? '' : pin);
  if (SCS_GAS.isAdminPin(pin)) return 'admin';
  if (pin === 'scs-account') return 'user';
  var r = __scsPinRole.apply(this, arguments);
  return r === 'admin' ? '' : r;                 // অ্যাপের পুরনো অ্যাডমিন পিন আর চলে না
};
var __scsChangePin = changePin;
changePin = function (kind) {
  if (kind === 'admin') throw new Error('Change the admin PIN in SCS Management → Admin Console → Apps & admin PINs. / অ্যাডমিন পিন Admin Console থেকে বদলান।');
  return __scsChangePin.apply(this, arguments);
};