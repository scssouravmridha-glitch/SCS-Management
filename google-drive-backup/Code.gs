/**
 * SCS Management — Google Drive backup receiver (Google Apps Script)
 *
 * একবার সেটআপ:
 *  1. https://script.google.com → New project → এই পুরো কোড পেস্ট করুন।
 *  2. নিচে TOKEN এ SCS Management > Admin Console > Backup পেজে দেখানো টোকেনটা বসান।
 *  3. উপরে ফাংশন তালিকা থেকে "authorize" বেছে Run চাপুন → Google অনুমতি দিন (Drive এ ফাইল রাখার জন্য)।
 *  4. Deploy → New deployment → Type: Web app
 *       Execute as: Me
 *       Who has access: Anyone
 *     → Deploy → "Web app URL" কপি করুন।
 *  5. সেই URL Admin Console > Backup > "Apps Script Web App URL" এ বসিয়ে Save দিন।
 *
 * কোড বদলালে: Deploy → Manage deployments → ✏️ → Version: New version → Deploy (URL একই থাকে)।
 */
const TOKEN = 'PASTE-THE-TOKEN-FROM-ADMIN-CONSOLE';

function doPost(e) {
  try {
    const req = JSON.parse(e.postData.contents);
    if (!req.token || req.token !== TOKEN) return out_({ ok: false, error: 'Wrong token' });
    if (!req.folderId) return out_({ ok: false, error: 'Drive folder is missing' });
    const folder = DriveApp.getFolderById(req.folderId);
    const name = req.filename || ('SCS-backup-' + new Date().toISOString().replace(/[:.]/g, '-') + '.json');
    const file = folder.createFile(Utilities.newBlob(JSON.stringify(req.data), 'application/json', name));

    // পুরনো ব্যাকআপ মুছে শুধু শেষের "keep" টা রাখা (0 = সব রাখা)
    const keep = Number(req.keep) || 0;
    if (keep > 0) {
      const list = [];
      const it = folder.getFiles();
      while (it.hasNext()) {
        const f = it.next();
        if (/^SCS-backup-.*\.json$/.test(f.getName())) list.push(f);
      }
      list.sort(function (a, b) { return b.getDateCreated() - a.getDateCreated(); });
      list.slice(keep).forEach(function (f) { f.setTrashed(true); });
    }
    return out_({ ok: true, id: file.getId(), name: name, size: file.getSize() });
  } catch (err) {
    return out_({ ok: false, error: String(err) });
  }
}

function doGet() {
  return out_({ ok: true, service: 'SCS Management backup receiver' });
}

/** একবার Run করে Drive অনুমতি দিন */
function authorize() {
  DriveApp.getRootFolder().getName();
  Logger.log('Authorized. Now Deploy → New deployment → Web app.');
}

function out_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
