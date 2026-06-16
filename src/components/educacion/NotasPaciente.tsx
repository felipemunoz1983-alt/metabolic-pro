'use client'

/**
 * NotasPaciente — vista readonly del paciente para las notas clinicas que
 * escribio su nutricionista (feedback Felipe: el pro escribe pero el paciente
 * no las veia en ningun lado).
 *
 * Muestra solo los 3 campos marcados como "visible al paciente" en el modulo
 * del pro (NotasClinicas.tsx):
 *   - Indicaciones generales
 *   - Suplementacion
 *   - Rutina de entrenamiento
 *
 * NO muestra examenes_solicitados_pro (uso interno del pro).
 * Si todos los campos visibles estan vacios, el componente retorna null
 * (no infla la UI con seccion hueca).
 */

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Loader2, ClipboardList } from 'lucide-react'

interface Props {
  patientId: string
}

interface Notas {
  indicaciones_pro:         string | null
  suplementacion_pro:       string | null
  rutina_entrenamiento_pro: string | null
  notas_clinicas_updated_at: string | null
}

const CAMPOS = [
  { key: 'indicaciones_pro'        as const, label: 'Indicaciones generales', emoji: '📋', color: 'sky' },
  { key: 'suplementacion_pro'      as const, label: 'Suplementación',         emoji: '💊', color: 'violet' },
  { key: 'rutina_entrenamiento_pro' as const, label: 'Rutina de entrenamiento', emoji: '🏋️', color: 'amber' },
]

export function NotasPaciente({ patientId }: Props) {
  const supabase = createClient()
  const [notas, setNotas] = useState<Notas | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancel = false
    ;(async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('indicaciones_pro, suplementacion_pro, rutina_entrenamiento_pro, notas_clinicas_updated_at')
        .eq('id', patientId)
        .maybeSingle()
      if (cancel) return
      if (error) {
        console.error('[notas-paciente]', error)
      } else if (data) {
        setNotas(data as Notas)
      }
      setLoading(false)
    })()
    return () => { cancel = true }
  }, [patientId, supabase])

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-[#8BA5BE] py-3">
        <Loader2 className="animate-spin" size={12} /> Cargando indicaciones…
      </div>
    )
  }
  if (!notas) return null

  const algoQueMostrar = CAMPOS.some(c => (notas[c.key] ?? '').trim().length > 0)
  if (!algoQueMostrar) return null

  return (
    <div className="bg-white border border-[#D6E3ED] rounded-2xl overflow-hidden">
      <div className="bg-gradient-to-r from-sky-50 to-[#F8FBFD] border-b border-[#D6E3ED] px-4 py-3 flex items-center gap-2">
        <ClipboardList size={16} className="text-sky-700" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-[#0C1F2C]">Indicaciones de tu nutri</p>
          {notas.notas_clinicas_updated_at && (
            <p className="text-[10px] text-[#6B7C93]">
              Actualizadas el {new Date(notas.notas_clinicas_updated_at).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
          )}
        </div>
      </div>
      <div className="divide-y divide-[#F0F6FA]">
        {CAMPOS.map(c => {
          const valor = (notas[c.key] ?? '').trim()
          if (!valor) return null
          const bg     = c.color === 'sky' ? 'bg-sky-50/40' : c.color === 'violet' ? 'bg-violet-50/40' : 'bg-amber-50/40'
          const badge  = c.color === 'sky' ? 'bg-sky-100 text-sky-800' : c.color === 'violet' ? 'bg-violet-100 text-violet-800' : 'bg-amber-100 text-amber-800'
          return (
            <div key={c.key} className={`px-4 py-3 ${bg}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base">{c.emoji}</span>
                <p className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${badge}`}>
                  {c.label}
                </p>
              </div>
              <p className="text-sm text-[#0C1F2C] leading-relaxed whitespace-pre-wrap">
                {valor}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
