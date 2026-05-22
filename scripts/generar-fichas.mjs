#!/usr/bin/env node
/**
 * scripts/generar-fichas.mjs — Genera fichas HTML para un set de opciones.
 *
 * Uso:
 *   node scripts/generar-fichas.mjs                  # regenera el demo set (6 opciones)
 *   node scripts/generar-fichas.mjs --input plan.json  # genera desde un plan exportado
 *
 * Para integrar con el endpoint POST /api/planes/[planId]/banco-opciones,
 * importa { buildFichaHTML, slugifyNombre } desde src/lib/ficha-generator.ts.
 * Este script es CLI puro para demo / regeneración batch fuera del runtime de Next.
 *
 * Las fichas salen en docs/fichas/ — A5 imprimibles, con branding Centro Metabólico.
 */
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const OUT_DIR = resolve(ROOT, 'docs/fichas')

// ─── Generador inline (mismo algoritmo que src/lib/ficha-generator.ts) ──────
// Duplicado a propósito para que el script funcione sin compilar TS.
// Si cambias el branding, edita AMBOS y mantén en sync.

const BRAND_CSS = `:root{--cyan:#1DAEEC;--cyan-osc:#039CE0;--cyan-claro:#A6E1F7;--fondo:#F7FBFE;--blanco:#FFFFFF;--texto:#0B2A3A;--texto-suave:#5A6C77;--divisor:#E5EEF4;--gris-fondo:#EDF3F8;}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:var(--fondo);color:var(--texto);-webkit-font-smoothing:antialiased;padding:32px;display:flex;justify-content:center;}
.ficha{width:148mm;min-height:210mm;background:var(--blanco);border-radius:20px;overflow:hidden;box-shadow:0 12px 40px rgba(3,42,58,.10);display:flex;flex-direction:column;}
.head{background:linear-gradient(135deg,var(--cyan) 0%,var(--cyan-osc) 100%);color:#fff;padding:28px 30px 24px;}
.marca{font-size:11px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;opacity:.85}
.tiempo-comida{font-size:12px;font-weight:500;opacity:.9;margin-top:2px}
.titulo{font-size:26px;font-weight:700;line-height:1.15;letter-spacing:-.01em;margin-top:10px}
.tags{display:flex;flex-wrap:wrap;gap:6px;margin-top:14px}
.tag{background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.28);font-size:11px;font-weight:500;padding:4px 10px;border-radius:999px;}
.macros{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:var(--divisor)}
.kpi{background:var(--blanco);padding:16px 8px;text-align:center}
.kpi .val{font-size:22px;font-weight:700;font-variant-numeric:tabular-nums;line-height:1}
.kpi .lab{font-size:10px;font-weight:500;color:var(--texto-suave);text-transform:uppercase;letter-spacing:.06em;margin-top:5px}
.kpi.kcal .val{color:var(--cyan-osc)}
.body{padding:24px 30px;flex:1}
.seccion{margin-bottom:22px}
.seccion h3{font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--cyan-osc);margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid var(--divisor);}
.ingredientes{list-style:none;display:flex;flex-direction:column;gap:7px}
.ingredientes li{display:flex;justify-content:space-between;font-size:14px;line-height:1.4}
.ingredientes .nom{color:var(--texto)}
.ingredientes .cant{color:var(--texto-suave);font-variant-numeric:tabular-nums;font-weight:500;white-space:nowrap;padding-left:12px}
.pasos{list-style:none;counter-reset:p;display:flex;flex-direction:column;gap:9px}
.pasos li{position:relative;padding-left:30px;font-size:14px;line-height:1.45;counter-increment:p}
.pasos li::before{content:counter(p);position:absolute;left:0;top:0;width:21px;height:21px;background:var(--cyan-claro);color:var(--cyan-osc);border-radius:50%;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;}
.nota{background:var(--gris-fondo);border-left:3px solid var(--cyan);border-radius:0 10px 10px 0;padding:12px 14px;font-size:13px;color:var(--texto-suave);line-height:1.45;}
.nota b{color:var(--texto);font-weight:600}
.foot{padding:14px 30px;border-top:1px solid var(--divisor);display:flex;justify-content:space-between;align-items:center;font-size:11px;color:var(--texto-suave);}
.foot .meta-foot{font-variant-numeric:tabular-nums}
@media print{body{padding:0;background:#fff}.ficha{box-shadow:none;border-radius:0;width:100%;min-height:100vh}@page{size:A5;margin:0}}`

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const slugify = nombre => nombre.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

