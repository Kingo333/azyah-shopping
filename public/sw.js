// Bump this any time you change the SW so all devices get the update.
const CACHE_VERSION = 'v7';

// Hosts we NEVER intercept (let the browser hit the network directly).
const BYPASS_HOSTS = [
  'api.azyahstyle.com', // our Supabase custom domain
  'supabase.co',        // safeguard in case any old URLs remain
  'supabase.in'
];

self.addEventListener('install', (event) => {
  // Take over faster after the next navigation
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Start controlling existing pages immediately
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1) BYPASS: never intercept Supabase/API hosts
  if (BYPASS_HOSTS.some((h) => url.hostname.endsWith(h))) {
    return; // no event.respondWith → the request goes straight to network
  }

  // 2) Only cache same-origin GET assets (html/js/css/img). No cross-origin caching.
  const isGET = request.method === 'GET';
  const isSameOrigin = url.origin === self.location.origin;
  if (!isGET || !isSameOrigin) return;

  // 3) Network-first for navigations (HTML)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open('html-' + CACHE_VERSION).then((c) => c.put(request, copy));
          return res;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // 4) Cache-first for static assets (JS/CSS/img)
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((res) => {
        const copy = res.clone();
        caches.open('static-' + CACHE_VERSION).then((c) => c.put(request, copy));
        return res;
      });
    })
  );
});