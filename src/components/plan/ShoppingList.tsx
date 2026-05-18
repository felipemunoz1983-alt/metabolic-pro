'use client'

import { useMemo, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingCart, Check, ChevronDown, Copy, CheckCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { generarListaSupermercado, CATEGORY_META } from '@/lib/shoppingList'
import type { ShoppingCategory } from '@/lib/shoppingList'
import type { WeekPlan } from '@/lib/planGenerator'

interface Props {
  plan: WeekPlan
  /** ID del usuario — habilita persistencia del checklist en localStorage */
  userId?: string
}

// ─── Persistencia ligera en localStorage ──────────────────────────────────────
// Key namespaced por usuario para no mezclar checklists entre cuentas en mismo dispositivo.
const STORAGE_PREFIX = 'cm:shopping:'
function loadChecked(userId?: string): Set<string> {
  if (!userId || typeof window === 'undefined') return new Set()
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + userId)
    if (!raw) return new Set()
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? new Set(arr) : new Set()
  } catch { return new Set() }
}
function saveChecked(userId: string | undefined, set: Set<string>) {
  if (!userId || typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_PREFIX + userId, JSON.stringify([...set]))
  } catch { /* quota / privacy mode → fail silent */ }
}

const CATEGORY_ORDER: ShoppingCategory[] = [
  'proteinas', 'lacteos', 'cereales', 'frutas_verduras', 'grasas', 'condimentos', 'suplementos', 'otros',
]

