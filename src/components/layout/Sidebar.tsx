'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { Profile } from '@/types'
import type { Tab } from './types'
import {
  LayoutDashboard,
  ClipboardList,
  Bot,
  History,
  ChevronLeft,
  ChevronRight,
  Activity,
  Users,
  Star,
  Clock,
  Lock,
  UserCircle,
} from 'lucide-react'
import { isOnTrial, trialDaysLeft, hasAccess, isPlanExpired } from '@/types'

const NAV_BASE: { id: Tab; label: string; icon: React.ElementType; sublabel: string }[] = [
  { id: 'dashboard', label: 'Dashboard',    icon: LayoutDashboard, sublabel: 'Registro diario' },
  { id: 'plan',      label: 'Nutrición',    icon: ClipboardList,   sublabel: 'Plan alimentario' },
  { id: 'chat',      label: 'Asistente IA', icon: Bot,             sublabel: 'Consulta clínica' },
  { id: 'historial', label: 'Historial',    icon: History,         sublabel: 'Planes anteriores' },
  { id: 'perfil',    label: 'Mi Perfil',    icon: UserCircle,      sublabel: 'Cuenta y suscripción' },
]

const NAV_PRO: { id: Tab; label: string; icon: React.ElementType; sublabel: string } = {
  id: 'pacientes', label: 'Mis Pacientes', icon: Users, sublabel: 'Panel profesional',
}

interface Props {
  profile: Profile | null
  activeTab: Tab
  onTabChange: (tab: Tab) => void
}

