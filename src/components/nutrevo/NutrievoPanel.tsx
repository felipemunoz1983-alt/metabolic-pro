'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ExternalLink, ShoppingBag, ChevronDown, ChevronUp, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  getProductosDestacados,
  GOAL_LABELS,
  type NutrievoGoal,
  type NutrievoProduct,
} from '@/lib/nutrevo'

// Mapeo del objetivo del plan al goal de Nutrevo
function mapObjetivoToGoal(objetivo?: string): NutrievoGoal | null {
  if (!objetivo) return null
  const o = objetivo.toLowerCase()
  if (o.includes('grasa') || o.includes('pérdida') || o.includes('perdida')) return 'perdida_grasa'
  if (o.includes('musc') || o.includes('masa') || o.includes('hipert')) return 'masa_muscular'
  if (o.includes('rend') || o.includes('deport')) return 'rendimiento'
  if (o.includes('keto')) return 'keto'
  if (o.includes('digest')) return 'salud_digestiva'
  return 'bienestar_general'
}

// Tags visuales del producto
function ProductTags({ product }: { product: NutrievoProduct }) {
  const tags: { label: string; color: string }[] = []
  if (product.sinGluten)        tags.push({ label: 'Sin gluten',        color: 'bg-sky-50 text-sky-700 border-sky-200' })
  if (product.sinLactosa)       tags.push({ label: 'Sin lactosa',       color: 'bg-sky-50 text-sky-700 border-sky-200' })
  if (product.vegano)           tags.push({ label: 'Vegano',            color: 'bg-green-50 text-green-700 border-green-200' })
  if (product.sinAzucarAnadida) tags.push({ label: 'Sin azúcar añadida', color: 'bg-amber-50 text-amber-700 border-amber-200' })
  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map(t => (
        <span key={t.label} className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border', t.color)}>
          {t.label}
        </span>
      ))}
    </div>
  )
}

