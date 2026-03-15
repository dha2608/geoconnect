const CACHE_VERSION = 3;
const SHELL_CACHE  = `geoconnect-shell-v${CACHE_VERSION}`;
const STATIC_CACHE = `geoconnect-static-v${CACHE_VERSION}`;
const ALL_CACHES   = [SHELL_CACHE, STATIC_CACHE];

// App shell URLs to precache on install
const PRECACHE_URLS = ['/', '/index.html', '/offline.html'];

// Match static assets by file extension (JS, CSS, fonts, images)
function isStaticAsset(url) {
  return /\.(js|css|woff2?|ttf|eot|png|jpe?g|gif|svg|ico|webp|avif)(\?.*)?$/.test(url);
}

// ── Install: precache the app shell + offline page ───────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(PRECACHE_URLS)),
  );
  self.skipWaiting();
});

// ── Activate: prune stale caches + notify clients of update ──────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => !ALL_CACHES.includes(k)).map((k) => caches.delete(k)),
      ),
    ).then(() => {
      // Notify all clients that SW was updated
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => client.postMessage({ type: 'SW_UPDATED' }));
      });
    }),
  );
  self.clients.claim();
});

// ── Fetch: cache-first for static, network-first for navigation ──────────────
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
        if (cached) return cached;

        const response = await fetch(event.request);
        if (response.ok) cache.put(event.request, response.clone());
        return response;
      }),
    );
  } else if (event.request.mode === 'navigate') {
    // ── Navigation requests: network-first with offline fallback ───────────
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() =>
          caches.match(event.request).then((cached) => cached || caches.match('/offline.html')),
        ),
    );
  } else {
    // ── Other non-navigation requests: network-first ───────────────────────
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request).then((r) => r || new Response('Offline', { status: 503 }))),
    );
  }
});
