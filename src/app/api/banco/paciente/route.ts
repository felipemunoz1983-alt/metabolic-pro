/**
 * GET /api/banco/paciente
 *
 * Devuelve el banco del paciente autenticado:
 *   - Su último plan generado
 *   - Por cada tiempo de comida: las opciones del banco, ordenadas por rotación
 *     (las que NO ha comido en los últimos N días primero)
 *   - Lo que ya registró hoy (para mostrar checks visuales)
 *
 * Algoritmo de rotación:
 *   - Para cada opción, calcular cuántos días han pasado desde la última vez
 *     que la comió (basado en registros_opciones)
 *   - Si nunca la comió → priority infinito (aparece primero)
 *   - La opción con priority más alto es "lo que toca hoy"
 *
 * Auth: paciente.
 * No se valida role explícitamente — basta con que esté logueado y vea SU plan.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-server'
import { createServiceClient } from '@/lib/supabase-server'
import { obtenerPlan } from '@/lib/repositorioPlanes'
import type { OpcionPreparacion } from '@/types/banco'

interface RegistroOpcionDB {
  id: string
  fecha: string
  tiempo_comida: string
  opcion_nombre: string
  created_at: string
}

interface OpcionConPriority extends OpcionPreparacion {
  /** Días desde la última vez que se comió esta opción. null = nunca. */
  diasDesdeUltimoConsumo: number | null
  /** True si es la sugerencia "lo que toca hoy" para este tiempo. */
  esSugerencia: boolean
}

interface ComidaPaciente {
  tipo: string
  kcal?: number
  macros?: { proteina_g: number; carbohidrato_g: number; grasa_g: number }
  opciones: OpcionConPriority[]
  /** Opción ya consumida hoy en este tiempo (si la hay). */
  consumidoHoy: { opcion_nombre: string; registro_id: string } | null
}

/** Calcula días desde la última vez que se sirvió una opción, según registros. */
function diasDesde(
  opcion: OpcionPreparacion,
  tiempo: string,
  registros: RegistroOpcionDB[],
  hoy: Date,
): number | null {
  const matches = registros.filter(
    r => r.tiempo_comida === tiempo && r.opcion_nombre === opcion.nombre,
  )
  if (matches.length === 0) return null
  // Ordenar desc por fecha — la más reciente primero
  const ultima = matches.sort((a, b) => b.fecha.localeCompare(a.fecha))[0]
  const ultimaDate = new Date(ultima.fecha + 'T12:00:00')
  const ms = hoy.getTime() - ultimaDate.getTime()
  return Math.floor(ms / (24 * 60 * 60 * 1000))
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  // 1. Auth
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sb = createServiceClient()

  // 2. Obtener último plan del paciente
  const { data: planes, error: errPlanes } = await sb
    .from('planes_nutricionales')
    .select('id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)

  if (errPlanes) {
    return NextResponse.json({ error: errPlanes.message }, { status: 500 })
  }
  if (!planes || planes.length === 0) {
    return NextResponse.json({
      hasPlan: false,
      message: 'Aún no tienes un plan asignado. Tu profesional te avisará cuando esté listo.',
    })
  }

  const planId = planes[0].id as string

  // 3. Resolver plan completo con sus tiempos y opciones (vía repositorio)
  let plan
  try {
    plan = await obtenerPlan(planId)
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
  if (!plan) {
    return NextResponse.json({ error: 'Plan no encontrado' }, { status: 404 })
  }

  // 4. Cargar registros recientes del paciente (últimos 14 días)
  const haceDosSemanas = new Date()
  haceDosSemanas.setDate(haceDosSemanas.getDate() - 14)
  const hace14d = haceDosSemanas.toISOString().slice(0, 10)

  const { data: registrosDb } = await sb
    .from('registros_opciones')
    .select('id, fecha, tiempo_comida, opcion_nombre, created_at')
    .eq('user_id', user.id)
    .gte('fecha', hace14d)
    .order('fecha', { ascending: false })

  const registros = (registrosDb ?? []) as RegistroOpcionDB[]

  // 5. Hoy (timezone Chile — UTC-3/4 según horario verano. Usamos UTC para
  //    simplicidad; ajustar a getDateCL si quieres precisión absoluta).
  const hoyDate = new Date()
  const hoy = hoyDate.toISOString().slice(0, 10)
  const registrosHoy = registros.filter(r => r.fecha === hoy)

  // 6. Para cada tiempo, ordenar opciones por rotación
  const comidas: ComidaPaciente[] = plan.tiempos_comida.map(tiempo => {
    // Calcular priority por opción
    const opcionesConPriority: OpcionConPriority[] = tiempo.opciones.map(op => {
      const dias = diasDesde(op, tiempo.tipo, registros, hoyDate)
      return {
        ...op,
        diasDesdeUltimoConsumo: dias,
        esSugerencia: false,
      }
    })

    // Ordenar: las que NUNCA se han comido primero (null tiene mayor priority),
    // después las más antiguas (más días sin comerlas).
    opcionesConPriority.sort((a, b) => {
      if (a.diasDesdeUltimoConsumo === null && b.diasDesdeUltimoConsumo === null) return 0
      if (a.diasDesdeUltimoConsumo === null) return -1
      if (b.diasDesdeUltimoConsumo === null) return 1
      return b.diasDesdeUltimoConsumo - a.diasDesdeUltimoConsumo
    })

    // La primera es la sugerencia de hoy
    if (opcionesConPriority.length > 0) {
      opcionesConPriority[0].esSugerencia = true
    }

    // ¿Ya consumió algo en este tiempo hoy?
    const yaConsumido = registrosHoy.find(r => r.tiempo_comida === tiempo.tipo)

    return {
      tipo: tiempo.tipo,
      kcal: tiempo.kcal,
      macros: {
        proteina_g:     tiempo.macros.proteina_g,
        carbohidrato_g: tiempo.macros.carbohidrato_g,
        grasa_g:        tiempo.macros.grasa_g,
      },
      opciones: opcionesConPriority,
      consumidoHoy: yaConsumido
        ? { opcion_nombre: yaConsumido.opcion_nombre, registro_id: yaConsumido.id }
        : null,
    }
  })

  return NextResponse.json({
    hasPlan: true,
    planId,
    comidas,
    fechaHoy: hoy,
  })
}
