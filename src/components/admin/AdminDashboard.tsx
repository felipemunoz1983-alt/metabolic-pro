'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import {
  Users, TrendingUp, DollarSign, Activity,
  UserCheck, RefreshCw, ArrowUpRight, Zap,
  ShieldCheck, Clock, CreditCard, AlertTriangle,
  TrendingDown, ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Types ──────────────────────────────────────────────────────────────────────

interface ChurnUser {
  id: string; nombre: string; email: string
  plan: string; lastLog: string | null; daysAgo: number | null
}

interface StatsData {
  total: number
  professionals: number
  patients: number
  individuals: number
  onTrial: number
  paying: number
  conversionRate: number
  newThisWeek: number
  newThisMonth: number
  revenueTotal: number
  revenueMonth: number
  paymentsMonth: number
  activeUsers7d: number
  activeUsers14d: number
  activeUsers30d: number
  planBreakdown: { professional: number; patient: number; individual: number }
  signupsChart:  { date: string; count: number }[]
  revenueChart:  { date: string; amount: number }[]
  recentPayments: { id: string; amount: number; plan_type: string; created_at: string }[]
  churnRiskUsers:  ChurnUser[]
  engagementFunnel: { registered: number; generatedPlan: number; loggedThisWeek: number }
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtCLP(n: number) {
  return `$${n.toLocaleString('es-CL')}`
}

function shortDate(iso: string) {
  const d = new Date(iso)
  return `${d.getDate()}/${d.getMonth() + 1}`
}

function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `hace ${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `hace ${hrs}h`
  return `hace ${Math.floor(hrs / 24)}d`
}

// ── KPI Card ───────────────────────────────────────────────────────────────────

function KPI({
  icon: Icon, label, value, sub, color = 'text-[#29ABE2]', highlight = false,
}: {
  icon: React.ElementType
  label: string
  value: string | number
  sub?: string
  color?: string
  highlight?: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'bg-white rounded-2xl p-5 border flex items-start gap-4',
        highlight ? 'border-[#29ABE2]/40 shadow-lg shadow-[#29ABE2]/10' : 'border-[#E2ECF4]'
      )}
    >
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', highlight ? 'bg-[#29ABE2]/15' : 'bg-[#F0F6FA]')}>
        <Icon size={18} className={color} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold text-[#8BA5BE] uppercase tracking-wide mb-0.5">{label}</p>
        <p className="text-2xl font-black text-[#0C1F2C] leading-none">{value}</p>
        {sub && <p className="text-xs text-[#8BA5BE] mt-1">{sub}</p>}
      </div>
    </motion.div>
  )
}

// ── Custom tooltip ─────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label, money }: {
  active?: boolean; payload?: { value: number }[]; label?: string; money?: boolean
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#0C1F2C] text-white text-xs px-3 py-2 rounded-xl shadow-xl">
      <p className="text-[#6B8FA8] mb-0.5">{label}</p>
      <p className="font-black">{money ? fmtCLP(payload[0].value) : payload[0].value}</p>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export function AdminDashboard() {
  const [stats,    setStats]    = useState<StatsData | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState('')
  const [lastSync, setLastSync] = useState<Date | null>(null)

  const fetchStats = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/stats')
      if (res.status === 403) { setError('Acceso denegado.'); return }
      if (!res.ok) { setError(`Error ${res.status}`); return }
      setStats(await res.json())
      setLastSync(new Date())
    } catch {
      setError('Error de red al cargar métricas.')
    } finally {
      setLoading(false)
    }
  }, [])

  // eslint-disable-next-line react-hooks/set-state-in-effect -- async data fetch on mount (legitimate pattern)
  useEffect(() => { fetchStats() }, [fetchStats])

  // ── Loading ──
  if (loading && !stats) {
    return (
      <div className="min-h-screen bg-[#F0F6FA] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#29ABE2]/30 border-t-[#29ABE2] rounded-full animate-spin" />
          <p className="text-[#6B8FA8] text-sm">Cargando métricas...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#F0F6FA] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 font-bold mb-3">{error}</p>
          <button onClick={fetchStats} className="text-[#29ABE2] text-sm font-bold hover:underline">
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  if (!stats) return null

  const s = stats

  return (
    <div className="min-h-screen bg-[#F0F6FA]">

      {/* ── Header ── */}
      <div className="bg-[#0C1F2C] px-6 py-5 md:px-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-[#29ABE2] to-[#1a6fa0] rounded-xl flex items-center justify-center">
              <ShieldCheck size={16} className="text-white" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-[#29ABE2] tracking-widest uppercase">Admin</p>
              <h1 className="text-sm font-black text-white leading-tight">Centro Metabólico Pro</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {lastSync && (
              <p className="text-[11px] text-[#4A7A94] hidden sm:block">
                Actualizado {lastSync.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
            <button
              onClick={fetchStats}
              disabled={loading}
              className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition disabled:opacity-50"
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              Actualizar
            </button>
            <a
              href="/paciente"
              className="text-[#29ABE2] text-xs font-bold hover:underline"
            >
              ← App
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 md:px-10 md:py-8 space-y-6">

        {/* ── Revenue strip ── */}
        <div className="bg-gradient-to-r from-[#0C3547] to-[#1a6fa0] rounded-2xl p-6 text-white flex flex-wrap gap-8">
          <div>
            <p className="text-[10px] font-bold text-[#6BB8D8] uppercase tracking-widest mb-1">Revenue total</p>
            <p className="text-3xl font-black">{fmtCLP(s.revenueTotal)}</p>
            <p className="text-xs text-[#6BB8D8] mt-1">{s.paying} suscripciones activas</p>
          </div>
          <div className="border-l border-white/10 pl-8">
            <p className="text-[10px] font-bold text-[#6BB8D8] uppercase tracking-widest mb-1">Este mes</p>
            <p className="text-3xl font-black">{fmtCLP(s.revenueMonth)}</p>
            <p className="text-xs text-[#6BB8D8] mt-1">{s.paymentsMonth} pago{s.paymentsMonth !== 1 ? 's' : ''}</p>
          </div>
          <div className="border-l border-white/10 pl-8">
            <p className="text-[10px] font-bold text-[#6BB8D8] uppercase tracking-widest mb-1">Conversión trial→pago</p>
            <p className="text-3xl font-black">{s.conversionRate}%</p>
            <p className="text-xs text-[#6BB8D8] mt-1">{s.paying} de {s.onTrial + s.paying} usuarios</p>
          </div>
        </div>

        {/* ── KPI grid ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KPI icon={Users}      label="Usuarios totales"  value={s.total}          sub={`+${s.newThisWeek} esta semana`}  highlight />
          <KPI icon={UserCheck}  label="Pagando ahora"     value={s.paying}         sub={`${s.professionals} profesionales`} color="text-green-500" />
          <KPI icon={Clock}      label="En prueba"         value={s.onTrial}        sub="trial activo"                      color="text-amber-500" />
          <KPI icon={Activity}   label="Activos 7 días"    value={s.activeUsers7d}  sub="con registro"                      color="text-purple-500" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KPI icon={ShieldCheck} label="Profesionales"    value={s.professionals}  sub="cuentas pro" />
          <KPI icon={Users}       label="Pacientes"        value={s.patients}       sub="vinculados" />
          <KPI icon={Zap}         label="Individuales"     value={s.individuals}    sub="sin profesional" />
          <KPI icon={TrendingUp}  label="Nuevos este mes"  value={s.newThisMonth}   sub="registros" color="text-[#29ABE2]" />
        </div>

        {/* ── Charts ── */}
        <div className="grid md:grid-cols-2 gap-4">

          {/* Signups chart */}
          <div className="bg-white rounded-2xl border border-[#E2ECF4] p-5">
            <p className="text-sm font-black text-[#0C1F2C] mb-1">Nuevos usuarios</p>
            <p className="text-[10px] text-[#8BA5BE] mb-4">Últimos 30 días</p>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={s.signupsChart} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#29ABE2" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#29ABE2" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F6FA" />
                <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 9, fill: '#8BA5BE' }} tickLine={false} axisLine={false} interval={4} />
                <YAxis tick={{ fontSize: 9, fill: '#8BA5BE' }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="count" stroke="#29ABE2" strokeWidth={2} fill="url(#colorUsers)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Revenue chart */}
          <div className="bg-white rounded-2xl border border-[#E2ECF4] p-5">
            <p className="text-sm font-black text-[#0C1F2C] mb-1">Revenue diario</p>
            <p className="text-[10px] text-[#8BA5BE] mb-4">Últimos 30 días (CLP)</p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={s.revenueChart} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F6FA" vertical={false} />
                <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 9, fill: '#8BA5BE' }} tickLine={false} axisLine={false} interval={4} />
                <YAxis tick={{ fontSize: 9, fill: '#8BA5BE' }} tickLine={false} axisLine={false}
                  tickFormatter={v => v > 0 ? `$${(v/1000).toFixed(0)}k` : '0'} />
                <Tooltip content={<ChartTooltip money />} />
                <Bar dataKey="amount" fill="#29ABE2" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ══════════════════ RETENCIÓN ══════════════════ */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown size={14} className="text-[#29ABE2]" />
            <p className="text-sm font-black text-[#0C1F2C]">Retención</p>
          </div>

          {/* Active users 7 / 14 / 30d */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { label: 'Activos 7 días',  value: s.activeUsers7d,  pct: s.total > 0 ? Math.round((s.activeUsers7d  / s.total) * 100) : 0, color: 'text-green-500',  bar: 'bg-green-500' },
              { label: 'Activos 14 días', value: s.activeUsers14d, pct: s.total > 0 ? Math.round((s.activeUsers14d / s.total) * 100) : 0, color: 'text-[#29ABE2]',  bar: 'bg-[#29ABE2]' },
              { label: 'Activos 30 días', value: s.activeUsers30d, pct: s.total > 0 ? Math.round((s.activeUsers30d / s.total) * 100) : 0, color: 'text-purple-500', bar: 'bg-purple-500' },
            ].map(item => (
              <div key={item.label} className="bg-white rounded-2xl border border-[#E2ECF4] p-4">
                <p className="text-[10px] font-bold text-[#8BA5BE] uppercase tracking-wide mb-1">{item.label}</p>
                <p className={cn('text-2xl font-black', item.color)}>{item.value}</p>
                <div className="mt-2 h-1.5 bg-[#F0F6FA] rounded-full">
                  <div className={cn('h-full rounded-full transition-all', item.bar)} style={{ width: `${item.pct}%` }} />
                </div>
                <p className="text-[10px] text-[#8BA5BE] mt-1">{item.pct}% del total</p>
              </div>
            ))}
          </div>

          {/* Engagement funnel + Churn risk */}
          <div className="grid md:grid-cols-5 gap-4">

            {/* Engagement funnel */}
            <div className="md:col-span-2 bg-white rounded-2xl border border-[#E2ECF4] p-5">
              <p className="text-sm font-black text-[#0C1F2C] mb-1">Funnel de engagement</p>
              <p className="text-[10px] text-[#8BA5BE] mb-4">Pacientes e individuales</p>
              <div className="space-y-3">
                {[
                  { label: 'Registrados',        value: s.engagementFunnel.registered,     color: 'bg-[#29ABE2]',  step: 1 },
                  { label: 'Generaron un plan',  value: s.engagementFunnel.generatedPlan,  color: 'bg-purple-500', step: 2 },
                  { label: 'Log esta semana',    value: s.engagementFunnel.loggedThisWeek, color: 'bg-green-500',  step: 3 },
                ].map((row, i, arr) => {
                  const base = arr[0].value || 1
                  const pct  = Math.round((row.value / base) * 100)
                  return (
                    <div key={row.label}>
                      <div className="flex justify-between items-center mb-1">
                        <div className="flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded-full bg-[#F0F6FA] flex items-center justify-center text-[9px] font-black text-[#8BA5BE]">{row.step}</span>
                          <span className="text-xs text-[#4A6070]">{row.label}</span>
                        </div>
                        <span className="text-xs font-black text-[#0C1F2C]">{row.value} <span className="font-normal text-[#8BA5BE]">({pct}%)</span></span>
                      </div>
                      <div className="h-2 bg-[#F0F6FA] rounded-full">
                        <div className={cn('h-full rounded-full transition-all', row.color)} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Churn risk table */}
            <div className="md:col-span-3 bg-white rounded-2xl border border-[#E2ECF4] p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-black text-[#0C1F2C]">Riesgo de churn</p>
                  <p className="text-[10px] text-[#8BA5BE]">Activos sin log en 7+ días</p>
                </div>
                {s.churnRiskUsers.length > 0 && (
                  <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-xl px-2.5 py-1">
                    <AlertTriangle size={11} className="text-red-500" />
                    <span className="text-[11px] font-black text-red-600">{s.churnRiskUsers.length}</span>
                  </div>
                )}
              </div>
              {s.churnRiskUsers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center mb-2">
                    <Activity size={18} className="text-green-500" />
                  </div>
                  <p className="text-xs font-bold text-green-600">¡Sin riesgo de churn!</p>
                  <p className="text-[10px] text-[#8BA5BE] mt-0.5">Todos los usuarios activos registraron esta semana</p>
                </div>
              ) : (
                <div className="space-y-0 overflow-y-auto max-h-48">
                  {s.churnRiskUsers.map(u => {
                    const risk = u.daysAgo === null ? 'alto' : u.daysAgo >= 14 ? 'alto' : 'medio'
                    return (
                      <div key={u.id} className="flex items-center justify-between py-2 border-b border-[#F8FBFD] last:border-0">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={cn(
                            'w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0',
                            risk === 'alto' ? 'bg-red-50' : 'bg-amber-50'
                          )}>
                            <AlertTriangle size={11} className={risk === 'alto' ? 'text-red-500' : 'text-amber-500'} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-[#0C1F2C] truncate">{u.nombre}</p>
                            <p className="text-[10px] text-[#8BA5BE] truncate">{u.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                          <span className={cn(
                            'text-[10px] font-black px-2 py-0.5 rounded-full',
                            risk === 'alto'
                              ? 'bg-red-50 text-red-600'
                              : 'bg-amber-50 text-amber-600'
                          )}>
                            {u.daysAgo === null ? 'Sin logs' : `${u.daysAgo}d`}
                          </span>
                          <span className="text-[10px] text-[#8BA5BE] capitalize hidden sm:block">{u.plan}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Plan breakdown + Recent payments ── */}
        <div className="grid md:grid-cols-3 gap-4">

          {/* Plan breakdown */}
          <div className="bg-white rounded-2xl border border-[#E2ECF4] p-5">
            <p className="text-sm font-black text-[#0C1F2C] mb-4">Suscripciones pagadas</p>
            <div className="space-y-3">
              {[
                { label: 'Plan Profesional', value: s.planBreakdown.professional, color: 'bg-blue-500',   price: 14990 },
                { label: 'Plan Paciente',    value: s.planBreakdown.patient,      color: 'bg-green-500',  price: 7000  },
                { label: 'Plan Individual',  value: s.planBreakdown.individual,   color: 'bg-purple-500', price: 12990 },
              ].map(row => {
                const total = s.planBreakdown.professional + s.planBreakdown.patient + s.planBreakdown.individual
                const pct = total > 0 ? Math.round((row.value / total) * 100) : 0
                return (
                  <div key={row.label}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-semibold text-[#4A6070]">{row.label}</span>
                      <span className="text-xs font-black text-[#0C1F2C]">{row.value} · {fmtCLP(row.value * row.price)}</span>
                    </div>
                    <div className="h-1.5 bg-[#F0F6FA] rounded-full">
                      <div className={cn('h-full rounded-full transition-all', row.color)} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Recent payments */}
          <div className="md:col-span-2 bg-white rounded-2xl border border-[#E2ECF4] p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-black text-[#0C1F2C]">Últimos pagos</p>
              <CreditCard size={14} className="text-[#8BA5BE]" />
            </div>
            <div className="space-y-2">
              {s.recentPayments.length === 0 ? (
                <p className="text-xs text-[#8BA5BE] text-center py-6">Sin pagos aún</p>
              ) : s.recentPayments.map(p => (
                <div key={p.id} className="flex items-center justify-between py-2 border-b border-[#F0F6FA] last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 bg-green-50 rounded-lg flex items-center justify-center">
                      <ArrowUpRight size={12} className="text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#0C1F2C] capitalize">{p.plan_type}</p>
                      <p className="text-[10px] text-[#8BA5BE]">{relTime(p.created_at)}</p>
                    </div>
                  </div>
                  <p className="text-sm font-black text-green-600">{fmtCLP(p.amount)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
