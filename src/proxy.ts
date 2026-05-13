import { NextResponse, type NextRequest } from 'next/server'

// Lightweight optimistic check - only reads cookie, no network calls.
// Full auth verification happens in the page component via supabase.auth.getUser().
// See: /docs/app/guides/authentication#optimistic-checks-with-proxy-optional
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // API routes handle their own auth — never block them (Transbank callback has no session)
  if (pathname.startsWith('/api/')) return NextResponse.next()

  const isLoginPage    = pathname.startsWith('/login')
  const isRegisterPage = pathname.startsWith('/register')
  const isAuthPage     = isLoginPage || isRegisterPage

  // Look for any Supabase auth token cookie (set by @supabase/ssr createBrowserClient)
  // Cookie names follow the pattern: sb-<project-ref>-auth-token*
  const allCookies = request.cookies.getAll()
  const hasSession = allCookies.some(
    (c) => c.name.startsWith('sb-') && c.name.includes('-auth-token') && c.value.length > 10
  )

  // Unauthenticated: redirect to login unless already on an auth page
  if (!hasSession && !isAuthPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Authenticated users visiting /login go to app
  // Allow /register so invite links work even when logged in
  if (hasSession && isLoginPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/paciente'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)\$).*)',
  ],
}
