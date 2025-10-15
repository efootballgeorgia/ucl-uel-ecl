const CACHE_NAME = 'nekro-league-v1';
const DYNAMIC_CACHE_NAME = 'nekro-league-dynamic-v1';

const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/styles.css',
    'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&display=swap',
    '/js/main.js',
    '/js/auth.js',
    '/js/config.js',
    '/js/constants.js',
    '/js/dom.js',
    '/js/firestore.js',
    '/js/state.js',
    '/js/ui-feedback.js',
    '/js/ui-knockout.js',
    '/js/ui-matches.js',
    '/js/ui-table.js',
    '/js/utils.js',
    '/images/logos/champions-league-logo.webp',
    'https://cdn.jsdelivr.net/npm/lazysizes@5.3.2/lazysizes.min.js'
];

self.addEventListener('install', evt => {
    evt.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('SW: Caching App Shell');
            return cache.addAll(STATIC_ASSETS);
        }).catch(err => console.error("App Shell Caching Failed: ", err))
    );
});

self.addEventListener('activate', evt => {
    evt.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(keys
                .filter(key => key !== CACHE_NAME && key !== DYNAMIC_CACHE_NAME)
                .map(key => caches.delete(key))
            );
        })
    );
});

self.addEventListener('fetch', evt => {

    if (evt.request.url.includes('firestore.googleapis.com')) {
        evt.respondWith(
            caches.open(DYNAMIC_CACHE_NAME).then(cache => {
                return fetch(evt.request).then(networkResponse => {
                    cache.put(evt.request.url, networkResponse.clone());
                    return networkResponse;
                }).catch(() => cache.match(evt.request.url));
            })
        );
        return;
    }


    evt.respondWith(
        caches.match(evt.request).then(cacheRes => {
            return cacheRes || fetch(evt.request).then(fetchRes => {
                return caches.open(DYNAMIC_CACHE_NAME).then(cache => {
                    if (!evt.request.url.startsWith('chrome-extension://')) {

                        if (fetchRes.status === 200) {
                            cache.put(evt.request.url, fetchRes.clone());
                        }
                    }
                    return fetchRes;
                });
            });
        })
    );
});