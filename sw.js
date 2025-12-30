const CACHE_NAME = 'ninja-path-finder-v3';
const ASSETS = [
    './',
    './index.html',
    './index.css',
    './manifest.json',
    './icon-192.png',
    './translations.js'
];

// Force the waiting service worker to become active immediately
self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(ASSETS))
            .then(() => self.skipWaiting()) // Skip waiting, activate immediately
    );
});

// Clean up old caches and take control of all clients
self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim()) // Take control of all clients immediately
    );
});

// Network-first strategy for HTML, cache-first for other assets
self.addEventListener('fetch', (e) => {
    const url = new URL(e.request.url);

    // Skip API requests - don't cache them
    if (url.pathname.startsWith('/api/')) {
        return;
    }

    // For navigation requests (HTML), try network first
    if (e.request.mode === 'navigate') {
        e.respondWith(
            fetch(e.request)
                .then((response) => {
                    // Clone and cache the fresh response
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(e.request, responseClone);
                    });
                    return response;
                })
                .catch(() => caches.match(e.request))
        );
        return;
    }

    // For other requests, cache-first
    e.respondWith(
        caches.match(e.request).then((response) => response || fetch(e.request))
    );
});
