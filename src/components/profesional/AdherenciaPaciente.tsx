'use client'

/**
 * AdherenciaPaciente — Dashboard de métricas del paciente para el profesional.
 *
 * Visualiza la data agregada de /api/pacientes/[id]/adherencia:
 *   - KPI tiles: adherencia global, registros, diversidad
 *   - Barras horizontales: cumplimiento por tiempo de comida (con flag ⚠ si <50%)
 *   - Top 3 favoritas: lo que más le funciona — replicar perfil
 *   - Opciones no elegidas del banco: candidatas a regenerar
 *   - Sparkline simple: serie diaria de registros (engagement temporal)
 *
 * Toggle 7d / 14d / 30d en la cabecera.
 * Mountar en PanelProfesional (vista overview del paciente).
 */

import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart2, Heart, AlertCircle, RefreshCw, Sparkles, Loader2,
  TrendingUp, Target, ChefHat,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase'

// ─── Tipos del response del endpoint ─────────────────────────────────────────
interface AdherenciaResponse {
  paciente: { id: string; nombre: string }
  ventana: number
  rango: { desde: string; hasta: string }
  adherenciaPct: number
  totalRegistrado: number
  totalEsperado: number
  adherenciaPorTiempo: { tipo: string; registrados: number; esperados: number; pct: number }[]
  topFavoritas: { nombre: string; tiempo: string; cocina: string | null; count: number }[]
  opcionesNoElegidas: { tiempo: string; nombre: string; cocina: string }[]
  diversidadCocinas: number
  cocinasDistintas: string[]
  serieDiaria: { fecha: string; count: number }[]
}

interface Props {
  patientId: string
}

const COCINA_LABEL: Record<string, string> = {
  chilena:      '🇨🇱 Chilena',
  mediterranea: '🫒 Mediterránea',
  asiatica:     '🥢 Asiática',
  mexicana:     '🌶️ Mexicana',
  libre:        '🍽️ Libre',
}

