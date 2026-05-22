/**
 * GET /api/pacientes/[id]/adherencia?ventana=7|14|30
 *
 * Agrega métricas accionables desde registros_opciones para que el profesional
 * vea de un vistazo cómo está el paciente:
 *
 *   - adherenciaPct: % global de tiempos registrados / esperados
 *   - adherenciaPorTiempo: desglose por Desayuno/Almuerzo/Once/Cena
 *   - topFavoritas: las 3 preparaciones que más eligió
 *   - opcionesNoElegidas: las del banco actual que el paciente nunca ha tocado
 *   - diversidadCocinas: cuántas cocinas distintas comió en la ventana
 *   - serieDiaria: array {fecha, count} para sparkline
 *
 * Auth: solo profesional vinculado al paciente.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-server'
import { createServiceClient } from '@/lib/supabase-server'
import { obtenerPlan } from '@/lib/repositorioPlanes'
import type { OpcionPreparacion } from '@/types/banco'

interface RegistroDB {
  fecha: string
  tiempo_comida: string
  opcion_nombre: string
  opcion_cocina: string | null
}

const VENTANAS_VALIDAS = new Set([7, 14, 30])
const DEFAULT_VENTANA = 14

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id: pacienteId } = await params

  // 1. Auth — caller debe ser profesional
  const caller = await getAuthUser(req)
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sb = createServiceClient()

  const { data: callerProfile } = await sb
    .from('profiles')
    .select('role')
    .eq('id', caller.id)
    .maybeSingle()

  if (!callerProfile || callerProfile.role !== 'professional') {
    return NextResponse.json({ error: 'Forbidden — only professionals' }, { status: 403 })
  }

  // 2. Verificar que el paciente está vinculado a este profesional
  const { data: paciente } = await sb
    .from('profiles')
    .select('id, nombre, professional_id')
    .eq('id', pacienteId)
    .maybeSingle()

  if (!paciente) {
    return NextResponse.json({ error: 'Paciente no encontrado' }, { status: 404 })
  }
  if (paciente.professional_id !== caller.id) {
    return NextResponse.json({ error: 'Paciente no vinculado a ti' }, { status: 403 })
  }

  // 3. Parsear ventana
  const ventanaParam = Number(req.nextUrl.searchParams.get('ventana') ?? DEFAULT_VENTANA)
  const ventana = VENTANAS_VALIDAS.has(ventanaParam) ? ventanaParam : DEFAULT_VENTANA

  const hoyDate = new Date()
  const desdeDate = new Date(hoyDate)
  desdeDate.setDate(desdeDate.getDate() - (ventana - 1))
  const desdeStr = desdeDate.toISOString().slice(0, 10)
  const hoyStr   = hoyDate.toISOString().slice(0, 10)

  // 4. Cargar registros de la ventana
  const { data: registrosDb, error: errReg } = await sb
    .from('registros_opciones')
    .select('fecha, tiempo_comida, opcion_nombre, opcion_cocina')
    .eq('user_id', pacienteId)
    .gte('fecha', desdeStr)
    .lte('fecha', hoyStr)
    .order('fecha', { ascending: false })

  if (errReg) {
    return NextResponse.json({ error: errReg.message }, { status: 500 })
  }

  const registros = (registrosDb ?? []) as RegistroDB[]

  // 5. Resolver el plan actual del paciente para saber:
  //    - cuántos tiempos de comida tiene esperados por día
  //    - qué opciones existen en el banco (para 'opcionesNoElegidas')
  const { data: planRow } = await sb
    .from('planes_nutricionales')
    .select('id, created_at')
    .eq('user_id', pacienteId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  let tiemposEsperados: string[] = []
  let opcionesBanco: { tiempo: string; opciones: OpcionPreparacion[] }[] = []
  if (planRow?.id) {
    try {
      const plan = await obtenerPlan(planRow.id as string)
      if (plan) {
        tiemposEsperados = plan.tiempos_comida.map(t => t.tipo)
        opcionesBanco = plan.tiempos_comida.map(t => ({
          tiempo: t.tipo,
          opciones: t.opciones,
        }))
      }
    } catch {
      // plan corrupto — degradamos: usamos los tiempos detectados en registros
      tiemposEsperados = [...new Set(registros.map(r => r.tiempo_comida))]
    }
  } else {
    tiemposEsperados = [...new Set(registros.map(r => r.tiempo_comida))]
  }

  // ── Cálculos ─────────────────────────────────────────────────────────────

  // (a) Adherencia global
  const totalEsperado = tiemposEsperados.length * ventana
  const totalRegistrado = registros.length
  const adherenciaPct = totalEsperado > 0
    ? Math.round((totalRegistrado / totalEsperado) * 100)
    : 0

  // (b) Adherencia por tiempo
  const adherenciaPorTiempo = tiemposEsperados.map(tipo => {
    const conteo = registros.filter(r => r.tiempo_comida === tipo).length
    return {
      tipo,
      registrados:  conteo,
      esperados:    ventana,
      pct:          Math.round((conteo / ventana) * 100),
    }
  })

  // (c) Top 3 favoritas (por count, ordenadas desc)
  const conteoOpciones = new Map<string, { count: number; tiempo: string; cocina: string | null }>()
  for (const r of registros) {
    const key = `${r.tiempo_comida}|${r.opcion_nombre}`
    const prev = conteoOpciones.get(key)
    if (prev) {
      prev.count++
    } else {
      conteoOpciones.set(key, { count: 1, tiempo: r.tiempo_comida, cocina: r.opcion_cocina })
    }
  }
  const topFavoritas = Array.from(conteoOpciones.entries())
    .map(([key, v]) => {
      const [tiempo, nombre] = key.split('|')
      return { nombre, tiempo, cocina: v.cocina, count: v.count }
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)

  // (d) Opciones del banco que el paciente NO ha elegido en la ventana
  const elegidas = new Set(registros.map(r => `${r.tiempo_comida}|${r.opcion_nombre}`))
  const opcionesNoElegidas: { tiempo: string; nombre: string; cocina: string }[] = []
  for (const grupo of opcionesBanco) {
    for (const op of grupo.opciones) {
      if (!elegidas.has(`${grupo.tiempo}|${op.nombre}`)) {
        opcionesNoElegidas.push({
          tiempo: grupo.tiempo,
          nombre: op.nombre,
          cocina: op.meta.cocina,
        })
      }
    }
  }

  // (e) Diversidad de cocinas distintas
  const cocinasDistintas = new Set(
    registros.map(r => r.opcion_cocina).filter((c): c is string => !!c),
  )
  const diversidadCocinas = cocinasDistintas.size

  // (f) Serie diaria para sparkline
  const conteoPorDia = new Map<string, number>()
  for (const r of registros) {
    conteoPorDia.set(r.fecha, (conteoPorDia.get(r.fecha) ?? 0) + 1)
  }
  const serieDiaria: { fecha: string; count: number }[] = []
  for (let i = 0; i < ventana; i++) {
    const d = new Date(desdeDate)
    d.setDate(d.getDate() + i)
    const fecha = d.toISOString().slice(0, 10)
    serieDiaria.push({ fecha, count: conteoPorDia.get(fecha) ?? 0 })
  }

  return NextResponse.json({
    paciente: { id: pacienteId, nombre: paciente.nombre },
    ventana,
    rango: { desde: desdeStr, hasta: hoyStr },
    adherenciaPct,
    totalRegistrado,
    totalEsperado,
    adherenciaPorTiempo,
    topFavoritas,
    opcionesNoElegidas,
    diversidadCocinas,
    cocinasDistintas: Array.from(cocinasDistintas),
    serieDiaria,
  })
}
