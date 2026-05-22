'use client'

/**
 * BancoPaciente — Vista del paciente del banco de opciones.
 *
 * Muestra por cada tiempo de comida del día:
 *   - "Lo que toca hoy" (sugerencia por rotación inteligente — la opción
 *     menos repetida en los últimos 14 días)
 *   - Botón principal "Comí esta" para registrar adherencia
 *   - Toggle "Ver otras opciones" → expande a las demás disponibles
 *   - Botón "Ver receta" → modal con la ficha HTML branded
 *
 * Cuando el paciente registra que comió la misma opción 3+ veces en 7 días,
 * el endpoint POST /api/banco/consumo dispara push + email al profesional
 * sugiriendo regenerar variantes.
 *
 * Auth: el paciente debe estar logueado (el endpoint resuelve user.id).
 */

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles, CheckCircle, Eye, Clock, Loader2, AlertCircle, X,
  ChefHat, ChevronDown, Flame, Beef, Wheat, Droplets, RefreshCw, Undo2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase'
import type { OpcionPreparacion } from '@/types/banco'

// ─── Tipos (matchean al response del endpoint GET) ────────────────────────────
interface OpcionConPriority extends OpcionPreparacion {
  diasDesdeUltimoConsumo: number | null
  esSugerencia: boolean
}

interface ComidaPaciente {
  tipo: string
  kcal?: number
  macros?: { proteina_g: number; carbohidrato_g: number; grasa_g: number }
  opciones: OpcionConPriority[]
  consumidoHoy: { opcion_nombre: string; registro_id: string } | null
}

interface BancoResponse {
  hasPlan: boolean
  planId?: string
  comidas?: ComidaPaciente[]
  fechaHoy?: string
  message?: string
}

const COCINA_LABEL: Record<string, string> = {
  chilena:      'Chilena',
  mediterranea: 'Mediterránea',
  asiatica:     'Asiática',
  mexicana:     'Mexicana',
  libre:        'Libre',
}

