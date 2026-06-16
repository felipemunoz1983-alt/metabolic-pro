'use client'

/**
 * MaterialPaciente — vista readonly del material educativo que el nutri
 * ha asignado al paciente (Sprint 3-E2).
 *
 * Muestra:
 *  - PDFs / imagenes / videos subidos por el profesional (descarga via signed URL)
 *  - Links externos (abren en nueva pestaña)
 *
 * Backend: GET /api/educacion?pacId=<patient_id>
 * Storage: createSignedUrl con TTL 5 min para abrir archivos privados
 */

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Loader2, FileText, Image as ImageIcon, Video, Link2, ExternalLink, Download, BookOpen } from 'lucide-react'

interface Props {
  patientId: string
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

const ICONS = { pdf: FileText, imagen: ImageIcon, video: Video, link: Link2 }
const LABELS = { pdf: 'PDF', imagen: 'Imagen', video: 'Video', link: 'Link' }

export function MaterialPaciente({ patientId }: Props) {
  const supabase = createClient()
  const [materiales, setMateriales] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancel = false
    ;(async () => {
      try {
        const res = await fetch(`/api/educacion?pacId=${patientId}`)
        const d = await res.json()
        if (cancel) return
        if (!res.ok) throw new Error(d.error ?? `HTTP ${res.status}`)
        setMateriales(d.materiales as Material[])
        setError(null)
      } catch (err) {
        if (cancel) return
        console.error('[material-paciente]', err)
        setError('No pudimos cargar el material por ahora.')
      } finally {
        if (!cancel) setLoading(false)
      }
    })()
    return () => { cancel = true }
  }, [patientId])

  async function abrir(m: Material) {
    if (m.tipo === 'link') {
      window.open(m.url_o_path, '_blank', 'noopener,noreferrer')
      return
    }
    try {
      const { data, error: errUrl } = await supabase.storage
        .from('materiales-educativos')
        .createSignedUrl(m.url_o_path, 300)
      if (errUrl || !data) throw errUrl ?? new Error('Sin URL')
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
    } catch (err) {
      console.error('[material-paciente open]', err)
      alert('No se pudo abrir el archivo. Pídele a tu nutricionista que lo reenvíe.')
    }
  }

  // Vacio: no mostramos nada (no inflar UI del paciente con secciones huecas)
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-[#8BA5BE] py-3">
        <Loader2 className="animate-spin" size={12} /> Cargando material…
      </div>
    )
  }
  if (error) return null
  if (materiales.length === 0) return null

  return (
    <div className="bg-white border border-[#D6E3ED] rounded-2xl overflow-hidden">
      <div className="bg-gradient-to-r from-emerald-50 to-[#F8FBFD] border-b border-[#D6E3ED] px-4 py-3 flex items-center gap-2">
        <BookOpen size={16} className="text-emerald-700" />
        <div>
          <p className="text-sm font-black text-[#0C1F2C]">Material de tu nutri</p>
          <p className="text-[10px] text-[#6B7C93]">{materiales.length} {materiales.length === 1 ? 'recurso' : 'recursos'} compartidos por tu profesional</p>
        </div>
      </div>
      <div className="divide-y divide-[#F0F6FA]">
        {materiales.map(m => {
          const Icon = ICONS[m.tipo]
          const sizeKb = m.size_bytes ? (m.size_bytes / 1024).toFixed(0) : null
          const sizeStr = sizeKb && +sizeKb > 1024 ? `${(+sizeKb / 1024).toFixed(1)} MB` : sizeKb ? `${sizeKb} KB` : ''
          return (
            <button
              key={m.id}
              onClick={() => abrir(m)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#F8FBFD] transition text-left"
            >
              <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                <Icon size={18} className="text-emerald-700" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-[#0C1F2C] truncate">{m.titulo}</p>
                {m.descripcion && <p className="text-[11px] text-[#6B7C93] truncate">{m.descripcion}</p>}
                <p className="text-[10px] text-[#8BA5BE] mt-0.5">
                  {LABELS[m.tipo]}
                  {sizeStr && ` · ${sizeStr}`}
                  {' · '}{new Date(m.created_at).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })}
                </p>
              </div>
              {m.tipo === 'link'
                ? <ExternalLink size={16} className="text-emerald-700 flex-shrink-0" />
                : <Download   size={16} className="text-emerald-700 flex-shrink-0" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}
