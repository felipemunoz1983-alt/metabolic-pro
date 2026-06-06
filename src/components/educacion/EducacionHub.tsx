'use client'

/**
 * EducacionHub — Tab "📚 Educación" del paciente.
 *
 * Centraliza las guías educativas personalizadas que antes vivían dispersas
 * en otros tabs (Dashboard/Plan). Permite extender con más secciones sin
 * saturar el Dashboard:
 *  - Comparador de lácteos proteicos (yogures + bebidas) — implementado
 *  - Futuro: Guía de panes chilenos, suplementación segura, FAQ digestivo, etc.
 *
 * Diseño: hero con saludo + bloques en stack (cada uno expandible internamente).
 */

import { motion } from 'framer-motion'
import { BookOpen, Sparkles } from 'lucide-react'
import { YogurComparativo } from './YogurComparativo'
import { WheyComparativo } from './WheyComparativo'
import { QuesoComparativo } from './QuesoComparativo'
import type { FormData } from '@/lib/nutrition'

interface Props {
  /** Form del paciente para personalizar las recomendaciones de cada guía.
   *  Si no hay form (paciente sin plan), las guías muestran rankings neutrales. */
  form?: Partial<FormData>
  /** Nombre del paciente para personalizar el saludo del hero. */
  nombre?: string
}

export function EducacionHub({ form = {}, nombre }: Props) {
  return (
    <div className="px-4 py-4 md:px-8 md:py-6 max-w-3xl mx-auto space-y-5">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0C3547] via-[#1a6fa0] to-[#29ABE2] text-white p-5 md:p-6"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-12 translate-x-12" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-10 -translate-x-8" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center">
              <BookOpen size={18} />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">Centro Metabólico</span>
          </div>
          <h1 className="text-xl md:text-2xl font-black mb-1.5 leading-tight">
            {nombre ? `Hola ${nombre.split(' ')[0]},` : 'Hola,'} aquí están tus guías
          </h1>
          <p className="text-xs md:text-sm opacity-95 leading-relaxed">
            Comparativos y recomendaciones personalizadas según tu objetivo y restricciones.
            Datos validados clínicamente · etiquetas reales de productos chilenos.
          </p>
        </div>
      </motion.div>

      {/* Guía: Comparador de lácteos proteicos (yogures + bebidas) */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <YogurComparativo form={form} defaultOpen />
      </motion.div>

      {/* Guía: Comparador de proteínas en polvo (whey + plant) */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
      >
        <WheyComparativo form={form} defaultOpen />
      </motion.div>

      {/* Guía: Comparador de quesos (7 opciones, 3 sin lactosa) */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.11 }}
      >
        <QuesoComparativo form={form} defaultOpen />
      </motion.div>

      {/* Placeholder para futuras guías — visible para que el paciente sepa que
          esta sección va a crecer. Reemplazar por componentes reales cuando estén. */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl border border-dashed border-[#D6E3ED] p-5 text-center"
      >
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-[#F0F6FA] mb-3">
          <Sparkles size={16} className="text-[#8BA5BE]" />
        </div>
        <p className="text-sm font-bold text-[#0C3547] mb-1">Más guías en camino</p>
        <p className="text-xs text-[#8BA5BE] leading-relaxed max-w-md mx-auto">
          Comparador de panes chilenos · Suplementación segura · FAQ digestivo ·
          Preparaciones por tiempo de comida. Vuelve pronto.
        </p>
      </motion.section>
    </div>
  )
}
