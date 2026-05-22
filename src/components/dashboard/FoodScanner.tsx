'use client'

import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, X, Loader2, CheckCircle, AlertCircle, RefreshCw, Zap, Upload } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase'
import { getTodayCL } from '@/lib/date-cl'

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
const CONFIDENCE_COLOR  = { alta: 'text-green-600 bg-green-50', media: 'text-amber-600 bg-amber-50', baja: 'text-red-500 bg-red-50' }

const MAX_DIM     = 480   // tamaño máximo del lado mayor en píxeles
const JPEG_QUALITY = 0.7

/**
 * Comprime un File a JPEG base64 pequeño usando createImageBitmap con resize.
 * Mucho más eficiente en memoria que <img> + canvas: decodifica + redimensiona
 * en una sola operación, sin mantener la imagen full-res en RAM.
 * Fallback a <img> + canvas si createImageBitmap no soporta resize options.
 */
async function compressFile(file: File): Promise<string> {
  // Calcular dimensiones objetivo manteniendo aspect ratio
  let targetW = MAX_DIM
  let targetH = MAX_DIM

  try {
    // Path eficiente: createImageBitmap con resize durante decode
    // (chrome >= 54, firefox >= 70, safari >= 15)
    const bitmap = await createImageBitmap(file, {
      resizeWidth: MAX_DIM,
      resizeHeight: MAX_DIM,
      resizeQuality: 'medium',
    })
    // Ajustar a aspect ratio real (el bitmap se redimensionó manteniendo proporciones internamente)
    const ratio = bitmap.width / bitmap.height
    if (ratio > 1) { targetW = MAX_DIM; targetH = Math.round(MAX_DIM / ratio) }
    else            { targetH = MAX_DIM; targetW = Math.round(MAX_DIM * ratio) }

    const canvas = document.createElement('canvas')
    canvas.width  = targetW
    canvas.height = targetH
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(bitmap, 0, 0, targetW, targetH)
    bitmap.close()  // libera memoria del bitmap inmediatamente

    return canvas.toDataURL('image/jpeg', JPEG_QUALITY)
  } catch {
    // Fallback: el path tradicional con <img>. Más memoria pero compatible.
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file)
      const img = new Image()
      img.onload = () => {
        URL.revokeObjectURL(url)
        let w = img.width
        let h = img.height
        if (w > MAX_DIM || h > MAX_DIM) {
          if (w >= h) { h = Math.round((h / w) * MAX_DIM); w = MAX_DIM }
          else        { w = Math.round((w / h) * MAX_DIM); h = MAX_DIM }
        }
        const canvas = document.createElement('canvas')
        canvas.width = w; canvas.height = h
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', JPEG_QUALITY))
      }
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Error al leer imagen')) }
      img.src = url
    })
  }
}