// ─── Componente principal ────────────────────────────────────────────────────
export function BancoPaciente() {
  const [data, setData] = useState<BancoResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [consumiendo, setConsumiendo] = useState<string | null>(null)
  const [preview, setPreview] = useState<{ opcion: OpcionPreparacion; tiempo: string } | null>(null)
  const [toast, setToast] = useState<{ msg: string; id: number } | null>(null)

  // Fetch del banco
  const fetchBanco = useCallback(async () => {
    setError(null)
    try {
      const { data: { session } } = await createClient().auth.getSession()
      const headers: Record<string, string> = {}
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`
      const res = await fetch('/api/banco/paciente', { method: 'GET', headers, credentials: 'include' })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      setData(await res.json())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar tu banco')
    } finally {
      setLoading(false)
    }
  }, [])

  // eslint-disable-next-line react-hooks/set-state-in-effect -- mount-time fetch
  useEffect(() => { fetchBanco() }, [fetchBanco])

  // Auto-ocultar toast
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2800)
    return () => clearTimeout(t)
  }, [toast])

  // Registrar consumo
  async function registrarConsumo(comida: ComidaPaciente, opcion: OpcionPreparacion) {
    if (!data?.planId) return
    const key = `${comida.tipo}-${opcion.nombre}`
    setConsumiendo(key)
    try {
      const { data: { session } } = await createClient().auth.getSession()
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`
      const res = await fetch('/api/banco/consumo', {
        method: 'POST', headers, credentials: 'include',
        body: JSON.stringify({ planId: data.planId, tiempo: comida.tipo, opcion }),
      })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const j = await res.json() as { repeticiones?: number; alertaProfesional?: string }
      const aviso = j.alertaProfesional === 'sent'
        ? ` (avisamos a tu profe para sumar variantes)`
        : ''
      /* eslint-disable react-hooks/purity -- Date.now() en event handler, no en render */
      setToast({ msg: `Registrado ✓${aviso}`, id: Date.now() })
      await fetchBanco()
    } catch (err) {
      setToast({ msg: err instanceof Error ? err.message : 'Error al registrar', id: Date.now() })
    } finally {
      setConsumiendo(null)
    }
  }

  // Deshacer un consumo
  async function deshacerConsumo(registroId: string) {
    try {
      const { data: { session } } = await createClient().auth.getSession()
      const headers: Record<string, string> = {}
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`
      const res = await fetch(`/api/banco/consumo?id=${encodeURIComponent(registroId)}`, {
        method: 'DELETE', headers, credentials: 'include',
      })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      setToast({ msg: 'Deshecho', id: Date.now() })
      await fetchBanco()
    } catch (err) {
      setToast({ msg: err instanceof Error ? err.message : 'Error al deshacer', id: Date.now() })
    }
  }
  /* eslint-enable react-hooks/purity */

  function toggleExpanded(tipo: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(tipo)) { next.delete(tipo) } else { next.add(tipo) }
      return next
    })
  }

  // ── Render ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={20} className="animate-spin text-[#29ABE2]" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 text-center">
        <AlertCircle size={20} className="text-rose-500 mx-auto mb-2" />
        <p className="text-sm text-rose-600 mb-3">{error}</p>
        <button onClick={fetchBanco} className="text-xs font-bold text-[#29ABE2] underline">Reintentar</button>
      </div>
    )
  }

  if (!data?.hasPlan) {
    return (
      <div className="bg-white border border-[#E2ECF4] rounded-2xl p-8 text-center">
        <ChefHat size={36} className="text-[#8BA5BE] mx-auto mb-3" />
        <p className="text-sm font-bold text-[#0C3547] mb-1">Tu banco está en camino</p>
        <p className="text-xs text-[#8BA5BE] max-w-xs mx-auto">
          {data?.message ?? 'Tu profesional está armando tu plan. Aparecerá aquí en cuanto esté listo.'}
        </p>
      </div>
    )
  }

  const tieneOpciones = (data.comidas ?? []).some(c => c.opciones.length > 0)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-gradient-to-br from-[#29ABE2] to-[#1a6fa0] rounded-xl flex items-center justify-center">
            <Sparkles size={16} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-black text-[#0C1F2C]">Mi banco de hoy</p>
            <p className="text-[10px] text-[#8BA5BE]">Elige qué comer en cada tiempo · {data.fechaHoy}</p>
          </div>
        </div>
        <button
          onClick={fetchBanco}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-[#8BA5BE] hover:bg-[#F0F6FA] transition"
          aria-label="Refrescar"
          title="Refrescar"
        >
          <RefreshCw size={13} />
        </button>
      </div>

      {!tieneOpciones && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-center">
          <ChefHat size={24} className="text-amber-500 mx-auto mb-2" />
          <p className="text-sm font-bold text-amber-700">Aún no hay opciones en tu banco</p>
          <p className="text-xs text-amber-600 mt-1">Tu profesional las está preparando. Vuelve más tarde o revisa otras secciones de la app.</p>
        </div>
      )}

      {/* Por cada comida */}
      {(data.comidas ?? []).map(comida => {
        const isExpanded = expanded.has(comida.tipo)
        const yaConsumido = comida.consumidoHoy

        if (comida.opciones.length === 0) return null

        const sugerencia = comida.opciones.find(o => o.esSugerencia) ?? comida.opciones[0]
        const otras = comida.opciones.filter(o => o !== sugerencia)

        return (
          <div
            key={comida.tipo}
            className={cn(
              'bg-white border rounded-2xl overflow-hidden transition-colors',
              yaConsumido ? 'border-emerald-200' : 'border-[#E2ECF4]',
            )}
          >
            {/* Header del tiempo */}
            <div className="px-5 py-4 border-b border-[#F0F6FA]">
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-[#0C1F2C]">{comida.tipo}</p>
                  {yaConsumido && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full">
                      <CheckCircle size={9} /> Hoy comiste
                    </span>
                  )}
                </div>
                {comida.kcal && (
                  <span className="text-[10px] text-[#8BA5BE] font-medium">
                    ~{Math.round(comida.kcal)} kcal
                  </span>
                )}
              </div>
              {comida.macros && (
                <div className="flex items-center gap-3 text-[10px] text-[#6B7C93]">
                  <span className="flex items-center gap-1"><Beef size={10} className="text-blue-500" />{comida.macros.proteina_g}g</span>
                  <span className="flex items-center gap-1"><Wheat size={10} className="text-amber-500" />{comida.macros.carbohidrato_g}g</span>
                  <span className="flex items-center gap-1"><Droplets size={10} className="text-rose-400" />{comida.macros.grasa_g}g</span>
                </div>
              )}
            </div>

            <div className="p-5 space-y-3">
              {/* Si ya consumió, mostrar lo que comió + opción de deshacer */}
              {yaConsumido ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <CheckCircle size={18} className="text-emerald-500 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Registrado hoy</p>
                      <p className="text-sm font-bold text-[#0C1F2C] truncate">{yaConsumido.opcion_nombre}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => deshacerConsumo(yaConsumido.registro_id)}
                    className="flex-shrink-0 flex items-center gap-1 text-[10px] font-bold text-emerald-700 hover:underline"
                  >
                    <Undo2 size={10} /> Deshacer
                  </button>
                </div>
              ) : (
                <>
                  {/* Sugerencia destacada (rotación) */}
                  <OpcionCard
                    opcion={sugerencia}
                    destacado={true}
                    onConsumir={() => registrarConsumo(comida, sugerencia)}
                    onVerFicha={() => setPreview({ opcion: sugerencia, tiempo: comida.tipo })}
                    consumiendo={consumiendo === `${comida.tipo}-${sugerencia.nombre}`}
                  />

                  {/* Toggle otras opciones */}
                  {otras.length > 0 && (
                    <button
                      onClick={() => toggleExpanded(comida.tipo)}
                      className="w-full flex items-center justify-center gap-1.5 text-xs font-bold text-[#29ABE2] py-2 hover:bg-[#F0F9FF] rounded-lg transition"
                    >
                      {isExpanded ? 'Ocultar' : `Ver otras ${otras.length} opciones`}
                      <ChevronDown size={12} className={cn('transition-transform', isExpanded && 'rotate-180')} />
                    </button>
                  )}

                  {/* Otras opciones expandidas */}
                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden space-y-2"
                      >
                        {otras.map(op => (
                          <OpcionCard
                            key={op.nombre}
                            opcion={op}
                            destacado={false}
                            onConsumir={() => registrarConsumo(comida, op)}
                            onVerFicha={() => setPreview({ opcion: op, tiempo: comida.tipo })}
                            consumiendo={consumiendo === `${comida.tipo}-${op.nombre}`}
                          />
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              )}
            </div>
          </div>
        )
      })}

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-[#0C1F2C] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-1.5"
          >
            <CheckCircle size={12} className="text-emerald-400" /> {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de ficha */}
      <AnimatePresence>
        {preview && (
          <FichaPaciente
            opcion={preview.opcion}
            tiempoLabel={preview.tiempo}
            onClose={() => setPreview(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Card de una opción ──────────────────────────────────────────────────────
interface OpcionCardProps {
  opcion: OpcionConPriority
  destacado: boolean
  onConsumir: () => void
  onVerFicha: () => void
  consumiendo: boolean
}

function OpcionCard({ opcion, destacado, onConsumir, onVerFicha, consumiendo }: OpcionCardProps) {
  const aporte = opcion.aporte_porcion
  const dias = opcion.diasDesdeUltimoConsumo
  const meta = opcion.meta

  // Texto del badge de rotación
  const rotacionTexto = dias === null
    ? 'Nueva para ti'
    : dias === 0
      ? 'La comiste hoy'
      : dias === 1
        ? 'Ayer la comiste'
        : `Hace ${dias} días`

  const rotacionColor = dias === null
    ? 'bg-violet-50 text-violet-600'
    : dias < 2
      ? 'bg-amber-50 text-amber-600'
      : 'bg-emerald-50 text-emerald-600'

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'rounded-xl border p-4 transition',
        destacado
          ? 'bg-gradient-to-br from-[#EAF4FB] to-white border-[#29ABE2]/40 shadow-sm'
          : 'bg-[#F8FBFD] border-[#E2ECF4]',
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          {destacado && (
            <div className="flex items-center gap-1 mb-1.5">
              <Sparkles size={10} className="text-[#29ABE2]" />
              <span className="text-[9px] font-black uppercase tracking-wider text-[#29ABE2]">
                Lo que toca hoy
              </span>
            </div>
          )}
          <p className="text-sm font-bold text-[#0C1F2C] leading-snug">{opcion.nombre}</p>
        </div>
        <span className={cn('flex-shrink-0 text-[9px] font-bold px-2 py-0.5 rounded-full', rotacionColor)}>
          {rotacionTexto}
        </span>
      </div>

      {/* Macros mini */}
      {aporte && (
        <div className="flex items-center gap-3 mb-3 text-[10px] text-[#6B7C93]">
          <span className="flex items-center gap-1">
            <Flame size={10} className="text-[#29ABE2]" />
            <strong className="text-[#0C1F2C]">{Math.round(aporte.kcal)}</strong> kcal
          </span>
          <span>P {aporte.proteina_g}g</span>
          <span>C {aporte.carbohidrato_g}g</span>
          <span>G {aporte.grasa_g}g</span>
        </div>
      )}

      {/* Meta tags */}
      <div className="flex flex-wrap gap-1 mb-3">
        <Tag>{COCINA_LABEL[meta.cocina] ?? meta.cocina}</Tag>
        <Tag><Clock size={9} className="inline mr-0.5" />{meta.tiempo_min} min</Tag>
      </div>

      {/* Acciones */}
      <div className="flex gap-2">
        <button
          onClick={onConsumir}
          disabled={consumiendo}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 text-xs font-bold py-2.5 rounded-lg transition disabled:opacity-60',
            destacado
              ? 'bg-gradient-to-r from-[#29ABE2] to-[#1a6fa0] text-white hover:opacity-90'
              : 'bg-[#29ABE2] text-white hover:bg-[#1a8fc2]',
          )}
        >
          {consumiendo
            ? <><Loader2 size={11} className="animate-spin" /> Guardando...</>
            : <><CheckCircle size={11} /> Comí esta</>}
        </button>
        <button
          onClick={onVerFicha}
          className="flex items-center justify-center gap-1.5 text-xs font-bold px-3 py-2.5 rounded-lg bg-white border border-[#29ABE2] text-[#29ABE2] hover:bg-[#EAF4FB] transition"
        >
          <Eye size={11} /> Receta
        </button>
      </div>
    </motion.div>
  )
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-white border border-[#E2ECF4] text-[#6B7C93]">
      {children}
    </span>
  )
}

// ─── Modal de ficha (versión paciente — solo lectura, sin "imprimir") ────────
function FichaPaciente({
  opcion, tiempoLabel, onClose,
}: { opcion: OpcionPreparacion; tiempoLabel: string; onClose: () => void }) {
  const [html, setHtml] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { data: { session } } = await createClient().auth.getSession()
        const headers: Record<string, string> = { 'Content-Type': 'application/json' }
        if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`
        // Endpoint protegido por role='professional' — para el paciente
        // generamos la ficha inline (no necesitamos auth de profesional aquí).
        // Simulamos la generación con el mismo HTML inline ligero — sin pasar
        // por backend. Si quieres usar el endpoint, hay que abrirlo a pacientes
        // que vean SU propio plan (mejora futura). Por ahora inline.
        const inline = generarFichaInline(opcion, tiempoLabel)
        if (!cancelled) setHtml(inline)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'No se pudo cargar la receta')
      }
    })()
    return () => { cancelled = true }
  }, [opcion, tiempoLabel])

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 10 }}
        transition={{ type: 'spring', damping: 24, stiffness: 280 }}
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-md max-h-[92vh] flex flex-col shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#E2ECF4]">
          <div className="min-w-0">
            <p className="text-sm font-black text-[#0C1F2C] truncate">{opcion.nombre}</p>
            <p className="text-[10px] text-[#8BA5BE]">{tiempoLabel}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F0F6FA] text-[#8BA5BE] flex-shrink-0"
            aria-label="Cerrar"
          >
            <X size={14} />
          </button>
        </div>
        <div className="flex-1 overflow-hidden bg-[#F0F4F8]">
          {error ? (
            <div className="flex items-center justify-center h-full p-6 text-center">
              <p className="text-sm text-rose-500">{error}</p>
            </div>
          ) : !html ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 size={20} className="animate-spin text-[#29ABE2]" />
            </div>
          ) : (
            <iframe srcDoc={html} title="Receta" sandbox="allow-same-origin" className="w-full h-full border-0" />
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

/**
 * Genera la ficha HTML inline (sin pasar por backend). Versión ligera para el
 * paciente — misma estética que /api/fichas/preview pero sin requerir auth.
 */
function generarFichaInline(opcion: OpcionPreparacion, tiempoLabel: string): string {
  const esc = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const aporte = opcion.aporte_porcion ?? { kcal: 0, proteina_g: 0, carbohidrato_g: 0, grasa_g: 0 }
  const tagsArr: string[] = []
  for (const a of opcion.meta.apto_para ?? []) {
    if (typeof a === 'string' && a.startsWith('sin_')) tagsArr.push(`Sin ${a.slice(4).replace(/_/g, ' ')}`)
  }
  if (opcion.meta.timing === 'pre_entreno')  tagsArr.push('Pre-entreno')
  if (opcion.meta.timing === 'post_entreno') tagsArr.push('Post-entreno')
  tagsArr.push(`${opcion.meta.tiempo_min} min`)
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
:root{--cyan:#1DAEEC;--cyan-osc:#039CE0;--cyan-claro:#A6E1F7;--fondo:#F7FBFE;--blanco:#FFF;--texto:#0B2A3A;--texto-suave:#5A6C77;--divisor:#E5EEF4;--gris-fondo:#EDF3F8;}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Inter',sans-serif;background:var(--fondo);color:var(--texto);padding:16px;}
.head{background:linear-gradient(135deg,var(--cyan),var(--cyan-osc));color:#fff;padding:20px;border-radius:16px 16px 0 0;}
.marca{font-size:10px;font-weight:600;letter-spacing:.14em;opacity:.85;text-transform:uppercase}
.tiempo{font-size:11px;opacity:.9;margin-top:2px}
.titulo{font-size:20px;font-weight:700;margin-top:8px;line-height:1.2}
.tags{display:flex;flex-wrap:wrap;gap:6px;margin-top:12px}
.tag{background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.28);font-size:10px;padding:3px 9px;border-radius:999px}
.macros{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:var(--divisor);}
.kpi{background:var(--blanco);padding:14px 6px;text-align:center}
.kpi .val{font-size:18px;font-weight:700;line-height:1}
.kpi .lab{font-size:9px;color:var(--texto-suave);text-transform:uppercase;letter-spacing:.06em;margin-top:4px}
.kpi.kcal .val{color:var(--cyan-osc)}
.body{background:var(--blanco);padding:18px 20px;border-radius:0 0 16px 16px}
.seccion{margin-bottom:18px}
.seccion h3{font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--cyan-osc);margin-bottom:8px;padding-bottom:5px;border-bottom:1px solid var(--divisor);}
.ing{list-style:none;display:flex;flex-direction:column;gap:5px}
.ing li{display:flex;justify-content:space-between;font-size:13px}
.ing .nom{color:var(--texto)}
.ing .cant{color:var(--texto-suave);font-weight:500;white-space:nowrap;padding-left:10px}
.pasos{list-style:none;counter-reset:p;display:flex;flex-direction:column;gap:8px}
.pasos li{position:relative;padding-left:28px;font-size:13px;line-height:1.45;counter-increment:p}
.pasos li::before{content:counter(p);position:absolute;left:0;top:0;width:19px;height:19px;background:var(--cyan-claro);color:var(--cyan-osc);border-radius:50%;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center}
.nota{background:var(--gris-fondo);border-left:3px solid var(--cyan);border-radius:0 8px 8px 0;padding:10px 12px;font-size:12px;color:var(--texto-suave);line-height:1.45}
</style></head><body>
<div class="head">
  <div class="marca">Centro Metabólico</div>
  <div class="tiempo">${esc(tiempoLabel)}</div>
  <h1 class="titulo">${esc(opcion.nombre)}</h1>
  <div class="tags">${tagsArr.map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>
</div>
<div class="macros">
  <div class="kpi kcal"><div class="val">${Math.round(aporte.kcal)}</div><div class="lab">kcal</div></div>
  <div class="kpi"><div class="val">${aporte.proteina_g}g</div><div class="lab">Proteína</div></div>
  <div class="kpi"><div class="val">${aporte.carbohidrato_g}g</div><div class="lab">Carbs</div></div>
  <div class="kpi"><div class="val">${aporte.grasa_g}g</div><div class="lab">Grasa</div></div>
</div>
<div class="body">
  <div class="seccion"><h3>Ingredientes</h3><ul class="ing">${opcion.ingredientes.map(i => `<li><span class="nom">${esc(i.alimento)}</span><span class="cant">${i.gramos}g${i.medida_casera ? ' · ' + esc(i.medida_casera) : ''}</span></li>`).join('')}</ul></div>
  <div class="seccion"><h3>Preparación</h3><ol class="pasos">${opcion.pasos.map(p => `<li>${esc(p)}</li>`).join('')}</ol></div>
  ${opcion.notas_digestivas ? `<div class="seccion"><h3>Nota</h3><div class="nota">${esc(opcion.notas_digestivas)}</div></div>` : ''}
</div>
</body></html>`
}
