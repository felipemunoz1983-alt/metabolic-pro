'use client'

/**
 * BancoOpciones — UI del banco de preparaciones por tiempo de comida.
 *
 * Muestra, para cada comida del plan (Desayuno, Almuerzo, etc.):
 *   - Macros target del tiempo (kcal/P/C/G)
 *   - Grid de OpcionCards (cada preparación generada por la skill
 *     preparaciones-culinarias)
 *   - Botón "Ver ficha" → modal con iframe srcdoc del HTML branded
 *   - Botón "Regenerar opciones de este tiempo" → llama al endpoint
 *
 * Pensado para mountarse dentro de PanelProfesional, en la vista de detalle
 * del paciente, debajo del plan generado.
 *
 * Datos requeridos: el parent fetches plan_data del paciente y deriva los
 * `comidas[]` con sus opciones. Si una comida no tiene opciones aún, mostramos
 * un CTA para generar el banco.
 */
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChefHat, Clock, Eye, Loader2, X, ChevronDown, ChevronUp,
  Utensils, AlertCircle, Sparkles, Flame, Beef, Wheat, Droplets,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase'
import type { OpcionPreparacion } from '@/types/banco'

// ─── Tipos públicos del componente ──────────────────────────────────────────
export interface ComidaConOpciones {
  /** Identificador estable (puede ser el tipo o el id de DB). Usado como key. */
  id: string
  /** "Desayuno", "Almuerzo", "Once", "Cena", etc. */
  tipo: string
  /** Target calórico de la comida (opcional). */
  kcal?: number
  /** Targets de macros en gramos (opcional). */
  macros?: { proteina_g: number; carbohidrato_g: number; grasa_g: number }
  /** Las preparaciones generadas por la skill. Vacío = sin banco. */
  opciones: OpcionPreparacion[]
}

interface Props {
  planId: string
  /** Estructura de tiempos: tipo, kcal target, macros target. Las opciones
   *  llegan via GET /api/planes/[planId]/banco-opciones al montar. */
  comidas: ComidaConOpciones[]
  /** Callback opcional tras regenerar — útil si el parent quiere reflejarlo. */
  onRegenerated?: () => void | Promise<void>
}

/** Normaliza el tipo de comida (case-insensitive, sin acentos) para matchear
 *  entre lo que devuelve el adapter ("Almuerzo") y lo persistido ("almuerzo"). */
function normTipo(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
}

// ─── Helpers ────────────────────────────────────────────────────────────────
const COCINA_LABEL: Record<string, string> = {
  chilena:      '🇨🇱 Chilena',
  mediterranea: '🫒 Mediterránea',
  asiatica:     '🥢 Asiática',
  mexicana:     '🌶️ Mexicana',
  libre:        '🍽️ Libre',
}

const DIFICULTAD_LABEL: Record<string, string> = {
  facil:     'Fácil',
  media:     'Media',
  avanzada:  'Avanzada',
}

const TIMING_LABEL: Record<string, string> = {
  ninguno:      '',
  pre_entreno:  'Pre-entreno',
  post_entreno: 'Post-entreno',
}

/** Color del badge según el fit promedio (verde si todos los macros están ±10%). */
function fitColor(opcion: OpcionPreparacion): 'green' | 'amber' | 'red' {
  const fit = opcion.fit_vs_target
  if (!fit) return 'amber'
  const vals = [fit.proteina_pct, fit.carbohidrato_pct, fit.grasa_pct]
  const peor = Math.max(...vals.map(v => Math.abs(v - 100)))
  if (peor <= 10) return 'green'
  if (peor <= 20) return 'amber'
  return 'red'
}

