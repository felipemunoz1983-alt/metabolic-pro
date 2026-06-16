/**
 * POST /api/patients/link-by-email
 *
 * Linkea a un paciente recien registrado con un profesional usando el EMAIL
 * del profesional (caso de uso: el paciente se registra en /register y escribe
 * el email de su nutri sin tener invite token firmado).
 *
 * Body: { patientId: string, professionalEmail: string }
 *
 * Validaciones:
 *  - El profesional existe, tiene role='professional' y no esta borrado
 *  - El paciente existe y no esta borrado
 *  - El paciente NO esta linkeado todavia (idempotente: si ya esta linkeado al
 *    mismo pro, devuelve OK; si esta a otro pro, devuelve error)
 *
 * Side-effects:
 *  - profiles.professional_id = pro.id
 *  - profiles.role = 'patient'
 *  - Si el paciente no tiene premium activo, se le otorga 21 dias de trial
 *
 * Retorno:
 *   200 { ok: true, professionalId, professionalName, grantedTrial: bool }
 *   404 { ok: false, error: 'professional_not_found' }
 *   409 { ok: false, error: 'already_linked_to_another' }
 *   400 / 500 errores varios
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid body' }, { status: 400 })
  }

  const patientId          = body.patientId as string | undefined
  const professionalEmail  = (body.professionalEmail as string | undefined)?.trim().toLowerCase()

  if (!patientId || !professionalEmail) {
    return NextResponse.json({ ok: false, error: 'Missing patientId or professionalEmail' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // 1. Buscar al profesional
  const { data: pro } = await supabase
    .from('profiles')
    .select('id, nombre, role, deleted_at')
    .eq('email', professionalEmail)
    .maybeSingle()

  if (!pro || pro.role !== 'professional' || pro.deleted_at) {
    return NextResponse.json(
      { ok: false, error: 'professional_not_found', message: 'No encontramos un profesional con ese email.' },
      { status: 404 },
    )
  }

  // 2. Buscar al paciente
  const { data: patient } = await supabase
    .from('profiles')
    .select('id, professional_id, deleted_at, premium_until, trial_ends_at')
    .eq('id', patientId)
    .maybeSingle()

  if (!patient || patient.deleted_at) {
    return NextResponse.json(
      { ok: false, error: 'patient_not_found', message: 'No encontramos tu cuenta.' },
      { status: 404 },
    )
  }

  // 3. Idempotencia: si ya esta linkeado al mismo pro, OK
  if (patient.professional_id === pro.id) {
    return NextResponse.json({
      ok: true,
      professionalId:    pro.id,
      professionalName:  pro.nombre,
      grantedTrial:      false,
      alreadyLinked:     true,
    })
  }

  // 4. Si esta linkeado a OTRO pro, conflicto — no sobreescribir sin confirmacion
  if (patient.professional_id && patient.professional_id !== pro.id) {
    return NextResponse.json(
      {
        ok: false,
        error: 'already_linked_to_another',
        message: 'Tu cuenta ya esta vinculada a otro profesional. Pidele al actual que te desvincule primero.',
      },
      { status: 409 },
    )
  }

  // 5. Linkear + grant trial si corresponde
  const hasActivePremium = patient.premium_until && new Date(patient.premium_until) > new Date()
  const hasActiveTrial   = patient.trial_ends_at  && new Date(patient.trial_ends_at)  > new Date()
  const grantTrial       = !hasActivePremium && !hasActiveTrial

  const updatePayload: Record<string, unknown> = {
    professional_id: pro.id,
    role:            'patient',
    ...(grantTrial && {
      trial_ends_at: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
    }),
  }

  const { error: updErr } = await supabase
    .from('profiles')
    .update(updatePayload)
    .eq('id', patientId)

  if (updErr) {
    return NextResponse.json({ ok: false, error: updErr.message }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    professionalId:    pro.id,
    professionalName:  pro.nombre,
    grantedTrial:      grantTrial,
    alreadyLinked:     false,
  })
}
