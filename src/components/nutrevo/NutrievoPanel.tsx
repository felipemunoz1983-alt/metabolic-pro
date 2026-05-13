'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ExternalLink, Filter, ShoppingBag, X, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  NUTREVO_PRODUCTS,
  CATEGORY_LABELS,
  GOAL_LABELS,
  getProductsByGoal,
  type NutrievoCategory,
  type NutrievoGoal,
  type NutrievoProduct,
} from '@/lib/nutrevo'

const ALL_GOALS: NutrievoGoal[] = [
  'perdida_grasa', 'masa_muscular', 'rendimiento', 'salud_digestiva', 'bienestar_general', 'keto',
]

const CATEGORY_COLORS: Record<NutrievoCategory, string> = {
  snack_proteico:       'bg-blue-50 text-blue-700 border-blue-200',
  snack_keto:           'bg-emerald-50 text-emerald-700 border-emerald-200',
  suplemento_deportivo: 'bg-purple-50 text-purple-700 border-purple-200',
  bienestar:            'bg-amber-50 text-amber-700 border-amber-200',
  fermentado:           'bg-green-50 text-green-700 border-green-200',
  probiotico:           'bg-teal-50 text-teal-700 border-teal-200',
}

function ProductCard({ product }: { product: NutrievoProduct }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <motion.div
      layout
      className={cn(
        'bg-white border rounded-2xl overflow-hidden transition-all',
        product.disponible ? 'border-[#E2ECF4]' : 'border-[#E2ECF4] opacity-60'
      )}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={cn('text-[9px] font-bold px-2 py-0.5 rounded-full border', CATEGORY_COLORS[product.categoria])}>
                {CATEGORY_LABELS[product.categoria]}
              </span>
              {!product.disponible && (
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200">Sin stock</span>
              )}
            </div>
            <p className="text-sm font-black text-[#0C1F2C] leading-tight">{product.nombre}</p>
          </div>
          <p className="text-sm font-black text-[#29ABE2] flex-shrink-0">
            ${product.precio.toLocaleString('es-CL')}
          </p>
        </div>

        {/* Macros row */}
        {(product.proteina || product.kcal || product.carbohidratos) && (
          <div className="flex gap-3 mb-3">
            {product.proteina && (
              <div className="text-center">
                <p className="text-xs font-black text-blue-600">{product.proteina}g</p>
                <p className="text-[9px] text-[#8BA5BE]">Proteína</p>
              </div>
            )}
            {product.kcal && (
              <div className="text-center">
                <p className="text-xs font-black text-[#29ABE2]">{product.kcal}</p>
                <p className="text-[9px] text-[#8BA5BE]">kcal</p>
              </div>
            )}
            {product.carbohidratos && (
              <div className="text-center">
                <p className="text-xs font-black text-amber-600">{product.carbohidratos}g</p>
                <p className="text-[9px] text-[#8BA5BE]">Carbos</p>
              </div>
            )}
            {product.fibra && (
              <div className="text-center">
                <p className="text-xs font-black text-green-600">{product.fibra}g</p>
                <p className="text-[9px] text-[#8BA5BE]">Fibra</p>
              </div>
            )}
          </div>
        )}

        {/* Tags */}
        <div className="flex flex-wrap gap-1 mb-3">
          {product.sinGluten && <span className="text-[9px] bg-[#F0F6FA] text-[#4A7A94] px-1.5 py-0.5 rounded-md font-medium">Sin gluten</span>}
          {product.sinLactosa && <span className="text-[9px] bg-[#F0F6FA] text-[#4A7A94] px-1.5 py-0.5 rounded-md font-medium">Sin lactosa</span>}
          {product.vegano && <span className="text-[9px] bg-green-50 text-green-700 px-1.5 py-0.5 rounded-md font-medium">Vegano</span>}
          {product.sinAzucarAnadida && <span className="text-[9px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-md font-medium">Sin azúcar añadida</span>}
        </div>

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(e => !e)}
          className="text-[10px] font-bold text-[#29ABE2] hover:underline"
        >
          {expanded ? 'Ver menos ▲' : 'Ver detalles ▼'}
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-3 space-y-3">
                <p className="text-xs text-[#4A6070] leading-relaxed">{product.descripcion}</p>

                <div>
                  <p className="text-[10px] font-bold text-[#8BA5BE] uppercase tracking-wide mb-1.5">Beneficios</p>
                  <div className="space-y-1">
                    {product.beneficios.map(b => (
                      <div key={b} className="flex items-start gap-2">
                        <CheckCircle size={11} className="text-[#29ABE2] flex-shrink-0 mt-0.5" />
                        <span className="text-[11px] text-[#4A6070]">{b}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-bold text-[#8BA5BE] uppercase tracking-wide mb-1.5">Ingredientes principales</p>
                  <p className="text-[11px] text-[#4A6070]">{product.ingredientes.join(', ')}</p>
                </div>

                <a
                  href={product.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[11px] font-bold text-white bg-[#29ABE2] px-3 py-2 rounded-xl hover:bg-[#1a8fc2] transition"
                >
                  <ShoppingBag size={12} /> Comprar en Nutrevo
                  <ExternalLink size={10} />
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

export function NutrievoPanel({ objetivo }: { objetivo?: string }) {
  const [selectedGoal, setSelectedGoal] = useState<NutrievoGoal | 'todos'>('todos')
  const [showFilters, setShowFilters] = useState(false)

  // Map plan objective to Nutrevo goal
  const defaultGoal: NutrievoGoal | null = objetivo?.toLowerCase().includes('grasa') ? 'perdida_grasa'
    : objetivo?.toLowerCase().includes('musc') || objetivo?.toLowerCase().includes('masa') ? 'masa_muscular'
    : objetivo?.toLowerCase().includes('rend') || objetivo?.toLowerCase().includes('deport') ? 'rendimiento'
    : objetivo?.toLowerCase().includes('keto') ? 'keto'
    : null

  const filtered = selectedGoal === 'todos'
    ? NUTREVO_PRODUCTS
    : getProductsByGoal(selectedGoal)

  return (
    <div className="mt-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          {/* Nutrevo logo placeholder */}
          <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-xl flex items-center justify-center">
            <ShoppingBag size={14} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-black text-[#0C1F2C]">Productos Nutrevo</p>
            <p className="text-[10px] text-[#8BA5BE]">Marca partner · Evolución en nutrición</p>
          </div>
        </div>
        <button
          onClick={() => setShowFilters(f => !f)}
          className={cn(
            'flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-xl border transition',
            showFilters ? 'bg-[#29ABE2] text-white border-[#29ABE2]' : 'text-[#8BA5BE] border-[#E2ECF4] hover:border-[#29ABE2]'
          )}
        >
          <Filter size={11} />
          Filtrar
        </button>
      </div>

      {/* Quick filter chips */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-4"
          >
            <div className="flex flex-wrap gap-2 pb-2">
              <button
                onClick={() => setSelectedGoal('todos')}
                className={cn(
                  'text-[11px] font-bold px-3 py-1.5 rounded-xl border transition',
                  selectedGoal === 'todos'
                    ? 'bg-[#0C1F2C] text-white border-[#0C1F2C]'
                    : 'text-[#8BA5BE] border-[#E2ECF4] hover:border-[#0C1F2C]'
                )}
              >
                Todos
              </button>
              {ALL_GOALS.map(goal => (
                <button
                  key={goal}
                  onClick={() => setSelectedGoal(goal)}
                  className={cn(
                    'text-[11px] font-bold px-3 py-1.5 rounded-xl border transition',
                    selectedGoal === goal
                      ? 'bg-[#29ABE2] text-white border-[#29ABE2]'
                      : 'text-[#8BA5BE] border-[#E2ECF4] hover:border-[#29ABE2]'
                  )}
                >
                  {GOAL_LABELS[goal]}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Auto-suggestion banner when there's a matching goal */}
      {defaultGoal && selectedGoal === 'todos' && (
        <div className="mb-4 flex items-center gap-2.5 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5">
          <CheckCircle size={13} className="text-emerald-600 flex-shrink-0" />
          <p className="text-xs text-emerald-800">
            Basado en tu objetivo, te sugerimos filtrar por{' '}
            <button
              onClick={() => setSelectedGoal(defaultGoal)}
              className="font-bold underline"
            >
              {GOAL_LABELS[defaultGoal]}
            </button>
          </p>
        </div>
      )}

      {/* Product count */}
      <p className="text-[10px] text-[#8BA5BE] mb-3">
        {filtered.length} producto{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
      </p>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filtered.map(product => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      <p className="text-center text-[10px] text-[#B0C4D4] mt-4">
        Precios en pesos chilenos. Stock sujeto a disponibilidad en nutrevo.cl
      </p>
    </div>
  )
}
