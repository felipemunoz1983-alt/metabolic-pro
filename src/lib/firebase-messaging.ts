'use client'

/**
 * Cliente de Firebase Cloud Messaging (web).
 *
 * Convive con el Web Push clásico (usePushNotifications + public/sw.js). Este
 * módulo registra su propio service worker (public/firebase-messaging-sw.js) y
 * obtiene un registration token de FCM, que se guarda vía /api/fcm/token.
 *
 * Todo está detrás de variables NEXT_PUBLIC_FIREBASE_*. Si faltan, las funciones
 * devuelven null/no-op para que la app funcione igual sin FCM.
 *
 * Required env vars (públicas — NEXT_PUBLIC_, NO son secretas):
 *   NEXT_PUBLIC_FIREBASE_API_KEY
 *   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
 *   NEXT_PUBLIC_FIREBASE_PROJECT_ID
 *   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
 *   NEXT_PUBLIC_FIREBASE_APP_ID
 *   NEXT_PUBLIC_FIREBASE_VAPID_KEY   — "Web Push certificate" key pair (Cloud Messaging → Web)
 */

import type { FirebaseApp } from 'firebase/app'
import type { Messaging, MessagePayload } from 'firebase/messaging'

export interface FirebaseWebConfig {
  apiKey:            string
  authDomain:        string
  projectId:         string
  messagingSenderId: string
  appId:             string
}

function readConfig(): { config: FirebaseWebConfig; vapidKey: string } | null {
  const config: FirebaseWebConfig = {
    apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY            ?? '',
    authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN        ?? '',
    projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID         ?? '',
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
    appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID             ?? '',
  }
  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY ?? ''

  // Requerimos los campos mínimos para mensajería web.
  if (!config.apiKey || !config.projectId || !config.messagingSenderId || !config.appId || !vapidKey) {
    return null
  }
  return { config, vapidKey }
}

/** True si el cliente tiene configuración de FCM (para mostrar/usar la feature). */
export function isFcmClientConfigured(): boolean {
  return readConfig() !== null
}

let appPromise: Promise<FirebaseApp> | null = null
let messagingInstance: Messaging | null = null

async function getApp(config: FirebaseWebConfig): Promise<FirebaseApp> {
  if (!appPromise) {
    appPromise = (async () => {
      const { getApps, getApp: getExistingApp, initializeApp } = await import('firebase/app')
      return getApps().length ? getExistingApp() : initializeApp(config)
    })()
  }
  return appPromise
}

async function getMessagingInstance(config: FirebaseWebConfig): Promise<Messaging | null> {
  if (messagingInstance) return messagingInstance
  const { getMessaging, isSupported } = await import('firebase/messaging')
  if (!(await isSupported())) return null
  const app = await getApp(config)
  messagingInstance = getMessaging(app)
  return messagingInstance
}

/**
 * Registra el service worker de FCM, pasándole la config como query params
 * (la config web NO es secreta). El SW la lee de location.search y hace
 * initializeApp con esos valores — así no hay que hornear nada en build.
 */
async function registerFcmServiceWorker(config: FirebaseWebConfig): Promise<ServiceWorkerRegistration> {
  const params = new URLSearchParams({
    apiKey:            config.apiKey,
    authDomain:        config.authDomain,
    projectId:         config.projectId,
    messagingSenderId: config.messagingSenderId,
    appId:             config.appId,
  })
  return navigator.serviceWorker.register(`/firebase-messaging-sw.js?${params.toString()}`, {
    scope: '/firebase-cloud-messaging-push-scope',
  })
}

/**
 * Pide permiso (si hace falta), obtiene el token FCM y lo persiste vía API.
 * Devuelve el token, o null si no está configurado / no soportado / denegado.
 *
 * Idempotente: si ya hay token para este dispositivo, getToken lo devuelve igual
 * y el upsert del backend evita duplicados.
 */
export async function registerFcmToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null
  if (!('serviceWorker' in navigator) || !('Notification' in window)) return null

  const cfg = readConfig()
  if (!cfg) return null // FCM no configurado en este entorno

  try {
    if (Notification.permission !== 'granted') {
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') return null
    }

    const messaging = await getMessagingInstance(cfg.config)
    if (!messaging) return null

    const swReg = await registerFcmServiceWorker(cfg.config)
    const { getToken } = await import('firebase/messaging')
    const token = await getToken(messaging, {
      vapidKey: cfg.vapidKey,
      serviceWorkerRegistration: swReg,
    })
    if (!token) return null

    const res = await fetch('/api/fcm/token', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ token }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || `HTTP ${res.status}`)
    }
    return token
  } catch (err) {
    console.error('[fcm] registerFcmToken error:', err instanceof Error ? err.message : err)
    return null
  }
}

/**
 * Borra el token FCM de este dispositivo (local + backend). Best-effort.
 */
export async function deleteFcmToken(): Promise<void> {
  const cfg = readConfig()
  if (!cfg) return
  try {
    const messaging = await getMessagingInstance(cfg.config)
    if (!messaging) return
    const { getToken, deleteToken } = await import('firebase/messaging')
    // Recuperamos el token actual para poder borrarlo en el backend.
    let token: string | null = null
    try {
      token = await getToken(messaging, { vapidKey: cfg.vapidKey })
    } catch { /* puede no haber token */ }

    await deleteToken(messaging).catch(() => { /* no-op */ })

    if (token) {
      await fetch('/api/fcm/token', {
        method:  'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ token }),
      }).catch(() => { /* no-op */ })
    }
  } catch (err) {
    console.error('[fcm] deleteFcmToken error:', err instanceof Error ? err.message : err)
  }
}

/**
 * Escucha mensajes en primer plano (app abierta). Devuelve un unsubscribe.
 * Cuando la app está en background, los muestra firebase-messaging-sw.js.
 */
export async function onForegroundMessage(
  handler: (payload: MessagePayload) => void,
): Promise<() => void> {
  const cfg = readConfig()
  if (!cfg) return () => {}
  const messaging = await getMessagingInstance(cfg.config)
  if (!messaging) return () => {}
  const { onMessage } = await import('firebase/messaging')
  return onMessage(messaging, handler)
}
