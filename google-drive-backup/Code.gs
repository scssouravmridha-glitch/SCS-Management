/**
 * SCS Management — Google Drive backup receiver (Google Apps Script)  ·  v15 (বড় ফাইল টুকরো করে)
 *
 * একবার সেটআপ (Admin Console > Backup > "Apps Script কোড কপি করুন" দিলে টোকেন বসানো কোডই আসে):
 *  1. https://script.google.com → New project → এই পুরো কোড পেস্ট করুন (আগের সব মুছে)।
 *  2. TOKEN এ Admin Console > Backup এর টোকেন (কপি করা কোডে আগেই বসানো থাকে)।
 *  3. উপরে ফাংশন "authorize" বেছে Run → Google অনুমতি দিন।
 *  4. Deploy → New deployment → Web app · Execute as: Me · Who has access: Anyone → Deploy → URL কপি।
 *  5. URL আর Drive ফোল্ডারের লিংক Admin Console > Backup এ বসিয়ে Save।
 * কোড বদলালে: Deploy → Manage deployments → ✏️ → Version: New version → Deploy (URL একই থাকে)।
 *
 * কাজ: প্রতিটা অ্যাপের ব্যাকআপ আলাদা সাব-ফোল্ডারে ("SCS Backup - <অ্যাপ>")।
 *  ফাইল যত বড়ই হোক: সার্ভার ৮ MB করে টুকরো পাঠায়, এখানে Google Drive এর resumable upload এ জোড়া লাগে।
 */
const TOKEN = 'PASTE-THE-TOKEN-FROM-ADMIN-CONSOLE';

function doPost(e) {
  try {
    const q = JSON.parse(e.postData.contents);
    if (!q.token || q.token !== TOKEN) return out_({ ok: false, error: 'Wrong token' });
    if (q.op === 'begin') return out_(begin_(q));
    if (q.op === 'chunk') return out_(chunk_(q));
    if (q.op === 'keep') return out_({ ok: true, removed: keep_(sub_(q.folderId, q.sub), q.prefix, Number(q.keep) || 0) });
    // পুরনো ধরন (একবারে পুরো JSON)
    if (!q.folderId) return out_({ ok: false, error: 'Drive folder is missing' });
    const folder = DriveApp.getFolderById(q.folderId);
    const name = q.filename || ('SCS-backup-' + new Date().toISOString().replace(/[:.]/g, '-') + '.json');
    const file = folder.createFile(Utilities.newBlob(JSON.stringify(q.data), 'application/json', name));
    if (Number(q.keep) > 0) keep_(folder, 'SCS-backup-', Number(q.keep));
    return out_({ ok: true, id: file.getId(), name: name, size: file.getSize() });
  } catch (err) {
    return out_({ ok: false, error: String(err) });
  }
}

/** নতুন ফাইলের আপলোড শুরু: Drive resumable session */
function begin_(q) {
  const folder = sub_(q.folderId, q.sub);
  const r = UrlFetchApp.fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true', {
    method: 'post', contentType: 'application/json; charset=UTF-8', muteHttpExceptions: true,
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken(), 'X-Upload-Content-Type': q.mime || 'application/gzip' },
    payload: JSON.stringify({ name: q.name, parents: [folder.getId()], mimeType: q.mime || 'application/gzip' })
  });
  if (r.getResponseCode() !== 200) return { ok: false, error: 'Drive ' + r.getResponseCode() + ': ' + r.getContentText().slice(0, 300) };
  const h = r.getAllHeaders(); let loc = '';
  Object.keys(h).forEach(function (k) { if (k.toLowerCase() === 'location') loc = h[k]; });
  if (!loc) return { ok: false, error: 'Drive did not give an upload address' };
  const sid = Utilities.getUuid();
  CacheService.getScriptCache().put('s_' + sid, loc, 21600);
  return { ok: true, sid: sid };
}

/** একটা টুকরো (base64) Drive এ; শেষ টুকরোতে ফাইল তৈরি হয় */
function chunk_(q) {
  const url = CacheService.getScriptCache().get('s_' + q.sid);
  if (!url) return { ok: false, error: 'Upload session expired — run the backup again' };
  const bytes = q.data ? Utilities.base64Decode(q.data) : [];
  const start = Number(q.offset) || 0, total = q.last ? String(start + bytes.length) : '*';
  const range = bytes.length ? 'bytes ' + start + '-' + (start + bytes.length - 1) + '/' + total : 'bytes */' + total;
  const opt = { method: 'put', contentType: 'application/octet-stream', headers: { 'Content-Range': range }, muteHttpExceptions: true };
  if (bytes.length) opt.payload = bytes;
  const r = UrlFetchApp.fetch(url, opt), c = r.getResponseCode();
  if (c === 308) return { ok: true };
  if (c === 200 || c === 201) {
    const j = JSON.parse(r.getContentText() || '{}');
    CacheService.getScriptCache().remove('s_' + q.sid);
    return { ok: true, done: true, id: j.id, name: j.name };
  }
  return { ok: false, error: 'Drive ' + c + ': ' + r.getContentText().slice(0, 300) };
}

/** ব্যাকআপ ফোল্ডারের ভেতরে অ্যাপের সাব-ফোল্ডার (না থাকলে তৈরি) */
function sub_(folderId, name) {
  const root = DriveApp.getFolderById(folderId);
  if (!name) return root;
  const it = root.getFoldersByName(name);
  return it.hasNext() ? it.next() : root.createFolder(name);
}

/** শুধু শেষের "keep" টা রাখা (নাম prefix দিয়ে শুরু হওয়া ফাইল) */
function keep_(folder, prefix, keep) {
  if (!(keep > 0)) return 0;
  const list = [], it = folder.getFiles();
  while (it.hasNext()) { const f = it.next(); if (f.getName().indexOf(prefix) === 0) list.push(f); }
  list.sort(function (a, b) { return b.getDateCreated() - a.getDateCreated(); });
  list.slice(keep).forEach(function (f) { f.setTrashed(true); });
  return Math.max(0, list.length - keep);
}

function doGet() {
  return out_({ ok: true, service: 'SCS Management backup receiver', v: 15 });
}

/** একবার Run করে Drive অনুমতি দিন */
function authorize() {
  DriveApp.getRootFolder().getName();
  UrlFetchApp.fetch('https://www.googleapis.com/drive/v3/about?fields=user', { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true });
  Logger.log('Authorized. Now Deploy → New deployment → Web app.');
}

function out_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
