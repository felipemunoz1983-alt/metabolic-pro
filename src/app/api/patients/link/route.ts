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
    .single()

  if (!pro || pro.role !== 'professional') {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  // Link patient
  const { error } = await supabase
    .from('profiles')
    .update({ professional_id: professionalId, role: 'patient' })
    .eq('id', patientId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
