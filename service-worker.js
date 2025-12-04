const CACHE_NAME = 'nekro-league-v1.6';
const DYNAMIC_CACHE_NAME = 'nekro-league-dynamic-v1.6';

const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/styles.css',
    'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&display=swap',
    '/js/main.js',
    '/js/supabase.js',
    '/js/ui-feedback.js',
    '/js/ui-knockout.js',
    '/js/ui-matches.js',
    '/js/ui-table.js',
    '/images/leagues/champions-league-logo.webp',
];

self.addEventListener('install', evt => {
    evt.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('SW: Caching App Shell');
            return cache.addAll(STATIC_ASSETS);
        }).catch(err => console.error("App Shell Caching Failed: ", err))
    );
    self.skipWaiting();
});

self.addEventListener('activate', evt => {
    evt.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(keys
                .filter(key => key !== CACHE_NAME && key !== DYNAMIC_CACHE_NAME)
                .map(key => {
                    console.log('SW: Deleting old cache:', key);
                    return caches.delete(key);
                })
            );
        }).then(() => {
            return self.clients.claim();
        })
    );
});

self.addEventListener('fetch', evt => {
    if (evt.request.url.includes('supabase.co')) {
        evt.respondWith(
            caches.open(DYNAMIC_CACHE_NAME).then(cache => {
                return fetch(evt.request).then(networkResponse => {
                    if (networkResponse && networkResponse.status === 200) {
                        cache.put(evt.request, networkResponse.clone());
                    }
                    return networkResponse;
                }).catch(() => {
                    return cache.match(evt.request);
                });
            })
        );
        return;
    }

    if (STATIC_ASSETS.includes(new URL(evt.request.url).pathname)) {
        evt.respondWith(caches.match(evt.request));
        return;
    }

    evt.respondWith(
        caches.open(DYNAMIC_CACHE_NAME).then(cache => {
            return cache.match(evt.request).then(cachedResponse => {
                const networkFetch = fetch(evt.request).then(networkResponse => {
                    cache.put(evt.request, networkResponse.clone());
                    return networkResponse;
                });
                return cachedResponse || networkFetch;
            });
        })
    );
});
