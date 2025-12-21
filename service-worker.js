const CACHE_NAME = 'pelixplushd-v3';
const urlsToCache = [
  './',
  'index.html',
  'animes1.html',
  'ajustes.html',
  'anime.html',
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
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    (async () => {
      try {
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) return cachedResponse;
        return await fetch(event.request);
      } catch (e) {
        // Retornar una respuesta válida (404) para evitar errores en consola
        return new Response(null, { status: 404, statusText: 'Not Found' });
      }
    })()
  );
});