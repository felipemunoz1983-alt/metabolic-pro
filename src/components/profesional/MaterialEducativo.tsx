'use client'

/**
 * MaterialEducativo — biblioteca del profesional para subir PDFs, imagenes,
 * videos cortos y links externos que comparte con sus pacientes
 * (feedback Maria Jose Serrano, Sprint 3-E).
 *
 * UX:
 *  - Tabs: "Para todos mis pacientes" vs "Solo para este paciente"
 *  - Form de upload (titulo + descripcion + tipo + file/url)
 *  - Lista de materiales del pro (en el tab correspondiente)
 *  - Acciones por item: ver/descargar, eliminar
 *
 * Upload flow:
 *  - tipo='link'    -> solo registra URL externa via POST /api/educacion
 *  - otros tipos    -> sube blob al bucket via supabase client (RLS),
 *                       despues registra metadata via POST /api/educacion
 */

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Loader2, Upload, FileText, Image as ImageIcon, Video, Link2, Trash2, Download, ExternalLink, Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  professionalId: string
  /** Si esta dentro de PatientDetail, el id del paciente — habilita el modo "asignar a este paciente". */
  patientId?: string
  patientName?: string
}

interface Material {
  id: string
  profesional_id: string
  paciente_id: string | null
  titulo: string
  descripcion: string | null
  tipo: 'pdf' | 'imagen' | 'video' | 'link'
  url_o_path: string
  mime_type: string | null
  size_bytes: number | null
  created_at: string
}

const TIPOS = [
  { key: 'pdf' as const,    label: 'PDF',         emoji: '📄', icon: FileText,  accept: 'application/pdf',                                  hint: 'Recetario, guia, info nutricional…' },
  { key: 'imagen' as const, label: 'Imagen',      emoji: '🖼️', icon: ImageIcon, accept: 'image/jpeg,image/png,image/webp,image/heic',       hint: 'Infografia, tabla, foto educativa' },
  { key: 'video' as const,  label: 'Video corto', emoji: '🎬', icon: Video,     accept: 'video/mp4,video/quicktime,video/webm',             hint: 'Reel educativo ≤1 min recomendado, max 50MB' },
  { key: 'link' as const,   label: 'Link',        emoji: '🔗', icon: Link2,     accept: '',                                                  hint: 'YouTube, blog, Drive — no usa storage' },
]

