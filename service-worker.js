/* service-worker.js — zorgt dat de app ook zonder internet werkt.
   Pas je later bestanden aan? Verhoog dan het versienummer hieronder
   (bijv. 'hyrox-v2'), dan haalt de iPhone alles opnieuw op. */
const CACHE = 'hyrox-v1';
const BESTANDEN = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './schema.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];
const CHART_JS = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js';

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(BESTANDEN);
    // De grafiek-library apart: mislukt dit, dan werkt de rest toch.
    try { await cache.add(new Request(CHART_JS, { mode: 'cors' })); } catch (e) { /* later opnieuw */ }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const namen = await caches.keys();
    await Promise.all(namen.filter(n => n !== CACHE).map(n => caches.delete(n)));
    await self.clients.claim();
  })());
});

// Eerst uit de cache (snel en offline), op de achtergrond verversen.
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const opgeslagen = await cache.match(req, { ignoreSearch: true });
    const netwerk = fetch(req).then(res => {
      if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
      return res;
    }).catch(() => null);
    if (opgeslagen) {
      event.waitUntil(netwerk);
      return opgeslagen;
    }
    const res = await netwerk;
    if (res) return res;
    if (req.mode === 'navigate') {
      const index = await cache.match('./index.html');
      if (index) return index;
    }
    return new Response('Offline', { status: 503, statusText: 'Offline' });
  })());
});
