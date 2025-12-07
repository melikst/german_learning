const CACHE_NAME = 'german-learning-v1';
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
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(ASSETS))
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
