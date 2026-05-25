/**
 * GET /api/admin/stats
 * Returns all KPIs for the admin dashboard.
 * Protected: only accessible by the configured ADMIN_EMAIL.
 * Uses service client → bypasses RLS → full data access.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { getAuthUser } from '@/lib/auth-server'
import { formatDateCL } from '@/lib/date-cl'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'felipe.munoz1983@gmail.com'

// Precios mensuales por tier (CLP). Coinciden con src/lib/transbank.ts PLAN_PRICES.
// Usados para calcular MRR proyectado desde suscripciones activas.
const TIER_PRICE: Record<string, number> = {
  professional: 14990,
  patient:      7000,
  individual:   12990,
}

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

  // Fill last 30 days with zeros usando TZ Chile (consistente con admin viewing)
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86_400_000)
    const key = formatDateCL(d)
    signupsByDay[key] = 0
    revenueByDay[key] = 0
  }
  newUsersRaw?.forEach(u => {
    const key = formatDateCL(new Date(u.created_at))
    if (key in signupsByDay) signupsByDay[key]++
  })
  pays.filter(p => new Date(p.created_at) >= thirtyDaysAgo).forEach(p => {
    const key = formatDateCL(new Date(p.created_at))
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

  // ── MRR / ARR / ARPU / LTV ───────────────────────────────────────────────────
  // MRR = suma de precios mensuales de TODAS las suscripciones activas hoy.
  // Una suscripción está "activa" si premium_until > now y el tipo de plan tiene
  // precio definido. Para usuarios cuyo profile.plan no coincide con TIER_PRICE
  // (legacy o tipos custom) los excluimos del MRR — no inflamos números.
  const activeSubscriptions = profiles.filter(p =>
    p.plan && TIER_PRICE[p.plan] !== undefined &&
    p.premium_until && new Date(p.premium_until) > now
  )
  const mrr = activeSubscriptions.reduce((s, p) => s + TIER_PRICE[p.plan!], 0)
  const arr = mrr * 12

  // ARPU = MRR / suscripciones activas (cuántos $ paga cada cliente promedio mes a mes)
  const arpu = activeSubscriptions.length > 0
    ? Math.round(mrr / activeSubscriptions.length)
    : 0

  // LTV simple = revenue total promedio por cliente único que ha pagado al menos una vez.
  // Es un proxy razonable mientras no haya snapshot mensual de cohorts.
  const uniquePayingUserIds = new Set(pays.map(p => p.user_id))
  const ltv = uniquePayingUserIds.size > 0
    ? Math.round(revenueTotal / uniquePayingUserIds.size)
    : 0

  // ── Churn rate (30 días) ─────────────────────────────────────────────────────
  // Definición: % de clientes que tenían plan vigente hace 30 días y ya NO lo tienen hoy.
  // Aproximación: profiles con premium_until expirado en últimos 30d Y SIN pago aprobado
  // en últimos 30d (no renovaron).
  const churnedLast30d = profiles.filter(p => {
    if (!p.premium_until) return false
    const expDate = new Date(p.premium_until)
    if (expDate >= now) return false                          // sigue activo
    if (expDate < thirtyDaysAgo) return false                 // expiró antes del cohort
    // Verificar que NO tenga pago aprobado en últimos 30d (no renovó)
    const hasRecentPay = pays.some(pay =>
      pay.user_id === p.id && new Date(pay.created_at) >= thirtyDaysAgo
    )
    return !hasRecentPay
  }).length

  const activeAt30dAgo = profiles.filter(p =>
    p.premium_until && new Date(p.premium_until) >= thirtyDaysAgo
  ).length

  const churnRate30d = activeAt30dAgo > 0
    ? Math.round((churnedLast30d / activeAt30dAgo) * 100 * 10) / 10
    : 0

  // ── NRR (Net Revenue Retention) — comparación mes actual vs mes anterior ─────
  // NRR = revenue este mes / revenue mes anterior (solo de clientes que existían antes).
  // >100% = expansión neta. <100% = contracción neta. 100% = mantención.
  const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const endOfPrevMonth   = new Date(now.getFullYear(), now.getMonth(),     1)
  const revenuePrevMonth = pays.filter(p => {
    const d = new Date(p.created_at)
    return d >= startOfPrevMonth && d < endOfPrevMonth
  }).reduce((s, p) => s + (p.amount ?? 0), 0)

  const nrrPct = revenuePrevMonth > 0
    ? Math.round((revenueMonth / revenuePrevMonth) * 100)
    : 0

  // ── Plans expiring soon (próximos 30 días) ──────────────────────────────────
  // Listado accionable para outreach proactivo de renovación.
  const in30d = new Date(now.getTime() + 30 * 86_400_000)
  const plansExpiringSoon = profiles
    .filter(p =>
      p.premium_until &&
      new Date(p.premium_until) > now &&
      new Date(p.premium_until) <= in30d
    )
    .map(p => ({
      id:           p.id,
      nombre:       p.nombre  ?? '—',
      email:        p.email   ?? '—',
      plan:         p.plan    ?? '—',
      premiumUntil: p.premium_until,
      daysLeft:     Math.ceil((new Date(p.premium_until!).getTime() - now.getTime()) / 86_400_000),
    }))
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 30)

  // ── Top 10 customers by LTV (revenue acumulado) ─────────────────────────────
  // VIPs que no puedes perder — los que más han pagado.
  const revenueByUserId: Record<string, number> = {}
  const paymentCountByUserId: Record<string, number> = {}
  pays.forEach(p => {
    if (!p.user_id) return
    revenueByUserId[p.user_id] = (revenueByUserId[p.user_id] ?? 0) + (p.amount ?? 0)
    paymentCountByUserId[p.user_id] = (paymentCountByUserId[p.user_id] ?? 0) + 1
  })
  const topCustomersByLTV = Object.entries(revenueByUserId)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([userId, totalRevenue]) => {
      const profile = profiles.find(p => p.id === userId)
      return {
        id:             userId,
        nombre:         profile?.nombre ?? '—',
        email:          profile?.email  ?? '—',
        plan:           profile?.plan   ?? '—',
        totalRevenue,
        paymentCount:   paymentCountByUserId[userId] ?? 0,
        premiumUntil:   profile?.premium_until ?? null,
        isStillActive:  !!(profile?.premium_until && new Date(profile.premium_until) > now),
      }
    })

  return NextResponse.json({
    // KPIs
    total, professionals, patients, individuals,
    onTrial, paying, conversionRate,
    newThisWeek, newThisMonth,
    revenueTotal, revenueMonth, paymentsMonth,
    activeUsers7d,
    planBreakdown,
    // Métricas SaaS financieras (Tier B)
    mrr, arr, arpu, ltv, churnRate30d, nrrPct,
    // Charts
    signupsChart,
    revenueChart,
    recentPayments,
    // Retention
    activeUsers14d,
    activeUsers30d,
    churnRiskUsers,
    engagementFunnel,
    // Comercial (Tier A)
    plansExpiringSoon,
    topCustomersByLTV,
  })
}
