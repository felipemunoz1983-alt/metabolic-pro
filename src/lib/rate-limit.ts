/**
 * Rate limiting in-memory para endpoints expensivos (Anthropic, Vision).
 *
 * Diseño:
 * - Bucket por (userId, endpoint). Counter + timestamp del primer hit del bucket.
 * - Sliding window simple: cuando el bucket cumple `windowMs`, se resetea.
 * - LRU cap: máx 10k buckets en memoria. Si se llena, se purgan los más viejos.
 *
 * Limitaciones (asumidas y aceptadas para MVP):
 * - En Vercel serverless cada lambda tiene su propia memoria → un atacante
 *   con muchos warmed-up workers podría bypass parcial. Riesgo real bajo
 *   porque Vercel reusa instancias.
 * - Reinicio de lambda resetea los buckets → atacante recupera quota. No es
 *   ideal pero el protected resource (Anthropic API) tiene su propio rate
 *   limit a nivel de cuenta como segundo gate.
 *
 * Para producción con muchos usuarios reales:
 * - Migrar a Upstash Redis (drop-in, $0 hasta 10k req/día).
 * - O tabla Supabase `api_rate_limits` (SQL en supabase/api-rate-limits.sql).
 */

interface Bucket {
  count: number
  firstHitMs: number
}

interface RateLimitConfig {
  windowMs: number   // duración de la ventana
  max: number        // requests máximas dentro de la ventana
}

// Map global compartida dentro de la lambda. Cleanup periódico cuando crece.
const buckets = new Map<string, Bucket>()
const MAX_BUCKETS = 10_000

/**
 * Verifica si el request actual está dentro del límite.
 * Devuelve { allowed, remaining, retryAfterSec } — siempre con info útil.
 *
 * @example
 *   const res = checkRateLimit('user-123:chat', { windowMs: 60_000, max: 20 })
 *   if (!res.allowed) return 429 with res.retryAfterSec
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig,
  now: number = Date.now(),
): { allowed: boolean; remaining: number; retryAfterSec: number; resetAtMs: number } {
  // LRU eviction si el map está lleno
  if (buckets.size >= MAX_BUCKETS) {
    // Borrar el primer 10% — orden de inserción mantiene los viejos al inicio
    const toDelete = Math.floor(MAX_BUCKETS * 0.1)
    let i = 0
    for (const k of buckets.keys()) {
      buckets.delete(k)
      if (++i >= toDelete) break
    }
  }

  const bucket = buckets.get(key)

  // Caso 1: nuevo bucket o ventana expirada
  if (!bucket || now - bucket.firstHitMs >= config.windowMs) {
    buckets.set(key, { count: 1, firstHitMs: now })
    return {
      allowed: true,
      remaining: config.max - 1,
      retryAfterSec: 0,
      resetAtMs: now + config.windowMs,
    }
  }

  // Caso 2: ventana activa
  if (bucket.count < config.max) {
    bucket.count++
    return {
      allowed: true,
      remaining: config.max - bucket.count,
      retryAfterSec: 0,
      resetAtMs: bucket.firstHitMs + config.windowMs,
    }
  }

  // Caso 3: límite alcanzado
  const retryAfterMs = bucket.firstHitMs + config.windowMs - now
  return {
    allowed: false,
    remaining: 0,
    retryAfterSec: Math.ceil(retryAfterMs / 1000),
    resetAtMs: bucket.firstHitMs + config.windowMs,
  }
}

/** Limpia el estado interno — utilidad para tests. */
export function _resetRateLimitState(): void {
  buckets.clear()
}

// ─── Presets clínicos ────────────────────────────────────────────────────────
// Límites diseñados para uso normal con margen 2-3× razonable.
// Si un usuario los excede, casi seguro es abuso o bug del cliente.

/** Chat: 20 mensajes / 5 min. Conversación normal pide 5-8 en ese rango. */
export const CHAT_LIMIT: RateLimitConfig = { windowMs: 5 * 60_000, max: 20 }

/** Food scan: 10 escaneos / 5 min. Cargar fotos rápidamente es un caso real
 *  pero no debería pasar de 10 en un sprint de uso normal. */
export const FOOD_SCAN_LIMIT: RateLimitConfig = { windowMs: 5 * 60_000, max: 10 }

/** Hard daily cap para chat: 200 mensajes / día. Top usuarios reales hacen <50. */
export const CHAT_DAILY_LIMIT: RateLimitConfig = { windowMs: 24 * 60 * 60_000, max: 200 }

/** Hard daily cap para food scan: 50 escaneos / día. */
export const FOOD_SCAN_DAILY_LIMIT: RateLimitConfig = { windowMs: 24 * 60 * 60_000, max: 50 }
