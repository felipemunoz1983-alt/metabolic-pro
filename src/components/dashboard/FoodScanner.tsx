'use client'

import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, X, Loader2, CheckCircle, AlertCircle, RefreshCw, Zap, Upload } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase'

interface Food {
  nombre: string
  porcion: string
  kcal: number
  proteina: number
  carbohidratos: number
  grasa: number
}

interface ScanResult {
  alimentos: Food[]
  total: { kcal: number; proteina: number; carbohidratos: number; grasa: number }
  confianza: 'alta' | 'media' | 'baja'
  notas?: string
}

interface Props {
  userId: string
  onLogAdded?: () => void
}

const CONFIDENCE_LABEL = { alta: 'Alta', media: 'Media', baja: 'Baja' }
const CONFIDENCE_COLOR = { alta: 'text-green-600 bg-green-50', media: 'text-amber-600 bg-amber-50', baja: 'text-red-500 bg-red-50' }

export function FoodScanner({ userId, onLogAdded }: Props) {
  const [open, setOpen] = useState(false)
  const [image, setImage] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState<ScanResult | null>(null)
  const [error, setError] = useState('')
  const [logging, setLogging] = useState(false)
  const [logged, setLogged] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const reset = () => {
    setImage(null)
    setResult(null)
    setError('')
    setLogged(false)
  }

  const handleClose = () => {
    setOpen(false)
    setTimeout(reset, 300)
  }

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = e => {
      setImage(e.target?.result as string)
      setResult(null)
      setError('')
      setLogged(false)
    }
    reader.readAsDataURL(file)
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    // Reset input so same file can be re-selected
    e.target.value = ''
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  async function analyze() {
    if (!image) return
    setScanning(true)
    setError('')
    setResult(null)

    try {
      const res = await fetch('/api/food-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al analizar')
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo analizar la imagen')
    } finally {
      setScanning(false)
    }
  }

  async function addToLog() {
    if (!result || !userId) return
    setLogging(true)

    const supabase = createClient()
    const today = new Date().toISOString().split('T')[0]

    // Add scanned calories to today's registros_diarios row (upsert)
    const { data: existing } = await supabase
      .from('registros_diarios')
      .select('id, scan_kcal, scan_proteina, scan_carbohidrato, scan_grasa')
      .eq('user_id', userId)
      .eq('fecha', today)
      .maybeSingle()

    if (existing) {
      await supabase
        .from('registros_diarios')
        .update({
          scan_kcal:         (existing.scan_kcal ?? 0) + result.total.kcal,
          scan_proteina:     (existing.scan_proteina ?? 0) + result.total.proteina,
          scan_carbohidrato: (existing.scan_carbohidrato ?? 0) + result.total.carbohidratos,
          scan_grasa:        (existing.scan_grasa ?? 0) + result.total.grasa,
        })
        .eq('id', existing.id)
    } else {
      await supabase.from('registros_diarios').upsert({
        user_id:           userId,
        fecha:             today,
        scan_kcal:         result.total.kcal,
        scan_proteina:     result.total.proteina,
        scan_carbohidrato: result.total.carbohidratos,
        scan_grasa:        result.total.grasa,
        completed:         0,
        total:             5,
      }, { onConflict: 'user_id,fecha' })
    }

    setLogged(true)
    setLogging(false)
    onLogAdded?.()
  }

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-40 w-14 h-14 bg-gradient-to-br from-[#29ABE2] to-[#1a6fa0] rounded-2xl shadow-lg shadow-[#29ABE2]/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
        title="Escanear alimento"
      >
        <Camera size={22} className="text-white" />
      </button>

      {/* Modal */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
              onClick={handleClose}
            />

            {/* Sheet */}
            <motion.div
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 60 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 md:inset-0 md:flex md:items-center md:justify-center z-50 pointer-events-none"
            >
              <div
                className="bg-white rounded-t-3xl md:rounded-2xl w-full md:max-w-lg max-h-[92vh] overflow-y-auto pointer-events-auto shadow-2xl"
                onClick={e => e.stopPropagation()}
              >
                {/* Handle + header */}
                <div className="sticky top-0 bg-white border-b border-[#F0F6FA] px-5 pt-4 pb-3 rounded-t-3xl md:rounded-t-2xl">
                  <div className="w-10 h-1 bg-[#E2ECF4] rounded-full mx-auto mb-3 md:hidden" />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 bg-gradient-to-br from-[#29ABE2] to-[#1a6fa0] rounded-xl flex items-center justify-center">
                        <Camera size={15} className="text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-[#0C1F2C]">Escanear Alimento</p>
                        <p className="text-[10px] text-[#8BA5BE]">Estimación calórica con IA</p>
                      </div>
                    </div>
                    <button onClick={handleClose} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-[#F0F6FA] text-[#8BA5BE] transition">
                      <X size={16} />
                    </button>
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  {/* Image area */}
                  {!image ? (
                    <div
                      onDrop={handleDrop}
                      onDragOver={e => e.preventDefault()}
                      className="relative border-2 border-dashed border-[#E2ECF4] rounded-2xl p-8 text-center hover:border-[#29ABE2]/50 transition-colors cursor-pointer group"
                      onClick={() => fileRef.current?.click()}
                    >
                      <div className="w-16 h-16 bg-[#EAF4FB] rounded-2xl flex items-center justify-center mx-auto mb-3 group-hover:bg-[#29ABE2]/10 transition-colors">
                        <Camera size={28} className="text-[#29ABE2]" />
                      </div>
                      <p className="text-sm font-bold text-[#0C1F2C] mb-1">Toma una foto o sube una imagen</p>
                      <p className="text-xs text-[#8BA5BE]">Arrastra aquí o haz click para seleccionar</p>

                      {/* Mobile camera + gallery buttons */}
                      <div className="flex gap-2 justify-center mt-4">
                        <button
                          onClick={e => { e.stopPropagation(); const i = document.createElement('input'); i.type='file'; i.accept='image/*'; i.capture='environment'; i.onchange=(ev)=>{ const f=(ev.target as HTMLInputElement).files?.[0]; if(f) handleFile(f) }; i.click() }}
                          className="flex items-center gap-1.5 text-xs font-bold text-white bg-[#29ABE2] px-3 py-2 rounded-xl hover:bg-[#1a8fc2] transition"
                        >
                          <Camera size={13} /> Cámara
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); fileRef.current?.click() }}
                          className="flex items-center gap-1.5 text-xs font-bold text-[#29ABE2] border border-[#29ABE2]/40 px-3 py-2 rounded-xl hover:bg-[#EAF4FB] transition"
                        >
                          <Upload size={13} /> Galería
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="relative rounded-2xl overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={image} alt="Food photo" className="w-full max-h-64 object-cover rounded-2xl" />
                      <button
                        onClick={reset}
                        className="absolute top-2 right-2 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70 transition"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}

                  {/* Hidden file input */}
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleInputChange}
                  />

                  {/* Analyze button */}
                  {image && !result && (
                    <button
                      onClick={analyze}
                      disabled={scanning}
                      className="w-full py-3.5 bg-gradient-to-r from-[#29ABE2] to-[#1a6fa0] text-white font-bold rounded-xl hover:opacity-90 disabled:opacity-60 transition flex items-center justify-center gap-2.5"
                    >
                      {scanning ? (
                        <><Loader2 size={16} className="animate-spin" /> Analizando con IA...</>
                      ) : (
                        <><Zap size={16} /> Estimar calorías</>
                      )}
                    </button>
                  )}

                  {/* Error */}
                  {error && (
                    <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl px-4 py-3">
                      <AlertCircle size={14} className="flex-shrink-0" />
                      {error}
                    </div>
                  )}

                  {/* Results */}
                  {result && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                      {/* Confidence + notes */}
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-[#0C1F2C]">Resultado del análisis</p>
                        <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', CONFIDENCE_COLOR[result.confianza])}>
                          Confianza {CONFIDENCE_LABEL[result.confianza]}
                        </span>
                      </div>

                      {/* Food list */}
                      {result.alimentos.length > 0 ? (
                        <div className="space-y-2">
                          {result.alimentos.map((food, i) => (
                            <div key={i} className="bg-[#F8FBFD] border border-[#E2ECF4] rounded-xl px-4 py-3">
                              <div className="flex items-start justify-between mb-1.5">
                                <div>
                                  <p className="text-sm font-bold text-[#0C1F2C]">{food.nombre}</p>
                                  <p className="text-[10px] text-[#8BA5BE]">{food.porcion}</p>
                                </div>
                                <span className="text-sm font-black text-[#29ABE2]">{food.kcal} kcal</span>
                              </div>
                              <div className="grid grid-cols-3 gap-2">
                                {[
                                  { label: 'Proteína', value: food.proteina, color: 'text-blue-600' },
                                  { label: 'Carbos', value: food.carbohidratos, color: 'text-amber-600' },
                                  { label: 'Grasa', value: food.grasa, color: 'text-rose-500' },
                                ].map(m => (
                                  <div key={m.label} className="text-center">
                                    <p className={cn('text-xs font-bold', m.color)}>{m.value}g</p>
                                    <p className="text-[9px] text-[#8BA5BE]">{m.label}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-sm text-[#8BA5BE]">No se detectaron alimentos en la imagen.</div>
                      )}

                      {/* Totals */}
                      {result.alimentos.length > 0 && (
                        <div className="bg-gradient-to-r from-[#0C1F2C] to-[#0C3547] rounded-xl px-4 py-3">
                          <p className="text-[10px] font-bold text-[#4A7A94] uppercase tracking-widest mb-2">Total estimado</p>
                          <div className="flex items-center justify-between">
                            <span className="text-2xl font-black text-white">{result.total.kcal} <span className="text-sm font-medium text-[#4A7A94]">kcal</span></span>
                            <div className="flex gap-4 text-center">
                              {[
                                { label: 'P', value: result.total.proteina, color: 'text-blue-400' },
                                { label: 'C', value: result.total.carbohidratos, color: 'text-amber-400' },
                                { label: 'G', value: result.total.grasa, color: 'text-rose-400' },
                              ].map(m => (
                                <div key={m.label}>
                                  <p className={cn('text-sm font-black', m.color)}>{m.value}g</p>
                                  <p className="text-[9px] text-[#4A7A94]">{m.label}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                          {result.notas && (
                            <p className="text-[10px] text-[#4A7A94] mt-2 border-t border-white/10 pt-2">{result.notas}</p>
                          )}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={reset}
                          className="flex items-center gap-1.5 text-xs font-bold text-[#8BA5BE] border border-[#E2ECF4] px-4 py-2.5 rounded-xl hover:bg-[#F0F6FA] transition flex-shrink-0"
                        >
                          <RefreshCw size={12} /> Nueva foto
                        </button>

                        {result.alimentos.length > 0 && (
                          <button
                            onClick={addToLog}
                            disabled={logging || logged}
                            className={cn(
                              'flex-1 flex items-center justify-center gap-1.5 text-xs font-bold py-2.5 rounded-xl transition',
                              logged
                                ? 'bg-green-50 text-green-600 border border-green-200'
                                : 'bg-[#29ABE2] text-white hover:bg-[#1a8fc2] disabled:opacity-60'
                            )}
                          >
                            {logging ? (
                              <><Loader2 size={12} className="animate-spin" /> Guardando...</>
                            ) : logged ? (
                              <><CheckCircle size={12} /> Agregado al registro</>
                            ) : (
                              <>+ Agregar al registro de hoy</>
                            )}
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
