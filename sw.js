// Nyelvi sziget V9 – service worker (offline működés)
// V10-1: frissítés a könyvtár, ismétlések és nehéz mondatok módosításaihoz.
const CACHE = 'nyelvisziget-v10-1';
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
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
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
    if (r.ok && (url.origin === location.origin || url.hostname === 'cdn.jsdelivr.net')) {
      (await caches.open(CACHE)).put(req, r.clone());
    }
    return r;
  })());
});
