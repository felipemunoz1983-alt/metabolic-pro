'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { getNutrievoAIContext } from '@/lib/nutrevo'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface Props {
  userName: string
  targetKcal?: number
  objetivo?: string
}

// Chips de preguntas rápidas según objetivo del paciente
const QUICK_PROMPTS: Record<string, { icon: string; text: string }[]> = {
  'perdida grasa': [
    { icon: '🫖', text: '¿Qué como en la once sin salirme del plan?' },
    { icon: '😤', text: 'Tengo hambre entre comidas, ¿qué hago?' },
    { icon: '🍳', text: 'Dame una receta rápida de almuerzo' },
    { icon: '😬', text: '¿Qué hago si comí de más hoy?' },
    { icon: '💊', text: '¿Me conviene tomar creatina?' },
    { icon: '🏋️', text: '¿Qué como antes de entrenar?' },
  ],
  hipertrofia: [
    { icon: '🏋️', text: '¿Qué como antes de entrenar?' },
    { icon: '💪', text: '¿Qué como después de entrenar?' },
    { icon: '🥩', text: '¿Cuánta proteína necesito por comida?' },
    { icon: '🍳', text: 'Receta alta en proteína para la cena' },
    { icon: '💊', text: '¿Me conviene tomar creatina?' },
    { icon: '😴', text: '¿Cómo afecta el sueño al músculo?' },
  ],
  mantenimiento: [
    { icon: '🫖', text: '¿Qué como en la once?' },
    { icon: '🍳', text: 'Dame una receta rápida de almuerzo' },
    { icon: '⚡', text: '¿Qué hago si no tengo tiempo de cocinar?' },
    { icon: '💊', text: '¿Qué suplementos me recomiendas?' },
    { icon: '🌅', text: 'Ideas para el desayuno' },
    { icon: '🏃', text: '¿Qué como antes de entrenar?' },
  ],
  _default: [
    { icon: '🫖', text: '¿Qué como en la once?' },
    { icon: '🍳', text: 'Dame una receta rápida de almuerzo' },
    { icon: '😤', text: 'Tengo hambre entre comidas, ¿qué hago?' },
    { icon: '😬', text: '¿Qué hago si comí mal hoy?' },
    { icon: '💊', text: '¿Me conviene tomar creatina?' },
    { icon: '🏋️', text: '¿Qué como antes de entrenar?' },
  ],
}

export function ChatIA({ userName, targetKcal, objetivo }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [showChips, setShowChips] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const firstName = userName.split(' ')[0]

  // Chips según objetivo del paciente
  const chips = QUICK_PROMPTS[objetivo ?? ''] ?? QUICK_PROMPTS._default

  const systemPrompt = `Eres un nutricionista deportivo virtual del Centro Metabólico Pro, especializado en nutrición clínica y rendimiento deportivo.

# PACIENTE ACTUAL
Nombre: ${firstName}
${targetKcal ? `Meta calórica: ${targetKcal} kcal/día` : ''}
${objetivo ? `Objetivo: ${objetivo}` : ''}

REGLA OBLIGATORIA: Dirígete SIEMPRE a esta persona por su nombre "${firstName}".
Responde en español, de forma cercana, profesional y motivadora.
Limita tus respuestas a máximo 3 párrafos cortos.

${getNutrievoAIContext()}`

  useEffect(() => {
    // Mensaje de bienvenida one-shot al mount
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot welcome message
    setMessages([{
      role: 'assistant',
      content: `¡Hola ${firstName}! 👋 Soy tu nutricionista virtual del Centro Metabólico Pro. ¿En qué te puedo ayudar hoy? Puedo orientarte sobre tu plan nutricional, recetas, suplementación o cualquier duda sobre alimentación. 🥗`
    }])
  }, [firstName])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function sendMessage(text?: string) {
    const content = (text ?? input).trim()
    if (!content || loading) return

    setShowChips(false)
    const userMsg: Message = { role: 'user', content }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, system: systemPrompt }),
      })

      const data = await res.json()
      const reply: Message = {
        role: 'assistant',
        content: data.reply || 'Lo siento, no pude procesar tu consulta. Intenta de nuevo.'
      }
      setMessages(prev => [...prev, reply])
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Ocurrió un error de conexión. Por favor intenta de nuevo.'
      }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  return (
    <div className="flex flex-col h-[600px] bg-white rounded-2xl border border-[#D6E3ED] shadow overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#0C3547] to-[#145272] px-5 py-4 flex items-center gap-3">
        <div className="w-9 h-9 bg-[#29ABE2] rounded-full flex items-center justify-center text-lg">🤖</div>
        <div>
          <p className="text-white font-bold text-sm">Nutricionista Virtual IA</p>
          <p className="text-[#9EC8E0] text-xs">Powered by Claude · Disponible 24/7</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span className="text-xs text-[#9EC8E0]">En línea</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F8FBFD]">
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}
            >
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 bg-[#29ABE2] rounded-full flex items-center justify-center text-sm mr-2 mt-0.5 flex-shrink-0">🤖</div>
              )}
              <div className={cn(
                'max-w-[78%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed',
                msg.role === 'user'
                  ? 'bg-[#0C3547] text-white rounded-tr-sm'
                  : 'bg-white border border-[#D6E3ED] text-[#1E2D3D] rounded-tl-sm shadow-sm'
              )}>
                {msg.content}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Chips de preguntas rápidas — solo antes del primer mensaje del usuario */}
        <AnimatePresence>
          {showChips && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }}
              transition={{ delay: 0.3, duration: 0.3 }}
              className="pl-9"
            >
              <p className="text-[10px] text-[#8BA5BE] font-semibold uppercase tracking-wide mb-2">
                Preguntas frecuentes
              </p>
              <div className="flex flex-wrap gap-2">
                {chips.map((chip, i) => (
                  <motion.button
                    key={chip.text}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.35 + i * 0.05 }}
                    onClick={() => sendMessage(chip.text)}
                    disabled={loading}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#C6DFF0] rounded-full text-xs text-[#0C3547] font-medium hover:bg-[#EAF4FB] hover:border-[#29ABE2] transition-all disabled:opacity-40 shadow-sm"
                  >
                    <span>{chip.icon}</span>
                    <span>{chip.text}</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2">
            <div className="w-7 h-7 bg-[#29ABE2] rounded-full flex items-center justify-center text-sm flex-shrink-0">🤖</div>
            <div className="bg-white border border-[#D6E3ED] rounded-2xl rounded-tl-sm px-4 py-2.5 shadow-sm">
              <div className="flex gap-1.5">
                {[0, 1, 2].map(i => (
                  <motion.div
                    key={i}
                    className="w-2 h-2 bg-[#29ABE2] rounded-full"
                    animate={{ y: [0, -6, 0] }}
                    transition={{ duration: 0.6, delay: i * 0.15, repeat: Infinity }}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-[#D6E3ED] bg-white">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder={`Pregunta algo, ${firstName}...`}
            className="flex-1 px-4 py-2.5 border border-[#D6E3ED] rounded-xl text-sm text-[#1E2D3D] focus:outline-none focus:border-[#29ABE2] focus:ring-2 focus:ring-[#29ABE2]/20"
            disabled={loading}
          />
          <button
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            className="px-4 py-2.5 bg-gradient-to-r from-[#29ABE2] to-[#1a7fad] text-white rounded-xl font-bold text-sm hover:opacity-90 transition disabled:opacity-40"
          >
            ➤
          </button>
        </div>
      </div>
    </div>
  )
}
