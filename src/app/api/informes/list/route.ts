/**
 * GET /api/informes/list?paciente_id={uuid}
 *
 * Lista informes antropométricos.
 * - Si caller es paciente y NO pasa paciente_id → lista los suyos.
 * - Si caller es paciente y pasa paciente_id distinto al suyo → 403.
 * - Si caller es profesional → debe pasar paciente_id (un paciente suyo).
 *
 * Ordenado por fecha_eval DESC (más reciente arriba).
 *
 * Respuesta: { informes: InformeAntropometrico[], unreadCount: number }
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { getAuthUser } from '@/lib/auth-server'

export async function GET(req: NextRequest): Promise<NextResponse> {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()
  const pacienteIdParam = req.nextUrl.searchParams.get('paciente_id')

  // Determinar pacienteId efectivo + autorización
  let pacienteId: string
  let isPatientSelfView = false

  // Cargar profile del caller para conocer su rol
  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('id, role, professional_id')
    .eq('id', user.id)
    .maybeSingle()

  if (!callerProfile) {
    return NextResponse.json({ error: 'caller_profile_not_found' }, { status: 403 })
  }

  if (callerProfile.role === 'professional') {
    // Profesional: requiere paciente_id, debe ser uno suyo
    if (!pacienteIdParam) {
      return NextResponse.json({ error: 'paciente_id_required' }, { status: 400 })
    }
    const { data: pac } = await supabase
      .from('profiles')
      .select('id, professional_id')
      .eq('id', pacienteIdParam)
      .maybeSingle()
    if (!pac || pac.professional_id !== user.id) {
      return NextResponse.json({ error: 'not_linked_to_paciente' }, { status: 403 })
    }
    pacienteId = pacienteIdParam
  } else {
    // Paciente o individual: siempre ve los suyos
    if (pacienteIdParam && pacienteIdParam !== user.id) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }
    pacienteId = user.id
    isPatientSelfView = true
  }

  const { data: informes, error } = await supabase
    .from('informes_antropometricos')
    .select('*')
    .eq('paciente_id', pacienteId)
    .order('fecha_eval', { ascending: false })

  if (error) {
    console.error('[informes/list] DB error:', error)
    return NextResponse.json({ error: 'db_query_failed', detail: error.message }, { status: 500 })
  }

  const unreadCount = isPatientSelfView
    ? (informes ?? []).filter(i => !i.visto_por_paciente_en).length
    : 0

  return NextResponse.json({ informes: informes ?? [], unreadCount })
}
