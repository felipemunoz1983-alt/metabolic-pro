/**
 * PATCH /api/patients/notes
 *
 * Guarda las 4 notas clinicas del profesional sobre un paciente:
 *  - indicaciones_pro          (visible al paciente)
 *  - suplementacion_pro        (visible al paciente)
 *  - rutina_entrenamiento_pro  (visible al paciente)
 *  - examenes_solicitados_pro  (uso interno del profesional)
 *
 * Cualquier subconjunto de campos se puede mandar; los no enviados quedan igual.
 * Cada save actualiza notas_clinicas_updated_at para timestamp en UI.
 *
 * Body: {
 *   patientId: string,
 *   professionalId: string,
 *   indicaciones_pro?: string | null,
 *   suplementacion_pro?: string | null,
 *   rutina_entrenamiento_pro?: string | null,
 *   examenes_solicitados_pro?: string | null,
 * }
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

const CAMPOS_PERMITIDOS = [
  'indicaciones_pro',
  'suplementacion_pro',
  'rutina_entrenamiento_pro',
  'examenes_solicitados_pro',
  // Sprint 3-F: 4 preguntas obligatorias del safety check de suplementacion
  'supl_objetivo_actual',
  'supl_entrenamiento_actual',
  'supl_condiciones_medicas',
  'supl_suplementos_actuales',
] as const

// Campos del safety check de suplementacion — al guardarlos actualizamos
// tambien el timestamp supl_check_updated_at
const CAMPOS_SUPL_CHECK = [
  'supl_objetivo_actual',
  'supl_entrenamiento_actual',
  'supl_condiciones_medicas',
  'supl_suplementos_actuales',
] as const

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const patientId      = body.patientId as string | undefined
  const professionalId = body.professionalId as string | undefined
  if (!patientId || !professionalId) {
    return NextResponse.json({ error: 'Missing patientId or professionalId' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Verificar profesional + ownership del paciente
  const { data: pro } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', professionalId)
    .maybeSingle()
  if (!pro || pro.role !== 'professional') {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  const { data: patient } = await supabase
    .from('profiles')
    .select('professional_id, deleted_at')
    .eq('id', patientId)
    .maybeSingle()
  if (!patient || patient.professional_id !== professionalId || patient.deleted_at) {
    return NextResponse.json({ error: 'Patient not linked or deleted' }, { status: 404 })
  }

  // Construir payload solo con los campos enviados (whitelist)
  const updatePayload: Record<string, string | null> = {}
  for (const campo of CAMPOS_PERMITIDOS) {
    if (campo in body) {
      const valor = body[campo]
      updatePayload[campo] = typeof valor === 'string' ? valor : null
    }
  }
  if (Object.keys(updatePayload).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  // Timestamp del save de notas clinicas
  const nowIso = new Date().toISOString()
  ;(updatePayload as Record<string, string>).notas_clinicas_updated_at = nowIso

  // Si se actualizaron campos del safety check de suplementacion, marcar tambien
  // supl_check_updated_at para que la UI sepa cuando fue la ultima revision.
  const tocoSafetyCheck = CAMPOS_SUPL_CHECK.some(c => c in body)
  if (tocoSafetyCheck) {
    ;(updatePayload as Record<string, string>).supl_check_updated_at = nowIso
  }

  const { error } = await supabase
    .from('profiles')
    .update(updatePayload)
    .eq('id', patientId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, savedAt: updatePayload.notas_clinicas_updated_at })
}
