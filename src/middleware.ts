/**
 * Edge Middleware — corre antes de cualquier route handler.
 *
 * Propósito principal: interceptar requests con payloads excesivos a /api/food-scan
 * ANTES de que Vercel los rechace con su 413 plain-text "Request Entity Too Large".
 *
 * Sin este middleware, clientes con código viejo (PWA cacheado pre-fix) que envían
 * imágenes sin comprimir reciben un response plano que rompe `res.json()` en el
 * cliente con SyntaxError. Aquí devolvemos un JSON válido y un mensaje útil.
 *
 * Inspeccionamos sólo headers — nunca leemos el body, por lo que el límite de
 * body del runtime Edge no aplica.
 */
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Vercel rechaza payloads >4.5 MB. Dejamos margen y rechazamos en ~4 MB.
const MAX_BODY_BYTES = 4 * 1024 * 1024

export function middleware(req: NextRequest) {
  // Sólo aplicamos a /api/food-scan (única ruta con uploads de imagen grandes)
  if (req.nextUrl.pathname === '/api/food-scan' && req.method === 'POST') {
    const contentLength = req.headers.get('content-length')
    const size = contentLength ? parseInt(contentLength, 10) : 0

    if (size > MAX_BODY_BYTES) {
      return NextResponse.json(
        {
          error: 'La imagen es muy grande. Por favor cierra completamente la app y vuelve a abrirla para cargar la versión actualizada que comprime las imágenes correctamente.',
        },
        { status: 413 },
      )
    }
  }

  return NextResponse.next()
}

export const config = {
  // Sólo corre en /api/food-scan — no afecta el resto de la app
  matcher: ['/api/food-scan'],
}
