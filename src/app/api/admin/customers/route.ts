/**
 * GET /api/admin/customers
 *
 * Devuelve la tabla maestra de clientes pagantes con toda su info comercial.
 *
 * Un "cliente" es cualquier profile que cumpla:
 *   - tiene plan != 'gratuito' (suscripción activa o expirada), O
 *   - tiene al menos 1 pago aprobado en la tabla payments
 *
 * Por cada uno calcula: nombre, email, plan actual, fecha del primer pago,
 * fecha del último pago, lifetime value (suma todos los pagos), próximo
 * vencimiento, status (activo/expirado), cantidad de pagos.
 *
 * Protegido: solo accesible por ADMIN_EMAIL. Usa service client (bypass RLS).
 *
 * Query params (opcionales):
 *   status=active|expired|all  (default: all)
 *   sort=ltv|recent|expiring   (default: ltv)
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { getAuthUser } from '@/lib/auth-server'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'felipe.munoz1983@gmail.com'

interface CustomerRow {
  id:           string
  nombre:       string
  email:        string
  plan:         string
  firstPayAt:   string | null
  lastPayAt:    string | null
  ltv:          number
  paymentCount: number
  premiumUntil: string | null
  status:       'active' | 'expired' | 'never_paid'
  role:         string
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const user = await getAuthUser()
  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const params      = req.nextUrl.searchParams
  const statusFilter = params.get('status') ?? 'all'   // active | expired | all
  const sortKey      = params.get('sort')   ?? 'ltv'   // ltv | recent | expiring

  const supabase = createServiceClient()
  const now = new Date()

  const [{ data: profilesRaw }, { data: paymentsRaw }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, nombre, email, role, plan, premium_until, created_at'),
    supabase
      .from('payments')
      .select('user_id, amount, created_at, status')
      .eq('status', 'approved')
      .order('created_at', { ascending: true }),
  ])

  const profiles = profilesRaw ?? []
  const payments = paymentsRaw ?? []

  // Agregar pagos por user_id en un solo pase
  const aggByUser: Record<string, {
    ltv:          number
    paymentCount: number
    firstPayAt:   string
    lastPayAt:    string
  }> = {}

  payments.forEach(p => {
    if (!p.user_id) return
    const existing = aggByUser[p.user_id]
    if (!existing) {
      aggByUser[p.user_id] = {
        ltv:          p.amount ?? 0,
        paymentCount: 1,
        firstPayAt:   p.created_at,
        lastPayAt:    p.created_at,
      }
    } else {
      existing.ltv          += p.amount ?? 0
      existing.paymentCount += 1
      // payments viene ordenado ASC por created_at, así que lastPayAt va creciendo
      existing.lastPayAt    = p.created_at
    }
  })

  // Construir filas: cualquier profile con plan != 'gratuito' O con pagos
  const rows: CustomerRow[] = profiles
    .filter(p => {
      const hasPay = !!aggByUser[p.id]
      const hasPlan = p.plan && p.plan !== 'gratuito'
      return hasPay || hasPlan
    })
    .map(p => {
      const agg = aggByUser[p.id]
      const isActive = !!(p.premium_until && new Date(p.premium_until) > now)
      const status: CustomerRow['status'] = agg
        ? (isActive ? 'active' : 'expired')
        : 'never_paid'   // tiene plan no-gratuito pero sin payment row (trial sin pago)

      return {
        id:           p.id,
        nombre:       p.nombre ?? '—',
        email:        p.email  ?? '—',
        plan:         p.plan   ?? '—',
        firstPayAt:   agg?.firstPayAt   ?? null,
        lastPayAt:    agg?.lastPayAt    ?? null,
        ltv:          agg?.ltv          ?? 0,
        paymentCount: agg?.paymentCount ?? 0,
        premiumUntil: p.premium_until,
        status,
        role:         p.role ?? '—',
      }
    })

  // Filtro por status
  const filtered = statusFilter === 'all'
    ? rows
    : rows.filter(r => r.status === statusFilter)

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    if (sortKey === 'recent') {
      const aLast = a.lastPayAt ? new Date(a.lastPayAt).getTime() : 0
      const bLast = b.lastPayAt ? new Date(b.lastPayAt).getTime() : 0
      return bLast - aLast
    }
    if (sortKey === 'expiring') {
      // Próximo a expirar primero (los activos)
      const aExp = a.premiumUntil ? new Date(a.premiumUntil).getTime() : Infinity
      const bExp = b.premiumUntil ? new Date(b.premiumUntil).getTime() : Infinity
      return aExp - bExp
    }
    // Default: ltv desc
    return b.ltv - a.ltv
  })

  // Totales resumidos para el header de la tabla
  const summary = {
    totalCustomers: sorted.length,
    totalLTV:       sorted.reduce((s, r) => s + r.ltv, 0),
    activeCount:    sorted.filter(r => r.status === 'active').length,
    expiredCount:   sorted.filter(r => r.status === 'expired').length,
  }

  return NextResponse.json({
    summary,
    customers: sorted,
    filters: { status: statusFilter, sort: sortKey },
  })
}
