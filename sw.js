const CACHE_NAME = 'german-learning-v2';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './assets/css/style.css',
    './assets/js/app.js',
    './data/topics.json',
    './manifest.json'
    // Ми не кешуємо всі JSON файли одразу, вони додадуться динамічно при відкритті
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(ASSETS_TO_CACHE))
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        return caches.delete(key);
                    }
                })
            );
        })
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                return response || fetch(event.request).then((fetchResponse) => {
                    // Кешуємо нові запити (наприклад, файли тем data/food.json)
                    return caches.open(CACHE_NAME).then((cache) => {
                        // Перевіряємо, чи валідний запит (тільки http/https)
                        if (event.request.url.startsWith('http')) {
                            cache.put(event.request, fetchResponse.clone());
                        }
                        return fetchResponse;
                    });
                });
            })
    );
});
