/**
 * Centro Metabólico Pro — Service Worker v2
 * - Caches the app shell for fast load + offline fallback
 * - Handles push notifications
 * - Network-first for API, cache-first for static assets
 */

const CACHE_NAME   = 'cmp-shell-v2'
const OFFLINE_URL  = '/offline'

// Assets to pre-cache on install (app shell)
const SHELL_ASSETS = [
  '/',
  '/paciente',
  '/offline',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-192.svg',
  '/icon-512.svg',
]

// ── Install: pre-cache shell ──────────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(SHELL_ASSETS).catch(() => {
        // Si algún asset falla (ej. /offline no existe aún), continúa igual
      }))
      .then(() => self.skipWaiting())
  )
})

// ── Activate: limpiar caches viejos ──────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => clients.claim())
  )
})

// ── Fetch: estrategia híbrida ─────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)

  // Ignorar peticiones que no sean al mismo origen
  if (url.origin !== self.location.origin) return

  // API y Supabase → Network-first (datos siempre frescos)
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/_next/')) {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(request).then(cached => cached ?? new Response('', { status: 503 }))
      )
    )
    return
  }

  // App shell y estáticos → Cache-first con fallback a red
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached
      return fetch(request).then(response => {
        // Solo cachear respuestas válidas del mismo origen
        if (response.ok && request.method === 'GET') {
          const clone = response.clone()
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone))
        }
        return response
      }).catch(() => {
        // Fallback offline para navegación
        if (request.mode === 'navigate') {
          return caches.match(OFFLINE_URL) ?? new Response('<h1>Sin conexión</h1>', {
            headers: { 'Content-Type': 'text/html' }
          })
        }
        return new Response('', { status: 503 })
      })
    })
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
