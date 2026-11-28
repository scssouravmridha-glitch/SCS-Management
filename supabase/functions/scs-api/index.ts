// @ts-nocheck
/* =====================================================================
 *  SCS Management — সার্ভারের সব কাজ একটা ফাংশনে (Supabase Edge Function: scs-api)
 *
 *  এটা Supabase-এ চলে, তাই ওয়েবসাইট যেকোনো জায়গায় রাখা যায় (Netlify, GitHub Pages ...)।
 *  একই ফাইল Netlify function হিসেবেও চলে (netlify/functions/*.mjs এটাকেই ডাকে)।
 *
 *  ?fn=auth   (আগের password-reset) মোবাইল SMS / ইমেইলে কোড দিয়ে অ্যাকাউন্ট খোলা, লগইন, পাসওয়ার্ড রিসেট
 *  ?fn=push   ওয়েব পুশ নোটিফিকেশন (GET = public key, POST = জমে থাকা নোটিফিকেশন পাঠানো)
 *  ?fn=sms    Chemical Order কাস্টমার SMS
 *
 *  সেটআপ (একবার): Supabase > Edge Functions > Deploy a new function > Via Editor
 *    নাম: scs-api  -> এই পুরো ফাইল পেস্ট -> Deploy
 *    তারপর ফাংশনের Settings / Details এ "Enforce JWT verification" (Verify JWT) বন্ধ করুন
 *    (এই ফাংশন নিজেই লগইন যাচাই করে)।
 *  SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY Supabase নিজেই দেয় — বসাতে হয় না।
 *
 *  SMS ও ইমেইলের সেটিং (প্রথম দিন থেকেই কোড যাওয়ার জন্য):
 *    Supabase > Edge Functions > Secrets (Manage secrets) এ যোগ করুন:
 *      SMS_API_URL, SMS_API_KEY, SMS_SENDER_ID   (ঐচ্ছিক: SMS_METHOD = POST/GET,
 *      SMS_PARAM_KEY, SMS_PARAM_MESSAGE, SMS_PARAM_TO, SMS_PARAM_SENDER — SMS কোম্পানির প্যারামিটারের নাম)
 *      SMTP_USER (Gmail ঠিকানা), SMTP_PASS (Gmail App Password), ঐচ্ছিক SMTP_HOST, SMTP_PORT(465), SMTP_FROM_NAME
 *    পরে Admin Console > SMS & Email থেকে বদলালে সেটাই আগে ব্যবহার হয়।
 * ===================================================================== */

const IS_DENO = typeof Deno !== 'undefined';
const ENV = (k) => String((IS_DENO ? Deno.env.get(k) : (globalThis.process && process.env[k])) || '').trim();
const URL_ = () => ENV('SUPABASE_URL').replace(/\/+$/, '');
const ANON = () => ENV('SUPABASE_ANON_KEY');
const SERVICE = () => ENV('SUPABASE_SERVICE_ROLE_KEY');
const CODE_MINUTES = 10;
const PURPOSES = ['signup', 'login', 'reset'];
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
};
const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
const isJwt = (k) => /^eyJ/.test(k || '');
const emailOk = (e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e);
const enc = encodeURIComponent;

/* ---------------- bytes / base64 helpers (Web Crypto, Deno ও Node দুই জায়গায় চলে) ---------------- */
const te = new TextEncoder();
const td = new TextDecoder();
const cat = (...arrs) => { const n = arrs.reduce((s, a) => s + a.length, 0), o = new Uint8Array(n); let p = 0; for (const a of arrs) { o.set(a, p); p += a.length; } return o; };
function b64(bytes) { let s = ''; const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes); for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); return btoa(s); }
const b64u = (bytes) => b64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
function unb64u(s) { s = String(s).replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; const bin = atob(s), o = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) o[i] = bin.charCodeAt(i); return o; }
const b64utf8 = (s) => b64(te.encode(String(s)));
async function sha256hex(s) { const h = new Uint8Array(await crypto.subtle.digest('SHA-256', te.encode(s))); return Array.from(h, (x) => x.toString(16).padStart(2, '0')).join(''); }
function sameStr(a, b) { if (a.length !== b.length) return false; let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0; }
function randomCode() { const a = new Uint32Array(1); let v; do { crypto.getRandomValues(a); v = a[0]; } while (v >= 4294000000); return String(v % 1000000).padStart(6, '0'); }

function keyHelp(msg) {
  if (/unregistered api key|invalid api key|no api key|invalid.*signature/i.test(msg)) {
    return 'Supabase key ভুল (' + msg + ')। Supabase নিজের ফাংশনে এটা হয় না — Netlify function ব্যবহার করলে Netlify Environment variables এ SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY একই প্রজেক্টের কি না দেখুন।';
  }
  return msg;
}