export function Sidebar({ profile, activeTab, onTabChange }: Props) {
  const [collapsed, setCollapsed] = useState(false)

  const isPro = profile?.role === 'professional'
  const navItems = isPro ? [...NAV_BASE, NAV_PRO] : NAV_BASE

  return (
    <aside
      style={{
        width: collapsed ? '68px' : '220px',
        minWidth: collapsed ? '68px' : '220px',
        backgroundColor: '#060F1A',
        flexShrink: 0,
        transition: 'width 0.3s, min-width 0.3s',
      }}
      className="relative flex flex-col h-full border-r border-white/5"
    >
      {/* Toggle */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className="absolute -right-3 top-6 z-10 w-6 h-6 bg-[#29ABE2] rounded-full flex items-center justify-center shadow-lg text-white hover:bg-[#1a8fc2] transition"
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>

      {/* Logo */}
      <div className={cn('flex items-center gap-3 px-4 py-5 border-b border-white/5', collapsed && 'justify-center px-0')}>
        <div className="w-9 h-9 bg-gradient-to-br from-[#29ABE2] to-[#1a6fa0] rounded-xl flex items-center justify-center text-white font-black text-xs flex-shrink-0 shadow-lg shadow-[#29ABE2]/20">
          <Activity size={16} />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-[11px] font-extrabold text-white leading-tight whitespace-nowrap">Centro Metabólico</p>
            <p className="text-[10px] text-[#29ABE2] font-bold tracking-wider">PRO</p>
          </div>
        )}
      </div>

      {/* Rol badge */}
      {isPro && !collapsed && (
        <div className="mx-3 mt-3 mb-0 px-2.5 py-1.5 bg-[#29ABE2]/10 border border-[#29ABE2]/20 rounded-lg">
          <p className="text-[9px] font-bold text-[#29ABE2] uppercase tracking-widest">👨‍⚕️ Profesional</p>
        </div>
      )}

      {/* Label sección */}
      {!collapsed && (
        <div className="px-4 pt-4 pb-2">
          <p className="text-[9px] font-bold text-[#3D5A70] uppercase tracking-widest">Navegación</p>
        </div>
      )}

      {/* Nav items */}
      <nav className="flex-1 px-2 space-y-1 mt-2">
        {navItems.map(item => {
          const Icon = item.icon
          const isActive = activeTab === item.id
          const isPacientes = item.id === 'pacientes'
          const isLocked = item.id === 'chat' && profile ? !hasAccess(profile) : false
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              title={collapsed ? (isLocked ? `${item.label} — Plan de pago requerido` : item.label) : undefined}
              className={cn(
                'w-full flex items-center gap-3 rounded-xl transition-all duration-150 text-left group',
                collapsed ? 'justify-center p-2.5' : 'px-3 py-2.5',
                isActive
                  ? 'bg-[#29ABE2]/15 text-[#29ABE2]'
                  : isPacientes
                  ? 'text-[#6B8FA8] hover:bg-emerald-500/10 hover:text-emerald-400'
                  : isLocked
                  ? 'text-[#2A3F50] hover:bg-white/5 hover:text-[#4A6070]'
                  : 'text-[#6B8FA8] hover:bg-white/5 hover:text-white'
              )}
            >
              <div className={cn(
                'flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-lg transition-all relative',
                isActive ? 'bg-[#29ABE2]/20' : 'group-hover:bg-white/5'
              )}>
                <Icon size={15} strokeWidth={isActive ? 2.5 : 2} />
                {isLocked && (
                  <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-500 rounded-full flex items-center justify-center">
                    <Lock size={7} className="text-white" />
                  </div>
                )}
              </div>

              {!collapsed && (
                <div className="overflow-hidden flex-1">
                  <p className={cn('text-[12px] font-semibold leading-tight', isActive && 'font-bold')}>{item.label}</p>
                  <p className="text-[10px] text-[#3D5A70] leading-tight mt-0.5">
                    {isLocked ? 'Plan de pago requerido' : item.sublabel}
                  </p>
                </div>
              )}

              {isActive && !collapsed && (
                <div className="w-1 h-5 bg-[#29ABE2] rounded-full ml-auto flex-shrink-0" />
              )}
            </button>
          )
        })}
      </nav>

      {/* Renewal CTA — for users with expired paid plans */}
      {profile && isPlanExpired(profile) && (
        collapsed ? (
          <div className="flex justify-center mb-2">
            <a href="/upgrade" title="Renovar plan" className="w-8 h-8 bg-orange-500/20 border border-orange-500/30 rounded-lg flex items-center justify-center hover:border-orange-400/60 transition">
              <Star size={13} className="text-orange-400" />
            </a>
          </div>
        ) : (
          <div className="mx-3 mb-3">
            <a href="/upgrade" className="flex items-center gap-2 bg-gradient-to-r from-orange-500/20 to-orange-600/10 border border-orange-500/30 rounded-xl px-3 py-2.5 hover:border-orange-400/60 transition">
              <Star size={13} className="text-orange-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black text-orange-400 leading-tight">Plan expirado</p>
                <p className="text-[9px] text-orange-600/80">Renovar para seguir</p>
              </div>
            </a>
          </div>
        )
      )}

      {/* Trial countdown or Upgrade CTA — only for gratuito users */}
      {profile?.plan === 'gratuito' && (() => {
        const onTrial = profile.trial_ends_at ? isOnTrial(profile) : false
        const daysLeft = profile.trial_ends_at ? trialDaysLeft(profile) : 0
        const price = profile?.role === 'professional' ? '$14.990' : profile?.professional_id ? '$7.000' : '$12.990'

        if (onTrial && !collapsed) {
          return (
            <div className="mx-3 mb-3">
              <a
                href="/upgrade"
                className="flex items-center gap-2 bg-gradient-to-r from-[#29ABE2]/10 to-[#1a6fa0]/10 border border-[#29ABE2]/30 rounded-xl px-3 py-2.5 hover:border-[#29ABE2]/60 transition group"
              >
                <Clock size={13} className="text-[#29ABE2] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black text-[#29ABE2] leading-tight">
                    {daysLeft === 0 ? 'Prueba finalizada hoy' : `${daysLeft} día${daysLeft !== 1 ? 's' : ''} de prueba`}
                  </p>
                  <p className="text-[9px] text-[#4A7A94]">Activar plan {price}/mes</p>
                </div>
              </a>
            </div>
          )
        }

        if (onTrial && collapsed) {
          return (
            <div className="flex justify-center mb-2">
              <a href="/upgrade" title={`${daysLeft} días de prueba`} className="w-8 h-8 bg-[#29ABE2]/20 border border-[#29ABE2]/30 rounded-lg flex items-center justify-center hover:border-[#29ABE2]/60 transition">
                <Clock size={13} className="text-[#29ABE2]" />
              </a>
            </div>
          )
        }

        // No trial (or expired) — show upgrade CTA
        if (!collapsed) {
          return (
            <div className="mx-3 mb-3">
              <a
                href="/upgrade"
                className="flex items-center gap-2 bg-gradient-to-r from-amber-500/20 to-amber-600/10 border border-amber-500/30 rounded-xl px-3 py-2.5 hover:border-amber-400/60 transition group"
              >
                <Star size={13} className="text-amber-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black text-amber-400 leading-tight">Activar plan</p>
                  <p className="text-[9px] text-amber-600/80">{price}/mes</p>
                </div>
              </a>
            </div>
          )
        }

        return (
          <div className="flex justify-center mb-2">
            <a href="/upgrade" title="Activar plan" className="w-8 h-8 bg-amber-500/20 border border-amber-500/30 rounded-lg flex items-center justify-center hover:border-amber-400/60 transition">
              <Star size={13} className="text-amber-400" />
            </a>
          </div>
        )
      })()}

      {/* User mini-card at bottom */}
      {profile && (
        <div className={cn('border-t border-white/5 p-3', collapsed && 'flex justify-center')}>
          {!collapsed ? (
            <button
              onClick={() => onTabChange('perfil')}
              className="w-full flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-white/5 transition text-left group"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#29ABE2]/30 to-[#1a6fa0]/30 border border-[#29ABE2]/30 flex items-center justify-center flex-shrink-0">
                <span className="text-[11px] font-bold text-[#29ABE2]">
                  {profile.nombre?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <div className="overflow-hidden flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-white truncate">{profile.nombre || 'Usuario'}</p>
                <span className={cn(
                  'text-[9px] font-bold px-1.5 py-0.5 rounded-full inline-block mt-0.5',
                  isPlanExpired(profile) ? 'bg-orange-500/20 text-orange-400'
                    : profile.plan !== 'gratuito' ? 'bg-amber-500/20 text-amber-400'
                    : 'bg-white/10 text-[#6B8FA8]'
                )}>
                  {isPlanExpired(profile) ? '⚠ Expirado'
                    : profile.plan === 'professional' ? '⭐ Profesional'
                    : profile.plan === 'patient' ? '⭐ Paciente'
                    : profile.plan === 'individual' ? '⭐ Individual'
                    : 'Gratuito'}
                </span>
              </div>
              <ChevronRight size={12} className="text-[#3D5A70] group-hover:text-white transition flex-shrink-0" />
            </button>
          ) : (
            <button
              onClick={() => onTabChange('perfil')}
              title="Mi Perfil"
              className="w-9 h-9 rounded-full bg-gradient-to-br from-[#29ABE2]/30 to-[#1a6fa0]/30 border border-[#29ABE2]/30 flex items-center justify-center hover:border-[#29ABE2]/60 transition"
            >
              <span className="text-[11px] font-bold text-[#29ABE2]">
                {profile.nombre?.charAt(0).toUpperCase() || 'U'}
              </span>
            </button>
          )}
        </div>
      )}
    </aside>
  )
}
