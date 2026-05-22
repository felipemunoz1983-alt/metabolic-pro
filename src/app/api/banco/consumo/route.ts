/**
 * POST /api/banco/consumo
 *
 * El paciente registra que comió una opción específica del banco hoy.
 * Body: { planId, tiempo, opcion: OpcionPreparacion }
 *
 * Side effects:
 *   1. INSERT en registros_opciones con snapshot de la opción (sobrevive
 *      si el banco cambia después)
 *   2. Detecta si el paciente repitió la misma opción 3+ veces en últimos 7
 *      días para ese mismo tiempo. Si sí, dispara push + email al profesional
 *      sugiriendo generar variantes (best-effort, no bloquea).
 *
 * Auth: paciente (el user_id se toma del auth, no del body — seguro).
 *
 * DELETE /api/banco/consumo?id=<registro_id>
 *   Borra un registro de consumo (paciente se equivocó, revertir).
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-server'
import { createServiceClient } from '@/lib/supabase-server'
import { sendMail } from '@/lib/mailer'
import { sendPushToUser } from '@/lib/push'
import type { OpcionPreparacion } from '@/types/banco'

interface Body {
  planId: string
  tiempo: string  // "Almuerzo", "Desayuno", etc.
  opcion: OpcionPreparacion
}

const REPETICIONES_PARA_ALERTA = 3  // mismas 3 elecciones = sugerir variantes
const VENTANA_DIAS = 7

export async function POST(req: NextRequest): Promise<NextResponse> {
  // 1. Auth
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // 2. Body
  let body: Body
  try {
    body = (await req.json()) as Body
    if (!body.planId || !body.tiempo || !body.opcion?.nombre) {
      throw new Error('missing fields')
    }
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const sb = createServiceClient()
  const hoy = new Date().toISOString().slice(0, 10)

  // 3. Verificar que el plan pertenece al paciente (defensa en profundidad
  //    contra envío de planId ajeno; RLS también protege pero acá fallamos fast)
  const { data: plan } = await sb
    .from('planes_nutricionales')
    .select('id, user_id, professional_id')
    .eq('id', body.planId)
    .maybeSingle()

  if (!plan || plan.user_id !== user.id) {
    return NextResponse.json({ error: 'Plan no encontrado o no autorizado' }, { status: 403 })
  }

  // 4. INSERT registro de consumo (snapshot)
  const aporte = body.opcion.aporte_porcion
  const { data: inserted, error: errIns } = await sb
    .from('registros_opciones')
    .insert({
      user_id:        user.id,
      plan_id:        body.planId,
      fecha:          hoy,
      tiempo_comida:  body.tiempo,
      opcion_nombre:  body.opcion.nombre,
      opcion_cocina:  body.opcion.meta?.cocina ?? null,
      kcal:           aporte?.kcal ?? null,
      proteina_g:     aporte?.proteina_g ?? null,
      carbohidrato_g: aporte?.carbohidrato_g ?? null,
      grasa_g:        aporte?.grasa_g ?? null,
    })
    .select('id')
    .single()

  if (errIns) {
    return NextResponse.json({ error: errIns.message }, { status: 500 })
  }

  // 5. Detectar repetición — buscar últimos N registros del mismo tiempo
  const haceVentana = new Date()
  haceVentana.setDate(haceVentana.getDate() - VENTANA_DIAS)
  const desdeFecha = haceVentana.toISOString().slice(0, 10)

  const { data: ultimos } = await sb
    .from('registros_opciones')
    .select('opcion_nombre, fecha')
    .eq('user_id', user.id)
    .eq('tiempo_comida', body.tiempo)
    .gte('fecha', desdeFecha)
    .order('fecha', { ascending: false })

  const mismosUltimos = (ultimos ?? []).filter(r => r.opcion_nombre === body.opcion.nombre).length

  let alertaProfesional: 'sent' | 'skipped' | 'failed' = 'skipped'

  if (mismosUltimos >= REPETICIONES_PARA_ALERTA && plan.professional_id) {
    // Disparar push + email al profesional best-effort, sin bloquear el response
    alertaProfesional = await notificarProfesionalRepeticion({
      profesionalId: plan.professional_id as string,
      pacienteUserId: user.id,
      tiempo: body.tiempo,
      opcionNombre: body.opcion.nombre,
      repeticiones: mismosUltimos,
      ventanaDias: VENTANA_DIAS,
      origin: req.nextUrl.origin,
    })
  }

  return NextResponse.json({
    ok: true,
    registroId: inserted?.id,
    repeticiones: mismosUltimos,
    alertaProfesional,
  })
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const sb = createServiceClient()
  const { error } = await sb
    .from('registros_opciones')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)  // doble check: solo borra los propios

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// ─── Helpers ────────────────────────────────────────────────────────────────

async function notificarProfesionalRepeticion(args: {
  profesionalId: string
  pacienteUserId: string
  tiempo: string
  opcionNombre: string
  repeticiones: number
  ventanaDias: number
  origin: string
}): Promise<'sent' | 'failed'> {
  const sb = createServiceClient()
  try {
    // Resolver datos del profesional y paciente (vía service-role)
    const [{ data: pro }, { data: paciente }] = await Promise.all([
      sb.from('profiles').select('nombre, email').eq('id', args.profesionalId).maybeSingle(),
      sb.from('profiles').select('nombre').eq('id', args.pacienteUserId).maybeSingle(),
    ])

    const pacienteName = paciente?.nombre ?? 'Tu paciente'

    // Push
    await sendPushToUser(sb, args.profesionalId, {
      title: '🔄 Considera más variantes',
      body:  `${pacienteName} ha repetido "${args.opcionNombre}" en ${args.tiempo} ${args.repeticiones} veces en ${args.ventanaDias} días. Genera nuevas opciones para evitar fatiga.`,
      url:   '/paciente?tab=pacientes',
      tag:   `repeticion-${args.profesionalId}-${args.tiempo}`,
    }).catch(() => { /* push opcional */ })

    // Email (si el profesional tiene email y el mailer está configurado)
    if (pro?.email) {
      await sendMail({
        to: pro.email,
        subject: `${pacienteName} necesita más variantes en ${args.tiempo}`,
        html: buildEmailRepeticion({
          professionalName: pro?.nombre ?? 'Profesional',
          pacienteName,
          tiempo:        args.tiempo,
          opcionNombre:  args.opcionNombre,
          repeticiones:  args.repeticiones,
          ventanaDias:   args.ventanaDias,
          appUrl:        args.origin,
        }),
      }).catch(() => { /* mail opcional */ })
    }
    return 'sent'
  } catch (err) {
    console.error('[banco/consumo] notificar profesional falló:', err)
    return 'failed'
  }
}

