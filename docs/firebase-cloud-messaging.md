# Firebase Cloud Messaging (FCM)

Centro Metabólico Pro envía notificaciones push por **dos transportes en paralelo**:

1. **Web Push (VAPID)** — el sistema original (`src/lib/push.ts`, `public/sw.js`).
2. **Firebase Cloud Messaging** — agregado en este branch.

Ambos conviven. Cuando un usuario activa las notificaciones (toggle en *Perfil →
Notificaciones push*), se crea **a la vez** una suscripción Web Push y un token
FCM. El servidor (`sendPushToUser`) despacha por los dos canales; cada uno limpia
sus propios registros muertos. **Si FCM no está configurado, todo funciona igual
con Web Push** — las funciones de FCM hacen no-op silencioso.

> ¿Por qué dos? Web Push (VAPID) cubre Chrome/Firefox/Edge y iOS 16.4+ (PWA
> instalada). FCM agrega una capa unificada y deja la puerta abierta a apps
> nativas (Android/iOS vía un wrapper) que reusan el mismo backend de envío.

---

## Arquitectura

```
Cliente (navegador)                         Servidor (Next.js / Vercel)
───────────────────                         ───────────────────────────
usePushNotifications.subscribe()
  ├─ Web Push:  swReg.pushManager.subscribe ──POST /api/push/subscribe──► push_subscriptions
  └─ FCM:       registerFcmToken()           ──POST /api/fcm/token──────► fcm_tokens
        (src/lib/firebase-messaging.ts)

firebase-messaging-sw.js  ◄── notificación background ── firebase-admin (src/lib/fcm.ts)
public/sw.js (push event) ◄── notificación Web Push ──── web-push       (src/lib/push.ts)

CRON / lógica server  ──►  sendPushToUser(supabase, userId, payload)
                              ├─ web-push  → push_subscriptions
                              └─ FCM       → fcm_tokens   (vía sendFcmToUser)
```

### Archivos

| Archivo | Rol |
|---|---|
| `src/lib/firebase-messaging.ts` | Cliente: init Firebase, `registerFcmToken()`, `deleteFcmToken()`, `onForegroundMessage()` |
| `public/firebase-messaging-sw.js` | Service worker FCM: muestra notificaciones en background |
| `src/app/api/fcm/token/route.ts` | `POST`/`DELETE` para guardar/borrar el token del usuario |
| `src/lib/fcm.ts` | Servidor: `sendFcm`, `sendFcmToUser` vía firebase-admin |
| `src/lib/push.ts` | `sendPushToUser` ahora despacha Web Push **y** FCM |
| `src/hooks/usePushNotifications.ts` | El toggle existente ahora registra/borra también el token FCM |
| `supabase/fcm_tokens.sql` | Tabla `fcm_tokens` + RLS |

---

## Setup paso a paso

### 1. Crear el proyecto Firebase

1. https://console.firebase.google.com → **Add project** (o usa uno existente).
2. **Build → Cloud Messaging** (la API se habilita sola al crear la web app).

### 2. Registrar la Web App y copiar la config pública

1. Project settings (⚙️) → **General** → *Your apps* → **Add app → Web (`</>`)**.
2. Copia el objeto `firebaseConfig`. Esos valores van a las `NEXT_PUBLIC_FIREBASE_*`
   (son **públicos**, no secretos).

### 3. Generar la Web Push certificate key (VAPID de FCM)

1. Project settings → **Cloud Messaging** → *Web configuration* → **Web Push
   certificates** → **Generate key pair**.
2. Copia la clave → `NEXT_PUBLIC_FIREBASE_VAPID_KEY`.

> Esta es la VAPID **de Firebase**, distinta de la VAPID de `web-push`. Cada
> transporte usa la suya.

### 4. Generar el service account (credenciales de servidor)

1. Project settings → **Service accounts** → **Generate new private key** → descarga
   el JSON.
2. Configúralo en el servidor de **una** de estas dos formas:
   - `FIREBASE_SERVICE_ACCOUNT` = el JSON completo en una línea
     (`node -e "console.log(JSON.stringify(require('./serviceAccountKey.json')))"`), **o**
   - `FIREBASE_PROJECT_ID` + `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY`.

⚠️ El JSON / la private key son **secretos**. Nunca los pongas en variables
`NEXT_PUBLIC_*` ni los commitees.

### 5. Crear la tabla en Supabase

Corre `supabase/fcm_tokens.sql` en el SQL Editor de Supabase.

### 6. Setear las env vars

Ver la tabla completa en `DEPLOYMENT.md` (sección *Firebase Cloud Messaging*).

---

## Variables de entorno

### Cliente (`NEXT_PUBLIC_`, públicas)

```
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
NEXT_PUBLIC_FIREBASE_VAPID_KEY
```

### Servidor (secretas)

```
FIREBASE_SERVICE_ACCOUNT          # JSON completo, una línea
# — o —
FIREBASE_PROJECT_ID
FIREBASE_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY              # con \n escapados o reales
```

---

## Probarlo

1. Setea las env vars (cliente + servidor) y corre la tabla SQL.
2. `npm run dev`, abre la app, ve a **Perfil → Notificaciones push** y activa el toggle.
   - Acepta el permiso del navegador.
   - En la consola del navegador no debería haber errores de `[fcm]`.
3. Verifica en Supabase que aparezca una fila en `fcm_tokens` para tu usuario.
4. Dispara un envío de prueba (necesitas `CRON_SECRET`):

   ```bash
   curl -X POST http://localhost:3000/api/push/send \
     -H "Authorization: Bearer $CRON_SECRET" \
     -H "Content-Type: application/json" \
     -d '{"userId":"<tu-user-id>","title":"Prueba FCM","body":"¡Funciona! 🎉","url":"/paciente"}'
   ```

   La respuesta `{ sent, removed }` suma ambos transportes. Deberías ver la
   notificación (con la pestaña en background para probar el SW de FCM).

---

## Notas de diseño

- **No-op sin credenciales:** tanto el cliente (`isFcmClientConfigured`) como el
  servidor (`isFcmConfigured`) detectan ausencia de config y no hacen nada. Por eso
  es seguro mergear este branch antes de tener el proyecto Firebase.
- **Carga perezosa:** `firebase-admin` se importa dinámicamente dentro de
  `sendPushToUser` y el SDK de cliente sólo se carga al activar el toggle — no
  penaliza el cold-start ni el bundle inicial.
- **Config del SW sin build:** `firebase-messaging-sw.js` recibe la config (pública)
  como query params al registrarse, así no hay que inyectar nada en build time.
- **Limpieza de tokens muertos:** al enviar, los tokens `not-registered`/inválidos
  se borran de `fcm_tokens` automáticamente (igual que las suscripciones Web Push
  con 410 Gone).
- **El SW de FCM no se cachea:** `public/sw.js` excluye explícitamente
  `firebase-messaging-sw.js` y su scope para no servir versiones viejas del worker.
