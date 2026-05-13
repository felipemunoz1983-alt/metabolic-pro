'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { PlanGenerator } from '@/components/plan/PlanGenerator'
import { PlanResult } from '@/components/plan/PlanResult'
import type { Profile } from '@/types'
import type { NutritionResult, FormData } from '@/lib/nutrition'
import { motion } from 'framer-motion'

export default function PacientePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [result, setResult] = useState<NutritionResult | null>(null)
  const [formData, setFormData] = useState<FormData | null>(null)
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

  function handleResult(r: NutritionResult, f: FormData) {
    setResult(r)
    setFormData(f)
  }

  return (
    <div className="min-h-screen bg-[#F0F4F8]">
      {/* Header */}
      <header className="bg-gradient-to-r from-[#081F2D] via-[#0C3547] to-[#0e4f6a] shadow-lg">
        <div className="max-w-4xl mx-auto px-6 py-5 flex items-center gap-4">
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
              <span className="text-sm text-[#9EC8E0] font-medium">{profile.nombre}</span>
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
      <main className="max-w-4xl mx-auto px-6 py-10">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          {result && formData ? (
            <PlanResult
              result={result}
              form={formData}
              onReset={() => { setResult(null); setFormData(null) }}
            />
          ) : (
            <PlanGenerator onResult={handleResult} />
          )}
        </motion.div>
      </main>
    </div>
  )
}
