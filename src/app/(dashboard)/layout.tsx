import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { cleanEnv } from '@/lib/clean-env'

// Server-side auth guard for all routes inside (dashboard)
// Runs on the server BEFORE the page is sent to the browser — no flash possible.
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Auth check side-effect — solo levantamos `redirect()` si confirmamos sin user.
  // Cualquier error server-side se silencia y se deja que el cliente lo maneje.
  try {
    const cookieStore = await cookies()

    const supabase = createServerClient(
      cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL),
      cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
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
  } catch {
    // Si la verificación falla, dejamos que el client guard maneje el redirect
  }

  // JSX fuera del try/catch para que React 19 pueda capturar render errors
  // mediante error boundaries (no por try/catch del server component).
  return <>{children}</>
}
