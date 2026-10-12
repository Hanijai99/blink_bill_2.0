// Blink Bill Service Worker — real offline support
const CACHE_NAME = "blinkbill-cache-v24";

// Core app shell — everything needed for the app to open and work offline
const APP_SHELL = [
  "/",
  "/index.html",
  "/ai-assistant.html",
  "/dashboard.html",
  "/bill-settings.html",
  "/bills-list.html",
  "/expenses.html",
  "/history.html",
  "/login.html",
  "/qr-generation.html",
  "/stock.html",
  "/upi.html",
  "/upi_manage.html",
  "/offline.html",
  "/privacy-policy.html",
  "/style.css",
  "/loader.css",
  "/script.js",
  "/load-manager.js",
  "/utils.js",
  "/dashboard.js",
  "/analytics.js",
  "/qr-generator.js",
  "/manifest.json",
  "/logo195.png",
  "/assets/fontawesome/css/all.min.css",
  "/assets/fontawesome/webfonts/fa-solid-900.woff2",
  "/assets/fontawesome/webfonts/fa-brands-400.woff2",
  "/assets/fontawesome/webfonts/fa-regular-400.woff2"
];

// INSTALL — cache the app shell up front
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

// ACTIVATE — clean up old cache versions
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// FETCH — page navigations: network first, fall back to cache, then offline page
self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match("/offline.html"))
        )
    );
    return;
  }

  // Static assets (css/js/images/icons): cache first, then network
  if (request.method === "GET" && APP_SHELL.some((path) => request.url.endsWith(path))) {
    event.respondWith(
      caches.match(request).then((cached) => {
        return (
          cached ||
          fetch(request).then((response) => {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            return response;
          })
        );
      })
    );
    return;
  }

  // Everything else (Firestore/API calls etc.): network first, fall back to cache if offline
  if (request.method === "GET") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request))
    );
  }
});
