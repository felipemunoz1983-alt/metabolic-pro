'use client'

import { useEffect, useState } from 'react'
import type { NutritionResult, FormData } from '@/lib/nutrition'
import { OBJETIVO_LABELS, formulaLabel } from '@/lib/nutrition'
import { generarPlan } from '@/lib/planGenerator'

interface PlanData {
  result: NutritionResult
  form: FormData
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export default function ImprimirPlan() {
  const [data, setData] = useState<PlanData | null>(null)
  const [printed, setPrinted] = useState(false)

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('plan_para_imprimir')
      if (raw) setData(JSON.parse(raw))
    } catch { /* noop */ }
  }, [])

  useEffect(() => {
    if (data && !printed) {
      setPrinted(true)
      setTimeout(() => window.print(), 600)
    }
  }, [data, printed])

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-gray-400 text-sm">Cargando plan...</p>
      </div>
    )
  }

  const { result, form } = data
  const { kcal, macros, bmr, tdee, pal } = result
  const weekPlan = generarPlan(form, Math.round(kcal))
  const today = new Date().toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <>
      {/* Print styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', sans-serif; background: white; color: #0C1F2C; }

        @media print {
          @page { size: A4; margin: 15mm 12mm; }
          .no-print { display: none !important; }
          .page-break { page-break-before: always; }
          body { font-size: 11px; }
        }

        @media screen {
          body { max-width: 800px; margin: 0 auto; padding: 24px; }
        }
      `}</style>

      {/* Print button — hidden on print */}
      <div className="no-print fixed top-4 right-4 flex gap-2 z-50">
        <button
          onClick={() => window.print()}
          style={{ background: '#0C3547', color: 'white', padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', border: 'none' }}
        >
          🖨️ Imprimir / Guardar PDF
        </button>
        <button
          onClick={() => window.close()}
          style={{ background: '#E2ECF4', color: '#0C1F2C', padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', border: 'none' }}
        >
          ✕ Cerrar
        </button>
      </div>

      <div style={{ padding: '0 0 40px 0' }}>

        {/* ── Encabezado ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, paddingBottom: 16, borderBottom: '2px solid #29ABE2' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <div style={{ width: 36, height: 36, background: 'linear-gradient(135deg, #29ABE2, #1a6fa0)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: 'white', fontWeight: 900, fontSize: 14 }}>CM</span>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 900, color: '#0C1F2C', lineHeight: 1.2 }}>CENTRO METABÓLICO</div>
                <div style={{ fontSize: 9, fontWeight: 700, color: '#29ABE2', letterSpacing: 2 }}>PRO · CLINICAL ENGINE</div>
              </div>
            </div>
            <div style={{ fontSize: 10, color: '#8BA5BE' }}>Plan Nutricional Personalizado · {today}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#0C3547' }}>{form.nombre}</div>
            <div style={{ fontSize: 11, color: '#29ABE2', fontWeight: 700, marginTop: 2 }}>{OBJETIVO_LABELS[form.objetivo]}</div>
            <div style={{ fontSize: 10, color: '#8BA5BE', marginTop: 2 }}>
              {form.edad} años · {form.sexo} · {form.peso} kg · {form.talla} cm
            </div>
          </div>
        </div>

        {/* ── Macros principales ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
          {[
            { label: 'Meta Calórica', value: Math.round(kcal).toLocaleString(), unit: 'kcal/día', color: '#29ABE2' },
            { label: 'Proteína', value: `${macros.p}g`, unit: `${Math.round(macros.p * 4)} kcal`, color: '#22c55e' },
            { label: 'Carbohidratos', value: `${macros.c}g`, unit: `${Math.round(macros.c * 4)} kcal`, color: '#3b82f6' },
            { label: 'Grasas', value: `${macros.g}g`, unit: `${Math.round(macros.g * 9)} kcal`, color: '#f59e0b' },
          ].map(m => (
            <div key={m.label} style={{ background: '#F8FBFD', border: `1.5px solid ${m.color}30`, borderRadius: 12, padding: '12px 10px', textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: '#8BA5BE', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{m.label}</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: m.color, lineHeight: 1 }}>{m.value}</div>
              <div style={{ fontSize: 9, color: '#8BA5BE', marginTop: 3 }}>{m.unit}</div>
            </div>
          ))}
        </div>

        {/* ── Datos clínicos ── */}
        <div style={{ background: '#F0F6FA', borderRadius: 10, padding: '10px 16px', marginBottom: 20, display: 'flex', gap: 24 }}>
          <span style={{ fontSize: 10, color: '#6B7C93' }}>TMB ({formulaLabel(result.formulaUsada)}): <strong style={{ color: '#0C3547' }}>{Math.round(bmr)} kcal</strong></span>
          <span style={{ fontSize: 10, color: '#6B7C93' }}>TDEE (GET): <strong style={{ color: '#0C3547' }}>{Math.round(tdee)} kcal</strong></span>
          <span style={{ fontSize: 10, color: '#6B7C93' }}>Factor PAL: <strong style={{ color: '#0C3547' }}>{pal}</strong></span>
          <span style={{ fontSize: 10, color: '#6B7C93' }}>Comidas/día: <strong style={{ color: '#0C3547' }}>{(form as unknown as Record<string, unknown>).nComidas as number ?? '-'}</strong></span>
        </div>

        {/* ── Plan semanal ── */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 900, color: '#0C3547', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14, borderBottom: '1px solid #E2ECF4', paddingBottom: 6 }}>
            📅 Plan Semanal Detallado
          </div>

          {weekPlan.dias.slice(0, 7).map((day, di) => (
            <div key={di} style={{ marginBottom: 16, pageBreakInside: 'avoid' }}>
              {/* Día header */}
              <div style={{ background: '#0C3547', color: 'white', padding: '5px 12px', borderRadius: '8px 8px 0 0', fontSize: 11, fontWeight: 700 }}>
                {day.nombre} — {day.totalKcal.toLocaleString()} kcal · P:{day.totalP}g · C:{day.totalC}g · G:{day.totalG}g
              </div>
              {/* Comidas */}
              <div style={{ border: '1px solid #E2ECF4', borderTop: 'none', borderRadius: '0 0 8px 8px', overflow: 'hidden' }}>
                {day.meals.map((meal, mi) => (
                  <div key={mi} style={{
                    display: 'grid',
                    gridTemplateColumns: '100px 1fr auto',
                    gap: 8,
                    padding: '6px 12px',
                    background: mi % 2 === 0 ? '#FFFFFF' : '#F8FBFD',
                    alignItems: 'start',
                    borderTop: mi > 0 ? '1px solid #F0F6FA' : 'none',
                  }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#29ABE2' }}>
                      {meal.label}
                    </div>
                    <div style={{ fontSize: 10, color: '#0C1F2C' }}>
                      {meal.items.join(' · ')}
                    </div>
                    <div style={{ fontSize: 9, color: '#8BA5BE', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {meal.kcal} kcal
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* ── Notas digestivas ── */}
        {(form.digDiag !== 'no' || form.digHinchazon !== 'nunca' || (form.digIntolerancias?.length ?? 0) > 0) && (
          <div style={{ background: '#FFF8ED', border: '1px solid #F59E0B50', borderRadius: 10, padding: '10px 14px', marginBottom: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#B45309', marginBottom: 6 }}>⚠️ Consideraciones digestivas</div>
            {(form.digDiag === 'si_sibo' || form.digDiag === 'sospecha') && (
              <div style={{ fontSize: 10, color: '#92400E', marginBottom: 3 }}>• Protocolo SIBO/SII: evitar FODMAPs altos, comidas pequeñas y frecuentes</div>
            )}
            {(form.digHinchazon === 'frecuente' || form.digHinchazon === 'diaria') && (
              <div style={{ fontSize: 10, color: '#92400E', marginBottom: 3 }}>• Hinchazón frecuente: reducir legumbres, lactosa y carbohidratos fermentables</div>
            )}
            {form.digIntolerancias?.map((i: string) => (
              <div key={i} style={{ fontSize: 10, color: '#92400E', marginBottom: 3 }}>• Intolerancia: {i}</div>
            ))}
          </div>
        )}

        {/* ── Pie de página ── */}
        <div style={{ borderTop: '1px solid #E2ECF4', paddingTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 9, color: '#C8D8E4' }}>
            Centro Metabólico Pro · centrometabolico.cl · Plan generado con motor {formulaLabel(result.formulaUsada)} + PAL
          </div>
          <div style={{ fontSize: 9, color: '#C8D8E4' }}>
            Este plan es una guía nutricional. No reemplaza la evaluación clínica profesional.
          </div>
        </div>

      </div>
    </>
  )
}
