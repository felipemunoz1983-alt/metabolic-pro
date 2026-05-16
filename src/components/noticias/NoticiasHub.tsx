'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, X, ChevronRight, BookOpen, Sparkles, ArrowRight, LayoutGrid } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getNoticiasPersonalizadas, getAllNoticias, CATEGORIA_CONFIG } from '@/lib/noticias'
import type { Noticia } from '@/lib/noticias'
import type { FormData } from '@/lib/nutrition'

// ─── Badge de categoría ──────────────────────────────────────────────────────
function CategoriaBadge({ categoria, size = 'sm' }: { categoria: Noticia['categoria']; size?: 'sm' | 'xs' }) {
  const cfg = CATEGORIA_CONFIG[categoria]
  return (
    <span className={cn(
      'inline-flex items-center gap-1 font-bold rounded-full border',
      cfg.bgColor, cfg.textColor, cfg.borderColor,
      size === 'sm' ? 'text-[10px] px-2.5 py-1' : 'text-[9px] px-2 py-0.5'
    )}>
      <span>{cfg.icono}</span>
      {cfg.label}
    </span>
  )
}

// ─── Badge de evidencia ──────────────────────────────────────────────────────
function EvidenciaBadge({ nivel }: { nivel: Noticia['evidencia'] }) {
  const map = {
    alta:      { label: 'Evidencia alta',      color: 'bg-green-100 text-green-800 border-green-200' },
    moderada:  { label: 'Evidencia moderada',  color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
    emergente: { label: 'Evidencia emergente', color: 'bg-gray-100 text-gray-600 border-gray-200' },
  }
  const { label, color } = map[nivel]
  return (
    <span className={cn('text-[9px] font-bold px-2 py-0.5 rounded-full border', color)}>
      {label}
    </span>
  )
}

// ─── Modal artículo completo ─────────────────────────────────────────────────
function ArticleModal({ noticia, onClose }: { noticia: Noticia | null; onClose: () => void }) {
  if (!noticia) return null
  return (
    <AnimatePresence>
      {noticia && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 60 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            onClick={e => e.stopPropagation()}
            className="bg-white w-full sm:max-w-2xl rounded-t-3xl sm:rounded-2xl overflow-hidden max-h-[92vh] flex flex-col"
          >
            {/* Imagen */}
            <div className="relative h-52 sm:h-64 flex-shrink-0 overflow-hidden">
              <img
                src={noticia.imagen}
                alt={noticia.titulo}
                className="w-full h-full object-cover"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <button
                onClick={onClose}
                className="absolute top-4 right-4 w-9 h-9 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70 transition"
              >
                <X size={18} />
              </button>
              <div className="absolute bottom-4 left-4 right-4">
                <CategoriaBadge categoria={noticia.categoria} size="xs" />
                <h2 className="text-white font-black text-lg sm:text-xl leading-tight mt-2">{noticia.titulo}</h2>
              </div>
            </div>

            {/* Contenido scrollable */}
            <div className="overflow-y-auto flex-1 p-5 space-y-4">
              {/* Meta */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1.5 text-[#8BA5BE] text-xs">
                  <Clock size={12} />
                  <span>{noticia.tiempoLectura} min de lectura</span>
                </div>
                <EvidenciaBadge nivel={noticia.evidencia} />
              </div>

              {/* Subtítulo */}
              <p className="text-sm text-[#4A6070] font-medium leading-relaxed italic border-l-2 border-[#29ABE2] pl-3">
                {noticia.subtitulo}
              </p>

              {/* Cuerpo */}
              <div className="space-y-3">
                {noticia.cuerpo.map((parrafo, i) => (
                  <p key={i} className="text-sm text-[#0C1F2C] leading-relaxed">
                    {parrafo}
                  </p>
                ))}
              </div>

              {/* Recomendación práctica */}
              <div className="bg-[#EAF4FB] border-l-4 border-[#29ABE2] rounded-r-xl p-4 space-y-1">
                <p className="text-[10px] font-black text-[#29ABE2] uppercase tracking-wide">✅ Recomendación práctica</p>
                <p className="text-sm font-semibold text-[#0C3547] leading-relaxed">{noticia.recomendacionPractica}</p>
              </div>

              {/* Fuente */}
              <p className="text-[10px] text-[#8BA5BE] leading-relaxed">
                📚 Fuente: {noticia.fuente}
              </p>

              {/* Disclaimer clínico */}
              <div className="flex gap-2 bg-[#F8FBFD] border border-[#D6E3ED] rounded-xl p-3">
                <span className="text-sm flex-shrink-0">🩺</span>
                <p className="text-[10px] text-[#6B7C93] leading-relaxed">
                  Este contenido es educativo y basado en evidencia. No reemplaza la evaluación de tu profesional de salud.
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─── Hero card (primera noticia, grande) ─────────────────────────────────────
function HeroCard({ noticia, onClick }: { noticia: Noticia; onClick: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      onClick={onClick}
      className="relative overflow-hidden rounded-2xl cursor-pointer group"
      style={{ aspectRatio: '16/9' }}
    >
      {/* Imagen */}
      <img
        src={noticia.imagen}
        alt={noticia.titulo}
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        onError={e => { (e.target as HTMLImageElement).style.background = '#0C3547' }}
        loading="lazy"
      />
      {/* Gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

      {/* Top badges */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
        <CategoriaBadge categoria={noticia.categoria} size="xs" />
        <span className="text-[10px] text-white bg-black/50 rounded-full px-2 py-1 flex items-center gap-1">
          <Clock size={9} />
          {noticia.tiempoLectura} min
        </span>
      </div>

      {/* Bottom content */}
      <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2">
        <div className="inline-flex items-center gap-1.5 bg-[#29ABE2] text-white text-[9px] font-black px-2.5 py-1 rounded-full">
          <Sparkles size={9} />
          Recomendado para ti
        </div>
        <h3 className="text-white font-black text-base sm:text-xl leading-tight line-clamp-3">
          {noticia.titulo}
        </h3>
        <p className="text-white/75 text-xs leading-relaxed line-clamp-2">{noticia.resumen}</p>
        <div className="flex items-center gap-1.5 text-[#29ABE2] text-xs font-bold mt-1">
          <BookOpen size={12} />
          <span>Leer artículo</span>
          <ArrowRight size={11} />
        </div>
      </div>
    </motion.div>
  )
}

// ─── Secondary card ──────────────────────────────────────────────────────────
function SecondaryCard({ noticia, onClick, index }: { noticia: Noticia; onClick: () => void; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + index * 0.08, duration: 0.3 }}
      onClick={onClick}
      className="bg-white border border-[#E2ECF4] rounded-2xl overflow-hidden cursor-pointer hover:shadow-md hover:border-[#29ABE2]/30 transition-all group"
    >
      {/* Imagen */}
      <div className="relative overflow-hidden" style={{ aspectRatio: '16/9' }}>
        <img
          src={noticia.imagen}
          alt={noticia.titulo}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={e => { (e.target as HTMLImageElement).style.background = '#EAF4FB' }}
          loading="lazy"
        />
      </div>
      {/* Content */}
      <div className="p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <CategoriaBadge categoria={noticia.categoria} size="xs" />
          <span className="text-[9px] text-[#8BA5BE] flex items-center gap-0.5 flex-shrink-0">
            <Clock size={8} />
            {noticia.tiempoLectura} min
          </span>
        </div>
        <h4 className="text-xs font-black text-[#0C1F2C] leading-tight line-clamp-3">{noticia.titulo}</h4>
        <p className="text-[10px] text-[#6B7C93] leading-relaxed line-clamp-2">{noticia.resumen}</p>
        <div className="flex items-center gap-1 text-[#29ABE2] text-[10px] font-bold">
          <span>Leer</span>
          <ChevronRight size={10} />
        </div>
      </div>
    </motion.div>
  )
}

// ─── Panel principal ─────────────────────────────────────────────────────────
interface Props {
  form: Partial<FormData>
}

export function NoticiasHub({ form }: Props) {
  const [noticias] = useState(() => getNoticiasPersonalizadas(form, 3))
  const [verTodas, setVerTodas] = useState(false)
  const [todasNoticias] = useState(() => getAllNoticias())
  const [articuloAbierto, setArticuloAbierto] = useState<Noticia | null>(null)

  const [hero, ...secundarias] = noticias

  return (
    <section className="mt-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-black text-[#0C1F2C]">🗞️ Centro de Noticias</p>
            <span className="text-[9px] font-black bg-[#29ABE2] text-white px-2 py-0.5 rounded-full">NUEVO</span>
          </div>
          <p className="text-[10px] text-[#8BA5BE] mt-0.5">Actualizado esta semana · Personalizado para ti</p>
        </div>
      </div>

      {/* Hero */}
      {hero && (
        <HeroCard noticia={hero} onClick={() => setArticuloAbierto(hero)} />
      )}

      {/* Secondary grid */}
      {secundarias.length > 0 && (
        <div className="grid grid-cols-2 gap-3 mt-3">
          {secundarias.map((n, i) => (
            <SecondaryCard
              key={n.id}
              noticia={n}
              index={i}
              onClick={() => setArticuloAbierto(n)}
            />
          ))}
        </div>
      )}

      {/* Ver todas */}
      <button
        type="button"
        onClick={() => setVerTodas(v => !v)}
        className="w-full mt-3 py-2.5 border border-[#D6E3ED] rounded-xl text-xs font-bold text-[#6B7C93] hover:border-[#29ABE2] hover:text-[#29ABE2] transition flex items-center justify-center gap-2"
      >
        <LayoutGrid size={13} />
        {verTodas ? 'Ver menos' : `Ver todas las noticias (${todasNoticias.length})`}
      </button>

      {/* Todas las noticias */}
      <AnimatePresence>
        {verTodas && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
              {todasNoticias.map((n, i) => (
                <SecondaryCard
                  key={n.id}
                  noticia={n}
                  index={i}
                  onClick={() => setArticuloAbierto(n)}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal */}
      <ArticleModal
        noticia={articuloAbierto}
        onClose={() => setArticuloAbierto(null)}
      />
    </section>
  )
}
