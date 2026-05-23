/**
 * Helper centralizado para limpiar variables de entorno antes de usarlas como
 * HTTP headers (típicamente la anon key de Supabase en `Authorization: Bearer ...`).
 *
 * Causa del bug: si Felipe (o cualquiera) pegó la env var en Vercel desde un
 * editor con UTF-8 BOM (Windows Notepad, PowerShell, etc.), se cuela un BOM
 * invisible (U+FEFF, decimal 65279) al inicio o en medio del valor. Cuando el
 * SDK de Supabase intenta construir `Authorization: Bearer <key>` con esa key
 * contaminada, fetch lanza:
 *
 *   TypeError: Cannot convert argument to a ByteString because the character
 *              at index 0 has a value of 65279 which is greater than 255.
 *
 * porque los headers HTTP solo aceptan ASCII puro (0-127).
 *
 * `cleanEnv()` strip-ea:
 *   - U+FEFF (BOM)
 *   - U+200B, U+200C, U+200D (zero-width spaces)
 *   - U+00A0 (non-breaking space)
 *   - whitespace ASCII normal (trim)
 *
 * Históricamente este helper vivía duplicado dentro de cada archivo que lo
 * necesitaba (auth-server.ts, supabase-server.ts, supabase.ts). Lo movimos
 * acá para que rutas nuevas puedan importarlo sin re-introducir el bug.
 */
export function cleanEnv(s: string | undefined | null): string {
  if (!s) return ''
  return s
    .replace(/[﻿​‌‍ ]/g, '')
    .trim()
}
