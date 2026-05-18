/**
 * Generador de lista de supermercado
 * Extrae todos los ingredientes del plan semanal y los agrupa por categoría.
 */
import type { WeekPlan } from './planGenerator'

// ─── Tipos ────────────────────────────────────────────────────────────────────
export type ShoppingCategory =
  | 'proteinas'
  | 'lacteos'
  | 'cereales'
  | 'frutas_verduras'
  | 'grasas'
  | 'condimentos'
  | 'suplementos'
  | 'otros'

export interface ShoppingItem {
  nombre: string        // nombre normalizado del ingrediente
  cantidad: string      // ej. "80g", "3 unidades", "½ taza"
  diasUsado: number     // cuántos días de la semana aparece
  category: ShoppingCategory
}

export interface ShoppingList {
  items: ShoppingItem[]
  byCategory: Record<ShoppingCategory, ShoppingItem[]>
  totalIngredientes: number
}

// ─── Categorías ───────────────────────────────────────────────────────────────
export const CATEGORY_META: Record<ShoppingCategory, { label: string; emoji: string; color: string }> = {
  proteinas:       { label: 'Proteínas',          emoji: '🥩', color: 'bg-red-50 border-red-200 text-red-800' },
  lacteos:         { label: 'Lácteos',             emoji: '🥛', color: 'bg-blue-50 border-blue-200 text-blue-800' },
  cereales:        { label: 'Cereales y panes',    emoji: '🌾', color: 'bg-amber-50 border-amber-200 text-amber-800' },
  frutas_verduras: { label: 'Frutas y verduras',   emoji: '🥦', color: 'bg-green-50 border-green-200 text-green-800' },
  grasas:          { label: 'Aceites y grasas',    emoji: '🫒', color: 'bg-yellow-50 border-yellow-200 text-yellow-800' },
  condimentos:     { label: 'Condimentos',         emoji: '🧂', color: 'bg-purple-50 border-purple-200 text-purple-800' },
  suplementos:     { label: 'Suplementos',         emoji: '💊', color: 'bg-indigo-50 border-indigo-200 text-indigo-800' },
  otros:           { label: 'Otros',               emoji: '🛒', color: 'bg-gray-50 border-gray-200 text-gray-700' },
}

// ─── Mapas de palabras clave → categoría ─────────────────────────────────────
const CATEGORY_KEYWORDS: Array<{ keywords: string[]; category: ShoppingCategory }> = [
  {
    keywords: ['huevo', 'clara', 'pollo', 'pechuga', 'pavo', 'atún', 'salmón', 'merluza', 'carne', 'vacuno',
               'cerdo', 'tofu', 'legumbre', 'lenteja', 'poroto', 'garbanzo', 'proteína en polvo', 'whey',
               'mariscos', 'camarón', 'filete'],
    category: 'proteinas',
  },
  {
    keywords: ['yogur', 'leche', 'queso', 'ricotta', 'cottage', 'mantequilla', 'crema'],
    category: 'lacteos',
  },
  {
    keywords: ['avena', 'pan', 'tostada', 'arroz', 'quinoa', 'pasta', 'fideos', 'galleta', 'maíz',
               'tortilla', 'cereal', 'granola', 'marraqueta', 'baguette', 'wasa', 'integral',
               'cuscús', 'lenteja cocida'],
    category: 'cereales',
  },
  {
    keywords: ['plátano', 'manzana', 'naranja', 'uva', 'frutilla', 'frambuesa', 'arándano', 'mango',
               'piña', 'pera', 'kiwi', 'melón', 'sandía', 'durazno', 'ciruela', 'cereza', 'berry', 'berries',
               'espinaca', 'lechuga', 'tomate', 'zanahoria', 'brócoli', 'coliflor', 'champiñón', 'pimiento',
               'cebolla', 'choclo', 'pepino', 'apio', 'rúcula', 'kale', 'betarraga', 'zapallo',
               'palta', 'aguacate', 'limón', 'limones', 'cilantro', 'perejil'],
    category: 'frutas_verduras',
  },
  {
    keywords: ['aceite', 'oliva', 'almendra', 'nuez', 'maní', 'chía', 'linaza', 'sésamo', 'coco',
               'maravilla', 'mantequilla de maní', 'mantequilla de almendra', 'tahini', 'semilla',
               'avellana', 'pistache', 'pistacho', 'girasol'],
    category: 'grasas',
  },
  {
    keywords: ['sal', 'pimienta', 'orégano', 'ajo', 'comino', 'cúrcuma', 'canela', 'stevia', 'azúcar',
               'vinagre', 'mostaza', 'salsa', 'soja', 'sriracha', 'mayonesa', 'mermelada', 'miel',
               'café', 'té', 'infusión', 'caldo'],
    category: 'condimentos',
  },
  {
    keywords: ['proteína en polvo', 'whey', 'creatina', 'multivitamínico', 'omega 3', 'colágeno',
               'bcaa', 'glutamina', 'suplemento', 'pre-entreno', 'barra proteica'],
    category: 'suplementos',
  },
]

