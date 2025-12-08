const CACHE_NAME = 'german-learning-v2';
const ASSETS = [
    './',
    './index.html',
    './assets/css/style.css',
    './assets/js/app.js',
    './data/topics.json',
    './data/basics.json',
    './data/food.json'
];

self.addEventListener('install', (event) => {
    self.skipWaiting(); // Force new SW to activate immediately
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(ASSETS))
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        Promise.all([
            self.clients.claim(), // Take control of all clients immediately
            caches.keys().then((keys) => {
                return Promise.all(
                    keys.map((key) => {
                        if (key !== CACHE_NAME) {
                            return caches.delete(key);
                        }
                    })
                );
            })
        ])
    );
});

self.addEventListener('fetch', (event) => {
    // Network First strategy for data files and admin
    if (event.request.url.includes('/data/') || event.request.url.includes('admin')) {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    // Update cache with new version
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                    return response;
                })
                .catch(() => {
                    // Fallback to cache if offline
                    return caches.match(event.request);
                })
        );
    } else {
        // Cache First for other assets (images, css, js)
        event.respondWith(
            caches.match(event.request)
                .then((response) => {
                    if (response) return response;
                    return fetch(event.request).then((response) => {
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseToCache);
                        });
                        return response;
                    });
                })
        );
    }
});
