var CACHE_VERSION = 'boo-v2';

self.addEventListener('install', function() {
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(names) {
      return Promise.all(
        names.filter(function(n) { return n !== CACHE_VERSION; })
          .map(function(n) { return caches.delete(n); })
      );
    }).then(function() { return self.clients.claim(); })
  );
});

// Network-first for same-origin GET only.
// POSTs and cross-origin requests (e.g. Apps Script) bypass the SW completely
// — caching POSTs is illegal and would stall the request promise.
self.addEventListener('fetch', function(event) {
  var req = event.request;
  if (req.method !== 'GET') return; // let POST/PUT/DELETE go straight to network
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // skip cross-origin (Apps Script)

  event.respondWith(
    fetch(req).then(function(response) {
      if (response && response.status === 200 && response.type === 'basic') {
        var clone = response.clone();
        caches.open(CACHE_VERSION).then(function(cache) {
          cache.put(req, clone);
        });
      }
      return response;
    }).catch(function() {
      return caches.match(req);
    })
  );
});
