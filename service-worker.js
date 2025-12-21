const CACHE_NAME = 'pelixplushd-v4'; // Incrementar la versión para forzar la actualización
const urlsToCache = [
  './',
  'index.html',
  'animes1.html',
  'ajustes.html',
  'anime.html',
  'manifest.json', // Añadir manifest
  'buscar.html',
  'detalles.html',
  'favoritos.html',
  'lanzamientos.html',
  'series.html',
  'estilos.css',
  'script.js',
  'fondo.png',
  'no-disponible.png',
  // Scripts principales
  'ajustes.js',
  'anime.js',
  'animes1.js',
  'buscar.js',
  'detalle.js',
  'favoritos.js',
  'guardador.js',
  'info.js',
  'lanzamientos.js',
  'optinizacion.js',
  'pelinot.js',
  'populares.js',
  'proximamente.js',
  'series.js',
  'todos.js',
  'ads.js',
  'bloqueador.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .catch(error => console.error('Fallo al cachear archivos durante la instalación:', error))
  );
  self.skipWaiting(); // Forzar la activación del nuevo Service Worker
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Borrando caché antigua:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim(); // Tomar control inmediato de las páginas
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        return fetch(event.request).then(
          function(response) {
            // No cachear respuestas de error o de tipo 'opaque' (de CDNs sin CORS)
            if(!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => cache.put(event.request, responseToCache));

            return response;
          }
        );
      })
  );
});