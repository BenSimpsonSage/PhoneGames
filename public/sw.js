/**
 * Offline support for Party Box.
 *
 * The whole app is static and has no backend, so once a device has seen a
 * page it never genuinely needs the network again — which is the point, since
 * this gets played in cars, on campsites and in the back of village halls.
 *
 * Two strategies:
 *  - Navigations: network first, falling back to the cached page, then to the
 *    home screen. Network first means a new deploy is picked up as soon as
 *    there's signal, rather than serving last month's build forever.
 *  - Everything else same-origin (JS, CSS, fonts, icons): cache first. Next
 *    fingerprints these filenames, so a cached one is never stale.
 */

const VERSION = "v1";
const CACHE = `partybox-${VERSION}`;

// Warm the cache with the routes, so the very first offline launch works even
// if the child only ever opened the home screen.
const PRECACHE = [
  "/",
  "/heads-up",
  "/imposter",
  "/would-you-rather",
  "/most-likely-to",
  "/categories",
  "/doodle-dash",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      // Individually, so one failed route can't reject the whole install.
      await Promise.allSettled(PRECACHE.map((path) => cache.add(path)));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          const cache = await caches.open(CACHE);
          cache.put(request, response.clone());
          return response;
        } catch {
          return (
            (await caches.match(request)) ??
            (await caches.match("/")) ??
            Response.error()
          );
        }
      })(),
    );
    return;
  }

  event.respondWith(
    (async () => {
      const cached = await caches.match(request);
      if (cached) return cached;
      try {
        const response = await fetch(request);
        // Opaque and error responses are not worth storing.
        if (response.ok && response.type === "basic") {
          const cache = await caches.open(CACHE);
          cache.put(request, response.clone());
        }
        return response;
      } catch {
        return Response.error();
      }
    })(),
  );
});
