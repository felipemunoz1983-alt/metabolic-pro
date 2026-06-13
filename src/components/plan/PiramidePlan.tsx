'use client'

import { useMemo, useState } from 'react'
import {
  PIRAMIDE_INFO,
  RECOM_PIRAMIDE,
  GRUPOS_PIRAMIDE_ORDEN,
  distribuirInicialPiramide,
  calcularAportePiramide,
  calcularAdecuacionPiramide,
  sumaPorMetaGrupo,
  type GrupoPiramide,
  type DistribucionPiramide,
  type MetaGrupoPiramide,
} from '@/lib/porciones'
import type { FormData, NutritionResult } from '@/lib/nutrition'
import { cn } from '@/lib/utils'

interface Props {
  result: NutritionResult
  form: FormData
}

/**
 * Plan por Pirámide Alimentaria Chilena (13 grupos · INTA-UCH / Sochinut).
 *
 * Tabla editable con libertad TOTAL para el profesional:
 *  - Cada celda PORCIONES es un input numérico ajustable
 *  - El aporte y % adecuación recalculan en vivo
 *  - El sistema NO bloquea valores fuera del rango RECOM (solo warning visual)
 *  - Fila resumen al pie: aporte pirámide vs requerimiento paciente vs %
 */
export function PiramidePlan({ result, form }: Props) {
  // Distribución inicial sugerida — el pro la ajusta libremente
  const distInicial = useMemo<DistribucionPiramide>(
    () => distribuirInicialPiramide(
      result.kcal,
      result.macros.p,
      result.macros.c,
      result.macros.g,
      form.objetivo,
    ),
    [result, form.objetivo],
  )

  const [dist, setDist] = useState<DistribucionPiramide>(distInicial)

  const aporte = useMemo(() => calcularAportePiramide(dist), [dist])
  const target = useMemo(() => ({ kcal: result.kcal, c: result.macros.c, g: result.macros.g, p: result.macros.p }), [result])
  const adecuacion = useMemo(() => calcularAdecuacionPiramide(aporte, target), [aporte, target])
  const sumasMeta = useMemo(() => sumaPorMetaGrupo(dist), [dist])

  function setPorciones(grupo: GrupoPiramide, valor: number) {
    setDist(d => ({ ...d, [grupo]: Math.max(0, valor) }))
  }

  function resetear() {
    setDist(distInicial)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#0C3547] to-[#0F1419] text-white rounded-2xl p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/60 font-bold mb-1">
              Plan por porciones · Pirámide alimentaria chilena
            </p>
            <h2 className="text-2xl font-black mb-1">Distribución por 13 grupos</h2>
            <p className="text-[11px] text-white/60">
              INTA-UCH · Sochinut · El profesional ajusta cada celda con libertad total.
            </p>
          </div>
          <button
            type="button"
            onClick={resetear}
            className="text-[10px] uppercase tracking-wider font-bold text-white/70 hover:text-white border border-white/20 rounded-md px-3 py-1.5 flex-shrink-0 transition"
            title="Volver a la distribución sugerida por el motor"
          >
            ↻ Reiniciar
          </button>
        </div>
      </div>

      {/* Tabla pirámide */}
      <div className="bg-white border border-[#D6E3ED] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-[#0C3547] text-white">
                <th className="px-2 py-2 text-center font-bold w-12">CÓDIGO</th>
                <th className="px-3 py-2 text-left   font-bold">GRUPO</th>
                <th className="px-2 py-2 text-center font-bold w-16">RECOM</th>
                <th className="px-2 py-2 text-center font-bold w-20">PORCIONES</th>
                <th className="px-2 py-2 text-right  font-bold w-14">KCALS</th>
                <th className="px-2 py-2 text-right  font-bold w-14">H DE C</th>
                <th className="px-2 py-2 text-right  font-bold w-14">LIPS.</th>
                <th className="px-2 py-2 text-right  font-bold w-14">PROT.</th>
              </tr>
            </thead>
            <tbody>
              {GRUPOS_PIRAMIDE_ORDEN.map((g, idx) => {
                const info = PIRAMIDE_INFO[g]
                const m = info.macros
                const n = dist[g]
                const kcal = n * m.kcal
                const c = n * m.c
                const grasa = n * m.g
                const prot = n * m.p

                // Si es la primera fila del meta-grupo, muestra el rango RECOM agrupado
                const previo = idx > 0 ? PIRAMIDE_INFO[GRUPOS_PIRAMIDE_ORDEN[idx - 1]].metaGrupo : null
                const esPrimerodeMeta = info.metaGrupo !== previo

                // Cuántas filas comparten este meta-grupo
                const filasMeta = GRUPOS_PIRAMIDE_ORDEN.filter(x => PIRAMIDE_INFO[x].metaGrupo === info.metaGrupo).length
                const sumaMeta = sumasMeta[info.metaGrupo]
                const recom = RECOM_PIRAMIDE[info.metaGrupo]
                const fueraDeRecom = sumaMeta > recom.max || (sumaMeta < recom.min && info.metaGrupo !== 'azucar')

                return (
                  <tr
                    key={g}
                    className={cn('border-t border-[#E2ECF4]', n === 0 && 'opacity-60')}
                    style={{ background: info.color + '60' }}
                  >
                    <td className="px-2 py-1.5 text-center font-bold text-[#0C3547]">{info.codigo}</td>
                    <td className="px-3 py-1.5 font-semibold text-[#0C3547] text-[11px]">{info.label}</td>
                    {esPrimerodeMeta && (
                      <td
                        className={cn(
                          'px-2 py-1.5 text-center font-bold text-[11px] border-l-2 border-[#0C3547]',
                          fueraDeRecom ? 'text-rose-700 bg-rose-50' : 'text-[#0C3547]',
                        )}
                        rowSpan={filasMeta}
                      >
                        {info.metaGrupo === 'azucar' ? '0' : `${recom.min}-${recom.max}`}
                        <div className="text-[9px] font-normal text-[#6B7C93] mt-0.5">
                          ({sumaMeta} asign.)
                        </div>
                      </td>
                    )}
                    <td className="px-1 py-1 text-center">
                      <input
                        type="number"
                        min={0}
                        step={0.5}
                        value={n}
                        onChange={e => setPorciones(g, Number(e.target.value) || 0)}
                        className={cn(
                          'w-16 text-center font-bold text-sm rounded border focus:outline-none focus:ring-2 focus:ring-[#29ABE2]/40 py-1',
                          n > 0 ? 'bg-white border-[#29ABE2] text-[#0C3547]' : 'bg-[#F8FBFD] border-[#D6E3ED] text-[#8BA5BE]',
                        )}
                      />
                    </td>
                    <td className="px-2 py-1.5 text-right font-bold text-[#0C3547]">{Math.round(kcal)}</td>
                    <td className="px-2 py-1.5 text-right text-[#4a6b80]">{Math.round(c)}</td>
                    <td className="px-2 py-1.5 text-right text-[#4a6b80]">{Math.round(grasa)}</td>
                    <td className="px-2 py-1.5 text-right text-[#4a6b80]">{Math.round(prot)}</td>
                  </tr>
                )
              })}

              {/* Fila APORTE PIRÁMIDE */}
              <tr className="border-t-2 border-[#0C3547] bg-[#F8FBFD]">
                <td colSpan={4} className="px-3 py-2 font-black text-[#0C3547] uppercase tracking-wide text-[11px]">
                  Aporte pirámide
                </td>
                <td className="px-2 py-2 text-right font-black text-[#0C3547]">{Math.round(aporte.kcal)}</td>
                <td className="px-2 py-2 text-right font-black text-[#0C3547]">{Math.round(aporte.c)}</td>
                <td className="px-2 py-2 text-right font-black text-[#0C3547]">{Math.round(aporte.g)}</td>
                <td className="px-2 py-2 text-right font-black text-[#0C3547]">{Math.round(aporte.p)}</td>
              </tr>

              {/* Fila REQUERIMIENTO PACIENTE */}
              <tr className="bg-[#F8FBFD]">
                <td colSpan={4} className="px-3 py-2 font-black text-rose-700 uppercase tracking-wide text-[11px]">
                  Requerimiento paciente
                </td>
                <td className="px-2 py-2 text-right font-black text-rose-700">{Math.round(target.kcal)}</td>
                <td className="px-2 py-2 text-right font-black text-rose-700">{Math.round(target.c)}</td>
                <td className="px-2 py-2 text-right font-black text-rose-700">{Math.round(target.g)}</td>
                <td className="px-2 py-2 text-right font-black text-rose-700">{Math.round(target.p)}</td>
              </tr>

              {/* Fila % ADECUACIÓN */}
              <tr className="bg-[#0C3547] text-white border-t border-[#0C3547]">
                <td colSpan={4} className="px-3 py-2 font-black uppercase tracking-wide text-[11px]">
                  % Adecuación
                </td>
                {(['kcal', 'c', 'g', 'p'] as const).map(macro => {
                  const pct = adecuacion[macro]
                  const dentroRango = pct >= 90 && pct <= 110
                  const cercano = pct >= 80 && pct <= 120
                  return (
                    <td
                      key={macro}
                      className={cn(
                        'px-2 py-2 text-right font-black',
                        dentroRango ? 'text-emerald-300' : cercano ? 'text-amber-300' : 'text-rose-300',
                      )}
                    >
                      {pct.toFixed(1)}%
                    </td>
                  )
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Leyenda y notas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
        <div className="bg-[#EAF4FB] border border-[#29ABE2] rounded-xl p-3">
          <p className="font-bold text-[#0C3547] mb-1">📊 Cómo leer la tabla</p>
          <ul className="text-[#4a6b80] space-y-1 leading-relaxed">
            <li>• <strong className="text-emerald-700">Verde</strong> (90-110%): adecuación óptima.</li>
            <li>• <strong className="text-amber-700">Amarillo</strong> (80-120%): aceptable, ajustar si querés ser más fino.</li>
            <li>• <strong className="text-rose-700">Rojo</strong>: revisar — fuera del rango clínico.</li>
            <li>• Rango RECOM en rojo: el meta-grupo se salió del rango Sochinut. Permitido pero documentarlo.</li>
          </ul>
        </div>
        <div className="bg-[#F8FBFD] border border-[#D6E3ED] rounded-xl p-3">
          <p className="font-bold text-[#0C3547] mb-1">🇨🇱 Referencias</p>
          <ul className="text-[#4a6b80] space-y-1 leading-relaxed">
            <li>• Atalah E, Castillo C. <em>Manual de Alimentación y Nutrición</em>. INTA-UCH.</li>
            <li>• Carrasco F. <em>Nutrición Clínica</em>. Sochinut.</li>
            <li>• MINSAL Guías Alimentarias 2022.</li>
            <li>• Macros por porción según INTA Chile (Pizarro & Atalah).</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
