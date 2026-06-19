'use client'

/**
 * GuiaIntercambiosClinica — referencia clínica para el profesional cuando arma
 * planes por porciones (feedback Felipe + Maria Jose, basado en PDF oficial
 * Centro Metabólico "Lista de Porciones de Intercambio — Frutas y Verduras",
 * Junio 2026).
 *
 * Contenido:
 *   1. Criterios clínicos numerados (frutas/día, distribución temporal, fructosa,
 *      fibra, jugos)
 *   2. Tabla rápida frutas (medida casera + gramos por porción)
 *   3. Tabla rápida verduras agrupadas por A/B/C (con explicación clínica)
 *
 * Aparece al final del Paso 4 del wizard PorcionesPlan (Alimentos reales) como
 * sección colapsable. Permite al pro referenciar las equivalencias oficiales
 * sin abandonar la pantalla del plan.
 */

import { useState } from 'react'
import { cn } from '@/lib/utils'

const CRITERIOS = [
  {
    n: '01',
    titulo: 'Frutas al día',
    body:   '2–3 porciones, priorizando bajo índice glicémico (berries, manzana, pera, kiwi, cítricos) en pacientes con resistencia a la insulina o déficit calórico.',
  },
  {
    n: '02',
    titulo: 'Distribución temporal',
    body:   'Una porción de fruta como snack pre o post entrenamiento mejora adherencia y rendimiento sin comprometer el déficit energético.',
  },
  {
    n: '03',
    titulo: 'Fructosa total',
    body:   'Evitar superar 50 g/día (≈ 4–5 porciones) en pacientes con hígado graso o hipertrigliceridemia.',
  },
  {
    n: '04',
    titulo: 'Fibra objetivo',
    body:   '≥ 25–30 g/día. La combinación de verdura libre + 2 frutas con cáscara suele cubrir el 60–70 % del requerimiento.',
  },
  {
    n: '05',
    titulo: 'Jugos de fruta',
    body:   'NO equivalen a una porción de intercambio: pierden fibra y elevan el índice glicémico. Reservar solo si hay justificación clínica (deporte de resistencia, recuperación específica).',
  },
] as const

// Frutas — 1 porción ≈ 15g CHO · 60 kcal (Centro Metabólico · ADA Exchange + adaptación chilena)
const FRUTAS_FRESCAS = [
  { fruta: 'Manzana',              medida: '1 unidad pequeña',         gramos: 120 },
  { fruta: 'Pera',                 medida: '1 unidad pequeña',         gramos: 120 },
  { fruta: 'Plátano',              medida: '½ unidad mediana',         gramos: 60  },
  { fruta: 'Naranja',              medida: '1 unidad mediana',         gramos: 150 },
  { fruta: 'Mandarina',            medida: '2 unidades pequeñas',      gramos: 150 },
  { fruta: 'Pomelo',               medida: '½ unidad mediana',         gramos: 130 },
  { fruta: 'Durazno',              medida: '1 unidad mediana',         gramos: 130 },
  { fruta: 'Nectarín',             medida: '1 unidad mediana',         gramos: 130 },
  { fruta: 'Ciruela',              medida: '2 unidades pequeñas',      gramos: 100 },
  { fruta: 'Damasco fresco',       medida: '4 unidades',                gramos: 130 },
  { fruta: 'Kiwi',                 medida: '1 unidad grande / 2 pequeños', gramos: 100 },
  { fruta: 'Frutilla',             medida: '1 taza',                    gramos: 150 },
  { fruta: 'Arándanos',            medida: '¾ taza',                    gramos: 110 },
  { fruta: 'Frambuesa / mora',     medida: '1 taza',                    gramos: 150 },
  { fruta: 'Cerezas',              medida: '12 unidades',               gramos: 100 },
  { fruta: 'Uvas',                 medida: '15 unidades pequeñas',     gramos: 80  },
  { fruta: 'Sandía',               medida: '1¼ taza en cubos',         gramos: 200 },
  { fruta: 'Melón',                medida: '1 taza en cubos',           gramos: 160 },
  { fruta: 'Piña',                 medida: '¾ taza en cubos',           gramos: 120 },
  { fruta: 'Papaya',               medida: '1 taza en cubos',           gramos: 140 },
  { fruta: 'Mango',                medida: '½ unidad pequeña',         gramos: 80  },
  { fruta: 'Higo fresco',          medida: '2 unidades pequeñas',      gramos: 90  },
  { fruta: 'Granada (arilos)',     medida: '½ taza',                    gramos: 75  },
  { fruta: 'Tuna',                 medida: '1 unidad mediana',          gramos: 100 },
  { fruta: 'Chirimoya',            medida: '¼ unidad mediana',         gramos: 75  },
  { fruta: 'Lúcuma',               medida: '¼ unidad pequeña',         gramos: 50  },
]

