const CACHE_NAME = 'nekro-league-v5';
const DYNAMIC_CACHE_NAME = 'nekro-league-dynamic-v5';

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
    '/images/logos/champions-league-logo.webp',
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
    // UPDATED: Network-first strategy for critical API data.
    // This ensures users always get the freshest scores and stats when online.
    if (evt.request.url.includes('supabase.co')) {
        evt.respondWith(
            caches.open(DYNAMIC_CACHE_NAME).then(cache => {
                return fetch(evt.request).then(networkResponse => {
                    if(networkResponse.ok) {
                       cache.put(evt.request.url, networkResponse.clone());
                    }
                    return networkResponse;
                }).catch(() => cache.match(evt.request.url)); // Fallback to cache if offline
            })
        );
        return;
    }

    // UPDATED: Stale-While-Revalidate strategy for all other assets (e.g., images, scripts).
    // This serves assets from the cache instantly for a faster load time,
    // then updates the cache from the network in the background for future visits.
    evt.respondWith(
        caches.open(DYNAMIC_CACHE_NAME).then(cache => {
            return cache.match(evt.request).then(cachedResponse => {
                const networkFetch = fetch(evt.request).then(networkResponse => {
                    // Check for valid, cacheable responses
                    if (networkResponse && networkResponse.status === 200 && !evt.request.url.startsWith('chrome-extension://')) {
                        cache.put(evt.request.url, networkResponse.clone());
                    }
                    return networkResponse;
                }).catch(err => {
                    console.warn('SW: Network fetch failed. Serving from cache if available.', err);
                });
                
                // Return cached response immediately if available, otherwise wait for the network.
                return cachedResponse || networkFetch;
            });
        })
    );
});
