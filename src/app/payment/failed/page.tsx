'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { motion } from 'framer-motion'
import { XCircle, RotateCcw, MessageCircle } from 'lucide-react'

const REASON_MSG: Record<string, string> = {
  cancelled: 'Cancelaste el pago antes de completarlo.',
  rejected:  'El pago fue rechazado por Transbank. Verifica tu tarjeta e intenta nuevamente.',
  not_found: 'No encontramos el registro del pago. Contacta soporte si el cargo se realizo.',
  error:     'Ocurrio un error inesperado. Intenta nuevamente o contacta soporte.',
}

function FailedContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const reason = searchParams.get('reason') ?? 'error'
  const msg = REASON_MSG[reason] ?? REASON_MSG.error

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', duration: 0.6 }}
      className="w-full max-w-sm bg-white rounded-2xl border border-[#E2ECF4] p-8 text-center shadow-sm"
    >
      {/* Icon */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', delay: 0.2, stiffness: 200 }}
        className="w-20 h-20 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-5"
      >
        <XCircle size={36} className="text-red-500" />
      </motion.div>

      <h1 className="text-2xl font-black text-[#0C1F2C] mb-2">Pago no completado</h1>
      <p className="text-sm text-[#8BA5BE] mb-6">{msg}</p>

      <div className="space-y-3">
        <button
          onClick={() => router.push('/upgrade')}
          className="w-full py-3 bg-gradient-to-r from-[#0C3547] to-[#1a6fa0] text-white font-bold rounded-xl hover:opacity-90 transition flex items-center justify-center gap-2"
        >
          <RotateCcw size={15} /> Intentar nuevamente
        </button>

        <button
          onClick={() => router.push('/paciente')}
          className="w-full py-2.5 border border-[#E2ECF4] text-[#8BA5BE] text-sm font-semibold rounded-xl hover:border-[#29ABE2] hover:text-[#29ABE2] transition"
        >
          Volver a la app
        </button>

        <a
          href="https://wa.me/56900000000"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-2.5 flex items-center justify-center gap-2 text-xs text-[#B0C4D4] hover:text-[#25D366] transition"
        >
          <MessageCircle size={13} /> Necesito ayuda
        </a>
      </div>
    </motion.div>
  )
}

export default function PaymentFailedPage() {
  return (
    <div className="min-h-screen bg-[#F0F6FA] flex items-center justify-center p-6">
      <Suspense fallback={<div className="text-[#8BA5BE] text-sm">Cargando...</div>}>
        <FailedContent />
      </Suspense>
    </div>
  )
}