export function FoodScanner({ userId, onLogAdded }: Props) {
  const [open,     setOpen]     = useState(false)
  const [image,    setImage]    = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [result,   setResult]   = useState<ScanResult | null>(null)
  const [error,    setError]    = useState('')
  const [logging,  setLogging]  = useState(false)
  const [logged,   setLogged]   = useState(false)

  // Dos inputs separados: uno con capture=environment (cámara), otro sin (galería)
  const cameraRef  = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)

  // ── Procesar archivo seleccionado (cámara o galería) ───────────────────────
  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) return
    setError(''); setResult(null); setLogged(false); setProcessing(true)
    try {
      const compressed = await compressFile(file)
      setImage(compressed)
    } catch {
      setError('No se pudo procesar la imagen. Intenta con otra foto.')
    } finally {
      setProcessing(false)
    }
  }, [])

  const reset = useCallback(() => {
    setImage(null); setResult(null)
    setError(''); setLogged(false)
    if (cameraRef.current)  cameraRef.current.value  = ''
    if (galleryRef.current) galleryRef.current.value = ''
  }, [])

  const handleClose = () => {
    setOpen(false)
    setTimeout(reset, 300)
  }

  // ── Analizar imagen con IA ──────────────────────────────────────────────────
  async function analyze() {
    if (!image) return
    setScanning(true); setError(''); setResult(null)
    try {
      // Verificar tamaño antes de enviar — evita 413 de Vercel
      if (image.length * 0.75 > 3_500_000) {
        throw new Error('La imagen es muy grande. Vuelve a tomar la foto más cerca del alimento.')
      }

      // Obtener token de sesión: refrescar si está vencida
      const supabase = createClient()
      let { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        const { data } = await supabase.auth.refreshSession()
        session = data.session
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Client-Version': 'v4',  // útil para diagnosticar versión cliente desde server
      }
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`

      const res = await fetch('/api/food-scan', {
        method:      'POST',
        headers,
        body:        JSON.stringify({ image }),
        credentials: 'include',  // garantiza que cookies viajen incluso en PWA standalone
      })

      // Parsear JSON de forma segura
      let data: Record<string, unknown>
      try {
        data = await res.json()
      } catch {
        const text = await res.text().catch(() => '')
        if (res.status === 413 || text.toLowerCase().includes('entity too large')) {
          throw new Error('La imagen es muy grande. Intenta retomar la foto.')
        }
        throw new Error(`Error del servidor (${res.status}). Intenta de nuevo.`)
      }

      if (!res.ok) throw new Error((data.error as string) ?? 'Error al analizar')
      setResult(data as unknown as ScanResult)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo analizar la imagen')
    } finally {
      setScanning(false)
    }
  }

  // ── Guardar en registro diario ──────────────────────────────────────────────
  async function addToLog() {
    if (!result || !userId) return
    setLogging(true); setError('')
    try {
      const supabase = createClient()
      const today    = getTodayCL()
      const { data: existing } = await supabase
        .from('registros_diarios')
        .select('id, scan_kcal, scan_proteina, scan_carbohidrato, scan_grasa')
        .eq('user_id', userId).eq('fecha', today).maybeSingle()

      if (existing) {
        const { error: e } = await supabase.from('registros_diarios').update({
          scan_kcal:         (existing.scan_kcal         ?? 0) + result.total.kcal,
          scan_proteina:     (existing.scan_proteina     ?? 0) + result.total.proteina,
          scan_carbohidrato: (existing.scan_carbohidrato ?? 0) + result.total.carbohidratos,
          scan_grasa:        (existing.scan_grasa        ?? 0) + result.total.grasa,
        }).eq('id', existing.id)
        if (e) throw e
      } else {
        const { error: e } = await supabase.from('registros_diarios').upsert({
          user_id: userId, fecha: today,
          scan_kcal: result.total.kcal, scan_proteina: result.total.proteina,
          scan_carbohidrato: result.total.carbohidratos, scan_grasa: result.total.grasa,
          completed: 0, total: 5,
        }, { onConflict: 'user_id,fecha' })
        if (e) throw e
      }
      setLogged(true)
      onLogAdded?.()
    } catch (err) {
      console.error('[FoodScanner] addToLog error:', err)
      setError('No se pudo guardar el registro. Intenta de nuevo.')
    } finally {
      setLogging(false)
    }
  }

  return (
    <>
      {/* Botón flotante */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-40 w-14 h-14 bg-gradient-to-br from-[#29ABE2] to-[#1a6fa0] rounded-2xl shadow-lg shadow-[#29ABE2]/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
        title="Escanear alimento"
      >
        <Camera size={22} className="text-white" />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" onClick={handleClose} />

            <motion.div
              initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 60 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 md:inset-0 md:flex md:items-center md:justify-center z-50 pointer-events-none"
            >
              <div
                className="bg-white rounded-t-3xl md:rounded-2xl w-full md:max-w-lg max-h-[92vh] overflow-y-auto pointer-events-auto shadow-2xl"
                onClick={e => e.stopPropagation()}
              >
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-[#F0F6FA] px-5 pt-4 pb-3 rounded-t-3xl md:rounded-t-2xl z-10">
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

                  {/* ── Inputs ocultos: cámara nativa + galería ── */}
                  <input
                    ref={cameraRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
                  />
                  <input
                    ref={galleryRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
                  />

                  {/* ── Procesando imagen ── */}
                  {processing && (
                    <div className="flex items-center justify-center gap-2 py-8">
                      <Loader2 size={18} className="animate-spin text-[#29ABE2]" />
                      <p className="text-sm text-[#6B7C93]">Procesando imagen...</p>
                    </div>
                  )}

                  {/* ── SIN IMAGEN: menú de opciones ── */}
                  {!image && !processing && (
                    <div className="space-y-3">
                      <button
                        onClick={() => cameraRef.current?.click()}
                        className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-[#29ABE2]/30 hover:border-[#29ABE2] hover:bg-[#EAF4FB] transition-all text-left group"
                      >
                        <div className="w-12 h-12 bg-[#29ABE2]/10 rounded-xl flex items-center justify-center group-hover:bg-[#29ABE2]/20 transition flex-shrink-0">
                          <Camera size={22} className="text-[#29ABE2]" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-[#0C1F2C]">Tomar foto</p>
                          <p className="text-xs text-[#8BA5BE]">Abre la cámara para fotografiar el plato</p>
                        </div>
                      </button>

                      <button
                        onClick={() => galleryRef.current?.click()}
                        className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-[#E2ECF4] hover:border-[#29ABE2]/40 hover:bg-[#F8FBFD] transition-all text-left group"
                      >
                        <div className="w-12 h-12 bg-[#F0F6FA] rounded-xl flex items-center justify-center group-hover:bg-[#E2ECF4] transition flex-shrink-0">
                          <Upload size={22} className="text-[#6B7C93]" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-[#0C1F2C]">Subir desde galería</p>
                          <p className="text-xs text-[#8BA5BE]">Elige una foto existente del celular</p>
                        </div>
                      </button>
                    </div>
                  )}

                  {/* ── CON IMAGEN: preview + analizar ── */}
                  {image && !processing && (
                    <>
                      <div className="relative rounded-2xl overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={image} alt="Food photo" className="w-full max-h-64 object-cover rounded-2xl" />
                        <button onClick={reset}
                          className="absolute top-2 right-2 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70 transition">
                          <X size={14} />
                        </button>
                      </div>

                      {!result && (
                        <button onClick={analyze} disabled={scanning}
                          className="w-full py-3.5 bg-gradient-to-r from-[#29ABE2] to-[#1a6fa0] text-white font-bold rounded-xl hover:opacity-90 disabled:opacity-60 transition flex items-center justify-center gap-2.5">
                          {scanning
                            ? <><Loader2 size={16} className="animate-spin" /> Analizando con IA...</>
                            : <><Zap size={16} /> Estimar calorías</>}
                        </button>
                      )}
                    </>
                  )}

                  {/* Error */}
                  {error && (
                    <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl px-4 py-3">
                      <AlertCircle size={14} className="flex-shrink-0" />
                      {error}
                    </div>
                  )}

                  {/* ── Resultados ── */}
                  {result && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-[#0C1F2C]">Resultado del análisis</p>
                        <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', CONFIDENCE_COLOR[result.confianza])}>
                          Confianza {CONFIDENCE_LABEL[result.confianza]}
                        </span>
                      </div>

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
                                  { label: 'Proteína',  value: food.proteina,      color: 'text-blue-600'  },
                                  { label: 'Carbos',    value: food.carbohidratos, color: 'text-amber-600' },
                                  { label: 'Grasa',     value: food.grasa,         color: 'text-rose-500'  },
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

                      {result.alimentos.length > 0 && (
                        <div className="bg-gradient-to-r from-[#0C1F2C] to-[#0C3547] rounded-xl px-4 py-3">
                          <p className="text-[10px] font-bold text-[#4A7A94] uppercase tracking-widest mb-2">Total estimado</p>
                          <div className="flex items-center justify-between">
                            <span className="text-2xl font-black text-white">{result.total.kcal} <span className="text-sm font-medium text-[#4A7A94]">kcal</span></span>
                            <div className="flex gap-4 text-center">
                              {[
                                { label: 'P', value: result.total.proteina,      color: 'text-blue-400'  },
                                { label: 'C', value: result.total.carbohidratos, color: 'text-amber-400' },
                                { label: 'G', value: result.total.grasa,         color: 'text-rose-400'  },
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

                      <div className="flex gap-2 pt-1">
                        <button onClick={reset}
                          className="flex items-center gap-1.5 text-xs font-bold text-[#8BA5BE] border border-[#E2ECF4] px-4 py-2.5 rounded-xl hover:bg-[#F0F6FA] transition flex-shrink-0">
                          <RefreshCw size={12} /> Nueva foto
                        </button>
                        {result.alimentos.length > 0 && (
                          <button onClick={addToLog} disabled={logging || logged}
                            className={cn(
                              'flex-1 flex items-center justify-center gap-1.5 text-xs font-bold py-2.5 rounded-xl transition',
                              logged
                                ? 'bg-green-50 text-green-600 border border-green-200'
                                : 'bg-[#29ABE2] text-white hover:bg-[#1a8fc2] disabled:opacity-60'
                            )}>
                            {logging  ? <><Loader2 size={12} className="animate-spin" /> Guardando...</>
                             : logged ? <><CheckCircle size={12} /> Agregado al registro</>
                             :           <>+ Agregar al registro de hoy</>}
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
