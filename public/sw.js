// FastOrder S.A. - Service Worker
// Version: 1.0.0 (Offline-First Architecture)

const CACHE_STATIC_NAME = 'fastorder-appshell-v25';
const CACHE_DYNAMIC_NAME = 'fastorder-runtime-v25';

const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/cocina.html',
    '/portal.html',
    '/css/style.css',
    '/css/kds.css',
    '/js/qrcode.min.js',
    '/js/jsQR.js',
    '/js/app.js',
    '/js/kds.js',
    '/js/idb.js',
    '/manifest.json',
    '/icons/logo.png',
    '/icons/favicon.png',
    '/icons/apple-touch-icon.png',
    '/images/logo.jpg',
    '/icons/icon-192.png',
    '/icons/icon-512.png',
    '/images/products/combo_doble.jpg',
    '/images/products/monster_bacon.jpg',
    '/images/products/cheese_burger.jpg',
    '/images/products/chicken_burger.jpg',
    '/images/products/papas_rusticas.jpg',
    '/images/products/aros_cebolla.jpg',
    '/images/products/nuggets.jpg',
    '/images/products/inka_cola.jpg',
    '/images/products/chicha_morada.jpg',
    '/images/products/helado_oreo.jpg'
];

// 1. INSTALL
self.addEventListener('install', (event) => {
    console.log('[SW] Instalando Service Worker v25...');
    event.waitUntil(
        caches.open(CACHE_STATIC_NAME).then((cache) => {
            console.log('[SW] Precaché del App Shell completado.');
            return cache.addAll(STATIC_ASSETS);
        }).then(() => self.skipWaiting())
    );
});

// 2. ACTIVATE
self.addEventListener('activate', (event) => {
    console.log('[SW] Activando Service Worker v25 y purgando cachés obsoletas...');
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_STATIC_NAME && key !== CACHE_DYNAMIC_NAME) {
                        console.log('[SW] Purgando caché obsoleta:', key);
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// 3. FETCH
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Ignorar peticiones de otros orígenes (ej. servicios en la nube como ntfy.sh)
    if (url.origin !== location.origin) {
        return;
    }

    // API: Catálogo de productos (Stale-While-Revalidate)
    if (url.pathname === '/api/v1/productos') {
        event.respondWith(
            caches.open(CACHE_DYNAMIC_NAME).then((cache) => {
                return cache.match(event.request).then((cachedResponse) => {
                    const fetchPromise = fetch(event.request).then((networkResponse) => {
                        if (networkResponse && networkResponse.status === 200) {
                            cache.put(event.request, networkResponse.clone());
                        }
                        return networkResponse;
                    }).catch(() => cachedResponse);

                    return cachedResponse || fetchPromise;
                });
            })
        );
        return;
    }

    // Ignorar peticiones de WebSockets o peticiones que no sean GET
    if (event.request.method !== 'GET' || url.protocol.startsWith('ws')) {
        return;
    }

    // NUNCA cachear endpoints dinámicos de pedidos (dejar pasar a la red directamente)
    if (url.pathname.startsWith('/api/')) {
        return;
    }

    // Para scripts y estilos (/js/, /css/) y páginas HTML: Network-First con Fallback a Caché
    // Esto garantiza que el código actualizado se reciba inmediatamente sin quedar atrapado en caché vieja
    if (url.pathname.startsWith('/js/') || url.pathname.startsWith('/css/') || event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request).then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_STATIC_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return networkResponse;
            }).catch(() => {
                return caches.match(event.request).then((cached) => {
                    if (cached) return cached;
                    if (event.request.mode === 'navigate') {
                        return caches.match('/index.html');
                    }
                });
            })
        );
        return;
    }

    // Para imágenes y recursos estáticos pesados: Cache-First con Fallback a Network
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }
            return fetch(event.request).then((networkResponse) => {
                if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                    return networkResponse;
                }
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_DYNAMIC_NAME).then((cache) => {
                    cache.put(event.request, responseToCache);
                });
                return networkResponse;
            });
        })
    );
});

// 4. BACKGROUND SYNC
self.addEventListener('sync', (event) => {
    console.log('[SW] Evento Background Sync activado:', event.tag);
    if (event.tag === 'sync-fastorder-orders') {
        event.waitUntil(
            self.clients.matchAll().then((clients) => {
                clients.forEach((client) => {
                    client.postMessage({ type: 'TRIGGER_BACKGROUND_SYNC' });
                });
            })
        );
    }
});

// 5. PUSH NOTIFICATIONS
self.addEventListener('push', (event) => {
    let data = { title: 'FastOrder S.A.', body: '¡Novedades en tu pedido!', icon: '/icons/icon-192.png' };
    if (event.data) {
        try {
            data = event.data.json();
        } catch (e) {
            data.body = event.data.text();
        }
    }

    const options = {
        body: data.body,
        icon: data.icon || '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        vibrate: [200, 100, 200],
        data: data.data || { url: '/' },
        actions: [
            { action: 'ver_pedido', title: 'Ver Pedido' },
            { action: 'cerrar', title: 'Entendido' }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// 6. NOTIFICATION CLICK
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if (client.url && 'focus' in client) {
                    return client.focus();
                }
            }
            if (self.clients.openWindow) {
                return self.clients.openWindow('/');
            }
        })
    );
});
