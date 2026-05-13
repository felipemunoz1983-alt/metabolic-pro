import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()

  // Only guard the /paciente route
  if (!req.nextUrl.pathname.startsWith('/paciente')) return res

  const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  // Create a Supabase client that reads/writes cookies
  const supabase = createServerClient(supabaseUrl, supabaseAnon, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) => {
          res.cookies.set(name, value, options)
        })
      },
    },
  })

  // 1. Check auth session
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // 2. Check profile exists
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .single()

  if (!profile) {
    // Sign out and redirect to register
    const redirectRes = NextResponse.redirect(new URL('/register?reason=no_profile', req.url))
    // Clear auth cookies so the user is truly logged out
    req.cookies.getAll().forEach(cookie => {
      if (cookie.name.includes('supabase') || cookie.name.includes('sb-')) {
        redirectRes.cookies.delete(cookie.name)
      }
    })
    return redirectRes
  }

  return res
}

export const config = {
  matcher: ['/paciente/:path*'],
}
