'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { motion } from 'framer-motion'
import { XCircle, RotateCcw, MessageCircle, ChevronLeft } from 'lucide-react'

const REASON_MSG: Record<string, { title: string; body: string }> = {
  cancelled: {
    title: 'Pago cancelado',
    body:  'Cancelaste el proceso antes de completarlo. No se realizó ningún cobro.',
  },
  rejected: {
    title: 'Pago rechazado',
    body:  'Transbank rechazó el pago. Verifica los datos de tu tarjeta e intenta nuevamente.',
  },
  not_found: {
    title: 'Pago no encontrado',
    body:  'No encontramos el registro del pago. Si se realizó un cobro, contáctanos de inmediato.',
  },
  error: {
    title: 'Error en el proceso',
    body:  'Ocurrió un error inesperado. Intenta nuevamente o contáctanos por WhatsApp.',
  },
}

function FailedContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const reason = searchParams.get('reason') ?? 'error'
  const { title, body } = REASON_MSG[reason] ?? REASON_MSG.error

  return (
    <div className="w-full max-w-sm relative z-10">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="bg-white rounded-3xl shadow-2xl overflow-hidden"
      >
        {/* Top accent */}
        <div className="h-1.5 bg-gradient-to-r from-red-400 via-red-500 to-red-400" />

        <div className="p-6 md:p-8">
          {/* Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.1 }}
            className="w-20 h-20 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-5"
          >
            <XCircle size={40} className="text-red-500" />
          </motion.div>

          <div className="text-center mb-6">
            <h1 className="text-2xl font-black text-[#0C1F2C] mb-2">{title}</h1>
            <p className="text-sm text-[#6B8FA8] leading-relaxed">{body}</p>
          </div>

          {/* Tip box */}
          {reason === 'rejected' && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5 text-xs text-amber-800 space-y-1.5">
              <p className="font-black text-amber-700 mb-1">Posibles causas:</p>
              {[
                'Fondos insuficientes en la cuenta',
                'Tarjeta bloqueada para compras online',
                'Límite de compra diario alcanzado',
                'Datos de la tarjeta incorrectos',
              ].map(tip => (
                <div key={tip} className="flex items-start gap-1.5">
                  <span className="text-amber-500 mt-0.5">·</span>
                  <span>{tip}</span>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={() => router.push('/upgrade')}
              className="w-full py-3.5 bg-gradient-to-r from-[#0C3547] to-[#1a6fa0] text-white font-black rounded-2xl hover:opacity-90 transition flex items-center justify-center gap-2"
            >
              <RotateCcw size={15} />
              Intentar nuevamente
            </button>

            <button
              onClick={() => router.push('/paciente')}
              className="w-full py-3 border border-[#E2ECF4] text-[#8BA5BE] text-sm font-bold rounded-2xl hover:border-[#29ABE2] hover:text-[#29ABE2] transition flex items-center justify-center gap-1.5"
            >
              <ChevronLeft size={14} />
              Volver a la app
            </button>

            <a
              href={`https://wa.me/${process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP ?? '56900000000'}?text=${encodeURIComponent('Hola, tuve un problema con mi pago en Centro Metabólico Pro.')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 flex items-center justify-center gap-2 text-xs text-[#B0C4D4] hover:text-[#25D366] transition"
            >
              <MessageCircle size={13} />
              Contactar soporte por WhatsApp
            </a>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default function PaymentFailedPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#060F1A] via-[#0C1F2C] to-[#0C3547] flex items-center justify-center p-4">
      <Suspense fallback={
        <div className="w-8 h-8 border-2 border-[#29ABE2] border-t-transparent rounded-full animate-spin" />
      }>
        <FailedContent />
      </Suspense>
    </div>
  )
}
