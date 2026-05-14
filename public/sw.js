/**
 * Centro Metabólico Pro — Service Worker
 * Handles push notifications and basic PWA caching.
 */

const CACHE_NAME = 'cmp-v1'

// ── Install: cache shell assets ───────────────────────────────────────────────
self.addEventListener('install', event => {
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  event.waitUntil(clients.claim())
})

// ── Push: show notification ───────────────────────────────────────────────────
self.addEventListener('push', event => {
  if (!event.data) return

  let payload
  try {
    payload = event.data.json()
  } catch {
    payload = { title: 'Centro Metabólico', body: event.data.text() }
  }

  const options = {
    body:    payload.body  || 'Tienes una notificación nueva.',
    icon:    payload.icon  || '/icon-192.svg',
    badge:   '/icon-192.svg',
    tag:     payload.tag   || 'cmp-notif',
    renotify: false,
    data: {
      url: payload.url || '/paciente',
    },
    actions: payload.actions || [],
    vibrate: [100, 50, 100],
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || 'Centro Metabólico Pro', options)
  )
})

// ── Notification click: focus or open app ─────────────────────────────────────
self.addEventListener('notificationclick', event => {
  event.notification.close()

  const targetUrl = event.notification.data?.url || '/paciente'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      // If app is already open, focus it
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus()
          client.navigate(targetUrl)
          return
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl)
      }
    })
  )
})