function inferirTags(opcion) {
  const m = opcion.meta ?? {}
  const tags = []
  for (const a of m.apto_para ?? []) {
    if (typeof a === 'string' && a.startsWith('sin_')) tags.push(`Sin ${a.slice(4).replace(/_/g, ' ')}`)
    else                                                tags.push(String(a).replace(/_/g, ' '))
  }
  if (m.timing === 'pre_entreno')  tags.push('Pre-entreno')
  if (m.timing === 'post_entreno') tags.push('Post-entreno')
  if (m.tiempo_min) tags.push(`${m.tiempo_min} min`)
  if (Array.isArray(m.temporada) && m.temporada.length) {
    const cap = s => s.charAt(0).toUpperCase() + s.slice(1)
    tags.push(m.temporada.map(cap).join(' / '))
  }
  return tags
}

function buildFichaHTML(opcion, { tiempoComidaLabel, tagsExtra = [], footerLeft = 'Plan personalizado · uso individual' }) {
  const tags = [...inferirTags(opcion), ...tagsExtra]
  const aporte = opcion.aporte_porcion ?? { kcal: 0, proteina_g: 0, carbohidrato_g: 0, grasa_g: 0 }

  const tagsHtml = tags.map(t => `<span class="tag">${esc(t)}</span>`).join('')

  const macrosHtml = `
    <div class="kpi kcal"><div class="val">${aporte.kcal}</div><div class="lab">kcal</div></div>
    <div class="kpi"><div class="val">${aporte.proteina_g}<span style="font-size:13px">g</span></div><div class="lab">Proteína</div></div>
    <div class="kpi"><div class="val">${aporte.carbohidrato_g}<span style="font-size:13px">g</span></div><div class="lab">Carbohid.</div></div>
    <div class="kpi"><div class="val">${aporte.grasa_g}<span style="font-size:13px">g</span></div><div class="lab">Grasa</div></div>`

  const ingredientesHtml = opcion.ingredientes.map(i => {
    const medida = i.medida_casera ? `${i.gramos} g · ${esc(i.medida_casera)}` : `${i.gramos} g`
    return `<li><span class="nom">${esc(i.alimento)}</span><span class="cant">${medida}</span></li>`
  }).join('')

  const pasosHtml = opcion.pasos.map(p => `<li>${esc(p)}</li>`).join('')
  const notaHtml = opcion.notas_digestivas
    ? `<div class="seccion"><h3>Nota</h3><div class="nota">${esc(opcion.notas_digestivas)}</div></div>`
    : ''

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(opcion.nombre)} — Centro Metabólico</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>${BRAND_CSS}</style>
</head>
<body>
  <article class="ficha">
    <header class="head">
      <div class="marca">Centro Metabólico</div>
      <div class="tiempo-comida">${esc(tiempoComidaLabel)}</div>
      <h1 class="titulo">${esc(opcion.nombre)}</h1>
      <div class="tags">${tagsHtml}</div>
    </header>
    <section class="macros">${macrosHtml}</section>
    <div class="body">
      <div class="seccion"><h3>Ingredientes</h3><ul class="ingredientes">${ingredientesHtml}</ul></div>
      <div class="seccion"><h3>Preparación</h3><ol class="pasos">${pasosHtml}</ol></div>
      ${notaHtml}
    </div>
    <footer class="foot">
      <span>${esc(footerLeft)}</span>
      <span class="meta-foot">${esc(opcion.porcion_casera ?? '')}</span>
    </footer>
  </article>
