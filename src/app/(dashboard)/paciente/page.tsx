'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import type { Profile } from '@/types'
import { motion } from 'framer-motion'

export default function PacientePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      setProfile(data)
    }
    load()
  }, [])

  return (
    <div className="min-h-screen bg-[#F0F4F8]">
      {/* Header */}
      <header className="bg-gradient-to-r from-[#081F2D] via-[#0C3547] to-[#0e4f6a] shadow-lg">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center gap-4">
          <div className="w-11 h-11 bg-gradient-to-br from-[#29ABE2] to-[#1a7fad] rounded-xl flex items-center justify-center text-white font-black text-base">
            C|M
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-white">
              Centro Metabólico <span className="text-[#29ABE2]">Pro</span>
            </h1>
            <p className="text-xs text-[#9EC8E0]">Generador de Plan Nutricional</p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            {profile && (
              <span className="text-sm text-[#9EC8E0] font-medium">
                {profile.nombre}
              </span>
            )}
            <button
              onClick={() => supabase.auth.signOut().then(() => window.location.href = '/login')}
              className="text-xs text-[#9EC8E0] border border-[#9EC8E0]/30 px-3 py-1.5 rounded-lg hover:bg-white/10 transition"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-6 py-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {/* Plan nutricional */}
          <div className="bg-white rounded-2xl border border-[#D6E3ED] shadow p-6 col-span-full">
            <h2 className="text-lg font-bold text-[#0C3547] mb-2">📋 Tu Plan Nutricional</h2>
            <p className="text-sm text-[#6B7C93]">Aquí se mostrará tu plan nutricional personalizado.</p>
          </div>

          {/* Dashboard calorías */}
          <div className="bg-white rounded-2xl border border-[#D6E3ED] shadow p-6">
            <h2 className="text-base font-bold text-[#0C3547] mb-2">📊 Dashboard calórico</h2>
            <p className="text-sm text-[#6B7C93]">Registro diario de adherencia.</p>
          </div>

          {/* Chat IA */}
          <div className="bg-white rounded-2xl border border-[#D6E3ED] shadow p-6">
            <h2 className="text-base font-bold text-[#0C3547] mb-2">🤖 Chat IA Nutricional</h2>
            <p className="text-sm text-[#6B7C93]">Consulta a tu nutricionista virtual 24/7.</p>
          </div>

          {/* Plan Premium */}
          <div className="bg-gradient-to-br from-[#0C3547] to-[#145272] rounded-2xl shadow p-6 text-white">
            <h2 className="text-base font-bold mb-2">⭐ Plan Premium</h2>
            <p className="text-sm text-[#9EC8E0] mb-4">Desbloquea todas las funciones.</p>
            <button className="bg-[#29ABE2] text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-[#1a9ed4] transition">
              Ver planes
            </button>
          </div>
        </motion.div>
      </main>
    </div>
  )
}
