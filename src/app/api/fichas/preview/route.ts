/**
 * POST /api/fichas/preview
 *
 * Recibe una OpcionPreparacion (shape del banco) + tiempo_comida label y
 * devuelve la ficha HTML A5 imprimible con branding Centro Metabólico.
 *
 * Pensado para que el panel profesional muestre la ficha en preview o la
 * abra en pestaña nueva para exportar a PDF.
 *
 * Body: {
 *   opcion: OpcionPreparacion,
 *   tiempoComidaLabel?: string,   // default "Almuerzo · plan personalizado"
 *   tagsExtra?: string[]
 * }
 *
 * Auth: solo profesionales. No queremos que cualquier paciente pueda enumerar
 * fichas — son contenido derivado del plan.
 *
 * Respuesta: Content-Type: text/html — apto para `<iframe srcdoc>` o
 *            `window.open(URL.createObjectURL(blob))`.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-server'
import { buildFichaHTML } from '@/lib/ficha-generator'
import { createServiceClient } from '@/lib/supabase-server'
import type { OpcionPreparacion } from '@/types/banco'

interface Body {
  opcion: OpcionPreparacion
  tiempoComidaLabel?: string
  tagsExtra?: string[]
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Auth — solo profesionales pueden generar fichas
  const user = await getAuthUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sb = createServiceClient()
  const { data: profile } = await sb
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile || profile.role !== 'professional') {
    return NextResponse.json({ error: 'Forbidden — only professionals can generate fichas' }, { status: 403 })
  }

  // Parse body
  let body: Body
  try {
    body = (await req.json()) as Body
    if (!body.opcion?.nombre || !Array.isArray(body.opcion?.ingredientes)) {
      throw new Error('opcion incompleta')
    }
  } catch {
    return NextResponse.json({ error: 'Invalid body — se esperaba { opcion: OpcionPreparacion }' }, { status: 400 })
  }

  // Generar HTML
  const html = buildFichaHTML(body.opcion, {
    tiempoComidaLabel: body.tiempoComidaLabel ?? 'Plan personalizado',
    tagsExtra: body.tagsExtra ?? [],
  })

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      // Cache-control suave — el contenido depende del body exacto, sin sentido cachear
      'Cache-Control': 'private, no-store',
    },
  })
}
