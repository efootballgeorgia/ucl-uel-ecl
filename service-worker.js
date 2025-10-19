const CACHE_NAME = 'league-v2'; 
const DYNAMIC_CACHE_NAME = 'league-dynamic-v2';

const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/styles.css',
    '/js/main.js',
    '/js/auth.js',
    '/js/config.js',
    '/js/constants.js',
    '/js/dom.js',
    '/js/supabase.js', 
    '/js/state.js',
    '/js/ui-feedback.js',
    '/js/ui-knockout.js',
    '/js/ui-matches.js',
    '/js/ui-table.js',
    '/js/utils.js',
    '/images/logos/champions-league-logo.webp',
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

    evt.respondWith(
        caches.match(evt.request).then(cacheRes => {
            return cacheRes || fetch(evt.request).then(fetchRes => {
                return caches.open(DYNAMIC_CACHE_NAME).then(cache => {
                    if (fetchRes.status === 200 && evt.request.method === 'GET') {
                         cache.put(evt.request.url, fetchRes.clone());
                    }
                    return fetchRes;
                });
            });
        })
    );
});