'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { motion } from 'framer-motion'
import { CheckCircle, Star, ArrowRight } from 'lucide-react'

export default function PaymentSuccessPage() {
  const router = useRouter()
  const supabase = createClient()
  const [destination, setDestination] = useState('/paciente')

  useEffect(() => {
    // Detect role so professionals land on their panel
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.replace('/login'); return }
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()
      // All roles use /paciente — the page detects role internally
      // but we store it for the button in case role is needed later
      setDestination('/paciente')

      // Auto-redirect after 5 seconds
      const t = setTimeout(() => router.push('/paciente'), 5000)
      return () => clearTimeout(t)
    }).catch(() => {
      const t = setTimeout(() => router.push('/paciente'), 5000)
      return () => clearTimeout(t)
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-[#F0F6FA] flex items-center justify-center p-6">
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
          className="w-20 h-20 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-5"
        >
          <CheckCircle size={36} className="text-green-500" />
        </motion.div>

        <h1 className="text-2xl font-black text-[#0C1F2C] mb-2">¡Pago exitoso!</h1>
        <p className="text-sm text-[#8BA5BE] mb-5">
          Tu plan está activo por los próximos 30 días. Disfruta de todas las funciones.
        </p>

        {/* Premium badge */}
        <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold px-4 py-2 rounded-full mb-6">
          <Star size={12} />
          Plan Premium activo
        </div>

        <button
          onClick={() => router.push(destination)}
          className="w-full py-3 bg-gradient-to-r from-[#0C3547] to-[#1a6fa0] text-white font-bold rounded-xl hover:opacity-90 transition flex items-center justify-center gap-2"
        >
          Ir a la app <ArrowRight size={15} />
        </button>

        <p className="text-[10px] text-[#B0C4D4] mt-4">Redirigiendo automáticamente en 5 segundos...</p>

        {/* Progress bar */}
        <div className="mt-3 h-1 bg-[#E2ECF4] rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: '100%' }}
            transition={{ duration: 5, ease: 'linear' }}
            className="h-full bg-[#29ABE2] rounded-full"
          />
        </div>
      </motion.div>
    </div>
  )
}