const FRUTAS_DESHIDRATADAS = [
  { fruta: 'Pasas',                medida: '1 cda colmada',             gramos: 15 },
  { fruta: 'Dátiles',              medida: '2 unidades',                 gramos: 15 },
  { fruta: 'Ciruelas pasas',       medida: '3 unidades',                 gramos: 20 },
  { fruta: 'Damascos deshidratados', medida: '4 unidades',              gramos: 20 },
]

// Verduras Grupo A — consumo libre (≤3g CHO/100g)
const VERDURAS_A = [
  { categoria: 'Hojas verdes',     items: 'Lechuga · Espinaca · Acelga · Kale · Rúcula · Berro · Repollo · Endivia' },
  { categoria: 'Crucíferas',       items: 'Brócoli · Coliflor · Repollo morado · Repollitos de Bruselas' },
  { categoria: 'Hortalizas frescas', items: 'Tomate · Pepino · Apio · Rabanito · Pimentón' },
  { categoria: 'Frutos verdes',    items: 'Zapallo italiano · Zapallito · Berenjena' },
  { categoria: 'Otras',            items: 'Champiñones · Espárragos' },
  { categoria: 'Condimentos',      items: 'Ají · Cebollín · Ajo' },
]

// Verduras Grupo B — 1 porción ≈ 5g CHO · 25 kcal (contar en glicemia estricta)
const VERDURAS_B = [
  { verdura: 'Zanahoria cruda',    medida: '½ taza rallada',            gramos: 60 },
  { verdura: 'Zanahoria cocida',   medida: '½ taza',                     gramos: 75 },
  { verdura: 'Betarraga cocida',   medida: '½ taza',                     gramos: 75 },
  { verdura: 'Alcachofa (corazón)', medida: '1 mediana',                gramos: 60 },
  { verdura: 'Habas verdes',       medida: '½ taza',                     gramos: 75 },
  { verdura: 'Cebolla cocida',     medida: '½ taza',                     gramos: 80 },
  { verdura: 'Porotos verdes',     medida: '½ taza',                     gramos: 80 },
  { verdura: 'Palmitos',           medida: '½ taza',                     gramos: 80 },
]

// Verduras Grupo C — >15g CHO/100g · cuentan como CEREAL (15g CHO ≈ 80 kcal)
const VERDURAS_C = [
  { alimento: 'Choclo',            porcion: '½ taza desgranado (80 g)' },
  { alimento: 'Arvejas',           porcion: '½ taza (80 g)' },
  { alimento: 'Papa cocida',       porcion: '1 unidad chica (80 g)' },
  { alimento: 'Camote cocido',     porcion: '½ taza (75 g)' },
  { alimento: 'Zapallo amarillo',  porcion: '1 taza (150 g)' },
]