export function ShoppingList({ plan, userId }: Props) {
  const lista = useMemo(() => generarListaSupermercado(plan), [plan])

  // Estado de tachado por item (key = nombre) — hidratado desde localStorage al mount
  const [checked, setChecked] = useState<Set<string>>(() => loadChecked(userId))
  const [openCats, setOpenCats] = useState<Set<ShoppingCategory>>(
    new Set(CATEGORY_ORDER.filter(c => lista.byCategory[c]?.length > 0))
  )
  const [copied, setCopied] = useState(false)
  const [expanded, setExpanded] = useState(false)

  // Re-hidratar si cambia el usuario (cambio de cuenta sin refresh)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- legitimate hydration from localStorage on userId change
    setChecked(loadChecked(userId))
  }, [userId])

  // Persistir cada cambio en localStorage
  useEffect(() => {
    saveChecked(userId, checked)
  }, [checked, userId])

  function toggleItem(nombre: string) {
    setChecked(prev => {
      const next = new Set(prev)
      next.has(nombre) ? next.delete(nombre) : next.add(nombre)
      return next
    })
  }

  function toggleCat(cat: ShoppingCategory) {
    setOpenCats(prev => {
      const next = new Set(prev)
      next.has(cat) ? next.delete(cat) : next.add(cat)
      return next
    })
  }

  function handleCopyAll() {
    const lines: string[] = ['🛒 LISTA DE SUPERMERCADO — Centro Metabólico Pro', '']
    for (const cat of CATEGORY_ORDER) {
      const items = lista.byCategory[cat]
      if (!items?.length) continue
      const meta = CATEGORY_META[cat]
      lines.push(`${meta.emoji} ${meta.label.toUpperCase()}`)
      for (const item of items) {
        lines.push(`  • ${item.nombre}  (${item.cantidad})`)
      }
      lines.push('')
    }
    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }

  function handleResetAll() {
    setChecked(new Set())
  }

  const totalItems  = lista.totalIngredientes
  const doneItems   = checked.size
  const pctDone     = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0

  // Categorías con contenido
  const activeCats = CATEGORY_ORDER.filter(c => lista.byCategory[c]?.length > 0)

  return (
    <div className="bg-white rounded-2xl border border-[#D6E3ED] overflow-hidden">
      {/* ── Header colapsable ── */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between p-5 hover:bg-[#F8FBFD] transition text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-2xl flex items-center justify-center flex-shrink-0">
            <ShoppingCart size={18} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-[#0C3547]">Lista de supermercado</p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="text-[10px] text-[#8BA5BE]">{totalItems} ingredientes · {activeCats.length} categorías</span>
              {doneItems > 0 && (
                <span className="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-full">
                  ✓ {doneItems}/{totalItems}
                </span>
              )}
            </div>
          </div>
        </div>
        <ChevronDown
          size={18}
          className={cn('text-[#6B7C93] transition-transform flex-shrink-0', expanded && 'rotate-180')}
        />
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-4">

              {/* Progress bar */}
              {doneItems > 0 && (
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-[#6B7C93]">Progreso de compra</span>
                    <span className="font-bold text-emerald-700">{pctDone}%</span>
                  </div>
                  <div className="h-2 bg-[#EAF4FB] rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-emerald-500 rounded-full"
                      animate={{ width: `${pctDone}%` }}
                      transition={{ duration: 0.4 }}
                    />
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2">
                <button
                  onClick={handleCopyAll}
                  className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-2 rounded-xl border border-[#E2ECF4] text-[#4A6070] hover:border-[#29ABE2] hover:text-[#29ABE2] transition flex-1 justify-center"
                >
                  {copied ? <CheckCheck size={12} className="text-emerald-500" /> : <Copy size={12} />}
                  {copied ? 'Copiado' : 'Copiar lista'}
                </button>
                {doneItems > 0 && (
                  <button
                    onClick={handleResetAll}
                    className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-2 rounded-xl border border-[#E2ECF4] text-[#8BA5BE] hover:border-red-300 hover:text-red-500 transition"
                  >
                    Reiniciar
                  </button>
                )}
              </div>

              {/* Categorías */}
              <div className="space-y-3">
                {activeCats.map(cat => {
                  const items = lista.byCategory[cat]
                  const meta  = CATEGORY_META[cat]
                  const isOpen = openCats.has(cat)
                  const catDone = items.filter(i => checked.has(i.nombre)).length

                  return (
                    <div key={cat} className="border border-[#E2ECF4] rounded-xl overflow-hidden">
                      {/* Category header */}
                      <button
                        onClick={() => toggleCat(cat)}
                        className="w-full flex items-center justify-between px-4 py-3 bg-[#F8FBFD] hover:bg-[#EEF5FB] transition text-left"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-base">{meta.emoji}</span>
                          <span className="text-xs font-bold text-[#0C3547]">{meta.label}</span>
                          <span className="text-[10px] bg-white border border-[#E2ECF4] text-[#8BA5BE] px-1.5 py-0.5 rounded-full font-semibold">
                            {items.length}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {catDone > 0 && (
                            <span className="text-[10px] text-emerald-600 font-bold">{catDone}/{items.length}</span>
                          )}
                          <ChevronDown
                            size={14}
                            className={cn('text-[#8BA5BE] transition-transform', isOpen && 'rotate-180')}
                          />
                        </div>
                      </button>

                      {/* Items */}
                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: 'auto' }}
                            exit={{ height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="divide-y divide-[#F0F6FA]">
                              {items.map(item => {
                                const isDone = checked.has(item.nombre)
                                return (
                                  <button
                                    key={item.nombre}
                                    onClick={() => toggleItem(item.nombre)}
                                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#F8FBFD] transition text-left group"
                                  >
                                    <div className="flex items-center gap-3 min-w-0">
                                      {/* Checkbox */}
                                      <div className={cn(
                                        'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all',
                                        isDone
                                          ? 'bg-emerald-500 border-emerald-500'
                                          : 'border-[#D6E3ED] group-hover:border-emerald-400'
                                      )}>
                                        {isDone && <Check size={11} className="text-white" strokeWidth={3} />}
                                      </div>
                                      {/* Nombre */}
                                      <span className={cn(
                                        'text-sm text-[#1E2D3D] truncate transition-all',
                                        isDone && 'line-through text-[#B0C4D4]'
                                      )}>
                                        {item.nombre}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                      <span className={cn(
                                        'text-[10px] px-2 py-0.5 rounded-full font-semibold border',
                                        isDone
                                          ? 'bg-gray-50 text-[#B0C4D4] border-[#E2ECF4]'
                                          : 'bg-[#EAF4FB] text-[#4A7A94] border-[#D0E8F5]'
                                      )}>
                                        {item.cantidad}
                                      </span>
                                      {item.diasUsado >= 5 && !isDone && (
                                        <span className="text-[9px] bg-amber-50 text-amber-600 border border-amber-200 px-1.5 py-0.5 rounded-full font-bold">
                                          uso frecuente
                                        </span>
                                      )}
                                    </div>
                                  </button>
                                )
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )
                })}
              </div>

              {/* Footer note */}
              <p className="text-center text-[10px] text-[#B0C4D4]">
                Cantidades acumuladas para 7 días · Agua e infusiones excluidas · Tu progreso se guarda automáticamente
              </p>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