function buildEmailRepeticion(args: {
  professionalName: string
  pacienteName: string
  tiempo: string
  opcionNombre: string
  repeticiones: number
  ventanaDias: number
  appUrl: string
}): string {
  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:32px 16px;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
<tr><td style="background:#0C1F2C;padding:28px 32px;text-align:center;">
  <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:3px;color:#29ABE2;text-transform:uppercase;">Centro Metabolico</p>
  <h1 style="margin:6px 0 0;font-size:22px;font-weight:900;color:#fff;letter-spacing:1px;">CENTRO METABOLICO PRO</h1>
</td></tr>
<tr><td style="padding:36px 32px 24px;">
  <h2 style="margin:0 0 8px;font-size:18px;font-weight:800;color:#0C1F2C;">Hola, ${args.professionalName}</h2>
  <p style="margin:0 0 16px;font-size:14px;color:#4a6b80;line-height:1.6;">
    <strong style="color:#0C3547;">${args.pacienteName}</strong> ha elegido la misma preparacion <strong>${args.repeticiones} veces</strong> en <strong>${args.tiempo}</strong> durante los ultimos ${args.ventanaDias} dias:
  </p>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fbfd;border:1px solid #e2ecf4;border-radius:12px;margin-bottom:24px;">
    <tr><td style="padding:18px 22px;">
      <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:2px;color:#8ba5be;text-transform:uppercase;">Repetida</p>
      <p style="margin:0;font-size:15px;color:#0C1F2C;font-weight:700;">"${args.opcionNombre}"</p>
    </td></tr>
  </table>
  <p style="margin:0 0 20px;font-size:13px;color:#4a6b80;line-height:1.5;">
    La fatiga de menu es la causa #1 de abandono nutricional. Considera regenerar el banco de opciones para este tiempo de comida o agregar variantes manualmente desde tu panel.
  </p>
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <a href="${args.appUrl}/paciente?tab=pacientes" style="display:inline-block;background:#29ABE2;color:#fff;font-size:14px;font-weight:800;text-decoration:none;padding:13px 32px;border-radius:10px;letter-spacing:0.5px;">Revisar paciente</a>
  </td></tr></table>
</td></tr>
<tr><td style="padding:16px 32px 28px;text-align:center;border-top:1px solid #e2ecf4;">
  <p style="margin:0;font-size:10px;color:#8ba5be;">Centro Metabolico Pro · ${new Date().getFullYear()}</p>
</td></tr>
</table></td></tr></table></body></html>`
}
