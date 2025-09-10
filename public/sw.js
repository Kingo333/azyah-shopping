// Bump this any time you change the SW so all devices get the update.
const CACHE_VERSION = 'v10';
const IMAGE_CACHE_NAME = `img-${CACHE_VERSION}`;
const MAX_IMAGE_CACHE_SIZE = 100; // Max 100 image files
const MAX_IMAGE_CACHE_BYTES = 80 * 1024 * 1024; // 80MB

// Hosts we NEVER intercept (let the browser hit the network directly).
const BYPASS_HOSTS = [
  'api.azyahstyle.com', // our Supabase custom domain
];

self.addEventListener('install', (event) => {
  // Take over faster after the next navigation
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Start controlling existing pages immediately and clean old caches
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      // Clean up old caches
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(name => name.startsWith('img-') && name !== IMAGE_CACHE_NAME)
            .map(name => caches.delete(name))
        );
      })
    ])
  );
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

  // 4) Special handling for images: stale-while-revalidate
  const isImage = request.destination === 'image' || 
                  /\.(jpg|jpeg|png|gif|webp|avif|svg)(\?.*)?$/i.test(url.pathname);
  
  if (isImage) {
    event.respondWith(
      caches.open(IMAGE_CACHE_NAME).then(cache => {
        return cache.match(request).then(cached => {
          // Serve cached version immediately
          const fetchPromise = fetch(request).then(response => {
            if (response.ok) {
              // Update cache in background (stale-while-revalidate)
              manageImageCache(cache, request, response.clone());
            }
            return response;
          }).catch(() => cached); // Fallback to cache on network error
          
          return cached || fetchPromise;
        });
      })
    );
    return;
  }

  // 5) Cache-first for other static assets (JS/CSS)
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

// Manage image cache size and update entries
async function manageImageCache(cache, request, response) {
  try {
    // Check cache size before adding
    const keys = await cache.keys();
    
    // If cache is at limit, remove oldest entries
    if (keys.length >= MAX_IMAGE_CACHE_SIZE) {
      // Remove oldest 25% to avoid frequent evictions
      const toRemove = Math.floor(keys.length * 0.25);
      for (let i = 0; i < toRemove; i++) {
        await cache.delete(keys[i]);
      }
    }
    
    // Add new/updated image to cache
    await cache.put(request, response);
  } catch (error) {
    console.warn('Image cache management failed:', error);
  }
}