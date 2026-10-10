// オフラインでも つかえるように
const CACHE = 'tsutaete-6839dd1b0d';
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(['./', 'index.html'])).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('tsutaete-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => { const r = e.request; if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return; e.respondWith(fetch(r).then(res => { const c = res.clone(); caches.open(CACHE).then(k => k.put(r, c)); return res; }).catch(() => caches.match(r, { ignoreSearch: true }).then(x => x || caches.match('index.html')))); });
