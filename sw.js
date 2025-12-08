const CACHE_NAME = 'deutsch-lernen-v3';
const ASSETS = [
    './',
    './index.html',
    './assets/css/style.css',
    './assets/js/app.js',
    './manifest.json',
    './data/topics.json'
];

self.addEventListener('install', (e) => {
    e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then(keys => Promise.all(
            keys.map(key => {
                if(key !== CACHE_NAME) return caches.delete(key);
            })
        ))
    );
});

self.addEventListener('fetch', (e) => {
    e.respondWith(
        caches.match(e.request).then(cached => {
            return cached || fetch(e.request).then(response => {
                // Кешируем динамически (например, JSON файлы тем)
                if (e.request.url.startsWith('http') && e.request.method === 'GET') {
                    return caches.open(CACHE_NAME).then(cache => {
                        cache.put(e.request, response.clone());
                        return response;
                    });
                }
                return response;
            });
        })
    );
});