// ─── Líquidos acompañantes que NO van a la lista de compras ───────────────────
// El agua, té e infusiones sin azúcar son acompañamientos universales que el
// paciente ya tiene en casa — incluirlos satura la lista sin valor real.
const SKIP_KEYWORDS = [
  'agua', 'infusión', 'infusion', 'té ', 'te sin azúcar', 'tisana',
]

function isAcompañamiento(name: string): boolean {
  const n = name.toLowerCase()
  return SKIP_KEYWORDS.some(k => n.includes(k))
}

// ─── Parser de cantidad numérica + unidad ─────────────────────────────────────
interface ParsedQty {
  value: number       // valor numérico (NaN si no parsea)
  unit: string        // 'g' | 'kg' | 'ml' | 'unidad' | 'taza' | etc.
  raw: string         // texto original como fallback
}

/** Parsea "200g", "1.5kg", "½ taza", "2 cdas", "200ml" → estructurado */
function parseQuantity(raw: string): ParsedQty {
  // Soporte fracciones unicode
  const normalized = raw.replace(/½/g, '0.5').replace(/¼/g, '0.25').replace(/¾/g, '0.75')
  const match = normalized.match(/^([\d.,]+)(?:\s*-\s*[\d.,]+)?\s*([a-záéíóúñ]+)?/i)
  if (!match) return { value: NaN, unit: '', raw }
  const value = parseFloat(match[1].replace(',', '.'))
  let unit = (match[2] ?? '').toLowerCase().trim()
  // Normalizar unidades equivalentes
  if (['unidades', 'un', 'un.'].includes(unit)) unit = 'unidad'
  if (['cdas'].includes(unit)) unit = 'cda'
  if (['cdtas'].includes(unit)) unit = 'cdta'
  if (['tazas'].includes(unit)) unit = 'taza'
  if (['rebanadas'].includes(unit)) unit = 'rebanada'
  // Sin unidad → asumir "unidad" para enteros, vacío si decimal raro
  if (!unit && !isNaN(value)) unit = 'unidad'
  return { value, unit, raw }
}

/** Formatea ParsedQty acumulado a string legible */
function formatQty(value: number, unit: string): string {
  if (isNaN(value)) return '1 unidad'
  // g → kg cuando supera 1000
  if (unit === 'g' && value >= 1000) {
    return `${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)} kg`
  }
  // ml → L cuando supera 1000
  if (unit === 'ml' && value >= 1000) {
    return `${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)} L`
  }
  // Plurales básicos
  let unitDisplay = unit
  if (value !== 1 && ['unidad', 'taza', 'rebanada', 'cda', 'cdta'].includes(unit)) {
    unitDisplay = unit + (unit.endsWith('a') ? 's' : 'es')
  }
  const valStr = value % 1 === 0 ? String(value) : value.toFixed(1)
  return unitDisplay ? `${valStr} ${unitDisplay}` : valStr
}

