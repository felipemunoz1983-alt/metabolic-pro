/**
 * /admin — Admin dashboard page (server component).
 *
 * Access control:
 *   1. Must be authenticated → redirect to /login
 *   2. Must be the configured admin email → redirect to /paciente (or 404)
 *
 * Renders AdminDashboard (client component) which fetches /api/admin/stats.
 */
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { AdminDashboard } from '@/components/admin/AdminDashboard'
import { cleanEnv } from '@/lib/clean-env'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'felipe.munoz1983@gmail.com'

export const metadata = {
  title: 'Admin — Centro Metabólico Pro',
  robots: { index: false, follow: false },
}

export default async function AdminPage() {
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
    <main className="min-h-screen bg-gray-50">
      <AdminDashboard />
    </main>
  )
}
