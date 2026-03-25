const CACHE_NAME = 'halos-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Pass-through fetch for now, needed for PWA installability
  event.respondWith(fetch(event.request));
});