/** Supabase REST/Auth কল। token থাকলে ইউজার হিসেবে, না থাকলে service role হিসেবে */
async function sb(path, { token, method = 'GET', body, prefer, anon } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const A = ANON(), S = SERVICE();
  if (token) { headers.apikey = A; headers.Authorization = 'Bearer ' + token; }
  else if (anon) { headers.apikey = A; if (isJwt(A)) headers.Authorization = 'Bearer ' + A; }
  else { headers.apikey = S; if (isJwt(S)) headers.Authorization = 'Bearer ' + S; }
  if (prefer) headers.Prefer = prefer;
  const r = await fetch(URL_() + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text();
  let j = null; try { j = t ? JSON.parse(t) : null; } catch { j = t; }
  if (!r.ok) {
    const m = (j && (j.message || j.msg || j.error_description || j.error)) || ('Supabase error ' + r.status);
    const e = new Error(keyHelp(String(m))); e.status = r.status; throw e;
  }
  return j;
}
const bearer = (req) => (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
/** ব্রাউজার থেকে আসা টোকেন আসল লগইন কি না (anon key নয়) */
async function userOf(req) {
  const tok = bearer(req);
  if (!tok || tok === ANON()) return null;
  const r = await fetch(URL_() + '/auth/v1/user', { headers: { apikey: ANON(), Authorization: 'Bearer ' + tok } });
  if (!r.ok) return null;
  const u = await r.json();
  return u && u.id ? { id: u.id, email: u.email, token: tok } : null;
}
async function requireSuper(req) {
  const u = await userOf(req);
  if (!u) return json(401, { error: 'Login required' });
  const ok = await sb('/rest/v1/rpc/is_super_admin', { token: u.token, method: 'POST', body: {} });
  return ok === true ? null : json(403, { error: 'Super Admin only' });
}

export function normalizeBdMobile(input) {
  let d = String(input || '').replace(/\D/g, '');
  if (!d) return null;
  if (d.startsWith('00')) d = d.slice(2);
  if (/^8801[3-9]\d{8}$/.test(d)) return d;
  if (/^01[3-9]\d{8}$/.test(d)) return '88' + d;
  if (/^1[3-9]\d{8}$/.test(d)) return '880' + d;
  return null;
}

/* =====================================================================
 *  SMS
 * ===================================================================== */
async function smsConfig() {
  const [s] = await sb('/rest/v1/sys_settings?key=eq.sms&select=value');
  const [k] = await sb('/rest/v1/sys_secrets?key=eq.sms_api_key&select=value');
  let cfg = (s && s.value) || {}, apiKey = k ? k.value : '', source = 'admin-console';
  if (cfg.enabled === false) return { cfg, apiKey, source };
  if ((!cfg.apiUrl || !apiKey) && ENV('SMS_API_URL') && ENV('SMS_API_KEY')) {
    cfg = { enabled: true, apiUrl: ENV('SMS_API_URL'), senderId: ENV('SMS_SENDER_ID'), method: ENV('SMS_METHOD') || 'POST',
      params: Object.assign({ apiKey: ENV('SMS_PARAM_KEY') || undefined, message: ENV('SMS_PARAM_MESSAGE') || undefined, to: ENV('SMS_PARAM_TO') || undefined, senderId: ENV('SMS_PARAM_SENDER') || undefined }, cfg.params || {}) };
    apiKey = ENV('SMS_API_KEY'); source = 'server secrets';
  }
  if (!cfg.apiUrl || !apiKey) {
    const [cs] = await sb('/rest/v1/chem_settings?key=eq.sms&select=value');
    const [ck] = await sb('/rest/v1/chem_secrets?key=eq.sms_api_key&select=value');
    const c = (cs && cs.value) || {};
    if (c.apiUrl && ck && ck.value) { cfg = { enabled: true, apiUrl: c.apiUrl, senderId: c.senderId }; apiKey = ck.value; source = 'chemical-order'; }
  }
  return { cfg, apiKey, source };
}
async function sendSms(cfg, apiKey, to, msg) {
  if (cfg.enabled === false) return { ok: false, code: 'not_configured', error: 'SMS gateway is turned off (Admin Console > SMS & Email).' };
  if (!cfg.apiUrl || !apiKey) return { ok: false, code: 'not_configured', error: 'SMS gateway is not set up yet (Supabase Edge Function secrets or Admin Console > SMS & Email).' };
  try {
    const p = cfg.params || {};
    const form = new URLSearchParams();
    form.set(p.apiKey || 'api_key', apiKey);
    form.set(p.message || 'msg', msg);
    form.set(p.to || 'to', to);
    if (cfg.senderId) form.set(p.senderId || 'sender_id', cfg.senderId);
    const method = String(cfg.method || 'POST').toUpperCase();
    const r = method === 'GET'
      ? await fetch(cfg.apiUrl + (cfg.apiUrl.includes('?') ? '&' : '?') + form.toString())
      : await fetch(cfg.apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: form });
    const text = await r.text();
    let j = null; try { j = JSON.parse(text); } catch {}
    const code = j ? (j.response_code ?? j.error ?? j.status_code ?? j.code) : undefined;
    const ok = r.ok && (code === undefined || [0, 200, 202].includes(Number(code)) || /success|sent|ok/i.test(String(j && (j.success_message || j.status || j.message || ''))));
    if (ok) return { ok: true, raw: text.slice(0, 200) };
    const raw = String(j ? (j.error_message || j.msg || j.message || text) : text);
    return { ok: false, invalidNumber: /invalid|number|mobile|recipient|msisdn/i.test(raw), error: 'SMS provider: ' + raw.slice(0, 200) };
  } catch (e) { return { ok: false, error: 'SMS provider unreachable: ' + String(e).slice(0, 200) }; }
}

/* =====================================================================
 *  EMAIL (SMTP, port 465 SSL) — Gmail / Zoho / Brevo
 * ===================================================================== */
async function mailConfig() {
  const [s] = await sb('/rest/v1/sys_settings?key=eq.smtp&select=value');
  const [k] = await sb('/rest/v1/sys_secrets?key=eq.smtp_password&select=value');
  const c = (s && s.value) || {};
  if (c.enabled === false) return { enabled: false, source: 'admin-console' };
  if (c.host && c.user && k && k.value) return { enabled: true, host: c.host, port: Number(c.port) || 465, user: c.user, pass: k.value, fromName: c.fromName || 'SCS Management', source: 'admin-console' };
  const out = { enabled: !!(ENV('SMTP_USER') && ENV('SMTP_PASS')), host: ENV('SMTP_HOST') || 'smtp.gmail.com', port: Number(ENV('SMTP_PORT')) || 465,
    user: ENV('SMTP_USER'), pass: ENV('SMTP_PASS').replace(/\s+/g, ''), fromName: ENV('SMTP_FROM_NAME') || 'SCS Management', source: 'server secrets' };
  return out;
}
/** TLS সংযোগ: Supabase (Deno) এ Deno.connectTls, Netlify (Node) এ node:tls */
async function openTls(host, port) {
  let buf = '', waiters = [], closed = null;
  const pump = () => {
    while (waiters.length) {
      const m = buf.match(/(^|\r\n)(\d{3}) [^\r\n]*\r\n/);
      if (!m) { if (closed) waiters.shift().rej(closed); else return; continue; }
      const end = m.index + m[0].length, text = buf.slice(0, end);
      buf = buf.slice(end);
      waiters.shift().res({ code: Number(m[2]), text: text.trim() });
    }
  };
  let write, close;
  if (IS_DENO) {
    const conn = await Deno.connectTls({ hostname: host, port });
    write = async (s) => { let b = te.encode(s); while (b.length) { const n = await conn.write(b); b = b.subarray(n); } };
    close = () => { try { conn.close(); } catch {} };
    (async () => {
      const b = new Uint8Array(16384);
      try { for (;;) { const n = await conn.read(b); if (n === null) break; buf += td.decode(b.subarray(0, n)); pump(); } }
      catch (e) { closed = e; }
      closed = closed || new Error('SMTP connection closed'); pump();
    })();
  } else {
    const tls = await import('node:tls');
    const sock = tls.connect({ host, port, servername: host });
    await new Promise((res, rej) => { sock.once('secureConnect', res); sock.once('error', rej); });
    sock.on('data', (d) => { buf += d.toString('utf8'); pump(); });
    sock.on('error', (e) => { closed = e; pump(); });
    sock.on('close', () => { closed = closed || new Error('SMTP connection closed'); pump(); });
    write = (s) => new Promise((r) => sock.write(s, r));
    close = () => { try { sock.destroy(); } catch {} };
  }
  return { write, close, next: () => new Promise((res, rej) => { waiters.push({ res, rej }); pump(); }) };
}
async function sendMail(o) {
  if (!o.host || !o.user || !o.pass) throw new Error('Email (SMTP) is not set up.');
  const port = Number(o.port) || 465;
  if (port !== 465) throw new Error('Use port 465 (SSL). Port 587/25 is blocked on the server.');
  const c = await openTls(o.host, port);
  const timer = setTimeout(() => c.close(), 25000);
  async function cmd(line, ok, secret) {
    if (line !== null) await c.write(line + '\r\n');
    const r = await c.next();
    const okList = Array.isArray(ok) ? ok : [ok];
    if (!okList.includes(r.code)) throw new Error('SMTP ' + (secret ? '(login)' : (line || 'connect').slice(0, 40)) + ' → ' + r.text.slice(0, 200));
    return r;
  }
  try {
    await cmd(null, 220);
    await cmd('EHLO scs-management', 250);
    await cmd('AUTH LOGIN', 334);
    await cmd(b64utf8(o.user), 334, true);
    await cmd(b64utf8(o.pass), 235, true);
    const from = String(o.user).trim(), word = (s) => '=?UTF-8?B?' + b64utf8(s) + '?=';
    await cmd('MAIL FROM:<' + from + '>', 250);
    await cmd('RCPT TO:<' + String(o.to).trim() + '>', [250, 251]);
    await cmd('DATA', 354);
    const body = b64utf8(o.html || o.text || '').replace(/.{1,76}/g, '$&\r\n');
    const msg = ['From: ' + word(o.fromName || 'SCS Management') + ' <' + from + '>', 'To: <' + String(o.to).trim() + '>', 'Subject: ' + word(o.subject || 'SCS Management'),
      'Date: ' + new Date().toUTCString(), 'Message-ID: <' + Date.now() + '.' + randomCode() + '@scs-management>', 'MIME-Version: 1.0',
      'Content-Type: ' + (o.html ? 'text/html' : 'text/plain') + '; charset=UTF-8', 'Content-Transfer-Encoding: base64', '', body].join('\r\n');
    await cmd(msg + '\r\n.', 250);
    try { await c.write('QUIT\r\n'); } catch {}
    return { ok: true };
  } finally { clearTimeout(timer); setTimeout(() => c.close(), 300); }
}
function codeEmail(code, purpose) {
  const what = purpose === 'signup' ? 'create your account' : purpose === 'login' ? 'log in' : 'reset your password';
  return '<div style="font-family:Arial,sans-serif;max-width:460px;margin:auto;padding:24px;border:1px solid #eee;border-radius:16px">' +
    '<h2 style="margin:0 0 8px;color:#e91e63">SCS Management</h2><p style="color:#333">Use this code to ' + what + ':</p>' +
    '<p style="font-size:32px;font-weight:bold;letter-spacing:8px;margin:16px 0;color:#111">' + code + '</p>' +
    '<p style="color:#666;font-size:13px">Valid for ' + CODE_MINUTES + ' minutes. Do not share this code. / কোডটি ' + CODE_MINUTES + ' মিনিট কাজ করবে, কাউকে দেবেন না।</p></div>';
}

/* =====================================================================
 *  AUTH: SMS / ইমেইল কোড
 * ===================================================================== */
const codeHash = (key, purpose, code) => sha256hex(key + ':' + purpose + ':' + code + ':' + SERVICE().slice(-12));
async function usersByPhone(phone) {
  const rows = await sb('/rest/v1/profiles?select=id,email,phone,status&phone=ilike.*' + enc(phone.slice(-10)) + '*');
  return (rows || []).filter((p) => normalizeBdMobile(p.phone) === phone);
}
async function usersByEmail(email) {
  const rows = await sb('/rest/v1/profiles?select=id,email,phone,status&email=ilike.' + enc(email.replace(/[%_]/g, '\\$&')));
  return (rows || []).filter((p) => String(p.email || '').toLowerCase() === email);
}
async function issueCode(key, purpose, sendFn, masked) {
  const [row] = await sb('/rest/v1/sms_codes?select=*&phone=eq.' + enc(key) + '&purpose=eq.' + purpose);
  const now = Date.now();
  let sentCount = 1, windowStart = new Date(now).toISOString();
  if (row) {
    if (now - new Date(row.created_at).getTime() < 60 * 1000) return json(429, { error: 'Please wait 1 minute before asking for a new code. / ১ মিনিট পর আবার চেষ্টা করুন।' });
    const inWindow = now - new Date(row.window_start).getTime() < 60 * 60 * 1000;
    if (inWindow && row.sent_count >= 5) return json(429, { error: 'Too many codes. Try again after 1 hour. / অনেকবার কোড চাওয়া হয়েছে, ১ ঘণ্টা পর চেষ্টা করুন।' });
    if (inWindow) { sentCount = row.sent_count + 1; windowStart = row.window_start; }
  }
  const code = randomCode();
  const r = await sendFn(code);
  if (!r.ok) return json(r.code === 'not_configured' ? 503 : 502, { error: r.error, code: r.code || 'send_failed' });
  await sb('/rest/v1/sms_codes?on_conflict=phone,purpose', {
    method: 'POST', prefer: 'resolution=merge-duplicates,return=minimal',
    body: { phone: key, purpose, code_hash: await codeHash(key, purpose, code), expires_at: new Date(now + CODE_MINUTES * 60 * 1000).toISOString(), attempts: 0, sent_count: sentCount, window_start: windowStart, created_at: new Date(now).toISOString() }
  });
  return json(200, { ok: true, to: masked });
}
async function checkCode(key, purpose, code) {
  code = String(code || '').replace(/\D/g, '');
  const k = enc(key), where = '/rest/v1/sms_codes?phone=eq.' + k + '&purpose=eq.' + purpose;
  const [row] = await sb('/rest/v1/sms_codes?select=*&phone=eq.' + k + '&purpose=eq.' + purpose);
  if (!row || new Date(row.expires_at).getTime() < Date.now() || row.attempts >= 5) {
    if (row) await sb(where, { method: 'DELETE', prefer: 'return=minimal' });
    return json(400, { error: 'The code has expired. Ask for a new code. / কোডের মেয়াদ শেষ, নতুন কোড নিন।' });
  }
  if (!sameStr(await codeHash(key, purpose, code), row.code_hash)) {
    await sb(where, { method: 'PATCH', prefer: 'return=minimal', body: { attempts: row.attempts + 1 } });
    return json(400, { error: 'Wrong code. ' + Math.max(0, 4 - row.attempts) + ' attempt(s) left. / ভুল কোড।' });
  }
  await sb(where, { method: 'DELETE', prefer: 'return=minimal' });
  return null;
}
function target(body) {
  if (String(body.channel || '') === 'email') {
    const email = String(body.email || '').trim().toLowerCase();
    if (!emailOk(email)) return { bad: json(400, { error: 'Enter a valid email. / সঠিক ইমেইল দিন।' }) };
    const [u, d] = email.split('@');
    return { channel: 'email', email, key: 'email:' + email, masked: u.slice(0, 2) + '•••@' + d };
  }
  const phone = normalizeBdMobile(body.phone);
  if (!phone) return { bad: json(400, { error: 'Enter a valid mobile number (01XXXXXXXXX). / সঠিক মোবাইল নম্বর দিন।' }) };
  return { channel: 'sms', phone, key: phone, masked: '+' + phone.slice(0, 5) + '•••••' + phone.slice(-3) };
}
async function sender(tg, purpose) {
  if (tg.channel === 'email') {
    const m = await mailConfig();
    return async (code) => {
      if (!m.enabled) return { ok: false, code: 'not_configured', error: 'Email (SMTP) is not set up yet (Supabase Edge Function secrets or Admin Console > SMS & Email).' };
      try { await sendMail({ ...m, to: tg.email, subject: 'SCS Management code: ' + code, html: codeEmail(code, purpose) }); return { ok: true }; }
      catch (e) { return { ok: false, error: 'Email could not be sent: ' + String(e.message || e).slice(0, 200) }; }
    };
  }
  const { cfg, apiKey } = await smsConfig();
  const text = (code) => purpose === 'signup' ? `SCS Management: your sign-up code is ${code}\nValid for ${CODE_MINUTES} minutes.`
    : `SCS Management ${purpose === 'login' ? 'login' : 'password reset'} code: ${code}\nValid for ${CODE_MINUTES} minutes. Do not share.`;
  return (code) => sendSms(cfg, apiKey, tg.phone, text(code));
}
const findUsers = (tg) => tg.channel === 'email' ? usersByEmail(tg.email) : usersByPhone(tg.phone);

async function handleAuth(req) {
  if (req.method !== 'POST') return json(405, { error: 'POST only' });
  let body = {}; try { body = await req.json(); } catch {}
  const action = String(body.action || '');

  if (action === 'health') {
    let who = 'unknown';
    try { const deny = await requireSuper(req); if (deny) return deny; who = 'super admin'; } catch (e) { who = 'check failed: ' + e.message; }
    const A = ANON(), S = SERVICE();
    const out = { who, runtime: IS_DENO ? 'Supabase Edge Function' : 'Netlify function', env: { SUPABASE_URL: !!URL_(), SUPABASE_ANON_KEY: !!A, SUPABASE_SERVICE_ROLE_KEY: !!S } };
    try { await sb('/rest/v1/apps?select=key&limit=1'); out.serviceKey = 'OK'; } catch (e) { out.serviceKey = e.message; }
    try { await sb('/rest/v1/apps?select=key&limit=1', { anon: true }); out.anonKey = 'OK'; } catch (e) { out.anonKey = e.message; }
    try { const s = await smsConfig(); out.sms = s.cfg.apiUrl && s.apiKey && s.cfg.enabled !== false ? 'configured (' + s.source + ')' : 'not configured'; } catch (e) { out.sms = e.message; }
    try { const m = await mailConfig(); out.email = m.enabled ? 'configured (' + m.source + ', ' + m.user + ')' : 'not configured'; } catch (e) { out.email = e.message; }
    return json(200, out);
  }
  if (action === 'test') {
    const deny = await requireSuper(req); if (deny) return deny;
    const to = normalizeBdMobile(body.to);
    if (!to) return json(400, { error: 'Enter a valid Bangladeshi mobile number.' });
    const { cfg, apiKey } = await smsConfig();
    const r = await sendSms(cfg, apiKey, to, 'SCS Management test SMS: your SMS gateway is working.');
    return r.ok ? json(200, { ok: true, raw: r.raw }) : json(400, { error: r.error || 'SMS could not be sent.' });
  }
  if (action === 'testEmail') {
    const deny = await requireSuper(req); if (deny) return deny;
    const to = String(body.to || '').trim();
    if (!emailOk(to)) return json(400, { error: 'Enter a valid email.' });
    const m = await mailConfig();
    if (!m.enabled) return json(400, { error: 'Email (SMTP) is not set up yet.' });
    await sendMail({ ...m, to, subject: 'SCS Management test email', html: '<p>Your SCS Management email (SMTP) is working. ✅</p><p>আপনার SCS Management ইমেইল সেটআপ কাজ করছে।</p>' });
    return json(200, { ok: true });
  }
  // Super Admin: অ্যাকাউন্টের কাজ (অস্থায়ী পাসওয়ার্ড, ইমেইল বদল, লগইন বন্ধ/চালু, পুরো মুছে ফেলা)
  if (action === 'adminUser') {
    const deny = await requireSuper(req); if (deny) return deny;
    const me = await userOf(req);
    const uid = String(body.userId || '');
    if (!/^[0-9a-f-]{36}$/i.test(uid)) return json(400, { error: 'Bad user id' });
    if (me && uid === me.id) return json(400, { error: 'You cannot do this to your own account. / নিজের অ্যাকাউন্টে এটা করা যায় না।' });
    const op = String(body.op || '');
    const adm = (method, payload) => fetch(URL_() + '/auth/v1/admin/users/' + uid, {
      method, headers: { apikey: SERVICE(), Authorization: 'Bearer ' + SERVICE(), 'Content-Type': 'application/json' },
      body: payload ? JSON.stringify(payload) : undefined });
    const fail = async (r, what) => json(400, { error: what + ': ' + (await r.text()).slice(0, 200) });
    if (op === 'tempPassword') {
      const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
      const a = new Uint32Array(10); crypto.getRandomValues(a);
      const pw = Array.from(a, (x) => abc[x % abc.length]).join('');
      const r = await adm('PUT', { password: pw, ban_duration: 'none' });
      if (!r.ok) return fail(r, 'Could not set the password');
      await sb('/rest/v1/profiles?id=eq.' + uid, { method: 'PATCH', prefer: 'return=minimal', body: { must_change_pw: true } });
      return json(200, { ok: true, password: pw });
    }
    if (op === 'setEmail') {
      const email = String(body.email || '').trim().toLowerCase();
      if (!emailOk(email)) return json(400, { error: 'Enter a valid email.' });
      const r = await adm('PUT', { email, email_confirm: true });
      if (!r.ok) return fail(r, 'Could not change the email');
      await sb('/rest/v1/profiles?id=eq.' + uid, { method: 'PATCH', prefer: 'return=minimal', body: { email } });
      return json(200, { ok: true });
    }
    if (op === 'ban' || op === 'unban') {
      const r = await adm('PUT', { ban_duration: op === 'ban' ? '876000h' : 'none' });
      if (!r.ok) return fail(r, 'Could not change login access');
      return json(200, { ok: true });
    }
    if (op === 'delete') {
      // ভুল করে খোলা অ্যাকাউন্ট: ফাইল, প্রোফাইল, অ্যাক্সেস, নোটিফিকেশন সব মুছে লগইনও মুছে ফেলা
      const st = (path, init) => fetch(URL_() + '/storage/v1/' + path, { ...init, headers: { apikey: SERVICE(), Authorization: 'Bearer ' + SERVICE(), 'Content-Type': 'application/json' } });
      for (const [bucket, prefix] of [['scs-files', 'profiles/' + uid + '/'], ['scs-public', 'avatars/' + uid + '/']]) {
        try {
          const lr = await st('object/list/' + bucket, { method: 'POST', body: JSON.stringify({ prefix, limit: 1000 }) });
          const items = lr.ok ? await lr.json() : [];
          const paths = (items || []).filter((x) => x && x.name).map((x) => prefix + x.name);
          if (paths.length) await st('object/' + bucket, { method: 'DELETE', body: JSON.stringify({ prefixes: paths }) });
        } catch {}
      }
      const r = await adm('DELETE');
      if (!r.ok) return fail(r, 'Could not delete the account');
      return json(200, { ok: true });
    }
    return json(400, { error: 'Unknown operation' });
  }
  // সব ডাটা রিসেটের কোড: শুধু Super Admin, কোড যায় তার নিজের ইমেইলে (কোড কখনো ব্রাউজারে আসে না)
  if (action === 'resetCode') {
    const deny = await requireSuper(req); if (deny) return deny;
    const u = await userOf(req);
    if (!u || !emailOk(String(u.email || ''))) return json(400, { error: 'Your account has no email address. / আপনার অ্যাকাউন্টে ইমেইল নেই।' });
    const m = await mailConfig();
    if (!m.enabled) return json(400, { error: 'Email (SMTP) is not set up yet (Admin Console > SMS & Email). / ইমেইল সেটআপ করা নেই।' });
    const code = randomCode();
    const hash = await sha256hex('scs-reset|' + code);
    await sb('/rest/v1/sys_secrets?on_conflict=key', { method: 'POST', prefer: 'resolution=merge-duplicates,return=minimal',
      body: { key: 'reset_code', value: JSON.stringify({ hash, exp: Date.now() + CODE_MINUTES * 60000, tries: 0, by: u.id }), updated_at: new Date().toISOString() } });
    await sendMail({ ...m, to: u.email, subject: 'SCS Management — FULL DATA RESET code: ' + code,
      html: '<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;border:2px solid #dc2626;border-radius:16px">' +
        '<h2 style="margin:0 0 8px;color:#dc2626">⚠️ SCS Management — Full data reset</h2>' +
        '<p>Someone (you) asked to ERASE ALL APP DATA. Use this code only if you really want that:</p>' +
        '<p style="font-size:32px;font-weight:bold;letter-spacing:8px;margin:16px 0">' + code + '</p>' +
        '<p style="color:#666;font-size:13px">Valid for ' + CODE_MINUTES + ' minutes. If this was not you, ignore this email and change your password.<br>' +
        'সব অ্যাপের সব ডাটা মুছে ফেলার কোড। আপনি না চাইলে এই ইমেইল উপেক্ষা করুন।</p></div>' });
    const [a, d] = String(u.email).split('@');
    return json(200, { ok: true, to: a.slice(0, 2) + '•••@' + d, minutes: CODE_MINUTES });
  }
  if (action === 'channels') {
    let sms = false, email = false;
    try { const s = await smsConfig(); sms = !!(s.cfg.apiUrl && s.apiKey && s.cfg.enabled !== false); } catch {}
    try { email = (await mailConfig()).enabled; } catch {}
    return json(200, { sms, email });
  }
  if (action === 'loginPassword') {
    const phone = normalizeBdMobile(body.phone);
    if (!phone) return json(400, { error: 'Enter a valid mobile number (01XXXXXXXXX). / সঠিক মোবাইল নম্বর দিন।' });
    const users = await usersByPhone(phone);
    if (users.length !== 1) return json(400, { error: 'Wrong mobile number or password. / মোবাইল নম্বর বা পাসওয়ার্ড ভুল।' });
    const r = await fetch(URL_() + '/auth/v1/token?grant_type=password', { method: 'POST', headers: { apikey: ANON(), 'Content-Type': 'application/json' }, body: JSON.stringify({ email: users[0].email, password: String(body.password || '') }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return json(400, { error: /invalid/i.test(JSON.stringify(j)) ? 'Wrong mobile number or password. / মোবাইল নম্বর বা পাসওয়ার্ড ভুল।' : keyHelp(j.msg || j.error_description || j.message || 'Login failed') });
    return json(200, { ok: true, session: { access_token: j.access_token, refresh_token: j.refresh_token } });
  }

  const tg = target(body);
  if (tg.bad) return tg.bad;

  if (action === 'send') {
    const purpose = PURPOSES.includes(body.purpose) ? body.purpose : 'reset';
    const users = await findUsers(tg);
    if (purpose === 'signup') {
      if (users.length) return json(409, { error: tg.channel === 'email' ? 'An account already uses this email — log in instead. / এই ইমেইলে আগেই অ্যাকাউন্ট আছে, লগইন করুন।' : 'An account already uses this mobile number — log in instead. / এই নম্বরে আগেই অ্যাকাউন্ট আছে, লগইন করুন।' });
    } else {
      if (!users.length) return json(404, { error: tg.channel === 'email' ? 'No account found with this email. / এই ইমেইলে কোনো অ্যাকাউন্ট নেই।' : 'No account found with this mobile number. / এই নম্বরে কোনো অ্যাকাউন্ট নেই।' });
      if (users.length > 1) return json(409, { error: 'More than one account uses this number — use email. / এই নম্বরে একাধিক অ্যাকাউন্ট, ইমেইল ব্যবহার করুন।' });
      if (users[0].status === 'disabled') return json(403, { error: 'This account is disabled. / অ্যাকাউন্টটি বন্ধ।' });
    }
    return issueCode(tg.key, purpose, await sender(tg, purpose), tg.masked);
  }
  if (action === 'signup') {
    const email = String(body.email || '').trim().toLowerCase(), password = String(body.password || ''), fullName = String(body.full_name || '').trim();
    const phone = normalizeBdMobile(body.phone);
    if (!emailOk(email)) return json(400, { error: 'Enter a valid email. / সঠিক ইমেইল দিন।' });
    if (password.length < 8) return json(400, { error: 'Password must be at least 8 characters.' });
    if (!fullName) return json(400, { error: 'Enter your full name.' });
    if (!phone) return json(400, { error: 'Enter a valid mobile number (01XXXXXXXXX). / সঠিক মোবাইল নম্বর দিন।' });
    if ((await usersByPhone(phone)).length) return json(409, { error: 'An account already uses this mobile number.' });
    if ((await usersByEmail(email)).length) return json(409, { error: 'An account with this email already exists — log in. / এই ইমেইলে আগেই অ্যাকাউন্ট আছে।' });
    const bad = await checkCode(tg.key, 'signup', body.code); if (bad) return bad;
    try {
      await sb('/auth/v1/admin/users', { method: 'POST', body: { email, password, email_confirm: true, user_metadata: { full_name: fullName, phone: '0' + phone.slice(3) } } });
    } catch (e) {
      if (/already|registered|exists/i.test(e.message)) return json(409, { error: 'An account with this email already exists — log in. / এই ইমেইলে আগেই অ্যাকাউন্ট আছে।' });
      throw e;
    }
    return json(200, { ok: true, email });
  }
  if (action === 'login') {
    const users = await findUsers(tg);
    if (users.length !== 1) return json(404, { error: 'No single account found. / অ্যাকাউন্ট পাওয়া যায়নি।' });
    const bad = await checkCode(tg.key, 'login', body.code); if (bad) return bad;
    const link = await sb('/auth/v1/admin/generate_link', { method: 'POST', body: { type: 'magiclink', email: users[0].email } });
    const th = (link && (link.hashed_token || (link.properties && link.properties.hashed_token))) || '';
    if (!th) return json(500, { error: 'Could not create a login session.' });
    return json(200, { ok: true, token_hash: th, email: users[0].email });
  }
  if (action === 'verify') {
    const password = String(body.password || '');
    if (password.length < 8) return json(400, { error: 'Password must be at least 8 characters.' });
    const users = await findUsers(tg);
    if (users.length !== 1) return json(404, { error: 'No single account found. / অ্যাকাউন্ট পাওয়া যায়নি।' });
    const bad = await checkCode(tg.key, 'reset', body.code); if (bad) return bad;
    await sb('/auth/v1/admin/users/' + users[0].id, { method: 'PUT', body: { password } });
    return json(200, { ok: true, email: users[0].email });
  }
  return json(400, { error: 'Unknown action' });
}

/* =====================================================================
 *  WEB PUSH (RFC 8291 aes128gcm + RFC 8292 VAPID) — Web Crypto দিয়ে
 * ===================================================================== */
let vapidCache = null;
async function vapid() {
  if (vapidCache) return vapidCache;
  const [row] = await sb('/rest/v1/sys_secrets?key=eq.vapid&select=value');
  let jwk = row && row.value ? JSON.parse(row.value) : null;
  if (!jwk) {
    const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
    const e = await crypto.subtle.exportKey('jwk', kp.privateKey);
    jwk = { kty: 'EC', crv: 'P-256', x: e.x, y: e.y, d: e.d };
    await sb('/rest/v1/sys_secrets?on_conflict=key', { method: 'POST', prefer: 'resolution=ignore-duplicates,return=minimal', body: { key: 'vapid', value: JSON.stringify(jwk) } });
    const [again] = await sb('/rest/v1/sys_secrets?key=eq.vapid&select=value');
    jwk = JSON.parse(again.value);
  }
  const key = await crypto.subtle.importKey('jwk', { kty: 'EC', crv: 'P-256', x: jwk.x, y: jwk.y, d: jwk.d, ext: true }, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  vapidCache = { publicKey: b64u(cat(new Uint8Array([4]), unb64u(jwk.x), unb64u(jwk.y))), key };
  return vapidCache;
}
async function vapidAuth(endpoint, v, subject) {
  const aud = new URL(endpoint).origin;
  const head = b64u(te.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const pay = b64u(te.encode(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: subject })));
  const sig = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, v.key, te.encode(head + '.' + pay)));
  return 'vapid t=' + head + '.' + pay + '.' + b64u(sig) + ', k=' + v.publicKey;
}
async function hmac(key, data) { const k = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']); return new Uint8Array(await crypto.subtle.sign('HMAC', k, data)); }
async function hkdf(salt, ikm, info, len) { const prk = await hmac(salt, ikm); return (await hmac(prk, cat(info, new Uint8Array([1])))).subarray(0, len); }
async function encrypt(sub, payload) {
  const uaPublic = unb64u(sub.p256dh), authSecret = unb64u(sub.auth);
  const eph = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const asPublic = new Uint8Array(await crypto.subtle.exportKey('raw', eph.publicKey));
  const uaKey = await crypto.subtle.importKey('raw', uaPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, eph.privateKey, 256));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const ikm = await hkdf(authSecret, shared, cat(te.encode('WebPush: info\0'), uaPublic, asPublic), 32);
  const cek = await hkdf(salt, ikm, te.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, te.encode('Content-Encoding: nonce\0'), 12);
  const aes = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const body = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce, tagLength: 128 }, aes, cat(te.encode(payload), new Uint8Array([2]))));
  const rs = new Uint8Array([0, 0, 16, 0]);   // 4096
  return cat(salt, rs, new Uint8Array([asPublic.length]), asPublic, body);
}
async function pushOne(sub, data, v, subject) {
  try {
    const r = await fetch(sub.endpoint, {
      method: 'POST',
      headers: { Authorization: await vapidAuth(sub.endpoint, v, subject), TTL: '86400', Urgency: 'high', 'Content-Encoding': 'aes128gcm', 'Content-Type': 'application/octet-stream' },
      body: await encrypt(sub, JSON.stringify(data))
    });
    if (r.status === 404 || r.status === 410) return 'gone';
    return r.ok ? 'ok' : 'fail:' + r.status;
  } catch { return 'fail'; }
}
async function dispatch(subject) {
  const since = new Date(Date.now() - 6 * 3600 * 1000).toISOString();
  const list = await sb('/rest/v1/notifications?select=id,user_id,app_key,title,body,url&pushed_at=is.null&created_at=gte.' + enc(since) + '&order=id.asc&limit=200');
  if (!list || !list.length) return { sent: 0, notifications: 0 };
  const ids = list.map((n) => n.id);
  const claimed = await sb('/rest/v1/notifications?id=in.(' + ids.join(',') + ')&pushed_at=is.null', { method: 'PATCH', prefer: 'return=representation', body: { pushed_at: new Date().toISOString() } });
  const mine = new Set((claimed || []).map((n) => n.id));
  const todo = list.filter((n) => mine.has(n.id));
  if (!todo.length) return { sent: 0, notifications: 0 };
  const users = [...new Set(todo.map((n) => n.user_id))];
  const subs = await sb('/rest/v1/push_subscriptions?select=*&user_id=in.(' + users.join(',') + ')');
  if (!subs || !subs.length) return { sent: 0, notifications: todo.length };
  const v = await vapid();
  let sent = 0; const gone = [];
  await Promise.all(todo.flatMap((n) => subs.filter((s) => s.user_id === n.user_id).map(async (s) => {
    const r = await pushOne(s, { title: n.title, body: n.body, url: n.url || '/', tag: 'scs-' + n.id, app: n.app_key }, v, subject);
    if (r === 'ok') sent++;
    if (r === 'gone') gone.push(s.id);
  })));
  if (gone.length) await sb('/rest/v1/push_subscriptions?id=in.(' + [...new Set(gone)].join(',') + ')', { method: 'DELETE', prefer: 'return=minimal' });
  return { sent, notifications: todo.length };
}
async function handlePush(req) {
  if (req.method === 'GET') return json(200, { publicKey: (await vapid()).publicKey });
  if (req.method !== 'POST') return json(405, { error: 'GET or POST only' });
  let body = {}; try { body = await req.json(); } catch {}
  const subject = 'mailto:noreply@scs-management.app';
  // ডাটাবেস (নতুন অর্ডার/আবেদন, হাজিরার রিমাইন্ডার) নিজেই ডাকে — গোপন cron_key দিয়ে
  if (body.cronKey) {
    const [k] = await sb('/rest/v1/sys_secrets?key=eq.cron_key&select=value');
    if (!k || !k.value || !sameStr(k.value, String(body.cronKey))) return json(401, { error: 'Bad key' });
    return json(200, { ok: true, ...(await dispatch(subject)) });
  }
  const user = await userOf(req);
  if (!user) return json(401, { error: 'Login required' });
  if (body.test) await sb('/rest/v1/notifications', { method: 'POST', prefer: 'return=minimal', body: { user_id: user.id, app_key: 'core', title: 'SCS Management', body: 'Test notification — push notifications are working on this device.', url: '/' } });
  return json(200, { ok: true, ...(await dispatch(subject)) });
}

