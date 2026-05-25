'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  ShieldCheck, ArrowLeft, RefreshCw, Search, Mail,
  ArrowUpDown, Download, Crown, Clock, CheckCircle, XCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface CustomerRow {
  id:           string
  nombre:       string
  email:        string
  plan:         string
  firstPayAt:   string | null
  lastPayAt:    string | null
  ltv:          number
  paymentCount: number
  premiumUntil: string | null
  status:       'active' | 'expired' | 'never_paid'
  role:         string
}

interface Summary {
  totalCustomers: number
  totalLTV:       number
  activeCount:    number
  expiredCount:   number
}

type StatusFilter = 'all' | 'active' | 'expired'
type SortKey      = 'ltv' | 'recent' | 'expiring'

function fmtCLP(n: number) { return `$${n.toLocaleString('es-CL')}` }

function shortDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: '2-digit' })
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000)
}

function StatusBadge({ status, premiumUntil }: { status: CustomerRow['status']; premiumUntil: string | null }) {
  if (status === 'active') {
    const d = daysUntil(premiumUntil)
    const urgent = d !== null && d <= 7
    return (
      <span className={cn(
        'inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full',
        urgent ? 'bg-amber-50 text-amber-600' : 'bg-green-50 text-green-700',
      )}>
        <CheckCircle size={9} /> Activo
        {urgent && ` (${d}d)`}
      </span>
    )
  }
  if (status === 'expired') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600">
        <XCircle size={9} /> Expirado
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
      <Clock size={9} /> Nunca pagó
    </span>
  )
}

