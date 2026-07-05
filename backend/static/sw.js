// Météo Express Pro - Service Worker
// Provides offline support for the app shell and graceful degradation for weather data.

const CACHE_NAME = 'meteo-express-pro-v1';
const CORE_ASSETS = [
  '/',
  '/static/manifest.json',
  '/static/fonts/google-fonts.css',
  '/static/vendor/leaflet/leaflet.css',
  '/static/vendor/leaflet/leaflet.js'
];

// Install: cache the app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CORE_ASSETS.filter(Boolean)).catch(() => {});
    })
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch strategy:
// - Static / same-origin navigation & assets: Cache First (with network fallback)
// - Dynamic weather data (our own routes that return JSON or HTML): Network First, fallback to cache
// - External tile proxy and APIs: try network, but we rely on app-level localStorage for last weather
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET
  if (event.request.method !== 'GET') return;

  // App shell + static + fonts/CDNs we listed
  if (
    url.origin === self.location.origin
  ) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        return cached || fetch(event.request).then((res) => {
          // Optionally cache new same-origin responses
          if (res.ok && url.origin === self.location.origin) {
            const resClone = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(event.request, resClone));
          }
          return res;
        }).catch(() => caches.match('/')); // last resort -> home
      })
    );
    return;
  }

  // For everything else (map tiles via our proxy, etc.): network first, short cache
  event.respondWith(
    fetch(event.request).then((res) => {
      if (res.ok && url.pathname.startsWith('/map-tiles/')) {
        const clone = res.clone();
        caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
      }
      return res;
    }).catch(() => {
      return caches.match(event.request);
    })
  );
});

// Optional: allow the page to tell SW to precache a specific weather payload (future enhancement)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CACHE_WEATHER') {
    // We mostly rely on localStorage + URL state in the app itself for "last city"
    // This hook is here for future expansion (e.g. storing full HTML snapshot)
  }
});
