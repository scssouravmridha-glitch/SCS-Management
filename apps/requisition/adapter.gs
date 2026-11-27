/* =====================================================================
 *  SCS Requisition — সার্ভার অ্যাডাপ্টার
 *  - আসল অ্যাপে অ্যাডমিন পিন শুধু ব্রাউজারে যাচাই হতো; এখানে অ্যাডমিনের কাজগুলো সার্ভারেও
 *    অ্যাপে Admin অ্যাক্সেস ছাড়া হয় না
 *  - নতুন রিকুইজিশন -> অ্যাপের Admin দের নোটিফিকেশন
 * ===================================================================== */
['deleteRequisition', 'addProduct', 'editProduct', 'deleteProduct', 'addProject', 'editProject', 'deleteProject',
 'saveSealUrl', 'saveDriveFolderUrl', 'saveSettings', 'setSettingValue', 'restoreBackup', 'resetAllData', 'setAutoBackup',
 'resequenceRequisitionsSheet', 'reindexSheet'].forEach(function (fn) {
  var orig = self[fn];
  if (typeof orig !== 'function') return;
  self[fn] = function () {
    if (!SCS_GAS.isAdmin()) throw new Error('Admin access for Requisition is required. / এই কাজের জন্য Requisition-এ Admin অ্যাক্সেস লাগবে।');
    return orig.apply(this, arguments);
  };
});
/* চালানের প্যাড (ব্যাকগ্রাউন্ড ছবি) — সবাই পড়তে পারে, শুধু Admin বদলাতে পারে */
function scsGetPad() { return PropertiesService.getScriptProperties().getProperty('SCS_CHALLAN_PAD') || ''; }
function scsSetPad(dataUrl) {
  if (!SCS_GAS.isAdmin()) throw new Error('Admin access for Requisition is required. / এই কাজের জন্য Admin অ্যাক্সেস লাগবে।');
  dataUrl = String(dataUrl || '');
  if (dataUrl && !/^data:image\/(png|jpeg|webp);base64,/.test(dataUrl)) throw new Error('Please choose an image file.');
  if (dataUrl.length > 1800000) throw new Error('The image is too large.');
  var p = PropertiesService.getScriptProperties();
  if (dataUrl) p.setProperty('SCS_CHALLAN_PAD', dataUrl); else p.deleteProperty('SCS_CHALLAN_PAD');
  return true;
}
var __scsSubmitReq = submitRequisition;
submitRequisition = function (req) {
  var res = __scsSubmitReq.apply(this, arguments);
  try {
    var r = typeof req === 'string' ? JSON.parse(req) : (req || {});
    if (res && res.success !== false) {
      SCS_GAS.notify('new_requisition', 'New requisition' + (res.challanNo ? ' · ' + res.challanNo : ''),
        [r.projectName || r.project || '', r.requestedBy || r.name || '', (r.items && r.items.length ? r.items.length + ' item(s)' : '')].filter(String).join(' · '));
    }
  } catch (e) {}
  return res;
};
