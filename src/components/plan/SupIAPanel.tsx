'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp, ShieldAlert, CheckCircle2, FlaskConical } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  PREGUNTAS_SUP,
  SUPLEMENTOS,
  EVIDENCIA_LABELS,
  EVIDENCIA_COLORS,
  calcularRecomendaciones,
  type RespuestaQ,
  type SuplemRecomendacion,
} from '@/lib/suplementacion'
import type { FormData } from '@/lib/nutrition'

// ─── Card de suplemento recomendado ──────────────────────────────────────────
function SupCard({ rec, index }: { rec: SuplemRecomendacion; index: number }) {
  const [expanded, setExpanded] = useState(false)
  const { suplemento: s, razon, contraindicado, notaSeguridad } = rec

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className={cn(
        'rounded-xl border overflow-hidden',
        contraindicado
          ? 'border-red-200 bg-red-50/50 opacity-75'
          : `border ${s.color.split(' ')[1]} bg-white`
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-3 p-3">
        <span className="text-xl flex-shrink-0 mt-0.5">{s.icono}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <p className={cn('text-sm font-black', contraindicado ? 'text-red-700 line-through' : 'text-[#0C1F2C]')}>
              {s.nombre}
            </p>
            <span className={cn('text-[9px] font-bold px-2 py-0.5 rounded-full', EVIDENCIA_COLORS[s.evidencia])}>
              Nivel {s.evidencia}
            </span>
            {contraindicado && (
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                ⚠ Contraindicado
              </span>
            )}
          </div>
          <p className="text-[11px] text-[#6B7C93] leading-relaxed">{s.descripcionCorta}</p>

          {/* Razones */}
          <div className="flex flex-wrap gap-1 mt-1.5">
            {razon.map(r => (
              <span key={r} className="text-[9px] bg-[#EAF4FB] text-[#1a6fa0] font-bold px-2 py-0.5 rounded-full">
                {r}
              </span>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setExpanded(e => !e)}
          className="text-[#8BA5BE] hover:text-[#29ABE2] transition flex-shrink-0 mt-1"
        >
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3 border-t border-[#F0F4F8] pt-3">

              {/* Dosis */}
              <div className="flex gap-2 bg-[#F8FBFD] rounded-lg px-3 py-2">
                <span className="text-xs flex-shrink-0">💊</span>
                <div>
                  <p className="text-[10px] font-bold text-[#8BA5BE] uppercase tracking-wide mb-0.5">Dosis sugerida</p>
                  <p className="text-xs font-semibold text-[#0C3547]">{s.dosis}</p>
                </div>
              </div>

              {/* Fisiología */}
              <div>
                <p className="text-[10px] font-bold text-[#8BA5BE] uppercase tracking-wide mb-1">Mecanismo de acción</p>
                <p className="text-[11px] text-[#4A6070] leading-relaxed">{s.fisiologia}</p>
              </div>

              {/* Evidencia */}
              <div className="flex items-center gap-2">
                <FlaskConical size={12} className="text-[#8BA5BE]" />
                <p className="text-[10px] text-[#8BA5BE]">{EVIDENCIA_LABELS[s.evidencia]}</p>
              </div>

              {/* Nota seguridad */}
              {notaSeguridad && (
                <div className="flex gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  <ShieldAlert size={13} className="text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] text-amber-800">{notaSeguridad}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── Panel principal ──────────────────────────────────────────────────────────
interface Props {
  form: Partial<FormData>
}

export function SupIAPanel({ form }: Props) {
  const [respuestas, setRespuestas] = useState<Record<string, RespuestaQ>>({})

  function responder(pregId: string, valor: RespuestaQ) {
    setRespuestas(prev => ({ ...prev, [pregId]: valor }))
  }

  const respondidas = Object.keys(respuestas).length
  const total = PREGUNTAS_SUP.length
  const recomendaciones = respondidas > 0 ? calcularRecomendaciones(respuestas, form) : []
  const aptas = recomendaciones.filter(r => !r.contraindicado)
  const contraind = recomendaciones.filter(r => r.contraindicado)

  return (
    <div className="space-y-5">

      {/* Intro */}
      <div className="flex gap-3 bg-blue-50 border border-blue-200 rounded-xl p-3">
        <span className="text-lg flex-shrink-0">🧠</span>
        <div>
          <p className="text-xs font-bold text-blue-900 mb-0.5">Diagnóstico inteligente de suplementación</p>
          <p className="text-xs text-blue-800 leading-relaxed">
            Responde las preguntas y el sistema identificará qué suplementos tienen sustento fisiológico
            para este paciente. Las contraindicaciones del paso anterior se aplican automáticamente.
          </p>
        </div>
      </div>

      {/* Progreso */}
      {respondidas > 0 && (
        <div>
          <div className="flex justify-between text-[10px] text-[#8BA5BE] mb-1">
            <span>{respondidas} de {total} preguntas respondidas</span>
            <span>{Math.round((respondidas / total) * 100)}%</span>
          </div>
          <div className="h-1.5 bg-[#EAF4FB] rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-[#29ABE2] to-[#0C3547] rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${(respondidas / total) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      )}

      {/* Preguntas */}
      <div className="space-y-4">
        {PREGUNTAS_SUP.map((preg, qi) => {
          const respActual = respuestas[preg.id]
          return (
            <div
              key={preg.id}
              className={cn(
                'border rounded-xl p-4 transition-all',
                respActual
                  ? 'border-[#29ABE2]/40 bg-[#F8FBFD]'
                  : 'border-[#E2ECF4] bg-white'
              )}
            >
              {/* Label área */}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base">{preg.icono}</span>
                <p className="text-[10px] font-bold text-[#8BA5BE] uppercase tracking-wide">
                  {qi + 1}. {preg.area}
                </p>
                {respActual && (
                  <CheckCircle2 size={13} className="text-[#29ABE2] ml-auto" />
                )}
              </div>

              {/* Pregunta */}
              <p className="text-sm font-semibold text-[#0C1F2C] mb-3 leading-snug">
                {preg.pregunta}
              </p>

              {/* Opciones */}
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                {preg.opciones.map(op => (
                  <button
                    type="button"
                    key={op.value}
                    onClick={() => responder(preg.id, op.value)}
                    className={cn(
                      'flex-1 sm:flex-none px-4 py-2.5 rounded-xl border-2 text-xs font-bold text-left sm:text-center transition-all',
                      respActual === op.value
                        ? 'bg-[#0C3547] border-[#0C3547] text-white shadow-sm'
                        : 'border-[#D6E3ED] text-[#6B7C93] hover:border-[#29ABE2] hover:text-[#0C3547] bg-white'
                    )}
                  >
                    {op.label}
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Recomendaciones */}
      <AnimatePresence>
        {recomendaciones.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-2 pt-2">
              <div className="flex-1 h-px bg-[#E2ECF4]" />
              <p className="text-xs font-black text-[#0C1F2C] px-3 whitespace-nowrap">
                📋 Suplementos sugeridos ({aptas.length})
              </p>
              <div className="flex-1 h-px bg-[#E2ECF4]" />
            </div>

            {aptas.length === 0 && (
              <div className="flex gap-3 bg-green-50 border border-green-200 rounded-xl p-3">
                <CheckCircle2 size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-green-800">
                  Sin suplementos indicados por los síntomas reportados. El enfoque sigue siendo la alimentación.
                </p>
              </div>
            )}

            {/* Indicados */}
            {aptas.map((rec, i) => (
              <SupCard key={rec.suplemento.id} rec={rec} index={i} />
            ))}

            {/* Contraindicados */}
            {contraind.length > 0 && (
              <>
                <p className="text-[10px] font-bold text-red-500 uppercase tracking-wide mt-4">
                  ⚠ Contraindicados según perfil de salud
                </p>
                {contraind.map((rec, i) => (
                  <SupCard key={rec.suplemento.id} rec={rec} index={i} />
                ))}
              </>
            )}

            {/* Nota clínica */}
            <div className="flex gap-2 bg-[#F0F6FA] border border-[#D6E3ED] rounded-xl p-3">
              <ShieldAlert size={13} className="text-[#8BA5BE] flex-shrink-0 mt-0.5" />
              <p className="text-[10px] text-[#6B7C93] leading-relaxed">
                Estas recomendaciones son orientativas y basadas en síntomas reportados.
                El profesional de salud siempre tiene la última palabra antes de iniciar cualquier suplementación.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
