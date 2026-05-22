'use client'

/**
 * PWAInstallBanner — banner flotante que aparece cuando el navegador
 * soporta instalación de PWA (Chrome/Edge en Android o desktop).
 *
 * En iOS muestra instrucciones para "Agregar a pantalla de inicio" via Safari.
 * Se cierra y recuerda en localStorage para no molestar dos veces.
 */

import { useState, useEffect } from 'react'
import { usePWAInstall } from '@/hooks/usePWAInstall'

const DISMISSED_KEY = 'pwa_install_dismissed'

export function PWAInstallBanner() {
  const { installState, promptInstall } = usePWAInstall()
  const [visible, setVisible] = useState(false)

  // Reacting to installState from external browser API — setState inside effect is intentional.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (installState === 'installed') { setVisible(false); return }
    if (installState === 'unsupported') return

    const dismissed = localStorage.getItem(DISMISSED_KEY)
    if (dismissed) return

    // Mostrar con leve retraso para no bloquear el primer render
    const t = setTimeout(() => setVisible(true), 2000)
    return () => clearTimeout(t)
  }, [installState])
  /* eslint-enable react-hooks/set-state-in-effect */

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, '1')
    setVisible(false)
  }

  const handleInstall = async () => {
    await promptInstall()
    dismiss()
  }

  if (!visible) return null

  // ── iOS: instrucciones manuales ───────────────────────────────────────────
  if (installState === 'ios') {
    return (
      <div
        role="banner"
        className="fixed bottom-20 left-4 right-4 z-50 rounded-2xl bg-[#0C1F2C] border border-[#1DAEEC]/30 shadow-2xl p-4 animate-in slide-in-from-bottom-4 duration-300"
      >
        <button
          onClick={dismiss}
          className="absolute top-3 right-3 text-[#8BAAB8] hover:text-white transition-colors"
          aria-label="Cerrar"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>

        <div className="flex items-start gap-3 pr-6">
          {/* App icon */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon-192.png" alt="App icon" className="w-12 h-12 rounded-xl flex-shrink-0" />

          <div>
            <p className="text-white text-sm font-semibold mb-0.5">
              Instala Centro Metabólico
            </p>
            <p className="text-[#8BAAB8] text-xs leading-relaxed">
              Toca{' '}
              <span className="inline-flex items-center gap-0.5 text-[#1DAEEC]">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
                </svg>
                Compartir
              </span>{' '}
              y luego <strong className="text-white">«Agregar a pantalla de inicio»</strong>
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ── Chrome/Android: banner nativo ─────────────────────────────────────────
  return (
    <div
      role="banner"
      className="fixed bottom-20 left-4 right-4 z-50 rounded-2xl bg-[#0C1F2C] border border-[#1DAEEC]/30 shadow-2xl p-4 animate-in slide-in-from-bottom-4 duration-300"
    >
      <button
        onClick={dismiss}
        className="absolute top-3 right-3 text-[#8BAAB8] hover:text-white transition-colors"
        aria-label="Cerrar"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      <div className="flex items-center gap-3 pr-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon-192.png" alt="App icon" className="w-12 h-12 rounded-xl flex-shrink-0" />

        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-semibold truncate">
            Centro Metabólico Pro
          </p>
          <p className="text-[#8BAAB8] text-xs">
            Instala la app para acceso rápido
          </p>
        </div>

        <button
          onClick={handleInstall}
          className="flex-shrink-0 px-4 py-2 rounded-xl bg-[#1DAEEC] text-white text-sm font-medium hover:bg-[#039CE0] transition-colors"
        >
          Instalar
        </button>
      </div>
    </div>
  )
}
