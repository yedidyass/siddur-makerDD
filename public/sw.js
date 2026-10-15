const CACHE = 'siddur-kavanat-halev-v1';
const range = (start, end) => Array.from({length: end - start + 1}, (_, i) => start + i);
// Keep in step with sourcePages in block-catalog.js and APPROVED in tools/export_pages.py.
const PAGES = [...range(29, 42), ...range(69, 250)].map(page => `/pages/page-${String(page).padStart(3, '0')}.png`);
const SHELL = ['/', '/index.html', '/styles.css?v=40', '/vendor/page-flip.module.js?v=40', '/app.js?v=40', '/book-reader.js?v=40', '/calendar.js', '/prayer-blocks.js', '/block-engine.js', '/block-catalog.js', '/prayer-recipes.js', '/manifest.webmanifest', '/icons/icon-32.png', '/icons/icon-180.png', '/icons/icon-192.png', '/icons/icon-512.png'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(async cache => {
    await cache.addAll(SHELL);
    await Promise.all(PAGES.map(async url => { try { await cache.add(url); } catch { /* retry on demand */ } }));
  }).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== location.origin) return;
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => { if (response.ok) caches.open(CACHE).then(cache => cache.put(event.request, response.clone())); return response; }).catch(() => event.request.mode === 'navigate' ? caches.match('/index.html') : Response.error())));
});


