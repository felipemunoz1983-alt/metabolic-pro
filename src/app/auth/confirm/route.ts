import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { cleanEnv } from '@/lib/clean-env'

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
      cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL),
      cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
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

    // OTP types: 'email' (signup confirm), 'recovery' (password reset), 'magiclink', etc.
    const { data, error } = await supabase.auth.verifyOtp({
      type: type as 'email' | 'recovery',
      token_hash,
    })

    if (!error && data.user) {
      // Password recovery → send to the set-new-password page
      if (type === 'recovery') {
        return NextResponse.redirect(new URL('/reset-password', request.url))
      }
      // Email confirmation → send to paciente (or the next param)
      // Do NOT create profile here — localStorage invite data lives in the browser
      // and is only accessible client-side. Profile creation happens in
      // paciente/page.tsx (or login/page.tsx) where localStorage can be read.
      return NextResponse.redirect(new URL(next, request.url))
    }
  }

  // Error — redirect to login with message
  return NextResponse.redirect(new URL('/login?error=confirm_failed', request.url))
}
