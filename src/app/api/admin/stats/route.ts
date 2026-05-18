/**
 * GET /api/admin/stats
 * Returns all KPIs for the admin dashboard.
 * Protected: only accessible by the configured ADMIN_EMAIL.
 * Uses service client → bypasses RLS → full data access.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { getAuthUser } from '@/lib/auth-server'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'felipe.munoz1983@gmail.com'

export async function GET(_req: NextRequest): Promise<NextResponse> {
  // Auth guard — must be the admin user
  const user = await getAuthUser()
  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = createServiceClient()
  const now = new Date()

  // ── Date helpers ─────────────────────────────────────────────────────────────
  const startOfToday  = new Date(now); startOfToday.setHours(0, 0, 0, 0)
  const startOfMonth  = new Date(now.getFullYear(), now.getMonth(), 1)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000)
  const sevenDaysAgo  = new Date(now.getTime() - 7  * 86_400_000)

  const isoMonth  = startOfMonth.toISOString()
  const iso30d    = thirtyDaysAgo.toISOString()
  const iso7d     = sevenDaysAgo.toISOString()

  const fourteenDaysAgo = new Date(now.getTime() - 14 * 86_400_000)
  const iso14d = fourteenDaysAgo.toISOString()

  // ── Parallel fetches ──────────────────────────────────────────────────────────
  const [
    { data: allProfiles },
    { data: payments },
    { data: newUsersRaw },
    { data: logsRaw },
    { data: logs14dRaw },
    { data: logs30dRaw },
    { data: allLogsForChurn },
    { data: plansRaw },
  ] = await Promise.all([
    // All profiles
    supabase.from('profiles').select('id, nombre, email, role, plan, trial_ends_at, premium_until, created_at'),
    // All approved payments
    supabase.from('payments').select('id, amount, plan_type, user_id, created_at')
      .eq('status', 'approved').order('created_at', { ascending: false }),
    // New users last 30 days (for chart)
    supabase.from('profiles').select('created_at')
      .gte('created_at', iso30d).order('created_at', { ascending: true }),
    // Active users last 7 days
    supabase.from('registros_diarios').select('user_id').gte('fecha', iso7d.split('T')[0]),
    // Active users last 14 days
    supabase.from('registros_diarios').select('user_id').gte('fecha', iso14d.split('T')[0]),
    // Active users last 30 days
    supabase.from('registros_diarios').select('user_id').gte('fecha', iso30d.split('T')[0]),
    // All logs last 30d (for churn risk: last log date per user)
    supabase.from('registros_diarios').select('user_id, fecha')
      .gte('fecha', iso30d.split('T')[0]).order('fecha', { ascending: false }),
    // Users with at least one plan (engagement funnel)
    supabase.from('planes_nutricionales').select('user_id'),
  ])

  const profiles = allProfiles ?? []
  const pays     = payments ?? []

  // ── Profile breakdowns ────────────────────────────────────────────────────────
  const total         = profiles.length
  const professionals = profiles.filter(p => p.role === 'professional').length
  const patients      = profiles.filter(p => p.role === 'patient').length
  const individuals   = profiles.filter(p => p.role === 'individual').length

  const onTrial = profiles.filter(p =>
    p.trial_ends_at && new Date(p.trial_ends_at) > now
  ).length

  const paying = profiles.filter(p =>
    p.plan !== 'gratuito' && (!p.premium_until || new Date(p.premium_until) > now)
  ).length

  const hadTrial = profiles.filter(p => !!p.trial_ends_at).length
  const conversionRate = hadTrial > 0 ? Math.round((paying / hadTrial) * 100) : 0

  const newThisWeek  = profiles.filter(p => new Date(p.created_at) >= sevenDaysAgo).length
  const newThisMonth = profiles.filter(p => new Date(p.created_at) >= startOfMonth).length

  // ── Revenue ───────────────────────────────────────────────────────────────────
  const revenueTotal = pays.reduce((s, p) => s + (p.amount ?? 0), 0)
  const revenueMonth = pays.filter(p => new Date(p.created_at) >= startOfMonth)
                          .reduce((s, p) => s + (p.amount ?? 0), 0)
  const paymentsMonth = pays.filter(p => new Date(p.created_at) >= startOfMonth).length

  // ── Active users (logged in last 7 / 14 / 30d) ───────────────────────────────
  const activeUserIds   = new Set(logsRaw?.map(l => l.user_id)    ?? [])
  const activeIds14d    = new Set(logs14dRaw?.map(l => l.user_id) ?? [])
  const activeIds30d    = new Set(logs30dRaw?.map(l => l.user_id) ?? [])
  const activeUsers7d   = activeUserIds.size
  const activeUsers14d  = activeIds14d.size
  const activeUsers30d  = activeIds30d.size

  // ── Churn risk — active plan/trial + no log in 7+ days ───────────────────────
  // Build map: userId → last log date
  const lastLogByUser: Record<string, string> = {}
  allLogsForChurn?.forEach(l => {
    if (!lastLogByUser[l.user_id]) lastLogByUser[l.user_id] = l.fecha
  })

  const iso7dDate = iso7d.split('T')[0]
  const activePaidOrTrial = profiles.filter(p => {
    if (p.role === 'professional') return false
    const hasPremium = p.premium_until && new Date(p.premium_until) > now
    const hasTrial   = p.trial_ends_at  && new Date(p.trial_ends_at)  > now
    return hasPremium || hasTrial || (p.plan && p.plan !== 'gratuito')
  })

  const churnRiskUsers = activePaidOrTrial
    .filter(p => {
      const lastLog = lastLogByUser[p.id]
      // At risk: no log in last 30d, OR last log > 7 days ago
      return !lastLog || lastLog < iso7dDate
    })
    .map(p => {
      const lastLog  = lastLogByUser[p.id] ?? null
      const daysAgo  = lastLog
        ? Math.floor((now.getTime() - new Date(lastLog).getTime()) / 86_400_000)
        : null
      const planLabel = p.premium_until && new Date(p.premium_until) > now
        ? p.plan
        : 'trial'
      return {
        id:         p.id,
        nombre:     p.nombre ?? '—',
        email:      p.email  ?? '—',
        plan:       planLabel,
        lastLog,
        daysAgo,
      }
    })
    .sort((a, b) => (b.daysAgo ?? 999) - (a.daysAgo ?? 999))
    .slice(0, 20) // cap at 20 for display

  // ── Engagement funnel ─────────────────────────────────────────────────────────
  const usersWithPlan   = new Set(plansRaw?.map(p => p.user_id) ?? [])
  const nonProTotal     = profiles.filter(p => p.role !== 'professional').length
  const engagementFunnel = {
    registered:     nonProTotal,
    generatedPlan:  usersWithPlan.size,
    loggedThisWeek: activeUsers7d,
  }

  // ── Plan type breakdown ───────────────────────────────────────────────────────
  const planBreakdown = {
    professional: pays.filter(p => p.plan_type === 'professional').length,
    patient:      pays.filter(p => p.plan_type === 'patient').length,
    individual:   pays.filter(p => p.plan_type === 'individual').length,
  }

  // ── Signups by day (last 30d) — for chart ─────────────────────────────────────
  const signupsByDay: Record<string, number> = {}
  const revenueByDay: Record<string, number> = {}

  // Fill last 30 days with zeros
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86_400_000)
    const key = d.toISOString().split('T')[0]
    signupsByDay[key] = 0
    revenueByDay[key] = 0
  }
  newUsersRaw?.forEach(u => {
    const key = u.created_at.split('T')[0]
    if (key in signupsByDay) signupsByDay[key]++
  })
  pays.filter(p => new Date(p.created_at) >= thirtyDaysAgo).forEach(p => {
    const key = p.created_at.split('T')[0]
    if (key in revenueByDay) revenueByDay[key] += p.amount ?? 0
  })

  const signupsChart = Object.entries(signupsByDay).map(([date, count]) => ({ date, count }))
  const revenueChart = Object.entries(revenueByDay).map(([date, amount]) => ({ date, amount }))

  // ── Recent payments list (last 10) ────────────────────────────────────────────
  const recentPayments = pays.slice(0, 10).map(p => ({
    id:         p.id,
    amount:     p.amount ?? 0,
    plan_type:  p.plan_type ?? '—',
    created_at: p.created_at,
  }))

  return NextResponse.json({
    // KPIs
    total, professionals, patients, individuals,
    onTrial, paying, conversionRate,
    newThisWeek, newThisMonth,
    revenueTotal, revenueMonth, paymentsMonth,
    activeUsers7d,
    planBreakdown,
    // Charts
    signupsChart,
    revenueChart,
    recentPayments,
    // Retention
    activeUsers14d,
    activeUsers30d,
    churnRiskUsers,
    engagementFunnel,
  })
}
