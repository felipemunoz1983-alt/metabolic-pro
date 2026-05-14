'use client'

/**
 * TrialBanner — shown at the top of the patient dashboard when the user has
 * an active trial (trial_ends_at set and not expired) but no active premium.
 *
 * States:
 *  - > 3 days left  → calm blue / informational
 *  - 1–3 days left  → amber / urgent
 *  - 0 days left    → red / expired (shows upgrade CTA)
 *  - premium active → hidden (returns null)
 */

import { useMemo } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { Profile } from '@/types'

interface Props {
  profile: Profile
}

function daysRemaining(isoDate: string): number {
  const end = new Date(isoDate)
  const now = new Date()
  const diff = end.getTime() - now.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export function TrialBanner({ profile }: Props) {
  const state = useMemo(() => {
    // Premium active → hide
    const hasPremium = profile.premium_until && new Date(profile.premium_until) > new Date()
    if (hasPremium) return null

    // No trial → hide
    if (!profile.trial_ends_at) return null

    const days = daysRemaining(profile.trial_ends_at)

    if (days <= 0) {
      return { kind: 'expired' as const, days: 0 }
    }
    if (days <= 3) {
      return { kind: 'urgent' as const, days }
    }
    return { kind: 'active' as const, days }
  }, [profile])

  if (!state) return null

  if (state.kind === 'expired') {
    return (
      <div className="mx-4 mt-4 md:mx-0 md:mt-0">
        <div className={cn(
          'flex items-center justify-between gap-3 rounded-2xl px-4 py-3',
          'bg-red-50 border border-red-200'
        )}>
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-lg flex-shrink-0">⏰</span>
            <div className="min-w-0">
              <p className="text-sm font-black text-red-700 leading-tight">Tu trial expiró</p>
              <p className="text-xs text-red-500 leading-snug mt-0.5 hidden sm:block">
                Activa un plan para seguir con tu seguimiento nutricional.
              </p>
            </div>
          </div>
          <Link
            href="/upgrade"
            className="flex-shrink-0 bg-red-600 text-white text-xs font-black px-4 py-2 rounded-xl hover:bg-red-700 transition whitespace-nowrap"
          >
            Ver planes
          </Link>
        </div>
      </div>
    )
  }

  if (state.kind === 'urgent') {
    return (
      <div className="mx-4 mt-4 md:mx-0 md:mt-0">
        <div className={cn(
          'flex items-center justify-between gap-3 rounded-2xl px-4 py-3',
          'bg-amber-50 border border-amber-200'
        )}>
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-lg flex-shrink-0 animate-pulse">⚠️</span>
            <div className="min-w-0">
              <p className="text-sm font-black text-amber-800 leading-tight">
                {state.days === 1 ? '¡Último día de prueba!' : `${state.days} días de prueba restantes`}
              </p>
              <p className="text-xs text-amber-600 leading-snug mt-0.5 hidden sm:block">
                No pierdas tu progreso — activa tu plan hoy.
              </p>
            </div>
          </div>
          <Link
            href="/upgrade"
            className="flex-shrink-0 bg-amber-500 text-white text-xs font-black px-4 py-2 rounded-xl hover:bg-amber-600 transition whitespace-nowrap"
          >
            Activar plan
          </Link>
        </div>
      </div>
    )
  }

  // 'active' state — calm
  return (
    <div className="mx-4 mt-4 md:mx-0 md:mt-0">
      <div className={cn(
        'flex items-center justify-between gap-3 rounded-2xl px-4 py-3',
        'bg-[#EAF4FB] border border-[#29ABE2]/30'
      )}>
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-lg flex-shrink-0">🎯</span>
          <div className="min-w-0">
            <p className="text-sm font-black text-[#0C3547] leading-tight">
              {state.days} días de prueba gratuita
            </p>
            <p className="text-xs text-[#6B8FA8] leading-snug mt-0.5 hidden sm:block">
              Explora todas las funciones sin límites. Sin tarjeta de crédito.
            </p>
          </div>
        </div>
        <Link
          href="/upgrade"
          className="flex-shrink-0 bg-[#29ABE2] text-white text-xs font-black px-4 py-2 rounded-xl hover:bg-[#1a8fc2] transition whitespace-nowrap"
        >
          Ver planes →
        </Link>
      </div>
    </div>
  )
}