export function MaterialEducativo({ professionalId, patientId, patientName }: Props) {
  const supabase = createClient()
  const [materiales, setMateriales] = useState<Material[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)

  // Tab: ver biblioteca general o solo material asignado a este paciente
  type Tab = 'general' | 'paciente'
  const [tab, setTab] = useState<Tab>(patientId ? 'general' : 'general')

  // Form state
  const [showForm, setShowForm]       = useState(false)
  const [formTipo, setFormTipo]       = useState<Material['tipo']>('pdf')
  const [formTitulo, setFormTitulo]   = useState('')
  const [formDesc, setFormDesc]       = useState('')
  const [formFile, setFormFile]       = useState<File | null>(null)
  const [formLink, setFormLink]       = useState('')
  const [uploading, setUploading]     = useState(false)
  const [uploadErr, setUploadErr]     = useState<string | null>(null)

  // ── Carga lista (initial + bump-driven recargas) ──────────────────────────
  // refreshTick: incrementarlo dispara una nueva carga (despues de upload/delete)
  const [refreshTick, setRefreshTick] = useState(0)
  useEffect(() => {
    let cancel = false
    ;(async () => {
      try {
        const res = await fetch(`/api/educacion?profId=${professionalId}`)
        const d = await res.json()
        if (cancel) return
        if (!res.ok) throw new Error(d.error ?? `HTTP ${res.status}`)
        setMateriales(d.materiales as Material[])
        setError(null)
      } catch (err) {
        if (cancel) return
        console.error('[material-edu]', err)
        setError('No se pudo cargar tu biblioteca.')
      } finally {
        if (!cancel) setLoading(false)
      }
    })()
    return () => { cancel = true }
  }, [professionalId, refreshTick])
  function recargar() { setRefreshTick(t => t + 1) }

  // ── Upload ────────────────────────────────────────────────────────────────
  async function subir() {
    setUploadErr(null)
    if (!formTitulo.trim()) {
      setUploadErr('Ponele un titulo al material.')
      return
    }
    if (formTipo === 'link') {
      if (!formLink.trim()) { setUploadErr('Pegale una URL.'); return }
      try { new URL(formLink) } catch { setUploadErr('URL invalida.'); return }
    } else {
      if (!formFile) { setUploadErr('Selecciona un archivo.'); return }
      // Validar tamano: max 50MB
      if (formFile.size > 52_428_800) { setUploadErr('El archivo supera 50MB.'); return }
    }

    setUploading(true)
    try {
      let urlOPath = ''
      let mime: string | null = null
      let size: number | null = null

      if (formTipo === 'link') {
        urlOPath = formLink.trim()
      } else {
        // Subir al bucket privado: path = "<prof_uuid>/<timestamp>-<nombre>"
        const safe = formFile!.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80)
        const path = `${professionalId}/${Date.now()}-${safe}`
        const { error: upErr } = await supabase.storage
          .from('materiales-educativos')
          .upload(path, formFile!, { contentType: formFile!.type, upsert: false })
        if (upErr) throw new Error(`Upload falló: ${upErr.message}`)
        urlOPath = path
        mime     = formFile!.type
        size     = formFile!.size
      }

      // Registrar metadata
      const res = await fetch('/api/educacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profesionalId: professionalId,
          pacienteId: tab === 'paciente' ? patientId : null,
          titulo:      formTitulo.trim(),
          descripcion: formDesc.trim() || null,
          tipo:        formTipo,
          url_o_path:  urlOPath,
          mime_type:   mime,
          size_bytes:  size,
        }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error ?? `HTTP ${res.status}`)

      // Reset + reload
      setFormTitulo(''); setFormDesc(''); setFormFile(null); setFormLink('')
      setShowForm(false)
      recargar()
    } catch (err) {
      console.error('[material-edu upload]', err)
      setUploadErr(err instanceof Error ? err.message : 'Error desconocido al subir.')
    } finally {
      setUploading(false)
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  async function eliminar(id: string) {
    if (!confirm('Eliminar este material? Tus pacientes ya no lo van a ver.')) return
    try {
      const res = await fetch(`/api/educacion?id=${id}&profId=${professionalId}`, { method: 'DELETE' })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error ?? `HTTP ${res.status}`)
      setMateriales(ms => ms.filter(m => m.id !== id))
    } catch (err) {
      console.error('[material-edu delete]', err)
      alert('No se pudo eliminar. Reintenta.')
    }
  }

  // ── Open / download (signed URL para archivos privados) ────────────────────
  async function abrir(m: Material) {
    if (m.tipo === 'link') {
      window.open(m.url_o_path, '_blank', 'noopener,noreferrer')
      return
    }
    try {
      const { data, error } = await supabase.storage
        .from('materiales-educativos')
        .createSignedUrl(m.url_o_path, 300)  // 5 min de validez
      if (error || !data) throw error ?? new Error('Sin URL')
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
    } catch (err) {
      console.error('[material-edu open]', err)
      alert('No se pudo abrir el archivo.')
    }
  }

  // ── Filtrado por tab ───────────────────────────────────────────────────────
  const visibles = materiales.filter(m =>
    tab === 'general'
      ? m.paciente_id === null
      : m.paciente_id === patientId,
  )

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-baseline justify-between gap-2 flex-wrap">
        <div>
          <h3 className="text-lg font-black text-[#0C1F2C]">Material educativo</h3>
          <p className="text-[11px] text-[#6B7C93] mt-0.5">
            PDFs, imagenes, videos cortos o links que compartis con tus pacientes.
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-[#0C3547] text-white text-sm font-bold px-4 py-2 rounded-xl hover:opacity-90 transition"
          >
            <Plus size={14} /> Subir material
          </button>
        )}
      </div>

      {/* Tabs general / paciente */}
      {patientId && (
        <div className="flex gap-1 bg-[#F0F6FA] p-1 rounded-xl border border-[#E2ECF4] text-xs">
          {(['general', 'paciente'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'flex-1 py-2 px-3 rounded-lg font-bold transition',
                tab === t ? 'bg-[#29ABE2] text-white shadow' : 'text-[#6B7C93] hover:text-[#0C1F2C]',
              )}
            >
              {t === 'general' ? '📚 Para todos' : `👤 Solo ${patientName ?? 'este paciente'}`}
            </button>
          ))}
        </div>
      )}

      {/* Form de upload */}
      {showForm && (
        <div className="bg-white border-2 border-[#29ABE2] rounded-2xl p-4 space-y-3">
          <div className="flex items-baseline justify-between">
            <p className="text-sm font-black text-[#0C3547]">Nuevo material</p>
            <button onClick={() => { setShowForm(false); setUploadErr(null) }} className="text-[#8BA5BE] hover:text-[#0C3547]">
              <X size={16} />
            </button>
          </div>

          {/* Selector de tipo */}
          <div className="grid grid-cols-4 gap-2">
            {TIPOS.map(t => {
              const Icon = t.icon
              const sel  = formTipo === t.key
              return (
                <button
                  key={t.key}
                  onClick={() => { setFormTipo(t.key); setFormFile(null); setFormLink(''); setUploadErr(null) }}
                  className={cn(
                    'flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition',
                    sel ? 'border-[#29ABE2] bg-[#EAF4FB] text-[#0C3547]' : 'border-[#E2ECF4] bg-white text-[#6B7C93] hover:border-[#29ABE2]/40',
                  )}
                >
                  <Icon size={20} />
                  <span className="text-[11px] font-bold">{t.label}</span>
                </button>
              )
            })}
          </div>

          {/* Titulo */}
          <div>
            <label className="text-[10px] uppercase tracking-wider text-[#6B7C93] font-bold block mb-1">Titulo</label>
            <input
              type="text"
              value={formTitulo}
              onChange={e => setFormTitulo(e.target.value)}
              maxLength={200}
              placeholder="Ej: Recetario bajo en FODMAP semana 1"
              className="w-full px-3 py-2 border border-[#D6E3ED] rounded-lg text-sm focus:outline-none focus:border-[#29ABE2]"
            />
          </div>

          {/* Descripcion */}
          <div>
            <label className="text-[10px] uppercase tracking-wider text-[#6B7C93] font-bold block mb-1">Descripcion (opcional)</label>
            <textarea
              value={formDesc}
              onChange={e => setFormDesc(e.target.value)}
              rows={2}
              placeholder="Notas o instrucciones para el paciente"
              className="w-full px-3 py-2 border border-[#D6E3ED] rounded-lg text-sm focus:outline-none focus:border-[#29ABE2] resize-none"
            />
          </div>

          {/* File picker o URL */}
          {formTipo === 'link' ? (
            <div>
              <label className="text-[10px] uppercase tracking-wider text-[#6B7C93] font-bold block mb-1">URL</label>
              <input
                type="url"
                value={formLink}
                onChange={e => setFormLink(e.target.value)}
                placeholder="https://youtube.com/… o https://drive.google.com/…"
                className="w-full px-3 py-2 border border-[#D6E3ED] rounded-lg text-sm focus:outline-none focus:border-[#29ABE2]"
              />
            </div>
          ) : (
            <div>
              <label className="text-[10px] uppercase tracking-wider text-[#6B7C93] font-bold block mb-1">Archivo</label>
              <input
                type="file"
                accept={TIPOS.find(t => t.key === formTipo)?.accept}
                onChange={e => setFormFile(e.target.files?.[0] ?? null)}
                className="w-full text-xs text-[#6B7C93] file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-[#EAF4FB] file:text-[#0C3547] hover:file:bg-[#D6E3ED]"
              />
              <p className="text-[10px] text-[#8BA5BE] italic mt-1">
                {TIPOS.find(t => t.key === formTipo)?.hint}
              </p>
            </div>
          )}

          {/* Asignacion */}
          {patientId && (
            <p className="text-[10px] text-[#6B7C93] bg-[#F8FBFD] rounded-lg p-2 border border-[#E2ECF4]">
              Este material se va a asignar a: <strong className="text-[#0C3547]">
                {tab === 'general' ? `todos tus pacientes` : `solo ${patientName ?? 'este paciente'}`}
              </strong>. Cambia la pestaña de arriba si querés lo contrario.
            </p>
          )}

          {uploadErr && (
            <p className="text-[11px] text-rose-700 font-semibold">⚠ {uploadErr}</p>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={subir}
              disabled={uploading}
              className="flex items-center gap-2 bg-[#29ABE2] text-white text-sm font-bold px-4 py-2 rounded-xl hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? <><Loader2 className="animate-spin" size={14} /> Subiendo...</> : <><Upload size={14} /> Guardar</>}
            </button>
            <button
              onClick={() => { setShowForm(false); setUploadErr(null) }}
              disabled={uploading}
              className="text-xs font-bold text-[#6B7C93] hover:text-[#0C3547] px-3 py-2 disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-[#6B7C93] text-sm">
          <Loader2 className="animate-spin mr-2" size={16} /> Cargando biblioteca...
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-sm text-rose-800">{error}</div>
      ) : visibles.length === 0 ? (
        <div className="bg-[#F8FBFD] border border-[#E2ECF4] rounded-xl p-8 text-center">
          <p className="text-sm text-[#6B7C93] font-bold mb-1">Sin materiales aún</p>
          <p className="text-[11px] text-[#8BA5BE]">
            Tocá <strong>&quot;Subir material&quot;</strong> arriba para sumar tu primer PDF, infografía o link.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {visibles.map(m => <MaterialRow key={m.id} m={m} onOpen={abrir} onDelete={() => eliminar(m.id)} />)}
        </div>
      )}
    </div>
  )
}

