'use client'

/**
 * ProximoControl — widget para programar el proximo control de un paciente
 * (feedback Maria Jose Serrano, Sprint 2-D).
 *
 * UX:
 *  - Input date (datetime-local) + textarea motivo (opcional)
 *  - Boton "Guardar control" + boton "Limpiar" si ya hay uno programado
 *  - Indicador visual segun proximidad: hoy/manana (rojo), <7d (ambar), >=7d (azul)
 *  - Si no hay control programado, muestra un CTA "Programar siguiente control"
 *
 * Notificacion: in-app solamente (badge en la lista de pacientes).
 * No envia email ni WhatsApp - decision Sprint 2-D.
 */

import { useState } from 'react'
import { CalendarClock, Loader2, Trash2 } from 'lucide-react'

interface Props {
  patientId: string
  professionalId: string
  /** Valor inicial cargado por el padre */
  proximoControlAt: string | null
  proximoControlMotivo: string | null
  /** Callback tras guardar (para que el padre refresque su state) */
  onSaved: (newAt: string | null, newMotivo: string | null) => void
}

export function ProximoControl({
  patientId,
  professionalId,
  proximoControlAt,
  proximoControlMotivo,
  onSaved,
}: Props) {
  const [fecha, setFecha]   = useState<string>(toLocalInputValue(proximoControlAt))
  const [motivo, setMotivo] = useState<string>(proximoControlMotivo ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  const hayProgramado = !!proximoControlAt
  const proximidad    = proximoControlAt ? diasFaltan(proximoControlAt) : null

  async function guardar() {
    if (!fecha) {
      setError('Pone una fecha y hora.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const isoAt = new Date(fecha).toISOString()
      const res = await fetch('/api/patients/proximo-control', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId,
          professionalId,
          proximo_control_at: isoAt,
          proximo_control_motivo: motivo.trim() || null,
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error ?? `HTTP ${res.status}`)
      }
      onSaved(isoAt, motivo.trim() || null)
    } catch (err) {
      console.error('[proximo-control]', err)
      setError('No se pudo guardar. Reintenta.')
    } finally {
      setSaving(false)
    }
  }

  async function limpiar() {
    if (!confirm('Eliminar el proximo control programado?')) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/patients/proximo-control', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId,
          professionalId,
          proximo_control_at: null,
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error ?? `HTTP ${res.status}`)
      }
      setFecha('')
      setMotivo('')
      onSaved(null, null)
    } catch (err) {
      console.error('[proximo-control]', err)
      setError('No se pudo limpiar. Reintenta.')
    } finally {
      setSaving(false)
    }
  }

  // Estilo segun proximidad
  const colorClass = proximidad === null
    ? 'border-[#E2ECF4] bg-white'
    : proximidad <= 1   ? 'border-red-300 bg-red-50/60'
    : proximidad <= 7   ? 'border-amber-300 bg-amber-50/60'
    :                     'border-[#29ABE2] bg-[#F0F9FF]'

  return (
    <div className={`rounded-2xl border-2 ${colorClass} p-4 transition`}>
      <div className="flex items-center gap-2 mb-3">
        <CalendarClock size={18} className="text-[#0C3547]" />
        <h4 className="text-sm font-black text-[#0C1F2C]">Proximo control</h4>
        {hayProgramado && proximidad !== null && (
          <ProximidadBadge dias={proximidad} fechaIso={proximoControlAt!} />
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] uppercase tracking-wider text-[#6B7C93] font-bold mb-1 block">
            Fecha y hora
          </label>
          <input
            type="datetime-local"
            value={fecha}
            onChange={e => setFecha(e.target.value)}
            disabled={saving}
            className="w-full px-3 py-2 border border-[#D6E3ED] rounded-lg text-sm text-[#0C1F2C] focus:outline-none focus:border-[#29ABE2] disabled:opacity-50"
          />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-[#6B7C93] font-bold mb-1 block">
            Motivo (opcional)
          </label>
          <input
            type="text"
            value={motivo}
            onChange={e => setMotivo(e.target.value)}
            disabled={saving}
            placeholder="Ej: revisar adherencia + medir circunferencias"
            maxLength={200}
            className="w-full px-3 py-2 border border-[#D6E3ED] rounded-lg text-sm text-[#0C1F2C] focus:outline-none focus:border-[#29ABE2] placeholder:text-[#A8B5C0] disabled:opacity-50"
          />
        </div>
      </div>

      {error && (
        <p className="text-[11px] text-rose-700 font-semibold mt-2">⚠ {error}</p>
      )}

      <div className="flex items-center gap-2 mt-3">
        <button
          onClick={guardar}
          disabled={saving || !fecha}
          className="flex items-center gap-2 bg-[#0C3547] text-white text-sm font-bold px-4 py-2 rounded-xl hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving ? <><Loader2 className="animate-spin" size={14} /> Guardando...</> : (hayProgramado ? 'Reprogramar' : 'Programar control')}
        </button>
        {hayProgramado && (
          <button
            onClick={limpiar}
            disabled={saving}
            className="flex items-center gap-1 text-xs font-bold text-red-600 hover:bg-red-50 px-3 py-2 rounded-xl transition disabled:opacity-50"
          >
            <Trash2 size={12} /> Limpiar
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Badge inline con proximidad ────────────────────────────────────────────
function ProximidadBadge({ dias, fechaIso }: { dias: number; fechaIso: string }) {
  const fecha = new Date(fechaIso)
  const fechaTxt = fecha.toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })

  if (dias < 0) {
    return (
      <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-gray-200 text-gray-700">
        VENCIDO ({fechaTxt})
      </span>
    )
  }
  if (dias === 0) {
    return (
      <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-200 text-red-900">
        HOY {fechaTxt}
      </span>
    )
  }
  if (dias === 1) {
    return (
      <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-100 text-red-800">
        MAÑANA {fechaTxt}
      </span>
    )
  }
  if (dias <= 7) {
    return (
      <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
        EN {dias} DÍAS · {fechaTxt}
      </span>
    )
  }
  return (
    <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-100 text-sky-800">
      EN {dias} DÍAS · {fechaTxt}
    </span>
  )
}

// ─── Helpers ───────────────────────────────────────────────────────────────
/** Convierte ISO string a formato de <input type="datetime-local"> en zona local */
function toLocalInputValue(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  // YYYY-MM-DDTHH:mm (local, no UTC)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Dias enteros faltantes hasta la fecha (negativo si ya paso) */
function diasFaltan(iso: string): number {
  const target = new Date(iso).getTime()
  const now    = Date.now()
  return Math.floor((target - now) / 86_400_000)
}
