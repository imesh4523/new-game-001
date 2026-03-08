const CACHE_NAME = '3xbet-v3'; // Increment version to force cache refresh
const STATIC_CACHE = '3xbet-static-v3';
const DYNAMIC_CACHE = '3xbet-dynamic-v3';

// Static assets to cache on install
const urlsToCache = [
  '/',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting(); // Force activate immediately
});

// Network-first strategy for API calls to prevent stale data
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Always use network-first for API calls (balance, user data, etc.)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Only cache GET requests to avoid TypeError with POST/PUT/DELETE
          if (response && response.status === 200 && request.method === 'GET') {
            const responseToCache = response.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          // Only use cache fallback for GET requests
          if (request.method === 'GET') {
            return caches.match(request);
          }
          // For non-GET requests, return a network error response
          return new Response(JSON.stringify({ error: 'Network request failed' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          });
        })
    );
    return;
  }
  
  // Cache-first strategy for static assets (images, fonts, etc.)
  if (url.pathname.match(/\.(png|jpg|jpeg|svg|gif|webp|woff|woff2|ttf|eot|ico)$/)) {
    event.respondWith(
      caches.match(request)
        .then((response) => {
          return response || fetch(request).then((fetchResponse) => {
            return caches.open(STATIC_CACHE).then((cache) => {
              cache.put(request, fetchResponse.clone());
              return fetchResponse;
            });
          });
        })
    );
    return;
  }
  
  // ALWAYS use network for JS/CSS to prevent stale code, bypass cache completely
  if (url.pathname.match(/\.(js|css|tsx|ts)$/) || url.pathname.includes('/src/')) {
    event.respondWith(
      fetch(request, { cache: 'no-store' })
        .catch(() => {
          return new Response('Network error', { status: 503 });
        })
    );
    return;
  }
  
  // Network-first for everything else (HTML) to ensure fresh content
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Only cache GET requests
        if (response && response.status === 200 && request.method === 'GET') {
          const responseToCache = response.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // Fallback to cache if network fails (GET requests only)
        if (request.method === 'GET') {
          return caches.match(request);
        }
        return new Response('Network error', { status: 503 });
      })
  );
});

self.addEventListener('activate', (event) => {
  const cacheWhitelist = [STATIC_CACHE, DYNAMIC_CACHE];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Take control of all pages immediately
      return self.clients.claim();
    })
  );
});

// Handle push notifications
self.addEventListener('push', (event) => {
  console.log('🔔 [PWA] Push notification received:', event);
  console.log('🔔 [PWA] Event data available:', !!event.data);
  
  let notificationData = {
    title: 'Notification',
    body: 'You have a new notification',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: {
      url: '/',
      timestamp: Date.now()
    }
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      console.log('🔔 [PWA] Parsed notification payload:', payload);
      
      const notificationType = payload.type || 'info';
      const messageBody = payload.message || payload.body || notificationData.body;
      const messageTitle = payload.title && payload.title.trim() !== '' ? payload.title : 'Notification';
      
      notificationData = {
        title: messageTitle,
        body: messageBody,
        icon: payload.icon || '/icon-192.png',
        badge: '/icon-192.png',
        tag: payload.tag || `notification-${Date.now()}`,
        requireInteraction: notificationType === 'error' || notificationType === 'warning',
        renotify: true,
        silent: false,
        data: {
          url: payload.url || '/',
          notificationId: payload.notificationId,
          type: notificationType,
          timestamp: Date.now()
        }
      };

      // Add vibration pattern based on notification type
      if (notificationType === 'error') {
        notificationData.vibrate = [200, 100, 200, 100, 200];
      } else if (notificationType === 'warning') {
        notificationData.vibrate = [200, 100, 200];
      } else if (notificationType === 'success') {
        notificationData.vibrate = [200];
      } else {
        notificationData.vibrate = [100, 50, 100];
      }

      // Add image if provided
      if (payload.imageUrl) {
        notificationData.image = payload.imageUrl;
      }
      
      console.log('🔔 [PWA] Prepared notification data:', notificationData);
    } catch (error) {
      console.error('❌ [PWA] Error parsing push notification:', error);
    }
  }

  const showNotificationPromise = self.registration.showNotification(
    notificationData.title,
    {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      requireInteraction: notificationData.requireInteraction,
      renotify: notificationData.renotify,
      silent: notificationData.silent,
      vibrate: notificationData.vibrate,
      data: notificationData.data,
      image: notificationData.image,
      timestamp: Date.now(),
      actions: [
        {
          action: 'open',
          title: 'Open',
          icon: '/icon-192.png'
        },
        {
          action: 'close',
          title: 'Close'
        }
      ]
    }
  ).then(() => {
    console.log('✅ [PWA] Notification displayed successfully');
  }).catch(error => {
    console.error('❌ [PWA] Failed to show notification:', error);
  });

  event.waitUntil(showNotificationPromise);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('🔔 [PWA] Notification clicked:', event.notification);
  console.log('🔔 [PWA] Action clicked:', event.action);
  
  event.notification.close();

  if (event.action === 'close') {
    console.log('🔔 [PWA] Close action - notification dismissed');
    return;
  }

  const urlToOpen = new URL(event.notification.data?.url || '/', self.location.origin).href;
  console.log('🔔 [PWA] Opening URL:', urlToOpen);

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        console.log('🔔 [PWA] Found', clientList.length, 'open windows/tabs');
        
        // Try to find and focus an existing window
        for (const client of clientList) {
          const clientUrl = new URL(client.url);
          const targetUrl = new URL(urlToOpen);
          
          if (clientUrl.origin === targetUrl.origin && 'focus' in client) {
            console.log('🔔 [PWA] Focusing existing window:', client.url);
            return client.focus().then(focusedClient => {
              if ('navigate' in focusedClient) {
                return focusedClient.navigate(urlToOpen);
              }
              return focusedClient;
            });
          }
        }
        
        // If no window/tab is open with same origin, open a new one
        if (clients.openWindow) {
          console.log('🔔 [PWA] Opening new window');
          return clients.openWindow(urlToOpen);
        }
      })
      .catch(error => {
        console.error('❌ [PWA] Error handling notification click:', error);
      })
  );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event.notification);
});
