'use client'

/**
 * GuiaCeliacaConvivir — referencia clínica con el listado oficial de productos
 * certificados libres de gluten en Chile (Fundación Convivir, junio 2026).
 *
 * UX:
 *  - Buscador por texto (producto + empresa + tipo)
 *  - Filtro por categoría (chips)
 *  - Resumen: "X productos en Y categorías"
 *  - Lista compacta agrupada por categoría
 *  - Disclaimer clínico al pie
 *
 * Se monta en:
 *  - /paciente cuando el paciente tiene 'gluten' en digIntolerancias
 *  - Panel profesional (siempre disponible) — para consulta clínica
 */

import { useMemo, useState } from 'react'
import {
  CATALOGO_CELIACO_CONVIVIR,
  totalItemsCeliacos,
  type CategoriaCeliaca,
} from '@/lib/celiaco-convivir'
import { cn } from '@/lib/utils'

export function GuiaCeliacaConvivir() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [categoriaActiva, setCategoriaActiva] = useState<string | null>(null)

  const total = useMemo(() => totalItemsCeliacos(), [])

  // Filtrado: por query + categoría activa
  const categoriasFiltradas: CategoriaCeliaca[] = useMemo(() => {
    const q = query.trim().toLowerCase()
    return CATALOGO_CELIACO_CONVIVIR
      .filter(c => categoriaActiva === null || c.categoria === categoriaActiva)
      .map(c => ({
        ...c,
        items: c.items.filter(i =>
          q === '' ||
          i.producto.toLowerCase().includes(q) ||
          i.empresa.toLowerCase().includes(q) ||
          i.tipo.toLowerCase().includes(q)
        ),
      }))
      .filter(c => c.items.length > 0)
  }, [query, categoriaActiva])

  const totalFiltrado = categoriasFiltradas.reduce((acc, c) => acc + c.items.length, 0)

  return (
    <div className="bg-white border border-[#D6E3ED] rounded-2xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-[#F8FBFD] transition text-left"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl flex-shrink-0">🌾</span>
          <div className="min-w-0">
            <p className="text-sm font-black text-[#0C3547]">Guía celíaco · Productos certificados sin gluten</p>
            <p className="text-[10px] text-[#6B7C93]">{total} productos · Fundación Convivir · Junio 2026</p>
          </div>
        </div>
        <span className={cn('text-[#8BA5BE] text-xs transition-transform', open && 'rotate-180')}>▼</span>
      </button>

      {open && (
        <div className="border-t border-[#E2ECF4]">
          {/* Disclaimer */}
          <div className="px-4 py-3 bg-amber-50 border-b border-amber-200">
            <p className="text-[11px] text-amber-900 leading-relaxed">
              <strong>⚠ Verificá siempre la etiqueta del producto al comprar.</strong> Las formulaciones pueden cambiar.
              Este listado es referencial y se actualiza periódicamente desde la <a href="https://fundacionconvivir.cl" target="_blank" rel="noopener noreferrer" className="underline font-bold">Fundación Convivir</a>.
            </p>
          </div>

          {/* Buscador */}
          <div className="px-4 py-3 border-b border-[#E2ECF4]">
            <div className="relative mb-2">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8BA5BE]">🔍</span>
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Buscar producto, marca o tipo (ej: ketchup, colun, mayonesa)…"
                className="w-full pl-9 pr-3 py-2 border border-[#D6E3ED] rounded-lg text-sm focus:outline-none focus:border-[#29ABE2]"
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8BA5BE] hover:text-[#0C3547] text-xs font-bold px-2"
                  title="Limpiar búsqueda"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Filtros por categoría (chips) */}
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setCategoriaActiva(null)}
                className={cn(
                  'text-[10px] font-bold px-2 py-1 rounded-full border transition',
                  categoriaActiva === null
                    ? 'bg-[#0C3547] border-[#0C3547] text-white'
                    : 'bg-white border-[#D6E3ED] text-[#6B7C93] hover:border-[#29ABE2]'
                )}
              >
                Todas
              </button>
              {CATALOGO_CELIACO_CONVIVIR.map(c => (
                <button
                  key={c.categoria}
                  onClick={() => setCategoriaActiva(categoriaActiva === c.categoria ? null : c.categoria)}
                  className={cn(
                    'text-[10px] font-bold px-2 py-1 rounded-full border transition',
                    categoriaActiva === c.categoria
                      ? 'bg-[#0C3547] border-[#0C3547] text-white'
                      : 'bg-white border-[#D6E3ED] text-[#6B7C93] hover:border-[#29ABE2]'
                  )}
                >
                  {c.emoji} {c.categoria}
                </button>
              ))}
            </div>

            <p className="text-[10px] text-[#6B7C93] mt-2 italic">
              Mostrando <strong>{totalFiltrado}</strong> de {total} productos
              {query && ` para "${query}"`}
              {categoriaActiva && ` en ${categoriaActiva}`}
            </p>
          </div>

          {/* Lista por categoría */}
          <div className="max-h-[600px] overflow-y-auto divide-y divide-[#F0F6FA]">
            {categoriasFiltradas.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-[#6B7C93]">
                <p className="font-bold mb-1">Sin resultados</p>
                <p className="text-[11px]">Probá con otro término o limpia el buscador.</p>
              </div>
            ) : (
              categoriasFiltradas.map(c => (
                <section key={c.categoria} className="px-4 py-3">
                  <p className="text-[11px] font-black text-[#0C3547] uppercase tracking-wide mb-2">
                    {c.emoji} {c.categoria} <span className="text-[#8BA5BE] font-normal normal-case">({c.items.length})</span>
                  </p>
                  <div className="space-y-1">
                    {c.items.map((i, idx) => (
                      <div key={`${c.categoria}-${idx}`} className="flex items-start gap-2 text-[11px] leading-snug">
                        <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5">
                          {i.tipo}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[#0C1F2C] font-semibold">{i.producto}</p>
                          <p className="text-[10px] text-[#8BA5BE]">{i.empresa}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ))
            )}
          </div>

          {/* Footer referencia */}
          <div className="px-4 py-3 bg-[#F8FBFD] border-t border-[#E2ECF4]">
            <p className="text-[10px] text-[#6B7C93] italic text-center leading-relaxed">
              📎 Fuente oficial: <strong>Fundación Convivir — Fundación de Intolerancia al Gluten</strong>.
              Lista de Alimentos Certificados Libres de Gluten, actualizada al 18-Junio-2026.
              <br />
              Material clínico para consulta del profesional y educación al paciente celíaco.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