// Tarjeta de producto estilo marketplace
function ProductCard({
  product,
  matchedGoal,
  index,
}: {
  product: NutrievoProduct
  matchedGoal: NutrievoGoal | null
  index: number
}) {
  const [expanded, setExpanded] = useState(false)

  const isMatch = matchedGoal && product.objetivos.includes(matchedGoal)
  const claim = matchedGoal && product.claimPorObjetivo?.[matchedGoal]

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.3 }}
      className={cn(
        'bg-white rounded-2xl overflow-hidden border transition-shadow hover:shadow-lg',
        isMatch ? 'border-[#29ABE2]/40 shadow-md shadow-[#29ABE2]/10' : 'border-[#E2ECF4]'
      )}
    >
      {/* Foto del producto */}
      <div className="relative h-52 bg-[#F0F7FC] overflow-hidden">
        {product.foto ? (
          <img
            src={product.foto}
            alt={product.nombre}
            className="w-full h-full object-contain object-center p-3 drop-shadow-sm"
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={(e) => {
              const target = e.currentTarget
              target.style.display = 'none'
              const fallback = target.nextElementSibling as HTMLElement | null
              if (fallback) fallback.style.display = 'flex'
            }}
          />
        ) : null}
        <div
          className="w-full h-full items-center justify-center"
          style={{ display: product.foto ? 'none' : 'flex' }}
        >
          <ShoppingBag size={40} className="text-[#C8D8E4]" />
        </div>

        {/* Badge "Para tu objetivo" */}
        {isMatch && (
          <div className="absolute top-2.5 left-2.5">
            <span className="inline-flex items-center gap-1 bg-[#29ABE2] text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-sm">
              <Sparkles size={9} />
              Para tu objetivo
            </span>
          </div>
        )}

        {/* Precio */}
        <div className="absolute bottom-2.5 right-2.5">
          <span className="bg-white/95 backdrop-blur-sm text-[#0C1F2C] text-sm font-black px-3 py-1 rounded-full shadow-sm border border-[#E2ECF4]">
            ${product.precio.toLocaleString('es-CL')}
          </span>
        </div>
      </div>

      {/* Contenido */}
      <div className="p-4">
        {/* Nombre */}
        <h3 className="text-sm font-black text-[#0C1F2C] mb-1 leading-tight">{product.nombre}</h3>

        {/* Claim personalizado por objetivo */}
        {claim ? (
          <p className="text-xs text-[#1a6fa0] leading-relaxed mb-3 font-medium italic">
            &ldquo;{claim}&rdquo;
          </p>
        ) : (
          <p className="text-xs text-[#6B7C93] leading-relaxed mb-3">{product.descripcion}</p>
        )}

        {/* Macros */}
        {(product.proteina || product.kcal || product.carbohidratos) && (
          <div className="flex gap-4 mb-3 bg-[#F8FBFD] rounded-xl px-3 py-2">
            {product.proteina && (
              <div className="text-center">
                <p className="text-sm font-black text-blue-600">{product.proteina}g</p>
                <p className="text-[9px] text-[#8BA5BE] font-medium">Proteína</p>
              </div>
            )}
            {product.kcal && (
              <div className="text-center">
                <p className="text-sm font-black text-[#29ABE2]">{product.kcal}</p>
                <p className="text-[9px] text-[#8BA5BE] font-medium">kcal</p>
              </div>
            )}
            {product.carbohidratos && (
              <div className="text-center">
                <p className="text-sm font-black text-amber-600">{product.carbohidratos}g</p>
                <p className="text-[9px] text-[#8BA5BE] font-medium">Carbos</p>
              </div>
            )}
            {product.grasa && (
              <div className="text-center">
                <p className="text-sm font-black text-orange-500">{product.grasa}g</p>
                <p className="text-[9px] text-[#8BA5BE] font-medium">Grasas</p>
              </div>
            )}
          </div>
        )}

        {/* Tags */}
        <div className="mb-3">
          <ProductTags product={product} />
        </div>

        {/* Expand beneficios */}
        <button
          type="button"
          onClick={() => setExpanded(e => !e)}
          className="flex items-center gap-1 text-[11px] font-bold text-[#29ABE2] hover:text-[#1a6fa0] transition mb-3"
        >
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          {expanded ? 'Ocultar detalles' : 'Ver beneficios'}
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-3"
            >
              <ul className="space-y-1.5">
                {product.beneficios.map(b => (
                  <li key={b} className="flex items-start gap-2 text-[11px] text-[#4A6070]">
                    <span className="text-[#29ABE2] flex-shrink-0 mt-0.5">✓</span>
                    {b}
                  </li>
                ))}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>

        {/* CTA */}
        <a
          href={product.url}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            'flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-black transition',
            isMatch
              ? 'bg-[#29ABE2] text-white hover:bg-[#1a8fc2]'
              : 'bg-[#F0F6FA] text-[#0C3547] hover:bg-[#E2ECF4]'
          )}
        >
          <ShoppingBag size={13} />
          Comprar en Nutrevo
          <ExternalLink size={11} />
        </a>
      </div>
    </motion.div>
  )
}

// ─── Panel principal ──────────────────────────────────────────────────────────
export function NutrievoPanel({ objetivo }: { objetivo?: string }) {
  const products = getProductosDestacados()
  const matchedGoal = mapObjetivoToGoal(objetivo)
  const goalLabel = matchedGoal ? GOAL_LABELS[matchedGoal] : null

  return (
    <div className="mt-8">

      {/* Header marketplace */}
      <div className="mb-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
            <ShoppingBag size={16} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-black text-[#0C1F2C]">Nutrevo — Partner Nutricional</p>
            <p className="text-[10px] text-[#8BA5BE]">Snacks clínicos seleccionados para tu progreso</p>
          </div>
        </div>

        {/* Banner objetivo */}
        {goalLabel && (
          <div className="flex items-start gap-2.5 bg-gradient-to-r from-[#EAF4FB] to-[#F0F8FE] border border-[#C6E4F4] rounded-xl px-4 py-3">
            <Sparkles size={14} className="text-[#29ABE2] flex-shrink-0 mt-0.5" />
            <p className="text-xs text-[#0C3547] leading-relaxed">
              <strong>Selección para tu objetivo:</strong> los productos marcados{' '}
              <span className="text-[#29ABE2] font-bold">&ldquo;Para tu objetivo&rdquo;</span>{' '}
              están especialmente recomendados para <strong>{goalLabel}</strong>.
            </p>
          </div>
        )}
      </div>

      {/* Grid de productos */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {products.map((product, i) => (
          <ProductCard
            key={product.id}
            product={product}
            matchedGoal={matchedGoal}
            index={i}
          />
        ))}
      </div>

      <p className="text-center text-[10px] text-[#B0C4D4] mt-5">
        Precios en pesos chilenos · Stock sujeto a disponibilidad en nutrevo.cl
      </p>
    </div>
  )
}