// ─── Card de un material ───────────────────────────────────────────────────
function MaterialRow({ m, onOpen, onDelete }: { m: Material; onOpen: (m: Material) => void; onDelete: () => void }) {
  const t = TIPOS.find(x => x.key === m.tipo)!
  const Icon = t.icon
  const sizeKb = m.size_bytes ? (m.size_bytes / 1024).toFixed(0) : null
  const sizeStr = sizeKb && +sizeKb > 1024 ? `${(+sizeKb / 1024).toFixed(1)} MB` : sizeKb ? `${sizeKb} KB` : ''
  return (
    <div className="bg-white border border-[#E2ECF4] rounded-xl p-3 flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg bg-[#EAF4FB] flex items-center justify-center flex-shrink-0">
        <Icon size={18} className="text-[#29ABE2]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-[#0C1F2C] truncate">{m.titulo}</p>
        {m.descripcion && (
          <p className="text-[11px] text-[#6B7C93] truncate">{m.descripcion}</p>
        )}
        <p className="text-[10px] text-[#8BA5BE] mt-0.5">
          {t.label}
          {sizeStr && ` · ${sizeStr}`}
          {' · '}{new Date(m.created_at).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })}
          {m.paciente_id && <span className="text-violet-700 font-bold"> · solo este paciente</span>}
        </p>
      </div>
      <button
        onClick={() => onOpen(m)}
        className="p-2 rounded-lg text-[#29ABE2] hover:bg-[#EAF4FB] transition"
        title={m.tipo === 'link' ? 'Abrir link' : 'Ver / descargar'}
      >
        {m.tipo === 'link' ? <ExternalLink size={16} /> : <Download size={16} />}
      </button>
      <button
        onClick={onDelete}
        className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition"
        title="Eliminar"
      >
        <Trash2 size={16} />
      </button>
    </div>
  )
}
