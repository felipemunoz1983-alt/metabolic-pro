# Deployment — Centro Metabólico Pro

Guía para tener la app corriendo en producción con todos sus módulos funcionando:
banco de opciones, push notifications, invitaciones firmadas, food scanner, chat IA.

---

## 🔍 Cómo verificar el estado del deployment

Después de cualquier deploy en Vercel, abre en el navegador:

```
https://centro-metabolico.vercel.app/api/health/deployment
```

Devuelve un JSON con el estado de cada env var y la conclusión `overall`:

- `"ready"` — todo crítico está OK
- `"degraded"` — falta algo opcional (push, email, pagos)
- `"not_ready"` — falta algo crítico (DB, Anthropic, invite secret) → la app cojea

---

## 🔐 Variables de entorno en Vercel

Setea en `Project → Settings → Environment Variables`, scope `Production` (y `Preview` si quieres testear ahí).

### Críticas — el sistema no funciona sin estas

| Variable | Valor / Dónde obtenerlo |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → anon (public) key |
| `SUPABASE_URL` | **Mismo valor** que `NEXT_PUBLIC_SUPABASE_URL` (alias server-side) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → service_role key (⚠️ secreta) |
| `ANTHROPIC_API_KEY` | console.anthropic.com → API keys |
| `INVITE_TOKEN_SECRET` | Genera con: `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` |

### Push notifications — opcional pero alta-utilidad

| Variable | Valor |
|---|---|
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | VAPID public key (web-push) |
| `VAPID_PRIVATE_KEY` | VAPID private key |
| `VAPID_SUBJECT` | `mailto:soporte@centrometabolico.cl` o URL del sitio |

Genera el par con:
```bash
npx web-push generate-vapid-keys
```

### Firebase Cloud Messaging (FCM) — opcional, segundo transporte de push

FCM **convive** con el Web Push de arriba: no reemplaza nada. Cuando un dispositivo
activa notificaciones, además de la suscripción VAPID se registra un token FCM, y el
servidor envía por ambos canales (`sendPushToUser` en `src/lib/push.ts`). Si estas
variables faltan, FCM hace no-op silencioso y todo sigue funcionando con Web Push.

Setup completo y detallado en **`docs/firebase-cloud-messaging.md`**.

**Cliente (públicas — `NEXT_PUBLIC_`, no secretas).** Firebase Console → Project
settings → General → "Your apps" (Web app) → SDK config:

| Variable | Valor |
|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | `apiKey` |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `authDomain` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `projectId` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | `messagingSenderId` |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | `appId` |
| `NEXT_PUBLIC_FIREBASE_VAPID_KEY` | Cloud Messaging → Web configuration → "Web Push certificates" → key pair |

**Servidor (secretas).** Firebase Console → Project settings → Service accounts →
"Generate new private key". Usa **una** de estas dos formas:

| Variable | Valor |
|---|---|
| `FIREBASE_SERVICE_ACCOUNT` | El JSON completo del service account, en una sola línea |
| — o bien — | |
| `FIREBASE_PROJECT_ID` | `project_id` del JSON |
| `FIREBASE_CLIENT_EMAIL` | `client_email` del JSON |
| `FIREBASE_PRIVATE_KEY` | `private_key` del JSON (con `\n` literales; el código los des-escapa) |

> En Vercel, si pegas `FIREBASE_PRIVATE_KEY` con saltos de línea reales también
> funciona. El código maneja ambos casos (`\n` escapado o real).

### Email transaccional — opcional pero recomendado

| Variable | Valor |
|---|---|
| `GMAIL_USER` | Email de Gmail desde el que sale el mail (necesita 2FA habilitado) |
| `GMAIL_APP_PASSWORD` | App password de Gmail — 16 caracteres |
| `MAIL_FROM_NAME` | `Centro Metabólico Pro` |
| `ADMIN_EMAIL` | felipe.munoz1983@gmail.com (recibe copia/alertas) |

App password de Gmail: https://myaccount.google.com/apppasswords (2FA debe estar activado).

### Pagos Transbank — solo si vendes el plan premium online

| Variable | Valor |
|---|---|
| `TRANSBANK_COMMERCE_CODE` | Código comercio Webpay (tienda) |
| `TRANSBANK_API_KEY` | API key correspondiente |
| `TRANSBANK_ENV` | `integration` para test, `production` para real |

Si esto no está, la página de upgrade muestra solo info del plan sin botón de pago.

### Cron / utilitarios

