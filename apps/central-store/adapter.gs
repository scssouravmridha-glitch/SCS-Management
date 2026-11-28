/* =====================================================================
 *  SCS Central Store — সার্ভার অ্যাডাপ্টার
 *  - লগইন পিন নেই: SCS অ্যাকাউন্ট দিয়েই ঢোকা (টোকেন scs-user / scs-admin)
 *  - অ্যাডমিন প্যানেল = Admin Console এর Central Store পিন + অ্যাপে Admin অ্যাক্সেস
 *  - এডিট/ডিলিটের আগের পিন আগের মতোই: অ্যাপের ভেতরের ইউজারদের পিন (Admin প্যানেলে থাকলে Admin Console পিন)
 * ===================================================================== */
function scsCtx_(admin) {
  var me = SCS_GAS.user();
  return { uid: 'SCS-' + String(me.employeeId || me.id || 'user').replace(/[^\w-]/g, '').slice(0, 24), name: me.name || me.email || 'User', role: admin ? 'ADMIN' : 'USER' };
}
auth_ = function (token, role) {
  token = String(token || '');
  if (!/^scs-(user|admin)$/.test(token)) throw err_('Please log in again.', 'আবার লগইন করুন।', 'AUTH');
  var admin = token === 'scs-admin' && SCS_GAS.isAdmin();
  if (role === 'ADMIN' && !admin) throw err_('Admin permission required.', 'এই কাজটি শুধুমাত্র অ্যাডমিন করতে পারবে।', 'FORBIDDEN');
  return scsCtx_(admin);
};
login_ = function (d) {
  setupIfNeeded_();
  var ctx = scsCtx_(false);
  log_(ctx, 'LOGIN', 'User', ctx.uid, ctx.name + ' logged in');
  return { token: 'scs-user', boot: bootstrapData_(ctx, { logoV: String((d && d.logoV) || '') }) };
};
adminLogin_ = function (ctx, d) {
  var pin = str_(d && d.pin, 12);
  if (!SCS_GAS.isAdminPin(pin)) {
    log_(ctx, 'ADMIN_PIN_FAILED', 'User', ctx.uid, 'Wrong admin PIN attempt by ' + ctx.name);
    throw err_('Wrong admin PIN, or no Admin access for Central Store.', 'অ্যাডমিন পিন ভুল, অথবা Central Store এ আপনার Admin অ্যাক্সেস নেই।', 'BAD_PIN');
  }
  var a = scsCtx_(true);
  log_(a, 'ADMIN_LOGIN', 'User', a.uid, a.name + ' opened Admin panel');
  return { token: 'scs-admin', boot: bootstrapData_(a, { logoV: String((d && d.logoV) || '') }) };
};
pinCheck_ = function (ctx, d) {
  var pin = str_(d && d.authPin, 12), ok = false;
  if (ctx.role === 'ADMIN') ok = SCS_GAS.isAdminPin(pin);
  else if (/^\d{4,8}$/.test(pin)) {
    var h = hashPin_(pin);
    ok = read_('users').rows.some(function (u) { return u.Status === 'ACTIVE' && u.PinHash === h; }) || SCS_GAS.isAdminPin(pin);
  }
  if (!ok) {
    log_(ctx, 'PIN_FAILED', 'User', ctx.uid, 'Wrong PIN on a protected action by ' + ctx.name);
    throw err_('Wrong PIN.', 'পিন ভুল।', 'BAD_PIN');
  }
};
logout_ = function () { return { ok: true }; };

/* ড্যাশবোর্ডের "আজকের কার্যক্রম" বাক্স: আজ / এই মাস / এই বছর / লাইফটাইম (d.period = today | month | year | life) */
var __scsDash = dashboard_;
dashboard_ = function (ctx, d) {
  var r = __scsDash.apply(this, arguments);
  var p = (d && d.period) || 'today';
  r.period = p;
  if (p === 'today') return r;
  var month = r.month || today_().slice(0, 7), year = String((d && d.year) || month.slice(0, 4));
  var from = p === 'month' ? month + '-01' : p === 'year' ? year + '-01-01' : '0000-00-00';
  var to = p === 'month' ? month + '-31' : p === 'year' ? year + '-12-31' : '9999-12-31';
  var t = { inQty: 0, outQty: 0, count: 0, batches: {} };
  activeTxns_().forEach(function (x) {
    var dt = String(x.TxnDate || '');
    if (dt < from || dt > to) return;
    t.count++; t.batches[x.BatchID] = 1;
    var q = num_(x.Quantity);
    if (x.Type === 'IN') t.inQty += q; else if (x.Type === 'OUT') t.outQty += q;
  });
  r.today = { inQty: round_(t.inQty), outQty: round_(t.outQty), lines: t.count, batches: Object.keys(t.batches).length };
  r.year = year;
  return r;
};
