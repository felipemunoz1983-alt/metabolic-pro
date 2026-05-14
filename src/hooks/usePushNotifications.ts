'use client'

/**
 * usePushNotifications — manages service worker registration and push subscription.
 *
 * Usage:
 *   const { supported, permission, subscribed, requesting, subscribe, unsubscribe } = usePushNotifications(userId)
 *
 * Flow:
 *   1. On mount: register sw.js, check existing subscription.
 *   2. subscribe(): request permission → create PushSubscription → POST to /api/push/subscribe.
 *   3. unsubscribe(): unsubscribe from push service → DELETE /api/push/subscribe.
 */

import { useCallback, useEffect, useState } from 'react'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const buffer = new ArrayBuffer(rawData.length)
  const outputArray = new Uint8Array(buffer)
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i)
  return outputArray
}

export type PushPermission = 'default' | 'granted' | 'denied' | 'unsupported'

export interface UsePushResult {
  supported:   boolean
  permission:  PushPermission
  subscribed:  boolean
  requesting:  boolean
  error:       string | null
  subscribe:   () => Promise<void>
  unsubscribe: () => Promise<void>
}

export function usePushNotifications(userId: string | null): UsePushResult {
  const [supported,  setSupported]  = useState(false)
  const [permission, setPermission] = useState<PushPermission>('default')
  const [subscribed, setSubscribed] = useState(false)
  const [requesting, setRequesting] = useState(false)
  const [error,      setError]      = useState<string | null>(null)
  const [swReg,      setSwReg]      = useState<ServiceWorkerRegistration | null>(null)

  // ── Register service worker + check existing subscription ─────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setSupported(false)
      setPermission('unsupported')
      return
    }
    setSupported(true)
    setPermission(Notification.permission as PushPermission)

    navigator.serviceWorker.register('/sw.js').then(async reg => {
      setSwReg(reg)
      // Check if already subscribed
      const existing = await reg.pushManager.getSubscription()
      setSubscribed(!!existing)
    }).catch(err => {
      console.error('[push] SW registration failed:', err)
      setError('Error al registrar el servicio de notificaciones.')
    })
  }, [])

  // ── Subscribe ─────────────────────────────────────────────────────────────
  const subscribe = useCallback(async () => {
    if (!swReg || !userId || !VAPID_PUBLIC_KEY) {
      if (!VAPID_PUBLIC_KEY) setError('VAPID key no configurada — contacta soporte.')
      return
    }
    setRequesting(true)
    setError(null)

    try {
      const perm = await Notification.requestPermission()
      setPermission(perm as PushPermission)
      if (perm !== 'granted') {
        setError('Permiso denegado. Actívalo en la configuración del navegador.')
        return
      }

      const sub = await swReg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })

      const raw = sub.toJSON()

      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: raw.endpoint,
          keys:     raw.keys,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `HTTP ${res.status}`)
      }

      setSubscribed(true)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('[push] subscribe error:', msg)
      setError('No se pudo activar las notificaciones: ' + msg)
    } finally {
      setRequesting(false)
    }
  }, [swReg, userId])

  // ── Unsubscribe ───────────────────────────────────────────────────────────
  const unsubscribe = useCallback(async () => {
    if (!swReg) return
    setRequesting(true)
    setError(null)

    try {
      const sub = await swReg.pushManager.getSubscription()
      if (sub) {
        const endpoint = sub.endpoint
        await sub.unsubscribe()
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint }),
        })
      }
      setSubscribed(false)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('[push] unsubscribe error:', msg)
      setError('Error al desactivar notificaciones: ' + msg)
    } finally {
      setRequesting(false)
    }
  }, [swReg])

  return { supported, permission, subscribed, requesting, error, subscribe, unsubscribe }
}
