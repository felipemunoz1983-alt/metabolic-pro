import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

// Server-side auth guard for all routes inside (dashboard)
// Runs on the server BEFORE the page is sent to the browser — no flash possible.
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
      },
    }
  )

  // 1. No auth session → login
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // 2. Auth user exists but no profile row → kick out
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()   // maybeSingle returns null (not error) when 0 rows

  if (!profile) {
    await supabase.auth.signOut()
    redirect('/register?reason=no_profile')
  }

  return <>{children}</>
}
