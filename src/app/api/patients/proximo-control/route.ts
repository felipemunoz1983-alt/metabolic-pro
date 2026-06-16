/**
 * PATCH /api/patients/proximo-control
 *
 * Programa (o reprograma) el proximo control de un paciente.
 * El paciente debe pertenecer al profesional que lo programa.
 *
 * Body: {
 *   patientId: string,
 *   professionalId: string,
 *   proximo_control_at: string | null,    // ISO 8601 o null para limpiar
 *   proximo_control_motivo?: string | null,
 * }
 *
 * Si proximo_control_at = null tambien limpia el motivo automaticamente.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

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

  // Validar fecha (si viene)
  const rawAt = body.proximo_control_at as string | null | undefined
  let proximoControlAt: string | null = null
  if (rawAt !== null && rawAt !== undefined && rawAt !== '') {
    const d = new Date(rawAt)
    if (isNaN(d.getTime())) {
      return NextResponse.json({ error: 'Invalid proximo_control_at (use ISO 8601)' }, { status: 400 })
    }
    proximoControlAt = d.toISOString()
  }

  const rawMotivo = body.proximo_control_motivo
  const motivo = proximoControlAt === null
    ? null   // si limpia la fecha, limpia el motivo
    : (typeof rawMotivo === 'string' ? rawMotivo : null)

  const supabase = createServiceClient()

  // Verificar profesional + ownership
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

  const updatedAt = new Date().toISOString()
  const { error } = await supabase
    .from('profiles')
    .update({
      proximo_control_at:          proximoControlAt,
      proximo_control_motivo:      motivo,
      proximo_control_updated_at:  updatedAt,
    })
    .eq('id', patientId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, savedAt: updatedAt })
}
