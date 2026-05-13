/**
 * Shared mailer helper — Gmail SMTP via nodemailer.
 *
 * Required env vars:
 *   GMAIL_USER         — tu correo Gmail (ej. tucuenta@gmail.com)
 *   GMAIL_APP_PASSWORD — contraseña de aplicacion generada en Google Account
 *
 * Si no estan configurados, sendMail() retorna { skipped: true } sin lanzar error.
 */
import nodemailer from 'nodemailer'

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

let _transporter: nodemailer.Transporter | null = null

function getTransporter(): nodemailer.Transporter | null {
  const user = process.env.GMAIL_USER
  const pass = process.env.GMAIL_APP_PASSWORD

  if (!user || !pass) return null

  if (!_transporter) {
    _transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
    })
  }
  return _transporter
}

export async function sendMail(opts: MailOptions): Promise<MailResult> {
  const transporter = getTransporter()
  if (!transporter) {
    console.warn('[mailer] GMAIL_USER or GMAIL_APP_PASSWORD not set — skipping email')
    return { ok: true, skipped: true }
  }

  const fromName = process.env.MAIL_FROM_NAME ?? 'Centro Metabolico Pro'
  const fromUser = process.env.GMAIL_USER!

  try {
    await transporter.sendMail({
      from: `"${fromName}" <${fromUser}>`,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    })
    return { ok: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[mailer] sendMail error:', message)
    return { ok: false, error: message }
  }
}