// ─── Componente principal ────────────────────────────────────────────────────
export function BancoOpciones({ planId, comidas, onRegenerated }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(comidas.map(c => c.id)))
  const [regenTipo, setRegenTipo] = useState<string | null>(null)
  const [regenError, setRegenError] = useState<string | null>(null)
  const [preview, setPreview] = useState<{ opcion: OpcionPreparacion; tiempoLabel: string } | null>(null)
  /** Mapa keyed por tipo normalizado → opciones persistidas (vía GET). */
  const [opcionesFetched, setOpcionesFetched] = useState<Record<string, OpcionPreparacion[]>>({})
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  /** Lee el banco actual desde el endpoint GET. Se llama al mount y tras regenerar. */
  async function fetchBanco() {
    setLoadError(null)
    try {
      const { data: { session } } = await createClient().auth.getSession()
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`
      const res = await fetch(`/api/planes/${encodeURIComponent(planId)}/banco-opciones`, {
        method: 'GET', headers, credentials: 'include',
      })
      if (!res.ok) {
        if (res.status === 404) {
          // Plan no tiene aún banco persistido — primera vez. No es error.
          setOpcionesFetched({})
          return
        }
        throw new Error(`Error ${res.status}`)
      }
      const data = await res.json() as { opcionesPorTiempo?: Record<string, OpcionPreparacion[]> }
      // Normalizar keys para hacer match con los tipos del adapter
      const normalizado: Record<string, OpcionPreparacion[]> = {}
      for (const [k, v] of Object.entries(data.opcionesPorTiempo ?? {})) {
        normalizado[normTipo(k)] = v
      }
      setOpcionesFetched(normalizado)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'No se pudieron cargar las opciones')
    } finally {
      setLoading(false)
    }
  }

  // Cargar el banco al montar y cada vez que cambia el planId.
  // fetchBanco() llama a setState (loading/data/error) → es el patrón
  // legítimo de "sincronizar con sistema externo" del que habla la doc de
  // React; el lint rule es muy estricto y se silencia explícitamente acá.
  /* eslint-disable react-hooks/exhaustive-deps, react-hooks/set-state-in-effect -- async-fetch lifecycle pattern */
  useEffect(() => { fetchBanco() }, [planId])
  /* eslint-enable react-hooks/exhaustive-deps, react-hooks/set-state-in-effect */

  /** Merge: estructura del adapter + opciones persistidas (override por tipo). */
  const comidasMerged: ComidaConOpciones[] = comidas.map(c => ({
    ...c,
    opciones: opcionesFetched[normTipo(c.tipo)] ?? c.opciones ?? [],
  }))

  function toggleExpanded(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id) } else { next.add(id) }
      return next
    })
  }

  async function regenerarTiempo(tipo: string) {
    setRegenError(null)
    setRegenTipo(tipo)
    try {
      const { data: { session } } = await createClient().auth.getSession()
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`
      const res = await fetch(
        `/api/planes/${encodeURIComponent(planId)}/banco-opciones?tiempo=${encodeURIComponent(tipo)}`,
        { method: 'POST', headers, credentials: 'include' },
      )
      if (!res.ok) {
        const txt = await res.text().catch(() => '')
        throw new Error(`Error ${res.status}: ${txt.slice(0, 120) || 'sin detalle'}`)
      }
      // Re-fetch del banco para ver las nuevas opciones inmediatamente
      await fetchBanco()
      // Notifica al parent (opcional, ya no es necesario para refrescar)
      await onRegenerated?.()
    } catch (err) {
      setRegenError(err instanceof Error ? err.message : 'No se pudo regenerar el banco')
    } finally {
      setRegenTipo(null)
    }
  }

  if (!comidas.length) {
    return (
      <div className="bg-white border border-[#E2ECF4] rounded-2xl p-6 text-center">
        <ChefHat size={28} className="text-[#8BA5BE] mx-auto mb-3" />
        <p className="text-sm font-semibold text-[#0C3547]">El plan aún no tiene tiempos de comida</p>
        <p className="text-xs text-[#8BA5BE] mt-1">Genera primero un plan para poder armar el banco de opciones.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header de la sección */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-gradient-to-br from-[#29ABE2] to-[#1a6fa0] rounded-xl flex items-center justify-center">
            <ChefHat size={16} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-black text-[#0C1F2C]">Banco de opciones</p>
            <p className="text-[10px] text-[#8BA5BE]">
              Preparaciones que cuadran con cada tiempo de comida del plan
            </p>
          </div>
        </div>
      </div>

      {regenError && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl px-4 py-3">
          <AlertCircle size={14} className="flex-shrink-0" />
          {regenError}
        </div>
      )}

      {loadError && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 text-xs rounded-xl px-4 py-3">
          <AlertCircle size={14} className="flex-shrink-0" />
          No se pudieron cargar las opciones existentes ({loadError}). Puedes regenerar el banco para crearlas.
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-2 bg-[#F8FBFD] border border-[#E2ECF4] text-[#6B7C93] text-xs rounded-xl px-4 py-3">
          <Loader2 size={14} className="animate-spin flex-shrink-0 text-[#29ABE2]" />
          Cargando opciones del banco...
        </div>
      )}

      {/* Lista de tiempos */}
      {comidasMerged.map(comida => {
        const isExpanded = expanded.has(comida.id)
        const isRegenerating = regenTipo === comida.tipo
        const tiempoLabel = `${comida.tipo}${comida.kcal ? ` · ~${Math.round(comida.kcal)} kcal` : ''}`

        return (
          <div key={comida.id} className="bg-white border border-[#E2ECF4] rounded-2xl overflow-hidden">
            {/* Header de la comida */}
            <button
              onClick={() => toggleExpanded(comida.id)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#F8FBFD] transition"
            >
              <div className="flex items-center gap-3 text-left">
                <div className="w-8 h-8 bg-[#EAF4FB] rounded-lg flex items-center justify-center flex-shrink-0">
                  <Utensils size={14} className="text-[#29ABE2]" />
                </div>
                <div>
                  <p className="text-sm font-bold text-[#0C1F2C]">{comida.tipo}</p>
                  <div className="flex items-center gap-3 mt-0.5 text-[10px] text-[#6B7C93]">
                    {comida.kcal && (
                      <span className="flex items-center gap-1">
                        <Flame size={10} className="text-[#29ABE2]" />
                        {Math.round(comida.kcal)} kcal
                      </span>
                    )}
                    {comida.macros && (
                      <>
                        <span className="flex items-center gap-1">
                          <Beef size={10} className="text-blue-500" />
                          {comida.macros.proteina_g}g
                        </span>
                        <span className="flex items-center gap-1">
                          <Wheat size={10} className="text-amber-500" />
                          {comida.macros.carbohidrato_g}g
                        </span>
                        <span className="flex items-center gap-1">
                          <Droplets size={10} className="text-rose-400" />
                          {comida.macros.grasa_g}g
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-[10px] font-bold bg-[#EAF4FB] text-[#29ABE2] px-2 py-1 rounded-full">
                  {comida.opciones.length} {comida.opciones.length === 1 ? 'opción' : 'opciones'}
                </span>
                {isExpanded ? <ChevronUp size={14} className="text-[#8BA5BE]" /> : <ChevronDown size={14} className="text-[#8BA5BE]" />}
              </div>
            </button>

            <AnimatePresence initial={false}>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-5 pt-2 border-t border-[#F0F6FA]">
                    {/* Botón regenerar */}
                    <div className="flex justify-end mb-3">
                      <button
                        onClick={() => regenerarTiempo(comida.tipo)}
                        disabled={isRegenerating}
                        className="flex items-center gap-1.5 text-[11px] font-bold text-[#29ABE2] border border-[#29ABE2]/30 px-3 py-1.5 rounded-lg hover:bg-[#EAF4FB] transition disabled:opacity-60"
                      >
                        {isRegenerating
                          ? <><Loader2 size={11} className="animate-spin" /> Regenerando...</>
                          : <><Sparkles size={11} /> Regenerar opciones</>}
                      </button>
                    </div>

                    {/* Sin opciones → CTA */}
                    {comida.opciones.length === 0 ? (
                      <div className="text-center py-6 px-4 bg-[#F8FBFD] border border-dashed border-[#D6E3ED] rounded-xl">
                        <p className="text-xs text-[#6B7C93] mb-3">
                          Este tiempo de comida aún no tiene preparaciones en el banco.
                        </p>
                        <button
                          onClick={() => regenerarTiempo(comida.tipo)}
                          disabled={isRegenerating}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-gradient-to-r from-[#29ABE2] to-[#1a6fa0] px-4 py-2 rounded-lg hover:opacity-90 transition disabled:opacity-60"
                        >
                          {isRegenerating
                            ? <><Loader2 size={12} className="animate-spin" /> Generando...</>
                            : <><Sparkles size={12} /> Generar banco para {comida.tipo.toLowerCase()}</>}
                        </button>
                      </div>
                    ) : (
                      /* Grid de OpcionCards */
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {comida.opciones.map((opcion, idx) => (
                          <OpcionCard
                            key={`${comida.id}-${idx}-${opcion.nombre}`}
                            opcion={opcion}
                            onVerFicha={() => setPreview({ opcion, tiempoLabel })}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}

      {/* Modal de preview de ficha */}
      <AnimatePresence>
        {preview && (
          <FichaPreviewModal
            opcion={preview.opcion}
            tiempoLabel={preview.tiempoLabel}
            onClose={() => setPreview(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Card de una opción ──────────────────────────────────────────────────────
interface OpcionCardProps {
  opcion: OpcionPreparacion
  onVerFicha: () => void
}

function OpcionCard({ opcion, onVerFicha }: OpcionCardProps) {
  const aporte = opcion.aporte_porcion
  const fit = fitColor(opcion)
  const timing = TIMING_LABEL[opcion.meta.timing] ?? ''

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#F8FBFD] border border-[#E2ECF4] rounded-xl p-4 hover:border-[#29ABE2]/40 hover:shadow-sm transition"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <p className="text-sm font-bold text-[#0C1F2C] leading-snug">{opcion.nombre}</p>
        <div className={cn(
          'flex-shrink-0 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider',
          fit === 'green' && 'bg-emerald-50 text-emerald-600',
          fit === 'amber' && 'bg-amber-50 text-amber-600',
          fit === 'red'   && 'bg-rose-50 text-rose-600',
        )}>
          {fit === 'green' ? '✓ fit' : fit === 'amber' ? '~ fit' : '⚠ desv.'}
        </div>
      </div>

      {/* Macros mini */}
      {aporte && (
        <div className="grid grid-cols-4 gap-1 mb-3 bg-white border border-[#E2ECF4] rounded-lg p-1.5">
          <Macro label="kcal" value={Math.round(aporte.kcal)} accent />
          <Macro label="P" value={`${aporte.proteina_g}g`} />
          <Macro label="C" value={`${aporte.carbohidrato_g}g`} />
          <Macro label="G" value={`${aporte.grasa_g}g`} />
        </div>
      )}

      {/* Tags meta */}
      <div className="flex flex-wrap gap-1 mb-3">
        <Tag>{COCINA_LABEL[opcion.meta.cocina] ?? opcion.meta.cocina}</Tag>
        <Tag><Clock size={9} className="inline mr-0.5" />{opcion.meta.tiempo_min} min</Tag>
        <Tag>{DIFICULTAD_LABEL[opcion.meta.dificultad] ?? opcion.meta.dificultad}</Tag>
        {timing && <Tag highlight>{timing}</Tag>}
      </div>

      {/* Preparación corta + ingredientes count */}
      <p className="text-[11px] text-[#6B7C93] leading-relaxed line-clamp-2 mb-3">
        {opcion.preparacion}
      </p>
      <p className="text-[10px] text-[#8BA5BE] mb-3">
        {opcion.ingredientes.length} ingredientes · {opcion.pasos.length} pasos
      </p>

      {/* CTA */}
      <button
        onClick={onVerFicha}
        className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-bold bg-white border border-[#29ABE2] text-[#29ABE2] rounded-lg hover:bg-[#29ABE2] hover:text-white transition"
      >
        <Eye size={11} /> Ver ficha
      </button>
    </motion.div>
  )
}

function Macro({ label, value, accent }: { label: string; value: number | string; accent?: boolean }) {
  return (
    <div className="text-center">
      <p className={cn('text-[11px] font-black leading-tight', accent ? 'text-[#29ABE2]' : 'text-[#0C1F2C]')}>
        {value}
      </p>
      <p className="text-[8px] text-[#8BA5BE] uppercase tracking-wider">{label}</p>
    </div>
  )
}

function Tag({ children, highlight }: { children: React.ReactNode; highlight?: boolean }) {
  return (
    <span className={cn(
      'text-[9px] font-bold px-2 py-0.5 rounded-full',
      highlight
        ? 'bg-[#29ABE2]/10 text-[#29ABE2] border border-[#29ABE2]/30'
        : 'bg-white border border-[#E2ECF4] text-[#6B7C93]',
    )}>
      {children}
    </span>
  )
}

// ─── Modal de preview de la ficha ────────────────────────────────────────────
interface FichaPreviewModalProps {
  opcion: OpcionPreparacion
  tiempoLabel: string
  onClose: () => void
}

function FichaPreviewModal({ opcion, tiempoLabel, onClose }: FichaPreviewModalProps) {
  const [html, setHtml] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Pedir el HTML al endpoint /api/fichas/preview en cuanto el modal monta.
  // setState ocurre dentro del IIFE async, no en el body del effect — no
  // dispara react-hooks/set-state-in-effect.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { data: { session } } = await createClient().auth.getSession()
        const headers: Record<string, string> = { 'Content-Type': 'application/json' }
        if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`
        const res = await fetch('/api/fichas/preview', {
          method:      'POST',
          headers,
          credentials: 'include',
          body:        JSON.stringify({ opcion, tiempoComidaLabel: tiempoLabel }),
        })
        if (!res.ok) throw new Error(`Error ${res.status}`)
        const text = await res.text()
        if (!cancelled) setHtml(text)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'No se pudo cargar la ficha')
      }
    })()
    return () => { cancelled = true }
  }, [opcion, tiempoLabel])

  function imprimir() {
    if (!html) return
    const blob = new Blob([html], { type: 'text/html' })
    const url  = URL.createObjectURL(blob)
    const win  = window.open(url, '_blank')
    if (win) {
      setTimeout(() => { try { win.print() } catch { /* user-canceled */ } }, 600)
    }
    // URL queda viva mientras la pestaña esté abierta
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: 'spring', damping: 24, stiffness: 280 }}
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#E2ECF4]">
          <div>
            <p className="text-sm font-black text-[#0C1F2C]">Ficha de preparación</p>
            <p className="text-[10px] text-[#8BA5BE]">{tiempoLabel} · {opcion.nombre}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={imprimir}
              disabled={!html}
              className="text-xs font-bold bg-[#29ABE2] text-white px-3 py-1.5 rounded-lg hover:bg-[#1a8fc2] transition disabled:opacity-50"
            >
              Imprimir / PDF
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F0F6FA] text-[#8BA5BE] transition"
              aria-label="Cerrar"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Iframe con la ficha */}
        <div className="flex-1 overflow-hidden bg-[#F0F4F8]">
          {error ? (
            <div className="flex items-center justify-center h-full p-6 text-center">
              <div>
                <AlertCircle size={28} className="text-rose-400 mx-auto mb-2" />
                <p className="text-sm text-rose-500">{error}</p>
              </div>
            </div>
          ) : !html ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 size={20} className="animate-spin text-[#29ABE2]" />
            </div>
          ) : (
            <iframe
              srcDoc={html}
              title="Ficha de preparación"
              sandbox="allow-same-origin"
              className="w-full h-full border-0"
            />
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
