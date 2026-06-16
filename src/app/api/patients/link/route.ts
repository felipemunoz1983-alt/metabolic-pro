/**
 * POST /api/patients/link
 * Links an existing user to a professional's panel.
 * Uses service-role client to bypass RLS on profiles.
 *
 * Body: { patientId: string, professionalId: string }
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest): Promise<NextResponse> {
  let patientId: string
  let professionalId: string

  try {
    const body = await req.json()
    patientId     = body.patientId
    professionalId = body.professionalId
    if (!patientId || !professionalId) throw new Error('missing fields')
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Verify the professionalId belongs to a professional role
  const { data: pro } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', professionalId)
    .maybeSingle()

  if (!pro || pro.role !== 'professional') {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  // Fetch current patient state to decide whether to grant a trial
  const { data: patient } = await supabase
    .from('profiles')
    .select('plan, premium_until, trial_ends_at')
    .eq('id', patientId)
    .maybeSingle()

  // Grant 21-day trial to patients who have no active access
  const hasActivePremium = patient?.premium_until && new Date(patient.premium_until) > new Date()
  const hasActiveTrial   = patient?.trial_ends_at  && new Date(patient.trial_ends_at)  > new Date()
  const grantTrial       = !hasActivePremium && !hasActiveTrial

  const updatePayload: Record<string, unknown> = {
    professional_id: professionalId,
    role: 'patient',
    ...(grantTrial && {
      trial_ends_at: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
    }),
  }

  const { error } = await supabase
    .from('profiles')
    .update(updatePayload)
    .eq('id', patientId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, grantedTrial: grantTrial })
}

/**
 * DELETE /api/patients/link
 *
 * Dos modos (campo `mode` en el body):
 *  - 'unlink' (default) → Desvincula al paciente del profesional (professional_id=null,
 *                          role='individual'). La cuenta del paciente queda activa para
 *                          que siga usando la app como autonomo.
 *  - 'delete'           → Soft delete completo: deleted_at = NOW(). El paciente
 *                          desaparece del panel del pro Y no puede loguearse mas
 *                          (las queries filtran por deleted_at IS NULL).
 *                          Recuperable manualmente via SQL (UPDATE profiles SET
 *                          deleted_at = NULL WHERE email = ...).
 *
 * Body: { patientId: string, professionalId: string, mode?: 'unlink' | 'delete' }
 */
export async function DELETE(req: NextRequest): Promise<NextResponse> {
  let patientId: string
  let professionalId: string
  let mode: 'unlink' | 'delete' = 'unlink'

  try {
    const body = await req.json()
    patientId      = body.patientId
    professionalId = body.professionalId
    if (body.mode === 'delete') mode = 'delete'
    if (!patientId || !professionalId) throw new Error('missing fields')
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Verificar que quien pide es realmente profesional
  const { data: pro } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', professionalId)
    .maybeSingle()

  if (!pro || pro.role !== 'professional') {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  // Verificar que el paciente pertenece a este profesional
  const { data: patient } = await supabase
    .from('profiles')
    .select('professional_id')
    .eq('id', patientId)
    .maybeSingle()

  if (!patient || patient.professional_id !== professionalId) {
    return NextResponse.json({ error: 'Patient not linked to this professional' }, { status: 404 })
  }

  // Payload segun modo
  const updatePayload = mode === 'delete'
    ? { deleted_at: new Date().toISOString() }
    : { professional_id: null, role: 'individual' as const }

  const { error } = await supabase
    .from('profiles')
    .update(updatePayload)
    .eq('id', patientId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, mode })
}
