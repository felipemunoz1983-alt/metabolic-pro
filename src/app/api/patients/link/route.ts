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
 * Desvincula un paciente del profesional (professional_id → null, role → individual).
 * NO elimina la cuenta del paciente en Supabase Auth.
 *
 * Body: { patientId: string, professionalId: string }
 */
export async function DELETE(req: NextRequest): Promise<NextResponse> {
  let patientId: string
  let professionalId: string

  try {
    const body = await req.json()
    patientId      = body.patientId
    professionalId = body.professionalId
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

  // Desvincular: quitar professional_id y volver a rol individual
  const { error } = await supabase
    .from('profiles')
    .update({ professional_id: null, role: 'individual' })
    .eq('id', patientId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
