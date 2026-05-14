/**
 * Shared mailer helper — Resend API (primary) with Gmail SMTP fallback.
 *
 * Required env vars (Resend):
 *   RESEND_API_KEY      — API key from resend.com
 *   RESEND_FROM_EMAIL   — verified sender address (e.g. no-reply@centrometabolico.cl)
 *
 * Optional fallback (Gmail SMTP — only used if Resend vars are absent):
 *   GMAIL_USER         — tu correo Gmail
 *   GMAIL_APP_PASSWORD — contraseña de aplicacion generada en Google Account
 *
 * Si ninguno está configurado, sendMail() retorna { skipped: true } sin error.
 */
import { Resend } from 'resend'

export interface MailOptions {
  to: string
  subject: string
  html: string
}

export interface MailResult {
  ok: boolean
  skipped?: boolean
  error?: string
}

export async function sendMail(opts: MailOptions): Promise<MailResult> {
  const resendKey  = process.env.RESEND_API_KEY
  const resendFrom = process.env.RESEND_FROM_EMAIL

  // ── Resend (primary) ────────────────────────────────────────────────────────
  if (resendKey) {
    try {
      const resend = new Resend(resendKey)

      // Try configured from address first; fall back to Resend's verified test sender
      const fromAddresses = resendFrom
        ? [resendFrom, 'Centro Metabólico Pro <onboarding@resend.dev>']
        : ['Centro Metabólico Pro <onboarding@resend.dev>']

      let lastError: string | undefined
      for (const from of fromAddresses) {
        const { error } = await resend.emails.send({
          from,
          to:      opts.to,
          subject: opts.subject,
          html:    opts.html,
        })
        if (!error) return { ok: true }
        lastError = error.message
        console.warn(`[mailer] Resend failed with from=${from}:`, error.message)
      }

      console.error('[mailer] All Resend senders failed:', lastError)
      return { ok: false, error: lastError }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error('[mailer] Resend exception:', message)
      return { ok: false, error: message }
    }
  }

  // ── Gmail SMTP fallback (nodemailer) ────────────────────────────────────────
  const gmailUser = process.env.GMAIL_USER
  const gmailPass = process.env.GMAIL_APP_PASSWORD

  if (gmailUser && gmailPass) {
    try {
      const nodemailer = await import('nodemailer')
      const transporter = nodemailer.default.createTransport({
        service: 'gmail',
        auth: { user: gmailUser, pass: gmailPass },
      })
      const fromName = process.env.MAIL_FROM_NAME ?? 'Centro Metabolico Pro'
      await transporter.sendMail({
        from:    `"${fromName}" <${gmailUser}>`,
        to:      opts.to,
        subject: opts.subject,
        html:    opts.html,
      })
      return { ok: true }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error('[mailer] Gmail error:', message)
      return { ok: false, error: message }
    }
  }

  // ── No credentials configured ───────────────────────────────────────────────
  console.warn('[mailer] No email credentials configured — skipping email send')
  return { ok: true, skipped: true }
}
