/* SCS Management service worker — push notifications
 * Netlify (সাইটের মূল ঠিকানা) বা GitHub Pages (সাব-ফোল্ডার) — দুই জায়গাতেই চলে:
 * সব লিংক এই service worker-এর scope (সাইটের শুরুর ঠিকানা) থেকে হিসাব হয়। */
var BASE = self.registration ? self.registration.scope : self.location.href.replace(/sw\.js.*$/, '');
function abs(u) {
  u = u || '';
  if (/^https?:/i.test(u)) return u;
  return new URL(u.replace(/^\//, ''), BASE).href;
}
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });

self.addEventListener('push', function (e) {
  var d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { d = { title: 'SCS Management', body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'SCS Management', {
    body: d.body || '',
    icon: abs('assets/icon-192.png'),
    badge: abs('assets/icon-192.png'),
    tag: d.tag || undefined,
    renotify: !!d.tag,
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
