/**
 * Firebase Cloud Messaging — Service Worker (background messages)
 *
 * Maneja las notificaciones FCM cuando la app está en background o cerrada.
 * Es independiente del SW principal (public/sw.js, que cachea + Web Push clásico);
 * FCM lo registra en su propio scope (/firebase-cloud-messaging-push-scope).
 *
 * La config de Firebase (web, NO secreta) llega como query params al registrar
 * el SW desde src/lib/firebase-messaging.ts, así no hay que hornearla en build.
 */

/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/12.15.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/12.15.0/firebase-messaging-compat.js')

// ── Config desde los query params del registro ───────────────────────────────
const params = new URL(self.location).searchParams
const firebaseConfig = {
  apiKey:            params.get('apiKey'),
  authDomain:        params.get('authDomain'),
  projectId:         params.get('projectId'),
  messagingSenderId: params.get('messagingSenderId'),
  appId:             params.get('appId'),
}

if (firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.messagingSenderId) {
  firebase.initializeApp(firebaseConfig)
  const messaging = firebase.messaging()

  // ── Mensajes en background ─────────────────────────────────────────────────
  messaging.onBackgroundMessage(payload => {
    const data = payload.data || {}
    const notif = payload.notification || {}

    const title = notif.title || data.title || 'Centro Metabólico Pro'
    const options = {
      body:  notif.body || data.body || 'Tienes una notificación nueva.',
      icon:  data.icon || '/icon-192.png',
      badge: '/icon-192.png',
      tag:   data.tag || 'cmp-fcm',
      data:  { url: data.url || '/paciente?tab=dashboard' },
      vibrate: [100, 50, 100],
    }
    self.registration.showNotification(title, options)
  })
}

// ── Click en la notificación: abrir o enfocar la app ─────────────────────────
self.addEventListener('notificationclick', event => {
  event.notification.close()
  const targetUrl = (event.notification.data && event.notification.data.url) || '/paciente?tab=dashboard'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus()
          if ('navigate' in client) client.navigate(targetUrl)
          return
        }
      }
      if (clients.openWindow) return clients.openWindow(targetUrl)
    })
  )
})
