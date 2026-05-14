import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

// Handles Supabase email confirmation redirect
// Supabase sends users to /auth/confirm?token_hash=...&type=email
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const next = searchParams.get('next') ?? '/paciente'

  if (token_hash && type) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    const { data, error } = await supabase.auth.verifyOtp({ type: type as 'email', token_hash })

    if (!error && data.user) {
      // Do NOT create profile here — sessionStorage-based invite data lives in the
      // browser and is only accessible client-side. Profile creation happens in
      // paciente/page.tsx (or login/page.tsx) where sessionStorage can be read.
      return NextResponse.redirect(new URL(next, request.url))
    }
  }

  // Error — redirect to login with message
  return NextResponse.redirect(new URL('/login?error=confirm_failed', request.url))
}
