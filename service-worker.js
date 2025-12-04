// --- START OF FILE service-worker.js ---
// "SELF-DESTRUCT" SERVICE WORKER

self.addEventListener('install', (e) => {
    // Activate immediately
    self.skipWaiting();
});

self.addEventListener('activate', (e) => {
    // Unregister immediately
    self.registration.unregister()
        .then(() => {
            return self.clients.matchAll();
        })
        .then((clients) => {
            // Force reload all open tabs to clear the cache for good
            clients.forEach((client) => client.navigate(client.url));
        });
});