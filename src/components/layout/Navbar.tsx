'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import type { Profile } from '@/types'
import { cn } from '@/lib/utils'

export type Tab = 'plan' | 'dashboard' | 'chat' | 'historial'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'plan',      label: 'Plan',      icon: '📋' },
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'chat',      label: 'Chat IA',   icon: '🤖' },
  { id: 'historial', label: 'Historial', icon: '🗂️' },
]

interface Props {
  profile: Profile | null
  activeTab: Tab
  onTabChange: (tab: Tab) => void
}

export function Navbar({ profile, activeTab, onTabChange }: Props) {
  const supabase = createClient()

  return (
    <div>
      {/* Top bar */}
      <header className="bg-gradient-to-r from-[#081F2D] via-[#0C3547] to-[#0e4f6a] shadow-lg">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-gradient-to-br from-[#29ABE2] to-[#1a7fad] rounded-xl flex items-center justify-center text-white font-black text-sm flex-shrink-0">
            C|M
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-white leading-tight">
              Centro Metabólico <span className="text-[#29ABE2]">Pro</span>
            </h1>
            <p className="text-xs text-[#9EC8E0]">Motor clínico-comercial</p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            {profile && (
              <>
                <span className="text-sm text-[#9EC8E0] font-medium hidden sm:block">
                  {profile.nombre}
                </span>
                <span className={cn(
                  'text-xs font-bold px-2.5 py-1 rounded-full',
                  profile.plan === 'premium'
                    ? 'bg-amber-400 text-amber-900'
                    : 'bg-white/10 text-[#9EC8E0] border border-white/20'
                )}>
                  {profile.plan === 'premium' ? '⭐ Premium' : 'Gratuito'}
                </span>
              </>
            )}
            <button
              onClick={() => supabase.auth.signOut().then(() => window.location.href = '/login')}
              className="text-xs text-[#9EC8E0] border border-[#9EC8E0]/30 px-3 py-1.5 rounded-lg hover:bg-white/10 transition"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      {/* Tab bar */}
      <div className="bg-white border-b border-[#D6E3ED] shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 flex gap-1">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-3.5 text-sm font-semibold border-b-2 transition-all whitespace-nowrap',
                activeTab === tab.id
                  ? 'border-[#29ABE2] text-[#0C3547]'
                  : 'border-transparent text-[#6B7C93] hover:text-[#0C3547] hover:border-[#D6E3ED]'
              )}
            >
              <span>{tab.icon}</span>
              <span className="hidden sm:block">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
