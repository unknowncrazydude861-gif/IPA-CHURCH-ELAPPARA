const CACHE = 'ipa-church-v1';
const APP_SHELL = [
  './',
  './index.html',
  './styles.css',
  './script.js',
  './supabase-config.js',
  './ultra-buttons.css',
  './ultra-buttons-loader.js',
  './instagram-brand-orbs.js',
  './ultra3d.js',
  './manifest.webmanifest'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        fetch(request).then((response) => {
          if (response && response.ok && new URL(request.url).origin === self.location.origin) {
            caches.open(CACHE).then((cache) => cache.put(request, response.clone()));
          }
        }).catch(() => {});
        return cached;
      }
      return fetch(request).then((response) => {
        if (response && response.ok && new URL(request.url).origin === self.location.origin) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
