const CACHE_NAME = 'alfred-kastler-v1';
const STATIC_CACHE = [
  '/',
  '/login',
  '/manifest.json',
  '/icons/logo-ak-removebg.png',
  '/icons/logo-ak-removebg-preview.png'
];

// Installation du Service Worker
self.addEventListener('install', event => {
  console.log('✅ Service Worker installé');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('📦 Cache ouvert');
        return cache.addAll(STATIC_CACHE);
      })
      .then(() => {
        console.log('✨ Fichiers mis en cache');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('❌ Erreur lors de la mise en cache:', error);
      })
  );
});

// Activation du Service Worker
self.addEventListener('activate', event => {
  console.log('🔄 Service Worker activé');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Suppression ancien cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('✅ Service Worker prêt');
      return self.clients.claim();
    })
  );
});

// Interception des requêtes
self.addEventListener('fetch', event => {
  // Stratégie Network First pour les API calls
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          // Fallback si pas de réseau
          return new Response(
            JSON.stringify({ error: 'Pas de connexion réseau' }),
            { 
              status: 503,
              statusText: 'Service Unavailable',
              headers: { 'Content-Type': 'application/json' }
            }
          );
        })
    );
    return;
  }

  // Stratégie Cache First pour les ressources statiques
  if (event.request.destination === 'image' || 
      event.request.destination === 'script' || 
      event.request.destination === 'style' ||
      event.request.url.includes('/icons/')) {
    event.respondWith(
      caches.match(event.request)
        .then(response => {
          return response || fetch(event.request);
        })
    );
    return;
  }

  // Stratégie Network First pour les pages
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Mettre en cache les nouvelles pages
        if (response.status === 200 && event.request.method === 'GET') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseClone);
            });
        }
        return response;
      })
      .catch(() => {
        // Fallback vers le cache
        return caches.match(event.request)
          .then(response => {
            if (response) {
              return response;
            }
            // Page offline par défaut
            return caches.match('/login');
          });
      })
  );
});