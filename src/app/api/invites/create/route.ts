/**
 * POST /api/invites/create
 *
 * Genera un token de invitación firmado (24h) para el profesional autenticado.
 * El profesional usa este token para construir el link `/register?invite=<token>`
 * que comparte con su paciente.
 *
 * Auth: el caller debe estar logueado y tener role = 'professional'.
 * Body: ninguno (el professionalId se toma del auth, no del body — más seguro).
 * Respuesta: { token, link, expiresAt }
 *
 * Si INVITE_TOKEN_SECRET no está configurado en el entorno, devuelve 503 y el
 * cliente debe caer al formato legacy ?pro=<base64> que ya existe.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-server'
import { signInviteToken } from '@/lib/invite-token'
import { createServiceClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest): Promise<NextResponse> {
  // 1. Auth
  const user = await getAuthUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Verificar que el caller sea profesional
  const sb = createServiceClient()
  const { data: profile } = await sb
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile || profile.role !== 'professional') {
    return NextResponse.json({ error: 'Forbidden — only professionals can create invites' }, { status: 403 })
  }

  // 3. Firmar el token (puede fallar si el secret no está seteado)
  let token: string
  try {
    token = signInviteToken(user.id)
  } catch (err) {
    console.error('[invites/create] sign failed:', err)
    return NextResponse.json(
      { error: 'INVITE_TOKEN_SECRET not configured on server', fallback: 'use_legacy' },
      { status: 503 },
    )
  }

  const origin = req.nextUrl.origin
  const link = `${origin}/register?invite=${encodeURIComponent(token)}`
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

  return NextResponse.json({ token, link, expiresAt })
}