/* =====================================================================
 *  CHEMICAL ORDER: কাস্টমার SMS
 * ===================================================================== */
const SMS_DEFAULT_LINES = [
  { id: 'intro', enabled: true, text: 'Thank you for purchasing products from Swarup Construction Solution.' },
  { id: 'dear', enabled: true, text: 'Dear {client},' },
  { id: 'received', enabled: true, text: 'We have received your order now (Order No: {orderNo}).' },
  { id: 'products', enabled: true, text: 'Your Product:\n{products}' },
  { id: 'price', enabled: true, text: '{price}' },
  { id: 'address', enabled: true, text: 'Delivery Address: {address}.' },
  { id: 'hotline', enabled: true, text: 'Hotline: +8801711190271' },
  { id: 'website', enabled: true, text: 'Website: swarupconstructionsolution.com' }
];
const taka = (v) => Number(v || 0).toLocaleString('en-US', { maximumFractionDigits: 2 }).replace(/\.00$/, '');
function fmtDelivery(s) {
  const m = String(s || '').match(/(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2}:\d{2}))?/);
  if (!m) return String(s || '');
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return Number(m[3]) + ' ' + MON[Number(m[2]) - 1] + ' ' + m[1] + (m[4] && m[4] !== '00:00' ? ' ' + m[4] : '');
}
function orderText(cfg, o, mobile) {
  const items = o.items || [];
  const lines = items.filter((i) => i.productName).map((i) => [i.productName, String(i.quantity ?? ''), i.unit || ''].filter(Boolean).join(' '));
  const sum = items.reduce((s, i) => s + Number(i.quantity || 0) * Number(i.discountUnitPrice || 0), 0);
  const transport = Number(o.transport_fee || 0), total = sum + transport;
  const price = transport > 0 ? `Total Price: ${taka(total)} Taka with ${taka(transport)} taka Transport Fee.` : `Total Price: ${taka(total)} Taka.`;
  const map = { client: o.client_name || 'Customer', orderNo: o.order_no || '', products: lines.length ? lines.join('\n') : '-', price, total: taka(total), transport: taka(transport), address: o.address || '-', delivery: fmtDelivery(o.delivery_at) || '-', mobile: mobile || '', orderBy: o.order_by || '-' };
  return (cfg.lines && cfg.lines.length ? cfg.lines : SMS_DEFAULT_LINES).filter((l) => l.enabled)
    .map((l) => String(l.text || '').replace(/\{(\w+)\}/g, (m, k) => (k in map ? map[k] : m))).filter((s) => s.trim() !== '').join('\n');
}
async function smsForOrder(o, cfg, apiKey, token) {
  let status;
  if (String(o.sms_status || '').includes('Sent')) return o.sms_status;
  if (!cfg.enabled) status = 'SMS Off';
  else {
    const mobile = normalizeBdMobile(o.mobile);
    if (!mobile) status = 'Invalid Number';
    else {
      const r = await sendSms({ ...cfg, params: cfg.params || {} }, apiKey, mobile, orderText(cfg, o, mobile));
      status = r.ok ? 'Sent ✅' : r.invalidNumber ? 'Invalid Number' : 'Not Sent';
    }
  }
  await sb('/rest/v1/chem_orders?order_no=eq.' + enc(o.order_no), { token, method: 'PATCH', body: { sms_status: status }, prefer: 'return=minimal' });
  return status;
}
async function handleChemSms(req) {
  if (req.method !== 'POST') return json(405, { error: 'POST only' });
  const user = await userOf(req);
  if (!user) return json(401, { error: 'Login required' });
  let body = {}; try { body = await req.json(); } catch {}
  const admin = !!(body.test || body.retryPending);
  const ok = await sb('/rest/v1/rpc/has_app', { token: user.token, method: 'POST', body: { p_app: 'chemical-order', p_role: admin ? 'admin' : 'user' } });
  if (ok !== true) return json(403, { error: admin ? 'Chemical Order Admin access required' : 'Chemical Order access required' });
  const [setRow] = await sb('/rest/v1/chem_settings?key=eq.sms&select=value');
  const [keyRow] = await sb('/rest/v1/chem_secrets?key=eq.sms_api_key&select=value');
  const cfg = (setRow && setRow.value) || {}, apiKey = keyRow ? keyRow.value : '';
  if (body.test) {
    const to = normalizeBdMobile(body.to);
    if (!to) return json(400, { error: 'সঠিক মোবাইল নম্বর দিন।' });
    const r = await sendSms({ ...cfg, enabled: true }, apiKey, to, 'SCS test SMS: your SMS service is working.');
    return r.ok ? json(200, { ok: true }) : json(400, { error: r.error || 'SMS পাঠানো যায়নি।' });
  }
  if (body.retryPending) {
    if (!cfg.enabled) return json(400, { error: 'SMS Service বন্ধ আছে।' });
    const orders = await sb('/rest/v1/chem_orders?select=*&or=(sms_status.eq.Pending,sms_status.eq.Not%20Sent,sms_status.eq.)&order=order_no.asc&limit=40');
    let sent = 0;
    for (const o of orders) { const s = await smsForOrder(o, cfg, apiKey, user.token); if (s.includes('Sent')) sent++; }
    return json(200, { ok: true, sent, checked: orders.length });
  }
  const orderNo = String(body.orderNo || '').trim();
  if (!orderNo) return json(400, { error: 'orderNo required' });
  const [o] = await sb('/rest/v1/chem_orders?select=*&order_no=eq.' + enc(orderNo));
  if (!o) return json(404, { error: 'Order not found' });
  return json(200, { ok: true, status: await smsForOrder(o, cfg, apiKey, user.token) });
}