export function GuiaIntercambiosClinica() {
  const [open, setOpen] = useState(false)

  return (
    <div className="bg-white border border-[#D6E3ED] rounded-2xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-[#F8FBFD] transition text-left"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl flex-shrink-0">📘</span>
          <div className="min-w-0">
            <p className="text-sm font-black text-[#0C3547]">Guía clínica · Lista de porciones de intercambio</p>
            <p className="text-[10px] text-[#6B7C93]">Frutas y verduras · ADA + adaptación chilena · Centro Metabólico</p>
          </div>
        </div>
        <span className={cn('text-[#8BA5BE] text-xs transition-transform', open && 'rotate-180')}>▼</span>
      </button>

      {open && (
        <div className="border-t border-[#E2ECF4] divide-y divide-[#F0F6FA]">
          {/* Criterios de uso clínico */}
          <section className="px-4 py-3 space-y-2">
            <p className="text-[10px] uppercase tracking-wider text-[#6B7C93] font-bold">Criterios de uso clínico</p>
            <div className="space-y-2">
              {CRITERIOS.map(c => (
                <div key={c.n} className="flex gap-3 items-start">
                  <span className="text-2xl font-black text-[#29ABE2] leading-none flex-shrink-0 w-8">{c.n}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-black text-[#0C1F2C]">{c.titulo}</p>
                    <p className="text-[11px] text-[#4a6b80] leading-relaxed mt-0.5">{c.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Tabla rápida frutas frescas */}
          <section className="px-4 py-3">
            <div className="flex items-center gap-2 mb-2">
              <p className="text-[10px] uppercase tracking-wider text-[#6B7C93] font-bold">🍎 Frutas frescas</p>
              <span className="text-[9px] bg-sky-100 text-sky-800 font-bold px-2 py-0.5 rounded-full">1 porción ≈ 15g CHO · 60 kcal</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[11px] border-collapse">
                <thead>
                  <tr className="bg-[#0C3547] text-white">
                    <th className="px-2 py-1.5 text-left font-bold">FRUTA</th>
                    <th className="px-2 py-1.5 text-left font-bold">MEDIDA CASERA</th>
                    <th className="px-2 py-1.5 text-right font-bold">GRAMOS</th>
                  </tr>
                </thead>
                <tbody>
                  {FRUTAS_FRESCAS.map((f, i) => (
                    <tr key={f.fruta} className={cn('border-t border-[#F0F6FA]', i % 2 === 0 ? 'bg-white' : 'bg-[#F8FBFD]')}>
                      <td className="px-2 py-1 font-semibold text-[#0C3547]">{f.fruta}</td>
                      <td className="px-2 py-1 text-[#4a6b80]">{f.medida}</td>
                      <td className="px-2 py-1 text-right text-[#29ABE2] font-bold">{f.gramos} g</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Tabla rápida frutas deshidratadas */}
          <section className="px-4 py-3">
            <div className="flex items-center gap-2 mb-2">
              <p className="text-[10px] uppercase tracking-wider text-[#6B7C93] font-bold">🍇 Frutas deshidratadas</p>
              <span className="text-[9px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">Alta densidad · controlar porción</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[11px] border-collapse">
                <thead>
                  <tr className="bg-[#0C3547] text-white">
                    <th className="px-2 py-1.5 text-left font-bold">FRUTA</th>
                    <th className="px-2 py-1.5 text-left font-bold">MEDIDA</th>
                    <th className="px-2 py-1.5 text-right font-bold">GRAMOS</th>
                  </tr>
                </thead>
                <tbody>
                  {FRUTAS_DESHIDRATADAS.map((f, i) => (
                    <tr key={f.fruta} className={cn('border-t border-[#F0F6FA]', i % 2 === 0 ? 'bg-white' : 'bg-[#F8FBFD]')}>
                      <td className="px-2 py-1 font-semibold text-[#0C3547]">{f.fruta}</td>
                      <td className="px-2 py-1 text-[#4a6b80]">{f.medida}</td>
                      <td className="px-2 py-1 text-right text-[#29ABE2] font-bold">{f.gramos} g</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-amber-700 italic mt-2">
              ⓘ La <strong>palta</strong> NO es fruta de intercambio — cuenta como porción de grasa (1 porción ≈ ⅓ palta mediana / 50 g).
            </p>
          </section>

          {/* Verduras Grupo A */}
          <section className="px-4 py-3 space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-[10px] uppercase tracking-wider text-[#6B7C93] font-bold">🥗 Verduras · Grupo A</p>
              <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">CONSUMO LIBRE · ≤3g CHO/100g</span>
            </div>
            <p className="text-[11px] text-[#4a6b80]">Aportan saciedad, fibra y micronutrientes con muy baja densidad energética. Base del plato bien construido.</p>
            <div className="space-y-1">
              {VERDURAS_A.map(g => (
                <div key={g.categoria} className="flex gap-2 text-[11px]">
                  <span className="font-bold text-[#0C3547] flex-shrink-0">{g.categoria}:</span>
                  <span className="text-[#4a6b80]">{g.items}</span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-emerald-700 italic mt-2 leading-relaxed bg-emerald-50 border border-emerald-200 rounded-lg p-2">
              <strong>Recomendación práctica:</strong> mínimo 2 tazas al día, repartidas entre almuerzo y cena. La mitad del plato debe ser verdura.
            </p>
          </section>

          {/* Verduras Grupo B */}
          <section className="px-4 py-3">
            <div className="flex items-center gap-2 mb-2">
              <p className="text-[10px] uppercase tracking-wider text-[#6B7C93] font-bold">🥕 Verduras · Grupo B</p>
              <span className="text-[9px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">1 porción ≈ 5g CHO · 25 kcal</span>
            </div>
            <p className="text-[11px] text-[#4a6b80] mb-2">Se contabilizan en pacientes con control glicémico estricto, deportistas con periodización, o objetivo de déficit ajustado.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-[11px] border-collapse">
                <thead>
                  <tr className="bg-[#0C3547] text-white">
                    <th className="px-2 py-1.5 text-left font-bold">VERDURA</th>
                    <th className="px-2 py-1.5 text-left font-bold">MEDIDA</th>
                    <th className="px-2 py-1.5 text-right font-bold">GRAMOS</th>
                  </tr>
                </thead>
                <tbody>
                  {VERDURAS_B.map((v, i) => (
                    <tr key={v.verdura} className={cn('border-t border-[#F0F6FA]', i % 2 === 0 ? 'bg-white' : 'bg-[#F8FBFD]')}>
                      <td className="px-2 py-1 font-semibold text-[#0C3547]">{v.verdura}</td>
                      <td className="px-2 py-1 text-[#4a6b80]">{v.medida}</td>
                      <td className="px-2 py-1 text-right text-[#29ABE2] font-bold">{v.gramos} g</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Verduras Grupo C */}
          <section className="px-4 py-3">
            <div className="flex items-center gap-2 mb-2">
              <p className="text-[10px] uppercase tracking-wider text-[#6B7C93] font-bold">🌽 Verduras · Grupo C</p>
              <span className="text-[9px] bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded-full">Contar como CEREAL · 15g CHO ≈ 80 kcal</span>
            </div>
            <p className="text-[11px] text-[#4a6b80] mb-2">Densidad de CHO &gt; 15 g/100 g — clínicamente NO van en el grupo de verduras sino como porción de cereal/farináceo.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-[11px] border-collapse">
                <thead>
                  <tr className="bg-[#0C3547] text-white">
                    <th className="px-2 py-1.5 text-left font-bold">ALIMENTO</th>
                    <th className="px-2 py-1.5 text-left font-bold">PORCIÓN ≈ 15g CHO</th>
                  </tr>
                </thead>
                <tbody>
                  {VERDURAS_C.map((v, i) => (
                    <tr key={v.alimento} className={cn('border-t border-[#F0F6FA]', i % 2 === 0 ? 'bg-white' : 'bg-[#F8FBFD]')}>
                      <td className="px-2 py-1 font-semibold text-[#0C3547]">{v.alimento}</td>
                      <td className="px-2 py-1 text-[#4a6b80]">{v.porcion}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Footer referencia */}
          <section className="px-4 py-3 bg-[#F8FBFD]">
            <p className="text-[10px] text-[#6B7C93] italic text-center leading-relaxed">
              📎 Referencia: ADA Exchange Lists · Adaptación nutricional chilena · Centro Metabólico · Ñuñoa, Santiago.
              <br />
              Flgo. Felipe — Nutricionista Deportivo. Material clínico oficial Junio 2026.
            </p>
          </section>
        </div>
      )}
    </div>
  )
}
