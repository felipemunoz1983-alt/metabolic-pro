/**
 * Server-side push notification helper.
 * Uses web-push with VAPID authentication.
 *
 * Required env vars:
 *   VAPID_PUBLIC_KEY   — from `npx web-push generate-vapid-keys`
 *   VAPID_PRIVATE_KEY  — from `npx web-push generate-vapid-keys`
 *   VAPID_SUBJECT      — mailto:tu@email.com  (or https://centrometabolico.cl)
 */
import webpush from 'web-push'

export interface PushPayload {
  title: string
  body:  string
  url?:  string
  tag?:  string
  icon?: string
}

export interface PushSubscriptionRow {
  endpoint: string
  p256dh:   string
  auth:     string
}

let vapidConfigured = false

function ensureVapid() {
  if (vapidConfigured) return true

  const pub  = process.env.VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  const subj = process.env.VAPID_SUBJECT || 'mailto:no-reply@centrometabolico.cl'

  if (!pub || !priv) {
    console.warn('[push] VAPID keys not configured — push notifications disabled')
    return false
  }

  webpush.setVapidDetails(subj, pub, priv)
  vapidConfigured = true
  return true
}

/**
 * Send a push notification to one subscription.
 * Returns { ok: true } on success, { ok: false, gone: true } when the
 * subscription is expired (410 Gone → should be deleted from DB).
 */
export async function sendPush(
  sub: PushSubscriptionRow,
  payload: PushPayload,
): Promise<{ ok: boolean; gone?: boolean; error?: string }> {
  if (!ensureVapid()) return { ok: true } // silently skip if VAPID not configured

  const pushSub = {
    endpoint: sub.endpoint,
    keys: { p256dh: sub.p256dh, auth: sub.auth },
  }

  try {
    await webpush.sendNotification(pushSub, JSON.stringify({
      title: payload.title,
      body:  payload.body,
      url:   payload.url  || '/paciente',
      tag:   payload.tag  || 'cmp',
      icon:  payload.icon || '/icon-192.svg',
    }))
    return { ok: true }
  } catch (err: unknown) {
    const statusCode = (err as { statusCode?: number }).statusCode
    if (statusCode === 410 || statusCode === 404) {
      // Subscription expired — caller should delete it
      return { ok: false, gone: true }
    }
    const message = err instanceof Error ? err.message : String(err)
    console.error('[push] sendNotification error:', message)
    return { ok: false, error: message }
  }
}

/**
 * Send a push to all subscriptions for a user.
 * Automatically removes expired subscriptions from the DB.
 */
export async function sendPushToUser(
  supabase: ReturnType<typeof import('@/lib/supabase-server').createServiceClient>,
  userId: string,
  payload: PushPayload,
): Promise<{ sent: number; removed: number }> {
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', userId)

  if (!subs || subs.length === 0) return { sent: 0, removed: 0 }

  let sent = 0
  const expiredIds: string[] = []

  await Promise.all(
    subs.map(async sub => {
      const result = await sendPush({ endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth }, payload)
      if (result.ok) {
        sent++
      } else if (result.gone) {
        expiredIds.push(sub.id)
      }
    })
  )

  // Clean up expired subscriptions
  if (expiredIds.length > 0) {
    await supabase.from('push_subscriptions').delete().in('id', expiredIds)
  }

  return { sent, removed: expiredIds.length }
}