/* =====================================================================
 *  APPS SCRIPT ইঞ্জিন: UrlFetchApp (বাইরের API, যেমন SMS) ও MailApp
 * ===================================================================== */
async function activeUser(req) {
  const u = await userOf(req);
  if (!u) return null;
  const [p] = await sb('/rest/v1/profiles?id=eq.' + u.id + '&select=status');
  return p && p.status === 'active' ? u : null;
}
async function handleFetch(req) {
  if (req.method !== 'POST') return json(405, { error: 'POST only' });
  const user = await activeUser(req);
  if (!user) return json(401, { error: 'Login required' });
  let b = {}; try { b = await req.json(); } catch {}
  const url = String(b.url || '');
  if (!/^https?:\/\//i.test(url)) return json(400, { error: 'Only http(s) URLs are allowed' });
  const host = new URL(url).hostname;
  if (/^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.0\.0\.0|\[)/i.test(host)) return json(400, { error: 'This address is not allowed' });
  const method = String(b.method || 'GET').toUpperCase();
  const init = { method, headers: b.headers || {}, redirect: 'follow' };
  if (b.body && method !== 'GET' && method !== 'HEAD') init.body = unb64u(String(b.body).replace(/\+/g, '-').replace(/\//g, '_'));
  try {
    const r = await fetch(url, init);
    const buf = new Uint8Array(await r.arrayBuffer());
    if (buf.length > 8 * 1024 * 1024) return json(413, { error: 'Response too large' });
    const headers = {}; r.headers.forEach((v, k) => { headers[k] = v; });
    return json(200, { code: r.status, headers, body: b64(buf) });
  } catch (e) { return json(200, { code: 599, headers: {}, body: b64(te.encode('Fetch failed: ' + String(e.message || e))) }); }
}
async function handleMail(req) {
  if (req.method !== 'POST') return json(405, { error: 'POST only' });
  const user = await activeUser(req);
  if (!user) return json(401, { error: 'Login required' });
  let b = {}; try { b = await req.json(); } catch {}
  const list = String(b.to || '').split(/[,;]/).map((x) => x.trim()).filter(emailOk).slice(0, 10);
  if (!list.length) return json(400, { error: 'No valid recipient' });
  const m = await mailConfig();
  if (!m.enabled) return json(400, { error: 'Email (SMTP) is not set up yet (Admin Console > SMS & Email).' });
  const html = b.html || ('<pre style="font-family:Arial,sans-serif;white-space:pre-wrap">' + String(b.body || '').replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</pre>');
  for (const to of list) await sendMail({ ...m, fromName: b.name || m.fromName, to, subject: String(b.subject || 'SCS Management').slice(0, 200), html });
  return json(200, { ok: true, sent: list.length });
}

/* =====================================================================
 *  BACKUP -> GOOGLE DRIVE (v15)
 *  ডাটাবেস (scs_backup_tick / scs_backup_drive_now) cron_key দিয়ে ডাকে।
 *  ব্যাকআপ = এক লাইনে একটা রেকর্ড (NDJSON), gzip করা, ৮ MB করে টুকরো টুকরো Drive এ যায়
 *  (Apps Script receiver -> Google Drive resumable upload) — তাই ফাইল যত বড়ই হোক আটকায় না।
 *  ফরম্যাট assets/scs-backup.js এর মতোই (ব্রাউজার থেকে রিস্টোর করা যায়)।
 * ===================================================================== */
const BK_SECRET = /(pin|pass|secret|token|api_?key|apikey|hash|otp)/i;
const BK_PART = 8 * 1024 * 1024;   // ২৫৬ KB এর গুণিতক হতে হয় (Drive এর নিয়ম)
async function bkReceiver(cfg, payload) {
  const r = await fetch(cfg.scriptUrl, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ token: cfg.token, ...payload }), redirect: 'follow' });
  const t = await r.text();
  let j = null; try { j = JSON.parse(t); } catch { /* not json */ }
  if (!j) throw new Error('Google Apps Script did not answer correctly (' + r.status + '). Re-deploy the receiver with the NEW code from Admin Console > Backup. ' + t.slice(0, 160));
  if (!j.ok) throw new Error(j.error || 'Receiver error');
  return j;
}
/** একটা অ্যাপের সব রেকর্ড লাইন করে emit এ দেয় */
async function bkEmitApp(app, emit, counts) {
  const sheets = await sb('/rest/v1/gas_sheets?app_key=eq.' + enc(app) + '&select=name,idx&order=idx.asc,name.asc') || [];
  for (const s of sheets) {
    const [row] = await sb('/rest/v1/gas_sheets?app_key=eq.' + enc(app) + '&name=eq.' + enc(s.name) + '&select=name,idx,meta,chunks,data');
    if (!row) continue;
    const hs = row.chunks && row.chunks.length ? row.chunks : null;
    if (!hs) { await emit({ t: 'sheet', app, name: row.name, idx: row.idx, meta: row.meta || {}, part: 0, parts: 1, rows: row.data || [] }); }
    else {
      for (let i = 0; i < hs.length; i++) {
        const [c] = await sb('/rest/v1/gas_chunks?app_key=eq.' + enc(app) + '&name=eq.' + enc(row.name) + '&h=eq.' + enc(hs[i]) + '&select=data');
        await emit({ t: 'sheet', app, name: row.name, idx: row.idx, meta: row.meta || {}, part: i, parts: hs.length, rows: (c && c.data) || [] });
      }
    }
    counts.sheets++;
  }
  const props = (await sb('/rest/v1/gas_props?app_key=eq.' + enc(app) + '&scope=eq.script&select=key,value') || []).filter((p) => !BK_SECRET.test(p.key));
  await emit({ t: 'props', app, items: props }); counts.props += props.length;
  const files = await sb('/rest/v1/gas_files?app_key=eq.' + enc(app) + '&select=*&order=created_at.asc') || [];
  for (const f of files) {
    await emit({ t: 'file', app, row: f }); counts.files++;
    if (f.is_folder || !f.path) continue;
    const r = await fetch(URL_() + '/storage/v1/object/scs-files/' + f.path.split('/').map(enc).join('/'), { headers: { apikey: SERVICE(), Authorization: 'Bearer ' + SERVICE() } });
    if (!r.ok) { await emit({ t: 'blob', app, id: f.id, part: 0, parts: 1, missing: true }); continue; }
    const bytes = new Uint8Array(await r.arrayBuffer()), P = 3 * 1024 * 1024, n = Math.max(1, Math.ceil(bytes.length / P));
    for (let i = 0; i < n; i++) await emit({ t: 'blob', app, id: f.id, part: i, parts: n, b64: b64(bytes.subarray(i * P, (i + 1) * P)) });
  }
}
async function bkRun(scope, kind) {
  const [drvRow] = await sb('/rest/v1/sys_settings?key=eq.backup&select=value');
  const drv = (drvRow && drvRow.value) || {};
  if (!drv.scriptUrl || !drv.folderId) throw new Error('Google Drive is not connected (Admin Console > Backup).');
  const key = 'bk:' + scope;
  const [cfgRow] = await sb('/rest/v1/sys_settings?key=eq.' + enc(key) + '&select=value');
  const cfg = (cfgRow && cfgRow.value) || {};
  const sig = await sb('/rest/v1/rpc/scs_backup_sig', { method: 'POST', body: { p_scope: scope } });
  const apps = scope === '*' ? (await sb('/rest/v1/apps?select=key&order=sort_order.asc') || []).map((a) => a.key) : [scope];
  let appName = scope === '*' ? 'All apps' : scope;
  if (scope !== '*') { const [a] = await sb('/rest/v1/apps?key=eq.' + enc(scope) + '&select=name'); if (a && a.name) appName = a.name; }
  const stamp = new Date(Date.now() + 6 * 3600e3).toISOString().slice(0, 19).replace(/[:T]/g, '-');
  const prefix = 'SCS-' + (scope === '*' ? 'ALL' : scope) + '-';
  const name = prefix + stamp + '.scsbackup.gz';
  const sub = 'SCS Backup - ' + appName;
  const begin = await bkReceiver(drv, { op: 'begin', folderId: drv.folderId, sub, name, mime: 'application/gzip' });
  const sid = begin.sid;
  // gzip স্ট্রিম: লাইন লেখা হয় এক দিকে, অন্য দিকে ৮ MB হলেই Drive এ যায়
  const gz = new CompressionStream('gzip'), writer = gz.writable.getWriter(), reader = gz.readable.getReader();
  let pieces = [], have = 0, offset = 0, done = null;
  const take = (n) => {   // সামনের n বাইট (টুকরোগুলো একবারেই জোড়া)
    const all = pieces.length === 1 ? pieces[0] : cat(...pieces), out = all.subarray(0, n), rest = all.subarray(n);
    pieces = rest.length ? [rest] : []; have = rest.length; return out;
  };
  const send = async (last) => {
    while (have >= BK_PART) {
      const part = take(BK_PART);
      await bkReceiver(drv, { op: 'chunk', sid, offset, data: b64(part), last: false });
      offset += part.length;
    }
    if (last) {
      const part = take(have);
      done = await bkReceiver(drv, { op: 'chunk', sid, offset, data: b64(part), last: true });
      offset += part.length;
    }
  };
  const pump = (async () => {
    for (;;) {
      const { value, done: end } = await reader.read();
      if (end) break;
      pieces.push(value); have += value.length;
      if (have >= BK_PART) await send(false);
    }
    await send(true);
  })();
  let failed = null;
  pump.catch((e) => { failed = e; try { reader.cancel(e); } catch { /* */ } try { writer.abort(e); } catch { /* */ } });
  const counts = { sheets: 0, props: 0, files: 0, tables: 0, lines: 0 };
  const emit = async (o) => { if (failed) throw failed; counts.lines++; await writer.write(te.encode(JSON.stringify(o) + '\n')); if (failed) throw failed; };
  try {
    await emit({ format: 'scs-backup', v: 3, scope, apps, created_at: new Date().toISOString(), by: kind === 'auto' ? 'auto' : 'manual', note: 'Restore: open the app > Settings ⚙ > Backup · Restore · Reset > Restore.' });
    for (const a of apps) await bkEmitApp(a, emit, counts);
    if (scope === '*') {
      const tables = await sb('/rest/v1/rpc/scs_backup_tables', { method: 'POST', body: {} }) || [];
      for (const t of tables) {
        for (let off = 0, part = 0; off < Math.max(1, t.n); off += 2000, part++) {
          const rows = await sb('/rest/v1/rpc/scs_backup_table_page', { method: 'POST', body: { p_table: t.t, p_offset: off, p_limit: 2000 } }) || [];
          await emit({ t: 'table', name: t.t, part, rows });
          if (rows.length < 2000) break;
        }
        counts.tables++;
      }
    }
    await emit({ t: 'end', counts });
    await writer.close();
    await pump;
  } catch (e) { try { await writer.abort(e); } catch { /* */ } throw failed || e; }
  let removed = 0;
  const keep = Number(cfg.keep) || 0;
  if (keep > 0) { try { removed = (await bkReceiver(drv, { op: 'keep', folderId: drv.folderId, sub, prefix, keep })).removed || 0; } catch { /* পুরনো মোছা না গেলেও ব্যাকআপ ঠিক আছে */ } }
  await sb('/rest/v1/sys_backup_runs', { method: 'POST', prefer: 'return=minimal', body: { scope, kind: kind || 'auto', ok: true, file: name, size: offset } });
  await sb('/rest/v1/sys_settings?key=eq.' + enc(key), { method: 'PATCH', prefer: 'return=minimal', body: { value: { ...cfg, last_ok: new Date().toISOString(), last_sig: sig, last_file: name, last_size: offset, last_err: '', removed } } }).catch(() => {});
  return { ok: true, file: name, size: offset, drive: done && done.id, counts };
}
async function handleBackupDrive(req) {
  let body = {}; try { body = await req.json(); } catch { /* */ }
  const [k] = await sb('/rest/v1/sys_secrets?key=eq.cron_key&select=value');
  if (!body.cronKey || !k || !k.value || !sameStr(k.value, String(body.cronKey))) return json(401, { error: 'Bad key' });
  const scope = String(body.scope || '*'), kind = String(body.kind || 'auto');
  const job = bkRun(scope, kind).catch(async (e) => {
    const msg = String((e && e.message) || e).slice(0, 500);
    await sb('/rest/v1/sys_backup_runs', { method: 'POST', prefer: 'return=minimal', body: { scope, kind, ok: false, error: msg } }).catch(() => {});
    const [c] = await sb('/rest/v1/sys_settings?key=eq.' + enc('bk:' + scope) + '&select=value').catch(() => []);
    if (c) await sb('/rest/v1/sys_settings?key=eq.' + enc('bk:' + scope), { method: 'PATCH', prefer: 'return=minimal', body: { value: { ...c.value, last_err: msg, last_err_at: new Date().toISOString() } } }).catch(() => {});
  });
  // ডাটাবেস ১ সেকেন্ড অপেক্ষা করে — কাজ পেছনে চলতে থাকে
  const ER = globalThis['EdgeRuntime'];
  if (IS_DENO && ER && ER.waitUntil) { ER.waitUntil(job); return json(202, { ok: true, started: true }); }
  await job; return json(200, { ok: true });
}

/* =====================================================================
 *  ROUTER
 * ===================================================================== */
const ROUTES = { auth: handleAuth, 'password-reset': handleAuth, push: handlePush, sms: handleChemSms, 'send-sms': handleChemSms, fetch: handleFetch, mail: handleMail, backup_drive: handleBackupDrive };
export async function handle(req, fnName) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (!URL_() || !ANON() || !SERVICE()) return json(500, { error: 'Server keys are missing (SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY).' });
  const fn = fnName || new URL(req.url).searchParams.get('fn') || '';
  const h = ROUTES[fn];
  if (!h) return json(404, { error: 'Unknown function: ' + fn });
  try { return await h(req); }
  catch (e) { return json(500, { error: keyHelp(String((e && e.message) || e)) }); }
}

if (IS_DENO && Deno.serve) Deno.serve((req) => handle(req));
