'use client'

import { cn } from '@/lib/utils'
import type { Profile } from '@/types'
import type { Tab } from './types'
import {
  LayoutDashboard, ClipboardList, Bot, History, Users, LogOut, Lock,
} from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { hasAccess } from '@/types'

const NAV_BASE: { id: Tab; icon: React.ElementType; label: string }[] = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { id: 'plan',      icon: ClipboardList,   label: 'Nutrición' },
  { id: 'chat',      icon: Bot,             label: 'Asistente' },
  { id: 'historial', icon: History,         label: 'Historial' },
]

const NAV_PRO: { id: Tab; icon: React.ElementType; label: string } = {
  id: 'pacientes', icon: Users, label: 'Pacientes',
}

interface Props {
  profile: Profile | null
  activeTab: Tab
  onTabChange: (tab: Tab) => void
}

const GATED_TABS: Tab[] = ['chat']

export function BottomNav({ profile, activeTab, onTabChange }: Props) {
  const supabase = createClient()
  const isPro = profile?.role === 'professional'
  const navItems = isPro ? [...NAV_BASE, NAV_PRO] : NAV_BASE
  const userHasAccess = profile ? hasAccess(profile) : false

  return (
    <nav
      style={{ backgroundColor: '#060F1A' }}
      className="fixed bottom-0 left-0 right-0 z-40 flex items-stretch border-t border-white/10 md:hidden"
      role="navigation"
      aria-label="Navegación principal"
    >
      {navItems.map(item => {
        const Icon = item.icon
        const isActive = activeTab === item.id
        const isLocked = GATED_TABS.includes(item.id) && !userHasAccess
        return (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={cn(
              'flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 transition-all relative',
              isActive
                ? 'text-[#29ABE2]'
                : isLocked
                ? 'text-[#2A3F50]'
                : 'text-[#3D5A70] hover:text-[#6B8FA8]'
            )}
          >
            <div className={cn(
              'w-8 h-8 flex items-center justify-center rounded-xl transition-all relative',
              isActive ? 'bg-[#29ABE2]/15' : ''
            )}>
              <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
              {isLocked && (
                <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-500 rounded-full flex items-center justify-center">
                  <Lock size={7} className="text-white" />
                </div>
              )}
            </div>
            <span className="text-[9px] font-semibold leading-none">{item.label}</span>
            {isActive && (
              <span className="absolute bottom-0 w-8 h-0.5 bg-[#29ABE2] rounded-t-full" />
            )}
          </button>
        )
      })}

      {/* Sign out — compact */}
      <button
        onClick={() => supabase.auth.signOut().then(() => window.location.href = '/login')}
        className="flex-none px-3 flex flex-col items-center justify-center gap-0.5 py-2.5 text-[#3D5A70] hover:text-red-400 transition-colors"
      >
        <div className="w-8 h-8 flex items-center justify-center rounded-xl">
          <LogOut size={16} />
        </div>
        <span className="text-[9px] font-semibold leading-none">Salir</span>
      </button>
    </nav>
  )
}
