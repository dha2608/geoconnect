const SHELL_CACHE  = 'geoconnect-shell-v2';
const STATIC_CACHE = 'geoconnect-static-v2';
const ALL_CACHES   = [SHELL_CACHE, STATIC_CACHE];

// App shell URLs to precache on install
const PRECACHE_URLS = ['/', '/index.html'];

// Match static assets by file extension (JS, CSS, fonts, images)
function isStaticAsset(url) {
  return /\.(js|css|woff2?|ttf|eot|png|jpe?g|gif|svg|ico|webp|avif)(\?.*)?$/.test(url);
}

// ── Install: precache the app shell ──────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(PRECACHE_URLS)),
  );
  self.skipWaiting();
});

// ── Activate: prune stale caches ─────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => !ALL_CACHES.includes(k)).map((k) => caches.delete(k)),
      ),
    ),
  );
  self.clients.claim();
});

// ── Fetch: cache-first for static assets, network-first for everything else ──
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  const { url } = event.request;

  // Skip API and WebSocket traffic — always go to the network
  if (url.includes('/api/') || url.includes('/socket.io/')) return;

  if (isStaticAsset(url)) {
    // ── Cache-first for JS / CSS / fonts / images ──────────────────────────
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(event.request);
        if (cached) return cached;                          // serve from cache

        const response = await fetch(event.request);
        if (response.ok) cache.put(event.request, response.clone()); // store for next time
        return response;
      }),
    );
  } else {
    // ── Network-first for HTML / navigation / manifests ────────────────────
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request)), // offline fallback
    );
  }
});
