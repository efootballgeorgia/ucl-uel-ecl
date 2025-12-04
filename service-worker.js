const CACHE_NAME = 'nekro-league-v1.7';
const DYNAMIC_CACHE_NAME = 'nekro-league-dynamic-v1.7';

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
    // Force the waiting service worker to become the active service worker
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
            // Take control of all pages immediately
            return self.clients.claim();
        })
    );
});

self.addEventListener('fetch', evt => {
    const url = new URL(evt.request.url);

    // --- CRITICAL FIX ---
    // Do NOT cache Supabase requests. This prevents the "database won't load" issue.
    // We let these go directly to the network.
    if (url.href.includes('supabase.co')) {
        return; 
    }

    // Do NOT cache video files (saves storage and prevents loading issues)
    if (url.href.includes('.mp4')) {
        return;
    }

    // 1. Cache Static Assets (App Shell)
    if (STATIC_ASSETS.includes(url.pathname)) {
        evt.respondWith(caches.match(evt.request));
        return;
    }

    // 2. Dynamic Cache for other requests (e.g., images not in static list)
    evt.respondWith(
        caches.open(DYNAMIC_CACHE_NAME).then(cache => {
            return cache.match(evt.request).then(cachedResponse => {
                const networkFetch = fetch(evt.request).then(networkResponse => {
                    // Only cache valid responses (status 200)
                    if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                        cache.put(evt.request, networkResponse.clone());
                    }
                    return networkResponse;
                }).catch(err => {
                    // Network failed and no cache available
                    console.log('Network fetch failed', err);
                });
                return cachedResponse || networkFetch;
            });
        })
    );
});