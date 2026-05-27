/**
 * GET /api/informes/{id}/url
 *
 * Devuelve una URL firmada (signed URL) temporal del PDF en Storage para
 * que el cliente lo pueda abrir/descargar. La URL expira en 1 hora.
 *
 * Auth:
 *   - Paciente: solo si el informe es suyo
 *   - Profesional: solo si él es el profesional_id del informe
 *
 * Además, si el caller es el PACIENTE, marca el informe como visto
 * (UPDATE visto_por_paciente_en = now()) para que el badge "nuevo" desaparezca.
 *
 * Respuesta: { url: string, expires_at: ISO timestamp }
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { getAuthUser } from '@/lib/auth-server'

const SIGNED_URL_TTL_SECONDS = 3600  // 1 hora

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  if (!id) return NextResponse.json({ error: 'id_required' }, { status: 400 })

  const supabase = createServiceClient()

  // Cargar el informe
  const { data: informe, error: findErr } = await supabase
    .from('informes_antropometricos')
    .select('id, storage_path, paciente_id, profesional_id, visto_por_paciente_en')
    .eq('id', id)
    .maybeSingle()

  if (findErr || !informe) {
    return NextResponse.json({ error: 'informe_not_found' }, { status: 404 })
  }

  // Autorización: paciente owner o profesional creator
  const isPatient      = user.id === informe.paciente_id
  const isProfessional = user.id === informe.profesional_id
  if (!isPatient && !isProfessional) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  // Generar signed URL
  const { data: signed, error: signErr } = await supabase
    .storage
    .from('informes-antropometricos')
    .createSignedUrl(informe.storage_path, SIGNED_URL_TTL_SECONDS)

  if (signErr || !signed) {
    console.error('[informes/url] sign error:', signErr)
    return NextResponse.json({ error: 'sign_failed', detail: signErr?.message }, { status: 500 })
  }

  // Si el caller es el paciente y aún no lo había visto, marcar como visto.
  // Best-effort — si falla el update no bloqueamos la respuesta.
  if (isPatient && !informe.visto_por_paciente_en) {
    try {
      await supabase
        .from('informes_antropometricos')
        .update({ visto_por_paciente_en: new Date().toISOString() })
        .eq('id', id)
    } catch { /* ignore */ }
  }

  return NextResponse.json({
    url:        signed.signedUrl,
    expires_at: new Date(Date.now() + SIGNED_URL_TTL_SECONDS * 1000).toISOString(),
  })
}
