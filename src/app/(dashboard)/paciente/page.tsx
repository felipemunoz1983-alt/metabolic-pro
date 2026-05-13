'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Navbar, type Tab } from '@/components/layout/Navbar'
import { PlanGenerator } from '@/components/plan/PlanGenerator'
import { PlanResult } from '@/components/plan/PlanResult'
import { CalorieDashboard } from '@/components/dashboard/CalorieDashboard'
import { ChatIA } from '@/components/chat/ChatIA'
import type { Profile } from '@/types'
import type { NutritionResult, FormData } from '@/lib/nutrition'
import { motion, AnimatePresence } from 'framer-motion'

export default function PacientePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('plan')
  const [result, setResult] = useState<NutritionResult | null>(null)
  const [formData, setFormData] = useState<FormData | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
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
      <Navbar profile={profile} activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="max-w-5xl mx-auto px-6 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
          >
            {/* Tab: Plan */}
            {activeTab === 'plan' && (
              result && formData ? (
                <PlanResult
                  result={result}
                  form={formData}
                  onReset={() => { setResult(null); setFormData(null) }}
                />
              ) : (
                <PlanGenerator onResult={handleResult} />
              )
            )}

            {/* Tab: Dashboard */}
            {activeTab === 'dashboard' && userId && (
              <CalorieDashboard
                userId={userId}
                targetKcal={result?.kcal ? Math.round(result.kcal) : 2000}
              />
            )}

            {/* Tab: Chat IA */}
            {activeTab === 'chat' && (
              <ChatIA
                userName={profile?.nombre || 'Paciente'}
                targetKcal={result?.kcal ? Math.round(result.kcal) : undefined}
                objetivo={formData?.objetivo}
              />
            )}

            {/* Tab: Historial */}
            {activeTab === 'historial' && (
              <div className="bg-white rounded-2xl border border-[#D6E3ED] p-8 text-center">
                <p className="text-4xl mb-3">🗂️</p>
                <h3 className="text-lg font-bold text-[#0C3547] mb-2">Historial de Planes</h3>
                <p className="text-[#6B7C93] text-sm">Próximamente — Memoria de planes anteriores</p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
}