// ─── Componente principal ────────────────────────────────────────────────────
export function AdherenciaPaciente({ patientId }: Props) {
  const [ventana, setVentana] = useState<7 | 14 | 30>(14)
  const [data, setData] = useState<AdherenciaResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAdherencia = useCallback(async (vent: 7 | 14 | 30) => {
    setError(null)
    setLoading(true)
    try {
      const { data: { session } } = await createClient().auth.getSession()
      const headers: Record<string, string> = {}
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`
      const res = await fetch(
        `/api/pacientes/${encodeURIComponent(patientId)}/adherencia?ventana=${vent}`,
        { method: 'GET', headers, credentials: 'include' },
      )
      if (!res.ok) throw new Error(`Error ${res.status}`)
      setData(await res.json() as AdherenciaResponse)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar las métricas')
    } finally {
      setLoading(false)
    }
  }, [patientId])

  /* eslint-disable react-hooks/set-state-in-effect -- mount + ventana fetch */
  useEffect(() => { fetchAdherencia(ventana) }, [ventana, fetchAdherencia])
  /* eslint-enable react-hooks/set-state-in-effect */

  if (loading && !data) {
    return (
      <div className="bg-white border border-[#E2ECF4] rounded-2xl p-8 flex items-center justify-center">
        <Loader2 size={20} className="animate-spin text-[#29ABE2]" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-2">
          <AlertCircle size={16} className="text-rose-500" />
          <p className="text-sm font-bold text-rose-700">No se pudo cargar adherencia</p>
        </div>
        <p className="text-xs text-rose-600 mb-3">{error}</p>
        <button onClick={() => fetchAdherencia(ventana)} className="text-xs font-bold text-rose-700 underline">Reintentar</button>
      </div>
    )
  }

  if (!data) return null

  const sinRegistros = data.totalRegistrado === 0

  return (
    <div className="space-y-4">
      {/* Header con toggle de ventana */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-gradient-to-br from-[#29ABE2] to-[#1a6fa0] rounded-xl flex items-center justify-center">
            <BarChart2 size={16} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-black text-[#0C1F2C]">Adherencia y patrones</p>
            <p className="text-[10px] text-[#8BA5BE]">
              {data.rango.desde} → {data.rango.hasta} · {data.ventana} días
            </p>
          </div>
        </div>
        <div className="flex bg-[#F0F6FA] rounded-lg p-0.5 gap-0.5">
          {[7, 14, 30].map(v => (
            <button
              key={v}
              onClick={() => setVentana(v as 7 | 14 | 30)}
              className={cn(
                'px-3 py-1.5 text-xs font-bold rounded-md transition',
                ventana === v ? 'bg-white text-[#0C1F2C] shadow-sm' : 'text-[#6B7C93] hover:text-[#0C1F2C]',
              )}
            >
              {v}d
            </button>
          ))}
        </div>
      </div>

      {sinRegistros && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
          <p className="text-sm font-bold text-amber-700 mb-1">Sin registros aún</p>
          <p className="text-xs text-amber-600">
            El paciente todavía no ha registrado consumos en su banco. Las métricas aparecerán en cuanto empiece a usarlo.
          </p>
        </div>
      )}

      {/* KPI tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPI
          icon={<Target size={14} />}
          label="Adherencia"
          value={`${data.adherenciaPct}%`}
          accent={data.adherenciaPct >= 70 ? 'green' : data.adherenciaPct >= 50 ? 'amber' : 'red'}
        />
        <KPI
          icon={<Heart size={14} />}
          label="Registros"
          value={data.totalRegistrado}
          sub={`/ ${data.totalEsperado} esperados`}
        />
        <KPI
          icon={<ChefHat size={14} />}
          label="Cocinas"
          value={data.diversidadCocinas}
          sub="distintas"
          accent={data.diversidadCocinas >= 3 ? 'green' : data.diversidadCocinas >= 2 ? 'amber' : 'red'}
        />
        <KPI
          icon={<TrendingUp size={14} />}
          label="Días activos"
          value={data.serieDiaria.filter(d => d.count > 0).length}
          sub={`de ${data.ventana}`}
        />
      </div>

      {/* Cumplimiento por tiempo de comida */}
      {data.adherenciaPorTiempo.length > 0 && (
        <div className="bg-white border border-[#E2ECF4] rounded-2xl p-5">
          <p className="text-xs font-black uppercase tracking-wider text-[#8BA5BE] mb-3">
            Cumplimiento por tiempo
          </p>
          <div className="space-y-3">
            {data.adherenciaPorTiempo.map(t => (
              <div key={t.tipo}>
                <div className="flex items-center justify-between mb-1 text-xs">
                  <span className="font-bold text-[#0C1F2C] flex items-center gap-1.5">
                    {t.tipo}
                    {t.pct < 50 && <span className="text-[10px] text-amber-600 font-bold">⚠ baja</span>}
                  </span>
                  <span className="text-[#6B7C93]">
                    <strong className="text-[#0C1F2C]">{t.pct}%</strong> · {t.registrados}/{t.esperados}
                  </span>
                </div>
                <div className="h-2 bg-[#F0F6FA] rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, t.pct)}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    className={cn(
                      'h-full rounded-full',
                      t.pct >= 70 ? 'bg-emerald-500' :
                      t.pct >= 50 ? 'bg-amber-500' :
                      'bg-rose-400',
                    )}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top 3 favoritas */}
      {data.topFavoritas.length > 0 && (
        <div className="bg-white border border-[#E2ECF4] rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Heart size={12} className="text-rose-400" />
            <p className="text-xs font-black uppercase tracking-wider text-[#8BA5BE]">
              Top 3 favoritas
            </p>
          </div>
          <p className="text-[10px] text-[#8BA5BE] mb-3">
            Lo que más eligió. Úsalo como referencia para sumar variantes con perfil similar.
          </p>
          <div className="space-y-2">
            {data.topFavoritas.map((f, i) => (
              <div key={`${f.tiempo}-${f.nombre}`} className="flex items-center gap-3 bg-[#F8FBFD] border border-[#E2ECF4] rounded-xl px-3 py-2">
                <div className="w-7 h-7 bg-[#EAF4FB] rounded-lg flex items-center justify-center text-xs font-black text-[#29ABE2] flex-shrink-0">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[#0C1F2C] truncate">{f.nombre}</p>
                  <p className="text-[10px] text-[#8BA5BE]">
                    {f.tiempo}
                    {f.cocina && ` · ${COCINA_LABEL[f.cocina] ?? f.cocina}`}
                  </p>
                </div>
                <span className="flex-shrink-0 text-xs font-bold text-[#29ABE2]">
                  {f.count}×
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Opciones no elegidas — candidatas a regenerar */}
      {data.opcionesNoElegidas.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={12} className="text-amber-600" />
            <p className="text-xs font-black uppercase tracking-wider text-amber-700">
              Opciones que no le funcionan ({data.opcionesNoElegidas.length})
            </p>
          </div>
          <p className="text-[11px] text-amber-700 mb-3 leading-relaxed">
            Estas opciones del banco están disponibles pero el paciente <strong>no las ha elegido en {data.ventana} días</strong>.
            Considera regenerar el banco de ese tiempo para sumar variantes que sí enganchen.
          </p>
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {data.opcionesNoElegidas.slice(0, 10).map(op => (
              <div key={`${op.tiempo}-${op.nombre}`} className="flex items-center justify-between gap-2 bg-white border border-amber-200 rounded-lg px-3 py-1.5">
                <p className="text-xs font-medium text-[#0C1F2C] truncate min-w-0">{op.nombre}</p>
                <span className="flex-shrink-0 text-[10px] text-[#8BA5BE]">
                  {op.tiempo} · {COCINA_LABEL[op.cocina] ?? op.cocina}
                </span>
              </div>
            ))}
            {data.opcionesNoElegidas.length > 10 && (
              <p className="text-[10px] text-amber-600 text-center pt-1">
                +{data.opcionesNoElegidas.length - 10} más
              </p>
            )}
          </div>
        </div>
      )}

      {/* Sparkline de actividad diaria */}
      {data.serieDiaria.length > 0 && (
        <div className="bg-white border border-[#E2ECF4] rounded-2xl p-5">
          <p className="text-xs font-black uppercase tracking-wider text-[#8BA5BE] mb-3">
            Actividad diaria
          </p>
          <Sparkline data={data.serieDiaria} />
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={() => fetchAdherencia(ventana)}
          disabled={loading}
          className="flex items-center gap-1.5 text-[11px] font-bold text-[#29ABE2] px-3 py-1.5 rounded-lg hover:bg-[#EAF4FB] transition disabled:opacity-60"
        >
          <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
          Refrescar
        </button>
      </div>
    </div>
  )
}

// ─── KPI tile ────────────────────────────────────────────────────────────────
interface KPIProps {
  icon: React.ReactNode
  label: string
  value: string | number
  sub?: string
  accent?: 'green' | 'amber' | 'red'
}

function KPI({ icon, label, value, sub, accent }: KPIProps) {
  return (
    <div className="bg-white border border-[#E2ECF4] rounded-xl p-3">
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="text-[#8BA5BE]">{icon}</span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#8BA5BE]">{label}</span>
      </div>
      <p className={cn(
        'text-2xl font-black leading-none',
        accent === 'green' && 'text-emerald-600',
        accent === 'amber' && 'text-amber-600',
        accent === 'red'   && 'text-rose-500',
        !accent && 'text-[#0C1F2C]',
      )}>
        {value}
      </p>
      {sub && <p className="text-[10px] text-[#8BA5BE] mt-1">{sub}</p>}
    </div>
  )
}

// ─── Sparkline (SVG barras simples, sin lib externa) ─────────────────────────
function Sparkline({ data }: { data: { fecha: string; count: number }[] }) {
  const max = Math.max(1, ...data.map(d => d.count))
  const W = 280
  const H = 60
  const barW = W / data.length

  return (
    <div className="space-y-2">
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="block">
        {data.map((d, i) => {
          const h = (d.count / max) * (H - 6)
          const x = i * barW + 1
          const y = H - h
          return (
            <rect
              key={d.fecha}
              x={x}
              y={y}
              width={Math.max(2, barW - 2)}
              height={h}
              rx={1}
              className={d.count > 0 ? 'fill-[#29ABE2]' : 'fill-[#E2ECF4]'}
            />
          )
        })}
      </svg>
      <div className="flex justify-between text-[9px] text-[#8BA5BE]">
        <span>{data[0]?.fecha.slice(5)}</span>
        <span>{data[Math.floor(data.length / 2)]?.fecha.slice(5)}</span>
        <span>{data[data.length - 1]?.fecha.slice(5)}</span>
      </div>
    </div>
  )
}