export function CustomersTable() {
  const [rows,     setRows]     = useState<CustomerRow[]>([])
  const [summary,  setSummary]  = useState<Summary | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState('')
  const [search,   setSearch]   = useState('')
  const [status,   setStatus]   = useState<StatusFilter>('all')
  const [sortKey,  setSortKey]  = useState<SortKey>('ltv')

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/customers?status=${status}&sort=${sortKey}`)
      if (res.status === 403) { setError('Acceso denegado.'); return }
      if (!res.ok) { setError(`Error ${res.status}`); return }
      const data = await res.json()
      setRows(data.customers ?? [])
      setSummary(data.summary ?? null)
    } catch {
      setError('Error de red al cargar clientes.')
    } finally {
      setLoading(false)
    }
  }, [status, sortKey])

  // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount + when filters change (legitimate)
  useEffect(() => { fetchData() }, [fetchData])

  // Filtro client-side por search (nombre + email)
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(r =>
      r.nombre.toLowerCase().includes(q) ||
      r.email.toLowerCase().includes(q)
    )
  }, [rows, search])

  // Export CSV
  function exportCSV() {
    const headers = ['Nombre', 'Email', 'Plan', 'Status', 'LTV (CLP)', '# pagos', 'Primer pago', 'Último pago', 'Próximo vencimiento']
    const csv = [
      headers.join(','),
      ...filtered.map(r => [
        `"${r.nombre.replace(/"/g, '""')}"`,
        r.email,
        r.plan,
        r.status,
        r.ltv,
        r.paymentCount,
        r.firstPayAt   ?? '',
        r.lastPayAt    ?? '',
        r.premiumUntil ?? '',
      ].join(',')),
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `clientes-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen">

      {/* Header */}
      <div className="bg-[#0C1F2C] px-6 py-5 md:px-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-[#29ABE2] to-[#1a6fa0] rounded-xl flex items-center justify-center">
              <ShieldCheck size={16} className="text-white" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-[#29ABE2] tracking-widest uppercase">Admin · Clientes</p>
              <h1 className="text-sm font-black text-white leading-tight">Tabla maestra comercial</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition disabled:opacity-50"
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              Actualizar
            </button>
            <a
              href="/admin"
              className="flex items-center gap-1.5 text-[#29ABE2] text-xs font-bold hover:underline"
            >
              <ArrowLeft size={12} /> Volver al admin
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 md:px-10 md:py-8 space-y-4">

        {/* Summary cards */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <SummaryCard icon={Crown}        label="Total clientes" value={summary.totalCustomers}              color="text-[#29ABE2]" />
            <SummaryCard icon={CheckCircle}  label="Activos"        value={summary.activeCount}                 color="text-green-500" />
            <SummaryCard icon={XCircle}      label="Expirados"      value={summary.expiredCount}                color="text-red-500" />
            <SummaryCard icon={Crown}        label="Revenue total"  value={fmtCLP(summary.totalLTV)}            color="text-amber-500" />
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-[#E2ECF4] p-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8BA5BE]" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nombre o email..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-[#F0F6FA] border border-transparent focus:border-[#29ABE2] focus:bg-white rounded-xl outline-none transition"
            />
          </div>

          <select
            value={status}
            onChange={e => setStatus(e.target.value as StatusFilter)}
            className="text-sm bg-[#F0F6FA] border-0 rounded-xl px-3 py-2 cursor-pointer focus:bg-white outline-none"
          >
            <option value="all">Todos los estados</option>
            <option value="active">Solo activos</option>
            <option value="expired">Solo expirados</option>
          </select>

          <select
            value={sortKey}
            onChange={e => setSortKey(e.target.value as SortKey)}
            className="text-sm bg-[#F0F6FA] border-0 rounded-xl px-3 py-2 cursor-pointer focus:bg-white outline-none"
          >
            <option value="ltv">Ordenar: LTV (mayor primero)</option>
            <option value="recent">Ordenar: pago más reciente</option>
            <option value="expiring">Ordenar: próximo a vencer</option>
          </select>

          <button
            onClick={exportCSV}
            disabled={filtered.length === 0}
            className="flex items-center gap-1.5 bg-[#29ABE2] hover:bg-[#1a8fc2] text-white text-sm font-bold px-4 py-2 rounded-xl transition disabled:opacity-50"
          >
            <Download size={13} /> CSV
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-700">
            {error} · <button onClick={fetchData} className="font-bold underline">Reintentar</button>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && !rows.length && (
          <div className="bg-white rounded-2xl border border-[#E2ECF4] p-8 text-center">
            <div className="w-8 h-8 border-2 border-[#29ABE2]/30 border-t-[#29ABE2] rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-[#8BA5BE]">Cargando clientes...</p>
          </div>
        )}

        {/* Table */}
        {!loading && filtered.length === 0 && (
          <div className="bg-white rounded-2xl border border-[#E2ECF4] p-12 text-center">
            <p className="text-sm text-[#8BA5BE]">
              {search ? 'No hay clientes que matcheen tu búsqueda.' : 'No hay clientes con estos filtros.'}
            </p>
          </div>
        )}

        {filtered.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-[#E2ECF4] overflow-hidden"
          >
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#F8FBFD] border-b border-[#E2ECF4]">
                  <tr className="text-[10px] font-black text-[#8BA5BE] uppercase tracking-wider">
                    <th className="text-left px-4 py-3">Cliente</th>
                    <th className="text-left px-4 py-3">Plan</th>
                    <th className="text-left px-4 py-3">Status</th>
                    <th className="text-right px-4 py-3">LTV</th>
                    <th className="text-center px-4 py-3"># pagos</th>
                    <th className="text-left px-4 py-3">Primer pago</th>
                    <th className="text-left px-4 py-3">Último pago</th>
                    <th className="text-left px-4 py-3">Vence</th>
                    <th className="text-center px-4 py-3">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => (
                    <tr key={r.id} className="border-b border-[#F8FBFD] hover:bg-[#F8FBFD] transition">
                      <td className="px-4 py-3">
                        <p className="font-bold text-[#0C1F2C]">{r.nombre}</p>
                        <p className="text-[11px] text-[#8BA5BE]">{r.email}</p>
                      </td>
                      <td className="px-4 py-3 capitalize text-[#4A6070] text-xs">{r.plan}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={r.status} premiumUntil={r.premiumUntil} />
                      </td>
                      <td className="px-4 py-3 text-right font-black text-amber-600">{fmtCLP(r.ltv)}</td>
                      <td className="px-4 py-3 text-center text-xs text-[#4A6070]">{r.paymentCount}</td>
                      <td className="px-4 py-3 text-[11px] text-[#4A6070]">{shortDate(r.firstPayAt)}</td>
                      <td className="px-4 py-3 text-[11px] text-[#4A6070]">{shortDate(r.lastPayAt)}</td>
                      <td className="px-4 py-3 text-[11px] text-[#4A6070]">{shortDate(r.premiumUntil)}</td>
                      <td className="px-4 py-3 text-center">
                        <a
                          href={`mailto:${r.email}`}
                          className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-[#F0F6FA] hover:bg-[#29ABE2] hover:text-white text-[#29ABE2] transition"
                          title="Enviar email"
                        >
                          <Mail size={12} />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-[#F8FBFD]">
              {filtered.map(r => (
                <div key={r.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="min-w-0">
                      <p className="font-bold text-[#0C1F2C] text-sm">{r.nombre}</p>
                      <p className="text-[11px] text-[#8BA5BE] truncate">{r.email}</p>
                    </div>
                    <p className="font-black text-amber-600 text-sm ml-2">{fmtCLP(r.ltv)}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap text-[10px] text-[#4A6070]">
                    <StatusBadge status={r.status} premiumUntil={r.premiumUntil} />
                    <span className="capitalize">{r.plan}</span>
                    <span>· {r.paymentCount} pago{r.paymentCount !== 1 ? 's' : ''}</span>
                    {r.premiumUntil && <span>· Vence {shortDate(r.premiumUntil)}</span>}
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-[#F8FBFD] px-4 py-2.5 text-[11px] text-[#8BA5BE] text-center border-t border-[#E2ECF4]">
              Mostrando {filtered.length} cliente{filtered.length !== 1 ? 's' : ''}
              {search && ` (filtro: "${search}")`}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}

function SummaryCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType
  label: string
  value: string | number
  color: string
}) {
  return (
    <div className="bg-white rounded-2xl border border-[#E2ECF4] p-4 flex items-center gap-3">
      <div className="w-9 h-9 rounded-xl bg-[#F0F6FA] flex items-center justify-center">
        <Icon size={16} className={color} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold text-[#8BA5BE] uppercase tracking-wide">{label}</p>
        <p className="text-lg font-black text-[#0C1F2C] leading-tight">{value}</p>
      </div>
    </div>
  )
}
