/* SCS Management service worker — পুশ নোটিফিকেশন + দ্রুত লোড (ক্যাশ)
 * Netlify (সাইটের মূল ঠিকানা) বা GitHub Pages (সাব-ফোল্ডার) — দুই জায়গাতেই চলে:
 * সব লিংক এই service worker-এর scope (সাইটের শুরুর ঠিকানা) থেকে হিসাব হয়। */
var BASE = self.registration ? self.registration.scope : self.location.href.replace(/sw\.js.*$/, '');
var CACHE = 'scs-static-v1';
function abs(u) {
  u = u || '';
  if (/^https?:/i.test(u)) return u;
  return new URL(u.replace(/^\//, ''), BASE).href;
}
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return /^scs-static-/.test(k) && k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

/* দ্রুত লোড: ভার্সন নম্বরসহ ফাইল (?v=…) আর ফন্ট/লাইব্রেরি একবার নামলে ক্যাশ থেকে আসে।
 * পেজ (HTML), ডাটাবেস আর সার্ভারের ডাক সবসময় নেট থেকে — তাই কখনো পুরনো ডাটা দেখায় না। */
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var u = new URL(req.url);
  var versioned = u.origin === self.location.origin && /[?&]v=\d{8,}/.test(u.search);
  var cdn = /^(cdn\.jsdelivr\.net|fonts\.gstatic\.com|fonts\.googleapis\.com|cdnjs\.cloudflare\.com|unpkg\.com)$/.test(u.hostname);
  if (!versioned && !cdn) return;
  e.respondWith(caches.open(CACHE).then(function (c) {
    return c.match(req).then(function (hit) {
      if (hit) return hit;
      return fetch(req).then(function (res) {
        if (res && (res.ok || res.type === 'opaque')) c.put(req, res.clone());
        return res;
      });
    });
  }));
});

self.addEventListener('push', function (e) {
  var d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { d = { title: 'SCS Management', body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'SCS Management', {
    body: d.body || '',
    icon: abs('assets/icon-192.png'),
    badge: abs('assets/icon-192.png'),
    tag: d.tag || undefined,
    renotify: !!d.tag,
    vibrate: [200, 100, 200],
    timestamp: Date.now(),
    data: { url: d.url || '/' }
  }));
});

self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  var url = abs((e.notification.data && e.notification.data.url) || '/');
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
    for (var i = 0; i < list.length; i++) {
      if (list[i].url.split('#')[0] === url && 'focus' in list[i]) return list[i].focus();
    }
    return self.clients.openWindow(url);
  }));
});
