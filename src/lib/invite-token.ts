/**
 * src/lib/invite-token.ts — Tokens de invitación profesional → paciente.
 *
 * Formato: `<base64url(payload-json)>.<base64url(hmac-sha256)>`
 *   payload = { pid: <professionalId>, exp: <unix-seconds>, iat: <unix-seconds> }
 *   firma   = HMAC-SHA256(payload) con secret = process.env.INVITE_TOKEN_SECRET
 *
 * Diseñado para no requerir DB:
 *  - El profesional pide un token (vía /api/invites/create) → server firma con secret
 *  - El paciente abre el link → server verifica firma + exp (vía /api/invites/redeem)
 *  - 24h de validez por defecto. Después se invalida automáticamente.
 *
 * Si INVITE_TOKEN_SECRET no está definido en el entorno, sign() lanza error y
 * verify() devuelve null. Esto permite que el sistema siga funcionando con el
 * formato legacy ?pro=<base64> mientras se configura el secret en Vercel.
 *
 * Server-only — usa node:crypto (no compatible con browser).
 */
import { createHmac, timingSafeEqual } from 'crypto'

const DEFAULT_TTL_SECONDS = 24 * 60 * 60 // 24h

function b64urlEncode(data: Buffer | string): string {
  const buf = typeof data === 'string' ? Buffer.from(data, 'utf8') : data
  return buf.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function b64urlDecodeToBuffer(s: string): Buffer | null {
  try {
    let padded = s.replace(/-/g, '+').replace(/_/g, '/')
    while (padded.length % 4) padded += '='
    return Buffer.from(padded, 'base64')
  } catch {
    return null
  }
}

interface InvitePayload {
  /** professionalId (UUID del profesional invitante) */
  pid: string
  /** Expiration (unix seconds) */
  exp: number
  /** Issued at (unix seconds) */
  iat: number
}

/**
 * Firma un token de invitación. Throws si INVITE_TOKEN_SECRET no está seteado.
 * @param professionalId  UUID del profesional
 * @param ttlSeconds      Validez en segundos. Default: 24h.
 */
export function signInviteToken(professionalId: string, ttlSeconds = DEFAULT_TTL_SECONDS): string {
  const secret = process.env.INVITE_TOKEN_SECRET
  if (!secret || secret.length < 16) {
    throw new Error('INVITE_TOKEN_SECRET not configured (must be at least 16 chars)')
  }
  const now = Math.floor(Date.now() / 1000)
  const payload: InvitePayload = { pid: professionalId, exp: now + ttlSeconds, iat: now }
  const b64payload = b64urlEncode(JSON.stringify(payload))
  const sig = createHmac('sha256', secret).update(b64payload).digest()
  return `${b64payload}.${b64urlEncode(sig)}`
}

/**
 * Verifica firma y expiración de un token. Devuelve el payload si es válido,
 * null si la firma es incorrecta, el token está mal formado, o expiró.
 */
export function verifyInviteToken(token: string): InvitePayload | null {
  const secret = process.env.INVITE_TOKEN_SECRET
  if (!secret) return null

  const parts = token.split('.')
  if (parts.length !== 2) return null
  const [b64payload, b64sig] = parts

  // Verificar firma (timing-safe)
  const expectedSig = createHmac('sha256', secret).update(b64payload).digest()
  const providedSig = b64urlDecodeToBuffer(b64sig)
  if (!providedSig || providedSig.length !== expectedSig.length) return null
  if (!timingSafeEqual(expectedSig, providedSig)) return null

  // Decodificar payload
  const payloadBuf = b64urlDecodeToBuffer(b64payload)
  if (!payloadBuf) return null
  let payload: InvitePayload
  try {
    const parsed = JSON.parse(payloadBuf.toString('utf8'))
    if (typeof parsed.pid !== 'string' || typeof parsed.exp !== 'number' || typeof parsed.iat !== 'number') {
      return null
    }
    payload = parsed as InvitePayload
  } catch {
    return null
  }

  // Validar expiración
  if (payload.exp < Math.floor(Date.now() / 1000)) return null

  return payload
}

/**
 * Lee SIN VERIFICAR el payload — útil sólo en el cliente para mostrar
 * "Te invita Dr. X" antes de redimir. La verificación real ocurre en el server.
 * No usar para autorizar nada.
 */
export function readInvitePayloadUnsafe(token: string): { pid: string; exp: number } | null {
  const parts = token.split('.')
  if (parts.length !== 2) return null
  try {
    let padded = parts[0].replace(/-/g, '+').replace(/_/g, '/')
    while (padded.length % 4) padded += '='
    const json = typeof atob !== 'undefined'
      ? atob(padded)
      : Buffer.from(padded, 'base64').toString('utf8')
    const payload = JSON.parse(json)
    if (typeof payload.pid !== 'string' || typeof payload.exp !== 'number') return null
    return { pid: payload.pid, exp: payload.exp }
  } catch {
    return null
  }
}
