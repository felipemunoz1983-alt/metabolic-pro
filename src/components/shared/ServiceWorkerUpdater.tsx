'use client'

/**
 * ServiceWorkerUpdater
 *
 * Escucha el evento 'controllerchange' del Service Worker.
 * Cuando Vercel despliega código nuevo → el SW nuevo se activa (skipWaiting + clients.claim)
 * → controllerchange dispara → recargamos la página automáticamente.
 *
 * Esto garantiza que los usuarios PWA nunca ejecuten JS viejo después de un deploy.
 * Sin esto, el SW v2 podía servir HTML cacheado con chunks JS desactualizados
 * aunque Vercel tuviera código nuevo (era la causa del bug "Unauthorized" persistente).
 *
 * El reload solo ocurre una vez por activación de SW (cuando realmente hay código nuevo).
 */

import { useEffect } from 'react'

export function ServiceWorkerUpdater() {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return

    // Recarga la página cuando el SW activo cambia (nuevo deploy detectado)
    // eslint-disable-next-line react-hooks/set-state-in-effect -- browser API listener, no setState involved
    const onControllerChange = () => {
      // Small delay so the new SW finishes claiming all clients before reload
      setTimeout(() => window.location.reload(), 200)
    }

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)
    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
    }
  }, [])

  // Renders nothing — side-effect only
  return null
}
