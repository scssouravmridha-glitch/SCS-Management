/* =====================================================================
 *  SCS Chemical Order — সার্ভার অ্যাডাপ্টার (আসল Code.gs এর পরে চলে)
 *  - লগইন পিন নেই: SCS অ্যাকাউন্ট দিয়েই ঢোকা (অর্ডার দেওয়া/এডিট = অ্যাপের ইউজার)
 *  - অ্যাডমিন = Admin রোল + Admin Console এর অ্যাপ পিন (অ্যাপের নিজের পিন বদলানো যায় না)
 *  - হিস্ট্রিতে কে করেছে = অ্যাকাউন্টের নাম
 *  - নতুন অর্ডার -> নোটিফিকেশন (Admin Console > Notifications & Log এর নিয়ম অনুযায়ী)
 * ===================================================================== */
isUserPin_ = function () { return true; };
isAdminPin_ = function (pin) { return SCS_GAS.isAdminPin(pin); };
getLoginInfo = function () { return { adminLen: SCS_GAS.adminPinLen() }; };
verifyLogin = function () { return { ok: true, role: SCS_GAS.isAdmin() ? 'admin' : 'user' }; };
verifyEditPin = function () { return { ok: true }; };
changeAdminPin = function () {
  throw new Error('Change the admin PIN in SCS Management → Admin Console → Apps & admin PINs. / অ্যাডমিন পিন Admin Console থেকে বদলান।');
};

var __scsLogHistory = logHistory_;
logHistory_ = function (entity, ref, action, before, after, by) {
  var u = SCS_GAS.user();
  return __scsLogHistory.call(this, entity, ref, action, before, after, (u && u.name ? u.name : '') + (by ? ' (' + by + ')' : ''));
};

var __scsSubmitOrder = submitOrder;
submitOrder = function (payload) {
  var r = __scsSubmitOrder.apply(this, arguments);
  try {
    if (r && r.ok && payload && payload.mode !== 'resubmit') {
      var total = (payload.items || []).reduce(function (s, i) { return s + (Number(i.quantity) || 0) * (Number(i.discountUnitPrice || i.unitPrice) || 0); }, 0) + (Number(payload.transportFee) || 0);
      SCS_GAS.notify('new_order', 'New order ' + r.orderNo,
        (payload.clientName || 'Customer') + ' · Tk ' + Math.round(total).toLocaleString('en-US') + (payload.orderBy ? ' · by ' + payload.orderBy : ''));
    }
  } catch (e) {}
  return r;
};

// অর্ডার এডিট / ডিলিট -> অ্যাপের Admin দের নোটিফিকেশন (নিয়ম: chemical-order.order_changed)
['updateOrder', 'deleteOrder'].forEach(function (fn) {
  var orig = self[fn];
  if (typeof orig !== 'function') return;
  self[fn] = function (a) {
    var r = orig.apply(this, arguments);
    try {
      if (r && r.ok !== false) {
        var u = SCS_GAS.user(), no = fn === 'deleteOrder' ? String(a || '') : String((a && (a.orderNo || a.order_no)) || '');
        SCS_GAS.notify('order_changed', (fn === 'deleteOrder' ? 'Order deleted · ' : 'Order edited · ') + no,
          (a && a.clientName ? a.clientName + ' · ' : '') + 'by ' + ((u && u.name) || 'someone'));
      }
    } catch (e) {}
    return r;
  };
});
