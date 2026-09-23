/* Service Worker - Timbiriche
 * Sube VERSION cada vez que publiques cambios en los archivos del juego. */
const VERSION = 'v2';
const CACHE_STATIC = `timbiriche-static-${VERSION}`;
const CACHE_RUNTIME = `timbiriche-runtime-${VERSION}`;

const PRECACHE = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/app.js',
  './img/cara-moneda.png',
  './img/sello-moneda.png',
  './img/pwa-icon-192.png',
  './img/pwa-icon-512.png'
];

// --- INSTALL: precarga tolerante (si un archivo falta, no se rompe la instalación) ---
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_STATIC);
    const results = await Promise.allSettled(
      PRECACHE.map((url) => cache.add(new Request(url, { cache: 'reload' })))
    );
    results.forEach((r, i) => {
      if (r.status === 'rejected') console.warn('[SW] No se pudo precargar:', PRECACHE[i]);
    });
    await self.skipWaiting();
  })());
});

// --- ACTIVATE: limpia cachés de versiones anteriores ---
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keep = [CACHE_STATIC, CACHE_RUNTIME];
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => !keep.includes(k)).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

// --- Utilidades ---
const isFontHost = (url) =>
  url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';

const isCacheable = (res) => res && (res.ok || res.type === 'opaque');

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then((v) => { clearTimeout(t); resolve(v); },
                 (e) => { clearTimeout(t); reject(e); });
  });
}

// Red primero (contenido siempre fresco); si falla o tarda, usa caché.
async function networkFirst(req, cacheName, isNavigation) {
  const cache = await caches.open(cacheName);
  try {
    const res = await withTimeout(fetch(req), 4000);
    if (isCacheable(res)) cache.put(req, res.clone());
    return res;
  } catch (err) {
    const cached = await cache.match(req, { ignoreSearch: true });
    if (cached) return cached;
    if (isNavigation) {
      const shell = await caches.match('./index.html');
      if (shell) return shell;
    }
    return Response.error();
  }
}

// Caché primero (imágenes y otros recursos que casi no cambian).
async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  if (cached) return cached;
  const res = await fetch(req);
  if (isCacheable(res)) cache.put(req, res.clone());
  return res;
}

// Sirve caché al instante y actualiza en segundo plano (fuentes de Google).
async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  const network = fetch(req)
    .then((res) => { if (isCacheable(res)) cache.put(req, res.clone()); return res; })
    .catch(() => null);
  return cached || (await network) || Response.error();
}

// --- FETCH ---
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  if (!sameOrigin && !isFontHost(url)) return;

  if (req.mode === 'navigate') {
    event.respondWith(networkFirst(req, CACHE_STATIC, true));
  } else if (isFontHost(url)) {
    event.respondWith(staleWhileRevalidate(req, CACHE_RUNTIME));
  } else if (/\.(?:html|css|js|json)$/i.test(url.pathname)) {
    event.respondWith(networkFirst(req, CACHE_STATIC, false));
  } else {
    event.respondWith(cacheFirst(req, CACHE_STATIC));
  }
});