| Variable | Valor |
|---|---|
| `CRON_SECRET` | Bearer para proteger /api/push/send y cron jobs. Genera: `openssl rand -base64 32` |
| `NEXT_PUBLIC_APP_URL` | URL pública. Ej: `https://centro-metabolico.vercel.app` (sin trailing slash) |
| `NEXT_PUBLIC_SUPPORT_WHATSAPP` | Teléfono de soporte para el footer del email. Ej: `+56912345678` |

---

## 🗄️ Schema Supabase

La tabla `planes_nutricionales` se creó con el SQL en `supabase/planes_nutricionales.sql`. **No requiere migración nueva** para el banco de opciones: el sistema persiste las opciones dentro del JSONB existente `plan_json`.

Shape final del `plan_json` (después de poblar el banco):
```json
{
  "form":   { /* FormData del wizard */ },
  "result": { "kcal": 2400, "macros": {...}, ... },
  "opcionesPorTiempo": {
    "Desayuno":     [ { "nombre": "...", "ingredientes": [...], "meta": {...}, ... }, ... ],
    "Almuerzo":     [ ... ],
    "Once":         [ ... ],
    "Cena":         [ ... ]
  }
}
```

Los campos `form` y `result` quedan intactos. El resto de la app (PlanResult, dashboard del paciente, historial) sigue funcionando sin cambios.

### RLS

Las políticas RLS de `planes_nutricionales` ya están aplicadas (`supabase/rls-fix.sql`). Cubren:

- ✅ Paciente lee/inserta/actualiza/borra **sus propios** planes (`auth.uid() = user_id`)
- ✅ Profesional lee/inserta/actualiza/borra planes de **sus pacientes vinculados** (`exists profile where p.id = user_id AND p.professional_id = auth.uid()`)
- ✅ El endpoint `/api/planes/[id]/banco-opciones` usa **service-role** (bypassa RLS) y valida `role='professional'` en código (capa de defensa adicional).

---

## ✅ Checklist de primer deploy

```
[ ] 1. Setear las 6 env vars CRÍTICAS en Vercel (Production)
[ ] 2. (Opcional) Setear VAPID + GMAIL si quieres push y email
[ ] 3. Redeploy desde Vercel para que las nuevas env vars apliquen
[ ] 4. curl https://<tu-dominio>/api/health/deployment  → "overall": "ready"
[ ] 5. Crear un paciente de prueba y vincularlo
[ ] 6. Generar un plan para ese paciente desde el panel profesional
[ ] 7. Bajar al "Banco de opciones" → click "Regenerar" en un tiempo
[ ] 8. Esperar ~30-60s → ver 4-6 opciones populadas
[ ] 9. Click "Ver ficha" → modal con HTML branded
[ ] 10. Click "Imprimir/PDF" → PDF generado correctamente
```

---

## 🚨 Bugs conocidos cerrados en esta versión

- **`repositorioPlanes.ts` apuntaba a tabla y columna inexistentes** (`planes.plan_data`) — refactorizado a `planes_nutricionales.plan_json` con derivación de tiempos vía `generarPlan()`. Los planes ya guardados funcionan transparentemente; el banco se agrega como extensión del jsonb sin migración.
- **`/api/planes/[id]/banco-opciones` (POST) no validaba auth** — ahora ambos handlers (GET + POST) exigen `role='professional'` mediante el helper `exigirProfesional()`.

---

## 🛠️ Comandos útiles

```bash
# Generar secret HMAC para INVITE_TOKEN_SECRET
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"

# Generar par VAPID
npx web-push generate-vapid-keys

# Pasar el JSON del service account de Firebase a una sola línea (para FIREBASE_SERVICE_ACCOUNT)
node -e "console.log(JSON.stringify(require('./serviceAccountKey.json')))"

# Generar CRON_SECRET
openssl rand -base64 32

# Probar el health check localmente
npm run dev
curl http://localhost:3000/api/health/deployment | jq
```

---

## 📞 Para retomar este contexto

Si algo se rompe en producción, primero hit el health check. Después:

1. Si `overall: not_ready` → falta una env var crítica. Mírate `criticalMissing[]`.
2. Si `overall: degraded` pero `not_ready` features no funcionan → un servicio externo está caído (Supabase, Anthropic).
3. Si el banco no genera opciones → revisa Vercel function logs de `/api/planes/[id]/banco-opciones` — busca errores de Anthropic o RLS.
4. Si los emails no llegan → revisa logs de `/api/email/*` y el GMAIL_APP_PASSWORD.

`scripts/generar-fichas.mjs` regenera el set demo de fichas offline (no requiere ninguna env var, sólo Node).
