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

/** Extrae la cantidad/unidad del inicio del string */
function extractQuantity(raw: string): string {
  const match = raw.match(/^([\d.,½¼¾\/\-]+\s*(ml|g|kg|cc|tazas?|cdas?|cdtas?|scoop|unidades?|rebanadas?|un\.?)?)/i)
  return match ? match[0].trim() : '1 unidad'
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
export function generarListaSupermercado(plan: WeekPlan): ShoppingList {
  // Recopilar todos los items de la semana 1 (7 días representativos)
  const semana1Dias = plan.dias.filter(d => d.semana === 1)

  // Map: nombreNormalizado → { cantidad, diasUsado, rawName }
  const ingredientMap = new Map<string, { cantidad: string; diasUsado: number; rawName: string }>()

  for (const dia of semana1Dias) {
    for (const meal of dia.meals) {
      if (meal.esUltra) continue   // excluir ultra procesados de la lista
      for (const rawItem of meal.items) {
        const name = extractIngredientName(rawItem)
        const qty  = extractQuantity(rawItem)

        if (!name || name.length < 2) continue

        const key = name.replace(/\s+/g, ' ').toLowerCase()

        if (ingredientMap.has(key)) {
          ingredientMap.get(key)!.diasUsado++
        } else {
          ingredientMap.set(key, { cantidad: qty, diasUsado: 1, rawName: rawItem })
        }
      }
    }
  }

  // Construir lista final
  const items: ShoppingItem[] = []
  for (const [key, meta] of ingredientMap.entries()) {
    // Capitalizar nombre
    const nombre = key.charAt(0).toUpperCase() + key.slice(1)
    const category = detectCategory(key)
    items.push({ nombre, cantidad: meta.cantidad, diasUsado: meta.diasUsado, category })
  }

  // Ordenar: primero por categoría (orden deseado), luego alfabético
  const ORDER: ShoppingCategory[] = ['proteinas', 'lacteos', 'cereales', 'frutas_verduras', 'grasas', 'condimentos', 'suplementos', 'otros']
  items.sort((a, b) => ORDER.indexOf(a.category) - ORDER.indexOf(b.category) || a.nombre.localeCompare(b.nombre))

  // Agrupar por categoría
  const byCategory = {} as Record<ShoppingCategory, ShoppingItem[]>
  for (const cat of ORDER) {
    byCategory[cat] = items.filter(i => i.category === cat)
  }

  return { items, byCategory, totalIngredientes: items.length }
}
