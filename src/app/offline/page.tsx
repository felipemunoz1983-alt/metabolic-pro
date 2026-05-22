'use client'

/**
 * Página offline — se muestra cuando el usuario no tiene conexión
 * y navega a una ruta que no está en el cache del service worker.
 */
export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-[#060F1A] flex flex-col items-center justify-center px-6 text-center">
      {/* Icon */}
      <div className="w-20 h-20 rounded-2xl bg-[#0C1F2C] border border-[#1DAEEC]/20 flex items-center justify-center mb-6">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-10 h-10 text-[#1DAEEC]/60"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z"
          />
        </svg>
      </div>

      <h1 className="text-2xl font-semibold text-white mb-2">
        Sin conexión
      </h1>
      <p className="text-[#8BAAB8] text-sm max-w-xs leading-relaxed mb-8">
        No tienes acceso a internet en este momento. Tus datos registrados están guardados y se sincronizarán cuando vuelvas a conectarte.
      </p>

      <button
        onClick={() => window.location.reload()}
        className="px-6 py-3 rounded-xl bg-[#1DAEEC] text-white text-sm font-medium hover:bg-[#039CE0] transition-colors"
      >
        Intentar de nuevo
      </button>
    </div>
  )
}
