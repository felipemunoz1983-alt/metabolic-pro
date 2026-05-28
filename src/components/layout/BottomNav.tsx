'use client'

import { cn } from '@/lib/utils'
import type { Profile } from '@/types'
import type { Tab } from './types'
import {
  LayoutDashboard, ClipboardList, Bot, History, Users, UserCircle, Lock, FileText,
} from 'lucide-react'
import { hasAccess } from '@/types'

const NAV_BASE: { id: Tab; icon: React.ElementType; label: string }[] = [
  { id: 'dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
  { id: 'plan',         icon: ClipboardList,   label: 'Nutrición' },
  { id: 'chat',         icon: Bot,             label: 'Asistente' },
  { id: 'evaluaciones', icon: FileText,        label: 'Evaluaciones' },
  { id: 'historial',    icon: History,         label: 'Historial' },
  { id: 'perfil',       icon: UserCircle,      label: 'Perfil' },
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
  const isPro = profile?.role === 'professional'

  // 'perfil' fue removido del bottom nav: ahora se accede tocando el avatar
  // circular de la esquina superior derecha (TopBar). Esto libera espacio en
  // el nav inferior y sigue el patrón estándar de apps móviles (Gmail, Twitter).
  //
  // Profesional: dashboard · plan · chat · pacientes (4 items, perfil → avatar arriba)
  //   sin 'evaluaciones' (lo gestiona desde Mis Pacientes)
  //   sin 'historial' (lo ve dentro del detalle de cada paciente)
  // Paciente / Individual: dashboard · plan · chat · evaluaciones (4 items, perfil → avatar arriba)
  //   sin 'historial' — vive como sub-vista DENTRO del tab "Nutrición" (toggle interno)
  const navItems = isPro
    ? [
        NAV_BASE.find(i => i.id === 'dashboard')!,
        NAV_BASE.find(i => i.id === 'plan')!,
        NAV_BASE.find(i => i.id === 'chat')!,
        NAV_PRO,
      ]
    : NAV_BASE.filter(i => i.id !== 'historial' && i.id !== 'perfil')

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
        const isPerfil  = item.id === 'perfil'

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
              {/* Avatar initial for perfil */}
              {isPerfil && profile ? (
                <div className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black transition-all',
                  isActive
                    ? 'bg-[#29ABE2]/30 text-[#29ABE2] border border-[#29ABE2]/50'
                    : 'bg-white/10 text-[#6B8FA8]'
                )}>
                  {profile.nombre?.charAt(0).toUpperCase() || 'U'}
                </div>
              ) : (
                <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
              )}
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
    </nav>
  )
}
