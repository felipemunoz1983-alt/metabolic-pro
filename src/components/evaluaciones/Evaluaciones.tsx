'use client'

/**
 * Evaluaciones — Tab del PACIENTE para ver sus informes antropométricos.
 *
 * - Fetch GET /api/informes/list (paciente_id auto-detectado)
 * - Lista AGRUPADA POR MES descendente (más reciente arriba)
 * - Filtros: por tipo (InBody, ISAK, DEXA…)
 * - Click en un informe → abre visor inline (modal con iframe + signed URL)
 * - Botón descargar
 * - Empty state amigable cuando no hay informes
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText, Calendar, Loader2, AlertCircle, X, ExternalLink, Download,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  TIPO_INFORME_LABELS,
  type TipoInforme,
  type InformeAntropometrico,
} from '@/lib/informes-antropometricos'

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })
}

function bucketMonth(iso: string): { key: string; label: string } {
  const d = new Date(iso)
  const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  const label = `${MESES[d.getMonth()]} ${d.getFullYear()}`
  return { key, label }
}

interface ViewerState { id: string; url: string; titulo: string }

export function Evaluaciones() {
  const [informes, setInformes] = useState<InformeAntropometrico[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [filterTipo, setFilterTipo] = useState<TipoInforme | 'todos'>('todos')
  const [viewer, setViewer]     = useState<ViewerState | null>(null)
  const [opening, setOpening]   = useState<string | null>(null)

  const fetchInformes = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/informes/list')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setInformes(data.informes ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar')
    } finally {
      setLoading(false)
    }
  }, [])

  // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch al montar (legítimo)
  useEffect(() => { fetchInformes() }, [fetchInformes])

  // Deep-link desde push notification: /paciente?tab=evaluaciones&informe=<id>
  // Cuando la lista termina de cargar, si la URL trae ?informe=, abrimos ese PDF.
  // El parámetro se consume una sola vez (cleanup con replaceState) para evitar
  // reapertura al cambiar de tab y volver.
  useEffect(() => {
    if (loading || informes.length === 0 || viewer) return
    const params = new URLSearchParams(window.location.search)
    const target = params.get('informe')
    if (!target) return
    const inf = informes.find(i => i.id === target)
    if (!inf) return
    // Limpia el query param para que no se reabra al re-renderizar
    params.delete('informe')
    const newSearch = params.toString()
    const newUrl = window.location.pathname + (newSearch ? `?${newSearch}` : '') + window.location.hash
    window.history.replaceState({}, '', newUrl)
    handleOpen(inf)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handleOpen no es estable y queremos disparar solo cuando llegan los informes
  }, [loading, informes, viewer])

  async function handleOpen(inf: InformeAntropometrico) {
    setOpening(inf.id)
    try {
      const res = await fetch(`/api/informes/${inf.id}/url`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setViewer({ id: inf.id, url: data.url, titulo: inf.titulo })
      // Marcar como visto localmente (el backend también lo hizo)
      setInformes(prev => prev.map(i =>
        i.id === inf.id && !i.visto_por_paciente_en
          ? { ...i, visto_por_paciente_en: new Date().toISOString() }
          : i,
      ))
    } catch (e) {
      alert(`No se pudo abrir: ${e instanceof Error ? e.message : 'error'}`)
    } finally {
      setOpening(null)
    }
  }

  // Filtrar + agrupar por mes
  const grouped = useMemo(() => {
    const filtered = filterTipo === 'todos'
      ? informes
      : informes.filter(i => i.tipo === filterTipo)
    const map = new Map<string, { label: string; items: InformeAntropometrico[] }>()
    for (const inf of filtered) {
      const { key, label } = bucketMonth(inf.fecha_eval)
      if (!map.has(key)) map.set(key, { label, items: [] })
      map.get(key)!.items.push(inf)
    }
    // Sort keys desc + items dentro de cada mes por fecha_eval desc
    return Array.from(map.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, group]) => ({
        key,
        label: group.label,
        items: group.items.sort((a, b) => b.fecha_eval.localeCompare(a.fecha_eval)),
      }))
  }, [informes, filterTipo])

  const unreadCount = informes.filter(i => !i.visto_por_paciente_en).length

  return (
    <div className="px-4 py-4 md:px-8 md:py-8 max-w-3xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FileText size={18} className="text-[#29ABE2]" />
            <h2 className="text-lg font-black text-[#0C1F2C]">Mis evaluaciones</h2>
            {unreadCount > 0 && (
              <span className="text-[10px] font-black bg-[#29ABE2] text-white px-2 py-0.5 rounded-full">
                {unreadCount} nuevo{unreadCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <p className="text-xs text-[#8BA5BE]">
            Informes antropométricos que sube tu profesional (InBody, ISAK, DEXA, antropometría…)
          </p>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 size={28} className="animate-spin text-[#29ABE2] mb-3" />
          <p className="text-xs text-[#8BA5BE]">Cargando tus evaluaciones...</p>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-xs font-bold text-red-700">No pudimos cargar tus evaluaciones</p>
            <p className="text-[10px] text-red-600 mt-0.5">{error}</p>
            <button onClick={fetchInformes} className="mt-2 text-xs font-bold text-red-700 underline">
              Reintentar
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && informes.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-[#E2ECF4] rounded-3xl p-8 text-center"
        >
          <div className="w-16 h-16 mx-auto mb-4 bg-[#EAF4FB] rounded-2xl flex items-center justify-center">
            <Sparkles size={28} className="text-[#29ABE2]" />
          </div>
          <h3 className="text-base font-black text-[#0C1F2C] mb-2">Aún no hay evaluaciones</h3>
          <p className="text-xs text-[#6B7C93] leading-relaxed max-w-xs mx-auto">
            Cuando tu profesional suba tu primer informe antropométrico (InBody, antropometría con caliper, DEXA…) lo verás aquí. Podrás abrir el PDF o descargarlo.
          </p>
        </motion.div>
      )}

      {/* Filtros + lista */}
      {!loading && !error && informes.length > 0 && (
        <>
          {/* Filtros por tipo (chips) */}
          {informes.length > 1 && (
            <div className="flex items-center gap-1.5 mb-4 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-none">
              {(['todos', ...new Set(informes.map(i => i.tipo))] as (TipoInforme | 'todos')[]).map(t => {
                const info = t === 'todos' ? null : TIPO_INFORME_LABELS[t as TipoInforme]
                const isActive = filterTipo === t
                const count = t === 'todos' ? informes.length : informes.filter(i => i.tipo === t).length
                return (
                  <button
                    key={t}
                    onClick={() => setFilterTipo(t)}
                    className={cn(
                      'flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl whitespace-nowrap transition flex-shrink-0',
                      isActive
                        ? 'bg-[#29ABE2] text-white shadow'
                        : 'bg-white border border-[#E2ECF4] text-[#4A6070] hover:border-[#29ABE2]/40'
                    )}
                  >
                    {info && <span>{info.emoji}</span>}
                    <span>{info ? info.label : 'Todos'}</span>
                    <span className={cn(
                      'text-[9px] font-black px-1.5 py-0.5 rounded-full',
                      isActive ? 'bg-white/25 text-white' : 'bg-[#F0F6FA] text-[#8BA5BE]',
                    )}>
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>
          )}

          {/* Grupos por mes */}
          <div className="space-y-5">
            {grouped.map(group => (
              <div key={group.key}>
                <div className="flex items-center gap-2 mb-2 px-1">
                  <Calendar size={11} className="text-[#8BA5BE]" />
                  <p className="text-[10px] font-black text-[#8BA5BE] uppercase tracking-widest">
                    {group.label}
                  </p>
                  <div className="flex-1 h-px bg-[#E2ECF4]" />
                  <p className="text-[10px] text-[#B0C4D4]">
                    {group.items.length} informe{group.items.length !== 1 ? 's' : ''}
                  </p>
                </div>

                <div className="space-y-2">
                  {group.items.map(inf => {
                    const tipoInfo = TIPO_INFORME_LABELS[inf.tipo as TipoInforme] ?? TIPO_INFORME_LABELS.otro
                    const isUnread = !inf.visto_por_paciente_en
                    const isOpening = opening === inf.id

                    return (
                      <motion.button
                        key={inf.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={() => handleOpen(inf)}
                        disabled={isOpening}
                        className={cn(
                          'w-full bg-white border rounded-2xl p-4 text-left flex items-start gap-3 transition group',
                          isUnread
                            ? 'border-[#29ABE2]/30 shadow-sm shadow-[#29ABE2]/10'
                            : 'border-[#E2ECF4] hover:border-[#29ABE2]/40',
                          isOpening && 'opacity-60 pointer-events-none',
                        )}
                      >
                        <div className={cn(
                          'w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0',
                          isUnread ? 'bg-[#EAF4FB]' : 'bg-[#F8FBFD]'
                        )}>
                          {tipoInfo.emoji}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-black text-[#0C1F2C] truncate">{inf.titulo}</p>
                            {isUnread && (
                              <span className="text-[9px] font-black bg-[#29ABE2] text-white px-1.5 py-0.5 rounded-full flex-shrink-0">
                                NUEVO
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#8BA5BE] mt-0.5">
                            {formatDate(inf.fecha_eval)} · {tipoInfo.label}
                          </p>
                          {inf.notas && (
                            <p className="text-[11px] text-[#4A6070] mt-2 italic line-clamp-2 bg-[#F8FBFD] rounded-lg p-2 border-l-2 border-[#29ABE2]/40">
                              &ldquo;{inf.notas}&rdquo;
                            </p>
                          )}
                        </div>

                        <div className="flex-shrink-0 self-center">
                          {isOpening
                            ? <Loader2 size={16} className="animate-spin text-[#29ABE2]" />
                            : <ExternalLink size={14} className="text-[#29ABE2] group-hover:translate-x-0.5 transition" />}
                        </div>
                      </motion.button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Visor inline modal */}
      <AnimatePresence>
        {viewer && <PdfViewerModal viewer={viewer} onClose={() => setViewer(null)} />}
      </AnimatePresence>
    </div>
  )
}

// ─── Visor PDF inline ────────────────────────────────────────────────────────

function PdfViewerModal({ viewer, onClose }: { viewer: ViewerState; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/80 flex flex-col"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
        className="flex-1 flex flex-col bg-white max-w-5xl w-full mx-auto my-4 rounded-2xl overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#E2ECF4] bg-white">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-[#0C1F2C] truncate">{viewer.titulo}</p>
            <p className="text-[10px] text-[#8BA5BE]">PDF · enlace temporal (1 hora)</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
            <a
              href={viewer.url}
              download
              className="flex items-center gap-1 text-xs font-bold text-[#29ABE2] hover:bg-[#EAF4FB] px-3 py-1.5 rounded-lg transition"
              title="Descargar PDF"
            >
              <Download size={13} /> Descargar
            </a>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-[#F0F6FA] flex items-center justify-center text-[#8BA5BE]"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* PDF iframe — funciona en mobile y desktop con signed URL de Supabase Storage */}
        <iframe
          src={viewer.url}
          className="flex-1 w-full bg-[#1a1a1a]"
          title={viewer.titulo}
        />
      </motion.div>
    </motion.div>
  )
}
