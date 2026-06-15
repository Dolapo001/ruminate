/* Ruminate service worker — offline app shell + last-known data.
   Network-first for navigations and same-origin GETs (so you always get fresh
   data when online), falling back to the cache when the network is down — which
   is the whole point on a patchy rural connection. */
const CACHE = "ruminate-v1";

self.addEventListener("install", (e) => self.skipWaiting());
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return; // never cache POSTs (diagnoses queue in-app)

  event.respondWith(
    fetch(request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
        return res;
      })
      .catch(() =>
        caches.match(request).then((cached) => cached || caches.match("/dashboard"))
      )
  );
});
