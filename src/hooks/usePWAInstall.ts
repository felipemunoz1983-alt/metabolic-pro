'use client'

/**
 * usePWAInstall — detecta si el navegador puede instalar la app como PWA
 * y expone una función `promptInstall()` para disparar el banner nativo.
 *
 * Compatible con Chrome/Edge en Android y desktop.
 * En iOS, Safari no dispara beforeinstallprompt — mostramos instrucciones manuales.
 */

import { useCallback, useEffect, useState } from 'react'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export type InstallState = 'unsupported' | 'available' | 'installed' | 'ios'

export interface UsePWAInstallResult {
  installState:  InstallState
  promptInstall: () => Promise<void>
}

export function usePWAInstall(): UsePWAInstallResult {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [installState,   setInstallState]   = useState<InstallState>('unsupported')

  // Feature detection at mount — setState calls inside effect body are intentional here
  // (reading browser APIs unavailable at render time). Pattern mirrors usePushNotifications.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Detect iOS — no beforeinstallprompt, user must use "Add to Home Screen" manually
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
    const isInStandalone = ('standalone' in navigator && (navigator as unknown as Record<string,unknown>).standalone === true)
      || window.matchMedia('(display-mode: standalone)').matches

    if (isInStandalone) {
      setInstallState('installed')
      return
    }

    if (isIOS) {
      setInstallState('ios')
      return
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setInstallState('available')
    }

    window.addEventListener('beforeinstallprompt', handler)

    window.addEventListener('appinstalled', () => {
      setInstallState('installed')
      setDeferredPrompt(null)
    })

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])
  /* eslint-enable react-hooks/set-state-in-effect */

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setInstallState('installed')
    setDeferredPrompt(null)
  }, [deferredPrompt])

  return { installState, promptInstall }
}
