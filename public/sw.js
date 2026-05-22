/**
 * Centro Metabólico Pro — Service Worker v3
 *
 * Estrategia por tipo de recurso:
 *  - /_next/static/  → cache-first  (archivos inmutables con hash de contenido)
 *  - /api/           → network-only (datos siempre frescos, sin caché)
 *  - navegación HTML → network-first con fallback offline
 *  - íconos/manifest → cache-first  (estáticos, raramente cambian)
 *
 * v3: ya no se cachean las páginas HTML (/paciente, /) porque su contenido
 * cambia con cada deploy (referencias a nuevos chunks JS). Cachear el HTML
 * antiguo causa que se ejecute JS viejo aunque Vercel haya desplegado código nuevo.
 */

const CACHE_NAME  = 'cmp-shell-v3'
const OFFLINE_URL = '/offline'

// Solo pre-cachear assets VERDADERAMENTE estáticos (íconos y manifest).
// Las páginas HTML se sirven siempre desde la red.
const STATIC_ASSETS = [
  '/offline',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-192.svg',
  '/icon-512.svg',
]

// ── Install: pre-cache assets estáticos ──────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS).catch(() => {
        // Continúa aunque algún asset no exista aún
      }))
      .then(() => self.skipWaiting())
  )
})

// ── Activate: eliminar caches viejos (v1, v2) ────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      ))
      .then(() => clients.claim())
  )
})

// ── Fetch: estrategia por tipo de recurso ─────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)

  // Solo interceptar peticiones al mismo origen
  if (url.origin !== self.location.origin) return

  // ── API: network-only, sin cache ──────────────────────────────────────────
  if (url.pathname.startsWith('/api/')) {
    // No event.respondWith → el browser hace fetch normal
    return
  }

  // ── _next/static/: cache-first (archivos con hash de contenido = inmutables) ─
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached
        return fetch(request).then(response => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then(cache => cache.put(request, clone))
          }
          return response
        })
      })
    )
    return
  }

  // ── Íconos, manifest, /offline: cache-first ───────────────────────────────
  const isStaticFile = STATIC_ASSETS.some(a => url.pathname === a)
    || url.pathname.match(/\.(png|svg|ico|webp|woff2?)$/)
  if (isStaticFile) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached
        return fetch(request).then(response => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then(cache => cache.put(request, clone))
          }
          return response
        }).catch(() => new Response('', { status: 503 }))
      })
    )
    return
  }

  // ── Páginas HTML (navegación): network-first, fallback offline ────────────
  // IMPORTANTE: NO usar cache-first para HTML — cada deploy cambia los
  // hashes de los chunks JS referenciados en el HTML. Servir HTML viejo
  // hace que el browser ejecute JS desactualizado aunque Vercel tenga código nuevo.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(OFFLINE_URL).then(offline =>
          offline ?? new Response('<h1>Sin conexión</h1>', {
            headers: { 'Content-Type': 'text/html' },
          })
        )
      )
    )
    return
  }

  // ── Todo lo demás: network-first con fallback a cache ────────────────────
  event.respondWith(
    fetch(request).then(response => {
      if (response.ok && request.method === 'GET') {
        const clone = response.clone()
        caches.open(CACHE_NAME).then(cache => cache.put(request, clone))
      }
      return response
    }).catch(() =>
      caches.match(request).then(cached =>
        cached ?? new Response('', { status: 503 })
      )
    )
  )
})

// ── Push: mostrar notificación ────────────────────────────────────────────────
self.addEventListener('push', event => {
  if (!event.data) return

  let payload
  try {
    payload = event.data.json()
  } catch {
    payload = { title: 'Centro Metabólico', body: event.data.text() }
  }

  const options = {
    body:     payload.body    || 'Tienes una notificación nueva.',
    icon:     payload.icon    || '/icon-192.png',
    badge:    '/icon-192.png',
    tag:      payload.tag     || 'cmp-notif',
    renotify: false,
    data:     { url: payload.url || '/paciente' },
    actions:  payload.actions || [],
    vibrate:  [100, 50, 100],
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || 'Centro Metabólico Pro', options)
  )
})

// ── Notification click: abrir o enfocar app ───────────────────────────────────
self.addEventListener('notificationclick', event => {
  event.notification.close()

  const targetUrl = event.notification.data?.url || '/paciente'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus()
          client.navigate(targetUrl)
          return
        }
      }
      if (clients.openWindow) return clients.openWindow(targetUrl)
    })
  )
})
