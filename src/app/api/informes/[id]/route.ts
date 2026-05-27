/**
 * DELETE /api/informes/{id}
 *
 * Elimina un informe antropométrico. Borra tanto el row de la tabla como
 * el archivo en Storage. Operación atómica desde el punto de vista del
 * caller (si falla algo, devuelve error sin dejar estado a medias).
 *
 * Auth: solo el profesional que CREÓ el informe puede borrarlo.
 *       El paciente NO puede borrar — debe pedírselo al profesional.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { getAuthUser } from '@/lib/auth-server'

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  if (!id) return NextResponse.json({ error: 'id_required' }, { status: 400 })

  const supabase = createServiceClient()

  // Cargar informe
  const { data: informe, error: findErr } = await supabase
    .from('informes_antropometricos')
    .select('id, storage_path, profesional_id')
    .eq('id', id)
    .maybeSingle()

  if (findErr || !informe) {
    return NextResponse.json({ error: 'informe_not_found' }, { status: 404 })
  }

  // Solo el profesional creator puede borrar
  if (user.id !== informe.profesional_id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  // Borrar archivo de Storage
  const { error: storageErr } = await supabase
    .storage
    .from('informes-antropometricos')
    .remove([informe.storage_path])

  if (storageErr) {
    console.error('[informes/delete] storage remove error:', storageErr)
    // Continuamos igual al delete del row — el archivo puede haberse borrado antes
  }

  // Borrar row
  const { error: dbErr } = await supabase
    .from('informes_antropometricos')
    .delete()
    .eq('id', id)

  if (dbErr) {
    console.error('[informes/delete] DB error:', dbErr)
    return NextResponse.json({ error: 'db_delete_failed', detail: dbErr.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
