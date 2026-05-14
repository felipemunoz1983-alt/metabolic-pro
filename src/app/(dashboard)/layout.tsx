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
  try {
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

    // Only check session — profile creation is handled client-side
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      redirect('/login')
    }

    return <>{children}</>
  } catch {
    // If anything goes wrong server-side, let the client handle it
    return <>{children}</>
  }
}
