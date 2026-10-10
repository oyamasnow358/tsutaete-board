# つかいかた： つたえてボード フォルダで  python _src/build.py
import io, hashlib
R = lambda p: io.open(p, encoding='utf-8').read()
s = R('_src/src.html')
for key, f in [('JASAY', 'jasay.js'), ('VOCAB', 'vocab.js'), ('COMPOSE', 'compose.js'), ('APP', 'app.js')]:
    s = s.replace('/*__%s__*/' % key, R('_src/' + f).rstrip() + '\n')
io.open('index.html', 'w', encoding='utf-8', newline='\n').write(s)
v = hashlib.sha1(s.encode('utf-8')).hexdigest()[:10]
io.open('sw.js', 'w', encoding='utf-8', newline='\n').write("""// オフラインでも つかえるように
const CACHE = 'tsutaete-%s';
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(['./', 'index.html'])).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('tsutaete-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => { const r = e.request; if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return; e.respondWith(fetch(r).then(res => { const c = res.clone(); caches.open(CACHE).then(k => k.put(r, c)); return res; }).catch(() => caches.match(r, { ignoreSearch: true }).then(x => x || caches.match('index.html')))); });
""" % v)
print('built', len(s), 'sw', v)
