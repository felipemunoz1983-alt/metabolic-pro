'use client'

/**
 * InformesProfesional — Sección de informes antropométricos para el profesional.
 *
 * Se monta dentro de PatientDetail. Muestra:
 *  - Lista de informes ya subidos del paciente (con tipo, fecha, acciones)
 *  - Botón para subir nuevo informe (modal con form)
 *  - Visor inline / descarga / borrar
 *
 * Backend: usa /api/informes/upload, /list, /[id]/url, DELETE /[id]
 */

import { useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText, Upload, Eye, Trash2, X, Loader2, AlertCircle,
  Calendar, Download, FileCheck2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  TIPO_INFORME_LABELS,
  MAX_FILE_SIZE_BYTES,
  type TipoInforme,
  type InformeAntropometrico,
} from '@/lib/informes-antropometricos'

interface Props {
  pacienteId: string
  pacienteNombre: string
}

function formatDateCL(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return ''
  const mb = bytes / 1024 / 1024
  return mb < 1 ? `${Math.round(bytes / 1024)} KB` : `${mb.toFixed(1)} MB`
}

export function InformesProfesional({ pacienteId, pacienteNombre }: Props) {
  const [informes, setInformes] = useState<InformeAntropometrico[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [showUpload, setShowUpload] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchInformes = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/informes/list?paciente_id=${pacienteId}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setInformes(data.informes ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [pacienteId])

  // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount + when paciente changes (legitimate)
  useEffect(() => { fetchInformes() }, [fetchInformes])

  async function handleView(id: string) {
    try {
      const res = await fetch(`/api/informes/${id}/url`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      window.open(data.url, '_blank', 'noopener,noreferrer')
    } catch (e) {
      alert(`No se pudo abrir el informe: ${e instanceof Error ? e.message : 'error'}`)
    }
  }

  async function handleDelete(id: string, titulo: string) {
    const confirmed = confirm(`¿Borrar definitivamente el informe "${titulo}"?\n\nEsta acción NO se puede deshacer. El paciente dejará de verlo.`)
    if (!confirmed) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/informes/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setInformes(prev => prev.filter(i => i.id !== id))
    } catch (e) {
      alert(`No se pudo borrar: ${e instanceof Error ? e.message : 'error'}`)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-[#E2ECF4] p-5 mt-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-[#EAF4FB] rounded-xl flex items-center justify-center">
            <FileText size={16} className="text-[#29ABE2]" />
          </div>
          <div>
            <p className="text-sm font-black text-[#0C1F2C]">Informes antropométricos</p>
            <p className="text-[10px] text-[#8BA5BE]">PDF de evaluaciones que ve el paciente en su app</p>
          </div>
        </div>
        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-1.5 bg-[#29ABE2] hover:bg-[#1a8fc2] text-white text-xs font-bold px-3 py-2 rounded-xl transition"
        >
          <Upload size={12} /> Subir
        </button>
      </div>

      {/* Estados */}
      {loading && (
        <div className="flex items-center justify-center py-6">
          <Loader2 size={20} className="animate-spin text-[#29ABE2]" />
        </div>
      )}

      {error && !loading && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl p-3">
          <AlertCircle size={14} className="flex-shrink-0" />
          {error}
          <button onClick={fetchInformes} className="ml-auto font-bold underline">Reintentar</button>
        </div>
      )}

      {!loading && !error && informes.length === 0 && (
        <div className="text-center py-6">
          <FileText size={28} className="text-[#B0C4D4] mx-auto mb-2" />
          <p className="text-xs text-[#8BA5BE]">Sin informes subidos aún</p>
          <p className="text-[10px] text-[#B0C4D4] mt-0.5">
            Sube un PDF (InBody, ISAK, DEXA…) y el paciente lo verá en su tab &ldquo;Evaluaciones&rdquo;
          </p>
        </div>
      )}

      {!loading && !error && informes.length > 0 && (
        <div className="space-y-2">
          {informes.map(inf => {
            const tipoInfo = TIPO_INFORME_LABELS[inf.tipo as TipoInforme] ?? TIPO_INFORME_LABELS.otro
            const isUnread = !inf.visto_por_paciente_en
            return (
              <div
                key={inf.id}
                className="flex items-center gap-3 border border-[#F0F6FA] rounded-xl p-3 hover:border-[#29ABE2]/40 transition"
              >
                <div className="w-9 h-9 bg-[#F0F6FA] rounded-lg flex items-center justify-center text-lg flex-shrink-0">
                  {tipoInfo.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-xs font-bold text-[#0C1F2C] truncate">{inf.titulo}</p>
                    {isUnread && (
                      <span className="text-[9px] font-black bg-[#29ABE2] text-white px-1.5 py-0.5 rounded-full">
                        sin abrir
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-[#8BA5BE] mt-0.5 flex items-center gap-2 flex-wrap">
                    <span className="flex items-center gap-1"><Calendar size={9} />{formatDateCL(inf.fecha_eval)}</span>
                    <span>· {tipoInfo.label}</span>
                    {inf.file_size_bytes && <span>· {formatBytes(inf.file_size_bytes)}</span>}
                  </p>
                  {inf.notas && (
                    <p className="text-[10px] text-[#4A6070] mt-1 italic line-clamp-2">&ldquo;{inf.notas}&rdquo;</p>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => handleView(inf.id)}
                    className="w-8 h-8 rounded-lg bg-[#F0F6FA] hover:bg-[#29ABE2] hover:text-white text-[#29ABE2] transition flex items-center justify-center"
                    title="Ver PDF"
                  >
                    <Eye size={13} />
                  </button>
                  <button
                    onClick={() => handleDelete(inf.id, inf.titulo)}
                    disabled={deletingId === inf.id}
                    className="w-8 h-8 rounded-lg bg-[#F0F6FA] hover:bg-red-500 hover:text-white text-red-500 transition flex items-center justify-center disabled:opacity-50"
                    title="Borrar"
                  >
                    {deletingId === inf.id
                      ? <Loader2 size={12} className="animate-spin" />
                      : <Trash2 size={13} />}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal de upload */}
      <AnimatePresence>
        {showUpload && (
          <UploadModal
            pacienteId={pacienteId}
            pacienteNombre={pacienteNombre}
            onClose={() => setShowUpload(false)}
            onSuccess={() => {
              setShowUpload(false)
              fetchInformes()
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Modal de upload ──────────────────────────────────────────────────────────

function UploadModal({
  pacienteId,
  pacienteNombre,
  onClose,
  onSuccess,
}: {
  pacienteId: string
  pacienteNombre: string
  onClose: () => void
  onSuccess: () => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [titulo, setTitulo] = useState('')
  const [fechaEval, setFechaEval] = useState(() => new Date().toISOString().split('T')[0])
  const [tipo, setTipo] = useState<TipoInforme>('inbody')
  const [notas, setNotas] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)

  /**
   * Centraliza la validación del File (PDF + tamaño). Lo usamos tanto
   * para click (input change) como para drag-and-drop.
   */
  function acceptFile(f: File | null | undefined) {
    setError(null)
    if (!f) { setFile(null); return }
    if (f.type !== 'application/pdf') {
      setError('Solo archivos PDF')
      return
    }
    if (f.size > MAX_FILE_SIZE_BYTES) {
      setError(`Archivo muy grande (max ${MAX_FILE_SIZE_BYTES / 1024 / 1024} MB)`)
      return
    }
    setFile(f)
    // Auto-sugerir título si está vacío
    if (!titulo) {
      const baseName = f.name.replace(/\.pdf$/i, '').replace(/[-_]/g, ' ')
      setTitulo(baseName.slice(0, 80))
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    acceptFile(e.target.files?.[0])
  }

  // ── Drag-and-drop handlers ───────────────────────────────────────────────
  function handleDragOver(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault()
    e.stopPropagation()
    if (!dragActive) setDragActive(true)
  }
  function handleDragLeave(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
  }
  function handleDrop(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    const dropped = e.dataTransfer.files?.[0]
    if (dropped) acceptFile(dropped)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) { setError('Selecciona un PDF'); return }
    if (!titulo.trim()) { setError('El título es obligatorio'); return }

    setUploading(true)
    setError(null)
    try {
      const form = new FormData()
      form.append('file',        file)
      form.append('paciente_id', pacienteId)
      form.append('titulo',      titulo.trim())
      form.append('fecha_eval',  fechaEval)
      form.append('tipo',        tipo)
      if (notas.trim()) form.append('notas', notas.trim())

      const res = await fetch('/api/informes/upload', { method: 'POST', body: form })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)

      onSuccess()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al subir')
    } finally {
      setUploading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#E2ECF4]">
            <div>
              <p className="text-sm font-black text-[#0C1F2C]">Subir informe antropométrico</p>
              <p className="text-[10px] text-[#8BA5BE]">Paciente: {pacienteNombre}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-[#F0F6FA] flex items-center justify-center text-[#8BA5BE]"
            >
              <X size={16} />
            </button>
          </div>

          <div className="p-5 space-y-4">
            {/* File picker */}
            <div>
              <label className="text-[10px] font-black text-[#8BA5BE] uppercase tracking-wide mb-1.5 block">
                Archivo PDF *
              </label>
              {!file ? (
                <label
                  onDragOver={handleDragOver}
                  onDragEnter={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={cn(
                    'flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed rounded-xl cursor-pointer transition',
                    dragActive
                      ? 'border-[#29ABE2] bg-[#EAF4FB]'
                      : 'border-[#E2ECF4] hover:border-[#29ABE2]',
                  )}
                >
                  <Upload size={24} className={dragActive ? 'text-[#29ABE2]' : 'text-[#8BA5BE]'} />
                  <p className="text-xs text-[#4A6070] font-bold">
                    {dragActive ? 'Suelta el archivo aquí' : 'Haz click o arrastra el PDF'}
                  </p>
                  <p className="text-[10px] text-[#8BA5BE]">Max {MAX_FILE_SIZE_BYTES / 1024 / 1024} MB</p>
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              ) : (
                <div className="flex items-center gap-3 p-3 bg-[#F0F8FE] border border-[#C6E4F4] rounded-xl">
                  <FileCheck2 size={18} className="text-[#29ABE2] flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-[#0C1F2C] truncate">{file.name}</p>
                    <p className="text-[10px] text-[#8BA5BE]">{formatBytes(file.size)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFile(null)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
            </div>

            {/* Título */}
            <div>
              <label className="text-[10px] font-black text-[#8BA5BE] uppercase tracking-wide mb-1.5 block">
                Título *
              </label>
              <input
                type="text"
                value={titulo}
                onChange={e => setTitulo(e.target.value)}
                placeholder="Ej: Evaluación inicial Mayo 2026"
                maxLength={120}
                className="w-full px-3 py-2 text-sm bg-[#F0F6FA] border border-transparent focus:border-[#29ABE2] focus:bg-white rounded-xl outline-none transition"
              />
            </div>

            {/* Fecha + Tipo */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-black text-[#8BA5BE] uppercase tracking-wide mb-1.5 block">
                  Fecha *
                </label>
                <input
                  type="date"
                  value={fechaEval}
                  onChange={e => setFechaEval(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 text-sm bg-[#F0F6FA] border border-transparent focus:border-[#29ABE2] focus:bg-white rounded-xl outline-none transition"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-[#8BA5BE] uppercase tracking-wide mb-1.5 block">
                  Tipo *
                </label>
                <select
                  value={tipo}
                  onChange={e => setTipo(e.target.value as TipoInforme)}
                  className="w-full px-3 py-2 text-sm bg-[#F0F6FA] border border-transparent focus:border-[#29ABE2] focus:bg-white rounded-xl outline-none transition cursor-pointer"
                >
                  {(Object.entries(TIPO_INFORME_LABELS) as [TipoInforme, typeof TIPO_INFORME_LABELS[TipoInforme]][]).map(([k, info]) => (
                    <option key={k} value={k}>{info.emoji} {info.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Notas */}
            <div>
              <label className="text-[10px] font-black text-[#8BA5BE] uppercase tracking-wide mb-1.5 block">
                Nota para el paciente (opcional)
              </label>
              <textarea
                value={notas}
                onChange={e => setNotas(e.target.value)}
                placeholder="Ej: Excelente progreso en masa muscular este mes. Sigamos con el plan actual."
                maxLength={500}
                rows={3}
                className="w-full px-3 py-2 text-sm bg-[#F0F6FA] border border-transparent focus:border-[#29ABE2] focus:bg-white rounded-xl outline-none transition resize-none"
              />
              <p className="text-[9px] text-[#B0C4D4] mt-1 text-right">{notas.length}/500</p>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl p-3">
                <AlertCircle size={14} className="flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center gap-2 px-5 py-4 border-t border-[#E2ECF4]">
            <button
              type="button"
              onClick={onClose}
              disabled={uploading}
              className="flex-1 py-2.5 text-sm font-bold text-[#8BA5BE] hover:text-[#0C1F2C] rounded-xl transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={uploading || !file || !titulo.trim()}
              className={cn(
                'flex-1 py-2.5 text-sm font-black rounded-xl flex items-center justify-center gap-2 transition',
                'bg-[#29ABE2] hover:bg-[#1a8fc2] text-white',
                'disabled:bg-[#E2ECF4] disabled:text-[#8BA5BE] disabled:cursor-not-allowed',
              )}
            >
              {uploading
                ? <><Loader2 size={14} className="animate-spin" /> Subiendo...</>
                : <><Download size={14} className="rotate-180" /> Subir informe</>}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}
