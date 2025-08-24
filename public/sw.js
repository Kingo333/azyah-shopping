const CACHE_NAME = 'azyah-v2';
const OFFLINE_CACHE = 'azyah-offline-v2';

// Static assets to cache
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/marketing/azyah-logo.png'
];

// API endpoints to cache
const API_CACHE_PATTERNS = [
  /\/api\/products/,
  /\/api\/categories/,
  /\/api\/brands/
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== OFFLINE_CACHE) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - handle requests with cache strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle navigation requests
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .catch(() => {
          return caches.match('/') || caches.match('/index.html');
        })
    );
    return;
  }

  // Handle API requests with network-first strategy
  if (API_CACHE_PATTERNS.some(pattern => pattern.test(url.pathname))) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(request, responseClone);
              });
          }
          return response;
        })
        .catch(() => {
          return caches.match(request);
        })
    );
    return;
  }

  // Handle image requests with cache-first strategy
  if (request.destination === 'image') {
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return fetch(request)
            .then((response) => {
              if (response.ok) {
                const responseClone = response.clone();
                caches.open(CACHE_NAME)
                  .then((cache) => {
                    cache.put(request, responseClone);
                  });
              }
              return response;
            });
        })
    );
    return;
  }

  // Handle other requests with cache-first strategy
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        return cachedResponse || fetch(request);
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