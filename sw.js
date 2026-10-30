// Fa funzionare l'app anche senza internet. Non tocca mai i dati salvati.
const C = 'finanze-v3';
const FILES = ['./', 'index.html', 'manifest.webmanifest', 'icon-180.png', 'icon-192.png', 'icon-512.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(C).then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' })))));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== C).map(x => caches.delete(x)))));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const u = new URL(e.request.url);
  if (u.origin !== location.origin || u.pathname.endsWith('/api/data')) return;
  // La pagina: prima prova la versione nuova da internet (così gli aggiornamenti arrivano subito), se non c'è rete usa la copia
  if (e.request.mode === 'navigate') {
    e.respondWith(caches.open(C).then(async c => {
      try {
        const r = await Promise.race([fetch(e.request, { cache: 'no-cache' }), new Promise((_, no) => setTimeout(no, 3000))]);
        if (r.ok) c.put('./', r.clone());
        return r;
      } catch (x) {
        return (await c.match('./')) || (await c.match('index.html')) || Response.error();
      }
    }));
    return;
  }
  e.respondWith(caches.open(C).then(async c => {
    const hit = await c.match(e.request, { ignoreSearch: true });
    const net = fetch(e.request).then(r => { if (r.ok) c.put(e.request, r.clone()); return r; }).catch(() => hit);
    return hit || net;
  }));
});
