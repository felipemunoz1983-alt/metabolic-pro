/**
 * GET /api/health/deployment
 *
 * Endpoint de auto-diagnóstico para verificar que el deployment está listo.
 * Reporta qué env vars y conexiones críticas faltan SIN exponer secretos.
 *
 * Devuelve un map de checks {key: 'ok' | 'missing' | 'invalid'} + un overall
 * que es 'ready' solo si TODOS los críticos están OK.
 *
 * Auth: el endpoint es PÚBLICO porque sólo reporta presencia/ausencia, nunca
 * el valor. Útil para curl-checks desde Vercel después de un deploy:
 *   curl https://centro-metabolico.vercel.app/api/health/deployment
 *
 * Si quieres restringirlo a admins, agrega un Bearer check con ADMIN_TOKEN.
 */
import { NextResponse } from "next/server";

type Status = "ok" | "missing" | "invalid";

interface Check {
  status: Status;
  required: boolean;
  hint?: string;
}

function present(name: string, opts: { minLength?: number } = {}): Status {
  const v = process.env[name];
  if (!v) return "missing";
  if (opts.minLength && v.length < opts.minLength) return "invalid";
  return "ok";
}

export async function GET() {
  const checks: Record<string, Check> = {
    // ── Supabase (crítico) ────────────────────────────────────────────────────
    NEXT_PUBLIC_SUPABASE_URL: {
      status:   present("NEXT_PUBLIC_SUPABASE_URL"),
      required: true,
      hint:     "URL del proyecto Supabase. Visible para el cliente.",
    },
    NEXT_PUBLIC_SUPABASE_ANON_KEY: {
      status:   present("NEXT_PUBLIC_SUPABASE_ANON_KEY", { minLength: 30 }),
      required: true,
      hint:     "Anon key del proyecto Supabase. Visible para el cliente.",
    },
    SUPABASE_SERVICE_ROLE_KEY: {
      status:   present("SUPABASE_SERVICE_ROLE_KEY", { minLength: 30 }),
      required: true,
      hint:     "Service role — NUNCA cliente. Usada por route handlers que bypassan RLS.",
    },
    SUPABASE_URL: {
      status:   present("SUPABASE_URL"),
      required: true,
      hint:     "Alias server-side de NEXT_PUBLIC_SUPABASE_URL. Puede ser el mismo valor.",
    },

    // ── Anthropic (crítico para skill / banco / chat / scanner) ──────────────
    ANTHROPIC_API_KEY: {
      status:   present("ANTHROPIC_API_KEY", { minLength: 20 }),
      required: true,
      hint:     "API key de Anthropic. Necesaria para la skill preparaciones-culinarias, chat IA y food-scan.",
    },

    // ── Invite token (crítico para flujo de invitación de pacientes) ─────────
    INVITE_TOKEN_SECRET: {
      status:   present("INVITE_TOKEN_SECRET", { minLength: 16 }),
      required: true,
      hint:     "Secret HMAC para firmar los links /register?invite=. Mínimo 16 chars random.",
    },

    // ── Push notifications (importante, no bloqueante) ───────────────────────
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: {
      status:   present("NEXT_PUBLIC_VAPID_PUBLIC_KEY", { minLength: 80 }),
      required: false,
      hint:     "VAPID public key (Web Push). Sin esto, no se envían push al paciente.",
    },
    VAPID_PRIVATE_KEY: {
      status:   present("VAPID_PRIVATE_KEY", { minLength: 30 }),
      required: false,
      hint:     "VAPID private key (server-only).",
    },
    VAPID_SUBJECT: {
      status:   present("VAPID_SUBJECT"),
      required: false,
      hint:     "mailto: o URL del servicio. Ej: mailto:soporte@centrometabolico.cl",
    },

    // ── Firebase Cloud Messaging (segundo transporte de push, opcional) ──────
    NEXT_PUBLIC_FIREBASE_API_KEY: {
      status:   present("NEXT_PUBLIC_FIREBASE_API_KEY"),
      required: false,
      hint:     "Config web pública de Firebase. Sin esto, FCM no se activa (Web Push sigue funcionando).",
    },
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: {
      status:   present("NEXT_PUBLIC_FIREBASE_PROJECT_ID"),
      required: false,
      hint:     "projectId de Firebase (cliente).",
    },
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: {
      status:   present("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"),
      required: false,
      hint:     "messagingSenderId de Firebase (cliente).",
    },
    NEXT_PUBLIC_FIREBASE_APP_ID: {
      status:   present("NEXT_PUBLIC_FIREBASE_APP_ID"),
      required: false,
      hint:     "appId de Firebase (cliente).",
    },
    NEXT_PUBLIC_FIREBASE_VAPID_KEY: {
      status:   present("NEXT_PUBLIC_FIREBASE_VAPID_KEY"),
      required: false,
      hint:     "Web Push certificate (key pair) de Firebase Cloud Messaging → Web.",
    },
    FIREBASE_SERVER_CREDENTIALS: {
      // Acepta el JSON completo O el trío projectId/clientEmail/privateKey.
      status:
        present("FIREBASE_SERVICE_ACCOUNT") === "ok" ||
        (present("FIREBASE_PROJECT_ID") === "ok" &&
          present("FIREBASE_CLIENT_EMAIL") === "ok" &&
          present("FIREBASE_PRIVATE_KEY") === "ok")
          ? "ok"
          : "missing",
      required: false,
      hint:     "Service account (secreto): FIREBASE_SERVICE_ACCOUNT (JSON) o FIREBASE_PROJECT_ID+CLIENT_EMAIL+PRIVATE_KEY. Necesario para ENVIAR por FCM.",
    },

    // ── Email (importante para notificaciones, no bloqueante) ────────────────
    GMAIL_USER: {
      status:   present("GMAIL_USER"),
      required: false,
      hint:     "Email de Gmail desde el que sale el mail transaccional.",
    },
    GMAIL_APP_PASSWORD: {
      status:   present("GMAIL_APP_PASSWORD", { minLength: 10 }),
      required: false,
      hint:     "App-password de Gmail (16 chars). NO la contraseña normal de Gmail.",
    },
    MAIL_FROM_NAME: {
      status:   present("MAIL_FROM_NAME"),
      required: false,
      hint:     "Nombre visible del remitente. Ej: 'Centro Metabólico Pro'",
    },

    // ── Pagos Transbank (solo si vendes online) ──────────────────────────────
    TRANSBANK_COMMERCE_CODE: {
      status:   present("TRANSBANK_COMMERCE_CODE"),
      required: false,
      hint:     "Commerce code de Transbank. Si no está, el upgrade page muestra solo info.",
    },
    TRANSBANK_API_KEY: {
      status:   present("TRANSBANK_API_KEY"),
      required: false,
      hint:     "API key de Transbank.",
    },
    TRANSBANK_ENV: {
      status:   present("TRANSBANK_ENV"),
      required: false,
      hint:     "'integration' o 'production'. Si != 'production' muestra alerta interna.",
    },

    // ── Cron / Admin ─────────────────────────────────────────────────────────
    CRON_SECRET: {
      status:   present("CRON_SECRET", { minLength: 16 }),
      required: false,
      hint:     "Bearer para proteger endpoints de cron y /api/push/send. Genera con: openssl rand -base64 32",
    },

    // ── App URL para emails ──────────────────────────────────────────────────
    NEXT_PUBLIC_APP_URL: {
      status:   present("NEXT_PUBLIC_APP_URL"),
      required: false,
      hint:     "URL pública del proyecto (https://centro-metabolico.vercel.app). Se usa en links de emails.",
    },
  };

  // Resumen
  const criticalMissing = Object.entries(checks)
    .filter(([, c]) => c.required && c.status !== "ok")
    .map(([k]) => k);

  const optionalMissing = Object.entries(checks)
    .filter(([, c]) => !c.required && c.status === "missing")
    .map(([k]) => k);

  const overall: "ready" | "degraded" | "not_ready" =
    criticalMissing.length > 0
      ? "not_ready"
      : optionalMissing.length > 0
        ? "degraded"
        : "ready";

  return NextResponse.json(
    {
      overall,
      criticalMissing,
      optionalMissing,
      checks,
      timestamp: new Date().toISOString(),
    },
    {
      status: overall === "not_ready" ? 503 : 200,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