</body>
</html>`
}

// ─── Demo dataset: las 6 opciones del almuerzo 700 kcal generadas por la skill ──
// Para usar con datos reales, reemplaza esto leyendo desde JSON (--input).

const DEMO = [
  {
    nombre: 'Salteado de pollo, quínoa y verduras',
    preparacion: 'Saltear pollo con aceite, sumar verduras, incorporar quínoa, acabar con palta y limón.',
    porcion_casera: '1 palma de pollo · 1.5 tazas de quínoa · 1.5 tazas de verduras · 1/3 de palta',
    notas_digestivas: 'Quínoa bien tolerada (sin gluten, baja en FODMAPs en porción moderada). Apto post-entreno.',
    ingredientes: [
      { alimento: 'Pechuga de pollo (peso cocido)', gramos: 130, medida_casera: '1 palma' },
      { alimento: 'Quínoa cocida',                  gramos: 240, medida_casera: '1.5 tazas' },
      { alimento: 'Zapallo italiano salteado',      gramos: 100, medida_casera: '3/4 taza' },
      { alimento: 'Pimentón rojo',                  gramos: 80,  medida_casera: '1/2 unidad' },
      { alimento: 'Tomate fresco en cubos',         gramos: 120, medida_casera: '1 mediano' },
      { alimento: 'Palta laminada',                 gramos: 60,  medida_casera: '1/3 de palta' },
      { alimento: 'Aceite de oliva',                gramos: 4,   medida_casera: '1 cdita' },
    ],
    pasos: [
      'Calienta el aceite a fuego medio-alto en sartén grande.',
      'Saltea el pollo en cubos 4-5 min hasta dorar (si está crudo, 7-8 min).',
      'Agrega zapallo italiano y pimentón en cubos, saltea 3 min.',
      'Incorpora la quínoa cocida, mezcla y sazona con limón, comino y cilantro.',
      'Sirve y agrega palta laminada y tomate fresco arriba.',
    ],
    aporte_porcion: { kcal: 693, proteina_g: 53.8, carbohidrato_g: 68.1, grasa_g: 22.4, fibra_g: 11.4 },
    meta: { tiempo_min: 20, dificultad: 'facil', cocina: 'chilena', temporada: ['otono','invierno','primavera'], presupuesto: 'medio', apto_para: ['sin_lacteos','sin_gluten','sin_mariscos'], timing: 'post_entreno' },
  },
  {
    nombre: 'Bowl mediterráneo de atún, papa y palta',
    preparacion: 'Bowl frío-templado con papas cocidas tibias, atún en agua, huevo duro, palta, tomate y aceitunas.',
    porcion_casera: '1 lata grande de atún · 1.5 tazas de papas · 1/2 palta · 1 huevo · ensalada',
    notas_digestivas: 'Pescado magro + papa de digestión limpia. Si comes 3-4 h antes de entrenar, los CHO de la papa rinden bien.',
    ingredientes: [
      { alimento: 'Atún en agua escurrido',      gramos: 130, medida_casera: '1 lata grande' },
      { alimento: 'Huevo duro',                  gramos: 50,  medida_casera: '1 unidad' },
      { alimento: 'Papas cocidas en cubos',      gramos: 300, medida_casera: '1.5 tazas' },
      { alimento: 'Palta laminada',              gramos: 80,  medida_casera: '1/2 unidad mediana' },
      { alimento: 'Tomate cherry o en cubos',    gramos: 150, medida_casera: '1 taza' },
      { alimento: 'Pepino en rodajas',           gramos: 80,  medida_casera: '1/2 unidad' },
      { alimento: 'Pimentón rojo crudo',         gramos: 80,  medida_casera: '1/2 unidad' },
      { alimento: 'Aceitunas negras',            gramos: 30,  medida_casera: '8-10 unidades' },
    ],
    pasos: [
      'Cuece las papas en cubos 12-15 min en agua con sal; escurre y deja tibias.',
      'Cuece el huevo duro 9 min, enfría y parte en cuartos.',
      'Mezcla en un bowl las papas tibias con el atún, pepino, tomate y pimentón.',
      'Corona con la palta laminada, el huevo en cuartos y las aceitunas.',
      'Aliña con limón, orégano, sal y pimienta.',
    ],
    aporte_porcion: { kcal: 666, proteina_g: 49.4, carbohidrato_g: 76.8, grasa_g: 21.7, fibra_g: 12.5 },
    meta: { tiempo_min: 15, dificultad: 'facil', cocina: 'mediterranea', temporada: ['primavera','verano'], presupuesto: 'medio', apto_para: ['sin_lacteos','sin_gluten','sin_mariscos'], timing: 'pre_entreno' },
  },
  {
    nombre: 'Tortilla de pavo con frijoles negros y palta',
    preparacion: 'Tortilla integral rellena con pavo a la plancha, frijoles guisados, palta, tomate y cilantro.',
    porcion_casera: '1 tortilla integral · 1 palma de pavo · 1/2 taza de frijoles · 1/3 de palta',
    notas_digestivas: 'Frijoles negros aportan fibra y proteína vegetal. Si reportas hinchazón, sustituye por lentejas (más bajo FODMAP).',
    ingredientes: [
      { alimento: 'Pechuga de pavo a la plancha', gramos: 120, medida_casera: '1 palma generosa' },
      { alimento: 'Tortilla integral grande',     gramos: 60,  medida_casera: '1 unidad' },
      { alimento: 'Frijoles negros cocidos',      gramos: 130, medida_casera: '1/2 taza colmada' },
      { alimento: 'Palta laminada',               gramos: 70,  medida_casera: '1/3 de palta' },
      { alimento: 'Tomate en cubos',              gramos: 80,  medida_casera: '1/2 unidad' },
      { alimento: 'Cebolla morada picada',        gramos: 30,  medida_casera: '2 cdas' },
      { alimento: 'Pimentón rojo',                gramos: 50,  medida_casera: '1/3 unidad' },
      { alimento: 'Aceite de oliva',              gramos: 5,   medida_casera: '1 cdita escasa' },
    ],
    pasos: [
      'Salpimienta la pechuga de pavo y cocínala a la plancha 3 min por lado; corta en tiras.',
      'Calienta los frijoles con aceite, comino, ajo en polvo y orégano (4-5 min).',
      'Tibia la tortilla en sartén seca 30 s por lado.',
      'Arma: extiende frijoles, suma pavo, palta, tomate, cebolla y pimentón.',
      'Remata con cilantro fresco y un toque de limón.',
    ],
    aporte_porcion: { kcal: 670, proteina_g: 47.9, carbohidrato_g: 73.3, grasa_g: 21.9, fibra_g: 14.2 },
    meta: { tiempo_min: 25, dificultad: 'media', cocina: 'mexicana', temporada: ['verano','otono','primavera'], presupuesto: 'medio', apto_para: ['sin_lacteos','sin_mariscos'], timing: 'ninguno' },
  },
  {
    nombre: 'Pollo Thai en leche de coco con fideos de arroz',
    preparacion: 'Sopa-curry tailandés: pollo, fideos de arroz y verduras en caldo de leche de coco con curry rojo.',
    porcion_casera: '1 palma de pollo · 1.5 tazas de fideos · 1 cucharón de caldo · verduras al dente',
    notas_digestivas: 'Caldo caliente favorece la digestión en otoño-invierno. Leche de coco regular cubre la grasa sin lactosa.',
    ingredientes: [
      { alimento: 'Pechuga de pollo (peso cocido)', gramos: 130, medida_casera: '1 palma' },
      { alimento: 'Fideos de arroz cocidos',        gramos: 200, medida_casera: '1.5 tazas' },
      { alimento: 'Leche de coco regular',          gramos: 90,  medida_casera: '1/3 taza' },
      { alimento: 'Zanahoria en juliana',           gramos: 60,  medida_casera: '1/2 unidad' },
      { alimento: 'Brócoli en floretes',            gramos: 100, medida_casera: '1 taza' },
      { alimento: 'Pimentón rojo en tiras',         gramos: 60,  medida_casera: '1/2 unidad' },
      { alimento: 'Pasta de curry rojo Thai',       gramos: 15,  medida_casera: '1 cda' },
      { alimento: 'Aceite de sésamo',               gramos: 3,   medida_casera: '1/2 cdita' },
    ],
    pasos: [
      'Calienta el aceite de sésamo en un wok y saltea 1 min la pasta de curry con jengibre rallado.',
      'Agrega la leche de coco y 200 ml de caldo de pollo. Lleva a hervor suave.',
      'Suma la zanahoria, brócoli y pimentón. Cocina 4 min hasta que queden al dente.',
      'Incorpora el pollo en tiras y los fideos. Calienta 2 min más.',
      'Sirve con cilantro fresco, jugo de lima y un toque de salsa de soya baja en sodio.',
    ],
    aporte_porcion: { kcal: 718, proteina_g: 50.3, carbohidrato_g: 73.1, grasa_g: 24.1, fibra_g: 6.8 },
    meta: { tiempo_min: 20, dificultad: 'media', cocina: 'asiatica', temporada: ['otono','invierno'], presupuesto: 'medio', apto_para: ['sin_lacteos','sin_gluten','sin_mariscos'], timing: 'post_entreno' },
  },
  {
    nombre: 'Ensalada tibia mediterránea de pollo, garbanzos y vegetales asados',
    preparacion: 'Bowl tibio con pollo a la plancha, garbanzos, arroz integral, berenjena y zucchini asados.',
    porcion_casera: '1 palma de pollo · 1/2 taza de garbanzos · 1/2 taza de arroz · 1.5 tazas de vegetales',
    notas_digestivas: 'Garbanzos aportan proteína vegetal y fibra; remojar la noche previa reduce gases. La rúcula aporta nitrato dietético.',
    ingredientes: [
      { alimento: 'Pechuga de pollo (peso cocido)', gramos: 130, medida_casera: '1 palma' },
      { alimento: 'Garbanzos cocidos',              gramos: 140, medida_casera: '1/2 taza colmada' },
      { alimento: 'Arroz integral cocido',          gramos: 80,  medida_casera: '1/2 taza' },
      { alimento: 'Berenjena asada en cubos',       gramos: 80,  medida_casera: '3/4 taza' },
      { alimento: 'Zucchini asado en rodajas',      gramos: 80,  medida_casera: '3/4 taza' },
      { alimento: 'Tomate cherry partidos',         gramos: 100, medida_casera: '10 unidades' },
      { alimento: 'Palta laminada',                 gramos: 50,  medida_casera: '1/3 unidad' },
      { alimento: 'Aceite de oliva extra virgen',   gramos: 7,   medida_casera: '1.5 cditas' },
    ],
    pasos: [
      'Precalienta el horno a 200 °C. Asa berenjena y zucchini con aceite y sal 15 min.',
      'Mientras tanto cuece (o tibia) el arroz integral y los garbanzos.',
      'Cocina la pechuga a la plancha 3 min por lado; corta en tiras.',
      'Arma el bowl: cama de arroz, garbanzos, vegetales, pollo, tomate y palta.',
      'Aliña con aceite de oliva, limón, sal, pimienta y albahaca fresca.',
    ],
    aporte_porcion: { kcal: 723, proteina_g: 58.3, carbohidrato_g: 71.6, grasa_g: 23.7, fibra_g: 13.8 },
    meta: { tiempo_min: 25, dificultad: 'facil', cocina: 'mediterranea', temporada: ['primavera','verano','otono'], presupuesto: 'medio', apto_para: ['sin_lacteos','sin_gluten','sin_mariscos'], timing: 'pre_entreno' },
  },
  {
    nombre: 'Curry hindú de pollo con arroz basmati y espinaca',
    preparacion: 'Guiso de pollo en salsa de tomate con leche de coco, espinaca y garbanzos, sobre cama de arroz basmati.',
    porcion_casera: '1 palma de pollo · 1 taza de arroz basmati · 1 cucharón de curry con espinaca',
    notas_digestivas: 'Especias como cúrcuma y jengibre favorecen la digestión. El arroz basmati tiene menor índice glucémico que el blanco común.',
    ingredientes: [
      { alimento: 'Pechuga de pollo en cubos (peso cocido)', gramos: 130, medida_casera: '1 palma' },
      { alimento: 'Arroz basmati cocido',                    gramos: 160, medida_casera: '1 taza' },
      { alimento: 'Garbanzos cocidos',                       gramos: 50,  medida_casera: '1/4 taza' },
      { alimento: 'Tomate triturado',                        gramos: 100, medida_casera: '1/2 taza' },
      { alimento: 'Cebolla en cubos',                        gramos: 40,  medida_casera: '1/4 unidad' },
      { alimento: 'Espinaca fresca',                         gramos: 50,  medida_casera: '1.5 tazas' },
      { alimento: 'Leche de coco regular',                   gramos: 50,  medida_casera: '3 cdas' },
      { alimento: 'Aceite de coco virgen',                   gramos: 6,   medida_casera: '1 cdita' },
    ],
    pasos: [
      'Calienta el aceite de coco y sofríe la cebolla con jengibre y ajo 2 min.',
      'Suma comino, cúrcuma, garam masala y cilantro molido; tuesta 30 s.',
      'Incorpora el tomate triturado y los garbanzos; cuece 4 min.',
      'Agrega el pollo en cubos y la leche de coco; cuece 8 min a fuego medio-bajo.',
      'Termina con la espinaca fresca, mezcla 1 min.',
      'Sirve sobre el arroz basmati con cilantro fresco y limón.',
    ],
    aporte_porcion: { kcal: 689, proteina_g: 52.5, carbohidrato_g: 69.3, grasa_g: 21.0, fibra_g: 8.4 },
    meta: { tiempo_min: 25, dificultad: 'media', cocina: 'asiatica', temporada: ['otono','invierno'], presupuesto: 'medio', apto_para: ['sin_lacteos','sin_gluten','sin_mariscos'], timing: 'post_entreno' },
  },
]

// ─── Main ──────────────────────────────────────────────────────────────────
function main() {
  const args = process.argv.slice(2)
  const inputIdx = args.indexOf('--input')
  const opciones = inputIdx >= 0 && args[inputIdx + 1]
    ? JSON.parse(readFileSync(resolve(process.cwd(), args[inputIdx + 1]), 'utf-8'))
    : DEMO

  mkdirSync(OUT_DIR, { recursive: true })

  const tiempoLabel = 'Almuerzo · ~700 kcal'
  let count = 0
  for (const opcion of opciones) {
    const html = buildFichaHTML(opcion, { tiempoComidaLabel: tiempoLabel })
    const filename = `${slugify(opcion.nombre)}.html`
    const filepath = resolve(OUT_DIR, filename)
    writeFileSync(filepath, html, 'utf-8')
    console.log(`  ✓ ${filename}  (${html.length.toLocaleString('en-US')} bytes)`)
    count++
  }
  console.log(`\n${count} fichas generadas en docs/fichas/`)
}

main()
