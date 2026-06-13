'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'

/**
 * Landing pre-auth: pantalla splash con video de fondo y 2 CTAs.
 * Inspirada en pattern de apps premium (ej. DOT Experience).
 *
 * UX:
 *  - Video autoplay + loop + muted + playsInline (requisito iOS Safari)
 *  - Poster WebP como fallback mientras carga el video (~70 KB)
 *  - Overlay oscuro garantiza contraste del logo y los botones
 *  - 2 CTAs grandes y blancos al pie: login / registro
 */
export default function AuthLandingPage() {
  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden bg-black">
      {/* Video de fondo */}
      <video
        autoPlay
        loop
        muted
        playsInline
        poster="/video/auth-landing-poster.webp"
        className="absolute inset-0 w-full h-full object-cover"
        aria-hidden="true"
      >
        <source src="/video/auth-landing.mp4" type="video/mp4" />
      </video>

      {/* Overlay oscuro para legibilidad */}
      <div
        className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/70 pointer-events-none"
        aria-hidden="true"
      />

      {/* Contenido */}
      <div className="relative z-10 flex flex-col min-h-[100dvh] px-6 pt-16 pb-10 sm:pb-14">
        {/* Logo + branding arriba */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-center"
        >
          <p className="text-[11px] uppercase tracking-[0.3em] text-white/80 font-semibold mb-2">
            Centro Metabólico
          </p>
          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight">
            PRO
          </h1>
          <p className="text-sm text-white/70 mt-3 max-w-xs mx-auto leading-relaxed">
            Plan nutricional personalizado, validado clínicamente.
          </p>
        </motion.div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Botones al pie */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="flex flex-col gap-3 w-full max-w-md mx-auto"
        >
          <Link
            href="/login"
            className="w-full bg-white text-[#0C3547] font-bold text-base py-4 rounded-2xl text-center shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-transform"
          >
            Iniciar sesión
          </Link>
          <Link
            href="/register"
            className="w-full bg-white/95 text-[#0C3547] font-bold text-base py-4 rounded-2xl text-center shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-transform"
          >
            Únete a nuestro programa
          </Link>
          <p className="text-center text-[11px] text-white/60 mt-2">
            Al continuar aceptas nuestros términos y política de privacidad.
          </p>
        </motion.div>
      </div>
    </div>
  )
}
