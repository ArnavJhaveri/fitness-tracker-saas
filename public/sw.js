/**
 * Service Worker — Phase 1 stub.
 *
 * Currently provides:
 *   • Offline fallback for navigation requests
 *
 * Phase 2 will add:
 *   • Workbox-based caching strategy
 *   • Background sync for offline workout logging
 *   • Push notifications for goal reminders
 */

const CACHE_NAME = "fittrack-v1";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.add(OFFLINE_URL)).catch(() => {
      // Offline page doesn't exist yet — graceful no-op
    }),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match(OFFLINE_URL).then((r) => r ?? Response.error()),
      ),
    );
  }
});
