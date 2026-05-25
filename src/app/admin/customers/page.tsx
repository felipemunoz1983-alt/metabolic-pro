/**
 * /admin/customers — Tabla maestra de clientes pagantes (server component).
 *
 * Access control:
 *   1. Must be authenticated → redirect to /login
 *   2. Must be the configured admin email → redirect to /paciente
 *
 * Renders CustomersTable (client component) que fetchea /api/admin/customers
 * y muestra search/filter/sort sobre todos los clientes con info comercial.
 */
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { CustomersTable } from '@/components/admin/CustomersTable'
import { cleanEnv } from '@/lib/clean-env'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'felipe.munoz1983@gmail.com'

export const metadata = {
  title: 'Clientes — Admin · Centro Metabólico Pro',
  robots: { index: false, follow: false },
}

export default async function AdminCustomersPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL),
    cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    { cookies: { getAll: () => cookieStore.getAll() } }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  if (user.email !== ADMIN_EMAIL) {
    redirect('/paciente')
  }

  return (
    <main className="min-h-screen bg-[#F0F6FA]">
      <CustomersTable />
    </main>
  )
}
