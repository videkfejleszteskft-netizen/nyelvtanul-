// Sayback Island – angol – service worker
// Angol V7: az A2 mindkét mappája kész.
const CACHE = 'angolsziget-v32-1';
const SUPABASE_JS = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await c.addAll(SHELL);
    try { await c.add(new Request(SUPABASE_JS, { mode: 'cors' })); } catch (err) { /* később, első használatkor kerül be */ }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE && k.startsWith('angolsziget-')) await caches.delete(k); // az olasz gyakorló tárát nem bántja
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname.endsWith('supabase.co')) return; // felhő: mindig hálózat
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      try {
        const r = await fetch(req, { cache: 'no-store' });
        if (r && r.ok) (await caches.open(CACHE)).put('index.html', r.clone());
        return r;
      } catch {
        return (await caches.match('index.html')) || (await caches.match('./'));
      }
    })());
    return;
  }
  e.respondWith((async () => {
    const hit = await caches.match(req);
    if (hit) return hit;
    const r = await fetch(req);
    if (r.ok && (url.origin === location.origin || url.hostname === 'cdn.jsdelivr.net' || url.hostname === 'cdnjs.cloudflare.com' || url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com')) {
      (await caches.open(CACHE)).put(req, r.clone());
    }
    return r;
  })());
});

// ---------- Napi emlékeztető (Web Push) ----------
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { title: 'Sayback Island', body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'Sayback Island', {
    body: d.body || '', icon: 'icon-192.png', badge: 'icon-192.png', tag: d.tag || 'sayback', renotify: true,
    data: { url: d.url || './?go=today' },
  }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const scope = self.registration.scope, url = new URL((e.notification.data && e.notification.data.url) || './?go=today', scope).href;
  const mine = u => u.startsWith(scope) && (scope.includes('/angol/') || !u.includes('/angol/'));
  e.waitUntil((async () => {
    const all = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) if (mine(c.url) && 'focus' in c) { await c.focus(); try { c.postMessage({ type: 'go-today' }); } catch {} return; }
    await clients.openWindow(url);
  })());
});
