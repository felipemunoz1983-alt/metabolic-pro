/**
 * Server-side Firebase Cloud Messaging helper.
 * Uses firebase-admin to deliver notifications to FCM registration tokens.
 *
 * Convive con src/lib/push.ts (Web Push / VAPID). FCM es un segundo transporte:
 * los dispositivos que registran un token FCM (src/lib/firebase-messaging.ts)
 * reciben por esta vía; los que sólo tienen una PushSubscription clásica reciben
 * por web-push. `sendPushToUser` (push.ts) dispara AMBOS.
 *
 * Required env vars (server-only, SECRETAS):
 *   FIREBASE_SERVICE_ACCOUNT   — JSON completo del service account (string).
 *                                Alternativa a las tres de abajo.
 *   — o bien —
 *   FIREBASE_PROJECT_ID        — desde la consola de Firebase
 *   FIREBASE_CLIENT_EMAIL      — del service account
 *   FIREBASE_PRIVATE_KEY       — del service account (con \n escapados o reales)
 *
 * Si no hay credenciales, todas las funciones hacen no-op silencioso (igual que
 * push.ts cuando faltan las VAPID keys), para que el deploy no rompa.
 */
import type { App } from 'firebase-admin/app'
import type { Messaging } from 'firebase-admin/messaging'

export interface FcmPayload {
  title: string
  body:  string
  url?:  string
  tag?:  string
  icon?: string
}

export interface FcmTokenRow {
  id?:    string
  token:  string
}

let adminApp: App | null = null
let messaging: Messaging | null = null
let initAttempted = false

/**
 * Construye las credenciales desde env. Devuelve null si no están configuradas.
 */
function readServiceAccount(): { projectId: string; clientEmail: string; privateKey: string } | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT
  if (raw) {
    try {
      const parsed = JSON.parse(raw)
      const projectId   = parsed.project_id   || parsed.projectId
      const clientEmail = parsed.client_email || parsed.clientEmail
      const privateKey  = (parsed.private_key || parsed.privateKey || '').replace(/\\n/g, '\n')
      if (projectId && clientEmail && privateKey) {
        return { projectId, clientEmail, privateKey }
      }
    } catch (err) {
      console.error('[fcm] FIREBASE_SERVICE_ACCOUNT no es JSON válido:', err)
    }
  }

  const projectId   = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  // La private key suele pegarse con \n literales en los dashboards (Vercel).
  const privateKey  = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')

  if (projectId && clientEmail && privateKey) {
    return { projectId, clientEmail, privateKey }
  }
  return null
}

/**
 * Inicializa firebase-admin de forma perezosa (sólo cuando se va a enviar).
 * Importa firebase-admin con dynamic import para no penalizar el cold-start de
 * las rutas que sólo usan web-push.
 */
async function ensureMessaging(): Promise<Messaging | null> {
  if (messaging) return messaging
  if (initAttempted) return messaging // ya falló antes, no reintentar en este runtime

  initAttempted = true
  const creds = readServiceAccount()
  if (!creds) {
    console.warn('[fcm] Firebase admin no configurado — FCM deshabilitado')
    return null
  }

  try {
    const { getApps, initializeApp, cert } = await import('firebase-admin/app')
    const { getMessaging } = await import('firebase-admin/messaging')

    // Reusar la app si ya existe (hot-reload en dev, múltiples imports).
    const existing = getApps()
    adminApp = existing.length > 0
      ? existing[0]
      : initializeApp({
          credential: cert({
            projectId:   creds.projectId,
            clientEmail: creds.clientEmail,
            privateKey:  creds.privateKey,
          }),
        })

    messaging = getMessaging(adminApp)
    return messaging
  } catch (err) {
    console.error('[fcm] init firebase-admin falló:', err)
    return null
  }
}

/**
 * Envía una notificación a un token FCM.
 * Devuelve { ok: true } en éxito, { ok: false, gone: true } cuando el token ya
 * no es válido (debe borrarse de la DB).
 */
export async function sendFcm(
  token: string,
  payload: FcmPayload,
): Promise<{ ok: boolean; gone?: boolean; error?: string }> {
  const m = await ensureMessaging()
  if (!m) return { ok: true } // no configurado → skip silencioso

  const url = payload.url || '/paciente?tab=dashboard'

  try {
    await m.send({
      token,
      // `notification` para que el SO la muestre incluso sin handler;
      // `data` para que firebase-messaging-sw.js / onMessage puedan rutear.
      notification: {
        title: payload.title,
        body:  payload.body,
      },
      data: {
        url,
        tag:  payload.tag  || 'cmp',
        icon: payload.icon || '/icon-192.png',
      },
      webpush: {
        notification: {
          icon:  payload.icon || '/icon-192.png',
          badge: '/icon-192.png',
          tag:   payload.tag || 'cmp',
        },
        fcmOptions: { link: url },
      },
    })
    return { ok: true }
  } catch (err: unknown) {
    const code = (err as { code?: string; errorInfo?: { code?: string } })?.code
      || (err as { errorInfo?: { code?: string } })?.errorInfo?.code
    // Tokens muertos → el caller debe borrarlos.
    if (
      code === 'messaging/registration-token-not-registered' ||
      code === 'messaging/invalid-registration-token' ||
      code === 'messaging/invalid-argument'
    ) {
      return { ok: false, gone: true }
    }
    const message = err instanceof Error ? err.message : String(err)
    console.error('[fcm] send error:', message)
    return { ok: false, error: message }
  }
}

/**
 * Envía a todos los tokens FCM de un usuario y limpia los que estén muertos.
 */
export async function sendFcmToUser(
  supabase: ReturnType<typeof import('@/lib/supabase-server').createServiceClient>,
  userId: string,
  payload: FcmPayload,
): Promise<{ sent: number; removed: number }> {
  const m = await ensureMessaging()
  if (!m) return { sent: 0, removed: 0 } // no configurado → no tocar la DB

  const { data: tokens } = await supabase
    .from('fcm_tokens')
    .select('id, token')
    .eq('user_id', userId)

  if (!tokens || tokens.length === 0) return { sent: 0, removed: 0 }

  let sent = 0
  const deadIds: string[] = []

  await Promise.all(
    tokens.map(async (row: { id: string; token: string }) => {
      const result = await sendFcm(row.token, payload)
      if (result.ok) sent++
      else if (result.gone) deadIds.push(row.id)
    })
  )

  if (deadIds.length > 0) {
    await supabase.from('fcm_tokens').delete().in('id', deadIds)
  }

  return { sent, removed: deadIds.length }
}

/** True si hay credenciales de FCM configuradas (para diagnósticos/health). */
export function isFcmConfigured(): boolean {
  return readServiceAccount() !== null
}
