/**
 * src/lib/ficha-generator.ts — Generador de fichas premium HTML
 *
 * Toma una `OpcionPreparacion` (shape del banco de opciones) y devuelve un
 * documento HTML A5 imprimible con branding Centro Metabólico. El HTML es
 * autocontenido (Inter via Google Fonts, CSS inline, sin assets externos) →
 * el profesional puede mandarlo por email tal cual, o convertirlo a PDF.
 *
 * Diseñado para:
 *   1. Llamarse desde route handlers (ej. después de guardar al banco)
 *   2. Llamarse desde CLI scripts (ver scripts/generar-fichas.mjs)
 *   3. Servirse vía endpoint /api/fichas/[opcionId] en el futuro
 *
 * No depende de Next, ni de Node-only APIs — funciona en cualquier runtime JS.
 */
import type { OpcionPreparacion } from '@/types/banco'

interface BuildFichaOptions {
  /** Etiqueta del tiempo de comida — ej. "Almuerzo · ~700 kcal" */
  tiempoComidaLabel: string
  /** Tags adicionales a mostrar (sin lácteos, post-entreno, etc.). Si no se
   *  especifica, se infieren desde meta.apto_para + meta.timing + meta.tiempo_min */
  tagsExtra?: string[]
  /** Texto del footer (default: "Plan personalizado · uso individual") */
  footerLeft?: string
}

const BRAND_CSS = `
:root{--cyan:#1DAEEC;--cyan-osc:#039CE0;--cyan-claro:#A6E1F7;--fondo:#F7FBFE;--blanco:#FFFFFF;--texto:#0B2A3A;--texto-suave:#5A6C77;--divisor:#E5EEF4;--gris-fondo:#EDF3F8;}
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

/** Escape HTML reservado para evitar XSS / templates rotos por contenido del paciente */
function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** Infiere tags humanos desde meta + apto_para */
function inferirTags(opcion: OpcionPreparacion): string[] {
  const m = opcion.meta
  const tags: string[] = []
  // Tags de "apto para" → "Sin lácteos", "Sin gluten", etc.
  for (const a of m.apto_para ?? []) {
    if (a.startsWith('sin_')) tags.push(`Sin ${a.slice(4).replace(/_/g, ' ')}`)
    else                       tags.push(a.replace(/_/g, ' '))
  }
  // Timing
  if (m.timing === 'pre_entreno')  tags.push('Pre-entreno')
  if (m.timing === 'post_entreno') tags.push('Post-entreno')
  // Tiempo
  if (m.tiempo_min) tags.push(`${m.tiempo_min} min`)
  // Temporada
  if (m.temporada?.length) {
    const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
    tags.push(m.temporada.map(cap).join(' / '))
  }
  return tags
}

/**
 * Genera HTML A5 imprimible con branding Centro Metabólico para una opción.
 * Retorna el documento completo (con DOCTYPE) — listo para guardar a archivo
 * o servir como text/html desde un route handler.
 */
export function buildFichaHTML(
  opcion: OpcionPreparacion,
  options: BuildFichaOptions,
): string {
  const { tiempoComidaLabel, tagsExtra = [], footerLeft = 'Plan personalizado · uso individual' } = options

  const tags = [...inferirTags(opcion), ...tagsExtra]
  const aporte = opcion.aporte_porcion ?? { kcal: 0, proteina_g: 0, carbohidrato_g: 0, grasa_g: 0 }

  const tagsHtml = tags.map(t => `<span class="tag">${esc(t)}</span>`).join('')

  const macrosHtml = `
    <div class="kpi kcal"><div class="val">${aporte.kcal}</div><div class="lab">kcal</div></div>
    <div class="kpi"><div class="val">${aporte.proteina_g}<span style="font-size:13px">g</span></div><div class="lab">Proteína</div></div>
    <div class="kpi"><div class="val">${aporte.carbohidrato_g}<span style="font-size:13px">g</span></div><div class="lab">Carbohid.</div></div>
    <div class="kpi"><div class="val">${aporte.grasa_g}<span style="font-size:13px">g</span></div><div class="lab">Grasa</div></div>`

  const ingredientesHtml = opcion.ingredientes.map(i => {
    const medida = i.medida_casera
      ? `${i.gramos} g · ${esc(i.medida_casera)}`
      : `${i.gramos} g`
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
      <div class="seccion">
        <h3>Ingredientes</h3>
        <ul class="ingredientes">${ingredientesHtml}</ul>
      </div>
      <div class="seccion">
        <h3>Preparación</h3>
        <ol class="pasos">${pasosHtml}</ol>
      </div>
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

/**
 * Slugifica el nombre de la preparación para usarlo como filename.
 * Ej. "Pollo Thai en leche de coco" → "pollo-thai-en-leche-de-coco"
 */
export function slugifyNombre(nombre: string): string {
  return nombre
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')  // strip acentos (NFD descompone, este rango son los diacríticos)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
