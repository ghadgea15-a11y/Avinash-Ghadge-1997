const CACHE_NAME = 'logsheet-pwa-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  try {
    const url = new URL(event.request.url);
    // Do not intercept API, Vite dev modules, or websocket requests
    if (
      url.pathname.startsWith('/api') ||
      url.pathname.startsWith('/@') ||
      url.pathname.includes('vite') ||
      url.protocol === 'ws:' ||
      url.protocol === 'wss:'
    ) {
      return;
    }
  } catch (e) {
    return;
  }

  event.respondWith(
    fetch(event.request).catch(async () => {
      try {
        const cached = await caches.match(event.request);
        if (cached) return cached;
      } catch (err) {}
      return new Response('Offline - asset unavailable', { 
        status: 503, 
        headers: { 'Content-Type': 'text/plain' } 
      });
    })
  );
});
