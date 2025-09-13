const CACHE_NAME = 'wasm-nextjs-cache-v1';
const PRECACHE_URLS = [
  '/',
  '/models/vangogh.onnx',
  '/models/picasso.onnx',
  '/models/georgesseurat.onnx',
  '/models/cyberpunk.onnx',
  '/file.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
});

// Stale-while-revalidate for same-origin requests, cache-first for models and wasm
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;

  // Only handle same-origin HTTP(S) requests. Ignore browser-extension and other schemes.
  const isHttp = url.protocol === 'http:' || url.protocol === 'https:';
  const isSameOrigin = url.origin === self.location.origin;
  if (!isHttp || !isSameOrigin) return;

  // Cache-first for models, wasm and static assets
  const isCacheFirst =
    url.pathname.startsWith('/models/') ||
    url.pathname.endsWith('.wasm') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.startsWith('/_next/static/');

  if (isCacheFirst) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        // Only cache successful (200) same-origin responses
        if (response && response.ok) {
          cache.put(request, response.clone());
        }
        return response;
      })
    );
    return;
  }

  // Default: network falling back to cache
  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        if (response && response.ok) {
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});