// ─── Normalize ingredient name ────────────────────────────────────────────────
/** Elimina cantidades y unidades del inicio del string para obtener el nombre del ingrediente */
function extractIngredientName(raw: string): string {
  // Eliminar cantidades como "80g", "200ml", "½ taza", "1 cdta", "2-3", etc.
  return raw
    .replace(/^[\d.,½¼¾\/\-]+\s*/g, '')                    // números al inicio
    .replace(/^(ml|g|kg|cc|taza|tazas|cda|cdas|cdta|cdtas|scoop|unidad|unidades|rebanada|rebanadas|porción|un)\s*/i, '')
    .replace(/\(.*?\)/g, '')                                 // texto entre paréntesis
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

/** Detecta la categoría según palabras clave */
function detectCategory(name: string): ShoppingCategory {
  const nameLower = name.toLowerCase()
  for (const { keywords, category } of CATEGORY_KEYWORDS) {
    if (keywords.some(kw => nameLower.includes(kw))) {
      return category
    }
  }
  return 'otros'
}

// ─── Función principal ────────────────────────────────────────────────────────
/**
 * Genera la lista de compras semanal a partir del plan.
 *
 * Reglas clínicas:
 * - Considera solo la semana 1 (7 días representativos).
 * - Excluye ultras planificados (treats controlados, no lista de compra).
 * - Excluye acompañamientos universales (agua, infusiones, té sin azúcar).
 * - SUMA cantidades del mismo ingrediente cuando aparece varios días con
 *   misma unidad (200g pollo × 5 días → 1 kg pollo).
 * - Si las unidades difieren, fallback a "cantidad base × días" en texto.
 */
export function generarListaSupermercado(plan: WeekPlan): ShoppingList {
  const semana1Dias = plan.dias.filter(d => d.semana === 1)

  // Acumulador: nombre normalizado → { total numérico, unidad, diasUsado, fallbackText }
  const ingredientMap = new Map<string, {
    totalValue: number
    unit: string
    diasUsado: number
    fallbackRaw: string
  }>()

  for (const dia of semana1Dias) {
    for (const meal of dia.meals) {
      if (meal.esUltra) continue
      for (const rawItem of meal.items) {
        const name = extractIngredientName(rawItem)
        if (!name || name.length < 2) continue
        if (isAcompañamiento(name)) continue        // omite agua/infusiones

        const key = name.replace(/\s+/g, ' ').toLowerCase()
        const parsed = parseQuantity(rawItem)

        const existing = ingredientMap.get(key)
        if (existing) {
          existing.diasUsado++
          // Sumamos solo si las unidades coinciden y ambos valores son numéricos
          if (
            !isNaN(parsed.value) && !isNaN(existing.totalValue) &&
            parsed.unit === existing.unit && parsed.unit !== ''
          ) {
            existing.totalValue += parsed.value
          } else if (isNaN(existing.totalValue)) {
            // Caso degenerate: ambos no parseables, dejar fallback
          }
          // Si las unidades NO coinciden, mantenemos el primer valor parseable y
          // marcamos como no-sumable (NaN bandera) para usar fallback en formato.
          else if (parsed.unit !== existing.unit) {
            existing.totalValue = NaN
          }
        } else {
          ingredientMap.set(key, {
            totalValue: parsed.value,
            unit: parsed.unit,
            diasUsado: 1,
            fallbackRaw: rawItem,
          })
        }
      }
    }
  }

  // Construir lista final
  const items: ShoppingItem[] = []
  for (const [key, meta] of ingredientMap.entries()) {
    const nombre = key.charAt(0).toUpperCase() + key.slice(1)
    const category = detectCategory(key)
    let cantidad: string
    if (!isNaN(meta.totalValue) && meta.unit) {
      // Sumable: mostramos total semanal en unidad legible
      cantidad = formatQty(meta.totalValue, meta.unit)
    } else {
      // No sumable: fallback al texto original con multiplicador de días
      cantidad = meta.diasUsado > 1
        ? `${meta.fallbackRaw.match(/^[^\s]+/)?.[0] ?? '1'} × ${meta.diasUsado} días`
        : meta.fallbackRaw.match(/^[^\s]+/)?.[0] ?? '1 unidad'
    }
    items.push({ nombre, cantidad, diasUsado: meta.diasUsado, category })
  }

  // Ordenar: por categoría, luego alfabético
  const ORDER: ShoppingCategory[] = ['proteinas', 'lacteos', 'cereales', 'frutas_verduras', 'grasas', 'condimentos', 'suplementos', 'otros']
  items.sort((a, b) => ORDER.indexOf(a.category) - ORDER.indexOf(b.category) || a.nombre.localeCompare(b.nombre))

  // Agrupar por categoría
  const byCategory = {} as Record<ShoppingCategory, ShoppingItem[]>
  for (const cat of ORDER) {
    byCategory[cat] = items.filter(i => i.category === cat)
  }

  return { items, byCategory, totalIngredientes: items.length }
}
