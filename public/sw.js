// ⬆⬆⬆ INCREMENT THIS ON EVERY SW CHANGE
const CACHE_VERSION = 'v6';
const CACHE_NAME = 'azyah-' + CACHE_VERSION;
const OFFLINE_CACHE = 'azyah-offline-' + CACHE_VERSION;

// Hosts to never intercept (bypass caching & respondWith)
const SUPABASE_HOSTS = [
  'api.azyahstyle.com', // our custom domain
  'supabase.co',        // safety, in case any URL still uses the default
  'supabase.in'
];

// Static assets to cache
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/marketing/azyah-logo.png'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  // Make the new SW take control ASAP on next load
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  // Claim clients so the new SW is active immediately
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== OFFLINE_CACHE) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
    ])
  );
});

// Fetch event - handle requests with cache strategies
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1) BYPASS Supabase (and any other API hosts we listed)
  if (SUPABASE_HOSTS.some(h => url.hostname.endsWith(h))) {
    return; // Do NOT call event.respondWith – let the network handle it
  }

  // 2) Only cache GET requests for our own origin (HTML/CSS/JS/images)
  const isGET = event.request.method === 'GET';
  const isSameOrigin = url.origin === self.location.origin;

  if (!isGET || !isSameOrigin) {
    return; // don't cache cross-origin or non-GET
  }

  // 3) Network-first for HTML; cache-first for static assets (simple example)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).then((res) => {
        const resClone = res.clone();
        caches.open('html-' + CACHE_VERSION).then(cache => cache.put(event.request, resClone));
        return res;
      }).catch(() => caches.match(event.request))
    );
    return;
  }

  // Static assets (css/js/img) cache-first
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((res) => {
        const resClone = res.clone();
        caches.open('static-' + CACHE_VERSION).then(cache => cache.put(event.request, resClone));
        return res;
      });
    })
  );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag);
  
  if (event.tag === 'sync-swipes') {
    event.waitUntil(syncSwipes());
  }
  
  if (event.tag === 'sync-wishlist') {
    event.waitUntil(syncWishlistChanges());
  }
});

// Push notification handler
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);
  
  const options = {
    body: event.data ? event.data.text() : 'New fashion items available!',
    icon: '/marketing/azyah-logo.png',
    badge: '/marketing/azyah-logo.png',
    vibrate: [200, 100, 200],
    data: {
      url: '/'
    },
    actions: [
      {
        action: 'view',
        title: 'View Now',
        icon: '/marketing/azyah-logo.png'
      },
      {
        action: 'close',
        title: 'Dismiss'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Azyah', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  event.notification.close();
  
  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow(event.notification.data.url || '/')
    );
  }
});

// Helper functions for background sync
async function syncSwipes() {
  try {
    const offlineSwipes = await getOfflineData('swipes');
    for (const swipe of offlineSwipes) {
      await fetch('/api/swipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(swipe)
      });
    }
    await clearOfflineData('swipes');
    console.log('Swipes synced successfully');
  } catch (error) {
    console.error('Failed to sync swipes:', error);
  }
}

async function syncWishlistChanges() {
  try {
    const offlineWishlistChanges = await getOfflineData('wishlist');
    for (const change of offlineWishlistChanges) {
      await fetch('/api/wishlist', {
        method: change.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(change.data)
      });
    }
    await clearOfflineData('wishlist');
    console.log('Wishlist changes synced successfully');
  } catch (error) {
    console.error('Failed to sync wishlist changes:', error);
  }
}

async function getOfflineData(key) {
  const cache = await caches.open(OFFLINE_CACHE);
  const response = await cache.match(`/offline-data/${key}`);
  return response ? await response.json() : [];
}

async function clearOfflineData(key) {
  const cache = await caches.open(OFFLINE_CACHE);
  await cache.delete(`/offline-data/${key}`);
}

// Message handler for communication with main thread
self.addEventListener('message', (event) => {
  console.log('Service Worker received message:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'STORE_OFFLINE_DATA') {
    storeOfflineData(event.data.key, event.data.data);
  }
});

async function storeOfflineData(key, data) {
  const cache = await caches.open(OFFLINE_CACHE);
  const response = new Response(JSON.stringify(data));
  await cache.put(`/offline-data/${key}`, response);
}