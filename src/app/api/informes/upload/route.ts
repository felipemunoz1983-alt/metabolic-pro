/**
 * POST /api/informes/upload
 *
 * Sube un PDF de informe antropométrico al Storage de Supabase + registra
 * la metadata en la tabla informes_antropometricos.
 *
 * Body (multipart/form-data):
 *   file:          File (PDF, max 10 MB)
 *   paciente_id:   string (UUID del paciente)
 *   titulo:        string
 *   fecha_eval:    string (YYYY-MM-DD)
 *   tipo:          TipoInforme
 *   notas:         string (opcional)
 *
 * Auth: caller debe ser profesional vinculado al paciente. RLS de Storage
 * + RLS de la tabla refuerzan esto a nivel DB.
 *
 * Respuestas:
 *   200 { id, storage_path } — upload OK
 *   400 — body inválido o archivo no es PDF
 *   401 — no autenticado
 *   403 — no es profesional / paciente no vinculado
 *   413 — archivo > 10 MB
 *   500 — error de Storage o DB
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { getAuthUser } from '@/lib/auth-server'
import {
  buildStoragePath,
  MAX_FILE_SIZE_BYTES,
  type TipoInforme,
} from '@/lib/informes-antropometricos'

const TIPOS_VALIDOS: TipoInforme[] = ['inbody', 'isak', 'dexa', 'antropometria', 'bioimpedancia', 'otro']

export async function POST(req: NextRequest): Promise<NextResponse> {
  // 1. Auth
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // 2. Parse multipart body
  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file        = form.get('file')        as File | null
  const pacienteId  = form.get('paciente_id') as string | null
  const titulo      = form.get('titulo')      as string | null
  const fechaEval   = form.get('fecha_eval')  as string | null
  const tipo        = form.get('tipo')        as string | null
  const notas       = form.get('notas')       as string | null

  // 3. Validaciones
  if (!file || !(file instanceof File))
    return NextResponse.json({ error: 'file_required' }, { status: 400 })
  if (file.type !== 'application/pdf')
    return NextResponse.json({ error: 'file_must_be_pdf' }, { status: 400 })
  if (file.size > MAX_FILE_SIZE_BYTES)
    return NextResponse.json({ error: 'file_too_large', max: MAX_FILE_SIZE_BYTES }, { status: 413 })
  if (!pacienteId || !titulo || !fechaEval || !tipo)
    return NextResponse.json({ error: 'missing_required_fields' }, { status: 400 })
  if (!TIPOS_VALIDOS.includes(tipo as TipoInforme))
    return NextResponse.json({ error: 'invalid_tipo', allowed: TIPOS_VALIDOS }, { status: 400 })

  const supabase = createServiceClient()

  // 4. Verificar que el caller es profesional vinculado al paciente
  const { data: paciente, error: linkErr } = await supabase
    .from('profiles')
    .select('id, professional_id')
    .eq('id', pacienteId)
    .maybeSingle()

  if (linkErr || !paciente) {
    return NextResponse.json({ error: 'paciente_not_found' }, { status: 404 })
  }
  if (paciente.professional_id !== user.id) {
    return NextResponse.json({ error: 'not_linked_to_paciente' }, { status: 403 })
  }

  // 5. Subir a Storage
  const storagePath = buildStoragePath(pacienteId, file.name)
  const fileBuffer = await file.arrayBuffer()

  const { error: uploadErr } = await supabase
    .storage
    .from('informes-antropometricos')
    .upload(storagePath, fileBuffer, {
      contentType: 'application/pdf',
      upsert: false,
    })

  if (uploadErr) {
    console.error('[informes/upload] storage error:', uploadErr)
    return NextResponse.json({ error: 'storage_upload_failed', detail: uploadErr.message }, { status: 500 })
  }

  // 6. Insert row en la tabla
  const { data: row, error: insertErr } = await supabase
    .from('informes_antropometricos')
    .insert({
      paciente_id:       pacienteId,
      profesional_id:    user.id,
      storage_path:      storagePath,
      filename_original: file.name,
      file_size_bytes:   file.size,
      mime_type:         file.type,
      titulo,
      fecha_eval:        fechaEval,
      tipo,
      notas:             notas || null,
    })
    .select('id, storage_path, created_at')
    .single()

  if (insertErr) {
    // Rollback Storage si falla el insert
    try {
      await supabase.storage.from('informes-antropometricos').remove([storagePath])
    } catch { /* rollback best-effort */ }
    console.error('[informes/upload] DB insert error:', insertErr)
    return NextResponse.json({ error: 'db_insert_failed', detail: insertErr.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, id: row.id, storage_path: row.storage_path, created_at: row.created_at })
}
