#!/usr/bin/env node
/**
 * scripts/optimizar-imagen.mjs — Convierte cualquier imagen al formato
 * estándar del catálogo de alimentos del proyecto:
 *
 *   • 900 × 600 px (cover, recortada al centro)
 *   • WebP quality 80, effort 6
 *   • Output: img/<nombre>.webp
 *
 * Uso:
 *   npm run img -- <ruta-origen> <nombre-destino>
 *
 * Ejemplos:
 *   npm run img -- ~/Downloads/paquete-galletas.jpg costa_mini_chips
 *   npm run img -- ./foto.png yogur_protein
 *   npm run img -- "C:\\fotos\\produc to.heic" producto_x
 *
 * Después de correr el script, basta con usar la imagen en src/lib/foods.ts:
 *   foto: IMG + 'costa_mini_chips.webp'
 *
 * Soporta cualquier formato que sharp pueda leer (jpg, png, heic, tiff,
 * gif, avif, webp, raw). El nombre destino se sanitiza a snake_case.
 */
import sharp from 'sharp'
import { existsSync, statSync, mkdirSync } from 'node:fs'
import { resolve, dirname, basename, extname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = resolve(__dirname, '..')
const IMG_DIR  = resolve(ROOT_DIR, 'img')

// ── Constantes del formato estándar del catálogo ──────────────────────────
const TARGET_WIDTH   = 900
const TARGET_HEIGHT  = 600
const WEBP_QUALITY   = 80
const WEBP_EFFORT    = 6   // 0=fast, 6=slow+small. 6 es el sweet spot.

// ── Parseo de argumentos ───────────────────────────────────────────────────
const [, , sourceArg, nameArg] = process.argv

function usage(reason) {
  console.error(`\n❌ ${reason}\n`)
  console.error('Uso:')
  console.error('  npm run img -- <ruta-origen> <nombre-destino>\n')
  console.error('Ejemplos:')
  console.error('  npm run img -- ~/Downloads/paquete.jpg costa_mini_chips')
  console.error('  npm run img -- ./foto.png yogur_protein')
  console.error('  npm run img -- "C:\\fotos\\produc to.heic" producto_x\n')
  process.exit(1)
}

if (!sourceArg) usage('Falta el primer argumento: ruta del archivo origen.')
if (!nameArg)   usage('Falta el segundo argumento: nombre destino (sin extensión).')

const sourcePath = resolve(process.cwd(), sourceArg)
if (!existsSync(sourcePath)) {
  usage(`No encuentro el archivo origen: ${sourcePath}`)
}

// Sanitizar el nombre: snake_case, solo a-z 0-9 _
const sanitizedName = nameArg
  .toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9_]+/g, '_')
  .replace(/_+/g, '_')
  .replace(/^_+|_+$/g, '')

if (!sanitizedName) {
  usage('El nombre destino quedó vacío después de sanitizar.')
}

const outputPath = resolve(IMG_DIR, `${sanitizedName}.webp`)

// Crear img/ si no existe
if (!existsSync(IMG_DIR)) {
  mkdirSync(IMG_DIR, { recursive: true })
}

// ── Pipeline ──────────────────────────────────────────────────────────────
async function main() {
  const srcStats = statSync(sourcePath)
  const srcKB = (srcStats.size / 1024).toFixed(1)
  const srcExt = extname(sourcePath).toLowerCase() || 'desconocido'

  console.log('\n📸 Optimizando imagen para catálogo NutriApp')
  console.log('─'.repeat(60))
  console.log(`  Origen:  ${sourcePath}`)
  console.log(`  Tamaño:  ${srcKB} KB  ·  formato ${srcExt}`)
  console.log(`  Destino: img/${sanitizedName}.webp`)
  console.log(`  Target:  ${TARGET_WIDTH}×${TARGET_HEIGHT}  ·  WebP q${WEBP_QUALITY}  ·  effort ${WEBP_EFFORT}`)
  console.log('─'.repeat(60))

  const startMs = Date.now()
  const info = await sharp(sourcePath)
    .resize(TARGET_WIDTH, TARGET_HEIGHT, { fit: 'cover', position: 'center' })
    .webp({ quality: WEBP_QUALITY, effort: WEBP_EFFORT })
    .toFile(outputPath)
  const elapsedMs = Date.now() - startMs

  const dstKB = (info.size / 1024).toFixed(1)
  const reduction = Math.round((1 - info.size / srcStats.size) * 100)

  console.log(`\n  ✅ Listo en ${elapsedMs} ms`)
  console.log(`     ${info.width}×${info.height}  ·  ${dstKB} KB  (${reduction >= 0 ? `−${reduction}%` : `+${-reduction}%`})`)
  console.log(`\n  En src/lib/foods.ts, agregá:`)
  console.log(`     foto: IMG + '${sanitizedName}.webp',\n`)
  console.log(`  Después: git add img/${sanitizedName}.webp && git commit && git push\n`)
}

main().catch(err => {
  console.error(`\n❌ Error procesando la imagen:`)
  console.error(`   ${err.message}\n`)
  if (err.message.includes('unsupported image format')) {
    console.error(`   El formato del archivo no es reconocido por sharp.`)
    console.error(`   Formatos soportados: jpg, png, webp, gif, avif, tiff, heic, raw\n`)
  }
  process.exit(1)
})
