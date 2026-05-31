// Service Worker for RecipeBook PWA
// Version 2 - Enhanced for iOS/Safari compatibility
const CACHE_NAME = 'recipebook-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/_next/static/css/*.css',
  '/_next/static/chunks/*.js',
  '/_next/static/*.js',
  '/_next/data/*.json',
  '/icons/*.png',
  '/icons/apple-touch-icon.png',
  '/icons/apple-touch-icon-167x167.png',
  '/manifest.json'
];

// iOS specific: Ensure service worker updates are handled properly
const IOS_CACHE_NAME = 'recipebook-ios-v2';

// Install event - cache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        // For iOS, we need to be more careful about caching
        return cache.addAll(ASSETS_TO_CACHE.filter(url => 
          // iOS has issues with opaque responses, so we skip certain patterns
          !url.includes('*') && 
          (url === '/' || url.includes('.json') || url.includes('.png'))
        ));
      })
      .then(() => {
        // Force the waiting service worker to become active
        self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== IOS_CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => {
      // iOS specific: Claim clients immediately
      self.clients.claim();
    })
  );
});

// Fetch event - serve cached assets when offline
self.addEventListener('fetch', (event) => {
  // iOS specific: Handle navigation requests differently
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          return response || fetch(event.request);
        })
    );
    return;
  }

  // For API requests and other assets
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // iOS specific: Clone the response for cache
        if (response) {
          return response;
        }
        return fetch(event.request)
          .then((fetchResponse) => {
            // iOS specific: Only cache successful responses
            if (fetchResponse.status === 200 && 
                (event.request.url.includes('.js') || 
                 event.request.url.includes('.css') || 
                 event.request.url.includes('.png') ||
                 event.request.url.includes('.json'))) {
              const responseClone = fetchResponse.clone();
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseClone);
                });
            }
            return fetchResponse;
          })
          .catch(() => {
            // iOS specific: Return a fallback for failed requests
            return caches.match('/');
          });
      })
  );
});

// iOS specific: Handle the beforeinstallprompt event
// This is a workaround for iOS PWA installation issues
self.addEventListener('beforeinstallprompt', (event) => {
  // Prevent the mini-infobar from appearing on iOS
  event.preventDefault();
  // Store the event for later use
  self.deferredPrompt = event;
});

// Message event - handle messages from the client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  // iOS specific: Handle cache cleanup messages
  if (event.data && event.data.type === 'CLEANUP_CACHE') {
    caches.keys().then((cacheNames) => {
      cacheNames.forEach((cacheName) => {
        if (cacheName !== CACHE_NAME && cacheName !== IOS_CACHE_NAME) {
          caches.delete(cacheName);
        }
      });
    });
  }
  
  // iOS specific: Handle app update messages
  if (event.data && event.data.type === 'UPDATE_SW') {
    self.skipWaiting();
    self.clients.claim();
  }
});

// iOS specific: Handle push notifications (if enabled in future)
self.addEventListener('push', (event) => {
  // Placeholder for push notifications
  const data = event.data?.json();
  if (data) {
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/icon-192x192.png',
      data: data.data
    });
  }
});

// iOS specific: Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.notification.data && event.notification.data.url) {
    self.clients.openWindow(event.notification.data.url);
  }
});

// iOS specific: Ensure the service worker stays alive
// This helps with background sync on iOS
setInterval(() => {
  // Keep the service worker alive
}, 1000 * 60 * 20); // Every 20 minutes
