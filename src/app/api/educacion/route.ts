/**
 * /api/educacion · CRUD de materiales educativos (Sprint 3-E)
 *
 * El upload del archivo en si lo hace el CLIENT directo al Storage bucket
 * usando RLS (mas eficiente, no carga el server). Este endpoint solo registra
 * el metadata (titulo, descripcion, path, etc) despues de que el upload se
 * concreta. Para tipo 'link' no hay upload — solo se registra la URL.
 *
 * POST   /api/educacion          — registra metadata (despues de upload o link)
 * GET    /api/educacion?profId=… — lista todos los materiales del profesional
 * GET    /api/educacion?pacId=…  — lista materiales visibles para un paciente
 *                                   (generales del pro + asignados a el)
 * DELETE /api/educacion?id=…     — soft-delete (deleted_at = NOW())
 *                                   y borra el blob del bucket si aplica
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

const TIPOS_VALIDOS = ['pdf', 'imagen', 'video', 'link'] as const
type TipoMaterial = typeof TIPOS_VALIDOS[number]

// ─── POST: registra metadata ───────────────────────────────────────────────
export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const profesionalId = body.profesionalId as string | undefined
  const pacienteId    = (body.pacienteId as string | null | undefined) ?? null
  const titulo        = body.titulo as string | undefined
  const descripcion   = (body.descripcion as string | null | undefined) ?? null
  const tipo          = body.tipo as TipoMaterial | undefined
  const urlOPath      = body.url_o_path as string | undefined
  const mimeType      = (body.mime_type as string | null | undefined) ?? null
  const sizeBytes     = typeof body.size_bytes === 'number' ? body.size_bytes : null

  if (!profesionalId || !titulo || !tipo || !urlOPath) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (!TIPOS_VALIDOS.includes(tipo)) {
    return NextResponse.json({ error: `Invalid tipo (use one of ${TIPOS_VALIDOS.join(', ')})` }, { status: 400 })
  }
  if (titulo.trim().length === 0 || titulo.length > 200) {
    return NextResponse.json({ error: 'Titulo debe tener 1-200 chars' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Verificar profesional
  const { data: pro } = await supabase
    .from('profiles').select('role').eq('id', profesionalId).maybeSingle()
  if (!pro || pro.role !== 'professional') {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  // Si se asigna a un paciente, verificar ownership
  if (pacienteId) {
    const { data: pac } = await supabase
      .from('profiles').select('professional_id, deleted_at').eq('id', pacienteId).maybeSingle()
    if (!pac || pac.professional_id !== profesionalId || pac.deleted_at) {
      return NextResponse.json({ error: 'Patient not linked or deleted' }, { status: 404 })
    }
  }

  const { data, error } = await supabase
    .from('materiales_educativos')
    .insert({
      profesional_id: profesionalId,
      paciente_id:    pacienteId,
      titulo:         titulo.trim(),
      descripcion:    descripcion?.trim() || null,
      tipo,
      url_o_path:     urlOPath,
      mime_type:      mimeType,
      size_bytes:     sizeBytes,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true, material: data })
}

// ─── GET: lista material ───────────────────────────────────────────────────
export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url)
  const profId = searchParams.get('profId')
  const pacId  = searchParams.get('pacId')

  if (!profId && !pacId) {
    return NextResponse.json({ error: 'profId or pacId required' }, { status: 400 })
  }

  const supabase = createServiceClient()

  if (profId) {
    // Lista todos los materiales de un profesional (su biblioteca)
    const { data, error } = await supabase
      .from('materiales_educativos')
      .select('*')
      .eq('profesional_id', profId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, materiales: data ?? [] })
  }

  // Paciente: ve materiales generales de su pro + los asignados a el
  const { data: pac } = await supabase
    .from('profiles').select('professional_id').eq('id', pacId!).maybeSingle()
  if (!pac?.professional_id) {
    return NextResponse.json({ ok: true, materiales: [] })
  }

  const { data, error } = await supabase
    .from('materiales_educativos')
    .select('*')
    .eq('profesional_id', pac.professional_id)
    .or(`paciente_id.is.null,paciente_id.eq.${pacId}`)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, materiales: data ?? [] })
}

// ─── DELETE: soft delete + borrar blob ─────────────────────────────────────
export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url)
  const id     = searchParams.get('id')
  const profId = searchParams.get('profId')
  if (!id || !profId) {
    return NextResponse.json({ error: 'id and profId required' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Fetch material — verificar ownership
  const { data: mat } = await supabase
    .from('materiales_educativos')
    .select('id, profesional_id, tipo, url_o_path')
    .eq('id', id)
    .maybeSingle()
  if (!mat || mat.profesional_id !== profId) {
    return NextResponse.json({ error: 'Material not found' }, { status: 404 })
  }

  // Soft delete metadata
  const { error: updErr } = await supabase
    .from('materiales_educativos')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })

  // Si es archivo subido (no link), borrar blob del bucket
  if (mat.tipo !== 'link' && mat.url_o_path) {
    const { error: rmErr } = await supabase.storage
      .from('materiales-educativos')
      .remove([mat.url_o_path])
    if (rmErr) {
      console.warn('[educacion DELETE] no se pudo borrar blob:', rmErr.message)
      // No fallar la request — el metadata ya esta soft-deleted, el blob queda huerfano
    }
  }

  return NextResponse.json({ ok: true })
}
